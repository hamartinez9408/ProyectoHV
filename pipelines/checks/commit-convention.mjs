#!/usr/bin/env node
// commit-convention.mjs — Capa 4: valida Conventional Commits.
//
// Por qué bloquea y no avisa: la convención no es estética. De ella dependen
// el changelog automático y el versionado semántico. Un historial que no la
// cumple rompe la generación de releases en silencio, y se descubre meses
// después, cuando ya hay que reescribir el historial.
//
// Uso:
//   node pipelines/checks/commit-convention.mjs                 # último commit
//   node pipelines/checks/commit-convention.mjs HEAD~5..HEAD     # rango
//   node pipelines/checks/commit-convention.mjs origin/main..HEAD # commits del PR

import { execSync } from 'node:child_process'

const TIPOS = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf',
               'test', 'build', 'ci', 'chore', 'revert']
const PATRON = new RegExp(`^(${TIPOS.join('|')})(\\([a-z0-9._/-]+\\))?!?: .{3,}`, 'u')

const rango = process.argv[2] || 'HEAD~1..HEAD'

let subjects
try {
  subjects = execSync(`git log --format=%s ${rango}`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).split('\n').map((s) => s.trim()).filter(Boolean)
} catch (e) {
  console.error(`[commit-convention] No se pudo leer el rango "${rango}": ${e.message}`)
  console.error('  Si es el commit inicial, el rango no existe todavía.')
  process.exit(0) // no bloquear por un rango inexistente
}

// Los merges los genera git, no la persona: no se evalúan.
const aEvaluar = subjects.filter((s) => !/^Merge\b/.test(s))

if (aEvaluar.length === 0) {
  console.log('[commit-convention] Sin commits que evaluar en el rango (solo merges o vacío).')
  process.exit(0)
}

const malos = aEvaluar.filter((s) => !PATRON.test(s))

console.log(`[commit-convention] Evaluando ${aEvaluar.length} commit(s) en "${rango}"`)

if (malos.length > 0) {
  console.error('')
  console.error('⛔ Commits que no cumplen Conventional Commits:')
  for (const s of malos) console.error(`   · ${s}`)
  console.error('')
  console.error('   Formato:  <tipo>(<alcance>): <descripción>')
  console.error(`   Tipos:    ${TIPOS.join(' | ')}`)
  console.error('   Ejemplos: feat(access): emite magic link con TTL de 48 h')
  console.error('             fix(guardrails): evita verde vacío en árbol limpio')
  console.error('')
  console.error('   Para corregir el último commit sin tocar el árbol:')
  console.error('     git commit --amend')
  process.exit(1)
}

console.log(`✅ ${aEvaluar.length} commit(s) cumplen la convención.`)
process.exit(0)
