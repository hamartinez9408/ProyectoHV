import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // El contenido vive en src/content/public.json, sincronizado desde
  // ../content/public.json por scripts/sync-content.mjs antes de cada build.
  // No se lee fuera de la raíz de web/ a propósito: en Netlify el directorio
  // base es web/, y leer fuera de él no funciona.
}

export default nextConfig
