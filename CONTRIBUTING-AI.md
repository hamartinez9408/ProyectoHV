# 🤖 CONTRIBUTING-AI — Cómo trabajar en este repositorio con asistencia de IA

> **Público:** cualquier persona —humana o agente— que vaya a tocar este repo.
> **Antes de esto:** ejecuta `npm run setup:ai` y `npm run verify:context`.
> Ver [ONBOARDING.md](../docs/03-implementacion/ONBOARDING.md).

---

## La premisa

La IA es **probabilística**. Las restricciones, los contratos y los gates son
**deterministas**.

Este repositorio no intenta que el modelo "se porte bien": intenta que **no
importe** si no lo hace. Todo lo que se puede verificar sin juicio, se verifica
sin juicio.

---

## La cuádruple barrera

Cada capa atrapa lo que la anterior dejó pasar.

```
┌─ CAPA 1 · CONTEXTO ───────────────────────────── INFORMATIVA ─┐
│  AGENTS.md · .agents/rules/ · .agents/skills/ · docs/         │
│  Define QUÉ hacer y CÓMO. Si el modelo la ignora...           │
└──────────────────────────────┬────────────────────────────────┘
                               ▼
┌─ CAPA 2 · HOOKS PRE-TOOL ───────────────── PREVENTIVA ────────┐
│  Intercepta ANTES de escribir en disco. Bloquea con exit 2.   │
│  A coste 0 de tokens del modelo. Si algo logra pasar...       │
└──────────────────────────────┬────────────────────────────────┘
                               ▼
┌─ CAPA 3 · REVISORES + SCRIPTS ───────────── DETERMINISTA ─────┐
│  run-guardrails.mjs · hv-review-* · check-code-metrics.mjs    │
│  Audita el artefacto ya escrito. Si alguien fuerza un commit..│
└──────────────────────────────┬────────────────────────────────┘
                               ▼
┌─ CAPA 4 · CI/CD GATES ──────────────────── DEFENSA FINAL ─────┐
│  GitHub Actions: el pipeline bloquea el merge.                │
│  ⚠️  PENDIENTE de implementar — ver "Estado real" abajo.      │
└───────────────────────────────────────────────────────────────┘
```

### Estado real de cada capa

| Capa | Estado | Dónde |
|---|---|---|
| 1 · Contexto | ✅ Operativa | `AGENTS.md`, `.agents/`, `docs/` |
| 2 · Hooks | ✅ Operativa y probada | `.zcode/config.json` (ZCode) · `.agents/hooks.json` (Antigravity) |
| 3 · Revisores | ✅ Operativa | `.agents/skills/hv-review-*`, `hv-guardrails` |
| 4 · CI/CD | ⚠️ **Documentada, no implementada** | `.github/workflows/` |

> **Decirlo importa.** Una barrera que crees tener y no tienes es peor que
> saber que no la tienes. La capa 4 es lo único que impide que una violación
> llegue a `main` por la vía de "funciona en mi máquina".

---

## Cómo empieza una sesión

| Herramienta | Qué lee | Qué la activa |
|---|---|---|
| **ZCode** | `AGENTS.md` + `.zcode/config.json` + `.agents/skills/` + `.zcode/agents/` | Abrir el workspace. Los hooks requieren `hooks.enabled: true` |
| **Antigravity** | `AGENTS.md` (desde v1.20.5) + `.agents/rules/` + `.agents/skills/` | Abrir el workspace |

> ⚠️ **`GEMINI.md` no existe a propósito.** Si necesitas reglas específicas de
> Antigravity, créalo — tiene prioridad sobre `AGENTS.md`. Pero **no dupliques**
> ahí lo que ya está en `AGENTS.md`: solo las diferencias.

> ⚠️ **`AGENTS.md` está cerca del límite de 12.000 caracteres** que Antigravity
> impone por archivo de reglas. Cuando se acerque, mueve detalle a
> `.agents/rules/` en lugar de recortar reglas.

---

## Ciclo de una historia de usuario

Cada fase tiene un revisor determinista. Úsalos **antes** de dar algo por bueno.

| Fase | Revisor | Qué verifica |
|---|---|---|
| 1 · Planificación | `hv-review-planning` | Viabilidad, modelo de costos, línea base DORA, `Decisión humana` |
| 2 · Requisitos | `hv-review-requirements` | INVEST, BDD/Gherkin, COSMIC/SNAP, DoR |
| 3 · Arquitectura | `hv-review-architecture` | C4, Clean Architecture, **modelo de amenazas STRIDE** |
| 4 · Código | `hv-review-code` | Métricas por método/clase, RFC 9457, `@Valid`, TS strict |
| 5 · Pruebas | `hv-review-testing` | Pirámide, cobertura ≥80%/≥75%, **casos de borde del TTL 48 h** |
| 6 · DevOps | `hv-review-devops` | Gates de CI, Docker multi-stage, rollback, observabilidad |

### Antes de abrir un Pull Request

```bash
npm run guardrails        # audita lo que cambió
npm run verify:context    # confirma que tu entorno es el del equipo
```

Un PR que no pasa `guardrails` no se revisa.

---

## Evolución de las reglas

Tres reglas sobre cómo se cambian las reglas:

1. **Las reglas de seguridad viven SOLO en `.agents/scripts/hv-rules.mjs`.**
   Los adaptadores (`.zcode/hooks/`, `.agents/scripts/pretool-safety.mjs`) solo
   traducen payloads. Añadir una regla en un adaptador la deja fuera del otro
   adaptador y del CI — exactamente el bug que este diseño existe para evitar.

2. **Los valores prohibidos NUNCA en archivos versionados.** El repositorio es
   público. Una lista hardcodeada aquí *es* la filtración que la lista previene.
   Viven en `.agents/rules/private/` (gitignored) o en variables de entorno.

3. **`AGENTS.md` y `.gitignore` son de solo adición.** Nunca se reescriben sin
   avisar: son compartidos por las dos herramientas y por toda persona nueva.

---

## La regla que ninguna herramienta puede verificar

**Todo artefacto del SDLC termina con una sección `Decisión humana`:**

```markdown
## Decisión humana
- **Qué decidió la persona:** ...
- **Qué ejecutó la IA:** ...
- **Alternativas descartadas y por qué:** ...
```

Ningún script lo comprueba, y no es un olvido: **es lo único que separa "lo
hice" de "lo generé"**. Un portafolio construido por IA que su autor no puede
defender en una entrevista es un pasivo, no un activo.

Las cuatro capas protegen el repositorio. Esta protege a la persona.

---

## Decisión humana

- **Qué decidió Harold:** adoptar este modelo de barreras y exigir el campo
  `Decisión humana` en todo artefacto.
- **Qué ejecutó la IA:** el diseño de las capas, los scripts y este documento.
- **Origen del marco:** propuesta de Gemini (Antigravity), evaluada contra el
  estado real del repositorio antes de adoptarla. Se descartaron dos
  afirmaciones suyas que habrían reintroducido bugs ya corregidos — ver
  [`AGENT-COORDINATION.md`](AGENT-COORDINATION.md).
