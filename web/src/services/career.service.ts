// Lógica de selección sobre el contenido de carrera.
//
// RESPONSABILIDAD ÚNICA (guía §5, capa `services/`): decidir QUÉ se muestra y
// en qué orden. No sabe de dónde vienen los datos ni cómo se formatean —
// recibe el contenido y devuelve una selección.

import type { CareerContent, Experience, Metric } from '@/models/career'

/** Logros cuantificados de toda la trayectoria, en el orden de las experiencias. */
export function featuredMetrics(content: CareerContent, limit: number): readonly Metric[] {
  return content.experiences.flatMap((experience) => experience.metrics).slice(0, limit)
}

/** La experiencia actual, si existe. */
export function currentExperience(content: CareerContent): Experience | null {
  return content.experiences.find((experience) => experience.isCurrent) ?? null
}

/** Agrupa las tecnologías de todas las experiencias, sin repetir y en orden de aparición. */
export function distinctTechnologies(content: CareerContent): readonly string[] {
  return [...new Set(content.experiences.flatMap((experience) => experience.technologies))]
}
