import { describe, expect, it } from 'vitest';
import {
  classifyTripQuestion,
  createWeatherRequest,
  type ConversationTopic,
} from '../src/planners/conversationIntent';

const now = new Date('2026-11-17T02:00:00Z'); // 北京时间 10:00
const location = { lat: 29.56, lon: 106.55, crs: 'WGS84' as const };
const weatherTopic: ConversationTopic = { intent: 'WEATHER', focus: 'rain' };

describe('对话回答意图', () => {
  it.each([
    ['先看看明天上午的天气', 'overview'],
    ['万州明天下雨吗', 'rain'],
    ['明天上午降雨量多少', 'rain'],
    ['雨大不大', 'rain'],
    ['风大吗', 'wind'],
    ['明天风速多少', 'wind'],
    ['明天温度多少', 'temperature'],
    ['明天冷不冷', 'temperature'],
    ['后天下午热不热', 'temperature'],
    ['气压如何', 'overview'],
  ])('明确天气问项：%s', (text, focus) => {
    expect(classifyTripQuestion(text)).toEqual({ intent: 'WEATHER', focus, explicit: true });
  });

  it.each(['明天几点去钓鱼合适', '什么时候去比较合适', '哪个时段适合钓鱼', '今天下午适合钓鱼吗'])(
    '%s 切换到时段建议',
    (text) => {
      expect(classifyTripQuestion(text, weatherTopic)).toEqual({
        intent: 'TIMING',
        focus: 'overview',
        explicit: true,
      });
    },
  );

  it.each([
    '推荐几个钓点',
    '找场所',
    '看看水域',
    '哪里钓鱼',
    '去哪钓',
    '找点',
    '推荐地点',
    '看看附近钓点',
    '明天上午想台钓鲫鱼',
    '换成路亚',
  ])('%s 从天气切回找点', (text) => {
    expect(classifyTripQuestion(text, weatherTopic)).toEqual({
      intent: 'SPOTS',
      focus: 'overview',
      explicit: true,
    });
  });

  it.each(['那万州呢', '改为20公里'])('%s 在天气和时段话题中保留上下文', (text) => {
    expect(classifyTripQuestion(text, weatherTopic)).toEqual({ ...weatherTopic, explicit: false });
    const timing: ConversationTopic = { intent: 'TIMING', focus: 'overview' };
    expect(classifyTripQuestion(text, timing)).toEqual({ ...timing, explicit: false });
  });

  it.each(['附近', '改为万州', '看看全重庆', '改为20公里'])('%s 在找点话题中指定范围', (text) => {
    expect(classifyTripQuestion(text)).toEqual({
      intent: 'SPOTS',
      focus: 'overview',
      explicit: true,
    });
  });

  it.each(['明天', '改成后天', '上午', '改成下午', '07:30-11:00'])(
    '%s 保留话题与天气焦点',
    (text) => {
      expect(classifyTripQuestion(text, weatherTopic)).toEqual({
        ...weatherTopic,
        explicit: false,
      });
      expect(classifyTripQuestion(text, { intent: 'TIMING', focus: 'overview' }).intent).toBe(
        'TIMING',
      );
      expect(classifyTripQuestion(text).intent).toBe('SPOTS');
    },
  );

  it('天气问项优先于同时出现的区域或钓点关键词', () => {
    expect(classifyTripQuestion('万州附近的钓点明天会下雨吗')).toEqual({
      intent: 'WEATHER',
      focus: 'rain',
      explicit: true,
    });
    expect(classifyTripQuestion('什么时候去风比较小')).toEqual({
      intent: 'WEATHER',
      focus: 'wind',
      explicit: true,
    });
  });

  it.each([
    '推荐一套装备',
    '哪里买鱼竿',
    '场所价格多少',
    '明天开放吗',
    '钓场什么时候营业',
    '下雨买什么装备',
  ])('%s 不误识别为受支持的明确问项', (text) => {
    expect(classifyTripQuestion(text, weatherTopic)).toEqual({ ...weatherTopic, explicit: false });
  });
});

describe('天气查询时间窗', () => {
  it('日期缺失时追问，不默认今天', () => {
    expect(createWeatherRequest({}, location, now).issue).toContain('哪天');
    expect(
      createWeatherRequest({ start: '06:00', end: '12:00' }, location, now).request,
    ).toBeUndefined();
  });

  it('只有日期时查询北京时间全天，午夜正确进到下一日', () => {
    expect(createWeatherRequest({ date: '2026-11-18' }, location, now).request).toMatchObject({
      startAt: '2026-11-18T00:00:00+08:00',
      endAt: '2026-11-19T00:00:00+08:00',
      targetSpecies: '暂不限定',
      method: 'OTHER',
      radiusKm: 30,
      location,
    });
    const endOfMonth = new Date('2026-11-30T02:00:00Z');
    expect(createWeatherRequest({ date: '2026-11-30' }, location, endOfMonth).request?.endAt).toBe(
      '2026-12-01T00:00:00+08:00',
    );
  });

  it('今天已开始但未结束的时段可以查询，已结束则明确提示', () => {
    expect(
      createWeatherRequest({ date: '2026-11-17', start: '06:00', end: '12:00' }, location, now)
        .request?.startAt,
    ).toBe('2026-11-17T06:00:00+08:00');
    expect(createWeatherRequest({ date: '2026-11-17' }, location, now).request).toBeDefined();
    expect(
      createWeatherRequest({ date: '2026-11-17', start: '06:00', end: '10:00' }, location, now)
        .issue,
    ).toContain('已经结束');
  });

  it('保留地点范围、鱼种、钓法，且不修改草稿', () => {
    const draft = {
      date: '2026-11-18',
      start: '06:00',
      end: '12:00',
      species: '鲫鱼',
      method: 'TAIDIAO' as const,
      radius: 5,
      searchArea: 'CHONGQING' as const,
    };
    const before = { ...draft };
    expect(createWeatherRequest(draft, location, now).request).toMatchObject({
      targetSpecies: '鲫鱼',
      method: 'TAIDIAO',
      radiusKm: 5,
      searchArea: 'CHONGQING',
    });
    expect(draft).toEqual(before);
  });

  it('支持今天起第七天，不能请求过去或更远日期', () => {
    expect(createWeatherRequest({ date: '2026-11-23' }, location, now).request?.endAt).toBe(
      '2026-11-24T00:00:00+08:00',
    );
    for (const date of ['2026-11-16', '2026-11-24']) {
      expect(createWeatherRequest({ date }, location, now).request).toBeUndefined();
      expect(createWeatherRequest({ date }, location, now).issue).toBeTruthy();
    }
  });

  it('拒绝非法日历日期、缺半边时段、错误时间与反向区间', () => {
    for (const date of ['2026-11-31', '2026-02-30', '2026-13-01', 'not-a-date', '2026-1-1']) {
      expect(createWeatherRequest({ date }, location, now).issue).toBeTruthy();
    }
    for (const times of [
      { start: '06:00' },
      { end: '12:00' },
      { start: '24:00', end: '24:00' },
      { start: '06:60', end: '12:00' },
      { start: '12:00', end: '06:00' },
      { start: '12:00', end: '12:00' },
    ])
      expect(
        createWeatherRequest({ date: '2026-11-18', ...times }, location, now).issue,
      ).toBeTruthy();
    expect(
      createWeatherRequest({ date: '2026-11-18', start: '22:00', end: '24:00' }, location, now)
        .request?.endAt,
    ).toBe('2026-11-19T00:00:00+08:00');
  });
});
