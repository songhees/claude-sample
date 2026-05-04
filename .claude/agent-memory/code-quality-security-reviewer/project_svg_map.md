---
name: SVG Map Component Anti-patterns
description: CollectionMapSVG.tsx 및 CollectionMapFlat.tsx에서 반복 발견된 보안/품질 패턴
type: project
---

이 프로젝트의 SVG 지도 컴포넌트들(CollectionMapSVG, CollectionMapFlat)에서 반복적으로 발견되는 패턴:

1. fetch() 에러 처리 완전 부재 — `.catch()` 없이 `.then()` 체이닝만 사용
2. COLOR_SCALE_DARK, TAB_GROUPS, TAB_LABELS, GYE, COUNTRIES, LON_MIN/MAX, LAT_MIN/MAX, SVG_W/H 상수가 두 파일에 완전 중복 정의됨
3. SVG 렌더링 시 features 배열을 4회 순회 (비선택/base/wall/top 패스) — 단일 순회로 통합 가능
4. 인라인 style 객체를 JSX 내부에서 매 렌더마다 새로 생성
5. `<a href="#">` 패턴으로 탭 구현 — 의미론적으로 `<button>` 이어야 함
6. aria 속성 전혀 없음 — SVG 지도, 탭, 컨트롤 버튼 모두 스크린 리더 비접근
7. COLOR_SCALE_DARK만 존재하고 라이트 모드 색상 테이블 없음 — isDark 조건 분기 없이 항상 다크 팔레트 사용

**Why:** 두 파일이 동일 로직의 다른 렌더링 방식(SVG 3D extrude vs flat)이므로 공통 로직 추출이 필요
**How to apply:** 향후 이 컴포넌트들 검토 시 공통 훅/유틸 분리 권장
