import { describe, expect, it } from 'vitest';
import { areaLabel, matchesArea } from '../src/config/regions';

describe('重庆全域与传统九区范围', () => {
  it('全重庆包含外围和没有传统九区归属的目录记录', () => {
    expect(areaLabel('CHONGQING')).toBe('全重庆');
    expect(matchesArea({ district: '万州区' }, 'CHONGQING')).toBe(true);
    expect(matchesArea({ district: '重庆市' }, 'CHONGQING')).toBe(true);
    expect(matchesArea({ district: '万州区' }, 'MAIN_CITY')).toBe(false);
  });

  it('外围区县按现行区名匹配，传统九区仍只使用传统归属', () => {
    expect(matchesArea({ district: '酉阳土家族苗族自治县' }, '酉阳土家族苗族自治县')).toBe(true);
    expect(matchesArea({ district: '石柱土家族自治县' }, '酉阳土家族苗族自治县')).toBe(false);
    const changed = { district: '两江新区', traditionalDistrict: '江北区' };
    expect(matchesArea(changed, 'MAIN_CITY')).toBe(true);
    expect(matchesArea(changed, '江北区')).toBe(true);
    expect(matchesArea(changed, '两江新区')).toBe(true);
    expect(matchesArea({ district: '江北区' }, '江北区')).toBe(false);
  });
});
