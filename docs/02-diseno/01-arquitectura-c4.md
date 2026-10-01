# Arquitectura C4 y Patrones de Diseño — ProyectoHV

> **Fase:** 2 · Diseño  
> **Estado:** Aprobado para diseño técnico  
>
> **Decisión humana**
> - **Qué decidió Harold:** Desacoplar el sistema en una topología híbrida con frontend Next.js en edge, microservicios Java 21 Spring Boot en contenedores ARM sobre VM Oracle, serverless en AWS Lambda y base de datos relacional/vectorial en Supabase; adoptar Arquitectura Hexagonal en el backend para aislar completamente el dominio de negocio.
> - **Qué ejecutó la IA:** Diagramación formal bajo el modelo C4 (Contexto, Contenedores, Componentes y Código), especificación de puertos e interfaces hexagonales, asignación estricta de cuotas de recursos y definición de flujos de interacción asíncrona.
> - **Riesgo técnico asumido conscientemente:** La comunicación asíncrona vía RabbitMQ introduce eventual consistencia en el estado de validación DNS de solicitudes de acceso, mitigada mediante polling de estado en frontend o actualización reactiva con SSE.
> - **Alternativas descartadas:** Monolito MVC tradicional en Spring Boot con renderizado de servidor Thymeleaf (no demuestra stack moderno de frontend React/Next.js); arquitectura 100% serverless en AWS (costo potencial fuera de capa gratuita y menor cobertura de tecnologías backend enterprise del perfil maestro).

---

## 1. Nivel 1: Diagrama de Contexto del Sistema (System Context)

El diagrama de contexto ilustra cómo ProyectoHV interactúa con los distintos actores humanos y los sistemas externos de soporte.

```mermaid
flowchart TD
    subgraph Actores["Actores del Sistema"]
        PublicUser["👤 Visitante Público<br/>(Reclutadores, Desarrolladores)"]
        Evaluator["👔 Evaluador Corporativo<br/>(Líderes de Contratación, C-Level)"]
        Admin["👨‍💻 Harold Rodríguez<br/>(Dueño / Administrador)"]
    end

    subgraph SistemaHV["ProyectoHV — Portafolio & Exhibit Técnico"]
        SystemCore["🚀 Plataforma ProyectoHV<br/>Portal Web + APIs de Microservicios"]
    end

    subgraph ServiciosExternos["Servicios Externos (Capa Gratuita Enterprise)"]
        ResendSMTP["📧 Resend / SMTP<br/>(Envío de Magic Links)"]
        SupabaseInfra["🐘 Supabase Managed<br/>(PostgreSQL + RLS + pgvector)"]
        MongoAtlas["🍃 MongoDB Atlas<br/>(Auditoría Inmutable Append-Only)"]
        AWSLambda["⚡ AWS Lambda Java<br/>(Notificaciones & Watermarking)"]
    end

    PublicUser -->|"1. Explora trayectoria pública y exhibits de IA (HTTPS)"| SystemCore
    Evaluator -->|"2. Solicita acceso temporal con correo corporativo"| SystemCore
    Evaluator -->|"5. Accede a portal privado y descarga CV con Magic Link (48h)"| SystemCore
    Admin -->|"Administra contenido y monitorea telemetría DORA"| SystemCore

    SystemCore -->|"3. Despacha transaccional de Magic Link"| ResendSMTP
    ResendSMTP -->|"4. Entrega enlace seguro de acceso (48h)"| Evaluator
    SystemCore -->|"Persistencia relacional y gobierno de RLS"| SupabaseInfra
    SystemCore -->|"Registro forense inmutable de eventos de acceso"| MongoAtlas
    SystemCore -->|"Tareas asíncronas de bajo impacto"| AWSLambda
```

---

## 2. Nivel 2: Diagrama de Contenedores (Container Diagram)

El sistema se distribuye en tres zonas de ejecución coordinadas para no incurrir en costos (objetivo <= $0/mes en operación regular o < USD 3/mes total) respetando las cuotas de la VM Oracle Cloud (2 OCPU / 12 GB ARM):

