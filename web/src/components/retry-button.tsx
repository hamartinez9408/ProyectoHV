'use client'

// Patrón Hoja (guía §3.1): este es el ÚNICO componente cliente de la
// aplicación, y existe porque un botón de reintento necesita `onClick`.
// Marcarlo aquí —y no en la página ni en el layout— evita arrastrar todo el
// árbol de renderizado al bundle del navegador.

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function RetryButton({ label = 'Reintentar' }: { readonly label?: string }) {
  const router = useRouter()
  // `isPending` es una bandera transitoria de React para deshabilitar el botón
  // mientras dura la transición. No es el anti-patrón que la guía §4.2 prohíbe:
  // aquel eran booleanos de ESTADO DE DATOS que admiten combinaciones
  // imposibles (cargando y con error a la vez). Aquí no hay estado de datos.
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="mt-3 text-xs font-semibold underline hover:text-red-800 disabled:opacity-60 dark:hover:text-red-300"
    >
      {isPending ? 'Reintentando…' : label}
    </button>
  )
}
