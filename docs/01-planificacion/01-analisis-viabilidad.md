# Análisis de Viabilidad — ProyectoHV

> **Fase:** 1 · Planificación  
> **Estado:** Propuesto para revisión  
>
> **Decisión humana**
> - **Qué decidió Harold:** Construir el portafolio como un exhibit técnico vivo de ingeniería de software y adopción de IA; utilizar una arquitectura heterogénea para generar evidencia real y verificable de tecnologías listadas en su perfil profesional (§11.3 de `perfil-maestro.md`: Java Spring Boot, RabbitMQ, MongoDB, Serverless, Docker); y fijar una cota máxima de costo operacional en < USD 3/mes.
> - **Qué ejecutó la IA:** Estructuración de la matriz tridimensional de viabilidad (estratégica de carrera, técnica/arquitectónica y económica/operativa), análisis de dimensionamiento de recursos sobre la VM Oracle Cloud (ARM) y mapeo de modos de fallo.
> - **Riesgo aceptado conscientemente:** Mayor sobrecarga cognitiva y operacional al gestionar cuatro runtimes independientes (Edge/Next.js, Spring Boot en VM, AWS Lambda y PostgreSQL/RLS), mitigada mediante desacoplamiento estricto por pipelines (A–D) y automatización con Docker y Ansible.

---

## 1. Justificación y Tesis del Proyecto

La mayoría de portafolios de desarrollo web consisten en plantillas estáticas (SSG) o aplicaciones monolíticas simples que no evidencian las competencias reales requeridas para un **Líder Técnico / Tech Lead**. 

ProyectoHV se concibe bajo una doble naturaleza:
1. **El Producto:** Portal profesional con dos niveles de acceso (Público general anonimizado y Privado con control de acceso por Magic Link temporal de 48 horas).
2. **El Exhibit:** El repositorio y el sitio documentan y exhiben el ciclo de vida completo de desarrollo (SDLC fases 1 a 6), gobernanza de IA, ingeniería de contexto como código y contención determinista del *Change Failure Rate* (investigación DORA).

---

## 2. Dimensión 1: Viabilidad Estratégica de Carrera

El perfil profesional de Harold (`C:\Personal\Gestion\profile\perfil-maestro.md`, §11.3) identifica tecnologías afirmadas en canales profesionales pero que carecían de un repositorio público auditable como respaldo. 

Este proyecto resuelve esa brecha técnica mediante asignación directa de responsabilidades funcionales:

| Tecnología a Evidenciar | Componente en ProyectoHV | Rol en la Arquitectura | Evidencia Tangible |
|---|---|---|---|
| **Java 21 / Spring Boot 3** | `services/access`, `cv`, `search` | Microservicios con Clean/Hexagonal Architecture. | Código fuente, cobertura ≥80%, RFC 9457 ProblemDetail, pruebas con Testcontainers. |
| **RabbitMQ** | Broker de mensajería en VM | Desacoplamiento asíncrono de eventos de auditoría y notificaciones. | Topología de colas/exchanges, DLQ, productores y consumidores desacoplados. |
| **MongoDB Atlas** | Almacén de auditoría | Bitácora de accesos inmutable (append-only) para trazabilidad de tokens y descargas. | Esquema no estructurado de auditoría, índices por TTL y consultas analíticas. |
| **AWS Lambda (Java)** | `functions/notifier`, `watermark` | Funciones serverless para envío de correo y estampado dinámico de marcas de agua. | Handler Java 21 SnapStart, empaquetado zip optimizado para cold-starts bajos. |
| **Supabase (PostgreSQL + RLS)** | `supabase/` | Base de datos relacional y motor de seguridad principal (`expires_at > now()`). | Migraciones SQL reversibles, políticas RLS evaluadas en motor, pgvector. |
| **Next.js 15+ / React 19** | `web/` | Frontend con Server Components por defecto y TypeScript estricto. | Manejo obligatorio de 4 estados, accesibilidad WCAG AA, cero tipo `any`. |
| **Docker & IaC** | `infra/` | Orquestación en VM Oracle Cloud ARM. | Dockerfiles multi-stage sin root, compose optimizado para memoria de 12 GB. |

---

## 3. Dimensión 2: Viabilidad Técnica y Dimensionamiento

### 3.1 Compatibilidad de Runtimes y Plataforma
El núcleo del cómputo persistente reside en una instancia **Oracle Cloud Always Free (Ampere A1 ARM - 2 OCPU / 12 GB RAM)**. 

Se analizó la viabilidad de empaquetar los microservicios Java 21 y la infraestructura de soporte (RabbitMQ, Redis) dentro de esta cota de recursos:

