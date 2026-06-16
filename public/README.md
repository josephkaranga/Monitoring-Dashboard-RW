# Rwanda Districts GeoJSON

## How to add real district boundaries

The `rwanda-districts.geojson` file is currently a placeholder. To add real Rwanda district boundaries:

### Option 1: Download from geoBoundaries (Recommended)

1. Download the simplified GeoJSON file from:
   ```
   https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/RWA/ADM2/geoBoundaries-RWA-ADM2_simplified.geojson
   ```

2. Save it as `public/rwanda-districts.geojson` (replace the existing placeholder file)

3. The map will automatically use the real boundaries on next page load

### Option 2: Download using curl/wget

```bash
# Using curl
curl -L "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/RWA/ADM2/geoBoundaries-RWA-ADM2_simplified.geojson" -o public/rwanda-districts.geojson

# Using wget
wget "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/RWA/ADM2/geoBoundaries-RWA-ADM2_simplified.geojson" -O public/rwanda-districts.geojson
```

### Data Source

- **Source**: geoBoundaries (Open Data Rwanda)
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Year**: 2012
- **Level**: ADM2 (Districts)
- **Count**: 30 districts

### Fallback Behavior

If the GeoJSON file is empty or missing, the map will display districts in a simple grid layout as a fallback.
