#!/usr/bin/env node
/**
 * publish-confluence.mjs
 * Publica y sincroniza la documentación técnica de ProyectoHV en Confluence Cloud.
 * Lee credenciales dinámicamente desde Accesos/Atlasian.txt o variables de entorno.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function getCredentials() {
  let email = process.env.ATLASSIAN_EMAIL;
  let token = process.env.ATLASSIAN_API_TOKEN;
  let siteUrl = process.env.ATLASSIAN_SITE_URL || 'https://haroldr088.atlassian.net';

  const credPath = resolve('Accesos/Atlasian.txt');
  if (existsSync(credPath)) {
    const content = readFileSync(credPath, 'utf8');
    const mEmail = content.match(/EMAIL=(.*)/);
    const mToken = content.match(/API_TOKEN=(.*)/);
    const mSite = content.match(/SITE_URL=(.*)/);
    if (mEmail) email = mEmail[1].trim();
    if (mToken) token = mToken[1].trim();
    if (mSite) siteUrl = mSite[1].trim().replace(/\/wiki.*$/, '');
  }

  if (!email || !token) {
    throw new Error('No se encontraron credenciales de Atlassian en Accesos/Atlasian.txt ni en env.');
  }

  const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
  return { email, siteUrl, authHeader };
}

const { siteUrl, authHeader } = getCredentials();
const BASE_URL = `${siteUrl}/wiki/api/v2`;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} en ${endpoint}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ── 1. Obtener o crear páginas ──────────────────────────────────────────────

async function getPageByTitle(spaceId, title) {
  const query = await request(`/spaces/${spaceId}/pages?limit=50`);
  return (query.results || []).find(p => p.title.toLowerCase() === title.toLowerCase());
}

async function updatePage(pageId, title, bodyHtml, currentVersion) {
  return request(`/pages/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: pageId,
      status: 'current',
      title,
      body: {
        representation: 'storage',
        value: bodyHtml
      },
      version: {
        number: currentVersion + 1,
        message: 'Actualización automática desde ProyectoHV SDLC pipeline'
      }
    })
  });
}

async function createPage(spaceId, parentId, title, bodyHtml) {
  const payload = {
    spaceId: String(spaceId),
    status: 'current',
    title,
    body: {
      representation: 'storage',
      value: bodyHtml
    }
  };
  if (parentId) payload.parentId = String(parentId);

  return request('/pages', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function upsertPage(spaceId, parentId, title, bodyHtml) {
  const existing = await getPageByTitle(spaceId, title);
  if (existing) {
    console.log(`  🔄 Actualizando página existente: "${title}" (ID: ${existing.id})...`);
    const pageData = await request(`/pages/${existing.id}`);
    const res = await updatePage(existing.id, title, bodyHtml, pageData.version?.number || 1);
    console.log(`     ✅ Página actualizada (versión ${(pageData.version?.number || 1) + 1}).`);
    return res;
  } else {
    console.log(`  ➕ Creando nueva página: "${title}"...`);
    const res = await createPage(spaceId, parentId, title, bodyHtml);
    console.log(`     ✅ Página creada (ID: ${res.id}).`);
    return res;
  }
}

// ── 2. Contenido HTML / Storage de cada página ──────────────────────────────

const HOME_BODY = `
<h2>🎯 Portafolio Profesional y Técnico de Ingeniería</h2>
<p><strong>Harold Augusto Rodríguez Martínez</strong> — Líder Técnico / Tech Lead (Bogotá D.C.)</p>
<hr/>
<p>Este espacio de Confluence constituye la <strong>fuente única de verdad técnica y viva</strong> de la arquitectura, diseño, metodologías de ingeniería y decisiones del producto <strong>ProyectoHV</strong>.</p>

<h3>🏛️ Arquitectura de Información del Espacio</h3>
<table>
  <thead>
    <tr>
      <th>Sección</th>
      <th>Descripción</th>
      <th>Estado</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>01. Planificación &amp; Modelo de Costos</strong></td>
      <td>Caso de negocio, modelo financiero (&lt; USD 3/mes), línea base DORA y gobernanza DevOps.</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
    <tr>
      <td><strong>02. Arquitectura &amp; Diseño del Sistema</strong></td>
      <td>Modelo C4 (Contexto, Contenedores, Componentes), modelo de datos PostgreSQL RLS, STRIDE y OpenAPI 3.1.</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
    <tr>
      <td><strong>03. Registro de Decisiones (ADR Log)</strong></td>
      <td>Catálogo de ADRs (001 a 008) con alternativas descartadas y decisión humana obligatoria.</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
    <tr>
      <td><strong>04. Vistas de Arquitectura &amp; Diagramas de Integración</strong></td>
      <td>HLD, arquitectura lógica hexagonal, despliegue físico en OCI ARM, matriz de integración y flujo E2E de acceso efímero 48h.</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
    <tr>
      <td><strong>05. Estrategia CI/CD &amp; Pipeline Enterprise</strong></td>
      <td>Estrategia Multi-CI (GitHub Actions + Jenkinsfile Enterprise), 5 compuertas bloqueantes, JCasC y rollback &lt; 3 min.</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
  </tbody>
</table>

<h3>🔒 Reglas Maestras de Seguridad y Privacidad</h3>
<ul>
  <li><strong>Regla #0 (Aislamiento Corporativo):</strong> Prohibición absoluta de conectar infraestructura, MCPs o credenciales de empleadores o clientes corporativos.</li>
  <li><strong>Confidencialidad de Terceros:</strong> Anonimización estricta por sectores industriales (banca, manufactura, retail). Cero nombres de clientes corporativos en repositorios públicos.</li>
  <li><strong>Honestidad Técnica:</strong> Todo dato de trayectoria proviene exclusivamente de <code>perfil-maestro.md</code>. Cero habilidades o métricas infladas.</li>
  <li><strong>Decisión Humana Obligatoria:</strong> Cada artefacto y ADR cuenta con autoría, justificación y aprobación firmada por Harold Rodríguez.</li>
</ul>

<h3>🛠️ Stack Tecnológico Fundacional</h3>
<ul>
  <li><strong>Frontend:</strong> Next.js 15 (App Router, React 19, Tailwind CSS, TypeScript estricto, 4 estados obligatorios).</li>
  <li><strong>Backend Microservicios:</strong> Java 21, Spring Boot 3.4 (Arquitectura Hexagonal, RFC 9457 ProblemDetail, Jakarta Validation).</li>
  <li><strong>Capa de Datos:</strong> PostgreSQL 17 (Supabase con Row Level Security y pgvector) + MongoDB Atlas Free M0 (Auditoría append-only forense) + Redis Cache 7.2.</li>
  <li><strong>Mensajería Asíncrona:</strong> RabbitMQ Broker 3.13.</li>
  <li><strong>Infraestructura:</strong> VM Oracle Cloud Always Free (ARM Ampere 2 OCPU / 12 GB RAM / Docker Compose / Nginx).</li>
</ul>
`;

const PLAN_BODY = `
<h2>Fase 1: Planificación, Viabilidad y Modelo Económico</h2>
<p><strong>Auditoría de Fase:</strong> APROBADA ✅ | <strong>Decisión Humana:</strong> Harold Rodríguez</p>
<hr/>

<h3>1. Modelo Financiero y Límite de Costos (&lt; USD 3.00/mes)</h3>
<p>El portafolio se diseñó con un estricto modelo de infraestructura de costo cero recurrente, con contingencias que no superan el techo presupuestal:</p>
<table>
  <thead>
    <tr>
      <th>Componente</th>
      <th>Proveedor / Nivel</th>
      <th>Costo Mensual</th>
      <th>Garantía de SLA / Cuota</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Cómputo Backend</strong></td>
      <td>Oracle Cloud VM Always Free (ARM Ampere)</td>
      <td><strong>USD 0.00</strong></td>
      <td>2 OCPU, 12 GB RAM, 50 GB NVMe Storage permanente.</td>
    </tr>
    <tr>
      <td><strong>Base de Datos Relacional</strong></td>
      <td>Supabase PostgreSQL 17 (Free Tier)</td>
      <td><strong>USD 0.00</strong></td>
      <td>500 MB BD, RLS nativo, pgvector, Edge Functions.</td>
    </tr>
    <tr>
      <td><strong>Auditoría Inmutable</strong></td>
      <td>MongoDB Atlas M0 Sandbox</td>
      <td><strong>USD 0.00</strong></td>
      <td>512 MB almacenamiento forense append-only.</td>
    </tr>
    <tr>
      <td><strong>Hosting Frontend</strong></td>
      <td>Vercel / Netlify Free</td>
      <td><strong>USD 0.00</strong></td>
      <td>100 GB ancho de banda / mes, CDN global Edge.</td>
    </tr>
    <tr>
      <td><strong>Servicio de Correo</strong></td>
      <td>Resend Free Tier</td>
      <td><strong>USD 0.00</strong></td>
      <td>3,000 correos/mes (límite operativo: 100/día).</td>
    </tr>
    <tr>
      <td><strong>Dominio Web</strong></td>
      <td>Registrador DNS (.dev o .co)</td>
      <td><strong>~USD 1.00 - 1.50</strong></td>
      <td>Amortizado anualmente (&lt; $18/año).</td>
    </tr>
    <tr>
      <td><strong>TOTAL ESTIMADO</strong></td>
      <td>—</td>
      <td><strong>&lt; USD 2.00 / mes</strong></td>
      <td><strong>Margen de seguridad de 33% respecto al techo de $3/mes.</strong></td>
    </tr>
  </tbody>
</table>

<h3>2. Conciliación de Memoria en VM Oracle (12 GB RAM)</h3>
<p>Para garantizar estabilidad sin swapping:</p>
<ul>
  <li><strong>Total Contenedores Docker:</strong> 3968 MB (~3.88 GB) — Nginx (128 MB), access-service (1024 MB), cv-service (768 MB), search-service (1280 MB), RabbitMQ (512 MB), Redis (256 MB).</li>
  <li><strong>Host Linux + Docker Daemon:</strong> ~2048 MB (~2.00 GB).</li>
  <li><strong>Memoria Total en Uso:</strong> ~5.88 GB.</li>
  <li><strong>Memoria Libre de Holgura:</strong> <strong>6272 MB (~6.12 GB libres, ~51% de margen).</strong></li>
</ul>

<h3>3. Línea Base DORA y Estrategia DevOps (La Cuádruple Barrera)</h3>
<p>El proyecto implementa cuatro capas deterministas de calidad antes de fusionar en <code>main</code>:</p>
<ol>
  <li><strong>Capa 1 (IDE / Hooks locales):</strong> Intercepción de comandos y edición de archivos contra listas negras y Regla #0.</li>
  <li><strong>Capa 2 (Git Pre-Commit / Pre-Push):</strong> Script de guardrails verificando 100% de archivos y validación de tipos TS/Java.</li>
  <li><strong>Capa 3 (Motor de Reglas Compartido):</strong> <code>hv-rules.mjs</code> como único juez evaluador de patrones prohibidos.</li>
  <li><strong>Capa 4 (CI/CD GitHub Actions):</strong> Pipeline bloqueante con <code>--require-lists</code>, verificación de sintaxis y Conventional Commits.</li>
</ol>
`;

const DESIGN_BODY = `
<h2>Fase 2: Arquitectura y Diseño de Sistemas</h2>
<p><strong>Auditoría de Fase:</strong> APROBADA CON RIGOR ✅ | <strong>Decisión Humana:</strong> Harold Rodríguez</p>
<hr/>

<h3>1. Modelo C4</h3>
<ul>
  <li><strong>Nivel 1 (Contexto):</strong> Reclutadores acceden a dos niveles de información. El nivel privado exige validación de correo corporativo legítimo con Magic Link temporal.</li>
  <li><strong>Nivel 2 (Contenedores):</strong> Separación clara entre el frontend Next.js (Edge SSR), Nginx Reverse Proxy, y los 3 microservicios Java 21 Spring Boot.</li>
  <li><strong>Nivel 3 (Componentes Hexagonales):</strong> <code>access-service</code> desacopla su dominio puro (sin frameworks) de los puertos de entrada (REST Controllers, RabbitMQ Listeners) y puertos de salida (PostgreSQL Repositories, DnsJava Resolvers, Resend Mailers).</li>
</ul>

<h3>2. Flujo de Acceso Efímero de 48 Horas (TTL y STRIDE)</h3>
<ol>
  <li>El evaluador ingresa su correo corporativo y autoriza tratamiento de datos (Ley 1581).</li>
  <li><code>access-service</code> valida sintaxis y publica evento asíncrono a RabbitMQ, respondiendo <code>202 Accepted</code>.</li>
  <li>Un consumidor asíncrono valida los registros DNS MX del dominio para mitigar dominios falsos o desechables (Anti-Spoofing).</li>
  <li>Si el dominio es legítimo, se genera un token criptográfico de 256 bits, se almacena su hash SHA-256 en PostgreSQL con <code>expires_at = now() + 48 hours</code> y se envía el Magic Link por correo.</li>
  <li>Al canjear el Magic Link, Supabase Auth emite un token JWT firmado con el claim <code>grant_id</code>.</li>
  <li>PostgREST y las políticas RLS validan el token firmado mediante <code>auth.jwt() -&gt;&gt; 'grant_id'</code>, garantizando que el cliente no pueda falsificar cabeceras (Anti-Tampering).</li>
</ol>

<h3>3. Partición de Datos y Políticas RLS</h3>
<p>Para asegurar que la privacidad se mantenga en el motor de base de datos:</p>
<ul>
  <li><code>content.experiences</code>: Tabla con columnas estrictamente públicas (cargo, sector, resumen público), con política <code>USING (true)</code>.</li>
  <li><code>content.experience_private_details</code>: Tabla 1:1 con detalles técnicos profundos, métricas y decisiones, protegida con <code>USING (access.is_active_grant(access.current_session_grant()))</code>.</li>
  <li><strong>Vistas con Security Invoker:</strong> <code>v_public_experiences</code> y <code>v_private_experiences</code> proyectan los datos respetando los permisos del llamante.</li>
</ul>

<h3>4. Manejo Centralizado de Excepciones (RFC 9457 ProblemDetail)</h3>
<p>Todas las APIs REST de Spring Boot implementan <code>@RestControllerAdvice</code> heredando de <code>ResponseEntityExceptionHandler</code>, devolviendo respuestas de error enriquecidas con estándar RFC 9457 (tipo URI, título, status HTTP, correlationId, timestamp e invalidParams).</p>
`;

const ADR_BODY = `
<h2>Registro de Decisiones de Arquitectura (ADR Log)</h2>
<p>Las decisiones fundacionales del proyecto documentan el contexto, alternativas evaluadas y la decisión humana que las respalda:</p>
<hr/>

<table>
  <thead>
    <tr>
      <th>Código</th>
      <th>Título</th>
      <th>Decisión Principal</th>
      <th>Alternativa Descartada</th>
      <th>Estado</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>ADR-001</strong></td>
      <td>Arquitectura Hexagonal en Microservicios</td>
      <td>Dominio puro en Java 21 desacoplado de Spring Boot y bases de datos.</td>
      <td>Arquitectura por capas tradicional (anémica y acoplada a JPA).</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
    <tr>
      <td><strong>ADR-002</strong></td>
      <td>Autorización Efímera 48h con JWT y RLS</td>
      <td>Expiración evaluada en PostgreSQL por RLS con tokens firmados vía <code>auth.jwt()</code>.</td>
      <td>Sesiones en memoria / Tokens evaluados únicamente en frontend.</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
    <tr>
      <td><strong>ADR-003</strong></td>
      <td>Validación Asíncrona DNS MX con RabbitMQ</td>
      <td>Desacoplar la consulta DNS mediante RabbitMQ respondiendo 202 Accepted.</td>
      <td>Validación DNS síncrona en el request HTTP (latencias de 2-5s).</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
    <tr>
      <td><strong>ADR-004</strong></td>
      <td>Búsqueda Híbrida con pgvector</td>
      <td>PostgreSQL con pgvector para búsqueda semántica + léxica en la misma base.</td>
      <td>Cluster separado de Elasticsearch u OpenSearch (alto consumo de RAM).</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
    <tr>
      <td><strong>ADR-005</strong></td>
      <td>Estampado Forense Dinámico en PDF</td>
      <td>Apache PDFBox en cv-service estampando correo, IP, fecha y hash forense.</td>
      <td>PDFs estáticos pre-renderizados en S3 (sin trazabilidad de fugas).</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
    <tr>
      <td><strong>ADR-006</strong></td>
      <td>Manejo de Errores con ProblemDetail RFC 9457</td>
      <td>Estandarización de errores REST en formato RFC 9457 con <code>@RestControllerAdvice</code>.</td>
      <td>Mapas de error heterogéneos o códigos HTTP planos sin contexto.</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
    <tr>
      <td><strong>ADR-007</strong></td>
      <td>Modelo de Tres Ramas con PRs y SonarQube</td>
      <td>3 ramas base protegidas (desarrollo, pruebas, main) con disparo de Sonar al aprobar PR.</td>
      <td>Trunk-based directo en main / GitFlow tradicional sobrecargado.</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
    <tr>
      <td><strong>ADR-008</strong></td>
      <td>Estrategia Multi-CI con Jenkinsfile Enterprise</td>
      <td>GitHub Actions en la nube + Jenkinsfile declarativo on-demand (JCasC) como exhibit enterprise.</td>
      <td>Jenkins 24/7 saturando RAM de la VM / Solo GitHub Actions sin evidencia enterprise.</td>
      <td><span style="color: green;"><strong>APROBADO</strong></span></td>
    </tr>
  </tbody>
</table>
`;

const DIAGRAMS_BODY = `
<h2>Vistas de Arquitectura, Integración y Flujos del Sistema</h2>
<p><strong>Fase 2: Arquitectura y Diseño</strong> | <strong>Decisión Humana:</strong> Harold Augusto Rodríguez Martínez (Líder Técnico)</p>
<hr/>
<p>Este documento formaliza las <strong>5 vistas arquitectónicas de ingeniería</strong> de ProyectoHV para guiar el desarrollo de los microservicios Java 21, la capa de datos en PostgreSQL con RLS, la integración con brokers asíncronos y el despliegue físico en Oracle Cloud Infrastructure (OCI).</p>

<h3>1. 🏛️ Diagrama de Arquitectura de Alto Nivel (HLD)</h3>
<p>Sintetiza la frontera de entrada (Edge y CDN), el perímetro de seguridad en la DMZ, los microservicios core en Java 21, la infraestructura de mensajería/caché y la persistencia políglota distribuida:</p>

<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">text</ac:parameter>
  <ac:plain-text-body><![CDATA[flowchart TB
    subgraph Actores["👥 Usuarios y Evaluadores"]
        PublicUser["👤 Visitante Público (Nivel 1: Anonimizado)"]
        Recruiter["👔 Reclutador / Evaluador (Nivel 2: Acceso 48h)"]
        AdminUser["🔑 Harold Rodríguez (Tech Lead / Autor)"]
    end

    subgraph EdgeLayer["🌐 Capa Edge & Entrega Web"]
        EdgeCDN["⚡ Vercel / Netlify Edge Network"]
        NextFrontend["💻 Next.js 15 Web App (React 19, TS strict)"]
        EdgeCDN --> NextFrontend
    end

    subgraph DMZ["🛡️ Perímetro DMZ (OCI)"]
        NginxGateway["🚪 Nginx Gateway (SSL/TLS 1.3, Rate Limit)"]
    end

    subgraph BackendLayer["☕ Microservicios (Java 21 / Spring Boot 3.4)"]
        AccessSvc["🔐 access-service (:8081)"]
        CvSvc["📄 cv-service (:8082)"]
        SearchSvc["🔍 search-service (:8083)"]
    end

    subgraph AsyncAndCache["⚡ Mensajería & Caché"]
        RabbitMQ["🐇 RabbitMQ Broker 3.13"]
        RedisCache["⚡ Redis Cache 7.2"]
    end

    subgraph PersistenceLayer["💾 Capa de Persistencia"]
        SupabasePG["🐘 Supabase PostgreSQL 17 (RLS + pgvector)"]
        MongoAudit["🍃 MongoDB Atlas M0 (Audit append-only)"]
    end

    subgraph ExternalServices["☁️ Servicios Cloud Externos"]
        DnsServers["🌍 Servidores DNS (DnsJava MX)"]
        ResendMail["📧 Resend API (Magic Links)"]
    end

    PublicUser --> EdgeCDN
    Recruiter --> EdgeCDN
    AdminUser --> EdgeCDN
    NextFrontend --> NginxGateway
    NextFrontend --> SupabasePG
    NginxGateway --> AccessSvc
    NginxGateway --> CvSvc
    NginxGateway --> SearchSvc
    AccessSvc --> RabbitMQ
    RabbitMQ --> AccessSvc
    AccessSvc --> DnsServers
    AccessSvc --> ResendMail
    AccessSvc --> RedisCache
    AccessSvc --> SupabasePG
    AccessSvc --> MongoAudit
    CvSvc --> SupabasePG
    CvSvc --> MongoAudit
    SearchSvc --> SupabasePG
    SearchSvc --> RedisCache]]></ac:plain-text-body>
</ac:structured-macro>

<hr/>

<h3>2. 🧩 Diagrama Lógico de Arquitectura (Hexagonal &amp; Bounded Contexts)</h3>
<p>Garantiza el desacoplamiento estricto del dominio puro frente a frameworks externos y librerías de infraestructura en <code>access-service</code>:</p>

<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">text</ac:parameter>
  <ac:plain-text-body><![CDATA[classDiagram
    namespace Access_Domain_Core {
        class AccessRequest {
            -RequestId id
            -Email corporateEmail
            -ValidationStatus status
            +markDnsValid()
            +markDnsInvalid(String reason)
        }
        class AccessGrant {
            -GrantId id
            -TokenHash tokenHash
            -Instant expiresAt
            -int extensionCount
            +boolean isExpired()
            +boolean canBeExtended()
            +extend48Hours()
        }
        class CorporateEmailPolicy {
            +boolean isCorporateDomain(String domain)
        }
    }

    namespace Inbound_Ports {
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
    }

    namespace Outbound_Ports {
        class AccessGrantRepositoryPort {
            <<interface>>
            +saveGrant(AccessGrant grant)
            +findActiveByHash(TokenHash hash) Optional
        }
        class DnsResolverPort {
            <<interface>>
            +hasMxRecords(String domain) boolean
        }
        class NotificationPort {
            <<interface>>
            +sendMagicLink(Email to, String token, Instant expiresAt)
        }
        class AuditEventPort {
            <<interface>>
            +recordSecurityEvent(AuditEvent event)
        }
    }

    namespace Adapters {
        class AccessRestController
        class AccessEventListener
        class PostgresGrantAdapter
        class DnsJavaAdapter
        class ResendMailAdapter
        class MongoAuditAdapter
        class RedisRateLimitAdapter
    }

    AccessRestController ..|> RequestAccessUseCase
    AccessEventListener ..|> ValidateDnsMxUseCase
    PostgresGrantAdapter ..|> AccessGrantRepositoryPort
    DnsJavaAdapter ..|> DnsResolverPort
    ResendMailAdapter ..|> NotificationPort
    MongoAuditAdapter ..|> AuditEventPort]]></ac:plain-text-body>
</ac:structured-macro>

<hr/>

<h3>3. 🖥️ Diagrama Físico de Arquitectura y Despliegue (Infraestructura OCI ARM)</h3>
<p>Detalla el dimensionamiento y contención en la máquina virtual ARM Ampere de Oracle Cloud Always Free:</p>

<table>
  <thead>
    <tr>
      <th>Contenedor / Proceso</th>
      <th>CPU Quota</th>
      <th>Límite RAM Docker</th>
      <th>JVM Heap (MaxRAMPercentage)</th>
      <th>Rol Operativo</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><strong>nginx-gateway</strong></td><td>0.10 OCPU</td><td>128 MB</td><td>N/A (C)</td><td>Reverse Proxy, SSL y Rate Limit</td></tr>
    <tr><td><strong>access-service</strong></td><td>0.40 OCPU</td><td>1024 MB</td><td>768 MB (75.0%)</td><td>Gestión de accesos y tokens</td></tr>
    <tr><td><strong>cv-service</strong></td><td>0.20 OCPU</td><td>768 MB</td><td>512 MB (66.6%)</td><td>Generación de PDFs y marcas de agua</td></tr>
    <tr><td><strong>search-service</strong></td><td>0.40 OCPU</td><td>1280 MB</td><td>896 MB (70.0%)</td><td>Búsqueda semántica vectorial</td></tr>
    <tr><td><strong>rabbitmq-broker</strong></td><td>0.20 OCPU</td><td>512 MB</td><td>~256 MB (Erlang)</td><td>Message broker asíncrono durable</td></tr>
    <tr><td><strong>redis-cache</strong></td><td>0.10 OCPU</td><td>256 MB</td><td>~128 MB (C)</td><td>Caché y control de concurrencia</td></tr>
    <tr><td><strong>SUBTOTAL CONTENEDORES</strong></td><td><strong>1.40 OCPU</strong></td><td><strong>3968 MB (~3.88 GB)</strong></td><td><strong>2176 MB (~2.13 GB)</strong></td><td><strong>Techo máximo de carga</strong></td></tr>
    <tr><td><strong>Host OS Linux + Docker</strong></td><td>0.60 OCPU (30%)</td><td>~2048 MB (~2.00 GB)</td><td>N/A</td><td>Kernel Ubuntu 24.04 LTS y daemon</td></tr>
    <tr><td><strong>TOTAL CAPACIDAD VM</strong></td><td><strong>2.00 OCPU (100%)</strong></td><td><strong>12288 MB (12.00 GB)</strong></td><td><strong>6272 MB (~51% LIBRE)</strong></td><td><strong>Colchón de estabilidad</strong></td></tr>
  </tbody>
</table>

<hr/>

<h3>4. 🔌 Diagrama de Arquitectura de Integración (Protocolos y Seguridad)</h3>
<p>Matriz de comunicación, interfaces, formatos de serialización y autenticación:</p>

<table>
  <thead>
    <tr>
      <th>Enlace / Interfaz</th>
      <th>Protocolo</th>
      <th>Formato / Payload</th>
      <th>Autenticación / Cifrado</th>
      <th>Estándar de Contrato</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Browser &rarr; Nginx</td><td>HTTPS (TLS 1.3)</td><td>JSON / Form-Data</td><td>TLS Certbot Let's Encrypt</td><td>OpenAPI 3.1</td></tr>
    <tr><td>Browser &rarr; PostgREST</td><td>HTTPS (TLS 1.3)</td><td>JSON</td><td>Bearer JWT (auth.jwt())</td><td>OpenAPI / PostgREST spec</td></tr>
    <tr><td>Nginx &rarr; Microservicios</td><td>HTTP/1.1 (Red Bridge)</td><td>JSON</td><td>Aislamiento de red hv-network</td><td>RFC 9457 ProblemDetail</td></tr>
    <tr><td>Access &rarr; RabbitMQ</td><td>AMQP 0-9-1</td><td>JSON UTF-8</td><td>User / Pass en Docker variables</td><td>AccessRequestedEvent.json</td></tr>
    <tr><td>Access &rarr; DNS</td><td>DNS UDP/TCP :53</td><td>DNS Wire Format</td><td>Consultas recursivas directas</td><td>RFC 1035 (MX Records)</td></tr>
    <tr><td>Access &rarr; Resend</td><td>HTTPS (TLS 1.3)</td><td>JSON payload</td><td>Bearer API Token</td><td>Resend REST API v1</td></tr>
    <tr><td>Backend &rarr; Redis</td><td>RESP</td><td>Strings / Hashes</td><td>requirepass protegido</td><td>Namespaces ratelimit:*</td></tr>
    <tr><td>Backend &rarr; PostgreSQL</td><td>PG Wire (TLS)</td><td>Binary / SQL</td><td>sslmode=require + HikariCP</td><td>Esquemas DDL access y content</td></tr>
    <tr><td>PostgREST &rarr; PostgreSQL</td><td>PG Engine Internal</td><td>SQL Queries</td><td>RLS policies por grant_id</td><td>Security Invoker Views</td></tr>
    <tr><td>Backend &rarr; MongoDB</td><td>Mongo Wire (TLS)</td><td>BSON</td><td>TLS 1.3 + SCRAM-SHA-256</td><td>Colección audit_events</td></tr>
  </tbody>
</table>

<hr/>

<h3>5. 🔄 Diagrama de Flujo de Arquitectura (Acceso Efímero 48h y RLS)</h3>
<p>Secuencia de interacción temporal entre el evaluador, el perímetro de entrada, la validación asíncrona, el canje criptográfico y la entrega de datos protegidos:</p>

<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">text</ac:parameter>
  <ac:plain-text-body><![CDATA[sequenceDiagram
    autonumber
    actor Recruiter as Evaluador / Reclutador
    participant Web as Frontend Next.js 15
    participant Nginx as Nginx Reverse Proxy
    participant AccessSvc as access-service (Java 21)
    participant Rabbit as RabbitMQ Broker
    participant Dns as Servidor DNS
    participant Resend as Resend Email API
    participant PG as PostgreSQL 17 (Supabase)
    participant PostgREST as Supabase PostgREST
    participant Mongo as MongoDB Atlas (Audit)
    participant CvSvc as cv-service (Java 21)

    Note over Recruiter, AccessSvc: Fase 1: Solicitud Sincrónica
    Recruiter->>Web: Ingresa correo corporativo y acepta Ley 1581
    Web->>Nginx: POST /api/v1/access/requests {email}
    Nginx->>AccessSvc: proxy_pass /api/v1/access/requests
    AccessSvc->>Rabbit: Publica AccessRequestedEvent
    AccessSvc-->>Web: 202 Accepted {status: PENDING}

    Note over Rabbit, Resend: Fase 2: Validación DNS Asíncrona
    Rabbit->>AccessSvc: Consume AccessRequestedEvent
    AccessSvc->>Dns: Consulta registros MX corporativos
    AccessSvc->>PG: INSERT INTO access.grants (hash, expires_at = now() + 48h)
    AccessSvc->>Resend: Envía Magic Link por email
    AccessSvc->>Mongo: Registra auditoría forense

    Note over Recruiter, PostgREST: Fase 3: Canje y JWT Criptográfico
    Recruiter->>Web: Clic en Magic Link (?token=raw)
    Web->>AccessSvc: POST /api/v1/access/claim {token}
    AccessSvc->>PG: Valida hash SHA-256 y vigencia 48h
    AccessSvc-->>Web: 200 OK {sessionJwt con claim grant_id}

    Note over Web, PG: Fase 4: Lectura RLS Directa
    Web->>PostgREST: GET /v_private_experiences (Bearer JWT)
    PostgREST->>PG: Evalúa RLS: access.is_active_grant()
    PG-->>Web: Retorna contenido técnico privado

    Note over Recruiter, CvSvc: Fase 5: Descarga CV con Watermark
    Recruiter->>CvSvc: GET /api/v1/cv/download (Bearer JWT)
    CvSvc->>CvSvc: PDFBox genera PDF con marca de agua dinámica
    CvSvc->>Mongo: Audita descarga forense
    CvSvc-->>Recruiter: Entrega PDF personalizado]]></ac:plain-text-body>
</ac:structured-macro>

<hr/>

<h3>6. ✍️ Registro de Decisión Humana (Gobernanza)</h3>
<ul>
  <li><strong>Decisión Humana:</strong> Aprobación de las 5 vistas de arquitectura para ProyectoHV.</li>
  <li><strong>Líder Técnico / Autor:</strong> Harold Augusto Rodríguez Martínez.</li>
  <li><strong>Fecha de Aprobación:</strong> 2026-10-02.</li>
</ul>
`;

const CICD_BODY = `
<h2>05. Estrategia CI/CD y Pipeline Enterprise (GitHub Actions &amp; Jenkins)</h2>
<p><strong>Fase:</strong> 2 · Diseño &amp; DevOps | <strong>Decisión Humana:</strong> Harold Augusto Rodríguez Martínez (Líder Técnico) | <strong>Relacionado:</strong> ADR-007, ADR-008</p>
<hr/>

<h3>1. Filosofía Arquitectónica: Modelo Multi-CI (Opción 2)</h3>
<p>Para combinar la eficiencia de costos del mundo cloud-native con la profundidad técnica requerida en la gran empresa (banca, finanzas, telecomunicaciones), ProyectoHV adopta una <strong>Estrategia Multi-CI Desacoplada</strong>:</p>
<ul>
  <li><strong>GitHub Actions (Cloud Core):</strong> Motor de integración continua para pull requests y despliegues en producción. Se ejecuta en runners públicos con minutos ilimitados y costo <strong>USD 0.00</strong>, protegiendo los recursos de la máquina virtual.</li>
  <li><strong>Jenkins Enterprise (Exhibit &amp; JCasC On-Demand):</strong> Pipeline declarativo completo en Groovy (<code>pipelines/Jenkinsfile</code>) con provisión reproducible vía Docker (<code>infra/jenkins/</code>) y <em>Jenkins Configuration as Code (JCasC)</em>. Permite demostrar y ejecutar localmente (<code>npm run jenkins:up</code>) o en entornos on-premise un ciclo de entrega con 5 compuertas bloqueantes y rollback automático.</li>
</ul>

<h3>2. Matriz de Motores de CI/CD</h3>
<table>
  <thead>
    <tr>
      <th>Dimensión</th>
      <th>GitHub Actions (Cloud)</th>
      <th>Jenkins Controller (Enterprise Exhibit)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Propósito Principal</strong></td>
      <td>Verificación continua de PRs, Guardrails y CD productivo.</td>
      <td>Exhibit de pipeline empresarial, orquestación Groovy y JCasC.</td>
    </tr>
    <tr>
      <td><strong>Ubicación de Ejecución</strong></td>
      <td>Cloud Runners gestionados de GitHub (costo $0).</td>
      <td>Local o VM Oracle (restringido a 2 GB RAM, ejecución on-demand).</td>
    </tr>
    <tr>
      <td><strong>Configuración como Código</strong></td>
      <td>YAML (.github/workflows).</td>
      <td>Groovy (Jenkinsfile) + JCasC YAML (jenkins.yaml).</td>
    </tr>
    <tr>
      <td><strong>Compuertas de Calidad</strong></td>
      <td>Guardrails deterministas + SonarCloud (org: hamartinez9408, key: hamartinez9408_ProyectoHV).</td>
      <td>withSonarQubeEnv() + waitForQualityGate() nativo (Sonar local: proyectohv).</td>
    </tr>
    <tr>
      <td><strong>Resguardo de Recursos VM</strong></td>
      <td>0 MB de RAM consumidos en OCI.</td>
      <td>Previene consumo 24/7 en la VM (&lt; USD 3/mes garantizado).</td>
    </tr>
  </tbody>
</table>

<hr/>

<h3>3. Las 5 Compuertas Bloqueantes del Pipeline Enterprise (Jenkinsfile)</h3>
<p>El pipeline declarativo de Jenkins implementa el principio: <em>"Las compuertas bloquean, no informan"</em>:</p>
<ol>
  <li><strong>Gate 0: Guardrails Deterministas de Confidencialidad:</strong> Audita todo el árbol de archivos con <code>run-guardrails.mjs --all</code> garantizando el cumplimiento de la Regla #0 (cero PII y cero clientes corporativos).</li>
  <li><strong>Gate 1: Compilación Paralela y Tipado:</strong> Compila microservicios Java 21 con Maven y verifica tipos TypeScript estrictos en Next.js (0 <code>any</code>).</li>
  <li><strong>Gate 2: Pruebas Unitarias e Integración Efímera:</strong> Ejecuta suites JUnit 5 + Mockito y levanta contenedores Postgres desechables mediante Testcontainers. Valida cobertura mínima de líneas del 80% (JaCoCo).</li>
  <li><strong>Gate 3: Análisis Estático y SonarQube Quality Gate:</strong> Escaneo con SonarScanner y bloqueo condicionado a <code>waitForQualityGate()</code> (0 bugs, 0 vulnerabilidades, 0 code smells críticos, duplicación &lt; 3%).</li>
  <li><strong>Gate 4: Empaquetado Seguro de Contenedor:</strong> Construcción multi-etapa en Docker con usuario no privilegiado (<code>USER appuser</code>) y etiquetado inmutable por SHA del commit.</li>
  <li><strong>Gate 5: Despliegue con Health Check Activo y Rollback Automático:</strong> Despliega vía Docker Compose y ejecuta 12 sondeos activos de salud HTTP (1 cada 5s). Si falla en 60s, el bloque <code>post { failure { ... } }</code> ejecuta la reversión inmediata al contenedor anterior (<strong>rollback &lt; 3 minutos</strong>).</li>
</ol>

<hr/>

<h3>4. Definición del Pipeline Declarativo (Groovy)</h3>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">groovy</ac:parameter>
  <ac:plain-text-body><![CDATA[pipeline {
    agent any

    options {
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
        disableConcurrentBuilds()
    }

    environment {
        PROJECT_KEY     = 'proyectohv'
        CONTAINER_IMAGE = 'ghcr.io/hamartinez9408/access-service'
        HEALTH_ENDPOINT = 'http://localhost:8081/actuator/health'
    }

    stages {
        stage('Gate 0: Guardrails de Confidencialidad') {
            steps {
                sh 'node .agents/skills/hv-guardrails/scripts/run-guardrails.mjs --all'
            }
        }

        stage('Gate 1: Compilación y Tipado') {
            parallel {
                stage('Java 21 Microservicios') {
                    steps { dir('services/access-service') { sh './mvnw clean compile -B -DskipTests' } }
                }
                stage('TypeScript Next.js') {
                    steps { dir('web') { sh 'npm ci && npx tsc --noEmit' } }
                }
            }
        }

        stage('Gate 2: Pruebas Unitarias y Testcontainers') {
            steps {
                dir('services/access-service') { sh './mvnw verify -B' }
            }
            post {
                always {
                    junit 'services/**/target/surefire-reports/*.xml'
                    jacoco execPattern: '**/target/jacoco.exec', minimumLineCoverage: '80'
                }
            }
        }

        stage('Gate 3: SonarQube Quality Gate') {
            steps {
                withSonarQubeEnv('SonarQube-Local') {
                    dir('services/access-service') {
                        sh './mvnw sonar:sonar -Dsonar.projectKey=\${PROJECT_KEY} -Dsonar.qualitygate.wait=true'
                    }
                }
                timeout(time: 3, unit: 'MINUTES') {
                    script {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "⛔ Pipeline bloqueado: SonarQube Quality Gate en estado \${qg.status}"
                        }
                    }
                }
            }
        }

        stage('Gate 4: Empaquetado Seguro Docker') {
            steps {
                sh 'docker build -t \${CONTAINER_IMAGE}:\${GIT_COMMIT.take(7)} -f services/access-service/Dockerfile services/access-service'
            }
        }

        stage('Gate 5: Despliegue con Health Check Activo y Rollback') {
            steps {
                sh "./infra/scripts/deploy-with-rollback.sh access-service '\${CONTAINER_IMAGE}:\${GIT_COMMIT.take(7)}' '\${HEALTH_ENDPOINT}'"
            }
        }
    }

    post {
        failure {
            echo "🚨 [ALERTA] Despliegue fallido o Quality Gate violado. Revisar logs del pipeline."
        }
        success {
            echo "🎉 Despliegue exitoso. Notificando observabilidad y métricas DORA..."
            sh "./infra/scripts/grafana-annotate.sh '\${GIT_COMMIT}' access-service"
        }
    }
}]]></ac:plain-text-body>
</ac:structured-macro>

