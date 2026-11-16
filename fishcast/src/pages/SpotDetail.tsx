import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Spot } from '../domain/models';
import { PageTitle } from '../components/common/PageTitle';
export function SpotDetail({ spots }: { spots: Spot[] }) {
  const { id } = useParams();
  const spot = spots.find((s) => s.id === id);
  return spot ? (
    <>
      <PageTitle
        eyebrow="DEMO / 示例数据"
        title={spot.name}
        text="虚构测试场景，不能用于出行或垂钓决策。"
      />
      <section className="panel prose">
        <h2>{spot.legalStatus === 'PROHIBITED' ? '模拟禁止垂钓' : '许可状态待核实'}</h2>
        <p>{spot.notes}</p>
        <dl>
          <dt>来源 / 核实日期 / 坐标 / 鱼种 / 费用</dt>
          <dd>均未知；没有来源不输出推荐分数，不提供导航。</dd>
        </dl>
        <Link className="text-button" to="/map">
          返回候选列表 <ArrowRight size={15} />
        </Link>
      </section>
    </>
  ) : (
    <section className="panel empty-state">
      <h2>当前模式下没有这条记录</h2>
      <Link to="/map" className="button secondary">
        返回列表
      </Link>
    </section>
  );
}
