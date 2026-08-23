# ---- Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Nicht als root laufen
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone-Output von Next.js kopieren
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Beschreibbares Datenverzeichnis für die JSON-Datenbank (Benutzer, Anfragen)
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
VOLUME ["/app/data"]

USER nextjs
EXPOSE 3000

# Lebenszeichen gegen /api/health (prüft u. a., ob /app/data beschreibbar ist).
# Bewusst mit Node statt curl/wget: Das Alpine-Image bringt keines von beiden
# mit, und beides nachzuinstallieren würde das Image nur unnötig vergrößern
# und die Angriffsfläche erweitern. Node 20 hat `fetch` eingebaut.
# start-period deckt den Kaltstart ab, damit der Container beim Hochfahren
# nicht fälschlich als "unhealthy" markiert wird.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
