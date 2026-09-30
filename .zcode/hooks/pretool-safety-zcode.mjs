#!/usr/bin/env node
// pretool-safety-zcode.mjs — Adaptador PreToolUse para ZCode.
//
// Traduce el contrato de ZCode al motor compartido de reglas:
//   entrada : una línea JSON por stdin  →  { tool_name, tool_input }
//   bloqueo : exit 2 + motivo por stderr (ZCode deniega la llamada)
//   aviso   : exit 0 + JSON en stdout con hookSpecificOutput
//
// El motor de reglas vive en .agents/scripts/hv-rules.mjs — una sola fuente
// de verdad compartida con el adaptador de Antigravity.
//
// Fallo seguro: ante cualquier error inesperado, NO bloquea.

import { evaluate } from '../../.agents/scripts/hv-rules.mjs'

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => { data += chunk })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}

/** Normaliza los nombres de herramienta de ZCode a la forma canónica. */
function canonicalTool(name) {
  switch (name) {
    case 'Bash':
      return 'Bash'
    case 'Write':
      return 'Write'
    case 'Edit':
      return 'Edit'
    default:
      return null // herramienta no cubierta → no evaluamos
  }
}

async function main() {
  const raw = await readStdin()
  if (!raw.trim()) process.exit(0) // sin payload → no bloquear

  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    process.exit(0) // payload malformado → no bloquear nunca por parseo
  }

  const toolName = canonicalTool(payload.tool_name || payload.toolName)
  if (!toolName) process.exit(0)

  const input = payload.tool_input || payload.toolInput || {}

  const verdict = evaluate(toolName, {
    filePath: input.file_path || input.filePath,
    // Write trae el archivo completo; Edit solo el reemplazo.
    // En Edit auditamos el reemplazo: detecta violaciones que se están introduciendo.
    content: input.content ?? input.new_string ?? '',
    command: input.command,
  })

  if (verdict.decision === 'block') {
    process.stderr.write(
      '\n╔════════════════════════════════════════════════════════════════╗\n' +
      '║  ⛔ ProyectoHV — SAFETY GATE: escritura/ejecución bloqueada    ║\n' +
      '╚════════════════════════════════════════════════════════════════╝\n' +
      `  ${verdict.reason}\n\n`,
    )
    process.exit(2) // 2 = bloqueo (deniega la llamada)
  }

  process.exit(0)
}

main().catch((err) => {
  // Nunca romper la sesión: ante un error inesperado, dejar pasar.
  process.stderr.write(`[hv-safety-gate] error interno (fail open): ${err.message}\n`)
  process.exit(0)
})
