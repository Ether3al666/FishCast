# M0/M1 验证报告

日期：2026-11-16（Asia/Shanghai，约 20:44 起）。环境：Windows / Node 24.22.1 / Vite 6.4.6。

## 范围

本阶段为前端骨架、真实天气适配器与安全闸门。真实钓点核查、距离/鱼种排序、完整时段推荐、Qoder 外网发布与运行时 AI 不在本轮完成范围。

## 自动检查

| 检查                | 实际结果                 | 证据                                                          |
| ------------------- | ------------------------ | ------------------------------------------------------------- |
| `npm run lint`      | PASS，0 错误             | ESLint 全项目                                                 |
| `npm run typecheck` | PASS                     | 严格 TypeScript                                               |
| `npm run test`      | PASS，21 项              | 天气 6 项，闸门 / 规划器 15 项                                |
| `npm run test:e2e`  | PASS，10 项              | Edge，单 worker；失败用请求拦截，缓存成功用 synthetic fixture |
| `npm run build`     | PASS，干净安装后重建成功 | `dist/index.html`、JS / CSS                                   |

单测覆盖：UNKNOWN / PROHIBITED / CONDITIONAL、DEMO 隔离、无来源、过期及未来核实日期、错误坐标、无天气、陈旧天气、示例天气、地点不匹配、时段缺失、雷暴/强风/强雨、适用水域季节禁钓、错误时间窗、无分数输出、时区转换、null 保留、缺列、长度、网络/HTTP 失败、异常降水/湿度及不连续预报。

干净安装使用 `npm ci --offline --ignore-scripts --no-audit --no-fund`，235 个依赖安装成功；随后重新运行 lint、typecheck、21 项单测与 build 全部通过。最终产物 JS 362.87 kB（gzip 111.64 kB），CSS 26.78 kB。缓存只用于重装依赖，不是天气缓存。源码和产物不需要服务端 Node 运行时。终端日志保存在 `docs/evidence/check-*.log`。

浏览器覆盖：可读错误与重试；模式切换 / 筛选 / 详情 / 退出；成功测试响应后失败标非实时缓存；示例不污染真实缓存；键盘跳转不破坏 HashRouter；反向时间窗拒绝；规划资料不足与修改输入清除旧结果；离线与重连；深链接刷新；定位拒绝；三档各四个路由横向溢出检查。

## 真实天气网络验证

最终 `dist/` 静态产物在本地预览中对 `/`、`/map`、`/plan`、`/about`（HashRouter）分别刷新，均返回 HTTP 200；浏览器无页面脚本错误，真实天气仍成功获取（21:00）。这只验证本地构建产物，不等同于 Qoder 外网部署。

- **PowerShell HTTPS：成功**。官方 API HTTP 200，`Asia/Shanghai`，72 条逐小时数据，2026-11-16 00:00 至 11-18 23:00。
- **真实 Edge 页面：成功**。未拦截天气请求，实际 HTTP 200，页面显示最近小时预报及来源时间（20:52 获取），不是 DEMO。开发 StrictMode 取消的一次旧请求显示 ERR_ABORTED，随后有效请求成功。
- **应用适配器解析真实响应：成功**。将 PowerShell 实际 API 响应交给 `parseForecast`，通过运行时校验，72 条，时间显式 `+08:00`，非 demo。临时原始 JSON 被 Git 忽略。
- **Node fetch 直连探针：失败**，`UND_ERR_CONNECT_TIMEOUT`，约 10 秒。该环境差异如实保留；不等同于浏览器失败，不影响纯浏览器路线 A。应用请求 12 秒超时后提供错误状态。

实际网络结果只代表本机本次检查，Qoder 公开域名上的网络、CORS 和额度仍待外网验收。

## 截图与视觉复核

- [1440px 真实天气首页](evidence/home-1440-browser-live.png)：实际 API 成功，已人工查看。
- [375px API 失败首页](evidence/home-375-api-failure.png)、[768px API 失败首页](evidence/home-768-api-failure.png)、[1440px API 失败首页](evidence/home-1440-api-failure.png)：显式网络失败测试。
- [375px DEMO](evidence/home-375-DEMO.png)、[768px DEMO](evidence/home-768-DEMO.png)、[1440px DEMO](evidence/home-1440-DEMO.png)：模拟状态，顶栏和天气均有标识。

已查看桌面真实天气、桌面 DEMO 与手机失败截图；修正图例挤成竖排、低字号功能文字和跳转按钮行为后更新三档截图。插画不是地图，不提供假点位。

最终产物截图：[首页真实天气](evidence/production-home-live-1440.png)、[地图列表](evidence/production-map-1440.png)、[出钓规划](evidence/production-plan-1440.png)、[数据说明](evidence/production-about-1440.png)。

## 修复记录

1. 普通 hash 锚点会干扰 HashRouter：改为按钮滚动 / 聚焦，追加键盘和地图按钮验收。
2. 筛选由直接 DOM 修改改为 React 状态；计划与模式、地点、路由及天气版本绑定，条件变化清除旧结果。
3. API 返回数据补充连续性和物理范围校验；不接受错误湿度、负降水等异常数据。
4. 修复图表图例排版，增加温度轴及可读字号。

## 未验收 / 后续里程碑

- Qoder 发布与隐身外网访问：未执行；无公开 URL。未自动创建站点、设置 Secrets 或付费开通。
- 重庆法规原文入口本次读取超时，现行适用性与 5–10 条真实场所许可仍待核查；真实库为空，不输出正式推荐。
- 高德 SDK、匹配评分、完整时段推荐、收藏 / 记录、LLM：尚未实现。
- 首次完全离线加载与离线刷新：不支持；本轮只验证页面加载后的断网降级。
- Qoder 开发参与与比赛规则：需用户后续向主办方核实，不能由技术检查代替。
