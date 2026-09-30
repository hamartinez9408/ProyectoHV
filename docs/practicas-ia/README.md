# Prácticas de IA aplicadas — ProyectoHV

> **Fase:** transversal (1 a 6)
>
> **Decisión humana**
> - **Qué decidió Harold:** que "casi todo se haga con IA" **y** que el proceso
>   quede documentado y visible en el sitio.
> - **Qué ejecutó la IA:** redacción y estructura de este documento.
> - **Riesgo aceptado conscientemente:** ver §4.

---

## 1. La tesis

La investigación DORA sobre adopción de IA encontró un patrón incómodo:

> **La IA aumenta el throughput pero tiende a aumentar también el Change Failure Rate.**

Es decir: adoptar IA de forma intensiva **sin controles empeora la estabilidad de
la entrega**. Es el modo de fallo conocido de esta tecnología.

**Eso es exactamente lo que este proyecto documenta y responde.** No "usé IA para
escribir código", sino:

> *"Adopté IA de forma intensiva, medí el efecto con DORA, encontré el aumento
> esperado en Change Failure Rate, y construí guardrails deterministas que lo
> contienen."*

| Riesgo conocido de la IA | Control existente |
|---|---|
| Genera código que compila pero viola reglas | **Hooks deterministas Tier 0** — bloquean antes de que el archivo exista, a 0 tokens del modelo |
| Introduce issues de calidad | **SonarQube-Zero** como gate bloqueante |
| Cobertura cosmética | Gate de **≥80% líneas / ≥75% branches** |
| El spec y el código divergen | `sdlc-drift` — reconciliación spec ↔ código |
| El auditor frena al implementador | Auditoría **read-only en paralelo** |
| Se pierde el hilo de por qué se decidió algo | **Log de decisiones humanas** (obligatorio, §4) |

Esa es la diferencia entre *"usé IA"* y *"medí el impacto de la IA y diseñé
controles para su modo de fallo conocido"*. La segunda es una posición de Tech Lead.

---

## 2. Las prácticas

### 2.1 Spec-driven development
El **spec manda**; el código se genera desde él. `sdlc-drift` verifica
periódicamente que spec e implementación no divergieron.

### 2.2 Context engineering como código
`AGENTS.md`, skills y referencias viven **versionados en el repositorio**.
El prompt deja de ser una conversación perdida y pasa a ser un artefacto revisable
con historial de cambios. Ver `AGENTS.md` de este repo como ejemplo vivo.

### 2.3 Orquestación multi-agente por capa
Un orquestador analiza qué capas toca la tarea y despacha especialistas **en
paralelo**, en vez de un agente monolítico secuencial. Reduce el tiempo de ciclo
y aísla el contexto de cada especialista (menos tokens, menos contaminación).

### 2.4 Guardrails deterministas (Tier 0)
Reglas que se evalúan **al escribir el archivo**, antes de que exista. No dependen
del juicio del modelo y **no consumen tokens de inferencia**.

> Es el control más importante del conjunto: actúa en el punto donde el error es
> gratis de corregir.

### 2.5 Auditoría read-only en paralelo
El agente de cumplimiento no tiene permiso de escritura y **corre simultáneamente**
con el implementador. Audita el diff sin bloquearlo. Cuando termina, reporta.

### 2.6 Human-in-the-loop en puntos de decisión
El flujo no pasa de preguntas a plan sin que Harold lea y redirija:

```
preguntas → discusión de diseño → firmas/contratos → plan → código
```

El "plan-reading illusion" —creer que leer un plan equivale a entenderlo— se
rompe haciendo que el humano **redirija** antes de que exista un plan.

### 2.7 MCP como capa de integración tool-agnostic
Cada herramienta externa entra por MCP, con **ruta de degradación documentada**
para cuando no está disponible. Ver `tools/MCP-REGISTRY.md`.

### 2.8 Estimación asistida
**COSMIC** para tamaño funcional (CFP) y **SNAP** para requisitos no funcionales.
El objetivo es comparar la estimación asistida contra la real y publicar la
desviación.

### 2.9 Observabilidad del proceso
El proceso produce **métricas propias**, no solo código:

| Métrica | Qué revela |
|---|---|
| Lead time por historia | Cuánto tarda una idea en estar en producción |
| % de líneas generadas vs. revisadas | Nivel real de intervención humana |
| Defectos **por gate** | Si los guardrails sirven o solo adornan |
| Retrabajo por cambio de spec | Costo de un spec débil |
| Tiempo de ciclo por fase | Dónde está el cuello de botella real |

### 2.10 Escaneo programado de deuda técnica
No depende de que alguien se acuerde. Se ejecuta solo y reporta.

---

## 3. Cómo se mide — y por qué importa

Sin números, "usé IA y mejoró" es publicidad. Las métricas de entrega (DORA) y las
del proceso se publican juntas:

| | Antes | Objetivo | Fuente |
|---|---|---|---|
| **Lead Time for Changes** | — | < 24 h | GitHub Actions + log de despliegues |
| **Change Failure Rate** | — | < 5% | Deploys con rollback / total |
| **MTTR** | — | < 1 h | Alerta → deploy de corrección |
| **Defectos capturados por gate** | — | creciente | Guard + Sonar + cobertura |

> Las cifras se publican **con su línea base**. Un número sin punto de partida no
> es una métrica: es una afirmación.

---

## 4. El riesgo que hay que nombrar

**Un portafolio construido íntegramente por IA que el autor no puede defender es
un pasivo, no un activo.**

El propio expediente lo dice (`perfil-maestro.md` §11.2):

> *"las autoevaluaciones del cuestionario sobreestiman el nivel real"*
> *"Un 'no sé' en una entrevista técnica cuesta la vacante"*

En entrevista: *"explícame por qué el TTL de 48 h vive en una política RLS y no
en el JWT"* → si la respuesta es "el agente lo hizo", el proyecto entero se
derrumba, y con él la credibilidad como Tech Lead.

### La mitigación: `Decisión humana` obligatoria

**Todo artefacto del ciclo de vida lleva, al final:**

```markdown
## Decisión humana
- **Qué decidió Harold:** ...
- **Qué ejecutó la IA:** ...
- **Alternativas descartadas y por qué:** ...
```

No es documentación decorativa. Es:
1. **La prueba de autoría** — separa "lo hice" de "lo generé"
2. **El material de estudio** — antes de una entrevista se lee esto, no el código
3. **El diferenciador** — casi todo el mundo que usa IA lo esconde; documentar su
   **gobernanza** es la posición senior

---

## 5. Anti-patrones — lo que este proyecto NO hace

| ❌ | Por qué |
|---|---|
| Generar código sin spec | El gate de drift lo detecta y falla |
| Aceptar cobertura baja porque "los tests pasan" | El umbral es un gate bloqueante |
| Dejar que la IA escriba datos de carrera | Inventar empresas, fechas o métricas cuesta el empleo |
| Publicar cifras inventadas por el modelo | Todos los números salen de `perfil-maestro.md` o de medición real |
| Delegar la decisión de arquitectura | La IA propone; **Harold decide y firma** |
| Ocultar que se usó IA | Es el diferenciador, no la vergüenza |
