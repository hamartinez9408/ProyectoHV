#!/usr/bin/env node
// verify-mcp.mjs — Verifica que los MCPs declarados estén REALMENTE operativos.
//
// PROBLEMA QUE RESUELVE
// `bootstrap.mjs` escribe la configuración y dice "listo". Pero declarar un
// servidor no es tenerlo: puede quedar con un parámetro de seguridad ausente,
// apuntar al proyecto equivocado, o no arrancar. Nada de eso se nota hasta que
// alguien lo usa — y para entonces el reporte ya dijo que estaba bien.
//
// Este verificador cierra esa brecha con dos niveles:
//   · Estático (siempre)  — ¿el manifiesto y la config instalada dicen lo mismo?
//   · Sonda   (--probe)   — ¿el servidor arranca, autentica y expone lo esperado?
//
// HALLAZGO QUE LO MOTIVÓ
// El 2026-09-30 se detectó que `hv-supabase` estaba instalado SIN `read_only`:
// el manifiesto declaraba una cosa, la config instalada hacía otra, y ninguno de
// los dos se veía mal por separado. La sonda reporta 20 herramientas y 6
// mutaciones donde deberían ser 13 y ninguna.
//
// Uso:
//   node tools/verify-mcp.mjs            # solo comprobaciones estáticas
//   node tools/verify-mcp.mjs --probe    # además arranca cada servidor y lo sondea
//
// No imprime valores de secretos. Nunca.

import { existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const MANIFEST = join(HERE, 'mcp.manifest.json')
const USER_CONFIG = join(homedir(), '.zcode', 'cli', 'config.json')
const PROBE = process.argv.includes('--probe')
const PROBE_TIMEOUT = Number(process.env.HV_PROBE_TIMEOUT_MS || 90000)

// Herramientas que mutan o destruyen. Si alguna aparece en un servidor marcado
// `expectReadOnly`, el modo de solo lectura NO está activo — diga lo que diga
// la documentación o el parámetro de la URL.
const MUTATING_TOOLS = [
  'apply_migration', 'deploy_edge_function', 'deploy_function',
  'create_branch', 'delete_branch', 'merge_branch', 'reset_branch', 'rebase_branch',
  'create_project', 'pause_project', 'restore_project', 'delete_project',
  'update_storage_config', 'create_edge_function_secret',
]

const ok = (m) => console.log(`  ✅ ${m}`)
const warn = (m) => console.log(`  ⚠️  ${m}`)
const bad = (m) => console.log(`  ❌ ${m}`)
const info = (m) => console.log(`     ${m}`)

let failures = 0

// ── 1. Manifiesto vs configuración instalada ────────────────────────────────
function compare(manifestDef, installed) {
  const drift = []
  const expectType = manifestDef.type || (manifestDef.command ? 'stdio' : 'http')
  const actualType = installed.type || (installed.command ? 'stdio' : 'http')
  if (expectType !== actualType) drift.push(`tipo: manifiesto=${expectType} instalado=${actualType}`)

  if (manifestDef.url && manifestDef.url !== installed.url) {
    drift.push(`url: instalada difiere de la declarada`)
  }

  // El manifiesto declara nombres lógicos ("npx"); bootstrap los resuelve a
  // rutas absolutas. Se comparan los nombres base, no las rutas completas.
  if (manifestDef.command) {
    const a = basename(String(manifestDef.command)).toLowerCase()
    const b = basename(String(installed.command || '')).toLowerCase()
    const same = a === b || a.replace(/\.(cmd|exe)$/, '') === b.replace(/\.(cmd|exe)$/, '')
    if (!same) drift.push(`comando: manifiesto=${a} instalado=${b || '(ausente)'}`)
  }

  if (manifestDef.args) {
    const a = JSON.stringify(manifestDef.args)
    const b = JSON.stringify(installed.args || [])
    if (a !== b) drift.push('args: difieren')
  }

  // Los secretos se comparan por PRESENCIA, nunca por valor: el manifiesto
  // lleva ${VAR} y la config el valor real. No saber si el valor es correcto
  // es aceptable; creer que no hay ninguno no lo es.
  for (const key of Object.keys(manifestDef.env || {})) {
    if (!installed.env?.[key]) drift.push(`falta la variable de entorno ${key}`)
  }
  for (const key of Object.keys(manifestDef.headers || {})) {
    if (!installed.headers?.[key]) drift.push(`falta la cabecera ${key} (valor no inspeccionado)`)
  }
  return drift
}

// Los MCPs no viven solo en el config de ZCode. Antigravity tiene el suyo,
// también de scope de usuario, y carga en TODOS los workspaces — incluido este.
const OTROS_CONFIGS_DE_AGENTE = [
  ['Antigravity', join(homedir(), '.gemini', 'antigravity', 'mcp_config.json')],
  ['Antigravity', join(homedir(), '.gemini', 'config', 'mcp_config.json')],
]

/** Nombres de servidor de los demás agentes, con la herramienta que los declara. */
function otrosAgentesServidores() {
  const out = []
  for (const [tool, path] of OTROS_CONFIGS_DE_AGENTE) {
    if (!existsSync(path)) continue
    try {
      const cfg = JSON.parse(readFileSync(path, 'utf8'))
      for (const name of Object.keys(cfg.mcpServers || cfg.mcp?.servers || {})) out.push({ tool, name })
    } catch { /* config ilegible: se omite, no se inventa */ }
  }
  return out
}

function checkStatic(manifest, servers) {
  console.log('\n[1/2] Manifiesto vs configuración instalada')
  info(`config: ${USER_CONFIG}`)
  console.log()

  let checked = 0
  for (const [name, def] of Object.entries(manifest.servers)) {
    if (!def.required) {
      warn(`${name}: opcional/pendiente — no se verifica`)
      continue
    }
    checked++
    const installed = servers[name]
    if (!installed) {
      bad(`${name}: declarado como requerido y NO está instalado`)
      failures++
      continue
    }
    const drift = compare(def, installed)
    if (drift.length) {
      bad(`${name}: DRIFT`)
      for (const d of drift) info(`· ${d}`)
      failures++
    } else {
      ok(`${name}: coincide con el manifiesto`)
    }
  }
  if (!checked) warn('El manifiesto no declara ningún servidor requerido')

  // Regla #0 — servidores de infraestructura corporativa, en TODOS los configs
  console.log('\n[2/2] Regla #0 — servidores corporativos (todos los agentes)')
  const prohibidos = new Set(manifest.forbidden?.names || [])
  const hallados = [
    ...Object.keys(servers).filter((n) => prohibidos.has(n)).map((n) => `${n} en ZCode`),
    ...otrosAgentesServidores().filter((s) => prohibidos.has(s.name)).map((s) => `${s.name} en ${s.tool}`),
  ]
  if (hallados.length) {
    bad(`PRESENTES: ${hallados.join(', ')}`)
    info('Apuntan a infraestructura de un empleador o sus clientes, y cargan aquí.')
    info('Ver AGENTS.md Regla #0 y tools/MCP-REGISTRY.md.')
    failures++
  } else {
    ok(`ninguno de los ${prohibidos.size} prohibidos, en ningún config de agente`)
  }
}

// ── Sonda: arrancar el servidor y hablar MCP con él ─────────────────────────
function buildSpawn(command, args) {
  const argv = args || []
  if (process.platform !== 'win32') return { file: command, argv, verbatim: false }

  // Un .exe se lanza directo: envolverlo en cmd.exe solo añade una capa de
  // comillas que hay que acertar, y con rutas que llevan espacios (Docker, Node)
  // se comprobó que falla.
  if (!/\.(cmd|bat)$/i.test(command)) return { file: command, argv, verbatim: false }

  // Los .cmd y .bat NO se pueden lanzar directamente (EINVAL): exigen cmd.exe.
  // La línea se construye a mano y se marca `verbatim`, porque si Node vuelve a
  // cotizar unos argumentos ya cotizados el comando se rompe en SILENCIO — el
  // proceso muere sin decir por qué y la sonda agota su tiempo de espera.
  const quote = (s) => (/[\s"]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : s)
  return {
    file: process.env.ComSpec || 'cmd.exe',
    argv: ['/d', '/s', '/c', `"${[command, ...argv].map(quote).join(' ')}"`],
    verbatim: true,
  }
}

function probeStdio(entry) {
  return new Promise((done) => {
    const { file, argv, verbatim } = buildSpawn(entry.command, entry.args || [])
    const result = { tools: [], error: null }
    let child
    try {
      child = spawn(file, argv, {
        env: { ...process.env, ...(entry.env || {}) },
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsVerbatimArguments: verbatim,
      })
    } catch (e) {
      done({ tools: [], error: `no se pudo lanzar: ${e.message}` })
      return
    }
    let buf = ''
    let finished = false

    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      try { child.kill() } catch { /* ya terminó */ }
      done(result)
    }

    const timer = setTimeout(() => {
      result.error = result.error || `sin respuesta en ${PROBE_TIMEOUT / 1000}s`
      finish()
    }, PROBE_TIMEOUT)

    child.on('error', (e) => { result.error = `no se pudo lanzar: ${e.message}`; finish() })

    // Un proceso que muere no debe costar 90 s de espera, ni dejar el motivo
    // oculto: es la diferencia entre "no responde" y "terminó con código 1".
    child.on('exit', (code) => {
      if (finished) return
      result.error = result.error || `el proceso terminó (código ${code}) sin completar el handshake`
      finish()
    })

    child.stdout.on('data', (chunk) => {
      buf += chunk.toString()
      let i
      while ((i = buf.indexOf('\n')) > -1) {
        const line = buf.slice(0, i).trim()
        buf = buf.slice(i + 1)
        if (!line) continue
        let msg
        try { msg = JSON.parse(line) } catch { continue }
        if (msg.id === 1 && msg.result) {
          child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)
          child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })}\n`)
        }
        if (msg.id === 2) {
          result.tools = (msg.result?.tools || []).map((t) => t.name)
          finish()
        }
        if (msg.error && !result.error) result.error = `MCP: ${msg.error.message || JSON.stringify(msg.error)}`
      }
    })

    child.stderr.on('data', (chunk) => {
      const s = chunk.toString().trim()
      // El servidor escribe su log de arranque en stderr; eso NO es un fallo.
      if (s && !result.error && /error|fail|denied|unauthorized/i.test(s)) result.error = s.slice(0, 300)
    })

    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'hv-verify-mcp', version: '1.0' } },
    })}\n`)
  })
}

async function probeHttp(entry) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...(entry.headers || {}),
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT)
  try {
    const r1 = await fetch(entry.url, {
      method: 'POST', headers, signal: ctrl.signal,
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'hv-verify-mcp', version: '1.0' } },
      }),
    })
    const text1 = await r1.text()
    if (!r1.ok) return { tools: [], error: `HTTP ${r1.status} — ${text1.slice(0, 200).replace(/\s+/g, ' ')}` }

    const session = r1.headers.get('mcp-session-id')
    const h2 = { ...headers }
    if (session) h2['Mcp-Session-Id'] = session

    await fetch(entry.url, {
      method: 'POST', headers: h2, signal: ctrl.signal,
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    })
    const r2 = await fetch(entry.url, {
      method: 'POST', headers: h2, signal: ctrl.signal,
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    })
    const text2 = await r2.text()

    const messages = []
    for (const line of text2.split(/\r?\n/)) {
      const m = /^data:\s*(.+)$/.exec(line.trim())
      if (!m) continue
      try { messages.push(JSON.parse(m[1])) } catch { /* fragmento parcial */ }
    }
    if (!messages.length) { try { messages.push(JSON.parse(text2)) } catch { /* sin cuerpo útil */ } }

    const reply = messages.find((m) => m.id === 2)
    if (!reply?.result?.tools) return { tools: [], error: 'respuesta sin lista de herramientas' }
    return { tools: reply.result.tools.map((t) => t.name), error: null }
  } catch (e) {
    return { tools: [], error: e.name === 'AbortError' ? `sin respuesta en ${PROBE_TIMEOUT / 1000}s` : e.message }
  } finally {
    clearTimeout(timer)
  }
}

