import { Emphasized } from '@/components/emphasized'
import { MetricList } from '@/components/metric-card'
import { formatRange, type Experience } from '@/lib/content'

/** Una entrada de trayectoria. `detailed` añade los logros y las cifras — la
 *  portada los omite para no repetir lo que ya muestra la sección de métricas. */
export function ExperienceEntry({
  experience,
  detailed = false,
}: {
  readonly experience: Experience
  readonly detailed?: boolean
}) {
  return (
    <li className="border-l-2 border-slate-200 pl-5 dark:border-slate-800">
      <p className="text-xs uppercase tracking-wide text-slate-500">{formatRange(experience)}</p>
      <h3 className="mt-1 font-semibold">{experience.roleTitle}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {experience.companyPublicLabel} · {experience.industrySector}
        {experience.city ? ` · ${experience.city}` : ''}
      </p>

      {detailed && experience.summaryPublic ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <Emphasized text={experience.summaryPublic} />
        </p>
      ) : null}

      {detailed && experience.metrics.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Resultados medidos
          </h4>
          <div className="mt-2">
            <MetricList metrics={experience.metrics} />
          </div>
        </div>
      ) : null}

      {!detailed && experience.achievements.length > 0 ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {experience.achievements.length} responsabilidades documentadas
        </p>
      ) : null}

      {experience.technologies.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {experience.technologies.map((tech) => (
            <li
              key={tech}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {tech}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}
