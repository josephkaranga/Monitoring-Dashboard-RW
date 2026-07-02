// Threat level assessment for biodiversity loss

import type { District } from '../types/index';
import type { ThreatAssessment } from '../types/biodiversity';

interface Risk {
  id: number;
  district_id: number;
  risk_type: string;
  severity: string;
  description: string;
}

/**
 * Calculate threat level for a district based on multiple risk factors
 *
 * @param district - District data
 * @param risks - Documented risks for the district
 * @param forestCoverTrend - Forest cover change percentage (negative = loss)
 * @param speciesDeclineTrend - Species decline trend (optional, for future use)
 * @returns Threat assessment with level and contributing factors
 */
export function calculateThreatLevel(
  district: District,
  risks: Risk[],
  forestCoverTrend: number,
  speciesDeclineTrend: number = 0
): ThreatAssessment {
  let threatScore = 0;

  // Factor 1: Forest cover loss (0-40 points)
  let forestCoverLoss = 0;
  if (forestCoverTrend < -10) {
    forestCoverLoss = 40;
  } else if (forestCoverTrend < -5) {
    forestCoverLoss = 30;
  } else if (forestCoverTrend < -2) {
    forestCoverLoss = 20;
  } else if (forestCoverTrend < 0) {
    forestCoverLoss = 10;
  }
  threatScore += forestCoverLoss;

  // Factor 2: Documented risks (0-40 points)
  const districtRisks = risks.filter(r => r.district_id === district.id);
  const highSeverityRisks = districtRisks.filter(
    r => r.severity === 'high' || r.severity === 'critical'
  ).length;
  const mediumSeverityRisks = districtRisks.filter(r => r.severity === 'medium').length;

  const documentedRisks = Math.min(highSeverityRisks * 15 + mediumSeverityRisks * 5, 40);
  threatScore += documentedRisks;

  // Factor 3: Species decline (0-20 points) - placeholder for future implementation
  // Would compare current vs historical GBIF data
  const speciesDecline = Math.min(Math.abs(speciesDeclineTrend) * 2, 20);
  threatScore += speciesDecline;

  // Determine threat level
  let threatLevel: 'high' | 'medium' | 'low';
  if (threatScore >= 60) {
    threatLevel = 'high';
  } else if (threatScore >= 30) {
    threatLevel = 'medium';
  } else {
    threatLevel = 'low';
  }

  return {
    districtId: district.id,
    threatLevel,
    threatScore,
    factors: {
      forestCoverLoss,
      documentedRisks,
      speciesDecline,
    },
  };
}

/**
 * Calculate threat level for all districts
 *
 * @param districts - All districts
 * @param risks - All documented risks
 * @param forestCoverData - Map of district ID to forest cover trend
 * @returns Map of district ID to threat assessment
 */
export function calculateThreatLevels(
  districts: District[],
  risks: Risk[],
  forestCoverData: Map<number, number>
): Map<number, ThreatAssessment> {
  const threatMap = new Map<number, ThreatAssessment>();

  districts.forEach(district => {
    const forestTrend = forestCoverData.get(district.id) || 0;
    const assessment = calculateThreatLevel(district, risks, forestTrend);
    threatMap.set(district.id, assessment);
  });

  return threatMap;
}

/**
 * Get threat level color for visualization
 *
 * @param threatLevel - Threat level category
 * @returns CSS color string
 */
export function getThreatLevelColor(threatLevel: 'high' | 'medium' | 'low'): string {
  const colors = {
    high: '#ef4444', // red
    medium: '#f59e0b', // yellow/orange
    low: '#10b981', // green
  };
  return colors[threatLevel];
}

/**
 * Get threat level label for display
 *
 * @param threatLevel - Threat level category
 * @returns Human-readable label
 */
export function getThreatLevelLabel(threatLevel: 'high' | 'medium' | 'low'): string {
  const labels = {
    high: 'High Risk',
    medium: 'Medium Risk',
    low: 'Low Risk',
  };
  return labels[threatLevel];
}

/**
 * Get threat factors description for tooltip
 *
 * @param assessment - Threat assessment
 * @returns Array of factor descriptions
 */
export function getThreatFactorsDescription(assessment: ThreatAssessment): string[] {
  const descriptions: string[] = [];

  if (assessment.factors.forestCoverLoss > 0) {
    descriptions.push(`Forest cover loss: ${assessment.factors.forestCoverLoss} points`);
  }

  if (assessment.factors.documentedRisks > 0) {
    descriptions.push(`Documented risks: ${assessment.factors.documentedRisks} points`);
  }

  if (assessment.factors.speciesDecline > 0) {
    descriptions.push(`Species decline: ${assessment.factors.speciesDecline} points`);
  }

  if (descriptions.length === 0) {
    descriptions.push('No significant threats identified');
  }

  return descriptions;
}
