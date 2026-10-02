// Rutas y textos de navegación. Constantes `as const`: nunca strings mágicos
// sueltos por los componentes.

export const ROUTES = {
  HOME: '/',
  TRAJECTORY: '/trayectoria',
  STACK: '/stack',
  EXHIBIT: '/exhibit',
} as const

export type Route = (typeof ROUTES)[keyof typeof ROUTES]

// Solo rutas que EXISTEN. La navegación apunta a páginas construidas: un enlace
// a una ruta inexistente devuelve 404 y Next lo prefetchea, así que el fallo se
// ve en la consola del visitante. `EXHIBIT` entra aquí cuando exista la página
// (Slice 1.3), no antes.
export const NAV_ITEMS = [
  { href: ROUTES.HOME, label: 'Inicio' },
  { href: ROUTES.TRAJECTORY, label: 'Trayectoria' },
  { href: ROUTES.STACK, label: 'Stack' },
] as const

export const SITE = {
  NAME: 'Harold Augusto Rodríguez Martínez',
  TITLE: 'Tech Lead — Arquitectura de Integración y Plataformas Cloud',
  DESCRIPTION:
    'Portafolio técnico de Harold Rodríguez: liderazgo técnico, arquitectura de integración y plataformas cloud con IA aplicada. El proyecto documenta su propio ciclo de vida de software.',
  LANG: 'es',
} as const

/** Cuántos logros cuantificados destacar en la portada. */
export const LIMIT = {
  FEATURED_METRICS: 4,
  SKILL_GROUPS: 4,
} as const
