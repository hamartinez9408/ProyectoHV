# 📋 Reporte de Revisión: Fase 1 · Planificación

- **Artefactos Evaluados:** `docs/01-planificacion/` (los 5 documentos + README)
- **Commit auditado:** `b2f54c9`
- **Veredicto:** **APROBADO CON OBSERVACIONES**
- **Auditor:** `hv-review-planning` (ejecutado manualmente por ZCode — el skill no estaba cargado en la sesión)
- **Fecha:** 2026-09-30

---

## 0. Nota sobre los criterios

Los criterios P-4 y P-5 que se me indicaron **no coinciden con la rúbrica** de
`references/planning-rubric.md`:

| # | Rúbrica real | Indicado en la solicitud |
|---|---|---|
| P-4 | Alineación con la tesis del exhibit 🟡 | Dimensionamiento VM Oracle ARM |
| P-5 | Estrategia DevOps declarada 🔴 | Matriz de trazabilidad |

Se audita contra la **rúbrica real**. Los dos puntos indicados se verifican aparte
(§3) porque son requisitos legítimos aunque no sean criterios formales.

---

## 1. Evaluación de Criterios

### [x] P-1 · Línea Base DORA — ✅ CUMPLE

`03-estrategia-devops.md` §3 declara las **4 métricas** con meta y mecanismo de medición:

| Métrica | Objetivo | Cómo se mide |
|---|---|---|
| Deployment Frequency | Élite: a demanda | Runs exitosos del pipeline |
| Lead Time for Changes | < 24 h | Primer commit → deploy exitoso |
| Change Failure Rate | < 5% | Deploys con rollback / total |
| MTTR | < 1 h | Alerta → deploy de corrección |

Incluye la advertencia de no mezclar fuentes (DORA/Accelerate vs. LinearB 2026).
Slice 5 cierra el ciclo: *"Las 4 métricas DORA se calculan automáticamente de la
telemetría de CI/CD."*

**Observaciones (no bloqueantes):**
- **O-1:** se declaran **metas**, no una **línea base**. Con 0 despliegues no
  existe valor de partida para Deployment Frequency ni CFR. Conviene escribir
  explícitamente: *"línea base por establecer; primera medición en Slice 5"*.
  Sin eso, "objetivo < 5%" no es comparable contra nada.
- **O-2:** la rúbrica nombra *Time to Restore*; el documento dice **MTTR**. Es la
  misma métrica con el nombre anterior (DORA la renombró *Failed deployment
  recovery time*). Alinear la nomenclatura evita dudas en la entrevista.

### [x] P-2 · Modelo de Costos Citado — ✅ CUMPLE

- Toda cifra del `02-modelo-costos.md` tiene fuente y el total es **< USD 3/mes**.
- Las **tres trampas exigidas están identificadas y verificadas**: pausa de
  Supabase a 7 días (con 0 días de backups), Oracle ARM recortado a 2 OCPU /
  12 GB (con fecha de efecto y de terminación de instancias), y runners de
  GitHub gratuitos solo en repos públicos.
- El `01-analisis-viabilidad.md` §4 reconcilia correctamente:
  `0.00 + (0.50 – 2.00) ≤ 2.00 < 3.00`.

**Observación:**
- **O-3:** la lista de mitigaciones de trampas en `01-analisis-viabilidad.md` §4
  cubre Supabase y GitHub pero **omite Oracle**, aunque describa la instancia en
  §3.1. La fase cumple porque el costo está en `02-modelo-costos.md`, pero el
  documento de viabilidad queda asimétrico consigo mismo.

### [x] P-3 · Decisión Humana Documentada — ✅ CUMPLE

El alcance del criterio es *"todo documento de **viabilidad o roadmap**"*:
- `01-analisis-viabilidad.md` → 3 campos ✅
- `05-cronograma.md` → 3 campos ✅
- `04-especificacion-requisitos.md` → 3 campos ✅ (adicional)

**Hallazgo H-3 (Media) — ver §3.**

