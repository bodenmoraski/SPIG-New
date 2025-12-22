# This Dockerfile assumes Railway's Root Directory is set to: spig-new/spig-new-main
# Build context should be the monorepo root

FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9.15.1

# Set working directory to monorepo root
WORKDIR /app

# Copy package files for dependency resolution
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY apps/api/package.json ./apps/api/package.json

# Install all dependencies (needed for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

# Generate Prisma client
RUN pnpm --filter @spig/api prisma generate

# Build the API
RUN pnpm --filter @spig/api build

# Production stage
FROM node:20-alpine AS production

RUN npm install -g pnpm@9.15.1

WORKDIR /app

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY apps/api/package.json ./apps/api/package.json

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application and generated Prisma client
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/prisma ./apps/api/prisma
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=base /app/packages/shared-types/package.json ./packages/shared-types/package.json

WORKDIR /app/apps/api

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"]

