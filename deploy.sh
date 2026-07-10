#!/bin/bash

# Terminar el script inmediatamente si algún comando falla
set -e

# Función para imprimir mensajes con fecha y hora
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "==========================================="
log "🚀 INICIANDO DEPLOY DE SISTEMA-DROGUERIA..."
log "==========================================="

# 1. Obtener los últimos cambios del repositorio
log "📥 Obteniendo últimos cambios (git pull origin main)..."
git pull origin main

# 2. Detener contenedores actuales (V2)
log "🛑 Deteniendo servicios actuales..."
docker compose down

# 3. Reconstruir las imágenes desde cero (V2)
log "🏗️  Construyendo nuevas imágenes Docker (--no-cache)..."
docker compose build --no-cache

# 4. Levantar los contenedores en modo detached (V2)
log "🚀 Levantando servicios (up -d)..."
docker compose up -d

# 5. Esperar y verificar el healthcheck del backend
log "⏳ Esperando a que el backend reporte estado 'healthy' (max 60s)..."
# Damos unos segundos iniciales para que el contenedor arranque
sleep 5

ATTEMPTS=0
MAX_ATTEMPTS=12 # 12 intentos * 5 seg = 60 segundos
HEALTH_STATUS="starting"

while [ "$HEALTH_STATUS" != "healthy" ]; do
    if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
        log "❌ ERROR: El backend no alcanzó el estado 'healthy' a tiempo."
        log "Revisá los logs con: docker logs drogueria_backend"
        exit 1
    fi
    
    # Obtener el estado del healthcheck del contenedor del backend
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' drogueria_backend)
    
    if [ "$HEALTH_STATUS" == "unhealthy" ]; then
        log "❌ ERROR: El backend reportó estado 'unhealthy'. Abortando."
        log "Revisá los logs con: docker logs drogueria_backend"
        exit 1
    fi

    if [ "$HEALTH_STATUS" != "healthy" ]; then
        log "   ... estado actual: $HEALTH_STATUS. Reintentando en 5s..."
        sleep 5
        ATTEMPTS=$((ATTEMPTS+1))
    fi
done

log "✅ El backend está healthy. Los servicios están funcionando correctamente."

# 6. Limpieza de imágenes "colgadas" (dangling) para liberar espacio en disco
log "🧹 Limpiando imágenes y redes sin usar (prune)..."
docker system prune -f

log "==========================================="
log "🎉 DEPLOY COMPLETADO EXITOSAMENTE"
log "==========================================="
