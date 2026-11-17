import { z } from 'zod';
import { MAIN_CITY_DISTRICTS, type SearchArea } from '../config/regions';

export const locationSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
  crs: z.literal('WGS84'),
});
export const spotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  district: z.string(),
  traditionalDistrict: z.enum(MAIN_CITY_DISTRICTS).optional(),
  districtEvidence: z
    .object({
      source: z.string(),
      url: z.string().url(),
      retrievedAt: z.string().datetime(),
      township: z.string().optional(),
      scope: z.string(),
    })
    .optional(),
  address: z.string().optional(),
  location: locationSchema.nullable(),
  locationNote: z.string().optional(),
  locationEvidence: z
    .object({
      source: z.string(),
      url: z.string().url(),
      retrievedAt: z.string().datetime(),
      poiId: z.string(),
      poiName: z.string(),
      original: z.object({ lon: z.number(), lat: z.number(), crs: z.literal('GCJ02') }),
    })
    .optional(),
  waterType: z.enum(['POND', 'RESERVOIR', 'LAKE', 'RIVER', 'OTHER']),
  fishSpecies: z.array(z.string()),
  methods: z.array(z.enum(['TAIDIAO', 'LUYA', 'OTHER'])),
  methodHints: z.array(z.enum(['TAIDIAO', 'LUYA', 'OTHER'])).optional(),
  legalStatus: z.enum(['VERIFIED_OPEN', 'CONDITIONAL', 'PROHIBITED', 'UNKNOWN']),
  legalConditions: z.array(z.string()).default([]),
  evidence: z.array(
    z.object({
      url: z.string().url(),
      title: z.string(),
      retrievedAt: z.string().datetime(),
      publishedAt: z.string().optional(),
      scope: z.string().optional(),
    }),
  ),
  verifiedAt: z.string().datetime().optional(),
  appliesClosedSeason: z.boolean().default(false),
  isDemo: z.boolean(),
  notes: z.string(),
});
export type Spot = z.infer<typeof spotSchema>;
export type LegalStatus = Spot['legalStatus'];
export type GeoLocation = z.infer<typeof locationSchema>;
export type FishingMethod = Spot['methods'][number];
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type HourlyWeather = {
  time: string;
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pressure: number | null;
  code: number | null;
};
export type Forecast = {
  source: string;
  fetchedAt: string;
  timezone: 'Asia/Shanghai';
  location: GeoLocation;
  hours: HourlyWeather[];
  stale: boolean;
  isDemo: boolean;
};
export interface WeatherProvider {
  getHourlyForecast(
    input: GeoLocation & { timezone: 'Asia/Shanghai' },
    signal?: AbortSignal,
  ): Promise<Forecast>;
}
export type PlanRequest = {
  location: GeoLocation;
  targetSpecies: string;
  method: FishingMethod;
  startAt: string;
  endAt: string;
  radiusKm: number;
  searchArea?: SearchArea;
};
export type Recommendation = {
  spotId: string;
  eligible: boolean;
  score: number | null;
  confidence: Confidence;
  reasons: string[];
  warnings: string[];
  unavailableFactors: string[];
  scoreBreakdown: Record<string, number | null>;
  dataSources: string[];
  weatherUpdatedAt: string | null;
  modelVersion: string;
};
