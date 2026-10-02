#!/usr/bin/env bash
# =============================================================================
# ProyectoHV — Despliegue con Health Check Activo y Rollback Real
# =============================================================================
# Propósito:
# Despliega un servicio en Docker Compose, verifica activamente su salud vía HTTP
# y, si el health check falla en <60s, revierte inmediatamente a la imagen anterior.
#
# Uso:
#   ./infra/scripts/deploy-with-rollback.sh <service-name> <new-image-tag> <health-url>
# Ejemplo:
#   ./infra/scripts/deploy-with-rollback.sh access-service ghcr.io/hamartinez9408/access-service:a1b2c3d http://localhost:8081/actuator/health
# =============================================================================

set -euo pipefail

SERVICE_NAME="${1:-access-service}"
NEW_IMAGE="${2:-}"
HEALTH_URL="${3:-http://localhost:8081/actuator/health}"
COMPOSE_FILE="infra/docker-compose.yml"
MAX_ATTEMPTS=12
SLEEP_SECONDS=5

if [ -z "$NEW_IMAGE" ]; then
  echo "❌ [deploy] Error: Debe proporcionar el nombre de la imagen a desplegar."
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ [deploy] Error: Archivo $COMPOSE_FILE no encontrado."
  exit 1
fi

echo "================================================================="
echo "🚀 [deploy] Iniciando despliegue de servicio: $SERVICE_NAME"
echo "   Nueva imagen: $NEW_IMAGE"
echo "   Endpoint de salud: $HEALTH_URL"
echo "================================================================="

# 1. Obtener imagen actual en ejecución para posible rollback
CURRENT_IMAGE=$(docker inspect --format='{{.Config.Image}}' "proyectohv-${SERVICE_NAME}" 2>/dev/null || echo "")
if [ -n "$CURRENT_IMAGE" ]; then
  echo "📌 [deploy] Imagen previa detectada para rollback: $CURRENT_IMAGE"
else
  echo "ℹ️ [deploy] No se detectó contenedor previo en ejecución. Despliegue inicial."
fi

# 2. Desplegar con la nueva imagen
echo "🐳 [deploy] Aplicando nueva imagen con Docker Compose..."
IMAGE_ACCESS_SERVICE="$NEW_IMAGE" docker compose -f "$COMPOSE_FILE" up -d --no-deps "$SERVICE_NAME"

# 3. Sondeo activo de salud (Health Check)
echo "🩺 [deploy] Esperando confirmación de salud en $HEALTH_URL (hasta $((MAX_ATTEMPTS * SLEEP_SECONDS))s)..."
HEALTH_OK=false

for i in $(seq 1 "$MAX_ATTEMPTS"); do
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$STATUS_CODE" = "200" ]; then
    echo "✅ [deploy] Servicio saludable tras $((i * SLEEP_SECONDS)) segundos (HTTP 200)."
    HEALTH_OK=true
    break
  fi
  echo "   [Intento $i/$MAX_ATTEMPTS] HTTP $STATUS_CODE recibida. Reintentando en ${SLEEP_SECONDS}s..."
  sleep "$SLEEP_SECONDS"
done

# 4. Evaluación y Rollback Automatizado si falló
if [ "$HEALTH_OK" = false ]; then
  echo "❌ [deploy] HEALTH CHECK FALLIDO: El servicio no respondió HTTP 200 tras $((MAX_ATTEMPTS * SLEEP_SECONDS))s."
  
  if [ -n "$CURRENT_IMAGE" ]; then
    echo "🚨 [ROLLBACK] Iniciando reversión inmediata a la imagen estable anterior: $CURRENT_IMAGE..."
    IMAGE_ACCESS_SERVICE="$CURRENT_IMAGE" docker compose -f "$COMPOSE_FILE" up -d --no-deps "$SERVICE_NAME"
    
    # Validar que el rollback restauró el servicio
    echo "🩺 [ROLLBACK] Verificando salud tras rollback..."
    sleep 5
    ROLLBACK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
    if [ "$ROLLBACK_STATUS" = "200" ]; then
      echo "✅ [ROLLBACK] Servicio restaurado exitosamente con la imagen previa ($CURRENT_IMAGE)."
    else
      echo "⚠️ [ROLLBACK] Alerta crítica: El servicio sigue sin responder tras el rollback."
    fi
  else
    echo "⚠️ [ROLLBACK] No existe imagen previa a la cual revertir. Deteniendo contenedor anómalo..."
    docker compose -f "$COMPOSE_FILE" stop "$SERVICE_NAME" || true
  fi

  echo "⛔ [deploy] Despliegue abortado y revertido. Saliendo con error."
  exit 1
fi

echo "🎉 [deploy] Despliegue completado satisfactoriamente."
exit 0
