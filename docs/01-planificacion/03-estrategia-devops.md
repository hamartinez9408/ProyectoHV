# Estrategia DevOps — pipelines y despliegue automático

> **Fase:** 1 · Planificación (se define aquí) — se construye en 3, se activa en 5,
> se opera en 6.
>
> **⚠️ Este documento es el DISEÑO. El estado de implementación vive en
> [`pipelines/README.md`](../../pipelines/README.md).**
> Resumen: la **Capa 4** (gates de calidad y confidencialidad) está
> implementada; los pipelines **A–D** de los componentes están diseñados y
> bloqueados hasta que exista código en sus carpetas.
>
> **Decisión humana**
> - **Qué decidió Harold:** incluir DevOps dentro de la planificación, exigir
>   despliegue automático por pipeline, y que todo gate **bloquee** en vez de
>   informar.
> - **Qué ejecutó la IA:** diseño de los 4 pipelines, selección de gates bloqueantes,
>   verificación de cuotas de capa gratuita y flujo de rollback automatizado.
> - **Riesgo técnico asumido conscientemente:** acoplamiento del pipeline de despliegue
>   a la disponibilidad de GitHub Actions y runners públicos; riesgo de falsos positivos
>   en gates estrictos (0 warnings ESLint, Jacoco ≥80%, SonarCloud 0 issues) que bloqueen
>   entregas, mitigado mediante ejecución local idéntica previa (`pre-commit` y scripts reproducibles).
> - **Alternativas descartadas:** self-hosted runner en la VM Oracle (desde 1-mar-2026 cobra
>   en repos privados y en públicos expone la VM a forks, ver §6); pipelines permisivos con
>   warnings no bloqueantes.

---

## 0. Principio

DevOps no es una fase: es una **propiedad del sistema de entrega**. Se planea en
1, se construye en 3, se activa en 5 y se opera en 6. Documentarlo solo en
planificación produce un documento que nadie ejecuta.

| Fase | Rol |
|---|---|
| **1 · Planificación** | Definir pipelines, gates, entornos y **línea base DORA** |
| **2 · Diseño** | Entornos como parte de la arquitectura · IaC · gestión de secretos |
| **3 · Implementación** | **CI**: corre en cada PR y **bloquea el merge** si un gate falla |
| **4 · Pruebas** | Los gates de test **son** pasos del pipeline. E2E contra preview |
| **5 · Despliegue** | **CD**: despliegue automático + health check + rollback automático |
| **6 · Mantenimiento** | Bucle: alerta → issue → fix → deploy. DORA en dashboards |

---

## 1. Los 4 pipelines

### A · Frontend — Next.js → Netlify

| | |
|---|---|
| **Dispara** | PR y push a `main` que toquen `web/**` |
| **Gates** | `tsc --noEmit` · ESLint · unit tests · cobertura ≥80% |
| **Entrega** | PR → **preview deploy** · `main` → producción |

```yaml
# .github/workflows/web.yml
name: web
on:
  pull_request:
    paths: ['web/**']
  push:
    branches: [main]
    paths: ['web/**']

jobs:
  ci:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: web } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: web/package-lock.json }
      - run: npm ci
      - run: npx tsc --noEmit          # gate: tipos
      - run: npx eslint . --max-warnings=0   # gate: lint
      - run: npm test -- --coverage    # gate: cobertura ≥80%
      - run: npm run build
```

### B · Microservicios Java → VM Oracle

Este pipeline **es** la demostración de "mínima interrupción".

| | |
|---|---|
| **Dispara** | push a `main` con cambios en `services/**` |
| **Gates** | unit · integración (Testcontainers) · cobertura ≥80% · SonarCloud 0 issues |
| **Entrega** | Imagen → GHCR → `docker compose pull && up -d` → **health check** → rollback si falla |

