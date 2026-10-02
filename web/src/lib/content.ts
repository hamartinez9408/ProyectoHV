// Carga y tipado del contenido público.
//
// El archivo es DERIVADO: lo genera el pipeline de carrera
// (.agents/skills/hv-career-pipeline) y lo sincroniza scripts/sync-content.mjs
// antes de cada dev/build. Aquí no se edita nada.
//
// Por qué hay un validador si TypeScript ya conoce la forma del JSON:
// `resolveJsonModule` infiere una forma AMPLIA (todo `string`, arrays de lo que
// haya). No puede saber que `startDate` es `"YYYY-MM"` ni que `metrics` no está
// vacío. El validador convierte esa forma amplia en el contrato real y falla
// claro — en el build, no en el navegador del visitante.

import raw from '@/content/public.json'

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

export interface PublicContent {
  readonly generatedAt: string
  readonly source: string
  readonly profile: Profile
  readonly summary: string
  readonly experiences: readonly Experience[]
  readonly education: readonly EducationItem[]
  readonly skillGroups: readonly SkillGroup[]
  readonly languages: readonly LanguageItem[]
}

class ContentError extends Error {
  constructor(detail: string) {
    super(
      `El contenido público no cumple el contrato: ${detail}. ` +
        'Regenera con `npm run build:content` en la raíz del repositorio.',
    )
    this.name = 'ContentError'
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const asString = (v: unknown, field: string): string => {
  if (typeof v !== 'string' || v.trim() === '') throw new ContentError(`${field} ausente o vacío`)
  return v
}

const asStringArray = (v: unknown, field: string): string[] => {
  if (!Array.isArray(v)) throw new ContentError(`${field} no es una lista`)
  return v.map((item, i) => asString(item, `${field}[${i}]`))
}

const asMetrics = (v: unknown, field: string): Metric[] => {
  if (!Array.isArray(v)) throw new ContentError(`${field} no es una lista`)
  return v.map((item, i) => {
    if (!isRecord(item)) throw new ContentError(`${field}[${i}] no es un objeto`)
    return {
      achievement: asString(item.achievement, `${field}[${i}].achievement`),
      metric: asString(item.metric, `${field}[${i}].metric`),
      method: typeof item.method === 'string' ? item.method : '',
    }
  })
}

function toExperience(value: unknown, index: number): Experience {
  const at = `experiences[${index}]`
  if (!isRecord(value)) throw new ContentError(`${at} no es un objeto`)
  const city = value.city
  const startDate = value.startDate
  const endDate = value.endDate
  return {
    roleTitle: asString(value.roleTitle, `${at}.roleTitle`),
    companyPublicLabel: asString(value.companyPublicLabel, `${at}.companyPublicLabel`),
    industrySector: asString(value.industrySector, `${at}.industrySector`),
    city: typeof city === 'string' && city !== '' ? city : null,
    // Una fecha ausente NO se inventa: se deja nula y la interfaz la omite.
    startDate: typeof startDate === 'string' && startDate !== '' ? startDate : null,
    endDate: typeof endDate === 'string' && endDate !== '' ? endDate : null,
    isCurrent: value.isCurrent === true,
    summaryPublic: typeof value.summaryPublic === 'string' ? value.summaryPublic : '',
    achievements: asStringArray(value.achievements ?? [], `${at}.achievements`),
    metrics: asMetrics(value.metrics ?? [], `${at}.metrics`),
    technologies: asStringArray(value.technologies ?? [], `${at}.technologies`),
  }
}

function parse(value: unknown): PublicContent {
  if (!isRecord(value)) throw new ContentError('la raíz no es un objeto')

  const experiences = value.experiences
  if (!Array.isArray(experiences) || experiences.length === 0) {
    throw new ContentError('experiences está vacío')
  }
  const skillGroups = value.skillGroups
  if (!Array.isArray(skillGroups)) throw new ContentError('skillGroups no es una lista')

  const profile = value.profile
  if (!isRecord(profile)) throw new ContentError('profile ausente')

  return {
    generatedAt: typeof value.generatedAt === 'string' ? value.generatedAt : '',
    source: typeof value.source === 'string' ? value.source : '',
    profile: {
      fullName: asString(profile.fullName, 'profile.fullName'),
      headline: asString(profile.headline, 'profile.headline'),
      location: asString(profile.location, 'profile.location'),
    },
    summary: typeof value.summary === 'string' ? value.summary : '',
    experiences: experiences.map(toExperience),
    education: Array.isArray(value.education)
      ? value.education.map((e, i) => {
          if (!isRecord(e)) throw new ContentError(`education[${i}] no es un objeto`)
          return {
            degree: asString(e.degree, `education[${i}].degree`),
            institution: asString(e.institution, `education[${i}].institution`),
            date: asString(e.date, `education[${i}].date`),
          }
        })
      : [],
    skillGroups: skillGroups.map((g, i) => {
      if (!isRecord(g)) throw new ContentError(`skillGroups[${i}] no es un objeto`)
      return {
        group: asString(g.group, `skillGroups[${i}].group`),
        items: asStringArray(g.items, `skillGroups[${i}].items`),
      }
    }),
    languages: Array.isArray(value.languages)
      ? value.languages.map((l, i) => {
          if (!isRecord(l)) throw new ContentError(`languages[${i}] no es un objeto`)
          return {
            language: asString(l.language, `languages[${i}].language`),
            declaredInCv: asString(l.declaredInCv, `languages[${i}].declaredInCv`),
          }
        })
      : [],
  }
}

export const content: PublicContent = parse(raw)

/** `2025-03` → `mar 2025`. Sin depender de la zona horaria del servidor. */
const MONTHS_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const

export function formatMonth(isoDate: string | null): string | null {
  if (!isoDate) return null
  const [year, month] = isoDate.split('-')
  if (!year || !month) return null
  const index = Number(month) - 1
  const label = MONTHS_ES[index]
  if (!label) return null
  return `${label} ${year}`
}

export function formatRange(experience: Experience): string {
  const start = formatMonth(experience.startDate) ?? 'Sin fecha'
  const end = experience.isCurrent ? 'actualidad' : (formatMonth(experience.endDate) ?? 'Sin fecha')
  return `${start} — ${end}`
}

/** Los logros cuantificados de toda la trayectoria, más recientes primero. */
export function featuredMetrics(limit: number): readonly Metric[] {
  return content.experiences.flatMap((e) => e.metrics).slice(0, limit)
}
