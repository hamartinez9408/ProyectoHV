---
name: hv-review-code
description: Reviewer for Phase 3 (Development and Code Construction) in ProyectoHV. Enforces clean code metrics (functions 5-20 lines, max 40-50; classes max 200-300 lines), centralized exception handling (@RestControllerAdvice, @ExceptionHandler, RFC 9457 ProblemDetail), declarative validation (Bean Validation @Valid), safe error logging, strict TypeScript without any, and mandatory 4-states UI pattern. Use when reviewing pull requests or generated code.
---

# HV-REVIEW-CODE — Revisor de Construcción de Código y Buenas Prácticas

Este skill actúa como el **auditor técnico de código**, validando que cada implementación cumpla con las métricas de tamaño, arquitectura limpia, manejo seguro de excepciones y estándares de tipado estricto.

## Cuándo Usar Este Skill
- Al terminar la codificación de una Historia de Usuario (en Java Spring Boot o Next.js).
- Antes de commitear o crear un Pull Request.
- Durante revisiones de código cruzadas entre Gemini y DeepSeek.

## Criterios Auditados

### 1. Métricas de Tamaño y Responsabilidad Única (SRP)
- **Métodos y Funciones**:
  - Ideal: **5 a 20 líneas** de lógica.
  - Alerta: **21 a 30 líneas**.
  - **Bloqueo (Refactor Obligatorio)**: Más de **40 líneas** requiere división en submétodos o servicios auxiliares.
- **Clases**:
  - Máximo recomendado: **200 a 300 líneas**. Clases mayores a 300 líneas deben descomponerse.
- **Parámetros**: Máximo 3 a 4 parámetros por método; por encima de 4, agrupar en un `Record` o DTO inmutable.

### 2. Manejo Centralizado de Excepciones y Respuestas REST
- **Excepciones Específicas**: Lanzar excepciones de dominio semánticas (`MagicLinkExpiradoException`, `DominioSinRegistrosMxException`). Cero retornos de `null` o booleanos de fallo mudo.
- **Manejador Global**: Control centralizado mediante `@RestControllerAdvice` y `@ExceptionHandler` (ver [spring-exception-rfc9457.md](./references/spring-exception-rfc9457.md)).
- **Estándar RFC 9457**: Todas las respuestas de error deben estructurarse con `ProblemDetail`.
- **Validación Declarativa**: DTOs anotados con Bean Validation (`@NotNull`, `@Size`, `@Email`, etc.) y procesados con `@Valid`.
- **Higiene de Captura y Logs**:
  - Prohibido `e.printStackTrace()` o `System.out.println`.
  - Capturar solo lo que se pueda manejar o traducir; no usar `catch (Exception e)` indiscriminado.
  - Trazas completas en logs internos estructurados; **jamás fugar stack traces al cliente**.

### 3. Frontend y TypeScript
- Prohibición de tipo `any`. Uso de `unknown` + validación por contratos.
- Patrón de 4 estados en todo componente que consuma datos (`loading`, `error`, `empty`, `data`).
- Server Components por defecto en Next.js App Router.
- Inmutabilidad con `as const` y Java `records`.

## Ejecución del Script de Métricas Automatizado
Para auditar archivos modificados:
```bash
node .agents/skills/hv-review-code/scripts/check-code-metrics.mjs services/access/src/main/java/.../AccessService.java web/src/app/.../page.tsx
```