<hr/>

<h3>5. Infraestructura Reproducible: Jenkins Configuration as Code (JCasC)</h3>
<p>Para evitar tareas manuales de configuración en interfaces gráficas, el entorno se gestiona íntegramente como código en <code>infra/jenkins/</code>:</p>
<ul>
  <li><code>Dockerfile</code>: Basado en <code>jenkins/jenkins:lts-jdk21</code>, con plugins preinstalados (workflow-aggregator, git, sonar, jacoco, junit, configuration-as-code).</li>
  <li><code>jenkins.yaml</code>: Archivo JCasC que aprovisiona el controller, credenciales, la integración con SonarQube y el job pre-sembrado que rastrea la rama <code>desarrollo</code>.</li>
  <li><code>docker-compose.yml</code>: Configura límites estrictos de hardware (2 GB RAM, 1.5 OCPU) para garantizar contención de recursos.</li>
</ul>

<h3>6. Comandos de Operación Local</h3>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:plain-text-body><![CDATA[# Iniciar el controlador Jenkins local con JCasC
npm run jenkins:up

# Verificar disponibilidad del servicio (HTTP 8088)
npm run jenkins:status

# Ver logs de ejecución en tiempo real
npm run jenkins:logs

# Detener el entorno de Jenkins
npm run jenkins:down]]></ac:plain-text-body>
</ac:structured-macro>

