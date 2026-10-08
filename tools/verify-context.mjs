#!/usr/bin/env node
// verify-context.mjs — Comprueba que esta máquina reproduce el contexto del equipo.
//
// "Garantizar los mismos resultados" no se logra documentando: se logra
// VERIFICANDO. Este script comprueba que las capas que viajan por git están
// íntegras y que la capa que NO viaja por git (MCPs, secretos) está aplicada.
//
// Uso:  node tools/verify-context.mjs
// Salida: 0 si todo lo requerido pasa · 1 si algo falla

import { existsSync, readFileSync, lstatSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { homedir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

const results = []
const check = (name, pass, detail, required = true) =>
  results.push({ name, pass, detail, required })

// ── 1. Entorno ──────────────────────────────────────────────────────────────
const major = Number(process.versions.node.split('.')[0])
check('Node >= 20', major >= 20, `v${process.versions.node}`)

// ── 2. Skills ───────────────────────────────────────────────────────────────
const SKILLS_DIR = join(ROOT, '.agents', 'skills')
let skillDirs = []
try { skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) } catch { /* ignore */ }

const badSkills = []
for (const d of skillDirs) {
  const p = join(SKILLS_DIR, d, 'SKILL.md')
  if (!existsSync(p)) { badSkills.push(`${d}: sin SKILL.md`); continue }
  const txt = readFileSync(p, 'utf8')
  const fm = /^---\s*\n([\s\S]*?)\n---/.exec(txt)
  if (!fm) { badSkills.push(`${d}: sin frontmatter`); continue }
  const name = /^name:\s*["']?([\w-]+)/m.exec(fm[1])
  if (!name) badSkills.push(`${d}: sin campo name`)
  else if (name[1] !== d) badSkills.push(`${d}: name="${name[1]}" no coincide con la carpeta`)
  if (!/^description:\s*\S/m.test(fm[1])) badSkills.push(`${d}: sin description`)
}
check('Skills descubribles por ZCode', skillDirs.length > 0 && badSkills.length === 0,
  badSkills.length ? badSkills.join(' | ') : `${skillDirs.length} skills válidas`)

// ── 3. Junction ─────────────────────────────────────────────────────────────
const LINK = join(ROOT, '.zcode', 'skills')
let linkState = 'ausente'
if (existsSync(LINK)) {
  try { linkState = lstatSync(LINK).isSymbolicLink() ? 'junction/symlink' : 'directorio real' }
  catch { linkState = 'ilegible' }
}
check('Junction .zcode/skills', linkState !== 'ausente',
  linkState === 'ausente'
    ? 'no existe — ZCode igual encuentra .agents/skills (redundancia defensiva)'
    : linkState,
  false) // no bloqueante

// ── 4. Subagentes ───────────────────────────────────────────────────────────
const AGENTS_DIR = join(ROOT, '.zcode', 'agents')
let agentFiles = []
try { agentFiles = readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md')) } catch { /* ignore */ }
const badAgents = agentFiles.filter((f) => {
  const txt = readFileSync(join(AGENTS_DIR, f), 'utf8')
  return !/^---\s*\n[\s\S]*?name:/.test(txt) || !/description:/.test(txt)
})
check('Subagentes hv-*', agentFiles.length >= 6 && badAgents.length === 0,
  badAgents.length ? `sin frontmatter válido: ${badAgents.join(', ')}` : `${agentFiles.length} subagentes`)

// ── 5. Hooks cableados ──────────────────────────────────────────────────────
let hookDetail = 'no comprobado'
let hookOk = false
try {
  const cfg = JSON.parse(readFileSync(join(ROOT, '.zcode', 'config.json'), 'utf8'))
  const h = cfg.hooks || {}
  const pre = h.events?.PreToolUse?.[0]
  const matcher = pre?.matcher || ''
  const cmd = pre?.hooks?.[0]
  const testNames = ['Bash', 'Write', 'Edit']
  const matches = testNames.every((t) => { try { return new RegExp(matcher).test(t) } catch { return false } })
  const scriptPath = join(ROOT, '.zcode', 'hooks', 'pretool-safety-zcode.mjs')
  hookOk = h.enabled === true && matches && !!cmd && existsSync(scriptPath)
  hookDetail = !h.enabled ? 'hooks.enabled no es true'
    : !matches ? `matcher "${matcher}" no cubre Bash|Write|Edit`
    : !cmd ? 'sin comando'
    : !existsSync(scriptPath) ? 'falta el script del adaptador'
    : `enabled · matcher "${matcher}" · type=${cmd.type}`
} catch (e) { hookDetail = `config ilegible: ${e.message}` }
check('Hook PreToolUse cableado', hookOk, hookDetail)

// ── 6. Motor de reglas — AUTOTEST ───────────────────────────────────────────
// No hardcodea valores: los LEE de las listas privadas y comprueba que el
// motor los detecta. Así se verifica el mecanismo, no una copia del dato.
let engineOk = false
let engineDetail = ''
try {
  const eng = await import(pathToFileURL(join(ROOT, '.agents', 'scripts', 'hv-rules.mjs')).href)
  const lists = eng.hasPrivateLists()

  const casos = []
  // Regla #0: ruta corporativa
  casos.push(['Bash con ruta corporativa',
    () => eng.evaluate('Bash', { command: 'ls C:/Stefanini/x' }).decision === 'block'])
  // Contenido limpio
  casos.push(['contenido limpio pasa',
    () => eng.evaluate('Write', { filePath: 'content/public.json', content: 'texto normal' }).decision === 'allow'])
  // Escritura en ruta corporativa
  casos.push(['escritura en ruta corporativa',
    () => eng.evaluate('Write', { filePath: 'C:/Stefanini/x.md', content: 'x' }).decision === 'block'])

  // Autotest con el VALOR REAL, leído de la lista privada (no hardcodeado)
  if (lists.identifiers) {
    const privFile = join(ROOT, '.agents', 'rules', 'private', 'prohibited-identifiers.txt')
    const raw = (process.env.HV_PROHIBITED_IDENTIFIERS || '').split(',')[0].trim()
      || (existsSync(privFile) ? readFileSync(privFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith('#')) : '')
    if (raw) {
      casos.push(['dato personal real bloqueado (evaluate)',
        () => eng.evaluate('Write', { filePath: 'content/public.json', content: `x ${raw}` }).decision === 'block'])
      casos.push(['dato personal real detectado (scanForbidden)',
        () => eng.scanForbidden(`x ${raw}`).length > 0])
    }
  }
  if (lists.clients) {
    const privFile = join(ROOT, '.agents', 'rules', 'private', 'prohibited-clients.txt')
    const raw = (process.env.HV_PROHIBITED_CLIENTS || '').split(',')[0].trim()
      || (existsSync(privFile) ? readFileSync(privFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith('#')) : '')
    if (raw) {
      casos.push(['cliente real bloqueado (evaluate)',
        () => eng.evaluate('Write', { filePath: 'content/public.json', content: `x ${raw}` }).decision === 'block'])
    }
  }

  const fallidos = casos.filter(([, fn]) => { try { return !fn() } catch { return true } })
  engineOk = fallidos.length === 0
  const capas = `identificadores:${lists.identifiers ? 'sí' : 'NO'} clientes:${lists.clients ? 'sí' : 'NO'}`
  engineDetail = fallidos.length
    ? `fallan: ${fallidos.map(([n]) => n).join(', ')}`
    : `${casos.length} casos de autotest OK · ${capas}`
} catch (e) { engineDetail = `no se pudo importar: ${e.message}` }
check('Motor de reglas operativo', engineOk, engineDetail)

// ── 7. Listas privadas ──────────────────────────────────────────────────────
const PRIV = join(ROOT, '.agents', 'rules', 'private')
const listaId = existsSync(join(PRIV, 'prohibited-identifiers.txt')) || Boolean(process.env.HV_PROHIBITED_IDENTIFIERS)
const listaCl = existsSync(join(PRIV, 'prohibited-clients.txt')) || Boolean(process.env.HV_PROHIBITED_CLIENTS)
const detailId = existsSync(join(PRIV, 'prohibited-identifiers.txt')) ? 'ok' : (process.env.HV_PROHIBITED_IDENTIFIERS ? 'secret' : 'AUSENTE')
const detailCl = existsSync(join(PRIV, 'prohibited-clients.txt')) ? 'ok' : (process.env.HV_PROHIBITED_CLIENTS ? 'secret' : 'AUSENTE')
check('Listas privadas presentes', listaId && listaCl,
  `identificadores:${detailId} clientes:${detailCl}` +
  (listaId && listaCl ? '' : ' — sin ellas los guardas avisan pero no protegen'))

// ── 8. .gitignore cubre la zona privada ─────────────────────────────────────
let giOk = false, giDetail = ''
try {
  const gi = readFileSync(join(ROOT, '.gitignore'), 'utf8')
  const needed = ['.agents/rules/private/', 'content/private/']
  const faltan = needed.filter((n) => !gi.includes(n))
  giOk = faltan.length === 0
  giDetail = faltan.length ? `sin cubrir: ${faltan.join(', ')}` : 'zona privada y contenido bloqueados'
} catch (e) { giDetail = e.message }
check('.gitignore protege lo privado', giOk, giDetail)

// ── 9. MCPs ─────────────────────────────────────────────────────────────────
// Los MCPs viven en configs de USUARIO, que no viajan por git. En CI esa
// comprobación no aplica: se reporta como tal en vez de fallar por diseño.
//
// Y no basta con mirar el config de ZCode. Antigravity tiene el suyo, también de
// scope de usuario, y se carga en TODOS los workspaces — incluido este. Una
// comprobación que solo mire uno da un verde falso: se verificó el 2026-09-30,
// cuando apareció infraestructura corporativa únicamente en el otro.
const enCI = Boolean(process.env.CI)

const AGENT_CONFIGS = [
  ['ZCode', join(homedir(), '.zcode', 'cli', 'config.json')],
  ['Antigravity', join(homedir(), '.gemini', 'antigravity', 'mcp_config.json')],
  ['Antigravity', join(homedir(), '.gemini', 'config', 'mcp_config.json')],
]

let mcpDetail = '', mcpOk = false, forbDetail = '', forbOk = true, roDetail = '', roOk = true
try {
  const manifest = JSON.parse(readFileSync(join(HERE, 'mcp.manifest.json'), 'utf8'))

  const todos = []
  for (const [tool, path] of AGENT_CONFIGS) {
    if (!existsSync(path)) continue
    try {
      const cfg = JSON.parse(readFileSync(path, 'utf8'))
      const servers = cfg.mcp?.servers || cfg.mcpServers || {}
      for (const [name, def] of Object.entries(servers)) todos.push({ tool, name, def })
    } catch { /* config ilegible: se omite, no se inventa */ }
  }

  const req = Object.entries(manifest.servers).filter(([, d]) => d.required).map(([n]) => n)
  const falta = req.filter((n) => !todos.some((s) => s.name === n))
  mcpOk = falta.length === 0
  mcpDetail = falta.length ? `faltan: ${falta.join(', ')} — corre npm run setup:ai`
                           : `${req.length} servidores requeridos presentes`

  const prohibidos = new Set(manifest.forbidden?.names || [])
  const hallados = todos.filter((s) => prohibidos.has(s.name)).map((s) => `${s.name} en ${s.tool}`)
  forbOk = hallados.length === 0
  forbDetail = hallados.length
    ? `PRESENTES: ${hallados.join(', ')} — cargan en este workspace. Guárdalos en el config del workspace corporativo (ver tools/MCP-REGISTRY.md)`
    : `ninguno de los ${prohibidos.size}, en ${todos.length} entradas`

  // Invariante: todo servidor de Supabase, de quien sea, debe ser de solo lectura.
  // No exige saber a quién pertenece el proyecto, que es justo el dato que no
  // siempre está disponible — y por eso comprueba algo que sí se puede afirmar.
  const conEscritura = todos
    .filter((s) => {
      const text = JSON.stringify(s.def)
      return /mcp\.supabase\.com/.test(text) && !/read_only/.test(text)
    })
    .map((s) => `${s.name} en ${s.tool}`)
  roOk = conEscritura.length === 0
  roDetail = conEscritura.length
    ? `con ESCRITURA: ${conEscritura.join(', ')} — añade &read_only=true o retíralos`
    : 'todos de solo lectura'
} catch (e) { mcpDetail = e.message }

check('MCPs requeridos instalados', mcpOk || enCI,
  enCI ? 'no aplica en CI: el config de usuario no viaja por git' : mcpDetail, !enCI)
check('Sin MCPs corporativos en ningún config de agente', forbOk, forbDetail, !enCI)
check('Todo servidor Supabase en solo lectura', roOk || enCI,
  enCI ? 'no aplica en CI: el config de usuario no viaja por git' : roDetail, !enCI)

// ── 10. Capa 4 presente y sintácticamente sana ──────────────────────────────
// Una barrera que no se ejecuta es peor que una ausente: genera confianza
// falsa. Un error de sintaxis en el YAML hace exactamente eso — el workflow
// aparece en el repo y nunca corre. Node no trae parser de YAML, así que se
// comprueban las claves de nivel raíz y el error más común (comentarios '//',
// que son de JavaScript: YAML usa '#').
let ymlOk = false, ymlDetail = ''
try {
  const wf = join(ROOT, '.github', 'workflows', 'guardrails.yml')
  if (!existsSync(wf)) {
    ymlDetail = 'falta .github/workflows/guardrails.yml — la Capa 4 no está implementada'
  } else {
    const t = readFileSync(wf, 'utf8')
    const claves = ['name:', 'on:', 'jobs:'].filter((k) => !new RegExp(`^${k}`, 'm').test(t))
    const malos = t.split('\n').filter((l) => /^\s*\/\//.test(l))
    if (claves.length) ymlDetail = `sin claves de nivel raíz: ${claves.join(' ')}`
    else if (malos.length) ymlDetail = `${malos.length} línea(s) con comentario '//' — YAML usa '#'`
    else { ymlOk = true; ymlDetail = 'guardrails.yml presente, sin errores de sintaxis evidentes' }
  }
} catch (e) { ymlDetail = e.message }
check('Capa 4 (workflow de CI) sana', ymlOk, ymlDetail)

// ── 11. Sincronía de tsconfig (build vs sonar) ──────────────────────────────
let tsconfigOk = true, tsconfigDetail = ''
try {
  const pBuild = join(ROOT, 'web', 'tsconfig.json')
  const pSonar = join(ROOT, 'web', 'tsconfig.sonar.json')
  if (existsSync(pBuild) && existsSync(pSonar)) {
    const cBuild = JSON.parse(readFileSync(pBuild, 'utf8')).compilerOptions || {}
    const cSonar = JSON.parse(readFileSync(pSonar, 'utf8')).compilerOptions || {}
    const criticalKeys = [
      'strict',
      'target',
      'lib',
      'noUncheckedIndexedAccess',
      'noImplicitOverride',
      'noFallthroughCasesInSwitch',
      'noUnusedLocals',
      'noUnusedParameters'
    ]
    const diffs = []
    for (const k of criticalKeys) {
      if (JSON.stringify(cBuild[k]) !== JSON.stringify(cSonar[k])) {
        diffs.push(`${k} (build=${JSON.stringify(cBuild[k])} vs sonar=${JSON.stringify(cSonar[k])})`)
      }
    }
    if (diffs.length > 0) {
      tsconfigOk = false
      tsconfigDetail = `Divergencia detectada: ${diffs.join('; ')}`
    } else {
      tsconfigDetail = 'opciones estrictas sincronizadas (strict, target, lib, checks)'
    }
  } else {
    tsconfigDetail = 'uno o ambos archivos tsconfig ausentes en web/'
  }
} catch (e) {
  tsconfigOk = false
  tsconfigDetail = `error validando tsconfig: ${e.message}`
}
check('Sincronía tsconfig (build vs sonar)', tsconfigOk, tsconfigDetail)

// ── 12. Binding de SonarCloud en CI (D-4) ──────────────────────────────────
let sonarBindingOk = false, sonarBindingDetail = ''
try {
  const wfPath = join(ROOT, '.github', 'workflows', 'sonar-pr-approval.yml')
  if (existsSync(wfPath)) {
    const wfContent = readFileSync(wfPath, 'utf8')
    const hasOrg = /-Dsonar\.organization=.*hamartinez9408/.test(wfContent)
    const hasCloudUrl = /sonarcloud\.io/.test(wfContent)
    const hasProjectKey = /-Dsonar\.projectKey=.*hamartinez9408_ProyectoHV/.test(wfContent)

    if (hasOrg && hasCloudUrl && hasProjectKey) {
      sonarBindingOk = true
      sonarBindingDetail = 'organización (hamartinez9408), host (sonarcloud.io) y projectKey configurados'
    } else {
      const missing = []
      if (!hasOrg) missing.push('falta organización hamartinez9408')
      if (!hasCloudUrl) missing.push('falta sonarcloud.io')
      if (!hasProjectKey) missing.push('falta projectKey hamartinez9408_ProyectoHV')
      sonarBindingDetail = `Incompleto: ${missing.join(', ')}`
    }
  } else {
    sonarBindingDetail = 'workflow sonar-pr-approval.yml ausente'
  }
} catch (e) {
  sonarBindingDetail = `error verificando binding: ${e.message}`
}
check('Binding SonarCloud en workflow de CI', sonarBindingOk, sonarBindingDetail)

// ── Salida ──────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════════╗')
console.log('║  ProyectoHV — verificación de contexto                           ║')
console.log('╚══════════════════════════════════════════════════════════════════╝\n')

for (const r of results) {
  const mark = r.pass ? '✅' : (r.required ? '❌' : '⚠️ ')
  console.log(`  ${mark} ${r.name}`)
  console.log(`      ${r.detail}`)
}

const fallosR = results.filter((r) => !r.pass && r.required)
console.log('\n' + '─'.repeat(68))
if (fallosR.length === 0) {
  console.log('  CONTEXTO ÍNTEGRO — esta máquina reproduce el del equipo.')
  console.log('  (Los ⚠️  son informativos: no bloquean.)')
} else {
  console.log(`  ${fallosR.length} verificación(es) requerida(s) fallaron:`)
  for (const r of fallosR) console.log(`    · ${r.name}`)
  console.log('\n  Corre: node tools/bootstrap.mjs')
}
console.log('─'.repeat(68) + '\n')

process.exit(fallosR.length === 0 ? 0 : 1)
