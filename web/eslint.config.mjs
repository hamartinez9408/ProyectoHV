// ESLint 9 — configuración plana (flat config).
//
// `eslint-config-next` 15.5 todavía publica formato legacy (index.js,
// core-web-vitals.js), así que se envuelve con FlatCompat. Cuando publique
// configuración plana nativa, este archivo se simplifica.
//
// La guía §2 nombra este linter como gate de CI y §11 lo exige antes de
// consolidar cualquier cambio en web/.

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
})

const config = [
  {
    // `src/content/` es contenido generado por el pipeline de carrera: no es
    // código y no se edita a mano.
    ignores: ['.next/**', 'src/content/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // La guía §4.1 y la matriz §10 prohíben `any` de forma explícita.
      // En `next/typescript` viene como advertencia; aquí es error.
      '@typescript-eslint/no-explicit-any': 'error',
      // Un parámetro sin usar se permite si empieza por `_` (descartado a
      // propósito), nunca por descuido.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `console` solo se permite en scripts de build, no en la app.
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Los scripts de herramientas sí escriben en consola: su salida ES el
    // producto. Se exceptúan aquí en vez de silenciar la regla global.
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
]

export default config

