// Sección: agrupación visual con título y descripción.
//
// RESPONSABILIDAD ÚNICA (guía §5): presentación y estructura. NO decide sobre
// estados de datos — de eso se encarga DataStateView. Antes recibía un booleano
// `isEmpty`, que era exactamente el anti-patrón que la guía §4.2 prohíbe.

interface SectionProps {
  readonly id: string
  readonly title: string
  readonly description?: string
  readonly children: React.ReactNode
}

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="mt-16 first:mt-0">
      <h2 id={`${id}-titulo`} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{description}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}
