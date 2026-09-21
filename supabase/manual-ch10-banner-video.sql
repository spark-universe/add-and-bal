-- ============================================================
-- 챕터 10 '메인 배너'(slug=banner) 본문 교체 — 기존 글 매뉴얼 삭제, 영상으로 대체
--  · 기존 PageFly 기반 글/이미지 매뉴얼(36스텝 상당)은 더 이상 쓰지 않아 통째로 걷어낸다.
--  · 본문은 영상 하나로만 구성한다.
--  · 소메뉴(data-subnav)는 항목이 하나뿐이라 넣지 않는다.
--  ※ 반드시 '배포(머지) 후'에 실행할 것. 먼저 실행하면 아직 없는 영상 파일을 가리킨다.
--  Supabase SQL Editor 에서 실행. (영상은 배포로 함께: manual/videos/banner.mp4)
-- ============================================================
update public.manual_chapters set body = $body$<h3 class="subhead">메인 배너</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p><b>히어로 배너</b>는 고객이 스토어에 들어왔을 때 가장 먼저 보이는 영역입니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<div class="mn-video"><video src="manual/videos/banner.mp4" controls preload="metadata" playsinline></video></div>
<p class="mn-video-note">▶ 재생이 안 되면 브라우저를 새로고침해 주세요. 전체화면 버튼으로 크게 볼 수 있습니다.</p>
$body$ where slug = 'banner';

-- 확인 — 영상만 남고 기존 글/이미지가 걷혔는지
select slug, title,
       (body like '%manual/videos/banner.mp4%') as 영상있음,
       (body like '%manual/images/%')           as 옛이미지남음,
       length(body)                             as 본문길이
from public.manual_chapters where slug = 'banner';
