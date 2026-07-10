# ==========================================
# STAGE 1: Build de la aplicación React/Vite
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias limpias
COPY package*.json ./
RUN npm ci

# Copiar el código fuente y compilar
COPY . .
RUN npm run build

# ==========================================
# STAGE 2: Servidor Nginx liviano
# ==========================================
FROM nginx:alpine

# Limpiar los archivos por defecto de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar el build del Stage 1 al directorio público de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Sobrescribir la configuración de Nginx con nuestro archivo preparado
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
