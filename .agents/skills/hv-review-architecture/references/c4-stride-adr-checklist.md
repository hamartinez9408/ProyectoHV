# Checklist de Arquitectura: C4, STRIDE y ADRs

## 1. Modelo de Amenazas STRIDE (Flujo de Acceso Magic Link 48h)

Toda arquitectura del sistema de acceso debe auditarse contra las 6 amenazas STRIDE:

| Amenaza | Riesgo Específico en ProyectoHV | Mitigación Arquitectónica Obligatoria | Estado |
|---|---|---|---|
| **S (Spoofing)** | Un atacante solicita acceso simulando ser de un dominio corporativo sin poseer buzón. | Verificación de registros DNS MX antes de generar token + envío de Magic Link con token criptográfico seguro a ese buzón (el clic prueba control). | 🔴 Bloqueante |
| **T (Tampering)** | Modificación de parámetros de URL o payload del token para alterar el TTL o elevar privilegios. | Token opaco con hash SHA-256 almacenado en base de datos o JWT con firma HMAC/RSA y claims inmutables (`sub`, `exp`, `scope`). | 🔴 Bloqueante |
| **R (Repudiation)** | Un evaluador niega haber descargado o consultado información confidencial. | Auditoría inmutable en MongoDB Atlas (append-only) con registro de IP, User-Agent, timestamp y token ID. Marca de agua dinámica incrustada con identificador de usuario. | 🔴 Bloqueante |
| **I (Information Disclosure)** | Acceso no autorizado a expectativas salariales, disponibilidad o código confidencial. | Aislamiento RLS en Supabase: `expires_at > now()`. Generador CI falla si detecta campos privados en `content/public.json`. | 🔴 Bloqueante |
| **D (Denial of Service)** | Inundación masiva de solicitudes de Magic Link para agotar cuotas o saturar el correo. | Rate limiting en API Gateway / Spring Security (p. ej., máx. 5 intentos por IP/hora) y cooldown obligatorio de 24 h entre solicitudes de extensión. | 🔴 Bloqueante |
| **E (Elevation of Privilege)** | Un usuario público intenta invocar endpoints privados o saltarse la expiración. | Validación en capa de persistencia (RLS en PostgreSQL). La interfaz de usuario es una vista; la seguridad reside en la base de datos y en el microservicio. | 🔴 Bloqueante |

## 2. Estándar de ADR (Architecture Decision Record)
Todo ADR en `docs/02-diseno/adr/` debe seguir la estructura:
1. **Título**: `ADR-XXX: <Decisión en Presente Imperativo>`
2. **Estado**: Propuesto | Aceptado | Reemplazado
3. **Contexto**: El problema técnico o de negocio que motiva la decisión.
4. **Alternativas Evaluadas**: Mínimo 2 alternativas comparadas con ventajas y desventajas.
5. **Decisión**: La opción seleccionada y su justificación técnica.
6. **Consecuencias**:
   - Consecuencias Positivas.
   - Consecuencias Negativas o Deuda Técnica Aceptada.
7. **Decisión Humana**:
   - Qué decidió Harold.
   - Qué ejecutó la IA.
   - Riesgo técnico asumido conscientemente.
   - Alternativas descartadas.

## 3. Límites de Clean Architecture
- **Dominio**: Prohibido importar paquetes de Spring (`org.springframework.*`), JPA (`jakarta.persistence.*`), o Supabase en el paquete `domain`.
- **Casos de Uso**: Nombrados en infinitivo o gerundio de negocio (`SolicitarAccesoMagicLinkUseCase`, `ValidarTokenAccesoUseCase`).

## 4. Consistencia y Verificabilidad del Diseño (Criterio A-7)
- **Consistencia Inter-Fase:** Las cifras de CPU, RAM y cuotas de contenedores deben reconciliar de forma exacta con los valores aprobados en la Fase 1 (`01-analisis-viabilidad.md`).
- **Verificabilidad de Controles de Seguridad:** Todo control crítico (RLS, expiración, rate limits) debe declarar una **prueba de bypass** explícita (ej. intento con `curl` falsificando cabeceras) con su resultado comprobado (0 filas o 401).
- **Integridad de Diagramas:** Todo diagrama Mermaid o especificación Archify debe estar sintácticamente validado para prevenir fallos silenciosos de renderizado.
