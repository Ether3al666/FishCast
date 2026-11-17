import type { LegalStatus } from './models';
export type MapPosition = [number, number];
export type MapPoint = {
  spotId: string;
  name: string;
  legalStatus: LegalStatus;
  position: MapPosition;
  isDemo: boolean;
};
export interface AMapMarker {
  on(event: 'click', callback: () => void): void;
  off(event: 'click', callback: () => void): void;
}
export interface AMapInstance {
  add(markers: AMapMarker[]): void;
  remove(markers: AMapMarker[]): void;
  on(event: 'complete', callback: () => void): void;
  off(event: 'complete', callback: () => void): void;
  setZoomAndCenter(zoom: number, center: MapPosition): void;
  setFitView(
    markers?: AMapMarker[],
    immediately?: boolean,
    avoid?: number[],
    maxZoom?: number,
  ): void;
  resize(): void;
  destroy(): void;
}
export interface AMapNamespace {
  Map: new (
    container: HTMLElement,
    options: {
      center: MapPosition;
      zoom: number;
      viewMode: '2D';
      resizeEnable: boolean;
      animateEnable: boolean;
      jogEnable: boolean;
    },
  ) => AMapInstance;
  Marker: new (options: {
    position: MapPosition;
    content: HTMLElement;
    title: string;
    anchor: string;
  }) => AMapMarker;
}
