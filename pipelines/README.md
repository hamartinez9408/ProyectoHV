# ⚙️ Pipelines — CI/CD de ProyectoHV

> **Convención de este directorio:** aquí vive la **lógica** de los gates;
> `.github/workflows/` solo la **orquesta**. Un workflow debe poder leerse en
> 30 segundos: si tiene lógica de validación embebida, está en el sitio
> equivocado.

---

## Estado real

| Pipeline | Definición | Workflow | Estado |
|---|---|---|---|
| **Capa 4 · Guardrails** | este directorio | `.github/workflows/guardrails.yml` | ✅ **Implementado** |
| **SonarQube Quality Gate** | `pipelines/checks/sonar-gate.mjs` | `.github/workflows/sonar-pr-approval.yml` | ✅ **Implementado** |
| A · Frontend (Next.js → Netlify) | `docs/01-planificacion/03-estrategia-devops.md` | — | ⏸️ Bloqueado |
| B · Microservicios (Java → VM Oracle) | idem | — | ⏸️ Bloqueado |
| C · Migraciones Supabase | idem | — | ⏸️ Bloqueado |
| D · Lambda (AWS) | idem | — | ⏸️ Bloqueado |

### Por qué A–D están bloqueados, y no simplemente pendientes

Están **diseñados** — los cuatro, con sus gates, en
[`docs/01-planificacion/03-estrategia-devops.md`](../docs/01-planificacion/03-estrategia-devops.md).
No están implementados porque **sus carpetas aún no tienen código**:
`web/`, `services/`, `functions/` y `supabase/` están vacías.

> Un pipeline que no puede correr en verde es **peor que no tenerlo**: entrena
> al equipo a ignorar el rojo. Cuando el rojo deja de significar algo, el
> semáforo completo deja de significar algo.
>
> Por eso se crean **cuando exista el componente**, no antes.

**Criterio de activación** — cada uno arranca cuando su carpeta tenga el
manifiesto de build:

| Pipeline | Se activa cuando exista |
|---|---|
| A · Frontend | `web/package.json` |
| B · Microservicios | `services/*/pom.xml` |
| C · Migraciones | `supabase/migrations/*.sql` |
| D · Lambda | `functions/*/pom.xml` o `template.yaml` |

---

## Capa 4 — lo que sí está implementado

`guardrails.yml` corre tres jobs, todos de segundos de duración (solo Node, sin
build):

| Job | Qué verifica | Bloquea |
|---|---|---|
| **Confidencialidad** | Nombres de clientes, datos personales y reglas técnicas en **todo el árbol** | ✅ |
| **Integridad de contexto** | Skills válidas, subagentes, hooks cableados y **autotest del motor de reglas** | ✅ |
| **Convención de commits** | Conventional Commits en los commits del PR | ✅ (solo PRs) |

### Las dos banderas que importan

```bash
node .agents/skills/hv-guardrails/scripts/run-guardrails.mjs --all --require-lists
```

- **`--all`** — audita **todo el árbol versionado**, no solo el diff. Un cambio
  puede volver tóxico un archivo que nadie tocó en ese PR.
- **`--require-lists`** — sin las listas privadas, **falla** en lugar de avisar.

> La segunda es la más importante. En local, una lista ausente produce un aviso:
> hay una persona leyéndolo. **En CI no hay nadie leyendo**, y un check verde es
> una *afirmación* de seguridad. Un verde que no verificó confidencialidad
> afirma algo que nunca comprobó.

---

## 🔴 Lo que falta para que la barrera bloquee de verdad

**El workflow no bloquea nada por sí solo.** Solo *reporta*. Lo que impide un
merge es una regla de protección de rama — y eso es una configuración de GitHub,
no un archivo del repositorio.

### Checklist de activación de protección de ramas (3 niveles)

- [ ] **Crear el repositorio remoto** y hacer `git push` de las 3 ramas (`main`, `pruebas`, `desarrollo`).
- [ ] **Definir los secrets** en *Settings → Secrets and variables → Actions*:
      `HV_PROHIBITED_CLIENTS` · `HV_PROHIBITED_IDENTIFIERS` · `SONAR_TOKEN` · `SONAR_HOST_URL`
- [ ] **Protección de rama `desarrollo`**:
      - Require a pull request before merging
      - Require 1 approval before merging
      - **Require status checks to pass** → `SonarQube Quality Gate` + `guardrails`
- [ ] **Protección de rama `pruebas`**:
      - Require a pull request before merging
      - Require approval before merging (QA / Lead)
      - **Require status checks to pass** → `guardrails`
- [ ] **Protección de rama `main`**:
      - Require a pull request before merging
      - Require approval before merging (exclusivo Harold)
      - **Require status checks to pass** → `guardrails` + checks de CD
- [ ] **Verificar que bloquea**: abrir un PR hacia `desarrollo` y validar que el merge queda bloqueado hasta que SonarQube evalúe el Quality Gate en verde.

---

## Secretos que consume el pipeline

Ninguno vive en el repositorio. Se inyectan por variable de entorno desde
GitHub Actions Secrets.

| Secret | Para qué | Sin él |
|---|---|---|
| `HV_PROHIBITED_CLIENTS` | Nombres de clientes a bloquear | **El pipeline falla** (`--require-lists`) |
| `HV_PROHIBITED_IDENTIFIERS` | Datos personales a bloquear | idem |
| `SONAR_TOKEN` | Token de SonarCloud para CI | **El workflow falla** con mensaje explicativo |
| `SONAR_HOST_URL` | URL del servidor Sonar (opcional en CI) | Toma por defecto `https://sonarcloud.io` |
| `SONAR_ORGANIZATION` | Organización en SonarCloud (opcional) | Toma por defecto `hamartinez9408` |
| `SONAR_PROJECT_KEY` | Clave de proyecto en SonarCloud (opcional) | Toma por defecto `hamartinez9408_ProyectoHV` |

Formato: valores separados por **coma o salto de línea**, igual que en los
archivos locales.

---

## Añadir un gate nuevo

1. Escribe la lógica en `pipelines/checks/<nombre>.mjs`.
   - **Exit 0** = pasa · **Exit ≠ 0** = bloquea.
   - Mensajes de error que digan **qué hacer**, no solo qué falló.
2. Añade un job en `.github/workflows/guardrails.yml` que lo invoque.
3. Añádelo a la checklist de protección de rama (si no, no bloquea).

### Regla de diseño de los gates

**No hardcodees valores prohibidos.** El repositorio es público: un valor
escrito en un gate *es* la filtración que el gate persigue. Lee las listas desde
el motor compartido:

```js
import { scanForbidden } from '../../.agents/scripts/hv-rules.mjs'
```

---

## Decisión humana

- **Qué decidió Harold:** implementar la Capa 4 y activar la Fase 1 al quedar
  materializada.
- **Qué ejecutó la IA:** el workflow, el check de convención y este documento.
- **Decisión de alcance:** **no** implementar los pipelines A–D todavía. Se
  documentan y se dejan con criterio de activación explícito, en lugar de crear
  workflows que fallarían en cada ejecución.
- **Alternativa descartada:** crear A–D como *placeholders* que no hacen nada.
  Un job que siempre pasa es peor que un job ausente: ocupa espacio en la
  interfaz y transmite una cobertura que no existe.
