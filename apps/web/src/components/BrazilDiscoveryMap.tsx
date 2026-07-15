'use client'

// ══════════════════════════════════════════════════════════════════
// ADSENTICE · BrazilDiscoveryMap — mapa interativo com cobertura
// ADR-0022 + ADR-0023 · medido=verdade · 2026-07-15
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

// Corrige ícones do Leaflet em builds com webpack/Next.js
import 'leaflet/dist/leaflet.css'
// @ts-expect-error leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Types ──

export interface SearchPin {
  id: string
  lat: number
  lng: number
  radiusKm: number
  categories: string[]
  city: string
  totalCount: number
  avgScore: number
  createdAt: string
}

interface Props {
  pins: SearchPin[]
  selectedLat: number
  selectedLng: number
  selectedRadius: number
  onLocationSelect: (lat: number, lng: number, label: string) => void
  loading?: boolean
}

// ── Map click handler ──

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onClick(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

// ── Auto-center when selectedLat/Lng change ──

function MapCenterUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true })
  }, [lat, lng, map])
  return null
}

// ── Cores por cobertura ──

function pinColor(avgScore: number): string {
  if (avgScore >= 50) return '#ef5350'   // alta dor
  if (avgScore >= 35) return '#ffa726'   // média
  return '#42a5f5'                      // baixa
}

function radiusColor(totalCount: number): string {
  if (totalCount >= 100) return '#4caf50'
  if (totalCount >= 20) return '#ffa726'
  return '#42a5f5'
}

// ── Component ──

export default function BrazilDiscoveryMap({
  pins, selectedLat, selectedLng, selectedRadius,
  onLocationSelect, loading,
}: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const handleMapClick = useCallback((lat: number, lng: number) => {
    onLocationSelect(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
  }, [onLocationSelect])

  // Agrupa pins próximos (mesma coordenada) pra evitar overlap
  const uniquePins = new Map<string, SearchPin>()
  for (const p of pins) {
    const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`
    const existing = uniquePins.get(key)
    if (!existing || new Date(p.createdAt) > new Date(existing.createdAt)) {
      uniquePins.set(key, p)
    }
  }

  if (!mounted) {
    return (
      <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8 }}>
        <span style={{ color: '#999' }}>🌎 Carregando mapa...</span>
      </div>
    )
  }

  return (
    <div style={{ height: 480, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
      <MapContainer
        center={[selectedLat, selectedLng]}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onClick={handleMapClick} />
        <MapCenterUpdater lat={selectedLat} lng={selectedLng} />

        {/* Pins de searches anteriores */}
        {[...uniquePins.values()].map(p => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={L.divIcon({
              className: 'custom-pin',
              html: `<div style="
                width:14px;height:14px;border-radius:50%;
                background:${pinColor(p.avgScore)};
                border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)
              "></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            })}
          >
            <Popup>
              <div style={{ fontSize: '0.85rem', minWidth: 160 }}>
                <strong>{p.city}</strong><br />
                📁 {p.categories.join(', ')}<br />
                📊 {p.totalCount} leads · score {p.avgScore}<br />
                🔘 {p.radiusKm}km raio<br />
                <span style={{ fontSize: '0.7rem', color: '#999' }}>{p.createdAt?.slice(0, 16)}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Raio atual selecionado */}
        <Circle
          center={[selectedLat, selectedLng]}
          radius={selectedRadius * 1000}
          pathOptions={{
            color: '#1976d2',
            fillColor: '#1976d2',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '6 3',
          }}
        >
          <Popup>
            📍 Região selecionada · {selectedRadius}km raio
          </Popup>
        </Circle>

        {/* Círculos de cobertura (searches anteriores) */}
        {[...uniquePins.values()].slice(0, 15).map(p => (
          <Circle
            key={`cov-${p.id}`}
            center={[p.lat, p.lng]}
            radius={p.radiusKm * 1000}
            pathOptions={{
              color: radiusColor(p.totalCount),
              fillColor: radiusColor(p.totalCount),
              fillOpacity: 0.04,
              weight: 1,
              opacity: 0.5,
            }}
          />
        ))}
      </MapContainer>
    </div>
  )
}
