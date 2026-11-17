export function PageTitle({
  eyebrow,
  title,
  text,
  image = 'water',
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  image?: 'coast' | 'water' | 'shore';
}) {
  return (
    <header className={`page-title editorial-page-cover cover-${image}`}>
      <img
        className="page-cover-image"
        src={`${import.meta.env.BASE_URL}images/${image}.jpg`}
        alt=""
        fetchPriority="high"
      />
      <div className="page-cover-shade" />
      <div className="page-cover-copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <span className="page-cover-rule" aria-hidden="true" />
        {text && <p>{text}</p>}
      </div>
      <span className="page-cover-caption">水岸影像 · 氛围展示</span>
    </header>
  );
}
