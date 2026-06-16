# GBIF Proxy Deployment Guide

## Overview

This guide walks you through deploying the GBIF API proxy Edge Function to your Supabase project. The proxy solves CORS and network connectivity issues when accessing the GBIF API from the browser.

## Why Use a Proxy?

**Problems with Direct GBIF API Calls:**
- ❌ CORS restrictions block browser requests
- ❌ Network firewalls may block api.gbif.org
- ❌ Connection resets and timeouts
- ❌ Rate limiting complexity on client side

**Benefits of Edge Function Proxy:**
- ✅ No CORS issues (same-origin requests)
- ✅ Server-side requests bypass network restrictions
- ✅ Built-in rate limiting (1 req/sec)
- ✅ Response caching (5 minutes)
- ✅ Better error handling
- ✅ Centralized GBIF API logic

---

## Prerequisites

### 1. Install Supabase CLI

**Windows (PowerShell):**
```powershell
# Using npm
npm install -g supabase

# Or using Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Verify installation:**
```powershell
supabase --version
```

### 2. Login to Supabase

```powershell
supabase login
```

This will open a browser window for authentication.

### 3. Get Your Project Reference

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **General**
4. Copy your **Project Reference ID** (e.g., `vivqcyzyvixdammtaidr`)

---

## Deployment Steps

### Step 1: Link Your Project

```powershell
# Navigate to your project directory
cd "D:\Desktop\NBSAP FRONT AND BACKEND"

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your actual project reference ID.

### Step 2: Deploy the Function

```powershell
supabase functions deploy gbif-proxy
```

**Expected output:**
```
Deploying function gbif-proxy...
Function gbif-proxy deployed successfully!
Function URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/gbif-proxy
```

### Step 3: Verify Deployment

**Test the function:**
```powershell
# Test with curl (if available)
curl "https://YOUR_PROJECT_REF.supabase.co/functions/v1/gbif-proxy?endpoint=occurrence/search&limit=5"

# Or test in browser
# Open: https://YOUR_PROJECT_REF.supabase.co/functions/v1/gbif-proxy?endpoint=occurrence/search&limit=5
```

**Expected response:**
```json
{
  "count": 12345,
  "results": [...]
}
```

---

## Configuration

### Enable the Proxy in Frontend

The proxy is already configured in `src/services/rbisService.ts`:

```typescript
// Use Supabase Edge Function proxy for GBIF API
const USE_GBIF_PROXY = true;
```

To disable the proxy and use direct GBIF API calls:
```typescript
const USE_GBIF_PROXY = false;
```

### Update Environment Variables (Optional)

If you need to configure the function URL manually, add to `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Testing

### 1. Test in Browser Console

```javascript
// Get function URL
const { data: { url } } = supabase.functions.getUrl('gbif-proxy');

// Test request
fetch(`${url}?endpoint=occurrence/search&limit=5`)
  .then(r => r.json())
  .then(console.log);
```

### 2. Test RBIS Dashboard

1. Start your dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/rbis`
3. Check browser console for successful GBIF API calls
4. Verify metrics panel shows data
5. Check recent occurrences list populates

### 3. Monitor Function Logs

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions**
3. Click on **gbif-proxy**
4. View **Logs** tab
5. Check for successful requests and any errors

---

## Troubleshooting

### Issue: "Function not found"

**Solution:**
```powershell
# Verify function is deployed
supabase functions list

# Redeploy if needed
supabase functions deploy gbif-proxy
```

### Issue: "Project not linked"

**Solution:**
```powershell
# Link your project
supabase link --project-ref YOUR_PROJECT_REF
```

### Issue: "Authentication required"

**Solution:**
```powershell
# Login to Supabase
supabase login
```

### Issue: Still getting CORS errors

**Possible causes:**
1. Function not deployed correctly
2. Using wrong function URL
3. Browser cache (try hard refresh: Ctrl+Shift+R)