async function runProbes(manifest, servers) {
  console.log('\n[SONDA] Arrancando cada servidor y listando sus herramientas')
  if (!PROBE) { info('omitida — ejecuta con --probe para activarla'); return }

  for (const [name, def] of Object.entries(manifest.servers)) {
    if (!def.required) continue
    const entry = servers[name]
    if (!entry) continue

    process.stdout.write(`  · ${name} … `)
    const isHttp = (entry.type || '') === 'http' || (Boolean(entry.url) && !entry.command)
    let res
    try {
      res = isHttp ? await probeHttp(entry) : await probeStdio(entry)
    } catch (e) {
      res = { tools: [], error: e.message }
    }

    if (res.error && !res.tools.length) {
      console.log('')
      // Un servidor OAuth sin sesión iniciada responde 401: es su estado normal
      // antes del login interactivo, no un fallo de configuración.
      if (def.auth === 'oauth' && /HTTP 401/.test(res.error)) {
        warn(`${name}: exige login OAuth interactivo — no verificable por sonda`)
        continue
      }
      bad(`${name}: no respondió — ${res.error}`)
      failures++
      continue
    }
    console.log('')
    ok(`${name}: ${res.tools.length} herramientas`)

    const mutating = MUTATING_TOOLS.filter((t) => res.tools.includes(t))
    if (def.expectReadOnly) {
      if (mutating.length) {
        bad(`${name}: declarado de SOLO LECTURA y expone ${mutating.length} mutación(es): ${mutating.join(', ')}`)
        info('El parámetro de solo lectura NO está activo. Revisa la URL del manifiesto.')
        failures++
      } else {
        ok(`${name}: solo lectura confirmada — 0 mutaciones`)
      }
    } else if (mutating.length) {
      // Informativo, no alarma: un servidor que no se declaró de solo lectura
      // tiene derecho a escribir. La lista es del plano de datos, no exhaustiva
      // de todos los dominios, así que un 0 aquí no prueba ausencia de escritura.
      info(`${name}: con escritura (${mutating.join(', ')}) — coherente con no declararse de solo lectura`)
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║  ProyectoHV — verificación de MCPs                           ║')
console.log('╚══════════════════════════════════════════════════════════════╝')

if (!existsSync(MANIFEST)) { bad(`No existe ${MANIFEST}`); process.exit(1) }
if (!existsSync(USER_CONFIG)) {
  bad(`No existe ${USER_CONFIG} — abre ZCode al menos una vez`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const config = JSON.parse(readFileSync(USER_CONFIG, 'utf8'))
const servers = config.mcp?.servers || {}

checkStatic(manifest, servers)
await runProbes(manifest, servers)

console.log('\n' + '─'.repeat(64))
if (failures) {
  console.log(`VERIFICACIÓN CON FALLOS — ${failures} problema(s)`)
} else {
  console.log(PROBE ? 'VERIFICACIÓN COMPLETA — todos los MCPs operativos' : 'VERIFICACIÓN ESTÁTICA OK')
}
console.log('─'.repeat(64))
process.exit(failures ? 1 : 0)
