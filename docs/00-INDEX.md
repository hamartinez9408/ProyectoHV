# 📑 Índice del ciclo de vida — ProyectoHV

> **Punto de entrada por fase.** Para buscar por componente, ve al
> [`README.md`](../README.md) raíz.
>
> Este documento es la columna vertebral: cada fase declara qué produce, con qué
> se ejecuta, con qué se integra y **qué la cierra**.

---

## Mapa de fases

| # | Fase | Documento | Estado |
|---|---|---|---|
| 1 | **Planificación** | [`01-planificacion/`](01-planificacion/) | 🟢 |
| 2 | **Diseño** | [`02-diseno/`](02-diseno/) · [ADRs](02-diseno/adr/) | 🟢 |
| 3 | **Implementación** | [`03-implementacion/`](03-implementacion/) | ⬜ |
| 4 | **Pruebas** | [`04-pruebas/`](04-pruebas/) | ⬜ |
| 5 | **Despliegue** | [`05-despliegue/`](05-despliegue/) | ⬜ |
| 6 | **Mantenimiento** | [`06-mantenimiento/`](06-mantenimiento/) | ⬜ |
| — | **Prácticas de IA** *(transversal)* | [`practicas-ia/`](practicas-ia/) | 🟡 |

---

## Fase 1 · Planificación

*Análisis de viabilidad · estimación de costos · roadmap de entregas · requisitos → especificación*

| | |
|---|---|
| **Produce** | Business case · modelo de costos **con fuentes** · roadmap de entregas · especificación de requisitos · **estrategia DevOps** · historias de usuario |
| **Ejecuta** | `sdlc-00-assessment` → `sdlc-00b-questions` → `sdlc-01-hu-refinement` → `sdlc-02-sprint-planning` |
| **Integra** | `hv-atlassian` (épicas en Jira, spec en Confluence) · `tavily_search` · `context7` |
| **Cierra cuando** | Modelo de costos con fuentes citadas · **línea base DORA declarada** · estrategia de pipelines aprobada |

📄 `01-analisis-viabilidad.md` · `02-modelo-costos.md` · `03-estrategia-devops.md` · `04-especificacion-requisitos.md` · `05-roadmap.md` · `06-revision-fase-1.md`

## Fase 2 · Diseño

*Arquitectura · tecnologías · integración · seguridad · historias de usuario*

| | |
|---|---|
| **Produce** | HLD (C4) · LLD (UML) · **ADRs** · modelo de datos · **modelo de amenazas** · contratos OpenAPI |
| **Ejecuta** | `sdlc-03-hld-design` → `sdlc-03b-design-discussion` → `sdlc-04-lld-design` → `sdlc-04b-structure-outline` |
| **Integra** | `hv-atlassian` · `magicuidesign` · `context7` · skill `archify` |
| **Cierra cuando** | **Modelo de amenazas del flujo de acceso 48 h** · ADRs escritos · diagramas renderizados |

📄 [`01-arquitectura-c4.md`](02-diseno/01-arquitectura-c4.md) · [`02-modelo-datos.md`](02-diseno/02-modelo-datos.md) · [`03-modelo-amenazas-stride.md`](02-diseno/03-modelo-amenazas-stride.md) · [`04-contratos-api.md`](02-diseno/04-contratos-api.md) · [`05-revision-fase-2.md`](02-diseno/05-revision-fase-2.md) · [ADRs](02-diseno/adr/)

## Fase 3 · Implementación

*Codificación · entregas pequeñas y manejables*

| | |
|---|---|
| **Produce** | Código · commits convencionales · PRs · **log de decisiones** |
| **Ejecuta** | `sdlc-05-coding` + `sdlc-orchestrator` (capas en paralelo) |
| **Integra** | `hv-github` · `docker` · `hv-supabase` · `context7` |
| **Cierra cuando** | `tsc` limpio · ESLint limpio · **guard de cumplimiento en verde** · gates de CI bloqueantes |

📄 `entregas.md` · `log-decisiones.md`  ·  `pipelines/`

## Fase 4 · Pruebas

*Verificación manual y automática*

| | |
|---|---|
| **Produce** | Plan de pruebas · unit · API · E2E · reporte de cobertura · **bitácora de pruebas manuales** |
| **Ejecuta** | `sdlc-06-unit-testing` → `sdlc-07-api-testing` → `sdlc-08-e2e-qa` |
| **Integra** | `playwright` · `sonarqube` · `postman` |
| **Cierra cuando** | ≥80% líneas / ≥75% branches · 0 issues nuevos · **casos de borde del TTL probados** |

📄 `plan-de-pruebas.md` · `matriz-trazabilidad.md`

## Fase 5 · Despliegue

*Producción con mínima interrupción*

| | |
|---|---|
| **Produce** | Pipeline CD · registro de despliegue · **plan de rollback** · health checks · runbook |
| **Ejecuta** | `sdlc-09-deploy` |
| **Integra** | `docker` · `netlify` · `hv-github` · `hv-supabase` |
| **Cierra cuando** | **Rollback probado, no solo escrito** — romper a propósito y revertir |

📄 `runbook-despliegue.md` · `registro-despliegues.md`

## Fase 6 · Mantenimiento

*Corrección · mejoras · supervisión de rendimiento y seguridad*

| | |
|---|---|
| **Produce** | Dashboards · alertas · runbook de incidentes · **postmortems** · log de deuda técnica · changelog |
| **Ejecuta** | `sdlc-drift` (spec ↔ código) · `sdlc-guard` · **⚠️ sin agente de monitoreo — hueco a llenar** |
| **Integra** | `grafana` · `hv-sentry` · Zabbix propio *(no el de Stefanini)* |
| **Cierra cuando** | Alertas configuradas · runbook escrito · **primer postmortem provocado a propósito** |

📄 `runbook-incidentes.md` · `postmortems/` · `deuda-tecnica.md`

> 🎯 **Este es el hueco de tu framework v5.0.** Ninguna de las fases restantes
> tiene agente dedicado. Llenarlo es un logro contable en entrevista.

---

## Campos obligatorios en todo artefacto

Todos los documentos de este ciclo llevan, al final:

```markdown
## Decisión humana
- **Qué decidió Harold:** ...
- **Qué ejecutó la IA:** ...
- **Alternativas descartadas:** ...
```

**No es opcional.** Un portafolio construido por IA que el autor no puede
defender es un pasivo, no un activo. Esta sección es lo que convierte el uso de
IA en una demostración de criterio en lugar de una dependencia.

Ver [`practicas-ia/`](practicas-ia/) para el detalle.
