/* ============================================================================
   CLEVERMENT 3D LAYER  (cleverment-3d.js)
   ----------------------------------------------------------------------------
   ADDITIVE, NON-DESTRUCTIVE 3D ENHANCEMENT FOR CLEVERMENT
   - This file NEVER modifies, replaces or interferes with the existing
     CleverMent program (index.html / script.js / server.js).
   - Renders on its own fixed <canvas> BEHIND all content (z-index 0,
     pointer-events:none) — it can never block clicks, typing, proctoring,
     payments, or any feature.
   - If anything fails it fails silently inside try/catch.
   - Zero external libraries, zero network requests.
   - Features:
       * Floating shaded 3D shapes + bokeh glows (ambient world)
       * "CLEVERMENT" particle-word: ~1,500 glowing particles that assemble
         on load, breathe in 3D, and react to the mouse (repel + parallax)
       * Click shockwave ripples through the particle field
       * Confetti burst + rotating rainbow torus knot on quiz results
       * Auto-calm during an active quiz, pause when tab hidden,
         respects prefers-reduced-motion, on-screen "3D" toggle
   ============================================================================ */
(function () {
    'use strict';

    try { init3D(); } catch (err) {
        try { console.warn('CleverMent 3D disabled:', err); } catch (e) {}
    }

    function init3D() {
        if (!window.HTMLCanvasElement || !document.body) return;

        /* ---------- preferences ---------- */
        var STORE_KEY = 'cleverment-3d-enabled';
        var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        var enabled = true;
        try { enabled = localStorage.getItem(STORE_KEY) !== '0'; } catch (e) {}

        /* ---------- canvas ---------- */
        var canvas = document.createElement('canvas');
        canvas.id = 'cleverment-3d-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
        var W = 0, H = 0;

        function resize() {
            W = window.innerWidth; H = window.innerHeight;
            canvas.width = Math.round(W * DPR);
            canvas.height = Math.round(H * DPR);
            canvas.style.width = W + 'px';
            canvas.style.height = H + 'px';
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        }
        resize();
        window.addEventListener('resize', resize);
        document.body.insertBefore(canvas, document.body.firstChild);

        /* ---------- brand palette ---------- */
        var BRAND = [
            [45, 108, 223],   // #2d6cdf blue
            [111, 66, 193],   // #6f42c1 purple
            [23, 162, 184],   // teal
            [32, 201, 151],   // green
            [240, 173, 78]    // amber
        ];
        var BG = [245, 247, 250];

        function mix(c1, c2, t) {
            return [c1[0] + (c2[0] - c1[0]) * t,
                    c1[1] + (c2[1] - c1[1]) * t,
                    c1[2] + (c2[2] - c1[2]) * t];
        }
        function rgb(c, a) {
            return a === undefined
                ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
                : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';
        }

        /* ================= 3D MATH ================= */
        function rotX(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
        function rotY(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
        function rotZ(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; }
        function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
        function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
        function norm(v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
        function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

        var FOV = 640;
        function project(p, camX, camY) {
            var z = p[2] + 620;
            if (z < 40) z = 40;
            var f = FOV / z;
            return [W / 2 + (p[0] + camX) * f, H / 2 + (p[1] + camY) * f, z];
        }

        /* ================= SOLID BUILDERS ================= */
        function buildIcosahedron(r) {
            var t = (1 + Math.sqrt(5)) / 2;
            var v = [
                [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
                [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
                [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
            ].map(function (p) { return norm(p).map(function (x) { return x * r; }); });
            var f = [
                [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
                [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
            ];
            return { verts: v, faces: f };
        }
        function buildOctahedron(r) {
            var v = [[r,0,0],[-r,0,0],[0,r,0],[0,-r,0],[0,0,r],[0,0,-r]];
            var f = [[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]];
            return { verts: v, faces: f };
        }
        function buildTetrahedron(r) {
            var s = r / Math.sqrt(3);
            var v = [[s,s,s],[-s,-s,s],[-s,s,-s],[s,-s,-s]];
            var f = [[0,1,2],[0,3,1],[0,2,3],[1,3,2]];
            return { verts: v, faces: f };
        }
        function buildTorus(R, r, segT, segP) {
            var verts = [], faces = [];
            for (var i = 0; i < segT; i++) {
                var u = i / segT * Math.PI * 2;
                for (var j = 0; j < segP; j++) {
                    var w = j / segP * Math.PI * 2;
                    verts.push([
                        (R + r * Math.cos(w)) * Math.cos(u),
                        r * Math.sin(w),
                        (R + r * Math.cos(w)) * Math.sin(u)
                    ]);
                }
            }
            for (var a = 0; a < segT; a++) for (var b = 0; b < segP; b++) {
                var a2 = (a + 1) % segT, b2 = (b + 1) % segP;
                faces.push([a * segP + b, a2 * segP + b, a2 * segP + b2, a * segP + b2]);
            }
            return { verts: verts, faces: faces };
        }
        function buildTorusKnot(p, q, tube, segs, sides) {
            var verts = [], faces = [];
            function center(t) {
                var r = 90 + 34 * Math.cos(q * t);
                return [r * Math.cos(p * t), r * Math.sin(p * t), 34 * Math.sin(q * t)];
            }
            for (var i = 0; i < segs; i++) {
                var t = i / segs * Math.PI * 2;
                var c = center(t), c2 = center(t + 0.01);
                var T = norm(sub(c2, c));
                var N = norm(cross(T, Math.abs(T[1]) < 0.9 ? [0,1,0] : [1,0,0]));
                var B = norm(cross(T, N));
                for (var j = 0; j < sides; j++) {
                    var a = j / sides * Math.PI * 2;
                    verts.push([
                        c[0] + (N[0] * Math.cos(a) + B[0] * Math.sin(a)) * tube,
                        c[1] + (N[1] * Math.cos(a) + B[1] * Math.sin(a)) * tube,
                        c[2] + (N[2] * Math.cos(a) + B[2] * Math.sin(a)) * tube
                    ]);
                }
            }
            for (var a2 = 0; a2 < segs; a2++) for (var b2 = 0; b2 < sides; b2++) {
                var n2 = (a2 + 1) % segs, m2 = (b2 + 1) % sides;
                faces.push([a2 * sides + b2, n2 * sides + b2, n2 * sides + m2, a2 * sides + m2]);
            }
            return { verts: verts, faces: faces };
        }

        /* ================= AMBIENT SHAPES (kept subtle, behind the word) ================= */
        var builders = [
            function () { return buildIcosahedron(38 + Math.random() * 24); },
            function () { return buildOctahedron(34 + Math.random() * 20); },
            function () { return buildTetrahedron(40 + Math.random() * 20); },
            function () { return buildTorus(44, 14, 14, 9); }
        ];
        var shapes = [];
        var COUNT = W < 700 ? 6 : 10;
        for (var i = 0; i < COUNT; i++) {
            var b = builders[i % builders.length]();
            shapes.push({
                verts: b.verts, faces: b.faces,
                pos: [(Math.random() - 0.5) * (W * 0.95), (Math.random() - 0.5) * (H * 0.95), -260 - Math.random() * 380],
                rot: [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28],
                spin: [(Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0],
                driftPhase: Math.random() * 6.28,
                driftAmp: 8 + Math.random() * 14,
                color: BRAND[i % BRAND.length],
                wire: Math.random() < 0.5,
                alpha: 0.32 + Math.random() * 0.25
            });
        }

        /* bokeh orbs */
        var orbs = [];
        for (var o = 0; o < 8; o++) {
            orbs.push({
                x: Math.random() * W, y: Math.random() * H,
                r: 70 + Math.random() * 150,
                vx: (Math.random() - 0.5) * 0.1, vy: (Math.random() - 0.5) * 0.09,
                col: BRAND[o % BRAND.length]
            });
        }

        /* ================= "CLEVERMENT" PARTICLE WORD ================= */
        var particles = [];
        var wordAlpha = 0;      /* fades in after assembly */
        var wordCx = 0, wordCy = -H * 0.06;   /* word centre offset */

        function sampleWord() {
            var off = document.createElement('canvas');
            var octx = off.getContext('2d');
            if (!octx) return;
            var fontPx = Math.min(W / 6.4, 190);
            var txt = 'CleverMent';
            octx.font = '800 ' + fontPx + 'px Inter, Arial, sans-serif';
            var tw = octx.measureText(txt).width;
            var pad = fontPx * 0.3;
            off.width = Math.ceil(tw + pad * 2);
            off.height = Math.ceil(fontPx * 1.5);
            octx.font = '800 ' + fontPx + 'px Inter, Arial, sans-serif';
            octx.textBaseline = 'middle';
            octx.fillStyle = '#fff';
            octx.fillText(txt, pad, off.height / 2);

            var gap = Math.max(3, Math.round(fontPx / 34));
            var data = octx.getImageData(0, 0, off.width, off.height).data;
            var pts = [];
            for (var y = 0; y < off.height; y += gap) {
                for (var x = 0; x < off.width; x += gap) {
                    if (data[(y * off.width + x) * 4 + 3] > 128) pts.push([x, y]);
                }
            }
            /* cap particle count on small screens */
            var MAX = 1700;
            if (pts.length > MAX) {
                var keep = MAX / pts.length, out = [];
                for (var k = 0; k < pts.length; k++) if (Math.random() < keep) out.push(pts[k]);
                pts = out;
            }

            /* map to world coords, centred; brand gradient along x */
            var x0 = (off.width - pad * 2) / 2, y0 = off.height / 2;
            var scale = Math.min(1, W * 0.86 / off.width);
            var fresh = particles.length === 0;
            var np = [];
            for (var m = 0; m < pts.length; m++) {
                var wx = (pts[m][0] - pad - x0) * scale;
                var wy = (pts[m][1] - y0) * scale;
                var t = (pts[m][0] / off.width);
                var col = t < 0.5 ? mix(BRAND[0], BRAND[1], t * 2) : mix(BRAND[1], BRAND[2], (t - 0.5) * 2);
                np.push({
                    tx: wx, ty: wy, tz: (Math.random() - 0.5) * 26,
                    x: fresh || reducedMotion ? wx : (Math.random() - 0.5) * W * 1.6,
                    y: fresh || reducedMotion ? wy : (Math.random() - 0.5) * H * 1.6,
                    z: fresh || reducedMotion ? (Math.random() - 0.5) * 26 : 300 + Math.random() * 500,
                    vx: 0, vy: 0, vz: 0,
                    phase: Math.random() * 6.28,
                    size: 1.1 + Math.random() * 1.5,
                    col: col
                });
            }
            particles = np;
        }
        sampleWord();

        var resizeTimer = null;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                wordCy = -H * 0.06;
                sampleWord();
                if (reducedMotion) drawStatic();
            }, 250);
        });

        /* ================= POINTER INTERACTION ================= */
        var mx = 0, my = 0, tx = 0, ty = 0;      /* parallax -1..1 */
        var pmx = -9999, pmy = -9999;            /* pointer world-ish position */
        var ripples = [];                        /* click shockwaves */

        window.addEventListener('pointermove', function (e) {
            tx = (e.clientX / W - 0.5) * 2;
            ty = (e.clientY / H - 0.5) * 2;
            pmx = e.clientX - W / 2;
            pmy = e.clientY - H / 2;
        }, { passive: true });
        window.addEventListener('pointerleave', function () { pmx = -9999; pmy = -9999; });
        window.addEventListener('pointerdown', function (e) {
            if (quizActive) return;   /* no fireworks during a test */
            ripples.push({ x: e.clientX - W / 2, y: e.clientY - H / 2, r: 0, life: 1 });
        });

        /* ================= QUIZ AWARENESS ================= */
        var quizActive = false;
        function elVisible(id) {
            var el = document.getElementById(id);
            if (!el) return false;
            if (el.style && el.style.display === 'none') return false;
            var cs = window.getComputedStyle(el);
            return cs.display !== 'none' && cs.visibility !== 'hidden';
        }
        function updateQuizState() { quizActive = elVisible('studentQuizSection'); }
        updateQuizState();
        try {
            var mo = new MutationObserver(function () { updateQuizState(); });
            mo.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['style', 'class'] });
        } catch (e) {}

        /* ================= CONFETTI & CELEBRATION KNOT ================= */
        var confetti = [];
        function burstConfetti() {
            for (var i = 0; i < 140; i++) {
                var a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 8;
                confetti.push({
                    x: W / 2, y: H * 0.3,
                    vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4,
                    w: 5 + Math.random() * 6, h: 8 + Math.random() * 8,
                    rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
                    col: BRAND[(Math.random() * BRAND.length) | 0],
                    life: 1
                });
            }
        }
        function drawConfetti(dt) {
            for (var i = confetti.length - 1; i >= 0; i--) {
                var p = confetti[i];
                p.vy += 0.16; p.vx *= 0.99; p.vy *= 0.99;
                p.x += p.vx; p.y += p.vy; p.rot += p.vr;
                p.life -= 0.006;
                if (p.life <= 0 || p.y > H + 40) { confetti.splice(i, 1); continue; }
                ctx.save();
                ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                ctx.globalAlpha = Math.min(1, p.life * 1.6);
                ctx.fillStyle = rgb(p.col);
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }

        var knot = buildTorusKnot(2, 3, 12, 90, 7);
        var knotLife = 0;
        var resultsShown = false;
        function watchResults() {
            if (!resultsShown && elVisible('studentResultsSection')) {
                resultsShown = true; knotLife = 1;
                burstConfetti();
            }
            if (!elVisible('studentResultsSection')) resultsShown = false;
        }
        setInterval(watchResults, 700);

        /* ================= DRAW HELPERS ================= */
        var light = norm([-0.5, -0.75, -0.6]);

        function drawShapes(t, dt, camX, camY, speed) {
            for (var s = 0; s < shapes.length; s++) {
                var sh = shapes[s];
                if (!reducedMotion) {
                    sh.rot[0] += sh.spin[0] * dt * speed;
                    sh.rot[1] += sh.spin[1] * dt * speed;
                }
                var py = sh.pos[1] + (reducedMotion ? 0 : Math.sin(t * 0.5 + sh.driftPhase) * sh.driftAmp * speed);

                var tv = new Array(sh.verts.length);
                for (var v = 0; v < sh.verts.length; v++) {
                    var p = rotZ(rotY(rotX(sh.verts[v], sh.rot[0]), sh.rot[1]), sh.rot[2]);
                    tv[v] = project([p[0] + sh.pos[0], p[1] + py, p[2] + sh.pos[2]], camX, camY);
                }
                var drawList = [];
                for (var fi = 0; fi < sh.faces.length; fi++) {
                    var f = sh.faces[fi];
                    var na = rotZ(rotY(rotX(sh.verts[f[0]], sh.rot[0]), sh.rot[1]), sh.rot[2]);
                    var nb = rotZ(rotY(rotX(sh.verts[f[1]], sh.rot[0]), sh.rot[1]), sh.rot[2]);
                    var nc = rotZ(rotY(rotX(sh.verts[f[2]], sh.rot[0]), sh.rot[1]), sh.rot[2]);
                    var nrm = norm(cross(sub(nb, na), sub(nc, na)));
                    if (nrm[2] >= 0) continue;
                    var lum = Math.max(0, -dot(nrm, light));
                    var zAvg = 0;
                    for (var k = 0; k < f.length; k++) zAvg += tv[f[k]][2];
                    drawList.push({ f: f, lum: lum, z: zAvg / f.length });
                }
                drawList.sort(function (x, y) { return y.z - x.z; });

                var fog = Math.min(1, Math.max(0, (sh.pos[2] + 640) / 380));
                for (var d = 0; d < drawList.length; d++) {
                    var item = drawList[d];
                    var col2 = mix(mix([255,255,255], sh.color, 0.25 + 0.75 * item.lum), BG, fog * 0.5);
                    ctx.beginPath();
                    ctx.moveTo(tv[item.f[0]][0], tv[item.f[0]][1]);
                    for (var k2 = 1; k2 < item.f.length; k2++) ctx.lineTo(tv[item.f[k2]][0], tv[item.f[k2]][1]);
                    ctx.closePath();
                    ctx.globalAlpha = sh.alpha * (1 - fog * 0.4);
                    ctx.fillStyle = rgb(col2);
                    ctx.fill();
                    if (sh.wire) {
                        ctx.globalAlpha = 0.3 * (1 - fog * 0.35);
                        ctx.strokeStyle = rgb(sh.color);
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
                ctx.globalAlpha = 1;
            }
        }

        function drawWord(t, dt, camX, camY, speed) {
            if (!particles.length) return;
            wordAlpha = Math.min(1, wordAlpha + dt * 0.8);
            var spring = 0.028, damp = 0.86;
            var repelR = quizActive ? 0 : 110;     /* calm hands during a test */
            var waveAmp = reducedMotion ? 0 : (10 + 5 * Math.sin(t * 0.4)) * speed;

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                /* target breathes in 3D */
                var wob = Math.sin(t * 1.4 + p.phase) * waveAmp;
                var gx = p.tx, gy = p.ty + wob * 0.4, gz = p.tz + wob;

                /* spring toward target */
                p.vx = (p.vx + (gx - p.x) * spring) * damp;
                p.vy = (p.vy + (gy - p.y) * spring) * damp;
                p.vz = (p.vz + (gz - p.z) * spring) * damp;

                /* mouse repulsion (screen-space, cheap + feels right) */
                if (repelR > 0 && pmx > -9000) {
                    var sx = W / 2 + p.x - camX, sy = H / 2 + wordCy + p.y - camY;
                    var ddx = sx - (pmx + W / 2), ddy = sy - (pmy + H / 2);
                    var d2 = ddx * ddx + ddy * ddy;
                    if (d2 < repelR * repelR && d2 > 0.01) {
                        var d = Math.sqrt(d2), f = (1 - d / repelR) * 3.2;
                        p.vx += (ddx / d) * f;
                        p.vy += (ddy / d) * f;
                        p.vz += f * 2.4;
                    }
                }
                /* click ripples push particles radially */
                for (var r = 0; r < ripples.length; r++) {
                    var rp = ripples[r];
                    var rdx = p.x - rp.x, rdy = p.y - rp.y;
                    var rd = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
                    var band = Math.abs(rd - rp.r);
                    if (band < 70) {
                        var push = (1 - band / 70) * rp.life * 5;
                        p.vx += (rdx / rd) * push;
                        p.vy += (rdy / rd) * push;
                        p.vz += push * 1.5;
                    }
                }

                p.x += p.vx; p.y += p.vy; p.z += p.vz;
            }

            /* draw far -> near using current approx depth */
            var proj = new Array(particles.length);
            for (var j = 0; j < particles.length; j++) {
                var q = particles[j];
                proj[j] = [q, project([q.x + wordCx, q.y + wordCy, q.z], camX * 0.6, camY * 0.6)];
            }
            proj.sort(function (a, b) { return b[1][2] - a[1][2]; });

            var a = wordAlpha;
            for (var m = 0; m < proj.length; m++) {
                var pp = proj[m][0], sp = proj[m][1];
                var depth = Math.min(1, Math.max(0, (sp[2] - 560) / 220));
                var size = pp.size * (1 - depth * 0.55);
                ctx.globalAlpha = a * (1 - depth * 0.5) * 0.95;
                ctx.fillStyle = rgb(pp.col);
                ctx.beginPath();
                ctx.arc(sp[0], sp[1], size, 0, 6.2832);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            /* draw ripples as rings */
            for (var r2 = ripples.length - 1; r2 >= 0; r2--) {
                var rr = ripples[r2];
                rr.r += (reducedMotion ? 0 : 9 * speed) + 4;
                rr.life -= 0.022;
                if (rr.life <= 0) { ripples.splice(r2, 1); continue; }
                ctx.globalAlpha = rr.life * 0.25;
                ctx.strokeStyle = rgb(BRAND[0]);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(rr.x + W / 2, rr.y + H / 2, rr.r, 0, 6.2832);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        function drawKnot(t, dt, camX, camY) {
            if (knotLife <= 0) return;
            knotLife -= dt * 0.12;
            var kt = reducedMotion ? 0 : t * 0.7;
            var kv = new Array(knot.verts.length);
            for (var k3 = 0; k3 < knot.verts.length; k3++) {
                var p3 = rotY(rotX(knot.verts[k3], kt * 0.6), kt);
                kv[k3] = project([p3[0], p3[1] - H * 0.02, p3[2] - 100], camX, camY);
            }
            var ka = Math.max(0, Math.min(1, knotLife * 2));
            ctx.lineWidth = 1.4;
            for (var kf = 0; kf < knot.faces.length; kf++) {
                var kf2 = knot.faces[kf];
                ctx.beginPath();
                ctx.moveTo(kv[kf2[0]][0], kv[kf2[0]][1]);
                ctx.lineTo(kv[kf2[1]][0], kv[kf2[1]][1]);
                ctx.lineTo(kv[kf2[2]][0], kv[kf2[2]][1]);
                ctx.lineTo(kv[kf2[3]][0], kv[kf2[3]][1]);
                ctx.closePath();
                var hue = (kf / knot.faces.length) * 360 + t * 60;
                ctx.strokeStyle = 'hsla(' + (hue % 360) + ',70%,55%,' + (0.5 * ka) + ')';
                ctx.stroke();
            }
        }

        /* ================= MAIN LOOP ================= */
        var last = 0, staticDrawn = false;
        function drawStatic() {
            renderFrame(performance.now(), true);
        }
        function renderFrame(now, forceStatic) {
            var dt = 0.016;
            var t = now / 1000;
            var speed = quizActive ? 0.35 : 1;

            mx += (tx - mx) * 0.05;
            my += (ty - my) * 0.05;
            var camX = -mx * 34, camY = -my * 22;

            ctx.clearRect(0, 0, W, H);

            /* bokeh */
            for (var o = 0; o < orbs.length; o++) {
                var ob = orbs[o];
                if (!reducedMotion && !forceStatic) {
                    ob.x += ob.vx * speed; ob.y += ob.vy * speed;
                    if (ob.x < -ob.r) ob.x = W + ob.r; if (ob.x > W + ob.r) ob.x = -ob.r;
                    if (ob.y < -ob.r) ob.y = H + ob.r; if (ob.y > H + ob.r) ob.y = -ob.r;
                }
                var g = ctx.createRadialGradient(ob.x, ob.y, 0, ob.x, ob.y, ob.r);
                g.addColorStop(0, rgb(ob.col, 0.12));
                g.addColorStop(1, rgb(ob.col, 0));
                ctx.fillStyle = g;
                ctx.fillRect(ob.x - ob.r, ob.y - ob.r, ob.r * 2, ob.r * 2);
            }

            drawShapes(t, dt, camX, camY, speed);
            drawWord(t, dt, camX, camY, speed);
            drawKnot(t, dt, camX, camY);
            drawConfetti(dt);
        }

        function frame(now) {
            requestAnimationFrame(frame);
            if (!enabled) return;
            if (reducedMotion) {
                if (!staticDrawn) { staticDrawn = true; renderFrame(now, true); }
                return;
            }
            last = now;
            renderFrame(now, false);
        }

        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) staticDrawn = false;
        });

        if (reducedMotion && enabled) drawStatic();
        requestAnimationFrame(frame);

        /* ================= 3D TOGGLE ================= */
        var btn = document.createElement('button');
        btn.id = 'cleverment-3d-toggle';
        btn.type = 'button';
        btn.textContent = '✨ 3D';
        btn.title = 'Toggle 3D background effects';
        btn.setAttribute('aria-label', 'Toggle 3D background effects');
        btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:600;' +
            'background:rgba(255,255,255,0.92);color:#2d6cdf;border:1.5px solid #2d6cdf;' +
            'border-radius:20px;padding:7px 14px;font:700 13px Inter,sans-serif;' +
            'cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.18);transition:all .2s;';
        function paintBtn() {
            btn.style.opacity = enabled ? '1' : '0.55';
            btn.style.filter = enabled ? 'none' : 'grayscale(1)';
        }
        btn.addEventListener('click', function () {
            enabled = !enabled;
            try { localStorage.setItem(STORE_KEY, enabled ? '1' : '0'); } catch (e) {}
            if (!enabled && ctx) ctx.clearRect(0, 0, W, H);
            if (enabled && reducedMotion) drawStatic();
            paintBtn();
        });
        paintBtn();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(btn); });
        } else {
            document.body.appendChild(btn);
        }
    }
})();
