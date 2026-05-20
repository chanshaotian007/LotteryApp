FROM node:24-alpine AS base
WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY services/api ./services/api

RUN corepack pnpm install --frozen-lockfile
RUN corepack pnpm --filter @lottery/api exec prisma generate
RUN corepack pnpm --filter @lottery/contracts build
RUN corepack pnpm --filter @lottery/domain build
RUN corepack pnpm --filter @lottery/adapters build
RUN corepack pnpm --filter @lottery/api build

EXPOSE 3000
CMD ["node", "services/api/dist/main.js"]
