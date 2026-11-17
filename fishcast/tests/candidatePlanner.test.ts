import { describe, it, expect } from 'vitest';
import { findCandidates, weatherWindows } from '../src/planners/candidatePlanner';
import { RuleBasedPlanner } from '../src/planners/RuleBasedPlanner';
import { demoSpots, createDemoForecast } from '../src/data/demo-fixtures';
import type { Spot, PlanRequest } from '../src/domain/models';
const location = { lat: 29.56, lon: 106.55, crs: 'WGS84' as const };
const start = new Date(Date.now() + 86400000);
start.setUTCMinutes(0, 0, 0);
const request: PlanRequest = {
  location,
  startAt: start.toISOString(),
  endAt: new Date(+start + 4 * 3600000).toISOString(),
  radiusKm: 30,
  targetSpecies: '暂不限定',
  method: 'OTHER',
};
const spot: Spot = {
  ...demoSpots[0],
  id: 'fixture',
  name: 'TEST ONLY',
  isDemo: false,
  location,
  evidence: [
    { url: 'https://example.org/test', title: 'TEST ONLY', retrievedAt: new Date().toISOString() },
  ],
};
describe('候选筛选与正式推荐分离', () => {
  it('全重庆不受半径限制，外围单区可筛选且未知许可仍不构成正式推荐', () => {
    const far: Spot = {
      ...spot,
      id: 'wanzhou',
      district: '万州区',
      location: { ...location, lat: 30.8, lon: 108.4 },
    };
    const places = [spot, far, { ...far, id: 'demo', isDemo: true }];
    const cityRequest: PlanRequest = { ...request, radiusKm: 5, searchArea: 'CHONGQING' };
    const city = findCandidates(cityRequest, places);
    expect(city.candidates.map((c) => c.spot.id)).toEqual(['fixture', 'wanzhou']);
    expect(city.outsideRadius).toBe(0);
    expect(city.outsideArea).toBe(0);
    expect(
      findCandidates({ ...cityRequest, searchArea: '万州区' }, places).candidates.map(
        (c) => c.spot.id,
      ),
    ).toEqual(['wanzhou']);
    expect(
      new RuleBasedPlanner().plan(cityRequest, { spots: [far], forecast: null })[0].eligible,
    ).toBe(false);
  });
  it('区域模式纳入半径外的九区场所，但不混入周边或归属未知记录', () => {
    const places: Spot[] = [
      { ...spot, id: 'north', traditionalDistrict: '北碚区', location: { ...location, lat: 30 } },
      { ...spot, id: 'east', traditionalDistrict: '江北区' },
      { ...spot, id: 'outside', district: '长寿区' },
      { ...spot, id: 'demo', isDemo: true, traditionalDistrict: '北碚区' },
      { ...spot, id: 'ban', legalStatus: 'PROHIBITED', traditionalDistrict: '北碚区' },
    ];
    const result = findCandidates({ ...request, radiusKm: 5, searchArea: 'MAIN_CITY' }, places);
    expect(result.candidates.map((c) => c.spot.id)).toEqual(['east', 'north']);
    expect(result.outsideRadius).toBe(0);
    expect(result.outsideArea).toBe(1);
    expect(
      findCandidates({ ...request, searchArea: '北碚区' }, places).candidates.map((c) => c.spot.id),
    ).toEqual(['north']);
    expect(findCandidates({ ...request, searchArea: '渝中区' }, places).candidates).toHaveLength(0);
    expect(
      new RuleBasedPlanner().plan(
        { ...request, searchArea: '北碚区' },
        { spots: [places[1]], forecast: null },
      )[0].reasons,
    ).toContain('不在所选区域内');
  });
  it('真正使用半径，按距离排序，禁止与示例不进入真实候选', () => {
    const result = findCandidates(request, [
      { ...spot, id: 'far', location: { ...location, lat: 31 } },
      { ...spot, id: 'near', location: { ...location, lat: 29.57 } },
      spot,
      { ...spot, id: 'ban', legalStatus: 'PROHIBITED' },
      demoSpots[0],
    ]);
    expect(result.candidates.map((s) => s.spot.id)).toEqual(['fixture', 'near']);
    expect(result.outsideRadius).toBe(1);
    expect(result.candidates[0].distanceKm).toBe(0);
  });
  it('鱼种明确不匹配会被排除，未知不冒充匹配；路亚名称只是线索', () => {
    const result = findCandidates({ ...request, targetSpecies: '鲫鱼', method: 'LUYA' }, [
      { ...spot, id: 'wrong', fishSpecies: ['草鱼'] },
      { ...spot, id: 'hint', methodHints: ['LUYA'] },
      spot,
    ]);
    expect(result.candidates.map((c) => c.spot.id)).toEqual(['hint', 'fixture']);
    expect(result.candidates[0].notes.join(' ')).toContain('线索');
    expect(result.candidates[0].notes.join(' ')).toContain('鱼种信息请咨询场所');
  });
  it('缺坐标单独统计，半径内无点不会偷偷扩大', () => {
    const result = findCandidates({ ...request, radiusKm: 5 }, [
      { ...spot, id: 'far', location: { ...location, lat: 30 } },
      { ...spot, id: 'missing', location: null },
    ]);
    expect(result.candidates).toHaveLength(0);
    expect(result.withoutLocation).toBe(1);
    expect(result.outsideRadius).toBe(1);
  });
  it('台钓需求不会把仅有路亚名称线索的场所放在普通候选之前', () => {
    const result = findCandidates({ ...request, method: 'TAIDIAO' }, [
      { ...spot, id: 'lure', methodHints: ['LUYA'] },
      { ...spot, id: 'general', location: { ...location, lat: 29.57 } },
    ]);
    expect(result.candidates.map((c) => c.spot.id)).toEqual(['general', 'lure']);
  });
  it('正式资格不再写死：有效许可、时间、当地天气完整时通过；UNKNOWN 始终不通过', () => {
    const forecast = {
      ...createDemoForecast(location),
      isDemo: false,
      hours: Array.from({ length: 4 }, (_, i) => ({
        ...createDemoForecast(location).hours[0],
        time: new Date(+start + i * 3600000).toISOString(),
        code: 1,
        windSpeed: 5,
        precipitation: 0,
      })),
    };
    const open = {
      ...spot,
      legalStatus: 'VERIFIED_OPEN' as const,
      verifiedAt: new Date().toISOString(),
      legalConditions: [],
    };
    expect(new RuleBasedPlanner().plan(request, { spots: [open], forecast })[0].eligible).toBe(
      true,
    );
    expect(new RuleBasedPlanner().plan(request, { spots: [spot], forecast })[0].eligible).toBe(
      false,
    );
    expect(
      new RuleBasedPlanner().plan(
        { ...request, targetSpecies: '鲫鱼' },
        { spots: [open], forecast },
      )[0].eligible,
    ).toBe(false);
  });
});
describe('按真实逐小时预报选择时间窗', () => {
  const base = createDemoForecast(location);
  const forecast = {
    ...base,
    isDemo: false,
    hours: Array.from({ length: 4 }, (_, i) => ({
      ...base.hours[0],
      time: new Date(+start + i * 3600000).toISOString(),
      temperature: 16,
      code: 1,
      windSpeed: i < 2 ? 12 : 4,
      precipitation: i < 2 ? 1 : 0,
    })),
  };
  it('比较连续两小时窗口，优先低降水再低风速，不输出鱼获评分', () => {
    const result = weatherWindows(forecast, request);
    expect(result.windows[0].startAt).toBe(forecast.hours[2].time);
    expect(result.windows[0].rainMm).toBe(0);
  });
  it('拒绝缺失、过期、位置不符、示例与雷暴', () => {
    for (const f of [
      null,
      { ...forecast, stale: true },
      { ...forecast, isDemo: true },
      { ...forecast, location: { ...location, lat: 31 } },
      { ...forecast, hours: forecast.hours.slice(1) },
      { ...forecast, hours: forecast.hours.map((h) => ({ ...h, code: 95 })) },
    ])
      expect(weatherWindows(f, request).windows).toHaveLength(0);
  });
});
