'use client'

// ══════════════════════════════════════════════════════════════════
// ADSENTICE · BrazilDiscoveryMap — mapa interativo com cobertura
// ADR-0022 + ADR-0023 · medido=verdade · 2026-07-15
// Leaflet + OpenStreetMap ($0) — sem API key, sem Google, sem Cloudflare
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef } from 'react'

import type { Map as LeafletMap } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Icon fix (Leaflet + bundler) ──

const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
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

// ── Cores ──

function _pinColor(avgScore: number): string {
  if (avgScore >= 50) return '#ef5350'
  if (avgScore >= 35) return '#ffa726'
  
return '#42a5f5'
}

function radiusColor(totalCount: number): string {
  if (totalCount >= 100) return '#4caf50'
  if (totalCount >= 20) return '#ffa726'
  
return '#42a5f5'
}

// ── Component ──

export default function BrazilDiscoveryMap({
  pins, selectedLat, selectedLng, selectedRadius,
  onLocationSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const circlesRef = useRef<L.Circle[]>([])
  const markersRef = useRef<L.Marker[]>([])
  const [ready, setReady] = useState(false)

  // 1 — Init map ONCE (evita double-invoke do StrictMode)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [selectedLat, selectedLng],
      zoom: 5,
      scrollWheelZoom: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a>',
    }).addTo(map)

    // Click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng, `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`)
    })

    mapRef.current = map
    setReady(true)

    return () => {
      map.remove()
      mapRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2 — Update center when selected changes
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setView([selectedLat, selectedLng], mapRef.current.getZoom(), { animate: true })
  }, [selectedLat, selectedLng])

  // 3 — Draw/update circles + markers when pins or selected changes
  useEffect(() => {
    if (!mapRef.current || !ready) return
    const map = mapRef.current

    // Limpa anteriores
    for (const c of circlesRef.current) map.removeLayer(c)
    for (const m of markersRef.current) map.removeLayer(m)
    circlesRef.current = []
    markersRef.current = []

    // Agrupa pins únicos
    const unique = new Map<string, SearchPin>()

    for (const p of pins) {
      const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`
      const existing = unique.get(key)

      if (!existing || new Date(p.createdAt) > new Date(existing.createdAt)) {
        unique.set(key, p)
      }
    }

    // Pins
    for (const p of unique.values()) {
      const marker = L.marker([p.lat, p.lng], { icon: iconDefault })
        .bindPopup(`
          <div style="font-size:0.85rem;min-width:160px">
            <strong>${p.city}</strong><br/>
            📁 ${p.categories.join(', ')}<br/>
            📊 ${p.totalCount} leads · ${p.avgScore}/100<br/>
            🔘 ${p.radiusKm}km raio<br/>
            <span style="font-size:0.7rem;color:#999">${p.createdAt?.slice(0, 16)}</span>
          </div>`)
        .addTo(map)

      markersRef.current.push(marker)
    }

    // Raio selecionado
    const selCircle = L.circle([selectedLat, selectedLng], {
      radius: selectedRadius * 1000,
      color: '#1976d2',
      fillColor: '#1976d2',
      fillOpacity: 0.08,
      weight: 2,
      dashArray: '6 3',
    }).bindPopup(`📍 Região selecionada · ${selectedRadius}km raio`).addTo(map)

    circlesRef.current.push(selCircle)

    // Círculos de cobertura
    for (const p of [...unique.values()].slice(0, 15)) {
      const c = L.circle([p.lat, p.lng], {
        radius: p.radiusKm * 1000,
        color: radiusColor(p.totalCount),
        fillColor: radiusColor(p.totalCount),
        fillOpacity: 0.04,
        weight: 1,
        opacity: 0.5,
      }).addTo(map)

      circlesRef.current.push(c)
    }
  }, [pins, selectedLat, selectedLng, selectedRadius, ready])

  return (
    <div
      ref={containerRef}
      style={{ height: 480, width: '100%', borderRadius: 8, border: '1px solid #e0e0e0' }}
    />
  )
}
