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

// ── Fronteras de palabra que SÍ funcionan con acentos ───────────────────────
// `\b` de JavaScript se apoya en `\w`, que es [A-Za-z0-9_]. Un carácter
// acentuado NO es de palabra, así que si el valor TERMINA en vocal acentuada
// o en "ñ" —lo habitual en nombres propios en español— el patrón `\b<valor>\b`
// NUNCA casa: no existe frontera de palabra tras esa letra.
//
// Consecuencia real, detectada el 2026-10-02: un nombre de cliente terminado en
// vocal acentuada viajó íntegro a content/public.json —el anonimizador usaba
// `\b` y tampoco lo sustituyó— y ningún guarda lo detectó. El motor era ciego
// justo a los valores con acentos, que en español son la mayoría.
//
// Nota sobre este mismo comentario: la versión anterior de este archivo
// ESCRIBÍA el nombre del cliente como ejemplo. Ningún guarda lo marcaba,
// porque dentro de la notación `\b<valor>\b` el valor queda pegado a una letra
// de palabra y la frontera no aplica. Es decir: el archivo que existe para
// impedir que un nombre se publique lo tenía escrito. Por eso el ejemplo de
// arriba describe el caso en vez de nombrarlo.
const BORDE_IZQ = '(?<![\\p{L}\\p{N}_])'
const BORDE_DER = '(?![\\p{L}\\p{N}_])'

// ── Tolerancia a tildes ─────────────────────────────────────────────────────
// Segundo defecto de la misma fuga: el mapa de anonimización escribía un alias
// SIN tilde y el perfil lo tenía CON tilde. Aunque las fronteras hubieran sido
// correctas, el alias no habría casado nunca.
//
// Por eso la comparación es insensible a diacríticos en AMBAS direcciones:
// cada letra del valor casa con sus variantes acentuadas, y cada letra
// acentuada casa con su forma base. Un typo de tilde —en el mapa o en el
// perfil— deja de ser una vía de fuga.
const GRUPO_DIACRITICO = {
  a: 'aáàäâã', e: 'eéèëê', i: 'iíìïî', o: 'oóòöôõ', u: 'uúùüû', n: 'nñ', c: 'cç',
  A: 'AÁÀÄÂÃ', E: 'EÉÈËÊ', I: 'IÍÌÏÎ', O: 'OÓÒÖÔÕ', U: 'UÚÙÜÛ', N: 'NÑ', C: 'CÇ',
}

/** Forma base de cada letra acentuada (el inverso del mapa de grupos). */
const BASE_DIACRITICA = (() => {
  const m = {}
  for (const [base, grupo] of Object.entries(GRUPO_DIACRITICO)) {
    for (const ch of grupo) if (ch !== base) m[ch] = base
  }
  return m
})()

/** Clase de caracteres que casa una letra con todas sus variantes acentuadas.
 *  El sesgo es deliberado: marcar de MÁS es seguro (bloquea de más); marcar de
 *  menos es la fuga. Un guarda de confidencialidad debe fallar hacia bloquear. */
function claseDiacritica(ch) {
  const base = BASE_DIACRITICA[ch] || ch
  const grupo = GRUPO_DIACRITICO[base]
  return grupo ? `[${grupo}]` : escapeRe(ch)
}

/** Cuerpo del patrón: cada letra del valor con sus variantes acentuadas, SIN
 *  fronteras de palabra.
 *
 *  Existe para el depurador de historial (`tools/hv-scrub-tree.mjs`), que
 *  necesita MÁXIMA recall: antes de publicar, un valor es fuga aunque aparezca
 *  pegado a letras —por ejemplo escrito dentro de la notación `\bValor\b` en
 *  un comentario—. Con fronteras ese caso se escapaba, y de hecho se escapó.
 *
 *  Para DETECTAR en el árbol de trabajo se usa `prohibitedPattern` (con
 *  fronteras): ahí sobrerrepresentar es solo ruido. Para DEPURAR historial se
 *  usa esto: ahí subrepresentar es publicar un nombre. Ambos comparten la
 *  misma tabla de diacríticos, que es lo único que no debe duplicarse. */
export function diacriticSource(value) {
  return [...String(value)].map(claseDiacritica).join('')
}

/** Patrón de coincidencia de un valor prohibido, con fronteras correctas y
 *  tolerancia a tildes.
 *  @param flags por defecto 'iu'. El anonimizador del pipeline pide 'giu' para
 *  sustituir TODAS las apariciones — y así ambos usan la MISMA definición de
 *  frontera. Que divergieran fue la causa de la fuga del 2026-10-02. */
export function prohibitedPattern(value, flags = 'iu') {
  return new RegExp(`${BORDE_IZQ}${diacriticSource(value)}${BORDE_DER}`, flags)
}

/**
 * Convierte texto crudo en patrones. Admite separación por salto de línea o coma
 * y descarta comentarios.
 *
 * El orden importa: los comentarios se descartan ANTES de trocear por comas.
 * Trocear primero deja un fragmento sin `#` que sobrevive al filtro y entra a
 * la lista negra como valor prohibido. Ocurrió de verdad (2026-10-02): un
 * comentario del encabezado que contenía una coma producía un cliente #10
 * inexistente de 28 caracteres, que ensuciaba el cotejo de cobertura y podía
 * haber bloqueado un build legítimo por un falso positivo.
 *
 * @param {string} raw
 * @param {string} labelPrefix  Etiqueta SIN el valor ofensor.
 */
function parseList(raw, labelPrefix) {
  if (!raw) return []
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    // Varios valores por línea, separados por coma.
    .flatMap((line) => line.split(',').map((s) => s.trim()).filter(Boolean))
    .map((value, i) => ({
      re: prohibitedPattern(value),
      // ⚠️ `value` existe SOLO para cotejos internos (p. ej. ¿está cubierto por
      // el mapa de anonimización?). NUNCA imprimirlo: repetirlo en un mensaje
      // de error sería la misma fuga. Para logs y mensajes, usar `label`.
      value,
      // La etiqueta NO incluye el valor: se identifica por índice.
      label: `${labelPrefix} #${i + 1}`,
    }))
}

/**
 * Clientes prohibidos que NO tienen regla en el mapa de anonimización.
 *
 * Un cliente en la lista negra y ausente del mapa es una fuga en potencia:
 * el anonimizador no lo sustituye, así que viaja íntegro a la salida pública.
 * Así se escapó un nombre el 2026-10-02.
 *
 * El cotejo es insensible a tildes y mayúsculas, en ambos sentidos.
 *
 * @param {{alias: string}[]} sectorEntries  Entradas del mapa de anonimización.
 * @returns {string[]} Etiquetas (`cliente corporativo #N`) sin regla, sin el valor.
 */
export function unmappedClients(sectorEntries) {
  if (!Array.isArray(sectorEntries) || !sectorEntries.length) {
    return loadProhibitedClients().map((c) => c.label)
  }
  const normalizar = (s) =>
    String(s ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  const cubiertos = new Set(sectorEntries.map((e) => normalizar(e.alias)))
  return loadProhibitedClients()
    .filter((c) => !cubiertos.has(normalizar(c.value)))
    .map((c) => c.label)
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
