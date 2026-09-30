# ADR-006: Estandarización de Errores HTTP con RFC 9457 ProblemDetail

> **Fase:** 2 · Diseño  
> **Estado:** Aceptado  
>
> **Decisión humana**
> - **Qué decidió Harold:** Prohibir el uso de formatos propietarios de error o respuestas genéricas de fallo; adoptar el estándar oficial de la IETF **RFC 9457 (`ProblemDetail`)** para el 100% de las respuestas de error HTTP en todos los microservicios y funciones del sistema; centralizar el mapeo de excepciones en `@RestControllerAdvice` desacoplado de la lógica de controladores.
> - **Qué ejecutó la IA:** Especificación del esquema de error extendido (`ProblemDetail` con `correlationId`, `timestamp` y `invalidParams`), plantilla de manejador global de excepciones para Spring Boot 3.4 y directrices de mapeo para códigos HTTP semánticos (400, 401, 403, 404, 409, 422, 429, 500).
> - **Riesgo técnico asumido conscientemente:** Exige que los clientes de frontend (Next.js) implementen un deserializador unificado capaz de extraer la estructura RFC 9457 para renderizar los mensajes de error en los 4 estados obligatorios de la UI.
> - **Alternativas descartadas:** Estructura propietaria tipo `{ "success": false, "code": 102, "message": "error" }` (introduce acoplamiento innecesario y reinventa una rueda que la IETF ya estandarizó); retornar únicamente códigos de estado HTTP sin cuerpo JSON explicativo (deja al cliente a ciegas sobre qué campo falló en validaciones complejas).

---

## 1. Contexto

En sistemas distribuidos con múltiples microservicios (`access-service`, `cv-service`, `search-service`) e interfaces heterogéneas, la falta de uniformidad en los mensajes de error es una de las principales fuentes de fricción en la integración.

Respuestas con esquemas dispares (en ocasiones cadenas de texto plano, en otras objetos JSON arbitrarios o trazas de pila Java expuestas) representan un riesgo de seguridad (fuga de información técnica sobre versiones y librerías) y complican el manejo consistente de errores en el frontend.

---

## 2. Alternativas Evaluadas

### Alternativa 1: Envoltura Propietaria de Respuesta (`ApiResponse<T>`)
- **Ventajas:** Patrón común donde todo payload lleva `{ success: boolean, data: T, error: String }`.
- **Desventajas:** Viola el principio HTTP: devuelve respuestas 200 OK con `success: false` en el cuerpo; confunde proxies intermedios, herramientas de observabilidad y clientes REST estándar.

### Alternativa 2: Solo Código de Estado HTTP sin Cuerpo
- **Ventajas:** Cero overhead de serialización.
- **Desventajas:** Incapacidad de comunicar detalles finos en errores 400 o 422 (p. ej., si un formulario tiene 4 campos inválidos, el cliente no sabe cuáles fallaron ni por qué).

### Alternativa 3: Estándar IETF RFC 9457 (`application/problem+json`) — ELEGIDA
- **Ventajas:**
  - Estándar oficial de la industria respaldado por la IETF (sucesor del RFC 7807).
  - Soporte nativo de primera clase en Spring Boot 3.x mediante la clase `org.springframework.http.ProblemDetail`.
  - Campos estandarizados (`type`, `title`, `status`, `detail`, `instance`) más extensiones personalizadas (`properties`).
  - Compatible con cualquier cliente HTTP moderno y bibliotecas de OpenAPI.
- **Desventajas:** Requiere configurar explícitamente `ResponseEntityExceptionHandler` en Spring MVC.

---

## 3. Decisión

Se adopta **RFC 9457 (`ProblemDetail`)** como el único formato de error autorizado en todas las APIs del proyecto:

1. **Cabecera HTTP:** Todo error se emite con `Content-Type: application/problem+json`.
2. **Esquema Extendido:**
   - `type`: URI absoluta que identifica la categoría de error (ej. `https://proyectohv.dev/errors/email-domain-rejected`).
   - `title`: Resumen corto y legible del tipo de problema en español.
   - `status`: Código de estado HTTP concordante (400, 401, 404, 409, 422, 429, 500).
   - `detail`: Explicación detallada y contextual para el usuario.
   - `instance`: URI del endpoint específico que originó el problema.
   - Extensiones (`properties`):
     - `timestamp`: Marca temporal en formato ISO 8601 UTC.
     - `correlationId`: Identificador único de trazabilidad para rastreo en logs y MongoDB.
     - `invalidParams`: Lista de objetos `{ field, reason }` en caso de errores de validación de formulario.
3. **Manejo Centralizado:**
   Implementación obligatoria de `@RestControllerAdvice` heredando de `ResponseEntityExceptionHandler` para interceptar `MethodArgumentNotValidException`, excepciones de dominio y errores inesperados, garantizando que **nunca se filtre un stack trace Java al cliente**.

---

## 4. Consecuencias

### Positivas
- Resuelve directamente los lineamientos del skill [`hv-review-code`](../../../.agents/skills/hv-review-code/SKILL.md) y [`hv-review-architecture`](../../../.agents/skills/hv-review-architecture/SKILL.md).
- Seguridad robusta: Previene fugas de información interna de la base de datos o librerías Java (mitiga la amenaza STRIDE **I-03**).
- Excelente experiencia de desarrollador e integración limpia con el frontend Next.js.

### Negativas / Deuda Técnica Aceptada
- Ninguna significativa.
