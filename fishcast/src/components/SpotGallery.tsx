import { useState } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import rawGalleries from '../data/spot-gallery.json';
import rawPhotos from '../data/spot-photos.json';

type VenuePhoto = {
  url: string;
  caption: string;
  alt: string;
  source: string;
  sourceUrl: string;
  dateLabel: string;
};
const galleries: Record<string, VenuePhoto[]> = rawGalleries;
const photos: Record<string, { url: string; sourceUrl: string }> = rawPhotos;

export function SpotGallery({ id, name }: { id: string; name: string }) {
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const mapPhoto = photos[id];
  const entries: VenuePhoto[] =
    galleries[id] ??
    (mapPhoto
      ? [
          {
            ...mapPhoto,
            caption: name,
            alt: `${name} · 高德场所图片，拍摄时间未注明`,
            source: '高德场所图',
            dateLabel: '拍摄时间未注明',
          },
        ]
      : []);
  const available = entries.filter((photo) => !failed.includes(photo.url));
  const current = available[selected] ?? available[0];
  const markFailed = (url: string) => setFailed((previous) => [...new Set([...previous, url])]);

  return (
    <section className="venue-gallery" aria-label={`${name}的地点图片`}>
      <div className={`venue-gallery-grid${available.length > 1 ? ' has-thumbnails' : ''}`}>
        <figure className="venue-gallery-main">
          <img
            src={current?.url ?? `${import.meta.env.BASE_URL}images/water.jpg`}
            alt={current?.alt ?? '水景示意，非该场所实景'}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(event) => {
              if (current) markFailed(current.url);
              else event.currentTarget.style.visibility = 'hidden';
            }}
          />
          <figcaption>
            <ImageIcon size={15} aria-hidden="true" />
            <span>{current?.caption ?? '水景示意 · 非实景'}</span>
            {current && (
              <small>
                {available.indexOf(current) + 1} / {available.length}
              </small>
            )}
          </figcaption>
        </figure>
        {available.length > 1 && (
          <div className="venue-gallery-thumbnails" aria-label="切换地点图片">
            {available.map((photo, index) => (
              <button
                type="button"
                key={photo.url}
                aria-label={`查看${photo.caption}`}
                aria-pressed={current.url === photo.url}
                onClick={() => setSelected(index)}
              >
                <img
                  src={photo.url}
                  alt=""
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => markFailed(photo.url)}
                />
                <span>{photo.caption}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="venue-photo-credit">
        {current ? (
          <>
            <span>{current.dateLabel} · 不代表当前开放情况</span>
            <a href={current.sourceUrl} target="_blank" rel="noreferrer">
              图片来源：{current.source} <ExternalLink size={12} aria-hidden="true" />
            </a>
          </>
        ) : (
          <span>
            {entries.length ? '地点图片暂时无法加载' : '暂无可核实的地点图片'} · 当前为水景示意
          </span>
        )}
      </div>
    </section>
  );
}
