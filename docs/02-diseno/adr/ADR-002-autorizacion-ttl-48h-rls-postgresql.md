# ADR-002: Autorización y Control de Expiración (TTL 48h) Gobernado Exclusivamente por PostgreSQL RLS

> **Fase:** 2 · Diseño  
> **Estado:** Aceptado  
>
> **Decisión humana**
> - **Qué decidió Harold:** Desacoplar completamente el mecanismo de autenticación del mecanismo de autorización temporal; radicar la expiración del TTL de 48 horas exclusivamente en la base de datos PostgreSQL mediante Row Level Security (RLS), asegurando que ninguna entidad (cliente web, proxy o microservicio) pueda burlar la ventana de tiempo.
> - **Qué ejecutó la IA:** Diseño de las políticas RLS en PostgreSQL, función de seguridad `is_active_grant()`, y modelado de la tabla `access.grants` con índice condicional sobre `expires_at`.
> - **Riesgo técnico asumido conscientemente:** Las consultas a tablas protegidas por RLS ejecutan una verificación contra `access.grants` en cada lectura, lo que añade una pequeña sobrecarga de latencia (sub-milisegundo gracias al índice `idx_grants_expiration`).
> - **Alternativas descartadas:** Confiar en el claim de expiración (`exp`) del JWT de Supabase Auth (el plan gratuito de Supabase no permite configurar tiempos de vida de sesión personalizados de 48 h y no ofrece revocación inmediata de tokens); filtrado exclusivo en la capa de controladores de Spring Boot (obliga a enrutar lecturas directas a través del microservicio, perdiendo la eficiencia de Server Components de Next.js conectados a Supabase).

---

## 1. Contexto

El requerimiento central de privacidad de ProyectoHV es permitir el acceso a información técnica sensible, expectativas salariales y CV completo durante una ventana estricta de **48 horas (TTL)** a evaluadores que demuestren posesión de un correo corporativo válido.

En la auditoría de Fase 1 (Hallazgo H-5), se identificó un conflicto arquitectónico: Supabase Auth gestiona sesiones mediante JWTs estándar cuyo TTL en el plan Free no es configurable a 48 horas fijas, ni soporta listas negras de revocación en tiempo real sin infraestructura adicional de pago. Si se delega la seguridad al token del cliente, un atacante con una copia del token podría eludir la expiración manipulando el almacenamiento local.

---

## 2. Alternativas Evaluadas

### Alternativa 1: Delegar el TTL a Supabase Auth JWT (`exp` claim)
- **Ventajas:** Integración nativa out-of-the-box con clientes Supabase.
- **Desventajas:** El tier gratuito no permite personalizar la duración del token a 48 horas; no existe mecanismo nativo para revocar un token antes de tiempo; los tokens en cliente son vulnerables a manipulación si no se auditan en backend.

### Alternativa 2: Filtro de Autorización en Memoria en Spring Boot / Gateway
- **Ventajas:** Control centralizado en código Java mediante Spring Security Filters.
- **Desventajas:** Obliga a que toda petición de datos privados pase obligatoriamente por los microservicios Java en la VM Oracle, sobrecargando la CPU y perdiendo la capacidad del frontend Next.js de consultar datos de lectura rápida mediante Server Components con RLS.

### Alternativa 3: Gobierno de Expiración en PostgreSQL mediante RLS — ELEGIDA
- **Ventajas:** **Zero Trust.** La base de datos es la única árbitro de la verdad. Toda consulta a `content.compensation_details` o tablas privadas ejecuta una política RLS que evalúa:
  ```sql
  WHERE access.is_active_grant(session_grant_id) = TRUE
  ```
  donde `is_active_grant` verifica `expires_at > now() AND is_revoked = FALSE`. Si el tiempo expiró o el grant fue revocado, la base de datos retorna automáticamente 0 filas, sin importar qué cabeceras o tokens envíe el cliente.
- **Desventajas:** Requiere propagar el identificador de grant en la cabecera del request hacia PostgreSQL (`request.headers ->> 'x-grant-id'`).

---

## 3. Decisión

Se adopta **PostgreSQL Row Level Security (RLS)** como el mecanismo único e inviolable para gobernar el acceso temporal de 48 horas:

1. **Tabla de Concesiones:** La tabla `access.grants` almacena `expires_at TIMESTAMPTZ` y `is_revoked BOOLEAN`.
2. **Función de Verificación `SECURITY DEFINER`:**
   ```sql
   CREATE OR REPLACE FUNCTION access.is_active_grant(grant_uuid UUID)
   RETURNS BOOLEAN AS $$
   BEGIN
       RETURN EXISTS (
           SELECT 1 FROM access.grants g
           WHERE g.id = grant_uuid
             AND g.is_revoked = FALSE
             AND g.expires_at > now()
       );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
   ```
3. **Desacoplamiento de Identidad:** Supabase Auth solo se utiliza como transporte para emitir el enlace por correo (Magic Link); una vez verificado, el acceso real a los datos queda vinculado al `grant_id` evaluado por RLS.

---

## 4. Consecuencias

### Positivas
- Resuelve definitivamente el hallazgo **H-5** de la auditoría de Fase 1.
- Inmune a manipulaciones del frontend o del cliente HTTP: la condición `expires_at > now()` se evalúa en el reloj del servidor de base de datos.
- Revocación instantánea: marcar `is_revoked = TRUE` en la tabla corta el acceso inmediatamente en el siguiente milisegundo.

### Negativas / Deuda Técnica Aceptada
- Exige que los servidores mantengan sincronización horaria estricta vía NTP.
