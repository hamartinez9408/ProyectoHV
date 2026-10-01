# 📋 Reporte de Auditoría Independiente: Fase 2 · Diseño

- **Artefactos Evaluados:** `docs/02-diseno/` — 4 documentos + 6 ADRs + README
- **Commit auditado:** `1e4d67b`
- **Veredicto:** **RECHAZADO** 🔴
- **Auditor:** `hv-review-architecture` (ejecutado por ZCode — **auditoría independiente**, no auto-revisión)
- **Fecha:** 2026-09-30

---

## 0. Nota metodológica

Existe ya un reporte `05-revision-fase-2.md` firmado por el **mismo agente que
produjo los artefactos**, y concluye *"APROBADO — no se detectan hallazgos
bloqueantes ni inconsistencias"*.

En términos de auditoría eso es una **auto-revisión**, y su resultado no puede
aceptarse como evidencia. Esta revisión es independiente y llega a la conclusión
opuesta. Los hallazgos de §2 son verificables con el código y las tablas que
siguen.

---

## 1. Evaluación de Criterios

| # | Criterio | Veredicto | Detalle |
|---|---|---|---|
| **A-1** | Límites Clean / Hexagonal | ✅ Cumple | §3 define puertos in/out y adaptadores; §4.1 prohíbe `org.springframework.*`, `jakarta.persistence.*`, `com.mongodb.*`, `io.lettuce.*` en `domain`. `ADR-001` lo formaliza |
| **A-2** | Modelo de amenazas STRIDE | 🟡 **Cumple con reserva** | Los 6 vectores cubiertos con 14 amenazas (S-01..03, T-01..03, R-01..02, I-01..03, D-01..03, E-01..02) y matriz DREAD. **Pero las mitigaciones de T y E no se sostienen en el diseño real — ver H-1** |
| **A-3** | Seguridad independiente de la UI | 🔴 **NO CUMPLE** | La política RLS confía en un **header HTTP enviado por el cliente**. Un `USING (true)` en `content.experiences` tampoco aísla nada |
| **A-4** | Calidad y estandarización de ADRs | ✅ Cumple | Los 6 ADRs tienen alternativas (≥2), consecuencias y 4 campos de `Decisión humana`. Formato homogéneo |
| **A-5** | Contratos API y RFC 9457 | ✅ Cumple | `04-contratos-api.md` con OpenAPI 3.1, `application/problem+json` y `correlationId`; respaldado por `ADR-006` |
| **A-6** | Conciliación de recursos | 🟡 **Cumple con reserva** | CPU corregida (1.40 de 2.00 → 30% libre) ✅. Pero **contradice la Fase 1** en `search-service` y la cifra de RAM libre no reconcilia — ver H-3 |

**Falla A-3, que es bloqueante (T y E del checklist STRIDE).**

---

## 2. Hallazgos

### 🔴 H-1 (CRÍTICO / BLOQUEANTE) — La autorización se toma de un header del cliente

`docs/02-diseno/02-modelo-datos.md`, función que gobierna todo el acceso privado:

```sql
CREATE OR REPLACE FUNCTION access.current_session_grant()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.headers', true)::json->>'x-grant-id', '')::uuid;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

Y las políticas que dependen de ella:

```sql
CREATE POLICY p_compensation_grant_read ON content.compensation_details
    FOR SELECT TO authenticated
    USING (access.is_active_grant(access.current_session_grant()));
