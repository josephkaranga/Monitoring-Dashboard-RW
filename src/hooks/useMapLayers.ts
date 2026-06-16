// Custom hook for managing map layer state and data

import { useState, useCallback, useMemo } from 'react';
import type { MapLayer, LayerConfig } from '../types/mapLayers';
import type { District } from '../types/index';
import {
  biodiversityColorScale,
  threatLevelColorScale,
  nbsapProgressColorScale
} from '../types/mapLayers';

interface UseMapLayersProps {
  districts: District[];
  biodiversityData: Map<number, any>;
  threatData: Map<number, any>;
  nbsapData: Map<number, any>;
}

interface UseMapLayersReturn {
  activeLayer: MapLayer;
  setActiveLayer: (layer: MapLayer) => void;
  layerConfigs: LayerConfig[];
  getDistrictColor: (districtId: number) => string;
  getDistrictValue: (districtId: number) => number | null;
  getDistrictLabel: (districtId: number) => string;
}

/**
 * Hook for managing map layer state and providing layer-specific data
 */
export function useMapLayers({
  districts,
  biodiversityData,
  threatData,
  nbsapData
}: UseMapLayersProps): UseMapLayersReturn {
  const [activeLayer, setActiveLayer] = useState<MapLayer>('biodiversity');

  // Define all layer configurations
  const layerConfigs: LayerConfig[] = useMemo(() => [
    {
      id: 'biodiversity',
      label: 'Biodiversity Index',
      colorScale: biodiversityColorScale,
      valueFormatter: (v) => `${v}/100`,
      dataSource: async () => biodiversityData,
      legendStops: [
        { value: 0, color: '#f0fdf4', label: '0-20' },
        { value: 40, color: '#86efac', label: '40-60' },
        { value: 80, color: '#16a34a', label: '80-100' }
      ]
    },
    {
      id: 'species-richness',
      label: 'Species Richness',
      colorScale: biodiversityColorScale,
      valueFormatter: (v) => `${v} species`,
      dataSource: async () => biodiversityData,
      legendStops: [
        { value: 0, color: '#f0fdf4', label: '0-10' },
        { value: 20, color: '#86efac', label: '20-40' },
        { value: 50, color: '#16a34a', label: '50+' }
      ]
    },
    {
      id: 'threat-level',
      label: 'Threat Level',
      colorScale: threatLevelColorScale,
      valueFormatter: (v) => v >= 60 ? 'High' : v >= 30 ? 'Medium' : 'Low',
      dataSource: async () => threatData,
      legendStops: [
        { value: 0, color: '#10b981', label: 'Low' },
        { value: 30, color: '#f59e0b', label: 'Medium' },
        { value: 60, color: '#ef4444', label: 'High' }
      ]
    },
    {
      id: 'nbsap-progress',
      label: 'NBSAP Progress',
      colorScale: nbsapProgressColorScale,
      valueFormatter: (v) => `${v}%`,
      dataSource: async () => nbsapData,
      legendStops: [
        { value: 0, color: '#fee2e2', label: '0-25%' },
        { value: 50, color: '#fef3c7', label: '50%' },
        { value: 90, color: '#86efac', label: '90-100%' }
      ]
    }
  ], [biodiversityData, threatData, nbsapData]);

  // Get active layer config
  const activeConfig = useMemo(() => {
    return layerConfigs.find(l => l.id === activeLayer) || layerConfigs[0];
  }, [activeLayer, layerConfigs]);

  // Get color for a district based on active layer
  const getDistrictColor = useCallback((districtId: number): string => {
    const value = getDistrictValue(districtId);
    if (value === null) return '#e2e8f0'; // neutral color for no data
    
    return activeConfig.colorScale(value);
  }, [activeLayer, activeConfig, biodiversityData, threatData, nbsapData]);

  // Get value for a district based on active layer
  const getDistrictValue = useCallback((districtId: number): number | null => {
    let dataMap: Map<number, any>;
    let valueKey: string;

    switch (activeLayer) {
      case 'biodiversity':
        dataMap = biodiversityData;
        valueKey = 'biodiversityIndex';
        break;
      case 'species-richness':
        dataMap = biodiversityData;
        valueKey = 'speciesRichness';
        break;
      case 'threat-level':
        dataMap = threatData;
        valueKey = 'threatScore';
        break;
      case 'nbsap-progress':
        dataMap = nbsapData;
        valueKey = 'progress';
        break;
      default:
        return null;
    }

    const data = dataMap.get(districtId);
    return data?.[valueKey] ?? null;
  }, [activeLayer, biodiversityData, threatData, nbsapData]);

  // Get formatted label for a district based on active layer
  const getDistrictLabel = useCallback((districtId: number): string => {
    const value = getDistrictValue(districtId);
    if (value === null) return 'No data';
    
    return activeConfig.valueFormatter(value);
  }, [activeLayer, activeConfig, getDistrictValue]);

  return {
    activeLayer,
    setActiveLayer,
    layerConfigs,
    getDistrictColor,
    getDistrictValue,
    getDistrictLabel
  };
}
