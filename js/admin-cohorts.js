/* =========================================================
   어드민 · 기수(코호트) 관리
   - cohorts 테이블 CRUD (번호는 자동, 이름은 어드민이 지정)
   - 수강생 수는 profiles.cohort 로 집계
   - 삭제는 막고(배정된 수강생/과제 보호) 노출 토글만 제공
   ========================================================= */
(function () {
  var cohorts = [];
  var studentsByCohort = {};   // 기수번호 → 승인된 수강생 목록
  var unassigned = [];         // 미분류(미승인 또는 기수 미배정)

  var els = {
    newLabel: document.getElementById('newLabel'),
    newEnroll: document.getElementById('newEnroll'),
    addBtn: document.getElementById('addBtn'),
    saved: document.getElementById('saved'),
    body: document.getElementById('coBody'),
    count: document.getElementById('coCount'),
  };

  // esc 는 js/util.js 의 공통 함수 사용
  function flash() {
    els.saved.hidden = false;
    setTimeout(function () { els.saved.hidden = true; }, 2000);
  }

  function render() {
    els.count.textContent = cohorts.length ? '(' + cohorts.length + '개)' : '';
    if (!cohorts.length) {
      els.body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px;">' +
        '등록된 기수가 없습니다.</td></tr>';
      return;
    }
    var rows = cohorts.map(function (c, i) {
      var n = (studentsByCohort[c.id] || []).length;
      return '<tr' + (c.active ? '' : ' style="opacity:0.5;"') + '>' +
        '<td>' + (i + 1) + '</td>' +
        '<td><b style="font-size:0.95rem;">' + esc(c.label) + '</b></td>' +
        '<td>' +
          '<input type="date" class="co-enroll" data-id="' + c.id + '" value="' + esc(c.enroll_date || '') +
          '" style="padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-size:0.95rem;font-weight:600;' +
          'color:var(--text);font-family:inherit;"></td>' +
        '<td><button class="btn-link" data-act="students" data-id="' + c.id + '">' + n + '명</button></td>' +
        '<td><button class="btn-sm" data-act="toggle" data-id="' + c.id + '">' +
          (c.active ? '노출중' : '숨김') + '</button></td>' +
        '<td>' +
          '<a class="btn-link" href="manual-schedule.html?cohort=' + c.id + '">매뉴얼 공개</a> ' +
          '<button class="btn-link" data-act="rename" data-id="' + c.id + '">이름 변경</button> ' +
          '<button class="btn-link danger" data-act="del" data-id="' + c.id + '">삭제</button>' +
        '</td>' +
      '</tr>';
    }).join('');
    // 미분류: 아직 승인 안 됐거나 기수 미배정인 수강생 (승인 시 기수가 배정됨)
    var extra = '<tr style="background:#fafbfc;">' +
      '<td style="color:var(--muted);">–</td>' +
      '<td style="text-align:center;"><b>미분류</b> <span style="color:var(--muted);font-weight:400;font-size:0.82rem;">(미승인·기수 미배정)</span></td>' +
      '<td style="text-align:center;color:var(--muted);">–</td>' +
      '<td><button class="btn-link" data-act="students" data-id="0">' + unassigned.length + '명</button></td>' +
      '<td style="color:var(--muted);">–</td>' +
      '<td style="color:var(--muted);font-size:0.85rem;">승인 시 기수가 배정됩니다</td>' +
      '</tr>';
    els.body.innerHTML = rows + extra;
  }

  els.addBtn.addEventListener('click', async function () {
    var label = els.newLabel.value.trim();
    if (!label) { alert('기수 이름을 입력하세요.'); return; }
    var nextId = cohorts.reduce(function (m, c) { return Math.max(m, c.id); }, 0) + 1;

    var enroll = els.newEnroll.value.trim() || null;
    els.addBtn.disabled = true;
    var res = await sb.from('cohorts').insert({ id: nextId, label: label, enroll_date: enroll });
    els.addBtn.disabled = false;
    if (res.error) { alert('추가 실패: ' + res.error.message); return; }
    els.newLabel.value = '';
    els.newEnroll.value = '';
    flash();
    await load();
  });

  els.body.addEventListener('click', async function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var id = Number(btn.dataset.id);
    if (btn.dataset.act === 'students') { openStudents(id); return; }   // 미분류(0) 포함
    var c = cohorts.find(function (x) { return x.id === id; });
    if (!c) return;

    if (btn.dataset.act === 'rename') {
      var label = prompt('기수 이름(어드민 전용)을 입력하세요:', c.label);
      if (label == null) return;
      label = label.trim();
      if (!label) { alert('이름은 비울 수 없습니다.'); return; }
      var r = await sb.from('cohorts').update({ label: label }).eq('id', id);
      if (r.error) { alert('변경 실패: ' + r.error.message); return; }
      await load();
      return;
    }
    if (btn.dataset.act === 'toggle') {
      var t = await sb.from('cohorts').update({ active: !c.active }).eq('id', id);
      if (t.error) { alert('변경 실패: ' + t.error.message); return; }
      await load();
      return;
    }
    if (btn.dataset.act === 'del') { openDelete(c); return; }
  });

  /* ---------- 기수별 수강생 목록 ---------- */
  var stuModal = document.getElementById('stuModal');
  var stuBody = document.getElementById('stuBody');
  function stuSelCount() {
    var n = stuBody.querySelectorAll('.stu-pick:checked').length;
    document.getElementById('stuSelCount').textContent = '선택 ' + n + '명';
  }
  function fillMoveTargets(excludeId) {
    var opts = cohorts.filter(function (c) { return c.id !== excludeId; }).map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.label) + (c.enroll_date ? ' · ' + esc(c.enroll_date) : '') + ' (으)로</option>';
    }).join('');
    if (excludeId !== 0) opts += '<option value="0">미분류 (으)로</option>';
    document.getElementById('stuMoveTarget').innerHTML = opts || '<option value="">옮길 기수 없음</option>';
  }
  function openStudents(id) {
    var list = (id === 0) ? unassigned : (studentsByCohort[id] || []);
    var name = (id === 0) ? '미분류' : ((cohorts.find(function (x) { return x.id === id; }) || {}).label || ('기수 ' + id));
    document.getElementById('stuTitle').textContent = name + ' 수강생 (' + list.length + '명)';
    stuBody.innerHTML = list.length
      ? list.map(function (p) {
          var st = p.status === 'approved' ? '<span class="tag tag--ok">승인</span>'
            : (p.status === 'rejected' ? '<span class="tag tag--no">거절</span>' : '<span class="tag tag--wait">대기</span>');
          return '<tr><td style="text-align:center;"><input type="checkbox" class="stu-pick" data-id="' + p.id + '"></td>' +
            '<td style="text-align:left;">' + esc(p.name || '-') + '</td>' +
            '<td style="text-align:left;color:var(--muted);word-break:break-all;">' + esc(p.email || '-') + '</td>' +
            '<td style="text-align:center;">' + st + '</td></tr>';
        }).join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px;">해당 수강생이 없습니다.</td></tr>';
    fillMoveTargets(id);
    var allc = document.getElementById('stuAll'); if (allc) allc.checked = false;
    stuSelCount();
    stuModal.classList.add('is-open');
  }
  document.getElementById('stuClose').addEventListener('click', function () { stuModal.classList.remove('is-open'); });
  stuModal.addEventListener('click', function (e) { if (e.target === stuModal) stuModal.classList.remove('is-open'); });
  document.getElementById('stuAll').addEventListener('change', function () {
    var on = this.checked;
    stuBody.querySelectorAll('.stu-pick').forEach(function (b) { b.checked = on; });
    stuSelCount();
  });
  stuBody.addEventListener('change', function (e) { if (e.target.classList.contains('stu-pick')) stuSelCount(); });
  document.getElementById('stuMoveBtn').addEventListener('click', async function () {
    var ids = [];
    stuBody.querySelectorAll('.stu-pick:checked').forEach(function (b) { ids.push(b.dataset.id); });
    if (!ids.length) { alert('이동할 수강생을 선택하세요.'); return; }
    var tv = document.getElementById('stuMoveTarget').value;
    if (tv === '') { alert('옮길 기수가 없습니다.'); return; }
    var target = Number(tv);
    var tc = cohorts.find(function (x) { return x.id === target; });
    var tName = target === 0 ? '미분류' : ((tc || {}).label || ('기수 ' + target));
    if (!confirm('선택한 ' + ids.length + '명을 "' + tName + '"(으)로 이동할까요?')) return;
    this.disabled = true;
    var res = await sb.from('profiles')
      .update({ cohort: target, enroll_date: (tc && tc.enroll_date) ? tc.enroll_date : null })
      .in('id', ids).select('id');
    this.disabled = false;
    if (res.error) { alert('이동 실패: ' + res.error.message); return; }
    stuModal.classList.remove('is-open');
    await load();
    alert((res.data || []).length + '명 이동 완료');
  });

  /* ---------- 기수 삭제 ---------- */
  var delModal = document.getElementById('delModal');
  var delEls = {
    info: document.getElementById('delInfo'),
    moveWrap: document.getElementById('delMoveWrap'),
    target: document.getElementById('delTarget'),
    empty: document.getElementById('delEmpty'),
    unassign: document.getElementById('delUnassign'),
    move: document.getElementById('delMove'),
    cancel: document.getElementById('delCancel'),
    close: document.getElementById('delClose'),
  };
  var delId = null, delHw = 0;

  function closeDel() { delModal.classList.remove('is-open'); delId = null; }
  delEls.cancel.addEventListener('click', closeDel);
  delEls.close.addEventListener('click', closeDel);
  delModal.addEventListener('click', function (e) { if (e.target === delModal) closeDel(); });

  async function openDelete(c) {
    if (cohorts.length <= 1) { alert('기수가 하나뿐이라 삭제할 수 없습니다.'); return; }
    delId = c.id;
    var students = (studentsByCohort[c.id] || []).length;
    var hw = await sb.from('challenges').select('id', { count: 'exact', head: true }).eq('cohort', c.id);
    delHw = hw.count || 0;

    delEls.info.innerHTML = '<b>' + esc(c.label) + '</b> 기수를 삭제합니다.<br>' +
      '학생 <b>' + students + '명</b>, 숙제 <b>' + delHw + '개</b>.';

    // 버튼/이동옵션 표시 결정
    delEls.empty.hidden = students > 0;
    delEls.unassign.hidden = students === 0;
    delEls.move.hidden = students === 0;
    delEls.moveWrap.hidden = students === 0;

    if (students > 0) {
      var others = cohorts.filter(function (x) { return x.id !== c.id; });
      delEls.target.innerHTML = others.map(function (x) {
        return '<option value="' + x.id + '">' + esc(x.label) + (x.enroll_date ? ' · ' + esc(x.enroll_date) : '') + '</option>';
      }).join('');
      delEls.info.innerHTML += '<br><span style="color:var(--muted);font-size:0.85rem;">' +
        '· 이동 후 삭제: 학생을 고른 기수로 옮기고(그 기수 숙제를 봄), 이 기수 숙제는 삭제<br>' +
        '· 미분류로 삭제: 학생·숙제를 미분류로 두고 기수만 삭제</span>';
    } else {
      delEls.info.innerHTML += '<br><span style="color:var(--muted);font-size:0.85rem;">학생이 없어 숙제와 함께 바로 삭제됩니다.</span>';
    }
    delModal.classList.add('is-open');
  }

  async function finishDelete() { closeDel(); await load(); }

  // 학생 없음 → 기수 + 숙제 삭제
  delEls.empty.addEventListener('click', async function () {
    var id = delId; if (id == null) return;
    var dh = await sb.from('challenges').delete().eq('cohort', id);
    if (dh.error) { alert('숙제 삭제 실패: ' + dh.error.message); return; }
    var dc = await sb.from('cohorts').delete().eq('id', id);
    if (dc.error) { alert('기수 삭제 실패: ' + dc.error.message); return; }
    await finishDelete();
  });

  // 다른 기수로 이동 후 삭제
  delEls.move.addEventListener('click', async function () {
    var id = delId; if (id == null) return;
    var target = Number(delEls.target.value);
    if (!target) { alert('옮길 기수를 고르세요.'); return; }
    if (!confirm('학생을 "' + (cohorts.find(function (x){return x.id===target;})||{}).label + '"(으)로 옮기고 이 기수를 삭제할까요?\n이 기수의 숙제·제출물은 삭제됩니다.')) return;
    var mp = await sb.from('profiles').update({ cohort: target }).eq('cohort', id);
    if (mp.error) { alert('학생 이동 실패: ' + mp.error.message); return; }
    var dh = await sb.from('challenges').delete().eq('cohort', id);
    if (dh.error) { alert('숙제 삭제 실패: ' + dh.error.message); return; }
    var dc = await sb.from('cohorts').delete().eq('id', id);
    if (dc.error) { alert('기수 삭제 실패: ' + dc.error.message); return; }
    await finishDelete();
  });

  // 미분류로 삭제 (학생·숙제 cohort=0)
  delEls.unassign.addEventListener('click', async function () {
    var id = delId; if (id == null) return;
    if (!confirm('학생과 숙제를 미분류로 두고 이 기수를 삭제할까요?')) return;
    var mp = await sb.from('profiles').update({ cohort: 0 }).eq('cohort', id);
    if (mp.error) { alert('학생 미분류 처리 실패: ' + mp.error.message); return; }
    var mh = await sb.from('challenges').update({ cohort: 0 }).eq('cohort', id);
    if (mh.error) { alert('숙제 미분류 처리 실패: ' + mh.error.message); return; }
    var dc = await sb.from('cohorts').delete().eq('id', id);
    if (dc.error) { alert('기수 삭제 실패: ' + dc.error.message); return; }
    await finishDelete();
  });

  // 수강일(날짜) 즉시 저장
  els.body.addEventListener('change', async function (e) {
    var inp = e.target.closest('.co-enroll');
    if (!inp) return;
    var id = Number(inp.dataset.id);
    var val = inp.value || null;   // 'YYYY-MM-DD' 또는 빈값
    var r = await sb.from('cohorts').update({ enroll_date: val }).eq('id', id).select();
    if (r.error || !r.data || !r.data.length) {
      alert('수강일 저장 실패' + (r.error ? ': ' + r.error.message : ''));
      return;
    }
    var c = cohorts.find(function (x) { return x.id === id; });
    if (c) c.enroll_date = val;
    flash();
  });

  async function load() {
    var res = await sb.from('cohorts').select('*').order('id');
    if (res.error) { alert('기수를 불러오지 못했습니다: ' + res.error.message); return; }
    cohorts = res.data || [];

    studentsByCohort = {}; unassigned = [];
    var pr = await sb.from('profiles').select('id,name,email,cohort,status').neq('role', 'admin').order('name');
    (pr.data || []).forEach(function (p) {
      // 승인 + 실제 기수(1 이상)만 해당 기수에 집계. 미승인·기수0/null 은 미분류로.
      if (p.status === 'rejected') return;   // 거절자는 집계에서 제외 (미분류에도 안 뜸)
      if (p.status === 'approved' && p.cohort && p.cohort >= 1) {
        (studentsByCohort[p.cohort] = studentsByCohort[p.cohort] || []).push(p);
      } else {
        unassigned.push(p);
      }
    });
    render();
  }

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await load();
  })();
})();
