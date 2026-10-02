# ADR-008: Estrategia Multi-CI (GitHub Actions + Jenkinsfile Enterprise como Exhibit de Ingeniería)

> **Fase:** 2 · Diseño y Arquitectura  
> **Estado:** Aceptado  
> **Relacionado:** [`ADR-007`](ADR-007-estrategia-ramas-aprobacion-sonar.md) · [`ADR-001`](ADR-001-arquitectura-hexagonal-servicios.md) · [`03-estrategia-devops.md`](../../01-planificacion/03-estrategia-devops.md)
>
> **Decisión humana**
> - **Qué decidió Harold:** Adoptar una estrategia Multi-CI (Opción 2): mantener GitHub Actions como motor operativo en la nube para compuertas automáticas y despliegues productivos a costo cero, pero incorporar un pipeline declarativo empresarial en `pipelines/Jenkinsfile` con Configuration as Code (JCasC en `infra/jenkins/`) y entorno reproducible local / on-demand (`npm run jenkins:up`), demostrando dominio técnico de los estándares de integración y despliegue continuo de la gran empresa (banca y telecomunicaciones) sin comprometer los límites de memoria de la máquina virtual Always Free de Oracle Cloud (< USD 3/mes).
> - **Qué ejecutó la IA:** Especificación del `Jenkinsfile` declarativo con las 5 compuertas bloqueantes, configuración JCasC (`jenkins.yaml`), receta Docker Compose con contención de recursos, scripts de orquestación en `package.json` y sincronización con Confluence.
> - **Riesgo técnico asumido conscientemente:** Mantenimiento dual de definiciones de CI (GitHub Actions YAML y Jenkinsfile Groovy), mitigado al desacoplar la lógica de validación en scripts deterministas reutilizables (`run-guardrails.mjs`, `./mvnw verify`, `sonar-gate.mjs`) que ambos motores invocan de manera idéntica.
> - **Alternativas descartadas:**
>   1. *Jenkins 24/7 en la VM de Oracle:* Descartado porque el controller JVM + agentes consumirían entre 2.0 y 3.0 GB de RAM permanente, reduciendo el margen seguro de los tres microservicios Spring Boot dentro del límite de 12 GB RAM y exponiendo un puerto web vulnerable sin WAF corporativo.
>   2. *Exclusividad de GitHub Actions (sin Jenkins):* Descartado porque limitaría el portafolio a herramientas SaaS modernas, privando al autor de evidenciar su experiencia técnica de liderazgo en entornos corporativos heredados o híbridos de alta criticidad.
>   3. *Runners self-hosted en la VM:* Descartado porque desde el 1-mar-2026 tienen cobro de $0.002/min en repositorios privados y en repositorios públicos introducen riesgos de ejecución arbitraria desde forks.

---

## 1. Contexto

ProyectoHV busca posicionar a Harold Augusto Rodríguez Martínez como Líder Técnico (Tech Lead). En la industria tecnológica colombiana y latinoamericana, existe una marcada dualidad en el ecosistema DevOps:

1. **Startups y proyectos nativos en la nube:** Prefieren GitHub Actions o GitLab CI por su integración nativa, facilidad de gestión y ausencia de infraestructura dedicada.
2. **Empresas consolidadas, banca, aseguradoras y telecomunicaciones:** Operan mayoritariamente pipelines basados en **Jenkins**, con servidores autohospedados, agentes distribuidos, *Jenkinsfiles* declarativos o scripteados en Groovy, y estricta gobernanza corporativa.

Un Tech Lead completo debe dominar ambos paradigmas. Sin embargo, el proyecto cuenta con una restricción económica inviolable: un costo operativo **< USD 3.00/mes**, operando sobre una máquina virtual de Oracle Cloud Infrastructure (OCI Always Free) con 2 OCPU y 12 GB de RAM.

Mantener un Jenkins Controller encendido las 24 horas del día consumiendo 2 GB de memoria heap para un portafolio personal rompería el equilibrio de la VM, donde residen `access-service`, `cv-service`, `search-service`, RabbitMQ, Redis y Nginx.

---

## 2. Alternativas Evaluadas

### Alternativa 1: Jenkins 24/7 en la Nube (Oracle VM)
- **Ventajas:** Todo el ciclo de compilación se orquesta dentro de un servidor centralizado visible públicamente.
- **Desventajas:** Consumo permanente de 2.0 a 3.0 GB de RAM (17-25% de la capacidad de la VM); riesgo de seguridad al exponer el puerto 8080 en internet público; picos de CPU durante compilaciones Maven que degradarían la latencia de las APIs ante reclutadores.

