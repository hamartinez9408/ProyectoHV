// hv-scan-secrets.mjs — Busca material de credencial en el repositorio.
//
// Dos modos:
//   node tools/hv-scan-secrets.mjs                 → historial completo de git
//   node tools/hv-scan-secrets.mjs <ruta>         → un directorio del árbol de trabajo
//
// Distingue "menciona la palabra password" de "contiene una contraseña": una
// referencia a `${{ secrets.X }}` o un marcador `<tu-password>` NO son
// hallazgos; una asignación con un literal sí. Un rojo aquí exige triage manual.
//
// Los valores NUNCA se imprimen: se reporta ruta, tipo y ocurrencias.

import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const REGLAS = [
  ['clave privada PEM',        /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['token de GitHub',          /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['token de AWS',             /\bAKIA[0-9A-Z]{16}\b/],
  ['token de Slack',           /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/],
  ['JWT',                      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ['cadena de conexión',       /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s"'<>]*:[^\s"'<>@]+@/i],
  ['password con literal',     /\b(password|passwd|pwd)\s*[:=]\s*(?!\$\{|<%|\[|\s*$)(["']?)([^\s"'${}<>,;]{6,})\2/i],
  ['token/secret con literal', /\b(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key)\s*[:=]\s*(?!\$\{|<%|\[|\s*$)(["']?)([^\s"'${}<>,;]{8,})\2/i],
]

const IGNORAR = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.venv', 'target'])
const EXT_TXT = /\.(mjs|cjs|js|ts|tsx|json|ya?ml|yml|md|sh|bash|sql|properties|env|txt|conf|ini|toml|xml|html|css)$/i

const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/** @returns {Map<string, Map<string, number>>} ruta → (tipo → ocurrencias) */
function evaluar(texto, porPath, path) {
  const t = norm(texto)
  for (const [desc, re] of REGLAS) {
    const m = t.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))
    if (m?.length) {
      if (!porPath.has(path)) porPath.set(path, new Map())
      const d = porPath.get(path)
      d.set(desc, (d.get(desc) || 0) + m.length)
    }
  }
}

/** Modo 1: historial completo — todos los blobs, incluye archivos ya borrados. */
function escanearHistorial() {
  console.log('\nescaneando el HISTORIAL completo por material de credencial')
  console.log('(incluye archivos borrados: el árbol de trabajo limpio no basta)\n')
  const objetos = execFileSync('git', ['rev-list', '--objects', '--all'], { encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean)
  const blobs = new Map()
  for (const l of objetos) {
    const sp = l.indexOf(' ')
    if (sp > 0) blobs.set(l.slice(0, sp), l.slice(sp + 1))
  }
  const porPath = new Map()
  let leidos = 0
  for (const [sha, path] of blobs) {
    let txt
    try { txt = execFileSync('git', ['cat-file', '-p', sha], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8') } catch { continue }
    leidos++
    evaluar(txt, porPath, path)
  }
  console.log(`blobs leídos: ${leidos}`)
  return porPath
}

/** Modo 2: un directorio del árbol de trabajo. */
function escanearDirectorio(raiz) {
  console.log(`\nescaneando el ÁRBOL DE TRABAJO: ${raiz}\n`)
  const porPath = new Map()
  const walk = (d) => {
    let ents
    try { ents = readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of ents) {
      if (IGNORAR.has(e.name)) continue
      const f = join(d, e.name)
      if (e.isDirectory()) { walk(f); continue }
      if (!EXT_TXT.test(e.name)) continue
      let txt
      try { txt = readFileSync(f, 'utf8') } catch { continue }
      evaluar(txt, porPath, f)
    }
  }
  walk(raiz)
  return porPath
}

const objetivo = process.argv[2]
const porPath = objetivo ? escanearDirectorio(objetivo) : escanearHistorial()

console.log()
if (!porPath.size) {
  console.log('✅ sin material de credencial\n')
  process.exit(0)
}

console.log(`⚠️  ${porPath.size} ruta(s) con posibles credenciales — TRIAGE MANUAL:\n`)
for (const [path, m] of [...porPath.entries()].sort()) {
  console.log(`  ${path}`)
  for (const [desc, n] of m) console.log(`     · ${desc}  ×${n}`)
}
console.log('\nLos valores no se imprimen: repetirlos sería la misma fuga.')
console.log('Un hallazgo en documentación puede ser un ejemplo legítimo — pero un')
console.log('token con pinta de real en un repo público ES material de credencial.\n')
process.exit(1)
