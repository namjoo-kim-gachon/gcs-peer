# 세션 관리 워크플로우 (초안)

작성일: 2025-08-13

적용 범위: Next.js(pages), Supabase(DB). DB 스키마는 사전 구축 완료(참조: docs/worklog.db.md). 인증/권한 관리는 본 문서 범위에서 제외합니다.

## 체크리스트(하이레벨)

- Supabase 연동 준비(.env, SDK 설치 확인)
- 라우팅/페이지 뼈대 설계(pages Router)
- 세션 CRUD UI/로직
- 팀 CRUD UI/로직(세션 하위)
- 팀 멤버 관리 UI/로직(allowed_users 기반)
- 타입/상수/에러/로딩 공통화
- 테스트(단위/통합/E2E)와 품질 게이트
- 배포 설정(Vercel)과 운영 체크리스트
- 간단 문서화(README, 운영 가이드)

## 전제

- DB는 완료: public schema의 sessions, teams, team_members, allowed_users 사용(참조: docs/worklog.db.md).
- 본 단계에서는 로그인/접근 제어 없이 동작하는 관리 UI 구축에 집중합니다.
- allowed_users는 팀 멤버 선택용 자동완성 데이터 소스로만 활용합니다.

## 1) 준비(환경/의존성)

- .env.local에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정.
- `@supabase/supabase-js` 설치 여부 확인/추가.
- 글로벌 스타일 점검(`src/styles/global.css`).

산출물

- .env.local 가이드(README 업데이트)
- package.json 버전 고정 확인

## 2) 라우팅/페이지 뼈대

- 교원(관리)
  - `src/pages/sessions/index.tsx`: 세션 리스트/생성
  - `src/pages/sessions/[sessionId]/index.tsx`: 세션 상세(팀 리스트/생성)

## 3) UI 컴포넌트 분해

- 공통: `PageHeader`, `EmptyState`, `ConfirmDialog`, `FormField`, `Spinner`, `ErrorBanner`
- 세션: `SessionList`, `SessionItem`, `SessionFormModal`

산출물

- 컴포넌트 트리/props 계약서(입출력, 이벤트, 에러/로딩 처리)

## 4) 데이터 연동(쿼리/변경 플로우)

- 세션
  - List: `select * from sessions order by created_at desc`
  - Create: `insert into sessions(name, description) values(...) returning *`
  - Update/Delete: id 기반 변경 후 리스트 캐시 무효화
- 캐시 전략
  - SWR/React Query 여부 선택(초기엔 가벼운 훅 캐시 → 필요 시 확장)
  - 목록 변경 후 관련 목록만 국소 무효화
  - 삭제/추가에 한해 낙관적 업데이트 선택 적용

산출물

- 쿼리/뮤테이션 목록과 성공/실패/권한 오류 시나리오 표
- 빈 상태/로딩/에러 메시지 가이드 텍스트

## 5) 타입/유틸/에러 공통화

- `src/types/index.ts` 도메인 타입 추가
  - `AllowedUser { id: number; email: string; name?: string; is_faculty: boolean; description?: string; created_at: string }`
  - `Session { id: number; name: string; description?: string; created_at: string }`
  - `Team { id: number; session_id: number; name: string; added_at: string }`
  - `TeamMember { team_id: number; user_id: number; added_at: string }`
- 유틸
  - `src/utils/supabaseClient.ts`(단일 인스턴스)
  - `src/utils/errors.ts`(에러 매핑/표준화)

산출물

- 타입 정의 초안과 백엔드 스키마 변경 대응 메모

## 6) UX 상태/에러 처리

- 로딩 스켈레톤 vs 스피너 기준 정의
- 빈 상태 문구(세션/팀/멤버 없음)
- 치명적 오류 vs 재시도 가능 오류 구분, 삭제 ConfirmDialog 필수
- 장기 작업(대량 추가) 진행 표시

산출물

- 상태별 메시지/컴포넌트 매핑표

## 7) 테스트/품질 게이트

- 단위: 훅(useAuth, 데이터 훅), 유틸(에러 매핑)
- 통합: 세션/팀/멤버 플로우 목업(Supabase client mock)
- E2E(선택): Playwright happy path 1~2개(세션 생성→팀 생성→멤버 추가)
- 린트/포맷: ESLint/Prettier CI
- 빌드: `next build` CI

산출물

- 테스트 목록/최소 케이스 정의
- CI 설정 초안(.github/workflows)

## 8) 배포/운영

- Vercel 환경변수 설정(Supabase URL/Key)
- 404/권한 거부 페이지 확인
- 로그/에러 모니터링(초기 콘솔 → 추후 Sentry 도입 여지)

산출물

- 배포 체크리스트(스모크 테스트 포함)

## 9) 작업 순서 제안(6일 예시)

- Day 1: 환경 세팅, 스켈레톤 라우팅/페이지 생성
- Day 2: 세션 리스트/생성 UI/연동(읽기/쓰기)
- Day 3: 팀 리스트/생성, 세션 상세 연결
- Day 4: 팀 멤버 관리(검색/추가/삭제)
- Day 5: 에러/빈 상태/UX 다듬기, 최소 테스트
- Day 6: 문서/README 갱신, 배포/운영 체크리스트 점검

## 10) 요구사항 매핑(PRD 대비)

- 세션 단위 진행 및 UI: 섹션 3,5,6
- 세션-팀-팀멤버 계층: 라우팅/쿼리 플로우로 매핑

## 11) 다음 단계(개발 착수 전)

- 위 파일/페이지/컴포넌트의 스켈레톤 생성
- 최소 네비게이션 연결
- 이후 각 화면에 데이터 연동 단계적으로 적용
