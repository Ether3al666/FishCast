import type { AMapNamespace } from '../domain/map';
import type { MapCredentials } from '../config/map-config';

let pending: Promise<AMapNamespace> | null = null;
export function loadAMap(credentials: MapCredentials): Promise<AMapNamespace> {
  if (pending) return pending;
  pending = (async () => {
    const module = await import('@amap/amap-jsapi-loader');
    const loader = module.default as unknown as {
      load: (options: { key: string; version: string; plugins: string[] }) => Promise<unknown>;
      reset: () => void;
    };
    const securityWindow = window as Window & {
      _AMapSecurityConfig?: { serviceHost?: string; securityJsCode?: string };
    };
    securityWindow._AMapSecurityConfig = credentials.serviceHost
      ? { serviceHost: credentials.serviceHost }
      : { securityJsCode: credentials.securityJsCode };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        loader.load({ key: credentials.key, version: '2.0', plugins: [] }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), 15000);
        }),
      ]);
      const sdk = result as AMapNamespace | undefined;
      if (!sdk || typeof sdk.Map !== 'function' || typeof sdk.Marker !== 'function')
        throw new Error('invalid SDK');
      return sdk;
    } catch {
      // 不输出原始 SDK 错误或带凭据的 URL。
      loader.reset();
      pending = null;
      throw new Error(
        '地图加载失败，请检查网络、Web 端 Key、域名限制与可用额度。可继续使用列表，或手动重试。',
      );
    } finally {
      clearTimeout(timer);
    }
  })();
  return pending;
}
