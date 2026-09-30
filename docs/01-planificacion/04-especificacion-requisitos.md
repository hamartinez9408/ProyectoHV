# Especificación de Requisitos — ProyectoHV

> **Fase:** 1 · Planificación  
> **Estado:** Propuesto para revisión  
>
> **Decisión humana**
> - **Qué decidió Harold:** Delimitar el sistema en dos zonas estrictas de visualización (Pública anonimizada por sector y Privada con control de acceso por Magic Link temporal de 48 h), implementar marca de agua dinámica con trazabilidad de usuario para proteger propiedad intelectual, y desacoplar la búsqueda semántica mediante pgvector.
> - **Qué ejecutó la IA:** Redacción formal de la especificación técnica de requisitos funcionales (RF) y no funcionales (RNF), contratos de datos preliminares y definición de límites del sistema.
> - **Riesgo técnico asumido conscientemente:** El rechazo de correos sin registros DNS MX válidos excluye temporalmente a evaluadores que usen dominios en migración o mal configurados, pero es una salvaguarda necesaria contra abusos y bots.
> - **Alternativas descartadas:** Autenticación clásica por usuario/contraseña o SSO con OAuth de terceros (introducen fricción al reclutador y complejidad innecesaria frente al Magic Link de 48 h); portal privado sin marca de agua personalizada; búsqueda léxica básica con LIKE/ilike en lugar de embeddings vectoriales.

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
- **RF-04 (Solicitud de Acceso con Minimización de Datos):** El evaluador debe ingresar su correo corporativo (campo obligatorio) y opcionalmente su nombre o empresa (para personalización de la marca de agua). En cumplimiento con el principio de minimización de datos (Ley 1581), no se solicitan datos innecesarios como motivos de consulta.
- **RF-05 (Validación DNS MX en Tiempo Real):** El servicio `access-service` debe verificar mediante consulta DNS que el dominio del correo ingresado cuente con servidores de correo (MX) activos. Si el dominio no tiene registros MX o es de un proveedor gratuito no autorizado, debe rechazar la solicitud con un error estructurado RFC 9457 (HTTP 422).
- **RF-06 (Concesión de Acceso 48 h y Enlace Mágico Portador):** Si el dominio es válido, el sistema registra una concesión en `access.grants` con `expires_at = now() + interval '48 hours'` y genera un token portador de un solo uso (secreto criptográfico aleatorio cuyo hash SHA-256 se persiste con TTL de 24 horas para su reclamo). Se publica un evento `AccessRequestedEvent` a RabbitMQ.
- **RF-07 (Despacho Serverless de Magic Link):** Una función AWS Lambda (`functions/notifier`) debe consumir el evento de RabbitMQ/cola y despachar el correo con el enlace mágico a través del proveedor transaccional (Resend).
- **RF-08 (Reclamo de Concesión y Sesión Independiente):** Al hacer clic en el enlace mágico, `access-service` valida el token de un solo uso, lo marca como consumido y autentica al usuario en Supabase Auth. La sesión de Supabase Auth es independiente de la duración de la concesión: el acceso a los datos lo decide exclusivamente la política RLS en cada consulta (`expires_at > now()`). La interfaz web consulta el estado de la concesión y fuerza el cierre de sesión cuando esta vence.
- **RF-09 (Control de Extensiones de Acceso):** El evaluador puede solicitar hasta un máximo de dos (2) extensiones de 48 horas cada una, siempre que hayan transcurrido al menos 24 horas de cooldown desde la última extensión. La tercera solicitud debe requerir aprobación manual.

### Módulo C: Portal Privado y Protección de Información (`services/cv` y `supabase/`)
- **RF-10 (Consulta de Información Confidencial):** El portal privado debe consultar los datos sensibles (expectativa salarial, rango de negociación, disponibilidad inmediata y detalle técnico de ADRs) protegidos por políticas Row Level Security (RLS) en PostgreSQL que evalúen `auth.uid() IS NOT NULL AND expires_at > now()`.
- **RF-11 (Estampado Dinámico de Marca de Agua):** Toda vista privada y descarga de CV en formato PDF debe procesarse a través de una función AWS Lambda (`functions/watermark`) que incruste de forma visible y semi-transparente el correo del evaluador, su IP y el timestamp de consulta para disuadir la redistribución no autorizada.
- **RF-12 (Auditoría Inmutable de Accesos y Descargas):** Toda solicitud de enlace, apertura de sesión (`services/access`), consulta privada y descarga de documentos (`services/cv`) debe registrarse en MongoDB Atlas con estructura append-only (IP, User-Agent, Email anonimizado, Timestamp, EventType).

