// Geographic utility functions

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 *
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 *
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Check if a point is within a bounding box
 *
 * @param lat - Point latitude
 * @param lon - Point longitude
 * @param bounds - Bounding box {minLat, maxLat, minLon, maxLon}
 * @returns True if point is within bounds
 */
export function isPointInBounds(
  lat: number,
  lon: number,
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number }
): boolean {
  return (
    lat >= bounds.minLat && lat <= bounds.maxLat && lon >= bounds.minLon && lon <= bounds.maxLon
  );
}

/**
 * Calculate bounding box for an array of coordinates
 *
 * @param coordinates - Array of [longitude, latitude] pairs
 * @returns Bounding box
 */
export function calculateBounds(coordinates: Array<[number, number]>): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  if (coordinates.length === 0) {
    return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
  }

  const lats = coordinates.map(c => c[1]);
  const lons = coordinates.map(c => c[0]);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };
}

/**
 * Calculate center point of a bounding box
 *
 * @param bounds - Bounding box
 * @returns Center point [longitude, latitude]
 */
export function getBoundsCenter(bounds: {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}): [number, number] {
  return [(bounds.minLon + bounds.maxLon) / 2, (bounds.minLat + bounds.maxLat) / 2];
}

/**
 * Calculate area of a polygon in square kilometers (approximate)
 * Uses spherical excess formula for better accuracy
 *
 * @param coordinates - Array of [longitude, latitude] pairs forming a polygon
 * @returns Area in square kilometers
 */
export function calculatePolygonArea(coordinates: Array<[number, number]>): number {
  if (coordinates.length < 3) return 0;

  const R = 6371; // Earth's radius in kilometers
  let area = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];

    area += toRadians(lon2 - lon1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
  }

  area = Math.abs((area * R * R) / 2);
  return area;
}

/**
 * Normalize district name for matching
 * Removes special characters, converts to lowercase, removes extra spaces
 *
 * @param name - District name
 * @returns Normalized name
 */
export function normalizeDistrictName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Match GeoJSON feature to district by name
 *
 * @param featureName - Name from GeoJSON properties
 * @param districtName - Name from database
 * @returns True if names match
 */
export function matchDistrictNames(featureName: string, districtName: string): boolean {
  const normalized1 = normalizeDistrictName(featureName);
  const normalized2 = normalizeDistrictName(districtName);

  // Exact match
  if (normalized1 === normalized2) return true;

  // Remove spaces and try again
  if (normalized1.replace(/\s/g, '') === normalized2.replace(/\s/g, '')) return true;

  // Check if one contains the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;

  return false;
}

/**
 * Format coordinate for display
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param precision - Number of decimal places (default: 4)
 * @returns Formatted string
 */
export function formatCoordinate(lat: number, lon: number, precision: number = 4): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';

  return `${Math.abs(lat).toFixed(precision)}°${latDir}, ${Math.abs(lon).toFixed(precision)}°${lonDir}`;
}
