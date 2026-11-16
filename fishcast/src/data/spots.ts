import raw from './chongqing-spots.json';
import { spotSchema } from '../domain/models';

// 真实库只接受非 demo 记录。空库是有意的，不能用示例补足真实点位。
export const realSpots = spotSchema
  .array()
  .parse(raw)
  .filter((spot) => !spot.isDemo);
