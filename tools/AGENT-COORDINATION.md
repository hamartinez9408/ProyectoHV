# 🤝 Coordinación ZCode ↔ Antigravity

> Dos herramientas agénticas trabajan sobre este mismo repositorio.
> Este documento define **quién es dueño de qué** para que no se pisen.
>
> **Última actualización:** 2026-09-30

---

## Por qué existe este documento

Durante la primera sesión conjunta se detectaron **colisiones reales**:

| Qué pasó | Consecuencia |
|---|---|
| Ambas herramientas escribieron en `.zcode/` | Config con formato incompatible |
| Los hooks de una usaban nombres de herramientas de la otra | No disparaban |
| Ambas definieron reglas de seguridad por separado | Dos listas que iban a divergir |
| Antigravity estaba escribiendo mientras ZCode leía | Lecturas inconsistentes |

**Regla general:** el repositorio es compartido, pero **cada archivo tiene un dueño**. Donde se cruzan, hay un contrato explícito.

---

## Reparto de responsabilidades

### 🟦 ZCode — capa de ejecución y determinismo

| Artefacto | Por qué |
|---|---|
| `.zcode/config.json` | Wiring de hooks y MCP del lado ZCode |
| `.zcode/hooks/*.mjs` | Adaptadores del contrato PreToolUse de ZCode |
| `docs/01..06-*` | Framework SDLC, estrategia DevOps, modelo de costos, prácticas de IA |
| `docs/practicas-ia/` | Narrativa de gobernanza de IA (DORA/CFR) |
| `tools/MCP-REGISTRY.md` | Auditoría de dueño de cada MCP |
| `pipelines/` | Definición de CI/CD |

### 🟩 Antigravity — autoría y revisión por fase

| Artefacto | Por qué |
|---|---|
| `.agents/hooks.json` | Declaración de hooks del lado Antigravity |
| `.agents/skills/hv-review-*` | Un revisor por fase del SDLC (planning, requirements, architecture, code, testing, devops) |
| `.zcode/agents/hv-*.md` | Subagentes por capa (frontend, backend-spring, database, serverless, orchestrator, compliance) |
| `.agents/rules/*.md` | Los documentos de reglas |
| `.agents/skills/hv-career-pipeline/` | Pipeline de contenido y su validador |

### 🟨 COMPARTIDO — solo por contrato

Estos archivos los leen ambas herramientas. **No se reescriben sin avisar.**

| Artefacto | Contrato |
|---|---|
| **`.agents/scripts/hv-rules.mjs`** | **Motor único de reglas.** Ver abajo |
| `.agents/rules/private/*` | Listas privadas. Gitignored. Formato documentado en cada archivo |
| `AGENTS.md` | Instrucciones de workspace. **Solo se AÑADEN secciones**, nunca se reescribe |
| `.gitignore` | Solo se añaden entradas |
| `.agents/skills/hv-guardrails/` | Suite de guardrails que consume el motor |

---

## 🔑 El contrato central: un motor, dos adaptadores

```
                 .agents/scripts/hv-rules.mjs
                 (ÚNICA fuente de reglas)
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
 .zcode/hooks/       .agents/scripts/    .agents/skills/
 pretool-safety-     pretool-safety      hv-guardrails/
 zcode.mjs           .mjs                hv-career-pipeline/
        │                   │                   │
   PreToolUse ZCode    PreToolUse Antigravity   Validación
   (stdin JSON,        (toolCall,              de contenido
    exit 2)             stdout decision)
```

**Reglas del contrato:**

1. **Añadir una regla nueva = editarla SOLO en `hv-rules.mjs`.** Nunca en un adaptador.
2. Los adaptadores solo traducen: payload de entrada y dialecto de salida.
3. El motor es puro: no lee `stdin`, no escribe `stdout`, no conoce ninguna herramienta.
4. La interfaz pública es: `evaluate()`, `scanForbidden()`, `loadNeverAllowed()`,
   `loadProhibitedClients()`, `hasPrivateLists()`.

