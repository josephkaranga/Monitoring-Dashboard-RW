// Point clustering for performance optimization with large datasets

import type { GBIFOccurrence, ClusteredPoint } from '../types/biodiversity';

/**
 * Cluster GBIF occurrences using grid-based clustering
 * Reduces the number of points to render while maintaining spatial distribution
 * 
 * @param occurrences - Array of GBIF occurrences
 * @param maxPoints - Maximum number of points to return (default: 500)
 * @param gridSize - Grid cell size in degrees (default: 0.1)
 * @returns Array of clustered points
 */
export function clusterOccurrences(
  occurrences: GBIFOccurrence[],
  maxPoints: number = 500,
  gridSize: number = 0.1
): ClusteredPoint[] {
  if (occurrences.length <= maxPoints) {
    // No clustering needed
    return occurrences.map(occ => ({
      latitude: occ.decimalLatitude,
      longitude: occ.decimalLongitude,
      count: 1,
      species: 1,
      kingdoms: [occ.kingdom]
    }));
  }
  
  // Grid-based clustering
  const clusters = new Map<string, GBIFOccurrence[]>();
  
  occurrences.forEach(occ => {
    const gridX = Math.floor(occ.decimalLongitude / gridSize);
    const gridY = Math.floor(occ.decimalLatitude / gridSize);
    const key = `${gridX},${gridY}`;
    
    if (!clusters.has(key)) {
      clusters.set(key, []);
    }
    clusters.get(key)!.push(occ);
  });
  
  // Convert clusters to clustered points
  const clusteredPoints = Array.from(clusters.values()).map(group => {
    const uniqueSpecies = new Set(group.map(o => o.scientificName));
    const uniqueKingdoms = [...new Set(group.map(o => o.kingdom))];
    
    return {
      latitude: group.reduce((sum, o) => sum + o.decimalLatitude, 0) / group.length,
      longitude: group.reduce((sum, o) => sum + o.decimalLongitude, 0) / group.length,
      count: group.length,
      species: uniqueSpecies.size,
      kingdoms: uniqueKingdoms
    };
  });
  
  // If still too many points, use adaptive grid size
  if (clusteredPoints.length > maxPoints) {
    const adaptiveGridSize = gridSize * Math.ceil(clusteredPoints.length / maxPoints);
    return clusterOccurrences(occurrences, maxPoints, adaptiveGridSize);
  }
  
  return clusteredPoints;
}

/**
 * Calculate optimal grid size for clustering based on data distribution
 * 
 * @param occurrences - Array of GBIF occurrences
 * @param targetPoints - Target number of clustered points
 * @returns Optimal grid size in degrees
 */
export function calculateOptimalGridSize(
  occurrences: GBIFOccurrence[],
  targetPoints: number = 500
): number {
  if (occurrences.length <= targetPoints) {
    return 0.01; // Minimum grid size
  }
  
  // Calculate bounding box
  const lats = occurrences.map(o => o.decimalLatitude);
  const lons = occurrences.map(o => o.decimalLongitude);
  
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  
  const latRange = maxLat - minLat;
  const lonRange = maxLon - minLon;
  
  // Calculate grid size to achieve target number of points
  const area = latRange * lonRange;
  const cellArea = area / targetPoints;
  const gridSize = Math.sqrt(cellArea);
  
  return Math.max(0.01, Math.min(1.0, gridSize));
}

/**
 * Filter occurrences by kingdom for focused visualization
 * 
 * @param occurrences - Array of GBIF occurrences
 * @param kingdom - Kingdom to filter by
 * @returns Filtered occurrences
 */
export function filterByKingdom(
  occurrences: GBIFOccurrence[],
  kingdom: string
): GBIFOccurrence[] {
  return occurrences.filter(occ => occ.kingdom === kingdom);
}

/**
 * Get cluster radius for visualization based on count
 * Larger clusters get larger visual representation
 * 
 * @param count - Number of occurrences in cluster
 * @param minRadius - Minimum radius
 * @param maxRadius - Maximum radius
 * @returns Radius value
 */
export function getClusterRadius(
  count: number,
  minRadius: number = 0.01,
  maxRadius: number = 0.05
): number {
  if (count === 1) return minRadius;
  
  // Logarithmic scale for better visual distribution
  const logCount = Math.log(count);
  const logMax = Math.log(1000); // Assume max 1000 per cluster
  const normalized = Math.min(logCount / logMax, 1);
  
  return minRadius + (normalized * (maxRadius - minRadius));
}

/**
 * Check if clustering is needed based on occurrence count
 * 
 * @param occurrenceCount - Number of occurrences
 * @param threshold - Threshold for clustering (default: 500)
 * @returns True if clustering should be applied
 */
export function shouldCluster(
  occurrenceCount: number,
  threshold: number = 500
): boolean {
  return occurrenceCount > threshold;
}
