import type { Metadata } from 'next'
import Link from 'next/link'
import { NAV_ITEMS, ROUTES, SITE } from '@/lib/constants'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: `${SITE.NAME} — Portafolio técnico`,
    template: `%s · ${SITE.NAME}`,
  },
  description: SITE.DESCRIPTION,
}

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang={SITE.LANG}>
      <body className="min-h-screen font-sans">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent-500 focus:px-4 focus:py-2 focus:text-white"
        >
          Saltar al contenido
        </a>

        <header className="border-b border-slate-200 dark:border-slate-800">
          <nav
            aria-label="Navegación principal"
            className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-5"
          >
            <Link href={ROUTES.HOME} className="font-semibold tracking-tight">
              Harold Rodríguez
            </Link>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-slate-600 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-500"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main id="contenido" className="mx-auto max-w-4xl px-6 py-14">
          {children}
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800">
          <div className="mx-auto max-w-4xl px-6 py-8 text-sm text-slate-500">
            <p>
              {SITE.NAME} · {SITE.TITLE}
            </p>
            <p className="mt-2">
              Este sitio es su propio exhibit: documenta el ciclo de vida completo del software que
              lo construye, incluida su gobernanza con IA.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
