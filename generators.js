/* CleverMent My Learning Space - question generators.
   Each topic has a fixed-size POOL of questions. Question number i (0 .. POOL-1) is always the same
   question, so the pool can be counted, tested and reported. Answers are computed by the code. */
(function (root) {
    var POOL = 2000;

    function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
    function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
    function shuffle(r, arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    function naira(n) { return '\u20A6' + fmt(n); }
    function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
    var NAMES = ['Ade', 'Chidi', 'Amina', 'Tunde', 'Ngozi', 'Bola', 'Ibrahim', 'Emeka', 'Funke', 'Musa', 'Zainab', 'Kemi', 'Obinna', 'Halima', 'Segun'];
    var ITEMS = ['oranges', 'mangoes', 'exercise books', 'pencils', 'bags of rice', 'cups', 'eggs', 'balls'];

    function frac(n, d) { var g = gcd(n, d); n /= g; d /= g; if (d === 1) return String(n); if (n > d) { var w = Math.floor(n / d), rem = n % d; return rem ? w + ' ' + rem + '/' + d : String(w); } return n + '/' + d; }

    // Builds the four options. `wrongs` are candidate wrong answers (strings); numeric fallback fills gaps.
    function mcq(r, q, correct, wrongs, explain, svg) {
        correct = String(correct);
        var opts = [correct];
        (wrongs || []).forEach(function (w) { w = String(w); if (opts.indexOf(w) < 0 && opts.length < 4) opts.push(w); });
        var num = Number(String(correct).replace(/[^0-9.\-]/g, '')), k = 1;
        var prefix = correct.charAt(0) === '\u20A6' ? '\u20A6' : '';
        while (opts.length < 4 && isFinite(num) && /\d/.test(correct) && k < 40) {
            var cand = [num + k, num - k, num + 10 * k, num * 2 + k][k % 4];
            if (cand > 0) { var s = prefix + (prefix || correct.indexOf(',') >= 0 ? fmt(cand) : cand) + correct.replace(/^[\u20A60-9,.\-]+/, ''); if (opts.indexOf(s) < 0) opts.push(s); }
            k++;
        }
        if (opts.length < 4) return null;
        var order = shuffle(r, [0, 1, 2, 3]);
        var options = order.map(function (i) { return opts[i]; });
        return { q: q, options: options, answer: options.indexOf(correct), explain: explain, svg: svg || '' };
    }

    // ---------- small diagrams (SVG) ----------
    function svgRect(l, w, unit) {
        return '<svg viewBox="0 0 220 130" width="220" height="130" role="img" aria-label="A rectangle"><rect x="30" y="20" width="150" height="75" fill="#eaf2ff" stroke="#2d6cdf" stroke-width="2"/>' +
            '<text x="105" y="112" text-anchor="middle" font-size="13" fill="#1a1a2e">' + l + ' ' + unit + '</text><text x="190" y="62" font-size="13" fill="#1a1a2e">' + w + ' ' + unit + '</text></svg>';
    }
    function svgSquare(s, unit) {
        return '<svg viewBox="0 0 200 140" width="200" height="140" role="img" aria-label="A square"><rect x="40" y="15" width="90" height="90" fill="#eaf2ff" stroke="#2d6cdf" stroke-width="2"/>' +
            '<text x="85" y="123" text-anchor="middle" font-size="13" fill="#1a1a2e">' + s + ' ' + unit + '</text></svg>';
    }
    function svgTri(b, h, unit) {
        return '<svg viewBox="0 0 220 140" width="220" height="140" role="img" aria-label="A triangle"><polygon points="30,105 190,105 90,20" fill="#eaf2ff" stroke="#2d6cdf" stroke-width="2"/>' +
            '<line x1="90" y1="20" x2="90" y2="105" stroke="#dc3545" stroke-width="1.5" stroke-dasharray="4"/><rect x="90" y="95" width="10" height="10" fill="none" stroke="#dc3545"/>' +
            '<text x="110" y="124" text-anchor="middle" font-size="13" fill="#1a1a2e">base = ' + b + ' ' + unit + '</text><text x="96" y="66" font-size="13" fill="#dc3545">h = ' + h + ' ' + unit + '</text></svg>';
    }
    function svgCircle(label, unit) {
        return '<svg viewBox="0 0 200 150" width="200" height="150" role="img" aria-label="A circle"><circle cx="100" cy="75" r="58" fill="#eaf2ff" stroke="#2d6cdf" stroke-width="2"/>' +
            '<line x1="100" y1="75" x2="158" y2="75" stroke="#dc3545" stroke-width="2"/><circle cx="100" cy="75" r="2.5" fill="#1a1a2e"/><text x="129" y="68" text-anchor="middle" font-size="13" fill="#dc3545">' + label + ' ' + unit + '</text></svg>';
    }
    function svgPara(b, h, unit) {
        return '<svg viewBox="0 0 230 130" width="230" height="130" role="img" aria-label="A parallelogram"><polygon points="20,100 150,100 210,25 80,25" fill="#eaf2ff" stroke="#2d6cdf" stroke-width="2"/>' +
            '<line x1="80" y1="25" x2="80" y2="100" stroke="#dc3545" stroke-width="1.5" stroke-dasharray="4"/><text x="85" y="118" text-anchor="middle" font-size="13" fill="#1a1a2e">base = ' + b + ' ' + unit + '</text><text x="86" y="66" font-size="13" fill="#dc3545">h = ' + h + ' ' + unit + '</text></svg>';
    }
    function svgBar(n, d) {
        var w = 200 / d, out = '<svg viewBox="0 0 220 60" width="220" height="60" role="img" aria-label="A fraction bar">';
        for (var i = 0; i < d; i++) out += '<rect x="' + (10 + i * w) + '" y="12" width="' + w + '" height="34" fill="' + (i < n ? '#2d6cdf' : '#fff') + '" stroke="#1a1a2e" stroke-width="1.5"/>';
        return out + '</svg>';
    }

    var PLACES = ['units', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];
    function digitsDistinct(r, len) { var d = shuffle(r, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); if (d[0] === 0) { var t = d[0]; d[0] = d[1]; d[1] = t; } return d.slice(0, len); }

    // ============ TOPIC 1: WHOLE NUMBERS AND PLACE VALUE ============
    function placeValue(i) {
        var r = rng(1000 + i), t = i % 8, len = ri(r, 4, 7), ds = digitsDistinct(r, len), N = Number(ds.join(''));
        if (t === 0) { var p = ri(r, 0, len - 1), dig = ds[len - 1 - p]; if (dig === 0) dig = ds[(len - p) % len] || 5;
            var pos = ds.indexOf(dig); var place = len - 1 - pos;
            return mcq(r, 'What is the place value of the digit ' + dig + ' in ' + fmt(N) + '?', PLACES[place], [PLACES[(place + 1) % 7], PLACES[(place + 6) % 7], PLACES[(place + 2) % 7], PLACES[(place + 5) % 7]], 'In ' + fmt(N) + ', the digit ' + dig + ' is in the ' + PLACES[place] + ' place.'); }
        if (t === 1) { var pos1 = ri(r, 0, len - 1), d1 = ds[pos1] || 1, pl = len - 1 - pos1; if (d1 === 0) return placeValue(i + 1);
            var val = d1 * Math.pow(10, pl);
            return mcq(r, 'What is the value of the digit ' + d1 + ' in ' + fmt(N) + '?', fmt(val), [fmt(d1 * Math.pow(10, pl + 1)), fmt(d1 * Math.pow(10, Math.max(0, pl - 1))), fmt(d1), fmt(d1 * Math.pow(10, pl + 2))], 'The digit ' + d1 + ' is in the ' + PLACES[pl] + ' place, so its value is ' + d1 + ' \u00D7 ' + fmt(Math.pow(10, pl)) + ' = ' + fmt(val) + '.'); }
        if (t === 2) { var mag = pick(r, [10, 100, 1000]), rd = Math.round(N / mag) * mag; if (N % mag * 2 === mag) return placeValue(i + 1);
            var nm = { 10: 'ten', 100: 'hundred', 1000: 'thousand' }[mag];
            return mcq(r, 'Round ' + fmt(N) + ' to the nearest ' + nm + '.', fmt(rd), [fmt(rd + mag), fmt(rd - mag), fmt(Math.floor(N / mag) * mag + (rd > N ? 0 : 0) + (Math.floor(N / mag) * mag === rd ? mag : 0)), fmt(rd + 2 * mag)], 'Look at the digit to the right of the ' + nm + 's place. If it is 5 or more, round up; otherwise round down. So ' + fmt(N) + ' \u2248 ' + fmt(rd) + '.'); }
        if (t === 3) { var arr = []; while (arr.length < 4) { var x = ri(r, 1000, 999999); if (arr.indexOf(x) < 0) arr.push(x); } var big = r() < 0.5, sorted = arr.slice().sort(function (a, b) { return a - b; }), ans = big ? sorted[3] : sorted[0];
            return mcq(r, 'Which of these numbers is the ' + (big ? 'largest' : 'smallest') + '? ' + arr.map(fmt).join(', '), fmt(ans), arr.filter(function (x) { return x !== ans; }).map(fmt), 'Compare the numbers from the left. The ' + (big ? 'largest' : 'smallest') + ' is ' + fmt(ans) + '.'); }
        if (t === 4) { var parts = [], q = String(N), k; for (k = 0; k < q.length; k++) { var dd = Number(q.charAt(k)); if (dd) parts.push(fmt(dd * Math.pow(10, q.length - 1 - k))); } var correct = parts.join(' + ');
            var alt = parts.slice(); var sw = ri(r, 0, alt.length - 2); var tmp = alt[sw]; alt[sw] = alt[sw + 1]; alt[sw + 1] = tmp;
            var w1 = parts.slice(0, -1).join(' + ') + ' + ' + (parts.length ? fmt(Number(parts[parts.length - 1].replace(/,/g, '')) * 10) : '0');
            var w2 = parts.slice(1).join(' + '); var w3 = parts.map(function (p, ix) { return ix === 0 ? fmt(Number(p.replace(/,/g, '')) / 10 || 1) : p; }).join(' + ');
            return mcq(r, 'Write ' + fmt(N) + ' in expanded form.', correct, [w1, w2, w3, alt.join(' + ')], 'Write each digit with its place value: ' + correct + '.'); }
        if (t === 5) { var A = ri(r, 1200, 48000), B = ri(r, 800, 39000), nm1 = pick(r, NAMES), c = pick(r, ['boys', 'men']), g = c === 'boys' ? 'girls' : 'women';
            return mcq(r, 'A town has ' + fmt(A) + ' ' + c + ' and ' + fmt(B) + ' ' + g + '. How many people are there altogether?', fmt(A + B), [fmt(A + B + 1000), fmt(A + B - 100), fmt(Math.abs(A - B)), fmt(A + B + 10)], fmt(A) + ' + ' + fmt(B) + ' = ' + fmt(A + B) + '.'); }
        if (t === 6) { var n6 = ri(r, 12, 96), pr = ri(r, 15, 90) * 10, who = pick(r, NAMES);
            return mcq(r, who + ' bought ' + n6 + ' exercise books at ' + naira(pr) + ' each. How much did ' + who + ' pay altogether?', naira(n6 * pr), [naira(n6 * pr + pr), naira(n6 * pr - pr), naira((n6 + 10) * pr), naira(n6 * pr + 100)], n6 + ' \u00D7 ' + naira(pr) + ' = ' + naira(n6 * pr) + '.'); }
        var d7 = ri(r, 6, 48), qn = ri(r, 12, 140), tot = d7 * qn, it = pick(r, ITEMS), who7 = pick(r, NAMES);
        return mcq(r, who7 + ' shared ' + fmt(tot) + ' ' + it + ' equally among ' + d7 + ' children. How many did each child get?', String(qn), [String(qn + 1), String(qn - 1), String(qn + 10), String(qn * 2)], fmt(tot) + ' \u00F7 ' + d7 + ' = ' + qn + '.');
    }

    // ============ TOPIC 2: FRACTIONS ============
    function fractions(i) {
        var r = rng(2000 + i), t = i % 8;
        if (t === 0) { var d = ri(r, 2, 9), n = ri(r, 1, d - 1), k = ri(r, 2, 9);
            return mcq(r, 'Which fraction is equivalent to ' + n + '/' + d + '?', (n * k) + '/' + (d * k), [(n * k) + '/' + (d * k + 1), (n + k) + '/' + (d + k), (n * k + 1) + '/' + (d * k), (n * k) + '/' + (d * (k + 1))], 'Multiply the top and the bottom by ' + k + ': ' + n + '/' + d + ' = ' + (n * k) + '/' + (d * k) + '.', svgBar(n, d)); }
        if (t === 1) { var g = ri(r, 2, 9), a = ri(r, 1, 8), b = ri(r, a + 1, 12); while (gcd(a, b) !== 1) { b++; } 
            return mcq(r, 'Express ' + (a * g) + '/' + (b * g) + ' in its simplest form.', a + '/' + b, [(a + 1) + '/' + b, a + '/' + (b + 1), (a * g) + '/' + b, (a * 2) + '/' + (b * 2 + 1)], 'Divide the top and the bottom by their highest common factor, ' + g + ': ' + a + '/' + b + '.'); }
        if (t === 2) { var d1 = ri(r, 2, 9), d2 = ri(r, 2, 9), n1 = ri(r, 1, d1 - 1 || 1), n2 = ri(r, 1, d2 - 1 || 1); if (d1 === d2) d2 = d1 + 1; var L = d1 * d2 / gcd(d1, d2), top = n1 * (L / d1) + n2 * (L / d2), ans = frac(top, L);
            return mcq(r, 'Add: ' + n1 + '/' + d1 + ' + ' + n2 + '/' + d2, ans, [frac(n1 + n2, d1 + d2), frac(top + 1, L), frac(top, L + d1), frac(Math.abs(n1 * (L / d1) - n2 * (L / d2)) || 1, L)], 'The LCM of ' + d1 + ' and ' + d2 + ' is ' + L + '. ' + n1 + '/' + d1 + ' = ' + (n1 * (L / d1)) + '/' + L + ' and ' + n2 + '/' + d2 + ' = ' + (n2 * (L / d2)) + '/' + L + '. Sum = ' + top + '/' + L + ' = ' + ans + '.'); }
        if (t === 3) { var e1 = ri(r, 2, 9), e2 = ri(r, 2, 9); if (e1 === e2) e2++; var m1 = ri(r, 1, e1 - 1 || 1), m2 = ri(r, 1, e2 - 1 || 1), LL = e1 * e2 / gcd(e1, e2), x = m1 * (LL / e1), y = m2 * (LL / e2); if (x <= y) { var sw = m1; m1 = m2; m2 = sw; var sd = e1; e1 = e2; e2 = sd; LL = e1 * e2 / gcd(e1, e2); x = m1 * (LL / e1); y = m2 * (LL / e2); } if (x <= y) return fractions(i + 8);
            var ans2 = frac(x - y, LL);
            return mcq(r, 'Subtract: ' + m1 + '/' + e1 + ' \u2212 ' + m2 + '/' + e2, ans2, [frac(Math.abs(m1 - m2) || 1, Math.abs(e1 - e2) || 1), frac(x - y + 1, LL), frac(x + y, LL), frac(x - y, LL + e1)], 'Common denominator ' + LL + ': ' + x + '/' + LL + ' \u2212 ' + y + '/' + LL + ' = ' + (x - y) + '/' + LL + ' = ' + ans2 + '.'); }
        if (t === 4) { var den = ri(r, 2, 10), num = ri(r, 1, den - 1), base = den * ri(r, 3, 60), who = pick(r, NAMES), ans3 = base / den * num;
            return mcq(r, who + ' has ' + naira(base * 10) + '. ' + who + ' spends ' + num + '/' + den + ' of it. How much was spent?', naira(ans3 * 10), [naira((base / den) * 10), naira((base - ans3) * 10), naira(ans3 * 10 + 100), naira(base * 10 - 100)], num + '/' + den + ' of ' + naira(base * 10) + ' = (' + naira(base * 10) + ' \u00F7 ' + den + ') \u00D7 ' + num + ' = ' + naira(ans3 * 10) + '.'); }
        if (t === 5) { var w = ri(r, 1, 9), dd = ri(r, 2, 9), nn = ri(r, 1, dd - 1); 
            return mcq(r, 'Change ' + w + ' ' + nn + '/' + dd + ' to an improper fraction.', (w * dd + nn) + '/' + dd, [(w + nn) + '/' + dd, (w * dd) + '/' + nn, (w * dd + nn) + '/' + (dd + 1), (w * nn + dd) + '/' + dd], 'Multiply the whole number by the denominator and add the numerator: ' + w + ' \u00D7 ' + dd + ' + ' + nn + ' = ' + (w * dd + nn) + ', so ' + (w * dd + nn) + '/' + dd + '.'); }
        if (t === 6) { var p = ri(r, 1, 8), q = ri(r, p + 1, 10), s = ri(r, 1, 8), u = ri(r, s + 1, 10); if (p * u === s * q) return fractions(i + 8); var big = p * u > s * q;
            return mcq(r, 'Which is greater: ' + p + '/' + q + ' or ' + s + '/' + u + '?', big ? p + '/' + q : s + '/' + u, [big ? s + '/' + u : p + '/' + q, 'They are equal', 'Cannot be told', 'Both are 1'], 'Cross-multiply: ' + p + ' \u00D7 ' + u + ' = ' + (p * u) + ' and ' + s + ' \u00D7 ' + q + ' = ' + (s * q) + '. The larger product shows the larger fraction.'); }
        var d9 = ri(r, 3, 9), k9 = ri(r, 2, 9), who9 = pick(r, NAMES), n9 = ri(r, 1, d9 - 1), left = d9 - n9;
        return mcq(r, who9 + ' ate ' + n9 + '/' + d9 + ' of a cake. What fraction of the cake is left?', frac(left, d9), [frac(n9, d9), frac(left + 1, d9), frac(left, d9 + 1), frac(n9 + 1, d9)], 'The whole cake is ' + d9 + '/' + d9 + '. ' + d9 + '/' + d9 + ' \u2212 ' + n9 + '/' + d9 + ' = ' + left + '/' + d9 + (gcd(left, d9) > 1 ? ' = ' + frac(left, d9) : '') + '.', svgBar(left, d9));
    }

    // ============ TOPIC 3: PERCENTAGES ============
    function percentages(i) {
        var r = rng(3000 + i), t = i % 9, who = pick(r, NAMES);
        if (t === 0) { var p = pick(r, [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80]), N = ri(r, 2, 60) * 20 * (p % 3 === 0 ? 1 : 1), ans = N * p / 100; if (ans !== Math.floor(ans)) return percentages(i + 9);
            return mcq(r, 'Find ' + p + '% of ' + naira(N) + '.', naira(ans), [naira(ans * 2), naira(N - ans), naira(ans + 100), naira(Math.round(ans / 2))], p + '% of ' + naira(N) + ' = ' + p + '/100 \u00D7 ' + naira(N) + ' = ' + naira(ans) + '.'); }
        if (t === 1) { var d = pick(r, [2, 4, 5, 10, 20, 25, 50]), n = ri(r, 1, d - 1), pc = n * 100 / d;
            return mcq(r, 'Express ' + n + '/' + d + ' as a percentage.', pc + '%', [(pc + 5) + '%', (pc / 2) + '%', (pc + 10) + '%', Math.max(1, pc - 5) + '%'], n + '/' + d + ' \u00D7 100% = ' + pc + '%.', svgBar(n, d)); }
        if (t === 2) { var pp = pick(r, [5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 65, 70, 75, 80, 85, 90]), g = gcd(pp, 100);
            return mcq(r, 'Express ' + pp + '% as a fraction in its simplest form.', frac(pp, 100), [pp + '/10', frac(pp + 5, 100), frac(100 - pp, 100), pp + '/1000'], pp + '% = ' + pp + '/100 = ' + frac(pp, 100) + '.'); }
        if (t === 3) { var base = ri(r, 4, 80) * 50, pi = pick(r, [10, 20, 25, 30, 40, 50]), inc = base * pi / 100;
            return mcq(r, 'The price of a bag of rice is ' + naira(base) + '. It is increased by ' + pi + '%. What is the new price?', naira(base + inc), [naira(base - inc), naira(inc), naira(base + inc * 2), naira(base + inc + 500)], 'Increase = ' + pi + '% of ' + naira(base) + ' = ' + naira(inc) + '. New price = ' + naira(base) + ' + ' + naira(inc) + ' = ' + naira(base + inc) + '.'); }
        if (t === 4) { var pr = ri(r, 4, 100) * 100, di = pick(r, [5, 10, 20, 25, 50]), off = pr * di / 100;
            return mcq(r, 'A shirt costs ' + naira(pr) + '. A shop gives a ' + di + '% discount. How much does ' + who + ' pay?', naira(pr - off), [naira(pr + off), naira(off), naira(pr - off * 2 > 0 ? pr - off * 2 : pr - off + 200), naira(pr - off + 100)], 'Discount = ' + di + '% of ' + naira(pr) + ' = ' + naira(off) + '. Amount paid = ' + naira(pr) + ' \u2212 ' + naira(off) + ' = ' + naira(pr - off) + '.'); }
        if (t === 5) { var B = pick(r, [20, 25, 40, 50, 80, 100, 200, 250, 400, 500]), A = ri(r, 1, B - 1); var pc5 = A * 100 / B; if (pc5 !== Math.floor(pc5)) return percentages(i + 9);
            return mcq(r, 'What percentage of ' + B + ' is ' + A + '?', pc5 + '%', [(pc5 + 10) + '%', (100 - pc5 || 5) + '%', (pc5 * 2) + '%', Math.max(1, pc5 - 5) + '%'], A + '/' + B + ' \u00D7 100% = ' + pc5 + '%.'); }
        if (t === 6) { var cp = ri(r, 2, 60) * 100, pf = pick(r, [10, 20, 25, 30, 40, 50]), prof = cp * pf / 100;
            return mcq(r, who + ' bought a goat for ' + naira(cp) + ' and sold it for ' + naira(cp + prof) + '. Find the profit percent.', pf + '%', [(pf + 5) + '%', (pf * 2) + '%', Math.max(1, pf - 5) + '%', (pf + 10) + '%'], 'Profit = ' + naira(cp + prof) + ' \u2212 ' + naira(cp) + ' = ' + naira(prof) + '. Profit % = ' + naira(prof) + '/' + naira(cp) + ' \u00D7 100% = ' + pf + '%.'); }
        if (t === 7) { var tot = pick(r, [20, 25, 40, 50, 80, 100]), sc = ri(r, 1, tot - 1); var ps = sc * 100 / tot; if (ps !== Math.floor(ps)) return percentages(i + 9);
            return mcq(r, who + ' scored ' + sc + ' out of ' + tot + ' in a test. What is the score in percent?', ps + '%', [(ps + 10) + '%', (ps - 5 > 0 ? ps - 5 : ps + 5) + '%', (100 - ps || 3) + '%', (ps + 5) + '%'], sc + '/' + tot + ' \u00D7 100% = ' + ps + '%.'); }
        var pupils = ri(r, 4, 30) * 20, gp = pick(r, [20, 25, 40, 45, 55, 60, 65, 70]), girls = pupils * gp / 100; if (girls !== Math.floor(girls)) return percentages(i + 9);
        return mcq(r, gp + '% of the ' + pupils + ' pupils in a school are girls. How many boys are there?', String(pupils - girls), [String(girls), String(pupils - girls + 10), String(pupils - girls - 10 > 0 ? pupils - girls - 10 : pupils - girls + 20), String(pupils / 2)], 'Girls = ' + gp + '% of ' + pupils + ' = ' + girls + '. Boys = ' + pupils + ' \u2212 ' + girls + ' = ' + (pupils - girls) + '.');
    }

    // ============ TOPIC 4: PERIMETER AND AREA ============
    function perimeterArea(i) {
        var r = rng(4000 + i), t = i % 11, u = pick(r, ['cm', 'm']), who = pick(r, NAMES);
        if (t === 0) { var l = ri(r, 5, 60), w = ri(r, 3, l); if (l === w) l++;
            return mcq(r, 'Find the area of the rectangle shown.', (l * w) + ' ' + u + '\u00B2', [(2 * (l + w)) + ' ' + u + '\u00B2', (l + w) + ' ' + u + '\u00B2', (l * w + l) + ' ' + u + '\u00B2', (l * l) + ' ' + u + '\u00B2'], 'Area = length \u00D7 width = ' + l + ' \u00D7 ' + w + ' = ' + (l * w) + ' ' + u + '\u00B2.', svgRect(l, w, u)); }
        if (t === 1) { var l1 = ri(r, 6, 80), w1 = ri(r, 3, l1 - 1);
            return mcq(r, 'Find the perimeter of the rectangle shown.', (2 * (l1 + w1)) + ' ' + u, [(l1 * w1) + ' ' + u, (l1 + w1) + ' ' + u, (2 * l1 + w1) + ' ' + u, (4 * l1) + ' ' + u], 'Perimeter = 2 \u00D7 (length + width) = 2 \u00D7 (' + l1 + ' + ' + w1 + ') = ' + (2 * (l1 + w1)) + ' ' + u + '.', svgRect(l1, w1, u)); }
        if (t === 2) { var s = ri(r, 3, 40);
            return mcq(r, 'Find the area of a square of side ' + s + ' ' + u + '.', (s * s) + ' ' + u + '\u00B2', [(4 * s) + ' ' + u + '\u00B2', (2 * s) + ' ' + u + '\u00B2', (s * s + s) + ' ' + u + '\u00B2', (s * 3) + ' ' + u + '\u00B2'], 'Area of a square = side \u00D7 side = ' + s + ' \u00D7 ' + s + ' = ' + (s * s) + ' ' + u + '\u00B2.', svgSquare(s, u)); }
        if (t === 3) { var s3 = ri(r, 3, 90);
            return mcq(r, 'Find the perimeter of a square of side ' + s3 + ' ' + u + '.', (4 * s3) + ' ' + u, [(s3 * s3) + ' ' + u, (2 * s3) + ' ' + u, (3 * s3) + ' ' + u, (4 * s3 + 4) + ' ' + u], 'Perimeter of a square = 4 \u00D7 side = 4 \u00D7 ' + s3 + ' = ' + (4 * s3) + ' ' + u + '.', svgSquare(s3, u)); }
        if (t === 4) { var b = ri(r, 3, 40) * 2, h = ri(r, 3, 40);
            return mcq(r, 'Find the area of the triangle shown.', (b * h / 2) + ' ' + u + '\u00B2', [(b * h) + ' ' + u + '\u00B2', (b + h) + ' ' + u + '\u00B2', (b * h / 2 + b) + ' ' + u + '\u00B2', (b * h / 4) + ' ' + u + '\u00B2'], 'Area of a triangle = \u00BD \u00D7 base \u00D7 height = \u00BD \u00D7 ' + b + ' \u00D7 ' + h + ' = ' + (b * h / 2) + ' ' + u + '\u00B2.', svgTri(b, h, u)); }
        if (t === 5) { var w5 = ri(r, 3, 30), l5 = ri(r, w5 + 1, 60), area = l5 * w5;
            return mcq(r, 'The area of a rectangle is ' + area + ' ' + u + '\u00B2 and its width is ' + w5 + ' ' + u + '. Find its length.', l5 + ' ' + u, [(l5 + 2) + ' ' + u, (area - w5) + ' ' + u, (l5 * 2) + ' ' + u, (l5 - 1) + ' ' + u], 'Length = area \u00F7 width = ' + area + ' \u00F7 ' + w5 + ' = ' + l5 + ' ' + u + '.'); }
        if (t === 6) { var d6 = ri(r, 1, 20) * 7, c = d6 * 22 / 7;
            return mcq(r, 'Find the circumference of a circle of diameter ' + d6 + ' ' + u + '. (Take \u03C0 = 22/7)', c + ' ' + u, [(c / 2) + ' ' + u, (c * 2) + ' ' + u, (d6 * d6) + ' ' + u, (c + 7) + ' ' + u], 'Circumference = \u03C0 \u00D7 d = 22/7 \u00D7 ' + d6 + ' = ' + c + ' ' + u + '.', svgCircle('d = ' + d6, u).replace(/(x2="158")/, 'x2="158"')); }
        if (t === 7) { var r7 = ri(r, 1, 14) * 7, a7 = 22 * r7 * r7 / 7;
            return mcq(r, 'Find the area of a circle of radius ' + r7 + ' ' + u + '. (Take \u03C0 = 22/7)', a7 + ' ' + u + '\u00B2', [(2 * 22 * r7 / 7) + ' ' + u + '\u00B2', (a7 * 2) + ' ' + u + '\u00B2', (22 * r7 / 7) + ' ' + u + '\u00B2', (a7 + 22) + ' ' + u + '\u00B2'], 'Area = \u03C0r\u00B2 = 22/7 \u00D7 ' + r7 + ' \u00D7 ' + r7 + ' = ' + a7 + ' ' + u + '\u00B2.', svgCircle('r = ' + r7, u)); }
        if (t === 8) { var b8 = ri(r, 4, 40), h8 = ri(r, 3, 30);
            return mcq(r, 'Find the area of the parallelogram shown.', (b8 * h8) + ' ' + u + '\u00B2', [(b8 * h8 / 2 === Math.floor(b8 * h8 / 2) ? b8 * h8 / 2 : b8 * h8 + 1) + ' ' + u + '\u00B2', (2 * (b8 + h8)) + ' ' + u + '\u00B2', (b8 + h8) + ' ' + u + '\u00B2', (b8 * h8 + b8) + ' ' + u + '\u00B2'], 'Area of a parallelogram = base \u00D7 perpendicular height = ' + b8 + ' \u00D7 ' + h8 + ' = ' + (b8 * h8) + ' ' + u + '\u00B2.', svgPara(b8, h8, u)); }
        if (t === 9) { var l9 = ri(r, 5, 50), w9 = ri(r, 3, 30), rate = ri(r, 2, 15) * 50, tot = 2 * (l9 + w9);
            return mcq(r, who + ' wants to fence a rectangular farm ' + l9 + ' m long and ' + w9 + ' m wide. Fencing costs ' + naira(rate) + ' per metre. How much will it cost?', naira(tot * rate), [naira(l9 * w9 * rate), naira((l9 + w9) * rate), naira(tot * rate + 500), naira(tot * rate - rate)], 'Perimeter = 2 \u00D7 (' + l9 + ' + ' + w9 + ') = ' + tot + ' m. Cost = ' + tot + ' \u00D7 ' + naira(rate) + ' = ' + naira(tot * rate) + '.'); }
        var a10 = ri(r, 2, 20), b10 = a10 + 2 * ri(r, 1, 10), h10 = ri(r, 2, 20), ar = (a10 + b10) * h10 / 2;
        return mcq(r, 'A trapezium has parallel sides ' + a10 + ' ' + u + ' and ' + b10 + ' ' + u + ', and the distance between them is ' + h10 + ' ' + u + '. Find its area.', ar + ' ' + u + '\u00B2', [((a10 + b10) * h10) + ' ' + u + '\u00B2', (a10 * b10 * h10 / 2 === Math.floor(a10 * b10 * h10 / 2) ? a10 * b10 * h10 / 2 : ar + 5) + ' ' + u + '\u00B2', (ar + h10) + ' ' + u + '\u00B2', (a10 + b10 + h10) + ' ' + u + '\u00B2'], 'Area = \u00BD \u00D7 (sum of parallel sides) \u00D7 height = \u00BD \u00D7 (' + a10 + ' + ' + b10 + ') \u00D7 ' + h10 + ' = ' + ar + ' ' + u + '\u00B2.');
    }

    var GEN = { 'p6-maths-whole-numbers': placeValue, 'p6-maths-fractions': fractions, 'p6-maths-percentages': percentages, 'p6-maths-perimeter-area': perimeterArea };

    // Returns question number `i` of a topic (always the same question). Retries nearby numbers if a draw was unusable.
    function get(topic, i) {
        var f = GEN[topic]; if (!f) return null;
        for (var k = 0; k < 12; k++) { var q = f(i + k * 7919); if (q && q.answer >= 0 && q.options.length === 4) { q.id = topic + '#' + i; return q; } }
        return null;
    }
    root.CMLearnGen = { POOL: POOL, get: get, topics: Object.keys(GEN) };
    if (typeof module !== 'undefined') module.exports = root.CMLearnGen;
})(typeof window !== 'undefined' ? window : globalThis);
