# 투표현황(Play) 기능 설계

본 문서는 세션별 투표 진행/현황을 관리하기 위한 “플레이(투표현황)” 기능의 기획/설계를 정리합니다. 구현 코드는 포함하지 않습니다.

## 참고 문서/파일

- DB 스키마: `docs/worklog.db.md`
- 리뷰(투표) 설계: `docs/feat.review.md`
- 세션 워크플로우: `docs/workflow.session.md`
- PRD: `docs/prd.md`
- 세션 리스트 컴포넌트: `src/components/sessions/SessionList.tsx`
- 학생 투표 페이지: `src/pages/vote/[sessionId].tsx`

## 목표/요구사항

- 세션 리스트에 “플레이” 버튼을 추가한다.
- “플레이” 버튼을 누르면 해당 세션의 투표현황 페이지로 이동한다.
- 투표현황 페이지에는 “투표 시작/종료” 토글 버튼이 있다.
- 토글 옆에 “리셋” 버튼이 있다.
- 화면 왼쪽에는 `/vote/{sessionId}`로 가는 QR 코드를 보여준다.
- 화면 오른쪽에는 참여자 이름을 카드로 보여준다.
- 투표를 한 경우 해당 참여자 카드는 색상이 바뀐다.

## 라우팅/페이지 구조

- 세션 리스트 → 투표현황으로 이동
  - 세션 리스트 아이템 액션에 “플레이” 버튼 추가(`src/components/sessions/SessionList.tsx`, `SessionItem`).
  - 라우트 제안: `/sessions/[sessionId]/status` (관리자용 현황 페이지, 신규).
- 학생 투표 페이지는 기존 `/vote/[sessionId]`를 그대로 사용.

## 권한/접근 제어

- 현황 페이지는 관리자(is_faculty=true)만 접근 가능.
- 서버 API에서도 is_faculty를 필수 검증(이중 방어).
- 학생 투표 페이지(`/vote/[sessionId]`)는 is_faculty와 무관하게 접근 가능(기존 정책 유지, `docs/prd.md`).

## 데이터 모델/상태

- sessions.status 활용(정수): 0=대기, 1=진행.
  - “투표 시작/종료” 토글은 status를 0↔1로 전환.
- 참여자 소스: `team_members(session_id, user_name)`.
- “투표함” 판단 기준(초안)
  - 기준 : `reviews`에 (session_id, user_name)로 1건 이상 존재하면 “투표함”.

## 데이터 접근 설계(직접 Supabase 접근)

관리자 화면은 Next.js API 우회 없이 클라이언트에서 Supabase에 직접 접근합니다.

### 클라이언트 쿼리 플로우

- 현황 조회
  - 방법: `team_members` 조회 후 `reviews`를 user_name 기준으로 집계해 `voted`/`progress` 계산
- 시작/종료 토글
  - `update sessions set status = :next where id = :sessionId`
- 리셋
  - reviews 테이블에서 session_id 에 해당되는 row 모두 삭제
- 실시간
  - `reviews` 테이블을 session_id로 필터링하여 실시간 구독 → 카드 상태 즉시 갱신

## 현황 페이지 UI/UX(관리자)

- 상단 바
  - “투표 시작/종료” 토글 버튼: `sessions.status`에 따라 라벨/색상 변화.
  - “리셋” 버튼: Confirm 다이얼로그 후 실행, 성공/실패 배너 노출.
- 좌측 패널(화면 절반)
  - QR 코드: 링크는 `https://peer.1000.school/vote/{sessionId}`.
  - 세션명/상태, 링크 복사 버튼.
- 우측 패널(화면 절반)
  - 맨 위에 투표 진행율 표시 : 0/30 ( 0% )
  - 참여자 카드 그리드: 이름 표시.
  - 상태 색상: 미투표(중립) / 투표완료(포지티브).
- 상태 처리
  - 로딩: 스피너
  - 빈 상태: “참여자가 없습니다.”
  - 오류: 에러 배너 + 재시도

## 데이터 갱신 전략(실시간)

- 최초 로드: Supabase 쿼리로 스냅샷 수신(team_members + reviews 집계)
- 실시간 반영 옵션:
  - Supabase Realtime(Postgres Changes) 구독: `reviews` 테이블 변경 수신 → 참여자 카드 즉시 업데이트.

## 학생 페이지 연계 체크

- 링크 대상: `/vote/[sessionId]`.
- 서버 제출 시 `sessions.status`가 “진행” 상태인지 검증하여 제출 허용/차단.
- 기존 투표 설계(`docs/feat.review.md`)의 유효성/프리필/업서트 흐름 유지.

## 세션 리스트 변경 사항

- `src/components/sessions/SessionList.tsx`의 각 아이템에 “플레이” 버튼 추가.
- 클릭 시 해당 세션의 현황 페이지(`/sessions/[sessionId]/status`)로 이동.
- 타입 주의: 현재 onSelect는 string 파라미터를 받도록 정의되어 있으므로, 라우팅에서 id 타입(number/string) 일관성 유지가 필요.

## QA/테스트 시나리오

- 권한: 비관리자 접근 차단 확인(페이지/DB 정책 모두).
- 토글: status 전환 및 UI 라벨/색상 반영.
- 리셋: 리뷰 삭제, 상태 초기화, 화면 즉시 반영.
- QR: 링크 정확성(`/vote/{sessionId}`), 스캔 시 학생 페이지 진입.
- 실시간: 리뷰 작성 시 참여자 카드 색상 변경/진행률 갱신.
- 오류/빈 상태: 네트워크 실패, 참여자 0명 처리.

## 구현 작업 순서(제안)

1. 라우팅/페이지 스켈레톤 생성: `/sessions/[sessionId]/status`
2. 세션 리스트에 “플레이” 버튼 노출 및 네비게이션 연결
3. 현황 페이지 상단 토글/리셋 버튼 UI + Confirm/배너 연동
4. GET 상태 API 연동(스냅샷) → 좌/우 패널 기본 렌더링
5. 실시간(구독) 또는 폴링 적용, 카드 색상/진행률 반영
6. 권한/에러/빈 상태 처리 마감 및 테스트 체크리스트 통과

## 추가 메모

- QR 코드 라이브러리: `qrcode.react` 등(접근성: 대체 텍스트 제공).
- 집계 기준(기준 A vs B)은 운영 문서에 명시해 혼선 방지.
