import type { DashboardStats } from '../types/index';

/**
 * Generates an AI-powered NBSAP progress narrative using the Claude API.
 * Falls back to a data-driven mock narrative if the API is unavailable.
 */
export async function generateAINarrative(stats: DashboardStats): Promise<string> {
  const disbGap = stats.financeAllocated > 0
    ? Math.round((1 - stats.financeDisbursed / stats.financeAllocated) * 100)
    : 0;

  const dataSnapshot = `LIVE DATA SNAPSHOT — NBSAP 2025-2030 · Q1 2026:
INDICATOR STATUS:
- Total indicators monitored: 22 | On-track: ${stats.onTrackIndicators} | At-risk: ${stats.atRiskIndicators} | Behind: ${stats.behindIndicators}
- Average progress: ${stats.avgProgress}%
- Pending verifications: ${stats.pendingVerifications}

ECOSYSTEM:
- Forest restoration reported: ${stats.forestHa.toLocaleString()} ha
- Wetland rehabilitation: ${stats.wetlandHa.toLocaleString()} ha
- HWC incidents: ${stats.hwcIncidents}

DISTRICT REPORTING:
- Active districts: ${stats.activeDistricts}
- Compliance issues: ${stats.complianceIssues}

FINANCING:
- Budget allocated: RWF ${stats.financeAllocated.toLocaleString()}
- Budget disbursed: RWF ${stats.financeDisbursed.toLocaleString()}
- Disbursement gap: ${disbGap}%

SUBMISSIONS:
- Total: ${stats.totalSubmissions}
- Pending review: ${stats.pendingVerifications}`;

  const prompt = `You are a senior biodiversity monitoring analyst writing for Rwanda's REMA coordination team reviewing Q1 2026 NBSAP progress.

${dataSnapshot}

Write a professional 3-paragraph policy narrative (200–240 words total):

PARAGRAPH 1: Overall NBSAP 2025–2030 implementation status. Reference the ${stats.onTrackIndicators}/22 on-track indicators. Comment on whether average progress of ${stats.avgProgress}% is on trajectory toward 2030 targets.

PARAGRAPH 2: Highlight the most critical data findings — including the ${disbGap}% financing disbursement gap, the compliance picture, and HWC trends. Reference active risks where relevant.

PARAGRAPH 3: Give exactly two actionable recommendations for Q2 2026 — one related to the highest-priority financing or compliance gap, one related to the data/verification pipeline (${stats.pendingVerifications} submissions awaiting review).

Write in confident, policy-oriented language. Be data-specific. Reference Rwanda, NBSAP, and KM-GBF targets where relevant. Do not use headers or bullet points.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error('API error ' + response.status);

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    if (!text) throw new Error('Empty response');
    return text;
  } catch {
    // Graceful fallback: return data-driven narrative
    return generateFallbackNarrative(stats, disbGap);
  }
}

function generateFallbackNarrative(stats: DashboardStats, disbGap: number): string {
  return `Rwanda's NBSAP 2025–2030 implementation is showing measured progress in Q1 2026, with ${stats.onTrackIndicators} of 22 national indicators on-track against Kunming-Montreal Global Biodiversity Framework targets. The average indicator progress of ${stats.avgProgress}% places the programme on a trajectory that, if sustained, would meet 2030 commitments — however, ${stats.atRiskIndicators + stats.behindIndicators} indicators remain behind or at-risk and require urgent corrective action from responsible ministries before the mid-year review.

Ecosystem restoration data documents ${stats.forestHa.toLocaleString()} hectares of forest restoration and ${stats.wetlandHa.toLocaleString()} hectares of wetland rehabilitation. ${disbGap > 0 ? `A significant financing gap persists: ${disbGap}% of allocated biodiversity budget remains undisbursed, directly constraining field implementation.` : ''} ${stats.complianceIssues > 0 ? `${stats.complianceIssues} active compliance issues require resolution` : 'No critical compliance issues are currently flagged'}. Human-wildlife conflict data shows ${stats.hwcIncidents} incidents recorded across reporting districts.

For Q2 2026, REMA should prioritise two actions: first, convene an emergency financing review with MINECOFIN to accelerate disbursement to field implementers${disbGap > 30 ? ` — a continued gap above 30% risks triggering GCF/GEF non-compliance clauses` : ''}; second, clear the ${stats.pendingVerifications} submission${stats.pendingVerifications !== 1 ? 's' : ''} currently pending technical verification, as unreviewed data is preventing accurate national indicator calculations and delaying the Q1 CBD progress report.`;
}
