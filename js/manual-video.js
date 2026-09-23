/* 매뉴얼 영상 링크 (js/manual-video.js)
   어드민 '매뉴얼 영상' 화면과 수강생 매뉴얼(manual.html)이 같은 규칙으로 판별·렌더한다.
   데이터: manual_chapters.videos = jsonb 배열 [{title, url}]  (supabase/manual-videos.sql)
   링크 형태를 보고 자동으로 정한다:
   · 구글 드라이브 공유 링크      → '영상 보기' 버튼(새 창). 드라이브 임베드는 서드파티 쿠키 차단으로 사이트 안에서 재생되지 않음
   · 유튜브 링크(watch/youtu.be/shorts) → 사이트 안 재생(youtube-nocookie 임베드). vercel.json CSP frame-src 에 허용돼 있음
   · 사이트 안 파일(manual/videos/xxx.mp4, 파일명만 적으면 그 폴더로 보정) → <video> 플레이어
   · 그 외 http(s) 링크           → 새 창 링크
   본문에 <div data-video-slot></div> 가 있으면 그 자리에, 없으면 본문 맨 위에 렌더된다 (manual.html). */
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // url → { kind: 'drive'|'youtube'|'file'|'link'|'bad', href, embed?, label } / 빈 값이면 null
  function parse(url) {
    var s = String(url == null ? '' : url).trim();
    if (!s) return null;
    var m = s.match(/drive\.google\.com\/(?:file\/d\/|open\?(?:[^#]*&)?id=|uc\?(?:[^#]*&)?id=)([\w-]+)/);
    if (m) return { kind: 'drive', id: m[1], href: 'https://drive.google.com/file/d/' + m[1] + '/view', label: '드라이브 · 새 창' };
    m = s.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return { kind: 'youtube', id: m[1], href: 'https://www.youtube.com/watch?v=' + m[1],
                    embed: 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0', label: '유튜브 · 사이트 안 재생' };
    if (/^[a-z][a-z0-9+.\-]*:/i.test(s) && !/^https?:\/\//i.test(s)) return { kind: 'bad', href: '#', label: '사용할 수 없는 링크' };
    var isVideoFile = /\.(mp4|webm|m4v|mov)(\?|#|$)/i;
    if (!/^https?:\/\//i.test(s)) {                       // 스킴 없음 → 사이트 안 경로
      var p = s.replace(/^\/+/, '');
      if (p.indexOf('/') === -1 && isVideoFile.test(p)) p = 'manual/videos/' + p;   // 파일명만 적은 경우
      return { kind: 'file', href: p, label: '사이트 파일 · 플레이어' };
    }
    try {                                                 // 같은 사이트의 절대 주소도 파일로
      var u = new URL(s);
      if (typeof location !== 'undefined' && u.origin === location.origin && isVideoFile.test(u.pathname))
        return { kind: 'file', href: u.pathname.replace(/^\/+/, ''), label: '사이트 파일 · 플레이어' };
    } catch (e) {}
    return { kind: 'link', href: s, label: '외부 링크 · 새 창' };
  }

  // [{title,url}] → 매뉴얼 본문 HTML (쓸 수 있는 링크가 없으면 '')
  function render(list) {
    var arr = Array.isArray(list) ? list : [];
    var html = '';
    arr.forEach(function (v) {
      var p = parse(v && v.url);
      if (!p || p.kind === 'bad') return;
      var title = (v && v.title) ? '<h3 class="subhead">🎬 ' + esc(v.title) + '</h3>' : '';
      var inner;
      if (p.kind === 'file') {
        inner = '<div class="mn-video"><video src="' + esc(p.href) + '" controls preload="metadata" playsinline></video></div>' +
          '<p class="mn-video-note">▶ 재생이 안 되면 브라우저를 새로고침해 주세요. 전체화면 버튼으로 크게 볼 수 있습니다.</p>';
      } else if (p.kind === 'youtube') {
        inner = '<div class="mn-video"><iframe src="' + esc(p.embed) + '" title="' + esc(v.title || '영상') + '" loading="lazy" ' +
          'allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen ' +
          'referrerpolicy="strict-origin-when-cross-origin"></iframe></div>' +
          '<p class="mn-video-note">▶ 전체화면 버튼으로 크게 볼 수 있습니다.</p>';
      } else {
        inner = '<a class="mn-download" href="' + esc(p.href) + '" target="_blank" rel="noopener">▶ 영상 보기 (새 창에서 열림)</a>' +
          '<p class="mn-video-note">' + (p.kind === 'drive' ? '영상은 구글 드라이브에서 새 창으로 재생됩니다. ' : '영상이 새 창에서 열립니다. ') +
          '새 창이 열리지 않으면 브라우저의 팝업 차단을 확인해 주세요.</p>';
      }
      html += '<div class="mn-vitem">' + title + inner + '</div>';
    });
    return html ? '<div class="mn-videos">' + html + '</div>' : '';
  }

  window.ManualVideo = { parse: parse, render: render };
})();
