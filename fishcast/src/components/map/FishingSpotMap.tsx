import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Map, MapPin, RefreshCw, X } from 'lucide-react';
import type { Spot } from '../../domain/models';
import type { AMapInstance, AMapNamespace, MapPoint } from '../../domain/map';
import { resolveMapConfiguration } from '../../config/map-config';
import { buildMapPoints, chongqingMapCenter, mapStatusLabel } from '../../services/mapAdapter';
import { loadAMap } from '../../services/amapLoader';
import Scenery from '../Scenery';

const configuration = resolveMapConfiguration(import.meta.env, import.meta.env.DEV);

export function FishingSpotMap({ spots, demo }: { spots: Spot[]; demo: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<AMapInstance | null>(null);
  const sdk = useRef<AMapNamespace | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const points = useMemo(() => buildMapPoints(spots, demo), [spots, demo]);
  const selected = points.find((point) => point.spotId === selectedId);
  const select = useCallback((point: MapPoint) => {
    setSelectedId(point.spotId);
    map.current?.setZoomAndCenter(13, point.position);
  }, []);

  useEffect(() => {
    if (!enabled || !configuration.ready || !container.current) return;
    let cancelled = false;
    let instance: AMapInstance | null = null;
    let renderingTimer: ReturnType<typeof setTimeout> | undefined;
    let resize: ResizeObserver | undefined;
    let onComplete: (() => void) | undefined;
    setState('loading');
    setError('');
    void loadAMap(configuration.credentials)
      .then((api) => {
        if (cancelled || !container.current) return;
        sdk.current = api;
        instance = new api.Map(container.current, {
          center: chongqingMapCenter,
          zoom: 11,
          viewMode: '2D',
          resizeEnable: true,
          animateEnable: false,
          jogEnable: false,
        });
        map.current = instance;
        onComplete = () => {
          if (cancelled) return;
          clearTimeout(renderingTimer);
          setState('ready');
        };
        instance.on('complete', onComplete);
        renderingTimer = setTimeout(() => {
          if (cancelled) return;
          setState('error');
          setError('底图未能完成加载，请检查网络或高德控制台额度。候选列表仍可使用。');
        }, 20000);
        resize = new ResizeObserver(() => instance?.resize());
        resize.observe(container.current);
      })
      .catch(() => {
        if (!cancelled) {
          setState('error');
          setError(
            '地图加载失败，请检查网络、Web 端 Key、域名限制与可用额度。可继续使用列表，或手动重试。',
          );
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(renderingTimer);
      resize?.disconnect();
      if (instance && onComplete) instance.off('complete', onComplete);
      instance?.destroy();
      if (map.current === instance) map.current = null;
      sdk.current = null;
    };
  }, [enabled, attempt]);

  useEffect(() => {
    const instance = map.current,
      api = sdk.current;
    if (state !== 'ready' || !instance || !api) return;
    const entries = points.map((point) => {
      const content = document.createElement('button');
      content.type = 'button';
      content.className = 'map-pin map-pin-' + point.legalStatus.toLowerCase();
      content.textContent =
        point.legalStatus === 'PROHIBITED' ? '×' : point.legalStatus === 'UNKNOWN' ? '?' : '•';
      content.setAttribute(
        'aria-label',
        point.name +
          ' · ' +
          mapStatusLabel(point.legalStatus) +
          (point.isDemo ? ' · DEMO 示例位置' : ''),
      );
      const marker = new api.Marker({
        position: point.position,
        content,
        anchor: 'bottom-center',
        title: point.name,
      });
      const click = () => select(point);
      marker.on('click', click);
      return { marker, click };
    });
    instance.add(entries.map((entry) => entry.marker));
    return () => {
      entries.forEach((entry) => entry.marker.off('click', entry.click));
      if (map.current === instance) instance.remove(entries.map((entry) => entry.marker));
    };
  }, [points, state, select]);

  return (
    <section className="fishing-map panel" aria-label="重庆候选水域地图">
      <div className="map-stage">
        <div ref={container} className="amap-container" data-testid="amap-container" />
        {state !== 'ready' && (
          <div className="map-cover">
            <Scenery compact />
            <div className="map-fallback">
              <Map size={30} />
              <h2>
                {state === 'loading'
                  ? '正在加载重庆地图…'
                  : state === 'error'
                    ? '地图暂时不可用'
                    : '重庆地图'}
              </h2>
              <p>
                {state === 'error'
                  ? error
                  : !configuration.ready
                    ? configuration.message
                    : '点击后加载高德基础地图。支持缩放、拖动和候选标记。'}
              </p>
              {configuration.ready && state !== 'loading' && (
                <button
                  className="button primary"
                  onClick={() => {
                    setEnabled(true);
                    setAttempt((value) => value + 1);
                  }}
                >
                  {state === 'error' ? '重试加载地图' : '加载重庆地图'} <ArrowRight size={15} />
                </button>
              )}
              <button
                className="text-button map-list-link"
                onClick={() =>
                  document.getElementById('candidate-list')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                查看候选列表 <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
        {state === 'ready' && (
          <div className="map-toolbar">
            <span>
              <i className="status-dot live" />
              高德基础地图 · 重庆
            </span>
            <button
              aria-label="回到重庆默认视图"
              onClick={() => map.current?.setZoomAndCenter(11, chongqingMapCenter)}
            >
              <RefreshCw size={14} />
              回到重庆
            </button>
          </div>
        )}
        {state === 'ready' && selected && (
          <div className="map-selection" aria-live="polite">
            <button
              className="map-selection-close"
              aria-label="关闭标记详情"
              onClick={() => setSelectedId(null)}
            >
              <X size={16} />
            </button>
            <span className="eyebrow">
              {selected.isDemo ? 'DEMO / 虚构展示位置' : '候选记录 · 不代表可合法垂钓'}
            </span>
            <h3>{selected.name}</h3>
            <span
              className={'badge ' + (selected.legalStatus === 'PROHIBITED' ? 'danger' : 'muted')}
            >
              {mapStatusLabel(selected.legalStatus)}
            </span>
            <p>
              {selected.isDemo
                ? '标记仅演示交互，不代表现实钓点，不提供导航。'
                : '出发前仍需核查许可有效期、现场开放和安全条件。'}
            </p>
            <Link className="text-button" to={'/spots/' + selected.spotId}>
              查看资料与依据 <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
      <div className="map-caption">
        <p>
          {demo
            ? 'DEMO / 示例标记位置仅用于交互演示，与现实场所无关。'
            : '地图只显示有来源和有效坐标的记录；暂无真实标记时不会补造钓点。'}
        </p>
        <div className="map-legend">
          <span>
            <i className="unknown" />
            待核实
          </span>
          <span>
            <i className="prohibited" />
            禁止垂钓
          </span>
          <span>
            <i className="open" />
            已核实记录（需复核）
          </span>
        </div>
        {state === 'ready' && (
          <div className="map-point-buttons" aria-label="选择地图标记">
            {points.length ? (
              points.map((point) => (
                <button
                  key={point.spotId}
                  onClick={() => select(point)}
                  aria-pressed={selected?.spotId === point.spotId}
                >
                  <MapPin size={13} />
                  {point.name}
                  {point.isDemo ? ' · DEMO' : ''}
                </button>
              ))
            ) : (
              <span>当前筛选下没有可显示的标记。</span>
            )}
          </div>
        )}
        <small>按需加载，不接入搜索或路线服务；账户可用额度以高德控制台为准。</small>
      </div>
    </section>
  );
}
