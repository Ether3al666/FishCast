import { describe, expect, it } from 'vitest';
import { resolveMapConfiguration } from '../src/config/map-config';
import { buildMapPoints, chongqingMapCenter, toMapPosition } from '../src/services/mapAdapter';
import { demoSpots } from '../src/data/demo-fixtures';
import { realSpots } from '../src/data/spots';
import type { Spot } from '../src/domain/models';

describe('地图配置边界', () => {
  it('未配置 Key 保留列表', () => expect(resolveMapConfiguration({}, true).ready).toBe(false));
  it('开发环境允许用户授权的直接调试配置', () =>
    expect(
      resolveMapConfiguration(
        { VITE_AMAP_KEY: 'test-key', VITE_AMAP_SECURITY_JS_CODE: 'test-code' },
        true,
      ),
    ).toMatchObject({ ready: true }));
  it('生产环境不能使用开发安全码', () =>
    expect(
      resolveMapConfiguration(
        { VITE_AMAP_KEY: 'test-key', VITE_AMAP_SECURITY_JS_CODE: 'test-code' },
        false,
      ).ready,
    ).toBe(false));
  it('生产环境接受 HTTPS 安全代理', () =>
    expect(
      resolveMapConfiguration(
        {
          VITE_AMAP_KEY: 'test-key',
          VITE_AMAP_SECURITY_PROXY: 'https://maps.example.org/_AMapService',
        },
        false,
      ),
    ).toEqual({
      ready: true,
      credentials: { key: 'test-key', serviceHost: 'https://maps.example.org/_AMapService' },
    }));
  it.each([
    'http://maps.example.org/_AMapService',
    'https://maps.example.org/wrong',
    'https://maps.example.org/_AMapService?jscode=not-allowed',
    'https://user:password@maps.example.org/_AMapService',
  ])('拒绝无效代理 %s', (proxy) =>
    expect(
      resolveMapConfiguration({ VITE_AMAP_KEY: 'test-key', VITE_AMAP_SECURITY_PROXY: proxy }, false)
        .ready,
    ).toBe(false),
  );
});

describe('地图坐标与数据隔离', () => {
  it('WGS84 本地转 GCJ-02，保留原始 GIS 数据', () => {
    const source = { lat: 39.908823, lon: 116.39747, crs: 'WGS84' as const };
    const result = toMapPosition(source);
    expect(result[0]).toBeCloseTo(116.403714, 5);
    expect(result[1]).toBeCloseTo(39.910226, 5);
    expect(source.lon).toBe(116.39747);
  });
  it('重庆默认中心在重庆主城范围', () => {
    expect(chongqingMapCenter[0]).toBeGreaterThan(106.5);
    expect(chongqingMapCenter[0]).toBeLessThan(106.6);
    expect(chongqingMapCenter[1]).toBeGreaterThan(29.5);
    expect(chongqingMapCenter[1]).toBeLessThan(29.6);
  });
  it('拒绝无效输入而不是投到错误地点', () =>
    expect(() => toMapPosition({ lat: 190, lon: 106, crs: 'WGS84' })).toThrow());
  it('示例位置只在示例模式存在，Spot 的位置保持未知', () => {
    expect(buildMapPoints(demoSpots, false)).toEqual([]);
    const points = buildMapPoints(demoSpots, true);
    expect(points).toHaveLength(2);
    expect(points.every((point) => point.isDemo)).toBe(true);
    expect(demoSpots.every((spot) => spot.location === null)).toBe(true);
    expect(realSpots).toEqual([]);
  });
  it('未知与禁钓可以展示，但坐标缺失、无来源和未定义 demo 不投点', () => {
    const testSpot: Spot = {
      ...demoSpots[0],
      id: 'test-only',
      isDemo: false,
      location: { lat: 29.56, lon: 106.55, crs: 'WGS84' },
      evidence: [
        {
          url: 'https://example.org/test-only',
          title: 'TEST ONLY',
          retrievedAt: '2026-11-16T00:00:00Z',
        },
      ],
    };
    const points = buildMapPoints(
      [testSpot, { ...testSpot, id: 'test-prohibited', legalStatus: 'PROHIBITED' }],
      false,
    );
    expect(points).toHaveLength(2);
    expect(points[1].legalStatus).toBe('PROHIBITED');
    expect(
      buildMapPoints(
        [
          { ...testSpot, evidence: [] },
          { ...testSpot, location: null },
        ],
        false,
      ),
    ).toEqual([]);
    expect(buildMapPoints([{ ...demoSpots[0], id: 'unknown-demo' }], true)).toEqual([]);
    expect(buildMapPoints([testSpot], true)).toEqual([]);
  });
});
