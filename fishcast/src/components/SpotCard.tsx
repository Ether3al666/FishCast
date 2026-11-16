import { ChevronDown, ExternalLink, MapPin, ShieldQuestion, ShieldX } from 'lucide-react';
import type { Spot } from '../domain/models';
import { Link } from 'react-router-dom';

export function SpotCard({ spot }: { spot: Spot }) {
  return (
    <article className="spot-card">
      <div className="spot-icon">
        {spot.legalStatus === 'PROHIBITED' ? <ShieldX size={24} /> : <ShieldQuestion size={24} />}
      </div>
      <div className="spot-content">
        <span className="eyebrow">DEMO / 示例数据</span>
        <h3>
          <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
        </h3>
        <p>
          <MapPin size={13} />
          {spot.district} · 无现实坐标
        </p>
      </div>
      <span className={`badge ${spot.legalStatus === 'PROHIBITED' ? 'danger' : 'muted'}`}>
        {spot.legalStatus === 'PROHIBITED' ? '禁止垂钓' : '待核实'}
      </span>
      <details>
        <summary>
          哪些信息未核实 <ChevronDown size={14} />
        </summary>
        <p>{spot.notes}</p>
        <p>许可、坐标、鱼种、费用及开放时间均无真实核实依据。示例不提供出行导航。</p>
        <Link to={`/spots/${spot.id}`}>
          查看详情 <ExternalLink size={12} />
        </Link>
      </details>
    </article>
  );
}
