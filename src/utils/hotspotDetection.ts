// Biodiversity hotspot detection algorithm

import type { BiodiversityData, BiodiversityHotspot } from '../types/biodiversity';

/**
 * Identify biodiversity hotspots based on biodiversity index and species richness
 * A district is a hotspot if it's in the top 20% for both metrics
 * 
 * @param biodiversityData - Biodiversity data for all districts
 * @param protectedAreaCoverage - Optional map of district ID to protected area coverage percentage
 * @returns Array of hotspot districts ranked by priority
 */
export function identifyHotspots(
  biodiversityData: BiodiversityData[],
  protectedAreaCoverage?: Map<number, number>
): BiodiversityHotspot[] {
  if (biodiversityData.length === 0) return [];
  
  // Calculate 80th percentile thresholds (top 20%)
  const sortedByIndex = [...biodiversityData]
    .sort((a, b) => b.biodiversityIndex - a.biodiversityIndex);
  const sortedByRichness = [...biodiversityData]
    .sort((a, b) => b.speciesRichness - a.speciesRichness);
  
  const indexThreshold = sortedByIndex[Math.floor(biodiversityData.length * 0.2)]
    ?.biodiversityIndex || 0;
  const richnessThreshold = sortedByRichness[Math.floor(biodiversityData.length * 0.2)]
    ?.speciesRichness || 0;
  
  // Identify hotspots
  const hotspots = biodiversityData
    .filter(d => 
      d.biodiversityIndex >= indexThreshold &&
      d.speciesRichness >= richnessThreshold
    )
    .map(d => {
      // Calculate priority score (0-100)
      const indexScore = (d.biodiversityIndex / 100) * 50;
      const richnessScore = Math.min(d.speciesRichness / 50, 1) * 30;
      const protectionScore = protectedAreaCoverage?.get(d.districtId) 
        ? (protectedAreaCoverage.get(d.districtId)! / 100) * 20
        : 0;
      
      return {
        districtId: d.districtId,
        districtName: d.districtName,
        biodiversityIndex: d.biodiversityIndex,
        speciesRichness: d.speciesRichness,
        protectedAreaCoverage: protectedAreaCoverage?.get(d.districtId) || 0,
        priority: Math.round(indexScore + richnessScore + protectionScore)
      };
    })
    .sort((a, b) => b.priority - a.priority);
  
  return hotspots;
}

/**
 * Check if a district qualifies as a biodiversity hotspot
 * 
 * @param districtData - Biodiversity data for the district
 * @param allData - Biodiversity data for all districts
 * @returns True if the district is a hotspot
 */
export function isHotspot(
  districtData: BiodiversityData,
  allData: BiodiversityData[]
): boolean {
  const hotspots = identifyHotspots(allData);
  return hotspots.some(h => h.districtId === districtData.districtId);
}

/**
 * Get hotspot rank for a district (1 = highest priority)
 * 
 * @param districtId - District ID
 * @param hotspots - Array of hotspots
 * @returns Rank (1-based) or null if not a hotspot
 */
export function getHotspotRank(
  districtId: number,
  hotspots: BiodiversityHotspot[]
): number | null {
  const index = hotspots.findIndex(h => h.districtId === districtId);
  return index >= 0 ? index + 1 : null;
}

/**
 * Calculate conservation priority score for a district
 * Higher score = higher priority for conservation efforts
 * 
 * @param biodiversityIndex - Biodiversity index (0-100)
 * @param speciesRichness - Number of unique species
 * @param threatLevel - Threat level score (0-100)
 * @param protectedAreaCoverage - Percentage of district under protection
 * @returns Priority score (0-100)
 */
export function calculateConservationPriority(
  biodiversityIndex: number,
  speciesRichness: number,
  threatLevel: number,
  protectedAreaCoverage: number
): number {
  // High biodiversity + high threat + low protection = high priority
  const biodiversityScore = (biodiversityIndex / 100) * 30;
  const richnessScore = Math.min(speciesRichness / 50, 1) * 20;
  const threatScore = (threatLevel / 100) * 30;
  const protectionGap = (1 - protectedAreaCoverage / 100) * 20;
  
  return Math.round(biodiversityScore + richnessScore + threatScore + protectionGap);
}
