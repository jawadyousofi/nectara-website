/* Nectara children in 3D: the same toon style as Asal (app/asal3d.js).
   window.NectaraKid.render(traits, { inside: bool }) -> { png: dataURL, anchors: {name: [x, y]} }
   Used by the character builder (app/me.js), by Asal's World, and by tools/kids.html (the cast renders).
   Needs window.THREE (assets/three.min.js). ES5 only: it must run on TV browsers.
   Traits are choices, never photos: skin, hair, hairColor, eyes, shirt, bottom, bead, freckles, lashes, glasses, longSleeves, pants. */
(function () {
  var OPTIONS = {
    skin: [0xfbe0c8, 0xf6d2b8, 0xf2c9a8, 0xf0cfae, 0xd9a77e, 0xc48a62, 0xa9714c, 0x8a5a3c, 0x7a4a30, 0x5a3622],
    hair: ['curls', 'tightcurls', 'straight', 'wavy', 'bob', 'ponytail', 'braids', 'buns', 'short', 'scarf'],
    hairColor: [0x15110f, 0x2a1d14, 0x5a3a24, 0x8a5a34, 0xc4512a, 0xe8c66a, 0xf3dfa0, 0x2f8f8a, 0xc96a8a, 0x6a5aa8],
    eyes: [0x2a1a12, 0x5a3a20, 0x3f6e3a, 0x2e5f8a],
    shirt: [0x6db25a, 0x7fb3d5, 0xee8a6e, 0xf2c14e, 0xb9a3dc, 0xf3ead6, 0xf28c28, 0xfffdf5, 0xe46f8f, 0x3e7ca8],
    bottom: [0x3e7ca8, 0xc9a86a, 0x5b7fb8, 0x4f8f45, 0x2f3e66, 0x5b8def, 0x8a5a3c, 0x6a5aa8]
  };
  var CAST = {
    amara:   { skin: 0x7a4a30, hair: 'braids', hairColor: 0x1e1410, bead: 0xf2c14e, shirt: 0x6db25a, bottom: 0x3e7ca8, lashes: true },
    liam:    { skin: 0xf2c9a8, hair: 'straight', hairColor: 0xe8c66a, shirt: 0x7fb3d5, bottom: 0xc9a86a, freckles: true },
    saoirse: { skin: 0xf6d2b8, hair: 'ponytail', hairColor: 0xc4512a, shirt: 0xee8a6e, bottom: 0x5b7fb8, freckles: true, lashes: true },
    keon:    { skin: 0x8a5a3c, hair: 'tightcurls', hairColor: 0x1a120e, shirt: 0xf2c14e, bottom: 0x4f8f45 },
    mei:     { skin: 0xf0cfae, hair: 'bob', hairColor: 0x15110f, shirt: 0xb9a3dc, bottom: 0x3e7ca8, lashes: true },
    noor:    { skin: 0xd9a77e, hair: 'scarf', hairColor: 0x2f8f8a, shirt: 0xf3ead6, bottom: 0x4f8f45, lashes: true, longSleeves: true, pants: true },
    ravi:    { skin: 0xa9714c, hair: 'wavy', hairColor: 0x221812, shirt: 0xf28c28, bottom: 0x2f3e66 },
    eli:     { skin: 0xc48a62, hair: 'curls', hairColor: 0x5a3a24, shirt: 0xfffdf5, bottom: 0x5b8def }
  };
  var DEFAULT = { skin: 0xc48a62, hair: 'curls', hairColor: 0x2a1d14, eyes: 0x2a1a12, shirt: 0x6db25a, bottom: 0x3e7ca8 };

  // Keep only known choices (anything else falls back to the default look).
  function clean(t) {
    t = t || {}; var k = {};
    function pick(name) { var v = t[name]; return OPTIONS[name].indexOf(v) >= 0 ? v : DEFAULT[name]; }
    k.skin = pick('skin'); k.hair = pick('hair'); k.hairColor = pick('hairColor'); k.eyes = pick('eyes'); k.shirt = pick('shirt'); k.bottom = pick('bottom');
    k.bead = OPTIONS.shirt.indexOf(t.bead) >= 0 ? t.bead : 0xf2c14e;
    ['freckles', 'lashes', 'glasses', 'longSleeves', 'pants'].forEach(function (f) { k[f] = !!t[f]; });
    return k;
  }

  function build(K, INSIDE) {
    var T = THREE;
    var grad = new Uint8Array([90, 90, 90, 175, 175, 175, 255, 255, 255]);
    var gradMap = new T.DataTexture(grad, 3, 1, T.RGBFormat); gradMap.minFilter = gradMap.magFilter = T.NearestFilter; gradMap.needsUpdate = true;
    function toon(color, extra) { var o = { color: color, gradientMap: gradMap }; for (var k in extra || {}) o[k] = extra[k]; return new T.MeshToonMaterial(o); }
    var INK = new T.MeshBasicMaterial({ color: 0x2a2118, side: T.BackSide });
    function mesh(geo, mat, outline) { var m = new T.Mesh(geo, mat); if (outline) { var o = new T.Mesh(geo, INK); o.scale.setScalar(1 + outline); m.add(o); } return m; }
    function tube(pts, r, mat, seg) { return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(function (p) { return new T.Vector3(p[0], p[1], p[2]); })), seg || 80, r, 12, false), mat); }
    function lathe(profile, segs) { return new T.LatheGeometry(profile.map(function (p) { return new T.Vector2(p[0], p[1]); }), segs || 48); }
    function shade(hex, k) { var c = new T.Color(hex); c.multiplyScalar(k); return c.getHex(); }

    var SKIN = toon(K.skin), SKINDK = toon(shade(K.skin, 0.8)), HAIR = toon(K.hairColor), SHIRT = toon(K.shirt), BOTTOM = toon(K.bottom), SHOE = toon(0xe2725b), SOLE = toon(0xfffdf5), WHITE = toon(0xfffdf5);
    var root = new T.Group(), anchors = {};
    function anchor(name, x, y, z) { anchors[name] = new T.Vector3(x, y, z); }

    var TORSO = [[0.001, 0.2], [0.5, 0.22], [0.6, 0.36], [0.64, 0.62], [0.65, 0.95], [0.63, 1.28], [0.62, 1.55], [0.6, 1.76], [0.5, 1.92], [0.3, 2.02], [0.16, 2.06], [0.001, 2.07]];
    function torsoGeo(grow) { return lathe(TORSO.map(function (p) { return [p[0] * grow, p[1]]; }), 56); }
    var ZS = 0.72, i, k;
    if (INSIDE) {
      var organs = new T.Group(); root.add(organs);
      var PINK = toon(0xf2a7b4), LUNG = toon(0xf6c3cc), RED = toon(0xd9473a), LIVER = toon(0xb85c4c), STOM = toon(0xee9a9a), COLON = toon(0xd29a66), SMALL = toon(0xf4b9a2), VESSEL = toon(0xd9473a);
      [-1, 1].forEach(function (s) { var l = mesh(new T.SphereGeometry(0.3, 24, 18), LUNG, 0.02); l.scale.set(0.95, 1.45, 0.7); l.position.set(s * 0.32, 1.66, -0.05); organs.add(l); });
      organs.add(tube([[0, 2.4, 0.02], [0, 2.12, 0.02], [0, 1.85, 0.0], [0.02, 1.55, 0.02], [0.08, 1.36, 0.08], [0.2, 1.3, 0.14]], 0.055, PINK));
      anchor('tube', 0, 1.8, 0.1);
      var heart = new T.Group(); heart.position.set(0.12, 1.55, 0.3); organs.add(heart);
      [-1, 1].forEach(function (s) { var h = mesh(new T.SphereGeometry(0.105, 18, 14), RED, 0.04); h.position.set(s * 0.075, 0.04, 0); heart.add(h); });
      var tip = mesh(new T.ConeGeometry(0.15, 0.2, 18), RED, 0.04); tip.rotation.z = Math.PI; tip.position.y = -0.1; heart.add(tip);
      heart.rotation.z = -0.25; anchor('blood', 0.12, 1.55, 0.35);
      [[[0.12, 1.55, 0.25], [-0.3, 1.8, 0.2], [-0.62, 1.66, 0.1]], [[0.12, 1.55, 0.25], [0.45, 1.8, 0.2], [0.62, 1.66, 0.1]],
       [[0.12, 1.5, 0.25], [-0.1, 1.0, 0.3], [-0.28, 0.4, 0.1]], [[0.12, 1.5, 0.25], [0.3, 1.0, 0.3], [0.28, 0.4, 0.1]]].forEach(function (p) { organs.add(tube(p, 0.018, VESSEL, 30)); });
      var liver = mesh(new T.SphereGeometry(0.3, 24, 16), LIVER, 0.02); liver.scale.set(1.35, 0.6, 0.7); liver.position.set(-0.2, 1.28, 0.12); organs.add(liver);
      var st = new T.Group(); st.position.set(0.3, 1.2, 0.2); organs.add(st);
      var sb = mesh(new T.SphereGeometry(0.22, 24, 18), STOM, 0.03); sb.scale.set(1.0, 1.25, 0.75); sb.position.set(0.04, 0.03, 0); st.add(sb);
      st.add(tube([[0.02, -0.18, 0], [-0.08, -0.26, 0.02], [-0.22, -0.22, 0.04], [-0.3, -0.12, 0.04]], 0.075, STOM, 30));
      anchor('tummy', 0.32, 1.2, 0.35);
      var colonPts = [[-0.36, 0.6, 0.18], [-0.42, 0.78, 0.2], [-0.4, 0.98, 0.22], [-0.2, 1.04, 0.26], [0.05, 1.02, 0.28], [0.3, 1.0, 0.26], [0.42, 0.9, 0.22], [0.42, 0.7, 0.2], [0.3, 0.55, 0.22], [0.1, 0.5, 0.22], [0.02, 0.38, 0.18]];
      var cc = new T.CatmullRomCurve3(colonPts.map(function (p) { return new T.Vector3(p[0], p[1], p[2]); }));
      organs.add(mesh(new T.TubeGeometry(cc, 120, 0.085, 14, false), COLON, 0.03));
      var BAND = toon(0xb98552);
      for (i = 1; i < 26; i++) { var u = i / 26, pt = cc.getPointAt(u), tg = cc.getTangentAt(u); var ring = new T.Mesh(new T.TorusGeometry(0.086, 0.012, 6, 18), BAND); ring.position.copy(pt); ring.lookAt(pt.clone().add(tg)); organs.add(ring); }
      anchor('poop', 0.03, 0.42, 0.25);
      var coil = [], rows = 5;
      for (k = 0; k <= 400; k++) {
        var t = k / 400 * rows, row = Math.floor(Math.min(t, rows - 0.0001)), f = t - row, dir = row % 2 ? -1 : 1;
        var x = dir * (-0.25 + 0.5 * f) + Math.sin(f * Math.PI * 4 + row) * 0.03;
        var y = 0.92 - row * 0.07 - Math.sin(f * Math.PI) * 0.02 + Math.sin(f * Math.PI * 6 + row * 2) * 0.012;
        var edge = Math.pow(Math.abs(f - 0.5) * 2, 6); x = x * (1 - edge * 0.1);
        coil.push([x, y, 0.27 + Math.sin(f * Math.PI * 3 + row) * 0.03]);
      }
      organs.add(tube(coil, 0.036, SMALL, 600));
      anchor('twisty', 0, 0.78, 0.3);
      var cavity = new T.Mesh(torsoGeo(0.97), new T.MeshBasicMaterial({ color: 0xfff1e4, side: T.BackSide })); cavity.scale.z = ZS; root.add(cavity);
      var skinShell = new T.Mesh(torsoGeo(1.0), toon(K.skin, { transparent: true, opacity: 0.3, depthWrite: false })); skinShell.scale.z = ZS; skinShell.renderOrder = 5; root.add(skinShell);
      var rim = new T.Mesh(torsoGeo(1.04), INK); rim.scale.set(1, 1.004, ZS * 1.04); rim.position.y = -0.004; root.add(rim);
    } else {
      var shirt = mesh(torsoGeo(1.0), SHIRT); shirt.scale.z = ZS; root.add(shirt);
      var shirtInk = new T.Mesh(torsoGeo(1.035), INK); shirtInk.scale.z = ZS * 1.035; root.add(shirtInk);
      var leaf = mesh(new T.SphereGeometry(0.11, 16, 12), toon(K.shirt === 0x6db25a ? 0xfffdf5 : 0x5fa36a)); leaf.scale.set(0.6, 1, 0.3); leaf.rotation.z = -0.6; leaf.position.set(0.25, 1.62, 0.62 * ZS + 0.02); root.add(leaf);
    }
    var collar = mesh(new T.TorusGeometry(0.22, 0.04, 8, 28), INSIDE ? SKINDK : toon(shade(K.shirt, 0.85))); collar.rotation.x = Math.PI / 2; collar.scale.y = ZS; collar.position.y = 2.04; root.add(collar);
    var hips = mesh(lathe([[0.001, 0.0], [0.6, 0.02], [0.66, 0.2], [0.66, 0.42], [0.001, 0.44]], 48), BOTTOM, 0.03); hips.scale.z = ZS * 1.02; hips.position.y = 0.02; root.add(hips);
    var neck = mesh(new T.CylinderGeometry(0.19, 0.21, 0.32, 18), SKIN, 0.03); neck.position.y = 2.18; root.add(neck);
    var HS = INSIDE ? 0.84 : 0.9;
    var head = new T.Group(); head.position.y = 2.32 + HS * 0.94; head.scale.setScalar(HS); root.add(head);
    head.add(mesh(new T.SphereGeometry(1, 48, 36), SKIN, 0.03));
    function onHead(x, y, lift) { var d = 1 + (lift || 0); return Math.sqrt(Math.max(0.0001, d * d - x * x - y * y)); }
    var EYE = toon(K.eyes || 0x2a1a12), LASH = toon(0x2a1a12), SPARK = new T.MeshBasicMaterial({ color: 0xffffff });
    [-1, 1].forEach(function (s) {
      var x = s * 0.36, y = -0.14;
      var e = mesh(new T.SphereGeometry(0.2, 24, 18), EYE); e.scale.set(0.88, 1.1, 0.42); e.position.set(x, y, onHead(x, y) - 0.03); head.add(e);
      var h = new T.Mesh(new T.SphereGeometry(0.066, 12, 10), SPARK); h.scale.z = 0.4; h.position.set(x + 0.06, y + 0.08, onHead(x, y) + 0.04); head.add(h);
      var brow = mesh(new T.TorusGeometry(0.13, 0.026, 6, 16, Math.PI * 0.8), K.hair === 'scarf' ? LASH : HAIR); brow.rotation.z = Math.PI * 0.1; brow.position.set(x - 0.02, y + 0.34, onHead(x, y + 0.3) - 0.02); brow.rotation.x = -0.3; head.add(brow);
      if (K.lashes) [0.5, 0.8, 1.1].forEach(function (a, i) { var l = mesh(new T.CylinderGeometry(0.012, 0.012, 0.08, 6), LASH); var ax = x + s * Math.cos(a) * 0.18, ay = y + Math.sin(a) * 0.2; l.position.set(ax, ay + 0.02, onHead(ax, ay) - 0.01); l.rotation.z = -s * (0.6 - i * 0.25); head.add(l); });
      if (K.glasses) { var lens = mesh(new T.TorusGeometry(0.25, 0.03, 8, 28), toon(0x3a2a20)); lens.position.set(x, y, onHead(x, y, 0.12)); lens.rotation.y = s * 0.3; head.add(lens); }
    });
    if (K.glasses) {
      var bridge = mesh(new T.CylinderGeometry(0.02, 0.02, 0.24, 8), toon(0x3a2a20)); bridge.rotation.z = Math.PI / 2; bridge.position.set(0, -0.08, onHead(0, -0.08, 0.14)); head.add(bridge);
      [-1, 1].forEach(function (s) { var arm = mesh(new T.CylinderGeometry(0.018, 0.018, 0.75, 8), toon(0x3a2a20)); arm.rotation.x = Math.PI / 2; arm.position.set(s * 0.62, -0.1, 0.4); head.add(arm); });
    }
    [-0.6, 0.6].forEach(function (x) { var y = -0.48; var ch = new T.Mesh(new T.SphereGeometry(0.15, 16, 12), new T.MeshBasicMaterial({ color: 0xf0a08a, transparent: true, opacity: 0.55 })); ch.scale.set(1, 0.85, 0.25); ch.position.set(x, y, onHead(x, y) - 0.01); head.add(ch); });
    if (K.freckles) [[-0.55, -0.36], [-0.48, -0.42], [-0.62, -0.44], [0.55, -0.36], [0.48, -0.42], [0.62, -0.44]].forEach(function (p) { var f = new T.Mesh(new T.SphereGeometry(0.018, 6, 6), toon(0xb8743f)); f.position.set(p[0], p[1], onHead(p[0], p[1]) + 0.005); head.add(f); });
    var nose = mesh(new T.SphereGeometry(0.055, 12, 10), toon(shade(K.skin, 0.78))); nose.scale.set(1.1, 0.9, 1); nose.position.set(0, -0.36, onHead(0, -0.36) + 0.01); head.add(nose);
    if (INSIDE) {
      var mouth = mesh(new T.SphereGeometry(0.2, 22, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0x7a2a2a)); mouth.scale.set(1, 0.9, 0.35); mouth.rotation.x = -0.25; mouth.position.set(0, -0.56, onHead(0, -0.56) - 0.06); head.add(mouth);
      var tongue = mesh(new T.SphereGeometry(0.1, 14, 10), toon(0xf08a96)); tongue.scale.set(1.1, 0.5, 0.5); tongue.position.set(0, -0.68, onHead(0, -0.68) - 0.02); head.add(tongue);
      anchor('mouth', 0, head.position.y - 0.6 * HS, 0.85);
    } else {
      var smile = mesh(new T.TorusGeometry(0.2, 0.034, 8, 24, Math.PI), toon(0x8a3b2e)); smile.scale.y = 0.55; smile.rotation.z = Math.PI; smile.rotation.x = -0.35; smile.position.set(0, -0.52, onHead(0, -0.52) - 0.02); head.add(smile);
    }
    [-1, 1].forEach(function (s) { var ear = mesh(new T.SphereGeometry(0.17, 16, 12), SKIN, 0.05); ear.scale.set(0.55, 1, 0.65); ear.position.set(s * 0.98, -0.1, -0.02); head.add(ear); });

    // ---- hair styles ----
    var hair = new T.Group(); head.add(hair);
    var HAIRDS = toon(K.hairColor, { side: T.DoubleSide });
    function shell(r, gap, thetaLen, mat) { return mesh(new T.SphereGeometry(r, 56, 40, Math.PI / 2 + gap / 2, Math.PI * 2 - gap, 0, thetaLen), mat || HAIRDS); }
    function cap(r, thetaLen) { return mesh(new T.SphereGeometry(r, 56, 30, 0, Math.PI * 2, 0, thetaLen), HAIR, 0.02); }
    function curls(r, n, minY, faceKeep) {
      for (var i = 0; i < n; i++) {
        var y2 = 1 - (i + 0.5) / n * 2, r2 = Math.sqrt(1 - y2 * y2), th = i * 2.39996, px = Math.cos(th) * r2, pz = Math.sin(th) * r2;
        if (y2 < faceKeep && pz > -0.25) continue; if (y2 < minY) continue;
        var c = mesh(new T.SphereGeometry(r, 14, 12), HAIR); c.position.set(px * 1.03, y2 * 1.03, pz * 1.03); hair.add(c);
      }
    }
    var sty = K.hair;
    if (sty === 'curls') { curls(0.24, 120, -0.55, 0.22); [-0.6, -0.3, 0, 0.3, 0.6].forEach(function (x, i) { var y = 0.45 + (i % 2) * 0.07; var c = mesh(new T.SphereGeometry(0.2, 14, 12), HAIR); c.position.set(x, y, onHead(x, y, 0.06)); hair.add(c); }); }
    if (sty === 'tightcurls') { hair.add(cap(1.06, Math.PI * 0.4)); curls(0.13, 260, -0.3, 0.32); }
    if (sty === 'straight') {
      hair.add(cap(1.07, Math.PI * 0.42)); hair.add(shell(1.065, Math.PI * 0.55, Math.PI * 0.6));
      for (var f2 = 0; f2 < 7; f2++) { var fx = -0.6 + f2 * 0.2, fy = 0.42 - Math.abs(fx) * 0.15; var s1 = mesh(new T.SphereGeometry(0.16, 14, 10), HAIR); s1.scale.set(0.8, 1.6, 0.6); s1.position.set(fx, fy, onHead(fx, fy, 0.06)); s1.rotation.z = fx * 0.6; hair.add(s1); }
    }
    if (sty === 'bob') {
      hair.add(cap(1.08, Math.PI * 0.46)); hair.add(shell(1.09, Math.PI * 0.62, Math.PI * 0.74));
      var bangs = mesh(new T.CylinderGeometry(1.08, 1.08, 0.36, 48, 1, true, -Math.PI * 0.36, Math.PI * 0.72), HAIRDS); bangs.position.y = 0.36; hair.add(bangs);
    }
    if (sty === 'ponytail') {
      hair.add(cap(1.07, Math.PI * 0.44)); hair.add(shell(1.06, Math.PI * 0.62, Math.PI * 0.62));
      for (var w = 0; w < 5; w++) { var wx = -0.55 + w * 0.27; var wv = mesh(new T.SphereGeometry(0.2, 14, 10), HAIR); wv.scale.set(1, 0.7, 0.6); wv.position.set(wx, 0.5 - Math.abs(wx) * 0.12, onHead(wx, 0.5, 0.05)); hair.add(wv); }
      var tie = mesh(new T.TorusGeometry(0.16, 0.06, 8, 18), toon(0x6db25a)); tie.position.set(0, 0.55, -1.0); hair.add(tie);
      var pts = []; for (var p = 0; p <= 8; p++) { var uu = p / 8; pts.push([Math.sin(uu * 7) * 0.12, 0.5 - uu * 1.5, -1.05 - Math.sin(uu * 3.1) * 0.3]); }
      pts.forEach(function (q, i) { var b = mesh(new T.SphereGeometry(0.26 - i * 0.018, 16, 12), HAIR); b.position.set(q[0], q[1], q[2]); hair.add(b); });
    }
    if (sty === 'braids') {
      hair.add(cap(1.05, Math.PI * 0.46)); hair.add(shell(1.045, Math.PI * 0.6, Math.PI * 0.58));
      [-1, 1].forEach(function (s) { [0, 1].forEach(function (k2) {
        var bx = s * (0.78 + k2 * 0.18), bz = -0.2 - k2 * 0.35;
        for (var j = 0; j < 7; j++) { var bb = mesh(new T.SphereGeometry(0.1, 12, 10), HAIR); bb.scale.set(1, 1.2, 1); bb.position.set(bx + (j % 2 ? 0.03 : -0.03) * s, -0.2 - j * 0.16, bz); hair.add(bb); }
        var bead = mesh(new T.SphereGeometry(0.085, 12, 10), toon(K.bead), 0.06); bead.position.set(bx, -0.2 - 7 * 0.16, bz); hair.add(bead);
      }); });
    }
    if (sty === 'wavy') {
      hair.add(cap(1.07, Math.PI * 0.43)); hair.add(shell(1.06, Math.PI * 0.6, Math.PI * 0.56));
      for (var v = 0; v < 9; v++) { var vx = -0.8 + v * 0.2, vy = 0.62 - Math.abs(vx) * 0.25; var wv2 = mesh(new T.SphereGeometry(0.22, 14, 10), HAIR); wv2.scale.set(1, 0.75, 0.8); wv2.rotation.z = vx; wv2.position.set(vx, vy, onHead(vx, vy, 0.04) * 0.9); hair.add(wv2); }
    }
    if (sty === 'buns') {
      hair.add(cap(1.06, Math.PI * 0.45)); hair.add(shell(1.05, Math.PI * 0.62, Math.PI * 0.55));
      [-1, 1].forEach(function (s) { var bun = mesh(new T.SphereGeometry(0.36, 22, 16), HAIR, 0.03); bun.position.set(s * 0.62, 0.8, -0.1); hair.add(bun); });
    }
    if (sty === 'short') {
      hair.add(cap(1.04, Math.PI * 0.4));
      for (var sh2 = 0; sh2 < 6; sh2++) { var sx = -0.5 + sh2 * 0.2, sy = 0.56 - Math.abs(sx) * 0.1; var tuft = mesh(new T.SphereGeometry(0.13, 12, 10), HAIR); tuft.scale.set(1, 0.7, 0.6); tuft.position.set(sx, sy, onHead(sx, sy, 0.03)); hair.add(tuft); }
    }
    if (sty === 'scarf') {
      var SCARF = toon(K.hairColor, { side: T.DoubleSide });
      hair.add(mesh(new T.SphereGeometry(1.1, 56, 40, Math.PI / 2 + 0.55, Math.PI * 2 - 1.1, 0.02, Math.PI * 0.86), SCARF, 0.02));
      hair.add(mesh(new T.SphereGeometry(1.1, 56, 20, 0, Math.PI * 2, 0, Math.PI * 0.3), SCARF, 0.02));
      var rimF = mesh(new T.TorusGeometry(0.88, 0.07, 10, 40), toon(shade(K.hairColor, 0.85))); rimF.scale.set(0.82, 1.12, 1); rimF.position.set(0, -0.12, 0.52); hair.add(rimF);
      var drape = mesh(lathe([[0.001, 1.84], [0.72, 1.86], [0.6, 2.1], [0.42, 2.36], [0.001, 2.42]], 48), toon(K.hairColor), 0.03); drape.scale.z = ZS * 1.05; root.add(drape);
    }

    // ---- arms ----
    [-1, 1].forEach(function (s) {
      var sh = new T.Group(); sh.position.set(s * 0.66, 1.78, 0); sh.rotation.z = s * 0.3; root.add(sh);
      var SLEEVE = INSIDE ? SKIN : SHIRT, ARM = K.longSleeves && !INSIDE ? SHIRT : SKIN;
      sh.add(mesh(new T.SphereGeometry(0.2, 18, 14), SLEEVE));
      var up = mesh(new T.CylinderGeometry(0.17, 0.155, 0.6, 18), ARM, 0.03); up.position.y = -0.3; sh.add(up);
      if (!INSIDE && !K.longSleeves) { var sl = mesh(new T.CylinderGeometry(0.2, 0.19, 0.3, 18), SHIRT, 0.03); sl.position.y = -0.12; sh.add(sl); }
      var el = new T.Group(); el.position.y = -0.6; el.rotation.z = -s * 0.18; sh.add(el);
      el.add(mesh(new T.SphereGeometry(0.155, 16, 12), ARM));
      var fo = mesh(new T.CylinderGeometry(0.15, 0.135, 0.5, 18), ARM, 0.03); fo.position.y = -0.25; el.add(fo);
      var hand = mesh(new T.SphereGeometry(0.17, 16, 12), SKIN, 0.05); hand.scale.set(1, 1.15, 0.72); hand.position.y = -0.58; el.add(hand);
      var thumb = mesh(new T.SphereGeometry(0.065, 10, 8), SKIN, 0.06); thumb.position.set(-s * 0.13, -0.5, 0.06); el.add(thumb);
    });
    // ---- legs and shoes ----
    [-1, 1].forEach(function (s) {
      var hip = new T.Group(); hip.position.set(s * 0.3, 0.12, 0); root.add(hip);
      var LEG = K.pants ? BOTTOM : SKIN;
      var th = mesh(new T.CylinderGeometry(0.2, 0.18, 0.55, 18), LEG, 0.03); th.position.y = -0.27; hip.add(th);
      if (!K.pants) { var cuff = mesh(new T.CylinderGeometry(0.24, 0.23, 0.22, 18), BOTTOM, 0.03); cuff.position.y = -0.05; hip.add(cuff); }
      var kn = new T.Group(); kn.position.y = -0.55; hip.add(kn); kn.add(mesh(new T.SphereGeometry(0.18, 16, 12), LEG));
      var sn = mesh(new T.CylinderGeometry(0.18, 0.16, 0.5, 18), LEG, 0.03); sn.position.y = -0.25; kn.add(sn);
      var sock = mesh(new T.CylinderGeometry(0.165, 0.165, 0.1, 18), WHITE); sock.position.y = -0.47; kn.add(sock);
      var shoe = mesh(new T.SphereGeometry(0.22, 18, 14), SHOE, 0.06); shoe.scale.set(1.12, 0.66, 1.55); shoe.position.set(0, -0.57, 0.1); kn.add(shoe);
      var sole = mesh(new T.CylinderGeometry(0.24, 0.24, 0.05, 20), SOLE); sole.scale.set(1.05, 1, 1.45); sole.position.set(0, -0.68, 0.1); kn.add(sole);
    });
    return { root: root, anchors: anchors };
  }

  var R = null, CV = null;
  function supported() {
    if (!window.THREE || !window.WebGLRenderingContext) return false;
    try { var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
  }
  function dispose(obj) {
    obj.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { (o.material.length ? o.material : [o.material]).forEach(function (m) { if (m.gradientMap) m.gradientMap.dispose(); m.dispose(); }); } });
  }
  // traits -> picture. opts: { inside, width, height, format ('image/png' | 'image/webp'), canvas (render into this canvas instead) }
  function render(traits, opts) {
    opts = opts || {};
    var T = THREE, K = traits && traits.cast ? CAST[traits.cast] || DEFAULT : clean(traits);
    var INSIDE = !!opts.inside, W = opts.width || (INSIDE ? 1000 : 640), H = opts.height || (INSIDE ? 1500 : 960);
    var cv = opts.canvas || CV || (CV = document.createElement('canvas'));
    if (!opts.canvas && !R) R = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
    var r = opts.canvas ? new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true }) : R;
    cv.width = W; cv.height = H; r.setSize(W, H, false); r.setClearColor(0x000000, 0);
    var b = build(K, INSIDE), root = b.root;
    var scene = new T.Scene(); scene.add(root);
    scene.add(new T.HemisphereLight(0xffffff, 0xcfe3b8, 0.55));
    var sun = new T.DirectionalLight(0xfff6e6, 0.6); sun.position.set(4, 6, 10); scene.add(sun);
    var cam = new T.PerspectiveCamera(22, W / H, 1, 100); cam.position.set(0, 1.62, 15.4); cam.lookAt(0, 1.62, 0);
    root.rotation.y = opts.turn != null ? opts.turn : -0.12;
    r.render(scene, cam);
    root.updateMatrixWorld(true);
    var out = {};
    Object.keys(b.anchors).forEach(function (k) { var v = b.anchors[k].clone().applyMatrix4(root.matrixWorld).project(cam); out[k] = [Math.round((v.x + 1) / 2 * W), Math.round((1 - v.y) / 2 * H)]; });
    var png = opts.noImage ? null : cv.toDataURL(opts.format || 'image/png', 0.9);
    dispose(root);
    return { png: png, anchors: out };
  }

  window.NectaraKid = { OPTIONS: OPTIONS, CAST: CAST, DEFAULT: DEFAULT, clean: clean, render: render, supported: supported };
})();
