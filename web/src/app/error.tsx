'use client'

// Límite de error de la ruta raíz (guía §3.3).
//
// `error.tsx` SIEMPRE es cliente: es la frontera que React usa para capturar
// errores de renderizado, y eso solo puede ocurrir en el navegador.
//
// No se muestra al visitante el mensaje crudo del error: en producción
// `error.message` puede filtrar rutas del servidor o detalles internos. En
// desarrollo sí, porque ayuda a depurar.

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}) {
  useEffect(() => {
    // Se registra para diagnóstico sin exponerlo en la interfaz. Cuando exista
    // monitoreo (fase 6) esto se envía al colector.
    console.error('Error de renderizado:', error.digest ?? error.name)
  }, [error])

  const isDev = process.env.NODE_ENV !== 'production'

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-700 dark:text-red-400"
    >
      <h1 className="text-lg font-semibold">Algo falló al mostrar esta página</h1>
      <p className="mt-2 text-sm">
        El error quedó registrado. Puedes reintentar; si persiste, vuelve más tarde.
      </p>
      {isDev ? (
        <pre className="mt-3 overflow-x-auto rounded bg-black/10 p-3 text-xs">{error.message}</pre>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded border border-current px-3 py-1.5 text-sm font-semibold hover:bg-red-500/10"
      >
        Reintentar
      </button>
    </div>
  )
}
