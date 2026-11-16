export type MapCredentials = { key: string; serviceHost?: string; securityJsCode?: string };
export type MapConfiguration =
  { ready: true; credentials: MapCredentials } | { ready: false; message: string };

export function resolveMapConfiguration(
  env: Record<string, string | undefined>,
  development: boolean,
): MapConfiguration {
  const key = env.VITE_AMAP_KEY?.trim();
  if (!key) return { ready: false, message: '地图尚未配置，可继续使用候选列表。' };
  const proxy = env.VITE_AMAP_SECURITY_PROXY?.trim();
  if (proxy) {
    try {
      const url = new URL(proxy);
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        !url.pathname.endsWith('/_AMapService')
      )
        throw new Error('invalid proxy');
      return { ready: true, credentials: { key, serviceHost: url.href.replace(/\/$/, '') } };
    } catch {
      return { ready: false, message: '地图安全代理配置无效，可继续使用列表。' };
    }
  }
  const code = env.VITE_AMAP_SECURITY_JS_CODE?.trim();
  if (development && code) return { ready: true, credentials: { key, securityJsCode: code } };
  return {
    ready: false,
    message: development
      ? '地图安全配置不完整，可继续使用列表。'
      : '公开版本需要配置地图安全代理；当前保留列表。',
  };
}
