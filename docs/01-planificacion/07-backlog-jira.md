# Backlog de Producto en Jira — ProyectoHV

> **Fase:** 1 · Planificación  
> **Estado:** Aprobado en Planificación  
> **Tablero Jira:** [HV Board (KAN)](https://haroldr088.atlassian.net/jira/software/projects/KAN/boards/1)  
> **Instancia:** `haroldr088.atlassian.net` (Proyecto: `KAN`)  
>
> **Decisión humana**
> - **Qué decidió Harold:** Estructurar el backlog en 5 Épicas basadas en las rebanadas verticales del Roadmap (`05-roadmap.md`) y módulos de requisitos (`04-especificacion-requisitos.md`); desglosar cada requisito funcional y no funcional en Historias de Usuario con formato INVEST y BDD/Gherkin estricto; y descomponer cada historia en tareas técnicas especializadas por capa (Frontend, Backend, Persistencia/Seguridad, Serverless y DevOps).
> - **Qué ejecutó la IA:** Creación programática de las 5 Épicas, 14 Historias de Usuario y 37 Subtareas/Tareas técnicas en Jira Cloud mediante Atlassian MCP, vinculación de jerarquía y estimación asistida dual (COSMIC CFP y SNAP).
> - **Riesgo técnico asumido conscientemente:** La granularidad detallada de subtareas a nivel de componentes individuales requiere disciplina de sincronización, pero asegura que cada PR cumpla con el Quality Gate sin desbordar los límites de líneas de código del estándar Clean Code.
> - **Alternativas descartadas:** Historias de usuario genéricas o monolíticas sin criterios BDD (imposibilita la auditoría determinista de QA); gestión en tablero físico o archivos planos sin enlace a la plataforma de tracking; omisión de requisitos no funcionales en el backlog.

---

## 1. Estructura Jerárquica del Backlog

```
ÉPICA (Epic) ──► HISTORIA DE USUARIO (Story - INVEST + BDD) ──► SUBTAREAS TÉCNICAS (Subtask)
       │                                                                │
       └──────────────────► TAREAS TÉCNICAS DIRECTAS (Task / DevOps) ────┘
```

El backlog comprende:
- **5 Épicas** (`KAN-1`, `KAN-5`, `KAN-6`, `KAN-7`, `KAN-8`)
- **14 Historias de Usuario** (Funcionales y No Funcionales con estimación dual COSMIC/SNAP y criterios BDD)
- **37 Subtareas y Tareas Técnicas** (Cubriendo Frontend Next.js, Backend Java 21, Serverless Lambda, Supabase RLS, MongoDB y DevOps)
- **Total:** **56 incidencias sincronizadas en Jira Cloud**.

---

## 2. Detalle de Épicas, Historias y Tareas

### 🟢 ÉPICA 1: [KAN-1] Portal Público y Exhibit Vivo del SDLC (Slice 1)
- **Requisitos:** RF-01, RF-02, RF-03, RNF-02, RNF-04, RNF-05
- **Objetivo:** Poner en producción el portal web público anonimizado por sector y el exhibit navegable del SDLC con diagramas interactivos Archify en Netlify.

| Key | Tipo | Título / Resumen | Requisito | Estimación | Estado en Tablero |
|---|---|---|:---:|:---:|:---:|
| **KAN-2** | Historia | [HU-01] Visualización de Trayectoria y Catálogo Técnico Anonimizado | RF-01, RF-03 | 4 CFP / SNAP Bajo | 🟡 **En progreso** (75%) |
| ↳ **KAN-3** | Subtarea | [TASK] Ejecutar pipeline de extracción y sanitización de content/public.json | RF-01 | 1 d | 🟢 **Completado** ✅ |
| ↳ **KAN-9** | Subtarea | [TASK] Implementar vistas de trayectoria, stack y proyectos en Next.js con Tailwind | RF-01 | 2 d | 🟢 **Completado** ✅ |
| ↳ **KAN-10** | Subtarea | [TASK] Implementar componente reactivo de filtrado con manejo de los 4 estados | RF-03 | 1 d | 🟡 **En progreso** |
| **KAN-11** | Historia | [HU-02] Exhibit Interactivo del Ciclo de Vida y Prácticas de IA | RF-02 | 5 CFP / SNAP Medio | ⚪ Tareas por hacer |
| ↳ **KAN-12** | Subtarea | [TASK] Scaffolding de rutas /exhibit/* para fases 1 a 6 del SDLC | RF-02 | 1 d | ⚪ Tareas por hacer |
| ↳ **KAN-13** | Subtarea | [TASK] Integrar visor de diagramas SVG/Archify interactivos (access-flow y HLD) | RF-02 | 2 d | ⚪ Tareas por hacer |
| ↳ **KAN-14** | Subtarea | [TASK] Pruebas E2E con Playwright para navegación del exhibit | RF-02 | 1 d | ⚪ Tareas por hacer |
| **KAN-15** | Historia (RNF) | [HU-03 / RNF] Rendimiento Web Core Web Vitals y Accesibilidad WCAG AA | RNF-02, RNF-04 | 3 CFP / SNAP Medio | ⚪ Tareas por hacer |
| ↳ **KAN-16** | Subtarea | [TASK] Optimización de fuentes, imágenes y Server Components para LCP < 2.5s y CLS < 0.1 | RNF-02 | 1 d | ⚪ Tareas por hacer |
| ↳ **KAN-17** | Subtarea | [TASK] Auditoría y corrección de accesibilidad con axe-core y Playwright A11y | RNF-04 | 1 d | ⚪ Tareas por hacer |
| **KAN-4** | Tarea | [TECH-TASK] Configurar pipeline CI/CD en GitHub Actions hacia Netlify (Slice 1) | DevOps | 1 d | ⚪ Tareas por hacer |

---

### 🟢 ÉPICA 2: [KAN-5] Sistema de Acceso Temporal Magic Link 48h con Validación DNS (Slice 2)
- **Requisitos:** RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-14, RNF-07, RNF-09
- **Objetivo:** Habilitar la emisión y gestión de accesos temporales (TTL 48 h) para evaluadores corporativos acreditados con validación DNS MX en tiempo real y consentimiento Habeas Data.

| Key | Tipo | Título / Resumen | Requisito | Estimación |
|---|---|---|:---:|:---:|
| **KAN-18** | Historia | [HU-04] Solicitud de Acceso con Minimización de Datos y Consentimiento Habeas Data | RF-04, RF-14 | 4 CFP / SNAP Bajo |
| ↳ **KAN-19** | Subtarea | [TASK] Diseñar e implementar modal de solicitud con Next.js Server Actions | RF-04 | 1 d |
| ↳ **KAN-20** | Subtarea | [TASK] Implementar checkbox de consentimiento obligatorio y vista de Política de Privacidad | RF-14 | 1 d |
| **KAN-21** | Historia | [HU-05] Validación de Dominio Corporativo DNS MX en Tiempo Real con Errores RFC 9457 | RF-05, RNF-07 | 5 CFP / SNAP Alto |
| ↳ **KAN-22** | Subtarea | [TASK] Scaffolding de microservicio services/access con Clean Architecture | RF-05 | 1 d |
| ↳ **KAN-23** | Subtarea | [TASK] Implementar validador DNS MX asíncrono y lista negra de dominios gratuitos | RF-05 | 2 d |
| ↳ **KAN-24** | Subtarea | [TASK] Implementar manejador global @RestControllerAdvice con RFC 9457 ProblemDetail | RNF-07 | 1 d |
| **KAN-25** | Historia | [HU-06] Emisión de Concesión Criptográfica de 48h y Despacho Serverless de Magic Link | RF-06, RF-07 | 6 CFP / SNAP Alto |
| ↳ **KAN-26** | Subtarea | [TASK] Implementar repositorio y persistencia en tabla access.grants con hashing SHA-256 | RF-06 | 1 d |
| ↳ **KAN-27** | Subtarea | [TASK] Configurar productor RabbitMQ para evento AccessRequestedEvent | RF-06 | 1 d |
| ↳ **KAN-28** | Subtarea | [TASK] Implementar función AWS Lambda functions/notifier con integración a Resend | RF-07 | 2 d |
| **KAN-29** | Historia | [HU-07] Reclamo de Concesión, Sesión Independiente y Control de Extensiones | RF-08, RF-09 | 5 CFP / SNAP Medio |
| ↳ **KAN-30** | Subtarea | [TASK] Endpoint de validación y consumo de token de un solo uso en services/access | RF-08 | 1 d |
| ↳ **KAN-31** | Subtarea | [TASK] Integración de sesión con Supabase Auth y auto-logout al expirar grant | RF-08 | 1 d |
| ↳ **KAN-32** | Subtarea | [TASK] Endpoint y lógica de control de extensiones (máx 2 con cooldown de 24 h) | RF-09 | 1 d |

---

### 🟢 ÉPICA 3: [KAN-6] Portal Privado, RLS y Estampado Dinámico de Marca de Agua (Slice 3)
- **Requisitos:** RF-10, RF-11, RF-12, RNF-03, RNF-07, RNF-09
- **Objetivo:** Consulta de información confidencial protegida por RLS en PostgreSQL, estampado forense de marca de agua en PDF con AWS Lambda y auditoría append-only en MongoDB Atlas.

| Key | Tipo | Título / Resumen | Requisito | Estimación |
|---|---|---|:---:|:---:|
| **KAN-33** | Historia | [HU-08] Consulta de Información Confidencial Protegida por Row Level Security | RF-10, RNF-03 | 4 CFP / SNAP Alto |
| ↳ **KAN-34** | Subtarea | [TASK] Definir tablas privadas y políticas RLS en PostgreSQL evaluando expires_at > now() | RF-10 | 1 d |
| ↳ **KAN-35** | Subtarea | [TASK] Scaffolding de microservicio services/cv con Clean Architecture | RF-10 | 1 d |
| ↳ **KAN-36** | Subtarea | [TASK] Tests SQL de seguridad comparando rol anon vs grant activo vs expirado | RNF-03 | 1 d |
| **KAN-37** | Historia | [HU-09] Estampado Dinámico de Marca de Agua en Vistas y Descarga de CV en PDF | RF-11 | 5 CFP / SNAP Medio |
| ↳ **KAN-38** | Subtarea | [TASK] Implementar función AWS Lambda functions/watermark con Apache PDFBox | RF-11 | 2 d |
| ↳ **KAN-39** | Subtarea | [TASK] Desarrollar componente de superposición de marca de agua en frontend Next.js | RF-11 | 1 d |
| **KAN-40** | Historia | [HU-10] Registro de Auditoría Inmutable Append-Only de Accesos y Consultas | RF-12, RNF-09 | 4 CFP / SNAP Medio |
| ↳ **KAN-41** | Subtarea | [TASK] Configurar colección append-only en MongoDB Atlas con índice TTL de 90 días | RF-12, RNF-09 | 1 d |
| ↳ **KAN-42** | Subtarea | [TASK] Implementar cliente de auditoría asíncrono no bloqueante en microservicios | RF-12 | 1 d |

---

### 🟢 ÉPICA 4: [KAN-7] Búsqueda Semántica con IA, pgvector y RAG (Slice 4)
- **Requisitos:** RF-13, RNF-02, RNF-05, RNF-07
- **Objetivo:** Búsqueda en lenguaje natural sobre trayectoria, proyectos y decisiones de arquitectura (ADRs) mediante embeddings vectoriales y pgvector (< 800 ms).

| Key | Tipo | Título / Resumen | Requisito | Estimación |
|---|---|---|:---:|:---:|
| **KAN-43** | Historia | [HU-11] Búsqueda Semántica en Lenguaje Natural con pgvector y RAG | RF-13, RNF-02 | 5 CFP / SNAP Alto |
| ↳ **KAN-44** | Subtarea | [TASK] Habilitar extensión pgvector y crear esquema vectorial con índice HNSW | RF-13 | 1 d |
| ↳ **KAN-45** | Subtarea | [TASK] Scaffolding de microservicio services/search con Clean Architecture | RF-13 | 1 d |
| ↳ **KAN-46** | Subtarea | [TASK] Pipeline de generación e indexación de embeddings de proyectos y ADRs | RF-13 | 2 d |
| ↳ **KAN-47** | Subtarea | [TASK] Componente de búsqueda reactiva en Next.js con los 4 estados (< 800 ms) | RF-13, RNF-02 | 1 d |

---

### 🟢 ÉPICA 5: [KAN-8] Gobernanza de Calidad, Blindaje DORA y CI/CD Resiliente (Transversal / Slices 0 y 5)
- **Requisitos:** RNF-01, RNF-03, RNF-05, RNF-06, RNF-07, RNF-08, RNF-09
- **Objetivo:** Blindaje de calidad en SonarQube, observabilidad DORA, modelo de costos (< USD 3/mes), rollback en < 3 minutos y purga automatizada de datos Habeas Data.

| Key | Tipo | Título / Resumen | Requisito | Estimación | Estado en Tablero |
|---|---|---|:---:|:---:|:---:|
| **KAN-48** | Historia (RNF) | [HU-12 / RNF] Resiliencia, Rollback Automatizado (< 3 min) y Modelo de Costos (< $3/mes) | RNF-01, RNF-08 | 3 CFP / SNAP Alto | ⚪ Tareas por hacer |
| ↳ **KAN-49** | Subtarea | [TASK] Configurar pipeline de despliegue con healthchecks y rollback automático (< 3 min) | RNF-08 | 2 d | ⚪ Tareas por hacer |
| ↳ **KAN-50** | Subtarea | [TASK] Script de auditoría y monitoreo continuo de facturación cloud (< $3/mes) | RNF-01 | 1 d | ⚪ Tareas por hacer |
| **KAN-51** | Historia (RNF) | [HU-13 / RNF] Gobernanza de Calidad, Cobertura (≥80%) y Guardrails de Privacidad | RNF-03, RNF-05, RNF-06 | 3 CFP / SNAP Alto | 🟡 **En progreso** (70%) |
| ↳ **KAN-52** | Subtarea | [TASK] Configurar Quality Gate en SonarQube con reglas bloqueantes en PRs | RNF-06 | 1 d | 🟢 **Completado** ✅ |
| ↳ **KAN-53** | Subtarea | [TASK] Integrar ejecución obligatoria de run-guardrails.mjs y check-code-metrics.mjs en CI | RNF-03, RNF-05 | 1 d | 🟢 **Completado** ✅ |
| **KAN-54** | Historia (RNF) | [HU-14 / RNF] Purga Automatizada de Datos y Cumplimiento de Retención Habeas Data | RNF-09 | 3 CFP / SNAP Medio | ⚪ Tareas por hacer |
| ↳ **KAN-55** | Subtarea | [TASK] Configurar tarea programada para purga de tokens no reclamados tras 24 horas | RNF-09 | 1 d | ⚪ Tareas por hacer |
| ↳ **KAN-56** | Subtarea | [TASK] Implementación de canal y procedimiento de atención de derechos ARCO / Habeas Data | RNF-09 | 1 d | ⚪ Tareas por hacer |

---

## 3. Matriz de Cobertura y Trazabilidad

| Dimensión | Métrica | Cumplimiento |
|---|:---:|:---:|
| **Requisitos Funcionales Cubiertos** | 14 / 14 (RF-01 a RF-14) | 100% ✅ |
| **Requisitos No Funcionales Cubiertos** | 9 / 9 (RNF-01 a RNF-09) | 100% ✅ |
| **Total Épicas en Jira** | 5 | 100% ✅ |
| **Total Historias con BDD / Gherkin** | 14 | 100% ✅ |
| **Total Subtareas / Tareas Técnicas** | 37 | 100% ✅ |
| **Total Incidencias en Tablero** | 56 | 100% ✅ |
| **Cumplimiento de Regla #0 (Privacidad)** | 0 fugas de clientes o datos privados | 100% ✅ |
