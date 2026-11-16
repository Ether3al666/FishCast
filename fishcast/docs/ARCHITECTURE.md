# 路线 A / M0–M1

```text
HashRouter → 页面 / 响应式组件
  ├─ useWeather → WeatherProvider → OpenMeteoProvider → 真实 API
  │                  └─ 页面内存缓存（30 分钟）
  ├─ chongqing-spots.json（真实空库）
  ├─ demo-fixtures.ts（手动显式切换，不混入真实推荐）
  └─ PlanForm → RuleBasedPlanner → safetyGate → 缺资料原因
                                      └─ scoring-rules.ts
npm run build → dist/ → 后续 Qoder Sites
```

`domain/models.ts` 使用 Zod 校验 JSON、坐标与 API 数据。GIS 坐标仅允许 WGS84，后续高德展示需要专门的 GCJ-02 适配。当前无地图 SDK，不错误投点。

`safetyGate` 检查：非 demo、坐标、VERIFIED_OPEN、许可来源、核实时间不超过 30 天、未决条件、适用禁捕水域季节禁钓期、天气近期有效、坐标匹配、用户时窗完整、雷暴/风/雨中止阈值。通过资料闸门不表示获得安全认证。阈值只是产品保守策略，不宣称官方预警等级。

`RuleBasedPlanner` 当前始终输出 `eligible=false, score=null`，列出资料闸门与未启用评分的原因。保留配置权重，但不把没有来源的规则变成分数。

计划表单使用显式 `+08:00` 时间；范围、鱼种、钓法仅作为需求保留，M2 完成距离和匹配，M3 完成时段排序。本阶段不调用模型；没有无用的 RemoteLLM 网络端点。

缓存仅在内存，刷新清除。真实模式与 demo 模式切换可取消正在进行的 API 请求；API 12 秒超时，支持重试、重连、定时更新与离线状态。模型密钥、服务端配置均不属于本静态包。

下一阶段开始前先阅读 `tests/safetyGate.test.ts` 与 `tests/weatherProvider.test.ts`；接入真实数据需要更新来源文档及追加针对真实契约的验证。