<hr/>

<h3>7. ✍️ Registro de Decisión Humana (Gobernanza)</h3>
<ul>
  <li><strong>Decisión Humana:</strong> Aprobación de la Estrategia Multi-CI (Opción 2) combinando GitHub Actions y Jenkinsfile Enterprise como exhibit técnico.</li>
  <li><strong>Líder Técnico / Autor:</strong> Harold Augusto Rodríguez Martínez.</li>
  <li><strong>Fecha de Aprobación:</strong> 2026-10-02.</li>
</ul>
`;

async function main() {
  console.log('🚀 Iniciando publicación en Confluence Cloud...');
  console.log(`   Sitio: ${siteUrl}`);

  // 1. Obtener espacio HV
  const spaces = await request('/spaces?keys=HV');
  const space = spaces.results?.[0];
  if (!space) {
    throw new Error('No se encontró el espacio HV en Confluence.');
  }

  const spaceId = space.id;
  const homepageId = space.homepageId;
  console.log(`   Espacio HV encontrado (ID: ${spaceId}, Homepage ID: ${homepageId})`);

  // 2. Actualizar Homepage
  console.log('\n[1/6] Actualizando Homepage del espacio HV...');
  const homeData = await request(`/pages/${homepageId}`);
  await updatePage(
    homepageId,
    'ProyectoHV — Portafolio Profesional (Hub Central)',
    HOME_BODY,
    homeData.version?.number || 1
  );
  console.log('   ✅ Homepage actualizada con éxito.');

  // 3. Crear o actualizar páginas hijas
  console.log('\n[2/6] Sincronizando Fase 1: Planificación & Costos...');
  await upsertPage(spaceId, homepageId, '01. Planificación & Modelo de Costos', PLAN_BODY);

  console.log('\n[3/6] Sincronizando Fase 2: Arquitectura & Diseño...');
  await upsertPage(spaceId, homepageId, '02. Arquitectura & Diseño del Sistema', DESIGN_BODY);

  console.log('\n[4/6] Sincronizando Registro de ADRs...');
  await upsertPage(spaceId, homepageId, '03. Registro de Decisiones de Arquitectura (ADR Log)', ADR_BODY);

  console.log('\n[5/6] Sincronizando Vistas y Diagramas de Arquitectura...');
  await upsertPage(spaceId, homepageId, '04. Vistas de Arquitectura & Diagramas de Integración', DIAGRAMS_BODY);

  console.log('\n[6/6] Sincronizando Estrategia CI/CD & Jenkins Enterprise...');
  await upsertPage(spaceId, homepageId, '05. Estrategia CI/CD y Pipeline Enterprise (GitHub Actions & Jenkins)', CICD_BODY);

  console.log('\n✨ ¡Publicación en Confluence completada con éxito!');
  console.log(`   🔗 Accede a tu espacio en: ${siteUrl}/wiki/spaces/HV`);
}

main().catch(err => {
  console.error('\n❌ Error durante la publicación:', err.message);
  process.exit(1);
});

