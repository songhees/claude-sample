'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import DeckGL from '@deck.gl/react'
import { GeoJsonLayer, PathLayer } from '@deck.gl/layers'
import { LightingEffect, DirectionalLight, MapView } from '@deck.gl/core'
import * as echarts from 'echarts'

// ─── 상수 ────────────────────────────────────────────────────────────────────

const COUNTRIES = '/geojson/geoJsonSample.json'

const AREA_CLASS: Record<string, { coord: [number, number]; name: string }> = {
  '11': { coord: [126.92181100116647, 37.70077223619992], name: 'seoul' },
  '26': { coord: [129.02871771198951, 35.06776870871123], name: 'busan' },
  '27': { coord: [128.91216614518305, 36.215477619477106], name: 'dg' },
  '29': { coord: [126.88360198083687, 35.252733872491554], name: 'gj' },
  '30': { coord: [127.27144657792856, 36.3240854950629], name: 'dj' },
  '31': { coord: [129.32801687710318, 35.353369089128634], name: 'us' },
  '36': { coord: [127.26950506591044, 36.73464479988965], name: 'sj' },
  '41': { coord: [127.06104901068248, 38.230116598223674], name: 'gye' },
  '43': { coord: [127.75846235973866, 37.19042298122961], name: 'cb' },
  '44': { coord: [126.22218239547156, 36.75737926405016], name: 'cn' },
  '45': { coord: [126.63714395876308, 35.80828374147929], name: 'jb' },
  '46': { coord: [126.17298272404078, 34.986405989464906], name: 'jn' },
  '47': { coord: [129.42044261790707, 37.14138516120429], name: 'gb' },
  '48': { coord: [127.90584938773733, 34.75545241021798], name: 'gn' },
  '50': { coord: [126.17840886388385, 33.23233465906995], name: 'jeju' },
  '51': { coord: [128.408619271286, 38.63488747938959], name: 'gan' },
}

const COLOR_SCALE: Record<string, [number, number, number]> = {
  '26': [143, 186, 255],
  '27': [143, 186, 255],
  '11': [143, 186, 255],
  '28': [178, 207, 255],
  '29': [164, 198, 255],
  '30': [178, 207, 255],
  '31': [178, 207, 255],
  '36': [78, 109, 188],
  '41': [178, 207, 255],
  '43': [164, 198, 255],
  '44': [143, 186, 255],
  '45': [178, 207, 255],
  '46': [115, 153, 226],
  '47': [115, 153, 226],
  '48': [78, 109, 188],
  '50': [78, 109, 188],
  '51': [143, 186, 255],
}

// 인천(28) + 경기(41) 를 "경기권"으로 묶음
const GYE = ['28', '41']

const TAB_GROUPS = [
  ['27', '11', '28', '29', '30', '31', '36', '41', '43', '44', '45', '46', '47', '48', '50', '51', '26'],
  ['41', '11', '28', '51'],
  ['43', '36', '30', '44'],
  ['45', '46', '29', '50'],
  ['47', '27', '48', '31', '26'],
]

const TAB_LABELS = ['전체', '수도권/강원', '충청권', '전라/제주', '경상권']

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface PathDatum {
  path: [number, number, number][]
  path3D: [number, number, number][]
  CTPRVN_CD: string
}

interface LrdItem {
  CTPRVN_CD: string
  CTPRVN_NM: string
  LINK_CNT: number
  PUB_CNT: number
  PUBPER: number
  PRI_CNT: number
  PRIVPER: number
  SK_CNT: number
  SKPER: number
  NAVE_CNT: number
  NAVEPER: number
  THIN_CNT: number
  THINPER: number
}

interface LkcData {
  LINK_CNT: number
  SK_CNT: number
  NAVE_CNT: number
  THIN_CNT: number
  PUB_CNT: number
  PRI_CNT: number
  SKPER: number
  NAVEPER: number
  THINPER: number
  PUBPER: number
  PRIVPER: number
}

