#!/usr/bin/env node
// sync-content.mjs — Copia el contenido público generado al árbol de web/.
//
// POR QUÉ EXISTE
// La fuente es `../content/public.json`, producida por el pipeline de carrera.
// Pero el build de Next.js corre con `web/` como raíz (y en Netlify el
// directorio base es `web/`), así que no puede leer fuera de su propia raíz.
// Se copia antes de cada dev/build.
//
// FALLA CERRADO: si la fuente no existe o no es JSON válido, esto termina con
// código 1 y el build no arranca. Es deliberado — un sitio construido con
// contenido ausente o viejo se ve bien y miente.

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = resolve(HERE, '..')
const SOURCE = resolve(WEB_ROOT, '..', 'content', 'public.json')
const TARGET = join(WEB_ROOT, 'src', 'content', 'public.json')

if (!existsSync(SOURCE)) {
  console.error('\n⛔ No existe el contenido público: ' + SOURCE)
  console.error('   Genéralo primero:')
  console.error('     node .agents/skills/hv-career-pipeline/scripts/build-career-data.mjs')
  console.error('   El build se detiene en vez de publicar un sitio sin datos.\n')
  process.exit(1)
}

let parsed
try {
  parsed = JSON.parse(readFileSync(SOURCE, 'utf8'))
} catch (e) {
  console.error(`\n⛔ El contenido público no es JSON válido: ${e.message}\n`)
  process.exit(1)
}

// Comprobación mínima de forma: un archivo vacío o truncado pasaría el
// JSON.parse y produciría un sitio en blanco sin que nadie se entere.
const faltantes = ['profile', 'experiences', 'skillGroups'].filter((k) => !(k in parsed))
if (faltantes.length) {
  console.error(`\n⛔ El contenido público no tiene los campos esperados: ${faltantes.join(', ')}`)
  console.error('   ¿Se regeneró con una versión distinta del pipeline?\n')
  process.exit(1)
}

mkdirSync(dirname(TARGET), { recursive: true })
writeFileSync(TARGET, JSON.stringify(parsed, null, 2) + '\n', 'utf8')

const kb = (statSync(TARGET).size / 1024).toFixed(1)
console.log(`   contenido sincronizado: ${parsed.experiences.length} experiencias · ${kb} KB`)
