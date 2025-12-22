FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9.15.1

# Set working directory to monorepo root
WORKDIR /app

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

# Build Next.js app
RUN pnpm --filter @spig/web build

# Production stage
FROM node:20-alpine AS production

RUN npm install -g pnpm@9.15.1

WORKDIR /app

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/package.json ./apps/web/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base /app/apps/web/next.config.js ./apps/web/
COPY --from=base /app/apps/web/package.json ./apps/web/
COPY --from=base /app/packages/shared-types ./packages/shared-types

WORKDIR /app/apps/web

# Expose port
EXPOSE 3000

# Start Next.js
CMD ["pnpm", "start"]

