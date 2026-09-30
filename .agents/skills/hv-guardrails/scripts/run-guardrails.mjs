#!/usr/bin/env node
// run-guardrails.mjs — Suite determinista de guardrails para ProyectoHV.
//
// Verifica, sin consumir tokens del modelo:
//   1. Confidencialidad — lista negra + nombres de clientes corporativos
//   2. TypeScript estricto — prohibido `any`, aviso por `console.log`
//   3. Migraciones SQL — RLS obligatorio
//
// Los nombres de clientes NO viven aquí: se leen del motor compartido
// (.agents/scripts/hv-rules.mjs → lista privada gitignored o env var HV_PROHIBITED_CLIENTS).

import { execSync } from 'node:child_process'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { scanForbidden, hasPrivateLists } from '../../../scripts/hv-rules.mjs'

const SKIP = ['.git/', 'node_modules/', '.zcode/hooks/']

function gitLines(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
      .split('\n').filter(Boolean)
  } catch {
    return [] // no es un repo git todavía
  }
}

/** Archivos modificados y sin commitear (vía rápida, pre-commit). */
function getChangedFiles() {
  return gitLines('git status --porcelain -uall')
    .map((line) => line.trim().split(/\s+/).pop())
    .filter((f) => f && existsSync(f) && statSync(f).isFile())
}

/** Todos los archivos versionados (auditoría completa). */
function getTrackedFiles() {
  return gitLines('git ls-files').filter((f) => existsSync(f) && statSync(f).isFile())
}

const args = process.argv.slice(2)
const runAll = args.includes('--all')
const explicit = args.filter((a) => !a.startsWith('--'))

// ⚠️ En un árbol limpio `git status` no devuelve nada. Interpretarlo como
// "0 archivos a revisar" imprimiría "todo pasó" sin haber mirado NADA: un
// verde vacío, peor que no tener gate. Sin cambios pendientes → árbol completo.
let files
let alcance
if (explicit.length) {
  files = explicit
  alcance = 'archivos indicados en la línea de comandos'
} else if (runAll) {
  files = getTrackedFiles()
  alcance = 'todos los archivos versionados (--all)'
} else {
  files = getChangedFiles()
  if (files.length === 0) {
    files = getTrackedFiles()
    alcance = 'sin cambios pendientes → auditoría completa del árbol'
    console.log('[HV-GUARDRAILS] Árbol limpio: no hay cambios que auditar.')
  } else {
    alcance = 'archivos modificados sin commitear'
  }
}

console.log(`[HV-GUARDRAILS] Analizando ${files.length} archivo(s) — ${alcance}`)

if (files.length === 0) {
  console.error('\n⛔ No hay archivos que auditar. Esto NO es un aprobado:')
  console.error('   o el repositorio no tiene archivos versionados, o git no está disponible.')
  console.error('   Un gate que aprueba sin revisar nada es peor que no tener gate.')
  process.exit(1)
}

let hasErrors = false

for (const f of files) {
  if (SKIP.some((s) => f.includes(s))) continue
  if (/\.(png|jpe?g|gif|webp|pdf|ico)$/i.test(f)) continue

  const content = readFileSync(f, 'utf8')

  // ── 1. Confidencialidad ──────────────────────────────────────────────────
  // El propio motor de reglas contiene los patrones literales por diseño;
  // auditarlo produciría un falso positivo.
  const isEngine = f.includes('hv-rules.mjs')
  if (!isEngine) {
    const hits = scanForbidden(content)
    if (hits.length > 0) {
      console.error(`🔴 [ERROR CONFIDENCIALIDAD] ${f}: ${hits.map((h) => h.label).join(', ')}`)
      hasErrors = true
    }
  }

  // ── 2. TypeScript estricto ───────────────────────────────────────────────
  if (/\.tsx?$/.test(f)) {
    content.split('\n').forEach((line, idx) => {
      if (/:\s*any\b/.test(line) && !line.includes('// @allow-any')) {
        console.error(`🔴 [ERROR TS] ${f}:${idx + 1}: tipo 'any' prohibido. Usa 'unknown' o genéricos.`)
        hasErrors = true
      }
      if (/console\.log\(/.test(line) && !line.includes('// allow-console')) {
        console.warn(`🟡 [WARN LOG] ${f}:${idx + 1}: 'console.log' en código de producción.`)
      }
    })
  }

  // ── 3. RLS obligatorio en migraciones ────────────────────────────────────
  if (f.startsWith('supabase/migrations/') && f.endsWith('.sql')) {
    if (!content.toLowerCase().includes('enable row level security')) {
      console.error(`🔴 [ERROR RLS] ${f}: migración sin 'ENABLE ROW LEVEL SECURITY'.`)
      hasErrors = true
    }
  }
}

if (!hasPrivateLists().clients) {
  console.warn('\n⚠️  [ADVERTENCIA] Sin lista de clientes: la confidencialidad de clientes NO se verificó.')
  console.warn('   Local: .agents/rules/private/prohibited-clients.txt')
  console.warn('   CI:    secret HV_PROHIBITED_CLIENTS')
}

if (hasErrors) {
  console.error('\n⛔ Guardrails fallaron. Corrige los errores antes de continuar.')
  process.exit(1)
}

console.log('\n✅ Todos los guardrails pasaron satisfactoriamente.')
process.exit(0)
