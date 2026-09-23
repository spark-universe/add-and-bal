-- ============================================================
-- 챕터 11 '카테고리 바로가기'(slug=category) · 12 '추천 상품'(slug=featured) — 글 매뉴얼 삭제, 드라이브 영상 링크로 대체
--  · 기존 글/이미지 본문은 쓸 수 없어 통째로 걷어낸다.
--  · 드라이브 임베드는 서드파티 쿠키 차단으로 사이트 안에서 재생되지 않으므로, '영상 보기' 버튼이 새 창에서 연다.
--    (일반 링크라 CSP 변경 없음. 드라이브 파일은 '링크가 있는 모든 사용자 - 뷰어'로 공유돼 있어야 함)
--  · 링크는 2026-09-23 에 받은 드라이브 공유 링크를 file/d/<ID>/view 형식으로 통일해 넣었다. 영상을 교체하면 이 두 href 만 바꾸면 된다.
--  Supabase SQL Editor 에서 실행. 멱등. 머지 불필요(DB 만 바뀜).
-- ============================================================

-- 11. 카테고리 바로가기
update public.manual_chapters set body = $body$<h3 class="subhead">카테고리 바로가기</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>스토어 메인 화면에서 고객이 원하는 카테고리로 바로 이동하게 해 주는 영역을 만듭니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<a class="mn-download" href="https://drive.google.com/file/d/1Nen9l5Di8But3iERG2Oi_-LEc2W5F50Q/view" target="_blank" rel="noopener">▶ 영상 보기 (새 창에서 열림)</a>
<p class="mn-video-note">영상은 구글 드라이브에서 새 창으로 재생됩니다. 새 창이 열리지 않으면 브라우저의 팝업 차단을 확인해 주세요.</p>
$body$ where slug = 'category';

-- 12. 추천 상품
update public.manual_chapters set body = $body$<h3 class="subhead">추천 상품</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>스토어 메인 화면에 추천 상품(신상품) 영역을 넣어 고객에게 먼저 보여 줄 상품을 배치합니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<a class="mn-download" href="https://drive.google.com/file/d/1DzZdjP9bqE0JfO-6Dqb5ReFE0dooC290/view" target="_blank" rel="noopener">▶ 영상 보기 (새 창에서 열림)</a>
<p class="mn-video-note">영상은 구글 드라이브에서 새 창으로 재생됩니다. 새 창이 열리지 않으면 브라우저의 팝업 차단을 확인해 주세요.</p>
$body$ where slug = 'featured';

-- 확인 — 두 챕터 모두 영상 링크가 들어가고(true) 옛 이미지 참조가 남지 않았는지(false)
select slug, title,
       (body like '%drive.google.com%') as 드라이브링크,
       (body like '%manual/images/%')   as 옛이미지남음,
       length(body)                     as 본문길이
from public.manual_chapters where slug in ('category', 'featured') order by sort;
