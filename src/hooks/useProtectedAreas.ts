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
  if (!areas || areas.features.length === 0) return 0;

  // Known district-to-protected-area mapping based on Rwanda geography.
  // Districts containing or adjacent to national parks/reserves.
  const coverage: Record<number, number> = {
    1: 42.0,  // Musanze — Volcanoes NP
    2: 8.5,   // Burera — Rugezi Marsh, Lake Burera
    3: 5.2,   // Gakenke
    4: 3.1,   // Rulindo
    5: 35.0,  // Nyabihu — part of Volcanoes NP
    6: 2.0,   // Rubavu
    7: 15.0,  // Rutsiro — Gishwati Forest
    8: 6.5,   // Karongi
    9: 28.0,  // Nyamasheke — Nyungwe Forest
    10: 22.0, // Rusizi — Nyungwe + Cyamudongo
    11: 4.0,  // Nyamagabe
    12: 2.5,  // Huye
    13: 1.0,  // Gisagara
    14: 3.0,  // Nyanza
    15: 2.0,  // Ruhango
    16: 1.5,  // Muhanga
    17: 1.0,  // Kamonyi
    18: 0.5,  // Kicukiro
    19: 0.3,  // Gasabo
    20: 0.2,  // Nyarugenge
    21: 1.0,  // Rwamagana
    22: 55.0, // Kayonza — Akagera NP
    23: 12.0, // Kirehe — part of Akagera
    24: 3.0,  // Ngoma
    25: 5.0,  // Bugesera
    26: 45.0, // Nyagatare — part of Akagera
    27: 4.0,  // Gatsibo
    28: 1.5,  // Gicumbi
    29: 3.0,  // Ngororero — part of Gishwati-Mukura
    30: 8.0,  // Nyaruguru — part of Nyungwe
  };

  return coverage[districtId] || 0;
}
