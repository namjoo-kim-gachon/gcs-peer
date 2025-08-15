# 피어 투표(리뷰) 화면 설계

아래는 DB 구조를 분석해 세션별 피어 투표 화면을 설계·계획한 문서입니다. 참고: [`docs/worklog.db.md`](docs/worklog.db.md), 학생 화면 요구사항: [`docs/prd.md`](docs/prd.md), 세션별 팀원 조회 API: [`src/pages/api/sessions/teams.ts`](src/pages/api/sessions/teams.ts)

## DB 구조 요약(핵심만)

- 세션: sessions(id PK, name, description, created_at) — [`docs/worklog.db.md`](docs/worklog.db.md)
- 팀 구성: team_members(session_id, team_name, user_name) — 동일 세션 내 팀과 팀원 소속 정보를 유지
- 리뷰/투표: reviews(session_id, user_name, peer_name, contrib_rate, is_fit) — PK(session_id, user_name, peer_name)로 한 세션에서 한 사용자가 각 피어에 대해 1건씩 기록
- 사용자 화이트리스트: allowed_users(name PK, email unique, is_faculty) — 로그인 사용자 ↔ 표시명(name) 매핑

## 사용자 시나리오(학생용)

- 진입: 인증 후 세션 링크(/vote/[sessionId])로 접근
- 초기 로드:
  - 내 표시명 파악: allowed_users.email == 로그인 이메일 → allowed_users.name
  - 팀원 목록 로드: GET /api/sessions/teams?sessionId=... 사용(구현됨) → 팀 이름/멤버 목록 확보: [`src/pages/api/sessions/teams.ts`](src/pages/api/sessions/teams.ts)
  - 내 팀 식별: 응답에서 내 name이 포함된 team 한 개를 선택
  - 기존 투표 불러오기(있다면): GET /api/reviews/my?sessionId=... (신규)
- 입력:
  - 기여율(contrib_rate): 내 팀 멤버 “전체(본인 포함)” 슬라이더 합계 100
  - 팀 적합도(is_fit): “타 팀원”에 대해서만 예/아니오 토글(본인은 제외)
- 제출:
  - POST /api/reviews/submit (신규): 서버에서 user_name을 로그인 사용자로 강제 매핑, (session_id, user_name, peer_name) 기준 upsert
- 완료/재접속:
  - 제출 성공 후 재접속 시 기존 값 프리필, 재제출 가능(덮어쓰기)

## 화면 설계(구성 요소/상태)

- 상단
  - 세션명, 팀명 표시
  - 안내 문구: “팀원 기여율 합계가 100이 되도록 슬라이더를 조정하세요. 적합도는 본인을 제외한 팀원에게만 표시됩니다.”
- 본문
  - 기여율 섹션
    - 팀원 리스트(본인 포함) × 기여율 슬라이더(0~100)
    - 합계 표시(실시간): 합계가 100이 아니면 오류 배너/버튼 비활성
  - 적합도 섹션
    - 팀원 리스트(본인 제외) × 예/아니오 토글
- 하단
  - 임시 저장(선택) 버튼: 로컬 저장소에 임시 보관
  - 제출 버튼: 유효성 통과 시 활성화
- 상태 처리
  - 로딩: 스피너, 프리필 준비 중
  - 빈 상태: “팀 구성 정보가 없습니다.” 안내(팀 미배정시)
  - 에러: 데이터 로드 실패/제출 실패 배너 + 재시도

## 유효성 규칙

- 기여율
  - 모든 팀원(본인 포함)에 대해 값 필수, 정수(또는 1% 단위)
  - 합계 정확히 100
- 적합도
  - 본인 제외 대상만 입력 가능
- 데이터 일치
  - team_members로 받은 팀원 목록과 투표 대상 일치해야 함(누락/추가 불가)

## 데이터 플로우/쿼리

- 팀원 조회: GET [`src/pages/api/sessions/teams.ts`](src/pages/api/sessions/teams.ts) → [{ teamName, members: string[] }]
- 내 표시명 조회: allowed_users where email = currentUser.email → name (클라이언트 또는 서버 API에서 수행)
- 기존 리뷰 조회(신규): GET /api/reviews/my
  - 입력: sessionId
  - 처리: reviews where session_id = :sessionId and user_name = :me
  - 출력: [{ peer_name, contrib_rate, is_fit }]
- 제출(신규): POST /api/reviews/submit
  - 입력: { sessionId, entries: [{ peer_name, contrib_rate, is_fit? }] }
  - 서버 검증:
    - user_name = 로그인 사용자(allowed_users 매핑)로 강제
    - peer_name들이 현재 팀원 목록과 정확히 일치하는지 확인(본인 포함), 누락/추가 방지
    - contrib_rate 합계 100 확인
  - 저장: upsert(reviews) on conflict(session_id, user_name, peer_name)

## 보안/권한

- 접근: 학생 화면은 is_faculty 여부와 무관하게 접근 허용(`docs/prd.md`)
- 신뢰 경계: 클라이언트가 user_name을 보내지 않도록 하고, 서버가 로그인 이메일→allowed_users.name으로 확정
- RLS(권장):
  - reviews: user_name이 현재 사용자(allowed_users.name)인 행만 select/insert/update 가능
- 레이트 리밋: 제출 API에 기본 레이트 리밋 적용(중복요청 방지)

## 에러/엣지 케이스

- allowed_users에 사용자가 없음: 접근 불가 안내 후 연락 방법 제공
- 팀 미배정: “아직 팀 배정 전” 메시지 노출, 제출 불가
- 중복 제출: upsert로 최신 제출만 유지
- 네트워크 실패: 로컬 임시 저장 + 재시도 버튼
- 세션 종료(옵션): 서버에서 세션 종료 플래그가 있으면 제출 차단

## QA/테스트 시나리오

- 합계 검증: 100 미만/초과 시 버튼 비활성, 100일 때만 활성
- 프리필: 기존 투표가 정확히 불러와지는지
- 본인 fit 제외: 본인 항목에 fit 입력 불가
- 팀 변경(드문 케이스): 팀 목록이 변경되면 기존 리뷰와 불일치 경고
- 권한: 타 사용자의 user_name으로 제출 시도가 서버에서 차단되는지(RLS 또는 서버 검증)

## 단계별 작업 목록

- Day 1
  - 라우팅 스켈레톤(/vote/[sessionId])
  - 데이터 훅 설계: 팀원 로드(GET), 내 표시명 로드
  - UI 뼈대: 슬라이더/토글 리스트, 합계 표시
- Day 2
  - 유효성/프리필 연동(GET /api/reviews/my)
  - 제출 API 설계/구현(POST /api/reviews/submit), 서버 검증/업서트
  - 오류/빈 상태/로딩 UX
- Day 3
  - RLS/권한 검증, 레이트 리밋
  - 에지 케이스/리그레션 테스트
  - 접근성/키보드 조작/모바일 슬라이더 튜닝

## 재사용/연계 포인트

- 팀원 조회는 이미 있는 API 재사용: [`src/pages/api/sessions/teams.ts`](src/pages/api/sessions/teams.ts)
- 세션 목록/네비게이션은 기존 세션 관리 화면과 연결 가능: [`src/pages/sessions/index.tsx`](src/pages/sessions/index.tsx)

## 산출물

- 화면 명세서(와이어프레임), 상태/유효성 표, API 스펙 문서(GET /api/reviews/my, POST /api/reviews/submit)
- 테스트 체크리스트 및 완료 기준(합계=100, 프리필, 권한, 에러 처리)
