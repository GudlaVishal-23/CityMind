# ==============================================================================
# Stage 1: Dependencies Resolution (with legacy-peer-deps compliance)
# ==============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Install build dependencies for native compilation if required
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci --legacy-peer-deps

# ==============================================================================
# Stage 2: Production TypeScript Compilation & DevDependency Pruning
# ==============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compile TypeScript to dist/
RUN npm run build

# Prune development dependencies to keep production footprint minimal
RUN npm prune --omit=dev --legacy-peer-deps

# ==============================================================================
# Stage 3: Minimal, Hardened Production Runner (Non-Root User)
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Run container as unprivileged non-root node user
USER node

# Copy pruned production runtime artifacts with ownership
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

EXPOSE 5000

# Declare explicit production healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Production entrypoint
CMD ["node", "dist/server.js"]
