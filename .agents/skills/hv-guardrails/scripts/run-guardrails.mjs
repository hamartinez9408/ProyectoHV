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

function getChangedFiles() {
  try {
    const out = execSync('git status --porcelain -uall', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => line.trim().split(/\s+/).pop())
      .filter((f) => f && existsSync(f) && statSync(f).isFile())
  } catch {
    return [] // no es un repo git todavía
  }
}

const files = process.argv.slice(2).length > 0 ? process.argv.slice(2) : getChangedFiles()

console.log(`[HV-GUARDRAILS] Analizando ${files.length} archivo(s)...`)

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
