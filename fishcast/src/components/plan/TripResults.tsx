import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  MapPin,
  CloudSun,
  CloudRain,
  Thermometer,
  Droplets,
  Wind,
} from 'lucide-react';
import type { Forecast, PlanRequest, Spot } from '../../domain/models';
import { findCandidates, weatherWindows } from '../../planners/candidatePlanner';
import { methodLabel, summarizeWeather } from '../../planners/conversationPlanner';
import { useWeather } from '../../hooks/useWeather';
import { RuleBasedPlanner } from '../../planners/RuleBasedPlanner';
import { areaLabel, isTraditionalArea } from '../../config/regions';
import { SpotPhoto } from './SpotPhoto';

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
  });
function LocalWeather({ spot, request }: { spot: Spot; request: PlanRequest }) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, []);
  const weather = useWeather(spot.location!, false);
  const localRequest = { ...request, location: spot.location! };
  const result = weatherWindows(weather.forecast, localRequest);
  const formal = new RuleBasedPlanner().plan(request, {
    spots: [spot],
    forecast: weather.forecast,
  })[0];
  return (
    <section
      ref={panel}
      className="trip-local-weather"
      aria-label="所选场所天气"
      aria-live="polite"
    >
      <h3>
        <CloudSun size={20} />
        {spot.name}
      </h3>
      {weather.loading ? (
        <p role="status">正在查询当地天气…</p>
      ) : (
        <>
          {weather.error && (
            <p className="trip-weather-notice" role="alert">
              {weather.error}
            </p>
          )}
          {result.windows.length > 0 && (
            <div className="trip-windows">
              {result.windows.map((window, i) => (
                <div key={window.startAt}>
                  <div className="trip-window-heading">
                    {window.rainMm > 0 ? (
                      <CloudRain size={36} strokeWidth={1.2} aria-hidden="true" />
                    ) : (
                      <CloudSun size={36} strokeWidth={1.2} aria-hidden="true" />
                    )}
                    <span>{i === 0 ? '风雨较小的两小时' : '备选时段'}</span>
                  </div>
                  <strong>
                    {time(window.startAt)}–{time(window.endAt)}
                  </strong>
                  <div className="trip-window-metrics">
                    <span>
                      <Thermometer size={17} aria-hidden="true" />
                      <small>气温 °C</small>
                      <b>
                        {window.minTemp.toFixed(1)}–{window.maxTemp.toFixed(1)}
                      </b>
                    </span>
                    <span>
                      <Droplets size={17} aria-hidden="true" />
                      <small>降水 mm</small>
                      <b>{window.rainMm.toFixed(1)}</b>
                    </span>
                    <span>
                      <Wind size={17} aria-hidden="true" />
                      <small>最大风速 km/h</small>
                      <b>{window.windKmh.toFixed(1)}</b>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!result.windows.length && !weather.error && (
            <p className="trip-weather-notice" role="status">
              {result.message}
            </p>
          )}
          <details className="trip-evidence">
            <summary>天气详情与核查依据</summary>
            {weather.forecast && (
              <p>
                {weather.forecast.source} · {time(weather.forecast.fetchedAt)} 更新（北京时间）
              </p>
            )}
            <p>{summarizeWeather(weather.forecast, localRequest)}</p>
            <p>{result.message}</p>
            <ul>
              {formal.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </details>
        </>
      )}
      <button className="text-button" disabled={weather.loading} onClick={weather.retry}>
        刷新当地天气
      </button>
    </section>
  );
}
export function PlaceTripResults({
  spot,
  ...props
}: {
  spot: Spot;
  request: PlanRequest;
  spots: Spot[];
  onAdjust: (text: string) => void;
  onSelect?: (spot: Spot) => void;
}) {
  const weather = useWeather(spot.location!, spot.isDemo);
  return <TripResults {...props} forecast={weather.forecast} />;
}

export function TripResults({
  request,
  spots,
  forecast,
  onAdjust,
  onSelect,
}: {
  request: PlanRequest;
  spots: Spot[];
  forecast: Forecast | null;
  onAdjust: (text: string) => void;
  onSelect?: (spot: Spot) => void;
}) {
  const [visible, setVisible] = useState(3);
  const [selected, setSelected] = useState<Spot | null>(null);
  const result = findCandidates(request, spots);
  const demo = spots.some((s) => s.isDemo);
  return (
    <div className="trip-results">
      <div className="trip-summary trip-summary-compact">
        <h3>
          {request.startAt.slice(0, 10)} · {time(request.startAt)}–{time(request.endAt)}
        </h3>
        <p>
          {request.targetSpecies !== '暂不限定' && `${request.targetSpecies} · `}
          {request.method !== 'OTHER' && `${methodLabel(request.method)} · `}
          {request.searchArea
            ? `${areaLabel(request.searchArea)} · 不限半径`
            : `${request.radiusKm} km 内`}
        </p>
        <div className="trip-stats">
          <span>
            <b>{result.candidates.length}</b>范围内候选
          </span>
        </div>
      </div>
      {demo ? (
        <p>DEMO / 示例场景不进入真实候选；请退出示例模式探索真实场所。</p>
      ) : (
        <>
          <div className="trip-section-heading">
            <h3>{result.candidates.length ? '选一处水边' : '当前范围内没有匹配场所'}</h3>
          </div>
          <details className="trip-selection-notes">
            <summary>筛选说明</summary>
            <p>
              共收录 {spots.length} 处，当前范围外 {result.outsideRadius + result.outsideArea} 处。
              {result.withoutLocation > 0 &&
                `另有 ${result.withoutLocation} 处未提供坐标，仅在全部列表展示。`}
            </p>
            <p>
              按钓法线索和直线距离排列。开放许可待确认的地点仅作候选。
            </p>
            {request.searchArea && isTraditionalArea(request.searchArea) && (
              <p>传统九区口径，现行区名见资料。渝中区暂未收录可核实的经营性钓场。</p>
            )}
          </details>
          <div className="trip-candidates trip-photo-grid">
            {result.candidates.slice(0, visible).map(({ spot, distanceKm, notes }) => (
              <article
                className={`trip-candidate trip-photo-card ${selected?.id === spot.id ? 'selected' : ''}`}
                key={spot.id}
              >
                <SpotPhoto spot={spot} />
                <div className="trip-photo-body">
                  <h4>
                    <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
                  </h4>
                  <div className="trip-card-location">
                    <span>{spot.traditionalDistrict ?? spot.district}</span>
                    <span className="trip-distance">
                      <MapPin size={13} />
                      {distanceKm.toFixed(1)} km 直线
                    </span>
                  </div>
                  <div className="trip-actions">
                    <button
                      onClick={() => {
                        setSelected(spot);
                        onSelect?.(spot);
                      }}
                      aria-pressed={selected?.id === spot.id}
                    >
                      {selected?.id === spot.id ? '已选 · 查看当地天气' : '查这里的天气'}
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <details className="trip-card-details">
                    <summary>地址与钓法</summary>
                    <p>{spot.address ?? '暂未提供详细地址'}</p>
                    <p>{notes.join(' · ')}</p>
                    <Link to={`/spots/${spot.id}`}>
                      场所资料 <ArrowUpRight size={12} />
                    </Link>
                  </details>
                </div>
              </article>
            ))}
          </div>
          <div className="trip-more">
            {visible < result.candidates.length && (
              <button onClick={() => setVisible((v) => v + 6)}>
                再看 {Math.min(6, result.candidates.length - visible)} 个场所
              </button>
            )}
            {!request.searchArea && request.radiusKm < 100 && (
              <button onClick={() => onAdjust(`改为${Math.min(100, request.radiusKm + 20)}公里`)}>
                扩大到 {Math.min(100, request.radiusKm + 20)} km
              </button>
            )}
            {request.searchArea !== 'MAIN_CITY' && (
              <button onClick={() => onAdjust('看看主城九区')}>查看主城九区</button>
            )}
            {request.searchArea !== 'CHONGQING' && (
              <button onClick={() => onAdjust('看看全重庆')}>查看全重庆</button>
            )}
            {request.searchArea && (
              <button onClick={() => onAdjust(`改为${request.radiusKm}公里`)}>
                改看附近 {request.radiusKm} km
              </button>
            )}
            <Link to="/map">
              在地图查看全部
              <ArrowUpRight size={14} />
            </Link>
          </div>
          {selected && <LocalWeather key={selected.id} spot={selected} request={request} />}
        </>
      )}
      <details className="trip-reference">
        <summary>出发地天气</summary>
        <p>{summarizeWeather(forecast, request)}</p>
      </details>
    </div>
  );
}
