# Regla de Arquitectura y Estándares de Calidad — ProyectoHV

## 1. Stack Tecnológico Aprobado
- **Frontend (`web/`)**: Next.js (App Router), React 19, TypeScript strict, Tailwind CSS.
- **Microservicios (`services/`)**: Java 21, Spring Boot 3.x, Maven/Gradle, Hexagonal/Clean Architecture (`access`, `cv`, `search`).
- **Serverless (`functions/`)**: AWS Lambda (Java 21).
- **Persistencia (`supabase/`)**: Supabase PostgreSQL con RLS obligatorio en toda tabla + MongoDB Atlas para auditoría.
- **Eventos y Cache**: RabbitMQ, Redis.
- **Infraestructura (`infra/`)**: Docker, Oracle Cloud VM (2 OCPU / 12 GB ARM).

## 2. Convenciones y Estándares de Código
- **TypeScript Strict**: Prohibido usar `any` (usar `unknown` + type guards o genéricos). Sin `// @ts-ignore`.
- **Inmutabilidad y Constantes**: Constantes `as const` para queries, enums y action types.
- **Frontend Data States**: Todo componente que consuma datos asíncronos DEBE manejar explícitamente 4 estados:
  1. `loading`
  2. `error`
  3. `empty`
  4. `data`
- **Server Components por Defecto**: En Next.js App Router, usar Server Components por defecto. `"use client"` únicamente donde se requiera interactividad con estado local.
- **Backend Clean Architecture**:
  - `domain`: Entidades, contratos, value objects (cero dependencias a frameworks).
  - `application`: Casos de uso, servicios de aplicación, DTOs.
  - `infrastructure`: Controladores REST, adaptadores JPA/Postgres, clientes HTTP, mensajería RabbitMQ.
- **Seguridad en BD**: RLS activado en todas las tablas sin excepción. En consultas privadas, evaluar siempre `expires_at > now()`.

## 3. Human-in-the-Loop Obligatorio
- Todo artefacto del SDLC (diseño, especificación, plan, ADR) debe incluir explícitamente la sección:
  `Decisión humana:`
  - Qué decidió Harold.
  - Qué ejecutó la IA.
  - Riesgo aceptado conscientemente.
