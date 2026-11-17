import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { PageTitle } from '../components/common/PageTitle';
import { realSpots } from '../data/spots';

export function AboutPage({ demo, onToggleDemo }: { demo: boolean; onToggleDemo: () => void }) {
  const locatedCount = realSpots.filter((spot) => spot.location).length;

  return (
    <article className="about-editorial">
      <PageTitle
        title="每一条信息，都有来处"
        text="数据完整度、已知边界与下一步核查，全部公开。"
        image="coast"
      />

      <div className="about-introduction">
        <p className="about-opening">
          天气有更新时间，
          <br />
          地点有资料来源。
        </p>
        <div className="about-introduction-copy">
          <p>从一段天气预报，到一处水边的记录，已知与未知都留在页面上，方便你逐项了解。</p>
          <dl className="about-catalog-counts">
            <div>
              <dt>已收录场所资料</dt>
              <dd>{realSpots.length}</dd>
            </div>
            <div>
              <dt>有参考位置的记录</dt>
              <dd>{locatedCount}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="about-editorial-columns">
        <section className="about-source-section" aria-labelledby="about-sources-title">
          <h2 id="about-sources-title">我们目前知道什么</h2>
          <dl className="about-source-list">
            <div>
              <dt>天气来源</dt>
              <dd>
                <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">
                  Open-Meteo <ExternalLink size={13} />
                </a>{' '}
                逐小时数值预报，非现场观测。城市参考坐标 29.56, 106.55（WGS84），不代表钓点天气。
              </dd>
            </div>
            <div>
              <dt>真实钓点</dt>
              <dd>
                已收录 {realSpots.length} 条真实场所资料，其中 {locatedCount}{' '}
                条有园区或水域参考位置。
                详情列明来源及发布时间；当前缺少有效开放许可依据，不进入正式推荐；收费和营业时间请咨询场所。
              </dd>
            </div>
            <div>
              <dt>地图服务</dt>
              <dd>
                高德 JS API 2.0，只在地图页点击加载后请求基础地图。收录时使用高德 POI
                核对参考位置，网页运行时不调用搜索、路线或地理编码。
                坐标在本地转换；地图位置不等于合法钓位。账户可用额度以高德控制台为准。
              </dd>
            </div>
            <div>
              <dt>许可与法规</dt>
              <dd>
                UNKNOWN 和 PROHIBITED 均不进入推荐。CONDITIONAL 需逐项核查，证据超过 30
                天需重新查阅。具体适用水域和现行条文以官方公告为准。
              </dd>
            </div>
            <div>
              <dt>官方预警 / 水位</dt>
              <dd>尚未接入，不能据此声称安全。出发前请查询当地官方预警并服从现场管理。</dd>
            </div>
            <div>
              <dt>规划助手</dt>
              <dd>
                当前为本地规则助手，未接入大模型，不生成适钓评分或鱼获概率。
                支持日期、时段、鱼种、钓法与区域筛选；上午按 06:00–12:00、下午按 12:00–18:00
                整理，可在精确设置中调整。
              </dd>
            </div>
          </dl>
        </section>

        <div className="about-side-column">
          <figure className="about-water-image">
            <img
              src={`${import.meta.env.BASE_URL}images/water.jpg`}
              alt=""
              loading="lazy"
              decoding="async"
            />
            <figcaption>水景主题图 · 非钓点实景</figcaption>
          </figure>
          <section className="about-privacy-section" aria-labelledby="about-privacy-title">
            <h2 id="about-privacy-title">隐私与使用说明</h2>
            <p>
              默认使用城市参考坐标，不自动读取设备定位。点击“使用我的位置”后才申请授权，坐标仅用于请求
              Open-Meteo 天气。
            </p>
            <p>
              当前版本没有登录、数据库、第三方统计或跨设备同步；尚未启用收藏和出钓记录。对话与天气缓存仅保存在当前页面，关闭后清除。
            </p>
            <button className="button secondary about-demo-button" onClick={onToggleDemo}>
              {demo ? '返回真实数据模式' : '进入 DEMO / 示例模式'}
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
            <p>示例模式每次手动启用，不持久化，不混入真实推荐。</p>
          </section>
        </div>
      </div>

      <section className="about-reference-section" aria-labelledby="about-reference-title">
        <h3 id="about-reference-title">核查入口</h3>
        <div className="about-reference-links">
          <div>
            <a
              href="https://nyncw.cq.gov.cn/ztzl_161/rdzt/snjy/xgzc/202403/t20240305_12995561_wap.html"
              target="_blank"
              rel="noreferrer"
            >
              重庆休闲垂钓管理办法 <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <p className="fine-print">
              2026-11-16 读取原文超时，保留核查入口，不代表已核实最新有效性。
            </p>
          </div>
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            天气数据许可 · CC BY 4.0 <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
    </article>
  );
}
