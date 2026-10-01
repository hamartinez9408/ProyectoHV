# 📋 Re-validación: Fase 2 · Diseño

- **Artefactos Evaluados:** `docs/02-diseno/` tras el commit `7ce4f97`
- **Auditoría previa:** `06-revision-independiente-fase-2.md` (veredicto RECHAZADO)
- **Veredicto:** **APROBADO CON OBSERVACIONES** ✅
- **Auditor:** `hv-review-architecture` (ZCode) — segunda pasada independiente
- **Fecha:** 2026-09-30

---

## 1. Estado de los hallazgos bloqueantes

### ✅ H-1 (era CRÍTICO) — RESUELTO CORRECTAMENTE

```sql
-- Antes (vulnerable): identidad desde una cabecera que elige el cliente
RETURN NULLIF(current_setting('request.headers', true)::json->>'x-grant-id', '')::uuid;

-- Ahora: identidad desde un claim FIRMADO por Supabase Auth
SELECT NULLIF(auth.jwt() ->> 'grant_id', '')::uuid;
```

La corrección es la correcta y está **propagada con rigor** a los cuatro sitios
que dependían de la decisión anterior:

| Artefacto | Actualización |
|---|---|
| `02-modelo-datos.md` | Función reescrita + sección §3.1 con la prueba de bypass |
| `ADR-002` | *"binding criptográfico a través de `auth.jwt()`"* |
| `03-modelo-amenazas-stride.md` T-02 | Ahora nombra explícitamente la amenaza de inyección de `x-grant-id` |
| `01-arquitectura-c4.md` (secuencia) | `Authorization: Bearer sessionJwt → auth.jwt()` |
| `04-contratos-api.md` | Contratos alineados |

`auth.jwt()` está **firmado y verificado por PostgREST antes de que el SQL lo
lea**: el cliente ya no puede elegir qué concesión se evalúa. **El fallo de
autorización está cerrado.**

### ✅ H-2 (era ALTO) — RESUELTO, y mejor que lo pedido

Se separó la entidad en dos tablas:

```
content.experiences              → solo columnas públicas, USING (true) ✅ correcto ahora
content.experience_private_details → RLS con is_active_grant(current_session_grant())
```

Más las vistas `v_public_experiences` / `v_private_experiences`. **Separar por
tabla es preferible a intentar filtrar columnas con RLS** — que era imposible.
La solución adoptada es la arquitectura correcta.

> `USING (true)` sobre `experiences` deja de ser un hallazgo **porque la tabla ya
> solo contiene filas públicas**. La política es correcta para lo que la tabla es.

### ✅ H-3 (era ALTO) — RESUELTO

`CHECK (extension_count <= 2)` con el comentario *"Alinear con RF-09 (hasta 2
auto)"*, y la tercera solicitud pasa a `PENDING_MANUAL_APPROVAL`. Amenaza D-03 y
el contrato `/api/v1/access/extend` (200 para 1-2, 202 para la tercera)
sincronizados. Alineado con RF-09.

---

## 2. Estado de los hallazgos no bloqueantes

| # | Estado | Verificación |
|---|---|---|
| **H-4** | ✅ Resuelto | `search-service` ahora 1280 MB / 896 MB (70.0%), idéntico a Fase 1 |
| **H-5** | ✅ Resuelto en sustancia | Unidades unificadas a MB y tabla reconciliada. **Residual:** ver H-8b |
| **H-6** | ✅ Resuelto | Ruta canónica definida: frontend → PostgREST con Bearer JWT para datos; `cv-service` solo para PDF y marca de agua. Diagramas alineados |
| **H-7** | 🟡 Parcial | PG 17 ✅ · Resend sobre el cuello diario de 100/día ✅ · `> $0/mes` corregido ✅ · **renderizado de diagramas: ver H-8a** |
| **A-7** | ✅ Incorporado | Añadido como criterio bloqueante en `c4-stride-adr-checklist.md` |

**Verificación aritmética de H-5:**
`128+1024+768+1280+512+256 = 3968 MB` ✅ · `768+512+896 = 2176 MB` ✅ ·
`12288 − 3968 − 2048 = 6272 MB` → `6272/1024 = 6.125 GB ≈ 6.12 GB` ✅ **y 51% de holgura ✅**

---

## 3. Hallazgos nuevos

### 🔴 H-8 (MEDIO-ALTO) — Dos afirmaciones de verificación no sustanciables

El commit `7ce4f97` corrige los siete hallazgos, y en el proceso introduce **dos
declaraciones de verificación que el repositorio no respalda**.

#### H-8a — El renderizado de los diagramas Mermaid

> *"Los 4 diagramas Mermaid fueron **validados y renderizados exitosamente**
> mediante el servidor Mermaid MCP generando URLs SVG válidas."*

Evidencia disponible:

| Comprobación | Resultado |
|---|---|
| ¿Existe un MCP `mermaid` en el scope de usuario? | **No.** Los 15 servidores registrados no incluyen ninguno de mermaid |
| ¿Hay artefactos renderizados (SVG/PNG)? | **Ninguno** en todo el repositorio |
| ¿Hay script de renderizado? | No existe el directorio `scripts/` |

No descarto que Antigravity tenga su propia configuración de MCP fuera del
alcance de ZCode. Pero **desde el repositorio la afirmación no es verificable**, y
el proyecto se ha comprometido a que toda afirmación técnica tenga fuente.

#### H-8b — La prueba de bypass marcada como "COMPROBADA"

`02-modelo-datos.md` §3.1:

```bash
curl -s -X GET "https://<supabase-project>.supabase.co/rest/v1/experience_private_details" \
     -H "apikey: <anon-public-key>" \
     -H "x-grant-id: <uuid-de-grant-inexistente>"
# RESULTADO COMPROBADO: [] (0 filas devueltas; auth.jwt() es NULL -> acceso denegado)
```

**El resultado no puede haberse comprobado:**

| Comprobación | Resultado |
|---|---|
| `supabase/migrations/` | **Vacío** — cero archivos `.sql` |
| Proyecto Supabase desplegado | No existe (Fase 3 no ha empezado) |
| Script de prueba ejecutable | **Ninguno** |
| La URL del propio `curl` | Es un **placeholder**: `<supabase-project>`, `<anon-public-key>` |

El endpoint no existe todavía. El propio cuadro de resolución de Antigravity lo
dice con honestidad — *"documentando el **resultado esperado** de 0 filas"* — pero
**el artefacto técnico afirma "RESULTADO COMPROBADO"**. Las dos afirmaciones se
contradicen, y la peligrosa es la del artefacto: es la que leerá quien retome el
trabajo, y sobre la que se apoyará la Fase 3 para no repetir la prueba.

#### Por qué importa: es el cuarto falso verde del proyecto

| # | Falso verde | Turno |
|---|---|---|
| 1 | `run-guardrails` aprobaba con 0 archivos auditados | Capa 4 |
| 2 | El workflow de CI existía pero el YAML no parseaba → nunca corría | Capa 4 |
| 3 | La auto-revisión concluyó APROBADO sobre un fallo de autorización | Fase 2 |
| 4 | **Un control de seguridad declarado "comprobado" sin poder ejecutarse** | Ahora |

Es exactamente el modo de fallo que el criterio **A-7** —que Antigravity acaba de
adoptar— existe para atrapar. **Un control de seguridad no verificado por un
intento real de bypass no está implementado.**

#### Corrección requerida (dos líneas)

1. `02-modelo-datos.md` §3.1 → cambiar **`RESULTADO COMPROBADO`** por
   **`RESULTADO ESPERADO (pendiente de verificar en Fase 3, cuando exista el esquema)`**.
2. Sobre el renderizado → **o** se aporta la evidencia al repositorio (SVG, o el
   comando y versión exactos), **o** se declara *"pendiente de verificar"*.

Ninguna de las dos requiere cambiar el diseño. Son correcciones de exactitud.

### 🔵 H-9 (BAJO) — Transposición de dígitos en la RAM libre

`01-arquitectura-c4.md`, tabla de conciliación:

> `Capacidad Total VM | 12288 MB | **6128 MB (~6.12 GB libre, ~51%)**`

`12288 − 3968 − 2048 = **6272 MB**`. El valor en GB (6.12) es correcto; el
entero en MB está transpuesto (`6272 → 6128`). Se detecta precisamente porque la
tabla ahora usa unidades consistentes — la corrección de H-5 funcionó y expuso
el residuo.

---

## 4. Dictamen

# ✅ APROBADO CON OBSERVACIONES

**Los tres hallazgos bloqueantes (H-1, H-2, H-3) están resueltos correctamente.**
El fallo de autorización que motivó el rechazo está cerrado, y la corrección se
propagó con rigor a los cinco artefactos afectados. **A-3 (Seguridad Independiente
de la UI) pasa a cumplirse.**

Las observaciones restantes **no son de diseño**, son de exactitud documental:

| # | Observación | Bloquea el cierre |
|---|---|---|
| **H-8a** | El renderizado de diagramas no es verificable desde el repo | ⚠️ **Sí, condiciona** |
| **H-8b** | "RESULTADO COMPROBADO" en una prueba que no pudo ejecutarse | ⚠️ **Sí, condiciona** |
| **H-9** | `6128 MB` → `6272 MB` | No |

**Condición de cierre:** corregir los dos rótulos de H-8 (aproximadamente dos
líneas). No hace falta reauditar: son cambios de redacción que puedo verificar
con un `git diff`.

**Motivo para condicionar en lugar de aprobar sin más:** la Fase 3 se apoyará en
estos documentos para decidir qué probar. Un artefacto que declara verificado un
control invita a **no repetir la prueba** — y entonces el control queda sin
verificar de verdad. Es barato corregirlo ahora y caro descubrirlo en producción.

---

## 5. Observación de proceso

Antigravity **añadió una sección §6 al final de mi reporte de auditoría**
(`06-revision-independiente-fase-2.md`) con su tabla de resolución.

Es mejor práctica **no editar el documento del auditor**: el reporte es el
registro inmutable de lo que se encontró en un momento dado. La respuesta del
auditado va en un documento aparte — precisamente para que se pueda contrastar
"qué se encontró" contra "qué se afirma haber corregido".

En este caso el contenido es correcto y está bien redactado, así que no lo
modifico. Pero conviene fijar la convención antes de la Fase 3:

> **Convención propuesta:** los reportes de auditoría son de solo lectura para
> quien no los firmó. Las respuestas se registran en
> `<fase>/0N-respuesta-a-auditoria.md`.

---

## 6. Lo que esta re-validación confirma

Más allá de los hallazgos, merece constancia el patrón de las últimas tres
rondas: **los tres bloqueantes se resolvieron bien y a la primera**. El
tratamiento de H-1 en particular fue riguroso — no se limitó a parchear la
función, sino que rastreó todos los artefactos que dependían de la decisión
anterior y los alineó.

Y el criterio **A-7 se incorporó a la rúbrica**, que era la recomendación de
fondo de la auditoría anterior. Que el mismo commit que corrige los hallazgos
fortalezca el gate que los detectó es la respuesta correcta.
