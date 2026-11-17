import type { Forecast, PlanRequest, Recommendation, Spot } from '../domain/models';
import { safetyGate } from '../engines/safetyGate';
import { RULES } from '../config/scoring-rules';
import { demandIssues, distanceKm } from './candidatePlanner';
import { locationSchema } from '../domain/models';
import { matchesArea } from '../config/regions';

export interface PlannerProvider {
  plan(input: PlanRequest, context: { spots: Spot[]; forecast: Forecast | null }): Recommendation[];
}
export class RuleBasedPlanner implements PlannerProvider {
  plan(input: PlanRequest, context: { spots: Spot[]; forecast: Forecast | null }) {
    return context.spots.map((spot) => {
      const gate = safetyGate(spot, context.forecast, input.startAt, input.endAt);
      const reasons = [...gate.reasons, ...demandIssues(spot, input)];
      if (!matchesArea(spot, input.searchArea)) reasons.push('不在所选区域内');
      if (
        !input.searchArea &&
        locationSchema.safeParse(spot.location).success &&
        distanceKm(input.location, spot.location!) > input.radiusKm
      )
        reasons.push('超出搜索半径');
      return {
        spotId: spot.id,
        eligible: gate.eligible && reasons.length === 0,
        score: null,
        confidence: 'LOW' as const,
        reasons,
        warnings: gate.warnings,
        unavailableFactors: ['适钓评分与鱼获概率', ...demandIssues(spot, input)],
        scoreBreakdown: { weather: null, species: null, method: null, time: null, distance: null },
        dataSources: spot.evidence.map((e) => e.url),
        weatherUpdatedAt: context.forecast?.fetchedAt ?? null,
        modelVersion: RULES.version,
      };
    });
  }
}
