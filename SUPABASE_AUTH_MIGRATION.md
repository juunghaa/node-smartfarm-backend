# Supabase Auth 연동 DB 마이그레이션

최종 수정일: 2026-05-09

## 1) 로컬 PostgreSQL용 SQL

```sql
-- 1. greenhouses에 소유자 컬럼 추가
ALTER TABLE public.greenhouses
ADD COLUMN IF NOT EXISTS user_id text;

-- 2. 기존 데이터 임시 소유자 지정(필요 시 수동 수정)
UPDATE public.greenhouses
SET user_id = 'legacy-local-user'
WHERE user_id IS NULL;

-- 3. NOT NULL 적용
ALTER TABLE public.greenhouses
ALTER COLUMN user_id SET NOT NULL;

-- 4. 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_greenhouses_user_id
ON public.greenhouses (user_id);

CREATE INDEX IF NOT EXISTS idx_greenhouses_user_greenhouse
ON public.greenhouses (user_id, greenhouse_id);
```

## 2) Supabase PostgreSQL용 SQL

```sql
-- Supabase에서도 동일하게 실행 가능
ALTER TABLE public.greenhouses
ADD COLUMN IF NOT EXISTS user_id uuid;

-- 이미 데이터가 있다면 우선 임시 UUID를 넣을 수 없으므로,
-- 운영에서는 실제 사용자와 매핑 후 업데이트하세요.

-- 예시: 특정 온실 소유자 수동 매핑
-- UPDATE public.greenhouses
-- SET user_id = '00000000-0000-0000-0000-000000000000'::uuid
-- WHERE greenhouse_id = 'gh1';

-- 매핑 완료 후 NOT NULL 적용
ALTER TABLE public.greenhouses
ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_greenhouses_user_id
ON public.greenhouses (user_id);

CREATE INDEX IF NOT EXISTS idx_greenhouses_user_greenhouse
ON public.greenhouses (user_id, greenhouse_id);
```

## 3) 서버 환경변수

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_JWT_AUDIENCE=authenticated
```

- 백엔드는 Supabase JWKS로 Access Token을 검증합니다.
- `Authorization: Bearer <access_token>` 헤더가 필수입니다.
