/* =====================================================================
   Hình riêng cho bài “Những viên gạch của số học” (dùng với template Ban ngày)
   Mỗi hình đăng ký bằng Deck.widget(tên, { init, step, enter, leave }).
   Cỡ chữ trong SVG tính theo đơn vị 0,1cqw: viewBox rộng = chiều rộng hình (cqw) × 10.
   ===================================================================== */
(function () {
  'use strict';
  const D = window.Deck;
  const f2 = v => +(+v).toFixed(2);
  const divisors = n => { const d = []; for (let i = 1; i <= n; i++) if (n % i === 0) d.push(i); return d; };
  const fmt = x => String(x).replace('.', ',');

  /* ---------- cặp ước: data-n, data-h, data-arcs, data-self, data-label, data-callout ---------- */
  function pairsSVG(n, o) {
    const ds = divisors(n), L = ds.length, figW = o.figW || 91, vbW = figW * 10, H = o.H || 150;
    const gap = Math.min(100, (vbW - 60) / Math.max(1, L - 1)), x0 = (vbW - gap * (L - 1)) / 2;
    const X = i => f2(x0 + gap * i);
    const yNum = H - (o.bottom || 44), y0 = yNum - 38;
    const half = Math.floor(L / 2), hasSelf = L % 2 === 1, root = Math.sqrt(n);
    let s = `<svg viewBox="0 0 ${vbW} ${H}" style="width:${figW}cqw" role="img" aria-label="Các ước của ${n} ghép thành cặp">`;
    for (let i = 0; i < half; i++) {
      const j = L - 1 - i, span = j - i;
      const h = Math.max(12, (y0 - 6) * span / Math.max(1, L - 1)), c = f2(h / .75);
      const cls = o.neutralArcs ? 'arc gray' : 'arc k' + (i % 4);
      s += `<path class="${cls}"${o.arcs ? ` data-s="${o.arcs}"` : ''} d="M${X(i)} ${y0} C${X(i)} ${f2(y0 - c)} ${X(j)} ${f2(y0 - c)} ${X(j)} ${y0}"/>`;
    }
    if (o.mirror) {
      const xm = hasSelf ? X(half) : f2((X(half - 1) + X(half)) / 2);
      s += `<line class="mline" x1="${xm}" y1="2" x2="${xm}" y2="${H - 4}"/>`;
    }
    ds.forEach((d, i) => {
      const self = hasSelf && i === half;
      let k = self ? 4 : Math.min(i, L - 1 - i) % 4;
      if (o.sides) k = self ? 4 : (d < root ? 0 : 1);
      s += `<text class="num k${k}${self ? ' self' : ''}" x="${X(i)}" y="${yNum}" text-anchor="middle" font-size="${o.fs || 36}">${d}</text>`;
    });
    if (hasSelf && !o.mirror) s += `<circle class="ring k4"${o.self ? ` data-s="${o.self}"` : ''} cx="${X(half)}" cy="${yNum - 12}" r="34"/>`;
    if (o.label) s += `<text class="lab" x="4" y="${H - 6}" font-size="28">${o.label}</text>`;
    if (hasSelf && o.callout) s += `<text class="lab"${o.self ? ` data-s="${o.self}"` : ''} x="${X(half)}" y="${H - 6}" text-anchor="middle" font-size="28">${o.callout}</text>`;
    return s + '</svg>';
  }

  D.widget('pairs', {
    init(el) {
      const d = el.dataset;
      el.innerHTML = pairsSVG(+d.n, { figW: +(d.w || 91), H: +(d.h || 150), arcs: d.arcs, self: d.self || d.arcs, label: d.label, callout: d.callout });
    },
    step(el, k) {
      const d = el.dataset;
      el.classList.toggle('colored', k >= +(d.color || d.arcs || 1));
      el.classList.toggle('selfon', k >= +(d.self || d.arcs || 1));
    }
  });

  /* ---------- tấm gương √n: thanh trượt n ---------- */
  D.widget('mirror', {
    init(el) {
      const n0 = +(el.dataset.n || 36);
      el.innerHTML = `<div class="mir-ctl"><span class="mx">n = <b class="mir-n">${n0}</b></span>` +
        `<input type="range" min="2" max="100" step="1" value="${n0}" aria-label="Chọn n">` +
        `<span class="mx mir-r"></span><span class="mir-key mx"><span class="c2">xanh</span> &lt; √n &lt; <span class="c3">cam</span></span></div><div class="mir-fig"></div>`;
      const inp = el.querySelector('input'), fig = el.querySelector('.mir-fig');
      const draw = () => {
        const n = +inp.value, r = Math.sqrt(n);
        el.querySelector('.mir-n').textContent = n;
        el.querySelector('.mir-r').textContent = Number.isInteger(r) ? `√${n} = ${r}` : `√${n} ≈ ${fmt(r.toFixed(1))}`;
        fig.innerHTML = pairsSVG(n, { figW: 91, H: +(el.dataset.h || 118), mirror: true, sides: true, neutralArcs: true, bottom: 30, fs: 34 });
      };
      inp.addEventListener('input', draw);
      ['pointerup', 'change', 'touchend'].forEach(ev => inp.addEventListener(ev, () => inp.blur()));
      draw();
    }
  });

  /* ---------- 100 cánh tủ: data-run = bước chạy mô phỏng ---------- */
  D.widget('lockers', {
    init(el) {
      el.innerHTML = '<div class="lk-grid">' + Array.from({ length: 100 }, (_, i) => `<div class="lk">${i + 1}</div>`).join('') + '</div><div class="lk-cap"></div>';
      el._cells = Array.from(el.querySelectorAll('.lk'));
      el._cap = el.querySelector('.lk-cap');
      this.reset(el);
    },
    reset(el) {
      clearInterval(el._iv); el._iv = 0;
      el._st = new Array(101).fill(false); el._k = 0;
      this.paint(el); el._cap.textContent = '';
    },
    paint(el) { el._cells.forEach((c, i) => c.classList.toggle('open', el._st[i + 1])); },
    walk(el, k) { for (let j = k; j <= 100; j += k) el._st[j] = !el._st[j]; },
    finish(el) {
      clearInterval(el._iv); el._iv = 0;
      while (el._k < 100) { el._k++; this.walk(el, el._k); }
      this.paint(el); el._cap.textContent = 'Xong: cả 100 bạn đã đi qua.';
    },
    step(el, k, ctx) {
      const run = +(el.dataset.run || 2);
      if (k < run) { this.reset(el); el.classList.remove('show-open'); return; }
      if (ctx.instant || k > run) { if (el._k < 100) this.finish(el); }
      else if (!el._iv && el._k < 100) {
        el._iv = setInterval(() => {
          el._k++; this.walk(el, el._k); this.paint(el);
          el._cap.textContent = 'Bạn thứ ' + el._k + ' vừa đi qua';
          if (el._k >= 100) { clearInterval(el._iv); el._iv = 0; el._cap.textContent = 'Xong: cả 100 bạn đã đi qua.'; }
        }, 60);
      }
      el.classList.toggle('show-open', k > run);
    },
    leave(el) { if (el._iv) this.finish(el); }
  });

  /* ---------- cây phân tích: data-tree='[72,[8,[2],[4,[2],[2]]],[9,[3],[3]]]' ---------- */
  D.widget('ftree', {
    init(el) {
      const spec = JSON.parse(el.dataset.tree), figW = +(el.dataset.w || 40), vbW = figW * 10;
      const s1 = el.dataset.s1 || 1, s2 = el.dataset.s2 || 2;
      const nodes = []; let leaves = 0;
      (function walk(t, depth, parent) {
        const nd = { v: t[0], depth, parent, kids: [] }; nodes.push(nd);
        if (t.length === 1) nd.leaf = leaves++;
        else t.slice(1).forEach(c => nd.kids.push(walk(c, depth + 1, nd)));
        return nd;
      })(spec, 0, null);
      const pad = 34, gx = (vbW - 2 * pad) / Math.max(1, leaves - 1);
      (function setX(nd) {
        if (!nd.kids.length) nd.x = pad + gx * nd.leaf;
        else { nd.kids.forEach(setX); nd.x = nd.kids.reduce((a, c) => a + c.x, 0) / nd.kids.length; }
      })(nodes[0]);
      const top = 34, dy = +(el.dataset.dy || 52), maxD = Math.max(...nodes.map(n => n.depth));
      nodes.forEach(nd => { nd.y = top + nd.depth * dy; });
      const H = top + maxD * dy + 14;
      let s = `<svg viewBox="0 0 ${vbW} ${H}" style="width:${figW}cqw" role="img" aria-label="Cây phân tích ${spec[0]}">`;
      nodes.forEach(nd => {
        if (!nd.parent) return;
        const st = nd.depth === 1 ? s1 : s2;
        s += `<line class="edge" data-s="${st}" x1="${f2(nd.parent.x)}" y1="${f2(nd.parent.y + 9)}" x2="${f2(nd.x)}" y2="${f2(nd.y - 25)}"/>`;
      });
      nodes.forEach(nd => {
        const st = nd.depth === 0 ? 0 : nd.depth === 1 ? s1 : s2, leaf = !nd.kids.length;
        s += `<text class="node${leaf ? ' leaf p' + nd.v : ''}"${st ? ` data-s="${st}"` : ''} x="${f2(nd.x)}" y="${f2(nd.y)}" text-anchor="middle" font-size="32">${nd.v}</text>`;
      });
      el.innerHTML = s + '</svg>';
    },
    step(el, k) { el.classList.toggle('leafon', k >= +(el.dataset.leaf || 99)); }
  });

  /* ---------- lưới ước của 2^A · 3^B: data-a, data-b, data-pts ---------- */
  D.widget('lattice', {
    init(el) {
      const A = +(el.dataset.a || 3), B = +(el.dataset.b || 2), figW = +(el.dataset.w || 46), vbW = figW * 10, st = el.dataset.pts || 1;
      const X = b => 110 + b * 120, Y = a => 264 - a * 62, H = 330;
      let s = `<svg viewBox="0 0 ${vbW} ${H}" style="width:${figW}cqw" role="img" aria-label="Lưới các ước">`;
      s += `<g data-s="${st}">`;
      for (let a = 0; a <= A; a++) s += `<line class="guide" x1="62" x2="${X(B) + 46}" y1="${Y(a)}" y2="${Y(a)}"/>`;
      for (let b = 0; b <= B; b++) s += `<line class="guide" x1="${X(b)}" x2="${X(b)}" y1="${Y(A) - 30}" y2="${Y(0) + 24}"/>`;
      s += `<line class="axis" x1="62" y1="${Y(0) + 24}" x2="62" y2="${Y(A) - 36}"/><line class="axis" x1="62" y1="${Y(0) + 24}" x2="${X(B) + 62}" y2="${Y(0) + 24}"/>`;
      for (let a = 0; a <= A; a++) s += `<text class="tick p2" x="48" y="${Y(a) + 10}" text-anchor="end" font-size="28">${a}</text>`;
      for (let b = 0; b <= B; b++) s += `<text class="tick p3" x="${X(b)}" y="${Y(0) + 56}" text-anchor="middle" font-size="28">${b}</text>`;
      s += `<text class="axt p2" x="62" y="${Y(A) - 44}" text-anchor="middle" font-size="30">a</text>`;
      s += `<text class="axt p3" x="${X(B) + 74}" y="${Y(0) + 34}" font-size="30">b</text>`;
      for (let a = 0; a <= A; a++) for (let b = 0; b <= B; b++)
        s += `<circle class="pt" cx="${X(b)}" cy="${Y(a)}" r="7"/><text class="pv" x="${X(b) + 13}" y="${Y(a) - 12}" font-size="30">${2 ** a * 3 ** b}</text>`;
      el.innerHTML = s + '</g></svg>';
    }
  });

  /* ---------- khối nhỏ 4 × 3 × 2 (hai lớp chấm) ---------- */
  D.widget('isobox', {
    init(el) {
      const figW = +(el.dataset.w || 22), vbW = figW * 10;
      const P = (a, b, c) => [f2(36 + b * 48 + c * 46), f2(176 - a * 40 - c * 34)];
      let s = `<svg viewBox="0 0 ${vbW} 230" style="width:${figW}cqw" role="img" aria-label="Khối 4 nhân 3 nhân 2">`;
      const edge = (p, q) => `<line class="ib-e" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/>`;
      [[0, 0], [3, 0], [0, 2], [3, 2]].forEach(([a, b]) => { s += edge(P(a, b, 0), P(a, b, 1)); });
      [0, 1].forEach(c => {
        s += edge(P(0, 0, c), P(3, 0, c)) + edge(P(3, 0, c), P(3, 2, c)) + edge(P(3, 2, c), P(0, 2, c)) + edge(P(0, 2, c), P(0, 0, c));
        for (let a = 0; a <= 3; a++) for (let b = 0; b <= 2; b++) {
          const p = P(a, b, c);
          s += `<circle class="ib-d ${c ? 'p5' : 'k0'}" cx="${p[0]}" cy="${p[1]}" r="6"/>`;
        }
      });
      el.innerHTML = s + '</svg>';
    }
  });

  /* ---------- sàng 1..100: data-map="bước:nguyên tố …" ---------- */
  D.widget('sieve', {
    init(el) {
      el.innerHTML = '<div class="sv-grid">' + Array.from({ length: 100 }, (_, i) => `<div class="sv${i === 0 ? ' one' : ''}">${i + 1}</div>`).join('') + '</div>';
      el._cells = Array.from(el.querySelectorAll('.sv'));
      el._map = (el.dataset.map || '').trim().split(/\s+/).map(t => t.split(':').map(Number));
      el._count = el.closest('.slide').querySelector('.sv-count');
      this.reset(el);
    },
    reset(el) {
      clearInterval(el._iv); el._iv = 0; el._queue = [];
      el._spf = new Array(101).fill(0); el._done = [];
      el._cells.forEach((c, i) => { c.className = 'sv' + (i === 0 ? ' one' : ''); });
      el.querySelector('.sv-grid').classList.remove('done');
    },
    mark(el, p, j) {
      if (!el._spf[j]) { el._spf[j] = p; el._cells[j - 1].classList.add('x', 'p' + p); }
    },
    flush(el) {
      clearInterval(el._iv); el._iv = 0;
      while (el._queue.length) { const [p, j] = el._queue.shift(); this.mark(el, p, j); }
    },
    remaining(el) { let c = 0; for (let j = 2; j <= 100; j++) if (!el._spf[j]) c++; return c; },
    after(el, k) {
      const last = Math.max(...el._map.map(m => m[0]));
      const all = k >= last;
      el.querySelector('.sv-grid').classList.toggle('done', all);
      if (!el._count) return;
      if (!el._done.length) { el._count.textContent = ''; return; }
      const r = this.remaining(el);
      el._count.innerHTML = all ? `Còn <b>${r}</b> số, tất cả đều là số nguyên tố.` : `Còn <b>${r}</b> số chưa bị gạch.`;
    },
    step(el, k, ctx) {
      const want = el._map.filter(([st]) => k >= st).map(([, p]) => p);
      if (ctx.instant || want.length < el._done.length) {
        this.reset(el);
        want.forEach(p => { for (let j = p * p; j <= 100; j += p) this.mark(el, p, j); el._done.push(p); });
        this.after(el, k); return;
      }
      this.flush(el);
      const todo = want.filter(p => !el._done.includes(p));
      if (!todo.length) { this.after(el, k); return; }
      todo.forEach(p => { for (let j = p * p; j <= 100; j += p) el._queue.push([p, j]); el._done.push(p); });
      el._iv = setInterval(() => {
        const it = el._queue.shift();
        if (it) this.mark(el, it[0], it[1]);
        if (!el._queue.length) { clearInterval(el._iv); el._iv = 0; this.after(el, k); }
      }, 40);
    },
    leave(el) { this.flush(el); }
  });

  /* ---------- số mũ của hai số: data-p, data-a, data-b, data-na, data-nb ---------- */
  D.widget('expbars', {
    init(el) {
      const d = el.dataset, P = d.p.split(',').map(Number), A = d.a.split(',').map(Number), B = d.b.split(',').map(Number);
      const figW = +(d.w || 46), vbW = figW * 10, bs = 36, gp = 6, base = 196, H = 296;
      const gx = g => 36 + g * 142;
      const top = m => base - m * (bs + gp) + gp / 2;
      let s = `<svg viewBox="0 0 ${vbW} ${H}" style="width:${figW}cqw" role="img" aria-label="Số mũ của ${d.na} và ${d.nb}">`;
      P.forEach((p, g) => {
        const xa = gx(g), xb = xa + bs + 12;
        for (let i = 0; i < A[g]; i++) s += `<rect class="blk p${p}" data-s="1" x="${xa}" y="${base - (i + 1) * (bs + gp) + gp}" width="${bs}" height="${bs}" rx="4"/>`;
        for (let i = 0; i < B[g]; i++) s += `<rect class="blk blk-b p${p}" data-s="2" x="${xb}" y="${base - (i + 1) * (bs + gp) + gp}" width="${bs}" height="${bs}" rx="4"/>`;
        const mn = Math.min(A[g], B[g]), mx = Math.max(A[g], B[g]);
        s += `<line class="minl" data-s="3" x1="${xa - 8}" x2="${xb + bs + 8}" y1="${top(mn)}" y2="${top(mn)}"/>`;
        s += `<line class="maxl" data-s="4" x1="${xa - 8}" x2="${xb + bs + 8}" y1="${top(mx) - 4}" y2="${top(mx) - 4}"/>`;
        s += `<text class="pl p${p}" x="${xa + bs + 6}" y="${base + 40}" text-anchor="middle" font-size="32">${p}</text>`;
        s += `<text class="colname" data-s="1" x="${xa + bs / 2}" y="${base + 76}" text-anchor="middle" font-size="26">${d.na}</text>`;
        s += `<text class="colname" data-s="2" x="${xb + bs / 2}" y="${base + 76}" text-anchor="middle" font-size="26">${d.nb}</text>`;
      });
      s += `<line class="baseline" x1="18" x2="${vbW - 18}" y1="${base + 3}" y2="${base + 3}"/>`;
      el.innerHTML = s + '</svg>';
    }
  });

  /* ---------- Euclid bằng hình: data-a, data-b ---------- */
  function euclid(a, b) {
    const squares = [], phases = [];
    let x = 0, y = 0, w = a, h = b;
    while (w > 0 && h > 0) {
      const horiz = w >= h, big = Math.max(w, h), small = Math.min(w, h);
      const q = Math.floor(big / small), r = big % small, ph = phases.length;
      for (let i = 0; i < q; i++) {
        if (horiz) { squares.push({ x, y, s: h, ph }); x += h; w -= h; }
        else { squares.push({ x, y, s: w, ph }); y += w; h -= w; }
      }
      phases.push({ big, small, q, r, last: squares.length - 1 });
    }
    return { a, b, squares, phases, g: squares[squares.length - 1].s };
  }
  D.widget('euclid', {
    init(el) {
      const m = euclid(+(el.dataset.a || 21), +(el.dataset.b || 15)), figW = +(el.dataset.w || 50);
      const padL = 3.6, padT = 3.2, padR = .6, padB = .6, vbW = m.a + padL + padR, vbH = m.b + padT + padB;
      const U = figW / vbW, fs = c => f2(c / U), n = m.squares.length;
      let s = `<svg viewBox="${-padL} ${-padT} ${vbW} ${vbH}" style="width:${figW}cqw" role="img" aria-label="Hình chữ nhật ${m.a} nhân ${m.b} cắt thành hình vuông">`;
      s += `<rect class="outline" x="0" y="0" width="${m.a}" height="${m.b}"/>`;
      s += `<text class="dim" x="${m.a / 2}" y="-1" text-anchor="middle" font-size="${fs(3.2)}">${m.a}</text>`;
      s += `<text class="dim" x="-.9" y="${m.b / 2}" text-anchor="end" dominant-baseline="central" font-size="${fs(3.2)}">${m.b}</text>`;
      m.squares.forEach((q, i) => {
        s += `<g class="tile k${q.ph % 4}" data-s="${i + 1}"><path pathLength="1" d="M${q.x} ${q.y}h${q.s}v${q.s}h${-q.s}z"/></g>`;
      });
      s += `<g class="gridov" data-s="${n + 1}">`;
      for (let i = m.g; i < m.a; i += m.g) s += `<line x1="${i}" y1="0" x2="${i}" y2="${m.b}"/>`;
      for (let j = m.g; j < m.b; j += m.g) s += `<line x1="0" y1="${j}" x2="${m.a}" y2="${j}"/>`;
      s += '</g>';
      m.squares.forEach((q, i) => {
        const lf = Math.max(fs(3), Math.min(fs(4.2), q.s * .42));
        s += `<text class="lbl2 k${q.ph % 4}" data-s="${i + 1}" x="${q.x + q.s / 2}" y="${q.y + q.s / 2}" text-anchor="middle" dominant-baseline="central" font-size="${f2(lf)}">${q.s}</text>`;
      });
      s += '</svg>';
      const eqs = m.phases.map((p, i) => `<div class="eq k${i % 4} tcol" data-s="${p.last + 1}">${p.big} = ${p.q} · ${p.small} + ${p.r}</div>`).join('') +
        `<div class="eq final" data-s="${n + 1}">gcd(${m.a}, ${m.b}) = <b class="cr">${m.g}</b></div>`;
      el.innerHTML = `<div class="fig">${s}</div><div class="eqs">${eqs}</div>`;
    }
  });

  /* ---------- số thừa số 5 của k = 1..N, đếm theo cột và theo hàng ---------- */
  D.widget('cols5', {
    init(el) {
      const N = +(el.dataset.n || 30), figW = +(el.dataset.w || 89), vbW = figW * 10;
      const dx = (vbW - 40) / N, base = 100, bh = 27, H = 140;
      let s = `<svg viewBox="0 0 ${vbW} ${H}" style="width:${figW}cqw" role="img" aria-label="Số thừa số 5 của các số từ 1 đến ${N}">`;
      s += `<rect class="band" data-s="2" x="6" y="${base - bh - 3}" width="${vbW - 12}" height="${bh + 2}" rx="6"/>`;
      s += `<rect class="band" data-s="3" x="6" y="${base - 2 * bh - 4}" width="${vbW - 12}" height="${bh + 2}" rx="6"/>`;
      for (let k = 1; k <= N; k++) {
        const x = 20 + dx * (k - 1) + dx / 2;
        let v = 0, t = k; while (t % 5 === 0) { v++; t /= 5; }
        for (let i = 0; i < v; i++) s += `<rect class="blk5" data-s="1" x="${f2(x - 11)}" y="${base - (i + 1) * bh}" width="22" height="${bh - 4}" rx="3"/>`;
        s += `<text class="kl${v ? ' m5' : ''}" x="${f2(x)}" y="${base + 32}" text-anchor="middle" font-size="24">${k}</text>`;
      }
      s += `<line class="baseline" x1="10" x2="${vbW - 10}" y1="${base + 2}" y2="${base + 2}"/>`;
      el.innerHTML = s + '</svg>';
    }
  });

  /* ---------- đồng hồ 12 giờ: data-hours, data-run ---------- */
  D.widget('clock', {
    init(el) {
      const figW = +(el.dataset.w || 30), vbW = figW * 10, c = vbW / 2, R = c - 8;
      let s = `<svg viewBox="0 0 ${vbW} ${vbW}" style="width:${figW}cqw" role="img" aria-label="Đồng hồ 12 giờ"><circle class="face" cx="${c}" cy="${c}" r="${R}"/>`;
      for (let h = 1; h <= 12; h++) {
        const a = h * Math.PI / 6;
        s += `<circle class="hdot h${h}" cx="${f2(c + (R - 40) * Math.sin(a))}" cy="${f2(c - (R - 40) * Math.cos(a))}" r="24"/>`;
        s += `<text class="hr h${h}" x="${f2(c + (R - 40) * Math.sin(a))}" y="${f2(c - (R - 40) * Math.cos(a))}" text-anchor="middle" dominant-baseline="central" font-size="30">${h}</text>`;
      }
      s += `<line class="hand" x1="${c}" y1="${c}" x2="${c}" y2="${f2(c - R + 74)}"/><circle class="hub" cx="${c}" cy="${c}" r="8"/>`;
      el.innerHTML = s + '</svg><div class="clk-cap"></div>';
      el._hand = el.querySelector('.hand'); el._cap = el.querySelector('.clk-cap'); el._c = c;
      this.set(el, 0);
    },
    set(el, hours) {
      el._hand.setAttribute('transform', `rotate(${f2(hours * 30)} ${el._c} ${el._c})`);
      el._cap.textContent = hours > 0 ? 'đã qua ' + Math.round(hours) + ' giờ' : '';
    },
    land(el, on) {
      const h = (+(el.dataset.hours || 100)) % 12 || 12;
      el.querySelectorAll('.h' + h).forEach(x => x.classList.toggle('hit', on));
    },
    step(el, k, ctx) {
      const run = +(el.dataset.run || 2), H = +(el.dataset.hours || 100);
      cancelAnimationFrame(el._raf);
      if (k < run) { el._ran = false; this.land(el, false); this.set(el, 0); return; }
      if (ctx.instant || el._ran) { el._ran = true; this.set(el, H); this.land(el, true); return; }
      const t0 = performance.now(), dur = 3400;
      const tick = now => {
        const p = Math.min(1, (now - t0) / dur), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        this.set(el, H * e);
        if (p < 1) el._raf = requestAnimationFrame(tick);
        else { el._ran = true; this.land(el, true); }
      };
      el._raf = requestAnimationFrame(tick);
    }
  });
})();
