// Example usage of biodiversity visualization panels
// This file demonstrates how to integrate all panel components

import React, { useState } from 'react';
import {
  BiodiversityIndexPanel,
  SpeciesByKingdomPanel,
  HotspotsListPanel,
  ProtectedAreasListPanel,
  GBIFLiveCounter
} from './index';
import { useGBIFOccurrences } from '../../hooks/useGBIFOccurrences';
import { useBiodiversityData } from '../../hooks/useBiodiversityData';
import { useProtectedAreas } from '../../hooks/useProtectedAreas';
import { identifyHotspots } from '../../utils/hotspotDetection';
import type { District } from '../../../index';

interface PanelsExampleProps {
  districts: District[];
}

/**
 * Example component showing how to use all biodiversity panels together
 * This demonstrates the data flow and event handling patterns
 */
export function PanelsExample({ districts }: PanelsExampleProps) {
  const [selectedKingdom, setSelectedKingdom] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [previousCount, setPreviousCount] = useState<number>(0);

  // Fetch GBIF occurrences
  const {
    occurrences,
    loading: gbifLoading,
    lastUpdated,
    totalCount,
    refresh
  } = useGBIFOccurrences({
    country: 'RW',
    limit: 5000,
    autoRefresh: true
  });

  // Calculate biodiversity data
  const {
    data: biodiversityData,
    loading: biodivLoading
  } = useBiodiversityData({
    districts,
    occurrences,
    loading: gbifLoading
  });

  // Load protected areas
  const {
    areas: protectedAreas,
    loading: areasLoading
  } = useProtectedAreas();

  // Identify hotspots
  const hotspots = React.useMemo(() => {
    const biodivArray = Array.from(biodiversityData.values());
    return identifyHotspots(biodivArray);
  }, [biodiversityData]);

  // Handle refresh with previous count tracking
  const handleRefresh = async () => {
    setPreviousCount(totalCount);
    await refresh();
  };

  // Filter occurrences by selected kingdom
  const filteredOccurrences = selectedKingdom
    ? occurrences.filter(occ => occ.kingdom === selectedKingdom)
    : occurrences;

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>
        Biodiversity Visualization Panels
      </h1>

      {/* Top row: Live counter */}
      <div style={{ marginBottom: 24 }}>
        <GBIFLiveCounter
          currentCount={totalCount}
          previousCount={previousCount}
          lastUpdated={lastUpdated}
          loading={gbifLoading}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Main grid: 2 columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 24,
        marginBottom: 24
      }}>
        {/* Biodiversity Index Panel */}
        <BiodiversityIndexPanel
          biodiversityData={biodiversityData}
          loading={biodivLoading}
          onDistrictClick={(districtId) => {
            setSelectedDistrict(districtId);
            console.log('District clicked:', districtId);
          }}
        />

        {/* Species by Kingdom Panel */}
        <SpeciesByKingdomPanel
          occurrences={filteredOccurrences}
          loading={gbifLoading}
          onKingdomClick={(kingdom) => {
            setSelectedKingdom(kingdom);
            console.log('Kingdom filter:', kingdom);
          }}
          selectedKingdom={selectedKingdom}
        />
      </div>

      {/* Bottom row: Hotspots and Protected Areas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 24
      }}>
        {/* Hotspots List Panel */}
        <HotspotsListPanel
          hotspots={hotspots}
          loading={biodivLoading}
          onHotspotClick={(districtId) => {
            setSelectedDistrict(districtId);
            console.log('Hotspot clicked:', districtId);
          }}
        />

        {/* Protected Areas List Panel */}
        <ProtectedAreasListPanel
          areas={protectedAreas?.features || []}
          loading={areasLoading}
          onAreaClick={(areaName) => {
            console.log('Protected area clicked:', areaName);
          }}
        />
      </div>

      {/* Debug info */}
      {selectedDistrict && (
        <div style={{
          marginTop: 24,
          padding: 16,
          background: 'var(--surface-2)',
          borderRadius: 8,
          fontSize: '0.8rem'
        }}>
          <strong>Selected District ID:</strong> {selectedDistrict}
        </div>
      )}

      {selectedKingdom && (
        <div style={{
          marginTop: 12,
          padding: 16,
          background: 'var(--surface-2)',
          borderRadius: 8,
          fontSize: '0.8rem'
        }}>
          <strong>Kingdom Filter:</strong> {selectedKingdom} ({filteredOccurrences.length} occurrences)
        </div>
      )}
    </div>
  );
}
