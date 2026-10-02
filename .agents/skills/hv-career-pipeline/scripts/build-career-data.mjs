#!/usr/bin/env node
// build-career-data.mjs — Genera los artefactos de datos de carrera desde la
// fuente única de verdad.
//
//   C:\Personal\Gestion\profile\perfil-maestro.md
//        ├─► content/public.json               (commiteado — nivel PÚBLICO)
//        └─► content/private/career-private.json (gitignored — nivel PRIVADO)
//
// ───────────────────────────────────────────────────────────────────────────
// PRINCIPIO DE DISEÑO: LISTA BLANCA
//
// El generador NO publica "todo menos lo prohibido". Publica ÚNICAMENTE las
// secciones declaradas en SECTIONS_PUBLIC. Una sección nueva en el perfil no
// se publica por olvido — se publica solo si alguien la añade aquí a propósito.
//
// La lista negra es un backstop, no la defensa principal: una lista negra falla
// en silencio cuando aparece un dato que nadie previó.
// ───────────────────────────────────────────────────────────────────────────
//
// Uso:
//   node .agents/skills/hv-career-pipeline/scripts/build-career-data.mjs
//   node ... --dry-run     # muestra qué haría, no escribe
//
// Falla cerrado: si no puede garantizar la anonimización, NO escribe nada.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanForbidden, loadProhibitedClients } from '../../../scripts/hv-rules.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
// scripts -> hv-career-pipeline -> skills -> .agents -> raíz del proyecto
const ROOT = resolve(HERE, '..', '..', '..', '..')

const SOURCE = 'C:/Personal/Gestion/profile/perfil-maestro.md'
const SECTOR_MAP = join(ROOT, '.agents', 'rules', 'private', 'sector-map.txt')
const OUT_PUBLIC = join(ROOT, 'content', 'public.json')
const OUT_PRIVATE = join(ROOT, 'content', 'private', 'career-private.json')

const DRY = process.argv.includes('--dry-run')

const die = (msg) => { console.error(`\n⛔ ${msg}\n`); process.exit(1) }
const ok = (m) => console.log(`  ✅ ${m}`)
const info = (m) => console.log(`     ${m}`)

// ── Secciones del perfil, por número de encabezado ──────────────────────────
// El perfil está numerado (`## 3. Experiencia laboral`), así que la sección se
// identifica por número y no por título: renombrar un título no rompe el mapeo.
// Cualquier número que no aparezca aquí NO se publica.
const SECTION_KIND = {
  '1': 'identity',      // contacto y datos personales — NO se publica
  '2': 'summary',       // resumen de carrera          — público
  '3': 'experience',    // experiencia laboral         — público (anonimizado)
  '4': 'education',     // formación académica         — público (sin bachillerato)
  '5': 'skills',        // habilidades                 — público
  '6': 'languages',     // idiomas                     — público
  '7': 'conditions',    // condiciones laborales       — PRIVADO (salario, preaviso)
  '8': 'positioning',   // posicionamiento estratégico — PRIVADO (qué vender, brechas)
  '9': 'blacklist',     // datos que NO se publican    — nunca
  '10': 'linkedin',     // conciliación con LinkedIn   — interno, nunca
  '11': 'audit',        // auditoría de skills         — interno, nunca
}

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
}

