# 05. Guía de Prácticas Recomendadas — Desarrollo Web (Next.js 15 & TypeScript)

> **Fase del SDLC:** 3 · Construcción e Implementación Frontend  
> **Líder Técnico & Decisión Humana:** Harold Augusto Rodríguez Martínez  
> **Estado:** APROBADO & VIGENTE ✅  
> **Stack Base:** Next.js 15.5 (App Router), React 19, TypeScript 5.6 (Strict), Tailwind CSS 4.0  
> **Confluence URL:** [05. Guía de Prácticas Recomendadas — Desarrollo Web (Next.js & TypeScript)](https://haroldr088.atlassian.net/wiki/spaces/HV/pages/2064385/05.+Gu+a+de+Pr+cticas+Recomendadas+Desarrollo+Web+Next.js+TypeScript)

---

## 📋 1. Resumen Ejecutivo y Metadatos de Gobernanza

Este documento establece el estándar normativo de ingeniería de software para el desarrollo web en **ProyectoHV** (`web/` y servicios backend). Su objetivo es garantizar la máxima mantenibilidad, modularidad con Principio de Responsabilidad Única (SRP), rendimiento óptimo en Core Web Vitals, accesibilidad universal (WCAG 2.1 AA) y cumplimiento riguroso de las directrices de seguridad y privacidad del portafolio técnico.

| Parámetro | Definición Normativa |
| :--- | :--- |
| **Audiencia** | Desarrolladores Frontend, Ingenieros Fullstack, Subagentes Agénticos (`hv-frontend`, `hv-backend-spring`), Auditores Técnicos |
| **Componentes de Código** | Directorio `web/` y microservicios en `services/` |
| **Regla Madre** | Regla #0 (Aislamiento Corporativo) y Confidencialidad de Terceros (Anonimización por sector) |
| **Verificación Automática** | Gates CI/CD: ESLint 9 Flat Config, TypeScript 5.6 `tsc --noEmit`, script `verify-build.mjs` |

---

## 🛠️ 2. Validación Tecnológica del Stack Web

Tras la auditoría del repositorio (`web/package.json`, `web/tsconfig.json`, `web/src/app/globals.css`), se valida el ecosistema tecnológico oficial:

| Tecnología | Versión Validada | Rol Arquitectónico | Justificación de Elección |
| :--- | :--- | :--- | :--- |
| **Next.js** | `^15.5.0` | Framework Fullstack / SSR / SSG | Adopción de React Server Components (RSC) nativos, enrutamiento declarativo por carpetas (App Router), streaming con Suspense y soporte para Node.js 22 LTS. |
| **React** | `^19.0.0` | Biblioteca de UI Fundacional | Uso del compilador optimizado de React, soporte para `useActionState`, simplificación de `ref` como prop directa y Server Actions. |
| **TypeScript** | `^5.6.0` | Lenguaje Tipado Estricto | Garantía de robustez en tiempo de compilación con `strict: true`, `noUncheckedIndexedAccess: true` y eliminación de tipos laxos. |
| **Tailwind CSS** | `^4.0.0` | Motor de Estilos Atómicos | Configuración moderna CSS-first con `@theme`, utilización del espacio cromático OKLCH y cero sobrecarga de JavaScript en tiempo de ejecución. |
| **ESLint** | `^9.0.0` | Linter Estático | Reglas oficiales `eslint-config-next` para detectar cuellos de botella de hidratación, accesibilidad y dependencias de hooks. |

---

## 🏛️ 3. Arquitectura y Convenciones de Next.js 15 (App Router)

### 3.1. Paradigma "Server-First" (React Server Components por Defecto)
En Next.js 15 con App Router, **todo componente es un Server Component por defecto**. Solo se debe declarar `'use client'` cuando el componente requiera expresamente:
1. Manejo de estado local interactivo (`useState`, `useReducer`, `useActionState`).
2. Efectos secundarios de ciclo de vida (`useEffect`, `useLayoutEffect`).
3. Event listeners directos del navegador (`onClick`, `onChange`, `onSubmit`).
4. Acceso directo a APIs del navegador (`window`, `localStorage`, `navigator`).

#### El Patrón "Leaf Component" (Aislamiento en Hojas)
Para evitar que un módulo interactivo convierta todo su árbol de renderizado en código cliente, `'use client'` debe colocarse en el nodo más bajo posible de la jerarquía (las "hojas"). Los componentes de servidor pueden pasarse como `children` a contenedores cliente:

```tsx
// ✅ BIEN: El componente de cliente solo envuelve el comportamiento interactivo
// Archivo: src/components/interactive-drawer.tsx
'use client';

import { useState } from 'react';

interface DrawerProps {
  readonly children: React.ReactNode; // Server Component inyectado
}

export function InteractiveDrawer({ children }: DrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button 
        type="button" 
        onClick={() => setIsOpen((prev) => !prev)}
        className="px-3 py-1.5 text-sm font-medium border rounded-md"
      >
        {isOpen ? 'Ocultar Detalle' : 'Ver Detalle'}
      </button>
      {isOpen && <aside className="mt-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">{children}</aside>}
    </div>
  );
}
```

### 3.2. Manejo de APIs Asíncronas en Next.js 15
En Next.js 15, las propiedades del servidor como `cookies()`, `headers()`, `params` y `searchParams` son **asíncronas** y deben resolverse explícitamente mediante `await`:

```tsx
// ✅ BIEN: Resolución asíncrona de params en Next.js 15
// Archivo: src/app/trayectoria/[slug]/page.tsx
interface PageProps {
  readonly params: Promise<{ slug: string }>;
}

export default async function TrajectoryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return <section aria-labelledby="heading-detail"><h1 id="heading-detail">Detalle: {slug}</h1></section>;
}
```

### 3.3. Estructura Canónica de Rutas y Archivos Especiales
Toda ruta en `src/app/` debe adherirse a los archivos de convención del framework:
- `layout.tsx`: Estructura persistente y accesibilidad global (`<main id="contenido">`).
- `page.tsx`: Vista principal de la ruta (Server Component por defecto).
- `loading.tsx`: Límite de Suspense automático para streaming progresivo de UI.
- `error.tsx`: Límite de error de cliente (`'use client'`) con función `reset()`.
- `not-found.tsx`: Vista amigable para slugs inexistentes.

---

## 🛡️ 4. TypeScript 5.6: Tipado Estricto y Programación Defensiva

El proyecto aplica la configuración de compilador más estricta (`tsconfig.json`), lo que prohíbe técnicas inseguras comunes en el ecosistema JavaScript.

### 4.1. Reglas Inviolables de Tipado
1. **Prohibición Total de `any`:** Si el tipo no se conoce en tiempo de compilación, se debe usar `unknown` combinado con funciones *Type Guard*.
2. **Propiedades Inmutables (`readonly`):** Props y contratos de datos asíncronos deben declararse con `readonly` para prevenir mutaciones.
3. **Indexación Defensiva (`noUncheckedIndexedAccess: true`):** Acceder a arrays o mapas por índice devuelve `T | undefined`, forzando comprobaciones previas.
4. **Constantes Inmutables con `as const`:** Objetos de rutas, endpoints y configuraciones deben sellarse como valores literales.

```typescript
// ✅ BIEN: Contratos inmutables y sellados con 'as const'
export const ROUTES = {
  HOME: '/',
  TRAYECTORIA: '/trayectoria',
  STACK: '/stack',
  EXHIBITS: '/exhibits',
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
```

### 4.2. Discriminated Unions para Modelado de Estados
Se prohíbe el anti-patrón de estados booleanos concurrentes (`isLoading`, `isError`). Se exige el uso de **Uniones Discriminadas**:

```typescript
// ✅ BIEN: Estados mutuamente excluyentes imposibles de corromper
export type AsyncState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: string; readonly retry?: () => void }
  | { readonly status: 'empty'; readonly message?: string }
  | { readonly status: 'data'; readonly data: T };
```

---

## 🧱 5. Principio de Responsabilidad Única (SRP) y Organización por Capas/Módulos

El **Principio de Responsabilidad Única** (*Single Responsibility Principle - SRP*) establece que un módulo, clase o función debe tener **una y solo una razón para cambiar**. En el desarrollo web (tanto en APIs Node.js/Express como en Server Actions o Route Handlers de Next.js), violar este principio mezclando lógica HTTP, reglas de negocio y queries a base de datos crea código rígido, acoplado y frágil ante el cambio.

### 5.1. Estructura de Carpetas Recomendada (Patrón por Capas / Módulos)

Una organización desacoplada y escalable dentro de la carpeta fuente (`src/`) distribuye las responsabilidades en capas explícitas y unidireccionales:

```text
src/
├── config/       # Variables de entorno validadas y conexiones a BD (PostgreSQL, Supabase, MongoDB)
├── controllers/  # Controladores HTTP / Route Handlers (orquestan request/response y status codes)
├── services/     # Lógica y reglas de negocio puras (independientes del protocolo HTTP)
├── models/       # Esquemas de datos, contratos TypeScript y entidades
├── repositories/ # Patrón Repositorio: Abstracción de acceso a datos y queries
├── routes/       # Definición declarativa de endpoints y rutas de la API
├── middlewares/  # Validaciones previas, autenticación (JWT/Magic Links), rate limit, manejo de errores
├── utils/        # Funciones auxiliares puras, transformadores y helpers reutilizables
├── app.ts        # Configuración global del framework, registro de middlewares y plugins
└── server.ts     # Punto de entrada de infraestructura: inicialización de puertos y graceful shutdown
```

#### Roles y Límites Claros por Capa:

| Capa / Directorio | Responsabilidad Única | Qué NUNCA debe contener |
| :--- | :--- | :--- |
| **`controllers/`** | Extraer parámetros de la solicitud (`req`), invocar el servicio adecuado y emitir la respuesta HTTP (`res`, cabeceras, status code, RFC 9457 ProblemDetail). | Consultas SQL/ORM directas, algoritmos de cálculo de negocio, manipulación de tokens criptográficos. |
| **`services/`** | Orquestar las reglas del caso de uso, validaciones de dominio y cálculos de negocio. | Objetos de transporte HTTP (`req`, `res`), status codes, queries de persistencia acopladas. |
| **`repositories/`** | Ejecutar lecturas y escrituras hacia los motores de datos (PostgreSQL, MongoDB, Supabase). | Lógica de negocio, validaciones de permisos de sesión, formateo de respuestas web. |
| **`middlewares/`** | Interceptar solicitudes para autenticación, validación de schemas de entrada (Zod) o manejo centralizado de errores. | Lógica de negocio del dominio o mutaciones de datos no relacionadas con infraestructura. |
| **`config/`** | Validar, tipar y proveer la configuración del entorno y clientes de base de datos de manera inmutable. | Lógica de aplicación o estado mutable durante la ejecución. |

---

### 5.2. Patrones de Diseño Clave para Garantizar SRP

Para asegurar que cada módulo conserve una responsabilidad acotada y verificable, se aplican tres patrones arquitectónicos:

#### 1. Patrón Repositorio (Repository Pattern)
Aísla las consultas a la base de datos detrás de una interfaz contractual. Esto permite cambiar el motor de persistencia (ej. migrar de PostgreSQL relacional a Supabase o MongoDB) o simular respuestas en pruebas unitarias sin tocar una sola línea de la lógica de negocio:

```typescript
// ✅ 1. Contrato abstracto del Repositorio (src/repositories/cv-repository.interface.ts)
export interface ICVRepository {
  findById(id: string): Promise<CVEvaluation | null>;
  saveAuditEntry(entry: AuditEntry): Promise<void>;
}

// ✅ 2. Implementación de Infraestructura (src/repositories/postgres-cv.repository.ts)
export class PostgresCVRepository implements ICVRepository {
  constructor(private readonly dbPool: DatabasePool) {}

  async findById(id: string): Promise<CVEvaluation | null> {
    const result = await this.dbPool.query('SELECT * FROM cv_evaluations WHERE id = $1', [id]);
    return result.rows[0] ? mapToDomain(result.rows[0]) : null;
  }

  async saveAuditEntry(entry: AuditEntry): Promise<void> {
    await this.dbPool.query('INSERT INTO audit_log VALUES ($1, $2, NOW())', [entry.id, entry.action]);
  }
}
```

#### 2. Inyección de Dependencias (Dependency Injection - DI)
En lugar de instanciar dependencias concretas internamente (`new PostgresCVRepository()`), los servicios y controladores reciben sus colaboradores a través de argumentos o constructores. Esto garantiza desacoplamiento absoluto y hace triviales las pruebas unitarias:

```typescript
// ✅ 3. Servicio de Negocio Puro con Inyección de Dependencias (src/services/cv.service.ts)
export class CVService {
  // Se inyecta la interfaz contractual, nunca una clase concreta acoplada
  constructor(private readonly cvRepository: ICVRepository) {}

  async processEvaluation(cvId: string): Promise<CVEvaluationResult> {
    const cv = await this.cvRepository.findById(cvId);
    if (!cv) {
      throw new ResourceNotFoundError(`El CV con ID ${cvId} no existe`);
    }

    // Regla de negocio pura
    const score = calculateExperienceScore(cv.experiences);
    await this.cvRepository.saveAuditEntry({ id: cvId, action: 'EVALUATED' });

    return { cvId, score, approved: score >= 75 };
  }
}
```

#### 3. Arquitectura Limpia / Hexagonal (Clean/Hexagonal Architecture)
Para servicios empresariales o módulos con alta lógica de negocio, se organiza el código por dominios funcionales (bounded contexts) separando el núcleo de dominio de los adaptadores externos:
- **Dominio Central:** Entidades puras y casos de uso libres de dependencias de frameworks o bases de datos.
- **Adaptadores Primarios (Driving):** Controladores HTTP, listeners de mensajes RabbitMQ, Next.js Server Actions.
- **Adaptadores Secundarios (Driven):** Repositorios PostgreSQL/MongoDB, caché Redis, clientes SMTP/DNS.

> 💡 **Alineación con ProyectoHV:** Esta visión conecta de forma transparente con **ADR-001 (Arquitectura Hexagonal en Microservicios)**, manteniendo consistencia total entre los servicios backend Java 21 y la capa de servicios web en Node.js/Next.js.

---

## 🔄 6. Patrón Obligatorio de 4 Estados en Componentes de Datos

En consonancia con la directriz interna `hv-nextjs-ui`, todo componente que consuma datos asíncronos en ProyectoHV **DEBE** renderizar de forma explícita y accesible los cuatro estados canónicos:

```tsx
import React from 'react';

export type DataState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string; readonly retry?: () => void }
  | { readonly status: 'empty'; readonly message?: string }
  | { readonly status: 'data'; readonly data: T };

interface TrajectoryListProps {
  readonly state: DataState<Array<{ id: string; role: string; sector: string; period: string }>>;
}

export function TrajectoryList({ state }: TrajectoryListProps) {
  switch (state.status) {
    case 'loading':
      return (
        <div 
          className="space-y-4 animate-pulse" 
          role="status" 
          aria-label="Cargando trayectoria profesional..."
        >
          <div className="h-6 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-16 rounded-lg bg-slate-100 dark:bg-slate-900" />
          <div className="h-16 rounded-lg bg-slate-100 dark:bg-slate-900" />
        </div>
      );

    case 'error':
      return (
        <div 
          className="p-5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400" 
          role="alert"
        >
          <h3 className="font-semibold text-sm">Error al cargar la información</h3>
          <p className="mt-1 text-sm">{state.message}</p>
          {state.retry && (
            <button
              type="button"
              onClick={state.retry}
              className="mt-3 text-xs font-semibold underline hover:text-red-800 dark:hover:text-red-300"
            >
              Reintentar operación
            </button>
          )}
        </div>
      );

    case 'empty':
      return (
        <div className="p-8 text-center border border-dashed rounded-lg border-slate-300 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {state.message || 'No se encontraron registros para los filtros seleccionados.'}
          </p>
        </div>
      );

    case 'data':
      return (
        <ul className="space-y-4">
          {state.data.map((item) => (
            <li 
              key={item.id} 
              className="p-4 rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex justify-between items-baseline">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.role}</h3>
                <span className="text-xs text-slate-500">{item.period}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.sector}</p>
            </li>
          ))}
        </ul>
      );
  }
}
```

---

## 🎨 7. Tailwind CSS 4.0: Arquitectura de Estilos y Accesibilidad (A11y)

### 7.1. Configuración CSS-First con `@theme`
Tailwind CSS 4 prescinde de archivos `tailwind.config.js` y utiliza la directiva `@theme` en `globals.css` con espacio cromático **OKLCH**:

```css
@import 'tailwindcss';

@theme {
  --color-accent-50: oklch(0.97 0.02 250);
  --color-accent-500: oklch(0.55 0.16 250);
  --color-accent-700: oklch(0.42 0.14 250);
  --font-sans: ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, monospace;
}
```

### 7.2. Directrices de Accesibilidad Obligatorias (WCAG 2.1 AA)
1. **Foco Visible Garantizado:** `:focus-visible` configurado globalmente con contorno de 2px color acento. Prohibido `outline-none` sin alternativa.
2. **Salto al Contenido (Skip Link):** Primer elemento interactivo accesible por teclado para navegar a `<main id="contenido">`.
3. **Respeto a Preferencias del Usuario:** `@media (prefers-reduced-motion: reduce)` para inhabilitar transiciones abruptas.
4. **Roles Semánticos:** Etiquetas HTML5 (`<header>`, `<nav aria-label="...">`, `<main>`, `<article>`, `<footer>`).

---

## ⚡ 8. Rendimiento Web y Optimización de Core Web Vitals

| Métrica | Meta Técnica | Estrategia de Implementación en ProyectoHV |
| :--- | :--- | :--- |
| **LCP (Largest Contentful Paint)** | `< 1.2 s` | 1. `next/image` con atributo `priority` para Above-The-Fold.<br>2. Fuentes cargadas con `next/font/google` (`display: swap`).<br>3. Renderizado Server-Side (RSC) enviando HTML listo en el primer chunk. |
| **INP (Interaction to Next Paint)** | `< 100 ms` | 1. Minimización estricta de bundle JS cliente.<br>2. Delegación de ordenamiento a Server Components o transiciones con `useTransition`. |
| **CLS (Cumulative Layout Shift)** | `0.00` | 1. Dimensiones explícitas (`width` y `height`) en recursos multimedia.<br>2. Placeholders y skeletons dimensionados idénticos a los estados finales. |

---

## 🔒 9. Seguridad, Sanitización y Privacidad en el Frontend

Como se rige en la **Regla #0** y la **Política de Confidencialidad de Terceros**:

1. **Cero Secretos en el Bundle del Cliente:** Prohibido el uso de variables `NEXT_PUBLIC_*` para tokens o infraestructuras internas.
2. **Anonimización por Sector Industrial:** En el nivel público, nunca se muestran nombres de clientes corporativos (describir como *"Banca privada"*, *"Caja de compensación"*, *"Manufactura"*).
3. **Aislamiento de la Lista Negra:** Los datos personales identificables (cédula, dirección, teléfono) son filtrados desde el pipeline `sync-content.mjs` y validados por `hv-guardrails`.
4. **Cabeceras de Seguridad HTTP:** `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

---

## ⚖️ 10. Matriz "Hacer (Do) vs No Hacer (Don't)"

| Categoría | ✅ Qué Hacer (Do) | ❌ Qué Evitar (Don't) |
| :--- | :--- | :--- |
| **Responsabilidad Única (SRP)** | Separar estrictamente controladores (HTTP), servicios (negocio) y repositorios (persistencia). Inyectar dependencias. | Colocar lógica de negocio, validaciones y queries a la base de datos dentro del controlador o en el componente visual. |
| **Patrón Repositorio** | Aislar queries SQL/ORM en repositorios independientes bajo interfaces para facilitar cambio de BD y testing. | Acoplar sentencias de bases de datos directamente en el código de servicios o controladores. |
| **Arquitectura Web** | Usar Server Components por defecto y delegar interactividad a hojas clientes aisladas (*Leaf Pattern*). | Marcar páginas completas o layouts con `'use client'` por pereza. |
| **Manejo de Estado** | Modelar flujos asíncronos con Discriminated Unions (4 estados canónicos). | Mantener múltiples booleanos (`loading`, `error`, `empty`) propensos a estados imposibles. |
| **TypeScript** | Configurar tipos estrictos, `unknown` con type guards y props marcadas con `readonly`. | Usar `any`, `@ts-ignore`, o `as` arbitrarios para silenciar al compilador. |
| **Next.js 15 APIs** | Usar `await params` y `await cookies()` acorde a la especificación asíncrona de Next.js 15. | Tratar `params` o `cookies()` como objetos síncronos en componentes de servidor. |
| **Estilos** | Utilizar directivas `@theme` y variables OKLCH en `globals.css`. | Usar librerías CSS-in-JS con tiempo de ejecución o valores arbitrarios mágicos hardcodeados. |
| **Accesibilidad** | Proveer etiquetas ARIA vivas (`role="status"`, `role="alert"`) y foco visible en `:focus-visible`. | Eliminar el contorno de foco con `outline-none` sin reemplazo accesible. |
| **Seguridad** | Consumir datos sanitizados desde `public.json` validados por el pipeline de auditoría. | Quemar nombres de clientes confidenciales o datos personales en el código fuente. |

---

## 🚦 11. Flujo de Calidad y Verificación Automatizada

Antes de consolidar cualquier cambio en `web/`, el desarrollador o agente debe ejecutar y aprobar la batería de verificación local:

```bash
# 1. Validación de reglas de estilo y buenas prácticas de React/Next.js
npm run lint --prefix web

# 2. Comprobación estricta de tipos sin emisión de JavaScript
npm run typecheck --prefix web

# 3. Verificación de integridad de build y sincronización de contenido
npm run verify:build --prefix web
```

---

## Decisión humana

- **Qué decidió Harold:** Incorporar explícitamente el Principio de Responsabilidad Única (SRP), la arquitectura por capas, el Patrón Repositorio y la Inyección de Dependencias como estándares vinculantes para el desarrollo web en ProyectoHV. Mantener el paralelismo entre la arquitectura hexagonal de los servicios Java 21 y la capa web/fullstack en Node.js y Next.js.
- **Qué ejecutó la IA:** Actualización integral de la página `05. Guía de Prácticas Recomendadas — Desarrollo Web (Next.js & TypeScript)` en Confluence (versión 2), estructuración del árbol de directorios por capas (`config`, `controllers`, `services`, `models`, `repositories`, `routes`, `middlewares`, `utils`), elaboración de ejemplos en TypeScript con contratos de repositorios e inyección de dependencias, y actualización del documento local `docs/03-implementacion/01-guias-desarrollo-web.md`.
- **Alternativas descartadas:**
  - *Mantener controladores con queries directas a BD:* Descartado categóricamente por generar deuda técnica y acoplar el protocolo HTTP con el motor de almacenamiento.
  - *Instanciar repositorios con `new` dentro de los servicios:* Descartado para permitir pruebas unitarias limpias mediante Inyección de Dependencias.
