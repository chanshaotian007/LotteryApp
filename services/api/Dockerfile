FROM node:24-alpine AS base
WORKDIR /workspace
RUN corepack enable
RUN apk add --no-cache ca-certificates

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY services/api ./services/api

RUN corepack pnpm install --frozen-lockfile
RUN corepack pnpm --filter @lottery/api exec prisma generate
RUN corepack pnpm --filter @lottery/contracts build
RUN corepack pnpm --filter @lottery/domain build
RUN corepack pnpm --filter @lottery/adapters build
RUN corepack pnpm --filter @lottery/api build
RUN rm -rf services/api/node_modules/@lottery/contracts \
  && rm -rf services/api/node_modules/@lottery/domain \
  && rm -rf services/api/node_modules/@lottery/adapters \
  && mkdir -p services/api/node_modules/@lottery/contracts \
  && mkdir -p services/api/node_modules/@lottery/domain \
  && mkdir -p services/api/node_modules/@lottery/adapters \
  && cp -R packages/contracts/. services/api/node_modules/@lottery/contracts/ \
  && cp -R packages/domain/. services/api/node_modules/@lottery/domain/ \
  && cp -R packages/adapters/. services/api/node_modules/@lottery/adapters/

EXPOSE 3000
CMD ["node", "services/api/dist/services/api/src/main.js"]
