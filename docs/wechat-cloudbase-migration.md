# 微信云托管迁移步骤

## 1. 导出旧库

```bash
python server/scripts/export_legacy.py lottery_dev.db docs/legacy-export.json
```

## 2. 初始化新服务

```bash
corepack pnpm install
corepack pnpm --filter @lottery/api exec prisma generate
```

## 3. 导入旧数据

```bash
corepack pnpm --filter @lottery/api legacy:import docs/legacy-export.json
```

## 4. 本地验证

```bash
corepack pnpm test
corepack pnpm exec tsc -p services/api/tsconfig.json --noEmit
corepack pnpm exec tsc -p apps/admin-web/tsconfig.json --noEmit
corepack pnpm exec tsc -p apps/miniprogram/tsconfig.json --noEmit
```

## 5. 云托管部署

- 以仓库根目录作为构建上下文。
- 使用 `infra/cloudbase.template.json` 作为模板，补全环境 ID、数据库连接和 JWT/支付配置。
- 云函数 `bootstrapLogin` 用于签发业务 JWT。
- 云函数 `jobs` 用于触发内部同步、训练、对账和源站探活接口。
