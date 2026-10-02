// Escaneo del HISTORIAL completo de git.
//
// No recorre el árbol de trabajo: recorre todos los blobs alcanzables desde
// todas las referencias (`rev-list --objects --all`). Así encuentra el valor
// aunque el archivo se haya borrado después — que es justo el caso peligroso,
// porque el árbol de trabajo se ve limpio y el historial publicado no.
//
// Compara sobre texto NORMALIZADO (sin tildes, minúsculas): mecanismo distinto
// al del motor de reglas, para no validar el motor con el motor.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const leerLista = (f) => readFileSync(f, 'utf8')
  .split(/\r?\n/).map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .flatMap((l) => l.split(',').map((s) => s.trim()).filter(Boolean))

const clientes = leerLista('.agents/rules/private/prohibited-clients.txt')
const ident = leerLista('.agents/rules/private/prohibited-identifiers.txt')

const listaCompleta = [...ident, ...clientes]
const prohibidos = listaCompleta.map((v) => ({ valor: v, norm: norm(v) }))

console.log(`\nvalores a buscar: ${prohibidos.length} (${ident.length} datos personales + ${clientes.length} clientes)`)
console.log('alcance: todos los blobs de todas las referencias\n')

// ── Recolectar blobs ────────────────────────────────────────────────────────
const objetos = execFileSync('git', ['rev-list', '--objects', '--all'], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean).map((l) => {
    const sp = l.indexOf(' ')
    return sp === -1 ? { sha: l, path: '(commit)' } : { sha: l.slice(0, sp), path: l.slice(sp + 1) }
  })

const blobs = new Map()
for (const o of objetos) if (o.path !== '(commit)') blobs.set(o.sha, o.path)
console.log(`blobs únicos a revisar: ${blobs.size}`)

// ── Escanear ────────────────────────────────────────────────────────────────
const hallazgos = []
let revisados = 0
for (const [sha, path] of blobs) {
  let buf
  try { buf = execFileSync('git', ['cat-file', '-p', sha], { maxBuffer: 64 * 1024 * 1024 }) } catch { continue }
  revisados++
  const txt = norm(buf.toString('utf8'))
  for (const p of prohibidos) {
    if (txt.includes(p.norm)) hallazgos.push({ sha, path, len: p.valor.length })
  }
}

console.log(`blobs leídos: ${revisados}\n`)

if (!hallazgos.length) {
  console.log('✅ HISTORIAL LIMPIO — ningún valor prohibido en ningún blob\n')
  process.exit(0)
}

// ── Reporte (sin imprimir los valores) ─────────────────────────────────────
const porPath = new Map()
for (const h of hallazgos) {
  const k = h.path
  if (!porPath.has(k)) porPath.set(k, { n: 0, shas: new Set(), lens: new Set() })
  const e = porPath.get(k)
  e.n++; e.shas.add(h.sha); e.lens.add(h.len)
}

console.log(`🔴 ${hallazgos.length} coincidencia(s) en ${porPath.size} ruta(s):\n`)
for (const [path, e] of [...porPath.entries()].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`  ${path}`)
  console.log(`     ${e.n} blob(s) · longitudes: ${[...e.lens].join(', ')}`)
}

console.log('\nlas rutas y longitudes bastan para identificar qué limpiar.')
console.log('los valores no se imprimen: repetirlos sería la misma fuga.\n')
process.exit(1)
