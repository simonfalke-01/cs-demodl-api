FROM node:24-slim AS base

# Install Bun for all users
RUN apt-get update && \
    apt-get install -y curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    apt-get install -y libc6 && \
    chmod -R 755 /root/.bun && \
    mkdir -p /usr/local/bin && \
    cp /root/.bun/bin/bun /usr/local/bin/bun && \
    chmod 755 /usr/local/bin/bun

# Set environment variable for Bun
ENV PATH="/usr/local/bin:${PATH}"
WORKDIR /app

# Builder Stage: Set up the repository and prune it
FROM base AS builder
# Set working directory
WORKDIR /app
# Install turbo
RUN npm install -g turbo@^2
# Copy all files
COPY . .
# Generate pruned monorepo with both apps
RUN turbo prune --scope=api --scope=demo-dl --docker

# Installer Stage: Install dependencies and build the apps
FROM base AS installer
WORKDIR /app

# First install dependencies
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
RUN bun run build

# Runner Stage: Set up the production environment
FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser && \
    chown -R appuser:nodejs /usr/local/bin/bun && \
    chmod 755 /usr/local/bin/bun

# Copy built applications from installer
COPY --from=installer --chown=appuser:nodejs /app/apps/api/dist /app/apps/api/dist
COPY --from=installer --chown=appuser:nodejs /app/apps/demo-dl/dist /app/apps/demo-dl/dist
COPY --from=installer --chown=appuser:nodejs /app/node_modules /app/node_modules
COPY --from=installer --chown=appuser:nodejs /app/package.json /app/package.json

# Copy package.json files to maintain workspace references
COPY --from=installer --chown=appuser:nodejs /app/apps/api/package.json /app/apps/api/package.json
COPY --from=installer --chown=appuser:nodejs /app/apps/demo-dl/package.json /app/apps/demo-dl/package.json

# Copy workspace packages
COPY --from=installer --chown=appuser:nodejs /app/packages /app/packages

# Set environment variable for production
ENV NODE_ENV=production

# Switch to non-root user
USER appuser

# Expose API port (adjust if your API uses a different port)
EXPOSE 3000

# Start both applications
CMD ["sh", "-c", "cd /app && NODE_PATH=/app node apps/demo-dl/dist/index.js & cd /app && NODE_PATH=/app bun apps/api/dist/index.js"]