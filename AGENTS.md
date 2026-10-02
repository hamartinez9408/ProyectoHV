# ProyectoHV — Portafolio técnico y profesional

> Instrucciones de workspace. Se cargan **después** de las instrucciones de usuario,
> así que **estrechan** las reglas generales: las reglas de SophieX
> (`~/.zcode/AGENTS.md`) **no aplican aquí**. Este es un proyecto personal.

---

## 🚨 REGLA #0 — AISLAMIENTO DE LAS CREDENCIALES CORPORATIVAS

El config global `C:\Users\harol\.zcode\cli\config.json` contiene credenciales
de **Stefanini** y de sus clientes. Ese archivo **NO SE MODIFICA. NUNCA.**

Respaldos existentes (no borrar): `config.backup-*.json` en la misma carpeta.

### 🔒 MCPs corporativos — AISLADOS ESTRUCTURALMENTE (2026-09-29)

Estos 9 servidores apuntan a infraestructura del empleador o de sus clientes.
**Fueron movidos al workspace corporativo**, así que **ya no se conectan aquí**:

```
C:\Stefanini\<proyecto>\.zcode\config.json
```

Esa es la garantía de **máquina**, no de disciplina: no dependen de que alguien
recuerde la regla. Verificación de integridad hecha contra el backup — las 9
entradas quedaron **idénticas**, sin pérdida de credenciales.

> Si por alguna razón **aparecen conectados en este workspace, es un error de
> configuración — reportarlo y no usarlos.**

**No invocarlos, no leerlos, no escribir en ellos.**

| MCP | Evidencia de que es corporativo | |
|---|---|---|
| `azure-devops` | organización de Stefanini + PAT en texto plano | 🔴 |
| `supabase` | `SUPABASE_PROJECT_REF` de un proyecto corporativo | 🔴 |
| `postgres-destino` | host `db.<ref>.supabase.co` corporativo | 🔴 |
| `postgres-origen` | host `db.<ref>.supabase.co` corporativo | 🔴 |
| `sophiex-mcp` | ruta bajo `C:\Stefanini\...` | 🔴 |
| `sophiex-ragflow` | ruta bajo `C:\Stefanini\...` | 🔴 |
| `sophiex-itsm-sdp` | ruta bajo `C:\Stefanini\...` | 🔴 |
| `sophiex-zabbix` | ruta bajo `C:\Stefanini\...` | 🔴 |
| `sophiex-ollama` | ruta bajo `C:\Stefanini\...` | 🔴 |