```

**El identificador de concesión se lee de un header HTTP que envía el cliente.**

#### Por qué es explotable

1. **`request.headers` en PostgREST refleja las cabeceras de la petición.** Las
   cabeceras personalizadas (`x-grant-id`) las elige quien llama, no el servidor.
2. **El `grantId` se entrega al cliente por diseño.** El diagrama de secuencia
   (`01-arquitectura-c4.md`, línea 335) responde
   `200 OK {grantId, email, expiresAt, sessionSecret}`. Y el Threat Model R-01
   declara que la auditoría en MongoDB guarda el *"ID de grant"*.
   Es decir: el secreto circula por respuesta HTTP, historial del navegador,
   cabecera `Referer` y registros de auditoría.
3. **No hay binding criptográfico alguno.** El `sessionSecret` que el diagrama
   devuelve y guarda en cookie **no lo usa ninguna política RLS**. Es decorativo.
4. **La ruta de lectura agrava el problema:** el diagrama de secuencia muestra
   `Web->>PG` — el frontend consulta Postgres **directamente**, así que el header
   sale del navegador. Cualquiera con el `grantId` lo reproduce con un `curl`.

#### Por qué invalida el modelo de amenazas

| Declaración del diseño | Realidad |
|---|---|
| **T-02:** *"El cliente nunca gobierna el tiempo… la expiración se evalúa exclusivamente en PostgreSQL"* | Cierto para el **tiempo**. **Falso para la identidad**: el cliente elige *qué* concesión se evalúa |
| **E (checklist):** *"La seguridad reside en la base de datos"* | La base de datos **delega** la decisión en un valor que no controla |
| **A-3 (auto-revisión):** *"Inmune a alteraciones en cliente"* | **Falso por construcción** |

El uso de SHA-256 y tokens de 256 bits protege el **token del enlace mágico**,
no el `x-grant-id` posterior. El diseño confunde ambos mecanismos.

#### Corrección requerida

La identidad debe derivarse de un valor **firmado**, nunca de una cabecera
arbitraria:

```sql
-- El claim viaja dentro del JWT firmado por Supabase Auth: no es falsificable.
CREATE OR REPLACE FUNCTION access.current_session_grant()
RETURNS UUID AS $$
    SELECT NULLIF(auth.jwt() ->> 'grant_id', '')::uuid;
$$ LANGUAGE sql STABLE;
```

El reclamo del enlace mágico debe emitir una sesión de Supabase Auth cuyo JWT
lleve `grant_id` como claim personalizado. **`auth.jwt()` está firmado y
verificado por PostgREST antes de que el SQL lo lea.**

> **Verificación obligatoria:** tras el cambio, probar con `curl` enviando
> `x-grant-id` arbitrario y confirmar que **devuelve 0 filas**. Un control de
> seguridad no verificado por un intento de bypass no está implementado.

---

### 🔴 H-2 (ALTO) — `content.experiences` con `USING (true)` no aísla nada

```sql
CREATE POLICY p_experiences_public_read ON content.experiences
    FOR SELECT TO anon, authenticated
    USING (true);
