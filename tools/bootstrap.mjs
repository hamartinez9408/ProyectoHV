#!/usr/bin/env node
// bootstrap.mjs — Prepara una máquina nueva para trabajar en ProyectoHV.
//
// PROBLEMA QUE RESUELVE
// Las instrucciones, skills, reglas y hooks viajan por git automáticamente.
// Los MCPs NO: viven en ~/.zcode/cli/config.json (scope de usuario, fuera del
// repo) y no pueden versionarse porque contendrían secretos.
//
// Este script cierra esa brecha: lee tools/mcp.manifest.json y aplica los
// servidores declarados al config de usuario, resolviendo los secretos desde
// variables de entorno. Sin secretos en el repositorio.
//
// Uso:
//   node tools/bootstrap.mjs            # aplica lo que pueda, reporta lo que falte
//   node tools/bootstrap.mjs --dry-run  # solo muestra qué haría
//   node tools/bootstrap.mjs --force    # reescribe entradas ya existentes

import { existsSync, readFileSync, writeFileSync, copyFileSync, symlinkSync, lstatSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const MANIFEST = join(HERE, 'mcp.manifest.json')
const USER_CONFIG = join(homedir(), '.zcode', 'cli', 'config.json')
const SKILLS_SRC = join(ROOT, '.agents', 'skills')
const SKILLS_LINK = join(ROOT, '.zcode', 'skills')

const DRY = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

const ok = (m) => console.log(`  ✅ ${m}`)
const warn = (m) => console.log(`  ⚠️  ${m}`)
const bad = (m) => console.log(`  ❌ ${m}`)
const info = (m) => console.log(`     ${m}`)

// ── 1. Junction de skills ───────────────────────────────────────────────────
function ensureSkillsJunction() {
  console.log('\n[1/3] Junction de skills (.zcode/skills -> .agents/skills)')
  console.log('      Motivo: .zcode/skills está gitignored porque git atraviesa la')
  console.log('      junction y guardaría los skills DOS VECES.')
  console.log('      ZCode encuentra .agents/skills de todos modos, así que esto')
  console.log('      es redundancia defensiva: no es bloqueante.')

  if (existsSync(SKILLS_LINK)) {
    let isLink = false
    try { isLink = lstatSync(SKILLS_LINK).isSymbolicLink() } catch { /* ignore */ }
    ok(`Ya existe (${isLink ? 'junction/symlink' : 'directorio real'})`)
    return true
  }
  if (!existsSync(SKILLS_SRC)) {
    bad('.agents/skills no existe — repo incompleto')
    return false
  }
  if (DRY) { info(`[dry-run] crearía ${SKILLS_LINK}`); return true }
  try {
    symlinkSync(SKILLS_SRC, SKILLS_LINK, 'junction')
    ok('Creada')
    return true
  } catch (e) {
    warn(`No se pudo crear automáticamente: ${e.message}`)
    info('Windows:  cmd /c mklink /J ".zcode\\skills" ".agents\\skills"')
    info('Linux/macOS:  ln -s ../.agents/skills .zcode/skills')
    return false
  }
}

// ── 2. Servidores MCP ───────────────────────────────────────────────────────
function resolveSecrets(server) {
  const missing = []
  const env = {}
  for (const [k, v] of Object.entries(server.env || {})) {
    const m = /^\$\{(\w+)\}$/.exec(v)
    if (!m) { env[k] = v; continue }
    const val = process.env[m[1]]
    if (val) env[k] = val
    else missing.push(m[1])
  }
  return { env, missing }
}

function applyServers(manifest) {
  console.log('\n[2/3] Servidores MCP (scope de usuario, fuera del repositorio)')

  if (!existsSync(USER_CONFIG)) {
    bad(`No existe ${USER_CONFIG}`)
    info('Abre ZCode al menos una vez para que se genere.')
    return false
  }

  let cfg
  try { cfg = JSON.parse(readFileSync(USER_CONFIG, 'utf8')) }
  catch (e) { bad(`Config ilegible: ${e.message}`); return false }

  const servers = (cfg.mcp ||= {}).servers ||= {}
  const added = [], skipped = [], blocked = []

  for (const [name, def] of Object.entries(manifest.servers)) {
    if (!def.required && def.blockedBy) { blocked.push({ name, why: def.blockedBy }); continue }
    if (!def.required) { blocked.push({ name, why: 'opcional' }); continue }

    if (servers[name] && !FORCE) { skipped.push(name); continue }

    const entry = {}
    if (def.type) entry.type = def.type
    if (def.url) entry.url = def.url
    if (def.command) entry.command = def.command
    if (def.args) entry.args = def.args
    const { env, missing } = resolveSecrets(def)
    if (Object.keys(env).length) entry.env = env
    entry.timeoutMs = 120000

    if (missing.length) {
      bad(`${name}: falta la variable ${missing.join(', ')}`)
      for (const s of def.secrets || []) {
        if (missing.includes(s.var)) {
          info(`obtener en: ${s.howToGet}`)
          if (s.minScopes) info(`permisos mínimos: ${s.minScopes}`)
          if (s.oauthAlternative) info(`alternativa sin secreto: ${s.oauthAlternative}`)
        }
      }
      continue
    }

    if (DRY) { info(`[dry-run] agregaría ${name}`); continue }
    servers[name] = entry
    added.push(name)
  }

  if (added.length && !DRY) {
    copyFileSync(USER_CONFIG, USER_CONFIG + '.bak-bootstrap')
    writeFileSync(USER_CONFIG, JSON.stringify(cfg, null, 2) + '\n', 'utf8')
  }

  for (const n of added) ok(`Instalado: ${n}`)
  for (const n of skipped) ok(`Ya presente: ${n}`)
  for (const b of blocked) warn(`${b.name}: pendiente — ${b.why}`)

  // Servidores prohibidos presentes en el scope de usuario
  const forbidden = (manifest.forbidden?.names || []).filter((n) => servers[n])
  console.log()
  if (forbidden.length) {
    bad(`SERVIDORES CORPORATIVOS DETECTADOS EN ESTE SCOPE: ${forbidden.join(', ')}`)
    info('Apuntan a infraestructura de un empleador o sus clientes.')
    info('Ver AGENTS.md Regla #0. No usarlos desde este proyecto.')
    info('Recomendado: moverlos a un config de workspace aparte.')
  } else {
    ok('Sin servidores corporativos en el scope de usuario')
  }
  return true
}

// ── 3. Listas privadas ─────────────────────────────────────────────────────
function checkPrivateLists() {
  console.log('\n[3/3] Listas privadas (gitignored, no viajan por git)')
  const dir = join(ROOT, '.agents', 'rules', 'private')
  const needed = {
    'prohibited-identifiers.txt': 'HV_PROHIBITED_IDENTIFIERS',
    'prohibited-clients.txt': 'HV_PROHIBITED_CLIENTS',
  }
  let missing = 0
  for (const [file, envVar] of Object.entries(needed)) {
    if (existsSync(join(dir, file))) { ok(file) }
    else {
      missing++
      warn(`${file} AUSENTE`)
      info(`Local: créalo con un valor por línea`)
      info(`CI:    define el secret ${envVar}`)
      info('Sin esta lista los guardas NO pueden verificar confidencialidad y lo avisarán.')
    }
  }
  return missing === 0
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║  ProyectoHV — bootstrap de contexto                          ║')
console.log('╚══════════════════════════════════════════════════════════════╝')
if (DRY) console.log('(modo --dry-run: no se escribe nada)')

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const j = ensureSkillsJunction()
const m = applyServers(manifest)
const p = checkPrivateLists()

console.log('\n' + '─'.repeat(64))
console.log('SIGUIENTE PASO: verifica que todo quedó igual al resto del equipo:')
console.log('   node tools/verify-context.mjs')
console.log('─'.repeat(64))
process.exit(j && m ? 0 : 1)
