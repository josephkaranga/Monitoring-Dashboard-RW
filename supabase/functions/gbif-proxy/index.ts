// ══════════════════════════════════════════════════════════════════════════════
// GBIF API Proxy Edge Function
// ══════════════════════════════════════════════════════════════════════════════
// Proxies requests to GBIF API to avoid CORS and network restrictions
// Handles rate limiting (1 req/sec) and provides caching for better performance
// ══════════════════════════════════════════════════════════════════════════════

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const GBIF_BASE_URL = 'https://api.gbif.org/v1';
const RWANDA_CODE = 'RW';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: Track last request time
let lastRequestTime = 0;
const RATE_LIMIT_MS = 1000; // 1 request per second

/**
 * Enforces rate limiting for GBIF API calls
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

/**
 * Main handler for GBIF proxy requests
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || 'occurrence/search';

    // Build GBIF API URL with query parameters
    const gbifUrl = new URL(`${GBIF_BASE_URL}/${endpoint}`);

    // Copy all query parameters except 'endpoint'
    url.searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        gbifUrl.searchParams.append(key, value);
      }
    });

    // Always add Rwanda country code if not present
    if (!gbifUrl.searchParams.has('country')) {
      gbifUrl.searchParams.set('country', RWANDA_CODE);
    }

    console.log(`Proxying request to: ${gbifUrl.toString()}`);

    // Enforce rate limiting
    await enforceRateLimit();

    // Make request to GBIF API
    const gbifResponse = await fetch(gbifUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NBSAP-Rwanda-Dashboard/1.0',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!gbifResponse.ok) {
      throw new Error(`GBIF API error: HTTP ${gbifResponse.status}`);
    }

    const data = await gbifResponse.json();

    // Return response with CORS headers
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
      status: 200,
    });
  } catch (error) {
    console.error('GBIF proxy error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});
