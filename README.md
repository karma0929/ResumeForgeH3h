# ResumeForge

ResumeForge 是一个基于 Next.js App Router 的简历优化 SaaS，已具备面向生产环境的核心能力，包括：

- 凭证鉴权（email + password + 签名 `HttpOnly` session cookie）
- 基于 Prisma 的 PostgreSQL 持久化
- Stripe Checkout + Customer Portal + webhook 驱动的订阅状态同步
- 基于 OpenAI 的分析 / 重写 / 定制化服务层
- 服务端使用量限制与功能权限控制
- 通过 `@react-pdf/renderer` 实现 PDF 导出

## 当前上线状态

当前仓库已经按“可上线候选版本”进行组织：

- 生产环境（`APP_ENV=production` 或 `VERCEL_ENV=production`）**不会**静默回退到 mock 鉴权、mock 计费、mock AI 或内存数据。
- 本地开发环境（`APP_ENV=local`）在明确未配置外部服务时，可使用受控的本地模拟路径。
- 生产环境缺失密钥会以明确的 launch blocker 形式暴露，而不是悄悄降级。

## 技术栈

- Next.js 16（App Router）
- TypeScript
- Tailwind CSS 4
- Prisma + PostgreSQL
- Stripe
- OpenAI
- React PDF renderer

## 必需环境变量

将 `.env.example` 复制为 `.env`，并按环境分别配置。

### 核心配置

- `APP_ENV`（`local` | `preview` | `production`）
- `APP_BASE_URL`（用于重定向、计费回跳 URL）
- `SESSION_SECRET`（用于签名 session cookie 的高强度随机密钥）
- `DATABASE_URL`（PostgreSQL 连接串）

### AI 配置

- `AI_PROVIDER`（`auto`、`openai` 或 `mock`；`mock` 仅允许本地环境）
- `AI_OPENAI_MODEL`
- `OPENAI_API_KEY`

### 计费配置

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PREMIUM_REVIEW_MONTHLY`

### Seed 控制（开发环境）

- `SEED_DEMO_PASSWORD`（本地 demo 用户密码）
- `ALLOW_PRODUCTION_SEED`（默认 `false`；生产环境默认禁止 seed，除非显式覆盖）

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

3. 启动 PostgreSQL 并创建数据库

4. 生成 Prisma client 并应用 schema

```bash
npm run prisma:generate
npm run prisma:migrate:dev -- --name init
```

5. 写入本地示例数据

```bash
npm run db:seed
```

6. 启动应用

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。

### 本地 Seed 登录信息

- Email：`demo@resumeforge.dev`
- Password：`SEED_DEMO_PASSWORD` 的值（默认 `DemoPass1234`）

## 数据库工作流

### 开发环境 Schema 变更

```bash
npm run prisma:migrate:dev -- --name <migration_name>
```

### 生产环境迁移发布

```bash
npm run prisma:migrate:deploy
```

仓库中已提交 Prisma migration，目录为 `prisma/migrations`。

如果你的数据库此前是通过 `prisma db push` 创建的，需要先做 baseline：

```bash
npx prisma migrate resolve --applied 20260416_init
```

## 计费行为

- 生产环境计费以 Stripe 为准。
- 若 Stripe 配置缺失，Checkout 与 Portal 会明确报错，不会静默降级。
- `/api/stripe/webhooks` 强制执行 Stripe webhook 签名校验。
- 功能权限与导出权限均在服务端强制校验，不仅依赖 UI。

## 使用量限制（服务端强制）

Free 套餐限制：

- 最多 1 次 analysis
- 最多 2 次 bullet rewrite
- 最多 0 次 tailored draft
- 不允许导出

计数器持久化在 `UsageCounter`，并在 server actions 与 API routes 中统一校验。

## AI 行为

- OpenAI key 仅在服务端使用。
- 生产环境 AI 功能要求 OpenAI 配置完整。
- Prompt 明确禁止伪造经历、指标或技能。
- 对 OpenAI 瞬时失败已实现重试策略。

## 健康检查与就绪状态

使用：

- `GET /api/health`

返回内容包括：

- 当前环境模式
- 数据库状态
- launch blockers

返回 `503` 表示服务处于降级或未就绪状态。

## 安全说明

- Session cookie 使用签名，且设置 `HttpOnly`、`SameSite=Lax`，并在生产环境启用 `Secure`。
- 鉴权路由由 `proxy.ts` 与服务端鉴权逻辑双重保护。
- Admin 路由在服务端强制执行角色校验。
- Server actions 与导出 API 均包含输入校验。
- 非公开页面（`/dashboard`、`/admin`、鉴权页）已标记 `noindex`。

## 部署文档

请参考：

- [DEPLOYMENT.md](/Users/huang/Desktop/ResumeForge/DEPLOYMENT.md)
- [QA_CHECKLIST.md](/Users/huang/Desktop/ResumeForge/QA_CHECKLIST.md)
- [LAUNCH_CHECKLIST.md](/Users/huang/Desktop/ResumeForge/LAUNCH_CHECKLIST.md)

## 常用脚本

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run vercel-build`
- `npm run prisma:generate`
- `npm run prisma:push`
- `npm run prisma:migrate:dev`
- `npm run prisma:migrate:deploy`
- `npm run db:seed`
- `npm run db:studio`
