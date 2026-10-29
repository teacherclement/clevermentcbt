/* CleverMent read-aloud: speaks assessment questions and LaTeX using either configured neural voices or device voices. */
(function (root) {
    'use strict';

    /* ---------------- LaTeX -> spoken English ---------------- */
    var GREEK = { alpha: 'alpha', beta: 'beta', gamma: 'gamma', delta: 'delta', epsilon: 'epsilon', varepsilon: 'epsilon', zeta: 'zeta', eta: 'eta', theta: 'theta', vartheta: 'theta', iota: 'iota', kappa: 'kappa', lambda: 'lambda', mu: 'mu', nu: 'nu', xi: 'ksi', pi: 'pie', rho: 'row', sigma: 'sigma', tau: 'tau', upsilon: 'upsilon', phi: 'fie', varphi: 'fie', chi: 'kai', psi: 'sigh', omega: 'omega', Gamma: 'capital gamma', Delta: 'delta', Theta: 'capital theta', Lambda: 'capital lambda', Xi: 'capital ksi', Pi: 'capital pie', Sigma: 'capital sigma', Phi: 'capital fie', Psi: 'capital sigh', Omega: 'omega' };
    var SYM = { times: 'times', cdot: 'times', ast: 'times', div: 'divided by', pm: 'plus or minus', mp: 'minus or plus', leq: 'is less than or equal to', le: 'is less than or equal to', geq: 'is greater than or equal to', ge: 'is greater than or equal to', neq: 'is not equal to', ne: 'is not equal to', approx: 'is approximately equal to', equiv: 'is equivalent to', sim: 'is similar to', cong: 'is congruent to', propto: 'is proportional to', infty: 'infinity', therefore: 'therefore', because: 'because', to: 'goes to', rightarrow: 'gives', longrightarrow: 'gives', Rightarrow: 'implies', Leftrightarrow: 'if and only if', leftrightarrow: 'is in equilibrium with', rightleftharpoons: 'is in equilibrium with', leftarrow: 'comes from', uparrow: 'up arrow', downarrow: 'down arrow', in: 'belongs to', notin: 'does not belong to', subset: 'is a subset of', subseteq: 'is a subset of or equal to', supset: 'is a superset of', cup: 'union', cap: 'intersection', emptyset: 'the empty set', varnothing: 'the empty set', angle: 'angle', measuredangle: 'angle', triangle: 'triangle', square: 'square', perp: 'is perpendicular to', parallel: 'is parallel to', circ: 'degrees', degree: 'degrees', prime: 'prime', percent: 'percent', forall: 'for all', exists: 'there exists', nabla: 'nabla', partial: 'partial', ldots: 'and so on', cdots: 'and so on', dots: 'and so on', vdots: 'and so on', ddots: 'and so on', quad: ',', qquad: ',', 'sin': 'sine', cos: 'cosine', tan: 'tangent', sec: 'secant', csc: 'cosecant', cot: 'cotangent', sinh: 'sine h', cosh: 'cosine h', tanh: 'tangent h', arcsin: 'inverse sine', arccos: 'inverse cosine', arctan: 'inverse tangent', ln: 'natural log', log: 'log', exp: 'e to the power of', max: 'the maximum', min: 'the minimum', det: 'the determinant', gcd: 'the G C D', lcm: 'the L C M', mod: 'mod', bmod: 'mod', Delta: 'delta', ell: 'L', hbar: 'h bar', Re: 'real part', Im: 'imaginary part', neg: 'not', land: 'and', lor: 'or', lt: 'is less than', gt: 'is greater than', mid: 'divides', nmid: 'does not divide', oplus: 'circle plus', otimes: 'circle times', star: 'star', bullet: 'dot', ll: 'is much less than', gg: 'is much greater than' };
    var NAMED_ORD = { 3: 'third', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth' };
    var SMALL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    var UNITS = { km: 'kilometres', cm: 'centimetres', mm: 'millimetres', m: 'metres', kg: 'kilograms', mg: 'milligrams', g: 'grams', s: 'seconds', ms: 'milliseconds', min: 'minutes', h: 'hours', hr: 'hours', N: 'newtons', J: 'joules', kJ: 'kilojoules', W: 'watts', kW: 'kilowatts', Pa: 'pascals', V: 'volts', Hz: 'hertz', kHz: 'kilohertz', mol: 'moles', L: 'litres', mL: 'millilitres', ml: 'millilitres', K: 'kelvin', C: 'coulombs', F: 'farads', T: 'tesla', cal: 'calories', kcal: 'kilocalories', atm: 'atmospheres', rad: 'radians', eV: 'electron volts', dm: 'decimetres', ha: 'hectares' };

    function esc(re) { return re.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    function readGroup(s, i) { /* s[i] is '{': returns {text, next} */
        var d = 0, j = i;
        for (; j < s.length; j++) {
            if (s[j] === '\\') { j++; continue; }
            if (s[j] === '{') d++;
            else if (s[j] === '}') { d--; if (d === 0) break; }
        }
        return { text: s.slice(i + 1, j), next: j + 1 };
    }
    function readArg(s, i) { /* a {group}, a \command, or a single char */
        while (s[i] === ' ') i++;
        if (i >= s.length) return { text: '', next: i };
        if (s[i] === '{') return readGroup(s, i);
        if (s[i] === '\\') { var m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i)); return { text: m[0], next: i + m[0].length }; }
        return { text: s[i], next: i + 1 };
    }
    function numWord(t) { return /^\d+$/.test(t) ? (+t <= 10 ? SMALL[+t] : t) : t; }

    function fracSpeech(a, b) {
        var na = a.trim(), nb = b.trim();
        if (/^\d{1,3}$/.test(na) && /^\d{1,2}$/.test(nb)) {
            var n = +na, d = +nb;
            if (d === 2) return n === 1 ? 'one half' : numWord(na) + ' halves';
            if (d === 4) return n === 1 ? 'one quarter' : numWord(na) + ' quarters';
            if (NAMED_ORD[d]) return numWord(na) + ' ' + NAMED_ORD[d] + (n === 1 ? '' : 's');
            return numWord(na) + ' over ' + numWord(nb);
        }
        var simple = /^[A-Za-z0-9\\]{1,3}$/.test(na) && /^[A-Za-z0-9\\]{1,3}$/.test(nb);
        var A = speakLatex(na), B = speakLatex(nb);
        return simple ? (A + ' over ' + B) : ('the fraction, ' + A + ', over, ' + B + ', end fraction');
    }

    function superSpeech(arg, base) {
        var a = arg.trim();
        if (a === '2') return 'squared';
        if (a === '3') return 'cubed';
        if (a === '\\circ' || a === '\\degree' || a === '^\\circ') return 'degrees';
        if (a === '\\prime' || a === "'") return 'prime';
        if (a === '\\prime\\prime') return 'double prime';
        if (a === '*') return 'star';
        if (a === '-1') return 'to the power of negative one';
        if (/^\d*[+\-]$/.test(a) || /^\\?(?:text|mathrm)?\{?\d*[+\-]\}?$/.test(a)) {
            var ch = a.replace(/[^\d+\-]/g, '');
            var q = ch.replace(/[+\-]/, '');
            return (q ? q + ' ' : '') + (ch.slice(-1) === '+' ? 'plus' : 'minus');
        }
        var spoken = speakLatex(a);
        var wc = spoken.trim().split(/\s+/).length, complex = wc > 2 || (wc === 2 && !/^negative /.test(spoken.trim()));
        return 'to the power of ' + spoken + (complex ? ', end power,' : '');
    }

    function textSpeech(t) {
        var s = String(t);
        /* units like m/s, km/h, kg/m */
        s = s.replace(/\b([A-Za-z]{1,4})\s*\/\s*([A-Za-z]{1,4})\b/g, function (m, a, b) {
            return (UNITS[a] && UNITS[b]) ? UNITS[a] + ' per ' + UNITS[b].replace(/s$/, '') : m;
        });
        s = s.replace(/\b(km|cm|mm|kg|mg|ms|min|hr|kJ|kW|kHz|mL|ml|kcal|eV|dm|ha|Pa|Hz|mol|atm|rad|cal|[mgshNJWVKL])\b/g, function (m, u, off, str) {
            return (/\d\s*$/.test(str.slice(0, off)) || /^\^/.test(str.slice(off + m.length))) && UNITS[u] ? UNITS[u] : m;
        });
        /* chemical formulas such as NaCl, H, CO: spell letters so the voice does not mispronounce */
        if (/^[A-Z][a-z]?(?:\d*[A-Z][a-z]?\d*)*$/.test(s.trim()) && /[A-Z]/.test(s) && s.trim().length <= 10 && !/^[A-Z][a-z]{2,}$/.test(s.trim())) {
            return s.trim().replace(/([A-Z])([a-z])?/g, function (m, u, l) { return ' ' + u + (l ? ' ' + (l === 'a' ? 'ay' : l) : '') + ' '; }).replace(/\s+/g, ' ').trim();
        }
        return s;
    }

    function speakLatex(src) {
        var s = String(src || '').replace(/\\displaystyle|\\textstyle|\\scriptstyle|\\limits|\\nolimits|\\!|\\,|\\;|\\:|\\>|\\left\.|\\right\./g, ' ')
            .replace(/\\(?:left|right|bigg|Bigg|big|Big)(?![a-zA-Z])/g, '');
        var out = [], i = 0, absOpen = false, lastOperand = false;
        function push(w, operand) { if (w !== '' && w != null) out.push(w); lastOperand = !!operand; }
        function lastWord() { return out.length ? out[out.length - 1] : ''; }
        while (i < s.length) {
            var c = s[i];
            if (c === ' ' || c === '\n' || c === '\t' || c === '~') { i++; continue; }
            if (c === '\\') {
                var m = /^\\([a-zA-Z]+|[\s\S])/.exec(s.slice(i)); if (!m) { i++; continue; } var name = m[1]; i += m[0].length;
                var g;
                if (name === 'frac' || name === 'dfrac' || name === 'tfrac' || name === 'cfrac') {
                    var a = readArg(s, i); i = a.next; var b = readArg(s, i); i = b.next;
                    push(fracSpeech(a.text, b.text), true); continue;
                }
                if (name === 'binom' || name === 'dbinom') {
                    var a1 = readArg(s, i); i = a1.next; var b1 = readArg(s, i); i = b1.next;
                    push(speakLatex(a1.text) + ' choose ' + speakLatex(b1.text), true); continue;
                }
                if (name === 'sqrt') {
                    var idx = null;
                    if (s[i] === '[') { var e = s.indexOf(']', i); idx = s.slice(i + 1, e); i = e + 1; }
                    var r = readArg(s, i); i = r.next;
                    var inner = speakLatex(r.text), root = 'the square root of ';
                    if (idx === '3') root = 'the cube root of '; else if (idx && idx !== '2') root = 'the ' + speakLatex(idx) + 'th root of ';
                    push(root + inner + (/\s/.test(inner.trim()) ? ', end root,' : ''), true); continue;
                }
                if (/^(text|textrm|textbf|textit|mathrm|mathbf|mathit|mathsf|mathbb|mathcal|operatorname|boldsymbol|bm|mbox|ce|pu)$/.test(name)) {
                    var t = readArg(s, i); i = t.next;
                    push(name === 'mathbb' ? ({ R: 'the real numbers', N: 'the natural numbers', Z: 'the integers', Q: 'the rational numbers', C: 'the complex numbers' }[t.text] || t.text) : textSpeech(name === 'ce' || name === 'pu' ? t.text.replace(/->/g, ' gives ').replace(/\^([+\-\d]+)/g, '') : t.text), true); continue;
                }
                if (name === 'vec' || name === 'overrightarrow') { var v = readArg(s, i); i = v.next; push('vector ' + speakLatex(v.text), true); continue; }
                if (name === 'overline' || name === 'bar') { var o = readArg(s, i); i = o.next; push(speakLatex(o.text) + (name === 'bar' ? ' bar' : ' bar'), true); continue; }
                if (name === 'hat' || name === 'widehat') { var h = readArg(s, i); i = h.next; push(speakLatex(h.text) + ' hat', true); continue; }
                if (name === 'dot') { var d1 = readArg(s, i); i = d1.next; push(speakLatex(d1.text) + ' dot', true); continue; }
                if (name === 'ddot') { var d2 = readArg(s, i); i = d2.next; push(speakLatex(d2.text) + ' double dot', true); continue; }
                if (name === 'underline') { var u = readArg(s, i); i = u.next; push(speakLatex(u.text), true); continue; }
                if (name === 'begin' || name === 'end') { var env = readArg(s, i); i = env.next; if (name === 'begin' && /cases/.test(env.text)) push(', where ', false); continue; }
                if (name === 'sum' || name === 'prod' || name === 'int' || name === 'oint' || name === 'iint' || name === 'lim' || name === 'limsup' || name === 'liminf') {
                    var base = { sum: 'the sum', prod: 'the product', int: 'the integral', oint: 'the contour integral', iint: 'the double integral', lim: 'the limit', limsup: 'the limit superior', liminf: 'the limit inferior' }[name];
                    var lo = '', hi = '';
                    for (var k = 0; k < 2; k++) {
                        while (s[i] === ' ') i++;
                        if (s[i] === '_') { var L = readArg(s, i + 1); i = L.next; lo = speakLatex(L.text); }
                        else if (s[i] === '^') { var H = readArg(s, i + 1); i = H.next; hi = speakLatex(H.text); }
                    }
                    if (name === 'lim') push(base + (lo ? ' as ' + lo.replace(/\bgoes to\b/, 'approaches') : '') + ', of', false);
                    else push(base + (lo ? ' from ' + lo : '') + (hi ? ' to ' + hi : '') + ', of', false);
                    continue;
                }
                if (name === 'log' || name === 'ln') {
                    if (s[i] === '_') { var B = readArg(s, i + 1); i = B.next; push('log to base ' + speakLatex(B.text) + ' of', false); }
                    else push(name === 'ln' ? 'natural log of' : 'log of', false);
                    continue;
                }
                if (name === '%') { push('percent', true); continue; }
                if (name === '$') { push('dollars', false); continue; }
                if (name === '&') { push('and', false); continue; }
                if (name === '\\') { push(',', false); continue; }
                if (name === '{' || name === '}') { push(name === '{' ? 'open brace' : 'close brace', name === '}'); continue; }
                if (name === '|') { push('double bar', false); continue; }
                if (name === 'lbrace') { push('open brace', false); continue; }
                if (name === 'rbrace') { push('close brace', true); continue; }
                if (name === 'langle') { push('open angle bracket', false); continue; }
                if (name === 'rangle') { push('close angle bracket', true); continue; }
                if (name === 'lfloor') { push('floor of', false); continue; }
                if (name === 'lceil') { push('ceiling of', false); continue; }
                if (name === 'rfloor' || name === 'rceil') { push('', true); continue; }
                if (name === 'vert' || name === 'lvert' || name === 'rvert') { if (!absOpen) { push('the absolute value of', false); absOpen = true; } else { push('end absolute value', true); absOpen = false; } continue; }
                if (name === 'to' && /^\s*$/.test(out.join('')) === false && /\blimit\b/.test(out.join(' '))) { push('approaches', false); continue; }
                if (GREEK[name]) { push(GREEK[name], true); continue; }
                if (SYM.hasOwnProperty(name)) {
                    var w = SYM[name];
                    var isOperand = /^(infty|emptyset|varnothing|circ|degree|prime|percent|ldots|cdots|dots|angle|triangle|nabla|partial|ell|hbar)$/.test(name);
                    /* trig written as \sin^2 x */
                    if (/^(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh)$/.test(name) && s[i] === '^') {
                        var P = readArg(s, i + 1); i = P.next;
                        var pp = P.text.trim(); w = w + (pp === '2' ? ' squared' : pp === '3' ? ' cubed' : pp === '-1' ? ' inverse' : ' to the power of ' + speakLatex(pp));
                    }
                    push(w, isOperand); continue;
                }
                push(name, true); continue;
            }
            if (c === '{') { var gg = readGroup(s, i); i = gg.next; var sp = speakLatex(gg.text); if (sp) push(sp, true); continue; }
            if (c === '^') {
                var ar = readArg(s, i + 1); i = ar.next;
                var sup = superSpeech(ar.text);
                if (sup) { if (/^(degrees|prime|double prime|squared|cubed)$/.test(sup) || /^(\d+ )?(plus|minus)$/.test(sup) || sup === 'star') out.push(sup); else out.push(sup); }
                lastOperand = true; continue;
            }
            if (c === '_') {
                var sb = readArg(s, i + 1); i = sb.next;
                var subTxt = speakLatex(sb.text), prev = lastWord();
                if (/^\d+$/.test(sb.text.trim()) && (/^[A-Z][a-z]?$/.test(prev) || /^[A-Z]( [A-Z])*$/.test(prev) || prev === 'close bracket')) out.push(subTxt);
                else out.push('sub ' + subTxt);
                lastOperand = true; continue;
            }
            if (/[0-9]/.test(c)) {
                var nm = /^[0-9]+(?:[.,][0-9]+)*/.exec(s.slice(i))[0]; i += nm.length;
                if (/,$/.test(nm)) { nm = nm.slice(0, -1); i--; }
                push(nm, true); continue;
            }
            if (/[A-Za-z]/.test(c)) {
                var run = /^[A-Za-z]+/.exec(s.slice(i))[0]; i += run.length;
                /* variables: say each letter on its own; "a" becomes "ay" so it is not read as an article */
                var letters = run.split('').map(function (ch) { return ch === 'a' ? 'ay' : ch; });
                push(letters.join(' '), true); continue;
            }
            i++;
            switch (c) {
                case '+': push('plus', false); break;
                case '-': case '\u2212': push(lastOperand ? 'minus' : 'negative', false); break;
                case '=': push('equals', false); break;
                case '<': push('is less than', false); break;
                case '>': push('is greater than', false); break;
                case '*': push('times', false); break;
                case '/': push('over', false); break;
                case ':': push('to', false); break;
                case '(': push('open bracket', false); break;
                case ')': push('close bracket', true); break;
                case '[': push('open square bracket', false); break;
                case ']': push('close square bracket', true); break;
                case ',': push(',', false); break;
                case ';': push(',', false); break;
                case '!': push('factorial', true); break;
                case '%': push('percent', true); break;
                case '|': if (!absOpen) { push('the absolute value of', false); absOpen = true; } else { push('end absolute value', true); absOpen = false; } break;
                case "'": push('prime', true); break;
                case '.': push('', lastOperand); break;
                case '&': push(',', false); break;
                default: push(c, false);
            }
        }
        return out.join(' ').replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();
    }

    /* ---------------- plain text with $...$ and unicode symbols ---------------- */
    var UNI = { '\u00b2': ' squared', '\u00b3': ' cubed', '\u00b9': ' to the power of one', '\u2074': ' to the power of four', '\u2075': ' to the power of five', '\u2076': ' to the power of six', '\u2077': ' to the power of seven', '\u2078': ' to the power of eight', '\u2079': ' to the power of nine', '\u207b': ' negative ', '\u221a': ' the square root of ', '\u221b': ' the cube root of ', '\u03c0': ' pie ', '\u00d7': ' times ', '\u00f7': ' divided by ', '\u00b0': ' degrees ', '\u2264': ' is less than or equal to ', '\u2265': ' is greater than or equal to ', '\u2260': ' is not equal to ', '\u2248': ' is approximately equal to ', '\u221e': ' infinity ', '\u00b1': ' plus or minus ', '\u2192': ' gives ', '\u21cc': ' is in equilibrium with ', '\u2220': ' angle ', '\u25b3': ' triangle ', '\u2234': ' therefore ', '\u03bc': ' micro ', '\u03a9': ' ohms ', '\u0394': ' delta ', '\u03b8': ' theta ', '\u03b1': ' alpha ', '\u03b2': ' beta ', '\u03bb': ' lambda ', '\u2206': ' delta ', '\u00bd': ' one half ', '\u00bc': ' one quarter ', '\u00be': ' three quarters ', '\u2713': ' tick ' };
    function plainSpeech(t) {
        var s = String(t || '');
        s = s.replace(/[\u2080-\u2089]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0x2080 + 48); });
        s = s.replace(/(\d)\s*([\u00b2\u00b3])/g, '$1$2');
        s = s.replace(/[\u00b2\u00b3\u00b9\u2074-\u207b\u221a\u221b\u03c0\u00d7\u00f7\u00b0\u2264\u2265\u2260\u2248\u221e\u00b1\u2192\u21cc\u2220\u25b3\u2234\u03bc\u03a9\u0394\u03b8\u03b1\u03b2\u03bb\u2206\u00bd\u00bc\u00be\u2713]/g, function (ch) { return UNI[ch] || ch; });
        /* plain caret powers: x^2, 10^-3, (a+b)^2 */
        s = s.replace(/([A-Za-z0-9)\]])\^(\{[^}]*\}|-?\d+|[A-Za-z])/g, function (m, base, p) { return base + ' ' + superSpeech(p.replace(/^\{|\}$/g, '')) + ' '; });
        s = s.replace(/\b([A-Za-z]{1,4})\s*\/\s*([A-Za-z]{1,4})\b/g, function (m, a, b) { return (UNITS[a] && UNITS[b]) ? UNITS[a] + ' per ' + UNITS[b].replace(/s$/, '') : m; });
        s = s.replace(/(\d)\s*(km|cm|mm|kg|mg|ms|min|hr|kJ|kW|kHz|mL|ml|kcal|eV|Pa|Hz|mol|atm|[mgsNJWVL])\b/g, function (m, n, u) { return UNITS[u] ? n + ' ' + UNITS[u] : m; });
        s = s.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, function (m, a, b) { return fracSpeech(a, b); });
        s = s.replace(/_{?(\d+)}?/g, ' $1');
        s = s.replace(/_/g, ' ');
        s = s.replace(/\s*[\u2013\u2014]\s*/g, ', ');
        return s.replace(/\s+/g, ' ').trim();
    }
    function toSpeech(raw) {
        var s = String(raw == null ? '' : raw), out = '', last = 0, m, re = /\$\$([\s\S]+?)\$\$|(?<!\\)\$((?:\\.|[^$\\\n])+?)(?<!\\)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
        while ((m = re.exec(s))) {
            out += plainSpeech(s.slice(last, m.index)) + ' , ' + speakLatex(m[1] || m[2] || m[3] || m[4]) + ' , ';
            last = re.lastIndex;
        }
        out += plainSpeech(s.slice(last));
        return out.replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/,\s*([?.!])/g, '$1').replace(/\s+([?.!])/g, '$1').replace(/\s+/g, ' ').trim();
    }

    root.CMSpeech = { latex: speakLatex, text: toSpeech };
    if (typeof module !== 'undefined' && module.exports) { module.exports = root.CMSpeech; return; }

    /* ---------------- UI + speaking ---------------- */
    var synth = root.speechSynthesis;
    var KEY = 'cm_speech_prefs';
    var prefs = { rate: 1, voice: '', gender: 'f', auto: true, enabled: true };
    try { var sv = JSON.parse(localStorage.getItem(KEY) || '{}'); if (sv.rate) prefs.rate = sv.rate; if (sv.voice) prefs.voice = sv.voice; if (sv.gender === 'm' || sv.gender === 'f') prefs.gender = sv.gender; if (sv.auto === false) prefs.auto = false; if (sv.enabled === false) prefs.enabled = false; } catch (e) {}
    function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }

    var state = 'idle', token = 0, bar, btnRead, btnPause, btnGear, panel, selRate, selVoice, statusEl, cloudVoices = [], cloudAudio = null, cloudObjectUrl = null;

    var FEMALE = /female|zira|samantha|susan|hazel|aria|jenny|emma|libby|sonia|natasha|moira|tessa|karen|fiona|victoria|ava|joanna|salli|kimberly|ivy|allison|amy|kendra|nicole|olivia|serena|veena|heera|catherine|linda|michelle|ana|clara|mia|zoe|siri|kate|stephanie|lucy|ruth|ellen|yara|imogen|grace/i;
    var MALE = /(^|[^a-z])male|david|mark|daniel|alex|fred|george|james|guy|ryan|thomas|oliver|rishi|aaron|arthur|matthew|joey|justin|brian|russell|gordon|lee|eric|liam|tom|ravi|hemant|christopher|william|connor|prabhat|mike|paul|roger|davis|jason|tony|ronald/i;
    function voices() { return synth ? (synth.getVoices() || []).filter(function (v) { return /^en/i.test(v.lang); }) : []; }
    function genderOf(v) {
        var n = v.name || '';
        if (/female/i.test(n)) return 'f';
        if (/(^|[^a-z])male/i.test(n)) return 'm';
        if (FEMALE.test(n)) return 'f';
        if (MALE.test(n)) return 'm';
        return 'u';
    }
    var LANG_ORDER = ['en-NG', 'en-GB', 'en-US', 'en-ZA', 'en-AU', 'en-IN'];
    function rank(v) {
        var l = (v.lang || '').replace('_', '-'), i = LANG_ORDER.indexOf(l);
        return (i < 0 ? 9 : i) * 10 + (/natural|online|neural|google/i.test(v.name) ? 0 : 5);
    }
    function candidates(g) {
        var all = voices().slice().sort(function (a, b) { return rank(a) - rank(b); });
        var exact = all.filter(function (v) { return genderOf(v) === g; });
        return exact;
    }
    /* returns {voice, pitch, note} */
    function chooseVoice() {
        var all = voices().slice().sort(function (a, b) { return rank(a) - rank(b); });
        if (!all.length) return { voice: null, pitch: 1, note: 'No compatible English voice is available on this device. Install or enable additional system voices, or connect a neural voice provider.' };
        var g = prefs.gender, list = candidates(g);
        if (prefs.voice) { var f = list.filter(function (v) { return v.voiceURI === prefs.voice; })[0]; if (f) return { voice: f, pitch: 1, note: '' }; }
        if (list.length) return { voice: list[0], pitch: 1, note: '' };
        /* Never misrepresent pitch-shifting as a voice of the requested gender. */
        return { voice: null, pitch: 1, note: g === 'm' ? 'No voice identified as male is available on this device. Choose another voice or enable more system voices.' : 'No voice identified as female is available on this device. Choose another voice or enable more system voices.' };
    }
    function pickVoice() { return chooseVoice().voice; }

    function currentQuestion() {
        try {
            var q = root.studentQuestions && root.studentQuestions[root.studentCurrentIndex];
            return q || null;
        } catch (e) { return null; }
    }
    function chunk(text) {
        var parts = text.split(/(?<=[.?!])\s+|\s*,\s*(?=[A-Za-z0-9])/), res = [], buf = '';
        parts.forEach(function (p) {
            if (!p) return;
            if ((buf + ' ' + p).length > 150 && buf) { res.push(buf); buf = p; } else buf = buf ? buf + ', ' + p : p;
        });
        if (buf) res.push(buf);
        return res;
    }
    function buildScript() {
        var q = currentQuestion(); if (!q) return [];
        var letters = ['A', 'B', 'C', 'D', 'E', 'F'], items = [];
        items.push({ say: 'Question ' + ((root.studentCurrentIndex || 0) + 1) + '.', opt: -1 });
        chunk(toSpeech(q.question)).forEach(function (c) { items.push({ say: c, opt: -1 }); });
        if (q.image && String(q.image).trim()) items.push({ say: 'This question has a picture. Look at the picture on your screen.', opt: -1 });
        (q.options || []).forEach(function (o, i) {
            items.push({ say: 'Option ' + letters[i] + '.', opt: i });
            chunk(toSpeech(o)).forEach(function (c) { items.push({ say: c, opt: i }); });
        });
        return items;
    }
    function clearHighlight() { Array.prototype.forEach.call(document.querySelectorAll('#studentOptionsContainer .option.cm-reading, #studentQuestionText.cm-reading'), function (e) { e.classList.remove('cm-reading'); }); }
    function setHighlight(opt) {
        clearHighlight();
        if (opt < 0) { var qt = document.getElementById('studentQuestionText'); if (qt) qt.classList.add('cm-reading'); }
        else { var el = document.querySelectorAll('#studentOptionsContainer .option')[opt]; if (el) el.classList.add('cm-reading'); }
    }
    function ui() {
        if (!bar) return;
        btnRead.classList.toggle('on', state !== 'idle');
        btnRead.querySelector('span').textContent = state === 'idle' ? 'Read question' : 'Stop';
        btnPause.style.display = state === 'idle' ? 'none' : '';
        btnPause.querySelector('span').textContent = state === 'paused' ? 'Resume' : 'Pause';
        btnRead.setAttribute('aria-label', state === 'idle' ? 'Read this question and its options aloud' : 'Stop reading');
    }
    function stop() { token++; state = 'idle'; try { synth && synth.cancel(); } catch (e) {} if (cloudAudio) { try { cloudAudio.pause(); cloudAudio.src = ''; } catch(e) {} cloudAudio = null; } if (cloudObjectUrl) { try { URL.revokeObjectURL(cloudObjectUrl); } catch(e) {} cloudObjectUrl = null; } clearHighlight(); ui(); }
    function startCloud(items, my, voiceId) {
        var idx = 0;
        if (statusEl) statusEl.textContent = 'Using natural neural voice. Audio is generated securely by CleverMent.';
        function next() {
            if (my !== token) return;
            if (idx >= items.length) { state = 'idle'; clearHighlight(); ui(); return; }
            var it = items[idx++];
            if (statusEl) statusEl.textContent = 'Generating speech…';
            fetch((root.CLEVERMENT_BACKEND_URL || 'https://clevermentcbt-backend.onrender.com') + '/api/tts/speech', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: it.say, voiceId: voiceId })
            }).then(function(r) {
                if (!r.ok) return r.json().catch(function(){ return {}; }).then(function(d){ throw new Error(d.error || 'Neural voice generation failed.'); });
                return r.blob();
            }).then(function(blob) {
                if (my !== token) return;
                if (cloudObjectUrl) URL.revokeObjectURL(cloudObjectUrl);
                cloudObjectUrl = URL.createObjectURL(blob); cloudAudio = new Audio(cloudObjectUrl); cloudAudio.playbackRate = prefs.rate;
                cloudAudio.onplay = function(){ if (my === token) { setHighlight(it.opt); if (statusEl) statusEl.textContent = 'Reading with your selected neural voice.'; } };
                cloudAudio.onended = function(){ if (my === token) setTimeout(next, it.opt === -1 && idx < items.length && items[idx].opt === 0 ? 300 : 80); };
                cloudAudio.onerror = function(){ if (my === token) { state='idle'; ui(); if(statusEl) statusEl.textContent='Audio playback failed. Please try again.'; } };
                return cloudAudio.play();
            }).catch(function(err) {
                if (my !== token) return;
                state = 'idle'; ui(); clearHighlight();
                if (statusEl) statusEl.textContent = err.message || 'Neural voice unavailable. Please try again.';
            });
        }
        next();
    }
    function start() {
        if (!prefs.enabled) return;
        stop();
        var items = buildScript(); if (!items.length) return;
        var my = ++token, idx = 0;
        if (prefs.voice && prefs.voice.indexOf('cloud:') === 0) {
            state = 'speaking'; ui(); startCloud(items, my, prefs.voice.slice(6)); return;
        }
        if (!synth) { if (statusEl) statusEl.textContent = 'No device voice engine is available. Select a CleverMent neural voice when configured.'; return; }
        var ch = chooseVoice(), v = ch.voice;
        if (!v) { state = 'idle'; ui(); if (statusEl) statusEl.textContent = ch.note || 'No suitable voice is available on this device.'; return; }
        state = 'speaking'; ui(); if (statusEl) statusEl.textContent = ch.note;
        function next() {
            if (my !== token) return;
            if (idx >= items.length) { state = 'idle'; clearHighlight(); ui(); return; }
            var it = items[idx++], u = new SpeechSynthesisUtterance(it.say);
            u.voice = v; u.lang = v.lang; u.rate = prefs.rate; u.pitch = 1;
            u.onstart = function () { if (my === token) setHighlight(it.opt); };
            u.onend = function () { if (my === token) setTimeout(next, it.opt === -1 && idx < items.length && items[idx].opt === 0 ? 350 : 120); };
            u.onerror = function () { if (my === token) setTimeout(next, 50); };
            synth.speak(u);
        }
        next();
    }
    function pauseToggle() {
        if (!synth && !cloudAudio) return;
        if (state === 'speaking') { if (cloudAudio) cloudAudio.pause(); else if (synth) synth.pause(); state = 'paused'; } else if (state === 'paused') { if (cloudAudio) cloudAudio.play().catch(function(){}); else if (synth) synth.resume(); state = 'speaking'; }
        ui();
    }
    function fillVoices() {
        if (!selVoice) return;
        var list = candidates(prefs.gender).slice(0, 10), cur = chooseVoice().voice;
        var deviceHtml = list.map(function (v) { return '<option value="' + v.voiceURI.replace(/"/g, '&quot;') + '"' + (prefs.voice === v.voiceURI || (!prefs.voice && cur && v.voiceURI === cur.voiceURI) ? ' selected' : '') + '>' + v.name.replace(/</g, '') + ' (' + v.lang + ') · device</option>'; }).join('');
        var cloudHtml = cloudVoices.filter(function(v){ return v.gender === prefs.gender; }).map(function(v){ return '<option value="cloud:' + v.id + '"' + (prefs.voice === 'cloud:' + v.id ? ' selected' : '') + '>' + v.name + ' · Neural (' + v.accent + ')</option>'; }).join('');
        selVoice.innerHTML = '<optgroup label="CleverMent Natural Neural Voices">' + (cloudHtml || '<option value="" disabled>Neural voices require provider setup</option>') + '</optgroup><optgroup label="Voices on this device">' + (deviceHtml || '<option value="" disabled>No matching device voices found</option>') + '</optgroup>';
        if (!prefs.voice && cur) selVoice.value = cur.voiceURI;
        if (prefs.voice && prefs.voice.indexOf('cloud:') === 0) selVoice.value = prefs.voice;
        if (!cloudVoices.length && statusEl) statusEl.textContent = 'Device voices are available now. Natural neural voices activate after the provider API key is configured.';
    }
    function loadCloudVoices() {
        fetch((root.CLEVERMENT_BACKEND_URL || 'https://clevermentcbt-backend.onrender.com') + '/api/tts/voices').then(function(r){return r.ok ? r.json() : null;}).then(function(d){
            if (!d || !d.available || !Array.isArray(d.voices)) return;
            cloudVoices = d.voices;
            if (selGender) { /* list refresh follows the selected voice type */ }
            fillVoices();
        }).catch(function(){});
    }
    function build() {
        var qt = document.getElementById('studentQuestionText');
        if (!qt || document.getElementById('cmReadBar')) return !!document.getElementById('cmReadBar');
        bar = document.createElement('div'); bar.id = 'cmReadBar'; bar.className = 'cm-readbar';
        bar.innerHTML = '<button type="button" id="cmReadSwitch" class="cm-rb-switch" role="switch" aria-checked="true"><span class="cm-sw-track"><i></i></span><span class="cm-sw-label">Read aloud: On</span></button>' +
            '<button type="button" id="cmReadBtn" class="cm-rb-main"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg><span>Read question</span></button>' +
            '<button type="button" id="cmPauseBtn" class="cm-rb-sub" style="display:none"><span>Pause</span></button>' +
            '<button type="button" id="cmGearBtn" class="cm-rb-gear" aria-label="Voice settings" aria-expanded="false"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button>' +
            '<div class="cm-rb-panel" id="cmReadPanel" hidden><label>Voice type <select id="cmGender"><option value="f">Female</option><option value="m">Male</option></select></label><label class="cm-rb-check"><input type="checkbox" id="cmAuto"> Read each new question automatically</label><label>Speed <select id="cmRate"><option value="0.75">Slow</option><option value="1">Normal</option><option value="1.25">Fast</option></select></label><label>Voice <select id="cmVoice"></select></label><button type="button" id="cmVoicePreview" class="cm-rb-sub">Preview voice</button><small id="cmReadStatus"></small></div>';
        qt.parentNode.insertBefore(bar, qt);
        btnRead = bar.querySelector('#cmReadBtn'); btnPause = bar.querySelector('#cmPauseBtn'); btnGear = bar.querySelector('#cmGearBtn');
        panel = bar.querySelector('#cmReadPanel'); selRate = bar.querySelector('#cmRate'); selVoice = bar.querySelector('#cmVoice'); statusEl = bar.querySelector('#cmReadStatus');
        selRate.value = String(prefs.rate);
        var sw = bar.querySelector('#cmReadSwitch');
        function applyEnabled(fromUser) {
            sw.setAttribute('aria-checked', String(!!prefs.enabled));
            sw.querySelector('.cm-sw-label').textContent = 'Read aloud: ' + (prefs.enabled ? 'On' : 'Off');
            bar.classList.toggle('cm-off', !prefs.enabled);
            if (!prefs.enabled) { stop(); panel.hidden = true; btnGear.setAttribute('aria-expanded', 'false'); }
            else if (fromUser) start();
        }
        sw.addEventListener('click', function () { prefs.enabled = !prefs.enabled; save(); applyEnabled(true); });
        applyEnabled(false);
        var selGender = bar.querySelector('#cmGender'), chkAuto = bar.querySelector('#cmAuto');
        selGender.value = prefs.gender; chkAuto.checked = !!prefs.auto;
        selGender.addEventListener('change', function () { prefs.gender = selGender.value === 'm' ? 'm' : 'f'; prefs.voice = ''; save(); fillVoices(); if (state !== 'idle') start(); else { start(); } });
        chkAuto.addEventListener('change', function () { prefs.auto = chkAuto.checked; save(); });
        btnRead.addEventListener('click', function () { state === 'idle' ? start() : stop(); });
        btnPause.addEventListener('click', pauseToggle);
        btnGear.addEventListener('click', function () { var open = panel.hidden; panel.hidden = !open; btnGear.setAttribute('aria-expanded', String(open)); });
        selRate.addEventListener('change', function () { prefs.rate = parseFloat(selRate.value) || 1; save(); if (state !== 'idle') start(); });
        selVoice.addEventListener('change', function () { prefs.voice = selVoice.value; save(); start(); });
        var previewBtn = bar.querySelector('#cmVoicePreview');
        if (previewBtn) previewBtn.addEventListener('click', function () { if (prefs.voice && prefs.voice.indexOf('cloud:') === 0) { stop(); var my = ++token; state='speaking'; ui(); startCloud([{say:'Hello. This is a preview of your selected CleverMent assessment reading voice.',opt:-1}],my,prefs.voice.slice(6)); return; } if (!synth) { if(statusEl) statusEl.textContent='No device voice engine is available.'; return; } var ch = chooseVoice(); if (!ch.voice) { if (statusEl) statusEl.textContent = ch.note || 'No suitable voice is available on this device.'; return; } synth.cancel(); var u = new SpeechSynthesisUtterance('Hello. This is a preview of your selected CleverMent assessment reading voice.'); u.voice = ch.voice; u.lang = ch.voice.lang; u.rate = prefs.rate; u.pitch = 1; if (statusEl) statusEl.textContent = 'Previewing ' + ch.voice.name + ' (device voice).'; synth.speak(u); });
        fillVoices(); loadCloudVoices(); ui();
        if (!synth) { statusEl.textContent = 'Device voices are unavailable. If CleverMent neural voices are configured, select one below.'; panel.hidden = false; }
        /* stop reading whenever the question changes */
        var lastKey = null, autoTimer = null;
        function keyNow() { var q = currentQuestion(); return q ? (root.studentCurrentIndex + ':' + q.question) : null; }
        function onChange() {
            var k = keyNow();
            if (k === lastKey) return;              /* maths re-drawing the same question: ignore */
            lastKey = k;
            if (state !== 'idle') stop();
            clearTimeout(autoTimer);
            if (k && prefs.enabled && prefs.auto && (synth || (prefs.voice && prefs.voice.indexOf('cloud:') === 0)) && !root.studentIsTimeUp) autoTimer = setTimeout(function () { if (keyNow() === lastKey && !root.studentIsTimeUp) start(); }, 450);
        }
        if (root.MutationObserver) new MutationObserver(onChange).observe(qt, { childList: true, characterData: true, subtree: true });
        return true;
    }
    function boot() {
        if (!build()) { var tries = 0, t = setInterval(function () { if (build() || ++tries > 40) clearInterval(t); }, 500); }
        if (synth) { synth.onvoiceschanged = fillVoices; }
        document.addEventListener('visibilitychange', function () { if (document.hidden && state !== 'idle') stop(); });
        window.addEventListener('pagehide', stop);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : globalThis);
