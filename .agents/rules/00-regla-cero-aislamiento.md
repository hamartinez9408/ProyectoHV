# REGLA #0 — Aislamiento Estructural de Credenciales Corporativas

Este proyecto (`ProyectoHV`) es un **proyecto personal de portafolio y exhibición técnica** de Harold Augusto Rodríguez Martínez.

## Prohibiciones Estrictas e Inviolables

1. **Aislamiento Total de Configuración**:
   - `C:\Users\harol\.zcode\cli\config.json` contiene credenciales del empleador y de sus clientes.
   - **NUNCA se modifica ni se leen credenciales de ese archivo.**
   - Respaldos existentes en `~/.zcode/cli/config.backup-*.json` no deben ser tocados.

2. **Servidores MCP Corporativos Vetados**:
   - `azure-devops`
   - `supabase` (ref `dguyugtnofepwuadyskj`)
   - `postgres-destino` (`db.dguyugtnofepwuadyskj.supabase.co`)
   - `postgres-origen` (`db.vjshfadnzrnoooopmtfp.supabase.co`)
   - `sophiex-mcp`
   - `sophiex-ragflow`
   - `sophiex-itsm-sdp`
   - `sophiex-zabbix`
   - `sophiex-ollama`
   - **Prohibido invocarlos, leerlos o escribir en ellos.**

3. **Aislamiento de Rutas de Archivos**:
   - Prohibido leer, escribir o navegar en cualquier ruta bajo `C:\Stefanini\` por cualquier medio.

4. **MCPs Permitidos**:
   - MCPs propios con prefijo `hv-`: `hv-supabase`, `hv-github`, `hv-sentry`, `hv-atlassian`.
   - MCPs neutros: `context7`, `tavily_search`, `playwright`, `magicuidesign`, `netlify`, `docker`.
