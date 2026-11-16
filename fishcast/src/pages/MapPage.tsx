import { useMemo, useState } from 'react';
import type { Spot } from '../domain/models';
import { PageTitle } from '../components/common/PageTitle';
import { EmptySpots } from '../components/common/EmptySpots';
import { SpotCard } from '../components/SpotCard';
import { FishingSpotMap } from '../components/map/FishingSpotMap';

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
  const filtered = useMemo(
    () => spots.filter((spot) => legalFilter === 'all' || spot.legalStatus === legalFilter),
    [spots, legalFilter],
  );
  return (
    <>
      <PageTitle
        eyebrow="WATERSIDE EXPLORER"
        title="找一片值得出发的水域"
        text="先查证据，再看距离。按需加载重庆地图，也可以直接使用候选列表。"
      />
      <div className="map-layout">
        <FishingSpotMap spots={filtered} demo={demo} />
        <section className="panel candidate-list" id="candidate-list">
          <div className="section-heading">
            <h2>候选水域</h2>
            <span className="badge muted">
              {filtered.length} / {spots.length} 条记录
            </span>
          </div>
          <label className="field">
            按许可状态查看
            <select value={legalFilter} onChange={(event) => setLegalFilter(event.target.value)}>
              <option value="all">全部状态</option>
              <option value="UNKNOWN">待核实</option>
              <option value="PROHIBITED">禁止垂钓</option>
              <option value="CONDITIONAL">附条件，待核查</option>
              <option value="VERIFIED_OPEN">已核实开放</option>
            </select>
          </label>
          {spots.length ? (
            <div className="filtered-list">
              {filtered.length ? (
                filtered.map((spot) => (
                  <div key={spot.id} data-legal={spot.legalStatus}>
                    <SpotCard spot={spot} />
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
    </>
  );
}
