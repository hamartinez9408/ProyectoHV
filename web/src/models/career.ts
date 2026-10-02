// Modelos de datos de carrera.
//
// RESPONSABILIDAD ÚNICA (guía §5): SOLO contratos de datos. Este archivo cambia
// cuando cambia el contrato — y por ninguna otra razón. No lee archivos, no
// valida y no formatea.

export interface Metric {
  readonly achievement: string
  readonly metric: string
  readonly method: string
}

export interface Experience {
  readonly roleTitle: string
  readonly companyPublicLabel: string
  readonly industrySector: string
  readonly city: string | null
  readonly startDate: string | null
  readonly endDate: string | null
  readonly isCurrent: boolean
  readonly summaryPublic: string
  readonly achievements: readonly string[]
  readonly metrics: readonly Metric[]
  readonly technologies: readonly string[]
}

export interface EducationItem {
  readonly degree: string
  readonly institution: string
  readonly date: string
}

export interface SkillGroup {
  readonly group: string
  readonly items: readonly string[]
}

export interface LanguageItem {
  readonly language: string
  readonly declaredInCv: string
}

export interface Profile {
  readonly fullName: string
  readonly headline: string
  readonly location: string
}

export interface CareerContent {
  readonly generatedAt: string
  readonly source: string
  readonly profile: Profile
  readonly summary: string
  readonly experiences: readonly Experience[]
  readonly education: readonly EducationItem[]
  readonly skillGroups: readonly SkillGroup[]
  readonly languages: readonly LanguageItem[]
}

/**
 * Estados mutuamente excluyentes de un componente que consume datos.
 *
 * Guía §4.2 — prohíbe el anti-patrón de booleanos concurrentes
 * (`isLoading`, `isError`, `isEmpty`), que admiten combinaciones imposibles
 * (¿`isLoading` y `isError` a la vez?). Una unión discriminada hace que el
 * compilador impida construir un estado corrupto.
 *
 * Guía §6 — todo componente que consuma datos DEBE renderizar los cuatro.
 */
export type DataState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'empty'; readonly message?: string }
  | { readonly status: 'data'; readonly data: T }
