---
name: hv-nextjs-ui
description: Frontend implementation standards for Next.js App Router, Tailwind CSS, TypeScript strict, and accessible UI components in web/. Enforces 4 mandatory states (loading, error, empty, data), WCAG AA standards, and Server Components by default. Use when developing or refactoring UI components or web pages.
---

# HV-NEXTJS-UI — Guía de Desarrollo Frontend Next.js

Este skill define los lineamientos para la construcción de la interfaz de usuario en `web/`.

## Principios Fundamentales
1. **Server Components por Defecto**:
   - Todo componente en el App Router es Server Component a menos que necesite interactividad (`useState`, `useEffect`, eventos de usuario).
2. **TypeScript Estricto**:
   - Prohibido el uso de `any`. Emplear `unknown` con type guards o tipos parametrizados.
3. **Manejo Obligatorio de 4 Estados**:
   - Consultar [four-states-pattern.md](./references/four-states-pattern.md).
4. **Accesibilidad (A11y)**:
   - Contraste WCAG AA.
   - Navegación por teclado completa (focus rings visibles).
   - Roles ARIA en estados de carga (`role="status"`) y error (`role="alert"`).
5. **Calidad y Linter**:
   - Ejecutar verificación antes de commitear:
     ```bash
     npm run lint --prefix web && npm run typecheck --prefix web
     ```
