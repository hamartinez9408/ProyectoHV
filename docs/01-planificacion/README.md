# Fase 1 · Planificación

> *Análisis de viabilidad · estimación de costos · cronograma · requisitos →
> documento de especificaciones · estrategia DevOps*

---

## Documentos de esta fase

| Documento | Qué contiene | Estado |
|---|---|---|
| [`01-analisis-viabilidad.md`](01-analisis-viabilidad.md) | Viabilidad técnica, económica y de portafolio; dimensionamiento VM ARM y riesgos | ✅ Completo |
| [`02-modelo-costos.md`](02-modelo-costos.md) | Costos por componente **con fuentes verificadas** y las tres trampas de la capa gratuita | ✅ Completo |
| [`03-estrategia-devops.md`](03-estrategia-devops.md) | Los 4 pipelines, gates bloqueantes, métricas DORA, entornos y secretos | ✅ Completo |
| [`04-especificacion-requisitos.md`](04-especificacion-requisitos.md) | Requisitos funcionales (RF) y no funcionales (RNF); trazabilidad de componentes | ✅ Completo |
| [`05-roadmap.md`](05-roadmap.md) | Roadmap por rebanadas verticales (Slices 0 a 5) y criterios DoD | ✅ Completo |
| [`07-backlog-jira.md`](07-backlog-jira.md) | Backlog completo en Jira: 5 Épicas, 14 Historias (INVEST/BDD) y 37 Subtareas | ✅ Sincronizado |

Los **criterios de aceptación** y las historias de usuario se derivan en
[`../03-implementacion/`](../03-implementacion/).

---

## Cómo se ejecuta esta fase

| | |
|---|---|
| **Agentes** | `hv-orchestrator` · subagentes de capa · `hv-compliance` |
| **MCPs** | `hv-atlassian` (épicas en Jira · spec en Confluence) · `tavily_search` · `context7` |
| **Skills** | `hv-review-planning` · `hv-review-requirements` (INVEST + BDD) |

---

## Gate de salida de la fase

Estado de cumplimiento de los criterios de salida:

- [x] **Modelo de costos con fuentes citadas** — en `02-modelo-costos.md` (< USD 3/mes).
- [x] **Línea base DORA declarada** — en `03-estrategia-devops.md` (§3).
- [x] **Estrategia de pipelines aprobada** — en `03-estrategia-devops.md` (4 pipelines + Capa 4).
- [x] **Análisis de viabilidad de portafolio** — en `01-analisis-viabilidad.md` (dimensionamiento y tecnologías).
- [x] **Especificación de requisitos estructurada** — en `04-especificacion-requisitos.md` (RF-01 a RF-14 y RNF-01 a RNF-09).
- [x] **Roadmap de entregas verticales definido** — en `05-roadmap.md` (Slices 0 a 5).
- [ ] **Revisión y redirección humana de Harold** — validación final humana antes del diseño formal.

---

## Nota sobre el orden de trabajo

Planificación **no** es una fase que se termina antes de diseñar. En este proyecto
se ejecuta en dos pasadas:

1. **Pasada 1 (hecha):** viabilidad, costos y estrategia DevOps — porque definen
   las restricciones que el diseño debe respetar (capa gratuita, TTL en RLS,
   repo público, 2 proyectos Supabase).
2. **Pasada 2 (pendiente):** requisitos detallados e historias de usuario, una vez
   el diseño y el modelo de amenazas estén claros.

Hacer los requisitos primero, sin las restricciones conocidas, habría producido
una especificación que el diseño tendría que deshacer.
