/* =====================================================================
   Ban ngày: bộ máy trình chiếu (không cần thư viện ngoài)
   ---------------------------------------------------------------------
   Slide:  <section class="slide" data-ch="2" data-min="3" [data-optional]>
   Bước:   data-s="k"     hiện từ bước k
           data-hide="k"  ẩn từ bước k (dùng cùng .swap để thay nội dung)
           data-at="k,l"  được tô sáng đúng ở bước k, l
   Hình:   data-widget="tên" (đăng ký bằng Deck.widget(tên, {init, step, enter, leave}))
   Ghi chú giáo viên: <aside class="notes"> trong mỗi slide.
   Phím: → ← từng bước · ↓ ↑ cả slide · 0–9 chương · Esc tổng quan · S cửa sổ giáo viên
         F toàn màn hình · B màn đen · O slide tùy chọn · T đồng hồ · A tự đo · ? trợ giúp
   ===================================================================== */
(function () {
  'use strict';
  const WIDGETS = {};
  const MIN_PCT = 2.4;               // cỡ chữ tối thiểu, % chiều rộng slide
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let cfg = {}, stage, slides = [], cur = 0, step = 0, showOpt = false;
  let notesWin = null, deckStart = Date.now(), slideStart = Date.now(), navTimer = 0;
  const ui = {};

  const Deck = window.Deck = {
    widget(name, def) { WIDGETS[name] = def; },
    toast,
    get slide() { return slides[cur]; },
    get step() { return step; },
    next, prev, show: (n, k) => show(n - 1, k || 0), audit: runAudit
  };

  /* ---------- tiện ích ---------- */
  function titleOf(s) {
    if (s.dataset.title) return s.dataset.title;
    const h = s.querySelector('h1, h2');
    return h ? h.textContent.replace(/\s+/g, ' ').trim() : '(không có tiêu đề)';
  }
  function chapterOf(s) { return (cfg.chapters || []).find(c => String(c.id) === s.dataset.ch) || null; }
  function maxStep(s) {
    let m = +(s.dataset.steps || 0);
    $$('[data-s],[data-hide],[data-at]', s).forEach(e => {
      if (e.closest('.notes, template')) return;
      m = Math.max(m, +(e.dataset.s || 0), +(e.dataset.hide || 0));
      if (e.dataset.at) e.dataset.at.split(',').forEach(x => { m = Math.max(m, +x || 0); });
    });
    return m;
  }
  function callWidgets(s, hook, ...args) {
    $$('[data-widget]', s).forEach(el => {
      const w = WIDGETS[el.dataset.widget];
      if (w && typeof w[hook] === 'function') {
        try { w[hook](el, ...args); } catch (err) { console.error('Widget ' + el.dataset.widget + '.' + hook, err); }
      }
    });
  }
  function toast(msg) {
    ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(ui.toast._t);
    ui.toast._t = setTimeout(() => ui.toast.classList.remove('show'), 1600);
  }
  const visible = i => i >= 0 && i < slides.length && (showOpt || !slides[i].hasAttribute('data-optional'));
  function nextVisible(i) { for (let j = i + 1; j < slides.length; j++) if (visible(j)) return j; return null; }
  function prevVisible(i) { for (let j = i - 1; j >= 0; j--) if (visible(j)) return j; return null; }
  function firstVisible() { for (let j = 0; j < slides.length; j++) if (visible(j)) return j; return 0; }
  function lastVisible() { for (let j = slides.length - 1; j >= 0; j--) if (visible(j)) return j; return 0; }

  /* ---------- áp dụng bước ---------- */
  function applyStep(s, k, instant) {
    for (let i = 1; i <= 20; i++) s.classList.toggle('ge' + i, k >= i);
    $$('[data-s]', s).forEach(e => e.classList.toggle('on', k >= +e.dataset.s));
    $$('[data-hide]', s).forEach(e => e.classList.toggle('gone', k >= +e.dataset.hide));
    $$('[data-at]', s).forEach(e => e.classList.toggle('cur', e.dataset.at.split(',').map(Number).includes(k)));
    callWidgets(s, 'step', k, { slide: s, instant: !!instant, deck: Deck });
  }

  function show(i, k, instant) {
    if (i == null || !slides[i]) return;
    const old = slides[cur], s = slides[i];
    if (old && old !== s) { old.classList.remove('active'); callWidgets(old, 'leave', { slide: old, deck: Deck }); }
    cur = i;
    step = Math.max(0, Math.min(k || 0, s._steps));
    s.classList.add('active');
    if (old !== s || !s._entered) { s._entered = true; callWidgets(s, 'enter', { slide: s, deck: Deck }); slideStart = Date.now(); }
    applyStep(s, step, instant !== false);
    afterChange();
  }
  function next() {
    const s = slides[cur];
    if (step < s._steps) { step++; applyStep(s, step, false); afterChange(); return; }
    const j = nextVisible(cur);
    if (j !== null) show(j, 0);
  }
  function prev() {
    const s = slides[cur];
    if (step > 0) { step--; applyStep(s, step, true); afterChange(); return; }
    const j = prevVisible(cur);
    if (j !== null) show(j, slides[j]._steps);
  }
  function gotoChapter(c) {
    const i = slides.findIndex((s, j) => visible(j) && s.dataset.ch === String(c));
    if (i >= 0) show(i, 0); else toast('Không có chương ' + c);
  }
  function afterChange() {
    try { history.replaceState(null, '', '#' + (cur + 1) + (step ? '.' + step : '')); } catch (e) { /* file:// cũ */ }
    updateProgress(); updateNotes(); if (ui.ov.classList.contains('open')) buildOverview();
  }

  /* ---------- khung: thanh tiến độ, nút, lớp phủ ---------- */
  function buildChrome() {
    const mk = (cls, html) => { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; stage.appendChild(d); return d; };
    ui.progress = mk('dk-progress', '<i></i>');
    ui.progress.addEventListener('click', e => {
      const vis = slides.map((s, i) => i).filter(visible);
      const r = ui.progress.getBoundingClientRect();
      const idx = vis[Math.min(vis.length - 1, Math.floor((e.clientX - r.left) / r.width * vis.length))];
      show(idx, 0);
    });
    ui.nav = mk('dk-nav', '<button type="button" aria-label="Lùi">‹</button><button type="button" aria-label="Tiếp">›</button>');
    const [bp, bn] = ui.nav.querySelectorAll('button');
    bp.addEventListener('click', () => { prev(); bp.blur(); });
    bn.addEventListener('click', () => { next(); bn.blur(); });
    ui.blank = mk('dk-layer dk-blank');
    ui.blank.addEventListener('click', () => ui.blank.classList.remove('open'));
    ui.ov = mk('dk-layer dk-panel');
    ui.help = mk('dk-layer dk-panel dk-help', helpHTML());
    ui.help.addEventListener('click', () => ui.help.classList.remove('open'));
    ui.audit = mk('dk-layer dk-panel dk-audit');
    ui.audit.addEventListener('click', () => ui.audit.classList.remove('open'));
    ui.toast = mk('dk-toast');
    document.addEventListener('mousemove', () => {
      ui.nav.classList.add('show');
      clearTimeout(navTimer);
      navTimer = setTimeout(() => ui.nav.classList.remove('show'), 2200);
    });
  }
  function updateProgress() {
    const vis = slides.map((s, i) => i).filter(visible);
    const pos = vis.indexOf(cur), s = slides[cur];
    const frac = pos < 0 ? 0 : (pos + (s._steps ? step / s._steps : 1)) / vis.length;
    ui.progress.firstChild.style.width = (frac * 100).toFixed(2) + '%';
  }
  function buildOverview() {
    const groups = [];
    slides.forEach((s, i) => {
      const ch = chapterOf(s), key = ch ? ch.id : '?';
      let g = groups.find(x => x.key === key);
      if (!g) { g = { key, name: ch ? ch.name : 'Khác', items: [] }; groups.push(g); }
      g.items.push(i);
    });
    ui.ov.innerHTML = `<h3>Tổng quan · ${esc(cfg.title || document.title)} · ${showOpt ? 'đang hiện' : 'đang ẩn'} slide tùy chọn (phím O)</h3><div class="dk-ov">` +
      groups.map(g => `<div class="ch"><b>${esc(g.name)}</b>` + g.items.map(i => {
        const s = slides[i], opt = s.hasAttribute('data-optional');
        const cls = [i === cur ? 'cur' : '', opt ? 'opt' : '', opt && !showOpt ? 'hidden-opt' : ''].join(' ');
        return `<button type="button" class="${cls}" data-i="${i}"><span>${i + 1}</span><span>${opt ? '○ ' : ''}${esc(titleOf(s))}</span></button>`;
      }).join('') + '</div>').join('') + '</div>';
    ui.ov.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i;
      if (!visible(i)) { showOpt = true; saveOpt(); }
      ui.ov.classList.remove('open');
      show(i, 0);
    }));
  }
  function helpHTML() {
    const rows = [
      ['→ · Space · PageDown', 'bước tiếp theo'], ['← · PageUp', 'lùi một bước'],
      ['↓ / ↑', 'sang slide sau / trước (bỏ qua các bước)'], ['1 … 9', 'nhảy tới chương'], ['0', 'về slide đầu'],
      ['Esc', 'tổng quan các slide'], ['S', 'mở cửa sổ giáo viên (ghi chú, slide kế, đồng hồ)'],
      ['F', 'toàn màn hình'], ['B hoặc .', 'màn đen'], ['O', 'bật / tắt slide tùy chọn'],
      ['T', 'chạy / dừng đồng hồ đếm ngược trên slide'], ['A', 'tự đo cỡ chữ và chỗ tràn khung'], ['?', 'bảng này']
    ];
    return '<h3>Phím tắt</h3><table>' + rows.map(r => `<tr><td><kbd>${esc(r[0])}</kbd></td><td>${esc(r[1])}</td></tr>`).join('') + '</table>';
  }
  function toggleLayer(layer) {
    const open = !layer.classList.contains('open');
    [ui.ov, ui.help, ui.audit].forEach(l => l.classList.remove('open'));
    if (open) { if (layer === ui.ov) buildOverview(); layer.classList.add('open'); }
  }
  function saveOpt() { try { localStorage.setItem('bn-opt:' + (cfg.title || location.pathname), showOpt ? '1' : '0'); } catch (e) { /* bỏ qua */ } }
  function loadOpt() { try { showOpt = localStorage.getItem('bn-opt:' + (cfg.title || location.pathname)) === '1'; } catch (e) { showOpt = false; } }

  /* ---------- phím ---------- */
  function onKey(e) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    switch (k) {
      case 'ArrowRight': case ' ': case 'PageDown': case 'Enter': e.preventDefault(); next(); return;
      case 'ArrowLeft': case 'PageUp': case 'Backspace': e.preventDefault(); prev(); return;
      case 'ArrowDown': e.preventDefault(); { const j = nextVisible(cur); if (j !== null) show(j, 0); } return;
      case 'ArrowUp': e.preventDefault(); { const j = prevVisible(cur); if (j !== null) show(j, 0); } return;
      case 'Home': show(firstVisible(), 0); return;
      case 'End': show(lastVisible(), 0); return;
      case 'Escape': toggleLayer(ui.ov); return;
      case '?': toggleLayer(ui.help); return;
    }
    switch (k.toLowerCase()) {
      case 's': openNotes(); return;
      case 'f': toggleFullscreen(); return;
      case 'b': case '.': ui.blank.classList.toggle('open'); return;
      case 'o':
        showOpt = !showOpt; saveOpt();
        toast(showOpt ? 'Đã bật slide tùy chọn' : 'Đã tắt slide tùy chọn');
        afterChange(); return;
      case 't': {
        const el = slides[cur].querySelector('[data-widget="timer"]');
        if (el && WIDGETS.timer) WIDGETS.timer.toggle(el); else toast('Slide này không có đồng hồ');
        return;
      }
      case 'a': runAudit(); return;
    }
    if (/^[0-9]$/.test(k)) { if (k === '0') show(firstVisible(), 0); else gotoChapter(k); }
  }
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    else document.exitFullscreen && document.exitFullscreen();
  }

  /* ---------- cửa sổ giáo viên ---------- */
  const NOTES_PAGE = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Ghi chú giáo viên</title>
