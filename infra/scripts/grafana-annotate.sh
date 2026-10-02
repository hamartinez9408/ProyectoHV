#!/usr/bin/env bash
# =============================================================================
# ProyectoHV — Registro de Anotaciones de Despliegue en Grafana
# =============================================================================
# Propósito:
# Registra un evento de despliegue en la API de Grafana para trazar las métricas
# DORA (Deployment Frequency, Lead Time) en los dashboards de observabilidad.
#
# Si GRAFANA_URL o GRAFANA_API_KEY no están configurados en el entorno actual,
# el script lo notifica explícitamente y sale limpiamente (sin enmascarar errores).
# =============================================================================

set -euo pipefail

COMMIT_SHA="${1:-unknown}"
SERVICE="${2:-access-service}"
GRAFANA_URL="${GRAFANA_URL:-}"
GRAFANA_API_KEY="${GRAFANA_API_KEY:-}"

if [ -z "$GRAFANA_URL" ] || [ -z "$GRAFANA_API_KEY" ]; then
  echo "ℹ️ [grafana-annotate] GRAFANA_URL o GRAFANA_API_KEY no configurados en este entorno."
  echo "   Omitiendo registro de anotación DORA (previsto para Fase 6 en OCI)."
  exit 0
fi

NOW_MS=$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time() * 1000))')

PAYLOAD=$(cat <<EOF
{
  "time": ${NOW_MS},
  "text": "Despliegue exitoso de ${SERVICE} (commit: ${COMMIT_SHA})",
  "tags": ["deploy", "${SERVICE}", "production", "dora"]
}
EOF
)

echo "📊 [grafana-annotate] Enviando anotación de despliegue a Grafana (${GRAFANA_URL})..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${GRAFANA_URL}/api/annotations" \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" || echo "000")

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ [grafana-annotate] Anotación DORA registrada en Grafana con éxito."
  exit 0
else
  echo "⚠️ [grafana-annotate] No se pudo registrar la anotación en Grafana (HTTP ${HTTP_STATUS})."
  # No bloquea el despliegue funcional si la observabilidad responde con advertencia
  exit 0
fi
