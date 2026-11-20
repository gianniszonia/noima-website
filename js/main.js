/* NÓIMA website: page behaviour. The 3D mechanism and the explorer live in mechanism.js. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const EMAIL = 'noimadata@gmail.com';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) scrollTo(0, 0);

  /* ---------- Theme: dark by default; light only when chosen ---------- */
  const themeMeta = $('meta[name="theme-color"]');
  function setTheme(t, save) {
    root.dataset.theme = t;
    themeMeta.content = t === 'light' ? '#FFFFFF' : '#08182E';
    if (save) { try { sessionStorage.setItem('noima-theme', t); } catch (e) { /* storage blocked */ } }
    window.NoimaMech?.setTheme?.(t);
  }
  setTheme(root.dataset.theme === 'light' ? 'light' : 'dark', false);
  $('#themeBtn')?.addEventListener('click', () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true)); // light mode is paused: no button for now

  /* ---------- The hero headline: its words rise in. <em> keeps its bronze. ---------- */
  function split(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    const wrap = (text, em) => text.split(/(\s+)/).map(part => {
      if (!part) return '';
      if (/^\s+$/.test(part)) return part.includes(' ') ? ' ' : ' ';
      return part.split(' ').map(w => `<span class="w" aria-hidden="true"><span class="wi" style="--i:${i++}">${em ? `<em>${w}</em>` : w}</span></span>`).join(' ');
    }).join('');
    el.innerHTML = [...el.childNodes].map(n => n.nodeType === 3 ? wrap(n.textContent, false) : wrap(n.textContent, true)).join('');
  }
  $$('main h2[data-reveal]').forEach(h => { h.removeAttribute('data-reveal'); h.setAttribute('data-split', ''); }); // every section heading rises word by word
  $$('[data-split]').forEach(split);
  // each section's dividing line draws itself when the section comes into view
  const secIO = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('seen'); secIO.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  $$('main > section').forEach(sec => secIO.observe(sec));

  const revealIO = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  const startReveals = () => $$('[data-split], [data-reveal], [data-draw]').forEach(el => revealIO.observe(el));

  /* ---------- Founders: the card turns over on a click (its + button, or anywhere on the card), never on hover; the back is written to fit the front ---------- */
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  $$('[data-flip]').forEach(card => {
    const name = $('h3', card).textContent.trim(), front = $('.front', card), back = $('.back', card);
    const mk = (label, aria) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'card-more'; b.setAttribute('aria-label', aria); b.innerHTML = `<span class="cm-t">${label}</span><span class="cm-i" aria-hidden="true"></span>`; return b; };
    const more = front.appendChild(mk('More', 'Show more about ' + name)), less = back.appendChild(mk('Back', 'Back to ' + name));
    card.setAttribute('role', 'group'); card.setAttribute('aria-label', name);
    // The side that is turned away is out of reach (inert); the "More" and "Back" buttons are the keyboard's way.
    const sync = () => {
      const on = card.classList.contains('on');
      card.removeAttribute('tabindex'); front.inert = on; back.inert = !on; front.setAttribute('aria-hidden', on); back.setAttribute('aria-hidden', !on);
    };
    sync();
    card.addEventListener('click', (e) => {
      if (String(getSelection())) return; // selecting text, not flipping
      const viaButton = e.target.closest('.card-more');
      card.classList.toggle('on'); sync();
      if (viaButton) (card.classList.contains('on') ? less : more).focus({ preventScroll: true });
    });
  });

  /* ---------- What we do: a click on a service row opens "What you get" beneath it; another click closes it. The +
     at the end of the row is the same control for the keyboard (its click reaches the row). ---------- */
  $$('.service').forEach(card => {
    const btn = $('.svc-more', card); if (!btn) return;
    card.addEventListener('click', () => { const on = !card.classList.contains('on'); card.classList.toggle('on', on); btn.setAttribute('aria-expanded', on); });
  });

  /* ---------- How we work: the track is tied to the scroll position. As the section moves up the window the bronze
     line fills from α to ω and each step lights when the line reaches it; scrolling back undoes it. ---------- */
  (function track() {
    const tl = $('#tl'); if (!tl) return;
    const steps = $$('.tstep', tl), row = matchMedia('(min-width: 1024px)'), last = steps.length - 1;
    const paint = (p) => steps.forEach((st, k) => { const x = p * last; st.classList.toggle('lit', p > .02 && x >= k - .001); st.style.setProperty('--f', clamp(x - k, 0, 1).toFixed(3)); });
    if (reduced) { paint(1); return; }
    let queued = false;
    const update = () => {
      queued = false;
      const vh = innerHeight, r = tl.getBoundingClientRect();
      // in a row: from the row entering the lower part of the window to its reaching the upper third; stacked: as each step comes up
      paint(clamp((vh * .85 - r.top) / (row.matches ? vh * .38 : r.height * .9), 0, 1)); // in a row: complete just as the section fills the window
    };
    const ask = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); update();
  })();

  /* ---------- Our name and symbol: three parts; a click on a title shows that part ---------- */
  (function nameParts() {
    const box = $('#ns'); if (!box) return;
    const tabs = $$('.ns-tab', box), panels = $$('.ns-panel', box);
    const pick = (k) => {
      tabs.forEach((t, i) => { t.classList.toggle('on', i === k); t.setAttribute('aria-selected', i === k); });
      panels.forEach((p, i) => { p.classList.toggle('on', i === k); p.inert = i !== k; });
      // the symbol assembles, and the logo slides together, the first time its part is opened
      requestAnimationFrame(() => requestAnimationFrame(() => { $$('#sym, .join-logo', panels[k]).forEach(el => el.classList.add('in')); dispatchEvent(new Event('resize')); }));
    };
    tabs.forEach((t, k) => t.addEventListener('click', () => pick(k)));
    panels.forEach((p, i) => { p.inert = i !== 0; });
  })();

  /* ---------- The reading line along the top: grows from α (top of the page) to ω (the end) as you scroll ---------- */
  (function readline() {
    const bar = $('#readline'); if (!bar) return;
    let queued = false;
    const draw = () => { queued = false; const max = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max, 0, 1).toFixed(4) : 0})`; };
    const ask = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); draw();
  })();

  /* ---------- Questions: a click opens one answer and closes the others ---------- */
  $$('.faqs').forEach(list => $$('.faq', list).forEach((item, k, all) => {
    const q = $('.faq-q', item);
    // on desktop the first row of each list (Why work with us, Common questions) starts open, so the section fills its window
    if (k === 0 && matchMedia('(min-width: 1024px)').matches) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
    q.addEventListener('click', () => {
      const open = !item.classList.contains('open');
      all.forEach(o => { o.classList.toggle('open', o === item && open); $('.faq-q', o).setAttribute('aria-expanded', o === item && open); });
    });
  }));

  /* ---------- Our symbol. Four callouts explain its parts.
     Pointing at a callout or at a part (mouse), or keyboard focus, previews that part: it stays at full strength and
     the others step back. A click, tap, Enter or Space picks it, and it stays picked until it is picked again or
     another is. On desktop a thin bronze line joins each callout to its part (drawn here, from the real positions).
     On phones the callouts are chips and the sentence shows in the panel under them. Once, after the symbol has
     assembled, each part lights in turn; any pointer movement, key or tap ends that at once. ---------- */
  (function symbol() {
    const sym = $('#sym'); if (!sym) return;
    const rows = $$('.sym-row', sym), parts = $$('.sp', sym), fig = $('.sym-svg', sym), linesEl = $('#symLines'), panel = $('#symPanel');
    const desk = matchMedia('(min-width: 1280px)');
    const hint = panel.innerHTML;
    let picked = null, preview = null, touring = false;
    const show = () => {
      const part = preview || picked;
      if (part) sym.dataset.on = part; else delete sym.dataset.on;
      if (picked) sym.dataset.picked = picked; else delete sym.dataset.picked;
      rows.forEach(r => { r.classList.toggle('on', r.dataset.part === part); r.setAttribute('aria-pressed', r.dataset.part === picked); });
      $$('[data-part]', linesEl).forEach(l => l.classList.toggle('on', l.dataset.part === part));
      const row = !touring && rows.find(r => r.dataset.part === part);
      panel.innerHTML = row ? `<b>${$('.sr-t', row).textContent}</b>${$('.sr-d', row).textContent}` : hint;
    };

    // Where each line ends, in the symbol's own units: the gear's rim, the ring's upper-right dot, the Ω, the Sun.
    const TARGET = { gear: [24.2, 42.8], dial: [82.3, 18.4], ao: [45.2, 92.6], sky: [97.4, 53] };
    function drawLines() {
      if (!desk.matches) { linesEl.innerHTML = ''; return; }
      const b = sym.getBoundingClientRect(), f = fig.getBoundingClientRect(), u = f.width / 102;
      linesEl.innerHTML = rows.map((r, k) => {
        const part = r.dataset.part, rr = r.getBoundingClientRect(), t = $('.sr-t', r).getBoundingClientRect();
        const left = rr.left < f.left;
        const x0 = (left ? rr.right + 16 : rr.left - 16) - b.left, y0 = t.top + t.height / 2 - b.top;
        const tx = f.left - b.left + (TARGET[part][0] + 1) * u, ty = f.top - b.top + (TARGET[part][1] + 1) * u;
        const dy = Math.abs(ty - y0);
        const xe = left ? Math.max(x0 + 8, tx - dy) : Math.min(x0 - 8, tx + dy); // level first, then at 45 degrees to the part
        return `<path data-part="${part}" style="--k:${k}" pathLength="1" d="M${x0.toFixed(1)} ${y0.toFixed(1)}L${xe.toFixed(1)} ${y0.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}"/><circle data-part="${part}" style="--k:${k}" cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="2.5"/>`;
      }).join('');
      show();
    }
    drawLines();
    let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawLines, 100); });
    document.fonts?.ready.then(drawLines); addEventListener('load', drawLines);

    // No animation when the symbol appears: its parts only light up when one is pointed at, focused or picked.
    sym.classList.add('in', 'ready');
    const stopTour = () => {};
    const sec = $('#name');
    ['pointermove', 'pointerdown', 'keydown'].forEach(ev => (ev === 'keydown' ? window : sec).addEventListener(ev, stopTour, { passive: true }));

    [...rows, ...parts].forEach(el => {
      el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { touring = false; preview = el.dataset.part; show(); } });
      el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { preview = null; show(); } });
      el.addEventListener('click', () => { touring = false; picked = picked === el.dataset.part ? null : el.dataset.part; preview = null; show(); });
    });
    rows.forEach(r => {
      r.addEventListener('focus', () => { if (r.matches(':focus-visible')) { touring = false; preview = r.dataset.part; show(); } });
      r.addEventListener('blur', () => { preview = null; show(); });
    });
  })();

  /* ---------- Our name: the numbers count up the first time they come into view ---------- */
  (function counters() {
    const els = $$('[data-count]'); if (!els.length) return;
    const fmt = (n) => n.toLocaleString('en-GB');
    const run = (el) => {
      const to = +el.dataset.count, from = +(el.dataset.from || 0), suf = el.dataset.suffix || '', t0 = performance.now(), dur = 1200;
      const year = to > 1700 && to < 2100 && el.dataset.from; // a year: no thousands comma
      const step = (now) => {
        const u = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 4), v = Math.round(from + (to - from) * e);
        el.textContent = (year ? String(v) : fmt(v)) + suf;
        if (u < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (reduced) return;
    els.forEach(el => { el.textContent = (el.dataset.from ? el.dataset.from : '0') + (el.dataset.suffix || ''); });
    const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); setTimeout(() => run(e.target), 250); } }), { threshold: .6 });
    els.forEach(el => io.observe(el));
  })();

  /* ---------- Contact ---------- */
  $$('[data-email]').forEach(a => { a.href = 'mailto:' + EMAIL; a.textContent = EMAIL; });
  $$('[data-email-btn]').forEach(a => { a.href = 'mailto:' + EMAIL; });
  const copyBtn = $('#copyEmail'), copyStatus = $('#copyStatus');
  copyBtn?.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(EMAIL); ok = true; } catch (e) { /* no clipboard access */ }
    copyStatus.textContent = ok ? 'Copied: ' + EMAIL : 'Could not copy. The address is ' + EMAIL;
    if (ok) { copyBtn.classList.add('done'); setTimeout(() => copyBtn.classList.remove('done'), 1500); }
    setTimeout(() => { copyStatus.textContent = ''; }, 4000);
  });

  /* ---------- Explorer: the 3D files load on demand where the hero has no live model (under 1024 px) ---------- */
  const exEl = document.getElementById('explorer');
  let exWait = 0, exOpener = null;
  const exReady = () => window.NoimaMech && window.NoimaMech.v; // the real model, not the no-WebGL stand-in
  function cancelLoading() { // the files did not come, WebGL is missing, or the visitor closed it while it loaded
    if (!exEl.classList.contains('is-loading')) return;
    clearTimeout(exWait); exEl.classList.remove('open', 'is-loading'); exEl.hidden = true; document.body.style.overflow = '';
    exOpener?.focus?.();
  }
  $$('[data-explore]').forEach(b => b.addEventListener('click', () => {
    if (exReady()) { window.NoimaMech.openExplorer(); return; }
    if (window.NoimaMech) return; // no WebGL here: nothing to open
    // show the explorer at once, in its loading state, while the 3D files arrive (openExplorer clears that state)
    exOpener = b; exEl.hidden = false; exEl.classList.add('open', 'is-loading'); document.body.style.overflow = 'hidden';
    $('#exClose')?.focus();
    load3D();
    const t0 = performance.now();
    (function wait() {
      if (!exEl.classList.contains('is-loading')) return; // closed meanwhile
      if (exReady()) { document.body.style.overflow = ''; exOpener.focus(); window.NoimaMech.openExplorer(); return; }
      if (window.NoimaMech || failed3D || performance.now() - t0 > 15000) { cancelLoading(); return; }
      exWait = setTimeout(wait, 80);
    })();
  }));
  $('#exClose')?.addEventListener('click', cancelLoading);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') cancelLoading(); });

  /* ---------- Menu (phones and tablets): a full-screen sheet ---------- */
  const menu = $('#menu'), menuBtn = $('#menuBtn');
  function setMenu(open) {
    if (!menu || open === !menu.hidden) return;
    menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Close the menu' : 'Menu');
    document.body.classList.toggle('menu-open', open);
    $$('main, footer').forEach(n => { n.inert = open; });
    if (open) { menu.hidden = false; menu.getBoundingClientRect(); menu.classList.add('open'); }
    else { menu.classList.remove('open'); setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, reduced ? 0 : 320); }
  }
  if (menu) {
    $$('nav a', menu).forEach((a, i) => a.style.setProperty('--i', i));
    menuBtn.addEventListener('click', () => setMenu(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    $('#nav').addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); }); // the logo and "Contact" stay in reach above the open menu
    addEventListener('keydown', (e) => {
      if (menu.hidden) return;
      if (e.key === 'Escape') { setMenu(false); menuBtn.focus(); return; }
      if (e.key !== 'Tab') return; // keep the keyboard inside the open menu (and its button)
      const f = [menuBtn, ...$$('a', menu)], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
    });
    matchMedia('(min-width: 1024px)').addEventListener?.('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ---------- Header: hides on the way down, returns on the way up; marks the section you are in ---------- */
  const nav = $('#nav');
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY;
    nav.classList.toggle('hide', y > lastY && y > 600 && !document.body.classList.contains('menu-open'));
    nav.classList.toggle('scrolled', y > 40);
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const navLinks = $$('.nav-links a');
  const hereIO = new IntersectionObserver((es) => es.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => { if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }), { rootMargin: '-40% 0px -60% 0px' });
  $$('main > section').forEach(s => hereIO.observe(s));

  /* ---------- Data-work steps: shown under the hero model as it turns. Twelve, so the loop reaches the last one
     ("Making sense of it") in 48 s, then starts again. The explorer writes its own caption (mechanism.js) from
     this same list. ---------- */
  const STAGES = [
    'Collecting the exports', 'Cleaning the data', 'Checking the totals', 'Building the warehouse',
    'Building the pipelines', 'Defining your KPIs', 'Joining the tables', 'Finding the patterns',
    'Designing the dashboards', 'Automating the month-end', 'Retiring the spreadsheets', 'Making sense of it'
  ];
  window.NOIMA_STAGES = STAGES;
  const stageEl = $('#mechStage');
  let stageNow = 0;
  function showStage(i) {
    if (i === stageNow || !stageEl) return; stageNow = i;
    const t = $('.ms-t', stageEl), n = $('.ms-n', stageEl);
    t.classList.add('swap'); n.classList.add('swap'); // the number fades and lifts with the text
    setTimeout(() => { t.textContent = STAGES[i]; n.textContent = String(i + 1).padStart(2, '0'); t.classList.remove('swap'); n.classList.remove('swap'); }, 260);
  }
  addEventListener('noima:turn', (e) => {
    if (!document.getElementById('explorer').hidden) return; // the explorer has its own caption
    // a crank turn takes 12 s on the homepage: a new step every quarter of a turn (3 s), looping
    const n = STAGES.length, k = Math.floor(e.detail.turns * 4);
    showStage(((k % n) + n) % n);
  });
  /* ---------- Logo in the header and footer: on hover, the symbol turns once, slowly (dial one way, gear the other) ---------- */
  $$('.spin-logo').forEach(a => {
    a.addEventListener('mouseenter', () => { if (!a.classList.contains('spin') && !reduced) a.classList.add('spin'); });
    a.addEventListener('animationend', (e) => { if (e.animationName === 'gearTurn') a.classList.remove('spin'); });
  });

  /* ---------- Landing ----------
     The logo appears at once and softly (the whole logo fades in and settles from a slightly smaller size, with no
     rotation), everything in the wrong order: the name reads "IMANÓ" and the letters of each
     tagline word are shuffled. Then the symbol turns once, the dial one way and the gear the other, and as it
     turns every letter and word arcs over or under the others into its place. The last one lands as the symbol stops. */

  /* ---------- The background: the sky meets data (round 10) ----------
     Faint stars everywhere and, from 1280 px wide, a few small networks in the side margins (a loose mesh, a chain
     like a pipeline, a hub with spokes, a loose grid like a table; no circles). Each network assembles itself
     (points appear, links draw in) the first time it scrolls into view. Now and then a faint bronze pulse travels
     along the links. The networks live outside the text column and move with the page, so they never sit behind
     text; none in the hero. The stars drift with a gentle parallax.
     Cost: it redraws at the screen's rate only while the page scrolls; otherwise about 15 times a second for the
     stars' slow twinkle (30 while a network is on screen). It stops in a hidden tab and while the explorer or the
     menu covers it. Still with reduced motion. */
  (function sky() {
    const cv = $('#sky'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const PAR = 1, SPAR = .1; // networks move with the page (so they stay in the empty spaces), stars at 10%
    let W = 0, H = 0, dpr = 1, seed = 1901, stars = [], nets = [], pulses = [], masks = [], nextPulse = 0, lastT = 0, contentH = 0, netsLive = false;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const TYPES = ['mesh', 'chain', 'star', 'grid']; // no circles (round 11)

    function makeNet(type, cx, cy, R) {
      const nodes = [], edges = [];
      const add = (x, y, r) => nodes.push({ x, y, r, ph: rnd() * 6.283 });
      const link = (i, j) => { if (i !== j && !edges.some(e => (e[0] === i && e[1] === j) || (e[0] === j && e[1] === i))) edges.push([i, j]); };
      add(cx, cy, 1.9); // the hub
      if (type === 'grid') { // a loose lattice with a few cells missing, like a table of records
        const cols = 3 + Math.floor(rnd() * 2), rows = 3, step = R * .62, rot = (rnd() - .5) * .5, idx = [];
        nodes.length = 0;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          if (r * cols + c > 0 && rnd() < .18) { idx.push(-1); continue; }
          const gx = (c - (cols - 1) / 2) * step + (rnd() - .5) * step * .25, gy = (r - (rows - 1) / 2) * step + (rnd() - .5) * step * .25;
          add(cx + gx * Math.cos(rot) - gy * Math.sin(rot), cy + gx * Math.sin(rot) + gy * Math.cos(rot), r * cols + c === 0 ? 1.9 : .9 + rnd() * .6); idx.push(nodes.length - 1);
        }
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const a = idx[r * cols + c]; if (a < 0) continue;
          if (c + 1 < cols && idx[r * cols + c + 1] >= 0 && rnd() < .85) link(a, idx[r * cols + c + 1]);
          if (r + 1 < rows && idx[(r + 1) * cols + c] >= 0 && rnd() < .7) link(a, idx[(r + 1) * cols + c]);
        }
      } else if (type === 'chain') {
        const k = 7 + Math.floor(rnd() * 4), ang = rnd() * 6.283, bend = (rnd() - .5) * .9;
        nodes.length = 0;
        for (let i = 0; i < k; i++) { const t = i / (k - 1) - .5, a = ang + bend * t; add(cx + Math.cos(a) * t * R * 2.2, cy + Math.sin(a) * t * R * 2.2 + Math.sin(t * 6) * R * .12, i === Math.floor(k / 2) ? 1.9 : .9 + rnd() * .6); }
        for (let i = 0; i < k - 1; i++) link(i, i + 1);
        for (let b = 0; b < 2; b++) { const at = 1 + Math.floor(rnd() * (k - 2)), a = ang + (rnd() < .5 ? 1.4 : -1.4); add(nodes[at].x + Math.cos(a) * R * .45, nodes[at].y + Math.sin(a) * R * .45, .9); link(at, nodes.length - 1); }
      } else if (type === 'star') {
        const k = 6 + Math.floor(rnd() * 3), a0 = rnd() * 6.283;
        for (let i = 0; i < k; i++) { const a = a0 + i / k * 6.283 + (rnd() - .5) * .4, d = R * (.6 + rnd() * .5); add(cx + Math.cos(a) * d, cy + Math.sin(a) * d, .9 + rnd() * .7); link(0, i + 1); }
        for (let i = 1; i <= k; i++) if (rnd() < .4) { const a = nodes[i], o = rnd() * 6.283; add(a.x + Math.cos(o) * R * .35, a.y + Math.sin(o) * R * .35, .8); link(i, nodes.length - 1); }
      } else { // mesh
        const k = 8 + Math.floor(rnd() * 6);
        for (let i = 0; i < k; i++) { const a = rnd() * 6.283, d = R * Math.sqrt(rnd()); add(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .8, .9 + rnd() * .8); }
        nodes.forEach((n, i) => nodes.map((o, j) => ({ j, d: Math.hypot(o.x - n.x, o.y - n.y) })).filter(o => o.j !== i).sort((p, q) => p.d - q.d).slice(0, 2).forEach(o => link(i, o.j)));
      }
      // assembly order: outward from the first node, link by link (so the network grows like a graph being traced)
      const order = new Array(nodes.length).fill(-1); order[0] = 0; let q = [0], step = 0;
      while (q.length) { const nq = []; q.forEach(i => edges.forEach(([a, b]) => { const j = a === i ? b : b === i ? a : -1; if (j >= 0 && order[j] < 0) { order[j] = ++step; nq.push(j); } })); q = nq; }
      order.forEach((o, i) => { if (o < 0) order[i] = ++step; });
      const adj = nodes.map(() => []); edges.forEach((e, k) => { adj[e[0]].push(k); adj[e[1]].push(k); });
      return { type, nodes, edges, adj, order, steps: step + 1, cx, cy, p: 0 };
    }

    function build(keepProgress) {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const main = $('main'); contentH = (main ? main.offsetHeight : H * 6) + 300;
      const old = nets; seed = 1901; stars = []; nets = []; pulses = [];
      // a fuller sky (Giannis, 20 Nov 2026): more stars, a little larger and brighter; about one in twelve is a bright
      // one with a soft halo; and a few clusters, where a dozen small stars gather. Everywhere, the landing included.
      const n = Math.round(Math.min(360, W * H * 2.2 / 6800)); // toned down a little (the single stars only; clusters and networks unchanged)
      for (let i = 0; i < n; i++) { const big = rnd() < .08; stars.push({ x: rnd() * W, y: rnd() * H * 2.2, r: big ? 1.3 + rnd() * .6 : .45 + rnd() * rnd() * 1.1, a: big ? .42 + rnd() * .2 : .16 + rnd() * .3, g: big, tw: rnd() * 6.283, sp: .4 + rnd() * .9 }); }
      const groups = Math.max(3, Math.round(W / 260));
      for (let c = 0; c < groups; c++) {
        const cx = rnd() * W, cy = rnd() * H * 2.2, R = 46 + rnd() * 64, m = 9 + Math.floor(rnd() * 8);
        for (let i = 0; i < m; i++) { const ang = rnd() * 6.283, d = R * rnd() * rnd(); stars.push({ x: cx + Math.cos(ang) * d * 1.3, y: cy + Math.sin(ang) * d, r: .45 + rnd() * .9, a: .3 + rnd() * .4, g: false, tw: rnd() * 6.283, sp: .4 + rnd() * .9 }); }
      }
      masks = [];
      if (W < 1280) return; // narrower than 1280 px: stars only (nothing to measure)
      measureMasks();
      // networks go only where the page is empty: for each band down the page, try spots and keep one that
      // clears all text (shrinking the network if needed); if a band has no room, it gets no network.
      const wrapEl = $('main .wrap'), wr = wrapEl ? wrapEl.getBoundingClientRect() : { left: 0, right: W };
      const padX = wrapEl ? parseFloat(getComputedStyle(wrapEl).paddingLeft) : 0;
      const textL = wr.left + padX - 14, textR = wr.right - padX + 14; // the networks live outside the text column, in the side margins
      const gapY = Math.max(260, H * .45); // round 16: more networks (never 0, or this loop would never end)
      const reach = 1.35; // a hub's spokes and a chain's ends reach a little past R
      const free = (cx, cy, R) => cx - R > 6 && cx + R < W - 6 && (cx + R * reach < textL || cx - R * reach > textR) && !masks.some(m => cx + R > m[0] && cx - R < m[0] + m[2] && cy + R > m[1] && cy - R < m[1] + m[3]);
      const sy0 = scrollY, secs = $$('main > section').map(el => { const r = el.getBoundingClientRect(); return [r.top + sy0, r.bottom + sy0]; }), usedIn = {};
      let i = 0, lastType = '';
      for (let band = H * .15; band < contentH; band += gapY, i++) {
        let best = null;
        // the networks alternate sides down the page (right, left, right…); the other side only if the first has no room
        for (const R of [54, 44, 34]) {
          for (let tries = 0; tries < 60 && !best; tries++) { const side = (i % 2 === 1) === (tries < 40), cx = side ? rnd() * textL : textR + rnd() * (W - textR), cy = band + rnd() * gapY; if (free(cx, cy, R)) best = { cx, cy, R }; }
          if (best) break;
        }
        if (best) {
          // never two of the same shape in one section, and never the same shape twice in a row
          const sk = secs.findIndex(b => best.cy >= b[0] && best.cy < b[1]), used = usedIn[sk] || (usedIn[sk] = []);
          let type = TYPES[(i + Math.floor(rnd() * 2)) % TYPES.length];
          for (let n = 0; n < TYPES.length && (used.includes(type) || type === lastType); n++) type = TYPES[(TYPES.indexOf(type) + 1) % TYPES.length];
          if (used.includes(type)) continue; // every shape is already in this section
          used.push(type); lastType = type;
          nets.push(makeNet(type, best.cx, best.cy, best.R * .9));
        }
      }
      if (keepProgress) nets.forEach((nt, k) => { if (old[k] && Math.abs(old[k].cy - nt.cy) < 4) nt.p = old[k].p; });
    }

    // Text never sits on a network: these areas (page coordinates) are kept clear when the networks are placed
    const MASK_SEL = 'main h1, main h2, main h3, main p, main .card, main .face, main .btn, main .tstep, main .service, main .ns, main .faq, main .stat, main .tool-group';
    function measureMasks() {
      const y0 = scrollY; masks = [];
      // during the landing, keep the networks clear of the logo too (the page under it is already laid out)
      const lg = document.body.classList.contains('landing-on') && $('.landing-logo');
      if (lg) { const r = lg.getBoundingClientRect(); if (r.width) masks.push([r.left - 60, r.top + y0 - 60, r.width + 120, r.height + 120]); }
      $$(MASK_SEL).forEach(el => {
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
        masks.push([r.left - 22, r.top + y0 - 18, r.width + 44, r.height + 36]);
      });
      // the hero has networks too (Giannis, 20 Nov 2026), but never over the 3D model
      const stage = $('#heroStage');
      if (stage) { const r = stage.getBoundingClientRect(); if (r.width) masks.push([r.left - 40, r.top + y0 - 40, r.width + 80, r.height + 80]); }
      // and none across a section's dividing line: a band around every section edge is kept clear
      $$('main > section').forEach(el => { const r = el.getBoundingClientRect(); masks.push([-200, r.bottom + y0 - 110, innerWidth + 400, 220]); });
    }

    function draw(time) {
      const t = time / 1000, dt = Math.min(.1, t - lastT); lastT = t;
      const light = root.dataset.theme === 'light';
      const ink = light ? '8,24,46' : '255,255,255', bronze = light ? '168,130,80' : '201,161,108';
      const k = light ? 1.15 : 1; // navy on white needs a touch more to read as clearly
      const landing = document.body.classList.contains('landing-on');
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      const sy = scrollY * PAR;
      const drift = (nd) => reduced ? [0, 0] : [Math.cos(t * .2 + nd.ph) * 2.2, Math.sin(t * .25 + nd.ph) * 2.2];
      const live = []; // networks on screen this frame, for the pulses
      for (const nt of nets) {
        const scy = nt.cy - sy; if (scy < -260 || scy > H + 260) continue;
        // assemble the first time it comes into view (after the landing); it stays assembled
        if (scy < H * .92 && nt.p < 1) nt.p = reduced ? 1 : Math.min(1, nt.p + dt / 2.2);
        if (nt.p <= 0) continue;
        const grow = nt.p * nt.steps; // how many nodes have appeared
        const P = nt.nodes.map(nd => { const d = drift(nd); return [nd.x + d[0], nd.y - sy + d[1]]; });
        const vis = nt.order.map(o => Math.max(0, Math.min(1, grow - o))); // 0..1 per node
        ctx.lineWidth = .8;
        nt.edges.forEach(([i, j]) => {
          const a = vis[i], b = vis[j]; if (!a || !b) return;
          const [from, to, f] = nt.order[i] < nt.order[j] ? [P[i], P[j], b] : [P[j], P[i], a]; // draw from the earlier node
          ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f);
          ctx.strokeStyle = `rgba(${ink},${.2 * k})`; ctx.stroke();
        });
        nt.nodes.forEach((nd, i) => {
          if (!vis[i]) return; const [x, y] = P[i];
          ctx.beginPath(); ctx.arc(x, y, nd.r * (.6 + .4 * vis[i]), 0, 6.283); ctx.fillStyle = `rgba(${ink},${(i === 0 ? .8 : .6) * vis[i] * k})`; ctx.fill();
        });
        if (nt.p >= 1) live.push({ nt, P });
      }
      // pulses: a few, faint, hopping along the links of assembled networks
      if (!reduced && live.length) {
        if (t > nextPulse && pulses.length < 3) {
          const L = live[Math.floor(Math.random() * live.length)], e = Math.floor(Math.random() * L.nt.edges.length);
          pulses.push({ nt: L.nt, e, from: L.nt.edges[e][0], t0: t, dur: 1.8 + Math.random() * 1.2, hops: 2 + Math.floor(Math.random() * 3) });
          nextPulse = t + .9 + Math.random() * 1.2;
        }
        pulses = pulses.filter(p => {
          const L = live.find(l => l.nt === p.nt); if (!L) return false;
          let u = (t - p.t0) / p.dur;
          if (u >= 1) {
            const at = p.nt.edges[p.e][0] === p.from ? p.nt.edges[p.e][1] : p.nt.edges[p.e][0];
            const next = p.nt.adj[at].filter(x => x !== p.e);
            if (--p.hops <= 0 || !next.length) return false;
            p.e = next[Math.floor(Math.random() * next.length)]; p.from = at; p.t0 = t; u = 0;
          }
          const e = p.nt.edges[p.e], a = L.P[p.from], b = L.P[e[0] === p.from ? e[1] : e[0]];
          const s2 = u * u * (3 - 2 * u), x = a[0] + (b[0] - a[0]) * s2, y = a[1] + (b[1] - a[1]) * s2, f = Math.sin(Math.PI * u) * .4 + .6;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 6);
          g.addColorStop(0, `rgba(${bronze},${.42 * f * k})`); g.addColorStop(1, `rgba(${bronze},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.283); ctx.fill();
          ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 6.283); ctx.fillStyle = `rgba(${bronze},${.6 * f * k})`; ctx.fill();
          return true;
        });
      }
      netsLive = live.length > 0 || nets.some(nt => nt.p > 0 && nt.p < 1);
      // stars, on top, very faint
      const FH = H * 2.2, off = -scrollY * SPAR;
      for (const s of stars) {
        const y = (((s.y + off) % FH) + FH) % FH; if (y < -4 || y > H + 4) continue;
        const tw = reduced ? 1 : .65 + .35 * Math.sin(t * s.sp + s.tw);
        if (s.g) { ctx.beginPath(); ctx.arc(s.x, y, s.r * 3.2, 0, 6.283); ctx.fillStyle = `rgba(${ink},${(s.a * tw * k * .12).toFixed(3)})`; ctx.fill(); }
        ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 6.283);
        ctx.fillStyle = `rgba(${ink},${(s.a * tw * k).toFixed(3)})`; ctx.fill();
      }
    }

    let raf = 0, lastDraw = 0, lastY = -1;
    const covered = document.getElementById('explorer');
    function loop(time) {
      raf = requestAnimationFrame(loop);
      if ((covered && !covered.hidden) || document.body.classList.contains('menu-open')) return; // nothing of the sky shows
      const y = scrollY, moved = y !== lastY;
      // while the page scrolls the sky keeps up with it frame by frame; at rest only the slow twinkle needs drawing
      if (!moved && time - lastDraw < (netsLive ? 33 : 66)) return;
      lastY = y; lastDraw = time; draw(time);
    }
    build(false);
    let rz = 0;
    addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { build(true); draw(performance.now()); }, 120); });
    if (reduced) { draw(0); addEventListener('scroll', () => draw(0), { passive: true }); setTimeout(() => { build(true); draw(0); }, 300); return; }
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(loop); });
    raf = requestAnimationFrame(loop);
  })();

  /* ---------- 3D: the files run only once, after the landing has handed over, so the landing never stutters ---------- */
  const THREE_FILES = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js',
    'js/mechanism.js?v=43'
  ];
  // Where the hero has the live model (from 1024 px), open the connections to the two script hosts early, so the
  // files are quick to fetch when the landing ends. Phones make no such connection until the explorer is asked for.
  ['https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'].forEach(h => {
    const l = document.createElement('link'); l.rel = 'preconnect'; l.href = h; l.crossOrigin = 'anonymous'; document.head.appendChild(l);
  });
  let loading3D = false, failed3D = false;
  function load3D() {
    if (loading3D) return; loading3D = true;
    THREE_FILES.forEach(src => {
      const s = document.createElement('script'); s.src = src; s.async = false; // keep their order
      if (src.startsWith('http')) s.crossOrigin = 'anonymous';
      // a file that does not arrive: the hero shows the symbol instead of an empty stage, and the explorer closes
      if (!/RoomEnvironment/.test(src)) s.onerror = () => { failed3D = true; $('#top')?.classList.add('no-gl'); };
      document.body.appendChild(s);
    });
  }

  function startPage() {
    root.classList.add('started');
    window.NoimaMech?.intro?.();
    startReveals(); onScroll();
  }
  (function landing() {
    const box = $('#landing'), svg = box && $('.landing-logo', box);
    const done = () => { document.body.classList.remove('landing-on', 'landing-leaving'); box?.remove(); };
    // The live model is in the hero only from 1024 px; below that the 3D files load when the explorer is opened.
    const wide = matchMedia('(min-width: 1024px)');
    const hero3D = () => load3D(); // the live model is in the hero on every screen
    // fetch the 3D files while the landing plays, so that only building the model is left for the still moment
    THREE_FILES.forEach(src => { const l = document.createElement('link'); l.rel = 'preload'; l.as = 'script'; l.href = src; if (src.startsWith('http')) l.crossOrigin = 'anonymous'; document.head.appendChild(l); });
    wide.addEventListener?.('change', hero3D);
    if (!svg || reduced) { done(); hero3D(); startPage(); return; }
    const dial = $('.dial', svg), gear = $('.gear', svg);
    const bb = (el) => { const b = el.getBBox(); return { x: b.x, w: b.width }; };
    const easeIO = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Lay a group of glyphs out in a given order, with the same average spacing as the logo.
    function scrambled(boxes, order) {
      const n = boxes.length, span = boxes[n - 1].x + boxes[n - 1].w - boxes[0].x;
      const gap = (span - boxes.reduce((sum, b) => sum + b.w, 0)) / (n - 1);
      const xs = []; let x = boxes[0].x;
      order.forEach(i => { xs[i] = x; x += boxes[i].w + gap; });
      return xs;
    }
    // A fixed shuffle in which no glyph starts in its own place.
    function shuffle(n, seedOffset) {
      if (n === 1) return [0];
      const o = [...Array(n).keys()];
      let seed = 77 + seedOffset; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let tries = 0; tries < 50; tries++) {
        for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
        if (o.every((v, i) => v !== i)) break;
      }
      return o;
    }

    const pieces = [];
    // The name: I M A N Ó
    const letters = $$('.lt', svg), L = letters.map(bb), lx = scrambled(L, [2, 3, 4, 0, 1]);
    letters.forEach((el, i) => pieces.push({ el, home: L[i].x, from: lx[i], arc: 15, start: [0, .1, .18, .26, .3][i] }));
    // The tagline: each word keeps its place, but its letters start shuffled and arc into order, like the name.
    $$('.tw', svg).forEach((word, w) => {
      const glyphs = $$('.tg', word), G = glyphs.map(bb), gx = scrambled(G, shuffle(glyphs.length, w * 13));
      glyphs.forEach((el, i) => pieces.push({ el, home: G[i].x, from: gx[i], arc: 7, start: .14 + w * .08 + (i / glyphs.length) * .1 }));
    });
    $$('.td', svg).forEach((el) => { const b = el.getBBox(); pieces.push({ el, home: b.x, from: b.x, arc: 0, start: .2 }); });

    const T = { wait: 650, turn: 2450, hold: 0 }; // entrance, then the turn. No fixed pause after it: the finished logo stands still for as long as the 3D model takes to build (below), then glides
    const IN = 650; // the entrance: fade in and settle, no rotation
    const easeOutBack = (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
    const endTurn = T.wait + T.turn, leaveAt = endTurn + T.hold;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    function pose(t) {
      const u = clamp((t - T.wait) / T.turn, 0, 1), s = easeIO(u);
      // Entrance: the whole logo fades in and settles from 94% with the softest overshoot. No rotation until the turn.
      if (!finished) {
        const a = clamp(t / IN, 0, 1), sc = .94 + .06 * easeOutBack(a);
        svg.style.opacity = easeOut(a).toFixed(3); svg.style.transform = a < 1 ? `scale(${sc.toFixed(4)})` : '';
      }
      dial.setAttribute('transform', `translate(50 50) rotate(${(-360 * s).toFixed(3)}) translate(-50 -50)`);
      gear.setAttribute('transform', `translate(50 50) rotate(${(360 * s).toFixed(3)}) translate(-50 -50)`);
      for (const p of pieces) {
        const e = easeIO(clamp((u - p.start) / .68, 0, 1)), d = p.from - p.home;
        const x = d * (1 - e), y = Math.abs(d) > .3 ? -Math.sin(Math.PI * e) * p.arc * Math.sign(-d) : 0;
        p.el.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)})`);
        p.el.style.opacity = (.55 + .45 * e).toFixed(3);
      }
    }

    let t0 = null, finished = false;
    function leave() {
      if (finished) return; finished = true;
      pose(endTurn + 1);
      svg.style.opacity = '1'; svg.style.transform = ''; svg.style.transformOrigin = '0 0';
      hero3D(); // if the landing was skipped before the model was built, start building it now
      const to = $('.logo').getBoundingClientRect(), from = svg.getBoundingClientRect();
      const name = $('.name', svg);
      let went = false; // run on the next frame, or after 120 ms if frames are paused (a background tab)
      const glide = () => {
        if (went) return; went = true;
        box.classList.add('leaving'); document.body.classList.add('landing-leaving'); // the sky's page colour fades, revealing the homepage
        const ease = 'cubic-bezier(.65,0,.35,1)';
        svg.style.transition = `transform 1.1s ${ease}`;
        svg.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})`;
        // The header logo has no tagline, so its name sits 10.3 units lower: glide the name there too.
        // (a CSS transform, so it actually glides; an SVG transform attribute would jump in one frame)
        name.style.transform = 'translateY(0px)';
        name.getBoundingClientRect();
        name.style.transition = `transform 1.1s ${ease}`;
        name.style.transform = 'translateY(10.3px)';
        setTimeout(startPage, 350);
        setTimeout(() => { document.body.classList.remove('landing-on', 'landing-leaving'); box.style.transition = 'opacity .3s linear'; box.style.opacity = '0'; }, 1120);
        setTimeout(done, 1450);
      };
      requestAnimationFrame(glide); setTimeout(glide, 120);
    }
    function frame(now) {
      if (finished) return;
      if (t0 === null) t0 = now;
      const t = now - t0;
      pose(t);
      if (t < leaveAt) { requestAnimationFrame(frame); return; }
      // The logo is finished and still. Build the 3D model now (about half a second to a second of solid work that
      // would make anything moving stutter), and glide to the header as soon as it is ready, so the model is live
      // the moment the homepage appears. Never wait more than 2.5 s; under 1024 px there is no model to wait for.
      hero3D();
      const w0 = performance.now();
      (function ready() { if (finished) return; if (window.NoimaMech || failed3D || performance.now() - w0 > 2500) requestAnimationFrame(leave); else setTimeout(ready, 30); })();
    }
    svg.style.transformOrigin = '50% 50%';
    pose(0);
    svg.classList.add('ready'); // shown only once it is scrambled: no flash of the finished logo
    requestAnimationFrame(frame);
    box.addEventListener('click', leave);
    addEventListener('keydown', leave, { once: true });
    setTimeout(leave, leaveAt + 3000); // fallback if animation frames are throttled
    setTimeout(hero3D, leaveAt + 3000);
  })();
})();
