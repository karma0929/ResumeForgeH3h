# LAUNCH_CHECKLIST

## 代码中已自动完成（Completed automatically in code）

- 生产路径在配置缺失时会明确失败，不再静默降级到 mock。
- 环境分层已显式实现（基于 `APP_ENV` + `VERCEL_ENV` 推断）。
- 运行时 launch blocker 已通过以下路径暴露：
  - 根布局中的 launch-block UI 保护页
  - `/api/health`
- 已实现真实的凭证鉴权流程，包括：
  - 密码哈希（`scrypt`）
  - 签名 `HttpOnly` session cookie
  - 服务端路由鉴权校验
- `/dashboard`、`/admin`、`/api/export` 已实现服务端保护。
- Admin 角色校验已在服务端强制执行。
- Server actions 输入校验已覆盖，并包含使用量/功能权限保护。
- Free 套餐使用量限制已落库（`UsageCounter`）并在服务端强制执行。
- Stripe 计费架构已接入：
  - checkout flow
  - portal flow
  - webhook 签名校验
  - 订阅/支付/会话状态持久化
- OpenAI provider 层已满足生产要求：
  - 生产环境禁用自动 mock fallback
  - 瞬时失败重试机制
  - 防伪造生成约束（anti-fabrication prompt）
- 导出路径已实现真实 PDF/TXT，且带服务端权限校验。
- Prisma migration 基础结构已加入 `prisma/migrations`。
- seed 脚本默认禁止在生产环境执行，除非显式覆盖。

## 我必须手动完成（Manual steps I must do myself）

- 创建并妥善保护生产 PostgreSQL 凭据。
- 在 Vercel 配置所有生产环境变量。
- 生成并安全保存高强度 `SESSION_SECRET`。
- 在生产数据库执行并验证 `prisma migrate deploy`。
- 决定是否在你的分支/策略中彻底关闭本地 demo 登录入口。
- 制定生产 OpenAI 模型策略与预算护栏。
- 配置 edge / WAF 限流规则，覆盖鉴权与高成本操作。
- 确认通过 Stripe portal 处理降级/取消订阅的运维流程。
- 按 [QA_CHECKLIST.md](/Users/huang/Desktop/ResumeForge/QA_CHECKLIST.md) 执行完整 QA。

## 第三方控制台操作（Third-party dashboard actions）

- 注册并配置 Vercel 项目。
- 将 GitHub 仓库连接到 Vercel。
- 创建 Neon（或其他 PostgreSQL）生产数据库 / 分支。
- 在 Stripe 创建 live 产品与 price ID。
- 配置 Stripe webhook endpoint：
  - `https://<your-domain>/api/stripe/webhooks`
- 配置 OpenAI API key 与调用限额。
- 在 Vercel 绑定自定义域名并配置 DNS。
- 确认自定义域名 SSL 证书签发成功。

## 上线前必须验证（Must verify before going live）

- `/api/health` 返回 `200` 且无 launch blocker。
- 生产域名上的注册/登录/退出流程正常。
- Dashboard 主流程（upload -> analysis -> tailoring -> versions）端到端可用。
- Free 套餐限制在服务端生效。
- 升级流程可正确跳转 Stripe checkout。
- Stripe webhook 能正确回写订阅状态。
- Billing portal 可正常打开并回跳。
- 付费用户 PDF 导出成功，免费用户导出被正确阻止。
- 非管理员账户无法访问 Admin 路由。
- 客户端响应与浏览器端不泄露任何密钥。
- 错误页展示安全错误信息，不暴露堆栈。

## 当前仍阻塞上线的事项（Blockers that still prevent launch）

- 生产环境在以下变量未配置前不可上线：
  - `APP_BASE_URL`
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `OPENAI_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_PRO_MONTHLY`
  - `STRIPE_PRICE_PREMIUM_REVIEW_MONTHLY`
- 若未完成 Stripe live 产品 / 价格 / webhook 配置，付费计费链路不可用。
- 若生产数据库迁移未成功部署，不能进行流量切换。