### [x] P-4 · Alineación con la Tesis del Exhibit — ✅ CUMPLE

El plan no describe un sitio web: describe un **exhibit medible**.
`01-analisis-viabilidad.md` §1 declara la doble naturaleza (Producto / Exhibit);
RF-02 lo convierte en requisito navegable; Slice 5 lo cierra con un dashboard
DORA en vivo; y la matriz de riesgos §5 nombra explícitamente el riesgo de
adopción de IA sobre el CFR con su mitigación. Cumple con holgura.

### [x] P-5 · Estrategia DevOps Declarada — ✅ CUMPLE

La matriz de calidad está declarada en `03-estrategia-devops.md` §2 y ejecutada
parcialmente en `.github/workflows/guardrails.yml`:

```
Lint (tsc + ESLint) → Unit (≥80%) → Integration/API (Testcontainers, ≥90%
endpoints) → SonarQube (0 issues) → CD (health check + rollback automático)
```

Los gates **bloquean**, no informan; y la Capa 4 los ejecuta sobre el árbol
completo con `--require-lists`.

**Observación:**
- **O-4:** **el domicilio de SonarQube no está definido.** El MCP local está
  deshabilitado y espera `SONARQUBE_URL` / `SONARQUBE_TOKEN` — es decir, un
  servidor. Ningún documento dice dónde corre. Para CI la respuesta natural es
  **SonarCloud (gratuito en repos públicos)**, pero mientras no se declare, el
  gate está anunciado sin casa y no puede ejecutarse.

---

## 2. Veredicto

**APROBADO CON OBSERVACIONES.**

Ningún criterio bloqueante (P-1, P-2, P-3, P-5) falla. P-4 —de severidad
🟡— también cumple.

Los hallazgos de §3 **no están cubiertos por la rúbrica** y por tanto no alteran
el veredicto formalmente. Mi recomendación como auditor es distinta: **H-1, H-2 y
H-5 deben resolverse antes de abrir la Fase 2**, porque los tres afectan a
decisiones que el diseño consumirá directamente.

---

## 3. Hallazgos y Acciones Requeridas

### 🔴 H-5 (Alta) — Contradicción en el mecanismo de expiración de 48 h

Es el **requisito central del proyecto** y aparece descrito de tres formas
incompatibles:

| Requisito | Dice | Problema |
|---|---|---|
| **RF-06** | *"token criptográfico seguro (**SHA-256**) con **expiración exacta a las 48 horas**"* | SHA-256 es una **función de hash**, no un generador de tokens. Y un token no lleva su propia expiración |
| **RF-08** | *"autenticar la sesión en Supabase y emitir una cookie HTTP-only"* | Supabase Auth emite un JWT con expiración ~1 h + refresh. La sesión **no** es la concesión de 48 h |
| **RF-10** | RLS evalúa `auth.uid() IS NOT NULL AND expires_at > now()` | ✅ **Esta sí coincide** con la decisión arquitectónica verificada |

**Por qué importa:** la decisión verificada durante la planificación fue que
**el TTL vive en RLS**, precisamente porque el plan gratuito de Supabase **no
incluye "Session timeouts"**. RF-06 y RF-08 reintroducen un vencimiento en el
token o en la sesión — que es justo el mecanismo que no está disponible.

Implementar RF-06 al pie de la letra produce un sistema que **falla la garantía
de 48 h**: la política RLS expiraría correctamente, pero RF-08 permitiría una
sesión viva más allá (o menos), y RF-06 sugeriría un hash donde hace falta un
secreto de un solo uso.

**Acción:** reescribir RF-06 y RF-08 para que declaren un único mecanismo:
- RF-06: el enlace mágico portador **no lleva el TTL**; la concesión se registra
  en `access.grants` con `expires_at = now() + interval '48 hours'`.
- RF-08: la sesión de Supabase es **independiente** de la concesión; el acceso a
  datos lo decide RLS. La UI fuerza logout cuando la concesión vence.

