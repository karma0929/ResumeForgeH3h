# QA 检查清单

每次生产发布前，请在 staging 或 preview 环境执行本清单。

## 环境与就绪性

- [ ] `/api/health` 返回 `200`，且 `launchBlockers` 为空。
- [ ] `APP_ENV` 与预期一致（`preview` 或 `production`）。
- [ ] 数据库连接稳定，页面刷新后数据可持续保留。

## 鉴权与授权

- [ ] 使用新邮箱/密码注册成功。
- [ ] 使用有效凭证登录成功。
- [ ] 使用错误密码登录时返回安全错误信息。
- [ ] 未登录用户无法访问 `/dashboard/*`。
- [ ] 未登录用户无法访问 `/admin`。
- [ ] 非管理员用户访问 `/admin` 会被重定向。

## 简历主流程

- [ ] 在 Upload 页面保存 resume 文本成功。
- [ ] 在 Upload 页面保存 job description 成功。
- [ ] 在 Analysis 页面运行 analysis 成功。
- [ ] Analysis 分数、关键词、建议项渲染正确。
- [ ] 在 Tailoring 页面运行 bullet rewrite 成功。
- [ ] 在 Tailoring 页面生成 tailored draft 成功。
- [ ] 保存 tailored version 后，可在 Versions 页面看到对应版本。

## 使用量限制与套餐权限

- [ ] Free 计划仅允许 1 次 analysis。
- [ ] Free 计划仅允许 2 次 bullet rewrite。
- [ ] Free 计划会正确阻止 tailored 生成 / 保存。
- [ ] Free 计划会正确阻止 `/api/export` 导出。
- [ ] 超限或权限不足时会出现正确的升级提示。

## 计费与 Stripe

- [ ] 启动 Pro checkout 后可进入 Stripe Checkout。
- [ ] 完成 checkout 后，webhook 可正确同步订阅状态。
- [ ] 可从 Billing 页面打开 Stripe billing portal。
- [ ] 在 portal 中取消/修改订阅后，webhook 可正确回写。
- [ ] Billing 页面可看到支付事件记录。

## 导出

- [ ] 在 Versions 页面导出 PDF 成功，文件有效可读。
- [ ] 在允许权限下，`format=txt` 导出路径可正常工作。
- [ ] 导出他人 version 时应返回 `404`。

## 错误处理与可靠性

- [ ] 表单缺失/非法输入会返回用户可读的校验错误。
- [ ] 外部服务故障时返回安全错误（不暴露堆栈）。
- [ ] 全局与路由级错误边界可以正常渲染兜底 UI。
- [ ] 客户端可见响应中不出现敏感密钥信息。

## SEO 与隐私

- [ ] `/dashboard`、`/admin`、`/login`、`/signup` 均为 noindex。
- [ ] 公共营销页面按预期可被索引。

## 最终发布判断（Go / No-Go）

- [ ] 所有关键检查项通过。
- [ ] Launch checklist 项目已完成。
- [ ] 已确认可用的回滚目标版本。
