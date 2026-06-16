// Custom hook for loading and managing lakes data

import { useState, useEffect } from 'react';
import type { LakesCollection } from '../types/overlays';

interface UseLakesReturn {
  lakes: LakesCollection | null;
  loading: boolean;
  error: string | null;
}

interface UseLakesOptions {
  enabled?: boolean; // Lazy loading control
}

/**
 * Hook for loading major lakes GeoJSON data from local file
 * Handles loading state, error handling, and validation
 * Supports lazy loading - only loads when enabled=true
 */
export function useLakes(options: UseLakesOptions = {}): UseLakesReturn {
  const { enabled = true } = options;
  const [lakes, setLakes] = useState<LakesCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip loading if not enabled (lazy loading)
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Skip if already loaded
    if (lakes !== null) {
      return;
    }

    const loadLakes = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/rwanda-lakes.geojson');
        
        if (!response.ok) {
          throw new Error(`Failed to load lakes: ${response.statusText}`);
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
          console.warn('Lakes GeoJSON is empty. Using placeholder.');
          setLakes(null);
        } else {
          setLakes(data as LakesCollection);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading lakes:', err);
        setError(err instanceof Error ? err.message : 'Failed to load lakes');
        setLoading(false);
      }
    };

    loadLakes();
  }, [enabled, lakes]);

  return { lakes, loading, error };
}
