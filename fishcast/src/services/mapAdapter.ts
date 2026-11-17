import gcoord from 'gcoord';
import type { GeoLocation, Spot } from '../domain/models';
import { locationSchema } from '../domain/models';
import type { MapPoint, MapPosition } from '../domain/map';
import { demoMapPositions } from '../data/demo-map-positions';

export const chongqingReference: GeoLocation = { lat: 29.56, lon: 106.55, crs: 'WGS84' };

export function toMapPosition(location: GeoLocation): MapPosition {
  const valid = locationSchema.parse(location);
  const converted = gcoord.transform([valid.lon, valid.lat], gcoord.WGS84, gcoord.GCJ02);
  return [converted[0], converted[1]];
}
export const chongqingMapCenter = toMapPosition(chongqingReference);
export function buildMapPoints(spots: Spot[], demo: boolean): MapPoint[] {
  return spots.flatMap<MapPoint>((spot) => {
    if (spot.isDemo) {
      const position = demoMapPositions[spot.id];
      return demo && position
        ? [
            {
              spotId: spot.id,
              name: spot.name,
              legalStatus: spot.legalStatus,
              position: [...position] as MapPosition,
              isDemo: true,
            },
          ]
        : [];
    }
    if (demo || !spot.evidence.length || !locationSchema.safeParse(spot.location).success)
      return [];
    return [
      {
        spotId: spot.id,
        name: spot.name,
        legalStatus: spot.legalStatus,
        position: toMapPosition(spot.location!),
        isDemo: false,
      },
    ];
  });
}
export function mapStatusLabel(status: Spot['legalStatus']): string {
  return {
    UNKNOWN: '资料收录',
    PROHIBITED: '禁止垂钓',
    CONDITIONAL: '附加条件',
    VERIFIED_OPEN: '许可记录已核实，仍需复核',
  }[status];
}
