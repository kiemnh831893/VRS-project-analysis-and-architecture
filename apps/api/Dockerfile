FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.23.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

FROM deps AS build
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY apps/api ./apps/api
RUN pnpm --filter @vrs/api prisma:generate \
 && pnpm --filter @vrs/api build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/server.js"]
