// Sección de contenido.
//
// SOBRE LOS CUATRO ESTADOS OBLIGATORIOS
// La regla del proyecto pide loading / error / empty / data en todo componente
// de datos. Aquí el contenido se importa en tiempo de compilación: no hay
// petición, así que `loading` y `error` son ESTRUCTURALMENTE imposibles — el
// validador de `content.ts` ya habría detenido el build. Inventar un esqueleto
// de carga sería teatro: enseñaría un estado que nunca puede ocurrir.
//
// `empty` sí puede ocurrir (una sección sin elementos) y por eso se implementa
// de verdad. Los cuatro estados aplicarán completos en el portal privado, que
// sí consulta datos en tiempo de ejecución.

interface SectionProps {
  readonly id: string
  readonly title: string
  readonly description?: string
  readonly isEmpty?: boolean
  readonly emptyMessage?: string
  readonly children: React.ReactNode
}

export function Section({
  id,
  title,
  description,
  isEmpty = false,
  emptyMessage = 'Todavía no hay información en esta sección.',
  children,
}: SectionProps) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="mt-16 first:mt-0">
      <h2 id={`${id}-titulo`} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{description}</p>
      ) : null}

      <div className="mt-6">
        {isEmpty ? (
          <p
            role="status"
            className="rounded border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700"
          >
            {emptyMessage}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
