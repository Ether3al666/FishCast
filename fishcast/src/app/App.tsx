import { useLayoutEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Fish,
  Map,
  MapPin,
  Navigation,
  ShieldCheck,
  Leaf,
} from 'lucide-react';
import type { GeoLocation } from '../domain/models';
import { HomeIntro } from '../components/HomeIntro';
import { WeatherPanel } from '../components/WeatherPanel';
import { SpotCard } from '../components/SpotCard';
import { useWeather } from '../hooks/useWeather';
import { realSpots } from '../data/spots';
import { demoSpots } from '../data/demo-fixtures';
import { AgentPlanner } from '../components/plan/AgentPlanner';
import { PageTitle } from '../components/common/PageTitle';
import { EmptySpots } from '../components/common/EmptySpots';

import { SpotDetail } from '../pages/SpotDetail';
import { MapPage } from '../pages/MapPage';
import { AboutPage } from '../pages/AboutPage';

// 城市级天气参考中心，非钓点坐标、非用户定位。来源见 DATA_SOURCES。
const cityLocation: GeoLocation = { lat: 29.56, lon: 106.55, crs: 'WGS84' };
const navigation = [
  { to: '/', label: '探索首页', Icon: Compass },
  { to: '/map', label: '地图找点', Icon: Map },
  { to: '/plan', label: '出钓规划', Icon: Navigation },
  { to: '/about', label: '数据与依据', Icon: ShieldCheck },
];

