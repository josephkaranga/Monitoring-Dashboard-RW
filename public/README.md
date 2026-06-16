# Rwanda GeoJSON Data Files

This directory contains GeoJSON files for visualizing Rwanda's geographic features on the biodiversity map.

## Files

### 1. rwanda-districts.geojson (282 KB)
Administrative boundaries for Rwanda's 30 districts.

**Data Source:**
- **Source**: geoBoundaries (Open Data Rwanda)
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Year**: 2012
- **Level**: ADM2 (Districts)
- **Count**: 30 districts
- **URL**: https://github.com/wmgeolab/geoBoundaries

### 2. rwanda-protected-areas.geojson (2.6 KB)
Protected areas including national parks and reserves.

**Data Source:**
- **Source**: Compiled from multiple sources including:
  - Protected Planet (WDPA - World Database on Protected Areas)
  - Rwanda Development Board (RDB)
  - African Parks
- **License**: Public domain / Open data
- **Year**: 2025
- **Features**: 5 protected areas
  - Volcanoes National Park (160 km²)
  - Akagera National Park (1,122 km²)
  - Nyungwe Forest National Park (1,019 km²)
  - Gishwati-Mukura National Park (34 km²)
  - Rugezi Marsh Wetland Reserve (67 km²)

**Properties:**
- `name`: Name of the protected area
- `type`: Type (National Park, Wetland Reserve, etc.)
- `area`: Area in square kilometers
- `description`: Brief description
- `established`: Year established

**References:**
- Protected Planet: https://www.protectedplanet.net/country/RWA
- African Parks: https://www.africanparks.org
- Rwanda Development Board: https://www.rdb.rw

### 3. rwanda-rivers.geojson (4.4 KB)
Major rivers and tributaries in Rwanda.

**Data Source:**
- **Source**: Compiled from geographic data including:
  - OpenStreetMap
  - Rwanda Water Resources Board
  - Geographic research publications
- **License**: Open Database License (ODbL)
- **Year**: 2025
- **Features**: 7 major rivers
  - Nyabarongo River (351 km) - Nile Basin
  - Kagera/Akagera River (597 km) - Nile Basin
  - Akanyaru River (137 km) - Nile Basin
  - Ruzizi River (117 km) - Congo Basin
  - Sebeya River (45 km) - Congo Basin
  - Muvumba River (80 km) - Nile Basin
  - Base River (38 km) - Nile Basin

**Properties:**
- `name`: Name of the river
- `type`: Type (Major River, River)
- `length`: Length in kilometers
- `basin`: Drainage basin (Nile Basin or Congo Basin)
- `description`: Brief description

**References:**
- Wikipedia: Geography of Rwanda
- ResearchGate: Hydrological studies of Rwanda
- OpenStreetMap: https://www.openstreetmap.org

### 4. GBIF Species Occurrence Data (Live API)
Real-time biodiversity data from the Global Biodiversity Information Facility.

**Data Source:**
- **Source**: GBIF.org (Global Biodiversity Information Facility)
- **License**: CC0 / CC-BY (varies by dataset)
- **API Endpoint**: https://api.gbif.org/v1/occurrence/search
- **Query Parameters**:
  - Country: Rwanda (RW)
  - Has Coordinate: true
  - Occurrence Status: present
  - Limit: 10,000 records
- **Update Frequency**: Auto-refresh every 30 minutes
- **Data Fields**: species name, kingdom, coordinates, year, basis of record

**Attribution:**
When using GBIF data, cite as:
"GBIF.org (Date) GBIF Occurrence Download https://doi.org/10.15468/dl.XXXXXX"

**References:**
- GBIF Portal: https://www.gbif.org/country/RW/summary
- GBIF API Documentation: https://www.gbif.org/developer/occurrence
- GBIF Data Use Agreement: https://www.gbif.org/terms

## Data Quality Notes

### Coordinate System
All GeoJSON files use the WGS84 coordinate system (EPSG:4326) with coordinates in decimal degrees.

### Simplification
- District boundaries: Simplified for web display while maintaining accuracy
- Protected areas: Approximate boundaries based on available data
- Rivers: Simplified river courses showing major flow paths

### Accuracy
- **Districts**: High accuracy from official geoBoundaries dataset
- **Protected areas**: Approximate boundaries - suitable for visualization but not for precise analysis
- **Rivers**: Simplified representation of major waterways - suitable for overview mapping

## Usage

These files are designed for local hosting to avoid CORS issues. They are loaded directly by the MapPage component:

```typescript
// Load district boundaries
fetch('/rwanda-districts.geojson')

// Load protected areas overlay
fetch('/rwanda-protected-areas.geojson')

// Load river network overlay
fetch('/rwanda-rivers.geojson')
```

## Attribution

When using these datasets, please include appropriate attribution:

**Districts:**
"Administrative boundaries from geoBoundaries (CC BY 4.0)"

**Protected Areas:**
"Protected areas data compiled from Protected Planet (WDPA), Rwanda Development Board, and African Parks"

**Rivers:**
"River network data from OpenStreetMap contributors (ODbL) and Rwanda Water Resources Board"

**GBIF Species Data:**
"GBIF.org (2026) GBIF Occurrence Download for Rwanda https://www.gbif.org/country/RW"

## Updates

To update these files with more accurate data:

1. **Protected Areas**: Download from Protected Planet API or WDPA
   - API: https://api.protectedplanet.net/documentation
   - Filter by country code: RWA

2. **Rivers**: Extract from OpenStreetMap using Overpass API
   - Query for waterways in Rwanda
   - Filter by river type and importance

3. **Districts**: Update from geoBoundaries latest release
   - Check for newer versions at https://github.com/wmgeolab/geoBoundaries

## License Summary

This collection of GeoJSON files is provided for use in the Rwanda Biodiversity Information System (RBIS):

- **Districts**: CC BY 4.0 (geoBoundaries)
- **Protected Areas**: Public domain / Open data compilation
- **Rivers**: ODbL (OpenStreetMap contributors)
- **GBIF Species Data**: CC0 / CC-BY (varies by dataset)

For commercial use or redistribution, please verify license compliance with original data sources.
