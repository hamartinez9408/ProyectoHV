---
name: hv-review-requirements
description: Reviewer for User Stories and Requirements Refinement in ProyectoHV. Validates stories against INVEST criteria, enforces BDD/Gherkin acceptance criteria (Dado/Cuando/Entonces), verifies dual estimation (COSMIC functional size and SNAP technical complexity), and approves Definition of Ready (DoR). Use when creating or refining user stories.
---

# HV-REVIEW-REQUIREMENTS — Revisor de Historias de Usuario

Este skill audita el refinamiento de requisitos e historias de usuario antes de que entren a la etapa de diseño o implementación.

## Cuándo Usar Este Skill
- Al escribir nuevas historias de usuario en `docs/01-planificacion/` o backlog.
- Antes de iniciar el diseño arquitectónico de una funcionalidad.
- Durante sesiones de refinamiento con DeepSeek o Gemini.

## Proceso de Verificación
1. **Auditoría INVEST**: Evaluar la historia contra los 6 principios en [invest-bdd-checklist.md](./references/invest-bdd-checklist.md).
2. **Revisión de Criterios BDD**: Verificar que los criterios de aceptación no sean descripciones vagas, sino escenarios precisos `Dado / Cuando / Entonces`, incluyendo casos felices y casos de borde.
3. **Verificación de Estimación**: Confirmar la estimación funcional en puntos COSMIC (CFP) y el score de complejidad técnica SNAP.
4. **Validación de Definition of Ready (DoR)**:
   - [ ] Actor y valor de negocio identificados.
   - [ ] Criterios BDD completos (mínimo 1 caso feliz y 2 casos de borde).
   - [ ] Entradas, salidas y contratos de datos definidos.
   - [ ] Estimación aprobada (≤ 5 CFP).
5. **Veredicto**: Generar reporte de aprobación o devolución para ajuste.
