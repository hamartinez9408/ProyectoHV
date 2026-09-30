---
name: hv-review-devops
description: Reviewer for Phase 5 (Deployment & DevOps) and Phase 6 (Maintenance & Observability) in ProyectoHV. Audits CI/CD pipeline blocking gates, multi-stage Docker security (non-root user), secret isolation (OIDC federation), automated rollback readiness, structured JSON logging with correlation IDs, and spec-drift reconciliation. Use when modifying pipelines or deployment configurations.
---

# HV-REVIEW-DEVOPS — Revisor de DevOps y Operación

Este skill audita los procesos de integración continua, entrega continua, seguridad de infraestructura y observabilidad en producción.

## Cuándo Usar Este Skill
- Al modificar archivos de configuración en `pipelines/` o `.github/workflows/`.
- Al crear o ajustar Dockerfiles o `docker-compose.yml` en `infra/`.
- Antes de promover un release a staging o producción.
- En revisiones de mantenimiento, incidentes y análisis postmortem.

## Proceso de Auditoría
1. **Revisión de Gates de Pipeline**:
   - Confirmar que los 5 gates bloqueantes descritos en [cicd-devops-checklist.md](./references/cicd-devops-checklist.md) estén configurados y no sean permisivos.
2. **Inspección de Dockerfile**:
   - Verificar compilación multi-etapa, ausencia de credenciales embebidas y uso de usuario `USER appuser`.
3. **Validación del Mecanismo de Rollback**:
   - Confirmar que exista una estrategia de reversión inmediata en caso de fallo en el health check posterior al deploy.
4. **Auditoría de Observabilidad**:
   - Comprobar que los logs salgan en JSON estructurado y que se capture el identificador de correlación `X-Correlation-ID`.
   - Validar configuración de alertas en Sentry y recolección de métricas DORA.
5. **Detección de Spec-Drift**:
   - Verificar que los artefactos desplegados no diverjan de los ADRs ni de las especificaciones OpenAPI.
