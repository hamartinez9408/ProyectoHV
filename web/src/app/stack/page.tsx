import type { Metadata } from 'next'
import { DataStateView, dataOrEmpty } from '@/components/data-state'
import { Section } from '@/components/section'
import { careerContent } from '@/repositories/career.repository'

export const metadata: Metadata = {
  title: 'Stack',
  description: 'Tecnologías agrupadas por área, formación académica e idiomas.',
}

export default function StackPage() {
  const { skillGroups, education, languages } = careerContent

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Stack</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
        Tecnologías agrupadas por área de trabajo. Se declara el uso real, no un nivel inflado.
      </p>

      <Section id="tecnologias" title="Tecnologías">
        <DataStateView
          state={dataOrEmpty(skillGroups)}
          emptyMessage="Aún no hay tecnologías publicadas."
          loadingLabel="Cargando tecnologías…"
        >
          {(groups) => (
            <div className="space-y-8">
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

      <Section id="formacion" title="Formación">
        <DataStateView state={dataOrEmpty(education)} emptyMessage="Aún no hay formación publicada.">
          {(items) => (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.degree}>
                  <p className="font-medium">{item.degree}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {item.institution} · {item.date}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DataStateView>
      </Section>

      <Section id="idiomas" title="Idiomas">
        <DataStateView state={dataOrEmpty(languages)} emptyMessage="Aún no hay idiomas publicados.">
          {(items) => (
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              {items.map((item) => (
                <li key={item.language}>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {item.language}
                  </span>{' '}
                  — {item.declaredInCv}
                </li>
              ))}
            </ul>
          )}
        </DataStateView>
      </Section>
    </>
  )
}
