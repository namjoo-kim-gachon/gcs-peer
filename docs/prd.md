# 서비스 기획서 (Product Requirements Document)

## 프로젝트명

GCS Peer (React + Supabase 기반 웹앱)

## 기술 스택

- React (TypeScript)
- Next.js
- Supabase
- Vercel
- 기타: ESLint, Prettier, GitHub Copilot

## 주요 기능

### 회원 로그인 (Supabase Auth)

- 회원 가입은 없다.
- 사전에 관리자가 allowed_users 라는 테이블에 접근 가능한 구글 이메일을 등록할 예정.
- supabase 의 구글 로그인 기능을 활용해서 로그인 및 인증을 처리하고자 함.

### 화면 접근 권한

- 별도의 언급이 없는한 allowed_users 테이블에 is_faculty 컬럼이 TRUE 인 사람만 접근 가능하다.

### 세션 관리

- 피어 평가는 세션 단위로 진행된다.
- 세션을 관리하기 위한 UI 가 필요하다.
- 세션에는 여러 팀이 있다.
- 팀에는 팀멤버들이 있다.

### 학생 화면

- is_faculty 가 false 인 경우에도 접근할 수 있다.
- 평가만 진행하는 간단한 페이지이다.
