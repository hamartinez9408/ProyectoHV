// Límite de Suspense de la ruta raíz (guía §3.3).
//
// Next lo usa automáticamente mientras el segmento resuelve. El esqueleto tiene
// la misma altura que el contenido final para no provocar salto de layout.

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando la página…">
      <div className="h-9 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-5 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
      <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
    </div>
  )
}
