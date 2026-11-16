import { MapPin, ArrowRight } from 'lucide-react';
export function EmptySpots({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <MapPin size={25} strokeWidth={1.3} />
      </span>
      <div>
        <h3>好去处，值得认真核实。</h3>
        <p>
          真实钓点资料正在准备中。当前没有满足许可与来源要求的推荐，
          <br className="desktop-break" />
          不会用未经核实的地点补足 TOP 3。
        </p>
      </div>
      <button className="button secondary" onClick={onDemo}>
        体验示例场景 <ArrowRight size={15} />
      </button>
    </div>
  );
}
