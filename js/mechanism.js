/* NÓIMA website: a detailed 3D model of the Antikythera mechanism (Three.js r128 globals).
   Layout follows antikythera/RESEARCH.md §11. It is a model to explore, not an exact reconstruction:
     - a wooden case of about 34 × 18 × 9 cm (uncertain), shown portrait and open at the sides so the gears show;
     - bronze front and back plates on corner pillars; inscribed doors (seen when taken apart);
     - front: a fixed zodiac ring (Greek sign names) inside the movable 365-day Egyptian calendar ring (month names);
       inside them, the cosmos display as a RECONSTRUCTION (2021 UCL-style rings for the five planets), the Sun,
       the date pointer and the half-silver, half-black Moon-phase ball;
     - back: Metonic spiral (upper, 5 turns, 235 cells) with the Games and Callippic dials inside it;
             Saros spiral (lower, 4 turns, 223 cells, eclipse glyphs) with the Exeligmos dial inside it;
     - the four-spoked main wheel b1 (about 13 cm, triangular teeth), driven by the crank through a crown gear;
     - a pin-and-slot pair riding on a large wheel for the Moon's changing speed.
   Gear positions, most tooth counts, planet motions and all lettering are illustrative.
   One renderer serves two modes: the hero (drag to turn the crank) and a full-screen explorer (orbit, zoom, take apart). */
