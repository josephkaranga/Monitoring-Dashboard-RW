// Map overlay types and configurations

import type { GBIFOccurrence, ClusteredPoint } from './biodiversity';

export type MapOverlay = 'gbif' | 'protected-areas' | 'rivers' | 'lakes';

export interface OverlayConfig {
  id: MapOverlay;
  label: string;
  enabled: boolean;
  loading: boolean;
  error: string | null;
}

export interface ProtectedArea {
  type: 'Feature';
  properties: {
    name: string;
    type: string;
    designationType?: string;
    iucn_category?: string;
    area?: number;
    area_km2?: number;
    district?: string;
    managing_authority?: string;
    description?: string;
    established?: number | string;
    key_species?: string[];
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface ProtectedAreasCollection {
  type: 'FeatureCollection';
  features: ProtectedArea[];
}

export interface RiverFeature {
  type: 'Feature';
  properties: {
    name: string;
    type?: string;
    length?: number;
    length_km?: number;
    basin?: string;
    description?: string;
  };
  geometry: {
    type: 'LineString' | 'MultiLineString';
    coordinates: number[][] | number[][][];
  };
}

export interface RiverNetworkCollection {
  type: 'FeatureCollection';
  features: RiverFeature[];
}

export interface LakeFeature {
  type: 'Feature';
  properties: {
    name: string;
    area_km2?: number;
    max_depth_m?: number;
    elevation_m?: number;
    district?: string;
    catchment?: string;
    ecological_significance?: string;
    related_indicators?: number[];
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface LakesCollection {
  type: 'FeatureCollection';
  features: LakeFeature[];
}

export interface OccurrenceOverlayData {
  occurrences: GBIFOccurrence[];
  clustered: ClusteredPoint[];
  totalCount: number;
  isClustered: boolean;
}

export interface OverlayState {
  gbif: OverlayConfig & { data: OccurrenceOverlayData | null };
  protectedAreas: OverlayConfig & { data: ProtectedAreasCollection | null };
  rivers: OverlayConfig & { data: RiverNetworkCollection | null };
}

// Kingdom color mapping for GBIF occurrences
export const kingdomColors: Record<string, string> = {
  'Plantae': '#10b981',      // green
  'Animalia': '#3b82f6',     // blue
  'Fungi': '#f59e0b',        // orange
  'Chromista': '#8b5cf6',    // purple
  'Bacteria': '#ef4444',     // red
  'Archaea': '#ec4899',      // pink
  'Protozoa': '#14b8a6',     // teal
  'Viruses': '#6b7280',      // gray
  'default': '#9ca3af',      // light gray
};

export const getKingdomColor = (kingdom: string): string => {
  return kingdomColors[kingdom] || kingdomColors.default;
};
