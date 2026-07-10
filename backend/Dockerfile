# Dockerfile para Producción del Backend de Licitaciones

# Etapa 1: Construcción y Dependencias
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

# Instalar dependencias incluyendo las de desarrollo temporalmente para compilar si hiciera falta
RUN npm ci

COPY . .

# Etapa 2: Imagen Final de Producción (Ligera)
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./

# Instalar solo dependencias de producción para mantener el contenedor ligero y seguro
RUN npm ci --only=production

# Copiar código fuente desde el builder
COPY --from=builder /usr/src/app/src ./src

# Exponer el puerto del backend configurado
EXPOSE 3000

# Ejecutar la aplicación
CMD ["node", "src/index.js"]
