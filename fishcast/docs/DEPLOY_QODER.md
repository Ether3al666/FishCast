# Codex → Qoder Sites 部署交接

当前仅完成本地源代码与静态构建准备，**未创建站点、未发布预览、未公开分享、未开通付费服务**。

## 构建

```sh
cd fishcast
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

发布目录为 `fishcast/dist`，需包含 `index.html`、`assets` 与 `favicon.svg`。本项目 `base: './'` 配合 HashRouter，支持部署子目录和无 history fallback 的静态托管。链接形如 `/#/plan`，刷新不要求后端路由。

无运行时 Node 服务、数据库或必需环境变量。天气为浏览器 HTTPS 请求，需在实际站点检查跨域、网络和返回内容。正式验收不能用浏览器测试 fixture 代替真实 API。地图默认列表降级，不加载未核准的 SDK。

## Qoder 操作（由用户授权后执行）

已读取 [Qoder CN 官方 Sites 文档](https://docs.qoder.cn/cli/sites)（2026-11-16）：支持现有项目、会话内 Sites Skills、`/sites` 面板。平台功能说明不代表本用户账号已具备相关权限。

在项目目录打开已登录的 Qoder CLI / IDE，会话内提供以下请求：

> 请阅读 README.md 与 docs/DEPLOY_QODER.md，审查构建产物 dist/ 和静态路由。准备部署前向我展示站点可见范围、预览行为和需用权限，等待我确认。获准后先发布预览，核查资源与真实天气 API；公开分享、域名、Secrets 或付费操作另行请求确认。保留 Qoder 对工程审查、部署适配、缺陷修复的真实记录。

不要猜测低层写操作参数，不使用其他平台发布来冒充 Qoder Sites。若仅支持静态 Sites，就保持路线 A；未确认 Server Functions / Secrets / Cloud Agents 权限前，不开发运行时 AI 端点。

## 公开前验收

- 无登录浏览器可访问，首页、地图列表、规划、关于页及深层刷新可用。
- 天气真实成功与超时失败均检查，缓存明确标识；数据源署名可见。
- 地图 Key 的域名、安全代理、配额与许可复核；服务端 Secret 不进静态包。
- 手机页面按钮可用，DEMO 标志醒目，无虚假钓点或分数。
- 向比赛主办方确认 Codex 主开发、Qoder 参与审查及部署的分工是否满足“使用 Qoder 开发”的要求，不能自行宣称已合规。

账号、公开 URL、地图服务和外网验收均为后续待办，不能以本地构建通过代替。
