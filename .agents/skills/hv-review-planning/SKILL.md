---
name: hv-review-planning
description: Reviewer for Phase 1 (Planning and Feasibility) in ProyectoHV. Audits business case, cost model with validated external sources (< USD 3/month target), DORA baseline metrics, DevOps pipeline strategy, and mandatory human decision logging. Use when creating or reviewing documents in docs/01-planificacion/.
---

# HV-REVIEW-PLANNING — Revisor de Planificación y Viabilidad

Este skill actúa como el **auditor formal de la Fase 1 del SDLC**, asegurando que ningún desarrollo comience sin una justificación de negocio, viabilidad técnica, modelo de costos verificado y línea base métrica clara.

## Cuándo Usar Este Skill
- Al redactar o actualizar documentos en `docs/01-planificacion/` (`01-analisis-viabilidad.md`, `02-modelo-costos.md`, `03-estrategia-devops.md`, `README.md`).
- Antes de cerrar la Fase 1 y pasar a la Fase 2 (Diseño / Arquitectura).
- Cuando se evalúe un cambio en la infraestructura, costos o herramientas.

## Procedimiento de Revisión
1. **Inspección del Artefacto**: Leer el documento de planificación en `docs/01-planificacion/`.
2. **Evaluación contra la Rúbrica**: Consultar [planning-rubric.md](./references/planning-rubric.md) y validar los 5 criterios (P-1 a P-5).
3. **Verificación de Restricciones Críticas**:
   - Confirmar que el costo total estimado sea estrictamente **< USD 3/mes**.
   - Validar que las trampas de la nube estén identificadas (pausa de Supabase a los 7 días, límite de Oracle Cloud ARM a 2 OCPU / 12 GB, costos de GitHub runners en repos privados).
   - Validar que la sección **`Decisión humana`** esté presente con los 3 campos obligatorios.
4. **Emisión de Veredicto**:
   - **APROBADO**: Si cumple el 100% de los criterios bloqueantes.
   - **APROBADO CON OBSERVACIONES**: Si cumple los bloqueantes pero tiene mejoras menores no críticas.
   - **RECHAZADO**: Si falta algún criterio bloqueante (P-1, P-2, P-3 o P-5).
