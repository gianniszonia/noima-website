/* NÓIMA website: page behaviour. The 3D mechanism and the explorer live in mechanism.js. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // TODO: the real Noima address once the domain is bought.
  const EMAIL = 'hello@noima.example';

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
  $('#themeBtn').addEventListener('click', () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true));

  /* ---------- Font picker (mockup only) ---------- */
  const fp = $('#fontpick');
  if (fp) {
    const btns = $$('.fp-list button', fp);
    if (!btns.some(b => b.dataset.f === root.dataset.font)) root.dataset.font = 'commissioner';
    const mark = () => btns.forEach(b => b.classList.toggle('on', b.dataset.f === root.dataset.font));
    $('.fp-toggle', fp).addEventListener('click', () => { const o = fp.classList.toggle('open'); $('.fp-toggle', fp).setAttribute('aria-expanded', o); });
    btns.forEach(b => b.addEventListener('click', () => {
      root.dataset.font = b.dataset.f; mark();
      try { localStorage.setItem('noima-font', b.dataset.f); } catch (e) { /* storage blocked */ }
      requestAnimationFrame(onScroll);
    }));
    mark();
  }

  /* ---------- Headings: words rise in. <em> keeps its bronze. ---------- */
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
  $$('[data-split]').forEach(split);

  const revealIO = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  const startReveals = () => $$('[data-split], [data-reveal]').forEach(el => revealIO.observe(el));

  /* ---------- Gentle background changes: the section in the middle of the screen sets the tone ---------- */
  const toneIO = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) document.body.dataset.tone = e.target.dataset.tone || 'a'; }), { rootMargin: '-45% 0px -45% 0px' });
  $$('main > section').forEach(s => toneIO.observe(s));

  /* ---------- Tools carousel: duplicate the strip so it loops seamlessly ---------- */
  const track = $('.marquee-track');
  if (track) {
    const items = [...track.children];
    items.forEach(li => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
  }

  /* ---------- Contact and explorer ---------- */
  $$('[data-email]').forEach(a => { a.href = 'mailto:' + EMAIL; a.textContent = EMAIL; });
  $$('[data-email-btn]').forEach(a => { a.href = 'mailto:' + EMAIL; });
  $$('[data-explore]').forEach(b => b.addEventListener('click', () => { window.NoimaMech?.openExplorer?.(); }));

  /* ---------- Scroll: nav, timeline ---------- */
  const nav = $('#nav'), tl = $('#tl'), tsteps = $$('.tstep');
  let lastY = scrollY;
  function onScroll() {
    const vh = innerHeight, y = scrollY;
    nav.classList.toggle('hide', y > lastY && y > 600);
    nav.classList.toggle('scrolled', y > 40);
    lastY = y;
    const tr = tl.getBoundingClientRect();
    tl.querySelector('i').style.setProperty('--p', clamp((vh * .6 - tr.top) / tr.height, 0, 1));
    tsteps.forEach(st => st.classList.toggle('on', st.getBoundingClientRect().top < vh * .6));
  }
  const heroCopy = $('.hero-copy'), mTitle = $('#mechTitle'), mStage = $('#mechStage'), heroEl = $('#top');
  function alignHero() {
    if (!heroCopy || !mTitle || !mStage || innerWidth <= 800 || heroEl.classList.contains('no-gl')) { heroCopy?.classList.remove('aligned'); return; }
    const h = heroEl.getBoundingClientRect(), t = mTitle.getBoundingClientRect(), b = mStage.getBoundingClientRect();
    const top = t.top - h.top, height = b.bottom - t.top;
    if (height < 320) { heroCopy.classList.remove('aligned'); return; }
    heroCopy.style.setProperty('--ct', top.toFixed(1) + 'px'); heroCopy.style.setProperty('--ch', height.toFixed(1) + 'px');
    heroCopy.classList.add('aligned');
  }
  const alignFor = (ms) => { const end = performance.now() + ms; (function loop() { alignHero(); if (performance.now() < end) requestAnimationFrame(loop); })(); };
  addEventListener('resize', () => alignFor(600));
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Data-work stages: shown as the mechanism turns (hero and explorer) ---------- */
  const STAGES = [
    'Gathering data', 'Connecting your sources', 'Cleaning data', 'Removing duplicates', 'Checking quality',
    'Modelling the data', 'Building the database', 'Designing the pipelines', 'Scheduling the refreshes',
    'Defining your KPIs', 'Writing the calculations', 'Joining the dots', 'Finding the patterns', 'Spotting anomalies',
    'Forecasting what comes next', 'Building the reports', 'Designing the dashboards', 'Telling the story',
    'Automating the process', 'Sending the alerts', 'Retiring the spreadsheets', 'Connecting your systems',
    'Adding AI where it helps', 'Making sense of it'
  ];
  const stageEls = $$('#mechStage, #exStageText');
  let stageNow = 0;
  function showStage(i) {
    if (i === stageNow) return; stageNow = i;
    stageEls.forEach(el => {
      const t = $('.ms-t', el), n = $('.ms-n', el);
      t.classList.add('swap'); n.classList.add('swap'); // the number fades and lifts with the text
      setTimeout(() => { t.textContent = STAGES[i]; n.textContent = String(i + 1).padStart(2, '0'); t.classList.remove('swap'); n.classList.remove('swap'); }, 260);
    });
  }
  addEventListener('noima:turn', (e) => {
    // On the homepage each crank turn is one step. In the explorer the Time slider spans about 89 turns (19 years),
    // so the steps are spread across that range: scrubbing walks through them in order, without skipping.
    const exOpen = !document.getElementById('explorer').hidden;
    const perStep = exOpen ? 89 / STAGES.length : 1;
    const n = STAGES.length, i = Math.min(n - 1, Math.floor(Math.abs(e.detail.turns) / perStep)) % n;
    showStage(i);
  });

  /* ---------- Logo in the header and footer: on hover, the symbol turns once, slowly (dial one way, gear the other) ---------- */
  $$('.spin-logo').forEach(a => {
    a.addEventListener('mouseenter', () => { if (!a.classList.contains('spin') && !reduced) a.classList.add('spin'); });
    a.addEventListener('animationend', (e) => { if (e.animationName === 'gearTurn') a.classList.remove('spin'); });
  });

  /* ---------- Landing ----------
     The logo appears at once and smoothly (the symbol grows in, the letters cascade in), everything in the wrong order: the name reads "IMANÓ" and the letters of each
     tagline word are shuffled. Then the symbol turns once, the dial one way and the gear the other, and as it
     turns every letter and word arcs over or under the others into its place. The last one lands as the symbol stops. */

  /* ---------- The sky: a discreet background ----------
     Faint stars, a few of them joined into constellations (data points joined into meaning), and two or three
     very faint orbits turning slowly with a small bronze body on one of them: the sky the mechanism read.
     It drifts gently with scroll, twinkles subtly, adapts to the theme, and pauses when the tab is hidden. */
  (function sky() {
    const cv = $('#sky'); if (!cv) return;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, stars = [], links = [], seed = 1901;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const FIELD = 2.2; // the star field is taller than the screen; it scrolls at a slower rate than the page
    function build() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed = 1901; stars = []; links = [];
      const n = Math.round(Math.min(170, W * H * FIELD / 14000));
      for (let i = 0; i < n; i++) stars.push({ x: rnd() * W, y: rnd() * H * FIELD, r: .5 + rnd() * rnd() * 1.4, a: .25 + rnd() * .5, tw: rnd() * 6.283, sp: .4 + rnd() * .9 });
      // Constellations: about a third of the stars join their nearest neighbour or two, if close enough
      stars.forEach((s, i) => {
        if (rnd() > .33) return;
        const near = stars.map((o, j) => ({ j, d: Math.hypot(o.x - s.x, o.y - s.y) })).filter(o => o.j !== i && o.d < 150).sort((a, b) => a.d - b.d).slice(0, 1 + (rnd() < .4 ? 1 : 0));
        near.forEach(o => { if (!links.some(l => (l[0] === o.j && l[1] === i))) links.push([i, o.j]); });
      });
    }
    function draw(time) {
      const t = time / 1000, light = root.dataset.theme === 'light';
      const ink = light ? '8,24,46' : '255,255,255', bronze = light ? '168,130,80' : '201,161,108';
      const k = light ? 1.15 : 1; // navy on white needs a touch more to read as clearly
      const off = -(scrollY * .12) % (H * FIELD); // slow parallax
      ctx.clearRect(0, 0, W, H);
      // Orbits: large faint ellipses centred off to the right, turning very slowly
      const cx = W * .82, cy = H * .55 - scrollY * .04;
      [[.42, .16], [.62, .24], [.86, .33]].forEach(([rx, ry], i) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.35 + t * .004 * (i % 2 ? -1 : 1));
        ctx.beginPath(); ctx.ellipse(0, 0, W * rx, W * ry, 0, 0, 6.283);
        ctx.strokeStyle = `rgba(${ink},${.045 * k})`; ctx.lineWidth = 1; ctx.stroke();
        if (i === 1) { // one small bronze body travelling on the middle orbit
          const a = t * .03; ctx.beginPath(); ctx.arc(Math.cos(a) * W * rx, Math.sin(a) * W * ry, 2.2, 0, 6.283);
          ctx.fillStyle = `rgba(${bronze},${.55 * k})`; ctx.fill();
        }
        ctx.restore();
      });
      const yOf = (s) => { let y = s.y + off; y = ((y % (H * FIELD)) + H * FIELD) % (H * FIELD); return y; };
      // Constellation lines
      ctx.lineWidth = .7;
      for (const [i, j] of links) {
        const a = stars[i], b = stars[j], ya = yOf(a), yb = yOf(b);
        if (Math.abs(ya - yb) > 200) continue; // wrapped apart
        if ((ya < -20 && yb < -20) || (ya > H + 20 && yb > H + 20)) continue;
        ctx.beginPath(); ctx.moveTo(a.x, ya); ctx.lineTo(b.x, yb);
        ctx.strokeStyle = `rgba(${ink},${.07 * k})`; ctx.stroke();
      }
      // Stars
      for (const s of stars) {
        const y = yOf(s); if (y < -4 || y > H + 4) continue;
        const tw = reduced ? 1 : .65 + .35 * Math.sin(t * s.sp + s.tw);
        ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 6.283);
        ctx.fillStyle = `rgba(${ink},${(s.a * tw * k).toFixed(3)})`; ctx.fill();
      }
    }
    let raf = 0, lastDraw = 0;
    function loop(time) {
      raf = requestAnimationFrame(loop);
      const busy = document.body.classList.contains('landing-on'); // full rate during the landing hand-over
      if (!busy && time - lastDraw < 33) return; // otherwise about 30 fps is plenty for a slow sky
      lastDraw = time; draw(time);
    }
    build();
    addEventListener('resize', () => { build(); draw(performance.now()); });
    if (reduced) { draw(0); addEventListener('scroll', () => draw(0), { passive: true }); return; }
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(loop); });
    raf = requestAnimationFrame(loop);
  })();

  /* ---------- 3D: run the (already preloaded) 3D files only once, at a still moment, so the landing never stutters ---------- */
  const THREE_FILES = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js',
    'js/mechanism.js?v=33'
  ];
  let loading3D = false;
  function load3D() {
    if (loading3D) return; loading3D = true;
    THREE_FILES.forEach(src => {
      const s = document.createElement('script'); s.src = src; s.async = false; // keep their order
      if (src.startsWith('http')) s.crossOrigin = 'anonymous';
      document.body.appendChild(s);
    });
  }

  function startPage() {
    root.classList.add('started');
    window.NoimaMech?.intro?.();
    startReveals(); onScroll(); alignHero(); setTimeout(alignHero, 500); setTimeout(alignHero, 1400); setTimeout(alignHero, 2800);
  }
  (function landing() {
    const box = $('#landing'), svg = box && $('.landing-logo', box);
    const done = () => { document.body.classList.remove('landing-on', 'landing-leaving'); box?.remove(); };
    if (!svg || reduced) { done(); load3D(); startPage(); return; }
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

    const T = { wait: 950, turn: 2700, hold: 450 }; // wait = the entrance; the turn starts as it settles
    const IN = { symbol: 700, piece: 520, stagger: 16 };
    pieces.forEach((p, i) => { p.inAt = 120 + i * IN.stagger; });
    const symbol = [dial, gear];
    const endTurn = T.wait + T.turn, leaveAt = endTurn + T.hold;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    function pose(t) {
      const u = clamp((t - T.wait) / T.turn, 0, 1), s = easeIO(u);
      // Entrance: the symbol grows from 0.86 and fades in; it then turns.
      const a = easeOut(clamp(t / IN.symbol, 0, 1)), sc = .86 + .14 * a;
      dial.setAttribute('transform', `translate(50 50) scale(${sc.toFixed(4)}) rotate(${(-360 * s - 40 * (1 - a)).toFixed(3)}) translate(-50 -50)`);
      gear.setAttribute('transform', `translate(50 50) scale(${sc.toFixed(4)}) rotate(${(360 * s + 40 * (1 - a)).toFixed(3)}) translate(-50 -50)`);
      symbol.forEach(g => { g.style.opacity = a.toFixed(3); });
      for (const p of pieces) {
        const e = easeIO(clamp((u - p.start) / .68, 0, 1)), d = p.from - p.home;
        const b = easeOut(clamp((t - p.inAt) / IN.piece, 0, 1)); // this piece's entrance
        const x = d * (1 - e), y = (Math.abs(d) > .3 ? -Math.sin(Math.PI * e) * p.arc * Math.sign(-d) : 0) + 9 * (1 - b);
        p.el.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)})`);
        p.el.style.opacity = (b * (.55 + .45 * e)).toFixed(3);
      }
    }

    let t0 = null, finished = false;
    function leave() {
      if (finished) return; finished = true;
      pose(endTurn + 1);
      load3D();
      const to = $('.logo').getBoundingClientRect(), from = svg.getBoundingClientRect();
      const name = $('.name', svg);
      requestAnimationFrame(() => {
        box.classList.add('leaving'); document.body.classList.add('landing-leaving'); // the sky's page colour fades, revealing the homepage
        const ease = 'cubic-bezier(.65,0,.35,1)';
        svg.style.transition = `transform 1.3s ${ease}`;
        svg.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})`;
        // The header logo has no tagline, so its name sits 10.3 units lower: glide the name there too.
        // (a CSS transform, so it actually glides; an SVG transform attribute would jump in one frame)
        name.style.transform = 'translateY(0px)';
        name.getBoundingClientRect();
        name.style.transition = `transform 1.3s ${ease}`;
        name.style.transform = 'translateY(10.3px)';
        setTimeout(startPage, 450);
        setTimeout(() => { document.body.classList.remove('landing-on', 'landing-leaving'); box.style.transition = 'opacity .3s linear'; box.style.opacity = '0'; }, 1320);
        setTimeout(done, 1650);
      });
    }
    function frame(now) {
      if (finished) return;
      if (t0 === null) t0 = now;
      const t = now - t0;
      pose(t);
      if (t >= endTurn + 30) load3D(); // the logo is still now: a good moment for the heavy work
      if (t >= leaveAt) leave(); else requestAnimationFrame(frame);
    }
    pose(0);
    svg.classList.add('ready'); // shown only once it is scrambled: no flash of the finished logo
    requestAnimationFrame(frame);
    box.addEventListener('click', leave);
    addEventListener('keydown', leave, { once: true });
    setTimeout(leave, leaveAt + 3000); // fallback if animation frames are throttled
    setTimeout(load3D, leaveAt + 3000);
  })();
})();
