// Familiar search areas, using the traditional nine-district footprint rather than current divisions.
export const MAIN_CITY_DISTRICTS = [
  '渝中区',
  '大渡口区',
  '江北区',
  '沙坪坝区',
  '九龙坡区',
  '南岸区',
  '北碚区',
  '渝北区',
  '巴南区',
] as const;
// Outside the traditional nine-district footprint; these names use current divisions.
export const OUTER_DISTRICTS = [
  '万州区',
  '涪陵区',
  '黔江区',
  '长寿区',
  '江津区',
  '合川区',
  '永川区',
  '南川区',
  '綦江区',
  '大足区',
  '璧山区',
  '铜梁区',
  '潼南区',
  '荣昌区',
  '开州区',
  '梁平区',
  '武隆区',
  '城口县',
  '丰都县',
  '垫江县',
  '忠县',
  '云阳县',
  '奉节县',
  '巫山县',
  '巫溪县',
  '石柱土家族自治县',
  '秀山土家族苗族自治县',
  '酉阳土家族苗族自治县',
  '彭水苗族土家族自治县',
] as const;
export const MORE_DISTRICTS = ['两江新区', ...OUTER_DISTRICTS] as const;
export const SEARCH_DISTRICTS = [...MAIN_CITY_DISTRICTS, ...MORE_DISTRICTS] as const;
export type SearchArea = 'CHONGQING' | 'MAIN_CITY' | (typeof SEARCH_DISTRICTS)[number];
export const areaLabel = (area: SearchArea) =>
  area === 'CHONGQING' ? '全重庆' : area === 'MAIN_CITY' ? '主城九区' : area;
export const isTraditionalArea = (area: SearchArea) =>
  area === 'MAIN_CITY' || MAIN_CITY_DISTRICTS.some((d) => d === area);
export function matchesArea(
  spot: { district?: string; traditionalDistrict?: string },
  area?: SearchArea,
) {
  if (!area || area === 'CHONGQING') return true;
  if (area === 'MAIN_CITY') return MAIN_CITY_DISTRICTS.some((d) => d === spot.traditionalDistrict);
  return isTraditionalArea(area) ? spot.traditionalDistrict === area : spot.district === area;
}