```mermaid
flowchart TB
    subgraph Cliente["Navegador Web"]
        Browser["🌐 Browser del Usuario / Evaluador"]
    end

    subgraph EdgeNetlify["Capa Edge / CDN (Netlify Starter)"]
        NextFrontend["⚛️ Frontend Web (Next.js 15 App Router)<br/>TypeScript Strict · Tailwind CSS · React 19<br/>SSR / ISR / Client Components"]
    end

    subgraph VMOracle["VM Oracle Cloud Always Free (2 OCPU / 12 GB RAM)"]
        Nginx["🛡️ Nginx Reverse Proxy<br/>SSL Termination · Rate Limiting (0.10 OCPU / 128 MB)"]
        
        subgraph DockerNetwork["Red Interna Docker (bridge aislado)"]
            AccessSvc["☕ access-service (Spring Boot 3.4 / Java 21)<br/>Gestión de Acceso, Magic Links, DNS MX<br/>(0.40 OCPU / 1024 MB RAM - 768MB Heap)"]
            CvSvc["☕ cv-service (Spring Boot 3.4 / Java 21)<br/>Generación de CV, Watermarking dinámico<br/>(0.20 OCPU / 768 MB RAM - 512MB Heap)"]
            SearchSvc["☕ search-service (Spring Boot 3.4 / Java 21)<br/>Búsqueda Híbrida Vectorial + Léxica<br/>(0.40 OCPU / 1280 MB RAM - 896MB Heap)"]
            RabbitMQ["🐇 RabbitMQ Broker 3.13<br/>Eventos de dominio y tareas asíncronas<br/>(0.20 OCPU / 512 MB RAM)"]
            Redis["⚡ Redis Cache 7.2<br/>Rate limits, sesiones y tokens efímeros<br/>(0.10 OCPU / 256 MB RAM)"]
        end
    end

    subgraph NubeDatos["Capa de Persistencia & Servicios Cloud"]
        Postgres["🐘 Supabase PostgreSQL 17<br/>Esquemas 'access' y 'content'<br/>RLS Engine · pgvector"]
        Mongo["🍃 MongoDB Atlas Free M0<br/>Colección inmutable: audit_events"]
        Lambda["⚡ AWS Lambda (Java 21)<br/>Procesador de eventos especiales"]
    end

    Browser -->|"HTTPS / SSR"| NextFrontend
    Browser -->|"HTTPS API REST (/api/v1/*)"| Nginx
    Nginx -->|"Proxy pass interno"| AccessSvc
    Nginx -->|"Proxy pass interno"| CvSvc
    Nginx -->|"Proxy pass interno"| SearchSvc

    AccessSvc -->|"Publica eventos (access.requested)"| RabbitMQ
    RabbitMQ -->|"Consume eventos de verificación DNS"| AccessSvc
    AccessSvc -->|"Cache tokens y contadores de rate limit"| Redis
    AccessSvc -->|"Registra solicitud y valida grants"| Postgres
    AccessSvc -->|"Auditoría append-only de seguridad"| Mongo

    CvSvc -->|"Lee metadatos para PDF y marca de agua"| Postgres
    CvSvc -->|"Audita descargas con marca de agua"| Mongo

    SearchSvc -->|"Consultas vectoriales cosine-distance"| Postgres
    SearchSvc -->|"Cache de resultados frecuentes"| Redis

    NextFrontend -->|"Lectura de contenido privado con JWT firmado vía RLS"| Postgres
```

### Conciliación de Recursos en la VM Oracle (ARM)

| Contenedor / Proceso | CPU Quota (Ceiling) | Límite RAM Docker | Heap JVM (`MaxRAMPercentage`) |
|---|---|---|---|
| **Nginx Reverse Proxy** | 0.10 OCPU | 128 MB (0.125 GB) | N/A (C nativo) |
| **access-service** | 0.40 OCPU | 1024 MB (1.00 GB) | 768 MB (75.0%) |
| **cv-service** | 0.20 OCPU | 768 MB (0.75 GB) | 512 MB (66.6%) |
| **search-service** | 0.40 OCPU | 1280 MB (1.25 GB) | 896 MB (70.0%) |
| **RabbitMQ Broker** | 0.20 OCPU | 512 MB (0.50 GB) | Erlang VM (~256 MB) |
| **Redis Cache** | 0.10 OCPU | 256 MB (0.25 GB) | N/A (en memoria ~128 MB) |
| **Total Contenedores** | **1.40 OCPU** | **3968 MB (~3.88 GB)** | **2176 MB (~2.13 GB)** |
| **Host Linux + Docker Daemon** | 0.60 OCPU libre (**30%**) | ~2048 MB (~2.00 GB) | N/A |
| **Capacidad Total VM** | **2.00 OCPU (100%)** | **12288 MB (12.00 GB)** | **6272 MB (~6.12 GB libre, ~51%)** |

---

## 3. Nivel 3: Diagrama de Componentes de `access-service` (Hexagonal Architecture)

El microservicio `access-service` implementa **Arquitectura Hexagonal (Ports & Adapters)** estricta, desacoplando la lógica de negocio de la infraestructura técnica.

