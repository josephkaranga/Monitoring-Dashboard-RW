// Map layer types and configurations

import type { District } from '../types/index';

export type MapLayer = 
  | 'biodiversity'
  | 'forest'
  | 'species-richness'
  | 'protected-areas'
  | 'wetlands'
  | 'threat-level'
  | 'nbsap-progress'
  | 'submission'
  | 'compliance';

export interface LayerConfig {
  id: MapLayer;
  label: string;
  colorScale: (value: number) => string;
  valueFormatter: (value: number) => string;
  dataSource: (districts: District[]) => Promise<Map<number, number>>;
  legendStops: Array<{ value: number; color: string; label: string }>;
}

export interface LayerData {
  districtId: number;
  value: number;
  label: string;
}

export type ColorScale = (value: number) => string;

// Color scale generators
export const createGradientScale = (
  minColor: string,
  maxColor: string
): ColorScale => {
  return (value: number) => {
    // Simple linear interpolation between two colors
    const normalized = Math.max(0, Math.min(1, value / 100));
    // This is a simplified version - in production, use a proper color interpolation library
    return normalized > 0.5 ? maxColor : minColor;
  };
};

export const createCategoricalScale = (
  categories: Array<{ threshold: number; color: string }>
): ColorScale => {
  return (value: number) => {
    for (let i = categories.length - 1; i >= 0; i--) {
      if (value >= categories[i].threshold) {
        return categories[i].color;
      }
    }
    return categories[0].color;
  };
};

// Predefined color scales
export const biodiversityColorScale: ColorScale = createCategoricalScale([
  { threshold: 0, color: '#f0fdf4' },   // very light green
  { threshold: 20, color: '#bbf7d0' },  // light green
  { threshold: 40, color: '#86efac' },  // medium light green
  { threshold: 60, color: '#4ade80' },  // medium green
  { threshold: 80, color: '#22c55e' },  // green
  { threshold: 90, color: '#16a34a' },  // dark green
]);

export const threatLevelColorScale: ColorScale = (value: number) => {
  if (value >= 60) return '#ef4444'; // red - high threat
  if (value >= 30) return '#f59e0b'; // yellow - medium threat
  return '#10b981'; // green - low threat
};

export const nbsapProgressColorScale: ColorScale = createCategoricalScale([
  { threshold: 0, color: '#fee2e2' },   // light red
  { threshold: 25, color: '#fed7aa' },  // light orange
  { threshold: 50, color: '#fef3c7' },  // light yellow
  { threshold: 75, color: '#d9f99d' },  // light green
  { threshold: 90, color: '#86efac' },  // green
]);
