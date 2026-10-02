// hv-scrub-tree.mjs — Sustituye valores prohibidos y credenciales en un árbol.
//
// Nace de una fuga real (2026-10-02): un nombre de cliente viajó a
// content/public.json y un JWT a un documento de diseño, ambos ya COMMITEADOS.
// Limpiar el árbol de trabajo no basta — el historial publicado los conserva.
//
// Se usa como `--tree-filter` de git filter-branch, que lo ejecuta en cada
// commit sobre un árbol temporal:
//
//   FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch \
//     --tree-filter 'node /ruta/absoluta/hv-scrub-tree.mjs' -- --all
//
// Dos sustituciones, ambas de texto (la estructura de los archivos no cambia):
//
//   1. Cada valor de las listas privadas → su etiqueta pública del mapa de
//      anonimización, o un marcador genérico si el valor no está en el mapa.
//      Se reutiliza el MISMO motor de reglas que el pipeline, así que las
//      fronteras y la tolerancia a tildes son idénticas: no hay una segunda
//      definición de "coincide" que pueda divergir.
//
//   2. Material de credencial: JWT y UUIDs de grant dentro de ejemplos curl.
//      Un token con pinta de real en un repo público es material de credencial
//      aunque se haya fabricado para el ejemplo.
//
// Los valores NUNCA se imprimen. Solo se reportan conteos.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// El árbol temporal de filter-branch no contiene .agents/rules/private/
// (está gitignored), así que las listas se leen del repo real por ruta absoluta.
const REPO = process.env.HV_REPO_ROOT || 'C:/Personal/ProyectoHV'
const { diacriticSource, loadProhibitedClients, loadNeverAllowed } =
  await import(pathToFileURL(join(REPO, '.agents', 'scripts', 'hv-rules.mjs')).href)

// ── Mapa de anonimización: valor real → etiqueta pública ────────────────────
function cargarMapa() {
  const f = join(REPO, '.agents', 'rules', 'private', 'sector-map.txt')
  if (!existsSync(f)) return []
  const out = []
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const m = /^(.+?)\s*=\s*(.+)$/.exec(t)
    if (!m) continue
    const [label] = m[2].split('|').map((s) => s.trim())
    for (const alias of m[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean)) {
      out.push({ alias, label })
    }
  }
  // El más largo primero: "Nombre Largo S.A." antes que "Nombre".
  return out.sort((a, b) => b.alias.length - a.alias.length)
}

const mapa = cargarMapa()
const clientes = loadProhibitedClients()
const personales = loadNeverAllowed()

/**
 * Etiqueta pública de un cliente: la del mapa si tiene regla, si no un marcador.
 *
 * ⚠️ El mapa de anonimización se usa SOLO para dar una etiqueta legible a los
 * valores de `prohibited-clients.txt`. NO se aplica a sus demás alias.
 *
 * Por qué: el mapa mezcla dos alcances distintos.
 *   · Los 9 clientes → prohibidos en TODO el repositorio. Depurarlos es correcto.
 *   · El empleador (Stefanini) y su producto (SophieX) → solo se anonimizan en
 *     el CONTENIDO DEL SITIO (content/public.json). Su literal es NECESARIO en
 *     código y configuración: el guarda de la Regla #0 busca la ruta literal, y
 *     el manifiesto de MCPs registra sus nombres. Y ya están en AGENTS.md, que
 *     está versionado, así que no son un secreto del repositorio.
 *
 * Aplicar los alias del empleador a todo el árbol —como se hizo en la primera
 * pasada— DESACTIVÓ la Regla #0: el guarda quedó buscando
 * `C:\<etiqueta pública>\` en vez de la ruta real, y ningún guardrail lo
 * detectó porque validan contenido, no comportamiento.
 */
const normalizar = (s) =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const etiquetaDe = (valor) => {
  const n = normalizar(valor)
  const hit = mapa.find((e) => normalizar(e.alias) === n)
  return hit ? hit.label : '[cliente corporativo]'
}

// ── Reglas de sustitución ───────────────────────────────────────────────────
// SIN fronteras de palabra, a diferencia de los guardas del árbol de trabajo.
// El motivo es un caso real: un comentario de hv-rules.mjs escribía el nombre
// del cliente dentro de la notación `\bNombre del Cliente\b`. El carácter
// anterior era la `b` de `\b` —de palabra—, así que la frontera no aplicaba y
// el depurador lo dejaba pasar. Para publicar, un nombre es fuga aunque esté
// pegado a letras.
//
// El costo es sobrerrepresentar (p. ej. un alias corto dentro de otra palabra).
// En una depuración de historial eso se prefiere: sobrerrepresentar se revisa,
// subrepresentar se publica.
const sinFronteras = (v, flags = 'giu') => new RegExp(diacriticSource(v), flags)

const reglas = []
for (const c of clientes) {
  reglas.push({ re: sinFronteras(c.value), a: etiquetaDe(c.value) })
}
for (const p of personales) {
  reglas.push({ re: sinFronteras(p.value), a: '[dato personal]' })
}

// Material de credencial en ejemplos.
const CREDENCIALES = [
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '<jwt-falsificado-invalido>'],
  [/(x-grant-id:\s*)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '$1<uuid-de-grant-inexistente>'],
]

const EXT_TXT = /\.(mjs|cjs|js|ts|tsx|json|ya?ml|yml|md|sh|bash|sql|properties|env|txt|conf|ini|toml|xml|html|css)$/i
const IGNORAR = new Set(['.git', '.git-rewrite', 'node_modules', '.next', 'dist', 'build', 'target', '.scannerwork'])

let archivosTocados = 0
let sustituciones = 0

function depurar(path) {
  let txt
  try { txt = readFileSync(path, 'utf8') } catch { return }
  const original = txt

  for (const r of reglas) {
    txt = txt.replace(r.re, () => { sustituciones++; return r.a })
  }
  for (const [re, a] of CREDENCIALES) {
    txt = txt.replace(re, (...args) => {
      sustituciones++
      return typeof a === 'function' ? a(...args) : a.replace('$1', args[1] ?? '')
    })
  }

  if (txt !== original) {
    writeFileSync(path, txt, 'utf8')
    archivosTocados++
  }
}

function walk(dir) {
  let ents
  try { ents = readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of ents) {
    if (IGNORAR.has(e.name)) continue
    const f = join(dir, e.name)
    if (e.isDirectory()) { walk(f); continue }
    if (EXT_TXT.test(e.name)) depurar(f)
  }
}

walk(process.cwd())

// Reporte solo si hubo trabajo, para no inundar el log de filter-branch.
if (sustituciones) {
  console.log(`    scrub: ${sustituciones} sustitución(es) en ${archivosTocados} archivo(s)`)
}
process.exit(0)