```mermaid
classDiagram
    namespace Inbound_Adapters {
        class AccessRestController {
            +requestAccess(RequestDto) ResponseEntity
            +verifyAccess(token) ResponseEntity
            +getStatus(token) ResponseEntity
            +extendAccess(token) ResponseEntity
        }
        class AccessEventsListener {
            +onAccessRequested(AccessRequestedEvent)
        }
    }

    namespace Inbound_Ports {
        class RequestAccessUseCase {
            <<interface>>
            +execute(RequestCommand) AccessRequestResult
        }
        class VerifyAccessUseCase {
            <<interface>>
            +execute(VerifyCommand) AccessGrantResult
        }
        class CheckStatusUseCase {
            <<interface>>
            +execute(String token) StatusResult
        }
    }

    namespace Domain_Core {
        class AccessRequest {
            -Email corporateEmail
            -ValidationStatus status
            -Instant requestedAt
            +markDnsValid()
            +markDnsInvalid(String reason)
        }
        class AccessGrant {
            -GrantId id
            -Email corporateEmail
            -TokenHash tokenHash
            -Instant expiresAt
            -boolean isRevoked
            +boolean isExpired()
            +extend48Hours()
        }
        class CorporateEmailPolicy {
            +boolean isBlockedDomain(String domain)
        }
    }

    namespace Outbound_Ports {
        class AccessGrantRepositoryPort {
            <<interface>>
            +save(AccessGrant grant)
            +findByTokenHash(TokenHash hash) Optional
        }
        class DnsMxResolverPort {
            <<interface>>
            +hasValidMxRecords(String domain) boolean
        }
        class NotificationPort {
            <<interface>>
            +sendMagicLink(Email email, String rawToken)
        }
        class AuditEventPort {
            <<interface>>
            +recordSecurityEvent(SecurityAuditEvent event)
        }
    }

    namespace Outbound_Adapters {
        class PostgresAccessGrantAdapter {
            -JdbcClient jdbcClient
            +save()
            +findByTokenHash()
        }
        class DnsJavaResolverAdapter {
            -Lookup dnsLookup
            +hasValidMxRecords()
        }
        class ResendNotificationAdapter {
            -RestClient restClient
            +sendMagicLink()
        }
        class MongoAuditAdapter {
            -MongoTemplate mongoTemplate
            +recordSecurityEvent()
        }
    }

    AccessRestController --> RequestAccessUseCase
    AccessRestController --> VerifyAccessUseCase
    AccessEventsListener --> VerifyAccessUseCase

    RequestAccessUseCase ..|> AccessRequest
    VerifyAccessUseCase ..|> AccessGrant

    RequestAccessUseCase --> AccessGrantRepositoryPort
    RequestAccessUseCase --> DnsMxResolverPort
    RequestAccessUseCase --> NotificationPort
    RequestAccessUseCase --> AuditEventPort

    PostgresAccessGrantAdapter ..|> AccessGrantRepositoryPort
    DnsJavaResolverAdapter ..|> DnsMxResolverPort
    ResendNotificationAdapter ..|> NotificationPort
    MongoAuditAdapter ..|> AuditEventPort
```

---

## 4. Nivel 4: Estándares de Código y Directrices de Implementación

Para asegurar que el código construido en la Fase 3 sea consistente y fácil de auditar, se establecen las siguientes reglas estructurales:

### 4.1. Reglas de Aislamiento de Capas (Clean Architecture)
1. **Paquete `domain` puro:**
   - Prohibido importar cualquier clase de `org.springframework.*`, `jakarta.persistence.*`, `com.mongodb.*` o `io.lettuce.*`.
   - Únicamente Java estándar (`java.time.*`, `java.util.*`, `java.lang.*`).
   - Los Value Objects (ej. `Email`, `TokenHash`) son inmutables mediante `record` de Java 21.
2. **Paquete `application` (Casos de Uso):**
   - Orquesta la lógica del dominio e interactúa únicamente con interfaces de puertos de salida (`ports.out`).
   - Transaccionalidad demarcada en este nivel si aplica (`@Transactional(readOnly = true)` por defecto).
3. **Paquete `infrastructure` (Adaptadores):**
   - Aloja controladores Spring MVC, repositorios Spring Data / JDBC, clientes HTTP y consumidores RabbitMQ.
   - Traduce DTOs externos a modelos de dominio antes de llamar a los casos de uso.