**Solution:**
```powershell
# Redeploy function
supabase functions deploy gbif-proxy --no-verify-jwt

# Clear browser cache and reload
```

### Issue: Timeout errors

**Possible causes:**
1. GBIF API is slow or unavailable
2. Network connectivity issues

**Solution:**
- Check GBIF API status: https://www.gbif.org/
- Increase timeout in `supabase/functions/gbif-proxy/index.ts`:
  ```typescript
  signal: AbortSignal.timeout(60000), // Increase to 60 seconds
  ```
- Redeploy after changes

### Issue: Rate limit errors

**Solution:**
The function enforces 1 request per second. This is normal and expected. The frontend should handle this gracefully with the existing error handling.

---

## Local Development

### Start Supabase Locally

```powershell
# Start local Supabase
supabase start

# Serve function locally
supabase functions serve gbif-proxy
```

### Test Locally

```powershell
# Test local function
curl "http://localhost:54321/functions/v1/gbif-proxy?endpoint=occurrence/search&limit=5"
```

### Update Frontend for Local Testing

In `src/services/rbisService.ts`, temporarily update:

```typescript
function getGBIFUrl(endpoint: string, params: Record<string, string>): string {
  if (USE_GBIF_PROXY) {
    // Use local function for testing
    const url = 'http://localhost:54321/functions/v1/gbif-proxy';
    const queryParams = new URLSearchParams({
      endpoint,
      ...params,
    });
    return `${url}?${queryParams}`;
  }
  // ...
}
```

---

## Monitoring & Maintenance

### Check Function Health

```powershell
# List all functions
supabase functions list

# View function details
supabase functions inspect gbif-proxy
```

### View Logs

**In Supabase Dashboard:**
1. Go to **Edge Functions**
2. Click **gbif-proxy**
3. View **Logs** tab

**Via CLI:**
```powershell
supabase functions logs gbif-proxy
```

### Update Function

After making changes to `supabase/functions/gbif-proxy/index.ts`:

```powershell
# Redeploy
supabase functions deploy gbif-proxy
```

---

## Security Considerations

### Function Access

The function is **publicly accessible** (no authentication required) because:
- GBIF API is public
- Rate limiting prevents abuse
- Only proxies to GBIF (no other domains)

### Enable Authentication (Optional)

To require authentication, update the function:

```typescript
// Add at the start of Deno.serve()
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response('Unauthorized', { status: 401 });
}

// Verify JWT token
const token = authHeader.replace('Bearer ', '');
// Add JWT verification logic here
```

Then update `rbisService.ts` to include auth header:

```typescript
const response = await fetch(url, {
  headers: {
    'Accept': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
});
```

---

## Cost Considerations

**Supabase Edge Functions Pricing:**
- Free tier: 500,000 invocations/month
- Pro tier: 2,000,000 invocations/month included

**RBIS Dashboard Usage Estimate:**
- Metrics refresh: 30 seconds = ~2,880 requests/day
- Data streams refresh: 60 seconds = ~1,440 requests/day
- **Total**: ~4,320 requests/day = ~130,000 requests/month

**Conclusion**: Well within free tier limits for typical usage.

---

## Next Steps

1. ✅ Deploy the function
2. ✅ Test in browser
3. ✅ Verify RBIS dashboard works
4. ✅ Monitor function logs
5. ✅ Commit changes to Git

---

## Support Resources

- **Supabase Edge Functions Docs**: https://supabase.com/docs/guides/functions
- **GBIF API Docs**: https://www.gbif.org/developer/summary
- **Deno Deploy Docs**: https://deno.com/deploy/docs

---

## Files Modified

1. `supabase/functions/gbif-proxy/index.ts` - Edge Function code
2. `supabase/functions/gbif-proxy/deno.json` - Deno configuration
3. `supabase/functions/gbif-proxy/README.md` - Function documentation
4. `src/services/rbisService.ts` - Updated to use proxy

---

**Last Updated**: May 28, 2024
**Status**: Ready for deployment