<style>
  body { margin: 0; font: 19px/1.55 "Segoe UI", system-ui, sans-serif; background: #f4f2ec; color: #1c1c1c; }
  .top { display: flex; gap: 16px; align-items: center; padding: 12px 18px; background: #1c1c1c; color: #fff; }
  .top .t { font-weight: 600; font-size: 21px; flex: 1; }
  .top .m { color: #d8d4ca; font-size: 16px; }
  .top button { font: 600 18px "Segoe UI", sans-serif; padding: 6px 16px; border-radius: 8px; border: 0; cursor: pointer; }
  .wrap { display: grid; grid-template-columns: 1fr 340px; gap: 18px; padding: 16px 18px; }
  .notes { background: #fff; border-radius: 10px; padding: 14px 20px; min-height: 60vh; }
  .notes p { margin: 0 0 .7em; } .notes ul { margin: 0 0 .7em; padding-left: 1.2em; }
  .side > div { background: #fff; border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; }
  .side h4 { margin: 0 0 6px; font-size: 14px; letter-spacing: .06em; text-transform: uppercase; color: #6a665f; }
  .clock { font: 600 30px/1.1 Consolas, monospace; }
  .over { color: #8a2418; }
  .small { font-size: 15px; color: #4a4741; }
</style></head><body>
<div class="top"><button id="bp">‹</button><button id="bn">›</button><div class="t" id="title"></div><div class="m" id="meta"></div></div>
<div class="wrap"><div class="notes" id="notes"></div>
<div class="side">
  <div><h4>Bước kế tiếp trên slide</h4><div id="nextstep"></div></div>
  <div><h4>Slide sau</h4><div id="next"></div></div>
  <div><h4>Thời gian</h4><div class="clock" id="tslide"></div><div class="small" id="tplan"></div><div class="clock" id="ttotal" style="margin-top:8px"></div><div class="small">tổng thời gian · <a href="#" id="treset">đặt lại</a></div></div>
  <div class="small">Phím → ← điều khiển cả hai cửa sổ. O bật/tắt slide tùy chọn.</div>
</div></div></body></html>`;

  function openNotes() {
    if (notesWin && !notesWin.closed) { notesWin.focus(); return; }
    notesWin = window.open('', 'ban-ngay-giao-vien', 'width=1180,height=780');
    if (!notesWin) { toast('Trình duyệt đã chặn cửa sổ mới. Hãy cho phép cửa sổ bật lên.'); return; }
    const d = notesWin.document;
    d.open(); d.write(NOTES_PAGE); d.close();
    d.addEventListener('keydown', onKey);
    d.getElementById('bp').addEventListener('click', prev);
    d.getElementById('bn').addEventListener('click', next);
    d.getElementById('treset').addEventListener('click', e => { e.preventDefault(); deckStart = Date.now(); });
    updateNotes();
  }
  function nextStepText(s, k) {
    if (k >= s._steps) { const j = nextVisible(cur); return j === null ? '(hết bài)' : '(hết slide này)'; }
    const els = $$('[data-s]', s).filter(e => +e.dataset.s === k + 1 && !e.closest('.notes, template'));
    const els2 = els.length ? els : $$('[data-at]', s).filter(e => e.dataset.at.split(',').map(Number).includes(k + 1));
    const txt = els2.map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' · ');
    return esc(txt.slice(0, 220) || '(hình chuyển bước)');
  }
  const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  function updateNotes() {
    if (!notesWin || notesWin.closed) return;
    const d = notesWin.document, s = slides[cur], ch = chapterOf(s);
    const opt = s.hasAttribute('data-optional');
    d.getElementById('title').textContent = (cur + 1) + '. ' + titleOf(s);
    d.getElementById('meta').textContent = `${ch ? ch.name + ' · ' : ''}bước ${step}/${s._steps} · ${opt ? 'tùy chọn' : 'lõi'}`;
    const n = s.querySelector('.notes');
    d.getElementById('notes').innerHTML = n ? n.innerHTML : '<p>(Slide này chưa có ghi chú.)</p>';
    d.getElementById('nextstep').innerHTML = nextStepText(s, step);
    const j = nextVisible(cur);
    d.getElementById('next').textContent = j === null ? '(hết bài)' : (j + 1) + '. ' + titleOf(slides[j]);
    tickNotes();
  }
  function tickNotes() {
    if (!notesWin || notesWin.closed) return;
    const d = notesWin.document, s = slides[cur];
    const used = Date.now() - slideStart, plan = (+s.dataset.min || 0) * 60000;
    const el = d.getElementById('tslide');
    el.textContent = mmss(used);
    el.className = 'clock' + (plan && used > plan ? ' over' : '');
    d.getElementById('tplan').textContent = plan ? 'slide này, dự kiến ' + s.dataset.min + ' phút' : 'slide này';
    d.getElementById('ttotal').textContent = mmss(Date.now() - deckStart);
  }

  /* ---------- tự đo cỡ chữ và chỗ tràn ---------- */
  function describe(e) {
    const t = (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    return e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + (t ? ' “' + t + '”' : '');
  }
  function auditSlide(s) {
    const fr = stage.getBoundingClientRect(), W = fr.width;
    let min = Infinity, who = '';
    const small = [], over = [];
    const walker = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const tn = walker.currentNode, el = tn.parentElement;
      if (!tn.nodeValue.trim() || !el || el.closest('.notes, template, .gone')) continue;
      let fs = parseFloat(getComputedStyle(el).fontSize);
      const svg = el.closest('svg');
      if (svg && svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width) fs *= svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      const pct = fs / W * 100;
      if (pct < min) { min = pct; who = tn.nodeValue.trim().slice(0, 24); }
      if (pct < MIN_PCT - 0.02) small.push(tn.nodeValue.trim().slice(0, 24) + ' (' + pct.toFixed(2) + '%)');
    }
    $$('*', s).forEach(e => {
      if (e.closest('.notes, template, .gone')) return;
      const r = e.getBoundingClientRect();
      if (!r.width && !r.height) return;
      if (r.right > fr.right + 1 || r.bottom > fr.bottom + 1 || r.left < fr.left - 1 || r.top < fr.top - 1) over.push(describe(e));
    });
    $$('.code, .ln, .opt, .eq, .box, .tr, .card, .t, .sub, .t-sm', s).forEach(e => {
      if (e.closest('.gone, .notes')) return;
      if (e.scrollWidth > e.clientWidth + 2) over.push('ngang: ' + describe(e));
    });
    return { n: +s.dataset.n, title: titleOf(s), optional: s.hasAttribute('data-optional'), min: +min.toFixed(2), who, small, over };
  }
  async function runAudit() {
    // chờ mọi font tải xong, nếu không chữ đo bằng font dự phòng sẽ hẹp hơn thật
    const faces = ['400 20px "Source Serif 4"', '700 20px "Source Serif 4"', 'italic 400 20px "Source Serif 4"',
      '500 20px "JetBrains Mono"', '700 20px "JetBrains Mono"', '20px KaTeX_Main', 'italic 20px KaTeX_Math'];
    try { await Promise.all(faces.map(f => document.fonts.load(f))); await document.fonts.ready; } catch (e) { /* offline: đo bằng font có sẵn */ }
    const keep = [cur, step];
    const res = slides.map((s, i) => {
      const agg = { n: i + 1, title: titleOf(s), optional: s.hasAttribute('data-optional'), min: Infinity, who: '', small: [], over: [] };
      for (let k = 0; k <= s._steps; k++) {           // đo ở mọi bước, vì có nội dung chỉ hiện ở vài bước
        show(i, k, true);
        const r = auditSlide(s);
        if (r.min < agg.min) { agg.min = r.min; agg.who = r.who; }
        r.small.forEach(x => { if (!agg.small.includes(x)) agg.small.push(x); });
        r.over.forEach(x => { const t = x + ' (bước ' + k + ')'; if (!agg.over.some(o => o.startsWith(x))) agg.over.push(t); });
      }
      return agg;
    });
    show(keep[0], keep[1], true);
    const bad = res.filter(r => r.small.length || r.over.length);
    const gmin = Math.min(...res.map(r => r.min));
    window.__audit = { slides: res.length, bad: bad.length, minPct: gmin, details: res };
    ui.audit.innerHTML = `<h3>Tự đo: ${res.length} slide · chữ nhỏ nhất ${gmin.toFixed(2)}% (ngưỡng ${MIN_PCT}%) · ${bad.length ? '<span class="bad">' + bad.length + ' slide cần sửa</span>' : '<span class="ok">tất cả đạt</span>'}</h3>` +
      (bad.length ? '<table><tr><th>#</th><th>Slide</th><th>Chữ nhỏ</th><th>Tràn</th></tr>' + bad.map(r =>
        `<tr><td>${r.n}</td><td>${esc(r.title)}</td><td class="bad">${esc(r.small.join('; '))}</td><td class="bad">${esc(r.over.slice(0, 4).join('; '))}</td></tr>`).join('') + '</table>' : '<p>Bấm để đóng.</p>');
    ui.audit.classList.add('open');
    return window.__audit;
  }

  /* ---------- in ---------- */
  window.addEventListener('beforeprint', () => {
    slides.forEach((s, i) => { s.classList.toggle('opt-off', !visible(i)); applyStep(s, s._steps, true); });
  });
  window.addEventListener('afterprint', () => { slides.forEach(s => s.classList.remove('opt-off')); show(cur, step, true); });

  /* ---------- khởi động ---------- */
  function start() {
    const c = document.getElementById('deck-config');
    try { cfg = c ? JSON.parse(c.textContent) : {}; } catch (e) { console.error('deck-config lỗi JSON', e); cfg = {}; }
    stage = document.querySelector('.stage');
    slides = $$(':scope > .slide', stage);
    loadOpt();
    slides.forEach((s, i) => {
      s.dataset.n = i + 1;
      const ch = chapterOf(s);
      if (ch && ch.chip && !s.classList.contains('no-chip') && !s.querySelector(':scope > .chip')) {
        const d = document.createElement('div'); d.className = 'chip'; d.innerHTML = ch.chip;
        s.insertBefore(d, s.firstElementChild);
      }
      callWidgets(s, 'init', { slide: s, deck: Deck });
      s._steps = maxStep(s);
      applyStep(s, 0, true);
    });
    buildChrome();
    document.addEventListener('keydown', onKey);
    setInterval(tickNotes, 1000);
    const m = /^#(\d+)(?:\.(\d+))?$/.exec(location.hash);
    if (m && slides[+m[1] - 1]) { if (!visible(+m[1] - 1)) showOpt = true; show(+m[1] - 1, +(m[2] || 0), true); }
    else show(firstVisible(), 0, true);
    if (/[?&]audit\b/.test(location.search)) setTimeout(runAudit, 600);
  }

  /* =====================================================================
     Hình dùng chung
     ===================================================================== */

  /* code: <pre class="code" data-widget="code" data-hl="1:1-5 2:3">…</pre>
     data-hl: "bước:dòng" (dòng đánh số từ 1), tô sáng các dòng đó ở bước đó. */
  const KW = /\b(for|while|if|else|return|int|long|bool|using|void|true|false|const|auto|break|continue|unsigned|char|double)\b/g;
  function colorize(line) {
    let code = line, comment = '';
    const ci = line.indexOf('//');
    if (ci >= 0) { code = line.slice(0, ci); comment = line.slice(ci); }
    return esc(code).replace(KW, '<span class="kw">$1</span>') + (comment ? '<span class="cm">' + esc(comment) + '</span>' : '');
  }
  Deck.widget('code', {
    init(el) {
      const raw = el.textContent.replace(/^\r?\n/, '').replace(/\s+$/, '');
      const map = {};
      (el.dataset.hl || '').trim().split(/\s+/).filter(Boolean).forEach(tok => {
        const [st, ranges] = tok.split(':');
        (ranges || '').split(',').forEach(r => {
          const [a, b] = r.split('-').map(Number);
          for (let L = a; L <= (b || a); L++) (map[L - 1] = map[L - 1] || []).push(+st);
        });
      });
      el.innerHTML = raw.split(/\r?\n/).map((ln, i) =>
        `<span class="cl"${map[i] ? ` data-at="${map[i].join(',')}"` : ''}>${colorize(ln) || ' '}</span>`).join('');
    }
  });

  /* quiz: <div class="quiz" data-widget="quiz" data-key="C" [data-reveal="1"]>
            <div class="opts"><button class="opt" data-k="A"><span class="L">A</span>…</button>…</div>
            <div class="fb"></div>
            <template data-for="A">giải thích lỗi của A</template> …</div> */
  Deck.widget('quiz', {
    init(el) {
      const sl = el.closest('.slide');                 // bước lật đáp án phải tồn tại trên slide
      if (sl) sl.dataset.steps = Math.max(+(sl.dataset.steps || 0), +(el.dataset.reveal || 1));
      el._fb = el.querySelector('.fb');
      el._tpl = {};
      el.querySelectorAll('template[data-for]').forEach(t => { el._tpl[t.dataset.for] = t.innerHTML; });
      el.querySelectorAll('.opt').forEach(b => {
        b.type = 'button';
        b.addEventListener('click', () => { this.pick(el, b.dataset.k); b.blur(); });
      });
    },
    pick(el, k) {
      el._picked = k;
      const ok = k === el.dataset.key;
      el.querySelectorAll('.opt').forEach(b => b.classList.remove('ok', 'no'));
      const b = el.querySelector(`.opt[data-k="${k}"]`);
      if (b) b.classList.add(ok ? 'ok' : 'no');
      if (el._fb) { el._fb.className = 'fb ' + (ok ? 'ok' : 'no'); el._fb.innerHTML = (ok ? '✓ ' : '✗ ') + (el._tpl[k] || ''); }
    },
    step(el, k) {
      const rv = +(el.dataset.reveal || 1);
      const key = el.querySelector(`.opt[data-k="${el.dataset.key}"]`);
      if (k >= rv) {
        if (key) key.classList.add('ok');
        if (!el._picked || el._picked === el.dataset.key) this.pick(el, el.dataset.key);
      } else {
        el._picked = null;
        el.querySelectorAll('.opt').forEach(b => b.classList.remove('ok', 'no'));
        if (el._fb) { el._fb.className = 'fb'; el._fb.innerHTML = ''; }
      }
    }
  });

  /* timer: <div class="timer" data-widget="timer" data-sec="360"></div>
     bấm: chạy/dừng · bấm đúp: đặt lại · phím T: chạy/dừng */
  Deck.widget('timer', {
    init(el) {
      el._total = (+el.dataset.sec || 300) * 1000; el._left = el._total; el._end = 0; el._iv = 0;
      this.render(el);
      el.addEventListener('click', () => this.toggle(el));
      el.addEventListener('dblclick', e => { e.preventDefault(); this.reset(el); });
    },
    render(el) {
      const left = el._end ? Math.max(0, el._end - Date.now()) : el._left;
      const s = Math.ceil(left / 1000);
      el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
      el.classList.toggle('run', !!el._end && left > 30000);
      el.classList.toggle('low', !!el._end && left <= 30000 && left > 0);
      el.classList.toggle('done', left <= 0);
      if (left <= 0 && el._end) { clearInterval(el._iv); el._end = 0; el._left = 0; }
    },
    toggle(el) {
      if (el._end) { el._left = Math.max(0, el._end - Date.now()); el._end = 0; clearInterval(el._iv); this.render(el); return; }
      if (el._left <= 0) el._left = el._total;
      el._end = Date.now() + el._left;
      clearInterval(el._iv);
      el._iv = setInterval(() => this.render(el), 250);
      this.render(el);
    },
    reset(el) { clearInterval(el._iv); el._end = 0; el._left = el._total; this.render(el); }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start, 0);
})();
