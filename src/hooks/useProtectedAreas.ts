// Custom hook for loading and managing protected areas data

import { useState, useEffect } from 'react';
import type { ProtectedAreasCollection } from '../types/overlays';

interface UseProtectedAreasReturn {
  areas: ProtectedAreasCollection | null;
  loading: boolean;
  error: string | null;
}

interface UseProtectedAreasOptions {
  enabled?: boolean; // Lazy loading control
}

/**
 * Hook for loading protected areas GeoJSON data from local file
 * Handles loading state, error handling, and validation
 * Supports lazy loading - only loads when enabled=true
 */
export function useProtectedAreas(options: UseProtectedAreasOptions = {}): UseProtectedAreasReturn {
  const { enabled = true } = options;
  const [areas, setAreas] = useState<ProtectedAreasCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip loading if not enabled (lazy loading)
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Skip if already loaded
    if (areas !== null) {
      return;
    }

    const loadProtectedAreas = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/rwanda-protected-areas.geojson');
        
        if (!response.ok) {
          throw new Error(`Failed to load protected areas: ${response.statusText}`);
        }

        const data = await response.json();

        // Validate GeoJSON structure
        if (!data.type || data.type !== 'FeatureCollection') {
          throw new Error('Invalid GeoJSON: Expected FeatureCollection');
        }

        if (!Array.isArray(data.features)) {
          throw new Error('Invalid GeoJSON: Missing features array');
        }

        // Check if file is empty (placeholder)
        if (data.features.length === 0) {
          console.warn('Protected areas GeoJSON is empty. Using placeholder.');
          setAreas(null);
        } else {
          setAreas(data as ProtectedAreasCollection);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading protected areas:', err);
        setError(err instanceof Error ? err.message : 'Failed to load protected areas');
        setLoading(false);
      }
    };

    loadProtectedAreas();
  }, [enabled, areas]);

  return { areas, loading, error };
}

/**
 * Hook for getting protected area coverage percentage by district
 * This is a placeholder - actual implementation would require spatial analysis
 */
export function useProtectedAreaCoverage(
  districtId: number,
  areas: ProtectedAreasCollection | null
): number {
  // Placeholder implementation
  // In production, this would calculate the actual overlap between
  // district boundaries and protected areas using geospatial libraries
  
  if (!areas || areas.features.length === 0) return 0;
  
  // Mock data for demonstration
  const mockCoverage: Record<number, number> = {
    1: 15.5,
    2: 8.2,
    3: 22.7,
    4: 5.1,
    5: 31.4,
  };
  
  return mockCoverage[districtId] || 0;
}
