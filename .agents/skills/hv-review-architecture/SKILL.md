---
name: hv-review-architecture
description: Reviewer for Phase 2 (Architecture and Design) in ProyectoHV. Audits C4 model diagrams, Archify JSON specifications, Clean/Hexagonal Architecture boundaries, STRIDE threat models (access flow 48h TTL), ADR quality, and OpenAPI contracts with RFC 9457 ProblemDetail. Use when reviewing architectural documents in docs/02-diseno/ and ADRs.
---

# HV-REVIEW-ARCHITECTURE — Revisor de Arquitectura y Diseño

Este skill audita las decisiones arquitectónicas, modelos de amenazas y contratos de diseño de la Fase 2 del SDLC.

## Cuándo Usar Este Skill
- Al redactar o modificar documentos en `docs/02-diseno/` (`arquitectura.md`, `modelo-datos.md`, `modelo-amenazas.md`).
- Al crear o revisar nuevos ADRs en `docs/02-diseno/adr/`.
- Antes de comenzar la implementación de un microservicio o función serverless.

## Procedimiento de Auditoría
1. **Validación de Límites Hexagonales**:
   - Verificar que el paquete `domain` sea agnóstico a frameworks y bases de datos.
   - Confirmar que la comunicación entre capas se realice a través de puertos e interfaces.
2. **Auditoría de Amenazas STRIDE**:
   - Comparar el diseño contra los 6 vectores de amenaza detallados en [c4-stride-adr-checklist.md](./references/c4-stride-adr-checklist.md).
   - Validar que el flujo de acceso de 48 horas no delegue la seguridad a la UI web.
3. **Revisión de ADRs**:
   - Verificar presencia de alternativas descartadas y análisis de consecuencias.
   - Exigir la sección obligatoria de **`Decisión humana`**.
4. **Verificación de Contratos REST**:
   - Comprobar que los endpoints definan esquemas OpenAPI con respuestas de error basadas en el estándar **RFC 9457 (`ProblemDetail`)**.
5. **Emisión de Dictamen**:
   - Aprobar o bloquear el pase a la Fase 3 (Implementación).
