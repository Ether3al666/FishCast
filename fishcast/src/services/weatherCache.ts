import type { Forecast, GeoLocation } from '../domain/models';

// 只缓存本会话精确坐标的真实 API 返回，不持久保存位置历史。
const cache = new Map<string, Forecast>();
const key = (location: GeoLocation) => `${location.lat},${location.lon}`;
export const weatherCache = {
  read: (location: GeoLocation) => cache.get(key(location)),
  write: (forecast: Forecast) => {
    if (!forecast.isDemo) cache.set(key(forecast.location), forecast);
  },
};
