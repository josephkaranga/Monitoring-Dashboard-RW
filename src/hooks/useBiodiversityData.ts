// Custom hook for managing biodiversity data and calculations

import { useState, useEffect, useMemo } from 'react';
import type { District } from '../types/index';
import type { BiodiversityData, GBIFOccurrence } from '../types/biodiversity';
import { calculateBiodiversityMetrics } from '../utils/biodiversityCalculations';

interface UseBiodiversityDataProps {
  districts: District[];
  occurrences: GBIFOccurrence[];
  loading: boolean;
}

interface UseBiodiversityDataReturn {
  data: Map<number, BiodiversityData>;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Hook for calculating and managing biodiversity data for all districts
 * Automatically recalculates when GBIF occurrences or districts change
 */
export function useBiodiversityData({
  districts,
  occurrences,
  loading: gbifLoading,
}: UseBiodiversityDataProps): UseBiodiversityDataReturn {
  const [data, setData] = useState<Map<number, BiodiversityData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (gbifLoading || districts.length === 0) {
      setLoading(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Calculate biodiversity metrics for all districts
      const biodivData = calculateBiodiversityMetrics(occurrences, districts);

      setData(biodivData);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate biodiversity data');
      setLoading(false);
    }
  }, [occurrences, districts, gbifLoading]);

  return { data, loading, error, lastUpdated };
}

/**
 * Hook for getting biodiversity data for a specific district
 */
export function useDistrictBiodiversity(
  districtId: number,
  biodiversityData: Map<number, BiodiversityData>
): BiodiversityData | null {
  return useMemo(() => {
    return biodiversityData.get(districtId) || null;
  }, [districtId, biodiversityData]);
}

/**
 * Hook for getting top N districts by biodiversity index
 */
export function useTopBiodiversityDistricts(
  biodiversityData: Map<number, BiodiversityData>,
  limit: number = 10
): BiodiversityData[] {
  return useMemo(() => {
    return Array.from(biodiversityData.values())
      .sort((a, b) => b.biodiversityIndex - a.biodiversityIndex)
      .slice(0, limit);
  }, [biodiversityData, limit]);
}