### 🟠 H-1 (Media-Alta) — CPU sin holgura, en un análisis que solo mide memoria

Las cuotas de CPU de §3.1 suman **exactamente 2.00 OCPU = el 100% de lo
disponible**:

| | Memoria | CPU |
|---|---|---|
| Asignado | 6.62 GB | 2.00 OCPU |
| Disponible | 12.00 GB | 2.00 OCPU |
| **Holgura** | **45%** | **0%** |

El documento destaca el margen de memoria como protección contra el OOM-killer,
pero **no menciona que la CPU queda sin margen**. En el shape ARM el OCPU es el
recurso más escaso. *(Matiz: las cuotas de Docker son límites, no reservas, así
que es un techo bajo contención simultánea — no una sobreasignación permanente.
Aun así, la asimetría no está declarada.)*

**Acción:** añadir la fila de CPU al balance, reconocer la holgura 0% y decidir
conscientemente: reducir cuotas, o declarar que la contención simultánea de los
6 contenedores es aceptable y por qué.

### 🟠 H-2 (Media) — Inconsistencia aritmética en el heap de `access-service`

> `access-service` · límite **1.25 GB** · *"Heap máx. 768 MB (`MaxRAMPercentage=75`)"*

`MaxRAMPercentage=75` sobre 1.25 GB = **960 MB**, no 768 MB. Y 768 MB es el 75%
de **1.00 GB**. O el límite es 1 GB, o el porcentaje es 60%.

El JVM reservaría **192 MB más** de lo previsto, comiendo parte del margen del
45% que el propio documento presenta como salvaguarda. Es señal de que las cifras
no se validaron entre sí.

**Acción:** corregir uno de los dos valores y verificar el resto de la tabla con
el mismo criterio.

### 🟡 H-6 (Media) — Ausencia de requisitos de Ley 1581 (Habeas Data)

RF-04 recoge de terceros `correo, nombre, empresa y motivo de consulta`. Durante
la planificación se identificó que esto activa obligaciones de **Ley 1581 de 2012**:
consentimiento, aviso de privacidad, finalidad declarada y retención. **Ningún RF
ni RNF lo cubre:**
- RNF-03 protege *sus* datos (lista negra), no los de terceros
- RF-12 anonimiza el correo en la bitácora (buena práctica) pero no hay política
- No hay criterio de aceptación verificable, así que no es auditable

Además RF-04 recoge **más datos de los que el flujo necesita**: la aprobación es
automática por dominio, así que `nombre`, `empresa` y `motivo` se recogen sin
finalidad operativa — exactamente lo que la limitación de finalidad prohíbe.

**Acción:** añadir RF-14 (consentimiento + aviso de privacidad) y RNF-09 (retención
y borrado), y reducir RF-04 a lo estrictamente necesario.

### 🟡 H-4 (Media) — Matriz de trazabilidad parcial

`04-especificacion-requisitos.md` §4 mapea **RF-01…RF-13 → Componente →
Dependencias**. Es correcta pero incompleta para verificar cobertura:

- ❌ **RNF-01…RNF-08 sin método de verificación.** Los requisitos no funcionales
  quedan declarativos: nada dice cómo se comprueba que WCAG AA o LCP < 2.5 s se
  cumplen.
- ❌ **Sin mapeo RF → Slice.** No se puede verificar que todos los requisitos
  caen en alguna entrega. Con 13 RF y 6 slices, es la comprobación que evita
  "requisito huérfano".
- ❌ **RF-12 atribuido solo a `services/access`**, pero cubre sesiones y
  descargas, que pertenecen a `services/cv`.

**Acción:** extender la matriz con las columnas *Verificación* y *Slice*, y
corregir la atribución de RF-12.

### 🟡 H-3 (Media) — Decisión humana incompleta en dos documentos