| Contenedor / Servicio | Base Image | Memoria Límite (RAM) | CPU Quota | Estrategia de Optimización |
|---|---|---|---|---|
| **Redis 7 (Cache)** | `redis:7-alpine` | 256 MB | 0.25 OCPU | Cache volátil de tokens efímeros y rate limiting. |
| **RabbitMQ 3.13** | `rabbitmq:3-alpine` | 512 MB | 0.25 OCPU | Broker liviano sin plugins pesados innecesarios. |
| **access-service** | Eclipse Temurin 21 JRE | 1.25 GB | 0.50 OCPU | Java Virtual Threads (Loom), Heap máx. 768 MB (`MaxRAMPercentage=75`). |
| **cv-service** | Eclipse Temurin 21 JRE | 1.00 GB | 0.25 OCPU | Heap máx. 512 MB, servicio de baja carga enfocado en datos privados. |
| **search-service** | Eclipse Temurin 21 JRE | 1.50 GB | 0.50 OCPU | Integración con pgvector / embeddings; heap máx. 1 GB. |
| **Nginx Reverse Proxy** | `nginx:alpine` | 128 MB | 0.25 OCPU | SSL termination (Let's Encrypt / Certbot), compresión Gzip/Brotli. |
| **Sistema Operativo & Buffers** | Ubuntu 24.04 LTS ARM | 2.00 GB | — | Margen reservado para el kernel Linux y page cache. |

**Balance de Carga y Recursos:**
- **Memoria Total Requerida:** ~6.6 GB.
- **Memoria Disponible en VM:** 12.0 GB.
- **Margen de Seguridad:** **45% de memoria libre** (~5.4 GB de holgura), lo que previene fallos por Out-Of-Memory (OOM-killer) bajo picos de carga.
- **Arquitectura de Procesador:** Todas las imágenes seleccionadas (`eclipse-temurin`, `redis`, `rabbitmq`, `nginx`) cuentan con soporte nativo de fábrica para `linux/arm64`.

### 3.2 Desacoplamiento de Servicios
- El frontend en Next.js se despliega en **Netlify** (Serverless Edge Global), eliminando el consumo de memoria en la VM de Oracle.
- Los procesos pesados de generación de PDF con marcas de agua dinámicas y despacho masivo de correos se delegan a **AWS Lambda**, protegiendo la VM de picos de CPU.

---

## 4. Dimensión 3: Viabilidad Económica y Sustentabilidad

De acuerdo con el desglose formal de `docs/01-planificacion/02-modelo-costos.md`:
- **Costo Operacional Base:** **USD 0.00 / mes**.
- **Costo de Contingencia / Egress / LLM RAG:** **USD 0.50 - 2.00 / mes**.
- **Cota Máxima Permitida:** **< USD 3.00 / mes**.

### Mitigación de Trampas de la Capa Gratuita:
1. **Pausa de Supabase a los 7 días de inactividad:**
   - *Mitigación:* Se implementa un health check sintético semanal programado mediante GitHub Actions (`cron`) o AWS EventBridge que ejecuta una consulta ligera (`SELECT 1`), manteniendo el proyecto despierto sin costo.
2. **Límite de 100 correos/día en Resend:**
   - *Mitigación:* Suficiente para la demanda esperada de reclutadores (~5-10 solicitudes diarias). El acceso tiene TTL de 48 horas y límite de 2 extensiones, lo que limita la frecuencia de generación de correos.
3. **Minutos de GitHub Actions en Repos Públicos:**
   - *Mitigación:* El repositorio se mantiene público. Esto otorga minutos de runner estándar gratuitos e ilimitados.

---

## 5. Matriz de Riesgos y Modos de Fallo

| Riesgo Identificado | Probabilidad | Impacto | Estrategia de Mitigación Implementada |
|---|:---:|:---:|---|
| **Fuga accidental de datos privados o clientes en repo público.** | Media | Crítico | **Cuádruple Barrera:** Hooks PreToolUse (`pretool-safety.mjs`), listas privadas gitignored (`.agents/rules/private/`), motor determinista `hv-rules.mjs` y pipeline bloqueante con `--require-lists`. |
| **Aumento de defectos por adopción intensiva de IA (DORA CFR).** | Alta | Alto | Skills revisores obligatorios por fase (`hv-review-code`), SonarQube-Zero, cobertura mínima de pruebas (≥80% líneas / ≥75% ramas) y análisis estático con `check-code-metrics.mjs`. |
| **Desincronización entre especificación y código (*Spec-drift*).** | Media | Medio | Metodología *Spec-Driven Development* y skill `sdlc-drift` para auditar coherencia entre contratos OpenAPI, ADRs y código fuente. |
| **Expiración de cuotas o cambios imprevistos en free tiers.** | Baja | Medio | Diseños basados en tecnologías estándar (PostgreSQL, Docker, Spring Boot) que permiten migrar a cualquier proveedor VPS (Hetzner, DigitalOcean) sin reescritura de código. |

---

## 6. Dictamen de Viabilidad

El proyecto es **TÉCNICAMENTE VIABLE**, **FINANCIERAMENTE SOSTENIBLE** dentro del objetivo fijado (< USD 3/mes), y **ESTRATÉGICAMENTE PERTINENTE** para los objetivos de carrera profesional como Líder Técnico.

Se aprueba el paso a la consolidación de la especificación funcional y el cronograma de entregas.
