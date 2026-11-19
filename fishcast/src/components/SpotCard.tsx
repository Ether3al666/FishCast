import { ChevronDown, ExternalLink, MapPin, ShieldQuestion, ShieldX } from 'lucide-react';
import type { Spot } from '../domain/models';
import { Link } from 'react-router-dom';
import { mapStatusLabel } from '../services/mapAdapter';
import { SpotPhoto } from './plan/SpotPhoto';

export function SpotCard({
  spot,
  showPhoto = false,
}: {
  spot: Spot;
  showPhoto?: boolean;
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
        {spot.isDemo && <span className="eyebrow">DEMO / 示例</span>}
        <h3>
          <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
        </h3>
        <p>
          <MapPin size={13} />
          {spot.district}
          {!spot.isDemo && !spot.location && ' · 暂无地图位置'}
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
        <Link to={`/spots/${spot.id}`}>
          查看详情 <ExternalLink size={12} />
        </Link>
      </details>
    </article>
  );
}
