# Especificación de Requisitos — ProyectoHV

> **Fase:** 1 · Planificación  
> **Estado:** Propuesto para revisión  
>
> **Decisión humana**
> - **Qué decidió Harold:** Delimitar el sistema en dos zonas estrictas de visualización (Pública anonimizada por sector y Privada con control de acceso por Magic Link temporal de 48 h), implementar marca de agua dinámica con trazabilidad de usuario para proteger propiedad intelectual, y desacoplar la búsqueda semántica mediante pgvector.
> - **Qué ejecutó la IA:** Redacción formal de la especificación técnica de requisitos funcionales (RF) y no funcionales (RNF), contratos de datos preliminares y definición de límites del sistema.
> - **Riesgo aceptado conscientemente:** El rechazo de correos sin registros DNS MX válidos excluye temporalmente a evaluadores que usen dominios en migración o mal configurados, pero es una salvaguarda necesaria contra abusos y bots.

---

## 1. Alcance General del Sistema

ProyectoHV es una plataforma web y un ecosistema de microservicios concebido para dos audiencias principales:
1. **Público General / Reclutadores Iniciales:** Navegación libre, información anonimizada por sector económico, catálogo de stack, proyectos y exhibit del SDLC.
2. **Evaluadores Corporativos Acreditados:** Acceso autenticado mediante Magic Link (TTL de 48 horas) para consultar información técnica profunda, expectativas salariales, disponibilidad y descarga de CV con marca de agua personalizada.

---

## 2. Requisitos Funcionales (RF)

### Módulo A: Portal Público y Exhibit (`web/`)
- **RF-01 (Visualización Pública):** El sistema debe permitir a cualquier visitante consultar la trayectoria profesional, resumen ejecutivo, habilidades técnicas y proyectos destacados, con todos los nombres de empresas y clientes estrictamente anonimizados por sector.
- **RF-02 (Exhibit Técnico de IA y SDLC):** El sistema debe incluir una sección navegable que exponga la documentación viva de las 6 fases del ciclo de vida, las métricas DORA alcanzadas, las decisiones humanas documentadas y diagramas de arquitectura interactivos generados con Archify.
- **RF-03 (Búsqueda y Filtrado Rápido):** El sistema debe permitir filtrar habilidades, tecnologías y proyectos en tiempo real mediante interfaz reactiva que maneje los 4 estados de datos.

### Módulo B: Acceso y Seguridad (`services/access` y `functions/`)
- **RF-04 (Solicitud de Acceso Privado):** El evaluador debe poder ingresar su correo corporativo, nombre, empresa y motivo de consulta en un formulario público.
- **RF-05 (Validación DNS MX en Tiempo Real):** El servicio `access-service` debe verificar mediante consulta DNS que el dominio del correo ingresado cuente con servidores de correo (MX) activos. Si el dominio no tiene registros MX o es de un proveedor gratuito no autorizado, debe rechazar la solicitud con un error estructurado RFC 9457 (HTTP 422).
- **RF-06 (Generación de Magic Link con TTL 48 h):** Si el dominio es válido, el sistema debe generar un token criptográfico seguro (SHA-256) con expiración exacta a las 48 horas (`now() + 48 hours`) y publicar un evento `AccessRequestedEvent` a RabbitMQ.
- **RF-07 (Despacho Serverless de Magic Link):** Una función AWS Lambda (`functions/notifier`) debe consumir el evento de RabbitMQ/cola y despachar el correo con el enlace mágico a través del proveedor transaccional (Resend).
- **RF-08 (Autenticación y Sesión Segura):** Al hacer clic en el enlace mágico, el sistema debe autenticar la sesión en Supabase y emitir una cookie HTTP-only segura.
- **RF-09 (Control de Extensiones de Acceso):** El evaluador puede solicitar hasta un máximo de dos (2) extensiones de 48 horas cada una, siempre que hayan transcurrido al menos 24 horas de cooldown desde la última extensión. La tercera solicitud debe requerir aprobación manual.

