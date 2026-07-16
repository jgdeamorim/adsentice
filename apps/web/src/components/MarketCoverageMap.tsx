'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface CoveragePin {
  id: string; lat: number; lng: number; radiusKm: number
  categories: string[]; city: string; totalCount: number; avgScore: number
}

const iconGentle = L.divIcon({
  className: 'coverage-pin',
  html: '<div style="width:10px;height:10px;border-radius:50%;background:#1976d2;border:2px solid rgba(255,255,255,0.9);box-shadow:0 0 6px rgba(25,118,210,0.4)"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
})

export default function MarketCoverageMap({ pins }: { pins: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [-19.0, -48.0],  // Brasil central
      zoom: 4,
      scrollWheelZoom: false,
      dragging: false,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map)

    mapRef.current = map

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Pins
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current

    // Remove old markers
    map.eachLayer(l => { if (l instanceof L.Marker) map.removeLayer(l) })

    for (const p of pins) {
      L.marker([p.lat, p.lng], { icon: iconGentle })
        .bindPopup(`
          <div style="font-size:0.8rem;min-width:140px">
            <strong>${p.city}</strong><br/>
            ${p.categories.join(', ')}<br/>
            ${p.totalCount} leads · ${p.avgScore}/100 · ${p.radiusKm}km
          </div>`)
        .addTo(map)
    }
  }, [pins])

  return (
    <div
      ref={containerRef}
      style={{ height: 220, width: '100%', borderRadius: '8px', border: '1px solid #e0e0e0' }}
    />
  )
}
