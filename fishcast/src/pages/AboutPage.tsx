import { ExternalLink } from 'lucide-react';
import { PageTitle } from '../components/common/PageTitle';

export function AboutPage() {
  return (
    <article className="about-editorial">
      <PageTitle
        title="关于 FishCast"
        text="为重庆淡水出钓提供天气预报、水域查找和行程规划。"
        image="coast"
      />

      <div className="about-editorial-columns">
        <section className="about-source-section" aria-labelledby="about-sources-title">
          <h2 id="about-sources-title">服务来源</h2>
          <dl className="about-source-list">
            <div>
              <dt>天气预报</dt>
              <dd>
                <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                  Open-Meteo <ExternalLink size={13} />
                </a>
                {' · '}
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
                  CC BY 4.0
                </a>
              </dd>
            </div>
            <div>
              <dt>水域地图</dt>
              <dd>底图由高德地图提供。场所资料及发布日期可在各地点详情中查看。</dd>
            </div>
          </dl>
        </section>

        <section className="about-privacy-section" aria-labelledby="about-privacy-title">
          <h2 id="about-privacy-title">定位</h2>
          <p>天气默认显示重庆主城区预报。选择「使用我的位置」并授权后，坐标会发送给天气服务查询当地预报。</p>
        </section>
      </div>
    </article>
  );
}
