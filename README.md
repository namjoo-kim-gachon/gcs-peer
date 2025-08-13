# GCS Peer 웹앱

GCS Peer는 React와 Supabase를 기반으로 한 웹 애플리케이션입니다. 이 프로젝트는 사용자 인증, 세션 관리 및 평가 기능을 제공하는 것을 목표로 합니다.

## 기술 스택

- React (TypeScript)
- Next.js
- Supabase
- Vercel
- ESLint
- Prettier

## 설치 방법

1. 이 저장소를 클론합니다.
   ```
   git clone <repository-url>
   ```

2. 프로젝트 디렉토리로 이동합니다.
   ```
   cd gcs-peer
   ```

3. 의존성을 설치합니다.
   ```
   npm install
   ```

4. 개발 서버를 시작합니다.
   ```
   npm run dev
   ```

5. 브라우저에서 `http://localhost:3000`에 접속하여 애플리케이션을 확인합니다.

## 주요 기능

- **회원 로그인**: Supabase Auth를 사용하여 구글 계정으로 로그인합니다.
- **세션 관리**: 피어 평가를 위한 세션 관리 UI 제공.
- **학생 화면**: 평가 기능을 제공하는 간단한 페이지.

## 기여 방법

기여를 원하시는 분은 이 저장소를 포크한 후, 변경 사항을 커밋하고 풀 리퀘스트를 제출해 주세요.

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.