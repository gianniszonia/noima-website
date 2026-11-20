/* NÓIMA website: a detailed 3D model of the Antikythera mechanism (Three.js r128 globals).
   Layout follows antikythera/RESEARCH.md §11. It is a model to explore, not an exact reconstruction:
     - a wooden case of about 34 × 18 × 9 cm (uncertain), shown portrait and open at the sides so the gears show;
     - solid bronze front and back plates on pillars; inscribed covers (seen when taken apart);
     - front: a fixed zodiac ring (Greek sign names) inside the movable 365-day Egyptian calendar ring (month names);
       inside them, the cosmos display as a RECONSTRUCTION (rings for the five planets), the Sun and date pointer,
       the Moon pointer and the half-silver, half-black Moon-phase ball;
     - back: Metonic spiral (upper, 5 turns, 235 cells) with the Games and Callippic dials inside it;
             Saros spiral (lower, 4 turns, 223 cells, eclipse glyphs) with the Exeligmos dial inside it;
     - the gearing follows the scheme in docs/review/02-mechanism-3d.md §2.1: one wheel, b1, drives every train, and
       THE POINTERS ARE SET FROM THE GEARS' ANGLES (see pose). The tooth counts used for the motion are
       reconstructed ones that could NOT all be checked against the papers (each train does give the right cycle);
       only counts confirmed in antikythera/RESEARCH.md or in a paper actually read are shown as text.
   Gear positions, the pillars, the rivets, planet motions and all small lettering are illustrative.
   One renderer serves two views: the hero (inside #mechBox, from 1024 px) and a full-screen explorer.
   The explorer reads the model two ways: "NÓIMA" (data work) and "How it worked" (the real names). */
