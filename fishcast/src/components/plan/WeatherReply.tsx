import { useEffect, useState } from 'react';
import { CloudRain, Thermometer, Wind, RefreshCw, ArrowUpRight } from 'lucide-react';
import type { Forecast, PlanRequest } from '../../domain/models';
import { weatherWindows } from '../../planners/candidatePlanner';
import { getWeatherAnswer, weatherPeriod, type WeatherFocus } from '../../planners/weatherAnswer';

type WeatherReplyProps = {
  request: PlanRequest;
  forecast: Forecast | null;
  loading: boolean;
  error?: string | null;
  locationLabel: string;
  focus: WeatherFocus;
  intent: 'WEATHER' | 'TIMING';
  onRefresh: () => void;
  onAsk: (text: string) => void;
};
const time = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const updatedTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function WeatherReply({
  request,
  forecast,
  loading,
  error,
  locationLabel,
  focus,
  intent,
  onRefresh,
  onAsk,
}: WeatherReplyProps) {
  // Re-evaluate cache age even when the chat is left open without another message.
  const [, reevaluate] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => reevaluate((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const answer = getWeatherAnswer(forecast, request, focus);
  const ready = !loading && !error && answer.status === 'ready' ? answer : null;
  const comparisonRequest =
    Date.parse(request.startAt) < Date.now()
      ? {
          ...request,
          startAt: new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000).toISOString(),
        }
      : request;
  const comparison =
    ready && intent === 'TIMING' ? weatherWindows(forecast, comparisonRequest) : null;
  const metrics = ready
    ? {
        rain: { label: '累计降水', value: ready.rainMm.toFixed(1), unit: 'mm', Icon: CloudRain },
        wind: { label: '最大风速', value: ready.windKmh.toFixed(1), unit: 'km/h', Icon: Wind },
        temperature: {
          label: '气温范围',
          value: `${ready.minTemp.toFixed(1)}–${ready.maxTemp.toFixed(1)}`,
          unit: '°C',
          Icon: Thermometer,
        },
      }
    : null;
  const fetched = forecast ? Date.parse(forecast.fetchedAt) : NaN;
  const followup =
    Number(time.format(Date.parse(request.startAt)).slice(0, 2)) >= 12 ? '看看上午' : '那下午呢';
  const hourRows = (hours: NonNullable<typeof ready>['hours']) =>
    hours.map((hour) => (
      <li key={hour.time}>
        <time dateTime={hour.time}>{time.format(Date.parse(hour.time))}</time>
        <span>{hour.temperature.toFixed(1)}°C</span>
        <span>{hour.precipitation.toFixed(1)} mm</span>
        <span>{hour.windSpeed.toFixed(1)} km/h</span>
      </li>
    ));
  return (
    <section className="weather-answer" aria-label="天气回答" aria-busy={loading}>
      <header className="weather-answer-heading">
        <h3>{locationLabel}</h3>
        <p>{weatherPeriod(request.startAt, request.endAt)}</p>
      </header>
      <div aria-live="polite">
        <p
          className={`weather-answer-summary${!ready ? ' weather-answer-status' : ''}`}
          role={loading ? 'status' : !ready ? 'alert' : undefined}
        >
          {loading ? '正在查询这个位置的天气…' : error || answer.summary}
        </p>
      </div>
      {ready && metrics && (
        <>
          <div className="weather-answer-metrics">
            {ready.metricOrder.map((key) => {
              const { Icon, label, value, unit } = metrics[key];
              return (
                <div role="group" aria-label={label} key={key}>
                  <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                  <span className="weather-answer-metric-label">{label}</span>
                  <p>
                    <strong>{value}</strong>
                    <span>{unit}</span>
                  </p>
                </div>
              );
            })}
          </div>
          {ready.weatherAlerts.map((alert) => (
            <p className="weather-answer-alert" key={alert}>
              {alert}
            </p>
          ))}
          <div className="weather-answer-hourly" aria-label="逐小时天气">
            <div className="weather-answer-hourly-heading">
              <span>时间</span>
              <span>气温</span>
              <span>降水</span>
              <span>风速</span>
            </div>
            <ul>{hourRows(ready.hours.slice(0, 6))}</ul>
            {ready.hours.length > 6 && (
              <details>
                <summary>查看其余 {ready.hours.length - 6} 小时</summary>
                <ul>{hourRows(ready.hours.slice(6))}</ul>
              </details>
            )}
          </div>
          {comparison && (
            <div className="weather-answer-comparison">
              <h4>两小时比较</h4>
              <p>{comparison.message}</p>
              {comparison.windows.length > 0 && (
                <ol>
                  {comparison.windows.map((window) => (
                    <li key={window.startAt}>
                      <strong>{weatherPeriod(window.startAt, window.endAt)}</strong>
                      <span>
                        降水 {window.rainMm.toFixed(1)} mm · 最大风速 {window.windKmh.toFixed(1)}{' '}
                        km/h
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
          <details className="weather-answer-details">
            <summary>预报说明与来源</summary>
            <p className="weather-answer-coverage">{ready.coverageNote}</p>
            <p className="weather-answer-source">
              {forecast!.source} ·{' '}
              {Number.isFinite(fetched) ? updatedTime.format(fetched) : '时间未知'} 更新（北京时间）
            </p>
          </details>
        </>
      )}
      <div className="weather-answer-actions">
        <button type="button" onClick={() => onAsk(followup)}>
          {followup}
          <ArrowUpRight size={13} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onAsk('看看附近钓点')}>
          看看附近钓点
          <ArrowUpRight size={13} aria-hidden="true" />
        </button>
        <button type="button" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={13} aria-hidden="true" />
          重新查询天气
        </button>
      </div>
    </section>
  );
}
