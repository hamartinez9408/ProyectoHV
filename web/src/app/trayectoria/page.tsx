import type { Metadata } from 'next'
import { DataStateView, dataOrEmpty } from '@/components/data-state'
import { ExperienceEntry } from '@/components/experience-entry'
import { Section } from '@/components/section'
import { careerContent } from '@/repositories/career.repository'

export const metadata: Metadata = {
  title: 'Trayectoria',
  description:
    'Experiencia profesional anonimizada por sector: responsabilidades, resultados medidos y tecnologías.',
}

export default function TrajectoryPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Trayectoria</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
        Cada entrada está anonimizada por sector: los nombres de clientes y de empleadores no se
        publican. Las cifras provienen del registro de carrera.
      </p>

      <Section id="experiencia" title="Experiencia profesional">
        <DataStateView
          state={dataOrEmpty(careerContent.experiences)}
          emptyMessage="Aún no hay trayectoria publicada."
          loadingLabel="Cargando trayectoria…"
        >
          {(items) => (
            <ol className="space-y-12">
              {items.map((experience) => (
                <ExperienceEntry
                  key={`${experience.roleTitle}-${experience.startDate}`}
                  experience={experience}
                  detailed
                />
              ))}
            </ol>
          )}
        </DataStateView>
      </Section>
    </>
  )
}
