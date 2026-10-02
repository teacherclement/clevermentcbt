/* ============================================================================
   CLEVERMENT 3D LAYER  (cleverment-3d.js)
   ----------------------------------------------------------------------------
   ADDITIVE, NON-DESTRUCTIVE 3D ENHANCEMENT FOR CLEVERMENT
   - This file NEVER modifies, replaces or interferes with the existing
     CleverMent program (index.html / script.js / server.js).
   - It renders a decorative 3D scene on its own fixed <canvas> that sits
     BEHIND all application content and has pointer-events:none, so it can
     never block clicks, typing, proctoring, payments, or any feature.
   - If anything goes wrong it fails silently in a try/catch.
   - No external libraries: zero new dependencies, zero network requests.
   - Includes an on-screen "3D" toggle (persisted in localStorage).
   ============================================================================ */
(function () {
    'use strict';

    /* ---- Absolute safety net: a failure here must never break CleverMent -- */
    try { init3D(); } catch (err) {
        try { console.warn('CleverMent 3D disabled:', err); } catch (e) {}
    }

    function init3D() {
        if (!window.HTMLCanvasElement || !document.body) return;

        /* ---------- user preference / reduced motion ---------- */
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
        /* insert BEHIND everything (first child of body) */
        document.body.insertBefore(canvas, document.body.firstChild);

        /* ---------- brand palette ---------- */
        var BRAND = [
            [45, 108, 223],   // #2d6cdf blue
            [111, 66, 193],   // #6f42c1 purple
            [23, 162, 184],   // teal
            [32, 201, 151],   // green
            [240, 173, 78]    // amber
        ];
        var BG = [245, 247, 250]; // matches body background #f5f7fa

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

        /* ================= SCENE ================= */
        var builders = [
            function () { return buildIcosahedron(46 + Math.random() * 30); },
            function () { return buildOctahedron(42 + Math.random() * 26); },
            function () { return buildTetrahedron(48 + Math.random() * 26); },
            function () { return buildTorus(52, 17, 16, 10); }
        ];
        var shapes = [];
        var COUNT = W < 700 ? 8 : 13;
        for (var i = 0; i < COUNT; i++) {
            var b = builders[i % builders.length]();
            var col = BRAND[i % BRAND.length];
            shapes.push({
                verts: b.verts, faces: b.faces,
                pos: [(Math.random() - 0.5) * (W * 0.9), (Math.random() - 0.5) * (H * 0.85), -80 - Math.random() * 340],
                rot: [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28],
                spin: [(Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35, 0],
                driftPhase: Math.random() * 6.28,
                driftAmp: 8 + Math.random() * 16,
                color: col,
                wire: Math.random() < 0.45,
                alpha: 0.5 + Math.random() * 0.35
            });
        }

        /* soft background bokeh orbs */
        var orbs = [];
        for (var o = 0; o < 7; o++) {
            orbs.push({
                x: Math.random() * W, y: Math.random() * H,
                r: 60 + Math.random() * 130,
                vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.1,
                col: BRAND[o % BRAND.length]
            });
        }

        /* ---------- parallax ---------- */
        var mx = 0, my = 0, tx = 0, ty = 0;
        window.addEventListener('pointermove', function (e) {
            tx = (e.clientX / W - 0.5) * 2;
            ty = (e.clientY / H - 0.5) * 2;
        }, { passive: true });

        /* ---------- quiz-awareness: keep it calm during an active test ---------- */
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

        /* ---------- confetti (celebrates results) ---------- */
        var confetti = [];
        function burstConfetti() {
            for (var i = 0; i < 130; i++) {
                var a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 8;
                confetti.push({
                    x: W / 2, y: H * 0.32,
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

        /* ---------- celebration knot (appears on results) ---------- */
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

        /* ================= RENDER ================= */
        var last = 0;
        function frame(now) {
            requestAnimationFrame(frame);
            if (!enabled) return;
            var dt = Math.min((now - last) / 1000, 0.05) || 0.016;
            last = now;
            var t = now / 1000;
            var speed = quizActive ? 0.35 : 1;   // calm down during an active quiz

            mx += (tx - mx) * 0.05;
            my += (ty - my) * 0.05;
            var camX = -mx * 34, camY = -my * 22;

            /* background wash + bokeh */
            ctx.clearRect(0, 0, W, H);
            for (var o = 0; o < orbs.length; o++) {
                var ob = orbs[o];
                if (!reducedMotion) {
                    ob.x += ob.vx * speed; ob.y += ob.vy * speed;
                    if (ob.x < -ob.r) ob.x = W + ob.r; if (ob.x > W + ob.r) ob.x = -ob.r;
                    if (ob.y < -ob.r) ob.y = H + ob.r; if (ob.y > H + ob.r) ob.y = -ob.r;
                }
                var g = ctx.createRadialGradient(ob.x, ob.y, 0, ob.x, ob.y, ob.r);
                g.addColorStop(0, rgb(ob.col, 0.10));
                g.addColorStop(1, rgb(ob.col, 0));
                ctx.fillStyle = g;
                ctx.fillRect(ob.x - ob.r, ob.y - ob.r, ob.r * 2, ob.r * 2);
            }

            /* shapes */
            var light = norm([-0.5, -0.75, -0.6]);
            for (var s = 0; s < shapes.length; s++) {
                var sh = shapes[s];
                if (!reducedMotion) {
                    sh.rot[0] += sh.spin[0] * dt * speed;
                    sh.rot[1] += sh.spin[1] * dt * speed;
                }
                var py = sh.pos[1] + (reducedMotion ? 0 : Math.sin(t * 0.5 + sh.driftPhase) * sh.driftAmp * speed);

                /* transform vertices */
                var tv = new Array(sh.verts.length);
                for (var v = 0; v < sh.verts.length; v++) {
                    var p = sh.verts[v];
                    p = rotX(p, sh.rot[0]); p = rotY(p, sh.rot[1]); p = rotZ(p, sh.rot[2]);
                    tv[v] = project([p[0] + sh.pos[0], p[1] + py, p[2] + sh.pos[2]], camX, camY);
                }

                /* shade + painter sort */
                var drawList = [];
                for (var fi = 0; fi < sh.faces.length; fi++) {
                    var f = sh.faces[fi];
                    var a2 = sh.verts[f[0]], b2 = sh.verts[f[1]], c2 = sh.verts[f[2]];
                    var na = rotX(a2, sh.rot[0]); na = rotY(na, sh.rot[1]); na = rotZ(na, sh.rot[2]);
                    var nb = rotX(b2, sh.rot[0]); nb = rotY(nb, sh.rot[1]); nb = rotZ(nb, sh.rot[2]);
                    var nc = rotX(c2, sh.rot[0]); nc = rotY(nc, sh.rot[1]); nc = rotZ(nc, sh.rot[2]);
                    var nrm = norm(cross(sub(nb, na), sub(nc, na)));
                    if (nrm[2] >= 0) continue;             /* backface cull */
                    var lum = Math.max(0, -dot(nrm, light));
                    var zAvg = 0;
                    for (var k = 0; k < f.length; k++) zAvg += tv[f[k]][2];
                    zAvg /= f.length;
                    drawList.push({ f: f, lum: lum, z: zAvg });
                }
                drawList.sort(function (x, y) { return y.z - x.z; });

                var fog = Math.min(1, Math.max(0, (sh.pos[2] + 420) / 340));
                for (var d = 0; d < drawList.length; d++) {
                    var item = drawList[d];
                    var col2 = mix(mix([255,255,255], sh.color, 0.25 + 0.75 * item.lum), BG, fog * 0.55);
                    ctx.beginPath();
                    ctx.moveTo(tv[item.f[0]][0], tv[item.f[0]][1]);
                    for (var k2 = 1; k2 < item.f.length; k2++) ctx.lineTo(tv[item.f[k2]][0], tv[item.f[k2]][1]);
                    ctx.closePath();
                    ctx.globalAlpha = sh.alpha * (1 - fog * 0.45);
                    ctx.fillStyle = rgb(col2);
                    ctx.fill();
                    if (sh.wire) {
                        ctx.globalAlpha = 0.35 * (1 - fog * 0.4);
                        ctx.strokeStyle = rgb(sh.color);
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
                ctx.globalAlpha = 1;
            }

            /* celebration torus knot */
            if (knotLife > 0) {
                knotLife -= dt * 0.12;
                var kt = reducedMotion ? 0 : t * 0.7;
                var kv = new Array(knot.verts.length);
                for (var k3 = 0; k3 < knot.verts.length; k3++) {
                    var p3 = rotX(knot.verts[k3], kt * 0.6);
                    p3 = rotY(p3, kt);
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

            drawConfetti(dt);

            /* static-frame mode for reduced motion: draw once, then stop */
            if (reducedMotion) enabled = false;
        }

        /* pause when tab hidden (battery friendly) */
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) last = performance.now();
        });

        requestAnimationFrame(frame);

        /* ================= 3D TOGGLE BUTTON ================= */
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
            paintBtn();
            if (enabled) { last = performance.now(); }
        });
        paintBtn();
        /* wait for DOM ready so we don't disturb existing buttons */
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(btn); });
        } else {
            document.body.appendChild(btn);
        }
    }
})();
