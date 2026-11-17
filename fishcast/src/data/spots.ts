import raw from './chongqing-spots.json';
import { spotSchema } from '../domain/models';

// 真实记录有独立来源；场所存在及地图参考位置不等于当前开放许可。
export const realSpots = spotSchema
  .array()
  .parse(raw)
  .filter((spot) => !spot.isDemo);