(function () {
  'use strict';
  const BUILD = 'm2-3';
  const HERO_TURN_S = 12; // seconds per crank turn on the homepage
  const heroCanvas = document.getElementById('mech');
  if (!heroCanvas) return;
  const box = heroCanvas.parentElement; // #mechBox: its client size is the hero renderer's size
  const heroSection = heroCanvas.closest('.hero') || box;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mqHero = matchMedia('(min-width: 1024px)'); // below this the hero model cannot be dragged, and textures are lighter
  const LOW = !mqHero.matches || (navigator.deviceMemory && navigator.deviceMemory <= 4); // lighter textures and shadows
  const noop = { intro() {}, setTheme() {}, openExplorer() {}, pauseHero() {}, still() { return ''; } };
  const fallback = () => { heroSection.classList.add('no-gl'); window.NoimaMech = noop; document.querySelectorAll('[data-explore]').forEach(b => { b.hidden = true; }); };
  if (!window.THREE) return fallback();
  const DPR = devicePixelRatio || 1, PR = Math.min(DPR, LOW ? 1.5 : 1.75);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: heroCanvas, antialias: !(LOW && DPR >= 2), alpha: true }); } catch (e) { return fallback(); }
  if (!renderer.getContext()) return fallback();
  renderer.setPixelRatio(PR);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  let baseExposure = 1.05;
  renderer.toneMappingExposure = baseExposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .5, 900);
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
  const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), LOW ? 4 : 16);
  const TS = LOW ? .5 : 1; // texture scale: half-size inscriptions on phones and low-memory devices
  function canvasTex(w, h, draw, srgb = true, repeat = null) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = maxAniso;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    return t;
  }
  // Aged bronze: warm base, soft blotches, some verdigris, fine scratches
  function patina(x, w, h, base = '#B48B55', green = .18) {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const r = (20 + rnd() * 110) * w / 512, cx = rnd() * w, cy = rnd() * h, g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      const tone = rnd() < green ? '86,112,88' : rnd() < .5 ? '96,66,36' : '214,178,122';
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
  // Worked metal: a fine hammered grain with file marks, used as a bump map on every bronze
  function workedBump(x, w, h) {
    x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = rnd() < .5 ? 40 : 215, r = .6 + rnd() * 2.2; x.fillStyle = `rgba(${v},${v},${v},${.05 + rnd() * .12})`; x.beginPath(); x.arc(rnd() * w, rnd() * h, r, 0, TAU); x.fill(); }
    x.lineWidth = .7;
    for (let i = 0; i < 220; i++) { const v = rnd() < .6 ? 30 : 230; x.strokeStyle = `rgba(${v},${v},${v},${.06 + rnd() * .1})`; const sx = rnd() * w, sy = rnd() * h, a = .5 + (rnd() - .5) * .5, l = 12 + rnd() * 70; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); x.stroke(); }
  }
  const T_PATINA = canvasTex(512, 512, (x, w, h) => patina(x, w, h), true, 1 / 6);
  const T_PATINA_DARK = canvasTex(512, 512, (x, w, h) => patina(x, w, h, '#9A7444', .3), true, 1 / 6);
  const T_ROUGH = canvasTex(256, 256, roughNoise, false, 1 / 6);
  const T_BUMP = canvasTex(256, 256, workedBump, false, 1 / 3);
  const T_WOOD = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#4B3220'; x.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      const k = Math.sin(y * .045) * 10 + Math.sin(y * .011) * 30;
      x.strokeStyle = `rgba(${rnd() < .5 ? '33,20,11' : '110,76,48'},${.12 + rnd() * .25})`; x.lineWidth = 1 + rnd() * 1.5;
      x.beginPath(); for (let px = 0; px <= w; px += 16) x.lineTo(px, y + Math.sin(px * .02 + k * .1) * 3 + k * .15); x.stroke();
    }
  }, true, 1 / 8);

  /* ---------- Materials: three states of bronze (polished, worked, aged), wood, silver ---------- */
  const brz = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughnessMap: T_ROUGH, bumpMap: T_BUMP, bumpScale: .006 }, o));
  const M = {
    bronze: brz({ color: lin('#F2D7A6'), map: T_PATINA, metalness: .94, roughness: .3, envMapIntensity: 1.25 }),
    bronzeOld: brz({ color: lin('#B89C70'), map: T_PATINA_DARK, metalness: .84, roughness: .52, envMapIntensity: .85, bumpScale: .012 }),
    bronzeMid: brz({ color: lin('#E2C597'), map: T_PATINA, metalness: .9, roughness: .4, envMapIntensity: 1 }),
    edgeGlint: new THREE.LineBasicMaterial({ color: 0xFFE6B8, transparent: true, opacity: .2, depthWrite: false }),
    bronzeBright: new THREE.MeshStandardMaterial({ color: lin('#FFE2AE'), metalness: .95, roughness: .28, envMapIntensity: 1.2 }),
    plate: brz({ color: lin('#D9BF93'), map: T_PATINA, metalness: .62, roughness: .6, envMapIntensity: .9, bumpScale: .014 }),
    silver: new THREE.MeshStandardMaterial({ color: lin('#E9ECEF'), metalness: .95, roughness: .25 }),
    blackened: new THREE.MeshStandardMaterial({ color: lin('#1B1B1E'), metalness: .6, roughness: .45 }),
    wood: new THREE.MeshStandardMaterial({ color: lin('#C9A27A'), map: T_WOOD, bumpMap: T_WOOD, bumpScale: .02, metalness: 0, roughness: .62 }),
    hit: new THREE.MeshBasicMaterial({ visible: false }), // invisible areas that only name a part
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
    baseExposure = light ? .98 : 1.05; if (mode === 'hero') renderer.toneMappingExposure = baseExposure;
    if (lights.hemi) { lights.hemi.intensity = light ? .55 : .4; lights.key.intensity = light ? 1.0 : 1.15; }
    M.wood.color.copy(lin(light ? '#D8B48C' : '#C9A27A'));
    dirty = true;
  }

  /* ---------- Parts: every mesh carries a part id; PM lists the meshes of each id (for picking and highlighting) ---------- */
  const PM = {}, pickables = [];
  const reg = (m, key) => { m.userData.part = key; (PM[key] = PM[key] || []).push(m); pickables.push(m); };
  const tag = (o, key) => { reg(o, key); return o; };
  const tagAll = (o, key) => { o.traverse(c => { if (c.isMesh) reg(c, key); }); return o; };

  /* ---------- Engraving: each inscription is drawn twice, as ink on bronze and as a height map, so it reads as relief ---------- */
  const ENGRAVE = 'rgba(46,28,12,.9)';
  function engraved(w, h, base, draw) {
    w = Math.round(w * TS); h = Math.round(h * TS);
    let sA, sB;
    const map = canvasTex(w, h, (x) => { patina(x, w, h, base); sA = seed; x.fillStyle = x.strokeStyle = ENGRAVE; draw(x, w, h); sB = seed; });
    seed = sA; // the same random letters in both passes
    const bw = Math.round(w / 2), bh = Math.round(h / 2);
    const bump = canvasTex(bw, bh, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, bw, bh); x.scale(bw / w, bh / h); x.fillStyle = x.strokeStyle = '#000'; draw(x, w, h); }, false);
    seed = sB;
    return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: .035, roughnessMap: T_ROUGH, metalness: .8, roughness: .5, color: lin('#FFFFFF') });
  }
  const SERIF = '"Times New Roman", Georgia, serif';
  function arcText(x, text, cx, cy, r, centre, px) {
    x.font = `${px}px ${SERIF}`;
    const chars = [...text], widths = chars.map(c => x.measureText(c).width + px * .12), total = widths.reduce((a, b) => a + b, 0);
    let a = centre - total / r / 2;
    chars.forEach((c, i) => { const da = widths[i] / r, m = a + da / 2; x.save(); x.translate(cx + r * Math.cos(m), cy + r * Math.sin(m)); x.rotate(m + Math.PI / 2); x.fillText(c, -widths[i] / 2 + px * .06, px * .35); x.restore(); a += da; });
  }
  function ringFace(rIn, rOut, size, draw) {
    // A textured ring: RingGeometry maps uv planar over its outer radius, so the canvas is a square of side 2·rOut.
    return engraved(size, size, '#C29A62', (x, w) => {
      const s = w / 2 / rOut, c = w / 2;
      x.lineWidth = Math.max(1, s * .03);
      [rIn + .04, rOut - .04].forEach(r => { x.beginPath(); x.arc(c, c, r * s, 0, TAU); x.stroke(); });
      draw(x, c, s);
    });
  }
  const GREEK = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';
  function letterRows(x, w, rows, px, x0, y0) { // rows of decorative Greek capitals
    x.font = `${px}px ${SERIF}`; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    for (let r = 0; r < rows; r++) { let s = ''; const n = Math.floor((w - 2 * x0) / (px * .72)); for (let i = 0; i < n; i++) s += rnd() < .17 ? ' ' : GREEK[Math.floor(rnd() * GREEK.length)]; x.globalAlpha = .6 + rnd() * .35; x.fillText(s, x0, y0 + r * px * 1.5); }
    x.globalAlpha = 1;
  }

  /* Gear geometry: hand-cut triangular teeth with a small flat at the tip, optional upright spokes or round lightening holes */
  const MOD = .058; // pitch-diameter per tooth: 223 teeth ≈ 13 cm (1 unit = 1 cm)
  function gearGeo(T, o) {
    o = o || {};
    const a = TAU / T, rp = T * MOD / 2, ro = rp + MOD * .9, rr = rp - MOD * .9;
    const s = new THREE.Shape();
    for (let i = 0; i < T; i++) { const c = i * a; [[c - .42 * a, rr], [c - .07 * a, ro], [c + .07 * a, ro], [c + .42 * a, rr]].forEach(([t, r], k) => { const x = r * Math.cos(t), y = r * Math.sin(t); if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y); }); }
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
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .03, bevelSize: .012, bevelSegments: 1, curveSegments: 10 });
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

  // Case: solid top and bottom boards with corner posts, open at the sides so the gear train shows
  const boardGeo = new THREE.BoxGeometry(W, th, D);
  [[H / 2 - th / 2, 12.6], [-H / 2 + th / 2, -12.6]].forEach(([y, ap]) => { const b = tag(new THREE.Mesh(boardGeo, M.wood), 'case'); b.position.y = y; addPart(b, [0, ap, 0]); });
  const postGeo = new THREE.BoxGeometry(th, H - 2 * th, th);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => { const p = tag(new THREE.Mesh(postGeo, M.wood), 'case'); p.position.set(sx * (W / 2 - th / 2), 0, sz * (D / 2 - th / 2)); addPart(p, [sx * 12, 0, sz * 6]); });

  // Plates: solid bronze. The front plate has a round opening behind the dial rings, so the main wheel shows through
  const PW = W - 2 * th - .1, PH = H - 2 * th - .1;
  const frontShape = new THREE.Shape(); frontShape.moveTo(-PW / 2, -PH / 2); frontShape.lineTo(PW / 2, -PH / 2); frontShape.lineTo(PW / 2, PH / 2); frontShape.lineTo(-PW / 2, PH / 2); frontShape.closePath();
  const hole = new THREE.Path(); hole.absarc(FRONT_C.x, FRONT_C.y, 8.3, 0, TAU, true); frontShape.holes.push(hole);
  const frontGeo = new THREE.ExtrudeGeometry(frontShape, { depth: .14, bevelEnabled: false, curveSegments: 64 }); frontGeo.translate(0, 0, -.07);
  const frontPlate = tag(new THREE.Mesh(frontGeo, M.plate), 'plate-front'); frontPlate.position.z = 4.0; addPart(frontPlate, [0, 0, 16]);
  const backPlate = tag(new THREE.Mesh(new THREE.BoxGeometry(PW, PH, .14), M.plate), 'plate-back'); backPlate.position.z = -4.0; addPart(backPlate, [0, 0, -16]);
  // Pillars holding the plates apart, with collars (positions illustrative; kept clear of the gears and the crank)
  const pillarGeo = new THREE.CylinderGeometry(.16, .16, 8, 14); pillarGeo.rotateX(Math.PI / 2);
  const collarGeo = new THREE.CylinderGeometry(.28, .28, .22, 18); collarGeo.rotateX(Math.PI / 2);
  [[-7.6, 15.2], [7.6, 15.2], [-7.6, -15.2], [7.6, -15.2], [-7.6, -5.2], [7.6, -5.2]].forEach(([x, y]) => {
    const p = new THREE.Group(); p.position.set(x, y, 0);
    p.add(new THREE.Mesh(pillarGeo, M.bronzeOld));
    [-3.8, 3.8].forEach(z => { const c = new THREE.Mesh(collarGeo, M.bronze); c.position.z = z; p.add(c); });
    tagAll(p, 'pillar'); addPart(p, [x * 1.4, y * .2, 0]);
  });

  // Rivet heads on the plates (illustrative): around the dial opening and in the corners
  const rivetGeo = new THREE.SphereGeometry(.15, 12, 6, 0, TAU, 0, Math.PI / 2); rivetGeo.rotateX(Math.PI / 2);
  function rivet(parent, x, y, z, flip) { const m = tag(new THREE.Mesh(rivetGeo, M.bronzeOld), 'fastener'); m.position.set(x, y, z); if (flip) m.rotation.y = Math.PI; parent.add(m); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; rivet(frontPlate, FRONT_C.x + Math.cos(a) * 8.72, FRONT_C.y + Math.sin(a) * 8.72, .07); }
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => { rivet(frontPlate, sx * (PW / 2 - .6), sy * (PH / 2 - .6), .07); rivet(backPlate, sx * (PW / 2 - .6), sy * (PH / 2 - .6), -.07, true); });
  // Parapegma panels above and below the front dial (decorative lettering)
  [[13.3, 4.6], [-10.6, 9.2]].forEach(([y, h]) => {
    const pw = PW - 1.4, mat = engraved(1400, Math.round(1400 * h / pw), '#B8905C', (x, w, hh) => { x.lineWidth = 3; x.strokeRect(8, 8, w - 16, hh - 16); const px = w / 58; letterRows(x, w, Math.floor((hh - px * 1.6) / (px * 1.5)), px, px * 1.1, px * 2); });
    const m = tag(new THREE.Mesh(new THREE.PlaneGeometry(pw, h), mat), 'parapegma'); m.position.set(0, y, .075); frontPlate.add(m);
  });

  // Covers (only shown when taken apart), inscribed
  const doorGeo = new THREE.BoxGeometry(PW, PH, .1);
  function door(key, rows, z, ap, flip) {
    const face = engraved(768, 1440, '#B48E5C', (x, w, h) => { const px = w / 30; letterRows(x, w, rows, px * (30 / Math.max(30, rows * .68)), px * 1.2, px * 2.4); });
    face.transparent = true; face.opacity = 0;
    const side = M.plate.clone(); side.transparent = true; side.opacity = 0;
    const m = tag(new THREE.Mesh(doorGeo, [side, side, side, side, flip ? side : face, flip ? face : side]), key);
    m.position.z = z; m.visible = false; addPart(m, ap); return m;
  }
  const backDoor = door('backdoor', 44, -D / 2 - .2, [0, 0, -30], true), frontDoor = door('frontdoor', 30, D / 2 + .2, [0, 0, 30], false);
  const doors = [backDoor, frontDoor];

  /* ---------- Gearing. Arbors (axes) are named as in the published scheme; where each sits is illustrative,
     but every centre distance is the true one for the two tooth counts, so the teeth really interlock. ---------- */
  const cd = (a, b) => (a + b) * MOD / 2; // centre distance of a meshing pair
  function tri(P, rp, Q, rq, key) { // the point at rp from P and rq from Q; of the two, the one with the larger key
    const dx = Q.x - P.x, dy = Q.y - P.y, d = Math.hypot(dx, dy), a = (rp * rp - rq * rq + d * d) / (2 * d), h = Math.sqrt(Math.max(0, rp * rp - a * a));
    const s = [1, -1].map(k => ({ x: P.x + a * dx / d - k * h * dy / d, y: P.y + a * dy / d + k * h * dx / d }));
    return key(s[0]) >= key(s[1]) ? s[0] : s[1];
  }
  const AR = { b: { x: FRONT_C.x, y: FRONT_C.y }, n: { x: 0, y: 7.6 }, g: { x: 0, y: -8.6 } };
  AR.e = { x: AR.b.x, y: AR.b.y - cd(32, 32) };
  AR.c = { x: AR.b.x + cd(64, 38) * Math.cos(170 * Math.PI / 180), y: AR.b.y + cd(64, 38) * Math.sin(170 * Math.PI / 180) };
  AR.d = tri(AR.c, cd(48, 24), AR.e, cd(127, 32), p => Math.hypot(p.x - AR.b.x, p.y - AR.b.y));
  AR.m = tri(AR.e, cd(27, 223), AR.n, cd(15, 53), p => p.x);
  AR.l = tri(AR.b, cd(64, 38), AR.m, cd(53, 96), p => p.x);
  AR.f = tri(AR.e, cd(188, 53), AR.g, cd(30, 54), p => p.x);
  AR.o = { x: -cd(57, 60), y: AR.n.y }; // Games dial (upper right, seen from the back)
  AR.q = { x: cd(57, 60), y: AR.n.y }; // Callippic dial
  AR.p = tri(AR.n, cd(15, 60), AR.q, cd(12, 60), p => p.y);
  AR.i = { x: -3.0, y: AR.g.y }; // Exeligmos dial
  AR.h = tri(AR.g, cd(20, 60), AR.i, cd(15, 60), p => -p.y);
  // name, teeth, arbor, depth z, how it is driven, part id, look
  const GEARS = [
    ['b1', 223, 'b', 3.0, null, 'b1', { spokes: 4, depth: .2, bright: 1 }],
    ['b2', 64, 'b', 2.4, { comp: 'b1' }, 'b2', { holes: 5 }],
    // Moon train
    ['c1', 38, 'c', 2.4, { mesh: 'b2' }, 'train-moon', { holes: 5 }],
    ['c2', 48, 'c', 1.8, { comp: 'c1' }, 'train-moon', { holes: 5 }],
    ['d1', 24, 'd', 1.8, { mesh: 'c2' }, 'train-moon'],
    ['d2', 127, 'd', 1.2, { comp: 'd1' }, 'train-moon', { spokes: 6 }],
    ['e2', 32, 'e', 1.2, { mesh: 'd2' }, 'train-moon', { holes: 5 }],
    ['e5', 50, 'e', -1.8, { comp: 'e2' }, 'train-moon', { holes: 5 }],
    // Metonic train
    ['l1', 38, 'l', 2.4, { mesh: 'b2' }, 'train-metonic', { holes: 5 }],
    ['l2', 53, 'l', 1.8, { comp: 'l1' }, 'train-metonic', { holes: 5 }],
    ['m1', 96, 'm', 1.8, { mesh: 'l2' }, 'train-metonic', { spokes: 6 }],
    ['m2', 15, 'm', 1.2, { comp: 'm1' }, 'train-metonic'],
    ['n1', 53, 'n', 1.2, { mesh: 'm2' }, 'train-metonic', { holes: 5 }],
    // Small dials above
    ['n2', 57, 'n', -2.4, { comp: 'n1' }, 'train-sub', { holes: 5 }],
    ['o1', 60, 'o', -2.4, { mesh: 'n2' }, 'train-sub', { holes: 6 }],
    ['n3', 15, 'n', -3.0, { comp: 'n1' }, 'train-sub'],
    ['p1', 60, 'p', -3.0, { mesh: 'n3' }, 'train-sub', { holes: 6 }],
    ['p2', 12, 'p', -3.5, { comp: 'p1' }, 'train-sub'],
    ['q1', 60, 'q', -3.5, { mesh: 'p2' }, 'train-sub', { holes: 6 }],
    // Carrier and Saros train
    ['m3', 27, 'm', -.6, { comp: 'm1' }, 'train-saros'],
    ['e3', 223, 'e', -.6, { mesh: 'm3' }, 'e3', { spokes: 6 }],
    ['e4', 188, 'e', 0, { comp: 'e3' }, 'train-saros', { spokes: 6 }],
    ['f1', 53, 'f', 0, { mesh: 'e4' }, 'train-saros', { holes: 5 }],
    ['f2', 30, 'f', -2.4, { comp: 'f1' }, 'train-saros', { holes: 5 }],
    ['g1', 54, 'g', -2.4, { mesh: 'f2' }, 'train-saros', { holes: 6 }],
    // Small dial below
    ['g2', 20, 'g', -3.0, { comp: 'g1' }, 'train-sub'],
    ['h1', 60, 'h', -3.0, { mesh: 'g2' }, 'train-sub', { holes: 6 }],
    ['h2', 15, 'h', -3.5, { comp: 'h1' }, 'train-sub'],
    ['i1', 60, 'i', -3.5, { mesh: 'h2' }, 'train-sub', { holes: 6 }],
    // After the pin-and-slot: these three are set in pose() from the pin's position, not from a fixed ratio
    ['e6', 50, 'e', -1.2, { dyn: 1 }, 'train-moon', { holes: 5 }],
    ['e1', 32, 'e', .6, { dyn: 1 }, 'train-moon', { holes: 5 }],
    ['b3', 32, 'b', .6, { dyn: 1 }, 'train-moon', { holes: 5 }]
  ];
  // The angle of a driven gear whose driver (Tp teeth, at angle pa) lies in direction t + π from it: teeth interlock
  const childAngle = (pa, t, Tp, Tc) => t + Math.PI + .5 * TAU / Tc - Tp / Tc * (pa - t);
  const pinGeo = new THREE.CylinderGeometry(.03, .05, 1, 8); pinGeo.rotateZ(Math.PI / 2);
  const G = {}, gears = [];
  GEARS.forEach(([name, T, arbor, z, rel, part, look]) => {
    look = look || {}; rel = rel || {};
    const g = { name, T, a: TAU / T, x: AR[arbor].x, y: AR[arbor].y, z, arbor, ratio: 1, phase: 0, dyn: !!rel.dyn };
    if (rel.mesh) { // driven by a gear on another arbor: speed and tooth phase follow from the two tooth counts
      const p = G[rel.mesh], t = Math.atan2(g.y - p.y, g.x - p.x), q = p.T / T;
      g.ratio = -q * p.ratio; g.phase = t + Math.PI + .5 * g.a + q * (t - p.phase);
    } else if (rel.comp) { const p = G[rel.comp]; g.ratio = p.ratio; g.phase = p.phase + .4; } // fixed to the same arbor
    const depth = look.depth || .14, rp = T * MOD / 2;
    const base = look.bright || z >= 1.4 ? M.bronze : z >= -.7 ? M.bronzeMid : M.bronzeOld;
    const geo = gearGeo(T, look), mat = base.clone();
    if (!look.bright) { mat.color.offsetHSL((rnd() - .5) * .015, (rnd() - .5) * .08, (rnd() - .5) * .07); mat.roughness = base.roughness + (rnd() - .5) * .12; } // a little wear: each wheel differs
    const mesh = tag(new THREE.Mesh(geo, mat), part);
    if (!LOW) { const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), M.edgeGlint); edges.raycast = () => {}; mesh.add(edges); }
    mesh.add(tag(new THREE.Mesh(hubCollar(rp, depth), M.bronzeOld), part));
    if (rp > .6) { // a tapered pin through the hub holds the wheel on its arbor (illustrative)
      const hr = Math.max(.2, rp * .16), pin = tag(new THREE.Mesh(pinGeo, M.blackened), 'fastener'); pin.scale.x = 2 * hr + .16; pin.position.z = depth / 2 + .045; pin.rotation.z = rnd() * TAU; mesh.add(pin);
    }
    mesh.position.set(g.x, g.y, z);
    addPart(mesh, [g.x * .3, g.y * .08, z * 4.2]);
    g.mesh = mesh; G[name] = g; gears.push(g);
  });
  const b1 = G.b1;
  const rimGlints = [0, 1.7, 3.4, 5.0].map(a => { const g = glint(1.6, 0), rp = 223 * MOD / 2; g.position.set(Math.cos(a) * rp, Math.sin(a) * rp, .2); g.userData.a = a; b1.mesh.add(g); return g; });
  const boss = tag(new THREE.Mesh(new THREE.CylinderGeometry(.6, .66, .5, 36), M.bronzeOld), 'b1'); boss.rotation.x = Math.PI / 2; b1.mesh.add(boss);

  // Arbors with end collars. The pointer arbors run on through the plates.
  const smallCollar = new THREE.CylinderGeometry(.13, .13, .12, 12); smallCollar.rotateX(Math.PI / 2);
  const REACH = { b: [null, 4.5], n: [-4.2, null], o: [-4.2, null], q: [-4.2, null], g: [-4.2, null], i: [-4.2, null] };
  Object.keys(AR).forEach(k => {
    const zs = gears.filter(g => g.arbor === k).map(g => g.z), r = REACH[k] || [];
    const z0 = r[0] != null ? r[0] : Math.min(...zs) - .3, z1 = r[1] != null ? r[1] : Math.max(...zs) + .3, grp = new THREE.Group();
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, z1 - z0, 10), M.bronzeOld); pin.rotation.x = Math.PI / 2; grp.add(pin);
    [z0, z1].forEach(z => { const c = new THREE.Mesh(smallCollar, M.bronze); c.position.z = z - (z0 + z1) / 2; grp.add(c); });
    grp.position.set(AR[k].x, AR[k].y, (z0 + z1) / 2); tagAll(grp, 'arbor');
    addPart(grp, [AR[k].x * .3, AR[k].y * .08, (z0 + z1) / 2 * 4.2]);
  });

  // Pin-and-slot pair k1, k2: carried on e3, at their true centre distance from the e axis.
  // Real sizes (Freeth et al. 2006, an estimate): the two centres about 1.1 mm apart, the pin 9.6 mm out.
  const K_A = 0, K_R = cd(50, 50), K_OFF = { x: .078, y: .078 }, K_PIN = .96; // on a spoke of e3; offset 1.1 mm
  const pinslot = new THREE.Group(); pinslot.position.set(K_R * Math.cos(K_A), K_R * Math.sin(K_A), 0); G.e3.mesh.add(pinslot);
  const kGeo = gearGeo(50, { depth: .12 });
  const k1 = tag(new THREE.Mesh(kGeo, M.bronze), 'pinslot'); k1.position.z = -1.2; pinslot.add(k1);
  const k2 = tag(new THREE.Mesh(kGeo, M.bronzeMid), 'pinslot'); k2.position.set(K_OFF.x, K_OFF.y, -.6); pinslot.add(k2);
  const kPin = tag(new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .8, 8), M.silver), 'pinslot'); kPin.rotation.x = Math.PI / 2; kPin.position.set(K_PIN, 0, .32); k1.add(kPin);
  const slot = tag(new THREE.Mesh(new THREE.BoxGeometry(.42, .13, .03), M.blackened), 'pinslot'); slot.position.set(K_PIN, 0, -.075); k2.add(slot);
  const slot2 = tag(new THREE.Mesh(new THREE.BoxGeometry(.42, .13, .03), M.blackened), 'pinslot'); slot2.position.set(K_PIN, 0, .075); k2.add(slot2);
  const kStub = tag(new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 1.5, 10), M.bronzeOld), 'pinslot'); kStub.rotation.x = Math.PI / 2; kStub.position.z = -.7; pinslot.add(kStub);

  // Crank on the right side, through the open side of the case. Its shaft carries the crown gear a1, which meshes with b1's rim.
  const A1_Z = b1.z - 48 * MOD / 2, A1_X = 223 * MOD / 2 + .28;
  const crankGrp = new THREE.Group(); crankGrp.position.set(W / 2 + .35, FRONT_C.y, A1_Z); addPart(crankGrp, [9, 0, 4]);
  const crankArm = new THREE.Group(); crankGrp.add(crankArm);
  const shaftLen = W / 2 + .35 - A1_X + .75;
  const shaft = tag(new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, shaftLen, 14), M.bronzeOld), 'crank'); shaft.rotation.z = Math.PI / 2; shaft.position.x = .5 - shaftLen / 2; crankArm.add(shaft);
  const armShape = new THREE.Shape(); armShape.moveTo(-.22, 0); armShape.lineTo(.22, 0); armShape.lineTo(.14, 2.6); armShape.lineTo(-.14, 2.6); armShape.closePath();
  const armGeo = new THREE.ExtrudeGeometry(armShape, { depth: .18, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }); armGeo.rotateY(Math.PI / 2); armGeo.translate(.35, 0, 0);
  crankArm.add(tag(new THREE.Mesh(armGeo, M.bronze), 'crank'));
  const handle = new THREE.Group(); handle.position.set(.95, 2.5, 0); crankArm.add(handle);
  const grip = new THREE.LatheGeometry([new THREE.Vector2(.0, -.75), new THREE.Vector2(.2, -.72), new THREE.Vector2(.26, -.4), new THREE.Vector2(.22, 0), new THREE.Vector2(.26, .4), new THREE.Vector2(.2, .72), new THREE.Vector2(0, .75)], 20);
  const gripM = tag(new THREE.Mesh(grip, M.wood), 'crank'); gripM.rotation.z = Math.PI / 2; handle.add(gripM);
  const crankHit = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.2, 12), M.hit); crankHit.position.set(.6, 1.3, 0); crankArm.add(crankHit); // a generous grab area (not a hover target)
  const a1 = tag(new THREE.Mesh(gearGeo(48, { depth: .14, holes: 5 }), M.bronze), 'a1'); a1.rotation.y = Math.PI / 2; a1.position.x = A1_X - (W / 2 + .35); crankArm.add(a1);
  a1.add(tag(new THREE.Mesh(hubCollar(48 * MOD / 2, .14), M.bronzeOld), 'a1'));

  /* ---------- Front: zodiac, calendar, cosmos display (reconstruction), pointers ---------- */
  const front = new THREE.Group(); front.position.set(FRONT_C.x, FRONT_C.y, 4.12); addPart(front, [0, 0, 24]);
  const ZOD = ['ΚΡΙΟΣ', 'ΤΑΥΡΟΣ', 'ΔΙΔΥΜΟΙ', 'ΚΑΡΚΙΝΟΣ', 'ΛΕΩΝ', 'ΠΑΡΘΕΝΟΣ', 'ΧΗΛΑΙ', 'ΣΚΟΡΠΙΟΣ', 'ΤΟΞΟΤΗΣ', 'ΑΙΓΟΚΕΡΩΣ', 'ΥΔΡΟΧΟΟΣ', 'ΙΧΘΥΕΣ'];
  const MONTHS = ['ΘΩΘ', 'ΦΑΩΦΙ', 'ΑΘΥΡ', 'ΧΟΙΑΚ', 'ΤΥΒΙ', 'ΜΕΧΙΡ', 'ΦΑΜΕΝΩΘ', 'ΦΑΡΜΟΥΘΙ', 'ΠΑΧΩΝ', 'ΠΑΥΝΙ', 'ΕΠΙΦΙ', 'ΜΕΣΟΡΗ'];
  const MONTHS_EN = ['Thoth', 'Phaophi', 'Athyr', 'Choiak', 'Tybi', 'Mechir', 'Phamenoth', 'Pharmouthi', 'Pachon', 'Payni', 'Epeiph', 'Mesore'];
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
  // a raised bezel around the calendar ring, and the thin lip between the two rings
  [[8.25, 8.42, .05], [7.0, 7.1, .03]].forEach(([r0, r1, z]) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 128, 1), M.bronzeOld); m.position.z = z; m.raycast = () => {}; front.add(m); });

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
    const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 160 }, (_, k) => new THREE.Vector3(Math.cos(k / 160 * TAU) * (r + .065), Math.sin(k / 160 * TAU) * (r + .065), .002))), ringLine); edge.raycast = () => {}; ring.add(edge);
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
  moonBall.add(tag(new THREE.Mesh(new THREE.SphereGeometry(.56, 40, 24, 0, Math.PI), moonSilver), 'moonball'), tag(new THREE.Mesh(new THREE.SphereGeometry(.56, 40, 24, Math.PI, Math.PI), M.blackened), 'moonball'));
  const moonRim = tag(new THREE.Mesh(new THREE.TorusGeometry(.57, .03, 8, 48), M.bronze), 'moonball'); moonRim.rotation.y = Math.PI / 2; moonBall.add(moonRim);
  const moonGlow = tintedGlint(2.6, .3, 0xcfe0ff); moonPtr.add(moonGlow); moonGlow.position.copy(moonBall.position);
  const cap = tag(new THREE.Mesh(new THREE.CylinderGeometry(.32, .36, .3, 28), M.bronzeOld), 'sun'); cap.rotation.x = Math.PI / 2; cap.position.z = 1.0; front.add(cap);
  const capDome = tag(new THREE.Mesh(new THREE.SphereGeometry(.22, 20, 12, 0, TAU, 0, Math.PI / 2), M.bronze), 'sun'); capDome.rotation.x = Math.PI / 2; capDome.position.z = 1.15; front.add(capDome);

  /* ---------- Back: engraved spirals and subsidiary dials, with 3D pointers.
     The back group is turned round, so its x runs to the right as you look at the back. Every pointer here turns
     clockwise as time advances, except the Games pointer (the gearing gives this: see pose). The spirals start at
     the bottom and wind outwards clockwise. ---------- */
  const back = new THREE.Group(); back.position.z = -4.09; back.rotation.y = Math.PI; addPart(back, [0, 0, -24]);
  const MET = { cx: 0, cy: AR.n.y, r0: 4.55, r1: 7.3, turns: 5, cells: 235 }, SAR = { cx: 0, cy: AR.g.y, r0: 4.3, r1: 7.0, turns: 4, cells: 223 };
  const SUBS = [
    { key: 'games', cx: -AR.o.x, cy: AR.o.y, r: .84, n: 4 }, { key: 'callippic', cx: -AR.q.x, cy: AR.q.y, r: .84, n: 4 }, { key: 'exeligmos', cx: -AR.i.x, cy: AR.i.y, r: .9, n: 3 }
  ];
  const spiralAt = (S, t) => { const r = S.r0 + (S.r1 - S.r0) * t, a = -Math.PI / 2 - t * S.turns * TAU; return { x: S.cx + r * Math.cos(a), y: S.cy + r * Math.sin(a), r, a }; };
  // Eclipse glyphs: 51 of the 223 cells (the count is real; which cells, and Σ or Η, are illustrative)
  const GLYPHS = new Map(); while (GLYPHS.size < 51) { const c = Math.floor(rnd() * SAR.cells); if (!GLYPHS.has(c)) GLYPHS.set(c, rnd() < .58 ? 'Σ' : 'Η'); }
  const backMat = engraved(1536, Math.round(1536 * PH / PW), '#BC9461', (x, w, h) => {
    const s = w / PW, X = (u) => w / 2 + u * s, Y = (v) => h / 2 - v * s;
    function spiralDraw(S) {
      const pitch = (S.r1 - S.r0) / S.turns, n = S.turns * 220;
      [-.42, .42].forEach(off => { x.lineWidth = s * .04; x.beginPath(); for (let i = 0; i <= n; i++) { const t = i / n, p = spiralAt(S, t), px = X(p.x + off * pitch * Math.cos(p.a)), py = Y(p.y + off * pitch * Math.sin(p.a)); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); });
      x.lineWidth = s * .02;
      for (let i = 0; i <= S.cells; i++) { const p = spiralAt(S, i / S.cells), c = Math.cos(p.a), sn = Math.sin(p.a); x.beginPath(); x.moveTo(X(p.x - pitch * .42 * c), Y(p.y - pitch * .42 * sn)); x.lineTo(X(p.x + pitch * .42 * c), Y(p.y + pitch * .42 * sn)); x.stroke(); }
    }
    spiralDraw(MET); spiralDraw(SAR);
    x.font = `${s * .3}px ${SERIF}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    GLYPHS.forEach((ch, i) => { const p = spiralAt(SAR, (i + .5) / SAR.cells); x.fillText(ch, X(p.x), Y(p.y)); });
    x.font = `${s * .3}px ${SERIF}`;
    SUBS.forEach(d => {
      x.lineWidth = s * .025; x.beginPath(); x.arc(X(d.cx), Y(d.cy), d.r * s, 0, TAU); x.stroke();
      for (let i = 0; i < d.n; i++) { const a = i / d.n * TAU + Math.PI / 2; x.beginPath(); x.moveTo(X(d.cx), Y(d.cy)); x.lineTo(X(d.cx + d.r * Math.cos(a)), Y(d.cy + d.r * Math.sin(a))); x.stroke(); }
      for (let i = 0; i < d.n; i++) { const a = (i + .5) / d.n * TAU + Math.PI / 2; x.fillText('ΑΒΓΔ'[i], X(d.cx + d.r * .62 * Math.cos(a)), Y(d.cy + d.r * .62 * Math.sin(a))); }
    });
    // lettering in the corners beside the dials (decorative)
    const px = s * .2;
    [[-8.1, 15.9], [5.2, 15.9], [-8.1, -.25], [5.2, -.25], [-8.1, -15.2], [5.2, -15.2]].forEach(([u, v]) => letterRows(x, X(u + 2.9) - X(u) + 2 * px, 3, px, X(u), Y(v)));
  });
  const backFace = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), backMat);
  back.add(tag(backFace, 'plate-back'));
  // invisible areas so each dial can be named and lit
  const hitRing = (cx, cy, r0, r1, key, z = .03) => { const m = tag(new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), M.hit), key); m.position.set(cx, cy, z); back.add(m); return m; };
  hitRing(MET.cx, MET.cy, MET.r0 - .28, MET.r1 + .28, 'metonic'); hitRing(SAR.cx, SAR.cy, SAR.r0 - .32, SAR.r1 + .32, 'saros');
  SUBS.forEach(d => hitRing(d.cx, d.cy, 0, d.r, d.key));
  const glyphGeo = new THREE.CircleGeometry(.3, 12);
  GLYPHS.forEach((ch, i) => { const p = spiralAt(SAR, (i + .5) / SAR.cells), m = tag(new THREE.Mesh(glyphGeo, M.hit), 'glyphs'); m.position.set(p.x, p.y, .05); back.add(m); });
  function spiralPointer(S, key) {
    const g = new THREE.Group(); g.position.set(S.cx, S.cy, .1); back.add(g);
    const ptr = new THREE.Group(); g.add(ptr);
    const bar = tag(new THREE.Mesh(new THREE.BoxGeometry(.1, S.r1 + .5, .05), M.bronze), 'follower'); bar.position.y = (S.r1 + .5) / 2; ptr.add(bar);
    const follower = tag(new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .3, 14), M.silver), 'follower'); follower.rotation.x = Math.PI / 2; ptr.add(follower);
    const hubM = tag(new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .16, 20), M.bronzeOld), key); hubM.rotation.x = Math.PI / 2; g.add(hubM);
    return { ptr, follower, ...S };
  }
  const metonic = spiralPointer(MET, 'metonic'), saros = spiralPointer(SAR, 'saros');
  const subPtr = (d) => { const g = new THREE.Group(); g.position.set(d.cx, d.cy, .12); back.add(g); const bar = tag(new THREE.Mesh(new THREE.BoxGeometry(.07, d.r * .9, .04), M.silver), d.key); bar.position.y = d.r * .45; g.add(bar); const hb = tag(new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .1, 12), M.bronzeOld), d.key); hb.rotation.x = Math.PI / 2; g.add(hb); return g; };
  const [gamesPtr, callPtr, exelPtr] = SUBS.map(subPtr);

  /* ---------- Light and shadow ---------- */
  lights.hemi = new THREE.HemisphereLight(0xdfe6f2, 0x2a2318, .4); scene.add(lights.hemi);
  // Warm key light from above-left; it casts the shadows and follows the model
  lights.key = new THREE.DirectionalLight(0xffe7c4, 1.15); scene.add(lights.key); scene.add(lights.key.target);
  lights.key.castShadow = true;
  lights.key.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
  lights.key.shadow.bias = -.0004; lights.key.shadow.normalBias = .02; lights.key.shadow.radius = 2.2;
  const KEY_OFF = new THREE.Vector3(-26, 38, 34);
  // Cool rim light from behind-right
  const rim = new THREE.DirectionalLight(0x9fb8e8, .7); scene.add(rim); scene.add(rim.target);
  const RIM_OFF = new THREE.Vector3(34, 12, -40);
  // A soft highlight that sweeps slowly across the bronze
  const sweep = new THREE.PointLight(0xfff0d8, .55, 90, 2); scene.add(sweep);
  let shadowR = 0;
  function aimLights(t, r) {
    const c = mech.position;
    lights.key.position.copy(c).add(KEY_OFF); lights.key.target.position.copy(c);
    const sc = lights.key.shadow.camera;
    if (shadowR !== r) { shadowR = r; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 160; sc.updateProjectionMatrix(); }
    rim.position.copy(c).add(RIM_OFF); rim.target.position.copy(c);
    sweep.position.set(c.x + Math.sin(t * .23) * 14, c.y + 6 + Math.cos(t * .17) * 8, c.z + 22);
  }
  // Ground: a soft contact shadow plus the key light's cast shadow
  const ground = new THREE.Group(); ground.position.y = -H / 2 - .02; mech.add(ground);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(34, 22), new THREE.MeshBasicMaterial({
    map: canvasTex(256, 256, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(.45, 'rgba(0,0,0,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, false),
    transparent: true, depthWrite: false
  }));
  blob.rotation.x = -Math.PI / 2; blob.renderOrder = -1; blob.raycast = () => {}; ground.add(blob);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.ShadowMaterial({ opacity: .28 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = .01; shadowCatcher.receiveShadow = true; shadowCatcher.raycast = () => {}; ground.add(shadowCatcher);
  // Who casts and receives
  mech.traverse(o => {
    if (!o.isMesh || o === blob || o === shadowCatcher) return;
    const see = o.material !== M.hit;
    o.castShadow = see; o.receiveShadow = see;
  });
  doors.forEach(d => { d.castShadow = false; d.receiveShadow = false; });

  /* ---------- The motion model: the crank turns a1, a1 turns b1, and every pointer is read off the gears ---------- */
  const B1_PER_CRANK = 48 / 223; // a1 → b1: one crank turn is about 78 days (b1 turns once a year)
  const YEAR = 365.25;
  const T_EB = Math.atan2(AR.b.y - AR.e.y, AR.b.x - AR.e.x);
  const wrap = (a) => a - TAU * Math.round(a / TAU);
  const frac = (v) => v - Math.floor(v);
  const gAng = (g, rot) => g.phase + g.ratio * rot;
  // The Moon train after e5: e5 turns k1 on the turning carrier e3; k1's pin drives k2 through its slot; k2 turns e6; e1 turns b3.
  function moonChain(rot) {
    const rc = gAng(G.e3, rot), r5 = gAng(G.e5, rot);
    const t1 = childAngle(r5 - rc, K_A, 50, 50); // k1, in the carrier's frame
    const t2 = t1 + wrap(Math.atan2(K_PIN * Math.sin(t1) - K_OFF.y, K_PIN * Math.cos(t1) - K_OFF.x) - t1); // k2 follows the pin
    const e6 = 2 * K_A + Math.PI + .5 * TAU / 50 - t2 + rc; // k2 → e6 (equal teeth), back in the fixed frame
    const e1 = e6 + .4;
    return { t1, t2, e6, e1, b3: childAngle(e1, T_EB, 32, 32) };
  }
  const B3_ZERO = moonChain(0).b3;
  const st = { years: 0, sun: 0, moon: 0, phase: 0, met: 0, sar: 0 }; // what the dials show (for the readout)
  let apartT = 0, apartTarget = 0, mode = 'hero';

  function pose(c, dt) {
    const rot = -c * B1_PER_CRANK; // b1's angle: clockwise, seen from the front
    gears.forEach(g => { if (!g.dyn) g.mesh.rotation.z = gAng(g, rot); });
    const mc = moonChain(rot);
    k1.rotation.z = mc.t1; k2.rotation.z = mc.t2;
    G.e6.mesh.rotation.z = mc.e6; G.e1.mesh.rotation.z = mc.e1; G.b3.mesh.rotation.z = mc.b3;
    crankArm.rotation.x = c;
    // Front pointers: the Sun (date) pointer rides on b1, the Moon pointer on b3
    datePtr.rotation.z = rot;
    moonPtr.rotation.z = mc.b3 - B3_ZERO;
    const sun = -rot, moon = -moonPtr.rotation.z, elong = moon - sun; // angles on the zodiac, growing with time
    moonBall.rotation.y = Math.PI - elong; // the phase is the Moon's angle from the Sun: black at new moon, silver at full
    const years = sun / TAU, days = years * YEAR;
    planetRings.forEach(p => { p.ring.rotation.z = p.phase - days / p.period * TAU; }); // reconstruction, simplified motion
    rimGlints.forEach(g => { const a = g.userData.a + b1.mesh.rotation.z, k = Math.max(0, Math.cos(a - 2.3)); g.material.opacity = Math.pow(k, 14) * .9; });
    if (!reduced) { const tSh = performance.now() / 1000; corona.material.rotation = tSh * .08; corona.material.opacity = .8 + Math.sin(tSh * 2.1) * .1; sunGlow.material.opacity = .32 + Math.sin(tSh * 1.3) * .06; }
    // Back pointers: each is its arbor's angle, seen from behind
    const aN = G.n1.ratio * rot, aG = G.g1.ratio * rot;
    const spiralPose = (s, a) => { const f = frac(a / (s.turns * TAU)); s.ptr.rotation.z = -Math.PI - a; s.follower.position.y = s.r0 + (s.r1 - s.r0) * f; return f; };
    st.met = spiralPose(metonic, aN); st.sar = spiralPose(saros, aG);
    gamesPtr.rotation.z = -G.o1.ratio * rot;
    callPtr.rotation.z = -G.q1.ratio * rot;
    exelPtr.rotation.z = -G.i1.ratio * rot;
    st.years = years; st.sun = sun; st.moon = moon; st.phase = frac(elong / TAU);
    // Take apart / assemble
    apartT += (apartTarget - apartT) * Math.min(1, dt * 2.2);
    if (Math.abs(apartTarget - apartT) < .0005) apartT = apartTarget;
    const e = apartT * apartT * (3 - 2 * apartT);
    parts.forEach(p => p.obj.position.copy(p.base).addScaledVector(p.apart, e));
    doors.forEach(d => { d.visible = e > .01; d.material.forEach(m => { m.opacity = Math.min(1, e * 1.4); }); });
  }

  /* ---------- Views ---------- */
  const qTmp = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), IDENT = new THREE.Quaternion();
  const qOf = (pitch, yaw) => new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0));
  function rotateBy(q, dx, dy) { if (dx) { qTmp.setFromAxisAngle(AY, dx); q.premultiply(qTmp); } if (dy) { qTmp.setFromAxisAngle(AX, dy); q.premultiply(qTmp); } q.normalize(); }
  const vHalf = () => camera.fov * Math.PI / 360, hHalf = () => Math.atan(Math.tan(vHalf()) * camera.aspect);
  let dirty = true; // something changed: draw a frame

  /* ---------- Hero: the model sits in #mechBox, turns by itself, and can be rotated by dragging ---------- */
  const R_HERO = 20.6; // the sphere that holds the case and the crank at any rotation
  const BASE_Q = qOf(-.04, -.46);
  const heroQ = new THREE.Quaternion(), heroSpin = { x: 0, y: 0 };
  let crank = 0, heroPaused = false, heroOnScreen = true, heroDist = 80, introT = -1;
  let zoom = 1, zoomTarget = 1, resetting = false, dragging = false, lastX = 0, lastY = 0, lastT = 0, pinch = null;
  const pts = new Map();
  const ZMAX = 1.6, zclamp = (z) => Math.min(ZMAX, Math.max(1, z)); // zooming in may crop the model at the box's edge
  const heroActive = () => heroOnScreen && !document.hidden && box.clientWidth > 0 && box.clientHeight > 0;
  function heroLayout() {
    const w = box.clientWidth, h = box.clientHeight;
    if (!(w > 0 && h > 0)) return false; // hidden under 1024 px: never render to a zero-size box
    renderer.setPixelRatio(PR); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    heroDist = R_HERO / Math.sin(Math.min(vHalf(), hHalf())) * 1.03; // the whole sphere fits, with a small margin
    dirty = true; return true;
  }
  heroCanvas.addEventListener('wheel', (e) => {
    if (mode === 'explorer') { e.preventDefault(); exZoom = zx(exZoom * Math.exp(-e.deltaY * .0016)); exGesture(); return; }
    if (!(e.ctrlKey || e.metaKey)) return; // a plain wheel keeps scrolling the page
    e.preventDefault(); resetting = false; zoomTarget = zclamp(zoomTarget * Math.exp(-e.deltaY * .0025)); dirty = true; backSoon();
  }, { passive: false });
  heroCanvas.addEventListener('dblclick', () => { if (mode === 'hero') { resetting = true; heroSpin.x = heroSpin.y = 0; zoomTarget = 1; dirty = true; } else exResetView(); });
  // About a second after the visitor lets go, the model glides back to its starting view (there is no reset button).
  let backTimer = 0;
  const backSoon = () => { clearTimeout(backTimer); backTimer = setTimeout(() => { if (mode !== 'hero' || dragging || pinch) return; resetting = true; heroSpin.x = heroSpin.y = 0; zoomTarget = 1; dirty = true; run(); }, 1000); };
  function heroDown(e) {
    clearTimeout(backTimer);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2) { // two fingers: pinch to zoom, no rotating
      const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: zoomTarget };
      if (dragging) { dragging = false; heroSpin.x = heroSpin.y = 0; }
      return;
    }
    dragging = true; resetting = false; lastX = e.clientX; lastY = e.clientY; lastT = performance.now(); heroSpin.x = heroSpin.y = 0;
    heroCanvas.setPointerCapture(e.pointerId); heroCanvas.classList.add('dragging');
  }
  function heroMove(e) {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size >= 2) { resetting = false; const [a, b] = [...pts.values()]; zoomTarget = zclamp(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d); dirty = true; return; }
    if (!dragging) return;
    const now = performance.now(), dt = Math.max(8, now - lastT) / 1000;
    const dx = (e.clientX - lastX) * .008, dy = e.pointerType === 'touch' ? 0 : (e.clientY - lastY) * .008; // touch: vertical swipes scroll the page
    rotateBy(heroQ, dx, dy);
    heroSpin.x = heroSpin.x * .35 + (dx / dt) * .65; heroSpin.y = heroSpin.y * .35 + (dy / dt) * .65;
    lastX = e.clientX; lastY = e.clientY; lastT = now; dirty = true;
  }
  function heroUp(e) {
    pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
    if (pts.size === 0) backSoon();
    if (!dragging) return; dragging = false; heroCanvas.classList.remove('dragging'); if (performance.now() - lastT > 90) heroSpin.x = heroSpin.y = 0;
  }
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  function heroFrame(dt, force) {
    const turning = !reduced && !heroPaused;
    if (turning) crank += TAU / HERO_TURN_S * dt; // one crank turn every 12 s
    const spinning = Math.abs(heroSpin.x) + Math.abs(heroSpin.y) > .002, zooming = Math.abs(zoomTarget - zoom) > .001, intro = introT >= 0 && introT < 1;
    if (!(turning || dragging || spinning || zooming || resetting || intro || dirty || force)) return false; // nothing moves: no frame
    pose(crank, dt);
    if (!dragging) { // on release: momentum carries on and fades; the model then stays where the user left it
      rotateBy(heroQ, heroSpin.x * dt, heroSpin.y * dt);
      const decay = Math.exp(-dt * 4); heroSpin.x *= decay; heroSpin.y *= decay;
      if (resetting) { heroQ.slerp(IDENT, 1 - Math.exp(-dt * 3.8)); if (heroQ.angleTo(IDENT) < .002 && Math.abs(zoom - 1) < .003) { heroQ.identity(); zoom = zoomTarget = 1; resetting = false; } }
    }
    zoom += (zoomTarget - zoom) * (1 - Math.exp(-dt * 6));
    const k = introT < 0 ? 0 : easeOut(introT = Math.min(1, introT + dt / .9));
    mech.position.set(0, 0, -10 * (1 - k)); mech.scale.setScalar(1);
    qTmp.setFromAxisAngle(AY, -(1 - k) * .25); mech.quaternion.copy(heroQ).multiply(BASE_Q).multiply(qTmp);
    camera.position.set(0, 0, heroDist / zoom); camera.lookAt(0, 0, 0);
    return true;
  }

  /* ---------- Part texts: one table, two readings. Each entry is { en: { title, text, why? } } so Greek can be added
     beside it later (see T()). Numbers in the "edu" texts are only those confirmed in antikythera/RESEARCH.md or in
     Freeth et al. 2006 / 2021 as fetched; everything else is given without a number or with a hedge. ---------- */
  const LANG = 'en';
  const RECON_N = { title: 'An estimate, labelled as one', text: 'Where the data is missing, a model fills the gap, and says so.', why: 'This display is a modern reconstruction of lost parts, and is marked as one.' };
  const planet = (name) => ({
    g: ['analytics', 'front'],
    noima: { en: RECON_N },
    edu: { en: { title: name + ' (reconstruction)', text: 'No planet gearing survives. The inscriptions describe the planets, and a 2021 reconstruction by a UCL team proposes a display for the five planets known to the Greeks. This is a modern reconstruction, and the motion here is simplified.' } }
  });
  const PLATE_N = { title: 'Building the warehouse', text: 'The structure that fixes where everything sits and how it relates.', why: 'The plates fix the place of every arbor; move one hole and the gears no longer mesh.' };
  const PLATE_E = 'Bronze plates at the front and back carried the dials, with the gearing between them. The real gearing is closely packed, about 3 cm deep; it is spaced out here so you can see it.';
  const INFO = {
    crank: { g: ['automation', 'input'],
      noima: { en: { title: 'Automation', text: 'One turn, and every number updates by itself. Nobody copies, pastes or recalculates.', why: 'The crank was the only input: one movement of the hand drove every display at once.' } },
      edu: { en: { title: 'Input crank (lost)', text: 'The handle is lost; its socket survives on Fragment A. Its shape here, and the side it sits on, are guesses. One turn moved the date by about 78 days.' } } },
    a1: { g: ['data', 'input'],
      noima: { en: { title: 'Connecting your sources', text: 'Data arrives from outside in its own shape; here it is turned to fit the system.', why: 'The crown gear takes motion from outside the case and turns it through a right angle, into the plane of the gears.' } },
      edu: { en: { title: 'Crown gear a1', text: 'A crown gear that passed the turn of the crank to the main wheel, at right angles.' } } },
    b1: { g: ['data', 'gearing'],
      noima: { en: { title: 'One source of truth', text: 'Every report draws from the same place, so every number agrees.', why: 'Every train takes its motion from this one wheel; that is why all the dials stay in step.' } },
      edu: { en: { title: 'Main wheel b1', text: 'The largest gear: about 13 cm across, with four spokes and about 223 teeth. It turned once a year, and the Sun (date) pointer turned with it.' } } },
    b2: { g: ['data', 'gearing'],
      noima: { en: { title: 'Where the pipelines begin', text: 'From the one source, separate pipelines branch out to each report.', why: 'This gear is fixed to the main wheel and is the first gear of the trains behind it.' } },
      edu: { en: { title: 'Sun gear b2', text: 'A gear of 64 teeth, fixed to the main wheel and turning with it once a year. In the published reconstructions it starts both the Moon train and the trains to the back dials.' } } },
    'train-moon': { g: ['data', 'gearing'],
      noima: { en: { title: 'The calculation pipeline', text: 'Each pair of gears is one step of arithmetic. Together they turn one year into the Moon’s thirteen-odd circuits of the sky.', why: 'A gear pair multiplies by a fixed ratio: the calculation is cut into the teeth, the same every time.' } },
      edu: { en: { title: 'Moon train (gears c, d, e)', text: 'A chain of gear pairs that speeds the yearly turn up to the Moon’s: one circuit of the zodiac in about 27.3 days. The tooth counts this model uses are reconstructed ones, and several are estimates.' } } },
    pinslot: { g: ['data', 'gearing'],
      noima: { en: { title: 'Spotting anomalies', text: 'Real data does not move evenly. This step models the variation instead of averaging it away.', why: 'It adds the Moon’s real speeding-up and slowing-down to the even, average motion; astronomers call that variation the Moon’s anomaly.' } },
      edu: { en: { title: 'Pin-and-slot gears (k1, k2)', text: 'Two gears face to face on slightly different centres. A pin on one drives a slot in the other, so the Moon pointer speeds up and slows down, as in Hipparchus’ lunar theory. The researchers estimate the centres are about 1.1 mm apart, giving a swing of about 6.5°. It is the earliest known epicyclic gearing.' } } },
    e3: { g: ['data', 'gearing'],
      noima: { en: { title: 'Finding the slower pattern', text: 'Under the monthly rhythm there is a slower one. A good model carries both.', why: 'This wheel turns once in about nine years, slowly moving the point where the Moon runs fastest.' } },
      edu: { en: { title: 'Carrier wheel e3', text: 'A large wheel that carries the pin-and-slot gears. It turns once in about 9 years, the period of the Moon’s apogee, so the point where the Moon runs fastest drifts round the zodiac.' } } },
    'train-metonic': { g: ['data', 'gearing'],
      noima: { en: { title: 'The reporting pipeline', text: 'A fixed route from the source to a report, the same every time.', why: 'This train carries the yearly turn to the calendar on the back in fixed steps, with nothing left to chance.' } },
      edu: { en: { title: 'Metonic train (gears l, m, n)', text: 'Gears that slow the yearly turn so that the Metonic pointer makes five turns of its spiral in 19 years. One of them, l2, has 53 teeth. Part of this train is lost and reconstructed.' } } },
    'train-saros': { g: ['data', 'gearing'],
      noima: { en: { title: 'The reporting pipeline', text: 'The same source, a different route: this one feeds the scheduled reports.', why: 'It branches off the calendar train and drives the eclipse dial.' } },
      edu: { en: { title: 'Saros train (gears e, f, g)', text: 'It branches off through the large wheels on the e arbor and drives the eclipse pointer: four turns of its spiral in 223 lunar months. Gear f1 has 53 teeth, an awkward number to divide by hand.' } } },
    'train-sub': { g: ['data', 'gearing'],
      noima: { en: { title: 'Scheduling the refreshes', text: 'Some things update monthly, some yearly, some once in decades. Each gets its own pace.', why: 'These small trains gear the same motion down to cycles of 4, 54 and 76 years.' } },
      edu: { en: { title: 'Trains to the small dials', text: 'Small gears that slow the motion further, for the 4-year Games dial, the 76-year Callippic dial and the 54-year Exeligmos dial. Several of these gears are lost and reconstructed.' } } },
    arbor: { g: ['data', 'gearing'],
      noima: { en: { title: 'Joining the tables', text: 'Two tables joined on a shared key move as one.', why: 'An arbor locks two gears together so they turn as one, passing motion from one layer to the next.' } },
      edu: { en: { title: 'Arbors (axles)', text: 'Each arbor carries one or more gears fixed together, so they turn as one. The scans show a pin through one arbor, holding a gear with a square boss in place.' } } },
    'plate-front': { g: ['data', 'case'], noima: { en: PLATE_N }, edu: { en: { title: 'Front plate', text: PLATE_E } } },
    'plate-back': { g: ['data', 'case'], noima: { en: { title: 'Modelling the data', text: 'How the pieces relate, fixed once, so every report is built on the same model.', why: PLATE_N.why } }, edu: { en: { title: 'Back plate', text: PLATE_E } } },
    pillar: { g: ['data', 'case'],
      noima: { en: { title: 'The platform', text: 'The infrastructure underneath: dull, and everything depends on it.', why: 'Pillars hold the plates at an exact distance so the gears run true.' } },
      edu: { en: { title: 'Pillars', text: 'Posts holding the plates apart. Their number and positions here are illustrative.' } } },
    fastener: { g: ['data', 'case'],
      noima: { en: { title: 'Connecting your systems', text: 'Small connectors hold separate tools together as one system, and let you take it apart to service it.', why: 'Small pins held the parts of the machine together.' } },
      edu: { en: { title: 'Pins and rivets', text: 'Small pins held parts in place: the scans show one through an arbor, and a row of holes under the calendar ring for a locking pin. The pins and rivet heads on this model are illustrative.' } } },
    case: { g: ['data', 'case'],
      noima: { en: { title: 'Keeping it safe', text: 'Protected from the outside; open to the people who should read it.', why: 'The case and its covers protected the mechanism and opened to show the dials.' } },
      edu: { en: { title: 'Wooden case', text: 'About 34 × 18 × 9 cm (uncertain): roughly the size of a shoebox, with inscribed covers front and back. It is shown open at the sides so the gears can be seen.' } } },
    fragments: { g: ['data', 'case'], list: true,
      noima: { en: { title: 'Scattered pieces', text: 'It starts scattered: pieces in different places that only make sense together.', why: 'The mechanism survives in fragments; its meaning came from putting them together.' } },
      edu: { en: { title: 'The fragments', text: '82 fragments survive. The largest, Fragment A, holds 27 of the 30 surviving gears. (The fragments are not drawn on this model.)' } } },
    zodiac: { g: ['analytics', 'front'],
      noima: { en: { title: 'Defining your KPIs', text: 'An agreed scale: a number means nothing until everyone measures it the same way.', why: 'It is the fixed scale against which every pointer on the front is read.' } },
      edu: { en: { title: 'Zodiac ring', text: 'A fixed ring of the twelve signs, 30° each. The small letters on this model’s scale are decorative.' } } },
    calendar: { g: ['data', 'front'],
      noima: { en: { title: 'Cleaning data', text: 'Sources drift and disagree; a known rule puts them right.', why: 'A 365-day calendar slips against the Sun a little every year, so the ring was made movable to correct it.' } },
      edu: { en: { title: 'Egyptian calendar ring', text: 'Twelve months of 30 days plus five extra days. The ring sat in a channel and could be turned; holes under it took a locking pin. Some researchers argue it had 354 divisions, a lunar calendar.' } } },
    sun: { g: ['analytics', 'front'],
      noima: { en: { title: 'The headline number', text: 'Where we are today: the first thing anyone reads.', why: 'The Sun pointer shows the date.' } },
      edu: { en: { title: 'Sun and date pointer', text: 'It shows the Sun’s place in the zodiac and, on the outer ring, the date. One turn a year.' } } },
    moon: { g: ['analytics', 'front'],
      noima: { en: { title: 'Designing the dashboards', text: 'A second measure beside the first, on the same dial, with its real ups and downs.', why: 'The Moon pointer shares the dial with the Sun’s, so the two are read together.' } },
      edu: { en: { title: 'Moon pointer', text: 'It goes round the zodiac once in about 27.3 days, speeding up and slowing down through the pin-and-slot gears behind.' } } },
    moonball: { g: ['analytics', 'front'],
      noima: { en: { title: 'A calculated measure', text: 'Not stored anywhere: worked out from two other numbers, every time.', why: 'The ball has no train of its own; it turns by the difference between the Moon’s motion and the Sun’s.' } },
      edu: { en: { title: 'Moon-phase ball', text: 'A small ball, half silver and half black, carried on the Moon pointer. It turns by the difference between the Moon’s motion and the Sun’s, and so shows the phase: one cycle in about 29.5 days.' } } },
    mercury: planet('Mercury'), venus: planet('Venus'), mars: planet('Mars'), jupiter: planet('Jupiter'), saturn: planet('Saturn'),
    parapegma: { g: ['analytics', 'front'],
      noima: { en: { title: 'Sending the alerts', text: 'When a date arrives, the right people are told what is due.', why: 'It lists what happens in the sky through the year, to be read against the date.' } },
      edu: { en: { title: 'Parapegma (star calendar)', text: 'An inscribed calendar of the risings and settings of stars through the year, with weather signs. The lettering here is decorative.' } } },
    metonic: { g: ['analytics', 'back'],
      noima: { en: { title: 'Reconciling the calendars', text: 'Two systems that count differently, brought onto one calendar.', why: 'It reconciles two clocks that never quite agree, lunar months and solar years: 235 months are 19 years.' } },
      edu: { en: { title: 'Metonic dial', text: 'The upper back dial: a five-turn spiral of 235 lunar months, which is 19 years. It kept a lunar calendar in step with the solar year. Its month names are Corinthian.' } } },
    follower: { g: ['analytics', 'back'],
      noima: { en: { title: 'Keeping the history', text: 'Years of records in one continuous line, and always knowing where you are in it.', why: 'The pin rides in the spiral groove, so one pointer can follow several turns, not just one.' } },
      edu: { en: { title: 'Spiral pointer and pin', text: 'A pin on the pointer rode in the spiral groove, showing which turn to read. At the end of the spiral the pointer had to be set back to the start.' } } },
    callippic: { g: ['analytics', 'back'],
      noima: { en: { title: 'A second check', text: 'A slower cycle that refines the first.', why: 'It counts four of the 19-year cycles as one longer, more exact one.' } },
      edu: { en: { title: 'Callippic dial', text: 'A 76-year cycle: four Metonic cycles. The inscriptions name it; its gears are lost and reconstructed.' } } },
    games: { g: ['analytics', 'back'],
      noima: { en: { title: 'Your business calendar', text: 'The dates that matter to people, not only to the numbers.', why: 'It has no astronomy in it: it shows which year of the games it is.' } },
      edu: { en: { title: 'Games dial', text: 'A four-year dial of the Panhellenic games, including the Olympic, Nemean, Isthmian and Pythian games, the Naa of Dodona and the Halieia of Rhodes. It is the only pointer that turns anticlockwise.' } } },
    saros: { g: ['analytics', 'back'],
      noima: { en: { title: 'The reporting calendar', text: 'What is due, and when: the same report on the same cycle, every time.', why: 'It predicts eclipses years ahead, from a cycle found in centuries of records.' } },
      edu: { en: { title: 'Saros dial', text: 'The lower back dial: a four-turn spiral of 223 lunar months, about 18 years. Glyphs in 51 of its cells mark the months when an eclipse may happen.' } } },
    glyphs: { g: ['analytics', 'back'],
      noima: { en: { title: 'Business rules', text: 'The rule itself, written down: what happens, when, and of what kind.', why: 'Each glyph is the output of the rule: an eclipse of the Sun or of the Moon, and its hour.' } },
      edu: { en: { title: 'Eclipse glyphs', text: 'Glyphs in 51 cells predict 38 lunar and 27 solar eclipses, with the time of day. On this model Σ stands for a lunar and Η for a solar eclipse, and which cells they sit in is illustrative.' } } },
    exeligmos: { g: ['analytics', 'back'],
      noima: { en: { title: 'Keeping the schedule right', text: 'A correction that keeps the timings honest from one cycle to the next.', why: 'It tells the reader how many hours to add to the predicted times in later cycles.' } },
      edu: { en: { title: 'Exeligmos dial', text: 'Three Saros cycles, 54 years. It gave the correction, in hours, for the eclipse times. The letters on this model’s dial are decorative.' } } },
    backdoor: { g: ['analytics', 'case'],
      noima: { en: { title: 'Telling the story', text: 'Numbers explained in words, for the people who will use them.', why: 'The text on the back cover explains what each dial shows.' } },
      edu: { en: { title: 'Back cover inscription', text: 'A text describing the displays: in effect an instruction manual. It names 19 years, 76 years and 223 months. The lettering here is decorative.' } } },
    frontdoor: { g: ['analytics', 'case'],
      noima: { en: { title: 'The assumptions, written down', text: 'The numbers behind the model, stated openly.', why: 'The front cover carried a text about the planets and their cycles.' } },
      edu: { en: { title: 'Front cover inscription', text: 'A text about the planets. Two numbers read from it, 462 in the part on Venus and 442 in the part on Saturn, guided the 2021 reconstruction. The lettering here is decorative.' } } }
  };
  const ORDER = ['crank', 'a1', 'b1', 'b2', 'train-moon', 'pinslot', 'e3', 'train-metonic', 'train-saros', 'train-sub', 'arbor', 'calendar', 'plate-front', 'plate-back', 'pillar', 'fastener', 'case', 'fragments',
    'zodiac', 'sun', 'moon', 'moonball', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'parapegma', 'metonic', 'follower', 'callippic', 'games', 'saros', 'glyphs', 'exeligmos', 'backdoor', 'frontdoor'];
  const GROUPS = {
    noima: [['data', 'Data'], ['analytics', 'Analytics'], ['automation', 'Automation']],
    edu: [['input', 'Input'], ['gearing', 'Gearing'], ['front', 'Front dial'], ['back', 'Back dials'], ['case', 'Case and inscriptions']]
  };
  const UI = { en: {
    note: { noima: 'The mechanism, read as a data system.', edu: 'A simplified model, not an exact reconstruction. The planet display and some gears are modern reconstructions.' },
    link: { noima: 'In the mechanism', edu: 'In data work' },
    apart: ['Take apart', 'Assemble'],
    phases: ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'],
    day: (d, m) => 'Day ' + d + ' of ' + m, epag: (d) => 'Extra day ' + d + ' of 5',
    eclipse: ['Eclipse glyph this month', 'No eclipse glyph this month'],
    cycles: (y, s) => 'Year ' + y + ' of 19 · Saros month ' + s + ' of 223',
    hintMouse: 'Drag to rotate · scroll to zoom · click a part', hintTouch: 'Drag to rotate · pinch to zoom · tap a part'
  } };
  const T = (id, m) => { const e = INFO[id] && INFO[id][m]; return e ? (e[LANG] || e.en) : null; };
  const U = UI[LANG] || UI.en;
  const STAGES = window.NOIMA_STAGES || ['Collecting the exports', 'Cleaning the data', 'Checking the totals', 'Building the warehouse', 'Building the pipelines', 'Defining your KPIs', 'Joining the tables', 'Finding the patterns', 'Designing the dashboards', 'Automating the month-end', 'Retiring the spreadsheets', 'Making sense of it'];

  /* ---------- Explorer ---------- */
  const $ = (id) => document.getElementById(id);
  const ex = $('explorer'), exStage = $('exStage');
  const el = { close: $('exClose'), partsBtn: $('exPartsBtn'), parts: $('exParts'), panel: $('exPanel'), pGroup: $('exPanelGroup'), pTitle: $('exPanelTitle'), pText: $('exPanelText'), pLink: $('exPanelLink'), pWhy: $('exPanelWhy'), pClose: $('exPanelClose'),
    tip: $('exTip'), cap: $('exCap'), note: $('exNote'), apart: $('exApart'), turn: $('exTurn'), front: $('exFront'), back: $('exBack'), time: $('exTime'), reset: $('exReset'), hint: $('exHint'), loading: $('exLoading'), modes: ex ? [...ex.querySelectorAll('[data-mode]')] : [] };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const SPAN_CRANK = 19 / B1_PER_CRANK * TAU; // the Time slider spans one Metonic cycle (19 years), as a crank angle
  function turnLabel() { const t = el.turn; if (!t) return; const w = autoTurn ? 'Pause' : 'Play'; t.setAttribute('aria-pressed', autoTurn); t.setAttribute('aria-label', w); t.querySelectorAll('.ex-lg, .ex-sm').forEach(x => { x.textContent = w; }); }
  const EX_TURN_S = 6; // seconds per crank turn when "Turn the crank" is on
  const EX_DEFAULT = qOf(.1, -.62), EX_APART = qOf(.18, -1.12), EX_FRONT = qOf(.06, -.3), EX_BACK = qOf(.06, Math.PI + .3), EX_SIDE = qOf(.12, -1.0);
  const exQ = new THREE.Quaternion(), exSpin = { x: 0, y: 0 };
  let exCrank = 0, autoTurn = false, exGoalQ = null, exDrag = null, crankDrag = null, exPinch = null, lastFocus = null, exMode = 'noima', selected = null, hovered = null, listOpen = false;
  let exZoom = 1, camDist = 80, exFit = 80; const camTarget = new THREE.Vector3(), camGoalT = new THREE.Vector3(), exPts = new Map();
  const zx = (z) => Math.min(6, Math.max(.4, z));
  let lastSlider = -1e9, pendingPick = null, firstGesture = false, exPad = 0, exPadS = 0, exTop = 0;
  const mqSheet = matchMedia('(max-width: 767px)'); // there the part panel covers the foot of the stage, so the model moves up to stay in view
  function exGesture() { dirty = true; if (!firstGesture && el.hint) { firstGesture = true; el.hint.classList.add('gone'); } }
  function exLayout() {
    const w = exStage.clientWidth, h = exStage.clientHeight; if (!(w > 0 && h > 0)) return;
    renderer.setPixelRatio(PR); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    // fit the upright case (or the taken-apart spread) to the stage's shape, so portrait phones see all of it
    const hw = apartTarget ? 31 : 12.6, hh = apartTarget ? 31 : 19.4;
    exTop = el.note ? Math.min(.2, (el.note.offsetHeight + 16) / h) : 0; // the note at the top and the hint (or, on phones, the part panel) at the foot stay clear of the model
    exPad = mqSheet.matches && el.panel && !el.panel.hidden ? Math.min(.55, (el.panel.offsetHeight + 12) / h) : Math.min(.1, 34 / h);
    exFit = Math.max(hh / (1 - exPad - exTop) / Math.tan(vHalf()), hw / Math.tan(hHalf())) + (apartTarget ? 14 : 7);
    dirty = true;
  }
  function exResetView() { exGoalQ = (apartTarget ? EX_APART : EX_DEFAULT).clone(); exZoom = 1; exSpin.x = exSpin.y = 0; dirty = true; }

  // Highlight: the chosen part gets a warm glow that also shows through the plates; the rest dims a little
  const HL = { sel: new THREE.MeshBasicMaterial({ color: 0xE0BE8E, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }),
    hov: new THREE.MeshBasicMaterial({ color: 0xE0BE8E, transparent: true, opacity: .2, depthTest: false, depthWrite: false, toneMapped: false }) };
  const overlays = { sel: [], hov: [] }; let hlT = 0, dim = 0;
  function setOverlay(kind, id) {
    overlays[kind].forEach(o => o.parent && o.parent.remove(o)); overlays[kind] = [];
    const ids = !id ? [] : exMode === 'noima' ? ORDER.filter(k => T(k, 'noima').title === T(id, 'noima').title) : [id]; // parts that share a reading light together
    ids.forEach(k => (PM[k] || []).forEach(m => { const o = new THREE.Mesh(m.geometry, HL[kind]); o.renderOrder = 999; o.raycast = () => {}; m.add(o); overlays[kind].push(o); }));
    dirty = true;
  }
  const bb = new THREE.Box3(), bb2 = new THREE.Box3(), vTmp = new THREE.Vector3(), mInv = new THREE.Matrix4();
  function partCentre(id) { // centre and radius of a part, in the model's own frame
    const ms = PM[id]; if (!ms) return null;
    mech.updateMatrixWorld(true); mInv.copy(mech.matrixWorld).invert(); bb.makeEmpty();
    ms.forEach(m => { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); bb2.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld).applyMatrix4(mInv); bb.union(bb2); });
    return { c: bb.getCenter(new THREE.Vector3()), r: bb.getSize(vTmp).length() / 2 };
  }
  const FRONT_IDS = ['zodiac', 'calendar', 'sun', 'moon', 'moonball', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'parapegma', 'plate-front', 'frontdoor', 'b1'];
  const BACK_IDS = ['metonic', 'follower', 'callippic', 'games', 'saros', 'glyphs', 'exeligmos', 'plate-back', 'backdoor'];
  function select(id, opts) {
    opts = opts || {};
    if (id && !INFO[id]) id = null;
    selected = id; setOverlay('sel', id); hlT = 0;
    if (id && PM[id] && opts.fly) { // turn the part towards the viewer and move in
      const pc = partCentre(id);
      exGoalQ = (FRONT_IDS.includes(id) ? EX_FRONT : BACK_IDS.includes(id) ? EX_BACK : EX_SIDE).clone(); exSpin.x = exSpin.y = 0;
      exZoom = zx(Math.min(2.4, Math.max(1, 9 / Math.max(pc.r, 1.2))));
    }
    renderPanel(); markList(); dirty = true;
  }
  function renderPanel() {
    if (!el.panel) return;
    if (!selected) { el.panel.hidden = true; exLayout(); return; }
    const a = T(selected, exMode), other = T(selected, exMode === 'noima' ? 'edu' : 'noima'), grp = GROUPS[exMode].find(g => g[0] === INFO[selected].g[exMode === 'noima' ? 0 : 1]);
    const fill = () => {
      el.pGroup.textContent = grp ? grp[1] : ''; el.pTitle.textContent = a.title; el.pText.textContent = a.text;
      el.pLink.textContent = U.link[exMode] + ': ' + other.title;
      el.pWhy.textContent = exMode === 'noima' ? (a.why || '') : ''; el.pWhy.hidden = !el.pWhy.textContent;
    };
    if (el.panel.hidden || reduced) { fill(); el.panel.hidden = false; exLayout(); return; }
    el.panel.classList.add('swap'); setTimeout(() => { fill(); el.panel.classList.remove('swap'); if (mode === 'explorer') exLayout(); }, 160); // cross-fade
  }
  function buildList() {
    if (!el.parts) return;
    const host = el.parts.querySelector('.ex-parts-in') || el.parts; host.textContent = '';
    GROUPS[exMode].forEach(([key, name]) => {
      const seen = new Set(); // parts that share one reading (the five planets in NÓIMA's) are listed once
      const ids = ORDER.filter(id => INFO[id].g[exMode === 'noima' ? 0 : 1] === key && !seen.has(T(id, exMode).title) && seen.add(T(id, exMode).title)); if (!ids.length) return;
      const h = document.createElement('h3'); h.className = 'label-sm'; h.textContent = name; host.appendChild(h);
      const ul = document.createElement('ul'); host.appendChild(ul);
      ids.forEach(id => {
        const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.className = 'ex-part'; b.dataset.part = id; b.textContent = T(id, exMode).title;
        li.appendChild(b); ul.appendChild(li);
      });
    });
    markList();
  }
  function markList() { const cur = selected && T(selected, exMode).title; if (el.parts) el.parts.querySelectorAll('.ex-part').forEach(b => { if (b.textContent === cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }); }
  function setList(open) {
    listOpen = open; if (!el.parts) return;
    el.parts.hidden = !open; el.partsBtn.setAttribute('aria-expanded', open);
    if (open) { const cur = el.parts.querySelector('[aria-current]') || el.parts.querySelector('.ex-part'); cur && cur.focus(); }
  }
  function setMode(m, focus) {
    if (m !== 'noima' && m !== 'edu') return;
    const changed = m !== exMode; exMode = m;
    el.modes.forEach(b => { const on = b.dataset.mode === m; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    ex.dataset.mode = m;
    HL.sel.color.set(m === 'edu' ? 0xDCE4F0 : 0xE0BE8E); // silver-white for the historical reading, bronze for NÓIMA's
    const swap = () => { if (el.note) el.note.textContent = U.note[m]; buildList(); capKey = ''; writeCaption(); if (mode === 'explorer') exLayout(); };
    if (changed && !reduced && el.cap) { el.cap.classList.add('swap'); el.note && el.note.classList.add('swap'); setTimeout(() => { swap(); el.cap.classList.remove('swap'); el.note && el.note.classList.remove('swap'); }, 160); } else swap();
    if (changed) setOverlay('sel', selected);
    renderPanel(); dirty = true;
  }
  // Caption: the data-work step (NÓIMA) or what the dials read (How it worked)
  let capKey = '', capAt = 0;
  function writeCaption(now) {
    if (!el.cap) return;
    if (now !== undefined && now - capAt < 100) return; capAt = now || 0;
    let key, html;
    if (exMode === 'noima') {
      const n = STAGES.length, i = ((Math.floor(exCrank / TAU * 2) % n) + n) % n; key = 'n' + i; // a new step every half turn (3 s)
      html = () => {
        const num = String(i + 1).padStart(2, '0'), oa = el.cap.querySelector('.ms-n'), ob = el.cap.querySelector('.ms-t');
        if (oa && ob && !reduced) { // the number and the text fade and lift away, then the new ones settle in
          oa.classList.add('swap'); ob.classList.add('swap');
          setTimeout(() => { if (capKey !== 'n' + i) return; oa.textContent = num; ob.textContent = STAGES[i]; oa.classList.remove('swap'); ob.classList.remove('swap'); }, 260);
          return;
        }
        el.cap.textContent = ''; const a = document.createElement('span'), b = document.createElement('span'); a.className = 'ms-n'; a.textContent = num; b.className = 'ms-t'; b.textContent = STAGES[i]; el.cap.append(a, b);
      };
    } else {
      const doy = Math.floor(frac(st.years) * 365), date = doy < 360 ? U.day(doy % 30 + 1, MONTHS_EN[Math.floor(doy / 30)]) : U.epag(doy - 359);
      const ph = U.phases[Math.floor(frac(st.phase + 1 / 16) * 8)], cell = Math.floor(st.sar * 223), ecl = GLYPHS.has(cell);
      const cyc = U.cycles(Math.floor(st.met * 19) + 1, cell + 1); key = date + ph + ecl + cyc;
      html = () => {
        el.cap.textContent = '';
        [['rd rd-date', date], ['rd rd-moon', ph], ['rd rd-ecl' + (ecl ? ' on' : ''), U.eclipse[ecl ? 0 : 1]], ['rd rd-cyc', cyc]].forEach(([c, t]) => { const s = document.createElement('span'); s.className = c; s.textContent = t; el.cap.appendChild(s); });
      };
    }
    if (key !== capKey) { capKey = key; html(); }
    if (el.time) el.time.setAttribute('aria-valuetext', 'Year ' + (Math.floor(frac(exCrank / SPAN_CRANK) * 19) + 1) + ' of 19');
  }

  // Pointer work in the explorer: drag the crank handle to turn time, drag anywhere else to turn the model, tap to name a part
  const pivot = new THREE.Vector3();
  function setRay(e) { const r = heroCanvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  function crankScreenAngle(e) { pivot.setFromMatrixPosition(crankGrp.matrixWorld).project(camera); const r = heroCanvas.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + (1 - pivot.y) / 2 * r.height), e.clientX - (r.left + (pivot.x + 1) / 2 * r.width)); }
  function pickAt(e) {
    setRay(e);
    const hit = ray.intersectObjects(pickables, false).find(h => { for (let o = h.object; o; o = o.parent) if (!o.visible) return false; return true; });
    return hit ? hit.object.userData.part : null;
  }
  function exDown(e) {
    exPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (exPts.size >= 2) { const [a, b] = [...exPts.values()]; exPinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: exZoom }; exDrag = null; crankDrag = null; return; }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    setRay(e);
    const tapInfo = { x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false };
    if (ray.intersectObject(crankHit, false)[0] || ray.intersectObject(gripM, false)[0]) crankDrag = Object.assign({ a: crankScreenAngle(e), id: e.pointerId }, tapInfo);
    else { exDrag = Object.assign({ x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }, tapInfo); exGoalQ = null; exSpin.x = exSpin.y = 0; }
    heroCanvas.setPointerCapture(e.pointerId); heroCanvas.classList.add('dragging'); setTip(null);
  }
  function exMove(e) {
    if (exPts.has(e.pointerId)) exPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (exPinch && exPts.size >= 2) { const [a, b] = [...exPts.values()]; exZoom = zx(exPinch.z * Math.hypot(a.x - b.x, a.y - b.y) / exPinch.d); exGesture(); return; }
    const d = crankDrag || exDrag;
    if (d && e.pointerId === d.id) {
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 8) d.moved = true;
      if (crankDrag) { const a = crankScreenAngle(e); exCrank += wrap(a - crankDrag.a); crankDrag.a = a; lastSlider = -1e9; exGesture(); return; }
      const now = performance.now(), dt = Math.max(8, now - exDrag.t) / 1000, dx = (e.clientX - exDrag.x) * .008, dy = (e.clientY - exDrag.y) * .008;
      rotateBy(exQ, dx, dy);
      exSpin.x = exSpin.x * .35 + (dx / dt) * .65; exSpin.y = exSpin.y * .35 + (dy / dt) * .65;
      exDrag.x = e.clientX; exDrag.y = e.clientY; exDrag.t = now; if (d.moved) exGesture(); else dirty = true;
      return;
    }
    if (e.pointerType === 'mouse') { pendingPick = { x: e.clientX, y: e.clientY }; dirty = true; } // picked once per frame, not per event
  }
  function exUp(e) {
    exPts.delete(e.pointerId); if (exPts.size < 2) exPinch = null;
    const d = crankDrag && crankDrag.id === e.pointerId ? crankDrag : exDrag && exDrag.id === e.pointerId ? exDrag : null;
    if (!d) return;
    if (d === exDrag && performance.now() - exDrag.t > 90) exSpin.x = exSpin.y = 0;
    crankDrag = null; exDrag = null; heroCanvas.classList.remove('dragging'); dirty = true;
    if (e.type === 'pointerup' && !d.moved && performance.now() - d.t0 < 600) { // a tap or click (not the end of a drag): name the part
      const id = pickAt(e); if (id !== selected) select(id); // empty space clears the choice
    }
  }
  function setTip(id, x, y) {
    if (!el.tip) return;
    if (hovered !== id) { hovered = id; setOverlay('hov', id && id !== selected ? id : null); heroCanvas.style.cursor = id ? 'pointer' : ''; }
    if (!id) { el.tip.hidden = true; return; }
    el.tip.textContent = T(id, exMode).title; el.tip.hidden = false;
    const r = exStage.getBoundingClientRect(), w = el.tip.offsetWidth;
    el.tip.style.transform = `translate(${Math.round(Math.min(r.width - w - 8, Math.max(8, x - r.left + 14)))}px, ${Math.round(Math.max(8, y - r.top + 16))}px)`;
  }
  heroCanvas.addEventListener('pointerdown', (e) => { if (mode === 'hero') heroDown(e); else exDown(e); });
  heroCanvas.addEventListener('pointermove', (e) => { if (mode === 'hero') heroMove(e); else exMove(e); });
  ['pointerup', 'pointercancel'].forEach(t => heroCanvas.addEventListener(t, (e) => { if (mode === 'hero') heroUp(e); else exUp(e); }));
  heroCanvas.addEventListener('pointerleave', () => { pendingPick = null; if (mode === 'explorer') setTip(null); });

  function exFrame(dt, now, force) {
    if (autoTurn && !crankDrag) exCrank += TAU / EX_TURN_S * dt;
    const spinning = Math.abs(exSpin.x) + Math.abs(exSpin.y) > .002, easing = Math.abs(apartTarget - apartT) > .0005;
    const goalD = exFit / exZoom, camMoving = Math.abs(goalD - camDist) > .02 || camGoalT.distanceToSquared(camTarget) > .0004 || Math.abs(exPad - exPadS) > .002;
    const hl = selected ? 1 : 0, fading = Math.abs(hl - hlT) > .002 || Math.abs((selected ? 1 : 0) - dim) > .002;
    if (!(autoTurn || crankDrag || exDrag || spinning || exGoalQ || easing || camMoving || fading || dirty || force)) return false; // nothing moves: no frame (saves the battery)
    pose(exCrank, dt);
    if (!exDrag) { rotateBy(exQ, exSpin.x * dt, exSpin.y * dt); const dk = Math.exp(-dt * 2.6); exSpin.x *= dk; exSpin.y *= dk; }
    if (exGoalQ) { exQ.slerp(exGoalQ, reduced ? 1 : Math.min(1, dt * 3.4)); if (exQ.angleTo(exGoalQ) < .002) exGoalQ = null; }
    mech.position.set(0, 0, 0); mech.scale.setScalar(1); mech.quaternion.copy(exQ);
    // the camera looks at the chosen part (or the centre) and eases to its distance
    const pc = selected && exZoom > 1.05 ? partCentre(selected) : null;
    if (pc) camGoalT.copy(pc.c).applyQuaternion(exQ); else camGoalT.set(0, apartTarget ? 0 : .4, 0);
    const k = reduced ? 1 : 1 - Math.exp(-dt * 5);
    camTarget.lerp(camGoalT, k); camDist += (goalD - camDist) * k;
    exPadS += (exPad - exPadS) * k;
    const oy = (exTop - exPadS) * camDist * Math.tan(vHalf()); // centre the model in the free part of the stage
    camera.position.set(camTarget.x, camTarget.y + oy, camTarget.z + camDist); camera.lookAt(camTarget.x, camTarget.y + oy, camTarget.z);
    hlT += (hl - hlT) * (reduced ? 1 : Math.min(1, dt * 9)); dim += ((selected ? 1 : 0) - dim) * (reduced ? 1 : Math.min(1, dt * 6));
    HL.sel.opacity = .42 * hlT; renderer.toneMappingExposure = baseExposure * (1 - .26 * dim);
    if (pendingPick) { camera.updateMatrixWorld(); mech.updateMatrixWorld(true); const p = pendingPick; pendingPick = null; setTip(pickAt({ clientX: p.x, clientY: p.y }), p.x, p.y); }
    if (el.time && now - lastSlider > 400) el.time.value = Math.round(frac(exCrank / SPAN_CRANK) * 1000); // the slider follows unless a hand is on it
    writeCaption(now);
    return true;
  }

  const trapSel = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const inerted = [];
  function openExplorer() {
    if (mode === 'explorer' || !ex) return;
    lastFocus = document.activeElement; mode = 'explorer';
    ex.hidden = false; ex.getBoundingClientRect(); ex.classList.add('open');
    [...document.body.children].forEach(n => { if (n !== ex && n.tagName !== 'SCRIPT' && !n.inert) { n.inert = true; inerted.push(n); } }); // the page behind is out of reach
    exStage.insertBefore(heroCanvas, exStage.firstChild); document.body.style.overflow = 'hidden'; heroCanvas.tabIndex = 0; heroCanvas.style.cursor = '';
    // a clean start every time: NÓIMA reading, time zero, nothing chosen (the hero keeps its own time)
    exCrank = 0; autoTurn = false; turnLabel(); apartTarget = 0; selected = null; hovered = null; exZoom = 1; firstGesture = false; lastSlider = -1e9;
    exQ.copy(EX_DEFAULT); exGoalQ = null; exSpin.x = exSpin.y = 0; camTarget.set(0, .4, 0); camGoalT.copy(camTarget);
    setOverlay('sel', null); setOverlay('hov', null); hlT = dim = 0;
    el.apart.textContent = U.apart[0]; el.turn.setAttribute('aria-pressed', 'false'); setList(false);
    if (el.hint) { el.hint.textContent = matchMedia('(hover: none)').matches ? U.hintTouch : U.hintMouse; el.hint.classList.remove('gone'); }
    setMode('noima'); renderPanel();
    exLayout(); camDist = exFit; exPadS = exPad;
    try { history.pushState({ noimaEx: 1 }, ''); } catch (err) { /* the Back gesture then leaves the page, as before */ }
    dirty = true; run();
    requestAnimationFrame(() => ex.classList.remove('is-loading'));
    el.close.focus();
  }
  function closeExplorer(fromHistory) {
    if (mode !== 'explorer') return;
    mode = 'hero'; ex.classList.remove('open');
    inerted.splice(0).forEach(n => { n.inert = false; });
    // explicit reset: the hero shares the scene
    setOverlay('sel', null); setOverlay('hov', null); selected = hovered = null; setTip(null); if (el.panel) el.panel.hidden = true; setList(false);
    apartTarget = 0; apartT = 0; autoTurn = false; turnLabel(); crankDrag = exDrag = exPinch = null; exPts.clear(); pendingPick = null;
    renderer.toneMappingExposure = baseExposure;
    setTimeout(() => { if (mode === 'hero') ex.hidden = true; }, reduced ? 0 : 320);
    box.insertBefore(heroCanvas, box.firstChild); document.body.style.overflow = ''; heroCanvas.removeAttribute('tabindex'); heroCanvas.style.cursor = ''; heroCanvas.classList.remove('dragging');
    if (heroLayout()) { dirty = true; run(); } // under 1024 px there is no live hero: the loop simply stops
    if (!fromHistory && history.state && history.state.noimaEx) history.back();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (ex) {
    el.close.addEventListener('click', () => closeExplorer());
    addEventListener('popstate', () => closeExplorer(true)); // the phone's Back gesture closes the explorer
    document.addEventListener('keydown', (e) => { // on the document: Escape must work wherever the focus has gone
      if (mode !== 'explorer') return;
      if (e.key === 'Escape') { e.preventDefault(); if (listOpen) { setList(false); el.partsBtn.focus(); } else closeExplorer(); return; }
      if (e.key === 'Tab') { // keep the keyboard inside the dialog
        const f = [...ex.querySelectorAll(trapSel)].filter(n => n.offsetParent !== null || n === heroCanvas), i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
        return;
      }
      const t = e.target;
      if (t.getAttribute && t.getAttribute('role') === 'radio' && (e.key.startsWith('Arrow'))) { e.preventDefault(); setMode(exMode === 'noima' ? 'edu' : 'noima', true); return; }
      if (t === heroCanvas) { // the model by keyboard: arrows turn it, + and − zoom, 0 resets the view
        const s = .14, map = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
        if (map) { e.preventDefault(); exGoalQ = null; rotateBy(exQ, map[0], map[1]); exGesture(); }
        else if (e.key === '+' || e.key === '=') { exZoom = zx(exZoom * 1.2); exGesture(); }
        else if (e.key === '-') { exZoom = zx(exZoom / 1.2); exGesture(); }
        else if (e.key === '0') exResetView();
      }
      if ((e.key === 'm' || e.key === 'M') && t.tagName !== 'INPUT') setMode(exMode === 'noima' ? 'edu' : 'noima');
    });
    el.modes.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    el.apart.addEventListener('click', () => {
      apartTarget = apartTarget ? 0 : 1; el.apart.textContent = U.apart[apartTarget];
      exLayout(); exResetView();
    });
    el.turn.addEventListener('click', () => { autoTurn = !autoTurn; turnLabel(); lastSlider = -1e9; dirty = true; });
    el.front.addEventListener('click', () => { exGoalQ = IDENT.clone(); exZoom = 1; exSpin.x = exSpin.y = 0; dirty = true; });
    el.back.addEventListener('click', () => { exGoalQ = qOf(0, Math.PI); exZoom = 1; exSpin.x = exSpin.y = 0; dirty = true; });
    el.reset && el.reset.addEventListener('click', exResetView);
    el.time.addEventListener('input', () => { exCrank = +el.time.value / 1000 * SPAN_CRANK; lastSlider = performance.now(); dirty = true; });
    el.partsBtn.addEventListener('click', () => setList(!listOpen));
    el.pClose && el.pClose.addEventListener('click', () => { select(null); heroCanvas.focus(); });
    el.parts.addEventListener('click', (e) => { const b = e.target.closest('.ex-part'); if (!b) return; select(b.dataset.part, { fly: true }); if (matchMedia('(max-width: 1023px)').matches) { setList(false); el.partsBtn.focus(); } });
    const listHover = (e) => { const b = e.target.closest && e.target.closest('.ex-part'); const id = b ? b.dataset.part : null; if (id !== hovered) { hovered = id; setOverlay('hov', id && id !== selected ? id : null); } };
    el.parts.addEventListener('pointerover', listHover); el.parts.addEventListener('focusin', listHover);
    el.parts.addEventListener('pointerleave', () => { hovered = null; setOverlay('hov', null); });
    el.parts.addEventListener('keydown', (e) => { // up and down move through the list
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const bs = [...el.parts.querySelectorAll('.ex-part')], i = bs.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); bs[(i + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus();
    });
    if (window.ResizeObserver) new ResizeObserver(() => { if (mode === 'explorer') exLayout(); }).observe(exStage);
  }

  /* ---------- Turn events: the page shows the data-work steps under the hero model as the crank turns ---------- */
  let lastTurnSent = null, lastTurnAt = -1e9;
  function emitTurn(now) {
    if (mode !== 'hero' || now - lastTurnAt < 100) return;
    const turns = crank / TAU;
    if (lastTurnSent !== null && Math.abs(turns - lastTurnSent) < 1e-4) return;
    lastTurnSent = turns; lastTurnAt = now;
    window.dispatchEvent(new CustomEvent('noima:turn', { detail: { turns } }));
  }

  /* ---------- Loop: runs only while there is something to show (hero on screen from 1024 px, or the explorer open) ---------- */
  let running = false, prev = performance.now(), idleFrames = 0;
  function draw(now) { aimLights(reduced ? 0 : now / 1000, mode === 'explorer' && apartT > .02 ? 46 : 27); renderer.render(scene, camera); dirty = false; }
  function frame(now) {
    if (mode === 'hero' && !heroActive()) { running = false; return; }
    // While the landing animation covers the page, render only now and then, so the landing gets the whole frame budget.
    if (introT < 0 && mode === 'hero' && document.body.classList.contains('landing-on') && (idleFrames++ % 20)) { prev = now; requestAnimationFrame(frame); return; }
    const dt = Math.max(0, Math.min(.05, (now - prev) / 1000)); prev = now; // never negative: a frame's timestamp can be a little earlier than the clock read in run(), and time must not run backwards (the caption would jump to step 12)
    if (mode === 'hero' ? heroFrame(dt) : exFrame(dt, now)) draw(now);
    emitTurn(now);
    requestAnimationFrame(frame);
  }
  function run() { if (!running && (mode === 'explorer' || heroActive())) { running = true; prev = performance.now(); requestAnimationFrame(frame); } }
  function renderNow() { // one frame, at once (also used when the tab is in the background, where animation frames are paused)
    const now = performance.now();
    if (mode === 'hero') { if (!heroLayout()) return; heroFrame(0, true); } else { exLayout(); exFrame(0, now, true); }
    draw(now);
  }
  const wake = () => { if (mode === 'hero' && heroLayout()) { dirty = true; run(); } };
  if (window.ResizeObserver) new ResizeObserver(wake).observe(box); else addEventListener('resize', wake);
  mqHero.addEventListener ? mqHero.addEventListener('change', wake) : mqHero.addListener(wake);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { dirty = true; run(); } });
  new IntersectionObserver(([e]) => { heroOnScreen = e.isIntersecting; if (heroOnScreen) wake(); }).observe(box); // the pose stays as the user left it
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(wake);
  addEventListener('load', wake);

  // A still picture of the model in its hero pose, on a transparent background (used for the phone hero's image)
  function still(size, type, quality) {
    size = size || 1400;
    const keep = { pr: renderer.getPixelRatio(), sz: renderer.getSize(new THREE.Vector2()), aspect: camera.aspect, pos: camera.position.clone(), q: mech.quaternion.clone(), p: mech.position.clone(), ap: apartT, apT: apartTarget, exp: renderer.toneMappingExposure };
    apartT = apartTarget = 0; pose(1.0, 0); ground.visible = false; overlays.sel.concat(overlays.hov).forEach(o => { o.visible = false; });
    renderer.setPixelRatio(1); renderer.setSize(size, size, false); camera.aspect = 1; camera.updateProjectionMatrix(); renderer.toneMappingExposure = baseExposure;
    mech.position.set(0, 0, 0); mech.quaternion.copy(BASE_Q);
    camera.position.set(0, 0, 19.6 / Math.sin(vHalf())); camera.lookAt(0, 0, 0);
    aimLights(0, 27); renderer.render(scene, camera);
    const url = heroCanvas.toDataURL(type || 'image/png', quality);
    ground.visible = true; overlays.sel.concat(overlays.hov).forEach(o => { o.visible = true; });
    apartT = keep.ap; apartTarget = keep.apT; renderer.toneMappingExposure = keep.exp;
    renderer.setPixelRatio(keep.pr); renderer.setSize(keep.sz.x, keep.sz.y, false); camera.aspect = keep.aspect; camera.updateProjectionMatrix();
    camera.position.copy(keep.pos); mech.quaternion.copy(keep.q); mech.position.copy(keep.p); dirty = true;
    if (running || mode === 'explorer' || heroActive()) renderNow();
    return url;
  }

  setTheme(document.documentElement.dataset.theme || 'dark');
  if (ex) { ex.dataset.mode = 'noima'; buildList(); }
  camera.position.set(0, 0, 80); camera.lookAt(0, 0, 0);
  if (heroLayout()) run();

  window.NoimaMech = {
    v: BUILD,
    intro() { introT = reduced || !heroActive() ? 1 : 0; dirty = true; document.documentElement.classList.add('mech-on'); run(); }, // 'mech-on' lets the hero's title and caption fade in with the model
    setTheme, openExplorer,
    pauseHero(on) { heroPaused = !!on; dirty = true; run(); },
    resetHero() { if (mode !== 'hero') return; resetting = true; heroSpin.x = heroSpin.y = 0; zoomTarget = 1; dirty = true; run(); }, // back to the starting view (the reset button under the model)
    still,
    // _dbg is for testing from the console only (the QA notes in docs/review use it); nothing on the site calls it.
    _dbg: { G, AR, st, renderNow, pose, select, setMode, gears, PM, exQ, heroQ,
      shot(q) { renderNow(); return heroCanvas.toDataURL('image/jpeg', q || .85); },
      step(dt, n) { for (let i = 0; i < (n || 1); i++) { const now = performance.now(); if (mode === 'hero') heroFrame(dt, true); else exFrame(dt, now, true); if (i === (n || 1) - 1) draw(now); } }, get mode() { return mode; }, set crank(v) { if (mode === 'hero') crank = v; else exCrank = v; dirty = true; }, get crank() { return mode === 'hero' ? crank : exCrank; } }
  };
  if (document.documentElement.classList.contains('started')) window.NoimaMech.intro(); // loaded after the landing ended
})();
