// Página 404 (guía §3.3).

import Link from 'next/link'
import { ROUTES } from '@/config/site'

export default function NotFound() {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Error 404</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Esta página no existe</h1>
      <p className="mx-auto mt-3 max-w-md text-slate-600 dark:text-slate-400">
        La dirección puede estar mal escrita o el contenido pudo haberse movido.
      </p>
      <Link
        href={ROUTES.HOME}
        className="mt-6 inline-block rounded bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
