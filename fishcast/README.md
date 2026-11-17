# FishCast · 重庆淡水出钓助手

路线 A：React + Vite + TypeScript + Tailwind 静态 SPA。当前为 **M0/M1（v0.1）**，不是完整比赛 MVP。无 Node 业务服务器、数据库或模型服务依赖。

## 本地启动

需要 Node.js 22.12+（本机验证 Node 24）与 npm。

```sh
cd fishcast
npm ci
npm run dev
```

打开终端显示的本地地址。无需 `.env`、账号或 Key 即可运行。首次加载天气会请求 `https://api.open-meteo.com`；失败时显示错误与重试，不注入示例天气。

当前电脑的 Codex 精简运行时没有全局 npm，已用临时 npm 完成安装并生成 `package-lock.json`。现有依赖已就绪，Windows 下双击 `start-dev.cmd` 即可启动。它只为本次启动设置 PowerShell 进程级执行策略，不修改全局策略。也可在终端执行 `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-dev.ps1`。脚本只监听本地，不部署。换一台电脑请按上面的标准 npm 流程安装。

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

浏览器验收：`npx playwright install chromium`，然后 `npm run test:e2e`。首次下载浏览器需联网。测试中的 API 失败由请求拦截显式模拟；截图文件名标注失败分支或 DEMO。测试不会发布网站。

若本机已有 Edge，也可设置 PowerShell `$env:PLAYWRIGHT_CHANNEL = 'msedge'` 再运行测试。手动真实 API 探针是 `npm run probe:weather`；Node 与浏览器可能使用不同网络路径，探针失败不会切换到假天气。网络差异见验证报告。

## 当前可用

- `/#/`：山水探索首页、今天/明天逐小时真实天气、数据完整度、空推荐状态。
- `/#/map`：按需加载高德地图、342 条场所资料、341 个园区或水域参考标记，支持重庆全域、区县、传统主城九区与许可状态筛选、独立示例模式。现行36个区县有资料，外围29个区县均有条目；渝中暂未收录，见 [全域覆盖与来源](docs/CITYWIDE_COVERAGE.md)。
- `/#/spots/:id`：地址、资料来源及发布时间、参考坐标来源、许可缺口；模式不符时显示空状态。
- `/#/plan`：本地规则对话助手、出行草稿与精确设置表单；支持重庆全域、单区县、传统主城九区或公里半径查找候选，选场所后查询当地天气并比较时段；许可未知的场所不进入正式推荐。
- `/#/about`：来源、数据缺口、隐私、法规核查入口。
- 示例模式需要手动开启，顶栏与天气均标记 DEMO，不持久化、不进入正式推荐。
- 默认不获取定位；用户点击后才申请浏览器权限。拒绝授权仍可使用城市参考中心。

## 已知边界与风险

真实库收录 342 条有公开来源的场所资料，341 条有高德场所/园区/水域参考位置，1 条坐标待核实，264 条配有高德场所图片。这是经过筛选的选集，不是重庆钓场的穷尽目录。全部为 UNKNOWN：场所报道、赛事记录、图片与地图收录不构成当前开放许可，不提供具体钓位导航。高德 SDK 已接入，网页运行时不调用 POI 搜索。详情见 [全域覆盖记录](docs/CITYWIDE_COVERAGE.md)。仍未启用匹配评分；不生成分数、TOP3 或鱼获概率。

天气是城市参考中心或用户位置的数值预报，非钓点实测。无官方预警、水位、路况数据，不能据此声称安全。30 分钟内存缓存；离线/请求失败时，已有缓存醒目标记非实时并禁止评分；无缓存只显示缺失。页面不支持首次离线加载或离线刷新（本轮未引入 Service Worker）。

自然语言模型、收藏、个人记录、跨设备同步均未启用。未来若添加个人数据，只在设备本地保存并提供清空和导出。不得在 `VITE_` 变量中放模型密钥。

## 交接

- [架构与阶段范围](docs/ARCHITECTURE.md)
- [数据源及缺口](docs/DATA_SOURCES.md)
- [法规与使用说明](docs/LEGAL_NOTICE.md)
- [Qoder 部署交接](docs/DEPLOY_QODER.md)
- [验证报告与截图](docs/TEST_REPORT.md)

暂时可跳过的外部条件：经核准的高德前端 Key / 安全代理与域名配置、5–10 条真实候选场所及许可证据、Qoder Sites 账号与发布授权。运行时 AI 权限不属于路线 A 的前置条件。
