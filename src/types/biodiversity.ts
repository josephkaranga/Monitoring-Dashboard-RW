// Biodiversity data types for GIS visualization

export interface GBIFOccurrence {
  key: number;
  scientificName: string;
  kingdom: string;
  family: string;
  decimalLatitude: number;
  decimalLongitude: number;
  year: number;
  basisOfRecord: string;
}

export interface BiodiversityData {
  districtId: number;
  districtName: string;
  province: string;
  biodiversityIndex: number; // 0-100
  speciesRichness: number; // count of unique species
  speciesByKingdom: {
    [kingdom: string]: number;
  };
  occurrenceCount: number;
  lastUpdated: Date;
  protectedAreaCoverage?: number; // percentage of district covered by protected areas
  wetlandCoverage?: number; // percentage of district covered by wetlands
}

export interface ClusteredPoint {
  latitude: number;
  longitude: number;
  count: number;
  species: number;
  kingdoms: string[];
}

export interface SpeciesBreakdown {
  kingdom: string;
  count: number;
  percentage: number;
}

export interface BiodiversityHotspot {
  districtId: number;
  districtName: string;
  biodiversityIndex: number;
  speciesRichness: number;
  protectedAreaCoverage: number;
  priority: number;
}

export interface ThreatAssessment {
  districtId: number;
  threatLevel: 'high' | 'medium' | 'low';
  threatScore: number;
  factors: {
    forestCoverLoss: number;
    documentedRisks: number;
    speciesDecline: number;
  };
}