| Documento | Campo 3 | Cumple |
|---|---|---|
| `01-analisis-viabilidad.md` | Riesgo aceptado conscientemente | ✅ |
| `04-especificacion-requisitos.md` | Riesgo aceptado conscientemente | ✅ |
| `05-cronograma.md` | Riesgo aceptado conscientemente | ✅ |
| **`02-modelo-costos.md`** | *"Lo que se decidió NO hacer"* | ⚠️ variante |
| **`03-estrategia-devops.md`** | *"Alternativas descartadas"* | ⚠️ variante |

**Causa raíz:** los dos últimos son **míos, y los escribí antes de que existiera
la rúbrica** `hv-review-planning`. No es un fallo de Antigravity: es deuda de
conformidad hacia atrás.

**Acción:** estandarizar el tercer campo a *"Riesgo técnico asumido
conscientemente"* en ambos, conservando el contenido actual como línea adicional.

### 🔵 H-7 (Baja) — El "cronograma" no tiene tiempo

`05-cronograma.md` define la **secuencia** de 6 slices con sus DoD, pero **no hay
duraciones, fechas ni estimación de esfuerzo**. Es un roadmap, no un cronograma.

**Acción:** o se añade dimensión temporal, o se renombra a `05-roadmap.md` para
que el nombre no prometa lo que el contenido no da. *(El README ya lo describe
como "Roadmap por rebanadas verticales", así que renombrar es coherente.)*

---

## 4. Meta-hallazgo: la rúbrica tiene un hueco

Los hallazgos **más graves (H-5, H-2)** los encontró la aritmética y la
comparación cruzada entre documentos — **no la rúbrica**. P-1…P-5 verifican
*presencia* de artefactos, no **consistencia** entre ellos.

Un documento puede declarar las 4 métricas DORA, citar sus fuentes y llevar su
sección de decisión humana, y aun así contradecirse sobre su mecanismo de
seguridad central. De hecho, es lo que ha pasado.

**Recomendación:** añadir a `planning-rubric.md`:

| # | Dimensión | Criterio | Severidad |
|---|---|---|---|
| **P-6** | Consistencia interna del paquete | Las cifras reconcilian entre documentos y dentro de cada uno; no hay dos mecanismos distintos para el mismo requisito; el dimensionamiento cuadra con los recursos disponibles. | 🔴 Bloqueante |

---

## 5. Checklist de cierre de fase

| Ítem | Estado |
|---|---|
| Modelo de costos con fuentes citadas (< USD 3/mes) | ✅ |
| Línea base DORA declarada (4 métricas) | ✅ (con O-1) |
| Estrategia de pipelines aprobada | ✅ (con O-4) |
| Análisis de viabilidad de portafolio | ✅ |
| Especificación de requisitos estructurada | ⚠️ H-5 y H-6 pendientes |
| Roadmap de entregas verticales definido | ✅ (con H-7) |
| Revisión y redirección humana de Harold | ⬜ **Pendiente — es tuya** |

**La Fase 1 puede cerrarse formalmente** según la rúbrica. Mi recomendación es
cerrarla **condicionada** a resolver H-5, H-1 y H-2 antes de que arranque el
diseño, porque los tres alimentan decisiones de la Fase 2.

---

## 6. Resolución y Subsanación de Hallazgos (Antigravity / Gemini)

*Fecha de resolución: 2026-09-30*

Se implementaron todos los ajustes y conciliaciones técnicas requeridas:

