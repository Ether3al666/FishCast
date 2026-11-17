import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  Clock3,
  ExternalLink,
  Fish,
  MapPin,
  ShieldCheck,
  Wallet,
  Waves,
} from 'lucide-react';
import type { Spot } from '../domain/models';
import { PageTitle } from '../components/common/PageTitle';
import { SpotGallery } from '../components/SpotGallery';
import { mapStatusLabel } from '../services/mapAdapter';

const waterTypes: Record<Spot['waterType'], string> = {
  POND: '池塘',
  RESERVOIR: '水库',
  LAKE: '湖泊',
  RIVER: '河流',
  OTHER: '其他水域',
};

export function SpotDetail({ spots }: { spots: Spot[] }) {
  const { id } = useParams();
  const spot = spots.find((s) => s.id === id);
  if (!spot)
    return (
      <section className="panel empty-state">
        <h2>当前模式下没有这条记录</h2>
        <Link to="/map" className="button secondary">
          返回列表
        </Link>
      </section>
    );

  if (spot.isDemo)
    return (
      <>
        <PageTitle
          eyebrow="DEMO / 示例数据"
          title={spot.name}
          text="虚构测试场景，不能用于出行或垂钓决策。"
        />
        <section className="panel prose">
          <h2>
            {spot.legalStatus === 'PROHIBITED' ? '模拟禁止垂钓' : mapStatusLabel(spot.legalStatus)}
          </h2>
          <p>{spot.notes}</p>
          <dl>
            <dt>来源 / 核实日期 / 坐标 / 鱼种 / 费用</dt>
            <dd>均未知；没有来源不输出推荐分数，不提供导航。</dd>
          </dl>
          <Link className="text-button" to="/map">
            <ArrowLeft size={15} /> 返回候选列表
          </Link>
        </section>
      </>
    );

  return (
    <article className="venue-detail venue-editorial">
      <div className="venue-navigation">
        <Link className="venue-back" to="/map">
          <ArrowLeft size={15} /> 返回候选列表
        </Link>
        <span className="venue-water-type">
          <Waves size={18} aria-hidden="true" />
          {waterTypes[spot.waterType]}
        </span>
      </div>

      <SpotGallery key={spot.id} id={spot.id} name={spot.name} />

      <header className="venue-heading">
        <div>
          <h1>{spot.name}</h1>
          <p>
            <MapPin size={16} aria-hidden="true" />
            {spot.district} · {spot.address ?? '未提供地址'}
          </p>
        </div>
      </header>

      <div className="venue-body">
        <div className="venue-information">
          <section className="venue-intro">
            <h2>关于这里</h2>
            <p>{spot.notes}</p>
            <div className="venue-location">
              <MapPin size={20} aria-hidden="true" />
              <div>
                <strong>{spot.address ?? '未提供地址'}</strong>
                <p>{spot.locationNote ?? '暂未提供具体坐标。'}</p>
              </div>
              {spot.locationEvidence && (
                <a
                  href={spot.locationEvidence.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="在高德查看参考位置"
                >
                  查看位置 <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              )}
            </div>
          </section>

          <div className="venue-disclosures">
            <details>
              <summary>
                位置与核查信息 <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <dl>
                {spot.traditionalDistrict && (
                  <>
                    <dt>传统九区检索分组 / 地图现行区名</dt>
                    <dd>
                      {spot.traditionalDistrict} / {spot.district}。
                      {spot.districtEvidence?.township}
                    </dd>
                  </>
                )}
                {spot.location && (
                  <>
                    <dt>参考坐标 · WGS84</dt>
                    <dd>
                      {spot.location.lat.toFixed(6)}, {spot.location.lon.toFixed(6)}
                      。仅用于识别所在区域，不是钓位导航。
                    </dd>
                  </>
                )}
                {spot.locationEvidence && (
                  <>
                    <dt>位置来源</dt>
                    <dd>
                      <a href={spot.locationEvidence.url} target="_blank" rel="noreferrer">
                        高德 POI：{spot.locationEvidence.poiName} <ExternalLink size={13} />
                      </a>
                      <br />
                      查询日期：{spot.locationEvidence.retrievedAt.slice(0, 10)}；地图原始坐标
                      GCJ-02，经本地转换为 WGS84 保存。
                    </dd>
                  </>
                )}
                <dt>当前鱼种 / 钓法 / 费用 / 营业时间</dt>
                <dd>请咨询场所了解现行信息。历史赛事鱼种和收费不作为当前承诺。</dd>
                <dt>开放许可核实日期</dt>
                <dd>
                  {spot.verifiedAt
                    ? spot.verifiedAt.slice(0, 10)
                    : '暂无记录；资料查询日期不等于许可核实日期。'}
                </dd>
              </dl>
            </details>
            <details>
              <summary>
                公开资料与来源{' '}
                <span>
                  {spot.evidence.length} 条资料 <ChevronDown size={18} aria-hidden="true" />
                </span>
              </summary>
              <ul className="venue-evidence">
                {spot.evidence.map((e) => (
                  <li key={e.url}>
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {e.title} <ExternalLink size={13} />
                    </a>
                    <p>
                      发布：{e.publishedAt ?? '未注明'} · 查询：{e.retrievedAt.slice(0, 10)}
                      <br />
                      {e.scope ?? '资料来源，需复核适用性。'}
                    </p>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>

        <aside className="venue-visit" aria-label="出发前确认">
          <div className="venue-status">
            <ShieldCheck size={25} aria-hidden="true" />
            <div>
              <h2>
                {spot.legalStatus === 'UNKNOWN' ? '出行信息' : mapStatusLabel(spot.legalStatus)}
              </h2>
              <p>
                {spot.legalStatus === 'PROHIBITED'
                  ? '请勿在此垂钓'
                  : spot.legalStatus === 'VERIFIED_OPEN'
                    ? '出发前仍需复核适用条件'
                    : '营业时间、费用与鱼情请咨询场所'}
              </p>
            </div>
          </div>
          <dl className="venue-facts">
            <div>
              <dt>
                <Clock3 size={16} aria-hidden="true" />
                营业时间
              </dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>
                <Wallet size={16} aria-hidden="true" />
                费用 / 预约
              </dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>
                <Fish size={16} aria-hidden="true" />
                鱼种 / 钓法
              </dt>
              <dd>—</dd>
            </div>
          </dl>
          <details className="venue-conditions">
            <summary>
              出发前确认 <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <ul>
              {spot.legalConditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </details>
          <p className="venue-permission-note">
            {spot.legalStatus === 'VERIFIED_OPEN'
              ? '许可记录不代表当前现场安全，仍需核查天气、预警与适用时段。'
              : '当前没有有效开放许可依据，暂不进入正式推荐。'}
          </p>
          <Link className="button secondary" to="/map">
            看看其他地点 <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </article>
  );
}
