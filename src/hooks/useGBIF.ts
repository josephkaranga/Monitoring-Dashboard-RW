// ============================================================
// GBIF API Hook — Rwanda Biodiversity Data
// Base URL: https://api.gbif.org/v1
// Country: RW (Rwanda) | No API key required
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const GBIF = 'https://api.gbif.org/v1';
const RW = 'RW';

export interface GBIFStats {
  totalOccurrences: number;
  mammals: number;
  birds: number;
  reptiles: number;
  amphibians: number;
  plants: number;
  fish: number;
  insects: number;
  fungi: number;
  yearlyTrend: { year: number; count: number }[];
  recentOccurrences: GBIFOccurrence[];
  lastUpdated: string;
}

export interface GBIFOccurrence {
  key: number;
  scientificName: string;
  kingdom: string;
  family?: string;
  year?: number;
  stateProvince?: string;
  basisOfRecord: string;
  mediaUrl?: string;
}

async function gbif<T>(path: string): Promise<T> {
  const r = await fetch(`${GBIF}${path}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`GBIF ${r.status}`);
  return r.json();
}

export function useGBIFStats() {
  const [stats, setStats] = useState<GBIFStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        total,
        mammals,
        birds,
        reptiles,
        amphibians,
        plants,
        fish,
        insects,
        fungi,
        y2020,
        y2021,
        y2022,
        y2023,
        y2024,
        recent,
      ] = await Promise.all([
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&class=Mammalia&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&class=Aves&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&class=Reptilia&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&class=Amphibia&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&kingdom=Plantae&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&class=Actinopterygii&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&class=Insecta&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&kingdom=Fungi&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&year=2020&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&year=2021&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&year=2022&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&year=2023&limit=0`),
        gbif<{ count: number }>(`/occurrence/search?country=${RW}&year=2024&limit=0`),
        gbif<{ results: any[] }>(
          `/occurrence/search?country=${RW}&limit=6&hasCoordinate=true&hasGeospatialIssue=false&mediaType=StillImage`
        ),
      ]);

      setStats({
        totalOccurrences: total.count,
        mammals: mammals.count,
        birds: birds.count,
        reptiles: reptiles.count,
        amphibians: amphibians.count,
        plants: plants.count,
        fish: fish.count,
        insects: insects.count,
        fungi: fungi.count,
        yearlyTrend: [
          { year: 2020, count: y2020.count },
          { year: 2021, count: y2021.count },
          { year: 2022, count: y2022.count },
          { year: 2023, count: y2023.count },
          { year: 2024, count: y2024.count },
        ],
        recentOccurrences: recent.results.map((r: any) => ({
          key: r.key,
          scientificName: r.scientificName,
          kingdom: r.kingdom,
          family: r.family,
          year: r.year,
          stateProvince: r.stateProvince,
          basisOfRecord: r.basisOfRecord,
          mediaUrl: r.media?.[0]?.identifier,
        })),
        lastUpdated: new Date().toISOString(),
      });
    } catch (e) {
      setError('GBIF data unavailable — check connection');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  return { stats, loading, error, refetch: load };
}
