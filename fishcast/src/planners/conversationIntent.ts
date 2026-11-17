import type { GeoLocation, PlanRequest } from '../domain/models';
import { SEARCH_DISTRICTS } from '../config/regions';
import { localDate, type TripDraft } from './conversationPlanner';

export type ConversationIntent = 'WEATHER' | 'TIMING' | 'SPOTS';
export type WeatherFocus = 'overview' | 'rain' | 'wind' | 'temperature';
export type ConversationTopic = { intent: ConversationIntent; focus: WeatherFocus };

// This only selects the kind of answer. Date and fishing constraints remain in TripDraft.
export function classifyTripQuestion(
  text: string,
  previous: ConversationTopic = { intent: 'SPOTS', focus: 'overview' },
): ConversationTopic & { explicit: boolean } {
  const compact = text.replace(/\s/g, '');
  const inherited = { ...previous, explicit: false };
  if (/装备|鱼竿|渔具|鱼饵|饵料|钓具|多少钱|收费|费用|价格|门票|开放|营业|开门|许可/.test(compact))
    return inherited;

  const rain = /下雨|降雨|降水|雨大|雨小|有雨|雨势|雨量|(?:下|降).{0,4}雨/.test(compact);
  const wind = /风(?:比较|会不会|会|有点|很|太)?[大小]|风速|风力|风向|刮风|大风/.test(compact);
  const temperature = /温度|气温|冷不冷|热不热|冷吗|热吗|多冷|多热|降温|升温/.test(compact);
  if (rain || wind || temperature || /天气|气压/.test(compact)) {
    return {
      intent: 'WEATHER',
      focus: rain ? 'rain' : wind ? 'wind' : temperature ? 'temperature' : 'overview',
      explicit: true,
    };
  }
  if (
    /(?:几点|什么时候|哪个时段).{0,12}(?:去|钓|合适|适合)|适合.{0,4}(?:钓鱼|出钓)|适不适合|能钓吗/.test(
      compact,
    )
  )
    return { intent: 'TIMING', focus: 'overview', explicit: true };

  const district = SEARCH_DISTRICTS.some((name) =>
    compact.includes(
      name === '忠县'
        ? name
        : name === '两江新区'
          ? '两江'
          : name.replace(/(?:土家族苗族自治县|苗族土家族自治县|土家族自治县|区|县)$/, ''),
    ),
  );
  const area =
    district ||
    /全重庆|重庆全市|重庆全域|整个重庆|全市|主城九区|主城9区|整个主城|全主城|区域|范围|附近|\d+(?:\.\d+)?(?:公里|千米|km)/i.test(
      compact,
    );
  const spots =
    /找点|台钓|路亚|钓(?:鲫鱼|鲤鱼|草鱼)|(?:找|推荐|看看).{0,12}(?:钓点|钓场|场所|水域|地方|地点)|哪里(?:能)?钓|去哪(?:儿)?钓|在哪钓/.test(
      compact,
    );
  if (spots || (area && previous.intent === 'SPOTS'))
    return { intent: 'SPOTS', focus: 'overview', explicit: true };
  return inherited;
}

export function createWeatherRequest(
  draft: TripDraft,
  location: GeoLocation,
  now = new Date(),
): { request?: PlanRequest; issue?: string } {
  if (!draft.date) return { issue: '想看哪天的天气？可以回复“今天”“明天”或“后天”。' };
  const midnight = new Date(`${draft.date}T00:00:00+08:00`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) ||
    !Number.isFinite(+midnight) ||
    localDate(midnight) !== draft.date
  )
    return { issue: `请提供有效日期，例如 ${localDate(now)}。` };
  if (draft.date < localDate(now) || draft.date > localDate(new Date(+now + 6 * 86400000)))
    return { issue: '目前可查询今天起未来 7 天内的天气，请选择这个范围内的日期。' };
  if ((draft.start === undefined) !== (draft.end === undefined))
    return { issue: '请给出完整时段，例如 07:30-11:00；只提供日期则查询全天。' };

  const start = draft.start ?? '00:00';
  const end = draft.end ?? '24:00';
  const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!clock.test(start) || (!clock.test(end) && end !== '24:00'))
    return { issue: '请输入有效时间，开始时间为 00:00–23:59，结束时间最晚为 24:00。' };
  const startAt = `${draft.date}T${start}:00+08:00`;
  const endAt =
    end === '24:00'
      ? `${localDate(new Date(+midnight + 86400000))}T00:00:00+08:00`
      : `${draft.date}T${end}:00+08:00`;
  if (Date.parse(endAt) <= Date.parse(startAt)) return { issue: '请让结束时间晚于开始时间。' };
  if (Date.parse(endAt) <= +now)
    return { issue: '这个时段已经结束，请选择今天尚未结束的时段或未来日期。' };
  return {
    request: {
      location,
      startAt,
      endAt,
      targetSpecies: draft.species ?? '暂不限定',
      method: draft.method ?? 'OTHER',
      radiusKm: draft.radius ?? 30,
      ...(draft.searchArea ? { searchArea: draft.searchArea } : {}),
    },
  };
}
