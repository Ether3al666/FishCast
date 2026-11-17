import { expect, it } from 'vitest';
import { realSpots } from '../src/data/spots';
import { buildMapPoints, toMapPosition } from '../src/services/mapAdapter';
import { OUTER_DISTRICTS, matchesArea } from '../src/config/regions';
import spotPhotos from '../src/data/spot-photos.json';

it('真实地点来源、发布时间、查询时间完整且 ID 唯一', () => {
  expect(new Set(realSpots.map((s) => s.id)).size).toBe(realSpots.length);
  for (const spot of realSpots) {
    expect(spot.address).toBeTruthy();
    expect(spot.locationNote).toBeTruthy();
    for (const evidence of spot.evidence) {
      expect(evidence.url).toMatch(/^https:\/\/(?!example\.)/);
      expect(evidence.scope).toBeTruthy();
      if (evidence.publishedAt)
        expect(Date.parse(evidence.publishedAt)).toBeLessThanOrEqual(
          Date.parse(evidence.retrievedAt),
        );
      else expect(evidence.scope).toContain('没有公开发布日期');
    }
  }
});
it('参考位置保留原始坐标与来源，GCJ-02 往返转换不偏移', () => {
  expect(realSpots.length).toBeGreaterThanOrEqual(300);
  expect(buildMapPoints(realSpots, false)).toHaveLength(realSpots.length - 1);
  for (const spot of realSpots.filter((s) => s.location)) {
    expect(spot.locationEvidence?.poiId).toBeTruthy();
    expect(spot.locationEvidence?.url).toContain(spot.locationEvidence!.poiId);
    const displayed = toMapPosition(spot.location!);
    expect(displayed[0]).toBeCloseTo(spot.locationEvidence!.original.lon, 5);
    expect(displayed[1]).toBeCloseTo(spot.locationEvidence!.original.lat, 5);
  }
});
it('九区归属有来源，现行区名与传统范围分开，未核实许可保持 UNKNOWN', () => {
  const main = realSpots.filter((s) => s.traditionalDistrict);
  expect(main).toHaveLength(100);
  expect(new Set(main.map((s) => s.traditionalDistrict)).size).toBe(8);
  for (const spot of main) {
    expect(spot.districtEvidence?.url).toContain(spot.locationEvidence!.poiId);
    expect(spot.districtEvidence?.retrievedAt).toBeTruthy();
    expect(spot.legalStatus).toBe('UNKNOWN');
    if (spot.district === '两江新区' || spot.district === '北碚区')
      expect(spot.districtEvidence?.township).toBeTruthy();
  }
  expect(realSpots.find((s) => s.name === '林秀湖畔路亚基地')).toMatchObject({
    district: '两江新区',
    traditionalDistrict: '江北区',
  });
  expect(realSpots.find((s) => s.name === '蔡家路亚基地')).toMatchObject({
    district: '两江新区',
    traditionalDistrict: '北碚区',
  });
  expect(realSpots.filter((s) => s.traditionalDistrict === '渝中区')).toHaveLength(0);
  expect(
    new Set(realSpots.filter((s) => s.locationEvidence).map((s) => s.locationEvidence!.poiId)).size,
  ).toBe(realSpots.length - 1);
});
it('全重庆覆盖外围 29 区县，场所与照片均有独立来源', () => {
  for (const district of OUTER_DISTRICTS) {
    const places = realSpots.filter((spot) => matchesArea(spot, district));
    expect(places.length, district).toBeGreaterThan(0);
    for (const spot of places) {
      expect(spot.legalStatus).toBe('UNKNOWN');
      expect(spot.isDemo).toBe(false);
      expect(spot.verifiedAt).toBeUndefined();
      if (spot.location) expect(spot.districtEvidence?.retrievedAt).toBeTruthy();
    }
  }
  for (const [id, photo] of Object.entries(spotPhotos)) {
    const spot = realSpots.find((item) => item.id === id);
    expect(spot, id).toBeDefined();
    expect(photo.sourceUrl).toBe(spot!.locationEvidence?.url);
    expect(photo.url).toMatch(/^https:\/\/(aos-comment\.amap\.com|store\.is\.autonavi\.com)\//);
  }
});
it('未定位的东风村基地仅列出，不能使用村委会冒充钓位', () => {
  const spot = realSpots.find((s) => s.id === 'cq-dongfeng')!;
  expect(spot.location).toBeNull();
  expect(buildMapPoints([spot], false)).toEqual([]);
});
