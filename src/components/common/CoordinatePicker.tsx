import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons in React/Vite
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface CoordinatePickerProps {
  latitude?: number | string;
  longitude?: number | string;
  onChange: (coords: { latitude: string; longitude: string }) => void;
  disabled?: boolean;
}

const RWANDA_CENTER: [number, number] = [-1.9403, 29.8739];
const PRESETS = [
  { name: 'Kigali City', coords: [-1.9536, 30.0605] },
  { name: 'Musanze (North)', coords: [-1.4998, 29.6350] },
  { name: 'Huye (South)', coords: [-2.5967, 29.7394] },
  { name: 'Rubavu (West)', coords: [-1.6741, 29.2602] },
  { name: 'Nyagatare (East)', coords: [-1.2982, 30.3243] },
  { name: 'Volcanoes NP', coords: [-1.4700, 29.4900] },
  { name: 'Akagera NP', coords: [-1.8833, 30.7167] },
  { name: 'Nyungwe NP', coords: [-2.5400, 29.2319] },
];

export function CoordinatePicker({
  latitude,
  longitude,
  onChange,
  disabled = false,
}: CoordinatePickerProps) {
  const [showMapModal, setShowMapModal] = useState(false);
  const [tempLat, setTempLat] = useState<string>(latitude ? String(latitude) : '');
  const [tempLng, setTempLng] = useState<string>(longitude ? String(longitude) : '');
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    setTempLat(latitude ? String(latitude) : '');
    setTempLng(longitude ? String(longitude) : '');
  }, [latitude, longitude]);

  // Open modal and initialize Leaflet
  useEffect(() => {
    if (!showMapModal) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const currentLat = parseFloat(tempLat);
      const currentLng = parseFloat(tempLng);
      const hasCoords = !isNaN(currentLat) && !isNaN(currentLng);
      const initialCenter: [number, number] = hasCoords ? [currentLat, currentLng] : RWANDA_CENTER;
      const initialZoom = hasCoords ? 13 : 9;

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      const marker = L.marker(initialCenter, {
        draggable: true,
        icon: defaultIcon,
      }).addTo(map);

      if (hasCoords) {
        marker.bindPopup(`Selected: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`).openPopup();
      }

      markerRef.current = marker;

      // Handle drag
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setTempLat(pos.lat.toFixed(6));
        setTempLng(pos.lng.toFixed(6));
        marker.bindPopup(`Selected: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`).openPopup();
      });

      // Handle map click
      map.on('click', e => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        marker.bindPopup(`Selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`).openPopup();
        setTempLat(lat.toFixed(6));
        setTempLng(lng.toFixed(6));
      });

      // Force resize to fix tile render in modal
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showMapModal]);

  const handleDeviceLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }
    setGeoLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoLocating(false);
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setTempLat(lat);
        setTempLng(lng);
        onChange({ latitude: lat, longitude: lng });

        if (mapInstanceRef.current && markerRef.current) {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          mapInstanceRef.current.setView(newPos, 14);
          markerRef.current.setLatLng(newPos);
          markerRef.current.bindPopup(`Device GPS: ${lat}, ${lng}`).openPopup();
        }
      },
      err => {
        setGeoLocating(false);
        setGeoError(err.message || 'Unable to retrieve your location');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePresetSelect = (coords: [number, number]) => {
    const lat = coords[0].toFixed(6);
    const lng = coords[1].toFixed(6);
    setTempLat(lat);
    setTempLng(lng);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView(coords, 12);
      markerRef.current.setLatLng(coords);
      markerRef.current.bindPopup(`Selected: ${lat}, ${lng}`).openPopup();
    }
  };

  const handleConfirmModal = () => {
    onChange({ latitude: tempLat, longitude: tempLng });
    setShowMapModal(false);
  };

  const handleClear = () => {
    setTempLat('');
    setTempLng('');
    onChange({ latitude: '', longitude: '', });
  };

  const hasCoords = !!latitude && !!longitude;

  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 120 }}>
          <input
            type="number"
            step="any"
            placeholder="Latitude (e.g. -1.9403)"
            value={latitude || ''}
            disabled={disabled}
            onChange={e => {
              const val = e.target.value;
              onChange({ latitude: val, longitude: String(longitude || '') });
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1.5px solid #e2e8f0',
              borderRadius: 8,
              fontSize: '0.82rem',
              outline: 'none',
              background: '#fff',
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 120 }}>
          <input
            type="number"
            step="any"
            placeholder="Longitude (e.g. 29.8739)"
            value={longitude || ''}
            disabled={disabled}
            onChange={e => {
              const val = e.target.value;
              onChange({ latitude: String(latitude || ''), longitude: val });
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1.5px solid #e2e8f0',
              borderRadius: 8,
              fontSize: '0.82rem',
              outline: 'none',
              background: '#fff',
            }}
          />
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowMapModal(true)}
          style={{
            padding: '8px 14px',
            background: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          title="Open interactive map to pick location coordinates"
        >
          <span className="fa-solid fa-map-location-dot" />
          Pick on Map
        </button>

        <button
          type="button"
          disabled={disabled || geoLocating}
          onClick={handleDeviceLocation}
          style={{
            padding: '8px 12px',
            background: '#f1f5f9',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          title="Use current device GPS location"
        >
          <span
            className={
              geoLocating ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-location-crosshairs'
            }
          />
          GPS
        </button>

        {hasCoords && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleClear}
            style={{
              padding: '8px 10px',
              background: 'transparent',
              color: '#94a3b8',
              border: 'none',
              borderRadius: 8,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
            title="Clear coordinates"
          >
            ✕
          </button>
        )}
      </div>

      {hasCoords && (
        <div style={{ marginTop: 4, fontSize: '0.73rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="fa-solid fa-circle-check" />
          Coordinates set: {latitude}, {longitude}
        </div>
      )}

      {geoError && (
        <div style={{ marginTop: 4, fontSize: '0.73rem', color: '#e11d48' }}>
          {geoError}
        </div>
      )}

      {/* Interactive Map Modal */}
      {showMapModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 16,
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: 780,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Pick Location Coordinates
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Click anywhere on the map or drag the pin to set the exact site location.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.2rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div
              style={{
                padding: '8px 16px',
                background: '#f1f5f9',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                Quick Landmarks:
              </span>
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handlePresetSelect(p.coords as [number, number])}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 4,
                    color: '#1e293b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Map Canvas */}
            <div
              ref={mapContainerRef}
              style={{
                width: '100%',
                height: 420,
                background: '#e2e8f0',
              }}
            />

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                <strong>Latitude:</strong> {tempLat || '—'} &nbsp;|&nbsp;{' '}
                <strong>Longitude:</strong> {tempLng || '—'}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModal}
                  disabled={!tempLat || !tempLng}
                  style={{
                    padding: '8px 20px',
                    background: tempLat && tempLng ? '#16a34a' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: tempLat && tempLng ? 'pointer' : 'not-allowed',
                  }}
                >
                  Apply Coordinates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoordinatePicker;
