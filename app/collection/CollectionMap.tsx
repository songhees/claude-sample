'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import DeckGL from '@deck.gl/react'
import { GeoJsonLayer, PathLayer } from '@deck.gl/layers'
import { LightingEffect, DirectionalLight, MapView } from '@deck.gl/core'
import type { Deck } from '@deck.gl/core'

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const COUNTRIES = '/geojson/geoJsonSample.json'

const COLOR_SCALE: Record<string, [number, number, number]> = {
  '11': [143, 186, 255],
  '26': [143, 186, 255],
  '27': [143, 186, 255],
  '28': [178, 207, 255],
  '29': [164, 198, 255],
  '30': [178, 207, 255],
  '31': [178, 207, 255],
  '36': [78,  109, 188],
  '41': [178, 207, 255],
  '43': [164, 198, 255],
  '44': [143, 186, 255],
  '45': [178, 207, 255],
  '46': [115, 153, 226],
  '47': [115, 153, 226],
  '48': [78,  109, 188],
  '50': [78,  109, 188],
  '51': [143, 186, 255],
}

const GYE = ['28', '41']

const TAB_GROUPS = [
  ['27', '11', '28', '29', '30', '31', '36', '41', '43', '44', '45', '46', '47', '48', '50', '51', '26'],
  ['41', '11', '28', '51'],
  ['43', '36', '30', '44'],
  ['45', '46', '29', '50'],
  ['47', '27', '48', '31', '26'],
]

const TAB_LABELS = ['전체', '수도/강원권', '충청권', '제주/전라권', '경상권']

const INITIAL_VIEW_STATE = {
  latitude: 35.84,
  longitude: 127.60,
  zoom: 6.5,
  minZoom: 6.5,
  maxZoom: 6.5,
  bearing: 0,
  pitch: 7,
}

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface PathDatum {
  path:   [number, number, number][]
  path3D: [number, number, number][]
  CTPRVN_CD: string
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function CollectionMap() {
  const [pathData,  setPathData]  = useState<PathDatum[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [isPaused,  setIsPaused]  = useState(false)
  const [selectedCodes, setSelectedCodes] = useState<string[]>(TAB_GROUPS[0])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deckRef     = useRef<Deck | null>(null)

  // GeoJSON → PathDatum 변환
  useEffect(() => {
    fetch(COUNTRIES)
      .then(r => r.json())
      .then((obj: GeoJSON.FeatureCollection) => {
        const data: PathDatum[] = obj.features.flatMap(feature => {
          const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
          const cd   = (feature.properties as { CTPRVN_CD: string }).CTPRVN_CD

          const makeRing = (ring: number[][]) => ({
            path:   ring.map(c => [c[0], c[1],   200] as [number, number, number]),
            path3D: ring.map(c => [c[0], c[1], 20180] as [number, number, number]),
            CTPRVN_CD: cd,
          })

          if (geom.type === 'Polygon') {
            return geom.coordinates.map(makeRing)
          }
          return geom.coordinates.flatMap(poly => poly.map(makeRing))
        })
        setPathData(data)
      })
  }, [])

  // 탭 이동
  const moveToTab = useCallback((index: number) => {
    const i = ((index % TAB_LABELS.length) + TAB_LABELS.length) % TAB_LABELS.length
    setActiveTab(i)
    setSelectedCodes(TAB_GROUPS[i])
  }, [])

  // 자동 순환 인터벌
  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setActiveTab(prev => {
        const next = (prev + 1) % TAB_LABELS.length
        setSelectedCodes(TAB_GROUPS[next])
        return next
      })
    }, 10000)
  }, [])

  useEffect(() => {
    if (!isPaused) startInterval()
    else if (intervalRef.current) clearInterval(intervalRef.current)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPaused, startInterval])

  // DeckGL 레이어
  const mapLight = new DirectionalLight({ color: [255, 255, 255], intensity: 2.7, direction: [-2, 1, -2] })
  const effects  = [new LightingEffect({ mapLight })]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geoJsonLayer = new GeoJsonLayer<any>({
    id:            'geojson',
    data:          COUNTRIES,
    opacity:        1,
    filled:         true,
    elevationScale: 2 as unknown as boolean,
    extruded:       true,
    wireframe:     false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFillColor: (f: any) => {
      const cd: string = f?.properties?.CTPRVN_CD
      return selectedCodes.includes(cd) ? (COLOR_SCALE[cd] ?? [30, 52, 138]) : [30, 52, 138]
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getElevation: (f: any) => {
      const cd: string = f?.properties?.CTPRVN_CD
      return selectedCodes.includes(cd) ? 10000 : 0
    },
    updateTriggers: {
      getFillColor: selectedCodes,
      getElevation: selectedCodes,
    },
    pickable: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onClick: (info: any) => {
      const cd: string = info.object?.properties?.CTPRVN_CD
      if (!cd) return
      setIsPaused(true)
      setSelectedCodes(GYE.includes(cd) ? GYE : [cd])
    },
  })

  const pathLayer = new PathLayer<PathDatum>({
    id:   'path-layer',
    data: pathData,
    getPath:  f => selectedCodes.includes(f.CTPRVN_CD) ? f.path3D : f.path,
    getColor: f => (selectedCodes.includes(f.CTPRVN_CD) ? [226, 237, 255] : [64, 88, 173]) as [number, number, number],
    updateTriggers: {
      getPath:  selectedCodes,
      getColor: selectedCodes,
    },
    getWidth:      1,
    widthMinPixels: 1,
    widthMaxPixels: 1,
    pickable:  false,
    billboard: true,
  })

  const layers = pathData.length > 0 ? [geoJsonLayer, pathLayer] : [geoJsonLayer]

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#0a1232' }}>

      {/* DeckGL 지도 */}
      <DeckGL
        ref={deckRef as React.RefObject<Deck>}
        views={new MapView({ id: 'base-map', controller: true })}
        initialViewState={INITIAL_VIEW_STATE}
        controller={{ dragPan: false }}
        effects={effects}
        layers={layers}
        style={{ width: '100%', height: '100%' }}
      />

      {/* 탭 + 컨트롤 (HTML 원본 위치: right:30px, bottom:30px) */}
      <div style={{
        position: 'absolute',
        right:  30,
        bottom: 30,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
      }}>
        {/* 탭 버튼 */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 4 }}>
          {TAB_LABELS.map((label, i) => (
            <li key={i}>
              <a
                href="#"
                data-index={i}
                onClick={e => {
                  e.preventDefault()
                  setIsPaused(true)
                  moveToTab(i)
                }}
                style={{
                  display: 'inline-block',
                  padding: '5px 12px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: activeTab === i ? 700 : 400,
                  color: activeTab === i ? '#fff' : '#8fb2ff',
                  background: activeTab === i ? '#2f5bbd' : 'rgba(10,18,50,0.85)',
                  border: `1px solid ${activeTab === i ? '#2f5bbd' : '#2a3f7a'}`,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* 이전 / 일시정지 / 다음 */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: '‹', onClick: () => { setIsPaused(true); moveToTab(activeTab - 1) } },
            {
              label: isPaused ? '▶' : '⏸',
              onClick: () => setIsPaused(p => !p),
              active: isPaused,
            },
            { label: '›', onClick: () => { setIsPaused(true); moveToTab(activeTab + 1) } },
          ].map(({ label, onClick, active }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                background: active ? '#2f5bbd' : 'rgba(10,18,50,0.85)',
                border: `1px solid ${active ? '#2f5bbd' : '#2a3f7a'}`,
                borderRadius: 4,
                color: '#8fb2ff',
                padding: '5px 14px',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
