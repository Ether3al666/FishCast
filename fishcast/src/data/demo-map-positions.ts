import type { MapPosition } from '../domain/map';
// 仅用于 UI 的虚构 GCJ-02 标记位置；不是钓点坐标，不写入 Spot.location 或推荐引擎。
// 不得在真实模式中投点、计算距离或导航。
export const demoMapPositions: Readonly<Record<string, MapPosition>> = {
  'demo-unknown': [106.55, 29.57],
  'demo-prohibited': [106.59, 29.54],
};