### Módulo C: Portal Privado y Protección de Información (`services/cv` y `supabase/`)
- **RF-10 (Consulta de Información Confidencial):** El portal privado debe consultar los datos sensibles (expectativa salarial, rango de negociación, disponibilidad inmediata y detalle técnico de ADRs) protegidos por políticas Row Level Security (RLS) en PostgreSQL que evalúen `auth.uid() IS NOT NULL AND expires_at > now()`.
- **RF-11 (Estampado Dinámico de Marca de Agua):** Toda vista privada y descarga de CV en formato PDF debe procesarse a través de una función AWS Lambda (`functions/watermark`) que incruste de forma visible y semi-transparente el correo del evaluador, su IP y el timestamp de consulta para disuadir la redistribución no autorizada.
- **RF-12 (Auditoría Inmutable de Accesos):** Cada solicitud de enlace, apertura de sesión, consulta privada y descarga debe registrarse en MongoDB Atlas con estructura append-only (IP, User-Agent, Email anonimizado, Timestamp, EventType).

### Módulo D: Búsqueda Semántica (`services/search`)
- **RF-13 (Búsqueda Semántica con pgvector):** El servicio `search-service` debe permitir consultas en lenguaje natural (ej. *"experiencia en migraciones de bases de datos de alta transaccionalidad"*), transformando la consulta en embeddings y ejecutando búsqueda por similitud de coseno contra los proyectos y ADRs del portafolio.

---

## 3. Requisitos No Funcionales (RNF)

| Código | Categoría | Requisito No Funcional | Métrica de Aceptación |
|---|---|---|---|
| **RNF-01** | **Costo Operacional** | El costo total mensual de operación de todos los servicios debe mantenerse en capa gratuita o ultra-baja. | **< USD 3.00 / mes** demostrable en facturación. |
| **RNF-02** | **Rendimiento Web** | El frontend público debe cumplir los estándares de Core Web Vitals de Google. | **LCP < 2.5s**, **CLS < 0.1**, **INP < 200ms**. |
| **RNF-03** | **Seguridad & Privacidad** | Ningún dato de la lista negra (`prohibited-identifiers.txt`) o clientes (`prohibited-clients.txt`) debe existir en archivos públicos o respuestas HTTP no autorizadas. | **0 filtraciones**, validado por `run-guardrails.mjs` y escáneres de CI. |
| **RNF-04** | **Accesibilidad (A11y)** | La interfaz web debe cumplir con las directrices de accesibilidad web WCAG 2.1. | **Nivel AA**, navegación por teclado 100% operativa y contraste accesible. |
| **RNF-05** | **Calidad de Código** | Todo el código construido debe cumplir con las métricas de Clean Code y buenas prácticas. | Funciones **5–20 líneas** (máx. 40), clases **< 300 líneas**, TS strict sin `any`, RFC 9457 `ProblemDetail`. |
| **RNF-06** | **Cobertura de Pruebas** | Las suites automatizadas deben garantizar cobertura en lógica de negocio y seguridad. | **≥ 80% líneas** y **≥ 75% ramas** en pruebas unitarias e integración. |
| **RNF-07** | **Manejo de Errores** | Toda respuesta de error en APIs REST debe seguir el estándar RFC 9457. | Respuestas uniformes con `ProblemDetail`, sin stack traces expuestos. |
| **RNF-08** | **Resiliencia y CD** | Capacidad de recuperación inmediata ante despliegues fallidos en producción. | **Rollback automatizado en < 3 minutos**, probado en pipeline. |

---

## 4. Matriz de Trazabilidad Requisitos vs Componentes

```
┌─────────────────────────────────┬──────────────────────┬──────────────────────┐
│ Requisito Funcional             │ Componente Principal │ Dependencias / Bus   │
├─────────────────────────────────┼──────────────────────┼──────────────────────┤
│ RF-01, RF-02, RF-03 (Público)   │ web/ (Next.js)       │ Netlify Edge CDN     │
│ RF-04, RF-05, RF-06 (Acceso)    │ services/access      │ DNS Resolver / Redis │
│ RF-07 (Envío Magic Link)        │ functions/notifier   │ RabbitMQ -> Resend   │
│ RF-08, RF-09 (Sesión y TTL)     │ services/access      │ Supabase Auth / RLS  │
│ RF-10 (Datos Privados)          │ services/cv          │ Supabase PostgreSQL  │
│ RF-11 (Marca de Agua)           │ functions/watermark  │ AWS Lambda Java      │
│ RF-12 (Auditoría)               │ services/access      │ MongoDB Atlas        │
│ RF-13 (Búsqueda Semántica)      │ services/search      │ pgvector / LLM API   │
└─────────────────────────────────┴──────────────────────┴──────────────────────┘
```
