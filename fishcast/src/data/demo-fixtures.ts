import type { Forecast, Spot } from '../domain/models';

// 独立的虚构测试场景；没有现实坐标、来源或真实开放许可。
export const demoSpots: Spot[] = [
  {
    id: 'demo-unknown',
    name: '示例水域 A',
    district: '虚构测试场景',
    location: null,
    waterType: 'POND',
    fishSpecies: [],
    methods: [],
    legalStatus: 'UNKNOWN',
    legalConditions: [],
    evidence: [],
    appliesClosedSeason: false,
    isDemo: true,
    notes: '模拟许可资料缺失；不会进入正式推荐。',
  },
  {
    id: 'demo-prohibited',
    name: '示例水域 B',
    district: '虚构测试场景',
    location: null,
    waterType: 'RIVER',
    fishSpecies: [],
    methods: [],
    legalStatus: 'PROHIBITED',
    legalConditions: [],
    evidence: [],
    appliesClosedSeason: true,
    isDemo: true,
    notes: '模拟明确禁钓状态，用于验证硬过滤。',
  },
];

export function createDemoForecast(location: Forecast['location']): Forecast {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  return {
    source: 'DEMO / 示例天气（非 API）',
    fetchedAt: new Date().toISOString(),
    timezone: 'Asia/Shanghai',
    location,
    stale: false,
    isDemo: true,
    hours: Array.from({ length: 48 }, (_, i) => ({
      time: new Date(new Date(`${day}T00:00:00+08:00`).getTime() + i * 3600000).toISOString(),
      temperature: Math.round((18 + 4 * Math.sin(i / 4)) * 10) / 10,
      humidity: 72,
      precipitation: i % 12 === 0 ? 2 : 0,
      windSpeed: 6,
      windDirection: 90,
      pressure: 1013,
      code: 3,
    })),
  };
}
