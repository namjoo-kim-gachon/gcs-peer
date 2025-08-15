# 로그인 기능 구현 계획

1. **요구사항 정리**
   - Supabase Auth의 구글 OAuth를 사용하여 로그인 처리
   - 회원 가입 없이, allowed_users 테이블에 등록된 이메일만 로그인 허용
   - is_faculty가 TRUE인 경우 교수(관리자)로 모든 화면 접근 가능
   - is_faculty가 FALSE인 경우 학생으로 vote(평가) 화면만 접근 가능

2. **환경 준비**
   - `.env.local`에 Supabase URL/Key 설정
   - `@supabase/supabase-js` 패키지 설치

3. **타입 및 유틸 정의**
   - `src/types/index.ts`에 User 타입 정의 (id, email, isFaculty 등)
   - `src/utils/supabaseClient.ts`에서 Supabase 클라이언트 생성

4. **인증 훅 구현**
   - `src/hooks/useAuth.ts`에서 로그인/로그아웃, 사용자 상태 관리
   - 구글 OAuth 로그인 함수(signInWithGoogle) 구현

5. **로그인 UI**
   - 로그인 버튼 및 상태 표시 컴포넌트 작성
   - 로그인 성공 시 allowed_users 테이블에서 이메일/권한 확인

6. **권한 분기**
   - 로그인 후 is_faculty 값에 따라 라우팅 처리
     - 교수(관리자): sessions 화면으로 이동
     - 학생: vote(평가) 화면만 접근 가능, 그 외 화면 접근 시 권한 거부 처리

7. **에러/UX 처리**
   - 로그인 실패, 권한 없음, 로딩 상태 등 UI 메시지/배너 처리

8. **테스트/검증**
   - 정상 로그인, 권한 분기, 에러 케이스 단위 테스트 작성

9. **문서화**
   - README에 환경변수, 로그인 흐름, 권한 정책 설명 추가
