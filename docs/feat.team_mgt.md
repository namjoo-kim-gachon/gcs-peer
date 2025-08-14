# 팀 구성 관리 기능 설계서 (feat.team_mgt)

문서 버전: 2025-08-14
작성 목적: 세션 상세 페이지에서 멀티라인 텍스트로 팀/팀원 구성을 입력받아 LLM으로 구조화하고 Supabase DB(teams, team_members)에 반영하기 위한 기능 설계.

---

## 1) 요구사항 체크리스트

- [ ] 세션 상세 페이지에 멀티라인 텍스트 입력 UI 추가
- [ ] ChatGPT API(LLM)를 사용해 입력을 구조화(JSON) 변환
- [ ] 구조화된 JSON을 파싱해 DB 스키마에 매핑(teams, team_members)
- [ ] allowed_users 기준으로 팀원 매칭(정확/유사/미확정 처리)
- [ ] 트랜잭션/중복 방지/에러 처리 설계
- [ ] 서버-클라이언트 책임 분리 및 보안(키/권한/RLS 고려)
- [ ] 테스트/검증 계획 수립

---

## 2) 배경과 목표

- 사용자 입력 예시:  
  `1 팀 : 김철수, 영희`  
  `2 팀 : 둘리, 마이콜`
- 입력 후 LLM을 통해 팀/팀원 목록을 일관된 JSON으로 변환 → DB에 저장.
- 목표: 빠르고 일관된 팀 구성 입력, 이름 매칭 오차 최소화, 재실행 시 안전한(idempotent) 반영.

---

## 3) UI/UX 설계 (세션 상세 페이지)

- SessionFormModal 에 이미 있음
- 팀구성 입력을 받고 보여줄 수 있는 멀티라인 텍스트박스만 추가하면 됨

---

## 4) LLM 파싱 설계

- 모델: JSON 스키마 준수 응답을 강제할 수 있는 모델(예: OpenAI Responses API + json_schema) / 온도 0
- 파싱 규칙
  - LLM 에 일임

### 4.1 JSON 스키마(요약)

- root
  - teams: Team[]
- Team
  - name: string (팀명)
  - members: Member[]
- Member
  - name: string (이름)

예시 입력

```text
1 팀 : 김철수, 영희
2 팀 : 둘리, 마이콜
```

예시 출력

```json
{
  "teams": [
    {
      "name": "1팀",
      "members": [{ "name": "김철수" }, { "name": "영희" }]
    },
    {
      "name": "2팀",
      "members": [{ "name": "둘리" }, { "name": "마이콜" }]
    }
  ]
}
```

---

## 5) DB 매핑 설계 (Supabase)

참조: docs/worklog.db.md

- 테이블
  - teams(id PK, session_id FK, name, added_at)
  - team_members(team_id FK, user_id FK→allowed_users.id, added_at)
- 매핑 규칙
  - 팀 생성: teams.name ← team.label(표준형), teams.session_id ← 현재 세션 ID
  - 팀 중복 방지: (session_id, name) 기준 선조회 후 미존재 시 insert
  - 팀원 매핑: allowed_users에서 이름 매칭(정확→대소문자/공백 정규화→한글 정규화→유사도)
    - exact: 1명 일치 → 자동 확정
    - fuzzy: n명 후보 → 사용자 선택 필요
    - none: 후보 없음 → 사용자 선택 필요(검색)
  - team_members 중복 방지: (team_id, user_id) 중복 체크 후 insert
  - 타임스탬프: added_at = now()
- 트랜잭션: 하나의 import 단위를 트랜잭션으로 처리, 부분 실패 시 롤백 + 리포트
- 제약(추후):
  - unique(teams.session_id, teams.name)
  - unique(team_members.team_id, team_members.user_id)

---

## 6) API 설계 (Next.js API Routes)

- POST `/api/teams/parse`
  - 입력: `{ text: string }`
  - 처리: 서버에서 OpenAI 호출 → json_schema 강제 → 구조화 결과 + 경고 반환
  - 출력: `{ teams: Team[], warnings: string[] }`
- POST `/api/teams/import`
  - 입력: `{ sessionId: number, teams: Team[], resolutions?: MemberResolution[] }`
  - 처리: Supabase 서버 SDK(Service Role Key) 사용, 트랜잭션으로 삽입
  - 출력: `{ insertedTeams: number, insertedMembers: number, unresolved: UnresolvedMember[] }`
- 보안
  - 클라이언트에 API 키 노출 금지, 서버 환경변수 사용
  - RLS 정책 고려(서버측 관리자 권한으로 실행), 입력 길이 제한, 레이트 리밋 적용

---

## 7) 엣지 케이스 & 에러 처리

- 형식 변형: `1조-김철수 영희`, `팀1: …`, 괄호/역할 표기
- 중복 팀명/빈 팀/빈 입력/오타 → 미리보기 경고 및 삽입 제외 또는 병합 규칙
- 유사도 충돌(후보 다수) → 사용자 선택 UI로 해소
- allowed_users 미존재 → 선택 대기(신규 추가는 정책상 비권장)
- 재실행: 기존 레코드 건너뛰기, idempotent 보장

---

## 8) 테스트 전략

- 파서 유닛 테스트: 다양한 입력 케이스 → 기대 JSON
- 매칭 유닛 테스트: 이름 정규화/유사도/미확정 분기
- API 통합 테스트: 트랜잭션/중복/롤백
- UI 흐름 테스트: 입력→파싱→미리보기→확정→DB 반영

---

## 9) 구현 순서(권장)

1. UI 골격(텍스트영역/버튼/미리보기 카드) + Mock 데이터로 미리보기
2. `/api/teams/parse` 구현(LLM + fallback) → 프론트 연동
3. allowed_users 검색 API/훅 구현(자동완성)
4. `/api/teams/import` 트랜잭션 구현(idempotent)
5. 미확정 매칭 해소 UI + 재시도 흐름
6. 리포트/로그/에러 배너 정리 + 테스트 보강

---

## 10) 후속 과제(옵션)

- 역할 컬럼 확장(예: team_members.role) 및 notes 매핑
- 감사 로그/변경 이력 저장
- 대규모 입력(수백~수천명) 배치 처리 최적화

---

## 부록: 타입 요약(프런트 내)

```ts
type ParsedMember = {
  display_name: string;
  notes?: string | null;
};

type ParsedTeam = {
  label: string; // 표준형 팀 식별 문자열(예: "1팀")
  name?: string | null; // 별칭
  members: ParsedMember[];
};

type ParseResult = {
  session_label?: string | null;
  teams: ParsedTeam[];
  warnings?: string[];
};

// 매칭/해결 관련
type MemberResolution = {
  teamLabel: string;
  displayName: string;
  resolvedUserId: number; // allowed_users.id
};
```
