# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install bun
RUN npm install -g bun@1

# Copy dependency files
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN bun run db:generate

# Build Next.js
RUN bun run build

# ---- Run Stage ----
FROM node:20-alpine AS runner

WORKDIR /app

# Install bun
RUN npm install -g bun@1

# Set production environment
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy built output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static/
COPY --from=builder /app/public ./public/

# Create db directory
RUN mkdir -p /app/db

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/api/me || exit 1

CMD ["node", "server.js"]