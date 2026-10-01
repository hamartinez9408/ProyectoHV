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
      <td>Catálogo de ADRs (001 a 006) con alternativas descartadas y decisión humana obligatoria.</td>
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
  </tbody>
</table>
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
  console.log('\n[1/4] Actualizando Homepage del espacio HV...');
  const homeData = await request(`/pages/${homepageId}`);
  await updatePage(
    homepageId,
    'ProyectoHV — Portafolio Profesional (Hub Central)',
    HOME_BODY,
    homeData.version?.number || 1
  );
  console.log('   ✅ Homepage actualizada con éxito.');

  // 3. Crear o actualizar páginas hijas
  console.log('\n[2/4] Sincronizando Fase 1: Planificación & Costos...');
  await upsertPage(spaceId, homepageId, '01. Planificación & Modelo de Costos', PLAN_BODY);

  console.log('\n[3/4] Sincronizando Fase 2: Arquitectura & Diseño...');
  await upsertPage(spaceId, homepageId, '02. Arquitectura & Diseño del Sistema', DESIGN_BODY);

  console.log('\n[4/4] Sincronizando Registro de ADRs...');
  await upsertPage(spaceId, homepageId, '03. Registro de Decisiones de Arquitectura (ADR Log)', ADR_BODY);

  console.log('\n✨ ¡Publicación en Confluence completada con éxito!');
  console.log(`   🔗 Accede a tu espacio en: ${siteUrl}/wiki/spaces/HV`);
}

main().catch(err => {
  console.error('\n❌ Error durante la publicación:', err.message);
  process.exit(1);
});
