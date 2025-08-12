# 구현 워크플로: 사전 승인된 구글 로그인

## Phase 1: Supabase 백엔드 설정 (데이터베이스 및 인증 규칙)

1.  **`allowed_emails` 테이블 생성**

    - **목표:** 접근을 허용할 이메일 목록을 저장할 테이블을 만듭니다.
    - **작업:**
      - Supabase Studio (웹 대시보드)의 `Table Editor`로 이동합니다.
      - `allowed_emails` 라는 새 테이블을 생성합니다.
      - 컬럼 정의:
        - `id` (bigint, primary key, auto-increment)
        - `email` (text, **unique**)
        - `created_at` (timestamptz, default: `now()`)
      - **RLS (Row Level Security) 활성화:** 이 테이블은 민감 정보이므로, 기본적으로 접근을 차단하고 관리자만 읽고 쓸 수 있도록 설정합니다.

2.  **인증 후 사용자 검증을 위한 PostgreSQL 함수 생성**

    - **목표:** 새로운 사용자가 `auth.users` 테이블에 추가될 때, 해당 사용자의 이메일이 `allowed_emails`에 있는지 확인하는 DB 함수를 만듭니다.
    - **작업:**
      - Supabase Studio의 `SQL Editor`로 이동합니다.
      - 새로운 사용자의 `id`와 `email`을 인자로 받아, `allowed_emails` 테이블에 이메일이 없으면 사용자를 `auth.users`에서 삭제하는 함수를 작성합니다.
      - 이 함수는 `security_definer` 권한으로 실행되어야 `auth.users` 테이블에 대한 조작이 가능합니다.

3.  **`auth.users` 테이블에 트리거 연결**
    - **목표:** 사용자가 구글 로그인을 통해 `auth.users` 테이블에 처음 삽입(INSERT)될 때마다, 2단계에서 만든 함수를 자동으로 실행시킵니다.
    - **작업:**
      - `SQL Editor`에서 `auth.users` 테이블에 `AFTER INSERT` 트리거를 생성합니다.
      - 이 트리거가 2단계에서 만든 PostgreSQL 함수를 호출하도록 설정합니다.
      - **결과:** 허용되지 않은 이메일로 구글 로그인을 시도하면, 사용자는 Supabase `auth` 스키마에 등록되었다가 즉시 삭제됩니다. 클라이언트 입장에서는 최종적으로 유효한 세션을 받지 못하게 됩니다.

## Phase 2: React 클라이언트 구현 (UI 및 로그인 로직)

4.  **인증 상태 관리 로직 구현**

    - **목표:** 앱 전역에서 사용자의 로그인 상태(세션 정보)를 관리하고, 상태 변경을 감지합니다.
    - **작업:**
      - `useState`와 `useEffect` 훅을 사용하여 `src/App.tsx` 또는 별도의 인증 컨텍스트(Auth Context)에서 세션 상태를 관리합니다.
      - `useEffect` 내에서 `supabase.auth.onAuthStateChange` 리스너를 구독하여 로그인, 로그아웃 등 인증 상태 변경을 실시간으로 감지하고 세션 상태를 업데이트합니다.

5.  **로그인/로그아웃 UI 컴포넌트 생성**

    - **목표:** 사용자에게 구글 로그인 버튼과 로그아웃 버튼을 제공합니다.
    - **작업:**
      - `Login.tsx` 같은 컴포넌트를 생성합니다.
      - 세션이 없을 경우: "Google로 로그인" 버튼을 표시합니다.
        - 버튼 클릭 시 `supabase.auth.signInWithOAuth({ provider: 'google' })` 함수를 호출합니다.
      - 세션이 있을 경우: 사용자 이메일과 "로그아웃" 버튼을 표시합니다.
        - 버튼 클릭 시 `supabase.auth.signOut()` 함수를 호출합니다.

6.  **인증 상태에 따른 라우팅 처리**
    - **목표:** 로그인한 사용자에게만 내부 페이지를 보여주고, 로그인하지 않은 사용자는 로그인 페이지로 리디렉션합니다.
    - **작업:**
      - `src/App.tsx`에서 세션 존재 여부에 따라 조건부 렌더링을 적용합니다.
      - 세션이 있으면: 앱의 메인 콘텐츠(대시보드 등)를 보여줍니다.
      - 세션이 없으면: 5단계에서 만든 `Login` 컴포넌트를 보여줍니다.
