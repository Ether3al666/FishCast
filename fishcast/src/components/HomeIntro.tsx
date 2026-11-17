import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HomeIntro() {
  const showWeather = () => {
    const panel = document.getElementById('weather-title');
    panel?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    });
    panel?.focus({ preventScroll: true });
  };

  return (
    <>
      <section className="coastal-hero" aria-labelledby="hero-title">
        <img className="coastal-image" src="images/coast.jpg" alt="" fetchPriority="high" />
        <div className="coastal-shade" />
        <div className="coastal-copy">
          <h1 id="hero-title">
            FishCast<span>把时间，留给水边。</span>
          </h1>
          <p>
            读懂天气，寻一片水域。
            <br />
            让每一次出发，都多一分从容。
          </p>
          <Link className="button coastal-cta" to="/plan">
            规划一次出钓 <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="hero-bottom">
          <span>29.56° N &nbsp; 106.55° E / 重庆参考中心</span>
          <button onClick={showWeather}>
            向下探索 <ArrowDown size={14} />
          </button>
        </div>
      </section>

      <section className="editorial-intro" aria-labelledby="intro-title">
        <h2 id="intro-title">慢一点，离自然近一点。</h2>
        <span className="editorial-rule" />
        <p>
          好时机，好去处，不只凭感觉。
          <br />
          从一份天气预报，到一处水域的许可核查，
          <br />
          FishCast 陪你认真准备，也安心期待下一次水边时光。
        </p>
        <Link to="/about" className="text-button">
          了解 FishCast <ArrowUpRight size={14} />
        </Link>
      </section>

      <section className="explore-section" aria-labelledby="explore-title">
        <div className="editorial-heading">
          <h2 id="explore-title">下一次出发</h2>
          <span className="editorial-rule" />
        </div>
        <div className="journey-grid">
          <button className="journey-card" onClick={showWeather}>
            <img src="images/water.jpg" alt="" loading="lazy" />
            <span className="journey-copy">
              <strong>读懂天气</strong>
              <span>留意风雨，选择时机</span>
              <ArrowDown size={20} />
            </span>
          </button>
          <Link className="journey-card" to="/map">
            <img src="images/shore.jpg" alt="" loading="lazy" />
            <span className="journey-copy">
              <strong>寻找水域</strong>
              <span>先核实，再出发</span>
              <ArrowUpRight size={20} />
            </span>
          </Link>
          <Link className="journey-card" to="/plan">
            <img src="images/coast.jpg" alt="" loading="lazy" />
            <span className="journey-copy">
              <strong>计划出钓</strong>
              <span>把期待，变成下一程</span>
              <ArrowUpRight size={20} />
            </span>
          </Link>
        </div>
        <p className="image-note">沿岸影像仅作氛围展示，不代表重庆钓点或开放许可。</p>
      </section>
    </>
  );
}
