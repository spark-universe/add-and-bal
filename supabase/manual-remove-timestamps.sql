-- 이미 DB에 들어간 매뉴얼 본문에서 "최종 업데이트 시간: ..." 문단을 제거
-- (seed 는 이미 정리됨. 이 SQL 은 기존에 불러온 DB 내용을 직접 청소한다.)
update public.manual_chapters
set body = regexp_replace(body, '<p>최종 업데이트 시간:[^<]*</p>\s*', '', 'g')
where body like '%최종 업데이트 시간%';
