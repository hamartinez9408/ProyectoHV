import type { Metadata } from 'next'
import { Section } from '@/components/section'
import { content } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Stack',
  description: 'Tecnologías agrupadas por área, formación académica e idiomas.',
}

export default function StackPage() {
  const { skillGroups, education, languages } = content

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Stack</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
        Tecnologías agrupadas por área de trabajo. Se declara el uso real, no un nivel inflado.
      </p>

      <Section
        id="tecnologias"
        title="Tecnologías"
        isEmpty={skillGroups.length === 0}
        emptyMessage="Aún no hay tecnologías publicadas."
      >
        <div className="space-y-8">
          {skillGroups.map((group) => (
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
      </Section>

      <Section id="formacion" title="Formación" isEmpty={education.length === 0}>
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

      <Section id="idiomas" title="Idiomas" isEmpty={languages.length === 0}>
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
          {languages.map((item) => (
            <li key={item.language}>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {item.language}
              </span>{' '}
              — {item.declaredInCv}
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
