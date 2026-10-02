# Fase 2 · Diseño y Arquitectura — ProyectoHV

> *Arquitectura de Software · Modelo C4 · Seguridad STRIDE · Contratos OpenAPI · Modelo de Datos & RLS · ADRs*
>
> **Decisión humana**
> - **Qué decidió Harold:** Diseñar una arquitectura limpia y distribuida con microservicios Java 21 desacoplados, gobierno estricto de seguridad en la base de datos (PostgreSQL RLS para el TTL de 48 h), contratos API formales bajo RFC 9457, y documentación viva de arquitectura como artefacto auditable del portafolio.
> - **Qué ejecutó la IA:** Elaboración del modelo C4 multinivel, modelado relacional y vectorial de persistencia, análisis sistemático de amenazas STRIDE para el flujo de acceso, especificación OpenAPI 3.1 y formalización de 6 ADRs fundacionales.
> - **Riesgo técnico asumido conscientemente:** Mantener múltiples esquemas y runtimes de base de datos (PostgreSQL relacional y vectorial en Supabase + MongoDB Atlas para auditoría inmutable + Redis para caching y rate limiting) exige disciplina estricta de aislamiento de puertos y adaptadores.
> - **Alternativas descartadas:** Arquitectura monolítica única sin microservicios; delegación de la seguridad temporal a tokens JWT efímeros en la UI; almacenamiento de auditoría en tablas mutables de Postgres sin aislamiento forense.

---

## 1. Propósito de esta Fase

La Fase 2 transforma los requerimientos y restricciones de viabilidad definidas en la [Fase 1 (Planificación)](../01-planificacion/) en especificaciones técnicas de ingeniería, planos arquitectónicos y contratos formales listos para ser implementados en la [Fase 3](../03-implementacion/).

Al igual que todo el proyecto, este paquete de diseño **es su propio exhibit**: demuestra cómo un Líder Técnico estructura el diseño de software moderno garantizando alta cohesión, bajo acoplamiento, seguridad en profundidad y defensibilidad técnica ante auditorías rigurosas.

---

## 2. Mapa de Documentos de Diseño

| Documento | Enfoque Principal | Estado |
|---|---|---|
| [`01-arquitectura-c4.md`](01-arquitectura-c4.md) | Vistas C4 (Contexto, Contenedores, Componentes, Código) y patrones hexagonales | 🟢 Completo |
| [`02-modelo-datos.md`](02-modelo-datos.md) | Esquemas PostgreSQL (`access`, `content`), políticas RLS, MongoDB y Redis | 🟢 Completo |
| [`03-modelo-amenazas-stride.md`](03-modelo-amenazas-stride.md) | Análisis STRIDE exhaustivo para el flujo Magic Link 48h, mitigaciones y controles | 🟢 Completo |
| [`04-contratos-api.md`](04-contratos-api.md) | Especificaciones OpenAPI 3.1, endpoints REST y RFC 9457 `ProblemDetail` | 🟢 Completo |
| [`09-estrategia-ramas-flujo-trabajo.md`](09-estrategia-ramas-flujo-trabajo.md) | Estrategia de 3 ramas (`desarrollo`, `pruebas`, `main`), concurrencia multi-agente/humana y Quality Gate SonarQube | 🟢 Completo |
| [Catálogo de ADRs](adr/) | Decisiones Arquitectónicas Registradas (ADR-001 a ADR-007) | 🟢 Completo |

---

## 3. Catálogo de Decisiones de Arquitectura (ADRs)

Las decisiones estructurales clave del proyecto se encuentran versionadas en [`adr/`](adr/):

1. **[ADR-001](adr/ADR-001-arquitectura-hexagonal-servicios.md):** Adopción de Arquitectura Hexagonal (Ports & Adapters) para Microservicios Java 21 Spring Boot.
2. **[ADR-002](adr/ADR-002-autorizacion-ttl-48h-rls-postgresql.md):** Autorización y control de expiración de 48 h gobernado exclusivamente por PostgreSQL RLS.
3. **[ADR-003](adr/ADR-003-validacion-dns-mx-asincrona.md):** Verificación asíncrona de registros DNS MX para correos corporativos vía RabbitMQ.
4. **[ADR-004](adr/ADR-004-busqueda-hibrida-pgvector-mongodb.md):** Búsqueda semántica híbrida con pgvector y desacoplamiento de auditoría en MongoDB Atlas.
5. **[ADR-005](adr/ADR-005-marca-agua-dinamica-pdf.md):** Generación y estamping forense de marca de agua dinámica en exportación de CV.
6. **[ADR-006](adr/ADR-006-estandar-errores-rfc9457.md):** Estandarización de errores HTTP en APIs mediante RFC 9457 ProblemDetail.
7. **[ADR-007](adr/ADR-007-estrategia-ramas-aprobacion-sonar.md):** Modelo de Tres Ramas Protegidas (`desarrollo`, `pruebas`, `main`) con Aprobación Mandatoria de PRs y Disparo Automático de SonarQube.
8. **[ADR-008](adr/ADR-008-estrategia-multi-ci-jenkinsfile-enterprise.md):** Estrategia Multi-CI (GitHub Actions + Jenkinsfile Enterprise como Exhibit de Ingeniería).

---

## 4. Criterios de Aceptación y Gate de Salida (DoD Fase 2)

Para autorizar el inicio de la Fase 3 (Implementación), este paquete debe satisfacer la rúbrica de [`hv-review-architecture`](../../.agents/skills/hv-review-architecture/SKILL.md):

- [x] **Límites de Clean Architecture respetados:** Dominio Java libre de dependencias a frameworks y DB.
- [x] **Auditoría STRIDE 6/6 mitigada:** Ninguna amenaza en rojo; control de 48 h independiente de la UI.
- [x] **ADRs estandarizados:** 7 ADRs con 4 campos de decisión humana y alternativas descartadas.
- [x] **Contratos OpenAPI con RFC 9457:** Errores consistentes con ProblemDetail para todos los servicios.
- [x] **Modelado de Persistencia Completo:** DDL SQL con RLS estricto y cuotas de memoria/CPU verificadas.
- [x] **Estrategia de Ramas y Quality Gate SonarQube:** 3 ramas base con aprobación obligatoria y disparo de Sonar al aprobar PR en `desarrollo`.
- [ ] **Validación Humana de Harold:** Firma y aprobación para iniciar codificación.