| Hallazgo | Estado | Ajuste Implementado |
|---|---|---|
| **H-1** (Saturación CPU en VM) | ✅ Resuelto | Rebalanceo de cuotas CPU Docker a 1.40 OCPU total (Redis 0.10, RabbitMQ 0.20, access 0.40, cv 0.20, search 0.40, nginx 0.10), reservando un **30% de CPU libre (0.60 OCPU)** para el host y el GC. |
| **H-2** (Aritmética de memoria heap) | ✅ Resuelto | Corrección en `01-analisis-viabilidad.md`: `access-service` con límite de 1.00 GB y `-XX:MaxRAMPercentage=75.0` (768 MB heap). Total memoria contenedores: ~3.88 GB + 2.0 GB SO = ~5.88 GB, dejando **~51% de RAM libre (~6.1 GB)**. |
| **H-3** (Formato Decisión humana) | ✅ Resuelto | Estandarización a 4 campos obligatorios en los 5 documentos de la fase: (1) Qué decidió Harold, (2) Qué ejecutó la IA, (3) Riesgo técnico asumido conscientemente, y (4) Alternativas descartadas. |
| **H-4** (Matriz trazabilidad incompleta) | ✅ Resuelto | En `04-especificacion-requisitos.md`, la matriz cubre exhaustivamente los 14 RFs y los 9 RNFs, asociando a cada uno su slice vertical de entrega (1 al 5) y su método concreto de verificación (Test unitario, Testcontainers, E2E Playwright, Gatling, o RLS audit). |
| **H-5** (Contradicción técnica TTL 48h) | ✅ Resuelto | Desacoplamiento explícito en RF-06 y RF-08: Supabase Auth gestiona únicamente el Magic Link y la identidad efímera; la autorización y expiración residen en PostgreSQL (`access.grants` con `expires_at = now() + interval '48 hours'`) gobernada por RLS (`expires_at > now()`). Ni tokens de sesión de Supabase ni frontend determinan la validez. |
| **H-6** (Cumplimiento Ley 1581 / Habeas Data) | ✅ Resuelto | Principio de minimización en RF-04 (se eliminó el campo innecesario "motivo de consulta"), consentimiento explícito en RF-14, y política estricta de retención/purga en RNF-09 (enlaces no reclamados borrados en 24 h, anonimización tras 90 días de inactividad). |
| **H-7** (Denominación del Roadmap) | ✅ Resuelto | Archivo renombrado formalmente a `05-roadmap.md`, referencias cruzadas actualizadas en `00-INDEX.md` y `01-planificacion/README.md`. |
| **O-1** (Línea base DORA) | ✅ Resuelto | En `03-estrategia-devops.md` (§3), se declara que al ser Greenfield la línea base formal se establece a partir del despliegue del Slice 1. |
| **O-2** (MTTR vs Recovery Time) | ✅ Resuelto | Se adoptó la denominación contemporánea: *Failed deployment recovery time (MTTR)* con objetivo < 1 h (rollback automatizado en < 2 min). |
| **O-3** (Trampa 1 Oracle Cloud) | ✅ Resuelto | Incorporada advertencia y directriz de dimensionamiento en `01-analisis-viabilidad.md` (§4) para mantenerse en 2 OCPU / 12 GB RAM previniendo terminación tras agosto 2026. |
| **O-4** (SonarCloud en CI) | ✅ Resuelto | Declarado SonarCloud SaaS oficial gratuito en `03-estrategia-devops.md` (§1 y §2), evitando gastar memoria RAM en la VM Oracle. |
| **Meta-hallazgo** (Criterio P-6 en rúbrica) | ✅ Resuelto | Se incorporó el criterio bloqueante **P-6: Consistencia Interna del Paquete** y se actualizaron los 4 campos de P-3 en `.agents/skills/hv-review-planning/references/planning-rubric.md`. |

### Estado final del Checklist de Cierre

| Ítem | Estado |
|---|---|
| Modelo de costos con fuentes citadas (< USD 3/mes) | ✅ Resuelto |
| Línea base DORA declarada (4 métricas) | ✅ Resuelto |
| Estrategia de pipelines aprobada (SonarCloud + gates bloqueantes) | ✅ Resuelto |
| Análisis de viabilidad de portafolio (CPU y RAM conciliadas) | ✅ Resuelto |
| Especificación de requisitos estructurada (RF-01..14, RNF-01..09, Ley 1581, TTL RLS) | ✅ Resuelto |
| Roadmap de entregas verticales definido (`05-roadmap.md`) | ✅ Resuelto |
| Rúbrica de planificación actualizada (P-1 a P-6) | ✅ Resuelto |
| Revisión y redirección humana de Harold | ⬜ **Listo para sign-off humano** |

