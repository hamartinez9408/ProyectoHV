// Utilidades de presentación.
//
// RESPONSABILIDAD ÚNICA (guía §5): transformar datos en texto para mostrar.
// Cambia cuando cambia la forma de presentar, no cuando cambia el contrato ni
// el origen de los datos.

import type { Experience } from '@/models/career'

// Se evita `Intl.DateTimeFormat`: depende de la zona horaria del servidor y
// `2025-03` no representa un instante, sino un mes. Formatearlo con una API de
// fechas desplazaría el mes según el huso del entorno de build.
const MONTHS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const

/** `2025-03` → `mar 2025`. Devuelve null si la entrada no tiene la forma esperada. */
export function formatMonth(isoDate: string | null): string | null {
  if (!isoDate) return null
  const [year, month] = isoDate.split('-')
  if (!year || !month) return null
  const label = MONTHS_ES[Number(month) - 1]
  if (!label) return null
  return `${label} ${year}`
}

/** Rango legible de una experiencia. No inventa fechas ausentes. */
export function formatRange(experience: Experience): string {
  const start = formatMonth(experience.startDate) ?? 'Sin fecha'
  const end = experience.isCurrent
    ? 'actualidad'
    : (formatMonth(experience.endDate) ?? 'Sin fecha')
  return `${start} — ${end}`
}
