-- ============================================================
-- 숙제 파일 업로드 문제(PDF/ZIP 안 됨) 해결
--  · submissions 버킷의 허용 형식 제한을 풀고, 파일 크기 한도를 50MB로.
--  · 무료(일반) 플랜에서도 SQL Editor 로 실행 가능. (대시보드 토글이 막혀 있어도 됨)
--  Supabase → SQL Editor 에 붙여넣고 Run.
-- ============================================================

-- 1) 현재 설정 확인 (참고용 — 실행하면 결과가 보임)
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'submissions';

-- 2) 모든 형식 허용 + 50MB 한도로 설정
update storage.buckets
set allowed_mime_types = null,          -- null = 모든 형식 허용(이미지·PDF·ZIP 등)
    file_size_limit    = 52428800       -- 50MB (원하면 숫자만 조정)
where id = 'submissions';

-- 3) 다시 확인
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'submissions';
