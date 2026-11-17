// Keep transport failures distinct from malformed forecasts; do not expose request URLs or locations.
export function weatherErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError')
      return '天气连接超时（30 秒）。请检查网络或代理后重试。';
    const http = error.message.match(/^天气服务返回 HTTP (\d{3})$/);
    if (http)
      return http[1] === '429'
        ? '天气接口请求过于频繁（HTTP 429），请稍后重试。'
        : `天气服务暂时无法响应（HTTP ${http[1]}），请稍后重试。`;
    if (error instanceof TypeError)
      return /AbortSignal|AbortController|is not a function/.test(error.message)
        ? '当前浏览器的请求中止接口不兼容，请换用最新版浏览器。'
        : '无法连接天气接口。请检查当前浏览器的网络或代理，然后重试。';
    if (
      error.name === 'ZodError' ||
      error instanceof SyntaxError ||
      /^天气 API/.test(error.message)
    )
      return '天气接口返回的数据不完整或格式异常，请稍后重试。';
  }
  return '天气请求未完成，请稍后重试。';
}
