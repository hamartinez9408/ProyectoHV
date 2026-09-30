# 🚀 Onboarding — reproducir el contexto del equipo

> **Objetivo:** que una persona nueva obtenga **los mismos resultados** que
> cualquiera del equipo, sin depender de configuración local no documentada.
>
> **Fase:** 3 · Implementación (es el primer paso antes de tocar código)

---

## El problema que resuelve

Trabajar con asistencia de IA significa que **el contexto del proyecto ya no es
solo el código**. Es también cómo el agente entiende el proyecto: sus reglas,
sus skills, sus guardas. Si eso vive en la máquina de cada uno, cada persona
obtiene resultados distintos y el equipo no es reproducible.

La pregunta correcta no es *"¿qué documento le paso?"* sino
**"¿qué viaja por git y qué no puede viajar?"**

## Las tres capas

| Capa | Artefactos | ¿Viaja por git? | Cómo se propaga |
|---|---|---|---|
| **1 · Contexto agentico** | `AGENTS.md` · `.agents/skills/**` · `.zcode/agents/*.md` · `.agents/scripts/hv-rules.mjs` · `.zcode/config.json` · `.agents/rules/*.md` | ✅ **Sí** | **Automático al clonar.** No hay paso manual |
| **2 · Integraciones (MCPs)** | Declaración de servidores | ⚠️ **Parcial** | Viaja el *manifiesto*, no la instalación → `tools/bootstrap.mjs` |
| **3 · Secretos y datos privados** | Tokens · listas de confidencialidad · `content/private/**` | 🚫 **Nunca** | Gestor de secretos / variables de entorno |

**La capa 1 es la más valiosa y no necesita ninguna acción.** Por eso skills,
reglas, hooks y subagentes se diseñaron como archivos versionados y no como
configuración de interfaz.

**La capa 2 es la brecha real.** Los MCPs no pueden vivir en el repositorio
porque contendrían secretos, y el config del workspace va a un repo **público**.
Se resuelve con un manifiesto declarativo + un script.

---

## Puesta en marcha

```bash
git clone <url> proyectohv
cd proyectohv
node tools/bootstrap.mjs        # aplica lo que pueda, reporta lo que falte
node tools/verify-context.mjs   # debe imprimir "CONTEXTO ÍNTEGRO"
```

**Tres comandos.** Si el último no imprime `CONTEXTO ÍNTEGRO`, el bootstrap te
dice qué falta y por qué.

### Qué hace `bootstrap.mjs`

1. **Recrea la junction** `.zcode/skills` → `.agents/skills`.
   Está gitignored a propósito: git atraviesa las junctions y guardaría los
   skills **dos veces**, con riesgo de que las copias diverjan.
   *No es bloqueante* — ZCode encuentra `.agents/skills` igual.
2. **Aplica los servidores MCP** del manifiesto al config de usuario,
   resolviendo secretos desde variables de entorno. Hace copia de seguridad
   del config antes de escribir. Es idempotente.
3. **Comprueba las listas privadas** y avisa si faltan.

### Qué hace `verify-context.mjs`

Comprueba 10 invariantes, y **falla con exit 1** si alguna requerida no se cumple.
Lo más importante: hace un **autotest del motor de reglas** leyendo los valores
**reales** de las listas privadas y verificando que los bloquea.

> No valida una copia del dato. Valida **el mecanismo**.
> Si alguien mueve una lista de sitio y el motor deja de leerla, esto lo detecta.

---

## Secretos que hay que aportar

Ninguno se guarda en el repositorio. Se leen del entorno en el momento del
bootstrap y se escriben **solo** en el config de usuario (`~/.zcode/cli/config.json`),
que está fuera del repo.

| Variable | Para qué | Cómo obtenerla | Permisos mínimos |
|---|---|---|---|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | `hv-github` | github.com/settings/personal-access-tokens | `Contents: RW` · `Pull Requests: RW` · `Metadata: RO` · `Actions: RO` |
| `SUPABASE_ACCESS_TOKEN` | `hv-supabase` | supabase.com/dashboard/account/tokens | — |
| `HV_PROHIBITED_IDENTIFIERS` | Guardas: datos personales | **No público** — pedirlo a Harold | — |
| `HV_PROHIBITED_CLIENTS` | Guardas: nombres de clientes | **No público** — pedirlo a Harold | — |

> 🔐 **`hv-github` tiene alternativa sin secreto.** El servidor oficial soporta
> OAuth: agrega `-p 127.0.0.1:8085:8085 -e GITHUB_OAUTH_CALLBACK_PORT=8085` y
> omite el PAT. Login una vez en el navegador, credencial solo en memoria.
> **No hay nada que guardar, filtrar ni rotar.**

> ⚠️ **Sin las listas privadas los guardas avisan pero no protegen.** No fallan
> en silencio: `run-guardrails.mjs` y `validate-career-data.mjs` imprimen una
> advertencia explícita. Es deliberado — un "OK" falso sería peor que un aviso.

---

## En CI

El archivo privado **no existe** en CI (está gitignored). Las listas se inyectan
por variable de entorno desde GitHub Actions Secrets:

```yaml
- name: Gate de guardrails
  env:
    HV_PROHIBITED_CLIENTS:     ${{ secrets.HV_PROHIBITED_CLIENTS }}
    HV_PROHIBITED_IDENTIFIERS: ${{ secrets.HV_PROHIBITED_IDENTIFIERS }}
  run: node .agents/skills/hv-guardrails/scripts/run-guardrails.mjs $(git diff --name-only origin/main...)
```

---

## Verificación rápida de que el contexto se comparte

| Capa | Cómo comprobarlo |
|---|---|
| Instrucciones | Abrir el repo y confirmar que el agente cita `AGENTS.md` |
| Skills | `verify-context.mjs` → "11 skills válidas" |
| Subagentes | Que `hv-frontend`, `hv-backend-spring`… aparezcan en el selector |
| Hooks | `verify-context.mjs` → "Hook PreToolUse cableado" |
| Motor de reglas | `verify-context.mjs` → autotest del motor |
| MCPs | `verify-context.mjs` → "MCPs requeridos instalados" |

---

## Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| El hook no dispara | `hooks.enabled` no es `true`, o el matcher no usa nombres de herramienta de ZCode | `verify-context.mjs` lo detecta y dice cuál de los dos es |
| Los skills no aparecen | Falta `.agents/skills/` o el frontmatter no tiene `name` que coincida con la carpeta | `verify-context.mjs` lista las skills inválidas |
| Los guardas dan "OK" sin proteger | Faltan las listas privadas | Es una advertencia explícita, no un silencio |
| `hv-github` no conecta | Docker no está corriendo | `docker version` |
| Skills duplicados en git | Se quitó `.zcode/skills/` del `.gitignore` | No debe versionarse: es una junction |

---

## Decisión humana

- **Qué decidió Harold:** que todo el contexto agentico sea versionado y
  verificable, y que los secretos queden fuera del repositorio.
- **Qué ejecutó la IA:** el manifiesto, los dos scripts y este documento.
- **Principio de diseño:** *"garantizar los mismos resultados" no se logra
  documentando, se logra verificando.* Por eso existe `verify-context.mjs` y no
  solo este README.
