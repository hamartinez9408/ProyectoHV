#!/usr/bin/env node
// pretool-safety.mjs — Adaptador PreToolUse para Antigravity.
//
// Traduce el contrato de Antigravity al motor compartido de reglas:
//   entrada : payload.toolCall.{name, args}
//   bloqueo : {"decision":"deny","reason":"..."} por stdout
//
// El motor de reglas vive en hv-rules.mjs — una sola fuente de verdad
// compartida con el adaptador de ZCode (.zcode/hooks/pretool-safety-zcode.mjs).
//
// NO hardcodear aquí la lista de clientes: el repositorio es público y una
// lista embebida en él ES la filtración que la lista pretende evitar.
// La lista vive en .agents/rules/private/ (gitignored).

import { readFileSync } from 'node:fs';
import { evaluate } from './hv-rules.mjs';

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return null;
  }
}

/** Traduce el nombre de herramienta de Antigravity a la forma canónica. */
function canonical(toolName) {
  switch (toolName) {
    case 'run_command':
      return 'Bash';
    case 'write_to_file':
      return 'Write';
    case 'replace_file_content':
      return 'Edit';
    default:
      return null;
  }
}

const allow = () => {
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
};

const payload = readStdin();
if (!payload || !payload.toolCall) allow();

const { name, args = {} } = payload.toolCall;
const toolName = canonical(name);
if (!toolName) allow(); // herramienta no cubierta

const verdict = evaluate(toolName, {
  filePath: args.TargetFile,
  content: args.CodeContent ?? args.ReplacementContent ?? '',
  command: args.CommandLine,
});

if (verdict.decision === 'block') {
  console.log(JSON.stringify({ decision: 'deny', reason: verdict.reason }));
  process.exit(0);
}

allow();
