import { describe, expect, it } from 'vitest';
import {
  parseTripMessage,
  createTripRequest,
  summarizeWeather,
} from '../src/planners/conversationPlanner';
import { createDemoForecast } from '../src/data/demo-fixtures';
const now = new Date('2026-11-17T02:00:00Z');
const location = { lat: 29.56, lon: 106.55, crs: 'WGS84' as const };
describe('本地对话规划', () => {
  it('全重庆与外围区县简称不依赖空格，切换后保留出行条件', () => {
    const city = parseTripMessage('明天上午看看全重庆', { radius: 5 }, now);
    expect(createTripRequest(city.draft, location, now).request?.searchArea).toBe('CHONGQING');
    for (const [message, area] of [
      ['改去万州钓鱼', '万州区'],
      ['看看酉阳', '酉阳土家族苗族自治县'],
      ['改为石柱县', '石柱土家族自治县'],
      ['改为彭水苗族土家族自治县', '彭水苗族土家族自治县'],
      ['明天上午秀山路亚', '秀山土家族苗族自治县'],
      ['改为忠县', '忠县'],
      ['改为两江新区', '两江新区'],
    ]) {
      const next = parseTripMessage(message, city.draft, now);
      expect(next.issues).toEqual([]);
      expect(next.draft).toMatchObject({ date: '2026-11-18', start: '06:00', searchArea: area });
    }
    expect(parseTripMessage('改为20公里', city.draft, now).draft.searchArea).toBeUndefined();
    for (const message of ['全重庆30公里', '万州和酉阳', '全重庆或主城九区', '不要去石柱']) {
      const result = parseTripMessage(message, city.draft, now);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.draft).toEqual(city.draft);
    }
  });
  it('九区、单区和公里范围可以切换，冲突条件不擅自覆盖', () => {
    const nine = parseTripMessage('明天上午，主城九区', { radius: 5 }, now);
    expect(createTripRequest(nine.draft, location, now).request?.searchArea).toBe('MAIN_CITY');
    const district = parseTripMessage('改为江北区', nine.draft, now);
    expect(district.draft.searchArea).toBe('江北区');
    expect(parseTripMessage('改为20公里', district.draft, now).draft.searchArea).toBeUndefined();
    for (const text of ['主城九区30公里', '江北和渝北', '不要去江北']) {
      expect(parseTripMessage(text, nine.draft, now).issues.length).toBeGreaterThan(0);
    }
  });
  it('识别日期、上午、鱼种、钓法和距离', () => {
    const result = parseTripMessage('明天上午，30公里以内，台钓鲫鱼', {}, now);
    expect(result.draft).toEqual({
      date: '2026-11-18',
      start: '06:00',
      end: '12:00',
      species: '鲫鱼',
      method: 'TAIDIAO',
      radius: 30,
    });
    expect(result.issues).toEqual([]);
    expect(createTripRequest(result.draft, location, now).request?.startAt).toBe(
      '2026-11-18T06:00:00+08:00',
    );
  });
  it('追问修改保留之前条件', () => {
    const first = parseTripMessage('明天上午钓鲫鱼', {}, now);
    const next = parseTripMessage('改成下午，20公里', first.draft, now);
    expect(next.draft).toMatchObject({
      date: '2026-11-18',
      start: '12:00',
      end: '18:00',
      species: '鲫鱼',
      radius: 20,
    });
  });
  it('缺时间时追问，不自动完成', () => {
    expect(
      createTripRequest(parseTripMessage('钓鲤鱼', {}, now).draft, location, now).issue,
    ).toContain('哪天');
    expect(createTripRequest({ date: '2026-11-18' }, location, now).issue).toContain('时段');
  });
  it('不误解模糊日期、否定、冲突和越界', () => {
    for (const text of [
      '下周一上午钓鲫鱼',
      '不要明天，后天上午',
      '明天上午，不想台钓',
      '今天或明天上午',
      '明天上午200公里',
      '明天25:00-26:00',
    ]) {
      expect(parseTripMessage(text, {}, now).issues.length).toBeGreaterThan(0);
    }
  });
  it('精确时间、反向时间与过去日期', () => {
    const draft = parseTripMessage('2026-11-18 07:30-11:00 路亚', {}, now).draft;
    expect(draft).toMatchObject({
      date: '2026-11-18',
      start: '07:30',
      end: '11:00',
      method: 'LUYA',
    });
    expect(createTripRequest({ ...draft, end: '06:00' }, location, now).issue).toBeTruthy();
    expect(createTripRequest({ ...draft, date: '2026-11-16' }, location, now).issue).toBeTruthy();
  });
  it('未识别的输入不生成计划', () => {
    expect(parseTripMessage('帮我买一套装备', {}, now).recognized).toHaveLength(0);
  });
  it('示例、过期、缺失、部分天气明确区分', () => {
    const forecast = createDemoForecast(location);
    const request = {
      location,
      targetSpecies: '鲫鱼',
      method: 'TAIDIAO' as const,
      radiusKm: 30,
      startAt: forecast.hours[0].time,
      endAt: forecast.hours[2].time,
    };
    expect(summarizeWeather(null, request)).toContain('不可用');
    expect(summarizeWeather({ ...forecast, stale: true }, request)).toContain('非实时');
    expect(summarizeWeather(forecast, request)).toContain('DEMO');
    expect(
      summarizeWeather({ ...forecast, isDemo: false, hours: forecast.hours.slice(0, 1) }, request),
    ).toContain('不完整');
    expect(
      summarizeWeather({ ...forecast, isDemo: false, location: { ...location, lat: 30 } }, request),
    ).toContain('不匹配');
  });
});
