// 手动真实 API 探针，与稳定离线单测分开。使用应用自己的适配器和校验器。
import { createServer } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { OpenMeteoProvider, parseForecast } = await server.ssrLoadModule(
    '/src/services/weatherProvider.ts',
  );
  const input = {
    lat: 29.56,
    lon: 106.55,
    crs: 'WGS84',
    timezone: 'Asia/Shanghai',
  };
  const filePath = process.argv[2];
  const forecast = filePath
    ? parseForecast(JSON.parse((await readFile(filePath, 'utf8')).replace(/^\uFEFF/, '')), input)
    : await new OpenMeteoProvider().getHourlyForecast(input);
  const summary = {
    source: forecast.source,
    fetchedAt: forecast.fetchedAt,
    timezone: forecast.timezone,
    hourlyCount: forecast.hours.length,
    firstTime: forecast.hours[0]?.time,
    lastTime: forecast.hours.at(-1)?.time,
    isDemo: forecast.isDemo,
    transport: filePath ? 'recorded real API response; parsing only' : 'Node direct API',
  };
  await mkdir('docs/evidence', { recursive: true });
  await writeFile('docs/evidence/live-weather-check.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await server.close();
}