### Alternativa 2: Exclusividad en GitHub Actions
- **Ventajas:** Cero consumo de RAM en la VM; minutos gratuitos e ilimitados en repositorio público; cero mantenimiento de parches de seguridad del motor de CI.
- **Desventajas:** No expone el dominio de Groovy, Jenkinsfiles declarativos, JCasC ni plugins de integración continua empresarial.

### Alternativa 3: Estrategia Multi-CI (GitHub Actions en Cloud + Jenkinsfile Enterprise On-Demand / Exhibit) — [ELEGIDA]
- **Ventajas:**
  - **Eficiencia y Costo Cero:** GitHub Actions orquesta las compuertas de PRs y despliegues en la nube de forma transparente y gratuita.
  - **Exhibit de Maestría Enterprise:** El repositorio incluye `pipelines/Jenkinsfile` con sintaxis declarativa avanzada, 5 compuertas bloqueantes, Testcontainers, SonarQube Quality Gate y rollback automático.
  - **Reproducibilidad Inmediata:** Mediante `infra/jenkins/` y *Jenkins Configuration as Code (JCasC)*, cualquier evaluador o desarrollador puede levantar un Jenkins idéntico en local con `npm run jenkins:up`.
  - **Consistencia Arquitectónica:** No hay lógica embebida en los motores; tanto GitHub Actions como Jenkins invocan los mismos scripts deterministas desacoplados (`run-guardrails.mjs`, `./mvnw`, `sonar-gate.mjs`).

---

## 3. Decisión

Se aprueba formalmente la **Estrategia Multi-CI con Jenkinsfile Enterprise**:

1. **Motor Operativo Primario (Cloud):**
   - GitHub Actions continúa como el orquestador de CI/CD para producción, pruebas de PRs y despliegues atómicos (Netlify y Oracle VM vía SSH/Docker).
2. **Definición de Pipeline Enterprise (`pipelines/Jenkinsfile`):**
   - Implementa un pipeline declarativo estricto en Groovy compuesto por 5 compuertas:
     - **Gate 0:** Guardrails deterministas de confidencialidad y Regla #0.
     - **Gate 1:** Compilación en paralelo (Java 21 con Maven y TypeScript estricto con `tsc`).
     - **Gate 2:** Pruebas unitarias e integración en contenedores efímeros con Testcontainers y JaCoCo.
     - **Gate 3:** Compuerta estática de SonarQube mediante `withSonarQubeEnv` y `waitForQualityGate()`.
     - **Gate 4:** Empaquetado seguro en Docker multi-etapa con usuario sin privilegios (`USER appuser`).
     - **Gate 5:** Despliegue con sondeo activo de salud HTTP (12 intentos / 60s).
   - **Post Actions:** Reversión automática inmediata mediante script real `infra/scripts/deploy-with-rollback.sh` (restaurando el tag Docker anterior) si el health check o cualquier compuerta falla.
   - **Activación Progresiva:** Las etapas de microservicios (`services/`) contienen validaciones defensivas sin enmascaramiento de errores (`|| true`), activándose orgánicamente en el Slice 2.
3. **Pila de Infraestructura Reproducible (`infra/jenkins/`):**
   - Se crea `docker-compose.yml` limitado a 2 GB RAM y 1.5 CPUs.
   - Se configura `jenkins.yaml` bajo el estándar JCasC para pre-aprovisionar credenciales, variables y el job automático apuntando a `pipelines/Jenkinsfile`.
4. **Comandos de Ciclo de Vida:**
   - `npm run jenkins:up`: Inicia el controlador Jenkins localmente.
   - `npm run jenkins:down`: Detiene y limpia el entorno.
   - `npm run jenkins:status`: Verifica la salud y disponibilidad del servicio.

---

## 4. Consecuencias

### Positivas
- **Impacto Curricular Dual:** El proyecto demuestra versatilidad absoluta: agilidad moderna cloud-native (GHA) y robustez de orquestación empresarial (Jenkins).
- **Protección de Presupuesto y Hardware:** La máquina virtual de producción permanece liviana, fresca y disponible para responder tráfico HTTP de demostración.
- **Inmutabilidad de Configuración:** Al usar JCasC, no existe configuración oculta manual; todo el setup de Jenkins vive versionado en git.

### Negativas / Costes
- Cualquier cambio en la arquitectura de compilación debe reflejarse tanto en los workflows de `.github/workflows/` como en `pipelines/Jenkinsfile`.
- La ejecución local de Jenkins requiere tener Docker instalado en el entorno de desarrollo.
