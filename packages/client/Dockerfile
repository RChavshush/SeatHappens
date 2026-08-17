# Build context is the monorepo root (cinema/) so workspace deps resolve.
FROM node:22-alpine AS dev
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/client packages/client

# The client imports the compiled shared package.
RUN npm run build -w @cinema/shared

EXPOSE 5173
CMD ["npm", "run", "dev", "-w", "@cinema/client", "--", "--host", "0.0.0.0"]
