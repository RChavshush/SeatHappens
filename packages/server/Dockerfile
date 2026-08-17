# Build context is the monorepo root (cinema/) so workspace deps resolve.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/server packages/server

# DISABLE_ERD skips the prisma-erd-generator; the ERD is a committed dev
# artifact (docs/erd.md) and its source tree is not part of this build context.
RUN npm run build -w @cinema/shared \
 && DISABLE_ERD=true npm run prisma:generate -w @cinema/server \
 && npm run build -w @cinema/server

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Carry the full dependency tree: migrate deploy (prisma) and the seed (tsx)
# both run at container start, so their CLIs must be present at runtime.
COPY --from=build /app ./

ENTRYPOINT ["packages/server/docker-entrypoint.sh"]