(function () {
  'use strict';
  const heroCanvas = document.getElementById('mech');
  if (!heroCanvas) return;
  const hero = heroCanvas.parentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noop = { intro() {}, setTheme() {}, openExplorer() {} };
  const fallback = () => { hero.classList.add('no-gl'); window.NoimaMech = noop; document.querySelectorAll('[data-explore]').forEach(b => { b.hidden = true; }); };
  if (!window.THREE) return fallback();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: heroCanvas, antialias: true, alpha: true }); } catch (e) { return fallback(); }
  if (!renderer.getContext()) return fallback();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .5, 600);
  const TAU = Math.PI * 2;
  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();

  // Image-based lighting makes the bronze read as metal
  // (uses THREE.RoomEnvironment when loaded, otherwise a small built-in studio: a grey room with soft light panels)
  function studio() {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x3a3f4a, side: THREE.BackSide })));
    const panel = (w, h, pos, rot, rgb, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.rotation.set(...rot); env.add(m); };
    panel(7, 7, [0, 5.8, 0], [Math.PI / 2, 0, 0], [1, .97, .92], 5);
    panel(4, 8, [-5.8, 1, 1], [0, Math.PI / 2, 0], [1, .9, .78], 2.4);
    panel(4, 8, [5.8, 0, -1], [0, -Math.PI / 2, 0], [.75, .85, 1], 1.6);
    panel(8, 3, [0, -1, 5.8], [0, Math.PI, 0], [1, 1, 1], 1.2);
    return env;
  }
  if (THREE.PMREMGenerator) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(THREE.RoomEnvironment ? new THREE.RoomEnvironment() : studio(), .04).texture;
      pmrem.dispose();
    } catch (e) { /* lights alone still work */ }
  }

  /* ---------- Procedural textures ---------- */
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  function canvasTex(w, h, draw, srgb = true, repeat = null) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = maxAniso;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    return t;
  }
  // Aged bronze: warm base, soft blotches, a hint of verdigris, fine scratches
  function patina(x, w, h, base = '#B48B55') {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const r = 20 + rnd() * 110, cx = rnd() * w, cy = rnd() * h, g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      const tone = rnd() < .18 ? '94,108,82' : rnd() < .5 ? '96,66,36' : '214,178,122';
      g.addColorStop(0, `rgba(${tone},${.06 + rnd() * .12})`); g.addColorStop(1, `rgba(${tone},0)`);
      x.fillStyle = g; x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
    for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(${rnd() < .5 ? '60,40,20' : '235,205,150'},${rnd() * .06})`; x.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
    x.lineWidth = .6;
    for (let i = 0; i < 160; i++) { x.strokeStyle = `rgba(240,215,165,${.04 + rnd() * .06})`; const sx = rnd() * w, sy = rnd() * h, a = rnd() * TAU, l = 10 + rnd() * 60; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); x.stroke(); }
  }
  function roughNoise(x, w, h) {
    x.fillStyle = '#7a7a7a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const r = 20 + rnd() * 90, cx = rnd() * w, cy = rnd() * h, g = x.createRadialGradient(cx, cy, 0, cx, cy, r), v = Math.floor(80 + rnd() * 120); g.addColorStop(0, `rgba(${v},${v},${v},.5)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`); x.fillStyle = g; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); }
  }
  const T_PATINA = canvasTex(512, 512, (x, w, h) => patina(x, w, h), true, 1 / 6);
  const T_PATINA_DARK = canvasTex(512, 512, (x, w, h) => patina(x, w, h, '#9A7444'), true, 1 / 6);
  const T_ROUGH = canvasTex(256, 256, roughNoise, false, 1 / 6);
  const T_WOOD = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#4B3220'; x.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      const k = Math.sin(y * .045) * 10 + Math.sin(y * .011) * 30;
      x.strokeStyle = `rgba(${rnd() < .5 ? '33,20,11' : '110,76,48'},${.12 + rnd() * .25})`; x.lineWidth = 1 + rnd() * 1.5;
      x.beginPath(); for (let px = 0; px <= w; px += 16) x.lineTo(px, y + Math.sin(px * .02 + k * .1) * 3 + k * .15); x.stroke();
    }
  }, true, 1 / 8);

  /* ---------- Materials ---------- */
  const M = {
    bronze: new THREE.MeshStandardMaterial({ color: lin('#F2D7A6'), map: T_PATINA, roughnessMap: T_ROUGH, metalness: .94, roughness: .3, envMapIntensity: 1.25 }),
    bronzeOld: new THREE.MeshStandardMaterial({ color: lin('#B89C70'), map: T_PATINA_DARK, roughnessMap: T_ROUGH, metalness: .86, roughness: .5, envMapIntensity: .85 }),
    bronzeMid: new THREE.MeshStandardMaterial({ color: lin('#E2C597'), map: T_PATINA, roughnessMap: T_ROUGH, metalness: .9, roughness: .4, envMapIntensity: 1 }),
    edgeGlint: new THREE.LineBasicMaterial({ color: 0xFFE6B8, transparent: true, opacity: .2, depthWrite: false }),
    bronzeBright: new THREE.MeshStandardMaterial({ color: lin('#FFE2AE'), metalness: .95, roughness: .28, envMapIntensity: 1.2 }),
    plate: new THREE.MeshStandardMaterial({ color: lin('#C9AE86'), map: T_PATINA_DARK, roughnessMap: T_ROUGH, metalness: .75, roughness: .62, envMapIntensity: .55, transparent: true, opacity: .3, depthWrite: false, side: THREE.DoubleSide }),
    silver: new THREE.MeshStandardMaterial({ color: lin('#E9ECEF'), metalness: .95, roughness: .25 }),
    blackened: new THREE.MeshStandardMaterial({ color: lin('#1B1B1E'), metalness: .6, roughness: .45 }),
    gold: new THREE.MeshStandardMaterial({ color: lin('#F5C451'), metalness: 1, roughness: .2, emissive: lin('#4A3205'), emissiveIntensity: .6 }),
    wood: new THREE.MeshStandardMaterial({ color: lin('#C9A27A'), map: T_WOOD, metalness: 0, roughness: .8 }),
    door: new THREE.MeshStandardMaterial({ color: lin('#E6C99A'), map: T_PATINA_DARK, metalness: .8, roughness: .55, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    planet: {
      mercury: new THREE.MeshStandardMaterial({ color: lin('#9C9DA3'), metalness: .45, roughness: .55 }),
      venus: new THREE.MeshStandardMaterial({ color: lin('#F1DDA6'), metalness: .7, roughness: .3, emissive: lin('#3A2C0C'), emissiveIntensity: .4 }),
      mars: new THREE.MeshStandardMaterial({ color: lin('#C2482E'), metalness: .25, roughness: .45, emissive: lin('#3A0D05'), emissiveIntensity: .35 }),
      jupiter: new THREE.MeshStandardMaterial({ color: lin('#FFFFFF'), metalness: .2, roughness: .5 }),
      saturn: new THREE.MeshStandardMaterial({ color: lin('#E6CF92'), metalness: .6, roughness: .32, emissive: lin('#2E2408'), emissiveIntensity: .35 })
    }
  };
  const lights = {};
  // Glints: soft additive sprites, a cheap stand-in for bloom
  const T_GLINT = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,244,220,1)'); g.addColorStop(.18, 'rgba(255,214,150,.55)'); g.addColorStop(.5, 'rgba(255,190,110,.12)'); g.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,240,210,.35)'; x.fillRect(w / 2 - .7, 6, 1.4, w - 12); x.fillRect(6, w / 2 - .7, w - 12, 1.4); });
  function glint(size, opacity) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T_GLINT, color: 0xffffff, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(size); sp.raycast = () => {}; return sp; }
  function setTheme(t) {
    const light = t === 'light';
    renderer.toneMappingExposure = light ? .98 : 1.05;
    if (lights.hemi) { lights.hemi.intensity = light ? .55 : .4; lights.key.intensity = light ? 1.0 : 1.15; }
    M.wood.color.copy(lin(light ? '#D8B48C' : '#C9A27A'));
  }

  /* ---------- Part names for the explorer ---------- */
  const RECON = 'Reconstruction (2021 UCL model): the inscriptions describe the planets, but their gearing is lost.';
  const PART = {
    b1: ['Main wheel (b1)', 'The largest gear, about 13 cm across, with four spokes and originally 223 teeth. It turned once per tropical year.'],
    a1: ['Crown gear (a1)', 'Passed the turn of the crank to the main wheel.'],
    crank: ['Crank', 'Now lost; its socket survives on Fragment A. One turn moved the date by about 78 days.'],
    train: ['Gear train', 'At least 30 hand-cut bronze gears survive, with triangular teeth about 1.6 mm apart. Their layout here is illustrative.'],
    pinslot: ['Pin-and-slot gears', 'An epicyclic pair that speeds the Moon up and slows it down, as in Hipparchus’ lunar theory.'],
    zodiac: ['Zodiac ring', 'A fixed ring of the twelve signs, each 30°.'],
    calendar: ['Egyptian calendar ring', 'A movable 365-day ring set in a channel. Some argue it was a 354-day lunar calendar.'],
    sun: ['Sun and date pointer', 'The mean Sun, perhaps doubling as the date pointer.'],
    moon: ['Moon pointer and phase ball', 'The ball is half silver, half black, and turns to show the Moon’s phase.'],
    mercury: ['Mercury', RECON], venus: ['Venus', RECON], mars: ['Mars', RECON], jupiter: ['Jupiter', RECON], saturn: ['Saturn', RECON],
    parapegma: ['Parapegma', 'An inscribed star calendar of risings and settings, with weather signs. (Lettering here is decorative.)'],
    metonic: ['Metonic spiral', 'The upper back dial: 235 lunar months, or 19 years, in five turns.'],
    callippic: ['Callippic dial', 'Inside the Metonic dial: 76 years, four Metonic cycles.'],
    games: ['Games dial', 'A 4-year cycle of the Panhellenic games. The only pointer that turns anticlockwise.'],
    saros: ['Saros spiral', 'The lower back dial: 223 lunar months in four turns. Glyphs in 51 of its cells predict eclipses.'],
    exeligmos: ['Exeligmos dial', 'Three Saros cycles (54 years): the hour correction for eclipse predictions.'],
    plate: ['Bronze plate', 'Front and back plates carried the dials; the gears sat between them.'],
    backdoor: ['Back door', 'Its inscriptions seem to be the instruction manual, describing the displays. (Lettering here is decorative.)'],
    frontdoor: ['Front door', 'The front door was inscribed too. (Lettering here is decorative.)'],
    case: ['Case', 'A wooden case of about 34 × 18 × 9 cm (uncertain): roughly the size of a shoebox.']
  };
  const tag = (o, key) => { o.userData.part = key; return o; };
  const tagAll = (o, key) => { o.traverse(c => { if (c.isMesh) c.userData.part = key; }); return o; };

  /* ---------- Engraving helpers (canvas, drawn as seen from the front of each face) ---------- */
  const ENGRAVE = 'rgba(46,28,12,.9)';
  function arcText(x, text, cx, cy, r, centre, px) {
    x.font = `${px}px "Times New Roman", Georgia, serif`;
    const chars = [...text], widths = chars.map(c => x.measureText(c).width + px * .12), total = widths.reduce((a, b) => a + b, 0);
    let a = centre - total / r / 2;
    chars.forEach((c, i) => { const da = widths[i] / r, m = a + da / 2; x.save(); x.translate(cx + r * Math.cos(m), cy + r * Math.sin(m)); x.rotate(m + Math.PI / 2); x.fillText(c, -widths[i] / 2 + px * .06, px * .35); x.restore(); a += da; });
  }
  function ringFace(rIn, rOut, size, draw) {
    // A textured ring: RingGeometry maps uv planar over its outer radius, so the canvas is a square of side 2·rOut.
    const tex = canvasTex(size, size, (x, w) => {
      const s = w / 2 / rOut, c = w / 2;
      patina(x, w, w, '#C29A62');
      x.fillStyle = ENGRAVE; x.strokeStyle = ENGRAVE;
      x.lineWidth = Math.max(1, s * .03);
      [rIn + .04, rOut - .04].forEach(r => { x.beginPath(); x.arc(c, c, r * s, 0, TAU); x.stroke(); });
      draw(x, c, s);
    });
    return new THREE.MeshStandardMaterial({ map: tex, roughnessMap: T_ROUGH, metalness: .8, roughness: .5, color: lin('#FFFFFF') });
  }

  /* Gear geometry: triangular teeth, optional upright spokes or round lightening holes */
  const MOD = .058; // pitch-diameter per tooth: 223 teeth ≈ 13 cm
  function gearGeo(T, o) {
    o = o || {};
    const a = TAU / T, rp = T * MOD / 2, ro = rp + MOD * .9, rr = rp - MOD * .9;
    const s = new THREE.Shape();
    for (let i = 0; i < T; i++) { const c = i * a; [[c - .5 * a, rr], [c, ro]].forEach(([t, r], k) => { const x = r * Math.cos(t), y = r * Math.sin(t); if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y); }); }
    s.closePath();
    const ri = rr - Math.max(.16, rp * .09), rh = Math.max(.22, rp * .15);
    if (o.spokes && rp > .9) {
      const n = o.spokes, w = Math.max(.1, rp * .05), dO = Math.asin(w / ri), dI = Math.asin(Math.min(.95, w / rh));
      for (let k = 0; k < n; k++) { const a0 = k * TAU / n, a1 = (k + 1) * TAU / n, h = new THREE.Path(); h.absarc(0, 0, ri, a0 + dO, a1 - dO, false); h.absarc(0, 0, rh, a1 - dI, a0 + dI, true); h.closePath(); s.holes.push(h); }
    } else if (o.holes && rp > .8) {
      const n = o.holes, rc = (ri + rh) / 2, hr = Math.min((ri - rh) / 2 * .78, rc * Math.sin(Math.PI / n) * .72);
      for (let k = 0; k < n; k++) { const t = k * TAU / n, h = new THREE.Path(); h.absarc(rc * Math.cos(t), rc * Math.sin(t), hr, 0, TAU, true); s.holes.push(h); }
    }
    const ax = new THREE.Path(); ax.absarc(0, 0, .09, 0, TAU, true); s.holes.push(ax);
    const depth = o.depth || .14;
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .03, bevelSize: .018, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -depth / 2);
    return g;
  }
  function hubCollar(rp, depth) {
    const r = Math.max(.2, rp * .16);
    const g = new THREE.CylinderGeometry(r, r, depth + .14, 20); g.rotateX(Math.PI / 2); return g;
  }

  /* ---------- Assembly ---------- */
  const mech = new THREE.Group(); scene.add(mech);
  const parts = []; // { obj, base, apart }
  function addPart(obj, apart, parent = mech) { parent.add(obj); parts.push({ obj, base: obj.position.clone(), apart: new THREE.Vector3(...apart) }); return obj; }
  const W = 18, H = 34, D = 9, th = .32;
  const FRONT_C = new THREE.Vector2(0, 2);

  // Case: top and bottom boards with corner posts, open at the sides so the gear train shows
  const boardGeo = new THREE.BoxGeometry(W, th, D);
  [[H / 2 - th / 2, [0, 7, 0]], [-H / 2 + th / 2, [0, -7, 0]]].forEach(([y, ap]) => { const b = tag(new THREE.Mesh(boardGeo, M.wood), 'case'); b.position.y = y; addPart(b, [ap[0], ap[1] * 1.8, ap[2]]); });
  const postGeo = new THREE.BoxGeometry(th, H - 2 * th, th);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => { const p = tag(new THREE.Mesh(postGeo, M.wood), 'case'); p.position.set(sx * (W / 2 - th / 2), 0, sz * (D / 2 - th / 2)); addPart(p, [sx * 12, 0, sz * 6]); });

  // Plates: the front plate has an opening behind the dial rings so the gears show through
  const PW = W - 2 * th - .1, PH = H - 2 * th - .1;
  const frontShape = new THREE.Shape(); frontShape.moveTo(-PW / 2, -PH / 2); frontShape.lineTo(PW / 2, -PH / 2); frontShape.lineTo(PW / 2, PH / 2); frontShape.lineTo(-PW / 2, PH / 2); frontShape.closePath();
  const hole = new THREE.Path(); hole.absarc(FRONT_C.x, FRONT_C.y, 8.3, 0, TAU, true); frontShape.holes.push(hole);
  const frontGeo = new THREE.ExtrudeGeometry(frontShape, { depth: .14, bevelEnabled: false, curveSegments: 64 }); frontGeo.translate(0, 0, -.07);
  const frontPlate = tag(new THREE.Mesh(frontGeo, M.plate), 'plate'); frontPlate.position.z = 4.0; addPart(frontPlate, [0, 0, 16]);
  const backPlate = tag(new THREE.Mesh(new THREE.BoxGeometry(PW, PH, .14), M.plate), 'plate'); backPlate.position.z = -4.0; addPart(backPlate, [0, 0, -16]);
  // Pillars holding the plates apart, with collars
  const pillarGeo = new THREE.CylinderGeometry(.16, .16, 8, 14); pillarGeo.rotateX(Math.PI / 2);
  const collarGeo = new THREE.CylinderGeometry(.28, .28, .22, 18); collarGeo.rotateX(Math.PI / 2);
  [[-7.2, 15.2], [7.2, 15.2], [-7.2, -15.2], [7.2, -15.2], [-7.2, 0], [7.2, 0]].forEach(([x, y]) => {
    const p = new THREE.Group(); p.position.set(x, y, 0);
    p.add(new THREE.Mesh(pillarGeo, M.bronzeOld));
    [-3.8, 3.8].forEach(z => { const c = new THREE.Mesh(collarGeo, M.bronze); c.position.z = z; p.add(c); });
    tagAll(p, 'plate'); addPart(p, [x * 1.4, y * .2, 0]);
  });

  // Screws on the plates: around the dial opening and in the corners
  const screwGeo = new THREE.CylinderGeometry(.13, .13, .06, 16); screwGeo.rotateX(Math.PI / 2);
  const slotGeo = new THREE.BoxGeometry(.2, .035, .03);
  function screw(parent, x, y, z, a) { const g = new THREE.Group(); g.position.set(x, y, z); g.add(new THREE.Mesh(screwGeo, M.bronzeOld)); const sl = new THREE.Mesh(slotGeo, M.blackened); sl.position.z = .03; sl.rotation.z = a; g.add(sl); tagAll(g, 'plate'); parent.add(g); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; screw(frontPlate, FRONT_C.x + Math.cos(a) * 8.75, FRONT_C.y + Math.sin(a) * 8.75, .09, a * 2.3); }
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => { screw(frontPlate, sx * (PW / 2 - .6), sy * (PH / 2 - .6), .09, sx * .7); screw(backPlate, sx * (PW / 2 - .6), sy * (PH / 2 - .6), -.09, sy * .9); });
  // Parapegma panels above and below the front dial (decorative lettering)
  const GREEK = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';
  function lettering(w, h, rows, px, alpha = .85) {
    return canvasTex(w, h, (x) => {
      x.clearRect(0, 0, w, h); x.fillStyle = `rgba(46,28,12,${alpha})`; x.font = `${px}px "Times New Roman", Georgia, serif`;
      for (let r = 0; r < rows; r++) { let s = ''; const n = Math.floor(w / (px * .72)); for (let i = 0; i < n; i++) s += rnd() < .17 ? ' ' : GREEK[Math.floor(rnd() * GREEK.length)]; x.globalAlpha = .55 + rnd() * .35; x.fillText(s, px * .6, px * 1.3 + r * px * 1.5); }
    });
  }
  const paraMat = new THREE.MeshStandardMaterial({ map: lettering(1400, 420, 13, 24, .5), transparent: true, metalness: .5, roughness: .6, depthWrite: false });
  [[13.3, 4.6], [-10.6, 9.2]].forEach(([y, h]) => { const m = tag(new THREE.Mesh(new THREE.PlaneGeometry(PW - 1.4, h), paraMat), 'parapegma'); m.position.set(0, y, .09); frontPlate.add(m); });

  // Doors (only shown when taken apart), inscribed
  const doorGeo = new THREE.PlaneGeometry(PW, PH);
  const backDoor = tag(new THREE.Mesh(doorGeo, M.door.clone()), 'backdoor');
  backDoor.material.map = lettering(768, 1440, 44, 26, .9); backDoor.material.color = lin('#D9BE90');
  backDoor.position.z = -D / 2 - .2; backDoor.rotation.y = Math.PI; addPart(backDoor, [0, 0, -30]);
  const frontDoor = tag(new THREE.Mesh(doorGeo, M.door.clone()), 'frontdoor');
  frontDoor.material.map = lettering(768, 1440, 30, 26, .7); frontDoor.material.color = lin('#D9BE90');
  frontDoor.position.z = D / 2 + .2; addPart(frontDoor, [0, 0, 30]);
  const doors = [backDoor, frontDoor];

  // Gear train (positions illustrative; b1 sits at the front dial's centre)
  const DEFS = [
    { key: 'b1', T: 223, x: FRONT_C.x, y: FRONT_C.y, z: 3.0, mat: 'bright', spokes: 4, depth: .2 },
    { comp: 0, T: 64, z: 2.3, holes: 5 },
    { mesh: 1, ang: 180, T: 38, z: 2.3, holes: 5 },
    { comp: 2, T: 48, z: 1.5, holes: 5 },
    { mesh: 3, ang: -100, T: 24, z: 1.5 },
    { comp: 4, T: 127, z: .6, spokes: 6 },
    { mesh: 5, ang: -40, T: 32, z: .6, holes: 5 },
    { comp: 6, T: 188, z: -.6, spokes: 6, key: 'e3' },
    { comp: 6, T: 32, z: -1.8, holes: 5 },
    { mesh: 8, ang: -90, T: 96, z: -1.8, spokes: 6 },
    { comp: 9, T: 15, z: -2.9 },
    { mesh: 10, ang: -80, T: 27, z: -2.9 },
    { comp: 11, T: 40, z: -3.5, holes: 5 },
    { mesh: 9, ang: 200, T: 50, z: -1.8, holes: 5 },
    { comp: 13, T: 20, z: -2.9 },
    { mesh: 14, ang: 230, T: 45, z: -2.9, holes: 5 },
    { mesh: 0, ang: 70, T: 53, z: 3.0, holes: 5 },
    { comp: 16, T: 30, z: 1.9 },
    { mesh: 17, ang: 140, T: 60, z: 1.9, holes: 6 },
    { comp: 18, T: 15, z: .7 },
    { mesh: 19, ang: -150, T: 60, z: .7, holes: 6 },
    { comp: 20, T: 44, z: -.6, holes: 5 },
    { mesh: 21, ang: 60, T: 54, z: -.6, holes: 6 },
    { comp: 22, T: 20, z: -2.1 },
    { mesh: 23, ang: -100, T: 53, z: -2.1, holes: 5 },
    { comp: 24, T: 15, z: -3.2 },
    { mesh: 25, ang: 10, T: 36, z: -3.2, holes: 5 },
    { mesh: 0, ang: -20, T: 30, z: 3.0, holes: 5 },
    { comp: 27, T: 50, z: 2.1, holes: 5 },
    { mesh: 28, ang: -70, T: 26, z: 2.1 },
    { mesh: 0, ang: 230, T: 34, z: 3.0, holes: 5 },
    { comp: 30, T: 22, z: 2.1 }
  ];
  const gears = [];
  DEFS.forEach(d => {
    const g = { T: d.T, a: TAU / d.T, x: d.x || 0, y: d.y || 0, z: d.z, ratio: 1, phase: 0 };
    if (d.mesh !== undefined) {
      const p = gears[d.mesh], t = d.ang * Math.PI / 180, dist = (p.T + d.T) * MOD / 2, q = p.T / d.T;
      g.x = p.x + dist * Math.cos(t); g.y = p.y + dist * Math.sin(t); g.ratio = -q * p.ratio; g.phase = t + Math.PI + .5 * g.a + q * (t - p.phase);
    } else if (d.comp !== undefined) { const p = gears[d.comp]; g.x = p.x; g.y = p.y; g.ratio = p.ratio; g.phase = p.phase + .4; }
    const depth = d.depth || .14, rp = d.T * MOD / 2;
    const mat = d.mat === 'bright' || d.z >= 1.4 ? M.bronze : d.z >= -.7 ? M.bronzeMid : M.bronzeOld;
    const geo = gearGeo(d.T, d), mesh = tag(new THREE.Mesh(geo, mat), d.key === 'b1' ? 'b1' : 'train');
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), M.edgeGlint));
    const hub = tag(new THREE.Mesh(hubCollar(rp, depth), M.bronzeOld), d.key === 'b1' ? 'b1' : 'train'); mesh.add(hub);
    if (rp > 1.2) { // hub screws on the larger wheels
      const hr = Math.max(.2, rp * .16) * .62, sg = new THREE.CylinderGeometry(.05, .05, depth + .2, 8); sg.rotateX(Math.PI / 2);
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + .4, sc = new THREE.Mesh(sg, M.blackened); sc.position.set(Math.cos(a) * hr, Math.sin(a) * hr, 0); mesh.add(sc); }
    }
    // a little wear: each wheel's bronze is slightly different
    if (d.key !== 'b1') { const mm = mat.clone(); mm.color.offsetHSL((rnd() - .5) * .015, (rnd() - .5) * .08, (rnd() - .5) * .07); mm.roughness = mat.roughness + (rnd() - .5) * .12; mesh.material = mm; }
    mesh.position.set(g.x, g.y, g.z);
    addPart(mesh, [g.x * .3, g.y * .08, g.z * 4.2]);
    g.mesh = mesh; gears.push(g);
  });
  const b1 = gears[0], e3 = gears[7];
  const rimGlints = [0, 1.7, 3.4, 5.0].map(a => { const g = glint(1.6, 0), rp = 223 * MOD / 2; g.position.set(Math.cos(a) * rp, Math.sin(a) * rp, .2); g.userData.a = a; b1.mesh.add(g); return g; });
  const boss = tag(new THREE.Mesh(new THREE.CylinderGeometry(.6, .66, .5, 36), M.bronzeOld), 'b1'); boss.rotation.x = Math.PI / 2; b1.mesh.add(boss);

  // Axles with end collars
  const axles = {};
  gears.forEach(g => { const k = g.x.toFixed(2) + ',' + g.y.toFixed(2); (axles[k] = axles[k] || { x: g.x, y: g.y, z: [] }).z.push(g.z); });
  const smallCollar = new THREE.CylinderGeometry(.13, .13, .12, 12); smallCollar.rotateX(Math.PI / 2);
  Object.values(axles).forEach(a => {
    const z0 = Math.min(...a.z) - .3, z1 = Math.max(...a.z) + .3, grp = new THREE.Group();
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, z1 - z0, 10), M.bronzeOld); pin.rotation.x = Math.PI / 2; grp.add(pin);
    [z0, z1].forEach(z => { const c = new THREE.Mesh(smallCollar, M.bronze); c.position.z = z - (z0 + z1) / 2; grp.add(c); });
    grp.position.set(a.x, a.y, (z0 + z1) / 2); tagAll(grp, 'train');
    addPart(grp, [a.x * .3, a.y * .08, (z0 + z1) / 2 * 4.2]);
  });

  // Pin-and-slot pair riding on e3
  const pinslot = new THREE.Group(); pinslot.position.set(3.2, .7, -.4); e3.mesh.add(pinslot);
  const kGeo = gearGeo(50, { depth: .12 });
  const k1 = tag(new THREE.Mesh(kGeo, M.bronze), 'pinslot'); pinslot.add(k1);
  const k2 = tag(new THREE.Mesh(kGeo, M.bronzeOld), 'pinslot'); k2.position.set(.12, .05, -.2); pinslot.add(k2);
  const kPin = tag(new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .45, 8), M.silver), 'pinslot'); kPin.rotation.x = Math.PI / 2; kPin.position.set(.6, 0, -.1); k1.add(kPin);
  const slot = tag(new THREE.Mesh(new THREE.BoxGeometry(.5, .12, .03), M.blackened), 'pinslot'); slot.position.set(.6, 0, -.12); k2.add(slot);

  // Crank on the right side, through the case, driving the crown gear a1
  const crankGrp = new THREE.Group(); crankGrp.position.set(W / 2 + .35, FRONT_C.y, 3.0); addPart(crankGrp, [9, 0, 4]);
  const crankArm = new THREE.Group(); crankGrp.add(crankArm);
  const shaft = tag(new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 3.6, 14), M.bronzeOld), 'crank'); shaft.rotation.z = Math.PI / 2; shaft.position.x = -1.3; crankArm.add(shaft);
  const armShape = new THREE.Shape(); armShape.moveTo(-.22, 0); armShape.lineTo(.22, 0); armShape.lineTo(.14, 2.6); armShape.lineTo(-.14, 2.6); armShape.closePath();
  const armGeo = new THREE.ExtrudeGeometry(armShape, { depth: .18, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }); armGeo.rotateY(Math.PI / 2); armGeo.translate(.35, 0, 0);
  crankArm.add(tag(new THREE.Mesh(armGeo, M.bronze), 'crank'));
  const handle = new THREE.Group(); handle.position.set(.95, 2.5, 0); crankArm.add(handle);
  const grip = new THREE.LatheGeometry([new THREE.Vector2(.0, -.75), new THREE.Vector2(.2, -.72), new THREE.Vector2(.26, -.4), new THREE.Vector2(.22, 0), new THREE.Vector2(.26, .4), new THREE.Vector2(.2, .72), new THREE.Vector2(0, .75)], 20);
  const gripM = tag(new THREE.Mesh(grip, M.wood), 'crank'); gripM.rotation.z = Math.PI / 2; handle.add(gripM);
  const crankHit = tag(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.2, 12), M.hit), 'crank'); crankHit.position.set(.6, 1.3, 0); crankArm.add(crankHit); // a generous grab area
  const a1 = tag(new THREE.Mesh(gearGeo(48, { depth: .14, holes: 5 }), M.bronze), 'a1'); a1.rotation.y = Math.PI / 2; a1.position.set(W / 2 - 2.25, FRONT_C.y, 3.0 - 1.5); addPart(a1, [5, 0, 10]);

  /* ---------- Front: zodiac, calendar, cosmos display (reconstruction), pointers ---------- */
  const front = new THREE.Group(); front.position.set(FRONT_C.x, FRONT_C.y, 4.12); addPart(front, [0, 0, 24]);
  const ZOD = ['ΚΡΙΟΣ', 'ΤΑΥΡΟΣ', 'ΔΙΔΥΜΟΙ', 'ΚΑΡΚΙΝΟΣ', 'ΛΕΩΝ', 'ΠΑΡΘΕΝΟΣ', 'ΧΗΛΑΙ', 'ΣΚΟΡΠΙΟΣ', 'ΤΟΞΟΤΗΣ', 'ΑΙΓΟΚΕΡΩΣ', 'ΥΔΡΟΧΟΟΣ', 'ΙΧΘΥΕΣ'];
  const MONTHS = ['ΘΩΘ', 'ΦΑΩΦΙ', 'ΑΘΥΡ', 'ΧΟΙΑΚ', 'ΤΥΒΙ', 'ΜΕΧΙΡ', 'ΦΑΜΕΝΩΘ', 'ΦΑΡΜΟΥΘΙ', 'ΠΑΧΩΝ', 'ΠΑΥΝΙ', 'ΕΠΙΦΙ', 'ΜΕΣΟΡΗ'];
  const zodiacMat = ringFace(5.9, 7.0, 2048, (x, c, s) => {
    for (let i = 0; i < 360; i++) { const a = -Math.PI / 2 + i / 360 * TAU, r0 = i % 30 === 0 ? 5.94 : i % 5 === 0 ? 6.62 : 6.75; x.lineWidth = i % 30 === 0 ? s * .03 : s * .012; x.beginPath(); x.moveTo(c + r0 * s * Math.cos(a), c + r0 * s * Math.sin(a)); x.lineTo(c + 6.96 * s * Math.cos(a), c + 6.96 * s * Math.sin(a)); x.stroke(); }
    ZOD.forEach((n, i) => arcText(x, n, c, c, 6.22 * s, -Math.PI / 2 + (i + .5) / 12 * TAU, s * .34));
    for (let i = 0; i < 36; i++) { if (i % 3 === 0) continue; arcText(x, i % 3 === 1 ? 'Ι' : 'Κ', c, c, 6.5 * s, -Math.PI / 2 + i * 10 / 360 * TAU, s * .15); }
  });
  front.add(tag(new THREE.Mesh(new THREE.RingGeometry(5.9, 7.0, 128, 1), zodiacMat), 'zodiac'));
  const calRing = new THREE.Group(); calRing.position.z = -.02; front.add(calRing);
  const calMat = ringFace(7.1, 8.25, 2048, (x, c, s) => {
    for (let i = 0; i < 365; i++) { const a = -Math.PI / 2 + i / 365 * TAU, long = i % 30 === 0; x.lineWidth = long ? s * .03 : s * .012; x.beginPath(); x.moveTo(c + (long ? 7.14 : 7.86) * s * Math.cos(a), c + (long ? 7.14 : 7.86) * s * Math.sin(a)); x.lineTo(c + 8.2 * s * Math.cos(a), c + 8.2 * s * Math.sin(a)); x.stroke(); }
    MONTHS.forEach((n, i) => arcText(x, n, c, c, 7.42 * s, -Math.PI / 2 + (i * 30 + 15) / 365 * TAU, s * .3));
    for (let m = 0; m < 12; m++) [10, 20].forEach((d, k) => arcText(x, k ? 'Κ' : 'Ι', c, c, 7.7 * s, -Math.PI / 2 + (m * 30 + d) / 365 * TAU, s * .13));
    arcText(x, 'ΕΠΑΓΟΜΕΝΑΙ', c, c, 7.42 * s, -Math.PI / 2 + 362.5 / 365 * TAU, s * .18);
  });
  calRing.add(tag(new THREE.Mesh(new THREE.RingGeometry(7.1, 8.25, 128, 1), calMat), 'calendar'));

  // Cosmos display (reconstruction): crisp concentric rings, each carrying its planet
  const cosmos = new THREE.Group(); cosmos.position.z = .06; front.add(cosmos);
  const PLANETS = [ // name, ring radius, mean period in days (illustrative), bead size, glint tint
    ['mercury', 2.0, 87.97, .3, 0xd8dce6], ['venus', 2.65, 224.7, .38, 0xffe6a8], ['mars', 3.3, 686.98, .34, 0xff8a6a], ['jupiter', 4.05, 4332.6, .46, 0xfff0d6], ['saturn', 4.75, 10759.2, .4, 0xffe2a0]
  ];
  const T_JUP = canvasTex(256, 128, (x, w, h) => { const bands = ['#EFE2C8', '#D9B98F', '#F3E8D2', '#C9A27A', '#EDE0C5', '#B98F66', '#F2E6CF', '#D7B58B', '#EEDFC4']; bands.forEach((c, i) => { x.fillStyle = c; x.fillRect(0, i * h / bands.length, w, h / bands.length + 1); }); x.fillStyle = 'rgba(176,92,60,.6)'; x.beginPath(); x.ellipse(w * .66, h * .62, 16, 7, 0, 0, TAU); x.fill(); });
  M.planet.jupiter.map = T_JUP;
  const tintedGlint = (size, op, col) => { const g = glint(size, op); g.material.color.set(col); return g; };
  const ringLine = new THREE.LineBasicMaterial({ color: 0xFFE9C2, transparent: true, opacity: .5, depthWrite: false });
  const planetRings = PLANETS.map(([key, r, period, size, tint], i) => {
    const ring = new THREE.Group(); ring.position.z = i * .03; cosmos.add(ring);
    ring.add(tag(new THREE.Mesh(new THREE.RingGeometry(r - .06, r + .06, 160), M.bronzeMid), key));
    const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 160 }, (_, k) => new THREE.Vector3(Math.cos(k / 160 * TAU) * (r + .065), Math.sin(k / 160 * TAU) * (r + .065), .002))), ringLine); ring.add(edge);
    const bead = tag(new THREE.Mesh(new THREE.SphereGeometry(size, 32, 20), M.planet[key]), key); bead.position.set(0, r, .32); ring.add(bead);
    bead.add(tintedGlint(size * 4.2, .32, tint));
    if (key === 'saturn') { const rg = tag(new THREE.Mesh(new THREE.RingGeometry(size * 1.35, size * 1.95, 48), new THREE.MeshStandardMaterial({ color: lin('#E8D49C'), metalness: .6, roughness: .35, side: THREE.DoubleSide, transparent: true, opacity: .85 })), key); rg.rotation.x = 1.15; rg.rotation.y = .25; bead.add(rg); }
    if (key === 'jupiter') bead.rotation.x = Math.PI / 2;
    const post = tag(new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .3, 10), M.bronze), key); post.rotation.x = Math.PI / 2; post.position.set(0, r, .15); ring.add(post);
    return { ring, period, phase: (i * 1.7) % TAU };
  });
  function ornatePointer(len, z, key, mat) {
    const g = new THREE.Group(); g.position.z = z;
    const shape = new THREE.Shape(); shape.moveTo(-.07, -1.1); shape.lineTo(.07, -1.1); shape.lineTo(.045, len - .55); shape.lineTo(.16, len - .55); shape.lineTo(0, len); shape.lineTo(-.16, len - .55); shape.lineTo(-.045, len - .55); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: .05, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 1 }); g.add(tag(new THREE.Mesh(geo, mat), key));
    const tail = tag(new THREE.Mesh(new THREE.CircleGeometry(.24, 24), mat), key); tail.position.set(0, -1.1, .03); g.add(tail);
    front.add(g); return g;
  }
  // The Sun: a golden sphere at the end of the Sun (date) pointer, with corona rays, a soft halo and a gentle shimmer
  const datePtr = ornatePointer(8.1, .5, 'sun', M.bronze);
  const SUN_R = 5.55;
  const sunGold = new THREE.MeshStandardMaterial({ color: lin('#FFD36B'), metalness: .85, roughness: .22, emissive: lin('#FFB02E'), emissiveIntensity: .9 });
  const sunBall = tag(new THREE.Mesh(new THREE.SphereGeometry(.58, 40, 28), sunGold), 'sun'); sunBall.position.set(0, SUN_R, .5); datePtr.add(sunBall);
  const T_RAYS = canvasTex(256, 256, (x, w) => {
    const c = w / 2; x.translate(c, c);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, c); g.addColorStop(0, 'rgba(255,236,170,.95)'); g.addColorStop(.25, 'rgba(255,200,90,.45)'); g.addColorStop(.6, 'rgba(255,170,60,.08)'); g.addColorStop(1, 'rgba(255,170,60,0)'); x.fillStyle = g; x.fillRect(-c, -c, w, w);
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) { x.rotate(TAU / 16); const l = i % 2 ? c * .62 : c * .95; const rg = x.createLinearGradient(0, 0, 0, -l); rg.addColorStop(0, 'rgba(255,225,150,.55)'); rg.addColorStop(1, 'rgba(255,200,110,0)'); x.fillStyle = rg; x.beginPath(); x.moveTo(-c * .045, 0); x.lineTo(0, -l); x.lineTo(c * .045, 0); x.closePath(); x.fill(); }
  });
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: T_RAYS, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); corona.scale.setScalar(3.4); corona.raycast = () => {}; sunBall.add(corona);
  const sunGlow = tintedGlint(6.5, .35, 0xffc870); sunBall.add(sunGlow);
  // the Moon: half silver (with craters), half black, on the Moon pointer; it turns to show the phase
  const moonPtr = ornatePointer(6.0, .7, 'moon', M.silver);
  const T_CRATER = canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = '#D9DCE0'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const r = 2 + rnd() * 11, cx = rnd() * w, cy = rnd() * h; const g = x.createRadialGradient(cx - r * .3, cy - r * .3, 0, cx, cy, r); g.addColorStop(0, 'rgba(120,124,132,.55)'); g.addColorStop(.75, 'rgba(150,154,160,.3)'); g.addColorStop(1, 'rgba(250,250,252,.5)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
  });
  const moonSilver = new THREE.MeshStandardMaterial({ color: lin('#FFFFFF'), map: T_CRATER, bumpMap: T_CRATER, bumpScale: .02, metalness: .55, roughness: .38, emissive: lin('#202428'), emissiveIntensity: .5 });
  const moonBall = new THREE.Group(); moonBall.position.set(0, 4.25, .55); moonPtr.add(moonBall);
  moonBall.add(tag(new THREE.Mesh(new THREE.SphereGeometry(.56, 40, 24, 0, Math.PI), moonSilver), 'moon'), tag(new THREE.Mesh(new THREE.SphereGeometry(.56, 40, 24, Math.PI, Math.PI), M.blackened), 'moon'));
  const moonRim = tag(new THREE.Mesh(new THREE.TorusGeometry(.57, .03, 8, 48), M.bronze), 'moon'); moonRim.rotation.y = Math.PI / 2; moonBall.add(moonRim);
  const moonGlow = tintedGlint(2.6, .3, 0xcfe0ff); moonPtr.add(moonGlow); moonGlow.position.copy(moonBall.position);
  const cap = tag(new THREE.Mesh(new THREE.CylinderGeometry(.32, .36, .3, 28), M.bronzeOld), 'sun'); cap.rotation.x = Math.PI / 2; cap.position.z = 1.0; front.add(cap);
  const capDome = tag(new THREE.Mesh(new THREE.SphereGeometry(.22, 20, 12, 0, TAU, 0, Math.PI / 2), M.bronze), 'sun'); capDome.rotation.x = Math.PI / 2; capDome.position.z = 1.15; front.add(capDome);

  /* ---------- Back: engraved spirals and subsidiary dials, with 3D pointers ---------- */
  const back = new THREE.Group(); back.position.z = -4.09; back.rotation.y = Math.PI; addPart(back, [0, 0, -24]);
  const MET = { cx: 0, cy: 7.6, r0: 2.7, r1: 7.4, turns: 5, cells: 235 }, SAR = { cx: 0, cy: -8.6, r0: 2.5, r1: 7.0, turns: 4, cells: 223 };
  const SUBS = [
    { key: 'games', cx: 1.2, cy: 7.6, r: 1.0, n: 4 }, { key: 'callippic', cx: -1.2, cy: 7.6, r: 1.0, n: 4 }, { key: 'exeligmos', cx: 0, cy: -8.6, r: 1.7, n: 3 }
  ];
  const backTex = canvasTex(1536, Math.round(1536 * PH / PW), (x, w, h) => {
    const s = w / PW, X = (u) => w / 2 + u * s, Y = (v) => h / 2 - v * s;
    patina(x, w, h, '#BC9461'); x.strokeStyle = ENGRAVE; x.fillStyle = ENGRAVE;
    function spiralDraw(S, glyphs) {
      const pitch = (S.r1 - S.r0) / S.turns, n = S.turns * 220;
      [-.42, .42].forEach(off => { x.lineWidth = s * .045; x.beginPath(); for (let i = 0; i <= n; i++) { const t = i / n, r = S.r0 + (S.r1 - S.r0) * t + off * pitch, a = t * S.turns * TAU + Math.PI / 2; const px = X(S.cx + r * Math.cos(a)), py = Y(S.cy + r * Math.sin(a)); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); });
      x.lineWidth = s * .02;
      for (let i = 0; i <= S.cells; i++) { const t = i / S.cells, r = S.r0 + (S.r1 - S.r0) * t, a = t * S.turns * TAU + Math.PI / 2; x.beginPath(); x.moveTo(X(S.cx + (r - pitch * .42) * Math.cos(a)), Y(S.cy + (r - pitch * .42) * Math.sin(a))); x.lineTo(X(S.cx + (r + pitch * .42) * Math.cos(a)), Y(S.cy + (r + pitch * .42) * Math.sin(a))); x.stroke(); }
      if (glyphs) { // illustrative positions: 51 cells marked, Σ (Moon) or Η (Sun)
        const chosen = new Set(); while (chosen.size < glyphs) chosen.add(Math.floor(rnd() * S.cells));
        x.font = `${s * .26}px "Times New Roman", serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
        chosen.forEach(i => { const t = (i + .5) / S.cells, r = S.r0 + (S.r1 - S.r0) * t, a = t * S.turns * TAU + Math.PI / 2; x.fillText(rnd() < .58 ? 'Σ' : 'Η', X(S.cx + r * Math.cos(a)), Y(S.cy + r * Math.sin(a))); });
      }
    }
    spiralDraw(MET); spiralDraw(SAR, 51);
    x.font = `${s * .3}px "Times New Roman", serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    SUBS.forEach(d => {
      x.lineWidth = s * .025; x.beginPath(); x.arc(X(d.cx), Y(d.cy), d.r * s, 0, TAU); x.stroke();
      for (let i = 0; i < d.n; i++) { const a = i / d.n * TAU + Math.PI / 2; x.beginPath(); x.moveTo(X(d.cx), Y(d.cy)); x.lineTo(X(d.cx + d.r * Math.cos(a)), Y(d.cy + d.r * Math.sin(a))); x.stroke(); }
      for (let i = 0; i < d.n; i++) { const a = (i + .5) / d.n * TAU + Math.PI / 2; x.fillText('ΑΒΓΔ'[i], X(d.cx + d.r * .62 * Math.cos(a)), Y(d.cy + d.r * .62 * Math.sin(a))); }
    });
    // lettering bands between the dials
    x.font = `${s * .22}px "Times New Roman", serif`; x.textAlign = 'left';
    for (let r = 0; r < 3; r++) { let t = ''; for (let i = 0; i < 46; i++) t += rnd() < .17 ? ' ' : GREEK[Math.floor(rnd() * GREEK.length)]; x.globalAlpha = .7; x.fillText(t, X(-7.6), Y(-.6 + r * .42)); }
    x.globalAlpha = 1;
  });
  const backFace = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshStandardMaterial({ map: backTex, roughnessMap: T_ROUGH, metalness: .7, roughness: .66 }));
  back.add(tagAll(backFace, 'plate'));
  // invisible hit areas so the tooltips can name each dial
  const hitRing = (cx, cy, r0, r1, key) => { const m = tag(new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), M.hit), key); m.position.set(cx, cy, .03); back.add(m); };
  hitRing(MET.cx, MET.cy, 2.2, 7.9, 'metonic'); hitRing(SAR.cx, SAR.cy, 2.0, 7.5, 'saros');
  SUBS.forEach(d => hitRing(d.cx, d.cy, 0, d.r, d.key));
  function spiralPointer(S, key) {
    const g = new THREE.Group(); g.position.set(S.cx, S.cy, .08); back.add(g);
    const ptr = new THREE.Group(); g.add(ptr);
    const bar = tag(new THREE.Mesh(new THREE.BoxGeometry(.08, S.r1 + .4, .05), M.bronze), key); bar.position.y = (S.r1 + .4) / 2; ptr.add(bar);
    const follower = tag(new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .3, 14), M.silver), key); follower.rotation.x = Math.PI / 2; ptr.add(follower);
    const hubM = tag(new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .16, 20), M.bronzeOld), key); hubM.rotation.x = Math.PI / 2; g.add(hubM);
    return { ptr, follower, ...S };
  }
  const metonic = spiralPointer(MET, 'metonic'), saros = spiralPointer(SAR, 'saros');
  const subPtr = (d) => { const g = new THREE.Group(); g.position.set(d.cx, d.cy, .12); back.add(g); const bar = tag(new THREE.Mesh(new THREE.BoxGeometry(.06, d.r * .9, .04), M.silver), d.key); bar.position.y = d.r * .45; g.add(bar); return g; };
  const [gamesPtr, callPtr, exelPtr] = SUBS.map(subPtr);

  /* ---------- Light and shadow ---------- */
  lights.hemi = new THREE.HemisphereLight(0xdfe6f2, 0x2a2318, .4); scene.add(lights.hemi);
  // Warm key light from above-left; it casts the shadows and follows the model
  lights.key = new THREE.DirectionalLight(0xffe7c4, 1.15); scene.add(lights.key); scene.add(lights.key.target);
  lights.key.castShadow = true;
  lights.key.shadow.mapSize.set(2048, 2048);
  lights.key.shadow.bias = -.0003; lights.key.shadow.normalBias = .015; lights.key.shadow.radius = 1.6;
  const KEY_OFF = new THREE.Vector3(-26, 38, 34);
  // Cool rim light from behind-right
  const rim = new THREE.DirectionalLight(0x9fb8e8, .7); scene.add(rim); scene.add(rim.target);
  const RIM_OFF = new THREE.Vector3(34, 12, -40);
  // A soft highlight that sweeps slowly across the bronze
  const sweep = new THREE.PointLight(0xfff0d8, .55, 90, 2); scene.add(sweep);
  function aimLights(t) {
    const c = mech.position, k = mech.scale.x;
    lights.key.position.copy(c).addScaledVector(KEY_OFF, k); lights.key.target.position.copy(c);
    const sc = lights.key.shadow.camera, r = 26 * k;
    if (sc.right !== r) { sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 140 * k; sc.updateProjectionMatrix(); }
    rim.position.copy(c).addScaledVector(RIM_OFF, k); rim.target.position.copy(c);
    sweep.position.set(c.x + Math.sin(t * .23) * 14 * k, c.y + (6 + Math.cos(t * .17) * 8) * k, c.z + 22 * k);
  }
  // Ground: a soft contact shadow (works on navy and on white) plus the key light's cast shadow
  const ground = new THREE.Group(); ground.position.y = -H / 2 - .02; mech.add(ground);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(34, 22), new THREE.MeshBasicMaterial({
    map: canvasTex(256, 256, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(.45, 'rgba(0,0,0,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, false),
    transparent: true, depthWrite: false
  }));
  blob.rotation.x = -Math.PI / 2; blob.renderOrder = -1; ground.add(blob);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.ShadowMaterial({ opacity: .28 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = .01; shadowCatcher.receiveShadow = true; ground.add(shadowCatcher);
  // Who casts and receives
  mech.traverse(o => {
    if (!o.isMesh || o === blob || o === shadowCatcher) return;
    const m = o.material, see = m && m !== M.hit && !(m.transparent && m.opacity === 0 && m !== M.wood);
    o.castShadow = !!see && m !== M.plate && m !== paraMat;
    o.receiveShadow = !!see;
  });
  doors.forEach(d => { d.castShadow = false; });

  /* ---------- State: time is driven by the crank ---------- */
  const DAY = 86400000, YEAR = 365.25, SYNODIC = 29.530588853, SIDEREAL = 27.321662, CRANK_DAYS = 78;
  let crank = 0, apartT = 0, apartTarget = 0, mode = 'hero', autoTurn = false;
  const start = Date.now();
  const moonPhase = (ms) => { const p = (((ms / DAY + 2440587.5) - 2451550.1) / SYNODIC) % 1; return p < 0 ? p + 1 : p; };

  function pose(dt) {
    const days = crank / TAU * CRANK_DAYS, years = days / YEAR, months = days / SYNODIC;
    const rot = -years * TAU; // b1: one clockwise turn per year (seen from the front)
    gears.forEach(g => { g.mesh.rotation.z = g.phase + g.ratio * rot; });
    k1.rotation.z = rot * 3.1; k2.rotation.z = rot * 3.1 + Math.sin(rot * 3.1) * .25; // the pin-and-slot wobble
    crankArm.rotation.x = -crank;
    a1.rotation.x = -crank;
    datePtr.rotation.z = rot;
    moonPtr.rotation.z = -days / SIDEREAL * TAU;
    moonBall.rotation.y = moonPhase(start + days * DAY) * TAU;
    planetRings.forEach(p => { p.ring.rotation.z = p.phase - days / p.period * TAU; });
    rimGlints.forEach(g => { const a = g.userData.a + b1.mesh.rotation.z, c = Math.max(0, Math.cos(a - 2.3)); g.material.opacity = Math.pow(c, 14) * .9; });
    const tSh = performance.now() / 1000; // the Sun's shimmer
    corona.material.rotation = tSh * .08; corona.material.opacity = .8 + Math.sin(tSh * 2.1) * .1; sunGlow.material.opacity = .32 + Math.sin(tSh * 1.3) * .06;
    const spiralPose = (s, cycleMonths) => { const f = ((months % cycleMonths) + cycleMonths) % cycleMonths / cycleMonths; s.ptr.rotation.z = f * s.turns * TAU; s.follower.position.y = s.r0 + (s.r1 - s.r0) * f; };
    spiralPose(metonic, 235); spiralPose(saros, 223);
    gamesPtr.rotation.z = years / 4 * TAU; // anticlockwise (the others turn clockwise)
    callPtr.rotation.z = -years / 76 * TAU;
    exelPtr.rotation.z = -years / 54 * TAU;
    // Take apart / assemble
    apartT += (apartTarget - apartT) * Math.min(1, dt * 2.2);
    const e = apartT * apartT * (3 - 2 * apartT);
    parts.forEach(p => p.obj.position.copy(p.base).addScaledVector(p.apart, e));
    doors.forEach(d => { d.material.opacity = .35 * e; d.visible = e > .01; });
    const hero = mode === 'hero';
    M.plate.opacity = (hero ? .22 : .4) * (1 - .55 * e);
    paraMat.opacity = (hero ? .5 : .8) * (1 - .6 * e);
    M.wood.transparent = true; M.wood.opacity = (hero ? .55 : .8) * (1 - .75 * e);
    return days;
  }

  /* ---------- Hero: layout, and rotating the model by drag (the gears keep turning on their own) ---------- */
  const heroBase = { x: 0, y: 0, s: 1 }, BASE_YAW = -.24, BASE_PITCH = -.05;
  // Free rotation in every direction (quaternions), with inertia; the user's turn is applied on top of the base angle
  const heroQ = new THREE.Quaternion(), heroSpin = { x: 0, y: 0 }, IDENT = new THREE.Quaternion();
  const qTmp = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), baseQ = new THREE.Quaternion(), eTmp = new THREE.Euler();
  function rotateBy(q, dx, dy) { if (dx) { qTmp.setFromAxisAngle(AY, dx); q.premultiply(qTmp); } if (dy) { qTmp.setFromAxisAngle(AX, dy); q.premultiply(qTmp); } q.normalize(); }
  const heroStage = document.getElementById('mechStage');
  let heroHit = { l: 0, r: 0, t: 0, b: 0 }; heroCanvas.style.cursor = 'default';
  function inModel(e) { const r = heroCanvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; return x >= heroHit.l && x <= heroHit.r && y >= heroHit.t && y <= heroHit.b; }
  const heroTitle = document.getElementById('mechTitle');
  const probe = new THREE.Object3D(), corner = new THREE.Vector3();
  function projectedBox() { // the model's box on screen at the default angle (px from the hero's top-left)
    probe.position.set(heroBase.x, heroBase.y, 0); probe.scale.setScalar(heroBase.s); probe.rotation.set(BASE_PITCH, BASE_YAW, 0); probe.updateMatrixWorld(true);
    let top = Infinity, bottom = -Infinity, right = -Infinity, left = Infinity;
    [-1, 1].forEach(sy => [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => { corner.set(sx * W / 2, sy * H / 2, sz * D / 2); probe.localToWorld(corner); corner.project(camera); const y = (1 - corner.y) / 2 * hero.clientHeight; top = Math.min(top, y); bottom = Math.max(bottom, y); const x = (corner.x + 1) / 2 * hero.clientWidth; right = Math.max(right, x); left = Math.min(left, x); }));
    corner.set(0, H / 2, 0); probe.localToWorld(corner); corner.project(camera); const cx = (corner.x + 1) / 2 * hero.clientWidth;
    corner.set(0, -H / 2, 0); probe.localToWorld(corner); corner.project(camera); const bx = (corner.x + 1) / 2 * hero.clientWidth;
    return { top, bottom, right, left, cx, bx };
  }
  const projectedTop = projectedBox;
  function heroLayout() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    camera.position.set(0, 0, 80); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const visH = 2 * 80 * Math.tan(camera.fov * Math.PI / 360), visW = visH * camera.aspect, u = visH / h; // units per px
    const titleH = heroTitle && w > 800 ? (heroTitle.offsetHeight || 60) : 0;
    let topPx;
    if (w / h > 1.15) {
      heroBase.x = visW * .27; heroBase.s = Math.min(.69, visH / 65, visW / 92);
      heroBase.y = visH * .025; // centre a little above the screen centre
      topPx = 76 + titleH + 28 + 12;
    } else {
      const copy = hero.querySelector('.hero-copy'), hr = hero.getBoundingClientRect();
      topPx = 196;
      let bottomPx = Math.min(h - 300, copy ? copy.getBoundingClientRect().top - hr.top : h) - 18;
      bottomPx = Math.max(topPx + 120, bottomPx);
      heroBase.x = 0; heroBase.s = Math.min(visW * .82 / 18, (bottomPx - topPx) * u / 37);
      heroBase.y = visH / 2 - (topPx + bottomPx) / 2 * u;
    }
    let pt = projectedBox();
    if (w > 800) {
      // Desktop band: the title (anchored 40px above the model) must start 120px+ below the hero top,
      // and the stage caption (18px below the model) must end 110px+ above the hero bottom.
      const stageH = heroStage ? (heroStage.offsetHeight || 30) : 30;
      const topMin = 120 + titleH + 40, botMax = h - 110 - stageH - 18;
      for (let i = 0; i < 3; i++) { // shrink to fit the band (perspective makes this slightly non-linear)
        const need = pt.bottom - pt.top, room = botMax - topMin;
        if (need <= room) break;
        const mid = (pt.top + pt.bottom) / 2; heroBase.s *= room / need; pt = projectedBox();
        heroBase.y -= (mid - (pt.top + pt.bottom) / 2) * u; pt = projectedBox();
      }
      if (pt.top < topMin) { heroBase.y -= (topMin - pt.top) * u; pt = projectedBox(); }
      if (pt.bottom > botMax) { heroBase.y += (pt.bottom - botMax) * u; pt = projectedBox(); }
    } else if (pt.top < topPx) { heroBase.y -= (topPx - pt.top) * u; pt = projectedBox(); }
    // the model's footprint (padded) is the only interactive area in the hero
    heroHit = { l: pt.left - 24, r: pt.right + 24, t: pt.top - 24, b: pt.bottom + 24 };
    placeTitle();
  }
  function placeTitle() {
    if (innerWidth <= 800 || !heroTitle) return;
    const pt = projectedBox();
    heroTitle.style.setProperty('--mx', pt.cx.toFixed(1) + 'px');
    heroTitle.style.setProperty('--my', Math.max(120, pt.top - 28 - 12).toFixed(1) + 'px');
    if (zWrap) { zWrap.style.setProperty('--zx', Math.min(hero.clientWidth - 64, pt.right + 28).toFixed(1) + 'px'); zWrap.style.setProperty('--zy', ((pt.top + pt.bottom) / 2).toFixed(1) + 'px'); }
    if (heroStage) { heroStage.style.setProperty('--sx', pt.bx.toFixed(1) + 'px'); heroStage.style.setProperty('--sy', (pt.bottom + 18).toFixed(1) + 'px'); }
  }
  let dragging = false, lastX = 0, lastY = 0, lastT = 0, idleSince = performance.now();
  // Hero zoom: Ctrl/⌘ + wheel (also trackpad pinch), two-finger pinch on touch, or the + / − buttons
  const ZMIN = .6, ZMAX = 2.4, zclamp = (z) => Math.min(ZMAX, Math.max(ZMIN, z));
  let zoom = 1, zoomTarget = 1, lastInteract = -1e9, pinch = null; const pts = new Map();
  const touchZoom = () => { lastInteract = performance.now(); };
  heroCanvas.addEventListener('wheel', (e) => {
    if (mode !== 'hero' || !(e.ctrlKey || e.metaKey) || !inModel(e)) return; // a plain wheel (or one outside the model) keeps scrolling the page
    e.preventDefault();
    resetting = false; zoomTarget = zclamp(zoomTarget * Math.exp(-e.deltaY * .0025)); touchZoom();
  }, { passive: false });
  const zIn = document.getElementById('mechZoomIn'), zOut = document.getElementById('mechZoomOut'), zWrap = document.getElementById('mechZoom');
  let resetting = false;
  const zReset = document.getElementById('mechReset');
  if (zReset) zReset.addEventListener('click', () => { resetting = true; heroSpin.x = heroSpin.y = 0; zoomTarget = 1; });
  if (zIn) zIn.addEventListener('click', () => { resetting = false; zoomTarget = zclamp(zoomTarget * 1.25); touchZoom(); });
  if (zOut) zOut.addEventListener('click', () => { resetting = false; zoomTarget = zclamp(zoomTarget / 1.25); touchZoom(); });
  heroCanvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'hero') return;
    if (!pts.size && !inModel(e)) return; // outside the model: leave the page alone
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2) { // two fingers: pinch to zoom, no rotating
      const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: zoomTarget };
      if (dragging) { dragging = false; idleSince = performance.now(); heroSpin.x = heroSpin.y = 0; }
      return;
    }
    dragging = true; resetting = false; lastX = e.clientX; lastY = e.clientY; lastT = performance.now(); heroSpin.x = heroSpin.y = 0; touchZoom(); heroCanvas.style.cursor = 'grabbing';
    heroCanvas.setPointerCapture(e.pointerId); heroCanvas.classList.add('dragging');
    const hint = document.getElementById('hint'); if (hint) hint.classList.add('gone');
  });
  heroCanvas.addEventListener('pointermove', (e) => {
    if (mode !== 'hero') return;
    if (e.pointerType === 'mouse' && !dragging) heroCanvas.style.cursor = inModel(e) ? 'grab' : 'default';
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size >= 2) { resetting = false; const [a, b] = [...pts.values()]; zoomTarget = zclamp(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d); touchZoom(); return; }
    if (!dragging) return;
    touchZoom();
    const now = performance.now(), dt = Math.max(8, now - lastT) / 1000;
    const dx = (e.clientX - lastX) * .008, dy = e.pointerType === 'touch' ? 0 : (e.clientY - lastY) * .008; // touch: vertical swipes scroll the page
    rotateBy(heroQ, dx, dy);
    heroSpin.x = heroSpin.x * .35 + (dx / dt) * .65; heroSpin.y = heroSpin.y * .35 + (dy / dt) * .65;
    lastX = e.clientX; lastY = e.clientY; lastT = now;
  });
  const endDrag = () => { if (!dragging) return; dragging = false; heroCanvas.classList.remove('dragging'); heroCanvas.style.cursor = 'grab'; idleSince = performance.now(); if (performance.now() - lastT > 90) heroSpin.x = heroSpin.y = 0; };
  const upHero = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; endDrag(); };
  heroCanvas.addEventListener('pointerup', upHero); heroCanvas.addEventListener('pointercancel', upHero);
  function heroZoom(dt) {
    zoom += (zoomTarget - zoom) * (1 - Math.exp(-dt * 6));
  }
  function heroView(dt) {
    if (dragging) return;
    // on release: momentum carries on and fades; the model then stays where the user left it
    rotateBy(heroQ, heroSpin.x * dt, heroSpin.y * dt);
    const decay = Math.exp(-dt * 4); heroSpin.x *= decay; heroSpin.y *= decay;
    if (resetting) { // the reset button: ease back to the starting pose and 1x zoom (about 1.2 s)
      heroQ.slerp(IDENT, 1 - Math.exp(-dt * 3.8)); zoomTarget = 1;
      if (heroQ.angleTo(IDENT) < .002 && Math.abs(zoom - 1) < .003) { heroQ.identity(); zoom = 1; resetting = false; }
    }
  }

  /* ---------- Explorer ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const ex = document.getElementById('explorer'), exStage = document.getElementById('exStage');
  const tip = document.getElementById('exTip'), tipName = document.getElementById('exTipName'), tipText = document.getElementById('exTipText');
  const btnApart = document.getElementById('exApart'), btnTurn = document.getElementById('exTurn');
  let controls = null, lastFocus = null, camGoal = null, timeSlider = null;
  const SPAN_YEARS = 19, SPAN_CRANK = SPAN_YEARS * YEAR / CRANK_DAYS * TAU; // the Time slider spans one Metonic cycle
  const exQ = new THREE.Quaternion(), exSpin = { x: 0, y: 0 }; let exGoalQ = null, exDrag = null;
  const EX_DEFAULT = new THREE.Quaternion().setFromEuler(new THREE.Euler(.1, -.62, 0)), EX_APART = new THREE.Quaternion().setFromEuler(new THREE.Euler(.18, -1.12, 0));
  // Drag the crank handle itself to turn time; drag anywhere else to turn the model
  let crankDrag = null; const pivot = new THREE.Vector3();
  function crankScreenAngle(e) { pivot.setFromMatrixPosition(crankGrp.matrixWorld).project(camera); const r = heroCanvas.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + (1 - pivot.y) / 2 * r.height), e.clientX - (r.left + (pivot.x + 1) / 2 * r.width)); }
  heroCanvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'explorer') return;
    const r = heroCanvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(crankGrp, true)[0];
    if (hit) {
      crankDrag = { a: crankScreenAngle(e), id: e.pointerId };
      if (controls) controls.enabled = false;
    } else if (e.button === 0 || e.pointerType !== 'mouse') {
      if (exDrag && exDrag.id !== e.pointerId) { exDrag = null; return; } // a second finger: leave pinch-zoom to the controls
      exDrag = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; exGoalQ = null; exSpin.x = exSpin.y = 0;
    } else return;
    heroCanvas.setPointerCapture(e.pointerId); heroCanvas.classList.add('dragging');
  });
  heroCanvas.addEventListener('pointermove', (e) => {
    if (crankDrag && e.pointerId === crankDrag.id) {
      const a = crankScreenAngle(e); let d = a - crankDrag.a; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
      crank += d; crankDrag.a = a; return;
    }
    if (exDrag && e.pointerId === exDrag.id) {
      const now = performance.now(), dt = Math.max(8, now - exDrag.t) / 1000, dx = (e.clientX - exDrag.x) * .008, dy = (e.clientY - exDrag.y) * .008;
      rotateBy(exQ, dx, dy);
      exSpin.x = exSpin.x * .35 + (dx / dt) * .65; exSpin.y = exSpin.y * .35 + (dy / dt) * .65;
      exDrag.x = e.clientX; exDrag.y = e.clientY; exDrag.t = now;
    }
  });
  const endCrank = (e) => {
    if (exDrag && (!e || e.pointerId === exDrag.id)) { if (performance.now() - exDrag.t > 90) exSpin.x = exSpin.y = 0; exDrag = null; heroCanvas.classList.remove('dragging'); }
    if (!crankDrag) return; crankDrag = null; if (controls) controls.enabled = true; heroCanvas.classList.remove('dragging');
  };
  heroCanvas.addEventListener('pointerup', endCrank); heroCanvas.addEventListener('pointercancel', endCrank);
  function exLayout() { const w = exStage.clientWidth, h = exStage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function openExplorer() {
    if (mode === 'explorer' || !ex) return;
    lastFocus = document.activeElement; mode = 'explorer';
    ex.hidden = false; requestAnimationFrame(() => ex.classList.add('open'));
    exStage.appendChild(heroCanvas); document.body.style.overflow = 'hidden'; heroCanvas.style.cursor = '';
    mech.position.set(0, 0, 0); mech.scale.setScalar(1);
    exQ.copy(EX_DEFAULT); exGoalQ = null; exSpin.x = exSpin.y = 0; mech.quaternion.copy(exQ);
    camera.position.set(0, 3, 70); camera.lookAt(0, 0, 0);
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, heroCanvas);
      controls.enableDamping = true; controls.dampingFactor = .08; controls.minDistance = 10; controls.maxDistance = 220; controls.target.set(0, 0, 0);
      controls.enableRotate = false; // the model itself turns freely (see exQ); the controls only zoom and pan
    }
    timeSlider = document.getElementById('exTime');
    if (timeSlider && !timeSlider.dataset.wired) {
      timeSlider.dataset.wired = '1';
      timeSlider.addEventListener('input', () => { crank = +timeSlider.value / 1000 * SPAN_CRANK; });
    }
    exLayout(); run();
    document.getElementById('exClose').focus();
  }
  function closeExplorer() {
    if (mode !== 'explorer') return;
    mode = 'hero'; ex.classList.remove('open');
    if (controls) { controls.dispose(); controls = null; }
    tip.hidden = true; apartTarget = 0; autoTurn = false; btnApart.classList.remove('on'); btnTurn.classList.remove('on'); btnApart.textContent = 'Take apart';
    setTimeout(() => { if (mode === 'hero') ex.hidden = true; }, 600);
    hero.insertBefore(heroCanvas, hero.firstChild); document.body.style.overflow = ''; heroCanvas.style.cursor = 'default';
    camGoal = null; crankDrag = null; exDrag = null;
    heroLayout(); run();
    if (lastFocus) lastFocus.focus();
  }
  if (ex) {
    document.getElementById('exClose').addEventListener('click', closeExplorer);
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeExplorer(); });
    btnApart.addEventListener('click', () => {
      apartTarget = apartTarget ? 0 : 1; btnApart.classList.toggle('on', !!apartTarget); btnApart.textContent = apartTarget ? 'Assemble' : 'Take apart';
      camGoal = apartTarget ? new THREE.Vector3(0, 8, 118) : new THREE.Vector3(0, 3, 70); exGoalQ = (apartTarget ? EX_APART : EX_DEFAULT).clone();
      if (controls) controls.target.set(0, 0, 0);
    });
    btnTurn.addEventListener('click', () => { autoTurn = !autoTurn; btnTurn.classList.toggle('on', autoTurn); });
    document.getElementById('exFront').addEventListener('click', () => { exGoalQ = new THREE.Quaternion(); camGoal = new THREE.Vector3(0, 2, 74); if (controls) controls.target.set(0, 0, 0); });
    document.getElementById('exBack').addEventListener('click', () => { exGoalQ = new THREE.Quaternion().setFromAxisAngle(AY, Math.PI); camGoal = new THREE.Vector3(0, 2, 74); if (controls) controls.target.set(0, 0, 0); });
  }
  // Name a part on hover (or tap)
  function pick(e) {
    if (mode !== 'explorer') return;
    const r = heroCanvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(mech, true).find(h => h.object.userData.part && h.object.visible && !(h.object.material === M.door && apartT < .5));
    if (!hit) { tip.hidden = true; return; }
    const [name, text] = PART[hit.object.userData.part];
    tipName.textContent = name; tipText.textContent = text; tip.hidden = false;
    tip.style.left = Math.min(innerWidth - 320, e.clientX + 16) + 'px'; tip.style.top = Math.min(innerHeight - 140, e.clientY + 16) + 'px';
  }
  heroCanvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') pick(e); });
  heroCanvas.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') pick(e); });
  heroCanvas.addEventListener('pointerleave', () => { if (tip) tip.hidden = true; });

  /* ---------- Turn events: the page shows data-work stages as the crank turns ---------- */
  let lastTurnSent = null, lastTurnAt = -1e9;
  function emitTurn(now) {
    if (now - lastTurnAt < 100) return;
    const turns = crank / TAU;
    if (lastTurnSent !== null && Math.abs(turns - lastTurnSent) < 1e-4) return;
    lastTurnSent = turns; lastTurnAt = now;
    window.dispatchEvent(new CustomEvent('noima:turn', { detail: { turns } }));
  }

  /* ---------- Loop ---------- */
  let introT = -1, visible = true, running = false, prev = performance.now();
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  let idleFrames = 0;
  function frame(now) {
    // While the landing animation covers the page, render only now and then (the scene is already warmed up),
    // so the landing's own animation gets the whole frame budget.
    if (introT < 0 && mode === 'hero' && document.body.classList.contains('landing-on') && (idleFrames++ % 20)) {
      prev = now; requestAnimationFrame(frame); return;
    }
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    if (mode === 'hero') {
      if (!reduced) crank += TAU / 2.6 * dt; // the crank turns by itself: one turn every 2.6 s
      pose(dt);
      heroView(dt);
      const k = introT < 0 ? 0 : easeOut(introT = Math.min(1, introT + dt / 2.6));
      mech.position.set(heroBase.x, heroBase.y, -60 * (1 - k));
      heroZoom(dt);
      mech.scale.setScalar(heroBase.s * zoom);
      baseQ.setFromEuler(eTmp.set(BASE_PITCH, BASE_YAW - (1 - k) * .8, 0)); mech.quaternion.copy(heroQ).multiply(baseQ);
    } else {
      if (autoTurn && !crankDrag) crank += TAU / 2.6 * dt;
      pose(dt);
      if (!exDrag) { rotateBy(exQ, exSpin.x * dt, exSpin.y * dt); const dk = Math.exp(-dt * 2.2); exSpin.x *= dk; exSpin.y *= dk; }
      if (exGoalQ) { exQ.slerp(exGoalQ, Math.min(1, dt * 3)); if (exQ.angleTo(exGoalQ) < .002) exGoalQ = null; }
      mech.quaternion.copy(exQ);
      if (timeSlider && document.activeElement !== timeSlider) { const f = ((crank % SPAN_CRANK) + SPAN_CRANK) % SPAN_CRANK / SPAN_CRANK; timeSlider.value = Math.round(f * 1000); }
      if (camGoal) { // glide around the model (spherical), never through it
        const target = controls ? controls.target : new THREE.Vector3();
        const cur = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target)), goal = new THREE.Spherical().setFromVector3(camGoal.clone().sub(target));
        let dth = goal.theta - cur.theta; if (dth > Math.PI) dth -= TAU; if (dth < -Math.PI) dth += TAU;
        const k = Math.min(1, dt * 3);
        cur.theta += dth * k; cur.phi += (goal.phi - cur.phi) * k; cur.radius += (goal.radius - cur.radius) * k;
        camera.position.setFromSpherical(cur).add(target);
        if (Math.abs(dth) < .004 && Math.abs(goal.phi - cur.phi) < .004 && Math.abs(goal.radius - cur.radius) < .2) camGoal = null;
      }
      if (controls) controls.update(); else camera.lookAt(0, 0, 0);
    }
    emitTurn(now);
    aimLights(now / 1000);
    renderer.render(scene, camera);
    if ((mode === 'hero' && visible) || mode === 'explorer') requestAnimationFrame(frame); else running = false;
  }
  function run() { if (!running) { running = true; prev = performance.now(); requestAnimationFrame(frame); } }
  camera.position.set(0, 0, 80); camera.lookAt(0, 0, 0);
  addEventListener('resize', () => { if (mode === 'hero') heroLayout(); else exLayout(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (mode === 'hero') heroLayout(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) run(); }).observe(hero); // the pose and zoom stay as the user left them
  heroLayout(); setTheme(document.documentElement.dataset.theme || 'dark'); run();

  window.NoimaMech = { intro() { introT = reduced ? 1 : 0; if (mode === 'hero') setTimeout(() => { const s = renderer.getSize(new THREE.Vector2()); if (s.x !== hero.clientWidth || s.y !== hero.clientHeight) heroLayout(); }, 1600); }, setTheme, openExplorer };
  addEventListener('load', () => { if (mode === 'hero') heroLayout(); });
  if (document.documentElement.classList.contains('started')) window.NoimaMech.intro(); // loaded after the landing ended
})();
