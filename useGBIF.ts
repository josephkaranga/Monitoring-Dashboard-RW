// ============================================================
// GBIF API Hook — Rwanda Biodiversity Data
// Source: https://api.gbif.org/v1
// Country code: RW (Rwanda)
// No API key required — GBIF is fully open access
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const GBIF_BASE = 'https://api.gbif.org/v1';
const COUNTRY = 'RW';

// ── Types ─────────────────────────────────────────────────────

export interface GBIFStats {
  totalOccurrences: number;
  totalSpecies: number;
  mammals: number;
  birds: number;
  reptiles: number;
  amphibians: number;
  plants: number;
  fish: number;
  insects: number;
  fungi: number;
  recentOccurrences: GBIFOccurrence[];
  topFamilies: { family: string; count: number }[];
  yearlyTrend: { year: number; count: number }[];
  lastUpdated: string;
}

export interface GBIFOccurrence {
  key: number;
  scientificName: string;
  vernacularName?: string;
  kingdom: string;
  family?: string;
  year?: number;
  month?: number;
  decimalLatitude?: number;
  decimalLongitude?: number;
  stateProvince?: string;
  basisOfRecord: string;
  datasetName?: string;
  mediaUrl?: string;
}

// ── Fetch helpers ─────────────────────────────────────────────

async function fetchGBIF<T>(path: string): Promise<T> {
  const res = await fetch(`${GBIF_BASE}${path}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`GBIF API error: ${res.status}`);
  return res.json();
}

// ── Main hook ─────────────────────────────────────────────────

export function useGBIFStats() {
  const [stats, setStats] = useState<GBIFStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all in parallel for speed
      const [
        occurrenceTotal,
        mammals,
        birds,
        reptiles,
        amphibians,
        plants,
        fish,
        insects,
        fungi,
        recentRaw,
        trend2020,
        trend2021,
        trend2022,
        trend2023,
        trend2024,
      ] = await Promise.all([
        // Total occurrences in Rwanda
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&limit=0`),
        // By class
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&class=Mammalia&limit=0`),
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&class=Aves&limit=0`),
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&class=Reptilia&limit=0`),
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&class=Amphibia&limit=0`),
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&kingdom=Plantae&limit=0`),
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&class=Actinopterygii&limit=0`),
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&class=Insecta&limit=0`),
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&kingdom=Fungi&limit=0`),
        // Recent occurrences with media
        fetchGBIF<{ results: GBIFOccurrence[] }>(`/occurrence/search?country=${COUNTRY}&limit=8&hasCoordinate=true&hasGeospatialIssue=false&mediaType=StillImage`),
        // Yearly trend
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&year=2020&limit=0`),
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&year=2021&limit=0`),
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&year=2022&limit=0`),
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&year=2023&limit=0`),
        fetchGBIF<{ count: number }>(`/occurrence/search?country=${COUNTRY}&year=2024&limit=0`),
      ]);

      // Species count (unique species in Rwanda)
      const speciesRes = await fetchGBIF<{ count: number }>(
        `/occurrence/search?country=${COUNTRY}&limit=0&facet=speciesKey&facetLimit=0`
      );

      setStats({
        totalOccurrences: occurrenceTotal.count,
        totalSpecies: speciesRes.count,
        mammals: mammals.count,
        birds: birds.count,
        reptiles: reptiles.count,
        amphibians: amphibians.count,
        plants: plants.count,
        fish: fish.count,
        insects: insects.count,
        fungi: fungi.count,
        recentOccurrences: recentRaw.results.map(r => ({
          key: r.key,
          scientificName: r.scientificName,
          kingdom: r.kingdom,
          family: (r as any).family,
          year: r.year,
          month: r.month,
          decimalLatitude: r.decimalLatitude,
          decimalLongitude: r.decimalLongitude,
          stateProvince: r.stateProvince,
          basisOfRecord: r.basisOfRecord,
          mediaUrl: (r as any).media?.[0]?.identifier,
        })),
        topFamilies: [],
        yearlyTrend: [
          { year: 2020, count: trend2020.count },
          { year: 2021, count: trend2021.count },
          { year: 2022, count: trend2022.count },
          { year: 2023, count: trend2023.count },
          { year: 2024, count: trend2024.count },
        ],
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      console.error('GBIF fetch error:', err);
      setError('Failed to load GBIF data. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { stats, loading, error, refetch: fetchAll };
}

// ── Recent occurrences hook ───────────────────────────────────

export function useGBIFOccurrences(taxonClass?: string, limit = 10) {
  const [data, setData] = useState<GBIFOccurrence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const classParam = taxonClass ? `&class=${taxonClass}` : '';
    fetchGBIF<{ results: GBIFOccurrence[] }>(
      `/occurrence/search?country=${COUNTRY}&limit=${limit}&hasCoordinate=true${classParam}`
    )
      .then(res => setData(res.results))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [taxonClass, limit]);

  return { data, loading };
}
