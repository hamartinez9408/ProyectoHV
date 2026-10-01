# Contratos de API REST y Estándar RFC 9457 — ProyectoHV

> **Fase:** 2 · Diseño  
> **Estado:** Aprobado para diseño técnico  
>
> **Decisión humana**
> - **Qué decidió Harold:** Estandarizar todas las interfaces de comunicación REST bajo especificación OpenAPI 3.1 formal; estructurar el 100% de las respuestas de error bajo el estándar RFC 9457 (`ProblemDetail`); implementar validación declarativa con Bean Validation (`@Valid`); y desacoplar la emisión del Magic Link de forma asíncrona mediante respuesta HTTP 202 Accepted.
> - **Qué ejecutó la IA:** Redacción de esquemas OpenAPI 3.1 completos para los microservicios de acceso, exportación de CV y búsqueda híbrida, definiendo tipos, restricciones, códigos de estado HTTP y contratos de error RFC 9457.
> - **Riesgo técnico asumido conscientemente:** El cliente debe estar preparado para procesar respuestas asíncronas HTTP 202 Accepted en la solicitud de acceso y consultar el estado mediante polling o esperar la llegada del correo transaccional.
> - **Alternativas descartadas:** Respuestas síncronas bloqueantes en la solicitud de Magic Link (vulnerables a latencia de red en resolución DNS y llamadas a APIs de correo); payloads de error personalizados con estructuras propietarias incompatibles con clientes estándar.

---

## 1. Estándar de Representación de Errores: RFC 9457 (`ProblemDetail`)

Todos los microservicios (`access-service`, `cv-service`, `search-service`) devuelven errores con el encabezado HTTP `Content-Type: application/problem+json`:

```json
{
  "type": "https://proyectohv.dev/errors/email-domain-invalid",
  "title": "Dominio corporativo no válido o sin registros MX",
  "status": 422,
  "detail": "El dominio ingresado (empresa-sin-mx.com) no posee registros DNS MX configurados para recibir correos.",
  "instance": "/api/v1/access/requests",
  "timestamp": "2026-09-30T18:45:00.123Z",
  "correlationId": "corr_7d9086a3-7ccc-4186-b0cc-325aaa6ec457",
  "invalidParams": [
    {
      "field": "email",
      "reason": "Sin registros DNS MX detectados"
    }
  ]
}
```

---

## 2. Especificación OpenAPI 3.1 de Endpoints

### 2.1. `POST /api/v1/access/requests` — Solicitar Enlace de Acceso Temporal (Magic Link)
- **Descripción:** Inicia el flujo de verificación. Valida sintaxis, lista negra de dominios genéricos y publica el evento en RabbitMQ para verificación DNS MX asíncrona.
- **Headers Requeridos:** `Content-Type: application/json`

#### Request Body
```json
{
  "email": "evaluador.tech@empresa-ejemplo.com",
  "hasConsent": true,
  "evaluatorName": "Carlos Mendoza",
  "evaluatorCompany": "Empresa Ejemplo S.A."
}
```

#### Respuestas
- **`202 Accepted`** — Solicitud aceptada para procesamiento asíncrono:
  ```json
  {
    "requestId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "status": "PENDING_VALIDATION",
    "message": "Solicitud en proceso de verificación DNS. Recibirá el enlace si el dominio es válido.",
    "checkStatusUrl": "/api/v1/access/requests/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
  }
  ```
- **`400 Bad Request`** — Violación de validación declarativa (RFC 9457):
  ```json
  {
    "type": "https://proyectohv.dev/errors/validation-failed",
    "title": "Error de validación en la solicitud",
    "status": 400,
    "detail": "Uno o más campos no cumplen con las restricciones requeridas.",
    "invalidParams": [
      { "field": "email", "reason": "Debe ser una dirección de correo bien formada" },
      { "field": "hasConsent", "reason": "Debe otorgar consentimiento explícito para continuar" }
    ]
  }
  ```
- **`422 Unprocessable Entity`** — Dominio en lista negra o sin registros MX (RFC 9457):
  ```json
  {
    "type": "https://proyectohv.dev/errors/email-domain-rejected",
    "title": "Dominio de correo no permitido",
    "status": 422,
    "detail": "Los dominios genéricos gratuitos (gmail.com, hotmail.com, etc.) no están autorizados para acceder al nivel privado."
  }
  ```
- **`429 Too Many Requests`** — Límite de tasa excedido (RFC 9457):
  ```json
  {
    "type": "https://proyectohv.dev/errors/rate-limit-exceeded",
    "title": "Demasiadas solicitudes",
    "status": 429,
    "detail": "Ha superado el límite de 5 solicitudes por hora para su dirección IP."
  }
  ```

---

### 2.2. `GET /api/v1/access/verify` — Reclamar Token de Magic Link
- **Descripción:** Valida el token raw criptográfico de 32 bytes contra el `token_hash` en PostgreSQL. Si es válido y no ha expirado, registra la fecha de reclamación (`claimed_at`) y emite un JWT firmado por Supabase Auth conteniendo el claim `{ grant_id: uuid }`, inyectado en una cookie de sesión HttpOnly segura.
- **Query Parameters:**
  - `token` (String, requerido): Token Base64URL recibido en el correo.

