# Build context is the repo root (npm workspaces): see infra/lib/api-stack.ts,
# where DockerImageAsset points its directory at ".." from apps/api.

FROM node:22-slim AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN npm run build -w @evinova/contracts
RUN npm run build -w @evinova/api

FROM node:22-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo/package.json /repo/package-lock.json ./
COPY --from=build /repo/apps/api/package.json apps/api/package.json
COPY --from=build /repo/packages/contracts/package.json packages/contracts/package.json
RUN npm ci --omit=dev --workspace=@evinova/api --workspace=@evinova/contracts

COPY --from=build /repo/packages/contracts/dist packages/contracts/dist
COPY --from=build /repo/apps/api/dist apps/api/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
