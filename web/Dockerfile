# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN corepack enable pnpm

WORKDIR /app

COPY web/package.json ./
COPY web/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# ── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable pnpm

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY web/package.json web/tsconfig.json web/next.config.mjs web/tailwind.config.ts web/postcss.config.mjs ./
COPY web/biome.json* ./
COPY web/src ./src
COPY web/public ./public

ENV NEXT_TELEMETRY_DISABLED=1
ENV INTERNAL_API_URL=http://api:8000

RUN pnpm build

# ── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 echostats && \
    adduser --system --uid 1001 echostats

COPY --from=builder /app/public ./public
COPY --from=builder --chown=echostats:echostats /app/.next/standalone ./
COPY --from=builder --chown=echostats:echostats /app/.next/static ./.next/static

USER echostats

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
