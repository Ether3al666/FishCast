import type { Forecast, PlanRequest, Recommendation, Spot } from '../domain/models';
import { safetyGate } from '../engines/safetyGate';
import { RULES } from '../config/scoring-rules';

export interface PlannerProvider {
  plan(input: PlanRequest, context: { spots: Spot[]; forecast: Forecast | null }): Recommendation[];
}
export class RuleBasedPlanner implements PlannerProvider {
  plan(input: PlanRequest, context: { spots: Spot[]; forecast: Forecast | null }) {
    return context.spots.map((spot) => {
      const gate = safetyGate(spot, context.forecast, input.startAt, input.endAt);
      return {
        spotId: spot.id,
        eligible: false,
        score: null,
        confidence: 'LOW' as const,
        reasons: [...gate.reasons, 'P0 尚未启用评分与距离、鱼种匹配'],
        warnings: gate.warnings,
        unavailableFactors: ['天气适宜性', '鱼种证据', '钓法适配', '季节时段', '距离'],
        scoreBreakdown: { weather: null, species: null, method: null, time: null, distance: null },
        dataSources: spot.evidence.map((e) => e.url),
        weatherUpdatedAt: context.forecast?.fetchedAt ?? null,
        modelVersion: RULES.version,
      };
    });
  }
}
