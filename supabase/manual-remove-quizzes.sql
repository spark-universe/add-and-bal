-- ============================================================
-- 모든 매뉴얼 챕터에서 '확인 문제'(callout quiz) 블록 일괄 제거
--  · manual_chapters.body 안의 <div class="callout quiz">...</ol></div> 를 삭제
--  · 매뉴얼 본문의 유일한 <ol> 은 quiz-list 뿐이라(번호목록 없음) 다른 내용은 안 건드림
--  · 비탐욕(*?) 매칭 + 전역(g). 멱등(여러 번 실행해도 안전).
--  Supabase SQL Editor 에서 실행.
-- ============================================================
update public.manual_chapters
set body = regexp_replace(body, '<div class="callout quiz">.*?</ol></div>', '', 'g')
where body like '%callout quiz%';
