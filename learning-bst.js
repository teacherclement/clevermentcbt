/* CleverMent My Learning Space - Primary 6 Basic Science and Technology (BST).
   Engine + lessons with diagrams + a pool of 600 different questions per topic, built from each topic's
   fact banks (asked as direct, reverse, fill-in, match, correct-statement and odd-one-out questions).
   Question i of a topic is always the same question. Plain text only. */
(function (root) {
    var PREF = 'p6-bst-', POOL = 600, SPEC = {}, LES = {}, IDX = [], CACHE = {}, STRAND = '';
    function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
    function P(r, arr) { return arr[Math.floor(r() * arr.length)]; }
    function shuf(r, arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function cap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
    function an(w) { w = String(w); if (/^(hour|honest|heir)/i.test(w)) return 'an ' + w; if (/^(uni|use|usu|eu|one|ur[ei])/i.test(w)) return 'a ' + w; return (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w; }
    function W(s) { return s.split(' '); }
    var NB = W('Tunde Emeka Musa Chidi Ibrahim Segun Kunle Obinna Sani Yusuf Femi Dayo Uche Bala Tobi Kelechi Ade Ifeanyi');
    var NG = W('Ngozi Amina Bola Chioma Funke Halima Ireti Joy Kemi Zainab Titi Nneka Sade Bisi Hauwa Peace Ada Folake');
    var NM = NB.concat(NG);
    function A(k, art) { return art === 0 ? k : an(k); }

    /* ---------- question frames (job / def / fact styles) ---------- */
    function TO(k, v) { return 'To ' + v[1]; }
    var FW = {
        job: [
            [function (p) { return 'What is the main job of the ' + p[0] + '?'; }, TO],
            [function (p) { return 'The main job of the ' + p[0] + ' is ______.'; }, function (k, v) { return 'to ' + v[1]; }],
            [function (p, N) { return N + ' asks, "What is the ' + p[0] + ' for?" Which answer is correct?'; }, TO],
            [function (p) { return 'Which of these shows the correct job of the ' + p[0] + '?'; }, TO],
            [function (p, N) { return N + ' is learning about the ' + p[0] + '. Which job belongs to it?'; }, TO],
            [function (p) { return 'What is the ' + p[0] + ' meant to do?'; }, TO]
        ],
        def: [
            [function (p) { return 'What does the word "' + p[0] + '" mean?'; }, function (k, v) { return cap(v[1]); }],
            [function (p) { return 'Which of these is the best meaning of "' + p[0] + '"?'; }, function (k, v) { return cap(v[1]); }],
            [function (p, N) { return N + ' asks, "What is ' + A(p[0], p[2]) + '?" Which answer is correct?'; }, function (k, v) { return cap(v[1]); }],
            [function (p) { return 'Which of these describes ' + A(p[0], p[2]) + ' best?'; }, function (k, v) { return cap(v[1]); }],
            [function (p) { return cap(A(p[0], p[2])) + ' is ______.'; }, function (k, v) { return cap(v[1]); }],
            [function (p) { return 'The teacher writes "' + p[0] + '" on the board. What does it mean?'; }, function (k, v) { return cap(v[1]); }]
        ],
        fact: [
            [function (p) { return 'Which statement about ' + p[0] + ' is correct?'; }, function (k, v) { return cap(k[0]) + ' ' + v[1] + '.'; }],
            [function (p) { return 'Which of these is true of ' + p[0] + '?'; }, function (k, v) { return 'It ' + v[1] + '.'; }],
            [function (p, N) { return N + ' says: "' + cap(p[0]) + ' ______." Which ending is correct?'; }, function (k, v) { return v[1]; }],
            [function (p) { return 'Complete the sentence: ' + cap(p[0]) + ' ______.'; }, function (k, v) { return v[1]; }],
            [function (p) { return 'What can we say about ' + p[0] + '?'; }, function (k, v) { return 'It ' + v[1] + '.'; }],
            [function (p) { return 'The teacher asks, "What is true about ' + p[0] + '?" Which answer is correct?'; }, function (k, v) { return 'It ' + v[1] + '.'; }]
        ]
    };
    var RV = {
        job: [
            function (p, N, c) { return 'Which ' + c + ' helps to ' + p[1] + '?'; },
            function (p, N, c) { return 'Which ' + c + ' is needed to ' + p[1] + '?'; },
            function (p, N, c) { return N + ' says one ' + c + ' is there to ' + p[1] + '. Which ' + c + ' is that?'; },
            function (p) { return 'We need the ______ to ' + p[1] + '.'; },
            function (p) { return 'Which of these is there to ' + p[1] + '?'; },
            function (p, N, c) { return 'Fill in the blank: The ______ is the ' + c + ' that helps to ' + p[1] + '.'; }
        ],
        def: [
            function (p) { return 'Which word describes ' + p[1] + '?'; },
            function (p) { return 'Which term is used for ' + p[1] + '?'; },
            function (p) { return cap(p[1]) + ' is called ______.'; },
            function (p, N) { return N + ' describes ' + p[1] + '. What is the correct word?'; },
            function (p) { return 'Which of these words means ' + p[1] + '?'; },
            function (p) { return 'Fill in the blank: ' + cap(p[1]) + ' is known as ______.'; }
        ],
        fact: [
            function (p) { return 'Which of these ' + p[1] + '?'; },
            function (p, N, c) { return 'Which ' + c + ' ' + p[1] + '?'; },
            function (p, N, c) { return N + ' is thinking of ' + an(c) + '. It ' + p[1] + '. Which ' + c + ' is it?'; },
            function (p) { return 'Fill in the blank: ______ ' + p[1] + '.'; },
            function (p, N, c) { return 'The ' + c + ' that ' + p[1] + ' is ______.'; },
            function (p, N, c) { return 'Which ' + c + ' is described by this clue: it ' + p[1] + '?'; }
        ]
    };
    function stmt(st, p) {
        if (st === 'job') return 'The main job of the ' + p[0] + ' is to ' + p[1] + '.';
        if (st === 'def') return cap(A(p[0], p[2])) + ' is ' + p[1] + '.';
        return cap(p[0]) + ' ' + p[1] + '.';
    }
    function uniq(arr) { var u = {}, o = []; arr.forEach(function (x) { var k = String(x).toLowerCase(); if (!u[k]) { u[k] = 1; o.push(x); } }); return o; }

    function setGens(S, si) {
        var st = S.style || (S.ctx ? 'job' : 'def'), pr = S.pairs, n = pr.length, ctx = S.ctx || 'one', gens = [];
        function othersOf(r, i) { var ix = []; for (var j = 0; j < n; j++) if (j !== i) ix.push(j); return shuf(r, ix); }
        FW[st].forEach(function (f, fi) {
            gens.push(function (r) {
                var i = ri(r, 0, n - 1), p = pr[i], N = P(r, NM), o = othersOf(r, i).slice(0, 6);
                var wr = uniq(o.map(function (j) { return f[1](p, pr[j]); })).slice(0, 3);
                return [f[0](p, N), f[1](p, p), wr, stmt(st, p) + (st === 'job' && p[2] ? ' ' + p[2] : ''), si + 'f' + fi + ':' + i];
            });
        });
        RV[st].forEach(function (f, fi) {
            gens.push(function (r) {
                var i = ri(r, 0, n - 1), p = pr[i], N = P(r, NM), o = othersOf(r, i).slice(0, 3);
                return [f(p, N, ctx), cap(p[0]), o.map(function (j) { return cap(pr[j][0]); }), stmt(st, p), si + 'r' + fi + ':' + i];
            });
        });
        gens.push(function (r) {
            var i = ri(r, 0, n - 1), o = othersOf(r, i).slice(0, 3), t = [];
            for (var a = 0; a < 3; a++) t.push(stmt(st, [pr[o[a]][0], pr[o[(a + 1) % 3]][1], pr[o[a]][2]]));
            return ['Which of the following statements is correct?', stmt(st, pr[i]), t, stmt(st, pr[i]), si + 'sc:' + i];
        });
        gens.push(function (r) {
            var o = othersOf(r, -1), x = o[0], y = o[1], tr = o.slice(2, 5);
            var bad = stmt(st, [pr[x][0], pr[y][1], pr[x][2]]);
            return ['Which of the following statements is NOT correct?', bad, tr.map(function (z) { return stmt(st, pr[z]); }), 'This one is wrong. ' + stmt(st, pr[x]), si + 'sn:' + x + ':' + y];
        });
        gens.push(function (r) {
            var o = othersOf(r, -1), i = o[0], j = o[1], k = o[2], l = o[3], q, f;
            var a = pr[i], b = pr[j], c = pr[k];
            if (st === 'job') { f = function (x, y, z, w) { return cap(x[0]) + ': to ' + y[1] + '; ' + cap(z[0]) + ': to ' + w[1]; }; q = 'Which option matches the ' + a[0] + ' and the ' + b[0] + ' to their correct jobs?'; }
            else if (st === 'def') { f = function (x, y, z, w) { return cap(x[0]) + ' = ' + y[1] + '; ' + cap(z[0]) + ' = ' + w[1]; }; q = 'Which option gives the correct meaning of both "' + a[0] + '" and "' + b[0] + '"?'; }
            else { f = function (x, y, z, w) { return cap(x[0]) + ' ' + y[1] + '; ' + z[0] + ' ' + w[1]; }; q = 'Which option is correct for both ' + a[0] + ' and ' + b[0] + '?'; }
            var s = i < j ? i + ',' + j : j + ',' + i;
            return [q, f(a, a, b, b), [f(a, b, b, a), f(a, a, b, c), f(a, c, b, b)], stmt(st, a) + ' ' + stmt(st, b), si + 'm2:' + s];
        });
        return gens;
    }
    function catGens(cats, extra, si) {
        var names = Object.keys(cats), gens = [];
        function allOther(c) { var p = []; names.forEach(function (x) { if (x !== c) p = p.concat(cats[x].map(function (m) { return [m, x]; })); }); return p; }
        gens.push(function (r) { var c = P(r, names), m = P(r, cats[c]), w = shuf(r, allOther(c)).slice(0, 3); return ['Which of these is ' + an(c) + '?', cap(m), w.map(function (x) { return cap(x[0]); }), cap(m) + ' is ' + an(c) + '.', si + 'cw:' + c + ':' + m]; });
        gens.push(function (r) { var c = P(r, names), o = P(r, allOther(c)), w = shuf(r, cats[c]).slice(0, 3); return ['Which of these is NOT ' + an(c) + '?', cap(o[0]), w.map(cap), cap(o[0]) + ' is ' + an(o[1]) + ', not ' + an(c) + '.', si + 'cn:' + c + ':' + o[0]]; });
        if (names.length + extra.length >= 4) gens.push(function (r) { var c = P(r, names), m = P(r, cats[c]), pool = shuf(r, names.filter(function (x) { return x !== c; }).concat(extra)).slice(0, 3); return ['To which group does ' + m + ' belong?', cap(c), pool.map(cap), cap(m) + ' is ' + an(c) + '.', si + 'ct:' + c + ':' + m]; });
        gens.push(function (r) { var c = P(r, names), o = P(r, allOther(c)), t = shuf(r, cats[c]).slice(0, 3), all = shuf(r, t.concat([o[0]])); return ['Which one does not belong in this group: ' + all.join(', ') + '?', cap(o[0]), t.map(cap), cap(o[0]) + ' is ' + an(o[1]) + '. The others are ' + c + 's.', si + 'co:' + all.slice().sort().join('|')]; });
        return gens;
    }

    /* ---------- build ---------- */
    function build(id) {
        if (CACHE[id]) return CACHE[id];
        var sp = SPEC[id], out = [], seen = {}, seed = hash(id), tries = 0, gens = [];
        if (!sp) return (CACHE[id] = []);
        function add(x, r) {
            if (!x || !x[0] || !x[1]) return false;
            var sig = x[4] || x[0]; if (seen[sig]) return false;
            var c = String(x[1]), u = {}, w = []; u[c.toLowerCase()] = 1;
            (x[2] || []).forEach(function (o) { o = String(o); if (o && !u[o.toLowerCase()]) { u[o.toLowerCase()] = 1; w.push(o); } });
            if (w.length < 3) return false;
            w = r ? shuf(r, w).slice(0, 3) : w.slice(0, 3);
            var opts = r ? shuf(r, [c].concat(w)) : [c].concat(w);
            seen[sig] = 1; out.push({ q: x[0], options: opts, answer: opts.indexOf(c), explain: x[3] || '' }); return true;
        }
        (sp.mcq || []).forEach(function (m, i) { var r = rng(seed + i * 131); add([m[0], m[1], m[2], m[3], 'x:' + m[0]], r); });
        (sp.sets || [sp]).forEach(function (S, si) { if (S.pairs) gens = gens.concat(setGens(S, 's' + si)); });
        if (sp.cats) gens = gens.concat(catGens(sp.cats, sp.catExtra || [], 'c'));
        (sp.gens || []).forEach(function (g) { gens.push(g); });
        while (out.length < POOL && tries < POOL * 30 && gens.length) {
            var g = gens[tries % gens.length], r = rng(seed + tries * 7919); tries++;
            var x; try { x = g(r); } catch (e) { x = null; }
            add(x, r);
        }
        return (CACHE[id] = out);
    }
    function X(slug, title, lesson, spec) {
        LES[PREF + slug] = lesson; SPEC[PREF + slug] = spec;
        IDX.push({ id: PREF + slug, title: title, strand: STRAND, note: lesson.i, steps: lesson.e ? lesson.e[1] : [], mistake: lesson.m || '' });
    }
    function S(name) { STRAND = name; }

    /* ---------- diagrams (inline SVG) ---------- */
    var COLS = ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#dc2626'];
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function lines(s, n) { var w = String(s).split(' '), out = [], cur = ''; w.forEach(function (x) { if ((cur + ' ' + x).trim().length > n && cur) { out.push(cur); cur = x; } else cur = (cur + ' ' + x).trim(); }); if (cur) out.push(cur); return out; }
    function wrap(hh, body) { return '<svg viewBox="0 0 340 ' + hh + '" style="width:100%;max-width:380px;display:block;margin:10px auto;" role="img" font-family="Inter,Arial,sans-serif"><rect x="2" y="2" width="336" height="' + (hh - 4) + '" rx="12" fill="#f8fafc" stroke="#cbd5e1"/>' + body + '</svg>'; }
    function txt(x, y, s, size, fill, w, anchor) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill + '"' + (w ? ' font-weight="700"' : '') + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(s) + '</text>'; }
    function title(t) { return txt(170, 24, t, 14, '#0f172a', 1, 'middle'); }
    function arrow(x1, y1, x2, y2, c) { var a = Math.atan2(y2 - y1, x2 - x1), l = 7; return '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + ' M' + x2 + ' ' + y2 + ' L' + (x2 - l * Math.cos(a - 0.5)).toFixed(1) + ' ' + (y2 - l * Math.sin(a - 0.5)).toFixed(1) + ' M' + x2 + ' ' + y2 + ' L' + (x2 - l * Math.cos(a + 0.5)).toFixed(1) + ' ' + (y2 - l * Math.sin(a + 0.5)).toFixed(1) + '" stroke="' + (c || '#64748b') + '" stroke-width="2" fill="none"/>'; }
    function lab(px, py, tx, ty, t, anchor) { var ls = lines(t, 16), o = '<path d="M' + px + ' ' + py + ' L' + tx + ' ' + ty + '" stroke="#475569" stroke-width="1"/><circle cx="' + px + '" cy="' + py + '" r="2" fill="#475569"/>'; ls.forEach(function (l, k) { o += txt(tx + (anchor === 'end' ? -3 : 3), ty + 4 + k * 12 - (ls.length - 1) * 6, l, 11, '#0f172a', 1, anchor || 'start'); }); return o; }
    function cards(t, rows) { var y = 40, b = title(t); rows.forEach(function (r, i) { var ls = lines(r[1], 31), hh = Math.max(40, ls.length * 16 + 12), c = COLS[i % 5], ll = lines(r[0], 13); b += '<rect x="12" y="' + y + '" width="104" height="' + hh + '" rx="8" fill="' + c + '"/>'; ll.forEach(function (l, k) { b += txt(64, y + hh / 2 + 4 - (ll.length - 1) * 7 + k * 14, l, 12, '#ffffff', 1, 'middle'); }); b += '<rect x="120" y="' + y + '" width="208" height="' + hh + '" rx="8" fill="#ffffff" stroke="' + c + '"/>'; ls.forEach(function (l, k) { b += txt(128, y + 20 + k * 16, l, 12, '#0f172a'); }); y += hh + 8; }); return wrap(y + 6, b); }
    function flow(t, steps) { var b = title(t), y = 40; steps.forEach(function (s, i) { var ls = lines(s, 40), hh = Math.max(32, ls.length * 16 + 10), c = COLS[i % 5]; b += '<rect x="24" y="' + y + '" width="292" height="' + hh + '" rx="8" fill="' + c + '" fill-opacity="0.14" stroke="' + c + '"/>'; ls.forEach(function (l, k) { b += txt(170, y + 20 + k * 16 - (ls.length > 1 ? 2 : 0), l, 12, '#0f172a', 0, 'middle'); }); y += hh; if (i < steps.length - 1) { b += arrow(170, y, 170, y + 15); y += 16; } }); return wrap(y + 14, b); }
    function table(t, head, rows) { var n = head.length, cw = 316 / n, b = title(t), y = 40; head.forEach(function (x, i) { b += '<rect x="' + (12 + i * cw) + '" y="' + y + '" width="' + cw + '" height="28" fill="#2563eb"/>' + txt(12 + i * cw + cw / 2, y + 19, x, 12, '#ffffff', 1, 'middle'); }); y += 28; rows.forEach(function (r, k) { var hh = 28; r.forEach(function (x, i) { hh = Math.max(hh, lines(x, Math.floor(cw / 6.6)).length * 14 + 12); }); r.forEach(function (x, i) { var ls = lines(x, Math.floor(cw / 6.6)); b += '<rect x="' + (12 + i * cw) + '" y="' + y + '" width="' + cw + '" height="' + hh + '" fill="' + (k % 2 ? '#f1f5f9' : '#ffffff') + '" stroke="#cbd5e1"/>'; ls.forEach(function (l, m) { b += txt(12 + i * cw + cw / 2, y + 18 + m * 14, l, 11.5, '#0f172a', 0, 'middle'); }); }); y += hh; }); return wrap(y + 14, b); }
    function chain(t, items, note) { var b = title(t), y = 46, per = 3, rows = Math.ceil(items.length / per), cw = 92, gap = 20; items.forEach(function (s, i) { var row = Math.floor(i / per), col = i % per, x = 12 + col * (cw + gap), yy = y + row * 62, c = COLS[i % 5], ls = lines(s, 12); b += '<rect x="' + x + '" y="' + yy + '" width="' + cw + '" height="44" rx="9" fill="' + c + '" fill-opacity="0.15" stroke="' + c + '" stroke-width="1.5"/>'; ls.forEach(function (l, k) { b += txt(x + cw / 2, yy + 24 + k * 13 - (ls.length - 1) * 6, l, 11.5, '#0f172a', 1, 'middle'); }); if (col < per - 1 && i < items.length - 1) b += arrow(x + cw + 2, yy + 22, x + cw + gap - 2, yy + 22); }); var h = y + rows * 62 + 4; if (note) { b += txt(170, h + 12, note, 11, '#475569', 0, 'middle'); h += 22; } return wrap(h + 8, b); }
    function cycle(t, nodes) { var b = title(t), cx = 170, cy = 132, rx = 100, ry = 72, n = nodes.length, pts = []; for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } for (i = 0; i < n; i++) { var p = pts[i], q = pts[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], d = Math.sqrt(dx * dx + dy * dy); b += arrow((p[0] + dx * 0.3).toFixed(1), (p[1] + dy * 0.3).toFixed(1), (p[0] + dx * 0.7).toFixed(1), (p[1] + dy * 0.7).toFixed(1), '#64748b'); } for (i = 0; i < n; i++) { var c = COLS[i % 5], ls = lines(nodes[i], 12); b += '<rect x="' + (pts[i][0] - 44) + '" y="' + (pts[i][1] - 17) + '" width="88" height="34" rx="9" fill="#fff" stroke="' + c + '" stroke-width="2"/>'; ls.forEach(function (l, k) { b += txt(pts[i][0], pts[i][1] + 4 + k * 12 - (ls.length - 1) * 6, l, 11, '#0f172a', 1, 'middle'); }); } return wrap(232, b); }
    function layers(t, ls) { var b = title(t), y = 38, hh = Math.min(46, Math.floor(190 / ls.length)); ls.forEach(function (l, i) { b += '<rect x="12" y="' + y + '" width="316" height="' + hh + '" fill="' + l[1] + '" stroke="#475569"/>'; b += txt(22, y + hh / 2 - 1, l[0], 12.5, l[3] || '#0f172a', 1); b += txt(22, y + hh / 2 + 14, l[2], 10.5, l[3] || '#0f172a'); y += hh; }); return wrap(y + 14, b); }
    function particles() { var b = title('Particles in solids, liquids and gases'), boxes = [['Solid', 'tightly packed'], ['Liquid', 'close, can slide'], ['Gas', 'far apart, move fast']]; boxes.forEach(function (bx, k) { var x = 14 + k * 108; b += '<rect x="' + x + '" y="40" width="100" height="100" rx="8" fill="#fff" stroke="' + COLS[k] + '" stroke-width="2"/>'; var i, j; if (k === 0) { for (i = 0; i < 5; i++) for (j = 0; j < 5; j++) b += '<circle cx="' + (x + 18 + i * 16) + '" cy="' + (58 + j * 16) + '" r="6" fill="' + COLS[0] + '"/>'; } else if (k === 1) { var pl = [[20, 112], [38, 118], [56, 110], [74, 118], [30, 98], [50, 96], [68, 100], [84, 108], [22, 84], [44, 80], [62, 84], [80, 92]]; pl.forEach(function (q) { b += '<circle cx="' + (x + q[0]) + '" cy="' + q[1] + '" r="6" fill="' + COLS[1] + '"/>'; }); } else { [[18, 56], [66, 52], [84, 76], [30, 90], [58, 108], [88, 124], [20, 124], [48, 72]].forEach(function (q) { b += '<circle cx="' + (x + q[0]) + '" cy="' + q[1] + '" r="6" fill="' + COLS[2] + '"/>'; }); } b += txt(x + 50, 158, bx[0], 13, '#0f172a', 1, 'middle') + txt(x + 50, 174, bx[1], 10.5, '#475569', 0, 'middle'); }); return wrap(190, b); }
    function plant() { var b = title('Parts of a flowering plant'); b += '<rect x="12" y="150" width="316" height="62" fill="#a16207" fill-opacity=".3"/><path d="M170 150 L170 196 M170 164 L140 188 M170 164 L200 188 M170 178 L150 204 M170 178 L192 204" stroke="#92400e" stroke-width="3" fill="none"/><rect x="166" y="62" width="8" height="90" fill="#16a34a"/><ellipse cx="138" cy="112" rx="28" ry="11" fill="#22c55e" transform="rotate(-25 138 112)"/><ellipse cx="203" cy="96" rx="28" ry="11" fill="#22c55e" transform="rotate(25 203 96)"/>'; for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; b += '<circle cx="' + (170 + 13 * Math.cos(a)).toFixed(1) + '" cy="' + (50 + 13 * Math.sin(a)).toFixed(1) + '" r="9" fill="#f472b6"/>'; } b += '<circle cx="170" cy="50" r="7" fill="#facc15"/>' + lab(184, 46, 232, 40, 'Flower makes seeds') + lab(120, 106, 60, 82, 'Leaf makes food', 'end') + lab(168, 128, 60, 132, 'Stem carries water and food', 'end') + lab(190, 186, 236, 186, 'Roots take in water'); return wrap(222, b); }
    function seeds() { var b = title('A seed grows into a plant'), st = [['1 Seed', 0], ['2 Root grows', 1], ['3 Shoot grows', 2], ['4 Leaves open', 3]]; st.forEach(function (s, k) { var x = 12 + k * 80; b += '<rect x="' + x + '" y="40" width="74" height="130" rx="8" fill="#fff" stroke="#cbd5e1"/><rect x="' + x + '" y="100" width="74" height="70" fill="#a16207" fill-opacity=".3"/>'; var cx = x + 37; if (k === 0) b += '<ellipse cx="' + cx + '" cy="130" rx="9" ry="6" fill="#b45309"/>'; if (k === 1) b += '<ellipse cx="' + cx + '" cy="122" rx="9" ry="6" fill="#b45309"/><path d="M' + cx + ' 128 L' + cx + ' 158" stroke="#92400e" stroke-width="3"/>'; if (k >= 2) b += '<path d="M' + cx + ' 128 L' + cx + ' 160" stroke="#92400e" stroke-width="3"/><path d="M' + cx + ' 122 L' + cx + ' ' + (k === 2 ? 84 : 66) + '" stroke="#16a34a" stroke-width="4"/>'; if (k === 2) b += '<ellipse cx="' + (cx - 8) + '" cy="84" rx="8" ry="4" fill="#22c55e"/>'; if (k === 3) b += '<ellipse cx="' + (cx - 12) + '" cy="72" rx="12" ry="5" fill="#22c55e" transform="rotate(-20 ' + (cx - 12) + ' 72)"/><ellipse cx="' + (cx + 12) + '" cy="70" rx="12" ry="5" fill="#22c55e" transform="rotate(20 ' + (cx + 12) + ' 70)"/>'; b += txt(cx, 190, s[0], 11.5, '#0f172a', 1, 'middle'); }); b += txt(170, 212, 'Needs water, air and warmth to germinate', 11, '#475569', 0, 'middle'); return wrap(224, b); }
    function waterCycle() { var b = title('The water cycle'); b += '<circle cx="290" cy="56" r="18" fill="#facc15"/><ellipse cx="150" cy="68" rx="42" ry="18" fill="#cbd5e1"/><ellipse cx="124" cy="76" rx="26" ry="13" fill="#cbd5e1"/><ellipse cx="180" cy="78" rx="28" ry="13" fill="#cbd5e1"/><path d="M40 210 L130 140 L170 175 L210 125 L300 210 Z" fill="#86efac" stroke="#15803d"/><rect x="12" y="200" width="316" height="22" fill="#38bdf8" fill-opacity=".7"/>' + arrow(260, 190, 260, 100, '#dc2626') + txt(266, 150, 'Evaporation', 10.5, '#dc2626', 1) + txt(150, 112, 'Condensation', 10.5, '#475569', 1, 'middle') + arrow(118, 98, 118, 150, '#2563eb') + txt(24, 132, 'Rain', 11, '#2563eb', 1) + arrow(70, 188, 40, 206, '#2563eb') + txt(24, 170, 'Runoff to rivers', 10, '#2563eb', 0); return wrap(232, b); }
    function skeleton() { var b = title('The human skeleton'); b += '<circle cx="150" cy="56" r="16" fill="#f1f5f9" stroke="#334155" stroke-width="2"/><path d="M150 72 L150 150 M150 82 L116 96 L106 150 M150 82 L184 96 L194 150 M150 150 L130 220 M150 150 L170 220" stroke="#334155" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="150" cy="108" rx="24" ry="30" fill="none" stroke="#334155" stroke-width="2"/><path d="M130 100 L170 100 M130 112 L170 112 M132 124 L168 124" stroke="#334155" stroke-width="1.5"/><rect x="132" y="146" width="36" height="10" rx="5" fill="#f1f5f9" stroke="#334155" stroke-width="2"/>' + lab(160, 50, 236, 44, 'Skull protects the brain') + lab(170, 112, 236, 100, 'Ribs protect the heart and lungs') + lab(150, 130, 236, 136, 'Backbone (spine)') + lab(150, 150, 236, 170, 'Pelvis') + lab(130, 185, 60, 196, 'Leg bones', 'end') + lab(112, 120, 54, 110, 'Arm bones', 'end'); return wrap(238, b); }
    function digestive() { var b = title('Path of food through the body'); var stages = [['Mouth', 'chews and mixes food with saliva', '#2563eb'], ['Gullet', 'moves food to the stomach', '#0d9488'], ['Stomach', 'churns food with juices', '#d97706'], ['Small intestine', 'digests food, absorbs nutrients', '#7c3aed'], ['Large intestine', 'absorbs water, forms waste', '#dc2626']]; var y = 36; stages.forEach(function (s, i) { b += '<rect x="20" y="' + y + '" width="86" height="28" rx="8" fill="' + s[2] + '"/>' + txt(63, y + 18, s[0], 11, '#ffffff', 1, 'middle') + txt(114, y + 18, s[1], 11, '#0f172a'); if (i < 4) b += arrow(63, y + 29, 63, y + 41); y += 42; }); b += txt(170, y + 6, 'Waste leaves through the anus', 11, '#475569', 0, 'middle'); return wrap(y + 22, b); }
    function lungs() { var b = title('Breathing: air in and out'); b += '<rect x="162" y="38" width="16" height="70" rx="6" fill="#cbd5e1" stroke="#64748b"/><path d="M170 108 L130 130 M170 108 L210 130" stroke="#64748b" stroke-width="6" fill="none"/><ellipse cx="124" cy="152" rx="40" ry="54" fill="#fda4af" stroke="#be123c" stroke-width="2"/><ellipse cx="216" cy="152" rx="40" ry="54" fill="#fda4af" stroke="#be123c" stroke-width="2"/><path d="M60 214 Q170 232 280 214" stroke="#7c3aed" stroke-width="4" fill="none"/>' + arrow(190, 52, 190, 90, '#2563eb') + arrow(150, 90, 150, 52, '#dc2626') + lab(172, 60, 250, 50, 'Windpipe (trachea)') + lab(100, 150, 34, 124, 'Lungs', 'end') + lab(170, 224, 250, 230, 'Diaphragm') + txt(196, 70, 'in', 10, '#2563eb', 1) + txt(132, 70, 'out', 10, '#dc2626', 1, 'end'); return wrap(244, b); }
    function heart() { var b = title('The heart has four chambers'); b += '<path d="M170 196 C80 150 92 78 142 86 C158 88 166 96 170 106 C174 96 182 88 198 86 C248 78 260 150 170 196 Z" fill="#fecaca" stroke="#dc2626" stroke-width="2.5"/><path d="M170 106 L170 190 M112 140 L228 140" stroke="#dc2626" stroke-width="1.5"/>' + lab(130, 112, 50, 74, 'Right atrium (blood from body)', 'end') + lab(210, 112, 290, 74, 'Left atrium (blood from lungs)') + lab(130, 166, 50, 188, 'Right ventricle (to lungs)', 'end') + lab(210, 166, 290, 188, 'Left ventricle (to body)') + txt(170, 224, 'Seen as if the person faces you', 10.5, '#475569', 0, 'middle'); return wrap(236, b); }
    function phScale() { var b = title('The pH scale'), cs = ['#dc2626', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#a3e635', '#4ade80', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#7c3aed', '#6d28d9']; cs.forEach(function (c, i) { b += '<rect x="' + (14 + i * 22.5) + '" y="44" width="22.5" height="44" fill="' + c + '"/>' + txt(14 + i * 22.5 + 11, 106, i + 1, 11, '#0f172a', 1, 'middle'); }); b += txt(14, 130, 'Acid (below 7)', 12, '#b91c1c', 1) + txt(170, 130, 'Neutral 7', 12, '#15803d', 1, 'middle') + txt(326, 130, 'Base (above 7)', 12, '#6d28d9', 1, 'end') + txt(170, 156, 'Lemon juice about 2 | Water 7 | Soap about 10', 11, '#475569', 0, 'middle'); return wrap(172, b); }
    function triangle(t, a, b2, c, mid) { var b = title(t); b += '<circle cx="124" cy="96" r="44" fill="#ef4444" fill-opacity=".25" stroke="#ef4444" stroke-width="2"/><circle cx="216" cy="96" r="44" fill="#f59e0b" fill-opacity=".25" stroke="#f59e0b" stroke-width="2"/><circle cx="170" cy="150" r="44" fill="#2563eb" fill-opacity=".25" stroke="#2563eb" stroke-width="2"/>' + txt(104, 92, a, 12, '#0f172a', 1, 'middle') + txt(236, 92, b2, 12, '#0f172a', 1, 'middle') + txt(170, 172, c, 12, '#0f172a', 1, 'middle') + txt(170, 124, mid, 11, '#0f172a', 1, 'middle'); return wrap(212, b); }

    /* layout fixes (later declarations replace the earlier ones) */
    function lab(px, py, tx, ty, t, anchor, n) { var ls = lines(t, n || 16), o = '<path d="M' + px + ' ' + py + ' L' + tx + ' ' + ty + '" stroke="#475569" stroke-width="1"/><circle cx="' + px + '" cy="' + py + '" r="2" fill="#475569"/>'; ls.forEach(function (l, k) { o += txt(tx + (anchor === 'end' ? -3 : 3), ty + 4 + k * 12 - (ls.length - 1) * 6, l, 11, '#0f172a', 1, anchor || 'start'); }); return o; }
    function chain(t, items, note) { var b = title(t), n = items.length, vert = n > 3, y = 44; if (vert) { items.forEach(function (s, i) { var c = COLS[i % 5]; b += '<rect x="50" y="' + y + '" width="240" height="32" rx="9" fill="' + c + '" fill-opacity="0.15" stroke="' + c + '" stroke-width="1.5"/>' + txt(170, y + 21, s, 12, '#0f172a', 1, 'middle'); y += 32; if (i < n - 1) { b += arrow(170, y + 1, 170, y + 15); y += 16; } }); } else { items.forEach(function (s, i) { var x = 12 + i * 112, c = COLS[i % 5], ls = lines(s, 12); b += '<rect x="' + x + '" y="' + y + '" width="92" height="46" rx="9" fill="' + c + '" fill-opacity="0.15" stroke="' + c + '" stroke-width="1.5"/>'; ls.forEach(function (l, k) { b += txt(x + 46, y + 25 + k * 13 - (ls.length - 1) * 6, l, 11.5, '#0f172a', 1, 'middle'); }); if (i < n - 1) b += arrow(x + 94, y + 23, x + 110, y + 23); }); y += 46; } if (note) { b += txt(170, y + 18, note, 11, '#475569', 0, 'middle'); y += 22; } return wrap(y + 14, b); }
    function plant() { var b = title('Parts of a flowering plant'); b += '<rect x="12" y="150" width="316" height="62" fill="#a16207" fill-opacity=".3"/><path d="M170 150 L170 196 M170 164 L140 188 M170 164 L200 188 M170 178 L150 204 M170 178 L192 204" stroke="#92400e" stroke-width="3" fill="none"/><rect x="166" y="62" width="8" height="90" fill="#16a34a"/><ellipse cx="138" cy="112" rx="28" ry="11" fill="#22c55e" transform="rotate(-25 138 112)"/><ellipse cx="203" cy="96" rx="28" ry="11" fill="#22c55e" transform="rotate(25 203 96)"/>'; for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; b += '<circle cx="' + (170 + 13 * Math.cos(a)).toFixed(1) + '" cy="' + (50 + 13 * Math.sin(a)).toFixed(1) + '" r="9" fill="#f472b6"/>'; } b += '<circle cx="170" cy="50" r="7" fill="#facc15"/>' + lab(184, 46, 226, 40, 'Flower makes seeds', 0, 14) + lab(122, 106, 104, 76, 'Leaf makes food', 'end', 14) + lab(166, 132, 108, 132, 'Stem holds the plant up', 'end', 14) + lab(190, 186, 226, 186, 'Roots take in water', 0, 14); return wrap(222, b); }
    function skeleton() { var b = title('The human skeleton'); b += '<circle cx="150" cy="56" r="16" fill="#f1f5f9" stroke="#334155" stroke-width="2"/><path d="M150 72 L150 150 M150 82 L116 96 L106 150 M150 82 L184 96 L194 150 M150 150 L130 220 M150 150 L170 220" stroke="#334155" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="150" cy="108" rx="24" ry="30" fill="none" stroke="#334155" stroke-width="2"/><path d="M130 100 L170 100 M130 112 L170 112 M132 124 L168 124" stroke="#334155" stroke-width="1.5"/><rect x="132" y="146" width="36" height="10" rx="5" fill="#f1f5f9" stroke="#334155" stroke-width="2"/>' + lab(160, 50, 214, 44, 'Skull protects the brain', 0, 14) + lab(170, 112, 214, 100, 'Ribs protect heart and lungs', 0, 14) + lab(150, 130, 214, 138, 'Backbone (spine)', 0, 14) + lab(150, 150, 214, 170, 'Pelvis', 0, 14) + lab(130, 185, 100, 196, 'Leg bones', 'end', 14) + lab(110, 120, 80, 110, 'Arm bones', 'end', 14); return wrap(238, b); }
    function digestive() { var b = title('Path of food through the body'); var stages = [['Mouth', 'chews and mixes with saliva', '#2563eb'], ['Gullet', 'moves food to the stomach', '#0d9488'], ['Stomach', 'churns food with juices', '#d97706'], ['Small intestine', 'digests and absorbs food', '#7c3aed'], ['Large intestine', 'absorbs water, forms waste', '#dc2626']]; var y = 36; stages.forEach(function (s, i) { b += '<rect x="14" y="' + y + '" width="116" height="28" rx="8" fill="' + s[2] + '"/>' + txt(72, y + 18, s[0], 11.5, '#ffffff', 1, 'middle') + txt(138, y + 18, s[1], 11, '#0f172a'); if (i < 4) b += arrow(72, y + 29, 72, y + 41); y += 42; }); b += txt(170, y + 6, 'Waste leaves through the anus', 11, '#475569', 0, 'middle'); return wrap(y + 22, b); }
    function heart() { var b = title('The heart has four chambers'); b += '<g transform="translate(170 140) scale(.7) translate(-170 -140)"><path d="M170 196 C80 150 92 78 142 86 C158 88 166 96 170 106 C174 96 182 88 198 86 C248 78 260 150 170 196 Z" fill="#fecaca" stroke="#dc2626" stroke-width="2.5"/><path d="M170 106 L170 190 M112 140 L228 140" stroke="#dc2626" stroke-width="1.5"/></g>' + lab(142, 120, 104, 70, 'Right atrium (from body)', 'end', 14) + lab(198, 120, 236, 70, 'Left atrium (from lungs)', 0, 14) + lab(142, 158, 104, 190, 'Right ventricle (to lungs)', 'end', 14) + lab(198, 158, 236, 190, 'Left ventricle (to body)', 0, 14) + txt(170, 226, 'Drawn as if the person faces you', 10.5, '#475569', 0, 'middle'); return wrap(238, b); }
    function seeds() { var b = title('A seed grows into a plant'), st = [['1 Seed', 0], ['2 Root', 1], ['3 Shoot', 2], ['4 Leaves', 3]]; st.forEach(function (s, k) { var x = 12 + k * 80; b += '<rect x="' + x + '" y="40" width="74" height="130" rx="8" fill="#fff" stroke="#cbd5e1"/><rect x="' + x + '" y="100" width="74" height="70" fill="#a16207" fill-opacity=".3"/>'; var cx = x + 37; if (k === 0) b += '<ellipse cx="' + cx + '" cy="130" rx="9" ry="6" fill="#b45309"/>'; if (k === 1) b += '<ellipse cx="' + cx + '" cy="122" rx="9" ry="6" fill="#b45309"/><path d="M' + cx + ' 128 L' + cx + ' 158" stroke="#92400e" stroke-width="3"/>'; if (k >= 2) b += '<path d="M' + cx + ' 128 L' + cx + ' 160" stroke="#92400e" stroke-width="3"/><path d="M' + cx + ' 122 L' + cx + ' ' + (k === 2 ? 84 : 66) + '" stroke="#16a34a" stroke-width="4"/>'; if (k === 2) b += '<ellipse cx="' + (cx - 8) + '" cy="84" rx="8" ry="4" fill="#22c55e"/>'; if (k === 3) b += '<ellipse cx="' + (cx - 12) + '" cy="72" rx="12" ry="5" fill="#22c55e" transform="rotate(-20 ' + (cx - 12) + ' 72)"/><ellipse cx="' + (cx + 12) + '" cy="70" rx="12" ry="5" fill="#22c55e" transform="rotate(20 ' + (cx + 12) + ' 70)"/>'; b += txt(cx, 190, s[0], 11.5, '#0f172a', 1, 'middle'); }); b += txt(170, 212, 'Needs water, air and warmth to germinate', 11, '#475569', 0, 'middle'); return wrap(224, b); }
    function waterCycle() { var b = title('The water cycle'); b += '<circle cx="290" cy="56" r="18" fill="#facc15"/><ellipse cx="150" cy="68" rx="42" ry="18" fill="#cbd5e1"/><ellipse cx="124" cy="76" rx="26" ry="13" fill="#cbd5e1"/><ellipse cx="180" cy="78" rx="28" ry="13" fill="#cbd5e1"/><path d="M40 210 L130 140 L170 175 L210 125 L300 210 Z" fill="#86efac" stroke="#15803d"/><rect x="12" y="200" width="316" height="22" fill="#38bdf8" fill-opacity=".7"/>' + arrow(248, 190, 248, 100, '#dc2626') + txt(254, 150, 'Evaporation', 10.5, '#dc2626', 1) + txt(150, 112, 'Condensation', 10.5, '#475569', 1, 'middle') + arrow(118, 98, 118, 150, '#2563eb') + txt(24, 132, 'Rain', 11, '#2563eb', 1) + arrow(70, 188, 40, 206, '#2563eb') + txt(24, 170, 'Runoff to rivers', 10, '#2563eb', 0); return wrap(232, b); }
    var D = { cards: cards, flow: flow, table: table, chain: chain, cycle: cycle, layers: layers, particles: particles, plant: plant, seeds: seeds, waterCycle: waterCycle, skeleton: skeleton, digestive: digestive, lungs: lungs, heart: heart, phScale: phScale, triangle: triangle, wrap: wrap, txt: txt, title: title, arrow: arrow, lab: lab, lines: lines, esc: esc, COLS: COLS };

    var api = {
        POOL: POOL, ids: function () { return Object.keys(SPEC); }, has: function (id) { return !!SPEC[id]; },
        pool: function (id) { return build(id).length; },
        get: function (id, i) { var b = build(id); return b.length ? b[((i % b.length) + b.length) % b.length] : null; },
        lessons: LES, index: function () { return IDX; }, spec: SPEC,
        h: { X: X, S: S, D: D, cap: cap, an: an, rng: rng, ri: ri, P: P, shuf: shuf, NM: NM, hash: hash }
    };
    if (root.CMLearnBst) { /* already loaded: keep the first copy */ if (typeof module !== 'undefined') module.exports = root.CMLearnBst; return; }
    root.CMLearnBst = api;
    var G = root.CMLearnGen;
    if (G && !G.__bst) {
        var og = G.get, op = G.poolOf;
        G.get = function (id, i) { return root.CMLearnBst.has(id) ? root.CMLearnBst.get(id, i) : og(id, i); };
        G.poolOf = function (id) { return root.CMLearnBst.has(id) ? root.CMLearnBst.pool(id) : (op ? op(id) : G.POOL); };
        G.__bst = 1;
    }
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
    var h = root.CMLearnBst.h, X = h.X, S = h.S, D = h.D;
    S("Living Things");

    X("living-nonliving", "Living and non-living things", {
        i: "Living things (organisms) grow, feed, breathe, move, sense changes, make waste and reproduce. Non-living things do none of these things.",
        r: "A goat on the school field is living. The stone it stands on is non-living. A dead log was once living but no longer does these things.",
        k: ["Living things: plants, animals and tiny microorganisms.", "Non-living things: stone, water, air, plastic, metal.", "A living thing must show all the life processes.", "Something that has died is no longer living."],
        e: ["Is a mushroom living or non-living?", ["Does it grow? Yes.", "Does it reproduce with spores? Yes.", "So it shows life processes."], "Living"],
        d: D.cards("Living and non-living", [["Living", "goat, tree, hen, mushroom, human"], ["Non-living", "stone, water, plastic, iron nail, sand"], ["Life processes", "nutrition, respiration, growth, movement, sensitivity, excretion, reproduction"]]),
        m: "Thinking that anything that moves is living. A car and a river move but are not alive."
    }, {
        mcq: [["Which of these is a living thing?", "Mango tree", ["Stone", "Plastic cup", "Water"], "A mango tree grows, feeds and reproduces."], ["Which of these is NOT a characteristic of living things?", "Never changes size", ["Grows", "Breathes", "Reproduces"], "Living things grow, so they change size."], ["How many life processes are listed in this lesson?", "Seven", ["Three", "Five", "Ten"], "Nutrition, respiration, growth, movement, sensitivity, excretion and reproduction."]],
        cats: { "living thing": ["goat", "mango tree", "hen", "mushroom", "frog", "ant", "grass", "fish", "bean plant", "monkey"], "non-living thing": ["stone", "plastic bottle", "iron nail", "sand", "table", "book", "spoon", "chalk", "bucket", "bicycle"] },
        catExtra: ["dead thing", "man-made thing"],
        pairs: [["plant", "a living thing that makes its own food using sunlight"], ["living thing", "a thing that grows, feeds, breathes and reproduces"], ["non-living thing", "a thing that has never been alive and does not grow or breathe"], ["habitat", "the place where a plant or animal lives"], ["nutrition", "the way living things get and use food", 0], ["respiration", "the way living things use oxygen to release energy from food", 0], ["excretion", "the removal of waste made by the body", 0], ["reproduction", "the making of new living things of the same kind", 0], ["growth", "an increase in size and mass", 0], ["movement", "a change in position or place", 0], ["sensitivity", "the ability to detect and respond to changes around us", 0], ["stimulus", "a change around a living thing that it can detect"], ["microorganism", "a living thing too small to see without a microscope"], ["offspring", "the young one produced by a living thing"], ["lifespan", "the length of time a living thing lives"], ["decay", "the breaking down of dead plants and animals", 0]]
    });

    X("characteristics", "Characteristics of living things", {
        i: "All living things carry out seven life processes: movement, respiration, sensitivity, growth, reproduction, excretion and nutrition (remember MRS GREN).",
        r: "A touch-me-not plant folds its leaves when you touch it (sensitivity). A hen lays eggs (reproduction). You sweat and pass urine (excretion).",
        k: ["M - Movement, R - Respiration, S - Sensitivity.", "G - Growth, R - Reproduction, E - Excretion, N - Nutrition.", "Plants make their own food; animals eat food.", "Plants move mostly by growing towards light."],
        e: ["Name the process when a seed grows into a tree.", ["A tree becomes taller and wider.", "An increase in size is called growth."], "Growth"],
        d: D.table("MRS GREN", ["Letter", "Process"], [["M", "Movement"], ["R", "Respiration"], ["S", "Sensitivity"], ["G", "Growth"], ["R", "Reproduction"], ["E", "Excretion"], ["N", "Nutrition"]]),
        m: "Saying plants do not move or breathe. Plants move parts of their body slowly and respire all the time."
    }, {
        mcq: [["Which letter in MRS GREN stands for removing waste?", "E", ["M", "S", "N"], "E is for excretion."], ["Which process uses oxygen to release energy from food?", "Respiration", ["Excretion", "Growth", "Movement"], "Respiration releases energy."], ["A plant bends towards the window. This shows:", "Sensitivity", ["Excretion", "Reproduction", "Nutrition"], "The plant responds to light."]],
        style: "fact", ctx: "living thing",
        pairs: [["a plant", "makes its own food using sunlight"], ["an animal", "gets food by eating plants or other animals"], ["a seed", "grows into a new plant when it gets water, air and warmth"], ["a hen", "sits on its eggs to keep them warm until the chicks hatch"], ["a goat", "feeds its young on milk from its body"], ["a tree", "adds a new ring of wood to its trunk each year"], ["a fish", "takes in oxygen from water through its gills"], ["a sunflower", "turns its flower towards the sun"], ["a touch-me-not plant", "folds its leaves when touched"], ["a snail", "moves on one muscular foot and leaves a slimy trail"], ["an eagle", "flies high on its wings to look for food"], ["a caterpillar", "grows by eating leaves and shedding its skin"], ["a mushroom", "reproduces by releasing tiny spores"], ["an earthworm", "breathes through its moist skin"], ["a frog", "lays jelly-like eggs in water that hatch into tadpoles"], ["a bat", "hangs upside down to rest"]]
    });

    X("classification", "Classification of living things", {
        i: "Classification means sorting living things into groups by features they share. The two big groups are plants and animals, with fungi and microorganisms too.",
        r: "In the market you sort vegetables, fruits and grains. Scientists sort animals into mammals, birds, fish, reptiles, amphibians and insects.",
        k: ["Animals: vertebrates (backbone) and invertebrates (no backbone).", "Vertebrates: mammals, birds, fish, reptiles, amphibians.", "Plants: flowering and non-flowering.", "Fungi (mushroom) and bacteria are neither plants nor animals."],
        e: ["Put a bat in a group.", ["It has fur and feeds its young on milk.", "These are features of mammals."], "Mammal"],
        d: D.flow("Classifying living things", ["Living things", "Plants - Animals - Fungi - Microorganisms", "Animals: vertebrates and invertebrates", "Vertebrates: mammals, birds, fish, reptiles, amphibians"]),
        m: "Thinking a bat is a bird because it flies. A bat has fur and feeds its young milk, so it is a mammal."
    }, {
        mcq: [["Which group has feathers and lays eggs?", "Birds", ["Mammals", "Fish", "Reptiles"], "Birds have feathers."], ["A whale is a:", "Mammal", ["Fish", "Reptile", "Amphibian"], "Whales breathe air and feed milk to their young."]],
        cats: { "mammal": ["goat", "dog", "cow", "bat", "whale", "lion", "monkey"], "bird": ["hen", "eagle", "duck", "parrot", "owl", "ostrich"], "fish": ["tilapia", "catfish", "shark", "mackerel"], "reptile": ["lizard", "snake", "crocodile", "tortoise"], "insect": ["ant", "housefly", "butterfly", "bee", "cockroach", "mosquito"] },
        style: "fact", ctx: "group of living things",
        pairs: [["a mammal", "has hair or fur and feeds its young on milk"], ["a bird", "has feathers and lays eggs"], ["a fish", "has gills and scales and lives in water"], ["a reptile", "has dry scaly skin and lays eggs on land"], ["an amphibian", "spends part of its life in water and part on land"], ["an insect", "has six legs and three body parts"], ["a spider", "has eight legs and two body parts"], ["a flowering plant", "makes flowers and seeds"], ["a fern", "reproduces with spores and has no flowers"], ["a moss", "is a small plant that grows in damp places and has no real roots"], ["a mushroom", "is a fungus that cannot make its own food"], ["a bacterium", "is a tiny living thing seen only with a microscope"], ["a herbivore", "eats only plants"], ["a carnivore", "eats only meat"], ["a bat", "is the only mammal that can truly fly"], ["a pine tree", "makes its seeds inside cones"]]
    });

    X("plant-parts", "Parts of a plant and their functions", {
        i: "A flowering plant has roots, a stem, leaves, flowers, fruits and seeds. Each part has its own job.",
        r: "Cassava roots store food. Fluted pumpkin leaves make food. A mango fruit protects the seed inside.",
        k: ["Root: anchors the plant and takes in water and minerals.", "Stem: holds the plant up and carries water and food.", "Leaf: makes food by photosynthesis.", "Flower makes seeds; fruit protects seeds."],
        e: ["Which part takes in water from the soil?", ["Water comes from the ground.", "The part in the soil is the root."], "Root"],
        d: D.plant(),
        m: "Saying the leaves take in water from the soil. Roots do that; leaves make food."
    }, {
        mcq: [["Which part of a plant makes food?", "Leaf", ["Root", "Fruit", "Petal"], "Leaves contain chlorophyll."], ["Which part grows into a new plant?", "Seed", ["Petal", "Leaf", "Stem"], "A seed grows into a plant."]],
        ctx: "part of a plant",
        pairs: [["root", "take in water and minerals from the soil"], ["stem", "support the plant and hold up its leaves and flowers"], ["leaf", "make food for the plant by photosynthesis"], ["flower", "make seeds for new plants"], ["fruit", "protect the seeds and help them to spread"], ["seed", "grow into a new plant"], ["petal", "attract insects to the flower"], ["sepal", "protect the flower while it is a bud"], ["stamen", "produce pollen"], ["stigma", "catch pollen grains"], ["ovary", "become the fruit after fertilisation"], ["ovule", "become the seed after fertilisation"], ["xylem", "carry water upwards from the roots"], ["phloem", "carry food from the leaves to other parts"], ["stoma", "let air move in and out of the leaf"], ["root cap", "protect the tip of the root as it pushes through soil"]]
    });

    X("flowering-nonflowering", "Flowering and non-flowering plants", {
        i: "Flowering plants make flowers, fruits and seeds. Non-flowering plants, like ferns, mosses and pine trees, do not make flowers.",
        r: "Mango, maize and beans are flowering plants. A fern growing on a damp wall makes spores instead of seeds.",
        k: ["Flowering: mango, maize, beans, hibiscus.", "Non-flowering: ferns, mosses, pine, cycads.", "Ferns and mosses use spores.", "Pine and cycads make seeds in cones."],
        e: ["Is a fern a flowering plant?", ["Does it make flowers? No.", "It reproduces with spores."], "No, it is non-flowering"],
        d: D.cards("Two plant groups", [["Flowering", "makes flowers and seeds (mango, maize, bean)"], ["Non-flowering", "no flowers: fern, moss, pine"], ["Seed leaves", "monocot: one seed leaf; dicot: two"]]),
        m: "Thinking a pine tree has flowers. Pine seeds grow in cones."
    }, {
        cats: { "flowering plant": ["mango", "maize", "bean", "hibiscus", "orange", "groundnut", "pawpaw", "rose", "sunflower", "tomato"], "non-flowering plant": ["fern", "moss", "pine tree", "cycad", "liverwort", "horsetail"] },
        catExtra: ["fungus", "animal"],
        pairs: [["spore", "a tiny cell that grows into a new fern or moss"], ["cone", "the part of a pine tree where seeds are made"], ["pollination", "the movement of pollen from one flower to another", 0], ["monocotyledon", "a plant whose seed has one seed leaf"], ["dicotyledon", "a plant whose seed has two seed leaves"], ["pollen", "the yellow dust made by the male part of a flower", 0], ["nectar", "the sweet liquid that insects collect from flowers", 0], ["fruit", "the part of a flowering plant that holds the seeds"], ["flower", "the part of a plant that makes seeds"], ["pollinator", "an animal that carries pollen from flower to flower"], ["fertilisation", "the joining of male and female cells to make a seed", 0], ["seed dispersal", "the spreading of seeds away from the parent plant", 0], ["cotyledon", "the seed leaf that stores food inside a seed"], ["non-flowering plant", "a plant that does not make flowers"], ["flowering plant", "a plant that makes flowers and seeds"], ["frond", "the leaf of a fern"]]
    });

    X("photosynthesis", "Photosynthesis", {
        i: "Photosynthesis is how green plants make food. Using sunlight, they change carbon dioxide and water into sugar (glucose) and give out oxygen.",
        r: "A maize farm in sunshine is a food factory. The plants make food and also give out the oxygen we breathe.",
        k: ["Needs: sunlight, water, carbon dioxide and chlorophyll.", "Makes: glucose (food) and oxygen.", "Leaves take in carbon dioxide through stomata.", "Extra sugar is stored as starch."],
        e: ["What gas do plants give out in photosynthesis?", ["Plants take in carbon dioxide.", "They release the other gas, oxygen."], "Oxygen"],
        d: D.flow("Photosynthesis", ["Sunlight + water + carbon dioxide (inputs)", "Chlorophyll in the leaf traps sunlight", "Glucose (food) is made", "Oxygen is given out"]),
        m: "Saying plants take in oxygen for photosynthesis. They take in carbon dioxide and give out oxygen."
    }, {
        mcq: [["Which gas do plants take in for photosynthesis?", "Carbon dioxide", ["Oxygen", "Nitrogen", "Hydrogen"], "Plants use carbon dioxide."], ["Where in a plant does photosynthesis mainly happen?", "Leaves", ["Roots", "Fruit", "Seeds"], "Leaves contain most chlorophyll."], ["Which is NOT needed for photosynthesis?", "Oxygen", ["Sunlight", "Water", "Carbon dioxide"], "Oxygen is a product, not an input."]],
        pairs: [["photosynthesis", "the way green plants make food using sunlight, water and carbon dioxide", 0], ["chlorophyll", "the green substance in leaves that traps sunlight", 0], ["chloroplast", "the tiny part of a leaf cell that contains chlorophyll"], ["stoma", "a tiny hole in a leaf that lets gases in and out"], ["glucose", "the sugar that plants make during photosynthesis", 0], ["starch", "the food that plants store, made from extra sugar", 0], ["carbon dioxide", "the gas that plants take in from the air for photosynthesis", 0], ["oxygen", "the gas that plants give out during photosynthesis", 0], ["sunlight", "the energy used by green plants to make food", 0], ["producer", "a living thing that makes its own food"], ["consumer", "a living thing that eats other living things for food"], ["transpiration", "the loss of water vapour from the leaves of a plant", 0], ["xylem", "the tube that carries water up the plant", 0], ["phloem", "the tube that carries food from the leaves to other parts", 0], ["variegated leaf", "a leaf with green and white parts"], ["iodine solution", "the liquid that turns blue-black when starch is present", 0]]
    });

    X("plant-reproduction", "Reproduction in plants", {
        i: "Flowering plants reproduce by seeds. Pollen moves to the stigma (pollination), the male and female cells join (fertilisation), and the ovule becomes a seed. Some plants also grow from stems or tubers.",
        r: "Bees carry pollen from one mango flower to another. A yam tuber planted in the soil grows into a new yam plant.",
        k: ["Pollination: pollen moves to the stigma.", "Agents: wind, insects, water and birds.", "Seed dispersal: wind, water, animals or explosion.", "Vegetative reproduction: stems, tubers, cuttings."],
        e: ["Which agent spreads a coconut?", ["Coconuts float.", "They are carried by water."], "Water"],
        d: D.flow("From flower to new plant", ["Pollination - pollen reaches the stigma", "Fertilisation - the ovule is fertilised", "Seed forms inside the fruit", "Seed dispersal - wind, water, animals", "Germination - a new plant grows"]),
        m: "Confusing pollination with fertilisation. Pollination is the carrying of pollen; fertilisation is the joining of cells."
    }, {
        cats: { "plant whose seeds are spread by wind": ["silk cotton", "dandelion", "cotton", "tridax"], "plant whose seeds are spread by animals": ["black jack", "mango", "guava", "pawpaw"], "plant whose seeds are spread by water": ["coconut", "water lily", "mangrove", "raffia palm"], "plant whose seeds are spread by explosion": ["bean", "pea", "castor oil plant", "flamboyant"] },
        pairs: [["pollen", "the yellow dust made by the male part of a flower", 0], ["anther", "the part of the stamen that makes pollen"], ["fertilisation", "the joining of a male cell and a female cell in a flower", 0], ["ovule", "the part inside the ovary that becomes a seed"], ["seed dispersal", "the spreading of seeds away from the parent plant", 0], ["wind dispersal", "the spreading of light seeds by moving air", 0], ["animal dispersal", "the carrying of seeds by animals in their fur or stomachs", 0], ["water dispersal", "the carrying of floating seeds by water", 0], ["explosive dispersal", "the throwing out of seeds when a dry pod bursts", 0], ["stigma", "the sticky top of the female part of a flower that catches pollen"], ["self-pollination", "the moving of pollen to a stigma on the same plant", 0], ["cross-pollination", "the moving of pollen to a flower on a different plant", 0], ["pollinator", "an animal that carries pollen from flower to flower"], ["nectar", "the sweet liquid that attracts insects to a flower", 0], ["vegetative reproduction", "the growth of a new plant from a part of the parent plant", 0], ["cutting", "a piece of stem planted to grow a new plant"], ["tuber", "a swollen underground stem that can grow a new plant"]]
    });

    X("germination", "Seed germination", {
        i: "Germination is the growth of a seed into a young plant. A seed needs water, air (oxygen) and a suitable warmth. It does not need light until the leaves grow.",
        r: "Beans soaked in water and kept warm sprout in a few days. Dry beans in a tin stay unchanged.",
        k: ["Conditions: water, oxygen, warmth.", "First the radicle (root) grows, then the plumule (shoot).", "The cotyledons feed the seedling.", "Seeds in dry or very cold places do not germinate."],
        e: ["Why does a seed in dry cotton wool not germinate?", ["Seeds need water.", "Dry wool gives no water."], "No water"],
        d: D.seeds(),
        m: "Saying seeds need light to germinate. They need water, air and warmth."
    }, {
        mcq: [["A seed under water for many days may not germinate because it lacks:", "Oxygen", ["Sunlight", "Soil", "Wind"], "Water drives out the air."], ["Which part of a seed grows first?", "Radicle", ["Plumule", "Testa", "Fruit"], "The radicle becomes the root."], ["Which is NOT needed for germination?", "Sunlight", ["Water", "Air", "Warmth"], "Light is needed later, for photosynthesis."]],
        pairs: [["germination", "the growth of a seed into a young plant", 0], ["radicle", "the first root that comes out of a seed"], ["plumule", "the first shoot that grows upwards from a seed"], ["cotyledon", "a seed leaf that stores food for the young plant"], ["testa", "the tough outer coat of a seed"], ["seedling", "a young plant that has just grown from a seed"], ["dormancy", "a resting period when a seed does not grow", 0], ["embryo", "the tiny young plant inside a seed"], ["viable seed", "a seed that is alive and able to germinate"], ["oxygen", "the gas a germinating seed needs for respiration", 0], ["water", "the liquid that makes a seed swell and soften", 0], ["sowing", "planting seeds in the soil", 0], ["transplanting", "moving a young plant to a new place to grow", 0], ["thinning", "removing extra seedlings so the rest have room", 0], ["nursery", "a place where seedlings are raised before transplanting"], ["seed bed", "a prepared piece of soil for planting seeds"]]
    });

    X("vertebrates-invertebrates", "Vertebrates and invertebrates", {
        i: "Vertebrates are animals with a backbone: mammals, birds, fish, reptiles and amphibians. Invertebrates have no backbone: insects, spiders, worms, snails and crabs.",
        r: "A goat, hen, tilapia and lizard all have backbones. An earthworm, ant and snail do not.",
        k: ["Vertebrates: five groups.", "Invertebrates are the majority of animals.", "Insects have 6 legs; spiders have 8.", "Many invertebrates have a hard outer skeleton or shell."],
        e: ["Is a snail a vertebrate?", ["Does it have a backbone? No.", "It has a soft body and shell."], "No, an invertebrate"],
        d: D.cards("Backbone or not?", [["Vertebrates", "mammal, bird, fish, reptile, amphibian"], ["Invertebrates", "insect, spider, worm, snail, crab, jellyfish"]]),
        m: "Thinking that a spider is an insect. A spider has eight legs and is not an insect."
    }, {
        cats: { "vertebrate": ["goat", "hen", "tilapia", "snake", "frog", "lion", "eagle", "lizard"], "invertebrate": ["ant", "earthworm", "snail", "spider", "crab", "butterfly", "millipede", "housefly", "jellyfish"] },
        style: "fact", ctx: "animal",
        pairs: [["an earthworm", "has a soft body with no legs"], ["a snail", "has a soft body protected by a coiled shell"], ["a crab", "has a hard outer skeleton and ten legs"], ["a spider", "has eight legs"], ["an insect", "has six legs"], ["a millipede", "has a long body with many pairs of legs"], ["a jellyfish", "has a soft body shaped like an umbrella"], ["a starfish", "has arms arranged like a star"], ["a mammal", "feeds its young with milk"], ["a bird", "has feathers and wings"], ["a fish", "breathes through gills"], ["a reptile", "has dry scaly skin"], ["an amphibian", "has moist skin and lives on land and in water"], ["a tapeworm", "is a flat worm that lives inside other animals"], ["a sponge", "is a simple animal fixed to rocks under water"], ["a leech", "sucks blood using a sucker"]]
    });

    X("life-cycles", "Animal life cycles", {
        i: "A life cycle is the series of changes an animal goes through from birth to adulthood and death. Some insects change body form completely (metamorphosis).",
        r: "A butterfly begins as an egg, becomes a caterpillar, rests as a pupa and emerges as an adult. A frog begins as spawn, then a tadpole.",
        k: ["Complete metamorphosis: egg, larva, pupa, adult.", "Incomplete metamorphosis: egg, nymph, adult.", "Frog: egg, tadpole, froglet, adult.", "Hen: egg, chick, adult."],
        e: ["Put in order: pupa, egg, adult, larva.", ["It starts with an egg.", "The larva feeds and grows.", "The pupa changes into the adult."], "egg, larva, pupa, adult"],
        d: D.cycle("Butterfly life cycle", ["Egg", "Caterpillar (larva)", "Pupa", "Adult butterfly"]),
        m: "Missing out the pupa stage. A butterfly passes through egg, larva, pupa and adult."
    }, {
        mcq: [["What is the correct order of a butterfly life cycle?", "Egg, larva, pupa, adult", ["Egg, pupa, larva, adult", "Larva, egg, adult, pupa", "Pupa, larva, egg, adult"], "Larva comes before pupa."], ["A tadpole grows into a:", "Frog", ["Fish", "Lizard", "Snake"], "A tadpole is the young of a frog."]],
        cats: { "insect with complete metamorphosis": ["butterfly", "housefly", "bee", "mosquito", "beetle"], "insect with incomplete metamorphosis": ["cockroach", "grasshopper", "termite", "dragonfly"] },
        catExtra: ["animal that lays live young", "bird that lays eggs"],
        pairs: [["life cycle", "the series of changes a living thing goes through from birth to death"], ["metamorphosis", "the big change in body form as some animals grow", 0], ["larva", "the young stage of an insect that looks like a worm"], ["cocoon", "the silky case that a moth caterpillar makes to protect its pupa"], ["pupa", "the resting stage in which a larva changes into an adult insect"], ["nymph", "a young insect that looks like a small adult without wings"], ["tadpole", "the young stage of a frog that lives in water"], ["chick", "a young hen"], ["incubation", "keeping eggs warm until they hatch", 0], ["adult", "a fully grown living thing that can reproduce"], ["offspring", "the young one produced by a living thing"], ["complete metamorphosis", "a life cycle with four stages: egg, larva, pupa and adult", 0], ["incomplete metamorphosis", "a life cycle with three stages: egg, nymph and adult", 0], ["froglet", "a young frog with legs and a short tail"], ["fry", "a young fish"], ["spawn", "the jelly-like mass of frog eggs", 0]]
    });

    X("adaptation", "Adaptation of plants and animals", {
        i: "An adaptation is a feature or behaviour that helps a plant or animal to live well in its habitat.",
        r: "A camel stores fat in its hump to survive in the desert. A duck has webbed feet for swimming. A cactus stores water in its stem.",
        k: ["Structural adaptation: a body feature (webbed feet).", "Behavioural adaptation: what the animal does (migration).", "Camouflage helps animals hide.", "Plants also adapt: floating leaves, thorns, thick stems."],
        e: ["Why does a duck have webbed feet?", ["It lives on water.", "Webbed feet push water."], "To swim well"],
        d: D.cards("Adaptations", [["Camel", "hump stores fat; wide feet on sand"], ["Duck", "webbed feet; waterproof feathers"], ["Cactus", "thick stem stores water; spines"], ["Chameleon", "changes colour to hide"]]),
        m: "Thinking an adaptation happens in one animal in one day. Adaptations are features that pass from parents to young over many generations."
    }, {
        style: "fact", ctx: "living thing",
        pairs: [["a camel", "stores fat in its hump and can go many days without water"], ["a duck", "has webbed feet for swimming"], ["a fish", "has gills to breathe in water"], ["a cactus", "stores water in its thick stem"], ["a water lily", "has leaves that float on water"], ["a giraffe", "has a long neck to reach leaves on tall trees"], ["an eagle", "has sharp claws and good eyesight to catch prey"], ["a chameleon", "changes colour to hide from enemies"], ["a mangrove tree", "has stilt roots that hold it in soft, muddy soil"], ["a polar bear", "has thick fur and fat to keep warm in cold places"], ["an owl", "hunts at night using large eyes and silent wings"], ["a woodpecker", "has a strong beak for drilling into tree trunks"], ["a mosquito", "has a long mouth part for sucking blood"], ["a hen", "scratches the ground with strong feet to find food"], ["a frog", "has long hind legs for jumping"], ["a tortoise", "has a hard shell for protection"]]
    });
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
    var h = root.CMLearnBst.h, X = h.X, S = h.S, D = h.D;
    S("The Human Body");

    X("skeleton-joints", "Skeleton and joints", {
        i: "The skeleton is the frame of bones that supports the body, protects soft organs and works with muscles to move us. Bones meet at joints.",
        r: "Your skull protects your brain. Your ribs protect your heart and lungs. Your knee bends like a door hinge.",
        k: ["An adult has 206 bones.", "Ball-and-socket joints (shoulder, hip) move in all directions.", "Hinge joints (knee, elbow) move one way.", "Ligaments join bone to bone; tendons join muscle to bone."],
        e: ["Which joint is at the elbow?", ["The elbow bends and straightens only.", "That is a hinge joint."], "Hinge joint"],
        d: D.skeleton(),
        m: "Mixing up ligaments and tendons. Ligaments join bones; tendons join muscles to bones."
    }, {
        mcq: [["How many bones does an adult human have?", "206", ["106", "300", "50"], "An adult has 206 bones."], ["Which bone protects the brain?", "Skull", ["Rib", "Pelvis", "Femur"], "The skull is a bony box around the brain."]],
        ctx: "body part",
        pairs: [["skull", "protect the brain"], ["rib", "protect the heart and lungs"], ["backbone", "support the body and protect the spinal cord"], ["pelvis", "support the upper body and protect organs in the lower belly"], ["femur", "be the longest bone in the body"], ["humerus", "be the bone of the upper arm"], ["ball-and-socket joint", "allow movement in all directions, like at the shoulder"], ["hinge joint", "allow bending in one direction, like at the knee"], ["pivot joint", "let the head turn from side to side"], ["fixed joint", "hold bones together so they cannot move, like in the skull"], ["ligament", "join one bone to another bone"], ["tendon", "join a muscle to a bone"], ["cartilage", "cover the ends of bones to make a smooth cushion"], ["bone marrow", "make blood cells inside some bones"], ["kneecap", "protect the knee joint"], ["collarbone", "hold the shoulder away from the chest and join it to the breastbone"]]
    });

    X("muscles", "Muscles and body movement", {
        i: "Muscles are tissues that can contract (get shorter) and relax. They pull on bones to move the body. Muscles work in pairs.",
        r: "When you lift a cup, your biceps contract and your triceps relax. When you put it down, the triceps contract.",
        k: ["Voluntary muscles: we control them (arms, legs).", "Involuntary muscles: work on their own (heart, gut).", "Muscles can only pull, not push.", "Exercise and good food keep muscles strong."],
        e: ["Which muscle straightens the arm?", ["The biceps bends the arm.", "Its partner straightens it."], "Triceps"],
        d: D.cards("Muscle pair in the arm", [["Biceps", "contracts to bend the arm"], ["Triceps", "contracts to straighten the arm"], ["Tendon", "joins muscle to bone"]]),
        m: "Thinking muscles push bones. Muscles only pull, so they work in pairs."
    }, {
        sets: [
            { ctx: "muscle", pairs: [["biceps", "bend the arm at the elbow"], ["triceps", "straighten the arm"], ["cardiac muscle", "pump blood without getting tired"], ["diaphragm", "pull air into the lungs"], ["calf muscle", "lift the heel when we walk or stand on tiptoe"], ["thigh muscle", "swing the leg forward when we run"], ["smooth muscle", "push food along the gut"], ["abdominal muscle", "hold the organs of the belly in place"], ["jaw muscle", "close the mouth and help us chew"], ["eyelid muscle", "open and close the eyes"], ["buttock muscle", "help us stand up and climb stairs"], ["neck muscle", "hold the head up and turn it"], ["stomach muscle", "churn food in the stomach"], ["tongue muscle", "help us speak and swallow"]] },
            { style: "def", pairs: [["voluntary muscle", "a muscle we control by choice"], ["involuntary muscle", "a muscle that works without our control"], ["tendon", "a strong cord that joins a muscle to a bone"], ["antagonistic pair", "two muscles that work in opposite ways to move a bone"], ["cramp", "a sudden painful tightening of a muscle"], ["warm-up", "light exercise done to prepare the muscles"], ["muscle fatigue", "the tired feeling of muscles after long work", 0], ["contraction", "the shortening and thickening of a muscle", 0]] }
        ]
    });

    X("digestive", "Digestive system", {
        i: "Digestion breaks food into small soluble pieces the blood can carry. Food passes through the mouth, gullet, stomach, small intestine and large intestine.",
        r: "When you eat rice and beans, your teeth chew it, your stomach churns it and the small intestine takes the nutrients into the blood.",
        k: ["Mouth and teeth: chewing; saliva starts digestion.", "Stomach: churning with acid and juices.", "Small intestine: digestion ends and food is absorbed.", "Large intestine: water is absorbed; faeces form."],
        e: ["Where is digested food absorbed into the blood?", ["Food is digested in the stomach and small intestine.", "Absorption is mostly in the small intestine."], "Small intestine"],
        d: D.digestive(),
        m: "Saying most absorption is in the stomach. It is in the small intestine."
    }, {
        mcq: [["In which order does food travel?", "Mouth, gullet, stomach, small intestine", ["Mouth, stomach, gullet, small intestine", "Gullet, mouth, stomach, small intestine", "Mouth, small intestine, stomach, gullet"], "The gullet joins mouth to stomach."]],
        ctx: "part of the digestive system",
        pairs: [["mouth", "take in food and mix it with saliva"], ["teeth", "cut and grind food into small pieces"], ["tongue", "push food around and help us taste it"], ["saliva", "wet the food and begin to digest starch"], ["gullet", "push food down to the stomach"], ["stomach", "churn food and mix it with acid and juices"], ["small intestine", "finish digesting food and absorb nutrients into the blood"], ["large intestine", "absorb water from undigested food"], ["liver", "make bile that helps to digest fats"], ["gall bladder", "store bile until it is needed"], ["pancreas", "make juices that digest food in the small intestine"], ["rectum", "store faeces before they leave the body"], ["anus", "let faeces leave the body"], ["villi", "give the small intestine a large surface for absorbing food"], ["epiglottis", "close the windpipe when we swallow so food does not enter it"], ["bile", "break fat into tiny drops"]]
    });

    X("teeth", "Teeth and dental care", {
        i: "Teeth cut, tear and grind food. Humans have milk teeth (20) and then permanent teeth (32). Brushing and eating well prevent decay.",
        r: "Incisors bite a piece of sugar cane, canines tear meat and molars grind yam. Brush in the morning and before bed.",
        k: ["Incisors cut; canines tear; premolars and molars grind.", "Enamel is the hardest part.", "Sugar and plaque cause decay.", "Visit the dentist regularly."],
        e: ["Which tooth tears food?", ["Cutting is by incisors.", "Pointed teeth tear."], "Canine"],
        d: D.cards("Types of teeth", [["Incisor", "cuts food at the front"], ["Canine", "pointed; tears food"], ["Premolar and molar", "wide; crush and grind"], ["Enamel", "hard outer cover"]]),
        m: "Thinking milk teeth do not matter. They hold space for the permanent teeth."
    }, {
        cats: { "food good for teeth": ["milk", "carrot", "cheese", "apple", "fish", "cucumber", "groundnut", "leafy vegetables"], "food bad for teeth": ["sweets", "biscuits", "soft drinks", "chocolate", "cake", "ice cream", "toffee", "sugary juice"] },
        sets: [
            { ctx: "part of a tooth or a type of tooth", pairs: [["incisor", "cut food at the front of the mouth"], ["canine", "tear food"], ["premolar", "crush and grind food"], ["molar", "grind food at the back of the mouth"], ["enamel", "cover and protect the crown with a very hard layer"], ["dentine", "form the main hard part under the enamel"], ["pulp", "hold the nerves and blood vessels of the tooth"], ["crown", "be the part of the tooth that shows above the gum"], ["root", "hold the tooth firmly in the jaw"], ["gum", "hold the teeth firmly in place"]] },
            { style: "def", pairs: [["tooth decay", "the rotting of a tooth caused by acid from bacteria", 0], ["plaque", "the sticky layer of germs on teeth", 0], ["milk tooth", "one of the first 20 teeth, which fall out in childhood"], ["permanent tooth", "one of the 32 teeth that should last for life"], ["cavity", "a hole in a tooth caused by decay"], ["dentist", "a doctor who looks after teeth"], ["fluoride", "a mineral in toothpaste that makes enamel stronger", 0], ["toothbrush", "a small brush used to clean the teeth"]] }
        ]
    });

    X("respiratory", "Respiratory system", {
        i: "Breathing brings oxygen into the body and removes carbon dioxide. Air passes through the nose, windpipe and bronchi into the lungs.",
        r: "When you run, you breathe faster because your muscles need more oxygen. Dust in the harmattan can irritate the nose and chest.",
        k: ["Breathing in: the diaphragm moves down and the ribs go up.", "Breathing out: the diaphragm moves up.", "Oxygen passes into the blood in the air sacs.", "Do not smoke; it damages the lungs."],
        e: ["Which gas do we breathe out more of?", ["We breathe in oxygen.", "The body makes carbon dioxide."], "Carbon dioxide"],
        d: D.lungs(),
        m: "Saying we breathe out only carbon dioxide. Exhaled air still has oxygen."
    }, {
        mcq: [["Which muscle moves down when we breathe in?", "Diaphragm", ["Biceps", "Heart", "Tongue"], "The diaphragm flattens and pulls air in."]],
        ctx: "part of the breathing system",
        pairs: [["nose", "let air in and give us the sense of smell"], ["nostril hair", "filter large dust particles from the air"], ["mucus", "keep the air passages moist and trap germs"], ["cilia", "sweep trapped dirt up the windpipe"], ["windpipe", "carry air down to the lungs"], ["bronchus", "carry air into each lung"], ["bronchiole", "carry air to the tiny air sacs"], ["lung", "take oxygen into the blood and remove carbon dioxide"], ["air sac", "let oxygen pass into the blood through very thin walls"], ["diaphragm", "move down to pull air into the lungs"], ["rib", "protect the lungs and move as we breathe"], ["intercostal muscle", "lift the ribs up and out when we breathe in"], ["voice box", "make sounds when air passes over it"], ["pharynx", "be the passage that both air and food pass through"], ["red blood cell", "carry oxygen to all parts of the body"], ["mouth", "let us breathe in air when the nose is blocked"]]
    });

    X("circulation", "Heart and blood circulation", {
        i: "The heart pumps blood through arteries, veins and capillaries. Blood carries oxygen, food and waste around the body.",
        r: "Feel your pulse at the wrist: each beat is the heart pushing blood out. After running, your pulse is faster.",
        k: ["Arteries carry blood away from the heart.", "Veins carry blood back to the heart.", "Capillaries are tiny vessels where exchange happens.", "Blood: red cells, white cells, platelets and plasma."],
        e: ["Which blood cells fight germs?", ["Red cells carry oxygen.", "Another type fights infection."], "White blood cells"],
        d: D.heart(),
        m: "Saying veins always carry blood without oxygen. This is true for most, but the pulmonary vein carries oxygen-rich blood."
    }, {
        mcq: [["How many chambers does the human heart have?", "Four", ["Two", "Three", "Six"], "Two atria and two ventricles."], ["Which vessel carries blood away from the heart?", "Artery", ["Vein", "Capillary", "Valve"], "A for Away."]],
        ctx: "part of the circulatory system",
        pairs: [["heart", "pump blood around the body"], ["artery", "carry blood away from the heart"], ["vein", "carry blood back to the heart"], ["capillary", "let oxygen and food pass between blood and body cells"], ["red blood cell", "carry oxygen around the body"], ["white blood cell", "fight germs that enter the body"], ["platelet", "help blood to clot when we are cut"], ["plasma", "carry blood cells, dissolved food and waste in the blood"], ["atrium", "receive blood coming into the heart"], ["ventricle", "push blood out of the heart"], ["valve", "stop blood flowing backwards"], ["pulse", "show how fast the heart is beating"], ["haemoglobin", "join with oxygen inside red blood cells"], ["septum", "separate the left and right sides of the heart"], ["stethoscope", "let a doctor listen to the heartbeat"], ["bone marrow", "make new blood cells"]]
    });

    X("excretory-skin", "Excretory system and the skin", {
        i: "Excretion is the removal of waste made by the body. The kidneys make urine, the skin gives out sweat, and the lungs breathe out carbon dioxide.",
        r: "After a football match you sweat to cool down. Drinking enough water helps the kidneys to work well.",
        k: ["Kidneys: filter the blood and make urine.", "Skin: sweat, protection and feeling.", "Lungs: remove carbon dioxide.", "Liver: breaks down poisons and makes urea."],
        e: ["Which organ filters the blood?", ["Waste is taken from the blood.", "This is the job of the kidneys."], "Kidney"],
        d: D.flow("Path of urine", ["Kidneys filter the blood", "Ureters carry urine down", "Bladder stores urine", "Urethra lets urine out"]),
        m: "Confusing excretion with egestion. Excretion removes waste made by the body; egestion removes undigested food."
    }, {
        ctx: "part of the body",
        pairs: [["kidney", "filter waste from the blood and make urine"], ["ureter", "carry urine from the kidney to the bladder"], ["bladder", "store urine"], ["urethra", "let urine leave the body"], ["skin", "cover and protect the body from germs and injury"], ["sweat gland", "make sweat to cool the body"], ["pore", "be the tiny opening where sweat comes out"], ["lungs", "remove carbon dioxide when we breathe out"], ["liver", "break down poisons and make urea"], ["large intestine", "remove solid waste as faeces"], ["epidermis", "form the tough outer layer of the skin"], ["dermis", "hold nerves, blood vessels and sweat glands"], ["hair follicle", "hold each hair root in the skin"], ["oil gland", "make oil that keeps the skin soft"], ["fat layer", "keep the body warm under the skin"], ["nerve ending", "sense touch, heat and pain"]]
    });

    X("nervous", "Nervous system", {
        i: "The nervous system controls the body. The brain and spinal cord form the central nervous system. Nerves carry messages between the body and the brain.",
        r: "If you touch a hot pot, your hand jerks away before you think. This quick action is a reflex.",
        k: ["Brain: thinking, memory, control.", "Spinal cord: carries messages to and from the brain.", "Sensory nerves go to the brain; motor nerves go to the muscles.", "Reflex actions are fast and automatic."],
        e: ["Which part controls balance?", ["The back of the brain.", "That part is the cerebellum."], "Cerebellum"],
        d: D.flow("A message through the body", ["Stimulus (hot pot)", "Sense organ detects it", "Sensory nerve to the brain or spinal cord", "Motor nerve to the muscle", "Response (hand moves away)"]),
        m: "Thinking reflex actions are controlled by thinking. They happen before the brain decides."
    }, {
        mcq: [["Touching a hot object and pulling away quickly is a:", "Reflex action", ["Voluntary action", "Growth", "Reproduction"], "It is quick and automatic."]],
        sets: [
            { ctx: "part of the nervous system", pairs: [["brain", "control the body and help us think"], ["spinal cord", "carry messages between the brain and the body"], ["nerve", "carry messages as tiny electrical signals"], ["cerebrum", "help us think, remember and decide"], ["cerebellum", "keep our balance and control movement"], ["brain stem", "control breathing and heartbeat"], ["skull", "protect the brain"], ["backbone", "protect the spinal cord"], ["sensory nerve", "carry messages from the sense organs to the brain"], ["motor nerve", "carry messages from the brain to the muscles"]] },
            { style: "def", pairs: [["reflex action", "a quick action done without thinking"], ["stimulus", "a change that makes us react"], ["response", "the way the body reacts to a stimulus"], ["sense organ", "a body part that detects changes around us"], ["voluntary action", "an action we decide to do"], ["involuntary action", "an action that happens without our control"], ["central nervous system", "the brain and spinal cord together"], ["neurone", "a nerve cell"], ["reflex arc", "the path a message takes in a reflex action"], ["brain", "the organ inside the skull that controls the body"], ["spinal cord", "a thick cord of nerves inside the backbone"], ["nerve", "a bundle of nerve fibres that carries messages"], ["sensory neurone", "a nerve cell that carries messages to the brain"], ["motor neurone", "a nerve cell that carries messages to a muscle"], ["memory", "the ability to store and recall what we have learnt", 0], ["coordination", "the working together of body parts to do a task smoothly", 0]] }
        ]
    });

    X("sight-hearing", "Sense organs: sight and hearing", {
        i: "The eye detects light so we can see. The ear detects sound so we can hear and also helps us to balance.",
        r: "In bright light the pupil gets smaller to protect the eye. A loud sound can damage the eardrum, so never shout into someone's ear.",
        k: ["Light enters through the cornea and pupil; the lens focuses it on the retina.", "The optic nerve carries the message to the brain.", "Sound makes the eardrum vibrate; small bones pass it on.", "The cochlea changes vibrations into nerve signals."],
        e: ["Which part of the eye senses light?", ["Light is focused at the back.", "The retina senses it."], "Retina"],
        d: D.cards("Eye and ear", [["Pupil and iris", "the pupil lets light in; the iris changes its size"], ["Lens and retina", "lens focuses; retina senses light"], ["Eardrum", "vibrates when sound arrives"], ["Cochlea", "turns vibrations into signals"]]),
        m: "Saying we see with the lens alone. The brain makes sense of the signals from the retina."
    }, {
        ctx: "part of the eye or ear",
        pairs: [["cornea", "form the clear window that covers the front of the eye"], ["pupil", "be the opening that lets light into the eye"], ["iris", "control how much light enters the eye"], ["lens", "focus light onto the retina"], ["retina", "sense light and make signals for the brain"], ["optic nerve", "carry messages from the eye to the brain"], ["eyelid", "close to protect the eye from dust and bright light"], ["eyelash", "keep dust and sweat out of the eyes"], ["tear gland", "make tears that wash and moisten the eye"], ["pinna", "collect sound waves"], ["ear canal", "lead sound to the eardrum"], ["eardrum", "vibrate when sound hits it"], ["ossicle", "pass vibrations to the inner ear"], ["cochlea", "change vibrations into nerve signals"], ["auditory nerve", "carry hearing messages to the brain"], ["eustachian tube", "keep the air pressure the same on both sides of the eardrum"], ["ear wax", "trap dust and germs in the ear canal"]]
    });

    X("smell-taste-touch", "Sense organs: smell, taste and touch", {
        i: "The nose detects smells, the tongue detects tastes and the skin detects touch, heat, cold and pain. Each sends messages to the brain.",
        r: "The smell of fried plantain makes you hungry. A blocked nose during a cold makes food seem tasteless because smell and taste work together.",
        k: ["Four basic tastes: sweet, sour, salty, bitter.", "Taste buds are on the tongue.", "Fingertips are very sensitive to touch.", "Never taste or smell unknown chemicals."],
        e: ["Which sense organ detects heat?", ["Heat is felt on the body.", "The skin."], "Skin"],
        d: D.table("Sense organs", ["Organ", "Sense"], [["Nose", "smell"], ["Tongue", "taste"], ["Skin", "touch, heat, pain"], ["Eye", "sight"], ["Ear", "hearing"]]),
        m: "Saying the tongue alone gives the full flavour. Smell helps a lot."
    }, {
        cats: { "thing that tastes sweet": ["sugar", "honey", "ripe banana", "sugar cane", "glucose"], "thing that tastes sour": ["lemon", "lime", "vinegar", "tamarind"], "thing that tastes salty": ["table salt", "sea water", "salted fish", "stockfish"], "thing that tastes bitter": ["bitter leaf", "bitter kola", "quinine", "neem leaf"] },
        sets: [
            { ctx: "body part", pairs: [["nose", "take in air and let us smell it"], ["tongue", "carry the taste buds and help us taste"], ["skin", "feel touch, heat, cold and pain"], ["taste bud", "detect sweet, sour, salty and bitter tastes"], ["fingertip", "feel the shape and texture of objects very well"], ["olfactory nerve", "carry smell messages to the brain"], ["saliva", "dissolve food so that we can taste it"], ["nerve ending in the skin", "sense pain and pressure"], ["hair on the skin", "sense very light touch"], ["eye", "detect light so that we can see"]] },
            { style: "def", pairs: [["sweet", "the taste of sugar and honey", 0], ["sour", "the taste of lemon and vinegar", 0], ["salty", "the taste of table salt", 0], ["bitter", "the taste of bitter leaf", 0], ["texture", "how rough or smooth a thing feels", 0], ["sense", "a way of finding out about the world around us"], ["sense organ", "a body part that detects changes around us"], ["taste", "the sense that lets us know the flavour of food", 0], ["smell", "the sense that detects chemicals in the air", 0], ["touch", "the sense that lets us feel with the skin", 0]] }
        ]
    });

    X("puberty-growth", "Growth and puberty", {
        i: "Humans pass through life stages: baby, child, adolescent, adult and old age. Puberty is when the body changes from a child to an adult, usually between ages 10 and 16.",
        r: "In Primary 6 many children begin to grow taller quickly and notice body changes. These are normal. Good hygiene, rest and healthy food help.",
        k: ["Hormones cause the changes of puberty.", "Boys: deeper voice, facial hair. Girls: monthly periods, body curves.", "Both: growth spurt, more sweat, body hair, pimples.", "Bath daily and talk to a trusted adult."],
        e: ["What is puberty?", ["It is a stage of life.", "The body changes into an adult body."], "The stage when a child body changes into an adult body"],
        d: D.table("Changes at puberty", ["Boys", "Girls", "Both"], [["deeper voice", "periods start", "growth spurt"], ["facial hair", "body gets curves", "body hair"], ["broader shoulders", "breasts develop", "more sweat, pimples"]]),
        m: "Thinking puberty starts at the same age for everyone. It begins at different times for different people."
    }, {
        mcq: [["Puberty changes are caused by:", "Hormones", ["Vitamins", "Germs", "Minerals"], "Hormones are chemical messengers."], ["To avoid body odour during puberty you should:", "Bath daily", ["Skip washing", "Avoid water", "Wear dirty clothes"], "Cleanliness controls body odour."]],
        sets: [
            { style: "def", pairs: [["growth", "an increase in size and mass", 0], ["development", "the changes in the body and mind as a person grows", 0], ["puberty", "the stage when a child body changes into an adult body", 0], ["adolescence", "the teenage years between childhood and adulthood", 0], ["hormone", "a chemical messenger made in the body"], ["infant", "a baby in its first year of life"], ["toddler", "a young child who is learning to walk"], ["growth spurt", "a time of fast growth in height"], ["body odour", "the bad smell caused by sweat and bacteria", 0], ["pimple", "a small bump on the skin that often appears at puberty"], ["menstruation", "the monthly loss of blood from the womb in girls and women after puberty", 0], ["life stage", "one part of a human life such as childhood or old age"], ["adult", "a fully grown person"], ["child", "a young person between infancy and puberty"], ["elder", "an old person who is respected for wisdom"], ["hygiene", "keeping the body and surroundings clean", 0], ["sanitary pad", "a pad that girls and women use to absorb menstrual blood"], ["counsellor", "a trained person who gives advice and support"]] },
            { style: "fact", ctx: "person", pairs: [["a boy at puberty", "gets a deeper voice and starts to grow facial hair"], ["a girl at puberty", "begins to have monthly periods"], ["an infant", "depends on adults for food and care"], ["a toddler", "is learning to walk and talk"], ["an adolescent", "is changing from a child into an adult"], ["an old person", "may have grey hair and slower movements"]] }
        ]
    });

    X("reproduction-life-stages", "Human reproduction and life stages", {
        i: "Reproduction produces new human beings. A male cell (sperm) joins a female cell (egg cell) in fertilisation. The baby grows in the mother womb for about nine months.",
        r: "Pregnant women visit the antenatal clinic for check-ups, good food and advice. A newborn baby should be breastfed.",
        k: ["Sperm is made in the testes; egg cells in the ovaries.", "Fertilisation forms a zygote.", "The placenta and umbilical cord feed the baby.", "Humans have life stages: baby, child, adolescent, adult, elder."],
        e: ["Where does a baby grow before birth?", ["It grows inside the mother.", "The womb."], "In the womb"],
        d: D.flow("From fertilisation to birth", ["Sperm and egg cell join (fertilisation)", "Embryo grows in the womb", "Foetus is fed through the placenta", "Birth after about nine months"]),
        m: "Thinking a baby breathes in the womb. It gets oxygen from the mother through the placenta."
    }, {
        style: "def",
        pairs: [["reproduction", "the making of new living things of the same kind", 0], ["sperm", "the male reproductive cell"], ["egg cell", "the female reproductive cell"], ["fertilisation", "the joining of a sperm and an egg cell", 0], ["zygote", "the cell formed when a sperm joins an egg cell"], ["womb", "the place where a baby grows before birth"], ["embryo", "the early stage of a baby growing in the womb"], ["foetus", "a baby growing in the womb after the first weeks"], ["pregnancy", "the time when a baby grows in a woman womb", 0], ["placenta", "the organ that passes food and oxygen from mother to baby"], ["umbilical cord", "the cord that joins the baby to the placenta"], ["birth", "the process of a baby coming out of the mother body", 0], ["breast milk", "the best first food for a newborn baby", 0], ["ovary", "the part of a woman body that makes egg cells"], ["testis", "the part of a man body that makes sperm"], ["antenatal clinic", "a clinic where pregnant women get check-ups"], ["twins", "two babies born to the same mother at the same time"]]
    });
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
    var h = root.CMLearnBst.h, X = h.X, S = h.S, D = h.D;
    S("Environment and Ecology");

    X("habitats", "Habitats", {
        i: "A habitat is the natural place where a plant or animal lives. It gives food, water, shelter and space.",
        r: "A tilapia lives in a river, a monkey in a forest, a camel in the desert and an earthworm in the soil.",
        k: ["Land habitats: forest, grassland, desert.", "Water habitats: pond, river, sea, swamp.", "Small homes: nest, burrow, hive, termite mound.", "Animals are adapted to their habitats."],
        e: ["Where does a frog lay its eggs?", ["Frog eggs need water.", "A pond or stream."], "In water (a pond)"],
        d: D.table("Animals and their habitats", ["Habitat", "Animals"], [["Forest", "monkey, parrot, leopard"], ["Water", "tilapia, catfish, crab"], ["Desert", "camel, scorpion"], ["Grassland", "lion, zebra, giraffe"], ["Soil", "earthworm, termite"]]),
        m: "Thinking a habitat is only the animal home. It also includes the food, water and shelter around it."
    }, {
        cats: { "animal that lives in the forest": ["monkey", "chimpanzee", "parrot", "leopard", "gorilla"], "animal that lives in water": ["tilapia", "catfish", "shark", "crab", "jellyfish"], "animal that lives in the desert": ["camel", "scorpion", "fennec fox", "sand lizard"], "animal that lives on grassland": ["lion", "zebra", "ostrich", "giraffe"], "animal that lives in the soil": ["earthworm", "mole", "termite", "millipede"] },
        pairs: [["habitat", "the natural home of a plant or animal"], ["microhabitat", "a very small habitat such as the underside of a stone"], ["aquatic habitat", "a habitat in water"], ["terrestrial habitat", "a habitat on land"], ["forest", "a large area covered with many trees"], ["grassland", "a large open area covered with grass and a few trees"], ["desert", "a very dry place that gets little rain"], ["pond", "a small area of still water"], ["swamp", "wet, muddy land that is often flooded"], ["mangrove", "a forest that grows in salty water near the coast"], ["burrow", "a hole in the ground made by an animal as a home"], ["nest", "a home built by birds from twigs and leaves"], ["hive", "a home made by bees"], ["termite mound", "a hard tower of soil built by termites"], ["den", "a hidden resting place of a wild animal such as a lion or fox"], ["river", "a natural stream of fresh water that flows towards the sea"]]
    });

    X("food-chains", "Food chains and food webs", {
        i: "A food chain shows who eats whom, with arrows pointing the way energy flows. Many food chains linked together form a food web. All energy begins with the Sun.",
        r: "Grass is eaten by a grasshopper, the grasshopper by a frog, the frog by a snake and the snake by an eagle.",
        k: ["Producers (green plants) start the chain.", "Consumers: primary, secondary, tertiary.", "Decomposers break down dead things.", "Arrows show the direction of energy."],
        e: ["In grass, grasshopper, frog, snake, who is the primary consumer?", ["The producer is grass.", "The first animal, which eats grass."], "Grasshopper"],
        d: D.chain("A food chain", ["Grass (producer)", "Grasshopper (primary consumer)", "Frog (secondary consumer)", "Snake (tertiary consumer)"], "Arrows point to the eater"),
        m: "Drawing the arrow from the eater to the food. The arrow shows where the energy goes, so it points to the eater."
    }, {
        mcq: [["In the chain maize, grasshopper, lizard, the secondary consumer is:", "Lizard", ["Maize", "Grasshopper", "Sun"], "Maize is the producer, the grasshopper is primary, the lizard is secondary."], ["What does the arrow in a food chain mean?", "Energy goes to the eater", ["Eats the food", "Is bigger than", "Comes from the eater"], "It shows the flow of energy."]],
        cats: { "producer": ["grass", "maize plant", "mango tree", "algae", "bean plant"], "herbivore": ["goat", "cow", "rabbit", "grasshopper", "giraffe"], "carnivore": ["lion", "eagle", "snake", "hawk", "shark"], "decomposer": ["mushroom", "bacteria", "mould", "yeast"], "omnivore": ["human", "pig", "hen", "baboon"] },
        pairs: [["food chain", "a line that shows who eats whom"], ["food web", "many food chains joined together"], ["producer", "a living thing that makes its own food"], ["consumer", "a living thing that eats other living things for food"], ["primary consumer", "the consumer at the second step of a food chain"], ["secondary consumer", "the consumer at the third step of a food chain, which eats primary consumers"], ["tertiary consumer", "the consumer at the fourth step of a food chain, which eats secondary consumers"], ["herbivore", "an animal that eats only plants"], ["carnivore", "an animal that eats only other animals"], ["omnivore", "an animal that eats both plants and animals"], ["predator", "an animal that hunts and kills other animals for food"], ["prey", "an animal that is hunted for food"], ["decomposer", "a living thing that breaks down dead plants and animals"], ["scavenger", "an animal that feeds on dead animals it did not kill"], ["apex predator", "an animal at the top of a food chain with no natural enemies"], ["the Sun", "the main source of energy for food chains", 0]]
    });

    X("ecosystems", "Ecosystems", {
        i: "An ecosystem is a community of living things and their non-living surroundings working together. Living parts are biotic; non-living parts are abiotic.",
        r: "A pond has fish, frogs and water plants (living) and also water, sunlight and mud (non-living). A farm is an ecosystem made by people.",
        k: ["Biotic: plants, animals, microbes.", "Abiotic: sunlight, water, soil, air, temperature.", "Living things depend on each other.", "Humans can upset the balance of nature."],
        e: ["Is sunlight biotic or abiotic?", ["Is it alive? No.", "It is a non-living factor."], "Abiotic"],
        d: D.cards("Parts of an ecosystem", [["Biotic", "plants, animals, fungi, bacteria"], ["Abiotic", "sunlight, water, soil, air, temperature"], ["Interdependence", "living things need one another"]]),
        m: "Thinking an ecosystem has only animals. It includes plants and non-living things too."
    }, {
        cats: { "living part of an ecosystem": ["tree", "goat", "bacteria", "fungus", "bird", "grass"], "non-living part of an ecosystem": ["sunlight", "soil", "water", "temperature", "wind", "rock"] },
        pairs: [["ecosystem", "a community of living things and their non-living surroundings"], ["community", "all the living things in one habitat"], ["population", "all the animals of one kind living in one area"], ["biotic factor", "a living part of an ecosystem"], ["abiotic factor", "a non-living part of an ecosystem"], ["environment", "everything around a living thing"], ["interdependence", "living things depending on each other", 0], ["balance of nature", "a steady state in which living things in an area survive together", 0], ["biodiversity", "the variety of living things in an area", 0], ["competition", "the struggle between living things for food, water, space or light", 0], ["parasite", "a living thing that lives on another and harms it"], ["host", "a living thing that a parasite lives on"], ["artificial ecosystem", "an ecosystem made by people, such as a farm or a fish pond"], ["natural ecosystem", "an ecosystem that forms without human help, such as a forest"], ["extinction", "the complete disappearance of a type of living thing", 0], ["pollinator", "an animal that carries pollen between flowers"]]
    });

    X("soil-types", "Soil types", {
        i: "Soil is the top layer of the Earth made of rock particles, humus, water and air. The main soil types are sandy, clay and loamy. Loamy soil is best for farming.",
        r: "Sandy soil near the coast drains fast. Clay soil is used to make pots and bricks. Loamy soil gives good yields of yam and maize.",
        k: ["Sandy: coarse grains, drains fast.", "Clay: fine grains, holds water, sticky.", "Loam: mixture, fertile, holds water but drains.", "Humus makes soil fertile."],
        e: ["Which soil is best for crops?", ["It must hold water yet drain.", "It must have humus."], "Loamy soil"],
        d: D.layers("Soil layers", [["Topsoil", "#a16207", "dark, humus-rich, roots grow here", "#ffffff"], ["Subsoil", "#d97706", "lighter, few roots"], ["Weathered rock", "#fcd34d", "broken rock pieces"], ["Bedrock", "#94a3b8", "solid rock"]]),
        m: "Thinking clay drains quickly. Clay particles are tiny and hold water."
    }, {
        mcq: [["Which soil type holds the most water?", "Clay soil", ["Sandy soil", "Gravel", "Chalky soil"], "Clay has tiny particles."], ["Which soil is the best for farming?", "Loamy soil", ["Sandy soil", "Clay soil", "Bedrock"], "It has a good mix."]],
        style: "fact", ctx: "soil term",
        pairs: [["sandy soil", "has coarse grains and lets water drain through quickly"], ["clay soil", "has very small grains and holds a lot of water"], ["loamy soil", "is a mixture of sand, clay and humus, and is the best for farming"], ["silt", "has fine grains that feel smooth like flour"], ["humus", "is the dark, rotted remains of plants and animals in the soil"], ["topsoil", "is the top layer of soil, where most roots grow"], ["subsoil", "is the layer below the topsoil that has little humus"], ["bedrock", "is the solid rock layer under the soil"], ["gravel", "is made of small stones and pebbles"], ["laterite", "is a red soil rich in iron found in many parts of Nigeria"], ["soil water", "is the water held between the soil particles"], ["soil air", "is the air found in the spaces between soil particles"], ["chalky soil", "is a pale soil that contains a lot of lime"], ["saline soil", "contains too much salt for most crops"], ["swampy soil", "is waterlogged soil with very little air"], ["soil texture", "is how rough or smooth the soil feels"]]
    });

    X("erosion", "Soil erosion and conservation", {
        i: "Soil erosion is the wearing away and carrying off of topsoil by water or wind. Conserving soil means protecting it from erosion and keeping it fertile.",
        r: "Gullies in Anambra and Imo states grew after heavy rains on bare land. Planting trees and grass keeps soil in place.",
        k: ["Causes: heavy rain, wind, deforestation, overgrazing.", "Prevent: tree planting, terracing, cover crops, contour ploughing.", "Mulching and crop rotation keep soil fertile.", "Gullies are deep channels cut by water."],
        e: ["How does planting trees stop erosion?", ["Roots bind the soil.", "Leaves reduce the force of rain."], "Roots hold the soil together"],
        d: D.cards("Causes and cures", [["Causes", "heavy rain, wind, bare land, overgrazing, deforestation"], ["Cures", "afforestation, terracing, mulching, cover crops"]]),
        m: "Thinking only water causes erosion. Wind carries soil too, especially in the dry north."
    }, {
        pairs: [["soil erosion", "the wearing away and carrying off of topsoil by water or wind", 0], ["weathering", "the breaking of rocks into small pieces by weather", 0], ["gully", "a deep channel cut in the land by running water"], ["sheet erosion", "the removal of a thin layer of topsoil by rain", 0], ["wind erosion", "the blowing away of loose soil by strong wind", 0], ["overgrazing", "allowing too many animals to eat the grass in one place", 0], ["deforestation", "the cutting down of too many trees", 0], ["afforestation", "planting trees where there were none before", 0], ["terracing", "cutting steps into a hillside to slow down water", 0], ["contour ploughing", "ploughing across a slope instead of up and down", 0], ["cover crop", "a plant grown to protect bare soil"], ["mulching", "covering the soil with leaves or straw", 0], ["windbreak", "a row of trees planted to slow down the wind"], ["crop rotation", "growing different crops on the same land in turns", 0], ["fallowing", "leaving land to rest so it can regain its nutrients", 0], ["deposition", "the dropping of soil that was carried by water or wind", 0]]
    });

    X("water-sources", "Sources and uses of water", {
        i: "Water comes from rain, rivers, streams, springs, wells, boreholes, lakes and the sea. We use it for drinking, cooking, washing, farming, industry and making electricity.",
        r: "In Ifo some homes use boreholes, while others buy pure water. A dam holds river water to make electricity, as at Kainji.",
        k: ["Surface water: rivers, lakes, ponds.", "Groundwater: wells, boreholes, springs.", "Sea water is salty.", "Always make water safe before drinking."],
        e: ["Is a borehole a source of surface or underground water?", ["It is drilled into the ground.", "It reaches groundwater."], "Underground water"],
        d: D.cards("Water sources", [["Rain", "falls from clouds"], ["Surface", "river, lake, pond, stream"], ["Underground", "well, borehole, spring"], ["Sea", "salty water"]]),
        m: "Thinking all clear water is safe. It may still carry germs."
    }, {
        pairs: [["rainwater", "water that falls from clouds", 0], ["spring", "water that flows out of the ground naturally"], ["well", "a hole dug into the ground to reach underground water"], ["borehole", "a deep narrow hole drilled to get underground water"], ["river", "a large stream of fresh water that flows to the sea"], ["lake", "a large area of water surrounded by land"], ["stream", "a small flow of fresh water"], ["sea", "a large body of salty water"], ["groundwater", "water stored under the ground", 0], ["reservoir", "a place where water is collected and stored"], ["dam", "a wall built across a river to hold back water"], ["water tank", "a container for storing water"], ["pipe-borne water", "water supplied through pipes to homes", 0], ["surface water", "water found on top of the land, such as in rivers and lakes", 0], ["water table", "the upper level of water under the ground"], ["aquifer", "a layer of rock that holds groundwater"]]
    });

    X("water-cycle", "The water cycle", {
        i: "The water cycle is the continuous movement of water between the Earth and the air. The Sun heats water so it evaporates, cools into clouds (condensation) and falls as rain (precipitation).",
        r: "Clothes dry on the line by evaporation. The cold glass of water gets drops on its outside by condensation.",
        k: ["Evaporation: liquid to vapour.", "Condensation: vapour to droplets.", "Precipitation: rain, hail, snow.", "Water returns by runoff and infiltration."],
        e: ["What turns water vapour into clouds?", ["Vapour rises and cools.", "Cooling makes drops."], "Condensation"],
        d: D.waterCycle(),
        m: "Saying clouds are made of water vapour. Clouds are tiny drops of liquid water or ice."
    }, {
        mcq: [["Which energy source drives the water cycle?", "The Sun", ["The Moon", "The wind", "Electricity"], "Solar heat causes evaporation."], ["Water changing from liquid to gas is called:", "Evaporation", ["Condensation", "Freezing", "Melting"], "Liquid becomes vapour."]],
        pairs: [["evaporation", "the change of liquid water into water vapour", 0], ["condensation", "the change of water vapour into tiny drops of water", 0], ["precipitation", "water falling from clouds as rain, hail or snow", 0], ["water vapour", "water as an invisible gas", 0], ["cloud", "a mass of tiny water drops or ice crystals in the air"], ["runoff", "water flowing over the land into rivers and seas", 0], ["infiltration", "water soaking down into the soil", 0], ["transpiration", "the loss of water vapour from the leaves of plants", 0], ["water cycle", "the continuous movement of water between the Earth and the air"], ["hail", "balls of ice that fall from clouds", 0], ["dew", "tiny drops of water that form on cool surfaces at night", 0], ["fog", "a cloud that forms near the ground", 0], ["the Sun", "the source of heat that drives the water cycle", 0], ["drizzle", "very light rain", 0], ["snow", "frozen water that falls as white flakes", 0], ["rainfall", "the amount of rain that falls in a place", 0]]
    });

    X("water-pollution", "Water pollution and purification", {
        i: "Water pollution is the contamination of water by harmful things. Polluted water must be purified before drinking, by filtering, boiling or adding chlorine.",
        r: "Dumping refuse in a stream, oil spills in the Niger Delta and washing in a well all pollute water. Boiling kills germs.",
        k: ["Causes: sewage, oil, refuse, factory waste, detergents.", "Diseases: cholera, typhoid, diarrhoea.", "Purify: sedimentation, filtration, boiling, chlorination.", "Distillation gives pure water."],
        e: ["Which method kills germs in drinking water?", ["Filtering removes dirt only.", "Heat kills germs."], "Boiling"],
        d: D.flow("Purifying water", ["Sedimentation: let dirt settle", "Filtration: pass through sand and cloth", "Boiling or chlorination: kill germs", "Store in a covered clean container"]),
        m: "Thinking a filter alone removes all germs. Boil or chlorinate after filtering."
    }, {
        cats: { "cause of water pollution": ["oil spill", "sewage", "factory waste", "dumping refuse", "detergent", "washing a vehicle in a stream"], "way of making water safe to drink": ["boiling", "filtering", "chlorination", "distillation", "sedimentation"] },
        pairs: [["water pollution", "the contamination of water by harmful things", 0], ["pollutant", "a harmful substance that makes water, air or soil dirty"], ["sewage", "waste water and waste from toilets and drains", 0], ["oil spill", "crude oil leaking into rivers or the sea"], ["contaminated water", "water that has harmful germs or chemicals in it", 0], ["safe drinking water", "water that is clean, clear and free from germs", 0], ["filtration", "passing water through sand or cloth to remove solid particles", 0], ["boiling", "heating water until it bubbles to kill germs", 0], ["chlorination", "adding chlorine to water to kill germs", 0], ["sedimentation", "letting the dirt in water settle at the bottom", 0], ["decantation", "pouring off clear water without disturbing the dirt", 0], ["alum", "a chemical that makes dirt in water stick together and settle"], ["water-borne disease", "a disease spread by drinking dirty water"], ["detergent", "a washing chemical that can harm rivers"], ["purification", "making water clean and safe to drink", 0], ["distillation", "boiling water and collecting the steam to get pure water", 0]]
    });

    X("air-composition", "Air and its composition", {
        i: "Air is a mixture of gases: about 78 percent nitrogen, 21 percent oxygen, about 1 percent argon and a little carbon dioxide, water vapour and dust.",
        r: "A candle in a closed jar goes out when the oxygen is used up. Plants take in carbon dioxide and give out oxygen.",
        k: ["Nitrogen 78 percent, oxygen 21 percent.", "Carbon dioxide turns lime water milky.", "Air has mass and takes up space.", "The atmosphere is the layer of air around the Earth."],
        e: ["Which gas is most plentiful in air?", ["Oxygen is 21 percent.", "Another gas is 78 percent."], "Nitrogen"],
        d: D.table("Gases in air", ["Gas", "Share"], [["Nitrogen", "78 percent"], ["Oxygen", "21 percent"], ["Argon and others", "about 1 percent"], ["Carbon dioxide", "very small"]]),
        m: "Saying air is mostly oxygen. It is mostly nitrogen."
    }, {
        mcq: [["Which gas do we need for breathing?", "Oxygen", ["Nitrogen", "Argon", "Hydrogen"], "Oxygen is used in respiration."], ["Which test shows carbon dioxide?", "Lime water turns milky", ["A glowing splint relights", "Litmus turns red", "A candle burns brighter"], "Lime water is the standard test."]],
        style: "fact", ctx: "gas or term about air",
        pairs: [["nitrogen", "makes up about 78 percent of the air"], ["oxygen", "makes up about 21 percent of the air and is used in breathing"], ["argon", "is a rare gas that makes up about 1 percent of the air"], ["carbon dioxide", "is a small part of the air and is used by plants in photosynthesis"], ["water vapour", "is the gas form of water found in the air in changing amounts"], ["dust", "is made of tiny solid particles floating in the air"], ["wind", "is air that is moving"], ["air pressure", "is the push of the air on everything around it"], ["the atmosphere", "is the layer of air around the Earth"], ["the ozone layer", "protects living things from harmful rays of the Sun"], ["lime water", "turns milky when carbon dioxide is passed through it"], ["a burning candle", "goes out when it uses up the oxygen in a closed jar"], ["a glowing splint", "bursts into flame when put in pure oxygen"], ["compressed air", "is air squeezed into a small space"], ["a vacuum", "is a space with no air in it"], ["a balloon", "gets bigger when more air is blown into it"]]
    });

    X("air-pollution", "Air pollution", {
        i: "Air pollution is harmful substances in the air, such as smoke, fumes and dust. It harms health, plants and the climate.",
        r: "Smoke from burning refuse, exhaust from old vehicles, generators and gas flaring all pollute the air. Planting trees and using clean energy help.",
        k: ["Causes: burning fuels, bush burning, gas flaring, factory smoke.", "Effects: coughing, asthma, acid rain, global warming.", "Reduce: plant trees, service vehicles, use solar power.", "Carbon monoxide is a poisonous gas."],
        e: ["Name one cause of air pollution at home.", ["Think of smoke.", "Burning refuse makes smoke."], "Burning refuse"],
        d: D.cards("Air pollution", [["Sources", "vehicles, generators, factories, bush burning, gas flaring"], ["Effects", "coughing, acid rain, global warming"], ["Solutions", "trees, clean energy, vehicle servicing"]]),
        m: "Thinking pollution is only smoke you can see. Some gases like carbon monoxide are invisible."
    }, {
        cats: { "cause of air pollution": ["vehicle exhaust", "burning refuse", "factory smoke", "gas flaring", "bush burning", "generator fumes"], "way of reducing air pollution": ["planting trees", "using solar power", "servicing vehicles", "using public transport", "banning bush burning"] },
        pairs: [["air pollution", "the presence of harmful substances in the air", 0], ["smoke", "a mixture of tiny solid particles and gases from burning"], ["smog", "a mix of smoke and fog"], ["acid rain", "rain made acidic by gases from burning fuels", 0], ["greenhouse gas", "a gas that traps heat in the atmosphere"], ["carbon monoxide", "a poisonous gas made when fuel burns without enough air", 0], ["sulphur dioxide", "a gas from burning coal and oil that causes acid rain", 0], ["gas flaring", "the burning of unwanted gas at oil wells", 0], ["bush burning", "setting fire to bushes and grass", 0], ["soot", "the black powder made when fuel does not burn fully", 0], ["exhaust fume", "the gas that comes out of the pipe at the back of a vehicle"], ["volcano", "a mountain that sends out hot ash and gases"], ["dust mask", "a cover for the nose and mouth that filters dust"], ["generator", "a machine that burns fuel to make electricity and gives out smoke and noise"], ["incinerator", "a furnace that burns rubbish at a very high temperature"], ["clean energy", "power from sources such as the sun and wind that give out little pollution", 0]]
    });

    X("waste-recycling", "Waste management and recycling", {
        i: "Waste is anything we throw away. Good waste management follows the 3 Rs: reduce, reuse and recycle. Biodegradable waste rots; non-biodegradable waste does not.",
        r: "Peels and food leftovers can make compost for the garden. Plastic bottles can be collected and recycled instead of blocking drains.",
        k: ["Biodegradable: peels, paper, leaves.", "Non-biodegradable: plastic, glass, tin.", "Methods: recycling, composting, landfill, incineration.", "Sort waste at home."],
        e: ["Is a nylon bag biodegradable?", ["Does it rot in the soil?", "Plastic lasts for years."], "No"],
        d: D.cycle("The 3 Rs", ["Reduce", "Reuse", "Recycle"]),
        m: "Thinking burying plastic makes it disappear. It stays in the soil for many years."
    }, {
        cats: { "biodegradable waste": ["banana peel", "vegetable scraps", "paper", "fruit peels", "dry leaves", "food leftovers"], "non-biodegradable waste": ["plastic bottle", "nylon bag", "glass bottle", "tin can", "rubber tyre", "styrofoam"] },
        pairs: [["waste", "anything that we throw away because we no longer need it", 0], ["refuse", "household rubbish such as papers, peels and cans", 0], ["biodegradable waste", "waste that bacteria can break down", 0], ["non-biodegradable waste", "waste that bacteria cannot break down", 0], ["recycling", "turning used materials into new products", 0], ["reuse", "using an item again instead of throwing it away", 0], ["reduce", "making less waste in the first place", 0], ["compost", "a rich plant food made from rotted waste", 0], ["landfill", "a large hole in the ground where waste is buried"], ["incineration", "the burning of waste at a very high temperature", 0], ["hazardous waste", "waste that is dangerous to health or the environment", 0], ["e-waste", "old electrical items like phones and radios that are thrown away", 0], ["organic waste", "waste that comes from plants and animals", 0], ["recyclable material", "a material that can be processed and used again"], ["dumpsite", "a place where refuse is dumped"], ["dustbin", "a container for keeping waste before it is collected"]]
    });

    X("conservation", "Conservation of natural resources", {
        i: "Natural resources are useful things from nature such as water, soil, forests, minerals and wildlife. Conservation means using them wisely so they last. Renewable resources can be replaced; non-renewable resources cannot.",
        r: "National parks like Old Oyo and Yankari protect wildlife. Planting a tree for each one cut down is conservation.",
        k: ["Renewable: sunlight, wind, wood, fish.", "Non-renewable: crude oil, coal, minerals.", "Protect wildlife: national parks, game reserves, laws against poaching.", "Save water and energy."],
        e: ["Is crude oil renewable?", ["It took millions of years to form.", "It cannot be replaced soon."], "No"],
        d: D.cards("Resources", [["Renewable", "sunlight, wind, water, trees, fish"], ["Non-renewable", "crude oil, coal, tin, limestone"], ["Conserve", "reduce, reuse, recycle, protect wildlife"]]),
        m: "Thinking renewable resources can never run out. Trees and fish can be used up if over-harvested."
    }, {
        cats: { "renewable resource": ["sunlight", "wind", "running water", "wood", "crops"], "non-renewable resource": ["crude oil", "coal", "natural gas", "iron ore", "tin", "limestone"] },
        pairs: [["conservation", "the wise use and protection of natural resources", 0], ["natural resource", "a useful material that comes from nature"], ["renewable resource", "a resource that can be replaced naturally"], ["non-renewable resource", "a resource that cannot be replaced once used up"], ["endangered species", "a kind of living thing that is in danger of becoming extinct"], ["national park", "a large protected area where wildlife is safe"], ["game reserve", "an area set aside to protect wild animals"], ["forest reserve", "a forest protected by law from cutting"], ["poaching", "the illegal hunting of wild animals", 0], ["overfishing", "catching fish faster than they can reproduce", 0], ["sustainable use", "using resources so that they will last for the future", 0], ["wildlife", "wild animals and plants living in their natural habitat", 0], ["habitat destruction", "the clearing or damaging of the home of living things", 0], ["zoo", "a place where wild animals are kept and cared for"], ["botanical garden", "a place where many kinds of plants are grown and studied"], ["extinction", "the complete disappearance of a kind of living thing", 0]]
    });

    X("weather-instruments", "Weather and weather instruments", {
        i: "Weather is the state of the air at a place and time: temperature, rain, wind, cloud and sunshine. Weather instruments measure these things.",
        r: "A school weather station can have a thermometer, rain gauge and wind vane. Nigeria has a rainy season and a dry season with the harmattan.",
        k: ["Thermometer: temperature.", "Rain gauge: rainfall.", "Anemometer: wind speed; wind vane: wind direction.", "Barometer: air pressure; hygrometer: humidity."],
        e: ["Which instrument measures rainfall?", ["Rain is collected.", "A rain gauge."], "Rain gauge"],
        d: D.table("Weather instruments", ["Instrument", "Measures"], [["Thermometer", "temperature"], ["Rain gauge", "rainfall"], ["Barometer", "air pressure"], ["Anemometer", "wind speed"], ["Wind vane", "wind direction"], ["Hygrometer", "humidity"]]),
        m: "Mixing up weather and climate. Weather is for a short time; climate is the average over many years."
    }, {
        sets: [
            { ctx: "weather instrument", pairs: [["thermometer", "measure temperature"], ["rain gauge", "measure the amount of rainfall"], ["barometer", "measure air pressure"], ["anemometer", "measure wind speed"], ["wind vane", "show the direction the wind is blowing from"], ["hygrometer", "measure the humidity of the air"], ["Stevenson screen", "shelter weather instruments from rain and direct sunlight"], ["sunshine recorder", "measure the hours of sunshine"], ["maximum and minimum thermometer", "record the highest and lowest temperatures of the day"], ["weather station", "collect weather readings in one place"], ["weather satellite", "take pictures of clouds from space"]] },
            { style: "def", pairs: [["weather", "the state of the air at a place and time", 0], ["climate", "the average weather of a place over many years", 0], ["humidity", "the amount of water vapour in the air", 0], ["temperature", "how hot or cold something is", 0], ["rainfall", "the amount of rain that falls in a place", 0], ["wind", "air that is moving", 0], ["cloud cover", "the part of the sky covered by clouds", 0], ["harmattan", "a dry dusty wind that blows over Nigeria from November to March", 0], ["rainy season", "the time of year when it rains often", 0], ["dry season", "the time of year with little or no rain", 0], ["forecast", "a report that tells what the weather will be"]] }
        ]
    });

    X("climate-change", "Climate and climate change", {
        i: "Climate is the average weather of a place over many years. Climate change is a long-term change, mainly warming caused by burning fossil fuels and cutting forests, which add greenhouse gases to the air.",
        r: "Flooding in Lagos, longer dry spells in the north and hotter days are linked to climate change. Using solar power and planting trees can help.",
        k: ["Greenhouse gases trap heat: carbon dioxide, methane.", "Effects: drought, floods, rising sea level, heat waves.", "Causes: burning fossil fuels, deforestation.", "Actions: renewable energy, trees, saving energy."],
        e: ["Name a greenhouse gas.", ["It traps heat in the air.", "Carbon dioxide."], "Carbon dioxide"],
        d: D.flow("How warming happens", ["Burning fuels and cutting trees add greenhouse gases", "Gases trap more heat near the Earth", "Temperatures rise", "Droughts, floods and rising seas follow"]),
        m: "Mixing up the ozone hole with global warming. They are different problems."
    }, {
        pairs: [["climate", "the average weather of a place over many years", 0], ["climate change", "a long-term change in the climate of the Earth", 0], ["global warming", "the slow rise in the temperature of the Earth", 0], ["greenhouse effect", "the trapping of heat by gases in the atmosphere", 0], ["fossil fuel", "a fuel made from the remains of ancient plants and animals, such as coal and oil"], ["drought", "a long time with very little or no rain"], ["flood", "a large amount of water covering land that is usually dry"], ["desertification", "the spread of desert into dry farmland", 0], ["sea level rise", "the increase in the height of the sea caused by melting ice and warming", 0], ["melting ice cap", "the loss of ice at the poles because of warming"], ["heat wave", "a long period of very hot weather"], ["mitigation", "actions that reduce the causes of climate change", 0], ["carbon dioxide", "the main greenhouse gas, made when fuels burn", 0], ["methane", "a greenhouse gas that comes from rubbish dumps and cattle", 0], ["solar panel", "a device that changes sunlight into electricity"], ["climate zone", "a large region with a similar climate"]]
    });
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
    var h = root.CMLearnBst.h, X = h.X, S = h.S, D = h.D;
    S("Matter and Materials");

    X("states", "Matter and its states", {
        i: "Matter is anything that has mass and takes up space. It exists as a solid, a liquid or a gas, depending on how its particles are arranged.",
        r: "Ice, water and steam are all the same matter in three states. A stone is a solid, kerosene is a liquid and cooking gas is a gas.",
        k: ["Solid: fixed shape and volume.", "Liquid: fixed volume, takes the shape of its container.", "Gas: no fixed shape or volume.", "Particles are tightly packed in solids and far apart in gases."],
        e: ["Which state has a fixed volume but no fixed shape?", ["A solid has both.", "A gas has neither.", "A liquid has volume only."], "Liquid"],
        d: D.particles(),
        m: "Thinking air is not matter because we cannot see it. Air has mass and takes up space."
    }, {
        cats: { "solid": ["stone", "wood", "iron nail", "ice", "sugar", "chalk", "book"], "liquid": ["water", "kerosene", "palm oil", "milk", "petrol", "honey"], "gas": ["oxygen", "steam", "carbon dioxide", "hydrogen", "cooking gas", "nitrogen"] },
        pairs: [["matter", "anything that has mass and takes up space", 0], ["mass", "the amount of matter in an object", 0], ["volume", "the amount of space that something takes up", 0], ["particle", "a tiny piece of matter"], ["solid", "a state of matter with a fixed shape and a fixed volume"], ["liquid", "a state of matter with a fixed volume but no fixed shape"], ["gas", "a state of matter with no fixed shape and no fixed volume"], ["fluid", "a liquid or gas, because it can flow"], ["compressible", "able to be squeezed into a smaller space"], ["rigid", "hard and not easily bent"], ["diffusion", "the spreading of particles of a substance from where there are many to where there are few", 0], ["density", "how much mass is packed into a given volume", 0], ["weight", "the pull of gravity on an object", 0], ["kilogram", "the unit of mass"], ["measuring cylinder", "a tall container with a scale for measuring the volume of liquids"], ["balance", "an instrument for measuring mass"]]
    });

    X("changes-state", "Changes of state", {
        i: "Matter can change state when heated or cooled. Melting, freezing, evaporation, condensation, boiling and sublimation are changes of state.",
        r: "Butter melts in a hot pan. Water boils at 100 degrees Celsius. Cold glasses get drops of water from condensation.",
        k: ["Melting: solid to liquid; freezing: liquid to solid.", "Evaporation and boiling: liquid to gas.", "Condensation: gas to liquid.", "Sublimation: solid straight to gas."],
        e: ["What is the change from liquid to gas called?", ["The liquid is heated.", "It becomes vapour."], "Evaporation or boiling"],
        d: D.cycle("Changes of state", ["Solid", "Melting to liquid", "Boiling to gas", "Condensing back to liquid"]),
        m: "Thinking the melting point of ice is 100 degrees. Ice melts at 0 degrees Celsius; water boils at 100."
    }, {
        mcq: [["At what temperature does pure water boil?", "100 degrees Celsius", ["0 degrees Celsius", "50 degrees Celsius", "200 degrees Celsius"], "At normal pressure."], ["Ice melts at:", "0 degrees Celsius", ["10 degrees Celsius", "100 degrees Celsius", "-10 degrees Celsius"], "Melting point of ice."]],
        cats: { "change that needs heat": ["melting", "boiling", "evaporation", "sublimation of dry ice"], "change that needs cooling": ["freezing", "condensation", "dew forming", "making ice blocks"] },
        pairs: [["melting", "the change of a solid into a liquid when heated", 0], ["freezing", "the change of a liquid into a solid when cooled", 0], ["evaporation", "the slow change of a liquid into a gas at its surface", 0], ["condensation", "the change of a gas into a liquid when cooled", 0], ["boiling", "the fast change of a liquid into a gas all through the liquid", 0], ["sublimation", "the change of a solid straight into a gas", 0], ["melting point", "the temperature at which a solid melts"], ["boiling point", "the temperature at which a liquid boils"], ["freezing point", "the temperature at which a liquid freezes"], ["steam", "water in the form of hot gas", 0], ["ice", "water in solid form", 0], ["water vapour", "water as an invisible gas", 0], ["thermometer", "an instrument for measuring temperature"], ["temperature", "how hot or cold something is", 0], ["heat", "a form of energy that makes things hotter", 0], ["degree Celsius", "the unit for measuring temperature"]]
    });

    X("properties-sgl", "Properties of materials", {
        i: "Materials have properties such as hardness, flexibility, transparency, strength and the ability to float, conduct or dissolve. We choose a material for a job by its properties.",
        r: "Glass is used for windows because it is transparent. Rubber is used for tyres because it is elastic. Iron pots conduct heat.",
        k: ["Transparent: clear (glass).", "Opaque: blocks light (wood).", "Translucent: lets some light through (tracing paper).", "Elastic, brittle, malleable and ductile describe how a material behaves."],
        e: ["Why are cooking pots made of metal?", ["The pot must pass heat to the food.", "Metals conduct heat."], "Metals conduct heat"],
        d: D.table("Properties and uses", ["Property", "Example"], [["Transparent", "glass window"], ["Elastic", "rubber band"], ["Hard", "diamond, iron"], ["Absorbent", "sponge, towel"], ["Waterproof", "plastic raincoat"]]),
        m: "Thinking hard means strong. Glass is hard but brittle."
    }, {
        cats: { "transparent material": ["glass", "clear plastic", "clean water", "cellophane"], "opaque material": ["wood", "metal", "brick", "cardboard"], "translucent material": ["tracing paper", "frosted glass", "wax paper", "thin cloth"], "elastic material": ["rubber band", "spring", "elastic cord", "balloon"] },
        pairs: [["hardness", "how difficult it is to scratch or dent a material", 0], ["flexible", "able to bend without breaking"], ["transparent", "letting light pass through so that we see clearly"], ["opaque", "not letting any light pass through"], ["translucent", "letting some light through but not a clear picture"], ["magnetic", "attracted to a magnet"], ["elastic", "able to stretch and return to its shape"], ["brittle", "breaking easily when hit"], ["malleable", "able to be hammered into shape"], ["ductile", "able to be drawn into a thin wire"], ["waterproof", "not letting water pass through"], ["absorbent", "able to soak up liquids"], ["lustre", "the shiny look of a surface", 0], ["buoyancy", "the ability to float", 0], ["strength", "the ability to carry a load without breaking", 0], ["insulator", "a material that does not let heat or electricity pass easily"]]
    });

    X("elements-compounds-mixtures", "Elements, compounds and mixtures", {
        i: "An element is made of only one kind of atom. A compound is two or more elements joined chemically. A mixture has substances mixed but not joined, and they can be separated easily.",
        r: "Iron and gold are elements. Water (H2O) and salt (NaCl) are compounds. Sea water and air are mixtures.",
        k: ["Elements have symbols: O, H, C, Fe, Na.", "Compounds have fixed formulae: H2O, CO2.", "Mixtures can be separated by physical means.", "Alloys such as brass are mixtures of metals."],
        e: ["Is water an element, compound or mixture?", ["It has hydrogen and oxygen joined.", "Chemically joined, fixed amounts."], "Compound"],
        d: D.cards("Three kinds of substance", [["Element", "one kind of atom: oxygen, iron, gold"], ["Compound", "joined elements: water, salt, CO2"], ["Mixture", "not joined: air, sea water, soil"]]),
        m: "Thinking air is a compound. Air is a mixture of gases."
    }, {
        cats: { "element": ["oxygen", "iron", "copper", "gold", "carbon", "hydrogen", "sulphur", "aluminium", "silver"], "compound": ["water", "common salt", "carbon dioxide", "sugar", "chalk", "baking soda"], "mixture": ["air", "sea water", "soil", "brass", "orange juice"] },
        sets: [
            { style: "def", pairs: [["element", "a substance made of only one kind of atom"], ["compound", "a substance made when two or more elements join chemically"], ["mixture", "two or more substances mixed but not joined chemically"], ["atom", "the smallest particle of an element"], ["molecule", "two or more atoms joined together"], ["symbol", "the letter or letters used to stand for an element"], ["pure substance", "a substance with only one kind of particle in it"], ["alloy", "a mixture of a metal with other elements"], ["chemical formula", "the letters and numbers that show what a compound is made of"], ["periodic table", "a chart that arranges all the known elements"]] },
            { style: "fact", ctx: "substance", pairs: [["oxygen", "has the symbol O"], ["hydrogen", "has the symbol H"], ["carbon", "has the symbol C"], ["iron", "has the symbol Fe"], ["sodium", "has the symbol Na"], ["copper", "has the symbol Cu"], ["gold", "has the symbol Au"], ["silver", "has the symbol Ag"], ["nitrogen", "has the symbol N"], ["calcium", "has the symbol Ca"], ["sulphur", "has the symbol S"], ["aluminium", "has the symbol Al"], ["potassium", "has the symbol K"], ["water", "has the formula H2O"], ["carbon dioxide", "has the formula CO2"], ["common salt", "has the formula NaCl"]] }
        ]
    });

    X("separating", "Separating mixtures", {
        i: "Mixtures can be separated by physical methods that use differences in size, magnetism, solubility or boiling point: filtration, evaporation, decantation, sieving, magnet, distillation and winnowing.",
        r: "Mama picks stones from rice, sieves flour, winnows beans and boils sea water to get salt.",
        k: ["Filtration: insoluble solid from liquid.", "Evaporation: soluble solid from solution.", "Distillation: pure liquid from solution.", "Magnet: iron from sand."],
        e: ["How do you separate iron filings from sand?", ["Iron is magnetic.", "Sand is not."], "Use a magnet"],
        d: D.table("Method and mixture", ["Mixture", "Method"], [["Sand and water", "filtration"], ["Salt and water", "evaporation"], ["Iron and sand", "magnet"], ["Chaff and grain", "winnowing"], ["Water and alcohol", "distillation"]]),
        m: "Using filtration to get salt from salt water. Salt passes through the filter paper; use evaporation."
    }, {
        mcq: [["Which method separates sand from water?", "Filtration", ["Magnet", "Distillation", "Winnowing"], "Sand is insoluble."], ["Which method gets common salt from sea water?", "Evaporation", ["Filtration", "Sieving", "Magnet"], "Water evaporates, leaving salt."], ["Which method separates oil from water?", "Separating funnel", ["Magnet", "Winnowing", "Filtration"], "Oil floats on water and is run off."], ["Which method can remove stones from rice?", "Handpicking", ["Evaporation", "Distillation", "Condensation"], "Stones are large and visible."]],
        pairs: [["filtration", "separating an insoluble solid from a liquid using filter paper", 0], ["evaporation", "heating a solution so that the liquid escapes and a solid is left", 0], ["decantation", "pouring off a liquid from a solid that has settled", 0], ["sieving", "separating particles of different sizes using a sieve", 0], ["magnetic separation", "using a magnet to remove magnetic materials from a mixture", 0], ["distillation", "boiling a liquid and collecting the cooled vapour", 0], ["winnowing", "using wind to blow light husks away from heavy grain", 0], ["sedimentation", "letting heavy particles settle at the bottom of a liquid", 0], ["crystallisation", "letting a hot solution cool slowly to form crystals", 0], ["chromatography", "separating coloured substances on a strip of paper", 0], ["handpicking", "removing unwanted pieces by hand, such as stones from rice", 0], ["filtrate", "the clear liquid that passes through filter paper", 0], ["residue", "the solid left on the filter paper", 0], ["funnel", "a cone-shaped tool for pouring liquids or holding filter paper"], ["condenser", "a tube that cools vapour back into a liquid"], ["separating funnel", "a glass tool used to separate two liquids that do not mix"]]
    });

    X("solutions", "Solutions, solvents and solubility", {
        i: "A solution forms when a solute dissolves in a solvent. Water is called the universal solvent. A substance that dissolves is soluble; one that does not is insoluble.",
        r: "Sugar dissolves in tea to make a sweet solution. Sand does not dissolve in water.",
        k: ["Solute + solvent = solution.", "Soluble: sugar, salt. Insoluble: sand, chalk.", "A saturated solution cannot dissolve more.", "Warm water dissolves more solid."],
        e: ["In salt water, which is the solute?", ["Salt dissolves.", "The thing dissolved is the solute."], "Salt"],
        d: D.flow("Making a solution", ["Add the solute (sugar) to the solvent (water)", "Stir to help it dissolve", "The solid seems to disappear", "A clear solution forms"]),
        m: "Saying that a dissolved solid has disappeared. It is still there; evaporate the water to get it back."
    }, {
        cats: { "substance that is soluble in water": ["salt", "sugar", "glucose", "alum", "copper sulphate"], "substance that is insoluble in water": ["sand", "chalk", "flour", "wood dust", "stones"] },
        pairs: [["solute", "the substance that dissolves in a liquid"], ["solvent", "the liquid in which a substance dissolves"], ["solution", "a clear mixture formed when a solute dissolves in a solvent"], ["soluble", "able to dissolve in a liquid"], ["insoluble", "not able to dissolve in a liquid"], ["dissolve", "to mix completely with a liquid so that the solid cannot be seen"], ["saturated solution", "a solution that cannot dissolve any more solute"], ["concentrated solution", "a solution with a lot of solute in it"], ["dilute solution", "a solution with only a little solute in it"], ["suspension", "a cloudy mixture in which solid pieces float and later settle"], ["solubility", "how much of a solute can dissolve in a solvent", 0], ["emulsion", "a mixture of two liquids that do not mix, such as oil shaken with water"], ["universal solvent", "water, because it dissolves more substances than any other liquid"], ["stirring", "moving a mixture round to help a solid dissolve", 0], ["aqueous solution", "a solution in which water is the solvent"], ["brine", "a strong solution of salt in water", 0]]
    });

    X("acids-bases", "Acids, bases and indicators", {
        i: "Acids taste sour and turn blue litmus red. Bases (alkalis) feel soapy and turn red litmus blue. Indicators show which. The pH scale runs from 0 to 14: below 7 acid, 7 neutral, above 7 base.",
        r: "Lemon juice is an acid. Soap is a base. A person with indigestion takes an antacid, a base that neutralises stomach acid.",
        k: ["Acid: sour, pH below 7.", "Base: soapy, pH above 7.", "Neutral: pure water, pH 7.", "Acid + base gives salt and water (neutralisation)."],
        e: ["Which colour does blue litmus turn in vinegar?", ["Vinegar is acidic.", "Acids turn blue litmus red."], "Red"],
        d: D.phScale(),
        m: "Tasting chemicals to test them. Never taste unknown substances; use an indicator."
    }, {
        mcq: [["The pH of pure water is:", "7", ["1", "10", "14"], "Pure water is neutral."], ["Which of these is a base?", "Soap solution", ["Lemon juice", "Vinegar", "Orange juice"], "Soap is slippery and basic."]],
        cats: { "acid": ["lemon juice", "vinegar", "orange juice", "tamarind", "sour milk", "stomach juice"], "base": ["soap", "baking soda solution", "lime water", "toothpaste", "milk of magnesia", "ammonia solution"], "neutral substance": ["pure water", "sugar solution", "salt solution"] },
        pairs: [["acid", "a substance with a sour taste that turns blue litmus red"], ["base", "a substance that feels soapy and turns red litmus blue"], ["alkali", "a base that dissolves in water"], ["indicator", "a substance that changes colour in acids and bases"], ["litmus paper", "paper that is red in acids and blue in bases", 0], ["neutral", "neither an acid nor a base", 0], ["pH scale", "a number scale from 0 to 14 that shows how acidic or basic a substance is"], ["neutralisation", "the reaction of an acid with a base to form a salt and water", 0], ["salt", "a substance made when an acid reacts with a base"], ["corrosive", "able to eat away metals, skin or other materials", 0], ["antacid", "a medicine that neutralises stomach acid"], ["indigestion", "pain in the stomach caused by too much acid", 0], ["universal indicator", "a mixture of dyes that shows the pH by many colours", 0], ["hydrochloric acid", "the acid found in the stomach", 0], ["citric acid", "the acid in lemons and oranges", 0], ["sulphuric acid", "the strong acid used in car batteries", 0]]
    });

    X("physical-chemical", "Physical and chemical changes", {
        i: "In a physical change no new substance is made and it is often reversible, like melting ice. In a chemical change a new substance is made and it is usually not reversible, like burning wood.",
        r: "Dissolving sugar is physical. Frying an egg, baking bread and rotting fruit are chemical changes.",
        k: ["Physical: melting, freezing, dissolving, tearing.", "Chemical: burning, rusting, cooking, rotting.", "Signs of chemical change: new substance, gas, colour change, heat or light.", "Chemical changes are usually irreversible."],
        e: ["Is cooking an egg a physical or chemical change?", ["The egg cannot be changed back.", "A new substance forms."], "Chemical change"],
        d: D.table("Types of change", ["Physical", "Chemical"], [["melting ice", "burning wood"], ["tearing paper", "rusting iron"], ["dissolving sugar", "cooking rice"], ["boiling water", "baking a cake"], ["freezing water", "rotting fruit"]]),
        m: "Thinking boiling water is a chemical change. Steam is still water."
    }, {
        cats: { "physical change": ["melting ice", "tearing paper", "dissolving sugar", "boiling water", "cutting wood", "crushing a can", "breaking glass", "freezing water"], "chemical change": ["burning wood", "rusting iron", "cooking an egg", "rotting fruit", "baking bread", "frying yam", "milk turning sour", "digesting food"] },
        pairs: [["physical change", "a change in which no new substance is made"], ["chemical change", "a change in which a new substance is made"], ["reversible change", "a change that can be undone"], ["irreversible change", "a change that cannot be undone"], ["fermentation", "the change of sugar into alcohol by yeast", 0], ["decay", "the breaking down of dead plants and animals by germs", 0], ["combustion", "the burning of a substance in oxygen", 0], ["ash", "the grey powder left after burning", 0], ["dissolving", "the mixing of a solid into a liquid so that it seems to disappear", 0], ["cooking", "using heat to change food chemically", 0], ["new substance", "a substance with properties different from the ones we started with"], ["photosynthesis", "the chemical change in which green plants make food using sunlight", 0], ["effervescence", "the fizzing made when a gas is given off", 0], ["souring", "the change of fresh milk into sour milk by bacteria", 0], ["digestion", "the chemical breakdown of food in the body", 0], ["precipitate", "a solid that forms in a liquid during a chemical reaction"]]
    });

    X("rusting", "Rusting and corrosion", {
        i: "Rusting is the slow change of iron into reddish-brown rust when it is in contact with oxygen (air) and water. Corrosion is the slow wearing away of metals by chemical change.",
        r: "Iron roofing sheets rust at the coast because of the salty air. Painting, oiling and galvanising protect iron.",
        k: ["Rust needs oxygen and water.", "Salt speeds up rusting.", "Protect iron with paint, oil, grease, zinc coating.", "Stainless steel does not rust easily."],
        e: ["Why does an iron nail rust in moist air?", ["It touches oxygen and water.", "Both are needed."], "Because iron reacts with oxygen and water"],
        d: D.triangle("Rust needs three things", "Iron", "Oxygen", "Water", "RUST"),
        m: "Thinking rust is only on the surface and does no harm. Rust weakens the metal."
    }, {
        cats: { "way of preventing rust": ["painting", "oiling", "greasing", "galvanising", "using stainless steel", "coating with plastic"], "thing that makes iron rust faster": ["salt water", "acid rain", "humid air", "sea spray"] },
        pairs: [["rust", "the reddish-brown coating that forms on iron when it reacts with oxygen and water", 0], ["rusting", "the slow change of iron into rust", 0], ["corrosion", "the slow wearing away of metals by chemical change", 0], ["oxidation", "a reaction in which a substance combines with oxygen", 0], ["galvanising", "coating iron with zinc to stop it from rusting", 0], ["painting", "covering metal with paint to keep out air and water", 0], ["oiling", "smearing oil on metal to keep out water and air", 0], ["stainless steel", "an alloy of iron that does not rust easily", 0], ["tarnish", "the dull coating that forms on silver or copper", 0], ["alloy", "a mixture of a metal with other elements"], ["zinc", "the metal used to coat iron roofing sheets", 0], ["iron oxide", "the chemical name of rust", 0], ["galvanised sheet", "an iron sheet coated with zinc"], ["electroplating", "coating a metal with a thin layer of another metal using electricity", 0], ["chrome", "a shiny metal coating used on car bumpers", 0], ["moisture", "a small amount of water in the air or on a surface", 0]]
    });

    X("burning-fire", "Burning and fire safety", {
        i: "Burning (combustion) is a chemical change in which a fuel reacts with oxygen and gives out heat and light. Fire needs fuel, heat and oxygen (the fire triangle). Take one away and the fire goes out.",
        r: "A candle goes out under a jar when the oxygen is used up. A fire blanket smothers a pan fire. Never pour water on a petrol or electrical fire.",
        k: ["Fire triangle: fuel, heat, oxygen.", "Put out fires by cooling, smothering or removing fuel.", "Keep matches away from children.", "Know the nearest exit and extinguisher."],
        e: ["How does a fire blanket put out a fire?", ["It covers the fire.", "It cuts off oxygen."], "By cutting off the oxygen"],
        d: D.triangle("The fire triangle", "Fuel", "Heat", "Oxygen", "FIRE"),
        m: "Using water on an oil or electrical fire. This can spread the fire or cause shock."
    }, {
        cats: { "fuel": ["firewood", "kerosene", "petrol", "charcoal", "cooking gas", "diesel"], "way of putting out a fire": ["water", "sand", "fire blanket", "fire extinguisher", "wet cloth"], "cause of fire": ["leaving matches with children", "a candle left burning", "faulty wiring", "a leaking gas cooker", "an overloaded socket"] },
        pairs: [["combustion", "the burning of a substance in oxygen", 0], ["fuel", "a material that burns to give heat or power"], ["flammable", "easily set on fire", 0], ["fire triangle", "the three things needed for a fire: fuel, heat and oxygen"], ["fire extinguisher", "a metal cylinder that puts out small fires"], ["fire blanket", "a thick cloth used to smother a small fire"], ["smothering", "cutting off the supply of oxygen to a fire", 0], ["kindling", "small dry sticks used to start a fire", 0], ["ember", "a glowing piece of coal or wood in a dying fire"], ["flame", "the glowing gas that we see when something burns"], ["ash", "the grey powder left after burning", 0], ["smoke", "tiny solid particles and gases given off by burning", 0], ["spark", "a tiny glowing piece thrown off from a fire or an electrical fault"], ["fire drill", "practice of leaving a building safely when there is a fire"], ["fireproof", "not able to burn", 0], ["ignite", "to start to burn", 0]]
    });

    X("metals-nonmetals", "Metals and non-metals", {
        i: "Metals are shiny, hard, strong, malleable, ductile and good conductors of heat and electricity. Non-metals are usually dull, brittle and poor conductors. Alloys are mixtures of metals.",
        r: "Copper wire carries electricity. Aluminium pots cook food. Sulphur and carbon are non-metals. Brass and bronze are alloys.",
        k: ["Metals: iron, copper, aluminium, gold, zinc.", "Non-metals: sulphur, carbon, oxygen.", "Mercury is the only liquid metal.", "Steel is an alloy of iron and carbon."],
        e: ["Why are electric wires made of copper?", ["Wires must carry electricity.", "Copper is a good conductor and ductile."], "Copper is a good conductor and can be drawn into wire"],
        d: D.table("Metals and non-metals", ["Property", "Metal", "Non-metal"], [["Shiny", "yes", "dull"], ["Conducts", "yes", "no"], ["Bends", "malleable", "brittle"], ["Example", "iron, copper", "sulphur, carbon"]]),
        m: "Thinking all metals are magnetic. Only iron, cobalt and nickel are."
    }, {
        cats: { "metal": ["iron", "copper", "aluminium", "gold", "silver", "zinc", "tin", "lead"], "non-metal": ["sulphur", "carbon", "oxygen", "nitrogen", "hydrogen", "phosphorus"] },
        pairs: [["malleable", "able to be hammered into shape without breaking"], ["ductile", "able to be drawn out into a thin wire"], ["lustre", "the shiny look of a metal surface", 0], ["conductor", "a material that lets heat or electricity pass through easily"], ["sonorous", "making a ringing sound when hit"], ["alloy", "a mixture of a metal with other elements"], ["brass", "an alloy of copper and zinc", 0], ["bronze", "an alloy of copper and tin", 0], ["steel", "an alloy of iron and carbon", 0], ["solder", "an alloy of lead and tin used to join metals", 0], ["mercury", "the only metal that is liquid at room temperature", 0], ["graphite", "a non-metal form of carbon that conducts electricity", 0], ["diamond", "the hardest natural substance, a form of carbon", 0], ["ore", "a rock from which a metal is taken"], ["smelting", "heating an ore to get the metal out", 0], ["magnetic metal", "a metal that is attracted to a magnet, such as iron"]]
    });

    X("natural-manmade", "Natural and man-made materials", {
        i: "Natural materials come from plants, animals or the ground, such as wood, cotton, wool, rubber and clay. Man-made (synthetic) materials are made by people from other materials, such as plastic, nylon, glass and cement.",
        r: "A cotton shirt is natural; a polyester shirt is man-made. A clay pot is natural; a plastic bucket is man-made, from petroleum.",
        k: ["Natural: wood, cotton, wool, leather, rubber, silk, clay.", "Man-made: plastic, nylon, glass, cement, steel.", "Raw materials are changed into products.", "Plastic comes from crude oil."],
        e: ["Is glass natural or man-made?", ["It is made by melting sand.", "People make it."], "Man-made"],
        d: D.cards("Two groups of materials", [["Natural", "wood, cotton, wool, leather, rubber, clay"], ["Man-made", "plastic, nylon, glass, cement, steel"]]),
        m: "Thinking that anything natural is safe. Some natural materials are poisonous."
    }, {
        cats: { "natural material": ["wood", "cotton", "wool", "rubber latex", "leather", "clay", "stone", "silk"], "man-made material": ["plastic", "nylon", "glass", "cement", "paper", "steel", "polyester", "brick"] },
        pairs: [["raw material", "a natural material used to make other things"], ["synthetic material", "a material made by people from chemicals", 0], ["fibre", "a thin thread of material used to make cloth"], ["natural fibre", "a thread that comes from plants or animals, such as cotton or wool"], ["synthetic fibre", "a thread made from chemicals, such as nylon"], ["textile", "cloth made by weaving or knitting fibres"], ["plastic", "a light, strong man-made material that can be moulded", 0], ["petroleum", "the oil from which plastics and fuels are made", 0], ["cement", "a grey powder made from limestone and clay and used in building", 0], ["glass", "a hard, clear material made by melting sand", 0], ["brick", "a block made by baking clay"], ["paper", "a thin sheet made from wood pulp", 0], ["rubber", "a stretchy material from the latex of rubber trees", 0], ["cotton", "a soft natural fibre from the cotton plant", 0], ["leather", "the treated skin of an animal", 0], ["pottery", "pots and dishes made from baked clay", 0]]
    });
})(typeof window !== 'undefined' ? window : globalThis);
