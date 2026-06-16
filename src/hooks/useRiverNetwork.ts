// Custom hook for loading and managing river network data

import { useState, useEffect } from 'react';
import type { RiverNetworkCollection } from '../types/overlays';

interface UseRiverNetworkReturn {
  rivers: RiverNetworkCollection | null;
  loading: boolean;
  error: string | null;
}

interface UseRiverNetworkOptions {
  enabled?: boolean; // Lazy loading control
}

/**
 * Hook for loading river network GeoJSON data from local file
 * Handles loading state, error handling, and validation
 * Supports lazy loading - only loads when enabled=true
 */
export function useRiverNetwork(options: UseRiverNetworkOptions = {}): UseRiverNetworkReturn {
  const { enabled = true } = options;
  const [rivers, setRivers] = useState<RiverNetworkCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip loading if not enabled (lazy loading)
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Skip if already loaded
    if (rivers !== null) {
      return;
    }

    const loadRiverNetwork = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/rwanda-rivers.geojson');
        
        if (!response.ok) {
          throw new Error(`Failed to load river network: ${response.statusText}`);
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
          console.warn('River network GeoJSON is empty. Using placeholder.');
          setRivers(null);
        } else {
          setRivers(data as RiverNetworkCollection);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading river network:', err);
        setError(err instanceof Error ? err.message : 'Failed to load river network');
        setLoading(false);
      }
    };

    loadRiverNetwork();
  }, [enabled, rivers]);

  return { rivers, loading, error };
}