### Estados verificados

| Componente | Estado |
|---|---|
| Motor `hv-rules.mjs` | ✅ Funciona · rutas resueltas |
| Adaptador ZCode | ✅ 6/6 casos de prueba |
| Adaptador Antigravity | ✅ 3/3 casos de prueba |
| `run-guardrails.mjs` | ✅ Detecta y bloquea |
| `validate-career-data.mjs` | ✅ Detecta y bloquea |
| Frontmatter de 11 skills | ✅ Válido para ZCode (`name` coincide con la carpeta) |

---

## 🔐 El patrón de la lista privada

**Decisión de arquitectura, no de estilo:**

> El repositorio es **público**. Una lista de nombres prohibidos **hardcodeada en
> el repositorio ES la filtración que la lista pretende evitar.**

Esto se materializó de verdad: los tres guardas originales tenían los nombres de
clientes, la cédula y el año de nacimiento **escritos en el código**. El guard que
protegía la lista *era* la lista.

**Solución — los valores viven fuera del repositorio:**

| Archivo (gitignored) | Contenido | Env var para CI |
|---|---|---|
| `.agents/rules/private/prohibited-identifiers.txt` | Datos personales | `HV_PROHIBITED_IDENTIFIERS` |
| `.agents/rules/private/prohibited-clients.txt` | Nombres de clientes | `HV_PROHIBITED_CLIENTS` |
| `.agents/rules/private/sector-map.txt` | Mapa de anonimización | — (solo local) |

**Consecuencias de diseño:**

- En **CI** el archivo no existe → la lista se inyecta por variable de entorno
  desde un secret de GitHub Actions.
- Si no hay lista disponible, los guardas **lo dicen en voz alta** en lugar de
  dar un "OK" falso.
- Los mensajes de error identifican la entrada por **índice** (`cliente #3`),
  nunca por valor: repetir el nombre en el error sería la misma fuga.

---

## Protocolo de trabajo

### Antes de escribir
1. **Comprobar el dueño** en la tabla de arriba.
2. Si el archivo es COMPARTIDO: leerlo entero primero, y **añadir**, no reescribir.
3. Si es de la otra herramienta: **no tocarlo** sin decirlo.

### Al escribir
4. Las reglas de seguridad van SOLO en `hv-rules.mjs`.
5. Los valores prohibidos NUNCA en archivos versionados.
6. `AGENTS.md` y `.gitignore`: solo se añaden entradas.

### Después de escribir
7. Correr `node .agents/skills/hv-guardrails/scripts/run-guardrails.mjs <archivos>`.
8. Verificar que no se introdujeron nombres prohibidos.

---

## ⚠️ Limitaciones conocidas

| Limitación | Impacto | Mitigación |
|---|---|---|
| **El hook sobre `Bash` no inspecciona el contenido que un script escribe** | Un script podría escribir datos prohibidos sin ser bloqueado | El gate de guardrails (paso 7) lo detecta |
| **Los MCPs de scope de usuario ganan sobre los de workspace** | El config del workspace no puede ocultar servidores del usuario | Aislamiento estructural: los corporativos viven en otro workspace |
| **No hay control de versiones** | Un cambio destructivo es irreversible | `.agents/.backup-redaccion/` — **y hacer `git init` cuanto antes** |
| **Las reglas solo cubren Bash/Write/Edit** | Otras herramientas no pasan por el gate | Ampliar el matcher en `.zcode/config.json` |

---

## 🧹 Pendiente

- [ ] **`git init`** — es la mitigación más barata y aún no está hecha
- [ ] Borrar `.agents/.backup-redaccion/` cuando haya historial en git
- [ ] Evaluar si el nombre del producto del empleador también se protege
      (hoy está comentado en `prohibited-clients.txt`)
- [ ] Añadir un gate de guardrails al pipeline de CI con el secret correspondiente
- [ ] Confirmar en una sesión nueva que los 6 subagentes `hv-*` aparecen en
      el selector de ZCode
