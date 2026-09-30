---
name: hv-review-testing
description: Reviewer for Phase 4 (Testing and QA) in ProyectoHV. Audits test pyramid balance (Unit, Integration with Testcontainers, API contracts, Playwright E2E), enforces coverage gates (≥80% line, ≥75% branch), verifies critical edge cases (TTL 48h, DNS MX failures, extension limits), and checks assertion hygiene. Use when creating or evaluating test suites.
---

# HV-REVIEW-TESTING — Revisor de Pruebas y Aseguramiento de Calidad

Este skill actúa como el **auditor de calidad de software y pruebas**, verificando que el comportamiento del sistema esté blindado mediante pruebas automatizadas rigurosas antes de cualquier despliegue.

## Cuándo Usar Este Skill
- Al terminar de implementar los tests de una Historia de Usuario.
- Antes de aprobar un Pull Request hacia la rama principal.
- Cuando se agreguen nuevos flujos de datos o reglas de seguridad de acceso.

## Proceso de Verificación
1. **Revisión de Cobertura**:
   - Confirmar cumplimiento de los umbrales mínimos: **≥ 80% líneas** y **≥ 75% ramas**.
2. **Auditoría de Casos de Borde**:
   - Validar que se hayan probado los escenarios de borde listados en [testing-pyramid-checklist.md](./references/testing-pyramid-checklist.md) (expiración de TTL, cooldown de extensiones, dominios sin MX).
3. **Calidad de Pruebas de Integración**:
   - Confirmar que las pruebas de integración utilicen bases de datos reales o contenedores efímeros (Testcontainers para PostgreSQL / RabbitMQ), evitando mocks excesivos que oculten bugs de dialecto SQL o transaccionalidad.
4. **Pruebas End-to-End (E2E)**:
   - Verificar scripts de Playwright para flujos críticos: solicitud de acceso -> recepción de magic link -> visualización de portal privado con marca de agua.
5. **Veredicto de Calidad**:
   - Aprobar o bloquear el avance a la Fase 5 (Despliegue).
