---
name: GeoJSON Map Architecture
description: 프로젝트의 한국 지도 컴포넌트 아키텍처, 파일 구조, 공유 데이터 구조
type: project
---

## 구조

- `app/collection/CollectionMapSVG.tsx` — SVG 기반 3D extrude 지도 (검토 완료 2026-05-04)
- `app/collection/CollectionMapFlat.tsx` — SVG 기반 평면 지도 (동일 상수/로직 중복)
- `app/collection/CollectionMapThree.tsx` — Three.js 3D 지도
- `app/collection/CollectionMap.tsx` — 진입점 래퍼
- `app/collection/page.tsx` — `dynamic` import (ssr: false) 로 CollectionMap 로드
- `app/providers/ThemeProvider.tsx` — localStorage 기반 dark/light 테마 컨텍스트
- `public/geojson/geoJsonSample.json` — 한국 시도 GeoJSON (CTPRVN_CD, CTP_KOR_NM 프로퍼티)
- `public/geojson/ctprvn.geojson` — 별도 시도 경계 데이터

## GeoJSON 데이터 형식

feature.properties: `{ CTPRVN_CD: string, CTP_ENG_NM: string, CTP_KOR_NM: string }`
geometry: Polygon | MultiPolygon

## 지역 코드 (CTPRVN_CD)

'11'=서울, '26'=부산, '27'=대구, '28'=인천, '29'=광주, '30'=대전, '31'=울산,
'36'=세종, '41'=경기, '43'=충북, '44'=충남, '45'=전북, '46'=전남, '47'=경북,
'48'=경남, '50'=제주, '51'=강원

GYE = ['28', '41'] — 인천+경기를 묶어서 취급

**Why:** 공공 행정구역 코드 기반 데이터로 코드 변경 가능성 낮음
**How to apply:** 코드 리뷰 시 지역 코드 하드코딩은 이 도메인에서 허용 가능한 패턴으로 인식
