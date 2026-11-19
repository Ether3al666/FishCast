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
            FishCast<span>重庆淡水出钓助手</span>
          </h1>
          <p>查天气、找水域、规划出钓。</p>
          <Link className="button coastal-cta" to="/plan">
            规划一次出钓 <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="hero-bottom">
          <button onClick={showWeather}>
            查看天气 <ArrowDown size={14} />
          </button>
        </div>
      </section>

      <section className="explore-section" aria-labelledby="explore-title">
        <div className="editorial-heading">
          <h2 id="explore-title">出钓工具</h2>
          <span className="editorial-rule" />
        </div>
        <div className="journey-grid">
          <button className="journey-card" onClick={showWeather}>
            <img src="images/water.jpg" alt="" loading="lazy" />
            <span className="journey-copy">
              <strong>天气预报</strong>
              <span>查看今明两天风雨</span>
              <ArrowDown size={20} />
            </span>
          </button>
          <Link className="journey-card" to="/map">
            <img src="images/shore.jpg" alt="" loading="lazy" />
            <span className="journey-copy">
              <strong>地图找点</strong>
              <span>按区县浏览水域</span>
              <ArrowUpRight size={20} />
            </span>
          </Link>
          <Link className="journey-card" to="/plan">
            <img src="images/coast.jpg" alt="" loading="lazy" />
            <span className="journey-copy">
              <strong>出钓规划</strong>
              <span>按日期和地点安排</span>
              <ArrowUpRight size={20} />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