#### Respuestas
- **`200 OK`** — Token reclamado exitosamente:
  - **Headers:** `Set-Cookie: hv_session=eyJhbGciOiJIUzI1Ni...; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=172800`
  ```json
  {
    "email": "e***@empresa-ejemplo.com",
    "expiresAt": "2026-10-02T18:45:00Z",
    "remainingSeconds": 172800,
    "extensionCount": 0,
    "canExtend": true,
    "sessionJwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJncmFudF9pZCI6IjdkOTA4NmEz..."
  }
  ```
- **`401 Unauthorized`** — Token inválido, revocado o expirado (RFC 9457):
  ```json
  {
    "type": "https://proyectohv.dev/errors/invalid-token",
    "title": "Token de acceso inválido o expirado",
    "status": 401,
    "detail": "El enlace utilizado ha expirado o ya fue reclamado previamente. Por favor solicite uno nuevo."
  }
  ```

---

### 2.3. `GET /api/v1/access/status` — Consultar Estado y TTL Restante
- **Descripción:** Permite a la interfaz web consultar los segundos restantes del grant activo para renderizar el banner de tiempo y habilitar el botón de extensión.
- **Headers Requeridos:** Cookie `hv_session` o header `Authorization: Bearer <sessionJwt>`.

#### Respuestas
- **`200 OK`**:
  ```json
  {
    "isActive": true,
    "expiresAt": "2026-10-02T18:45:00Z",
    "remainingSeconds": 86340,
    "extensionCount": 0,
    "canExtend": true
  }
  ```
- **`401 Unauthorized`** (si el TTL ya venció):
  ```json
  {
    "type": "https://proyectohv.dev/errors/session-expired",
    "title": "Sesión expirada",
    "status": 401,
    "detail": "Su acceso temporal de 48 horas ha expirado."
  }
  ```

---

### 2.4. `POST /api/v1/access/extend` — Solicitar Extensión de Acceso (Alineado con RF-09)
- **Descripción:** Extiende el grant activo por 48 horas adicionales. En auto-servicio se permiten hasta dos (2) extensiones con cooldown de 24 horas; una tercera solicitud pasa a estado de aprobación manual por parte de Harold.
- **Headers Requeridos:** Cookie `hv_session` o header `Authorization: Bearer <sessionJwt>`.

#### Respuestas
- **`200 OK`** (Extensiones 1 y 2 automáticas):
  ```json
  {
    "status": "APPROVED",
    "extensionNumber": 1,
    "newExpiresAt": "2026-10-04T18:45:00Z",
    "remainingSeconds": 172800,
    "extensionCount": 1,
    "message": "Acceso extendido satisfactoriamente por 48 horas adicionales."
  }
  ```
- **`202 Accepted`** (Tercera extensión — requiere aprobación manual según RF-09):
  ```json
  {
    "status": "PENDING_MANUAL_APPROVAL",
    "extensionNumber": 3,
    "message": "Ha solicitado una tercera extensión. Su solicitud ha sido enviada para aprobación manual por parte de Harold."
  }
  ```
- **`409 Conflict`** — Límite máximo de extensiones excedido:
  ```json
  {
    "type": "https://proyectohv.dev/errors/extension-limit-reached",
    "title": "Límite de extensiones alcanzado",
    "status": 409,
    "detail": "Ha superado el número máximo de extensiones permitidas para esta concesión."
  }
  ```
- **`429 Too Many Requests`** — Período de cooldown no transcurrido:
  ```json
  {
    "type": "https://proyectohv.dev/errors/cooldown-active",
    "title": "Período de espera activo",
    "status": 429,
    "detail": "Debe esperar al menos 24 horas desde la activación inicial antes de solicitar una extensión."
  }
  ```

---

### 2.5. `GET /api/v1/cv/export/pdf` — Descargar CV con Marca de Agua Dinámica
- **Descripción:** Genera o transmite el archivo PDF del currículum profesional. Si la sesión es privada y válida, inyecta estamping forense dinámico con los datos del evaluador; si es pública, entrega la versión resumida anonimizada.
- **Headers Requeridos:** Cookie `hv_session` (opcional; si falta, entrega versión pública).

#### Respuestas
- **`200 OK`**:
  - **Headers:**
    - `Content-Type: application/pdf`
    - `Content-Disposition: attachment; filename="CV_Harold_Rodriguez_Tech_Lead.pdf"`
    - `X-Watermark-Applied: true`
  - **Body:** Flujo binario del archivo PDF.

---

### 2.6. `POST /api/v1/search` — Búsqueda Híbrida Semántica y Léxica
- **Descripción:** Ejecuta una consulta vectorial con pgvector combinada con filtros léxicos.
- **Headers Requeridos:** `Content-Type: application/json`

#### Request Body
```json
{
  "query": "Liderazgo técnico en microservicios Java y Spring Boot",
  "limit": 5,
  "threshold": 0.75,
  "includePrivate": true
}
```

#### Respuestas
- **`200 OK`**:
  ```json
  [
    {
      "id": "e4b2d100-3344-4822-a9b0-123456789abc",
      "entityType": "experience",
      "title": "Tech Lead / Líder Técnico",
      "similarityScore": 0.884,
      "snippet": "Diseño y modernización de arquitectura distribuida orientada a eventos con RabbitMQ y Spring Boot 3...",
      "isPrivate": false
    },
    {
      "id": "f5c3e211-4455-4933-b0c1-234567890def",
      "entityType": "adr",
      "title": "ADR-001: Arquitectura Hexagonal en Microservicios",
      "similarityScore": 0.841,
      "snippet": "Aislamiento estricto del dominio mediante puertos y adaptadores...",
      "isPrivate": true
    }
  ]
  ```
