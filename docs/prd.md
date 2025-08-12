# 서비스 기획서 (Product Requirements Document)

## 프로젝트명

GCS Peer (React + Supabase 기반 웹앱)

## 기술 스택

- React (TypeScript)
- Vite
- Supabase
- 기타: ESLint, Prettier, GitHub Copilot

## 주요 기능

### 회원 로그인 (Supabase Auth)

- 회원가입은 없음. 사전에 관리자가 allowed_emails 라는 테이블에 접근 가능한 구글 이메일을 등록할 예정.
- supabase 의 구글 로그인 기능을 활용해서 로그인 및 인증을 처리하고자 함.
