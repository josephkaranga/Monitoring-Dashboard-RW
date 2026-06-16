// Biodiversity calculation utilities

import type { GBIFOccurrence, BiodiversityData, SpeciesBreakdown } from '../types/biodiversity';
import type { District } from '../types/index';

/**
 * Calculate biodiversity index for a district based on GBIF occurrence data
 * Uses a weighted formula considering species count, kingdom diversity, and observation density
 * 
 * @param occurrences - GBIF occurrences within the district
 * @param districtArea - District area in square kilometers
 * @returns Biodiversity index (0-100)
 */
export function calculateBiodiversityIndex(
  occurrences: GBIFOccurrence[],
  districtArea: number
): number {
  if (occurrences.length === 0) return 0;
  
  // Count unique species
  const uniqueSpecies = new Set(occurrences.map(o => o.scientificName)).size;
  
  // Count kingdom diversity
  const kingdomDiversity = new Set(occurrences.map(o => o.kingdom)).size;
  
  // Calculate observation density (occurrences per sq km)
  const observationDensity = occurrences.length / Math.max(districtArea, 1);
  
  // Weighted formula (total = 100 points)
  // Species diversity: 40 points (normalized to max 100 species)
  const speciesScore = Math.min(uniqueSpecies / 100, 1) * 40;
  
  // Kingdom diversity: 30 points (max 8 kingdoms)
  const kingdomScore = (kingdomDiversity / 8) * 30;
  
  // Observation density: 30 points (normalized to max 10 per sq km)
  const densityScore = Math.min(observationDensity / 10, 1) * 30;
  
  return Math.round(speciesScore + kingdomScore + densityScore);
}

/**
 * Calculate species richness (count of unique species) for a district
 * 
 * @param occurrences - GBIF occurrences within the district
 * @returns Number of unique species
 */
export function calculateSpeciesRichness(occurrences: GBIFOccurrence[]): number {
  return new Set(occurrences.map(o => o.scientificName)).size;
}

/**
 * Calculate species breakdown by taxonomic kingdom
 * 
 * @param occurrences - GBIF occurrences
 * @returns Array of species counts by kingdom with percentages
 */
export function calculateSpeciesByKingdom(occurrences: GBIFOccurrence[]): SpeciesBreakdown[] {
  const kingdomCounts = new Map<string, Set<string>>();
  
  occurrences.forEach(occ => {
    if (!kingdomCounts.has(occ.kingdom)) {
      kingdomCounts.set(occ.kingdom, new Set());
    }
    kingdomCounts.get(occ.kingdom)!.add(occ.scientificName);
  });
  
  const totalSpecies = calculateSpeciesRichness(occurrences);
  
  return Array.from(kingdomCounts.entries())
    .map(([kingdom, species]) => ({
      kingdom,
      count: species.size,
      percentage: totalSpecies > 0 ? (species.size / totalSpecies) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate biodiversity data for all districts
 * 
 * @param occurrences - All GBIF occurrences for Rwanda
 * @param districts - District data with boundaries
 * @returns Map of district ID to biodiversity data
 */
export function calculateBiodiversityMetrics(
  occurrences: GBIFOccurrence[],
  districts: District[]
): Map<number, BiodiversityData> {
  const biodiversityMap = new Map<number, BiodiversityData>();
  
  districts.forEach(district => {
    // Filter occurrences within district boundaries
    // Note: This is a simplified version. In production, use proper point-in-polygon testing
    const districtOccurrences = occurrences.filter(occ => {
      // For now, we'll assign occurrences to nearest district
      // This should be replaced with actual geospatial queries
      return true; // Placeholder
    });
    
    const speciesByKingdom: { [kingdom: string]: number } = {};
    calculateSpeciesByKingdom(districtOccurrences).forEach(breakdown => {
      speciesByKingdom[breakdown.kingdom] = breakdown.count;
    });
    
    // Estimate district area (placeholder - should come from GeoJSON)
    const districtArea = 850; // Average Rwanda district area in sq km
    
    biodiversityMap.set(district.id, {
      districtId: district.id,
      districtName: district.name,
      province: district.province?.name || '',
      biodiversityIndex: calculateBiodiversityIndex(districtOccurrences, districtArea),
      speciesRichness: calculateSpeciesRichness(districtOccurrences),
      speciesByKingdom,
      occurrenceCount: districtOccurrences.length,
      lastUpdated: new Date()
    });
  });
  
  return biodiversityMap;
}

/**
 * Calculate total species count across all occurrences
 * 
 * @param occurrences - GBIF occurrences
 * @returns Total unique species count
 */
export function getTotalSpeciesCount(occurrences: GBIFOccurrence[]): number {
  return calculateSpeciesRichness(occurrences);
}

/**
 * Get occurrence count trend (comparing current to previous)
 * 
 * @param currentCount - Current occurrence count
 * @param previousCount - Previous occurrence count
 * @returns Trend direction and percentage change
 */
export function getOccurrenceTrend(
  currentCount: number,
  previousCount: number
): { direction: 'up' | 'down' | 'stable'; change: number } {
  if (previousCount === 0) {
    return { direction: 'stable', change: 0 };
  }
  
  const change = ((currentCount - previousCount) / previousCount) * 100;
  
  if (Math.abs(change) < 1) {
    return { direction: 'stable', change: 0 };
  }
  
  return {
    direction: change > 0 ? 'up' : 'down',
    change: Math.abs(change)
  };
}
