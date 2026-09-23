-- ============================================================
-- 챕터 4 '소싱 앱 소개'(slug=sourcing) 최상단에 비용 안내 추가
--  · 5장(스파크 기본 설정)과 같은 형식의 경고 — 이 챕터의 앱(AutoDS·Zendrop)을 실제로 설치·구독하면 비용이 청구될 수
--    있으니, 지금은 매뉴얼을 정독(눈으로 익히기)만 해도 된다는 안내.
--  · 기존 본문은 그대로 두고 맨 앞에만 덧붙인다. 멱등: 이미 들어가 있으면(data-notice="cost") 건너뜀.
--  Supabase SQL Editor 에서 실행. 머지 불필요(DB 만 바뀜).
-- ============================================================
update public.manual_chapters
set body = $add$<div class="callout danger" data-notice="cost"><div class="callout-label">🚨 꼭 읽어주세요 — 비용 안내</div><p><b>이 단원(소싱 앱 소개)에서 소개하는 앱(AutoDS · Zendrop 등)을 실제로 설치·구독하시면 앱 이용 비용이 청구될 수 있습니다.</b></p><p>지금 바로 설치·연동하지 않아도 됩니다. <b>매뉴얼은 정독(눈으로 익히기)만 하셔도 충분</b>하며, 실제 진행은 준비가 되었을 때 하셔도 됩니다.</p></div>

$add$ || body
where slug = 'sourcing'
  and body is not null
  and body not like '%data-notice="cost"%';

-- 확인 — 본문이 비용 안내로 시작하면 정상
select slug, title, left(body, 60) as 본문시작, (body like '%data-notice="cost"%') as 안내있음
from public.manual_chapters where slug = 'sourcing';