### Módulo D: Búsqueda Semántica (`services/search`)
- **RF-13 (Búsqueda Semántica con pgvector):** El servicio `search-service` debe permitir consultas en lenguaje natural (ej. *"experiencia en migraciones de bases de datos de alta transaccionalidad"*), transformando la consulta en embeddings y ejecutando búsqueda por similitud de coseno contra los proyectos y ADRs del portafolio.

### Módulo E: Privacidad y Cumplimiento Normativo (`web/` y `services/access`)
- **RF-14 (Consentimiento y Aviso de Privacidad - Ley 1581 / Habeas Data):** El formulario de solicitud de acceso debe incluir una casilla de verificación obligatoria (*checkbox* desmarcado por defecto) y enlace visible a la Política de Tratamiento de Datos Personales, registrando la aceptación expresa del evaluador para el tratamiento exclusivo de envío del Magic Link y auditoría de seguridad.

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
| **RNF-09** | **Retención y Habeas Data** | Los enlaces no reclamados expiran en 24 h y se purgan automáticamente. Las bitácoras con correos se anonimizan tras 90 días. Se provee canal para ejercer derechos de cancelación. | Purga programada en base de datos y canal de contacto declarado en política. |

---

## 4. Matriz de Trazabilidad Completa (Requisitos, Componentes, Slices y Verificación)

| Requisito | Componente Principal | Slice Asignado | Dependencias Técnicas | Método de Verificación |
|---|---|:---:|---|---|
| **RF-01** | `web/` (Next.js) | Slice 1 | Netlify Edge CDN | Inspección visual + Auditoría Playwright |
| **RF-02** | `web/` (Exhibit) | Slice 1 | Archify / SVG viewer | Tests E2E Playwright en rutas `/exhibit/*` |
| **RF-03** | `web/` (Filtros) | Slice 1 | React Client Components | Tests unitarios Vitest (4 estados) |
| **RF-04** | `web/` (Formulario) | Slice 2 | Next.js Server Actions | Tests de formulario + validación de minimización |
| **RF-05** | `services/access` | Slice 2 | DNS Resolver / JNDI | Tests unitarios JUnit 5 con mocks DNS + WireMock |
| **RF-06** | `services/access` | Slice 2 | Supabase / PostgreSQL | Testcontainers PostgreSQL (valida tabla `access.grants`) |
| **RF-07** | `functions/notifier` | Slice 2 | RabbitMQ / Resend API | Tests unitarios Mockito + Testcontainers RabbitMQ |
| **RF-08** | `services/access` | Slice 2 | Supabase Auth / Cookies | Pruebas de integración de sesión y logout al expirar |
| **RF-09** | `services/access` | Slice 2 | PostgreSQL / Redis | Tests de cooldown (24 h) y bloqueo en 3.ª extensión |
| **RF-10** | `services/cv` | Slice 3 | Supabase RLS | Tests SQL directos con rol anon vs autenticado con TTL |
| **RF-11** | `functions/watermark` | Slice 3 | AWS Lambda Java / PDFBox | Test unitario de generación PDF + inspección visual |
| **RF-12** | `services/access` y `services/cv` | Slice 3 | MongoDB Atlas | Tests de inserción append-only y verificación de índices |
| **RF-13** | `services/search` | Slice 4 | pgvector / LLM API | Tests de similitud coseno con vectores conocidos |
| **RF-14** | `web/` y `services/access` | Slice 2 | Formulario / BD | Test E2E de validación de checkbox obligatorio |
| **RNF-01** | Todos | Transversal | Facturación cloud | Monitoreo mensual de costos en panel OCI / Supabase |
| **RNF-02** | `web/` | Slice 1 | Netlify CDN | Google Lighthouse CI / Web Vitals test |
| **RNF-03** | Todos | Transversal | `.agents/rules/private/` | Gate bloqueante `run-guardrails.mjs --all` en CI |
| **RNF-04** | `web/` | Slice 1 | Tailwind / Radix UI | Auditoría axe-core / Playwright A11y tests |
| **RNF-05** | Backend y Frontend | Slices 1–4 | JVM / Node.js | Script `check-code-metrics.mjs` + SonarQube |
| **RNF-06** | `services/*` y `web/` | Slices 1–4 | JaCoCo / Vitest coverage | Gate CI JaCoCo (mínimo 80% líneas / 75% ramas) |
| **RNF-07** | `services/*` | Slices 2–4 | `@RestControllerAdvice` | Pruebas de contrato OpenAPI + RFC 9457 schema validation |
| **RNF-08** | Pipelines CD | Slice 5 | GitHub Actions / OCI | Simulacro de inyección de fallo y medición de rollback |
| **RNF-09** | `supabase/` y Mongo | Slice 3 | pg_cron / Mongo TTL | Script de verificación de purga periódica |
