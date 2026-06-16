// Enhanced GBIF hook with auto-refresh and occurrence data for mapping

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GBIFOccurrence } from '../types/biodiversity';

const GBIF_API = 'https://api.gbif.org/v1';
const RWANDA_CODE = 'RW';
const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

interface UseGBIFOccurrencesProps {
  country?: string;
  limit?: number;
  autoRefresh?: boolean;
}

interface UseGBIFOccurrencesReturn {
  occurrences: GBIFOccurrence[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  totalCount: number;
  refresh: () => Promise<void>;
}

/**
 * Enhanced hook for fetching GBIF occurrence data with coordinates
 * Includes auto-refresh, retry logic, and caching
 */
export function useGBIFOccurrences({
  country = RWANDA_CODE,
  limit = 5000,
  autoRefresh = true
}: UseGBIFOccurrencesProps = {}): UseGBIFOccurrencesReturn {
  const [occurrences, setOccurrences] = useState<GBIFOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  /**
   * Fetch occurrences from GBIF API with retry logic
   * Enhanced logging for Task 14.7
   */
  const fetchOccurrences = useCallback(async (isRetry = false, isManual = false) => {
    const timestamp = new Date().toISOString();
    
    try {
      if (!isRetry) {
        setLoading(true);
        setError(null);
        
        // Log refresh trigger (Task 14.7)
        if (isManual) {
          console.log(`[GBIF] ${timestamp} - Manual refresh triggered by user`);
        } else {
          console.log(`[GBIF] ${timestamp} - Fetch initiated`);
        }
      }

      // Fetch occurrences with coordinates
      const url = `${GBIF_API}/occurrence/search?country=${country}&limit=${limit}&hasCoordinate=true&hasGeospatialIssue=false`;
      
      console.log(`[GBIF] ${timestamp} - Fetching occurrences from ${url}`);
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`GBIF API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Transform GBIF response to our format
      const transformedOccurrences: GBIFOccurrence[] = data.results.map((result: any) => ({
        key: result.key,
        scientificName: result.scientificName || 'Unknown',
        kingdom: result.kingdom || 'Unknown',
        family: result.family,
        decimalLatitude: result.decimalLatitude,
        decimalLongitude: result.decimalLongitude,
        year: result.year,
        basisOfRecord: result.basisOfRecord || 'Unknown'
      }));

      const completionTimestamp = new Date().toISOString();
      setOccurrences(transformedOccurrences);
      setTotalCount(data.count || transformedOccurrences.length);
      setLastUpdated(new Date());
      setLoading(false);
      retryCountRef.current = 0; // Reset retry count on success

      // Log successful completion (Task 14.7)
      console.log(`[GBIF] ${completionTimestamp} - Refresh completed successfully: ${transformedOccurrences.length} occurrences fetched (total available: ${data.count || transformedOccurrences.length})`);
    } catch (err) {
      const errorTimestamp = new Date().toISOString();
      console.error(`[GBIF] ${errorTimestamp} - Error fetching occurrences:`, err);
      
      // Retry logic with exponential backoff
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        const delay = RETRY_DELAY_BASE * Math.pow(2, retryCountRef.current - 1);
        
        console.log(`[GBIF] ${errorTimestamp} - Retrying in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
        
        setTimeout(() => {
          fetchOccurrences(true, isManual);
        }, delay);
      } else {
        // Log final failure (Task 14.7)
        console.error(`[GBIF] ${errorTimestamp} - Refresh failed after ${MAX_RETRIES} attempts`);
        setError(err instanceof Error ? err.message : 'Failed to fetch GBIF data');
        setLoading(false);
        retryCountRef.current = 0;
      }
    }
  }, [country, limit]);

  /**
   * Manual refresh function
   * Enhanced logging for Task 14.7
   */
  const refresh = useCallback(async () => {
    await fetchOccurrences(false, true); // Pass isManual=true
  }, [fetchOccurrences]);

  // Initial fetch
  useEffect(() => {
    fetchOccurrences();
  }, [fetchOccurrences]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalMinutes = AUTO_REFRESH_INTERVAL / 60000;
    console.log(`[GBIF] ${new Date().toISOString()} - Auto-refresh enabled (every ${intervalMinutes} minutes)`);

    refreshTimerRef.current = setInterval(() => {
      const timestamp = new Date().toISOString();
      console.log(`[GBIF] ${timestamp} - Auto-refresh triggered (${intervalMinutes}-minute interval)`);
      fetchOccurrences(false, false); // isManual=false for auto-refresh
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        console.log(`[GBIF] ${new Date().toISOString()} - Auto-refresh disabled`);
      }
    };
  }, [autoRefresh, fetchOccurrences]);

  return {
    occurrences,
    loading,
    error,
    lastUpdated,
    totalCount,
    refresh
  };
}

/**
 * Hook for filtering GBIF occurrences by kingdom
 */
export function useFilteredOccurrences(
  occurrences: GBIFOccurrence[],
  kingdom: string | null
): GBIFOccurrence[] {
  return kingdom 
    ? occurrences.filter(occ => occ.kingdom === kingdom)
    : occurrences;
}
