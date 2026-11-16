# FishCast 工程约束

- 当前里程碑：M0/M1 路线 A 静态核心骨架；后续逐阶段实现，不把骨架当作最终 MVP。
- React + Vite + TypeScript 严格模式，Tailwind；HashRouter 保证静态托管刷新可用。禁止引入强制服务端运行时。
- 修改核心模块前阅读关联 tests；业务逻辑与 UI 分离，外部 API 仅在 services 中调用。
- 真实天气不得伪造；真实钓点数据必须有来源、坐标、许可和时间证据。无法核实标记 UNKNOWN；PROHIBITED 和 UNKNOWN 不推荐。
- `demo-fixtures.ts` 与真实 JSON 完全分离，demo 不进入真实推荐。禁止把测试数据写入真实种子。
- `VERIFIED_OPEN` 仍需检查证据有效期、地点天气与时间窗。无权威预警不得声称安全。
- 当前规则规划器不使用大模型，不输出未校准分数或鱼获概率。模型 Secret 永远不进入前端。
- 保留源码、单测、浏览器验收与阶段记录。修改后执行 `npm run lint`、`npm run typecheck`、`npm test`、`npm run build`。
- 不自动发布、不配置付费服务或 Secret；Qoder 发布交接见 docs/DEPLOY_QODER.md。
