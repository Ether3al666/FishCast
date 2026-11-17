import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import rawPhotos from '../../data/spot-photos.json';
import rawGalleries from '../../data/spot-gallery.json';
import type { Spot } from '../../domain/models';

const photos: Record<
  string,
  { url: string; sourceUrl: string; source: string; retrievedAt: string }
> = rawPhotos;
type PlacePhoto = { url: string; alt: string; sourceUrl: string; source: string };
const galleries: Record<string, PlacePhoto[]> = rawGalleries;

export function SpotPhoto({ spot }: { spot: Spot }) {
  const [failed, setFailed] = useState<string[]>([]);
  const photo = photos[spot.id];
  const candidates = spot.isDemo
    ? []
    : [
        ...(galleries[spot.id] ?? []),
        ...(photo ? [{ ...photo, alt: `${spot.name} · ${photo.source}，拍摄时间未注明` }] : []),
      ];
  const actual = candidates.find((entry) => !failed.includes(entry.url));
  return (
    <figure className="trip-photo">
      <img
        key={actual?.url ?? 'placeholder'}
        src={actual?.url ?? `${import.meta.env.BASE_URL}images/water.jpg`}
        alt={actual?.alt ?? '水景示意，非该场所实景'}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(event) => {
          if (actual) setFailed((previous) => [...new Set([...previous, actual.url])]);
          else event.currentTarget.style.visibility = 'hidden';
        }}
      />
      {spot.legalStatus === 'PROHIBITED' && <span className="trip-photo-status">禁止垂钓</span>}
      <figcaption>
        <ImageIcon size={11} aria-hidden="true" />
        {actual ? (
          <a href={actual.sourceUrl} target="_blank" rel="noreferrer">
            {actual.source}
          </a>
        ) : (
          '水景示意 · 非实景'
        )}
      </figcaption>
    </figure>
  );
}
