# 🗂️ Registro de MCPs — ProyectoHV

> Catálogo vivo. Clasifica **cada MCP por dueño** para que ninguna sesión futura
> confunda las credenciales corporativas con las propias.
>
> **Última auditoría:** 2026-09-30 · Fuente: `C:\Users\harol\.zcode\cli\config.json`
> (MD5 al momento de la auditoría: `1f2b6d841f2639b1456cbebd368e6311`) y
> `~\.gemini\antigravity\mcp_config.json`
>
> **Verificación reproducible:** `npm run verify:mcp:probe` — comprueba que cada
> servidor declarado arranca, autentica y expone lo esperado. No hace falta creer
> esta tabla: se puede volver a medir.

---

## 🔴 ZONA PROHIBIDA — infraestructura corporativa

> ### ✅ AISLADOS ESTRUCTURALMENTE desde el 2026-09-29
>
> Estos 9 servidores **ya no se conectan en este workspace**. Fueron movidos al
> config del workspace corporativo: `C:\Stefanini\<proyecto>\.zcode\config.json`
>
> **Verificación de integridad:** las 9 entradas se compararon contra el backup
> pre-cambio y resultaron **idénticas** — ninguna credencial se perdió.
>
> Si alguno **vuelve a aparecer conectado aquí**, es un error de configuración:
> reportarlo y no usarlo.

Los servidores que siguen abajo **no invocar, no leer, no escribir.**

