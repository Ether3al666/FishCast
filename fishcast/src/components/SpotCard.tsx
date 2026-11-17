import { ChevronDown, ExternalLink, MapPin, ShieldQuestion, ShieldX } from 'lucide-react';
import type { Spot } from '../domain/models';
import { Link } from 'react-router-dom';
import { mapStatusLabel } from '../services/mapAdapter';
import { SpotPhoto } from './plan/SpotPhoto';

export function SpotCard({
  spot,
  showPhoto = false,
  compact = false,
}: {
  spot: Spot;
  showPhoto?: boolean;
  compact?: boolean;
}) {
  return (
    <article className={`spot-card${showPhoto ? ' has-photo' : ''}`}>
      {showPhoto ? (
        <div className="spot-card-photo">
          <SpotPhoto spot={spot} />
        </div>
      ) : (
        <div className="spot-icon">
          {spot.legalStatus === 'PROHIBITED' ? <ShieldX size={24} /> : <ShieldQuestion size={24} />}
        </div>
      )}
      <div className="spot-content">
        {(!compact || spot.isDemo) && (
          <span className="eyebrow">
            {spot.isDemo ? 'DEMO / 示例数据' : '真实场所 · 公开资料收录'}
          </span>
        )}
        <h3>
          <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
        </h3>
        <p>
          <MapPin size={13} />
          {spot.district}
          {(!compact || spot.isDemo || !spot.location) &&
            ` · ${spot.isDemo ? '无现实坐标' : spot.location ? '有地图参考位置' : '未提供坐标'}`}
        </p>
      </div>
      {spot.legalStatus !== 'UNKNOWN' && (
        <span className={`badge ${spot.legalStatus === 'PROHIBITED' ? 'danger' : 'muted'}`}>
          {mapStatusLabel(spot.legalStatus)}
        </span>
      )}
      <details>
        <summary>
          场所资料 <ChevronDown size={14} />
        </summary>
        <p>{spot.notes}</p>
        <p>
          {spot.isDemo
            ? '许可、坐标、鱼种、费用及开放时间均无真实核实依据。示例不提供出行导航。'
            : '开放安排、收费和营业时间请咨询场所；公开报道及地图收录不等于允许垂钓。'}
        </p>
        <Link to={`/spots/${spot.id}`}>
          查看详情 <ExternalLink size={12} />
        </Link>
      </details>
    </article>
  );
}
