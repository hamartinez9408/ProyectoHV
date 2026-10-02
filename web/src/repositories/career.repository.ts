// Acceso a datos de carrera.
//
// RESPONSABILIDAD ÚNICA (guía §5, capa `repositories/`): es el ÚNICO módulo que
// sabe de dónde vienen los datos y qué forma tienen. Cambia si cambia el origen
// (por ejemplo, cuando el nivel privado lea de Supabase en vez de un JSON) —
// y nada más cambia con él.
//
// El archivo es DERIVADO: lo genera el pipeline de carrera y lo sincroniza
// ../scripts/sync-content.mjs antes de cada dev/build. Aquí no se edita nada.
//
// Por qué hay un validador si TypeScript ya conoce la forma del JSON:
// `resolveJsonModule` infiere una forma AMPLIA (todo `string`, arrays de lo que
// haya). No puede saber que `startDate` es "YYYY-MM" ni que `metrics` no está
// vacío. El validador convierte esa forma amplia en el contrato real y falla en
// el build, no en el navegador del visitante.

import raw from '@/content/public.json'
import type {
  CareerContent,
  EducationItem,
  Experience,
  LanguageItem,
  Metric,
  SkillGroup,
} from '@/models/career'

class ContentContractError extends Error {
  constructor(detail: string) {
    super(
      `El contenido público no cumple el contrato: ${detail}. ` +
        'Regenera con `npm run build:content` en la raíz del repositorio.',
    )
    this.name = 'ContentContractError'
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const asString = (v: unknown, field: string): string => {
  if (typeof v !== 'string' || v.trim() === '') {
    throw new ContentContractError(`${field} ausente o vacío`)
  }
  return v
}

const asOptionalString = (v: unknown): string | null =>
  typeof v === 'string' && v !== '' ? v : null

const asStringArray = (v: unknown, field: string): string[] => {
  if (!Array.isArray(v)) throw new ContentContractError(`${field} no es una lista`)
  return v.map((item, i) => asString(item, `${field}[${i}]`))
}

const asMetrics = (v: unknown, field: string): Metric[] => {
  if (!Array.isArray(v)) throw new ContentContractError(`${field} no es una lista`)
  return v.map((item, i) => {
    if (!isRecord(item)) throw new ContentContractError(`${field}[${i}] no es un objeto`)
    return {
      achievement: asString(item.achievement, `${field}[${i}].achievement`),
      metric: asString(item.metric, `${field}[${i}].metric`),
      method: typeof item.method === 'string' ? item.method : '',
    }
  })
}

function toExperience(value: unknown, index: number): Experience {
  const at = `experiences[${index}]`
  if (!isRecord(value)) throw new ContentContractError(`${at} no es un objeto`)
  return {
    roleTitle: asString(value.roleTitle, `${at}.roleTitle`),
    companyPublicLabel: asString(value.companyPublicLabel, `${at}.companyPublicLabel`),
    industrySector: asString(value.industrySector, `${at}.industrySector`),
    city: asOptionalString(value.city),
    // Una fecha ausente NO se inventa: se deja nula y la interfaz la omite.
    startDate: asOptionalString(value.startDate),
    endDate: asOptionalString(value.endDate),
    isCurrent: value.isCurrent === true,
    summaryPublic: typeof value.summaryPublic === 'string' ? value.summaryPublic : '',
    achievements: asStringArray(value.achievements ?? [], `${at}.achievements`),
    metrics: asMetrics(value.metrics ?? [], `${at}.metrics`),
    technologies: asStringArray(value.technologies ?? [], `${at}.technologies`),
  }
}

function toEducation(value: unknown, index: number): EducationItem {
  if (!isRecord(value)) throw new ContentContractError(`education[${index}] no es un objeto`)
  return {
    degree: asString(value.degree, `education[${index}].degree`),
    institution: asString(value.institution, `education[${index}].institution`),
    date: asString(value.date, `education[${index}].date`),
  }
}

function toSkillGroup(value: unknown, index: number): SkillGroup {
  if (!isRecord(value)) throw new ContentContractError(`skillGroups[${index}] no es un objeto`)
  return {
    group: asString(value.group, `skillGroups[${index}].group`),
    items: asStringArray(value.items, `skillGroups[${index}].items`),
  }
}

function toLanguage(value: unknown, index: number): LanguageItem {
  if (!isRecord(value)) throw new ContentContractError(`languages[${index}] no es un objeto`)
  return {
    language: asString(value.language, `languages[${index}].language`),
    declaredInCv: asString(value.declaredInCv, `languages[${index}].declaredInCv`),
  }
}

function parse(value: unknown): CareerContent {
  if (!isRecord(value)) throw new ContentContractError('la raíz no es un objeto')

  const { experiences, skillGroups, profile } = value
  if (!Array.isArray(experiences) || experiences.length === 0) {
    throw new ContentContractError('experiences está vacío')
  }
  if (!Array.isArray(skillGroups)) throw new ContentContractError('skillGroups no es una lista')
  if (!isRecord(profile)) throw new ContentContractError('profile ausente')

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
    education: Array.isArray(value.education) ? value.education.map(toEducation) : [],
    skillGroups: skillGroups.map(toSkillGroup),
    languages: Array.isArray(value.languages) ? value.languages.map(toLanguage) : [],
  }
}

/** Contenido de carrera ya validado. Falla en el build si el contrato se rompe. */
export const careerContent: CareerContent = parse(raw)
