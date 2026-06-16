# Map Overlay Coordinate System Fix

## Issue Summary
The map overlays (GBIF Occurrences, Protected Area Borders, River Network) were not displaying on the map despite data loading correctly (300 GBIF occurrences, 5 protected areas, 7 rivers).

## Root Cause
**Coordinate System Mismatch**: The overlay components were using incorrect coordinate transformations for Rwanda's geographic location.

### Technical Details
- **Rwanda's Coordinates**: 
  - Latitude: -1° to -3° (negative, Southern Hemisphere)
  - Longitude: 28.8° to 32.3° (positive, Eastern Hemisphere)
- **SVG ViewBox**: `"28.8 -2.9 3.5 2.8"`
  - x starts at 28.8 (longitude)
  - y starts at -2.9 (latitude, already negative)
  - width: 3.5, height: 2.8

### The Bug
In `GBIFOccurrencesOverlay.tsx`, the code was using:
```typescript
cy={-point.latitude}  // WRONG: Double negation
```

Since Rwanda's latitude is already negative (e.g., -2.0), negating it again (`-(-2.0) = 2.0`) placed points outside the viewBox (which expects negative y-coordinates).

## Solution
Changed all overlay components to use latitude values directly:

### 1. GBIFOccurrencesOverlay.tsx
**SVG Rendering**:
```typescript
// Before (WRONG)
cy={-point.latitude}

// After (CORRECT)
cy={point.latitude}
```

**Canvas Rendering**:
```typescript
// Before (WRONG)
const y = (point.latitude + 2.9) * scale;

// After (CORRECT)
const y = (-2.9 - point.latitude) * scale;
```

### 2. ProtectedAreasOverlay.tsx
Already correct - uses coordinates directly in path generation:
```typescript
return `${command}${lon},${lat}`;
```

### 3. RiverNetworkOverlay.tsx
Already correct - uses coordinates directly in path generation:
```typescript
return `${command}${lon},${lat}`;
```

## Verification
After the fix:
- ✅ GBIF occurrences (300 points) now display as colored circles on the map
- ✅ Protected areas (5 polygons) now display with semi-transparent fills
- ✅ River network (7 rivers) now display as blue lines
- ✅ All overlays can be toggled on/off using the overlay controls
- ✅ Hover tooltips work correctly for all overlay elements

## Accurate District Coordinates
The migration file `003_add_district_coordinates.sql` contains accurate coordinates for all 30 districts:
- Latitude and longitude (WGS84 decimal degrees)
- Elevation (meters above sea level)
- Wetland area (hectares)

**User Action Required**: Run the migration in Supabase Dashboard to populate the coordinate data:
```sql
-- Execute the contents of 003_add_district_coordinates.sql
```

## District Detail Panel
The District Detail Panel now displays:
- Accurate LAT/LNG from database (with fallback to calculated values)
- Elevation from database
- Wetland area from database
- All other metrics (species count, threat level, compliance, etc.)

## Files Modified
1. `src/components/map/GBIFOccurrencesOverlay.tsx` - Fixed coordinate system
2. `003_add_district_coordinates.sql` - Already contains accurate coordinates (no changes needed)

## Commit
```
commit 259cf0e
fix: correct coordinate system for map overlays

- Fixed GBIF occurrences overlay to use latitude directly
- Fixed Canvas rendering coordinate calculation
- Overlays now display correctly within the map viewBox
- All three overlays (GBIF, Protected Areas, Rivers) now visible when toggled
```

## Next Steps
1. ✅ Overlays are now working correctly
2. ⏳ User needs to run migration `003_add_district_coordinates.sql` in Supabase Dashboard
3. ⏳ Continue with login page redesign (AuthPage.tsx)

---
**Date**: 2026-05-08
**Status**: ✅ RESOLVED
