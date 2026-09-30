#!/usr/bin/env node
// validate-career-data.mjs — Validador de confidencialidad para datos de carrera.
//
// Verifica que un artefacto publicado (por defecto content/public.json) no
// contenga datos de la lista negra ni nombres de clientes corporativos.
//
// IMPORTANTE: los nombres de clientes NO están en este archivo.
// Una lista hardcodeada en un repositorio público ES la filtración que la
// lista pretende evitar. Se leen en tiempo de ejecución desde:
//   1. La variable de entorno HV_PROHIBITED_CLIENTS (vía para CI)
//   2. .agents/rules/private/prohibited-clients.txt (local, gitignored)

import { readFileSync, existsSync } from 'node:fs'
import { scanForbidden, hasPrivateLists } from '../../../scripts/hv-rules.mjs'

// Política de publicación de contenido — conceptos, no valores.
// Los VALORES prohibidos (cédula, año de nacimiento, correo antiguo) vienen
// de la lista privada vía scanForbidden() y no se escriben aquí: el repo es
// público, y escribirlos sería la misma fuga que el validador persigue.
const CONTENT_POLICY = [
  { id: 'BACHILLERATO', regex: /bachiller/i, desc: 'educación secundaria' },
  { id: 'INTERNAL_PRODUCT', regex: /sophiex-(?:ragflow|itsm|zabbix|ollama)/i, desc: 'internals del producto' },
]

const targetPath = process.argv[2] || 'content/public.json'

if (!existsSync(targetPath)) {
  console.error(`[ERROR] Archivo no encontrado: ${targetPath}`)
  process.exit(1)
}

const content = readFileSync(targetPath, 'utf8')
const violations = []

// Confidencialidad: lista negra + clientes (motor compartido)
for (const hit of scanForbidden(content)) {
  violations.push(`🔴 [${hit.label}] dato prohibido detectado`)
}

// Política de publicación
for (const p of CONTENT_POLICY) {
  if (p.regex.test(content)) {
    violations.push(`🔴 [${p.id}] detectado -> ${p.desc}`)
  }
}

if (violations.length > 0) {
  console.error('====================================================')
  console.error('⛔ FALLO DE PRIVACIDAD / CONFIDENCIALIDAD EN DATOS')
  console.error('====================================================')
  violations.forEach((v) => console.error(v))
  console.error('\nEl archivo contiene datos de la lista negra o nombres de clientes.')
  console.error('Los nombres ofensores no se muestran: repetirlos sería la misma fuga.')
  process.exit(1)
}

if (!hasPrivateLists().clients) {
  console.warn('⚠️  [ADVERTENCIA] No hay lista de clientes disponible.')
  console.warn('   Se verificó la lista negra, pero NO la confidencialidad de clientes.')
  console.warn('   Local: crea .agents/rules/private/prohibited-clients.txt')
  console.warn('   CI:    define el secret HV_PROHIBITED_CLIENTS')
  process.exit(0)
}

console.log(`✅ [OK] ${targetPath} cumple las reglas de confidencialidad y lista negra.`)
process.exit(0)
