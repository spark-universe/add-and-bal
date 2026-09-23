/* =========================================================
   공용 달력 렌더러 — 수강생 '일정 보기' · 어드민 '캘린더 보기'가 함께 사용
   - 주(week) 단위 행으로 그린다. 기간이 있는 항목(숙제 시작~마감)은 그 주 안에서
     하나의 막대(bar)로 이어 그리므로 칸 사이에서 끊기지 않는다. 주가 바뀔 때만 끊기고,
     이어지는 쪽 모서리는 각지게(cont-l / cont-r) 그려 "계속됨"이 보인다.
   - 사용:
       Cal.render(el, {
         year, month,            // month: 0~11
         todayISO,               // 'YYYY-MM-DD' (오늘 칸 강조)
         spans: [{ start: Date, end: Date, cls: 'todo|soon|done|over|hidden', label: HTML, attrs: 'data-id="1" title="..."' }],
         items: { [day]: [chipHTML, ...] }   // 날짜 칸 안에 넣을 칩(HTML 완성본, .cal__ev)
         dayCls: { [day]: 'is-holiday' }   // (선택) 날짜 칸에 붙일 클래스 — 휴일 색칠 등
       })
   - 클릭 구분은 호출 쪽이 attrs 로 넘긴 data-* 로 한다 (막대는 .cal__lanes 안에 있어 칸 밖이다)
   - label/attrs 는 호출 쪽에서 esc() 처리해 넘길 것
   ========================================================= */
(function () {
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  var LANE_H = 22;   // 막대 한 줄 높이(px) — css .cal__bar 높이 + 간격과 맞춤

  function pad(n) { return String(n).padStart(2, '0'); }
  function isoOf(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  function render(el, opt) {
    var y = opt.year, m = opt.month;
    var first = new Date(y, m, 1).getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var items = opt.items || {};
    var monthStart = new Date(y, m, 1), monthEnd = new Date(y, m, days);

    // 기간 → 이 달 안의 [sd, ed](1-based 일). 달 밖으로 이어지면 contL/contR
    var spans = (opt.spans || []).map(function (s) {
      if (!s.start) return null;
      var a = dayStart(s.start), b = dayStart(s.end || s.start);
      if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
      if (b < a) { var t = a; a = b; b = t; }
      if (b < monthStart || a > monthEnd) return null;
      var contL = a < monthStart, contR = b > monthEnd;
      return { s: s, sd: contL ? 1 : a.getDate(), ed: contR ? days : b.getDate(), contL: contL, contR: contR };
    }).filter(Boolean).sort(function (p, q) {   // 시작 빠른 순, 같으면 긴 것 먼저 (레인이 깔끔하게 쌓임)
      return (p.sd - q.sd) || ((q.ed - q.sd) - (p.ed - p.sd));
    });

    var html = '<div class="cal__head">' + WD.map(function (w) { return '<div class="cal__wd">' + w + '</div>'; }).join('') + '</div>';
    var day = 1, weekIdx = 0;
    while (day <= days) {
      var startCol = weekIdx === 0 ? first : 0;
      var wFirst = day, cells = '';
      for (var col = 0; col < 7; col++) {
        if (col < startCol || day > days) { cells += '<div class="cal__cell is-empty"></div>'; continue; }
        var isToday = opt.todayISO === isoOf(y, m, day);
        cells += '<div class="cal__cell' + (isToday ? ' is-today' : '') + (opt.dayCls && opt.dayCls[day] ? ' ' + opt.dayCls[day] : '') + '" data-day="' + day + '">' +
          '<span class="cal__num">' + day + '</span>' + (items[day] || []).join('') + '</div>';
        day++;
      }
      var wLast = day - 1;

      // 이 주에 걸친 막대 → 겹치지 않게 레인 배정
      var lanes = [], bars = '';
      spans.forEach(function (p) {
        if (p.ed < wFirst || p.sd > wLast) return;
        var c0 = startCol + Math.max(p.sd, wFirst) - wFirst;
        var c1 = startCol + Math.min(p.ed, wLast) - wFirst;
        var lane = 0;
        for (; ; lane++) {
          var row = lanes[lane] || (lanes[lane] = []);
          var clash = row.some(function (r) { return !(c1 < r.c0 || c0 > r.c1); });
          if (!clash) { row.push({ c0: c0, c1: c1 }); break; }
        }
        var cl = p.sd < wFirst || (p.contL && wFirst === 1);      // 이전 주/달에서 이어짐
        var cr = p.ed > wLast || (p.contR && wLast === days);     // 다음 주/달로 이어짐
        var li = cl ? 0 : 2, ri = cr ? 0 : 2;                     // 이어지는 쪽은 여백 없이 끝까지
        var left = (c0 * 100 / 7).toFixed(4) + '% + ' + li + 'px';
        var width = ((c1 - c0 + 1) * 100 / 7).toFixed(4) + '% - ' + (li + ri) + 'px';
        bars += '<span class="cal__bar ' + (p.s.cls || 'todo') + (cl ? ' cont-l' : '') + (cr ? ' cont-r' : '') + '"' +
          ' style="left:calc(' + left + ');width:calc(' + width + ');top:' + (lane * LANE_H) + 'px;"' +
          (p.s.attrs ? ' ' + p.s.attrs : '') + '>' + (p.s.label || '') + '</span>';
      });

      html += '<div class="cal__week" style="--lanes:' + lanes.length + ';">' + cells +
        '<div class="cal__lanes">' + bars + '</div></div>';
      weekIdx++;
    }
    el.innerHTML = html;
  }

  // 'YYYY-MM-DD' 범위(양끝 포함) 중 (y, m) 달에 드는 날마다 fn(day) — 휴일 칸 색칠 등에 사용
  function eachDay(fromISO, toISO, y, m, fn) {
    if (!fromISO || !toISO) return;
    var d = new Date(fromISO + 'T00:00:00'), end = new Date(toISO + 'T00:00:00');
    if (isNaN(d.getTime()) || isNaN(end.getTime())) return;
    for (; d <= end; d.setDate(d.getDate() + 1)) if (d.getFullYear() === y && d.getMonth() === m) fn(d.getDate());
  }

  window.Cal = { render: render, isoOf: isoOf, eachDay: eachDay };
})();
