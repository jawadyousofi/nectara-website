// Asal in 3D (three.js r128, plain ES5 style for older TV browsers).
// A jointed bee kid: big head with curly hair and antennae, bee sweater, striped legs with knees, shoes, buzzing wings.
// He turns his whole body toward where he flies, leans in, tucks his knees, then turns back to face us, waves and talks.
// Stage coordinates are the 1600 x 900 world stage used by world.js.
(function () {
  'use strict';
  var T = window.THREE;
  if (!T) return;

  var FOV = 30, DIST = 40;
  var VH = 2 * DIST * Math.tan(FOV / 2 * Math.PI / 180), VW = VH * 16 / 9;
  var SCALE = 1.35;
  function stageToWorld(x, y) { return new T.Vector3((x / 1600 - 0.5) * VW, (0.5 - y / 900) * VH, 0); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function angleLerp(a, b, k) { var d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * k; }

  // Cel-shaded look
  var grad = new Uint8Array([90, 90, 90, 175, 175, 175, 255, 255, 255]);
  var gradMap = new T.DataTexture(grad, 3, 1, T.RGBFormat);
  gradMap.minFilter = gradMap.magFilter = T.NearestFilter; gradMap.needsUpdate = true;
  function toon(color, extra) { var o = { color: color, gradientMap: gradMap }; for (var k in extra || {}) o[k] = extra[k]; return new T.MeshToonMaterial(o); }
  var INK = new T.MeshBasicMaterial({ color: 0x2a2118, side: T.BackSide });
  function mesh(geo, mat, outline) {
    var m = new T.Mesh(geo, mat);
    if (outline) { var o = new T.Mesh(geo, INK); o.scale.setScalar(1 + outline); m.add(o); }
    return m;
  }
  function stripes() {
    var c = document.createElement('canvas'); c.width = 8; c.height = 64;
    var g = c.getContext('2d');
    for (var i = 0; i < 4; i++) { g.fillStyle = '#F2C14E'; g.fillRect(0, i * 16, 8, 9); g.fillStyle = '#2A2118'; g.fillRect(0, i * 16 + 9, 8, 7); }
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }

  function buildAsal() {
    var SKIN = toon(0xe3ac80), WHITE = toon(0xfffdf5), HAIR = toon(0x2b1a12), YEL = toon(0xf2c14e), DARK = toon(0x2a2118);
    var STRIPE = toon(0xffffff, { map: stripes() });
    var rig = {};
    var root = new T.Group(); rig.root = root;           // position + facing (yaw)
    var lean = new T.Group(); root.add(lean); rig.lean = lean;   // tilt into the flight
    var bob = new T.Group(); lean.add(bob); rig.bob = bob;
    bob.position.y = -1.6;

    // Body (sweater) and collar
    var body = mesh(new T.SphereGeometry(0.85, 28, 20), WHITE, 0.035); body.scale.set(1, 1.08, 0.8); body.position.y = 1.25; bob.add(body);
    var collar = mesh(new T.TorusGeometry(0.36, 0.075, 10, 28), YEL); collar.rotation.x = Math.PI / 2; collar.position.y = 2.0; bob.add(collar);
    // Bee on the sweater
    var emblem = new T.Group(); emblem.position.set(0, 1.22, 0.68); bob.add(emblem);
    var eb = mesh(new T.SphereGeometry(0.2, 16, 12), YEL); eb.scale.set(1.1, 0.7, 0.4); emblem.add(eb);
    [-0.06, 0.06].forEach(function (x) { var s = mesh(new T.BoxGeometry(0.045, 0.27, 0.14), DARK); s.position.x = x; emblem.add(s); });
    var eh = mesh(new T.SphereGeometry(0.09, 12, 10), DARK); eh.position.set(0.27, 0, 0); emblem.add(eh);
    var ewm = new T.MeshBasicMaterial({ color: 0xdcebf5 });
    [-0.06, 0.06].forEach(function (x) { var w = new T.Mesh(new T.CircleGeometry(0.09, 12), ewm); w.scale.set(0.7, 1.3, 1); w.position.set(x, 0.17, 0.05); emblem.add(w); });

    // Neck and head
    var neck = mesh(new T.CylinderGeometry(0.2, 0.22, 0.3, 14), SKIN); neck.position.y = 2.05; bob.add(neck);
    var head = new T.Group(); head.position.y = 2.95; bob.add(head); rig.head = head;
    head.add(mesh(new T.SphereGeometry(1, 32, 24), SKIN, 0.03));
    // Face (after the original drawing and I Am Grand): big round eyes with whites and sparkles, rosy cheeks, ears, small nose
    var eyes = new T.Group(); head.add(eyes); rig.eyes = eyes;
    var WHITE_B = new T.MeshBasicMaterial({ color: 0xffffff }), IRIS = toon(0x241510);
    [-1, 1].forEach(function (s) {
      var sc = mesh(new T.SphereGeometry(0.21, 20, 16), WHITE_B); sc.scale.set(1, 1.18, 0.42); sc.position.set(s * 0.36, -0.08, 0.88); eyes.add(sc);
      var ir = mesh(new T.SphereGeometry(0.165, 20, 16), IRIS); ir.scale.set(1, 1.15, 0.42); ir.position.set(s * 0.36, -0.1, 0.935); eyes.add(ir);
      var h1 = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), WHITE_B); h1.scale.z = 0.4; h1.position.set(s * 0.36 + 0.06, -0.01, 0.995); eyes.add(h1);
      var h2 = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), WHITE_B); h2.scale.z = 0.4; h2.position.set(s * 0.36 - 0.06, -0.17, 0.99); eyes.add(h2);
      var ch = new T.Mesh(new T.SphereGeometry(0.17, 14, 10), new T.MeshBasicMaterial({ color: 0xf08f78, transparent: true, opacity: 0.5 }));
      ch.scale.set(1, 0.62, 0.3); ch.position.set(s * 0.6, -0.38, 0.78); head.add(ch);
      var ear = mesh(new T.SphereGeometry(0.2, 14, 12), SKIN, 0.06); ear.scale.set(0.55, 0.85, 0.5); ear.position.set(s * 0.98, -0.12, 0.05); head.add(ear);
    });
    var smile = mesh(new T.TorusGeometry(0.15, 0.032, 8, 20, Math.PI), toon(0x8a3b2e)); smile.rotation.z = Math.PI; smile.position.set(0, -0.46, 0.9); head.add(smile); rig.smile = smile;
    var mouth = mesh(new T.SphereGeometry(0.14, 16, 12), toon(0x5a1f18)); mouth.scale.set(1, 0.05, 0.4); mouth.position.set(0, -0.54, 0.86); head.add(mouth); rig.mouth = mouth;
    var nose = mesh(new T.SphereGeometry(0.055, 10, 8), toon(0xd0956c)); nose.scale.set(1.2, 0.9, 1); nose.position.set(0, -0.28, 0.985); head.add(nose);
    // Curly hair: little balls over the top and back, framing the face
    var hair = new T.Group(); head.add(hair);
    var N = 110;
    for (var i = 0; i < N; i++) {
      var yy = 1 - (i / (N - 1)) * 1.45, rr = Math.sqrt(Math.max(0, 1 - yy * yy)), th = i * 2.399963;
      var d = new T.Vector3(Math.cos(th) * rr, yy, Math.sin(th) * rr);
      if (d.y < -0.42) continue;
      if (d.z > 0.2 && d.y < 0.6 && Math.abs(d.x) < 0.9) continue;   // keep the face clear
      var c = mesh(new T.SphereGeometry(0.27 + ((i * 37) % 10) / 70, 10, 8), HAIR);
      c.position.copy(d.multiplyScalar(0.98)); hair.add(c);
    }
    // forehead curls and ringlets at the temples
    [[-0.42, 0.62, 0.72, 0.13], [-0.14, 0.7, 0.72, 0.14], [0.16, 0.68, 0.73, 0.13], [0.44, 0.6, 0.72, 0.12], [0.02, 0.5, 0.86, 0.11],
     [-0.9, 0.22, 0.42, 0.13], [0.9, 0.22, 0.42, 0.13], [-0.94, -0.12, 0.3, 0.12], [0.94, -0.12, 0.3, 0.12], [-0.86, -0.42, 0.18, 0.11], [0.86, -0.42, 0.18, 0.11]].forEach(function (p) {
      var c = mesh(new T.TorusGeometry(p[3], 0.055, 8, 18, Math.PI * 1.7), HAIR); c.position.set(p[0], p[1], p[2]); c.rotation.set(0.3, p[0] * 0.9, p[0] * 2); hair.add(c);
    });
    // Antennae
    [-1, 1].forEach(function (s) {
      var curve = new T.QuadraticBezierCurve3(new T.Vector3(s * 0.3, 0.85, 0), new T.Vector3(s * 0.4, 1.55, 0.05), new T.Vector3(s * 0.9, 1.95, 0.15));
      var a = new T.Group(); head.add(a); rig['ant' + s] = a;
      a.add(mesh(new T.TubeGeometry(curve, 16, 0.045, 6, false), DARK));
      var ball = mesh(new T.SphereGeometry(0.15, 14, 12), YEL, 0.12); ball.position.set(s * 0.9, 1.95, 0.15); a.add(ball);
    });

    // Arms: shoulder → elbow → hand
    [-1, 1].forEach(function (s) {
      var sh = new T.Group(); sh.position.set(s * 0.78, 1.62, 0); bob.add(sh);
      var up = mesh(new T.CylinderGeometry(0.17, 0.16, 0.56, 12), WHITE, 0.05); up.position.y = -0.28; sh.add(up);
      var el = new T.Group(); el.position.y = -0.55; sh.add(el);
      var fo = mesh(new T.CylinderGeometry(0.16, 0.15, 0.46, 12), WHITE, 0.05); fo.position.y = -0.23; el.add(fo);
      var cuff = mesh(new T.TorusGeometry(0.15, 0.055, 8, 16), YEL); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.46; el.add(cuff);
      var hand = mesh(new T.SphereGeometry(0.17, 14, 12), SKIN, 0.05); hand.position.y = -0.6; el.add(hand);
      rig['sh' + s] = sh; rig['el' + s] = el;
    });
    // Legs: hip → knee → shoe (striped tights)
    [-1, 1].forEach(function (s) {
      var hip = new T.Group(); hip.position.set(s * 0.3, 0.5, 0); bob.add(hip);
      var th = mesh(new T.CylinderGeometry(0.2, 0.18, 0.52, 14), STRIPE, 0.05); th.position.y = -0.26; hip.add(th);
      var kn = new T.Group(); kn.position.y = -0.5; hip.add(kn);
      var sn = mesh(new T.CylinderGeometry(0.18, 0.17, 0.48, 14), STRIPE, 0.05); sn.position.y = -0.24; kn.add(sn);
      var shoe = mesh(new T.SphereGeometry(0.22, 14, 12), WHITE, 0.06); shoe.scale.set(1.15, 0.7, 1.6); shoe.position.set(0, -0.55, 0.1); kn.add(shoe);
      rig['hip' + s] = hip; rig['kn' + s] = kn;
    });

    // Wings: two pairs on the back, see-through, with a soft blur copy so they read as buzzing
    var wingMat = new T.MeshBasicMaterial({ color: 0xdcebf5, transparent: true, opacity: 0.78, side: T.DoubleSide, depthWrite: false });
    var blurMat = new T.MeshBasicMaterial({ color: 0xdcebf5, transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false });
    var edgeMat = new T.LineBasicMaterial({ color: 0x7fb3d5 });
    function wingShape(rx, ry, cx, cy, rot) {
      var sh = new T.Shape(); sh.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, rot); return new T.ShapeGeometry(sh, 32);
    }
    var back = new T.Group(); back.position.set(0, 1.75, -0.5); bob.add(back);
    rig.wings = [];
    [-1, 1].forEach(function (s) {
      var pivot = new T.Group(); pivot.position.x = s * 0.12; back.add(pivot);
      var g1 = wingShape(1.15, 0.62, s * 1.05, 0.35, s * 0.45), g2 = wingShape(0.75, 0.42, s * 0.8, -0.45, -s * 0.35);
      [g1, g2].forEach(function (g) {
        var w = new T.Mesh(g, wingMat); pivot.add(w);
        w.add(new T.LineSegments(new T.EdgesGeometry(g), edgeMat));
      });
      var ghost = new T.Group(); back.add(ghost); ghost.position.x = s * 0.12;
      [g1, g2].forEach(function (g) { ghost.add(new T.Mesh(g, blurMat)); });
      rig.wings.push({ s: s, pivot: pivot, ghost: ghost });
    });
    root.scale.setScalar(SCALE);
    return rig;
  }

  function Asal3D(canvas) {
    this.canvas = canvas;
    var r = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.setClearColor(0x000000, 0);
    this.renderer = r;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(FOV, 16 / 9, 1, 200);
    this.camera.position.set(0, 0, DIST);
    this.scene.add(new T.HemisphereLight(0xffffff, 0xcfe3b8, 0.55));
    var sun = new T.DirectionalLight(0xfff6e6, 0.6); sun.position.set(4, 6, 10); this.scene.add(sun);
    this.rig = buildAsal(); this.scene.add(this.rig.root);
    this.pos = new T.Vector3(); this.from = new T.Vector3(); this.to = new T.Vector3();
    this.yaw = 0; this.yawTo = 0; this.leanAmt = 0; this.mode = 'idle'; this.t0 = 0; this.dur = 1;
    this.flyAmt = 0; this.talking = false; this.talkLevel = 0; this.analyser = null; this.mood = 'idle';
    this.blinkAt = 2; this.waveUntil = 0; this.dirSign = 1;
    this.clock = new T.Clock();
    var self = this;
    (function loop() { self.raf = requestAnimationFrame(loop); self.frame(); })();
  }
  Asal3D.prototype.resize = function (w, h) { this.renderer.setSize(w, h, false); };
  Asal3D.prototype.moveTo = function (sx, sy, quick) {
    var to = stageToWorld(sx, sy);
    if (quick) { this.pos.copy(to); this.to.copy(to); this.mode = 'idle'; this.yawTo = 0; return; }
    var d = to.clone().sub(this.pos);
    if (d.length() < 0.25) return;
    this.from.copy(this.pos); this.to.copy(to);
    this.dur = clamp(d.length() / 12, 0.75, 2.0);
    var side = Math.abs(d.x) > Math.abs(d.y) * 0.5;
    this.dirSign = d.x < 0 ? -1 : 1;
    this.yawTo = side ? this.dirSign * 1.45 : this.dirSign * 0.45;   // turn the whole body toward the way he flies
    this.climb = clamp(d.y / Math.max(1, d.length()), -1, 1);
    this.mode = 'turn'; this.t0 = this.clock.elapsedTime;
  };
  Asal3D.prototype.talk = function (audio) {
    this.talking = !!audio;
    if (!audio) return;
    try {
      var c = window.__nxWorldCtx; if (!c || c.state !== 'running') { this.analyser = null; return; }   // never route sound into a paused audio context
      var src = c.createMediaElementSource(audio), an = c.createAnalyser();
      an.fftSize = 256; src.connect(an); an.connect(c.destination);
      this.analyser = an; this.abuf = new Uint8Array(an.frequencyBinCount);
    } catch (e) { this.analyser = null; }
  };
  Asal3D.prototype.setMood = function (m) { this.mood = m || 'idle'; };
  Asal3D.prototype.wave = function () { this.waveUntil = this.clock.elapsedTime + 1.6; };
  Asal3D.prototype.frame = function () {
    if (!document.body.contains(this.canvas)) return;
    var dt = Math.min(0.05, this.clock.getDelta()), t = this.clock.elapsedTime, R = this.rig;
    // Movement: turn → fly → arrive (turn back to us, settle, wave)
    if (this.mode === 'turn' && t - this.t0 > 0.28) { this.mode = 'fly'; this.t0 = t; }
    if (this.mode === 'fly') {
      var k = clamp((t - this.t0) / this.dur, 0, 1), e = ease(k);
      this.pos.lerpVectors(this.from, this.to, e);
      this.pos.y += Math.sin(k * Math.PI) * 0.9;           // a gentle arc
      if (k >= 1) { this.mode = 'arrive'; this.t0 = t; this.yawTo = 0; this.wave(); }
    }
    if (this.mode === 'arrive' && t - this.t0 > 0.9) this.mode = 'idle';
    var flying = this.mode === 'fly' || this.mode === 'turn';
    this.flyAmt = lerp(this.flyAmt, flying ? 1 : 0, Math.min(1, dt * 6));
    this.yaw = angleLerp(this.yaw, this.yawTo, Math.min(1, dt * (this.mode === 'arrive' ? 5 : 9)));
    var sleepy = this.mood === 'sleepy';

    R.root.position.copy(this.pos);
    R.root.rotation.y = this.yaw;
    var fwd = this.flyAmt * (Math.abs(this.yawTo) > 1 ? 0.5 : 0.18);
    R.lean.rotation.x = lerp(R.lean.rotation.x, fwd, Math.min(1, dt * 6));
    R.lean.rotation.z = lerp(R.lean.rotation.z, this.flyAmt * -this.dirSign * 0.08, Math.min(1, dt * 6));
    // Hover bob, with a little landing bounce
    var settle = this.mode === 'arrive' ? Math.sin((t - this.t0) / 0.9 * Math.PI * 2) * 0.18 * (1 - (t - this.t0) / 0.9) : 0;
    R.bob.position.y = -1.6 + (flying ? Math.sin(t * 10) * 0.07 : Math.sin(t * 2.3) * (sleepy ? 0.05 : 0.14)) - settle;

    // Legs: dangle and kick gently while hovering; knees tuck back in flight
    [-1, 1].forEach(function (s, i) {
      var sway = Math.sin(t * 2.3 + i * Math.PI) * 0.12;
      R['hip' + s].rotation.x = lerp(-0.12 + sway, 0.55, this.flyAmt);
      R['kn' + s].rotation.x = lerp(0.45 - sway * 1.2, 1.25 + (i ? 0.15 : 0), this.flyAmt);
      R['hip' + s].rotation.z = s * 0.04;
    }, this);
    // Arms: relaxed sway, swept back in flight, waving when he arrives, little gestures when talking
    var waving = t < this.waveUntil;
    [-1, 1].forEach(function (s) {
      var sh = R['sh' + s], el = R['el' + s];
      var rx = lerp(Math.sin(t * 2.3 + s) * 0.08, 0.75, this.flyAmt), rz = s * lerp(0.3, 0.22, this.flyAmt), ex = lerp(-0.25, -0.1, this.flyAmt), ez = 0;
      if (this.talking && !flying && s === -1) { rx = -0.5 + Math.sin(t * 3.1) * 0.15; ex = -0.9 + Math.sin(t * 4.3) * 0.2; }
      if (waving && s === 1 && !flying) { rz = 2.55; rx = -0.1; ez = Math.sin(t * 14) * 0.45; ex = 0; }
      sh.rotation.x = lerp(sh.rotation.x, rx, Math.min(1, dt * 10)); sh.rotation.z = lerp(sh.rotation.z, rz, Math.min(1, dt * 10));
      el.rotation.x = lerp(el.rotation.x, ex, Math.min(1, dt * 10)); el.rotation.z = lerp(el.rotation.z, ez, Math.min(1, dt * 14));
    }, this);
    // Head: looks toward us even while the body is turned; nods while talking; droops when sleepy
    R.head.rotation.y = -this.yaw * 0.45;
    R.head.rotation.x = (this.talking ? Math.sin(t * 5.2) * 0.06 : 0) + (sleepy ? 0.25 : 0) - this.flyAmt * 0.25;
    R.head.rotation.z = Math.sin(t * 1.3) * 0.05;
    R.ant1.rotation.z = Math.sin(t * 3 + 1) * 0.08 + (flying ? -0.15 : 0); R['ant-1'].rotation.z = Math.sin(t * 3) * 0.08 + (flying ? 0.15 : 0);
    // Blink (eyes half shut when sleepy)
    if (t > this.blinkAt) this.blinkAt = t + 2.5 + Math.random() * 3;
    var b = this.blinkAt - t; R.eyes.scale.y = sleepy ? 0.25 : (b < 0.12 ? 0.1 : 1);
    // Mouth: open and close with his voice
    var lvl = 0;
    if (this.talking) {
      if (this.analyser) { this.analyser.getByteFrequencyData(this.abuf); var sum = 0; for (var j = 2; j < 40; j++) sum += this.abuf[j]; lvl = clamp(sum / (38 * 150), 0, 1); }
      else lvl = 0.35 + 0.35 * Math.sin(t * 17) * Math.sin(t * 5.3);
    }
    this.talkLevel = lerp(this.talkLevel, lvl, Math.min(1, dt * 18));
    R.mouth.scale.y = 0.05 + this.talkLevel * 0.75; R.smile.visible = this.talkLevel < 0.12;
    // Wings: always buzzing, even faster in flight (blur copy shows the motion)
    var f = sleepy ? 3 : (flying ? 26 : 19), ph = t * f * Math.PI * 2;
    R.wings.forEach(function (w) {
      w.pivot.rotation.y = w.s * (0.35 + 0.55 * Math.sin(ph));
      w.pivot.rotation.z = w.s * 0.12 * Math.cos(ph);
      w.ghost.rotation.y = w.s * (0.35 + 0.55 * Math.sin(ph + 1.6));
      w.ghost.visible = !sleepy;
    });
    this.renderer.render(this.scene, this.camera);
  };
  Asal3D.supported = function () {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  };
  window.Asal3D = Asal3D;
})();
