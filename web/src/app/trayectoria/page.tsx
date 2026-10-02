import type { Metadata } from 'next'
import { Section } from '@/components/section'
import { ExperienceEntry } from '@/components/experience-entry'
import { content } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Trayectoria',
  description:
    'Experiencia profesional anonimizada por sector: responsabilidades, resultados medidos y tecnologías.',
}

export default function TrajectoryPage() {
  const { experiences } = content

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Trayectoria</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
        Cada entrada está anonimizada por sector: los nombres de clientes y de empleadores no se
        publican. Las cifras provienen del registro de carrera.
      </p>

      <Section
        id="experiencia"
        title="Experiencia profesional"
        isEmpty={experiences.length === 0}
        emptyMessage="Aún no hay trayectoria publicada."
      >
        <ol className="space-y-12">
          {experiences.map((experience) => (
            <ExperienceEntry
              key={`${experience.roleTitle}-${experience.startDate}`}
              experience={experience}
              detailed
            />
          ))}
        </ol>
      </Section>
    </>
  )
}
