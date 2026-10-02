#!/usr/bin/env node
// verify-build.mjs — Comprueba el artefacto CONSTRUIDO, no el código fuente.
//
// POR QUÉ MIRA EL ARTEFACTO
// Un build puede pasar, generar HTML y no contener nada. O peor: contener datos
// que no debían publicarse. Revisar el código fuente no lo detecta, porque el
// problema vive en el resultado.
//
// Cubre un criterio de terminado del roadmap (Slice 1):
//   "0 menciones de datos privados o clientes en código fuente o bundle JS"
//
// Uso:
//   node scripts/verify-build.mjs              # avisa si no hay listas
//   node scripts/verify-build.mjs --require-lists   # falla si no hay listas
//
// Degradación: en CI el archivo privado no existe, así que las listas se leen
// de HV_PROHIBITED_CLIENTS / HV_PROHIBITED_IDENTIFIERS (secrets de Actions).

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = resolve(HERE, '..')
const REPO_ROOT = resolve(WEB_ROOT, '..')
const BUILD_DIR = join(WEB_ROOT, '.next')

const STRICT = process.argv.includes('--require-lists')

const ok = (m) => console.log(`  ✅ ${m}`)
const warn = (m) => console.log(`  ⚠️  ${m}`)
const bad = (m) => console.log(`  ❌ ${m}`)

if (!existsSync(BUILD_DIR)) {
  bad('No hay build en .next/ — ejecuta `npm run build` primero.')
  process.exit(1)
}

// ── Listas privadas, por variable de entorno o por archivo ──────────────────
function loadList(envVar, fileName) {
  const fromEnv = process.env[envVar]
  if (fromEnv?.trim()) return { items: splitList(fromEnv), source: `env ${envVar}` }
  const file = join(REPO_ROOT, '.agents', 'rules', 'private', fileName)
  if (existsSync(file)) return { items: splitList(readFileSync(file, 'utf8')), source: fileName }
  return { items: [], source: null }
}

const splitList = (raw) =>
  raw.split(/[\r\n,]+/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))

const clients = loadList('HV_PROHIBITED_CLIENTS', 'prohibited-clients.txt')
const identifiers = loadList('HV_PROHIBITED_IDENTIFIERS', 'prohibited-identifiers.txt')

console.log('\nVerificación del artefacto construido\n')
for (const [label, list] of [['clientes', clients], ['identificadores', identifiers]]) {
  if (list.items.length) ok(`Lista de ${label}: ${list.items.length} entradas (${list.source})`)
  else bad(`Lista de ${label}: NO DISPONIBLE — no se puede verificar`)
}

if (!clients.items.length && !identifiers.items.length) {
  if (STRICT) {
    bad('Sin listas no hay verificación posible. Se falla a propósito (--require-lists).')
    process.exit(1)
  }
  warn('Sin listas: se verifica que el sitio TENGA contenido, pero no qué contenido.')
}

// ── Recolectar el artefacto ─────────────────────────────────────────────────
function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else if (/\.(html|js)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

const artifacts = walk(BUILD_DIR)
let totalBytes = 0
const blob = artifacts
  .map((f) => {
    totalBytes += statSync(f).size
    return readFileSync(f, 'utf8')
  })
  .join('\n')

// El HTML prerenderizado, sin etiquetas, es lo que realmente ve un visitante.
const htmlFiles = artifacts.filter((f) => f.endsWith('.html'))
const visibleText = htmlFiles
  .map((f) => readFileSync(f, 'utf8'))
  .join(' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')

console.log(
  `\nArtefacto: ${artifacts.length} archivos · ${(totalBytes / 1024).toFixed(0)} KB · ` +
    `${htmlFiles.length} HTML · ${visibleText.length} car de texto visible\n`,
)

// ── 1. ¿El sitio tiene contenido de verdad? ─────────────────────────────────
const REQUIRED = [
  ['nombre', 'Harold Augusto Rodr'],
  ['titular', 'rquitectura de Integraci'],
  ['al menos una cifra medida', '%'],
  ['al menos un sector anonimizado', 'Empresa'],
  ['al menos una tecnologia', 'Spring Boot'],
]

console.log('Contenido renderizado:')
let contentFailures = 0
for (const [label, fragment] of REQUIRED) {
  if (visibleText.includes(fragment)) ok(label)
  else { bad(`${label} — fragmento no encontrado en el HTML`); contentFailures++ }
}

// ── 2. ¿El artefacto filtra algo prohibido? ─────────────────────────────────
console.log('\nConfidencialidad del artefacto:')
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
let leaks = 0
for (const [label, list] of [['cliente', clients], ['identificador', identifiers]]) {
  list.items.forEach((value, index) => {
    const re = new RegExp(`\\b${escapeRe(value)}\\b`, 'i')
    if (re.test(blob)) {
      // Se identifica por índice: escribir el valor aquí sería la misma fuga.
      bad(`${label} #${index + 1} presente en el artefacto`)
      leaks++
    }
  })
}
if (!leaks && clients.items.length) {
  ok(`${clients.items.length + identifiers.items.length} valores prohibidos comprobados, 0 presentes`)
}

console.log('\n' + '─'.repeat(60))
if (contentFailures || leaks) {
  console.log(`FALLO — ${contentFailures} problema(s) de contenido, ${leaks} de confidencialidad`)
  process.exit(1)
}
console.log('ARTEFACTO VERIFICADO')
console.log('─'.repeat(60))
