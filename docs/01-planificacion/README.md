# Fase 1 · Planificación

> *Análisis de viabilidad · estimación de costos · cronograma · requisitos →
> documento de especificaciones · estrategia DevOps*

---

## Documentos de esta fase

| Documento | Qué contiene | Estado |
|---|---|---|
| [`01-analisis-viabilidad.md`](01-analisis-viabilidad.md) | Viabilidad técnica, económica y de portafolio; qué se gana y qué se arriesga | ⬜ pendiente |
| [`02-modelo-costos.md`](02-modelo-costos.md) | Costos por componente **con fuentes verificadas** y las tres trampas de la capa gratuita | ✅ |
| [`03-estrategia-devops.md`](03-estrategia-devops.md) | Los 4 pipelines, gates bloqueantes, métricas DORA, entornos y secretos | ✅ |
| [`04-especificacion-requisitos.md`](04-especificacion-requisitos.md) | Requisitos funcionales y no funcionales; el documento de especificaciones | ⬜ pendiente |
| `05-cronograma.md` | Roadmap por entregas verticales | ⬜ pendiente |

Los **criterios de aceptación** y las historias de usuario se derivan en
[`../03-implementacion/`](../03-implementacion/).

---

## Cómo se ejecuta esta fase

| | |
|---|---|
| **Agentes** | `sdlc-00-assessment` → `sdlc-00b-questions` → `sdlc-01-hu-refinement` → `sdlc-02-sprint-planning` |
| **MCPs** | `hv-atlassian` (épicas en Jira · spec en Confluence) · `tavily_search` · `context7` |
| **Skills** | `sdlc-01-hu-refinement` (INVEST + BDD) · `sdlc-02-sprint-planning` (COSMIC + SNAP) |

---

## Gate de salida de la fase

Esta fase no se cierra hasta que existan:

- [ ] **Modelo de costos con fuentes citadas** — sin fuentes no es un modelo, es una opinión
- [ ] **Línea base DORA declarada** — contra qué se va a comparar el resultado
- [ ] **Estrategia de pipelines aprobada** — los 4 pipelines con sus gates
- [ ] **Análisis de viabilidad de portafolio** — qué tecnología evidencia cada componente
- [ ] Especificación de requisitos revisada y **redirigida por Harold** (no solo leída)

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
