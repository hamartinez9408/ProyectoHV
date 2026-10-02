// Renderiza los cuatro estados canónicos de un componente de datos.
//
// Guía §6: todo componente que consuma datos DEBE renderizar de forma explícita
// y accesible loading, error, empty y data. Guía §4.2: los estados se modelan
// como unión discriminada, no como booleanos concurrentes.
//
// Es un Server Component: el único fragmento interactivo (el botón de
// reintento) vive en su propia hoja cliente.

import { RetryButton } from '@/components/retry-button'
import type { DataState } from '@/models/career'

const SKELETON_ROWS = 3

/** El esqueleto tiene la MISMA altura que el contenido final (guía §8, CLS 0.00):
 *  un placeholder de altura distinta produce un salto de layout al llegar los datos. */
function LoadingSkeleton({ label }: { readonly label: string }) {
  return (
    <div className="space-y-4" role="status" aria-label={label}>
      <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900"
        />
      ))}
    </div>
  )
}

interface DataStateViewProps<T> {
  readonly state: DataState<T>
  /** Se usa cuando el estado es `empty` y no trae mensaje propio. */
  readonly emptyMessage?: string
  readonly loadingLabel?: string
  readonly children: (data: T) => React.ReactNode
}

export function DataStateView<T>({
  state,
  emptyMessage = 'Todavía no hay información en esta sección.',
  loadingLabel = 'Cargando contenido…',
  children,
}: DataStateViewProps<T>) {
  switch (state.status) {
    case 'loading':
      return <LoadingSkeleton label={loadingLabel} />

    case 'error':
      return (
        <div
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 p-5 text-red-700 dark:text-red-400"
        >
          <h3 className="text-sm font-semibold">No se pudo cargar la información</h3>
          <p className="mt-1 text-sm">{state.message}</p>
          <RetryButton />
        </div>
      )

    case 'empty':
      return (
        <p
          role="status"
          className="rounded border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700"
        >
          {state.message ?? emptyMessage}
        </p>
      )

    case 'data':
      return <>{children(state.data)}</>
  }
}

/** Azúcar para el caso, hoy dominante, en que los datos están disponibles en
 *  tiempo de compilación: evita que cada página escriba la unión a mano. */
export function dataOrEmpty<T>(items: readonly T[]): DataState<readonly T[]> {
  return items.length === 0 ? { status: 'empty' } : { status: 'data', data: items }
}