### 4.2. Métricas de Líneas y Complejidad
- **Métodos:** Óptimo entre 5 y 20 líneas de lógica de negocio. Máximo 30 líneas. Si excede 40 líneas debe refactorizarse en métodos privados o nuevos casos de uso.
- **Clases:** Máximo 200 a 300 líneas. Si una clase crece más allá de 300 líneas, es síntoma directo de violación del Principio de Responsabilidad Única (SRP).

### 4.3. Manejo Centralizado de Excepciones y Respuestas RFC 9457
Todo microservicio Java implementa `@RestControllerAdvice` centralizado para mapear excepciones a `ProblemDetail` (RFC 9457):

```java
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(AccessGrantNotFoundException.class)
    public ProblemDetail handleNotFound(AccessGrantNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Grant de acceso no encontrado o expirado");
        problem.setType(URI.create("https://proyectohv.dev/errors/access-grant-not-found"));
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    @ExceptionHandler(DomainMxValidationException.class)
    public ProblemDetail handleInvalidDomain(DomainMxValidationException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        problem.setTitle("Dominio de correo inválido o sin registros MX");
        problem.setType(URI.create("https://proyectohv.dev/errors/invalid-email-domain"));
        problem.setProperty("domain", ex.getDomain());
        return problem;
    }
}
```

---

## 5. Diagrama de Secuencia del Flujo de Acceso 48h

```mermaid
sequenceDiagram
    autonumber
    actor Recruiter as Evaluador / Reclutador
    participant Web as Frontend Next.js
    participant AccessSvc as access-service (Java 21)
    participant Rabbit as RabbitMQ
    participant Dns as Servidor DNS (MX)
    participant Resend as Resend (SMTP API)
    participant PG as PostgreSQL (Supabase RLS)
    participant Mongo as MongoDB Atlas (Audit)

    Recruiter->>Web: Ingresa correo corporativo y acepta Ley 1581
    Web->>AccessSvc: POST /api/v1/access/requests {email, consent: true}
    
    AccessSvc->>AccessSvc: Valida formato y lista negra de dominios
    AccessSvc->>Rabbit: Publica evento AccessRequestedEvent
    AccessSvc-->>Web: 202 Accepted {status: "PENDING_VALIDATION"}
    Web-->>Recruiter: Muestra pantalla de espera / verificación

    Rabbit->>AccessSvc: Consume AccessRequestedEvent
    AccessSvc->>Dns: Consulta registros DNS MX para el dominio
    
    alt DNS MX Inválido o Inexistente
        Dns-->>AccessSvc: NXDOMAIN o sin MX
        AccessSvc->>Mongo: Registra rechazo por fallo DNS
    else DNS MX Válido
        Dns-->>AccessSvc: Registros MX confirmados
        AccessSvc->>AccessSvc: Genera Token seguro (32 bytes cryptorandom)
        AccessSvc->>AccessSvc: Calcula token_hash = SHA-256(token)
        AccessSvc->>PG: INSERT INTO access.grants (email, token_hash, expires_at = now() + 48h)
        AccessSvc->>Resend: POST /emails (Enlace Magic Link con raw_token)
        Resend-->>Recruiter: Entrega correo con enlace temporal
        AccessSvc->>Mongo: Registra evento AccessGrantCreated (IP, Timestamp)
    end

    Recruiter->>Web: Clic en https://proyectohv.dev/access/verify?token=XYZ
    Web->>AccessSvc: GET /api/v1/access/verify?token=XYZ
    AccessSvc->>AccessSvc: Calcula SHA-256(XYZ)
    AccessSvc->>PG: SELECT * FROM access.grants WHERE token_hash = hash AND expires_at > now() AND is_revoked = false
    
    alt Token Expirado o Inválido
        PG-->>AccessSvc: 0 filas
        AccessSvc-->>Web: 401 Unauthorized (RFC 9457 ProblemDetail)
        Web-->>Recruiter: Muestra error con opción de solicitar nuevo enlace
    else Token Válido
        PG-->>AccessSvc: Fila válida
        AccessSvc->>PG: UPDATE access.grants SET claimed_at = now() WHERE id = grant.id
        AccessSvc->>Mongo: Registra evento AccessGrantClaimed
        AccessSvc-->>Web: 200 OK { email, expiresAt, remainingSeconds, sessionJwt }
        Web->>Web: Establece cookie de sesión HttpOnly con sessionJwt (firmado HMAC-SHA256 con claim grant_id)
        Web->>PG: SELECT * FROM content.v_private_experiences (Header Authorization: Bearer sessionJwt -> auth.jwt() evalúa expires_at > now())
        PG-->>Web: Datos privados completos autorizados por RLS
        Web-->>Recruiter: Renderiza portal privado con marca de agua personalizada
    end
```
