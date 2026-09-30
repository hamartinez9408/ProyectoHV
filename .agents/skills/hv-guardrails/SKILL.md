---
name: hv-guardrails
description: Deterministic compliance and quality validator for ProyectoHV. Audits changed files against Regla #0 (zero corporate references), the perfil-maestro blacklist, TypeScript strictness (no any), and mandatory RLS in SQL migrations. Use before committing, creating pull requests, or when auditing project compliance.
---

# HV-GUARDRAILS — Validador Determinista de Calidad y Cumplimiento

Este skill ejecuta verificaciones deterministas a costo cero de tokens de modelo, interceptando violaciones antes de que lleguen al repositorio o a la fase de pruebas.

## Reglas Evaluadas
1. **Regla #0 y Lista Negra**:
   - Detección de identificadores personales (cédula, correo antiguo, etc.).
   - Detección de clientes corporativos, leída desde la lista privada en tiempo de ejecución.
2. **TypeScript Estricto**:
   - Detección de uso de tipo `any` en archivos `.ts` y `.tsx`.
   - Detección de llamadas a `console.log()` en código de frontend.
3. **Seguridad en Base de Datos**:
   - Validación de que toda migración en `supabase/migrations/*.sql` active explícitamente `ENABLE ROW LEVEL SECURITY`.

## Ejecución

### Para validar archivos modificados en Git:
```bash
node .agents/skills/hv-guardrails/scripts/run-guardrails.mjs
```

### Para auditar archivos específicos:
```bash
node .agents/skills/hv-guardrails/scripts/run-guardrails.mjs web/src/app/page.tsx supabase/migrations/20261001_init.sql
```
