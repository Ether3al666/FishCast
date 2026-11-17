import {
  CloudSun,
  Droplets,
  Wind,
  Gauge,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import type { Forecast, HourlyWeather } from '../domain/models';

export function WeatherPanel({
  forecast,
  loading,
  error,
  retry,
  day,
  setDay,
}: {
  forecast: Forecast | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  day: number;
  setDay: (day: number) => void;
}) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
    new Date(Date.now() + day * 86400000),
  );
  const hours =
    forecast?.hours.filter(
      (h) =>
        new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date(h.time)) ===
        date,
    ) ?? [];
  const current =
    day === 0
      ? (hours.find((h) => +new Date(h.time) + 3600000 > Date.now()) ?? hours.at(-1))
      : hours.find((h) => new Date(h.time).getUTCHours() === 4);
  const metric = (value: number | null | undefined, suffix: string) =>
    value == null ? '—' : `${Math.round(value * 10) / 10}${suffix}`;
  const weatherText = (h?: HourlyWeather) =>
    !h || h.code === null
      ? '天气状况未知'
      : h.code >= 95
        ? '雷暴风险'
        : h.code >= 51
          ? '有降水'
          : h.code >= 45
            ? '雾'
            : h.code >= 1
              ? '多云 / 阴'
              : '晴';
  return (
    <section className="panel weather-panel" aria-labelledby="weather-title" aria-busy={loading}>
      <div className="section-heading">
        <div>
          <h2 id="weather-title" tabIndex={-1}>
            先看天气，再做决定
          </h2>
        </div>
        <div className="segmented">
          <button className={day === 0 ? 'selected' : ''} onClick={() => setDay(0)}>
            今天
          </button>
          <button className={day === 1 ? 'selected' : ''} onClick={() => setDay(1)}>
            明天
          </button>
        </div>
      </div>
      {error && (
        <div className="notice error" role="alert">
          <AlertTriangle size={17} />
          <span>{error}</span>
          <button onClick={retry}>重试</button>
        </div>
      )}
      {forecast?.stale && (
        <div className="notice warning">
          非实时缓存 · 获取于{' '}
          {new Date(forecast.fetchedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} ·
          不参与推荐
        </div>
      )}
      {forecast?.isDemo && (
        <div className="notice warning">DEMO / 示例天气，所有数值为测试数据</div>
      )}
      <div className="weather-current">
        <div className="temperature">
          <CloudSun size={42} strokeWidth={1.2} />
          <strong>{metric(current?.temperature, '°')}</strong>
          <div>
            <b>{loading ? '正在读取天气…' : weatherText(current)}</b>
            <span>{day === 0 ? '最近小时预报' : '明日 12:00 预报'} · 非现场实测</span>
          </div>
        </div>
        <div className="weather-metrics">
          <div>
            <Wind size={17} />
            <span>风速</span>
            <b>{metric(current?.windSpeed, ' km/h')}</b>
          </div>
          <div>
            <Droplets size={17} />
            <span>降水</span>
            <b>{metric(current?.precipitation, ' mm')}</b>
          </div>
          <div>
            <Gauge size={17} />
            <span>海平面气压</span>
            <b>{metric(current?.pressure, ' hPa')}</b>
          </div>
        </div>
      </div>
      <ForecastChart hours={hours} loading={loading} />
      <div className="weather-foot">
        <span>
          <i className={`status-dot ${forecast && !forecast.stale ? 'live' : ''}`} />
          {forecast
            ? `${forecast.source} · ${new Date(forecast.fetchedAt).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' })} 获取`
            : '等待真实数据 · 不生成适钓分数'}
        </span>
        <button className="icon-button" aria-label="刷新天气" onClick={retry}>
          <RefreshCw size={15} />
        </button>
      </div>
      <a className="source-link" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
        Weather data by Open-Meteo · CC BY 4.0 <ArrowUpRight size={13} />
      </a>
    </section>
  );
}

function ForecastChart({ hours, loading }: { hours: HourlyWeather[]; loading: boolean }) {
  const selected = hours.filter((_, i) => i % 3 === 0);
  const available = selected.filter((h) => h.temperature !== null);
  if (!available.length)
    return (
      <div className="chart-empty">
        <span className="chart-grid" />
        <CloudSun size={25} strokeWidth={1} />
        <span>{loading ? '正在获取逐小时预报' : '暂无可用逐小时天气'}</span>
        <small>温度 / 风速 / 降水将在数据可用后显示</small>
      </div>
    );
  const temps = available.map((h) => h.temperature!),
    min = Math.min(...temps) - 2,
    max = Math.max(...temps) + 2;
  const y = (v: number) => 87 - ((v - min) / (max - min)) * 65;
  const points = selected.map((h, i) =>
    h.temperature === null
      ? null
      : `${30 + (i * 530) / Math.max(1, selected.length - 1)},${y(h.temperature)}`,
  );
  return (
    <div className="forecast-chart">
      <div className="chart-legend">
        <span>
          <i />
          温度 °C
        </span>
        <span>
          <i className="rain" />
          降水 mm
        </span>
      </div>
      <svg viewBox="0 0 600 144" role="img" aria-label="逐小时温度与降水趋势">
        {[30, 60, 90].map((v) => (
          <g key={v}>
            <path d={`M35 ${v}H590`} stroke="#475253" strokeDasharray="3 5" />
            <text x="0" y={v + 3} fontSize="10" fill="#b3c2c1">
              {Math.round(min + ((87 - v) / 65) * (max - min))}°
            </text>
          </g>
        ))}
        {points.map(
          (point, i) =>
            point && (
              <g key={i}>
                {i > 0 && points[i - 1] && (
                  <path
                    d={`M${points[i - 1]}L${point}`}
                    fill="none"
                    stroke="#88ccc6"
                    strokeWidth="2.3"
                  />
                )}
                <circle cx={point.split(',')[0]} cy={point.split(',')[1]} r="3" fill="#88ccc6" />
              </g>
            ),
        )}
        {selected.map((h, i) => (
          <g key={h.time}>
            <rect
              x={24 + (i * 530) / Math.max(1, selected.length - 1)}
              y={112 - Math.min(25, (h.precipitation ?? 0) * 3)}
              width="12"
              height={Math.min(25, (h.precipitation ?? 0) * 3)}
              rx="3"
              fill="#91b8b4"
            />
            <text
              x={30 + (i * 530) / Math.max(1, selected.length - 1)}
              y="135"
              textAnchor="middle"
              fill="#b3c2c1"
              fontSize="11"
            >
              {new Date(h.time).toLocaleTimeString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