```yaml
# .github/workflows/services.yml
name: services
on:
  push:
    branches: [main]
    paths: ['services/**']

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '21', cache: maven }

      - run: mvn -B verify                 # unit + integración (Testcontainers)
      - name: Gate de cobertura
        run: mvn -B jacoco:check           # falla si <80%
      - name: Gate SonarCloud
        run: mvn -B sonar:sonar -Dsonar.qualitygate.wait=true -Dsonar.host.url=https://sonarcloud.io
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

      - name: Build y push de imagen
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker build -t ghcr.io/${{ github.repository }}/access-service:${{ github.sha }} services/access-service
          docker push ghcr.io/${{ github.repository }}/access-service:${{ github.sha }}

  deploy:
    needs: ci
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Desplegar
        run: |
          ssh deploy@${{ secrets.ORACLE_HOST }} "cd /opt/proyectohv && \
            docker compose pull && docker compose up -d"

      - name: Health check
        id: health
        run: |
          for i in $(seq 1 12); do
            curl -fsS https://api.<dominio>/health && exit 0
            sleep 5
          done
          exit 1

      - name: Rollback automático
        if: failure()
        run: |
          ssh deploy@${{ secrets.ORACLE_HOST }} \
            "cd /opt/proyectohv && docker compose up -d --rollback-previous"
          # dispara evento access.deploy.rollback → alerta en Grafana

      - name: Anotar despliegue en Grafana
        if: success()
        run: ./infra/scripts/grafana-annotate.sh "${{ github.sha }}"
```

> ⚠️ Los pasos 8 y 9 del diseño (§1) — health check y anotación — **son** la
> demostración. Sin ellos, "mínima interrupción" es una afirmación sin respaldo.

### C · Migraciones Supabase

| | |
|---|---|
| **Dispara** | cambios en `supabase/migrations/**` |
| **Gates** | migraciones corren limpias desde cero en Postgres efímero |
| **Entrega** | **`pg_dump` previo** → `db push` → dump como artefacto |

```yaml
# .github/workflows/db.yml
name: db
on:
  push:
    branches: [main]
    paths: ['supabase/migrations/**']

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: latest }

      # Gate: las migraciones deben correr limpias desde cero
      - run: supabase db start && supabase db reset
        working-directory: .

      # 🔴 OBLIGATORIO: Supabase free tiene 0 días de retención de backups
      - name: Dump previo a migrar
        run: |
          pg_dump "${{ secrets.SUPABASE_DB_URL }}" \
            --format=custom --file=pre-migration-${{ github.sha }}.dump

      - run: supabase db push
        env: { SUPABASE_ACCESS_TOKEN: '${{ secrets.SUPABASE_ACCESS_TOKEN }}' }

      - uses: actions/upload-artifact@v4
        with:
          name: pre-migration-dump
          path: pre-migration-*.dump
          retention-days: 90
```

> 🔴 **El dump no es opcional.** Supabase free tiene **retención de backups de
> 0 días**. El contenido vive en git, pero **solicitudes, grants y auditoría solo
> existen en Supabase.** Sin dump previo, una migración fallida los borra sin retorno.

### D · Lambda AWS

| | |
|---|---|
| **Dispara** | cambios en `functions/**` |
| **Gates** | unit tests + build |
| **Entrega** | `sam deploy` con **OIDC federado** |

```yaml
# .github/workflows/functions.yml
permissions:
  id-token: write      # OIDC — sin claves estáticas
  contents: read

jobs:
  deploy:
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/gha-proyectohv
          aws-region: us-east-1
      - run: sam build && sam deploy --no-confirm-changeset
```

---

## 2. Gates — bloquean, no informan

| Gate | Umbral | Dónde |
|---|---|---|
| `tsc --noEmit` | 0 errores | A, B |
| ESLint | 0 warnings | A |
| Cobertura | ≥80% líneas · ≥75% branches | A, B |
| SonarCloud | **0 issues nuevos en New Code** | A, B |
| Guard de cumplimiento | 0 violaciones fatales | A, B |
| Integración (Testcontainers) | 100% verde | B |
| Migraciones desde cero | corren limpias | C |
| Health check post-deploy | responde en <60 s | B |
| E2E | flujos críticos verdes | A |

> 💡 **SonarCloud SaaS:** Se utiliza SonarCloud (SaaS oficial gratuito para proyectos open-source) en lugar de una instancia autohospedada de SonarQube en la VM Oracle, protegiendo los ~6.1 GB de RAM libre de la máquina para los microservicios.

