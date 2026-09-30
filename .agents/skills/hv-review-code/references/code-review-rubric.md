# Rúbrica y Métricas: Construcción y Revisión de Código

## 1. Métricas de Tamaño y Responsabilidad (Clean Code)

| Métrica | Rango Aceptable | Zona de Alerta | Bloqueante / Refactor Obligatorio |
|---|---|---|---|
| **Líneas por Método / Función** | **5 a 20 líneas** | **21 a 30 líneas** | **> 40 líneas** (debe dividirse en métodos privados o nuevos componentes) |
| **Líneas por Clase** | **< 200 líneas** | **200 a 300 líneas** | **> 300 líneas** (viola principio de responsabilidad única - SRP) |
| **Parámetros por Método** | **1 a 3 parámetros** | **4 parámetros** | **≥ 5 parámetros** (agrupar en un `Record` o DTO inmutable) |
| **Complejidad Ciclomática** | **≤ 5 por método** | **6 a 10** | **> 10** (reducir anidamientos `if/else`, aplicar polimorfismo o pattern matching) |

## 2. Reglas Estrictas de Manejo de Excepciones

- **Excepciones de Negocio**: Deben ser semánticas y específicas. Jamás retornar `null` o booleanos de fallo mudo para representar errores de negocio.
- **Centralización**: Todo controlador REST debe estar protegido por `@RestControllerAdvice`.
- **Estructura RFC 9457**: Todas las respuestas de error deben ser `ProblemDetail`.
- **Validación Declarativa**: Usar `@Valid`, `@NotNull`, `@NotBlank`, `@Size`, `@Email`.
- **Manejo Seguro**:
  - Prohibido `catch (Exception e) {}` vacío o que solo imprima `e.printStackTrace()`.
  - Registrar trazas internamente con `log.error(...)` incluyendo correlation ID.
  - La respuesta hacia el cliente jamás debe incluir el stack trace ni datos de la infraestructura.

## 3. Reglas Estrictas de Frontend (Next.js / TypeScript)

- **TypeScript Strict**: Prohibición de tipo `any`. Todo dato desconocido debe modelarse con `unknown` y validarse con type guards (o Zod si proviene de API).
- **Manejo Obligatorio de 4 Estados**: En componentes que consumen datos asíncronos (`loading`, `error`, `empty`, `data`).
- **Server Components**: Obligatorios por defecto. Usar `'use client'` únicamente cuando se necesite estado local interactivo.
- **Logging**: Prohibido `console.log` en código de producción. Usar logging estructurado.
- **Inmutabilidad**: Usar `as const` en TypeScript y `records` en Java.