| MCP | Evidencia de que es corporativo | Riesgo si se usa aquí |
|---|---|---|
| `azure-devops` | organización de Stefanini + PAT en texto plano + ruta bajo `C:\Stefanini\` | Exponer la búsqueda de empleo ante el empleador · dañar work items de un cliente |
| `supabase` | `SUPABASE_PROJECT_REF` de un proyecto corporativo | **Migraciones, Edge Functions o SQL sobre producción de un cliente** |
| `postgres-destino` | host `db.<ref>.supabase.co` corporativo | Escritura directa a BD de un cliente |
| `postgres-origen` | host `db.<ref>.supabase.co` corporativo | Lectura de BD de un cliente |
| `sophiex-mcp` | ruta bajo `C:\Stefanini\` | Acceso al producto del empleador |
| `sophiex-ragflow` | ruta bajo `C:\Stefanini\` | Base de conocimiento de un cliente |
| `sophiex-itsm-sdp` | ruta bajo `C:\Stefanini\` | Tickets de ServiceDesk Plus |
| `sophiex-zabbix` | ruta bajo `C:\Stefanini\` | Monitoreo de infraestructura de cliente |
| `sophiex-ollama` | ruta bajo `C:\Stefanini\` | Cómputo del empleador |

**También prohibido:** leer o escribir en `C:\Stefanini\` por cualquier vía.

### ⚠️ Credenciales en texto plano detectadas

Durante la auditoría se encontraron secretos sin cifrar en el config global:

| Servidor | Secreto | Recomendación |
|---|---|---|
| `azure-devops` | PAT corporativo | **Rotar** y mover a gestor de secretos |
| `context7` | API key `ctx7sk-…` | Rotar si el archivo sale de este equipo |

**Respaldos disponibles** (no borrar):
`config.backup-20260819.json` · `config.backup-20260929-160255.json` ·
`config.backup-PRE-AISLAMIENTO-20260929-160526.json` ← **estado previo a la
migración; es la vía de reversión.** · `config.backup-PRE-GITHUB-20260930-175156.json` ·
`config.backup-PRE-SUPABASE-20260930-192500.json` · `config.backup-PRE-READONLY-20261001002558.json`

---

## 🔴 HALLAZGO 2026-09-30 — el aislamiento no cubría a Antigravity

El aislamiento del 2026-09-29 movió los 9 servidores corporativos al config del
workspace corporativo. **Eso protegió a ZCode — y solo a ZCode.**

Antigravity tiene su propia configuración de MCPs y es de **scope de usuario**:
`~\.gemini\antigravity\mcp_config.json`. Se carga en **todos** los workspaces que
Antigravity abra, **incluido este**. Allí siguen conectados:

| Servidor | Destino | Modo | Riesgo |
|---|---|---|---|
| `mcpsupabaselegacy` | 🔴 `project_ref` que **coincide con el corpus de backups previos al aislamiento** | solo lectura | Consultar producción de un cliente desde una sesión de ProyectoHV |
| `mcpsupabasetarget` | ⚠️ **sin identificar** — no es corporativo ni es `HVpersonal` | **ESCRITURA** | Migraciones y borrado sobre un proyecto que nadie ha clasificado |
| `azure-devops` | 🔴 organización del empleador | — | Exponer la búsqueda de empleo ante Stefanini |
| `ssh-vps-contabo` | 🔴 **root por SSH a un VPS**, con la contraseña en **texto plano** y derivada del nombre del empleador | — | Acceso root a infraestructura del empleador |

**Cómo se confirmó:** patrón estricto (`project_ref=<ref>` o `db.<ref>.supabase.co`)
contra los refs de los 3 backups **anteriores** al aislamiento.

> ⚠️ **Un primer intento con patrón laxo dio dos falsos positivos** — llegó a
> marcar `hv-supabase` como corporativo, porque el corpus incluía backups
> recientes que ya contenían el ref propio. Corregido el corpus, la coincidencia
> es inequívoca. Se deja escrito porque el método importa: **un guard mal
> calibrado no protege, y además desinforma.**

> Los valores de los refs **no se escriben aquí.** Este repositorio es público y
> repetirlos sería la filtración que la clasificación pretende evitar. Se
> identifican por índice.

### ✅ RESUELTO 2026-10-02 — separación ejecutada

Estado final **medido**: los 9 servidores vivos de ambos configs de Antigravity no
incluyen ninguno de los 11 prohibidos, y todo servidor Supabase es de solo lectura.

| Servidor | Acción | Dónde quedó |
|---|---|---|
| `azure-devops` | retirado por Antigravity | respaldo `mcp_config.backup-20260930.json` |
| `mcpsupabaselegacy` | retirado por Antigravity | respaldo `mcp_config.backup-20260930.json` |
| `mcpsupabasetarget` | se le añadió `&read_only=true` | vivo, solo lectura |
| `ssh-vps-contabo` | 🔴 **retirado por ZCode** | `mcp_config.REMOVED-CORPORATIVO-*.json` |

**Ninguna credencial se perdió** — verificado entrada por entrada contra el
respaldo: el fragmento retirado es **byte-idéntico** al original, y ninguna otra
entrada resultó alterada.

> ⚠️ **`ssh-vps-contabo` merece atención aparte.** Es acceso **root por SSH** a un
> VPS, con la contraseña **en texto plano** dentro del archivo de configuración, y
> esa contraseña está derivada del nombre del empleador. Son dos problemas
> distintos: el aislamiento (resuelto) y la higiene de la credencial (**no**
> resuelto). **Recomendación: rotar esa contraseña y sustituirla por clave SSH.**
> Una contraseña de root escrita en un archivo ya no es un secreto.

**Restauración:** el fragmento `mcp_config.REMOVED-CORPORATIVO-*.json` contiene la
entrada completa. Debe reinsertarse **solo** en el config del workspace
corporativo — nunca en el de usuario, que carga en todos los workspaces.

**Herramientas que lo vigilan:** `bootstrap.mjs`, `verify-mcp.mjs` y
`verify-context.mjs` fallan si un servidor prohibido reaparece en cualquier config
de agente. Ya no depende de que alguien recuerde la regla.

---

## 🟡 VERIFICAR ANTES DE USAR

| MCP | Motivo de duda |
|---|---|
| `grafana` | `TLS_SKIP_VERIFY: true` — indica infraestructura corporativa interna. **Confirmar si es propia o del empleador** |
| `netlify` | Sin credenciales visibles en config. Verificar **a qué cuenta** queda autenticado al primer uso |
| `atlassian` | Servidor comunitario `uvx mcp-atlassian` **sin variables de entorno → no conecta**. Si se configura con credenciales corporativas, pasa a ser zona prohibida |
| `powerbi-modeling-mcp-rw` | Modo **escritura** sobre modelos Power BI. Usar siempre `--readonly` salvo intención explícita |
| `notebooklm` | Verificar qué cuenta de Google usa |

---

## 🟢 SEGUROS — sin credenciales corporativas

| MCP | Uso en este proyecto | Fase SDLC |
|---|---|---|
| `context7` | Documentación actualizada de librerías | 1, 2 |
| `tavily_search` | Investigación, benchmarks, precios | 1 |
| `playwright` | E2E, pruebas de UI, verificación visual | 4 |
| `magicuidesign` | Componentes de UI | 2 |
| `netlify` | Despliegue del frontend | 5 |
| `docker` *(deshabilitado)* | Contenedores, despliegue, tests de integración | 3, 5 |

### Por qué `.zcode/config.json` declara `mcp.servers` vacío

Dos razones, y la primera no es obvia:

1. **Los secretos no pueden vivir en un repositorio público.** Declarar `context7`
   aquí exigiría poner su API key en el repo. No se hace.
2. **El scope de usuario gana sobre el de workspace** para servidores con el mismo
   nombre, así que redeclararlos aquí no tendría efecto de todos modos.

El config del workspace se usa para **hooks** y, cuando existan credenciales
propias, para los servidores `hv-*`.

> ⚠️ El paquete que hay que verificar antes de añadir nada: los nombres de paquete
> npm cambian. Contrastar contra la documentación oficial vigente.

---

## ➕ FALTANTES — a instalar cuando exista la credencial

### 🔐 Dónde vive cada secreto

**Regla:** el config del workspace (`.zcode/config.json`) va al repositorio
**público** → **nunca** contiene un secreto.

| Tipo de secreto | Dónde vive |
|---|---|
| Token de MCP personal | `~/.zcode/cli/config.json` (**scope de usuario**, fuera del repo) |
| Secreto de CI/CD | GitHub Actions Secrets |
| **Preferible a ambos** | **OAuth** — no hay secreto que guardar, filtrar ni rotar |

### ✅ `hv-supabase` · Supabase personal — INSTALADO 2026-09-30

Conectado al proyecto personal **HVpersonal** (`rhkwtoyhlsamkdsoxehp`, región
`ca-central-1`, PostgreSQL 17.11). Es el **servidor hospedado por Supabase**, no
un proceso local: no exige Node ni descarga paquetes, y la versión no queda
desactualizada.

Configurado con **doble cerrojo**, medido por handshake real — no supuesto:

| Cerrojo | Qué impide | Evidencia |
|---|---|---|
| `project_ref=<ref>` | Fija el servidor a **un** proyecto y deshabilita las herramientas de cuenta | `create_project`, `pause_project` y `restore_project` no aparecen en ninguno de los dos modos |
| `read_only=true` | Elimina las mutaciones | Sin él: **20** herramientas con **6** mutaciones. Con él: **13** herramientas, **0** mutaciones |

Sin `read_only`, un `hv-supabase` tendría disponibles `apply_migration`,
`deploy_edge_function`, `create_branch`, `delete_branch`, `merge_branch` y
`reset_branch`.

> ⚠️ **Hallazgo del 2026-09-30 — la lección del día.** La primera configuración
> instalada tenía el `project_ref` pero **le faltaba `read_only=true`**. El
> manifiesto y la configuración instalada decían cosas distintas y **ninguno de
> los dos se veía mal por separado**. Lo detectó `verify-mcp.mjs`, que existe
> precisamente por esto.

> **Por qué solo lectura, y no es una limitación:** el modelo de amenazas E-02
> exige que las migraciones corran **solo desde el pipeline de CI**, nunca desde
> una herramienta interactiva. Para escribir SQL contra la base local se usa
> `supabase start`; contra el proyecto remoto, CI.

Declarado en `~/.zcode/cli/config.json` y en las dos configuraciones de
Antigravity, siempre en scope de usuario — fuera del repositorio. **Ningún token
ni clave vive en archivos versionados.**

### ✅ `hv-github` · GitHub — INSTALADO 2026-09-30

Servidor oficial de GitHub: imagen `ghcr.io/github/github-mcp-server` (**v1.12.2**).
**Verificado:** contenedor descargado, arranca y autentica.

Declarado en `~/.zcode/cli/config.json` (scope de usuario). **El repositorio no
contiene el token** — comprobado por escaneo.

> 🔐 **Alternativa sin secreto en disco — recomendada.** El servidor oficial
> soporta OAuth: no hay token que guardar, filtrar ni rotar. Requiere publicar el
> puerto de callback:
>
> ```
> docker run -i --rm -p 127.0.0.1:8085:8085 \
>   -e GITHUB_OAUTH_CALLBACK_PORT=8085 ghcr.io/github/github-mcp-server
> ```
>
> Hacer login una vez en el navegador; la credencial vive **solo en memoria**.

### `hv-sentry` · Monitoreo de errores — fase 6
Free tier permanente. Revisar el paquete oficial vigente.

### ✅ `hv-atlassian` · Jira + Confluence — INSTALADO 2026-09-30

Conectado a la instancia personal **haroldr088.atlassian.net** (Atlassian Cloud Free tier) mediante el servidor oficial `mcp-atlassian` ejecutado con `uvx`.
**Verificado:** Handshake stdio exitoso, 98 herramientas expuestas, espacio `HV` ("ProyectoHV — Portafolio Profesional") creado y sincronizado con 4 páginas de arquitectura y diseño.

Configurado en `~/.zcode/cli/config.json` y `~/.gemini/antigravity/mcp_config.json` con Personal API Token en scope de usuario. **El repositorio no contiene ningún token ni secreto.**

---

## Por qué el prefijo `hv-`

Los MCPs de workspace **se fusionan** con los de usuario; no los reemplazan, y
todos se conectan automáticamente al abrir el proyecto. Como no se pueden ocultar
por configuración, el prefijo hace que `hv-supabase` y `supabase` nunca se
confundan al leerlos.

> **Aislamiento real:** los 9 servidores corporativos se movieron al config del
> workspace corporativo, así que solo cargan ahí. Es una garantía de máquina,
> no de disciplina.
