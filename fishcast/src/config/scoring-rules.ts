export const RULES = {
  version: 'p0-gates-0.1',
  evidenceMaxAgeDays: 30,
  // 产品保守中止阈值，非官方预警阈值或鱼类生物学定律。
  stopWindKmh: 39,
  stopHourlyRainMm: 10,
  weights: { weather: 35, species: 30, method: 15, time: 10, distance: 10 },
  scoringEnabled: false, // M2: 证据与规则核查后启用评分。
} as const;
