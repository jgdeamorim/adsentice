'use client'

import dynamic from 'next/dynamic'

const Map = dynamic(() => import('@/components/MarketCoverageMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 220, background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#999' }}>🗺️ Carregando mapa...</span>
    </div>
  ),
})

export default function MarketCoverageMapWrapper({ pins }: { pins: any[] }) {
  return <Map pins={pins} />
}
