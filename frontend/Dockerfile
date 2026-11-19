# ==============================================================================
# Stage 1: Production Client Build & Bundle Optimization
# ==============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build-time API gateway base URL (defaults to /api for reverse proxy)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./
RUN npm ci

COPY . .

# Compile TypeScript and Vite production bundle
RUN npm run build

# ==============================================================================
# Stage 2: Hardened Unprivileged Nginx Reverse Proxy & Static Server
# ==============================================================================
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

# Copy optimized production bundle to web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom hardened reverse-proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

# Production web healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