**Prohibido también:** leer o escribir en `C:\Stefanini\` por cualquier vía.

### Por qué importa
1. **Confidencialidad** — usar infraestructura de un cliente para un proyecto
   personal de búsqueda de empleo expondría la búsqueda ante Stefanini.
2. **Integridad** — una migración o un `execute_sql` mal dirigido puede dañar
   datos de producción de un cliente.
3. **Credenciales** — el PAT y los tokens no se regeneran solos.

### Alternativa permitida
MCPs propios declarados en `.zcode/config.json` de este workspace, con prefijo
**`hv-`** para que nunca se confundan con los corporativos:

`hv-supabase` · `hv-github` · `hv-sentry` · `hv-atlassian`

MCPs neutros (sin credenciales corporativas) y por tanto seguros aquí:
`context7` · `tavily_search` · `playwright` · `magicuidesign` · `netlify` · `docker`

⚠️ **Verificar dueño antes de usar `grafana`** — tiene `TLS_SKIP_VERIFY: true`,
lo que sugiere infraestructura corporativa interna, no propia.

> Si aparece un MCP nuevo sin clasificar, **preguntar antes de usarlo.**

---

## Qué es este proyecto

Sitio web de portafolio profesional de **Harold Augusto Rodríguez Martínez**
(Líder Técnico / Tech Lead — Bogotá D.C.), con **dos niveles de acceso**:

1. **Público** — trayectoria, stack, arquitectura. **Anonimizado por sector.**
2. **Privado** — detrás de autenticación con TTL de 48 h. Detalle técnico propio,
   ADRs, metodología, expectativa salarial y disponibilidad.

El proyecto **es su propio exhibit**: documenta el ciclo de vida completo de
software y las prácticas de IA aplicadas, y ese proceso se muestra en el sitio.

---

## Reglas de datos — INVIOLABLES

### Fuente de verdad
`C:\Personal\Gestion\profile\perfil-maestro.md` es la **única** fuente de verdad
de los datos de carrera. Ningún dato entra al sitio si no está ahí.
Si falta un dato, **se pregunta. No se inventa.**

### Lista negra (heredada del §9 del perfil maestro)
Nunca se publica, en ningún nivel de acceso:

- **Datos personales identificables** — cédula, año de nacimiento, edad, estado
  civil, dirección de residencia, foto, referencias telefónicas, bachillerato,
  y el correo antiguo
- **El nombre de cualquier cliente corporativo** en el contexto de amenaza legal
- Cualquier dato que no esté en `perfil-maestro.md`

> ⚠️ **Los valores concretos no aparecen en este documento a propósito.**
> Este repositorio es **público**: escribir la lista negra aquí **es la
> filtración que la lista pretende evitar**. Los valores viven en
> `.agents/rules/private/prohibited-identifiers.txt` (**gitignored**) y en el
> secret `HV_PROHIBITED_IDENTIFIERS` para CI. El motor
> `.agents/scripts/hv-rules.mjs` los lee en tiempo de ejecución y **bloquea
> cualquier escritura que los contenga**.

### Confidencialidad de terceros
**El nivel privado NO contiene datos de clientes del empleador.**
Prohibido publicar: nombres de clientes, volúmenes por cliente, o internals de
los productos de la compañía.

> ⚠️ **Este repositorio es público.** Escribir aquí la lista de nombres de
> clientes **es la filtración que esta regla prohíbe** — por eso los nombres no
> aparecen en este documento. Describe por sector: *"industria manufacturera"*,
> *"caja de compensación"*, *"banco"*, *"telecomunicaciones"*.
>
> La lista concreta vive en `.agents/rules/private/prohibited-clients.txt`
> (**gitignored**) o en el secret `HV_PROHIBITED_CLIENTS` en CI. El motor
> `.agents/scripts/hv-rules.mjs` la lee en tiempo de ejecución y **bloquea
> cualquier escritura que nombre a un cliente**.

Lo que sí va: **conocimiento propio** — arquitectura que él diseñó, sus
decisiones, sus ADRs, su metodología.

> Un login cambia el público, no la naturaleza de lo publicado.

### Discreción
Stefanini **no está enterado** de la búsqueda. El sitio es público pero
**anonimizado**: sin "busco empleo", sin "open to work", sin expectativa
salarial en el nivel público, sin enlace desde LinkedIn mientras dure la búsqueda.

### Separación público / privado en el repo
El repositorio es **público** (por costo de CI). Por tanto:

| Artefacto | Destino |
|---|---|
| `content/public.json` | ✅ Commiteado |
| `content/private/**` | 🚫 **Gitignored** — se inyecta a Supabase con un secret |
| Secretos | GitHub Actions Secrets — nunca en disco ni en el repo |

El generador **falla el build** si detecta un campo privado en el archivo público.

---

## Honestidad (heredada del proyecto Gestion)

- **Nunca inventar** empresas, fechas, cargos, métricas ni certificaciones.
- **Nunca inflar** una habilidad para mejorar un score. El perfil §11.3 lista
  tecnologías afirmadas en LinkedIn **sin respaldo** (RabbitMQ, MongoDB,
  Firebase, SQL Server, MySQL). Este proyecto existe, en parte, para **darles
  evidencia real**.
- **Cada artefacto del SDLC lleva un campo `Decisión humana`.** Es obligatorio.
  Un portafolio construido por IA que el autor no puede defender es un pasivo.

---

## Estructura — buscar por componente

```
web/                Next.js App Router — nivel público + portal de acceso
services/           Microservicios Java Spring Boot (access, cv, search)
functions/          AWS Lambda (Java)
supabase/           Migraciones, RLS, Edge Functions
content/            Pipeline perfil-maestro.md → content.json
infra/              IaC, docker-compose, Ansible (VM Oracle)
pipelines/          Definición CI/CD (.github/workflows apunta aquí)
docs/               Documentación por fase del SDLC
tools/              Catálogo vivo de MCPs y skills
```

**Puntos de entrada para buscar:**
- Por **componente** → `README.md` raíz
- Por **fase del SDLC** → `docs/00-INDEX.md`
- Por **decisión de arquitectura** → `docs/02-diseno/adr/`

---

## 🤖 Subagentes de Workspace (ProyectoHV)

Para evitar la contaminación con subagentes corporativos de SophieX (`sophiex-*`) y respetar la Regla #0:

| Tarea / Capa | Subagente Especializado | Archivo |
|---|---|---|
| Orquestación multi-capa | `hv-orchestrator` | `.zcode/agents/hv-orchestrator.md` |
| Frontend `web/` (Next.js, React 19, Tailwind) | `hv-frontend` | `.zcode/agents/hv-frontend.md` |
| Backend `services/` (Java 21 Spring Boot) | `hv-backend-spring` | `.zcode/agents/hv-backend-spring.md` |
| Serverless `functions/` (AWS Lambda Java) | `hv-serverless` | `.zcode/agents/hv-serverless.md` |
| Base de datos `supabase/` (Postgres, RLS) | `hv-database` | `.zcode/agents/hv-database.md` |
| Auditoría de privacidad / Regla #0 (read-only) | `hv-compliance` | `.zcode/agents/hv-compliance.md` |

## 🧰 Skills de Workspace (`.agents/skills/` y `.zcode/skills/`)

- `hv-career-pipeline`: Sanitización y parsing de `perfil-maestro.md` a `content/public.json`.
- `hv-guardrails`: Suite determinista de validación de privacidad y reglas técnicas.
- `hv-spring-service`: Estándares de desarrollo para microservicios Java 21 Spring Boot.
- `hv-nextjs-ui`: Estándares de interfaz de usuario con Next.js y los 4 estados.
- `hv-diagram-archify`: Generación de diagramas interactivos HTML/SVG para exhibits con Archify.

### 🔍 Skills Revisores por Etapa del SDLC
- `hv-review-planning`: Auditoría de Fase 1 (viabilidad, modelo de costos < $3/mes, DORA baseline, decisión humana).
- `hv-review-requirements`: Auditoría de Historias de Usuario (INVEST, BDD/Gherkin, estimación COSMIC/SNAP, DoR).
- `hv-review-architecture`: Auditoría de Fase 2 (C4, Clean Arch, modelo de amenazas STRIDE para acceso 48h, ADRs).
- `hv-review-code`: Auditoría de Fase 3 (métricas de líneas por método y clase, `@RestControllerAdvice`, RFC 9457 `ProblemDetail`, `@Valid`, TS strict).
- `hv-review-testing`: Auditoría de Fase 4 (pirámide de pruebas, cobertura ≥80% lines / ≥75% branches, edge cases de TTL y DNS).
- `hv-review-devops`: Auditoría de Fases 5 y 6 (gates CI/CD, Docker multi-stage seguro, rollback, observabilidad DORA, spec-drift).

---

## Reglas técnicas

- **TypeScript strict** — sin `any`, usar `unknown` + type guards
- **Constantes `as const`** — nunca strings mágicos en queries
- **RLS en toda tabla nueva** — sin excepción
- **4 estados** obligatorios en componentes de datos: loading, error, empty, data
- **Sin secretos en el repo** — jamás
- **Sin `console.log`** en producción — logging estructurado

## Flujo de calidad

```
Código → [Guard] → tsc → ESLint → Unit → API → E2E → SonarQube → Deploy
```

Los gates **bloquean**, no informan. Ver `docs/01-planificacion/` para la
estrategia DevOps completa y `pipelines/` para la implementación.

## 🌿 Estrategia de Ramas y Concurrencia (Multi-Agente e IA)

- **3 ramas base protegidas:** `desarrollo` (integración), `pruebas` (QA/staging), `main` (producción).
- **Prohibido el push directo:** Ningún colaborador humano ni agente de IA comitea o sube cambios directamente a `desarrollo`, `pruebas` ni `main`.
- **Aprobación mandatoria de PRs:**
  - `desarrollo`: Al menos 1 aprobación técnica (Tech Lead o agente auditor).
  - `pruebas`: Aprobación formal de Release / QA para homologación.
  - `main`: Aprobación y firma exclusiva de Harold (Tech Lead).
- **Disparo de SonarQube:** Se activa de forma automática e incondicional al emitirse una aprobación de PR hacia `desarrollo`. El Quality Gate bloquea el merge si se detectan violaciones de cobertura (<75%), duplicación (>3%), bugs o code smells.
- Ver detalle completo en [`docs/02-diseno/09-estrategia-ramas-flujo-trabajo.md`](docs/02-diseno/09-estrategia-ramas-flujo-trabajo.md) y [`ADR-007`](docs/02-diseno/adr/ADR-007-estrategia-ramas-aprobacion-sonar.md).

---

## 🤝 Trabajo conjunto con Antigravity

Este repositorio lo trabajan **dos herramientas agénticas**. Antes de crear o
modificar reglas, skills, hooks o subagentes, lee:

**→ [`tools/AGENT-COORDINATION.md`](tools/AGENT-COORDINATION.md)**

Resumen del contrato:

- Las reglas de seguridad viven **solo** en `.agents/scripts/hv-rules.mjs`.
  Los adaptadores (`.zcode/hooks/`, `.agents/scripts/pretool-safety.mjs`) solo
  traducen payloads; nunca contienen reglas.
- Los valores prohibidos (nombres de clientes, datos personales) **nunca** se
  escriben en archivos versionados. Viven en `.agents/rules/private/`
  (gitignored) o en variables de entorno desde secrets de CI.
- `AGENTS.md` y `.gitignore` son compartidos: **solo se añaden entradas**,
  nunca se reescriben.
