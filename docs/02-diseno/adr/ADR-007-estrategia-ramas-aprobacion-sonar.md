# ADR-007: Modelo de Tres Ramas Protegidas (desarrollo, pruebas, main) con Aprobación Mandatoria de PRs y Disparo Automático de SonarQube

> **Fase:** 2 · Diseño y Arquitectura  
> **Estado:** Aceptado  
> **Relacionado:** [`ADR-001`](ADR-001-arquitectura-hexagonal-servicios.md) · [`ADR-006`](ADR-006-estandar-errores-rfc9457.md) · [`09-estrategia-ramas-flujo-trabajo.md`](../09-estrategia-ramas-flujo-trabajo.md)
>
> **Decisión humana**
> - **Qué decidió Harold:** Adoptar un modelo de flujo de trabajo basado en tres ramas persistentes y protegidas (`desarrollo`, `pruebas`, `main`), requerir aprobación obligatoria de Pull Requests en cada transición para simular una célula de ingeniería real con agentes de IA y humanos concurrentes, y condicionar la integración a `desarrollo` a la ejecución automática de SonarQube disparada al recibir la aprobación del PR.
> - **Qué ejecutó la IA:** Redacción formal del ADR, definición de los eventos de orquestación en GitHub Actions (`pull_request_review` con `state: approved`), especificación de las políticas de rama y formalización de criterios de Quality Gate.
> - **Riesgo técnico asumido conscientemente:** Mayor tiempo total de integración de cambios simples (Lead Time for Changes) debido a la compuerta de aprobación humana/agéntica y el tiempo de escaneo de SonarQube (~1 a 2 minutos), balanceado por una tasa de fallo de despliegue (Change Failure Rate) inferior al 1% y protección absoluta contra regresiones.
> - **Alternativas descartadas:** Trunk-based development directo en `main` sin ramas intermedias; GitFlow tradicional con ramas intermedias de release y hotfix desacopladas que generan alta burocracia de merges; compuerta permisiva de SonarQube donde los code smells solo generan alertas informativas sin bloquear el merge.

---

## 1. Contexto

ProyectoHV opera como una demostración de excelencia en ingeniería de software. Un equipo de desarrollo profesional moderno no permite que múltiples contribuidores (humanos o agentes de IA autónomos) suban código directamente a la rama de producción (`main`) ni a ramas de integración compartidas sin validación de pares y análisis estático determinista.

Adicionalmente, el proyecto incorpora agentes de inteligencia artificial especializados (`hv-frontend`, `hv-backend-spring`, `hv-database`, etc.) trabajando concurrentemente. Sin una topología de ramas clara y compuertas automáticas de aprobación, existe riesgo de:
1. Sobrescritura de cambios entre agentes y humanos.
2. Degradación progresiva de la base de código por falta de inspección estática (aparición de tipos `any`, métodos extensos, complejidad cognitiva desbordada o deuda técnica).
3. Despliegues precipitados a producción sin haber pasado por una fase formal de homologación y pruebas de integración.

---

## 2. Alternativas Evaluadas

### Alternativa 1: Trunk-Based Development Puro (Ramas efímeras directo a `main`)
- **Ventajas:** Ciclo de entrega extremadamente rápido; sin ramas de larga vida; mínimo riesgo de conflictos de merge diferidos.
- **Desventajas:** No ofrece una zona de estabilización para pruebas E2E multi-servicio antes de tocar producción; no simula la estructura corporativa de separación de ambientes (`desarrollo` → `pruebas` → `producción`); riesgoso cuando múltiples agentes de IA generan cambios sustanciales simultáneos.

### Alternativa 2: GitFlow Clásico (Master, Develop, Feature, Release, Hotfix, Support)
- **Ventajas:** Estricto control de versiones históricas; aislamiento prolongado de releases.
- **Desventajas:** Alta complejidad accidental; sobrecarga de sincronización bidireccional entre ramas `release` y `develop`; retrasa la integración continua de los agentes de IA con el núcleo del sistema.

### Alternativa 3: Modelo Protegido de Tres Ramas con PRs y Quality Gate SonarQube (ELEGIDA)
- **Ventajas:**
  - Estructura limpia y comprensible: `desarrollo` (integración continua), `pruebas` (QA / staging) y `main` (producción).
  - Bloqueo total de push directo en las tres ramas.
  - Aprobación requerida de Pull Request en los 3 niveles.
  - Al aprobarse un PR hacia `desarrollo`, se dispara automáticamente el análisis de SonarQube. Si el Quality Gate falla, el PR queda bloqueado impidiendo la contaminación de la rama de integración.
  - Simula fielmente el ciclo de vida y los controles de un entorno empresarial de alto nivel.
- **Desventajas:** Requiere configurar políticas de protección en el repositorio remoto y mantener la consistencia de secretos de SonarQube en el pipeline.

---

## 3. Decisión

Se adopta el **Modelo Protegido de Tres Ramas (`desarrollo`, `pruebas`, `main`) con Aprobación Mandatoria de PRs y Disparo de SonarQube**:

1. **Ramas Permanentes**:
   - `desarrollo`: Rama de integración activa.
   - `pruebas`: Rama de homologación y validación de suites completas de QA.
   - `main`: Rama de producción estable.
2. **Prohibición de Push Directo**:
   - Diseñada para operar de forma obligatoria en el repositorio remoto mediante Branch Protection Rules en GitHub. En el andamiaje inicial local (commits 1 a 22), los cambios se integraron en `main`; el flujo estricto de 3 ramas entra en vigor operativo a partir del Slice 1.3 con el primer PR hacia `desarrollo`.
3. **Flujo de PRs y Aprobaciones**:
   - Para integrar en `desarrollo`: PR desde `feature/*` o `bugfix/*` + al menos 1 aprobación técnica.
   - Para integrar en `pruebas`: PR desde `desarrollo` + aprobación de QA / Lead.
   - Para integrar en `main`: PR desde `pruebas` + aprobación exclusiva de Harold.
4. **Compuerta Automática de SonarQube**:
   - La aprobación de un PR con destino `desarrollo` (`pull_request_review` con `state: approved`) gatilla de manera inmediata el workflow de SonarQube.
   - El Quality Gate evalúa 0 bugs, 0 vulnerabilidades, 0 code smells críticos, duplicación < 3% y TypeScript estricto sin `any`. La condición bloqueante de cobertura mínima (≥ 75%) se formaliza en el Slice 4 tras la implementación de la suite de pruebas unitarias y de integración. Si el Quality Gate falla, el merge queda bloqueado hasta que el autor resuelva las observaciones.

---

## 4. Consecuencias

### Positivas
- **Garantía de Calidad Determinista:** El código nunca ingresa a la rama de integración si contiene problemas estáticos, violaciones de tipos o falta de cobertura.
- **Gobernanza de Agentes de IA:** Los subagentes operan como desarrolladores junior/mid que proponen PRs; el Tech Lead humano o un agente de compliance mantiene el control de lo que se fusiona.
- **Trazabilidad Total:** Todo cambio en producción cuenta con el rastro: `feature` → PR aprobado a `desarrollo` con reporte Sonar → PR aprobado a `pruebas` → PR aprobado a `main`.

### Negativas / Costes
- Requiere disciplina para no saltarse el proceso de PRs ni siquiera en cambios pequeños de documentación o configuración.
- El escaneo de SonarQube añade un tiempo de procesamiento que debe tenerse en cuenta en el flujo de trabajo ágil.
