// hv-rules.mjs — Motor determinista de reglas de seguridad de ProyectoHV.
//
// FUENTE ÚNICA DE REGLAS. Consumido por:
//   · .zcode/hooks/pretool-safety-zcode.mjs                          (adaptador ZCode)
//   · .agents/scripts/pretool-safety.mjs                            (adaptador Antigravity)
//   · .agents/skills/hv-guardrails/scripts/run-guardrails.mjs       (suite de guardrails)
//   · .agents/skills/hv-career-pipeline/scripts/validate-career-data.mjs
//
// Este módulo es PURO respecto al transporte: no lee stdin, no escribe stdout,
// no decide el dialecto de salida. Solo responde "¿esto se permite?" y por qué.
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ REGLA DE ORO DE ESTE ARCHIVO: ningún dato prohibido se escribe aquí. │
// │ El repositorio es PÚBLICO. Un valor hardcodeado en el motor de       │
// │ reglas es exactamente la fuga que el motor existe para prevenir.     │
// │ Los valores viven en .agents/rules/private/ (gitignored) o en        │
// │ variables de entorno inyectadas desde secrets de CI.                 │
// └──────────────────────────────────────────────────────────────────────┘

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(HERE, '..', '..')

/** Directorio de listas privadas. GITIGNORED — nunca al repositorio. */
export const PRIVATE_DIR = join(PROJECT_ROOT, '.agents', 'rules', 'private')
const IDENTIFIERS_FILE = join(PRIVATE_DIR, 'prohibited-identifiers.txt')
const CLIENTS_FILE = join(PRIVATE_DIR, 'prohibited-clients.txt')

// ── Rutas de la infraestructura corporativa: prohibido tocarlas ─────────────
const CORPORATE_PATH = /C:[\\/]+Stefanini\b/i

// ── Rutas exentas de la comprobación de clientes ───────────────────────────
// El directorio de listas privadas es su hogar legítimo: debe poder escribirse.
const EXEMPT_FROM_CLIENT_CHECK = ['.agents/rules/private/']
const EXEMPT_FROM_IDENTIFIER_CHECK = ['.agents/rules/private/']

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Convierte texto crudo en patrones. Admite separación por salto de línea o coma
 * y descarta comentarios.
 * @param {string} raw
 * @param {string} labelPrefix  Etiqueta SIN el valor ofensor.
 */
function parseList(raw, labelPrefix) {
  if (!raw) return []
  return raw
    .split(/[\r\n,]+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((value, i) => ({
      re: new RegExp(`\\b${escapeRe(value)}\\b`, 'i'),
      // La etiqueta NO incluye el valor: repetirlo en un mensaje de error
      // sería la misma fuga. Se identifica por índice.
      label: `${labelPrefix} #${i + 1}`,
    }))
}

function readPrivate(envKey, filePath) {
  const fromEnv = process.env[envKey]
  if (fromEnv?.trim()) return fromEnv
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : ''
}

let _identifiers = null
let _clients = null

/**
 * Datos personales que NUNCA se publican, en ningún archivo ni contexto
 * (cédula, correo antiguo). Fuente: `HV_PROHIBITED_IDENTIFIERS` o el archivo
 * privado `prohibited-identifiers.txt`.
 */
export function loadNeverAllowed() {
  if (_identifiers === null) {
    _identifiers = parseList(
      readPrivate('HV_PROHIBITED_IDENTIFIERS', IDENTIFIERS_FILE),
      'dato personal',
    )
  }
  return _identifiers
}

/**
 * Nombres de clientes corporativos prohibidos. Fuente:
 * `HV_PROHIBITED_CLIENTS` o el archivo privado `prohibited-clients.txt`.
 */
export function loadProhibitedClients() {
  if (_clients === null) {
    _clients = parseList(
      readPrivate('HV_PROHIBITED_CLIENTS', CLIENTS_FILE),
      'cliente corporativo',
    )
  }
  return _clients
}

/** ¿Están disponibles las listas? Si no, los guardas deben avisarlo. */
export function hasPrivateLists() {
  return {
    identifiers: loadNeverAllowed().length > 0,
    clients: loadProhibitedClients().length > 0,
  }
}

/**
 * Escanea contenido contra TODAS las reglas de confidencialidad.
 * Úsalo desde los guardas en lugar de hardcodear la lista.
 * @param {string} content
 * @returns {Array<{label: string}>} coincidencias (vacío = limpio)
 */
export function scanForbidden(content) {
  const text = String(content || '')
  const found = []
  for (const { re, label } of [...loadNeverAllowed(), ...loadProhibitedClients()]) {
    if (re.test(text)) found.push({ label })
  }
  return found
}

/**
 * Evalúa una acción contra las reglas.
 *
 * @param {string} toolName  Forma canónica: 'Bash' | 'Write' | 'Edit'
 * @param {{filePath?: string, content?: string, command?: string}} target
 * @returns {{decision: 'allow'|'block', reason?: string}}
 */
export function evaluate(toolName, target = {}) {
  const filePath = String(target.filePath || '').replace(/\\/g, '/')
  const command = String(target.command || '')
  const content = String(target.content || '')
  const isWrite = toolName === 'Write' || toolName === 'Edit'

  // ── Regla 1: aislamiento de la infraestructura corporativa ───────────────
  if (toolName === 'Bash' && CORPORATE_PATH.test(command)) {
    return {
      decision: 'block',
      reason:
        'BLOQUEO REGLA #0: comando que referencia la ruta corporativa C:\\Stefanini\\.\n' +
        '  ProyectoHV es un proyecto personal. Ver AGENTS.md.\n' +
        `  Comando: ${command.slice(0, 200)}`,
    }
  }
  if (isWrite && CORPORATE_PATH.test(filePath)) {
    return {
      decision: 'block',
      reason:
        'BLOQUEO REGLA #0: escritura en una ruta de C:\\Stefanini\\.\n' +
        `  Ruta: ${filePath}`,
    }
  }

  // ── Regla 2: datos personales — nunca, en ningún archivo ────────────────
  if (isWrite && !EXEMPT_FROM_IDENTIFIER_CHECK.some((f) => filePath.includes(f))) {
    for (const { re, label } of loadNeverAllowed()) {
      if (re.test(content) || re.test(filePath)) {
        return {
          decision: 'block',
          reason:
            `BLOQUEO DE PRIVACIDAD: el contenido incluye un dato personal prohibido (${label}).\n` +
            '  Ver AGENTS.md, sección "Lista negra". No se publica en ningún nivel de acceso.\n' +
            '  El valor no se muestra: repetirlo sería la misma fuga.',
        }
      }
    }
  }

  // ── Regla 3: clientes corporativos en el repositorio público ────────────
  if (isWrite && !EXEMPT_FROM_CLIENT_CHECK.some((f) => filePath.includes(f))) {
    for (const { re, label } of loadProhibitedClients()) {
      if (re.test(content) || re.test(filePath)) {
        return {
          decision: 'block',
          reason:
            `BLOQUEO DE CONFIDENCIALIDAD: el contenido nombra un cliente corporativo (${label}).\n` +
            '  Este repositorio es PÚBLICO. Un nombre escrito aquí queda publicado.\n' +
            '  · Describe por sector: "industria manufacturera", "caja de compensación", "banco".\n' +
            '  · El nombre no se muestra: repetirlo sería la misma fuga.\n' +
            `  · Archivo: ${filePath}`,
        }
      }
    }
  }

  return { decision: 'allow' }
}