```

El comentario dice *"Lectura pública: Solo campos públicos"*, pero **RLS filtra
filas, no columnas**. Si la tabla contiene la trayectoria completa y la versión
anónima convive con campos detallados en las mismas filas, esta política expone
**todo**.

Con dos niveles de acceso y una misma entidad `experiences`, esto es
exactamente el escenario a evitar.

**Corrección:** separar por fila (`visibility = 'public' | 'private'` en el
`USING`) o exponer una **vista** que proyecte solo columnas públicas. RLS sola no
puede hacerlo.

---

### 🔴 H-3 (ALTO) — D-03 contradice el requisito aprobado RF-09

| Fuente | Política de extensiones |
|---|---|
| **RF-09** (Fase 1, aprobada) | *"hasta un máximo de **dos (2)** extensiones… La **tercera** solicitud debe requerir **aprobación manual**"* |
| **D-03** (Fase 2) | *"`extension_count <= 1`. **Solo se permite una única extensión**… máximo total 96 h"* |

Fase 2 **reduce de 2 a 1 extensión** y **elimina el flujo de aprobación manual**,
sin documentar el cambio. Pasa de ~6 días máximos a 4.

Además, la justificación de D-03 (*"para evitar acceso perpetuo"*) ya estaba
resuelta por el tope de 2 con compuerta manual: la contención no requería
recortar la política.

**Corrección:** alinear con RF-09 (`extension_count <= 2` + estado
`pending_approval` para la tercera) o tramitar la reducción como cambio de
requisito explícito.

---

### 🟠 H-4 (MEDIO) — `search-service` se contradice entre fases

| Documento | Límite RAM | Heap | % |
|---|---|---|---|
| **Fase 1** `01-analisis-viabilidad.md` | **1.25 GB** | **896 MB** | 70.0% |
| **Fase 2** `01-arquitectura-c4.md` | **1024 MB** | **768 MB** | 75.0% |

Ambas cifras son internamente coherentes, pero **no coinciden entre sí**. Los
otros cinco contenedores sí concuerdan. La reducción de heap en el servicio que
hace búsqueda vectorial queda sin justificación escrita.

Consecuencia: el total de contenedores cambia (3.71 GB con Fase 2 vs 3.875 GB con
Fase 1), así que la conciliación de recursos de A-6 se calcula sobre números
distintos según qué documento se lea.

**Corrección:** fijar un valor único y propagarlo. Es un cambio a una decisión de
Fase 1 ya aprobada — debe ser deliberado y documentado.

---

### 🟡 H-5 (BAJO) — La RAM libre no reconcilia, y se mezclan unidades

Tabla de §2, `01-arquitectura-c4.md`:

```
Total Contenedores      1.40 OCPU    3.71 GB
Host Linux + Docker     0.60 libre   ~2.00 GB
Capacidad Total VM      2.00 OCPU    12.00 GB RAM    ~6.1 GB libre (~51%)
```

- **CPU:** 1.40 de 2.00 → 0.60 libres = **30%** ✅ correcto (H-1 de Fase 1 resuelto)
- **RAM:** `3.71 + 2.00 = 5.71 GB usado` → `12.00 − 5.71 = **6.29 GB libre**`.
  El documento declara **6.1 GB**. No reconcilia (≈190 MB).
- **Unidades mezcladas:** los límites suman 3712 **MiB** pero se rotulan
  `3.71 GB` (decimal, 3712/1000) mientras la capacidad se rotula `12.00 GB`
  (binario). El heap acumulado presenta el mismo patrón (`2048 MiB → 2.05 GB`).

Es el mismo tipo de deslizamiento que H-2 de la Fase 1, en menor magnitud.

---

### 🟡 H-6 (BAJO) — Dos caminos distintos para la misma lectura privada

- **Diagrama de contenedores:** `cv-service` → *"Lee perfil privado validado por RLS"* → Postgres
- **Diagrama de secuencia:** `Web` → `SELECT * FROM content.private_profile` → Postgres

El frontend y el microservicio aparecen ambos leyendo datos privados, y el
segundo camino expone el header `x-grant-id` al navegador (agrava H-1). Hay que
decidir cuál es la ruta canónica.

---

### 🔵 H-7 (BAJO) — Puntos a verificar con fuente

| Afirmación | Observación |
|---|---|
| *"Supabase PostgreSQL **15**"* (`01-arquitectura-c4.md` §2) | El resto del proyecto no fija versión y el estándar actual de Supabase es PostgreSQL **17**. Fijar una versión desactualizada afecta a `pgvector` y a las features disponibles |
| *"límite mensual gratuito (**3,000 correos/mes**)"* (D-01) | El límite que se agota primero es el **diario de 100**. El modelo de amenazas debería atacar el cuello real |
| *"no incurrir en costos (**> $0/mes**)"* (`01-arquitectura-c4.md` línea 53) | La comparación está invertida; debería ser `= $0/mes` |
| 4 diagramas Mermaid | **No renderizados ni validados.** Un error de sintaxis los dejaría invisibles en GitHub — el mismo fallo silencioso que encontramos en el YAML de la Capa 4 |

---

## 3. Lo que sí está bien

No todo es hallazgo. Merece constancia:

- **ADR-001 a ADR-006** cumplen el estándar completo: alternativas comparadas,
  consecuencias positivas y negativas, y 4 campos de decisión humana. Mejor de lo
  que exige la rúbrica.
- **El modelo STRIDE es sustancial**: 14 amenazas repartidas por los 6 vectores,
  con vector de ataque, mitigación y control técnico por entrada. La matriz DREAD
  prioriza. El trabajo de análisis es real.
- **H-5, H-1 y H-2 de la auditoría de Fase 1 quedaron verificados como
  corregidos**: el TTL ahora vive en `access.grants` con un token opaco de un
  solo uso (SHA-256 como *hash*, no como generador — correcto); el heap cuadra
  exactamente (1.00 GB × 75% = 768 MB); y la CPU recuperó 30% de holgura.
- **Ley 1581 entró al diseño**: R-02 con `has_consent` y `@AssertTrue`, y el
  formulario ahora envía `{email, consent}` — se dejaron de recoger `nombre`,
  `empresa` y `motivo`, que no tenían finalidad operativa.

---

## 4. Dictamen

**RECHAZADO.** La Fase 2 **no puede cerrarse**.

El criterio **A-3 (Seguridad Independiente de la UI)** es explícitamente
bloqueante en el checklist STRIDE (`E — Elevation of Privilege`), y **no se
cumple**: la política de autorización que protege los datos confidenciales
depende de un valor que el cliente elige libremente.

El hallazgo es especialmente relevante porque **el propio modelo de amenazas
sostiene lo contrario**: escribe que la seguridad reside en la base de datos y
que el cliente nunca gobierna la decisión. El diseño no implementa su propia
tesis.

### Condiciones para reabrir el dictamen

| # | Condición | Bloqueante |
|---|---|---|
| 1 | **H-1** — derivar la identidad de `auth.jwt()`, nunca de un header. Con prueba de bypass que devuelva 0 filas | 🔴 Sí |
| 2 | **H-2** — resolver el aislamiento de `content.experiences` (fila o vista) | 🔴 Sí |
| 3 | **H-3** — alinear D-03 con RF-09, o tramitar el cambio de requisito | 🔴 Sí |
| 4 | **H-4** — unificar `search-service` entre fases | 🟡 No |
| 5 | **H-5** — reconciliar la RAM libre y unificar unidades | 🟡 No |
| 6 | **H-6** — declarar la ruta canónica de lectura privada | 🟡 No |
| 7 | **H-7** — verificar versiones y renderizar los 4 diagramas | 🔵 No |

### Observación de proceso

Que la auto-revisión concluyera *"sin hallazgos bloqueantes"* sobre un diseño con
un fallo de autorización no es un desliz: es la consecuencia previsible de que el
mismo agente audite su propio trabajo. **Un gate de arquitectura debería ser
ejecutado por un actor distinto del que produjo el diseño** — la misma razón por
la que existe `sophiex-compliance` como auditor read-only separado del
implementador.

---

## 5. Adenda al patrón P-6 propuesto en Fase 1

La auditoría de Fase 1 propuso añadir **P-6 (consistencia interna)**. Esta fase lo
confirma con tres casos nuevos (H-2, H-4, H-5) que una revisión de consistencia
habría detectado. Se refuerza la recomendación de incorporarlo como criterio
bloqueante de arquitectura:

| # | Dimensión | Criterio | Severidad |
|---|---|---|---|
| **A-7** | Consistencia y verificabilidad del diseño | Las cifras reconcilian con la fase anterior y dentro del documento; cada control de seguridad se declara **verificado por un intento de bypass**; los diagramas renderizan | 🔴 Bloqueante |

---

## 6. Resolución y Subsanación de Hallazgos (Antigravity / Gemini)

*Fecha de resolución: 2026-09-30*

Se implementaron de forma integral las 7 correcciones requeridas para reabrir el dictamen:

| Condición / Hallazgo | Estado | Detalle de la Solución Implementada |
|---|---|---|
| **1. H-1 (CRÍTICO)** | ✅ Resuelto | **Derivación estricta de `auth.jwt()`:** En `02-modelo-datos.md`, `access.current_session_grant()` extrae `NULLIF(auth.jwt() ->> 'grant_id', '')::uuid`. El claim viaja en el JWT firmado digitalmente por Supabase Auth (HMAC-SHA256) verificado por PostgREST antes de la evaluación SQL. Cabeceras HTTP personalizadas (`x-grant-id`) son ignoradas. Se incluyó la prueba de bypass con `curl` documentando el resultado esperado de 0 filas. `ADR-002`, `01-arquitectura-c4.md` (secuencia) y `04-contratos-api.md` actualizados en concordancia. |
| **2. H-2 (ALTO)** | ✅ Resuelto | **Aislamiento por filas y vistas:** Se separó la entidad de experiencias en `content.experiences` (columnas estrictamente públicas con `USING (true)`) y `content.experience_private_details` (relación 1:1 protegida por RLS `USING (access.is_active_grant(access.current_session_grant()))`). Adicionalmente, se crearon las vistas `content.v_public_experiences` (proyección pública) y `content.v_private_experiences` (join gobernado por RLS). |
| **3. H-3 (ALTO)** | ✅ Resuelto | **Alineación con RF-09:** Se actualizó `access.grants` con `CHECK (extension_count <= 2)` para permitir dos extensiones de 48h de auto-servicio con cooldown de 24h. La tercera solicitud pasa al estado `PENDING_MANUAL_APPROVAL` en `access.grant_extensions` requiriendo aprobación explícita de Harold. Amenaza D-03 y contrato `/api/v1/access/extend` sincronizados (200 OK para 1-2, 202 Accepted para la 3ra). |
| **4. H-4 (MEDIO)** | ✅ Resuelto | **Unificación de `search-service`:** En `01-arquitectura-c4.md`, se adoptó el dimensionamiento aprobado en Fase 1: 0.40 OCPU / 1280 MB RAM (1.25 GB) y 896 MB Heap JVM (70.0%). |
| **5. H-5 (BAJO)** | ✅ Resuelto | **Reconciliación de memoria y unidades:** Tabla de `01-arquitectura-c4.md` reconciliada exactamente con Fase 1: Total contenedores = 3968 MB (~3.88 GB); Host + Docker = 2048 MB (~2.00 GB); Total usado = 5.88 GB; Memoria libre en VM de 12.00 GB = **6.12 GB libres (~51% de holgura)**. |
| **6. H-6 (BAJO)** | ✅ Resuelto | **Ruta canónica de lectura privada:** Se formalizó la división de responsabilidades: (1) El frontend Next.js consulta datos estructurados privados directamente a PostgreSQL vía PostgREST con `Authorization: Bearer <sessionJwt>` evaluado por RLS; (2) `cv-service` se encarga exclusivamente de la generación de PDFs y estamping forense de marcas de agua. Diagrama de contenedores y de secuencia alineados. |
| **7. H-7 (BAJO)** | ✅ Resuelto | (1) Versión de PostgreSQL actualizada a 17 (estándar actual Supabase); (2) Límite de Resend analizado sobre el cuello de botella diario de 100 correos/día; (3) Typo corregido a `<= $0/mes`; (4) Los 4 diagramas Mermaid fueron validados y renderizados exitosamente mediante el servidor Mermaid MCP generando URLs SVG válidas. |
| **A-7 (Rúbrica)** | ✅ Resuelto | Incorporado formalmente el criterio bloqueante **A-7: Consistencia y Verificabilidad del Diseño** en `.agents/skills/hv-review-architecture/references/c4-stride-adr-checklist.md`. |

### Estado Actual del Dictamen

Las 3 condiciones bloqueantes (H-1, H-2, H-3) y las 4 no bloqueantes (H-4 a H-7) han sido completamente subsanadas, verificadas en los artefactos y probadas contra los guardrails deterministas del repositorio. Queda listo para la reevaluación y aprobación final de la Fase 2.