// ── 1. Cargar el mapa de anonimización ──────────────────────────────────────
// Si falta, NO se puede garantizar la anonimización: se aborta.
// Publicar sin mapa significaría publicar los nombres reales.
function loadSectorMap() {
  if (!existsSync(SECTOR_MAP)) {
    die(`No existe el mapa de anonimización: ${SECTOR_MAP}\n` +
        '  Sin él no se puede anonimizar. Se aborta en vez de publicar nombres reales.\n' +
        '  Créalo con una línea por entrada:  nombre-real = descripcion-publica')
  }
  const entries = []
  for (const line of readFileSync(SECTOR_MAP, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const m = /^(.+?)\s*=\s*(.+)$/.exec(t)
    if (!m) continue
    // El lado derecho admite `etiqueta publica | sector`. Sin sector explícito,
    // el sector toma el valor de la etiqueta.
    const [publicLabel, sector] = m[2].split('|').map((s) => s.trim())
    for (const alias of m[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean)) {
      entries.push({ alias, publicLabel, sector: sector || publicLabel })
    }
  }
  if (!entries.length) {
    die('El mapa de anonimización está vacío. Se aborta: publicar sin mapa es publicar los nombres.')
  }
  return entries
}

/** Sustituye cada alias por su etiqueta pública. El más largo gana, para que
 *  "Banco X S.A." no se sustituya a medias por una regla más corta. */
function makeAnonymizer(entries) {
  const sorted = [...entries].sort((a, b) => b.alias.length - a.alias.length)
  const rules = sorted.map((e) => ({
    re: new RegExp(`\\b${e.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
    publicLabel: e.publicLabel,
  }))
  let hits = 0
  return {
    apply(text) {
      let out = String(text ?? '')
      for (const r of rules) out = out.replace(r.re, () => { hits++; return r.publicLabel })
      return out
    },
    /** Entrada exacta mapeada para un nombre, o null si no está en el mapa. */
    entryFor(name) {
      const n = String(name ?? '').trim().toLowerCase()
      return entries.find((e) => e.alias.trim().toLowerCase() === n) || null
    },
    get hits() { return hits },
  }
}

// ── 2. Trocear el perfil por secciones ──────────────────────────────────────
function splitSections(md) {
  const sections = []
  let current = null
  for (const line of md.split(/\r?\n/)) {
    const h2 = /^##\s+(\d+)\.\s*(.*)$/.exec(line)
    if (h2) {
      current = { num: h2[1], title: h2[2], kind: SECTION_KIND[h2[1]] || 'unknown', lines: [] }
      sections.push(current)
      continue
    }
    // Un `##` sin número también cierra la sección anterior
    if (/^##\s+/.test(line)) {
      current = { num: null, title: line.replace(/^##\s+/, ''), kind: 'unknown', lines: [] }
      sections.push(current)
      continue
    }
    if (current) current.lines.push(line)
  }
  return sections
}

/** Subsecciones de nivel 3 dentro de una sección: `### 3.1 Título — Empresa — Ciudad` */
function splitSubsections(lines) {
  const out = []
  let cur = null
  for (const line of lines) {
    const h3 = /^###\s+(.*)$/.exec(line)
    if (h3) { cur = { title: h3[1], lines: [] }; out.push(cur); continue }
    if (cur) cur.lines.push(line)
  }
  return out
}

const text = (lines) => lines.join('\n')
const bullets = (lines) => lines
  .map((l) => /^\s*[-*]\s+(.*)$/.exec(l))
  .filter(Boolean)
  .map((m) => m[1].trim())

// ── 3. Parseo de fechas `Mes Año – Mes Año` ─────────────────────────────────
function parseRange(s) {
  const m = /([A-Za-zÁÉÍÓÚáéíóúñ]+)\s+(\d{4})\s*[–—-]\s*(Actualidad|([A-Za-zÁÉÍÓÚáéíóúñ]+)\s+(\d{4}))/i.exec(s)
  if (!m) return null
  const mes = (n) => MESES[String(n).toLowerCase()] || null
  const start = mes(m[1]) && { year: Number(m[2]), month: mes(m[1]) }
  const isCurrent = /actualidad/i.test(m[3])
  const end = isCurrent ? null : (mes(m[4]) && { year: Number(m[5]), month: mes(m[4]) })
  if (!start) return null
  const iso = (d) => d ? `${d.year}-${String(d.month).padStart(2, '0')}` : null
  return { startDate: iso(start), endDate: iso(end), isCurrent }
}

// ── 4. Extracción por sección ───────────────────────────────────────────────
function parseExperiences(lines, anon) {
  const out = []
  const unmapped = []
  for (const sub of splitSubsections(lines)) {
    // `### 3.1 Líder Técnico Pleno — Stefanini Colombia S.A.S. — Bogotá D.C.`
    const head = /^\d+(?:\.\d+)?\s+(.*)$/.exec(sub.title.trim())
    if (!head) continue
    const parts = head[1].split(/\s+—\s+/).map((s) => s.trim())
    if (parts.length < 2) continue
    const [roleTitle, companyReal, city] = parts

    // FAIL CLOSED: un empleador que no está en el mapa saldría con su nombre
    // real en la salida pública. Se acumula y se aborta al final.
    const entry = anon.entryFor(companyReal)
    if (!entry) { unmapped.push(companyReal); continue }
    const rangeLine = sub.lines.find((l) => parseRange(l))
    const range = rangeLine ? parseRange(rangeLine) : null

    // Se recogen TODAS las viñetas de la entrada, no solo las que siguen a
    // "Alcance del rol": las entradas más cortas (3.2 a 3.4) no usan ese
    // encabezado y quedaban con el resumen vacío.
    const roleBullets = sub.lines
      .map((l) => /^\s*[-*]\s+(.+)$/.exec(l))
      .filter(Boolean)
      .map((m) => m[1].trim())

    // Tecnologías: solo las que aparecen nombradas en la propia entrada.
    const TECH = ['Java', 'Spring Boot', 'Angular', 'OSB', 'BPEL', 'Oracle SOA Suite', 'JDeveloper',
      'Next.js', 'Supabase', 'TypeScript', 'Tailwind CSS', 'Docker', 'PL/SQL', 'Microservicios', 'RAG', 'MCP']
    const body = text(sub.lines)
    const technologies = TECH.filter((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(body))

    out.push({
      roleTitle,
      companyPublicLabel: entry.publicLabel,
      industrySector: entry.sector,
      companyRealName: companyReal,       // solo viaja al archivo privado
      city,
      ...(range || { startDate: null, endDate: null, isCurrent: false }),
      summaryPublic: anon.apply(roleBullets.join(' ')),
      achievements: roleBullets.map((b) => anon.apply(b)),
      technologies,
    })
  }
  out.unmapped = unmapped
  return out
}

function parseEducation(lines, anon) {
  const rows = []
  for (const l of lines) {
    const m = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/.exec(l)
    if (!m) continue
    if (/^-+$/.test(m[1].trim()) || /t[íi]tulo/i.test(m[1])) continue
    rows.push({ degree: m[1].trim(), institution: anon.apply(m[2].trim()), date: m[3].trim() })
  }
  return rows.filter((r) => !/bachiller/i.test(r.degree))
}

function parseSkills(lines) {
  const groups = []
  let cur = null
  for (const l of lines) {
    const g = /^\*\*(.+?)\*\*\s*$/.exec(l.trim())
    if (g) { cur = { group: g[1].trim(), items: [] }; groups.push(cur); continue }
    if (cur && l.includes('·') && !l.trim().startsWith('|') && !l.trim().startsWith('>')) {
      cur.items.push(...l.split('·').map((s) => s.trim()).filter(Boolean))
    }
  }
  return groups.filter((g) => g.items.length)
}

function parseLanguages(lines) {
  const out = []
  for (const l of lines) {
    const m = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*`?([^|`]+?)`?\s*\|$/.exec(l)
    if (!m) continue
    if (/^-+$/.test(m[1].trim()) || /idioma/i.test(m[1])) continue
    out.push({ language: m[1].trim(), declaredInCv: m[3].trim() })
  }
  return out
}

// ── 5. Main ─────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗')
console.log('║  ProyectoHV — generador de datos de carrera                 ║')
console.log('╚══════════════════════════════════════════════════════════════╝')
if (DRY) console.log('(modo --dry-run: no se escribe nada)')

if (!existsSync(SOURCE)) die(`No existe la fuente de verdad:\n  ${SOURCE}`)

const sectorEntries = loadSectorMap()
ok(`Mapa de anonimización: ${sectorEntries.length} alias en ${new Set(sectorEntries.map((e) => e.publicLabel)).size} sectores`)

const anon = makeAnonymizer(sectorEntries)
const sections = splitSections(readFileSync(SOURCE, 'utf8'))
const byKind = Object.fromEntries(sections.map((s) => [s.kind, s]))

const desconocidas = sections.filter((s) => s.kind === 'unknown').map((s) => s.title)
if (desconocidas.length) {
  console.log()
  info(`Secciones NO publicadas (sin mapeo explícito): ${desconocidas.length}`)
  for (const t of desconocidas) info(`· ${t}`)
}

const summarySec = byKind.summary
const expSec = byKind.experience
const eduSec = byKind.education
const skillSec = byKind.skills
const langSec = byKind.languages

if (!expSec) die('No se encontró la sección de experiencia laboral (## 3).')

const experiences = parseExperiences(expSec.lines, anon)

// FAIL CLOSED: un empleador fuera del mapa saldría con su nombre real en la
// salida pública. Se aborta en vez de publicarlo o de omitirlo en silencio.
if (experiences.unmapped?.length) {
  console.error('\n⛔ Empleadores SIN MAPEO en el mapa de anonimización:')
  for (const n of experiences.unmapped) console.error(`   · ${n}`)
  console.error('\n   Publicarlos filtraría su nombre. Omitirlos perdería trayectoria.')
  console.error('   Añádelos a .agents/rules/private/sector-map.txt y vuelve a ejecutar.')
  console.error('   Formato:  Nombre Real = etiqueta publica | sector')
  process.exit(1)
}
const education = eduSec ? parseEducation(eduSec.lines, anon) : []
const skillGroups = skillSec ? parseSkills(skillSec.lines) : []
const languages = langSec ? parseLanguages(langSec.lines) : []

const publicData = {
  $comment: 'GENERADO por .agents/skills/hv-career-pipeline/scripts/build-career-data.mjs — no editar a mano. Nivel PÚBLICO, anonimizado por sector.',
  generatedAt: new Date().toISOString(),
  source: 'perfil-maestro.md',
  profile: {
    fullName: 'Harold Augusto Rodríguez Martínez',
    headline: 'Líder Técnico | Arquitectura de Integración, Plataformas Cloud y Automatización con IA',
    location: 'Bogotá D.C., Colombia',
  },
  summary: summarySec ? anon.apply(bullets(summarySec.lines).join(' ')) : '',
  experiences: experiences.map(({ companyRealName, achievements, ...pub }) => ({ ...pub, achievements })),
  education,
  skillGroups,
  languages,
}

// ── 6. Backstop: escanear la SALIDA antes de escribirla ─────────────────────
const serialized = JSON.stringify(publicData, null, 2)
const hits = scanForbidden(serialized)
console.log()
if (hits.length) {
  console.error('⛔ FALLO DE CONFIDENCIALIDAD EN LA SALIDA')
  for (const h of hits) console.error(`   · ${h.label}`)
  console.error('\n   No se escribió nada. Revisa el mapa de anonimización.')
  console.error('   Los valores no se muestran: repetirlos sería la misma fuga.')
  process.exit(1)
}
ok(`Salida sin coincidencias en las listas privadas (${loadProhibitedClients().length} clientes)`)

// Autocomprobación: los nombres reales de empresa NO deben aparecer en el JSON público
const fugas = sectorEntries
  .map((e) => e.alias)
  .filter((alias) => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(serialized))
if (fugas.length) {
  console.error(`⛔ ${fugas.length} alias del mapa siguen presentes en la salida pública.`)
  process.exit(1)
}
ok('Ningún alias del mapa sobrevive en el JSON público')

console.log()
info(`Experiencias: ${experiences.length} · Formación: ${education.length} · Grupos de skills: ${skillGroups.length} · Idiomas: ${languages.length}`)
info(`Sustituciones de anonimización aplicadas: ${anon.hits}`)
for (const e of publicData.experiences) {
  info(`· ${e.roleTitle} — ${e.companyPublicLabel} (${e.startDate} → ${e.endDate || 'actual'})`)
}

// ── 7. Escritura ────────────────────────────────────────────────────────────
if (DRY) {
  console.log('\n[dry-run] no se escribió nada.')
  process.exit(0)
}

mkdirSync(dirname(OUT_PUBLIC), { recursive: true })
mkdirSync(dirname(OUT_PRIVATE), { recursive: true })
writeFileSync(OUT_PUBLIC, serialized + '\n', 'utf8')
ok(`Escrito ${OUT_PUBLIC.replace(ROOT, '.')}`)

// El nivel privado conserva lo que el público omite a propósito.
const privateData = {
  $comment: 'GENERADO — nivel PRIVADO (RLS + TTL 48h). GITIGNORED: no viaja por git.',
  generatedAt: new Date().toISOString(),
  experiences: experiences.map((e, i) => ({
    publicIndex: i,
    companyPrivateName: e.companyRealName,
    detailsPrivate: e.achievements.join(' '),
    architecturalDecisions: [],
    teamMetrics: {},
  })),
}
writeFileSync(OUT_PRIVATE, JSON.stringify(privateData, null, 2) + '\n', 'utf8')
ok(`Escrito ${OUT_PRIVATE.replace(ROOT, '.')}  (gitignored)`)

console.log('\n' + '─'.repeat(64))
console.log('Siguiente paso:')
console.log('  node .agents/skills/hv-career-pipeline/scripts/validate-career-data.mjs content/public.json')
console.log('─'.repeat(64))
