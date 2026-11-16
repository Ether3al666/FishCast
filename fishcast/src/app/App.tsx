import { useState } from 'react';
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
  SlidersHorizontal,
  Leaf,
  Info,
  Waves,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { GeoLocation, PlanRequest, Recommendation } from '../domain/models';
import Scenery from '../components/Scenery';
import { WeatherPanel } from '../components/WeatherPanel';
import { SpotCard } from '../components/SpotCard';
import { useWeather } from '../hooks/useWeather';
import { realSpots } from '../data/spots';
import { demoSpots } from '../data/demo-fixtures';
import { RuleBasedPlanner } from '../planners/RuleBasedPlanner';
import { PageTitle } from '../components/common/PageTitle';
import { EmptySpots } from '../components/common/EmptySpots';
import { PlanForm } from '../components/plan/PlanForm';
import { SpotDetail } from '../pages/SpotDetail';
import { MapPage } from '../pages/MapPage';

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
  const resetLocation = () => {
    clearPlan();
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
        clearPlan();
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
  const [storedPlan, setPlan] = useState<{
    recommendations: Recommendation[];
    request: PlanRequest;
    contextKey: string;
  } | null>(null);
  const contextKey = `${route.key}/${demo}/${location.lat}/${location.lon}/${weather.forecast?.fetchedAt}/${weather.forecast?.isDemo}/${weather.forecast?.stale}`;
  const plan = storedPlan?.contextKey === contextKey ? storedPlan : null;
  // 结果与当前模式、地点和天气绑定，输入变化时由表单清除。
  const clearPlan = () => setPlan(null);
  return (
    <div className="app-shell">
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
          重庆试点 <b>V0.1</b>
        </span>
      </header>
      {demo && (
        <div className="demo-banner" role="status">
          DEMO / 示例数据模式 · 虚构测试场景与示例天气，不用于真实出钓决策{' '}
          <button
            onClick={() => {
              setDemo(false);
              clearPlan();
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
          <span>
            <i className="status-dot live" /> CHONGQING / 重庆试点
          </span>
          <button onClick={resetLocation}>
            <MapPin size={14} />
            {locationLabel}
            <span>切换</span>
          </button>
        </div>
        {route.pathname === '/' && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="tiny-line" /> EVERY TRIP STARTS WITH A LITTLE KNOWING
                </span>
                <h1>
                  好时机，好去处。
                  <br />
                  <span>让每次出钓，心中有数。</span>
                </h1>
                <p>
                  读懂天气，核对钓点，安排下一次水边时光。
                  <br className="desktop-break" />
                  从重庆出发，把决定交给有依据的信息。
                </p>
                <div className="hero-actions">
                  <Link className="button primary" to="/plan">
                    规划一次出钓 <ArrowUpRight size={17} />
                  </Link>
                  <Link className="text-button" to="/map">
                    探索候选水域 <ArrowRight size={17} />
                  </Link>
                </div>
                <div className="hero-notes">
                  <span>
                    <Check size={13} />
                    真实天气来源
                  </span>
                  <span>
                    <Check size={13} />
                    许可状态透明
                  </span>
                  <span>
                    <Check size={13} />
                    规则可解释
                  </span>
                </div>
              </div>
              <div className="hero-art">
                <Scenery />
                <div className="art-label">
                  <span>FIELD EXPLORER / 01</span>
                  <b>
                    <Waves size={15} />
                    山城有水，出发有据
                  </b>
                </div>
                <div className="compass-mark">
                  N<br />✣
                </div>
              </div>
            </section>
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
                <span className="eyebrow">BEFORE YOU GO</span>
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
                  <span className="eyebrow">FIND YOUR NEXT WATERSIDE</span>
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
                  {spots.map((s) => (
                    <SpotCard key={s.id} spot={s} />
                  ))}
                </div>
              ) : (
                <EmptySpots
                  onDemo={() => {
                    setDemo(true);
                    clearPlan();
                  }}
                />
              )}
            </section>
            <section className="bottom-strip">
              <Leaf size={25} strokeWidth={1.4} />
              <div>
                <h3>把好风景，也留给下一次。</h3>
                <p>遵守现场规定，带走垃圾；未核实开放的水域，请先向管理方确认。</p>
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
                  clearPlan();
                }}
              />
            }
          />
          <Route path="/spots/:id" element={<SpotDetail spots={spots} />} />
          <Route
            path="/plan"
            element={
              <>
                <PageTitle
                  eyebrow="GUIDED TRIP PLANNER"
                  title="下一次出钓，从这里开始"
                  text="规则规划模式 · 结构化表单驱动，未接入运行时大模型。"
                />
                <div className="plan-layout">
                  <section className="panel plan-form">
                    <div className="section-heading">
                      <h2>告诉我们你的打算</h2>
                      <SlidersHorizontal size={18} />
                    </div>
                    <PlanForm
                      location={location}
                      onChange={clearPlan}
                      onSubmit={(request) =>
                        setPlan({
                          request,
                          contextKey,
                          recommendations: new RuleBasedPlanner().plan(request, {
                            spots,
                            forecast: weather.forecast,
                          }),
                        })
                      }
                    />
                    <p className="fine-print">
                      范围、鱼种和钓法作为需求保留；P0 尚未启用匹配评分。
                    </p>
                  </section>
                  <section className="panel plan-result" aria-live="polite">
                    <span className="eyebrow">YOUR NEXT TRIP</span>
                    <h2>{plan ? '核查结果已生成' : '把时间留给水边'}</h2>
                    {plan ? (
                      <>
                        <div className="notice warning">暂无可靠时段建议 · 合格钓点不足</div>
                        <p>
                          请求时间：
                          {new Date(plan.request.startAt).toLocaleString('zh-CN', {
                            timeZone: 'Asia/Shanghai',
                          })}{' '}
                          —{' '}
                          {new Date(plan.request.endAt).toLocaleString('zh-CN', {
                            timeZone: 'Asia/Shanghai',
                          })}
                        </p>
                        <ol className="plan-steps">
                          <li>
                            <Check size={15} />
                            已读取你的结构化需求
                          </li>
                          <li>
                            <Info size={15} />
                            {weather.forecast
                              ? `${weather.forecast.isDemo ? '仅有示例天气' : '已读取天气预报'}；未宣称具备官方预警`
                              : '真实天气不可用，无法评分'}
                          </li>
                          <li>
                            <ShieldCheck size={15} />
                            已核查 {plan.recommendations.length} 条候选，0 个进入正式推荐
                          </li>
                        </ol>
                        {plan.recommendations.map((r) => (
                          <details key={r.spotId}>
                            <summary>
                              {spots.find((s) => s.id === r.spotId)?.name} · 不予推荐
                            </summary>
                            <ul>
                              {r.reasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          </details>
                        ))}
                        <Link className="text-button" to="/about">
                          查看缺失资料 <ArrowRight size={15} />
                        </Link>
                      </>
                    ) : (
                      <>
                        <div className="plan-illustration">
                          <Waves size={70} strokeWidth={0.65} />
                        </div>
                        <p>
                          选好时间、鱼种和钓法，系统会核查当前资料。
                          <br />
                          没有足够依据时，结果也会如实告诉你。
                        </p>
                        <div className="plan-chips">
                          <span>01 读取需求</span>
                          <span>02 核查资料</span>
                          <span>03 解释结果</span>
                        </div>
                      </>
                    )}
                  </section>
                </div>
                <div className="safety-note">
                  <ShieldCheck size={18} />
                  <p>本轮没有评分算法或有效开放钓点，不生成推荐名次或鱼获概率。</p>
                </div>
              </>
            }
          />
          <Route
            path="/about"
            element={
              <>
                <PageTitle
                  eyebrow="EVIDENCE, NOT GUESSWORK"
                  title="每一条信息，都有来处"
                  text="数据完整度、已知边界与下一步核查，全部公开。"
                />
                <div className="about-grid">
                  <section className="panel prose">
                    <span className="eyebrow">DATA TRANSPARENCY</span>
                    <h2>我们目前知道什么</h2>
                    <dl>
                      <dt>天气来源</dt>
                      <dd>
                        <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">
                          Open-Meteo <ExternalLink size={13} />
                        </a>{' '}
                        逐小时数值预报，非现场观测。城市参考坐标 29.56,
                        106.55（WGS84），不代表钓点天气。
                      </dd>
                      <dt>真实钓点</dt>
                      <dd>
                        {realSpots.length} 条。尚未完成 5–10 个候选场所的来源、坐标与许可核查。
                      </dd>
                      <dt>地图服务</dt>
                      <dd>
                        高德 JS API
                        2.0，只在地图页点击加载后请求基础地图。坐标转换在本地完成，未接入 POI
                        搜索、路线或地理编码。账户可用额度以高德控制台为准；示例标记不是现实钓点。
                      </dd>
                      <dt>许可与法规</dt>
                      <dd>
                        UNKNOWN 和 PROHIBITED 均不进入推荐。CONDITIONAL 需逐项核查，证据超过 30
                        天视为待复核。具体适用水域和现行条文尚待核实。
                      </dd>
                      <dt>官方预警 / 水位</dt>
                      <dd>尚未接入，不能据此声称安全。出发前请查询当地官方预警并服从现场管理。</dd>
                      <dt>评分与 AI</dt>
                      <dd>
                        P0
                        未启用适钓评分；后续分数仅为环境与钓点匹配的启发式评分，尚未经过真实鱼获校准。规则助手未连接大模型。
                      </dd>
                    </dl>
                  </section>
                  <section className="panel prose">
                    <span className="eyebrow">YOUR DATA, YOUR DEVICE</span>
                    <h2>隐私与使用说明</h2>
                    <p>
                      默认使用城市参考坐标，不自动读取设备定位。点击“使用我的位置”后才申请授权，坐标仅用于请求
                      Open-Meteo 天气。
                    </p>
                    <p>
                      当前版本没有登录、数据库、第三方统计或跨设备同步；尚未启用收藏和出钓记录。天气缓存在页面内存中，关闭页面即清除。
                    </p>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setDemo((v) => !v);
                        clearPlan();
                      }}
                    >
                      {demo ? '返回真实数据模式' : '进入 DEMO / 示例模式'}
                    </button>
                    <p>示例模式每次手动启用，不持久化，不混入真实推荐。</p>
                    <h3>核查入口</h3>
                    <a
                      href="https://nyncw.cq.gov.cn/ztzl_161/rdzt/snjy/xgzc/202403/t20240305_12995561_wap.html"
                      target="_blank"
                      rel="noreferrer"
                    >
                      重庆休闲垂钓管理办法 <ArrowUpRight size={13} />
                    </a>
                    <p className="fine-print">
                      2026-11-16 读取原文超时，保留核查入口，不代表已核实最新有效性。
                    </p>
                    <a
                      href="https://creativecommons.org/licenses/by/4.0/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      天气数据许可 · CC BY 4.0 <ArrowUpRight size={13} />
                    </a>
                  </section>
                </div>
              </>
            }
          />
          <Route
            path="*"
            element={
              <section className="panel empty-state">
                <h1>这条路线还没开放</h1>
                <Link className="button primary" to="/">
                  返回首页
                </Link>
              </section>
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
              clearPlan();
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