**Un pipeline que avisa pero no bloquea no es un pipeline: es un reporte.**

---

## 3. Métricas DORA

| Métrica | Qué mide | Objetivo del proyecto | Cómo se mide sola |
|---|---|---|---|
| **Deployment Frequency** | Cada cuánto despliega | Élite: a demanda | Runs exitosos del pipeline B por semana |
| **Lead Time for Changes** | Commit → producción | **< 24 h** | Primer commit del PR → deploy exitoso |
| **Change Failure Rate** | % de deploys que rompen | **< 5%** | Deploys con rollback o hotfix / total |
| **Failed deployment recovery time (MTTR)** | Tiempo de restauración tras fallo | **< 1 h** (rollback auto < 2 min) | Alerta o fallo health check → rollback/hotfix verificado |

> **Línea base inicial (Baseline):** Al tratarse de un desarrollo Greenfield, la línea base histórica es cero / no medida. La **línea base formal se establecerá con la entrega del primer slice vertical** (Slice 1, Shell público e infraestructura base desplegada a producción), registrando los primeros valores reales de Lead Time y tiempo de recuperación como punto de partida para contrastar las mejoras a lo largo de los Slices 2 al 5.
>
> Las bandas varían entre fuentes (investigación DORA/Accelerate vs. reporte
> LinearB 2026, que mide 8.1 M de PRs). **Citar la fuente que se use, sin mezclar.**

**Se miden desde GitHub Actions + el log de despliegues, y se publican en un
dashboard de Grafana.** Muy pocos candidatos tienen un DORA dashboard propio.

---

## 4. Entornos

| Entorno | Dónde | Datos | Cuándo |
|---|---|---|---|
| **Local** | Docker Compose | Sintéticos | Desarrollo |
| **Preview** | Netlify preview | Sintéticos | Cada PR |
| **Producción** | Netlify + VM Oracle + Supabase | Reales | Merge a `main` |

⚠️ **Supabase free permite 2 proyectos activos** y **pausa a los 7 días sin
actividad**. Por eso las migraciones se validan contra un Postgres efímero en
CI (Docker, gratis e ilimitado) en lugar de mantener un proyecto de staging
permanentemente despierto.

---

## 5. Secretos

| Secreto | Dónde vive | Nunca |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | GitHub Actions Secrets | en disco ni en el repo |
| `SUPABASE_DB_URL` | GitHub Actions Secrets | idem |
| `ORACLE_HOST` / SSH key | GitHub Actions Secrets | idem |
| SMTP (Resend) | Supabase Auth settings | idem |
| AWS | **OIDC federado — sin clave estática** | idem |

**OIDC en lugar de claves de larga vida.** Es la lección directa del PAT
corporativo encontrado en texto plano: las credenciales estáticas en archivos
son el problema, no la excepción.

---

## 6. Decisión: runner hosted, no self-hosted

**Descartado:** self-hosted runner en la VM Oracle.

Motivo verificado: **desde el 1-mar-2026 GitHub cobra $0.002/min por runners
self-hosted en repos privados**, y consumen la cuota gratuita. Ya no son gratis.
Además, GitHub desaconseja runners self-hosted en repos públicos (un PR de fork
ejecutaría código en la VM).

**Elegido:** GitHub-hosted runners sobre **repositorio público** → minutos
**ilimitados y gratuitos**. El código es el exhibit, así que el repo público no
es un costo: es el objetivo.

> ⚠️ **Consecuencia obligatoria:** con el repo público, el contenido privado
> **no puede** commitearse. Ver `content/` y el `.gitignore`.

---

## 7. Lo que hay que construir para poder documentar esto

- [ ] Protección de rama `main`: PR obligatorio + checks requeridos
- [ ] Conventional Commits → changelog y versionado automáticos
- [ ] `infra/` — `docker-compose` + playbook Ansible para la VM Oracle
- [ ] Script de anotación en Grafana
- [ ] Dashboard DORA en Grafana
- [ ] Job programado de purga por retención (Ley 1581)
- [ ] **Probar el rollback de verdad** — romper a propósito y documentarlo
