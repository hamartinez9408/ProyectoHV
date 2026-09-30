# ProyectoHV

Portafolio profesional de **Harold Augusto Rodríguez Martínez** — Líder Técnico /
Tech Lead con diferenciador en IA y Platform Engineering (Bogotá D.C.).

Y, al mismo tiempo, **el exhibit**: el sitio documenta y muestra el ciclo de vida
completo con el que fue construido, incluidas las prácticas de IA aplicadas.

---

## 🚨 Antes de tocar nada

| Léelo | Por qué |
|---|---|
| [`AGENTS.md`](AGENTS.md) | **Regla #0**: MCPs prohibidos (credenciales corporativas) + reglas de datos |
| [`tools/MCP-REGISTRY.md`](tools/MCP-REGISTRY.md) | Qué MCP es de quién. Auditoría de dueño |
| [`tools/AGENT-COORDINATION.md`](tools/AGENT-COORDINATION.md) | Reparto de responsabilidades entre ZCode y Antigravity |
| [`docs/03-implementacion/ONBOARDING.md`](docs/03-implementacion/ONBOARDING.md) | Puesta en marcha reproducible |

## Puesta en marcha

```bash
git clone <url> proyectohv && cd proyectohv
node tools/bootstrap.mjs        # aplica MCPs, recrea la junction, reporta faltantes
node tools/verify-context.mjs   # debe imprimir "CONTEXTO ÍNTEGRO"
```

Las instrucciones, skills, reglas, hooks y subagentes **viajan por git y no
requieren acción**: se aplican al clonar. Los MCPs viven en el config de usuario
—fuera del repositorio, porque el repo es público— y los aplica el bootstrap.

`verify-context.mjs` no se limita a comprobar ficheros: **hace un autotest del
motor de reglas** con los valores reales de las listas privadas. Garantizar los
mismos resultados no se logra documentando, se logra verificando.

---

## Cómo buscar en este repo

**Dos puntos de entrada, según qué estés buscando:**

| Si buscas… | Ve a |
|---|---|
| **Un componente** (web, servicios, funciones, BD, infra) | Esta página — tabla de abajo |
| **Una fase del ciclo de vida** | [`docs/00-INDEX.md`](docs/00-INDEX.md) |
| **Una decisión de arquitectura** | [`docs/02-diseno/adr/`](docs/02-diseno/adr/) |
| **Un MCP o un skill** | [`tools/MCP-REGISTRY.md`](tools/MCP-REGISTRY.md) |
| **Los datos de carrera** | `C:\Personal\Gestion\profile\perfil-maestro.md` (fuera de este repo) |

---

## Componentes

| Componente | Carpeta | Qué vive ahí | Fase | Estado |
|---|---|---|---|---|
| **Frontend** | [`web/`](web/) | Next.js App Router — nivel público + portal de acceso | 3, 5 | ⬜ |
| **Microservicios** | [`services/`](services/) | Java + Spring Boot — `access`, `cv`, `search` | 3 | ⬜ |
| **Funciones** | [`functions/`](functions/) | AWS Lambda (Java) — correo, marca de agua, notificación | 3, 5 | ⬜ |
| **Base de datos** | [`supabase/`](supabase/) | Migraciones, RLS, Edge Functions | 2, 3 | ⬜ |
| **Contenido** | [`content/`](content/) | Pipeline `perfil-maestro.md` → `content.json` sanitizado | 3 | ⬜ |
| **Infraestructura** | [`infra/`](infra/) | IaC, `docker-compose`, Ansible (VM Oracle 2 OCPU / 12 GB) | 2, 5 | ⬜ |
| **CI/CD** | [`pipelines/`](pipelines/) | Definición de los 4 pipelines y sus gates | 1, 5 | ⬜ |
| **Documentación** | [`docs/`](docs/) | Ciclo de vida por fase + ADRs + prácticas de IA | 1–6 | 🟡 |
| **Herramientas** | [`tools/`](tools/) | Catálogo vivo de MCPs y skills | — | 🟡 |

---

## Cómo funciona

```
PÚBLICO                          PRIVADO (TTL 48 h)
┌──────────────────────┐         ┌──────────────────────────┐
│  web/  (Next.js)     │         │  Detalle técnico propio  │
│  · trayectoria       │         │  · ADRs y arquitectura   │
│  · stack             │         │  · expectativa salarial  │
│  · ANONIMIZADO       │         │  · disponibilidad        │
└──────────┬───────────┘         └────────────▲─────────────┘
           │                                  │
           │  solicitud de acceso             │  RLS decide
           │  (correo corporativo + MX)       │  expires_at > now()
           ▼                                  │
     access-service (Java) ───────────────────┘
           │  · valida dominio
           │  · emite magic link
           │  · gestiona TTL + extensiones (tope 2)
           ▼
      RabbitMQ ──► notificador (Lambda) · auditoría (MongoDB) · analytics
```

**Reglas del modelo de acceso:**
- Sin contraseñas — magic link (el clic prueba control del buzón)
- Aprobación automática validando dominio corporativo + registros MX
- **RLS es la puerta, no la UI**: `expires_at > now()` se evalúa en cada consulta
- 2 extensiones automáticas de 48 h (cooldown 24 h) → después requiere aprobación
- Todo auditado · marca de agua por usuario

Ver [`docs/02-diseno/`](docs/02-diseno/) para el diseño completo.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js (App Router) · TypeScript strict · Tailwind |
| Backend | Java 21 · Spring Boot · RabbitMQ · Redis |
| Serverless | AWS Lambda (Java) · API Gateway |
| Datos | Supabase (PostgreSQL + RLS) · MongoDB Atlas (auditoría) |
| Infra | Docker · Oracle Cloud (2 OCPU / 12 GB ARM) |
| CI/CD | GitHub Actions · GHCR · OIDC federado |
| Observabilidad | Grafana · Sentry · métricas DORA |
| IA | RAG (pgvector) · agentes · MCP |

---

## Costo objetivo

**< USD 3/mes**, con la mayor parte en cero. Las condiciones vigentes están
verificadas y con fuente en [`docs/01-planificacion/`](docs/01-planificacion/).

> ⚠️ Tres trampas ya verificadas que condicionan el diseño:
> **Supabase free pausa a los 7 días de inactividad y tiene 0 días de backups** ·
> **Oracle recortó su capa gratuita a la mitad (2 OCPU / 12 GB) en jun-2026** ·
> **los self-hosted runners de GitHub ya no son gratis en repos privados (mar-2026)**.

---

## Estado

| Fase | Estado |
|---|---|
| 1 · Planificación | 🟡 en curso — framework y estrategia DevOps |
| 2 · Diseño | 🟡 ADRs en redacción |
| 3 · Implementación | ⬜ no iniciada |
| 4 · Pruebas | ⬜ no iniciada |
| 5 · Despliegue | ⬜ no iniciada |
| 6 · Mantenimiento | ⬜ no iniciada |
