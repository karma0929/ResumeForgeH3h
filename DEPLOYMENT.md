# 部署指南

本文档说明如何将 ResumeForge 部署到 Vercel，并接入 PostgreSQL、Stripe 与 OpenAI 的生产环境配置。

## 1. 前置条件

- 本项目的 GitHub 仓库
- Vercel 账号
- PostgreSQL 服务商账号（推荐：Neon）
- Stripe 账号
- OpenAI API 访问权限
- 自定义域名（可选，但推荐）

## 2. 准备 PostgreSQL（Neon）

1. 在 Neon 创建项目与生产数据库。
2. 复制 pooled connection string。
3. 确认连接串启用了 SSL 模式。
4. 在 Vercel 中将该连接串配置为 `DATABASE_URL`。

建议为 preview 与 production 分别创建独立的 Neon branch / database。

## 3. 配置 Stripe

1. 在 Stripe 创建产品与价格：
   - Pro Monthly
   - Premium Review Monthly
2. 记录 live price ID：
   - `STRIPE_PRICE_PRO_MONTHLY`
   - `STRIPE_PRICE_PREMIUM_REVIEW_MONTHLY`
3. 记录 live secret key：`STRIPE_SECRET_KEY`
4. 在 Stripe Webhooks 中新增 endpoint：
   - `https://<your-domain>/api/stripe/webhooks`
5. 为该 endpoint 订阅以下事件：
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
6. 将 webhook signing secret 配置到 `STRIPE_WEBHOOK_SECRET`。

## 4. 配置 OpenAI

1. 在 OpenAI 控制台创建或选择 API key。
2. 配置以下环境变量：
   - `OPENAI_API_KEY`
   - `AI_PROVIDER=auto`（或 `openai`）
   - `AI_OPENAI_MODEL`（例如 `gpt-5`）
3. 在 OpenAI 控制台设置预算与调用限额。

## 5. 配置 Vercel 项目

1. 将 GitHub 仓库导入 Vercel。
2. Framework Preset 选择 Next.js。
3. 设置 Build Command：

```bash
npm run vercel-build
```

4. 设置 Output Command：

```bash
npm run start
```

5. 按环境配置环境变量：
   - Production
   - Preview
   - Development（可选）
6. 配置 edge / WAF 限流规则，覆盖鉴权入口与高成本路由。

生产环境必填变量：

- `APP_ENV=production`
- `APP_BASE_URL=https://<your-domain>`
- `SESSION_SECRET=<long-random-secret>`
- `DATABASE_URL=<postgres-connection-string>`
- `AI_PROVIDER=auto`
- `AI_OPENAI_MODEL=gpt-5`
- `OPENAI_API_KEY=<openai-key>`
- `STRIPE_SECRET_KEY=<stripe-live-secret>`
- `STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>`
- `STRIPE_PRICE_PRO_MONTHLY=<price-id>`
- `STRIPE_PRICE_PREMIUM_REVIEW_MONTHLY=<price-id>`
- `ALLOW_PRODUCTION_SEED=false`

## 6. 执行生产迁移

`npm run vercel-build` 已内置 `prisma migrate deploy`。

如需手动执行迁移：

```bash
npm run prisma:migrate:deploy
```

生产环境不要使用 `prisma db push`。

如果目标数据库已存在表（例如早期通过 `db push` 初始化），在执行 `migrate deploy` 前先进行 baseline：

```bash
npx prisma migrate resolve --applied 20260416_init
```

执行该命令前，请先确认现有 schema 与 `prisma/migrations/20260416_init/migration.sql` 一致。

## 7. 部署流程

1. 推送代码到主分支。
2. 等待 Vercel build 完成。
3. 验证 `/api/health` 返回 `200` 且无 launch blocker。
4. 按 [QA_CHECKLIST.md](/Users/huang/Desktop/ResumeForge/QA_CHECKLIST.md) 完成 QA。
5. 将部署版本切换为生产流量。

## 8. 生产发布检查清单

- [ ] 已在 Vercel 配置生产环境变量。
- [ ] `APP_ENV=production` 且 `APP_BASE_URL` 与线上域名一致。
- [ ] `npm run vercel-build` 成功。
- [ ] `prisma migrate deploy` 执行成功。
- [ ] `/api/health` 为绿色状态（200，无 launch blocker）。
- [ ] Stripe webhook endpoint 已生效并可接收事件。
- [ ] OpenAI key 有足够额度，且预算策略已配置。
- [ ] 已通过 [QA_CHECKLIST.md](/Users/huang/Desktop/ResumeForge/QA_CHECKLIST.md) 的核心流程验证。

## 9. 自定义域名配置

1. 在 Vercel 项目设置中添加自定义域名。
2. 在域名服务商处添加 DNS 记录。
3. 等待 Vercel 签发 SSL 证书。
4. 将 `APP_BASE_URL` 更新为正式域名。
5. 如域名变更，更新 Stripe webhook endpoint。

## 10. 回滚检查清单

1. 在 Vercel 选择最近一个已验证通过的部署版本。
2. 执行回滚并切换流量。
3. 再次确认 `/api/health` 与核心业务流程。
4. 若问题与迁移相关：
   - 恢复数据库备份 / 快照
   - 回滚并重新部署匹配版本代码
5. 重新验证计费与导出等关键路径。

更完整的上线 / 回滚闸门请参考 [LAUNCH_CHECKLIST.md](/Users/huang/Desktop/ResumeForge/LAUNCH_CHECKLIST.md)。
