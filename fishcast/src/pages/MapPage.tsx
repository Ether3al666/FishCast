import { useMemo, useState } from 'react';
import type { Spot } from '../domain/models';
import { PageTitle } from '../components/common/PageTitle';
import { EmptySpots } from '../components/common/EmptySpots';
import { SpotCard } from '../components/SpotCard';
import { SpotPhoto } from '../components/plan/SpotPhoto';
import { FishingSpotMap } from '../components/map/FishingSpotMap';
import {
  MAIN_CITY_DISTRICTS,
  MORE_DISTRICTS,
  matchesArea,
  type SearchArea,
} from '../config/regions';

export function MapPage({
  spots,
  demo,
  onDemo,
}: {
  spots: Spot[];
  demo: boolean;
  onDemo: () => void;
}) {
  const [legalFilter, setLegalFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<SearchArea>('CHONGQING');
  const filtered = useMemo(
    () =>
      spots.filter(
        (spot) =>
          (legalFilter === 'all' || spot.legalStatus === legalFilter) &&
          matchesArea(spot, demo ? undefined : area) &&
          `${spot.name} ${spot.address ?? ''} ${spot.district} ${spot.traditionalDistrict ?? ''}`.includes(
            query.trim(),
          ),
      ),
    [spots, legalFilter, query, area, demo],
  );
  return (
    <>
      <PageTitle image="shore" title="找一片值得出发的水域" />
      <div className="map-page">
        {!demo && (
          <section className="region-browser" aria-label="全重庆场所覆盖">
            <div className="map-region-intro">
              <h2>选择区域</h2>
            </div>
            <div className="map-region-controls">
              <div className="region-options">
                <button aria-pressed={area === 'CHONGQING'} onClick={() => setArea('CHONGQING')}>
                  全重庆 · {spots.length}
                </button>
                <button aria-pressed={area === 'MAIN_CITY'} onClick={() => setArea('MAIN_CITY')}>
                  主城九区 · {spots.filter((s) => matchesArea(s, 'MAIN_CITY')).length}
                </button>
                {MAIN_CITY_DISTRICTS.map((d) => (
                  <button key={d} aria-pressed={area === d} onClick={() => setArea(d)}>
                    {d} · {spots.filter((s) => matchesArea(s, d)).length}
                  </button>
                ))}
              </div>
              <label className="field region-select">
                更多区县
                <select
                  value={MORE_DISTRICTS.some((d) => d === area) ? area : ''}
                  onChange={(event) => setArea((event.target.value || 'CHONGQING') as SearchArea)}
                >
                  <option value="">选择区县</option>
                  <optgroup label="现行新区">
                    <option value="两江新区">
                      两江新区 · {spots.filter((s) => matchesArea(s, '两江新区')).length}
                    </option>
                  </optgroup>
                  <optgroup label="其他区县">
                    {MORE_DISTRICTS.filter((d) => d !== '两江新区').map((d) => (
                      <option key={d} value={d}>
                        {d} · {spots.filter((s) => matchesArea(s, d)).length}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              {area === '渝中区' && <p>渝中区暂未收录可核实的钓场，可查看周边区域。</p>}
            </div>
          </section>
        )}
        <div className="map-layout">
          <div className="map-visual">
            <div className="map-column-heading">
              <h2>水域地图</h2>
            </div>
            <FishingSpotMap spots={filtered} demo={demo} />
          </div>
          <section className="candidate-list" id="candidate-list">
            <div className="section-heading">
              <div>
                <h2>候选水域</h2>
              </div>
              <span className="map-result-count">{filtered.length} 个地点</span>
            </div>
            <div className="map-list-filters">
              <label className="field">
                <input
                  type="search"
                  aria-label="搜索场所或地址"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索地点或地址"
                />
              </label>
              <label className="field">
                <select
                  aria-label="按资料类型查看"
                  value={legalFilter}
                  onChange={(event) => setLegalFilter(event.target.value)}
                >
                  <option value="all">全部状态</option>
                  <option value="UNKNOWN">资料收录</option>
                  <option value="PROHIBITED">禁止垂钓</option>
                  <option value="CONDITIONAL">附加条件</option>
                  <option value="VERIFIED_OPEN">已核实开放</option>
                </select>
              </label>
            </div>
            {spots.length ? (
              <div className="filtered-list">
                {filtered.length ? (
                  filtered.map((spot) => (
                    <div className="map-place-row" key={spot.id} data-legal={spot.legalStatus}>
                      <SpotPhoto spot={spot} />
                      <SpotCard spot={spot} compact />
                    </div>
                  ))
                ) : (
                  <p>没有符合筛选条件的记录。</p>
                )}
              </div>
            ) : (
              <EmptySpots onDemo={onDemo} />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
