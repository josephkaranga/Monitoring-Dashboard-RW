/**
 * Map Control Components
 * 
 * This module exports all map control components for the GIS Biodiversity Enhancement feature.
 * These components provide UI controls for layer switching, overlay toggles, data refresh,
 * and dynamic legend display.
 */

export { LayerSwitcher } from './LayerSwitcher';
export { OverlayToggles } from './OverlayToggles';
export { RefreshButton } from './RefreshButton';
export { MapLegend } from './MapLegend';
export { ExportButton } from './ExportButton';

/**
 * Map Overlay Components
 * 
 * These components render data overlays on the map including GBIF occurrences,
 * protected areas, and river networks.
 */

export { GBIFOccurrencesOverlay } from './GBIFOccurrencesOverlay';
export { ProtectedAreasOverlay } from './ProtectedAreasOverlay';
export { RiverNetworkOverlay } from './RiverNetworkOverlay';
