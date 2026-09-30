# 🗂️ Registro de MCPs — ProyectoHV

> Catálogo vivo. Clasifica **cada MCP por dueño** para que ninguna sesión futura
> confunda las credenciales corporativas con las propias.
>
> **Última auditoría:** 2026-09-29 · Fuente: `C:\Users\harol\.zcode\cli\config.json`
> (MD5 al momento de la auditoría: `0b723285608713d3f6ad76b28b58f30c`)

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
migración; es la vía de reversión.**

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

### `hv-supabase` · Supabase personal
**Bloqueante:** requiere crear **cuenta y organización propias** de Supabase
(nunca las del empleador). Declarar en `~/.zcode/cli/config.json` — scope de
usuario, **no** en el del workspace:

```json
"hv-supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase", "--read-only"],
  "env": { "SUPABASE_ACCESS_TOKEN": "<token-personal>" }
}
```

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

### `hv-atlassian` · Jira + Confluence — fases 1 y 2
**Reemplaza** el `atlassian` comunitario roto. Servidor oficial remoto, OAuth 2.1,
sin tokens en disco: `https://mcp.atlassian.com/v1/mcp/authv2`

> Requiere **sitio propio de Atlassian Cloud** (free hasta 10 usuarios) con correo
> personal. **No el del empleador.** El endpoint viejo `/v1/sse` dejó de funcionar
> el 30-jun-2026.

---

## Por qué el prefijo `hv-`

Los MCPs de workspace **se fusionan** con los de usuario; no los reemplazan, y
todos se conectan automáticamente al abrir el proyecto. Como no se pueden ocultar
por configuración, el prefijo hace que `hv-supabase` y `supabase` nunca se
confundan al leerlos.

> **Aislamiento real:** los 9 servidores corporativos se movieron al config del
> workspace corporativo, así que solo cargan ahí. Es una garantía de máquina,
> no de disciplina.
