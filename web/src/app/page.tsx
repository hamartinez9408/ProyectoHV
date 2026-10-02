import { DataStateView, dataOrEmpty } from '@/components/data-state'
import { Emphasized } from '@/components/emphasized'
import { ExperienceEntry } from '@/components/experience-entry'
import { MetricList } from '@/components/metric-card'
import { Section } from '@/components/section'
import { LIMIT } from '@/config/site'
import { careerContent } from '@/repositories/career.repository'
import { featuredMetrics } from '@/services/career.service'
import { formatMonth } from '@/utils/format'

export default function HomePage() {
  const metrics = featuredMetrics(careerContent, LIMIT.FEATURED_METRICS)
  const { profile, summary, experiences, skillGroups, education, generatedAt } = careerContent

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{profile.fullName}</h1>
        <p className="mt-3 text-lg text-accent-700 dark:text-accent-500">{profile.headline}</p>
        <p className="mt-1 text-sm text-slate-500">{profile.location}</p>
        {summary ? (
          <p className="mt-6 max-w-2xl leading-relaxed text-slate-700 dark:text-slate-300">
            <Emphasized text={summary} />
          </p>
        ) : null}
      </div>

      <Section
        id="metricas"
        title="Resultados medidos"
        description="Logros cuantificados de la trayectoria. Cada cifra proviene del registro de carrera, no de una estimación."
      >
        <DataStateView
          state={dataOrEmpty(metrics)}
          emptyMessage="Aún no hay logros cuantificados publicados."
          loadingLabel="Cargando resultados medidos…"
        >
          {(items) => <MetricList metrics={items} />}
        </DataStateView>
      </Section>

      <Section
        id="trayectoria"
        title="Trayectoria"
        description="Experiencia profesional anonimizada por sector."
      >
        <DataStateView
          state={dataOrEmpty(experiences)}
          emptyMessage="Aún no hay trayectoria publicada."
          loadingLabel="Cargando trayectoria…"
        >
          {(items) => (
            <ol className="space-y-8">
              {items.map((experience) => (
                <ExperienceEntry
                  key={`${experience.roleTitle}-${experience.startDate}`}
                  experience={experience}
                />
              ))}
            </ol>
          )}
        </DataStateView>
      </Section>

      <Section
        id="stack"
        title="Stack"
        description="Tecnologías agrupadas por área de trabajo."
      >
        <DataStateView
          state={dataOrEmpty(skillGroups.slice(0, LIMIT.SKILL_GROUPS))}
          emptyMessage="Aún no hay stack publicado."
          loadingLabel="Cargando stack…"
        >
          {(groups) => (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.group}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {group.group}
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </DataStateView>
      </Section>

      {education.length > 0 ? (
        <Section id="formacion" title="Formación">
          <ul className="space-y-3">
            {education.map((item) => (
              <li key={item.degree}>
                <p className="font-medium">{item.degree}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {item.institution} · {item.date}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {generatedAt ? (
        <p className="mt-16 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800">
          Contenido generado desde el registro de carrera ·{' '}
          {formatMonth(generatedAt.slice(0, 7)) ?? generatedAt}
        </p>
      ) : null}
    </>
  )
}