export default function App() {
  const [demo, setDemo] = useState(false);
  const [location, setLocation] = useState(cityLocation);
  const [locationLabel, setLocationLabel] = useState('重庆 · 主城区参考中心');
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [day, setDay] = useState(0);
  const weather = useWeather(location, demo);
  const spots = demo ? demoSpots : realSpots;
  const route = useLocation();
  const pageKind =
    route.pathname === '/'
      ? 'home'
      : route.pathname.startsWith('/spots/')
        ? 'spot'
        : route.pathname.slice(1);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [route.pathname]);
  const resetLocation = () => {
    setLocation(cityLocation);
    setLocationLabel('重庆 · 主城区参考中心');
    setLocationMessage('已切换为城市参考坐标，不代表你的真实位置。');
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setLocationMessage('浏览器不支持定位，请使用重庆参考中心。');
      return;
    }
    setLocating(true);
    setLocationMessage('正在等待浏览器定位授权…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          crs: 'WGS84',
        });
        setLocationLabel('我的位置 · 仅用于天气');
        setLocating(false);
        setLocationMessage('位置仅保存在当前页面内存，并发送给天气服务；不写入本地存储。');
      },
      () => {
        setLocating(false);
        setLocationMessage('定位未获授权或获取失败，可继续使用重庆参考中心。');
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  };

  return (
    <div
      className={`app-shell is-${pageKind} ${pageKind !== 'home' && pageKind !== 'spot' ? 'has-cover' : ''}`}
    >
      <button
        className="skip-link"
        onClick={() => {
          const main = document.getElementById('main');
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        跳到主要内容
      </button>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="FishCast 首页">
          <span className="brand-icon">
            <Fish size={25} strokeWidth={1.6} />
          </span>
          <strong>
            FishCast<span>重庆淡水出钓助手</span>
          </strong>
        </Link>
        <nav aria-label="主导航">
          {navigation.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <span className="pilot">
          <i />
          重庆试点
        </span>
      </header>
      {demo && (
        <div className="demo-banner" role="status">
          DEMO / 示例数据模式 · 虚构测试场景与示例天气，不用于真实出钓决策{' '}
          <button
            onClick={() => {
              setDemo(false);
            }}
          >
            退出示例
          </button>
        </div>
      )}
      {!weather.online && (
        <div className="offline-banner" role="status">
          当前离线 · 应用页面可操作，真实天气暂不可用
        </div>
      )}
      <main id="main" tabIndex={-1} key={route.pathname}>
        <div className="context-bar">
          <button onClick={resetLocation}>
            <MapPin size={14} />
            {locationLabel}
            <span>切换</span>
          </button>
        </div>
        {route.pathname === '/' && (
          <>
            <HomeIntro />
            <div className="safety-note">
              <ShieldCheck size={18} />
              <p>
                <b>先核实，再出发。</b>{' '}
                当前暂无已核实开放钓点；未接入权威预警和水位数据，天气良好也不代表安全。
              </p>
              <Link to="/about">
                了解依据 <ArrowRight size={14} />
              </Link>
            </div>
            <div className="dashboard-grid">
              <WeatherPanel {...weather} day={day} setDay={setDay} />
              <section className="readiness panel">
                <h2>这次出发，准备好了吗？</h2>
                <div className="readiness-status">
                  <span className="ring">
                    <ShieldCheck size={25} />
                  </span>
                  <div>
                    <strong>等待钓点核实</strong>
                    <p>资料不足，暂不生成推荐分数</p>
                  </div>
                </div>
                <ul className="checklist">
                  <li>
                    <span>
                      <i
                        className={
                          weather.forecast && !weather.forecast.stale && !demo ? 'green' : ''
                        }
                      />
                      天气数据
                    </span>
                    <b>
                      {demo
                        ? '示例数据'
                        : weather.forecast && !weather.forecast.stale
                          ? '已获取预报'
                          : '等待有效数据'}
                    </b>
                  </li>
                  <li>
                    <span>
                      <i />
                      钓点许可
                    </span>
                    <b>尚无核实开放点</b>
                  </li>
                  <li>
                    <span>
                      <i />
                      官方预警 / 水位
                    </span>
                    <b>暂未接入</b>
                  </li>
                </ul>
                <Link className="readiness-link" to="/about">
                  查看数据完整度 <ArrowUpRight size={16} />
                </Link>
              </section>
            </div>
            <section className="spot-section">
              <div className="section-heading">
                <div>
                  <h2>
                    下一站，去哪里？ <span className="count">{spots.length} 个候选</span>
                  </h2>
                </div>
                <Link className="text-button" to="/map">
                  地图与列表 <ArrowRight size={16} />
                </Link>
              </div>
              {spots.length ? (
                <div className="spot-grid">
                  {spots.slice(0, 6).map((s) => (
                    <SpotCard key={s.id} spot={s} showPhoto />
                  ))}
                </div>
              ) : (
                <EmptySpots
                  onDemo={() => {
                    setDemo(true);
                  }}
                />
              )}
            </section>
            <section className="bottom-strip">
              <Leaf size={25} strokeWidth={1.4} />
              <div>
                <h3>把好风景，也留给下一次。</h3>
                <p>遵守现场规定，带走垃圾；出发前向管理方了解开放安排。</p>
              </div>
              <Link to="/about">
                出钓须知 <ArrowUpRight size={15} />
              </Link>
            </section>
          </>
        )}
        <Routes>
          <Route path="/" element={null} />
          <Route
            path="/map"
            element={
              <MapPage
                spots={spots}
                demo={demo}
                onDemo={() => {
                  setDemo(true);
                }}
              />
            }
          />
          <Route path="/spots/:id" element={<SpotDetail spots={spots} />} />
          <Route
            path="/plan"
            element={
              <>
                <PageTitle title="下一次出钓，从这里开始" image="water" />
                <AgentPlanner
                  key={`${demo}/${location.lat}/${location.lon}`}
                  location={location}
                  locationLabel={locationLabel}
                  forecast={weather.forecast}
                  spots={spots}
                  loading={weather.loading}
                  onRefresh={weather.retry}
                  error={weather.error}
                />
              </>
            }
          />
          <Route
            path="/about"
            element={<AboutPage demo={demo} onToggleDemo={() => setDemo((v) => !v)} />}
          />
          <Route
            path="*"
            element={
              <>
                <PageTitle
                  title="这条路线还没开放"
                  text="回到熟悉的水边，重新选择下一程。"
                  image="shore"
                />
                <div className="page-recovery">
                  <Link className="button secondary" to="/">
                    返回首页
                  </Link>
                </div>
              </>
            }
          />
        </Routes>
        {locationMessage && (
          <p className="location-message" role="status">
            {locationMessage}
          </p>
        )}
        <div className="location-tools">
          <span>天气位置：{locationLabel}</span>
          <button onClick={locate} disabled={locating}>
            <Navigation size={13} />
            {locating ? '正在定位…' : '使用我的位置'}
          </button>
          <button onClick={resetLocation}>重庆参考中心</button>
        </div>
      </main>
      <footer>
        <Link className="footer-brand" to="/">
          <Fish size={19} />
          FishCast
        </Link>
        <span>重庆试点 · 有依据的出钓决定</span>
        <div>
          <span className="mode-label">{demo ? 'DEMO / 示例模式' : '真实数据模式'}</span>
          <button
            onClick={() => {
              setDemo((v) => !v);
            }}
          >
            {demo ? '退出示例' : '体验示例'}
          </button>
          <Link to="/about">
            数据与免责声明 <ArrowUpRight size={12} />
          </Link>
        </div>
      </footer>
      <nav className="mobile-nav" aria-label="手机导航">
        {navigation.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
