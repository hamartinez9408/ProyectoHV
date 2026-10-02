import type { NextConfig } from 'next'

// ── Cabeceras de seguridad HTTP (guía §9.4) ─────────────────────────────────
//
// SOBRE `'unsafe-inline'` EN script-src — limitación real, no descuido:
// el sitio se prerenderiza y React hidrata con scripts en línea. Una CSP
// estricta exigiría nonces por petición, y un nonce obliga a renderizar en
// cada request (no sirve HTML estático). Se elige el HTML estático con
// `'unsafe-inline'` acotado a scripts y estilos propios — sin `unsafe-eval`,
// sin orígenes externos. Cuando exista el portal autenticado (que sí es
// dinámico) allí se aplica CSP con nonce.
//
// Si algún día se despliega como export estático puro, `headers()` deja de
// aplicarse y estas cabeceras deben moverse a `netlify.toml` / `_headers`.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  // Redundante con `frame-ancestors 'none'` a propósito: los navegadores que no
  // soportan CSP nivel 2 solo entienden esta.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
  // El contenido vive en src/content/public.json, sincronizado desde
  // ../content/public.json por scripts/sync-content.mjs antes de cada build.
  // No se lee fuera de la raíz de web/ a propósito: en Netlify el directorio
  // base es web/, y leer fuera de él no funciona.
}

export default nextConfig
