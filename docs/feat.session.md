# 세션 관리 – 간단 계획

작성일: 2025-08-13

## 목표

- 세션 CRUD 최소 기능(목록/생성/수정/삭제)과 기본 UX를 2일 내 완성.

## 전제/범위

- 인증 제외, 공개 관리 UI. DB: public.sessions.
- .env.local에 NEXT_PUBLIC_SUPABASE_URL/ANON_KEY 필요.

## 라우팅

- /sessions: 목록 + 생성 버튼
- /sessions/[sessionId]: 상세(스켈레톤, 추후 확장)

## 핵심 컴포넌트

- 공통: PageHeader, EmptyState, ErrorBanner, Spinner, ConfirmDialog
- 세션: SessionList, SessionItem, SessionFormModal

## 데이터 연동

- 목록: from('sessions').select('\*').order('created_at', { ascending: false }).limit(100)
- 생성: insert({ name, description }).select().single()
- 수정: update({ name, description }).eq('id', id).select().single()
- 삭제: delete().eq('id', id)
- 캐시: SWR 키 ['sessions'], 변경 후 mutate

## UX/유효성

- 로딩 스피너, 빈 상태 문구
- 삭제 ConfirmDialog, 성공/실패 토스트/배너
- name: 필수 1~100자, description: 0~500자

## 테스트/품질

- 단위 2~3건(유효성/에러 매핑), 통합 1~2건(목록/생성/삭제)
- next build, ESLint/Prettier 통과

## 일정

- Day 1: 라우팅/스켈레톤 + 목록
- Day 2: 생성/수정/삭제 + 상태/테스트

## 산출물

- pages/sessions 스켈레톤, components/common+sessions 스텁
- utils(supabaseClient, errors) 스텁, types/index.ts(Session)
- README .env 가이드 요약
