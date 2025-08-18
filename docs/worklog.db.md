# DB 테이블 구조 정리 (2025-08-13)

## public 스키마

### allowed_users

- name (text, PK)
- email (text, unique)
- is_faculty (boolean)
- description (text)
- created_at (timestamp with time zone)

### team_members

session_id (bigint, PK)
team_name (text, NOT NULL)
user_name (text, PK)

### reviews

session_id (bigint, PK)
user_name (text, PK)
peer_name (text, PK)
contrib_rate (double precision, NOT NULL)
is_fit (boolean, nullable)
created_at (timestamp with time zone)
description (text, nullable)

### sessions

- id (bigint, PK)
- name (text)
- description (text)
- status (int, NOT NULL, default 0)
- created_at (timestamp with time zone)

## auth.users 테이블

- id (uuid, PK)
- instance_id (uuid)
- aud (varchar)
- role (varchar)
- email (varchar)
- encrypted_password (varchar)
- email_confirmed_at (timestamp with time zone)
- invited_at (timestamp with time zone)
- confirmation_token (varchar)
- confirmation_sent_at (timestamp with time zone)
- recovery_token (varchar)
- recovery_sent_at (timestamp with time zone)
- email_change_token_new (varchar)
- email_change (varchar)
- email_change_sent_at (timestamp with time zone)
- last_sign_in_at (timestamp with time zone)
- raw_app_meta_data (jsonb)
- raw_user_meta_data (jsonb)
- is_super_admin (boolean)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- phone (text, unique)
- phone_confirmed_at (timestamp with time zone)
- phone_change (text)
- phone_change_token (varchar)
- phone_change_sent_at (timestamp with time zone)
- confirmed_at (timestamp with time zone, generated)
- email_change_token_current (varchar)
- email_change_confirm_status (smallint)
- banned_until (timestamp with time zone)
- reauthentication_token (varchar)
- reauthentication_sent_at (timestamp with time zone)
- is_sso_user (boolean)
- deleted_at (timestamp with time zone)
- is_anonymous (boolean)

### 주요 관계

team_members.session_id → sessions.id (FK)
team_members.user_name → allowed_users.name (FK)

reviews.session_id → sessions.id (FK)
reviews.user_name → allowed_users.name (FK)
reviews.peer_name → allowed_users.name (FK)

- auth.users.id는 여러 인증 관련 테이블의 FK로 사용됨
