# 📐 Diagramas de Arquitectura del Sistema — ProyectoHV

> **Fase 2: Arquitectura y Diseño**  
> **Fuente de verdad:** `docs/02-diseno/`  
> **Alineación:** C4 Model, STRIDE Threat Model, Clean/Hexagonal Architecture y Regla #0.  
> **Autor & Decisión Humana:** Harold Augusto Rodríguez Martínez (Líder Técnico / Tech Lead)  
> **Fecha:** 2026-10-02

---

## 📑 Índice de Vistas Arquitectónicas

1. [🏛️ 1. Diagrama de Arquitectura de Alto Nivel (HLD)](#1-diagrama-de-arquitectura-de-alto-nivel-hld)
2. [🧩 2. Diagrama Lógico de Arquitectura (Hexagonal & Bounded Contexts)](#2-diagrama-lógico-de-arquitectura-hexagonal--bounded-contexts)
3. [🖥️ 3. Diagrama Físico de Arquitectura y Despliegue (Infraestructura OCI ARM)](#3-diagrama-físico-de-arquitectura-y-despliegue-infraestructura-oci-arm)
4. [🔌 4. Diagrama de Arquitectura de Integración (Protocolos, Interfaces y Seguridad)](#4-diagrama-de-arquitectura-de-integración-protocolos-interfaces-y-seguridad)
5. [🔄 5. Diagrama de Flujo de Arquitectura (Flujo E2E de Acceso Efímero 48h y RLS)](#5-diagrama-de-flujo-de-arquitectura-flujo-e2e-de-acceso-efímero-48h-y-rls)

---

## 1. Diagrama de Arquitectura de Alto Nivel (HLD)

El diagrama de alto nivel sintetiza los actores del sistema, la frontera de entrada (Edge y CDN), el perímetro de seguridad en la DMZ, los microservicios core en Java 21, la infraestructura de soporte y la persistencia políglota distribuida.

```mermaid
flowchart TB
    %% Actores
    subgraph Actores["👥 Usuarios y Evaluadores"]
        PublicUser["👤 Visitante Público<br/>(Nivel 1: Trayectoria anonimizada)"]
        Recruiter["👔 Reclutador / Evaluador Técnico<br/>(Nivel 2: Acceso efímero 48h)"]
        AdminUser["🔑 Harold Rodríguez<br/>(Tech Lead / Autor)"]
    end

    %% Edge & CDN
    subgraph EdgeLayer["🌐 Capa Edge & Entrega Web"]
        EdgeCDN["⚡ Vercel / Netlify Edge Network<br/>(SSR, Streaming HTML, Assets estáticos)"]
        NextFrontend["💻 Next.js 15 Web App<br/>(React 19, Tailwind CSS, TypeScript estricto)"]
        EdgeCDN --> NextFrontend
    end

    %% DMZ & Gateway
    subgraph DMZ["🛡️ Perímetro de Seguridad (DMZ - OCI)"]
        NginxGateway["🚪 Nginx Reverse Proxy & Gateway<br/>(SSL/TLS 1.3, Rate Limiting, CORS, Proxy Pass)"]
    end

    %% Capa de Microservicios Backend
    subgraph BackendLayer["☕ Capa de Microservicios (Java 21 / Spring Boot 3.4)"]
        AccessSvc["🔐 access-service<br/>(Solicitudes, DNS MX async, Magic Links, TTL 48h)"]
        CvSvc["📄 cv-service<br/>(Generación de PDF, Watermarking forense dinámico)"]
        SearchSvc["🔍 search-service<br/>(Búsqueda híbrida vectorial + texto completo)"]
    end

    %% Mensajería & Caché
    subgraph AsyncAndCache["⚡ Mensajería Asíncrona & Caché"]
        RabbitMQ["🐇 RabbitMQ Broker 3.13<br/>(Exchange access.events, Colas durables)"]
        RedisCache["⚡ Redis Cache 7.2<br/>(Rate limits, Sesiones efímeras, Cache lecturas)"]
    end

    %% Persistencia
    subgraph PersistenceLayer["💾 Capa de Persistencia & Estado"]
        SupabasePG["🐘 Supabase PostgreSQL 17<br/>(Esquemas 'access' y 'content'<br/>RLS Engine · pgvector · Security Invoker Views)"]
        MongoAudit["🍃 MongoDB Atlas M0 (AWS)<br/>(Colección inmutable append-only: audit_events)"]
    end

    %% Servicios Externos Cloud
    subgraph ExternalServices["☁️ Servicios Cloud Externos"]
        DnsServers["🌍 Servidores DNS Autoritativos<br/>(DnsJava MX Verification)"]
        ResendMail["📧 Resend API<br/>(Entrega transaccional de Magic Links)"]
    end

    %% Relaciones Alto Nivel
    PublicUser -->|"HTTPS (Navegación pública)"| EdgeCDN
    Recruiter -->|"HTTPS (Solicitud acceso privado)"| EdgeCDN
    AdminUser -->|"HTTPS (Gestión y observabilidad)"| EdgeCDN

    NextFrontend -->|"API REST (/api/v1/*)"| NginxGateway
    NextFrontend -->|"Lectura directa RLS con Bearer JWT"| SupabasePG

    NginxGateway -->|"Proxy interno :8081"| AccessSvc
    NginxGateway -->|"Proxy interno :8082"| CvSvc
    NginxGateway -->|"Proxy interno :8083"| SearchSvc

    AccessSvc -->|"Publica eventos (access.requested)"| RabbitMQ
    RabbitMQ -->|"Consume eventos para validación"| AccessSvc
    AccessSvc -->|"Lookup registros MX"| DnsServers
    AccessSvc -->|"Envío de Magic Link (REST API)"| ResendMail
    AccessSvc -->|"Rate limiting y contadores"| RedisCache
    AccessSvc -->|"Crea grants y hashes SHA-256"| SupabasePG
    AccessSvc -->|"Auditoría de solicitudes y grants"| MongoAudit

    CvSvc -->|"Lee metadatos autorizados"| SupabasePG
    CvSvc -->|"Audita descargas y marcas de agua"| MongoAudit

    SearchSvc -->|"Cosine-distance vector queries"| SupabasePG
    SearchSvc -->|"Caché de consultas frecuentes"| RedisCache
```

---

## 2. Diagrama Lógico de Arquitectura (Hexagonal & Bounded Contexts)

Ilustra la separación de responsabilidades lógicas basada en **Arquitectura Hexagonal (Puertos y Adaptadores)** y **Domain-Driven Design (DDD)** para aislar la lógica de negocio pura de frameworks y bases de datos.

```mermaid
classDiagram
    %% Bounded Context: Access Management
    namespace Access_Domain_Core {
        class AccessRequest {
            -RequestId id
            -Email corporateEmail
            -ValidationStatus status
            -Instant requestedAt
            +markDnsValid()
            +markDnsInvalid(String reason)
        }
        class AccessGrant {
            -GrantId id
            -RequestId requestId
            -Email corporateEmail
            -TokenHash tokenHash
            -Instant expiresAt
            -int extensionCount
            -boolean isRevoked
            +boolean isExpired()
            +boolean canBeExtended()
            +extend48Hours()
            +revoke(String reason)
        }
        class GrantExtension {
            -ExtensionId id
            -GrantId grantId
            -int extensionNumber
            -ExtensionStatus status
            -Instant newExpiresAt
        }
        class CorporateEmailPolicy {
            +boolean isCorporateDomain(String domain)
            +boolean isBlockedProvider(String domain)
        }
    }

    namespace Access_Inbound_Ports {
        class RequestAccessUseCase {
            <<interface>>
            +execute(RequestAccessCommand) RequestAccessResult
        }
        class ValidateDnsMxUseCase {
            <<interface>>
            +execute(ValidateDnsCommand) ValidationResult
        }
        class ClaimMagicLinkUseCase {
            <<interface>>
            +execute(ClaimTokenCommand) SessionTokenResult
        }
        class ExtendAccessUseCase {
            <<interface>>
            +execute(ExtendAccessCommand) ExtensionResult
        }
    }

    namespace Access_Outbound_Ports {
        class AccessGrantRepositoryPort {
            <<interface>>
            +saveGrant(AccessGrant grant)
            +findActiveByHash(TokenHash hash) Optional
            +updateGrant(AccessGrant grant)
        }
        class DnsResolverPort {
            <<interface>>
            +hasMxRecords(String domain) boolean
        }
        class NotificationPort {
            <<interface>>
            +sendMagicLink(Email to, String rawToken, Instant expiresAt)
        }
        class AuditEventPort {
            <<interface>>
            +recordSecurityEvent(AuditEvent event)
        }
        class RateLimiterPort {
            <<interface>>
            +isAllowed(String key, int maxRequests, Duration window) boolean
        }
    }

    namespace Access_Adapters {
        class AccessRestController {
            +requestAccess(RequestAccessDTO) ResponseEntity
            +claimToken(String rawToken) ResponseEntity
            +extendAccess(String rawToken) ResponseEntity
        }
        class AccessEventListener {
            +handleAccessRequested(AccessRequestedEvent)
        }
        class PostgresGrantAdapter {
            -JdbcClient jdbcClient
        }
        class DnsJavaAdapter {
            -Lookup lookup
        }
        class ResendMailAdapter {
            -RestClient restClient
        }
        class MongoAuditAdapter {
            -MongoTemplate mongoTemplate
        }
        class RedisRateLimitAdapter {
            -RedisTemplate redisTemplate
        }
    }

    %% Conexiones Hexagonales
    AccessRestController ..|> RequestAccessUseCase : Invoca
    AccessRestController ..|> ClaimMagicLinkUseCase : Invoca
    AccessRestController ..|> ExtendAccessUseCase : Invoca
    AccessEventListener ..|> ValidateDnsMxUseCase : Invoca

    RequestAccessUseCase ..> AccessRequest : Crea
    RequestAccessUseCase ..> CorporateEmailPolicy : Aplica
    RequestAccessUseCase ..> RateLimiterPort : Consulta
    ValidateDnsMxUseCase ..> DnsResolverPort : Consulta
    ValidateDnsMxUseCase ..> AccessGrant : Emite
    ValidateDnsMxUseCase ..> NotificationPort : Notifica
    ValidateDnsMxUseCase ..> AccessGrantRepositoryPort : Persiste
    ValidateDnsMxUseCase ..> AuditEventPort : Audita

    PostgresGrantAdapter ..|> AccessGrantRepositoryPort : Implementa
    DnsJavaAdapter ..|> DnsResolverPort : Implementa
    ResendMailAdapter ..|> NotificationPort : Implementa
    MongoAuditAdapter ..|> AuditEventPort : Implementa
    RedisRateLimitAdapter ..|> RateLimiterPort : Implementa
```

---

## 3. Diagrama Físico de Arquitectura y Despliegue (Infraestructura OCI ARM)

Detalla el mapeo de procesos, cuotas de cómputo y aislamiento de red en la infraestructura Always Free de **Oracle Cloud Infrastructure (OCI)** y nubes administradas.

```mermaid
flowchart TB
    subgraph Internet["🌐 Tráfico WAN / Internet Público"]
        HTTPSUsers["Tráfico HTTPS :443 (TLS 1.3)"]
    end

    subgraph OCIHost["🖥️ Oracle Cloud Infrastructure — VM Always Free (ARM Ampere A1)<br/>2.00 OCPU · 12.00 GB RAM · 50 GB NVMe · Ubuntu 24.04 LTS"]
        subgraph HostOS["Host Linux & Daemon Docker (~2048 MB RAM / 0.60 OCPU libre - 30%)"]
            UFW["🔥 UFW Firewall (Puertos abiertos: 22 SSH, 80 HTTP, 443 HTTPS)"]
        end

        subgraph DockerBridge["🐳 Red Interna Docker: hv-network (172.28.0.0/16 — Aislada)"]
            NginxContainer["🚪 nginx-gateway:alpine<br/>0.10 OCPU / 128 MB RAM<br/>(Puertos 80->80, 443->443)"]
            
            subgraph JavaContainers["☕ Contenedores de Aplicación Java 21"]
                AccessContainer["🔐 access-service:3.4<br/>0.40 OCPU / 1024 MB RAM<br/>JVM Heap: 768 MB (75%)<br/>Puerto interno :8081"]
                CvContainer["📄 cv-service:3.4<br/>0.20 OCPU / 768 MB RAM<br/>JVM Heap: 512 MB (66.6%)<br/>Puerto interno :8082"]
                SearchContainer["🔍 search-service:3.4<br/>0.40 OCPU / 1280 MB RAM<br/>JVM Heap: 896 MB (70%)<br/>Puerto interno :8083"]
            end

            subgraph MiddlewareContainers["⚡ Infraestructura de Mensajería & Caché"]
                RabbitContainer["🐇 rabbitmq:3.13-management<br/>0.20 OCPU / 512 MB RAM<br/>Erlang VM ~256 MB<br/>Puerto interno :5672"]
                RedisContainer["⚡ redis:7.2-alpine<br/>0.10 OCPU / 256 MB RAM<br/>Memoria activa ~128 MB<br/>Puerto interno :6379"]
            end
        end

        subgraph StorageVolumes["💾 Volúmenes Persistentes Locales (Docker Bind / Named)"]
            RabbitData["/var/lib/rabbitmq/mnesia"]
            RedisData["/data/dump.rdb"]
            NginxLogs["/var/log/nginx/"]
        end
    end

    subgraph ManagedCloud1["🐘 Supabase Cloud Managed (AWS ca-central-1)"]
        PostgresDB["PostgreSQL 17.11<br/>Port 5432 (SSL required)<br/>PostgREST HTTPS API<br/>Esquemas 'access', 'content'"]
    end

    subgraph ManagedCloud2["🍃 MongoDB Atlas Cloud (AWS Cluster M0)"]
        AtlasCluster["MongoDB 7.0 ReplSet<br/>Port 27017 (TLS encrypted)<br/>Colección: audit_events"]
    end

    subgraph ManagedCloud3["⚡ Vercel / Netlify Edge"]
        NextEdge["Next.js 15 Serverless SSR<br/>Global Edge CDN"]
    end

    %% Flujos de Red Físicos
    HTTPSUsers --> UFW
    UFW --> NginxContainer

    NginxContainer -->|"proxy_pass http://access-service:8081"| AccessContainer
    NginxContainer -->|"proxy_pass http://cv-service:8082"| CvContainer
    NginxContainer -->|"proxy_pass http://search-service:8083"| SearchContainer

    AccessContainer -->|"tcp://rabbitmq:5672"| RabbitContainer
    AccessContainer -->|"tcp://redis:6379"| RedisContainer
    SearchContainer -->|"tcp://redis:6379"| RedisContainer

    AccessContainer -->|"PostgreSQL Wire TCP:5432 (TLS)"| PostgresDB
    CvContainer -->|"PostgreSQL Wire TCP:5432 (TLS)"| PostgresDB
    SearchContainer -->|"PostgreSQL Wire TCP:5432 (TLS)"| PostgresDB

    AccessContainer -->|"MongoDB Wire TCP:27017 (TLS)"| AtlasCluster
    CvContainer -->|"MongoDB Wire TCP:27017 (TLS)"| AtlasCluster

    NextEdge -->|"HTTPS /api/v1/*"| NginxContainer
    NextEdge -->|"HTTPS PostgREST (Bearer JWT)"| PostgresDB

    RabbitContainer -.-> RabbitData
    RedisContainer -.-> RedisData
    NginxContainer -.-> NginxLogs
```

### Conciliación de Recursos de Cómputo (VM Oracle ARM)

| Proceso / Contenedor | CPU Quota (Ceiling) | Límite RAM Docker | Heap JVM (`MaxRAMPercentage`) | Propósito |
|---|---|---|---|---|
| **nginx-gateway** | 0.10 OCPU | 128 MB | N/A (C nativo) | Reverse Proxy, SSL, Rate Limit |
| **access-service** | 0.40 OCPU | 1024 MB | 768 MB (75.0%) | Dominio de accesos y tokens |
| **cv-service** | 0.20 OCPU | 768 MB | 512 MB (66.6%) | Generación de PDFs y marcas de agua |
| **search-service** | 0.40 OCPU | 1280 MB | 896 MB (70.0%) | Búsqueda semántica vectorial |
| **rabbitmq-broker** | 0.20 OCPU | 512 MB | ~256 MB (Erlang) | Event bus asíncrono durable |
| **redis-cache** | 0.10 OCPU | 256 MB | ~128 MB (C nativo) | Caché en memoria y rate limits |
| **Subtotal Contenedores** | **1.40 OCPU** | **3968 MB (~3.88 GB)** | **2176 MB (~2.13 GB)** | Carga máxima acotada |
| **Host Linux + Docker Daemon** | 0.60 OCPU (**30%**) | ~2048 MB (~2.00 GB) | N/A | Sistema base y red bridge |
| **Capacidad Total VM** | **2.00 OCPU (100%)** | **12288 MB (12.00 GB)**| **6272 MB (~6.12 GB libre, ~51%)** | Margen de estabilidad sin swapping |

---

## 4. Diagrama de Arquitectura de Integración (Protocolos, Interfaces y Seguridad)

Presenta la matriz de comunicación de sistemas, interfaces de programación, formatos de serialización, estándares de error y mecanismos de autenticación y cifrado.

```mermaid
flowchart LR
    subgraph Clientes["Clientes & Consumidores"]
        NavWeb["Navegador Web<br/>(Single Page App / SSR)"]
        AgenteMCP["Agentes IA (ZCode / Antigravity)<br/>(pair programming & auditoría)"]
    end

    subgraph PerimetroEntrada["Puntos de Entrada"]
        Nginx["Nginx Reverse Proxy<br/>:443 HTTPS"]
        PostgREST["Supabase PostgREST<br/>:443 HTTPS"]
    end

    subgraph Microservicios["Servicios Backend"]
        AccessSvc["access-service (:8081)"]
        CvSvc["cv-service (:8082)"]
        SearchSvc["search-service (:8083)"]
    end

    subgraph Middleware["Buses & Brokers"]
        RabbitMQ["RabbitMQ (:5672)"]
        Redis["Redis (:6379)"]
    end

    subgraph BasesDeDatos["Almacenamiento Persistente"]
        PostgreSQL["PostgreSQL 17 (:5432)"]
        MongoDB["MongoDB Atlas (:27017)"]
    end

    subgraph Externos["Proveedores SaaS"]
        Resend["Resend API (HTTPS)"]
        DNS["Servidores DNS (:53)"]
    end

    %% Conexiones con Protocolos
    NavWeb -->|"1. HTTPS / TLS 1.3<br/>JSON OpenAPI 3.1"| Nginx
    NavWeb -->|"2. HTTPS / TLS 1.3<br/>Bearer JWT firmado (auth.jwt)"| PostgREST

    AgenteMCP -->|"3. JSON-RPC 2.0 (stdio / HTTP)<br/>hv-supabase / hv-atlassian"| PostgREST
    AgenteMCP -->|"3b. JSON-RPC 2.0 (stdio uvx)<br/>mcp-atlassian"| Microservicios

    Nginx -->|"4. HTTP/1.1 REST<br/>RFC 9457 ProblemDetail"| AccessSvc
    Nginx -->|"4. HTTP/1.1 REST<br/>application/pdf stream"| CvSvc
    Nginx -->|"4. HTTP/1.1 REST<br/>JSON Search Results"| SearchSvc

    AccessSvc -->|"5. AMQP 0-9-1<br/>JSON Domain Events"| RabbitMQ
    RabbitMQ -->|"5. AMQP 0-9-1<br/>Event Consumer"| AccessSvc

    AccessSvc -->|"6. UDP/TCP :53<br/>DnsJava MX Query"| DNS
    AccessSvc -->|"7. HTTPS / REST<br/>Bearer API Token"| Resend

    AccessSvc -->|"8. RESP (Redis Protocol)<br/>Lettuce TCP"| Redis
    SearchSvc -->|"8. RESP (Redis Protocol)<br/>Lettuce TCP"| Redis

    AccessSvc -->|"9. PostgreSQL Wire (TLS)<br/>HikariCP JDBC"| PostgreSQL
    CvSvc -->|"9. PostgreSQL Wire (TLS)<br/>HikariCP JDBC"| PostgreSQL
    SearchSvc -->|"9. PostgreSQL Wire (TLS)<br/>HikariCP JDBC"| PostgreSQL

    PostgREST -->|"10. Conexión interna SQL<br/>RLS Security Invoker"| PostgreSQL

    AccessSvc -->|"11. MongoDB Wire (TLS)<br/>SCRAM-SHA-256"| MongoDB
    CvSvc -->|"11. MongoDB Wire (TLS)<br/>SCRAM-SHA-256"| MongoDB
```

### Matriz de Integración de Protocolos y Seguridad

| Enlace / Interfaz | Protocolo | Formato / Payload | Autenticación / Cifrado | Estándar de Contrato |
|---|---|---|---|---|
| **Browser $\rightarrow$ Nginx** | HTTPS (TLS 1.3) | JSON / Form-Data | TLS Certbot Let's Encrypt | OpenAPI 3.1 |
| **Browser $\rightarrow$ PostgREST** | HTTPS (TLS 1.3) | JSON | `Authorization: Bearer <sessionJwt>` | OpenAPI / PostgREST spec |
| **Nginx $\rightarrow$ Microservicios** | HTTP/1.1 (Bridge interno) | JSON | Aislamiento de red Docker `hv-network` | RFC 9457 `ProblemDetail` |
| **Access $\rightarrow$ RabbitMQ** | AMQP 0-9-1 | JSON UTF-8 | Username / Password en variables Docker | `AccessRequestedEvent.json` |
| **Access $\rightarrow$ DNS** | DNS over UDP/TCP :53 | DNS Wire Format | Consultas recursivas a resolver autoritativo | RFC 1035 (MX Records) |
| **Access $\rightarrow$ Resend** | HTTPS (TLS 1.3) | JSON payload | `Authorization: Bearer <resend_key>` | Resend REST API v1 |
| **Backend $\rightarrow$ Redis** | RESP | Strings / Hashes | Contraseña Redis (`requirepass`) | Claves con namespaces (`ratelimit:*`) |
| **Backend $\rightarrow$ PostgreSQL** | PG Wire Protocol | Binary / SQL | SSL Required (`sslmode=require`) + HikariCP | Esquemas DDL `access` y `content` |
| **PostgREST $\rightarrow$ PostgreSQL** | PG Engine Internal | SQL Queries | RLS policies (`auth.jwt() ->> 'grant_id'`) | DDL Security Invoker Views |
| **Backend $\rightarrow$ MongoDB** | MongoDB Wire Protocol | BSON | TLS 1.3 + SCRAM-SHA-256 | Schema inmutable `audit_events` |

---

## 5. Diagrama de Flujo de Arquitectura (Flujo E2E de Acceso Efímero 48h y RLS)

Detalla el ciclo completo de interacción temporal, desde la solicitud de acceso por parte del evaluador técnico hasta la lectura protegida por políticas RLS y la entrega forense de documentos.

```mermaid
sequenceDiagram
    autonumber
    actor Recruiter as Evaluador / Reclutador
    participant Web as Frontend Next.js 15
    participant Nginx as Nginx Reverse Proxy
    participant AccessSvc as access-service (Java 21)
    participant Rabbit as RabbitMQ Broker
    participant Dns as Servidor DNS Autoritativo
    participant Resend as Resend Email API
    participant PG as PostgreSQL 17 (Supabase)
    participant PostgREST as Supabase PostgREST
    participant Mongo as MongoDB Atlas (Audit)
    participant CvSvc as cv-service (Java 21)

    %% Fase 1: Solicitud inicial
    rect rgb(240, 245, 255)
        Note over Recruiter, AccessSvc: Fase 1: Solicitud de Acceso Efímero (Sincrónico)
        Recruiter->>Web: Ingresa correo corporativo y acepta Ley 1581
        Web->>Nginx: POST /api/v1/access/requests {email, consent: true}
        Nginx->>AccessSvc: proxy_pass /api/v1/access/requests
        AccessSvc->>AccessSvc: Valida formato email y lista negra de dominios
        AccessSvc->>Rabbit: Publica evento AccessRequestedEvent
        AccessSvc-->>Nginx: 202 Accepted {status: "PENDING_VALIDATION"}
        Nginx-->>Web: 202 Accepted
        Web-->>Recruiter: Muestra pantalla: "Validando dominio corporativo..."
    end

    %% Fase 2: Validación asíncrona y emisión
    rect rgb(245, 255, 245)
        Note over Rabbit, Resend: Fase 2: Validación DNS MX y Emisión de Magic Link (Asincrónico)
        Rabbit->>AccessSvc: Consume AccessRequestedEvent
        AccessSvc->>Dns: Consulta registros MX para el dominio corporativo
        
        alt Dominio sin registros MX o inválido
            Dns-->>AccessSvc: NXDOMAIN / No MX records
            AccessSvc->>Mongo: Registra rechazo forense (Audit: DOMAIN_INVALID)
        else Dominio Corporativo Válido
            Dns-->>AccessSvc: Registros MX confirmados
            AccessSvc->>AccessSvc: Genera Token criptográfico seguro (32 bytes cryptorandom)
            AccessSvc->>AccessSvc: Calcula token_hash = SHA-256(raw_token)
            AccessSvc->>PG: INSERT INTO access.grants (email, token_hash, expires_at = now() + 48h)
            AccessSvc->>Resend: POST /emails (Enlace Magic Link con raw_token)
            Resend-->>Recruiter: Entrega correo con enlace temporal
            AccessSvc->>Mongo: Registra evento forense (Audit: ACCESS_GRANT_CREATED)
        end
    end

    %% Fase 3: Canje y obtención de JWT firmado
    rect rgb(255, 250, 240)
        Note over Recruiter, PostgREST: Fase 3: Canje de Magic Link y Sesión Criptográfica
        Recruiter->>Web: Clic en enlace Magic Link (?token=raw_token)
        Web->>Nginx: POST /api/v1/access/claim {token: raw_token}
        Nginx->>AccessSvc: proxy_pass /api/v1/access/claim
        AccessSvc->>AccessSvc: Calcula SHA-256(raw_token)
        AccessSvc->>PG: SELECT * FROM access.grants WHERE token_hash = hash AND expires_at > now()
        
        alt Token expirado o revocado
            PG-->>AccessSvc: 0 filas devueltas
            AccessSvc-->>Web: 401 Unauthorized (RFC 9457: Token expirado)
        else Token Válido
            PG-->>AccessSvc: Grant válido (UUID grant_id)
            AccessSvc->>AccessSvc: Genera JWT con claim firmado {"grant_id": "uuid"}
            AccessSvc->>Mongo: Registra sesión iniciada (Audit: GRANT_CLAIMED)
            AccessSvc-->>Web: 200 OK {sessionJwt, expiresAt, grantId}
            Web-->>Recruiter: Habilita navegación al Nivel 2 Privado
        end
    end

    %% Fase 4: Consulta de datos privados con RLS
    rect rgb(250, 240, 255)
        Note over Web, PG: Fase 4: Acceso a Datos Protegido por RLS
        Web->>PostgREST: GET /rest/v1/v_private_experiences<br/>Authorization: Bearer sessionJwt
        PostgREST->>PG: Ejecuta consulta SQL bajo rol 'authenticated'
        Note over PG: PostgreSQL evalúa política RLS:<br/>access.is_active_grant(access.current_session_grant())<br/>Donde current_session_grant() extrae auth.jwt() ->> 'grant_id'
        PG-->>PostgREST: Retorna datos privados autorizados
        PostgREST-->>Web: 200 OK [JSON con detalles privados y métricas]
        Web-->>Recruiter: Renderiza proyectos y decisiones de arquitectura
    end

    %% Fase 5: Descarga de CV con marca de agua forense
    rect rgb(255, 245, 245)
        Note over Recruiter, Mongo: Fase 5: Descarga de CV con Estampado Dinámico
        Recruiter->>Web: Clic en "Descargar CV Técnico Completo"
        Web->>Nginx: GET /api/v1/cv/download (Header Authorization: Bearer sessionJwt)
        Nginx->>CvSvc: proxy_pass /api/v1/cv/download
        CvSvc->>PG: Valida grant y lee contenido estructurado
        CvSvc->>CvSvc: Apache PDFBox genera documento PDF
        CvSvc->>CvSvc: Estampa marca de agua visible e invisible<br/>(Email evaluador, IP solicitud, Timestamp, Hash único)
        CvSvc->>Mongo: Registra descarga forense (Audit: CV_DOWNLOADED_WITH_WATERMARK)
        CvSvc-->>Nginx: 200 OK (application/pdf stream)
        Nginx-->>Web: 200 OK (Content-Disposition: attachment)
        Web-->>Recruiter: Descarga archivo PDF personalizado y trazable
    end
```

---

## 6. Registro de Decisión Humana (Gobernanza del Proyecto)

* **Decisión Humana:** Aprobación de la arquitectura quíntuple (Alto Nivel, Lógica, Física, Integración y Flujo) para ProyectoHV.
* **Justificación Técnica:** La descomposición en cinco vistas complementarias garantiza que el sistema sea comprensible y auditable desde diferentes perspectivas de ingeniería:
  1. *HLD:* Comprensión del sistema para directores y evaluadores.
  2. *Lógica:* Garantía de desacoplamiento de frameworks mediante Clean/Hexagonal Architecture.
  3. *Física:* Certificación de viabilidad en el hardware ARM Always Free con 51% de holgura de memoria.
  4. *Integración:* Especificación estricta de protocolos, puertos y serialización sin puntos ciegos.
  5. *Flujo:* Verificación visual del modelo STRIDE y el TTL de 48 horas evaluado en base de datos.
* **Autor & Firma:** Harold Augusto Rodríguez Martínez (Líder Técnico)  
* **Fecha de Formalización:** 2026-10-02
