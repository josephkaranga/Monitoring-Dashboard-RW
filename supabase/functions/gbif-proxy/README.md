# GBIF API Proxy Edge Function

## Overview

This Supabase Edge Function acts as a proxy for GBIF (Global Biodiversity Information Facility) API requests. It solves CORS issues and network restrictions that may prevent direct browser-to-GBIF API calls.

## Features

- **CORS Support**: Handles CORS preflight requests and adds appropriate headers
- **Rate Limiting**: Enforces 1 request per second to comply with GBIF API guidelines
- **Caching**: Responses are cached for 5 minutes to improve performance
- **Error Handling**: Graceful error handling with detailed error messages
- **Rwanda Focus**: Automatically adds Rwanda country code to requests

## Deployment

### Prerequisites

1. Supabase CLI installed: `npm install -g supabase`
2. Supabase project set up
3. Logged in to Supabase CLI: `supabase login`

### Deploy the Function

```powershell
# Link to your Supabase project (first time only)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy gbif-proxy
```

### Verify Deployment

After deployment, you can test the function:

```powershell
# Test with curl
curl "https://YOUR_PROJECT_REF.supabase.co/functions/v1/gbif-proxy?endpoint=occurrence/search&limit=5"
```

## Usage

### From Frontend (TypeScript/JavaScript)

```typescript
import { supabase } from './supabase';

// Get the function URL
const {
  data: { url },
} = supabase.functions.getUrl('gbif-proxy');

// Make a request
const response = await fetch(`${url}?endpoint=occurrence/search&limit=5&hasCoordinate=true`);
const data = await response.json();
```

### Query Parameters

- `endpoint` (optional): GBIF API endpoint (default: `occurrence/search`)
- Any other GBIF API parameters: `limit`, `hasCoordinate`, `eventDate`, etc.
- `country` is automatically set to `RW` (Rwanda) if not provided

### Examples

**Get occurrence count:**

```
GET /gbif-proxy?endpoint=occurrence/search&limit=0
```

**Get recent occurrences with coordinates:**

```
GET /gbif-proxy?endpoint=occurrence/search&limit=5&hasCoordinate=true
```

**Get occurrences from last 7 days:**

```
GET /gbif-proxy?endpoint=occurrence/search&limit=10&eventDate=2024-05-20,2024-05-27
```

## Response Format

### Success Response

```json
{
  "count": 12345,
  "results": [
    {
      "key": 123456789,
      "scientificName": "Gorilla beringei",
      "decimalLatitude": -1.5,
      "decimalLongitude": 29.5,
      ...
    }
  ]
}
```

### Error Response

```json
{
  "error": "GBIF API error: HTTP 500",
  "timestamp": "2024-05-27T10:30:00.000Z"
}
```

## Rate Limiting

The function enforces a rate limit of **1 request per second** to comply with GBIF API guidelines. Requests are automatically queued if they exceed this limit.

## Caching

Responses are cached for **5 minutes** (`Cache-Control: public, max-age=300`). This reduces load on the GBIF API and improves response times for repeated requests.

## Monitoring

Check function logs in Supabase Dashboard:

1. Go to **Edge Functions** in your Supabase project
2. Click on **gbif-proxy**
3. View **Logs** tab for request/error logs

## Troubleshooting

### Function not found

- Verify deployment: `supabase functions list`
- Redeploy: `supabase functions deploy gbif-proxy`

### CORS errors

- Check that `corsHeaders` are properly set in the function
- Verify the function is deployed with the latest code

### Timeout errors

- GBIF API may be slow or unavailable
- Check GBIF API status: https://www.gbif.org/
- Increase timeout in function code if needed

### Rate limit errors

- The function enforces 1 req/sec
- Implement client-side request queuing if making many requests

## Local Development

Test the function locally:

```powershell
# Start Supabase locally
supabase start

# Serve the function
supabase functions serve gbif-proxy

# Test locally
curl "http://localhost:54321/functions/v1/gbif-proxy?endpoint=occurrence/search&limit=5"
```

## Security

- The function is publicly accessible (no authentication required)
- Rate limiting prevents abuse
- Only proxies to GBIF API (no other domains)
- Input validation on endpoint parameter

## Related Files

- `index.ts` - Main function code
- `deno.json` - Deno configuration
- `../../src/services/rbisService.ts` - Frontend service that uses this proxy

## Support

For issues or questions:

1. Check Supabase Edge Functions documentation
2. Review GBIF API documentation: https://www.gbif.org/developer/summary
3. Check function logs in Supabase Dashboard