interface FpsItem {
  PROCESSDATE: string
  REMARK: number
  WRITETIME: number
  PROCESSTIME: number
  PRIVATECOLLECTTIME: number
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function numberWithCommas(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 카운트 애니메이션 훅
function useCountUp(target: number, duration = 2000) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setValue(Math.floor(progress * target))
      if (progress >= 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

// ─── 툴팁 컴포넌트 ────────────────────────────────────────────────────────────

interface TooltipItem {
  cd: string
  x: number
  y: number
  data: LrdItem
}

function TooltipOverlay({ items }: { items: TooltipItem[] }) {
  return (
    <div id="tooltip" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
      {items.map(({ cd, x, y, data }) => (
        <div
          key={cd}
          className="tip-area ver_local"
          style={{
            position: 'absolute',
            left: x,
            top: y,
            transform: 'translate(-50%, -50%)',
            background: 'rgba(10,20,50,0.85)',
            border: '1px solid #2f5bbd',
            borderRadius: 8,
            padding: '10px 14px',
            minWidth: 200,
            color: '#e2edff',
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <dl style={{ margin: 0 }}>
            <dt style={{ marginBottom: 6 }}>
              <span style={{
                display: 'inline-block',
                background: '#2f5bbd',
                borderRadius: 4,
                padding: '2px 8px',
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 4,
              }}>
                {data.CTPRVN_NM}
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ color: '#8fb2ff' }}>링크현황</span>
                <span style={{ fontWeight: 700 }}>{numberWithCommas(data.LINK_CNT)}</span>
              </div>
            </dt>
            <dd style={{ margin: 0, borderTop: '1px solid #2a3f7a', paddingTop: 6 }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#8fb2ff' }}>공공소통정보 융합</span>
                  <span>{numberWithCommas(data.PUB_CNT)} ({data.PUBPER}%)</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#8fb2ff' }}>민간소통정보 융합</span>
                  <span>{numberWithCommas(data.PRI_CNT)} ({data.PRIVPER}%)</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#a0b8e0' }}>TMAP</span>
                  <span>{numberWithCommas(data.SK_CNT)} ({data.SKPER}%)</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#a0b8e0' }}>네이버</span>
                  <span>{numberWithCommas(data.NAVE_CNT)} ({data.NAVEPER}%)</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a0b8e0' }}>팅크웨어</span>
                  <span>{numberWithCommas(data.THIN_CNT)} ({data.THINPER}%)</span>
                </li>
              </ul>
            </dd>
          </dl>
        </div>
      ))}
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function CollectionMap() {
  const [pathData, setPathData] = useState<PathDatum[]>([])
  const [target, setTarget] = useState<{ CTPRVN_CD: string[] }>({
    CTPRVN_CD: TAB_GROUPS[0],
  })
  const [tooltipItems, setTooltipItems] = useState<TooltipItem[]>([])
  const [tooltipData, setTooltipData] = useState<LrdItem[]>([])
  const [lkcData, setLkcData] = useState<LkcData | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deckRef = useRef<any>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const echartsRef = useRef<echarts.ECharts | null>(null)

  // 카운트 애니메이션 값들
  const totalCnt = lkcData
    ? (lkcData.SK_CNT + lkcData.NAVE_CNT + lkcData.THIN_CNT)
    : 0
  const totalCountUp = useCountUp(totalCnt)
  const totalPerCountUp = useCountUp(
    lkcData ? Math.round(totalCnt / lkcData.LINK_CNT * 100) : 0
  )
  const skCountUp = useCountUp(lkcData?.SK_CNT ?? 0)
  const naveCountUp = useCountUp(lkcData?.NAVE_CNT ?? 0)
  const thinCountUp = useCountUp(lkcData?.THIN_CNT ?? 0)

  // GeoJSON → pathData 변환
  useEffect(() => {
    fetch(COUNTRIES)
      .then(r => r.json())
      .then((obj: GeoJSON.FeatureCollection) => {
        const data: PathDatum[] = obj.features.flatMap(feature => {
          const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
          const cd = (feature.properties as { CTPRVN_CD: string }).CTPRVN_CD
          const makeRing = (ring: number[][]) => ({
            path: ring.map(c => [c[0], c[1], 200] as [number, number, number]),
            path3D: ring.map(c => [c[0], c[1], 20180] as [number, number, number]),
            CTPRVN_CD: cd,
          })
          if (geom.type === 'Polygon') {
            return geom.coordinates.map(makeRing)
          } else {
            return geom.coordinates.flatMap(poly => poly.map(makeRing))
          }
        })
        setPathData(data)
      })
  }, [])

  // API 데이터 로드
  useEffect(() => {
    fetch('/api/collection')
      .then(r => r.json())
      .then((result: { LKC: LkcData; LRD: LrdItem[]; FPS: FpsItem[] }) => {
        setLkcData(result.LKC)

        // 인천(28) + 경기(41) → 경기도로 합산
        const filtered = result.LRD.filter(item => !GYE.includes(item.CTPRVN_CD))
        const gyeItems = result.LRD.filter(item => GYE.includes(item.CTPRVN_CD))
        if (gyeItems.length >= 2) {
          const merged: LrdItem = { ...gyeItems[0] }
          const keys = Object.keys(gyeItems[0]) as (keyof LrdItem)[]
          keys.forEach(key => {
            if (key !== 'CTPRVN_CD' && key !== 'CTPRVN_NM') {
              ;(merged as unknown as Record<string, number>)[key] =
                (gyeItems[0][key] as unknown as number) + (gyeItems[1][key] as unknown as number)
            }
          })
          merged.CTPRVN_CD = '41'
          merged.CTPRVN_NM = '경기도'
          filtered.push(merged)
        }
        setTooltipData(filtered)

        // 차트 초기화
        initChart(result.FPS)
      })
  }, [])

  // ECharts 바 스택 차트
  const initChart = (fps: FpsItem[]) => {
    if (!chartRef.current) return
    if (echartsRef.current) echartsRef.current.dispose()
    const chart = echarts.init(chartRef.current)
    echartsRef.current = chart

    let xData: string[] = []
    let remarkData: number[] = []
    let writeData: number[] = []
    let processData: number[] = []
    let privateData: number[] = []

    if (fps.length > 0) {
      xData = fps.map(item => {
        const parts = item.PROCESSDATE.split(' ')
        return parts[0] + '\n' + parts[1]
      })
      remarkData = fps.map(item => item.REMARK)
      writeData = fps.map(item => item.WRITETIME)
      processData = fps.map(item => item.PROCESSTIME)
      privateData = fps.map(item => item.PRIVATECOLLECTTIME)
    } else {
      const date = new Date()
      date.setMinutes(date.getMinutes() - (date.getMinutes() % 5))
      date.setHours(date.getHours() - 1)
      for (let i = 0; i < 13; i++) {
        xData.push(
          `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}\n${date.getHours()}:${date.getMinutes()}`
        )
        date.setMinutes(date.getMinutes() + 5)
      }
    }

    chart.setOption({
      color: ['#2561e2', '#e9ec20', '#21ced3', '#d655a6'],
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.7)', textStyle: { color: '#fff', fontSize: 12 }, borderWidth: 0 },
      legend: {
        itemWidth: 12, itemHeight: 4,
        data: ['소통정보 수집', '소통정보 융합', '소통정보 저장', '소통지도 생성'],
        textStyle: { color: '#b2bbce' }, right: '0%', top: '0%',
      },
      grid: { left: '0%', right: '0%', bottom: '0%', containLabel: true, top: '10%' },
      xAxis: {
        type: 'category', data: xData,
        axisLine: { lineStyle: { color: '#3e4157' } },
        axisLabel: { color: '#bfd7fe', fontSize: 10, interval: 0 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#3e4157' } },
        splitLine: { lineStyle: { color: '#3e4157' } },
        axisLabel: { color: '#b2bbce', fontSize: 11 },
        name: '(초)', nameLocation: 'end',
        nameTextStyle: { fontSize: 12, color: '#b2bbce', padding: [0, 30, 0, 0] },
      },
      series: [
        { name: '소통지도 생성', type: 'bar', barWidth: '40%', stack: 'total', data: remarkData, itemStyle: { borderRadius: [2, 2, 0, 0] } },
        { name: '소통정보 저장', type: 'bar', barWidth: '40%', stack: 'total', data: writeData, itemStyle: { borderRadius: [0, 0, 0, 0] } },
        { name: '소통정보 융합', type: 'bar', barWidth: '40%', stack: 'total', data: processData, itemStyle: { borderRadius: [0, 0, 0, 0] } },
        { name: '소통정보 수집', type: 'bar', barWidth: '40%', stack: 'total', data: privateData, itemStyle: { borderRadius: [0, 0, 0, 0] } },
      ],
    })

    window.addEventListener('resize', () => chart.resize())
  }

  // 툴팁 위치 계산
  const updateTooltips = useCallback((viewports: ReturnType<typeof DeckGL.prototype.getViewports>) => {
    if (!viewports || viewports.length === 0 || tooltipData.length === 0) return
    const vp = viewports[0]
    const items: TooltipItem[] = []
    target.CTPRVN_CD.forEach(cd => {
      if (cd === '28') return
      const item = tooltipData.find(d => d.CTPRVN_CD === cd)
      if (!item || !AREA_CLASS[cd]) return
      const [x, y] = (vp as { project: (coord: [number, number]) => [number, number] }).project(AREA_CLASS[cd].coord)
      items.push({ cd, x, y, data: item })
    })
    setTooltipItems(items)
  }, [target, tooltipData])

  // 탭 이동
  const moveToTab = useCallback((index: number) => {
    const normalized = ((index % TAB_LABELS.length) + TAB_LABELS.length) % TAB_LABELS.length
    setActiveTab(normalized)
    setTarget({ CTPRVN_CD: TAB_GROUPS[normalized] })
  }, [])

  // 인터벌 시작
  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setActiveTab(prev => {
        const next = (prev + 1) % TAB_LABELS.length
        setTarget({ CTPRVN_CD: TAB_GROUPS[next] })
        return next
      })
    }, 10000)
  }, [])

  // 인터벌 초기화
  useEffect(() => {
    if (!isPaused) startInterval()
    else if (intervalRef.current) clearInterval(intervalRef.current)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPaused, startInterval])

  // DeckGL layers
  const geoJsonConfig = {
    id: 'geojson',
    data: COUNTRIES,
    opacity: 1,
    filled: true,
    elevationScale: 2,
    extruded: true,
    wireframe: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFillColor: (f: any) => {
      const cd = f?.properties?.CTPRVN_CD as string
      if (target.CTPRVN_CD.includes(cd)) return COLOR_SCALE[cd] ?? [30, 52, 138]
      return [30, 52, 138]
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getElevation: (f: any) => {
      const cd = f?.properties?.CTPRVN_CD as string
      return target.CTPRVN_CD.includes(cd) ? 10000 : 0
    },
    updateTriggers: {
      getFillColor: target.CTPRVN_CD,
      getElevation: target.CTPRVN_CD,
    },
    pickable: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onClick: (info: any) => {
      if (!info.object) return
      const cd = info.object?.properties?.CTPRVN_CD as string
      setIsPaused(true)
      setTarget(GYE.includes(cd) ? { CTPRVN_CD: GYE } : { CTPRVN_CD: [cd] })
    },
  }

  const pathConfig = {
    id: 'path-layer',
    data: pathData,
    getPath: (f: PathDatum) => target.CTPRVN_CD.includes(f.CTPRVN_CD) ? f.path3D : f.path,
    getColor: (f: PathDatum): [number, number, number] =>
      target.CTPRVN_CD.includes(f.CTPRVN_CD) ? [226, 237, 255] : [64, 88, 173],
    updateTriggers: {
      getPath: target.CTPRVN_CD,
      getColor: target.CTPRVN_CD,
    },
    getWidth: 1,
    widthMinPixels: 1,
    widthMaxPixels: 1,
    pickable: false,
    billboard: true,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layers: any[] = pathData.length > 0
    ? [new GeoJsonLayer(geoJsonConfig as never), new PathLayer(pathConfig)]
    : []

  const mapLight = new DirectionalLight({ color: [255, 255, 255], intensity: 2.7, direction: [-2, 1, -2] })
  const effects = [new LightingEffect({ mapLight })]

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a1232', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, sans-serif', color: '#e2edff' }}>

      {/* 헤더 */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #1e2d5a', display: 'flex', alignItems: 'center', gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#8fb2ff' }}>소통정보 수집 현황</h1>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* 좌측 패널: 링크 수집 현황 + 차트 */}
        <div style={{ width: 300, padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 16, borderRight: '1px solid #1e2d5a', overflowY: 'auto' }}>

          {/* 링크 수집 현황 */}
          <div style={{ background: '#0d1b3e', border: '1px solid #1e2d5a', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8fb2ff', marginBottom: 12 }}>링크 수집 현황</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#8fb2ff', fontSize: 12 }}>전체 융합률</span>
              <span style={{ fontWeight: 700 }}>
                <em style={{ fontSize: 20, color: '#fff' }}>{numberWithCommas(totalCountUp)}</em>
                <span style={{ fontSize: 11, color: '#8fb2ff', marginLeft: 4 }}>({totalPerCountUp}%)</span>
              </span>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #1e2d5a', margin: '8px 0' }} />
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'TMAP', val: skCountUp, per: lkcData?.SKPER },
                { label: '네이버', val: naveCountUp, per: lkcData?.NAVEPER },
                { label: '팅크웨어', val: thinCountUp, per: lkcData?.THINPER },
              ].map(({ label, val, per }) => (
                <li key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#8fb2ff' }}>{label}</span>
                  <span>
                    <em style={{ color: '#fff', fontStyle: 'normal' }}>{numberWithCommas(val)}</em>
                    {per !== undefined && <span style={{ color: '#8fb2ff', marginLeft: 4 }}>({per}%)</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 소통정보 처리 현황 차트 */}
          <div style={{ background: '#0d1b3e', border: '1px solid #1e2d5a', borderRadius: 8, padding: 14, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8fb2ff', marginBottom: 8 }}>소통정보 처리 시간 현황</div>
            <div ref={chartRef} style={{ height: 260, width: '100%' }} />
          </div>
        </div>

        {/* 지도 영역 */}
        <div style={{ flex: 1, position: 'relative' }}>

          {/* 탭 + 컨트롤 */}
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            zIndex: 20, display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(10,18,50,0.85)', border: '1px solid #2a3f7a', borderRadius: 8, padding: '6px 12px',
          }}>
            <button
              onClick={() => moveToTab(activeTab - 1)}
              style={{ background: 'none', border: '1px solid #2a3f7a', borderRadius: 4, color: '#8fb2ff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}
            >‹</button>

            {TAB_LABELS.map((label, i) => (
              <button
                key={i}
                data-index={i}
                onClick={() => {
                  setIsPaused(true)
                  moveToTab(i)
                }}
                style={{
                  background: activeTab === i ? '#2f5bbd' : 'none',
                  border: `1px solid ${activeTab === i ? '#2f5bbd' : '#2a3f7a'}`,
                  borderRadius: 4,
                  color: activeTab === i ? '#fff' : '#8fb2ff',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: activeTab === i ? 700 : 400,
                }}
              >
                {label}
              </button>
            ))}

            <button
              onClick={() => moveToTab(activeTab + 1)}
              style={{ background: 'none', border: '1px solid #2a3f7a', borderRadius: 4, color: '#8fb2ff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}
            >›</button>

            <button
              onClick={() => setIsPaused(p => !p)}
              style={{
                background: isPaused ? '#2f5bbd' : 'none',
                border: `1px solid ${isPaused ? '#2f5bbd' : '#2a3f7a'}`,
                borderRadius: 4, color: '#8fb2ff', padding: '4px 10px', cursor: 'pointer', fontSize: 14,
              }}
            >
              {isPaused ? '▶' : '⏸'}
            </button>
          </div>

          {/* DeckGL 지도 */}
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <DeckGL
              ref={deckRef}
              views={new MapView({ id: 'base-map', controller: true })}
              initialViewState={{
                latitude: 35.84,
                longitude: 127.60,
                zoom: 6.5,
                minZoom: 6.5,
                maxZoom: 6.5,
                bearing: 0,
                pitch: 7,
              }}
              controller={{ dragPan: false }}
              effects={effects}
              layers={layers}
              onAfterRender={() => {
                if (deckRef.current) {
                  const vps = (deckRef.current as unknown as { getViewports: () => unknown[] }).getViewports()
                  updateTooltips(vps as ReturnType<typeof DeckGL.prototype.getViewports>)
                }
              }}
              style={{ width: '100%', height: '100%', background: '#0a1232' }}
            />
            <TooltipOverlay items={tooltipItems} />
          </div>
        </div>
      </div>
    </div>
  )
}
