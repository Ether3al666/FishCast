import { useEffect, useState } from 'react';
import type { Forecast, GeoLocation } from '../domain/models';
import { OpenMeteoProvider } from '../services/weatherProvider';
import { weatherCache } from '../services/weatherCache';
import { createDemoForecast } from '../data/demo-fixtures';
import { weatherErrorMessage } from '../services/weatherErrors';

export function useWeather(location: GeoLocation, demo: boolean) {
  const [state, setState] = useState<{
    forecast: Forecast | null;
    loading: boolean;
    error: string | null;
  }>({ forecast: null, loading: true, error: null });
  const [revision, refresh] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      if (demo) {
        setState({ forecast: createDemoForecast(location), loading: false, error: null });
        return;
      }
      const cached = weatherCache.read(location);
      if (!online) {
        setState({
          forecast: cached ? { ...cached, stale: true } : null,
          loading: false,
          error: '当前离线，天气数据不可用。恢复网络后可重试。',
        });
        return;
      }
      if (cached && Date.now() - Date.parse(cached.fetchedAt) < 1800000 && revision === 0) {
        setState({ forecast: cached, loading: false, error: null });
        return;
      }
      setState({
        forecast: cached ? { ...cached, stale: true } : null,
        loading: true,
        error: null,
      });
      try {
        const forecast = await new OpenMeteoProvider().getHourlyForecast(
          { ...location, timezone: 'Asia/Shanghai' },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          weatherCache.write(forecast);
          setState({ forecast, loading: false, error: null });
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setState({
            forecast: cached ? { ...cached, stale: true } : null,
            loading: false,
            error: weatherErrorMessage(error),
          });
      }
    };
    void run();
    const timer = window.setInterval(() => refresh((v) => v + 1), 1800000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [location, demo, revision, online]);
  // 切换模式或坐标后不允许上一地点/模式的数据短暂混入 UI。
  const forecast =
    state.forecast &&
    state.forecast.isDemo === demo &&
    state.forecast.location.lat === location.lat &&
    state.forecast.location.lon === location.lon
      ? state.forecast
      : null;
  return { ...state, forecast, online, retry: () => refresh((v) => v + 1) };
}
