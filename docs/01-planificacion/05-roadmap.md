# Roadmap de Entregas Verticales — ProyectoHV

> **Fase:** 1 · Planificación  
> **Estado:** Aprobado en Planificación  
>
> **Decisión humana**
> - **Qué decidió Harold:** Organizar el desarrollo en **rebanadas verticales de funcionalidad (Vertical Slices)** en lugar de capas horizontales aisladas; priorizar el portal público y el exhibit para tener visibilidad inmediata; e implementar el flujo de acceso privado y la búsqueda semántica como fases incrementales sucesivas.
> - **Qué ejecutó la IA:** Descomposición del backlog en 6 rebanadas verticales de punta a punta (UI + Backend + Persistencia + Tests + CI/CD), estimación de complejidad y criterios de aceptación por entrega.
> - **Riesgo técnico asumido conscientemente:** El despliegue de microservicios Java en la VM Oracle Cloud se pospone hasta el Slice 2 para validar primero el pipeline de contenido y frontend en Netlify, reduciendo la fricción inicial.
> - **Alternativas descartadas:** Planificación tradicional en cascada o por capas horizontales técnicas (DB primero, luego APIs, luego UI al final); estimación rígida por fechas calendario fijas (diagrama de Gantt) en un proyecto de exploración y demostración tecnológica individual.

---

## 1. Estrategia de Entrega por Rebanadas Verticales

A diferencia del desarrollo tradicional por capas horizontales (hacer toda la base de datos primero, luego todos los servicios, luego toda la UI), cada **Slice Vertical** entrega una funcionalidad completa y testeable de punta a punta:

```
                  ┌────────────────────────────────────────────────────────┐
                  │                    VERTICAL SLICE                      │
                  │  ┌────────────┐┌────────────┐┌───────────┐┌─────────┐  │
                  │  │  Frontend  ││ Spring Boot││ Supabase  ││  Tests  │  │
                  │  │  (Next.js) ││ (Java 21)  ││   (RLS)   ││ & CI/CD │  │
                  │  └────────────┘└────────────┘└───────────┘└─────────┘  │
                  └────────────────────────────────────────────────────────┘
```

---

## 2. Mapa de Entregas (Roadmap)

### 🟢 Slice 0: Fundación y Gobernanza Agéntica (ESTADO: COMPLETADO ✅)
- Inicialización de Git con control de versiones en rama `main`.
- Implementación de la **Cuádruple Barrera de Reproducibilidad**:
  - Capa 1: Contexto versionado (`AGENTS.md`, 11 skills canónicos, 6 subagentes de capa).
  - Capa 2: Hooks PreToolUse en Antigravity y ZCode con motor puro `hv-rules.mjs`.
  - Capa 3: Scripts deterministas (`run-guardrails.mjs`, `check-code-metrics.mjs`).
  - Capa 4: GitHub Actions workflow con `--require-lists` y commit convention.
- Comandos unificados: `npm run setup:ai` y `npm run verify:context`.

---

### 🟡 Slice 1: Portafolio Público y Exhibit Vivo (EN CURSO)
- **Objetivo:** Poner en producción el portal público anonimizado y el exhibit del ciclo de vida en Netlify.
- **Entregables:**
  1. Ejecución del pipeline `hv-career-pipeline`: Lectura de `perfil-maestro.md` -> Sanitización con lista negra privada -> Generación de `content/public.json`.
  2. Implementación de `web/` con Next.js 15+ App Router, Tailwind CSS y Server Components.
  3. Páginas públicas: Inicio, Trayectoria anonimizada por sector, Stack tecnológico y Proyectos destacados.
  4. Sección del Exhibit Técnico: Documentación de Fases 1 a 6 y diagramas interactivos en Archify.
  5. Pipeline de CI/CD para frontend (`.github/workflows/web.yml`) con deploy a Netlify.
- **Criterio de Terminado (DoD):**
  - Sitio público desplegado y accesible vía URL pública.
  - Core Web Vitals en verde (LCP < 2.5s).
  - 0 menciones de datos privados o clientes en código fuente o bundle JS.

---

### ⚪ Slice 2: Flujo de Acceso Magic Link 48h
- **Objetivo:** Habilitar la solicitud y emisión de accesos temporales para evaluadores corporativos.
- **Entregables:**
  1. Microservicio `services/access` (Java 21 Spring Boot 3 con Clean Architecture).
  2. Validador de DNS MX para comprobación de dominio corporativo en tiempo real.
  3. Emisión de token criptográfico SHA-256 con expiración exacta a las 48 horas.
  4. Configuración de broker RabbitMQ en VM Oracle Cloud ARM.
  5. Función AWS Lambda (`functions/notifier`) para envío de correo mediante Resend.
  6. Manejador global `@RestControllerAdvice` con respuestas RFC 9457 `ProblemDetail`.
- **Criterio de Terminado (DoD):**
  - Solicitud de acceso probada de extremo a extremo con recepción de correo real.
  - Rechazo probado con HTTP 422 si el dominio no posee registros MX.
  - Cobertura de pruebas unitarias e integración en Java ≥ 80%.

---

### ⚪ Slice 3: Portal Privado, RLS y Marca de Agua Dinámica
- **Objetivo:** Permitir a evaluadores con sesión activa consultar información confidencial y descargar CV con marca de agua.
- **Entregables:**
  1. Políticas Row Level Security (RLS) en Supabase PostgreSQL evaluando `expires_at > now()`.
  2. Microservicio `services/cv` para entrega de detalle técnico, ADRs y expectativas salariales.
  3. Función AWS Lambda (`functions/watermark`) para estampar dinámicamente IP, correo y fecha en vistas y PDFs.
  4. Auditoría append-only en MongoDB Atlas registrando cada acceso y consulta.
  5. Gestión de extensiones (máximo 2 extensiones con cooldown de 24 horas).
- **Criterio de Terminado (DoD):**
  - Acceso bloqueado automáticamente a las 48 h + 1 ms comprobado con tests.
  - Documentos descargados contienen marca de agua identificable.
  - Bitácora de MongoDB inmutable y verificable.

---

### ⚪ Slice 4: Búsqueda Semántica con IA (RAG & pgvector)
- **Objetivo:** Búsqueda en lenguaje natural sobre la trayectoria y decisiones de arquitectura.
- **Entregables:**
  1. Configuración de extensión `pgvector` en Supabase PostgreSQL.
  2. Microservicio `services/search` (Java 21 Spring Boot).
  3. Pipeline de generación de embeddings de proyectos, habilidades y ADRs.
  4. Endpoint de consulta y componente de búsqueda reactiva con los 4 estados en `web/`.
- **Criterio de Terminado (DoD):**
  - Consultas en lenguaje natural devuelven resultados ordenados por relevancia semántica (similitud de coseno).
  - Tiempo de respuesta de búsqueda < 800 ms.

---

### ⚪ Slice 5: Hardening, Observabilidad DORA y Cierre
- **Objetivo:** Blindaje final de producción, métricas en vivo y postmortem intencional.
- **Entregables:**
  1. Configuración de monitoreo y logs estructurados JSON con `X-Correlation-ID`.
  2. Dashboard de métricas DORA en vivo dentro del portal del exhibit.
  3. Ejecución de simulacro de fallo provocado para certificar el rollback automatizado en < 3 minutos.
  4. Redacción del primer postmortem provocado en `docs/06-mantenimiento/postmortems/`.
- **Criterio de Terminado (DoD):**
  - Las 4 métricas DORA se calculan automáticamente desde la telemetría de CI/CD.
  - Rollback probado y documentado.
