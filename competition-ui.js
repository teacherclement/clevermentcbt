// ============================================================
// CleverMent - LIVE QUIZ COMPETITION (frontend)
// Loaded AFTER script.js. It only ADDS features: a teacher panel
// ("Live Competition"), a student menu item, a join button on the
// student code page, and a full-screen game overlay.
// ============================================================
(function() {
    'use strict';
    var POLL_MS = 900;
    var lc = null;           // the running game on this device: { role, code, pid, key, have, q, sig, offset, timer, tick, state }
    var csvQuestions = [];   // questions parsed from an uploaded CSV
    var OPT_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];
    var OPT_SHAPES = ['A', 'B', 'C', 'D'];

    function $(id) { return document.getElementById(id); }
    function esc(v) { return String(v === null || v === undefined ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function backend() { return (typeof BACKEND_URL !== 'undefined') ? BACKEND_URL : ''; }
    function teacherToken() { return localStorage.getItem('cleverment_teacher_token') || ''; }
    function studentToken() { return localStorage.getItem('cleverment_student_token') || ''; }
    function math(el) { try { if (typeof renderMathIn === 'function') renderMathIn(el); } catch (e) {} }

    async function api(method, path, body, token) {
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var res;
        try {
            res = await fetch(backend() + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
        } catch (e) { return { ok: false, status: 0, data: { error: 'Could not reach the server. Check your internet.' } }; }
        var data = {};
        try { data = await res.json(); } catch (e) {}
        return { ok: res.ok, status: res.status, data: data };
    }

    // ---------- sound effects (made in the browser, no files needed) ----------
    var audioCtx = null;
    function audio() {
        try {
            if (!audioCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) {}
        return audioCtx;
    }
    function isMuted() { try { return localStorage.getItem('lc_muted') === '1'; } catch (e) { return false; } }
    function tone(freq, dur, type, vol, delay) {
        if (isMuted()) return;
        var c = audio(); if (!c) return;
        try {
            var t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
            o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
        } catch (e) {}
    }
    function sndTick() { tone(880, 0.09, 'square', 0.07); }
    function sndLow() { tone(1100, 0.05, 'square', 0.04); }
    function sndGo() { tone(660, 0.12, 'triangle', 0.2); tone(990, 0.3, 'triangle', 0.22, 0.12); }
    function sndClick() { tone(520, 0.07, 'triangle', 0.2); }
    function sndCorrect() { tone(523, 0.14, 'triangle', 0.22); tone(659, 0.14, 'triangle', 0.22, 0.13); tone(784, 0.3, 'triangle', 0.24, 0.26); }
    function sndWrong() { tone(220, 0.25, 'sawtooth', 0.12); tone(160, 0.35, 'sawtooth', 0.12, 0.22); }
    function sndReveal() { tone(440, 0.15, 'sine', 0.18); tone(660, 0.25, 'sine', 0.18, 0.14); }
    function sndFinal() { [523, 659, 784, 1047].forEach(function(f, i) { tone(f, 0.28, 'triangle', 0.24, i * 0.16); }); tone(1047, 0.7, 'triangle', 0.24, 0.7); }

    // ---------- overlay shell ----------
    function overlay() {
        var o = $('lcOverlay');
        if (!o) {
            o = document.createElement('div');
            o.id = 'lcOverlay';
            o.className = 'lc-overlay';
            document.body.appendChild(o);
        }
        o.style.display = 'flex';
        document.body.classList.add('lc-open');
        return o;
    }
    function closeOverlay() {
        stopLoop();
        var o = $('lcOverlay');
        if (o) { o.style.display = 'none'; o.innerHTML = ''; }
        document.body.classList.remove('lc-open');
        try { sessionStorage.removeItem('lc_player'); sessionStorage.removeItem('lc_host'); } catch (e) {}
        lc = null;
        if (typeof lcAfterClose === 'function') lcAfterClose();
    }
    function shell(inner, topRight) {
        var o = overlay();
        o.innerHTML = '<div class="lc-box"><div class="lc-top"><div class="lc-brand">CleverMent <span>Live Competition</span></div><div class="lc-topr"><button class="lc-link" id="lcMute" aria-label="Sound on/off"></button>' + (topRight || '') + '</div></div><div id="lcBody" class="lc-body">' + inner + '</div></div>';
        var mb = $('lcMute');
        mb.textContent = isMuted() ? '🔇' : '🔊';
        mb.onclick = function() { try { localStorage.setItem('lc_muted', isMuted() ? '0' : '1'); } catch (e) {} mb.textContent = isMuted() ? '🔇' : '🔊'; audio(); sndClick(); };
        return $('lcBody');
    }

    // ---------- polling loop ----------
    function stopLoop() {
        if (lc && lc.timer) { clearTimeout(lc.timer); lc.timer = null; }
        if (lc && lc.tick) { clearInterval(lc.tick); lc.tick = null; }
        if (lc) lc.stopped = true;
    }
    function startLoop() {
        if (!lc) return;
        lc.stopped = false;
        lc.fails = 0;
        poll();
        if (lc.tick) clearInterval(lc.tick);
        lc.tick = setInterval(updateTimer, 100);
    }
    async function poll() {
        if (!lc || lc.stopped) return;
        var path, token = '';
        if (lc.role === 'host') { path = '/api/teacher/competition/rooms/' + lc.code + '/state?have=' + lc.have; token = teacherToken(); }
        else { path = '/api/competition/state?code=' + encodeURIComponent(lc.code) + '&pid=' + encodeURIComponent(lc.pid) + '&key=' + encodeURIComponent(lc.key) + '&have=' + lc.have; }
        var r = await api('GET', path, null, token);
        if (!lc || lc.stopped) return;
        if (r.ok) {
            lc.fails = 0;
            lc.offset = (r.data.serverNow || Date.now()) - Date.now();
            handleState(r.data);
        } else if (r.status === 404 || r.status === 403 || r.status === 401) {
            var msg = r.status === 403 && lc.role === 'player' ? 'You were removed from this room.' : 'This competition has ended or the room was closed.';
            var wasHost = lc.role === 'host';
            stopLoop(); lc = null;
            try { sessionStorage.removeItem('lc_player'); sessionStorage.removeItem('lc_host'); } catch (e) {}
            shell('<div class="lc-center"><h2>' + esc(msg) + '</h2><button class="lc-btn" id="lcCloseBtn">Close</button></div>');
            $('lcCloseBtn').onclick = closeOverlay;
            return;
        } else {
            lc.fails++;
            showNet(true);
        }
        if (lc && !lc.stopped) { if (r.ok) showNet(false); lc.timer = setTimeout(poll, r.ok ? POLL_MS : Math.min(4000, 1000 + lc.fails * 500)); }
    }
    function showNet(bad) {
        var el = $('lcNet');
        if (el) el.style.display = bad ? 'block' : 'none';
    }

    function handleState(s) {
        lc.state = s;
        if (s.question) { lc.q = s.question; lc.have = s.qIndex; }
        var sig = s.status + '|' + s.qIndex + '|' + (lc.have === s.qIndex ? 'q' : 'wait') + '|' + (lc.role === 'player' ? (s.me && s.me.choice) : '');
        if (lc.role === 'host' && s.status === 'lobby') sig += '|' + (s.players || []).map(function(p) { return p.id; }).join(',');
        var rebuilt = sig !== lc.sig;
        if (rebuilt) {
            lc.sig = sig; lc.lastLabel = ''; lc.lastNext = null;
            if (lc.role === 'host') renderHost(s); else renderPlayer(s);
        }
        updateLive(s);
    }

    // ---------- timer ----------
    function remainingSec(s) {
        var now = Date.now() + (lc ? lc.offset : 0);
        return Math.max(0, (s.endsAt - now) / 1000);
    }
    function updateTimer() {
        if (!lc || !lc.state) return;
        var s = lc.state, now = Date.now() + lc.offset;
        if (s.status === 'question') {
            var pre = (s.startsAt - now) / 1000;
            var rn = $('lcReadyNum'), cd = $('lcCountdown');
            if (pre > 0) {
                var label = pre >= 1 ? String(Math.floor(pre)) : 'Go!';
                if (label !== lc.lastLabel) { lc.lastLabel = label; if (label === 'Go!') sndGo(); else sndTick(); }
                if (rn) rn.textContent = label;
                if (cd) { cd.style.display = 'flex'; cd.innerHTML = '<div><small>' + (s.qIndex === 0 ? 'Get ready!' : 'Next question') + '</small>' + label + '</div>'; }
                return;
            }
            if (cd) cd.style.display = 'none';
            var left = remainingSec(s);
            var t = $('lcTimeNum'), bar = $('lcTimeBar');
            if (t) t.textContent = Math.ceil(left);
            if (bar) {
                var pct = Math.max(0, Math.min(100, left / s.timeLimit * 100));
                bar.style.width = pct + '%';
                bar.style.background = pct > 50 ? '#22c55e' : (pct > 25 ? '#eab308' : '#ef4444');
            }
            var sec = Math.ceil(left);
            if (sec <= 5 && sec > 0 && lc.lastSec !== s.qIndex + ':' + sec) { lc.lastSec = s.qIndex + ':' + sec; sndLow(); }
        } else if (s.status === 'reveal') {
            var el = $('lcNextIn'); if (!el) return;
            var rl = (s.revealEndsAt - now) / 1000;
            if (rl <= 3 && rl > 0) {
                var n = Math.ceil(rl);
                el.textContent = (s.isLast ? 'Final results in ' : 'Next in ') + n + '...';
                if (lc.lastNext !== n) { lc.lastNext = n; sndTick(); }
            } else { el.textContent = ''; }
        }
    }
    function updateLive(s) {
        if (lc.role === 'host') {
            var a = $('lcAnswered'); if (a) a.textContent = s.answeredCount + ' of ' + s.playerCount + ' answered';
            var pc = $('lcPlayerCount'); if (pc) pc.textContent = s.playerCount;
            var qb = $('lcQBlock'), lv = $('lcLive');
            if (s.status === 'question' && qb && lv && s.answeredCount > 0) {
                qb.classList.add('compact');
                lv.style.display = 'block';
                var inBoard = (s.live || []).some(function(r) { return r.fastest; });
                lv.innerHTML = '<h3 class="lc-h">Live leaderboard</h3>' + board(s.live, '', { tags: false, answered: true }) +
                    (!inBoard && s.liveFastest ? '<p class="lc-small center">Fastest so far: <b>' + esc(s.liveFastest.name) + '</b> (' + s.liveFastest.seconds + 's)</p>' : '');
            }
        } else {
            var pc2 = $('lcPlayerCount'); if (pc2) pc2.textContent = s.playerCount;
        }
        updateTimer();
    }

    // ---------- shared pieces ----------
    function questionBlock(q, mode) {
        // mode: 'play' (tappable), 'show' (not tappable), 'reveal' (colour by correctness)
        var h = '<div class="lc-q" id="lcQ">' + esc(q.question) + '</div>';
        if (q.image) h += '<div class="lc-qimg"><img src="' + esc(q.image) + '" alt="Question image" onerror="this.style.display=\'none\'"></div>';
        h += '<div class="lc-opts">';
        q.options.forEach(function(o, i) {
            h += '<button class="lc-opt" data-i="' + i + '" style="background:' + OPT_COLORS[i] + ';"' + (mode === 'play' ? '' : ' disabled') + '><b>' + OPT_SHAPES[i] + '</b><span>' + esc(o) + '</span></button>';
        });
        return h + '</div>';
    }
    function timerBlock(s) {
        return '<div class="lc-timer"><div class="lc-timebar-wrap"><div id="lcTimeBar" class="lc-timebar" style="width:100%"></div></div><div class="lc-timenum" id="lcTimeNum">' + s.timeLimit + '</div></div><div id="lcCountdown" class="lc-countdown" style="display:none"></div>';
    }
    function board(rows, meName, opts) {
        opts = opts || {};
        if (!rows || !rows.length) return '';
        var tagNames = { 1: '1st', 2: '2nd', 3: '3rd' };
        var h = '<div class="lc-board">';
        rows.forEach(function(r) {
            var rank = (opts.tags !== false && tagNames[r.rank]) ? '<span class="lc-tag t' + r.rank + '">' + tagNames[r.rank] + '</span>' : String(r.rank);
            h += '<div class="lc-row' + (meName && r.name === meName ? ' me' : '') + '"><span class="lc-rank">' + rank + '</span><span class="lc-dot" style="background:' + esc(r.color) + '"></span>' +
                '<span class="lc-namebox"><span class="lc-name">' + esc(r.name) + '</span>' + (r.fastest ? '<small class="lc-fastest">Fastest' + (r.seconds !== null && r.seconds !== undefined ? ' &middot; ' + r.seconds + 's' : '') + '</small>' : '') + '</span>' +
                (opts.answered ? (r.answered ? '<span class="lc-done">&#10003;</span>' : '<span class="lc-pending">...</span>') : '') +
                (r.gained ? '<span class="lc-gain">+' + r.gained + '</span>' : '') + '<span class="lc-score">' + r.score + '</span></div>';
        });
        return h + '</div>';
    }
    function fastestLine(rows, fastest) {
        if (!fastest) return '';
        if ((rows || []).some(function(r) { return r.fastest; })) return '';
        return '<p class="lc-small center">Fastest correct answer: <b>' + esc(fastest.name) + '</b> (' + fastest.seconds + 's)</p>';
    }
    function readyScreen(s) {
        return netBanner() + '<div class="lc-ready"><div class="lc-ready-t">' + (s.qIndex === 0 ? 'Get ready!' : 'Next question') + '</div><div class="lc-ready-n" id="lcReadyNum"></div><p class="lc-small">Question ' + (s.qIndex + 1) + ' of ' + s.total + '</p></div>';
    }
    function podium(rows) {
        var top = rows.slice(0, 3);
        if (!top.length) return '';
        var order = [top[1], top[0], top[2]], cls = ['p2', 'p1', 'p3'];
        var h = '<div class="lc-podium">';
        order.forEach(function(r, i) {
            if (!r) { h += '<div class="lc-pod empty"></div>'; return; }
            h += '<div class="lc-pod ' + cls[i] + '"><div class="lc-pod-name">' + esc(r.name) + '</div><div class="lc-pod-score">' + r.score + '</div><div class="lc-pod-bar"><span>' + r.rank + '</span></div></div>';
        });
        return h + '</div>';
    }
    function netBanner() { return '<div id="lcNet" class="lc-net" style="display:none">Connection problem... trying again</div>'; }

    // ============================================================
    // HOST
    // ============================================================
    function renderHost(s) {
        var top = '<button class="lc-link" id="lcEndBtn">' + (s.status === 'final' ? 'Close' : 'End game') + '</button>';
        if (s.status === 'lobby') {
            var site = location.origin + location.pathname;
            var h = '<div class="lc-center">' + netBanner() + '<p class="lc-small">' + esc(s.title) + ' &middot; ' + s.total + ' questions &middot; ' + s.timeLimit + 's each</p>' +
                '<p class="lc-small">Students: open CleverMent &rarr; ' + (s.access === 'roster' ? 'log in &rarr; <b>Live Competition</b>' : '<b>I\'m a Student &rarr; Join a Live Competition</b>') + ', then type this code</p>' +
                '<div class="lc-code" id="lcCodeBig">' + esc(lc.code) + '</div>' +
                '<p class="lc-small">' + (s.access === 'roster' ? 'Only ' + (s.className ? esc(s.className) + ' ' : 'your roster ') + 'students can join' : 'Anyone with the code can join') + '</p>' +
                '<p class="lc-count"><span id="lcPlayerCount">' + s.playerCount + '</span> joined</p><div class="lc-chips">';
            (s.players || []).forEach(function(p) { h += '<span class="lc-chip" style="border-color:' + esc(p.color) + '">' + esc(p.name) + ' <button data-kick="' + esc(p.id) + '" title="Remove">&times;</button></span>'; });
            h += '</div><button class="lc-btn" id="lcStartBtn"' + (s.playerCount ? '' : ' disabled') + '>Start game</button></div>';
            shell(h, top);
            $('lcStartBtn').onclick = hostStart;
            document.querySelectorAll('[data-kick]').forEach(function(b) { b.onclick = function() { api('POST', '/api/teacher/competition/rooms/' + lc.code + '/kick', { pid: b.getAttribute('data-kick') }, teacherToken()); }; });
        } else if (s.status === 'question') {
            if (lc.have !== s.qIndex) { shell(readyScreen(s), top); }
            else {
                shell(netBanner() + '<div class="lc-qhead"><span>Question ' + (s.qIndex + 1) + ' / ' + s.total + '</span><span id="lcAnswered"></span></div>' + timerBlock(s) +
                    '<div id="lcQBlock" class="lc-qblock">' + questionBlock(lc.q, 'show') + '</div><div id="lcLive" style="display:none"></div>' +
                    '<div class="lc-actions"><button class="lc-btn alt" id="lcSkipBtn">Show answer now</button></div>', top);
                $('lcSkipBtn').onclick = hostNext;
                math($('lcBody'));
            }
        } else if (s.status === 'reveal') {
            var q2 = lc.q, rv = s.reveal;
            sndReveal();
            var h2 = netBanner() + '<div class="lc-qhead"><span>Question ' + (s.qIndex + 1) + ' / ' + s.total + '</span><span>Answer</span></div><div class="lc-qblock compact"><div class="lc-q">' + esc(q2.question) + '</div>' +
                (q2.image ? '<div class="lc-qimg"><img src="' + esc(q2.image) + '" alt="Question image" onerror="this.style.display=\'none\'"></div>' : '') + '<div class="lc-opts">';
            q2.options.forEach(function(o, i) {
                h2 += '<div class="lc-opt ' + (i === rv.correct ? 'right' : 'dim') + '" style="background:' + OPT_COLORS[i] + ';"><b>' + OPT_SHAPES[i] + '</b><span>' + esc(o) + '</span><em>' + rv.counts[i] + '</em></div>';
            });
            h2 += '</div></div><p class="lc-small center">' + rv.noAnswer + ' did not answer</p><h3 class="lc-h">Top 10</h3>' + board(s.board) + fastestLine(s.board, rv.fastest) +
                '<p class="lc-nextin" id="lcNextIn"></p><div class="lc-actions"><button class="lc-btn alt small" id="lcNextBtn">Skip wait</button></div>';
            shell(h2, top);
            $('lcNextBtn').onclick = hostNext;
            math($('lcBody'));
        } else if (s.status === 'final') {
            var rows = s.finalRows || [];
            sndFinal();
            var h3 = netBanner() + '<h2 class="lc-title">Final results</h2>' + podium(rows) + '<div class="lc-board">';
            rows.forEach(function(r) { h3 += '<div class="lc-row"><span class="lc-rank">' + r.rank + '</span><span class="lc-dot" style="background:' + esc(r.color) + '"></span><span class="lc-name">' + esc(r.name) + '</span><span class="lc-small">' + r.correct + '/' + s.total + ' &middot; ' + r.avgSeconds + 's</span><span class="lc-score">' + r.score + '</span></div>'; });
            h3 += '</div><p class="lc-small center" id="lcSaveNote">' + (s.saved ? 'Results saved. Students can see their points in My Progress.' : (s.saveError ? 'Results could NOT be saved: ' + esc(s.saveError) + ' (Run supabase_competition.sql in Supabase.)' : 'Saving results...')) + '</p>' +
                '<div class="lc-actions"><button class="lc-btn alt" id="lcCsvBtn">Download CSV</button><button class="lc-btn" id="lcDoneBtn">Close</button></div>';
            shell(h3, '');
            $('lcDoneBtn').onclick = closeOverlay;
            $('lcCsvBtn').onclick = function() { downloadCsv(s); };
        }
        var end = $('lcEndBtn');
        if (end) end.onclick = hostEnd;
        try { sessionStorage.setItem('lc_host', lc.code); } catch (e) {}
    }
    async function hostStart() {
        audio(); sndClick();
        var b = $('lcStartBtn'); if (b) b.disabled = true;
        var r = await api('POST', '/api/teacher/competition/rooms/' + lc.code + '/start', {}, teacherToken());
        if (!r.ok) { alert(r.data.error || 'Could not start.'); if (b) b.disabled = false; }
    }
    async function hostNext() {
        var b = $('lcNextBtn') || $('lcSkipBtn'); if (b) b.disabled = true;
        var r = await api('POST', '/api/teacher/competition/rooms/' + lc.code + '/next', {}, teacherToken());
        if (!r.ok) { alert(r.data.error || 'Something went wrong.'); if (b) b.disabled = false; }
    }
    async function hostEnd() {
        var inFinal = lc.state && lc.state.status === 'final';
        if (inFinal) return closeOverlay();
        if (!confirm('End this game now? Scores so far will be saved.')) return;
        var wasLobby = lc.state && lc.state.status === 'lobby';
        await api('POST', '/api/teacher/competition/rooms/' + lc.code + '/end', {}, teacherToken());
        if (wasLobby) closeOverlay();
    }
    function downloadCsv(s) {
        var lines = ['Rank,Name,Points,Correct,Total Questions,Avg Seconds'];
        (s.finalRows || []).forEach(function(r) { lines.push([r.rank, '"' + String(r.name).replace(/"/g, '""') + '"', r.score, r.correct, s.total, r.avgSeconds].join(',')); });
        var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'competition-' + lc.code + '.csv';
        document.body.appendChild(a); a.click(); a.remove();
    }
    function openHost(code) {
        lc = { role: 'host', code: code, have: -1, q: null, sig: '', offset: 0, state: null };
        shell('<div class="lc-center"><h2>Opening room...</h2></div>');
        startLoop();
    }

    // ============================================================
    // PLAYER
    // ============================================================
    function renderPlayer(s) {
        var me = s.me || {};
        var top = '<button class="lc-link" id="lcLeaveBtn">Leave</button>';
        if (s.status === 'lobby') {
            shell(netBanner() + '<div class="lc-center"><h2>You\'re in, ' + esc(me.name) + '!</h2><p class="lc-small">' + esc(s.title) + '</p><p class="lc-count"><span id="lcPlayerCount">' + s.playerCount + '</span> joined</p><p class="lc-wait">Waiting for the teacher to start...</p></div>', top);
        } else if (s.status === 'question') {
            if (lc.have !== s.qIndex) { shell(readyScreen(s), top); }
            else {
                var answered = me.choice !== null && me.choice !== undefined;
                var h = netBanner() + '<div class="lc-qhead"><span>Question ' + (s.qIndex + 1) + ' / ' + s.total + '</span><span>' + me.score + ' pts</span></div>' + timerBlock(s) + questionBlock(lc.q, answered ? 'show' : 'play');
                if (answered) h += '<p class="lc-locked">Answer locked in. Waiting for the others...</p>';
                shell(h, top);
                if (answered) { var sel = document.querySelector('.lc-opt[data-i="' + me.choice + '"]'); if (sel) sel.classList.add('picked'); }
                else document.querySelectorAll('.lc-opt').forEach(function(b) { b.onclick = function() { playerAnswer(parseInt(b.getAttribute('data-i'), 10)); }; });
                math($('lcBody'));
            }
        } else if (s.status === 'reveal') {
            var rs = me.result || { correct: false, points: 0, choice: null };
            if (rs.correct) sndCorrect(); else sndWrong();
            var banner = rs.choice === null ? '<div class="lc-result none">Time\'s up!<small>You did not answer</small></div>' :
                (rs.correct ? '<div class="lc-result ok">Correct!<small>+' + rs.points + ' points</small></div>' : '<div class="lc-result bad">Wrong<small>No points this time</small></div>');
            var h2 = netBanner() + banner + '<div class="lc-yourrank">Your rank: <b>' + me.rank + '</b> of ' + me.total + ' &middot; <b>' + me.score + '</b> pts</div>' +
                '<p class="lc-small center">The correct answer was <b>' + OPT_SHAPES[s.reveal.correct] + '. ' + esc(lc.q.options[s.reveal.correct]) + '</b></p><h3 class="lc-h">Top 10</h3>' + board(s.board, me.name) + fastestLine(s.board, s.reveal.fastest) +
                '<p class="lc-nextin" id="lcNextIn"></p>';
            shell(h2, top);
            math($('lcBody'));
        } else if (s.status === 'final') {
            var rows = s.finalRows || [];
            sndFinal();
            var h3 = netBanner() + '<h2 class="lc-title">' + (me.rank === 1 ? 'You won! 🏆' : 'Game over') + '</h2><div class="lc-yourrank big">Rank <b>' + me.rank + '</b> of ' + me.total + '</div>' +
                '<div class="lc-stats"><div><b>' + me.score + '</b><span>Points</span></div><div><b>' + me.correct + '/' + s.total + '</b><span>Correct</span></div><div><b>' + (me.avgSeconds || 0) + 's</b><span>Avg speed</span></div></div>' +
                podium(rows) + board(rows.slice(0, 10), me.name) + '<div class="lc-actions"><button class="lc-btn" id="lcDoneBtn">Close</button></div>';
            shell(h3, '');
            $('lcDoneBtn').onclick = closeOverlay;
        }
        var lv = $('lcLeaveBtn'); if (lv) lv.onclick = function() { if (confirm('Leave this competition?')) closeOverlay(); };
        try { sessionStorage.setItem('lc_player', JSON.stringify({ code: lc.code, pid: lc.pid, key: lc.key })); } catch (e) {}
    }
    async function playerAnswer(i) {
        if (!lc || !lc.state) return;
        sndClick();
        var qi = lc.state.qIndex;
        document.querySelectorAll('.lc-opt').forEach(function(b) { b.disabled = true; b.onclick = null; });
        var pick = document.querySelector('.lc-opt[data-i="' + i + '"]'); if (pick) pick.classList.add('picked');
        var tries = 0, r;
        do { r = await api('POST', '/api/competition/answer', { code: lc.code, pid: lc.pid, key: lc.key, qIndex: qi, choice: i }); tries++; }
        while (!r.ok && r.status === 0 && tries < 3);
        if (lc) { lc.sig = ''; if (lc.state && lc.state.me) lc.state.me.choice = i; }
        var p = $('lcBody'); if (p && !$('lcLocked')) { var m = document.createElement('p'); m.id = 'lcLocked'; m.className = 'lc-locked'; m.textContent = (r.ok && r.data.recorded === false) ? 'Too late - time was up.' : 'Answer locked in. Waiting for the others...'; p.appendChild(m); }
    }
    function openPlayer(code, pid, key) {
        lc = { role: 'player', code: code, pid: pid, key: key, have: -1, q: null, sig: '', offset: 0, state: null };
        shell('<div class="lc-center"><h2>Joining...</h2></div>');
        startLoop();
    }

    // Join screen: used by the logged-in student panel and the code page
    function joinScreen(prefillCode) {
        var loggedIn = !!studentToken();
        var h = '<div class="lc-center"><h2>Join a live competition</h2><p class="lc-small">Type the 6-digit code on your teacher\'s screen.</p>' +
            '<input id="lcJoinCode" class="lc-input code" inputmode="numeric" maxlength="6" placeholder="000000" value="' + esc(prefillCode || '') + '">' +
            '<input id="lcJoinName" class="lc-input" maxlength="30" placeholder="Your name" ' + (loggedIn ? 'style="display:none"' : '') + '>' +
            (loggedIn ? '<p class="lc-small">You will join with your CleverMent account.</p>' : '<p class="lc-small">Tip: log in as a student first and your points are saved to My Progress.</p>') +
            '<p id="lcJoinMsg" class="lc-err"></p><button class="lc-btn" id="lcJoinBtn">Join</button></div>';
        shell(h, '<button class="lc-link" id="lcJoinClose">Close</button>');
        $('lcJoinClose').onclick = closeOverlay;
        $('lcJoinBtn').onclick = doJoin;
        $('lcJoinCode').onkeydown = $('lcJoinName').onkeydown = function(e) { if (e.key === 'Enter') doJoin(); };
        setTimeout(function() { $('lcJoinCode').focus(); }, 50);
    }
    async function doJoin() {
        var code = ($('lcJoinCode').value || '').trim(), name = ($('lcJoinName').value || '').trim(), msg = $('lcJoinMsg');
        msg.textContent = '';
        if (!/^\d{6}$/.test(code)) { msg.textContent = 'The code has 6 digits.'; return; }
        audio();
        var btn = $('lcJoinBtn'); btn.disabled = true; btn.textContent = 'Joining...';
        var r = await api('POST', '/api/competition/join', { code: code, name: name }, studentToken());
        btn.disabled = false; btn.textContent = 'Join';
        if (!r.ok) { msg.textContent = r.data.error || 'Could not join.'; return; }
        openPlayer(code, r.data.pid, r.data.key);
    }

    // ============================================================
    // TEACHER PANEL
    // ============================================================
    function parseCsv(text) {
        var rows = [], row = [], cell = '', inQ = false;
        text = String(text).replace(/^\uFEFF/, '');
        for (var i = 0; i < text.length; i++) {
            var c = text[i];
            if (inQ) {
                if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += c;
            } else if (c === '"') inQ = true;
            else if (c === ',') { row.push(cell); cell = ''; }
            else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(function(x) { return x.trim() !== ''; })) rows.push(row); row = []; }
            else cell += c;
        }
        row.push(cell); if (row.some(function(x) { return x.trim() !== ''; })) rows.push(row);
        return rows;
    }
    function csvToQuestions(text) {
        var rows = parseCsv(text), out = [];
        rows.forEach(function(r) {
            if (r.length < 6) return;
            // The answer cell must be exactly A, B, C or D (this also skips the header row "Correct Answer").
            var m = String(r[5]).trim().match(/^\(?([A-Da-d])\)?[.):]?$/);
            if (!m) return;
            var opts = [r[1], r[2], r[3], r[4]].map(function(x) { return String(x || '').trim(); });
            out.push({ question: String(r[0]).trim(), options: opts.filter(Boolean), correctAnswer: m[1].toUpperCase(), image: r.length > 6 ? String(r[6]).trim().replace(/^"|"$/g, '') : '' });
        });
        return out;
    }

    // ---- question list with picture upload (same idea as the normal CleverMent publishing page) ----
    var lcQuestions = [], lcSubject = '', lcImgIndex = -1;
    function readImageFile(file) {
        return new Promise(function(resolve, reject) {
            var fr = new FileReader();
            fr.onerror = function() { reject(new Error('Could not read that file.')); };
            fr.onload = function() {
                var img = new Image();
                img.onerror = function() { reject(new Error('That file is not a picture.')); };
                img.onload = function() {
                    var max = 1000, w = img.width, h = img.height;
                    if (Math.max(w, h) > max) { var k = max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
                    var c = document.createElement('canvas'); c.width = w; c.height = h;
                    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
                    resolve(c.toDataURL('image/jpeg', 0.85));
                };
                img.src = fr.result;
            };
            fr.readAsDataURL(file);
        });
    }
    var lcEditing = false;
    function renderQEditor() {
        var box = $('lcQEditor'); if (!box) return;
        if (!lcQuestions.length) { box.innerHTML = ''; return; }
        var withImg = lcQuestions.filter(function(q) { return q.image; }).length;
        box.innerHTML = '<p class="helper-text" id="lcQNote">' + lcQuestions.length + ' questions ready &middot; ' + withImg + ' with a picture.</p>' +
            '<button type="button" id="lcReviewBtn" class="secondary-btn" style="background:#eef6ff; color:#1d5fbf; border-color:#cfe1ff; margin-bottom:10px;">&#128444;&#65039; Review Questions &amp; Add Images</button>';
        $('lcReviewBtn').onclick = openLcEditor;
    }
    // Opens CleverMent's own "Review Questions & Add Images" window for the competition questions.
    function openLcEditor() {
        if (!lcQuestions.length) { alert('Load questions first.'); return; }
        if (typeof renderAssessmentEditor !== 'function') { alert('The question editor is not available.'); return; }
        lcEditing = true;
        assessmentEditorDraftMode = true;
        var box = $('assessmentEditorSettings'); if (box) { box.style.display = 'none'; box.innerHTML = ''; }
        currentAssessmentBeingEdited = { id: null, code: '', subject: 'Live Competition', className: '', teacherEmail: '', questions: JSON.parse(JSON.stringify(lcQuestions)) };
        renderAssessmentEditor();
        var modal = $('assessmentEditorModal');
        if (modal) { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
    }
    var origRenderEditor = window.renderAssessmentEditor;
    if (typeof origRenderEditor === 'function') {
        window.renderAssessmentEditor = function() {
            var out = origRenderEditor.apply(this, arguments);
            if (lcEditing) {
                var sub = $('assessmentEditorSubtitle'); if (sub) sub.textContent = 'These are the questions for your live competition. Edit, delete or add questions and upload images; then click Save Questions.';
                var sb = $('assessmentEditorSaveBtn'); if (sb) sb.textContent = 'Save Questions';
            }
            return out;
        };
    }
    var origSaveEditor = window.saveAssessmentEditorChanges;
    if (typeof origSaveEditor === 'function') {
        window.saveAssessmentEditorChanges = function() {
            if (!lcEditing) return origSaveEditor.apply(this, arguments);
            syncAssessmentEditorFromDOM();
            var qs = (currentAssessmentBeingEdited && currentAssessmentBeingEdited.questions) || [];
            if (!qs.length) { alert('A competition must contain at least one question.'); return; }
            for (var i = 0; i < qs.length; i++) {
                var q = qs[i];
                if (!String(q.question || '').trim()) { alert('Question ' + (i + 1) + ' is empty.'); return; }
                if (!Array.isArray(q.options) || q.options.length < 4 || q.options.some(function(o) { return !String(o || '').trim(); })) { alert('Question ' + (i + 1) + ' must have all four options (A-D).'); return; }
                if (!/^[ABCD]$/.test(String(q.correctAnswer || '').toUpperCase())) { alert('Question ' + (i + 1) + ' must have a correct answer of A, B, C or D.'); return; }
                q.correctAnswer = String(q.correctAnswer).toUpperCase();
            }
            lcQuestions = JSON.parse(JSON.stringify(qs));
            closeAssessmentEditor();
            renderQEditor();
            alert('Questions saved for this competition.');
        };
    }
    var origCloseEditor = window.closeAssessmentEditor;
    if (typeof origCloseEditor === 'function') {
        window.closeAssessmentEditor = function() { lcEditing = false; return origCloseEditor.apply(this, arguments); };
    }
    async function loadAssessmentQuestions() {
        var code = $('lcAssess') ? $('lcAssess').value : '';
        lcQuestions = []; renderQEditor();
        if (!code) return;
        var box = $('lcQEditor'); if (box) box.innerHTML = '<p class="helper-text">Loading questions...</p>';
        var r = await api('GET', '/api/teacher/competition/assessment/' + encodeURIComponent(code), null, teacherToken());
        if (!r.ok) { if (box) box.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + esc(r.data.error || 'Could not load the questions.') + '</p>'; return; }
        lcQuestions = r.data.questions || []; lcSubject = r.data.subject || '';
        renderQEditor();
    }

    async function teacherInit() {
        var el = $('competitionSection');
        if (!el) return;
        el.innerHTML = '<h3 style="margin:0 0 6px;">Live Competition</h3><p class="helper-text">Loading...</p>';
        var resume = '';
        try { var hc = sessionStorage.getItem('lc_host'); if (hc) resume = hc; } catch (e) {}
        var s = await api('GET', '/api/teacher/competition/setup', null, teacherToken());
        if (!s.ok) { el.innerHTML += '<p class="helper-text" style="color:#dc3545;">' + esc(s.data.error || 'Could not load.') + '</p>'; return; }
        var setup = s.data;
        lcQuestions = []; lcSubject = '';
        var h = '<h3 style="margin:0 0 6px;">Live Competition</h3><p class="helper-text">Host a live, timed quiz. Students join with a 6-digit code and score more points for answering faster. Questions move on by themselves.</p>';
        if (resume) h += '<div class="lc-resume">You have a game running (code <b>' + esc(resume) + '</b>). <button type="button" class="primary-btn" id="lcResumeBtn" style="padding:6px 14px;">Return to it</button></div>';
        h += '<div class="lc-form">' +
            '<label class="live-msg-label">Competition title</label><input id="lcTitle" class="form-input" maxlength="80" placeholder="e.g. Friday Maths Challenge">' +
            '<label class="live-msg-label">Questions from</label>' +
            '<select id="lcSource" class="form-input"><option value="assessment">One of my assessments</option><option value="csv">Upload a CSV just for this competition</option></select>' +
            '<div id="lcSrcAssess"><select id="lcAssess" class="form-input">' + (setup.assessments.length ? setup.assessments.map(function(a) { return '<option value="' + esc(a.code) + '">' + esc(a.subject) + ' - ' + esc(a.className) + ' (' + a.questionCount + ' questions, ' + esc(a.code) + ')</option>'; }).join('') : '<option value="">No assessments yet</option>') + '</select></div>' +
            '<div id="lcSrcCsv" style="display:none;"><input type="file" id="lcCsvFile" accept=".csv,text/csv" class="form-input"><input id="lcCsvSubject" class="form-input" maxlength="60" placeholder="Subject (optional)" style="margin-top:6px;"><p class="helper-text" id="lcCsvInfo">CSV columns: Question, Option A, Option B, Option C, Option D, Correct Answer (A-D), Image URL (optional). Same as your normal CleverMent CSV. You can add pictures after loading it.</p></div>' +
            '<div id="lcQEditor"></div>' +
            '<div class="lc-grid"><div><label class="live-msg-label">Number of questions</label><select id="lcCount" class="form-input"><option value="0">All</option><option>5</option><option>10</option><option>15</option><option>20</option><option>30</option><option>50</option></select></div>' +
            '<div><label class="live-msg-label">Seconds per question</label><select id="lcSecs" class="form-input"><option>10</option><option selected>15</option><option>20</option><option>30</option><option>45</option><option>60</option></select></div></div>' +
            '<label class="live-msg-label">Who can join</label><select id="lcAccess" class="form-input"><option value="open">Anyone with the code (types a name)</option><option value="roster">Only my roster students (must log in)</option></select>' +
            '<div id="lcClassWrap" style="display:none;"><label class="live-msg-label">Class</label><select id="lcClass" class="form-input"><option value="">Any of my classes</option>' + setup.classes.map(function(c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select></div>' +
            '<p class="helper-text">Logged-in roster students are always joined with their own name, and their points are added to their progress.</p>' +
            '<p id="lcFormMsg" class="helper-text" style="color:#dc3545;min-height:18px;"></p><button type="button" class="primary-btn" id="lcCreateBtn" style="width:100%;">Create room</button></div>' +
            '<h3 style="margin:22px 0 6px;">Past competitions</h3><div id="lcHistory"><p class="helper-text">Loading...</p></div>';
        el.innerHTML = h;
        $('lcSource').onchange = function() {
            var c = this.value === 'csv';
            $('lcSrcAssess').style.display = c ? 'none' : 'block'; $('lcSrcCsv').style.display = c ? 'block' : 'none';
            lcQuestions = []; lcSubject = ''; renderQEditor();
            if (!c) loadAssessmentQuestions();
        };
        $('lcAssess').onchange = loadAssessmentQuestions;
        $('lcAccess').onchange = function() { $('lcClassWrap').style.display = this.value === 'roster' ? 'block' : 'none'; };
        $('lcCsvFile').onchange = function() {
            var f = this.files[0]; if (!f) return;
            var rd = new FileReader();
            rd.onload = function() {
                lcQuestions = csvToQuestions(rd.result);
                $('lcCsvInfo').textContent = lcQuestions.length ? lcQuestions.length + ' questions loaded from ' + f.name + '. Add pictures below if you need them.' : 'No valid questions found. Check the column order and that the Correct Answer column has A, B, C or D.';
                renderQEditor();
            };
            rd.readAsText(f);
        };
        $('lcCreateBtn').onclick = teacherCreate;
        var rb = $('lcResumeBtn'); if (rb) rb.onclick = function() { audio(); openHost(resume); };
        if (setup.assessments.length) loadAssessmentQuestions();
        loadHistory();
    }
    async function teacherCreate() {
        var msg = $('lcFormMsg'); msg.textContent = '';
        audio();
        if (!lcQuestions.length) { msg.textContent = $('lcSource').value === 'csv' ? 'Upload a CSV with questions first.' : 'Choose an assessment first.'; return; }
        var subject = $('lcSource').value === 'csv' ? $('lcCsvSubject').value : lcSubject;
        var body = { title: $('lcTitle').value, source: 'custom', questions: lcQuestions, subject: subject, count: parseInt($('lcCount').value, 10) || 0, timeLimit: parseInt($('lcSecs').value, 10), access: $('lcAccess').value, className: $('lcAccess').value === 'roster' ? $('lcClass').value : '' };
        var btn = $('lcCreateBtn'); btn.disabled = true; btn.textContent = 'Creating...';
        var r = await api('POST', '/api/teacher/competition/rooms', body, teacherToken());
        btn.disabled = false; btn.textContent = 'Create room';
        if (!r.ok) { msg.textContent = r.data.error || 'Could not create the room.'; return; }
        openHost(r.data.code);
    }
    async function loadHistory() {
        var box = $('lcHistory'); if (!box) return;
        var r = await api('GET', '/api/teacher/competitions', null, teacherToken());
        if (!r.ok) { box.innerHTML = '<p class="helper-text">Could not load.</p>'; return; }
        if (r.data.note) { box.innerHTML = '<p class="helper-text" style="color:#b45309;">' + esc(r.data.note) + '</p>'; return; }
        var games = r.data.games || [];
        if (!games.length) { box.innerHTML = '<p class="helper-text">No competitions yet. Finished games appear here.</p>'; return; }
        box.innerHTML = games.map(function(g, gi) {
            var rows = g.results.map(function(x) { return '<tr><td>' + x.rank + '</td><td>' + esc(x.name) + (x.guest ? ' <small>(guest)</small>' : '') + '</td><td>' + esc(x.admissionNumber) + '</td><td>' + x.points + '</td><td>' + x.correct + '/' + x.total + '</td><td>' + x.avgSeconds + 's</td></tr>'; }).join('');
            return '<details class="lc-hist"><summary><b>' + esc(g.title) + '</b> <small>' + new Date(g.date).toLocaleDateString() + ' &middot; ' + g.playerCount + ' players' + (g.className ? ' &middot; ' + esc(g.className) : '') + '</small></summary>' +
                '<div style="overflow-x:auto;"><table class="lc-table"><tr><th>#</th><th>Name</th><th>Adm. No.</th><th>Points</th><th>Correct</th><th>Avg</th></tr>' + rows + '</table></div>' +
                '<button type="button" class="secondary-btn" data-del="' + esc(g.gameId) + '" style="margin-top:8px;color:#dc3545;">Delete this record</button></details>';
        }).join('');
        box.querySelectorAll('[data-del]').forEach(function(b) {
            b.onclick = async function() {
                if (!confirm('Delete this competition record?')) return;
                await api('DELETE', '/api/teacher/competitions/' + encodeURIComponent(b.getAttribute('data-del')), null, teacherToken());
                loadHistory();
            };
        });
    }

    // ============================================================
    // STUDENT PANEL ("Live Competition" menu item)
    // ============================================================
    async function studentPanel() {
        var el = $('saPanelCompetition'); if (!el) return;
        el.innerHTML = '<h2>Live Competition</h2><p class="helper-text">Your teacher will give you a 6-digit code. Answer fast to earn more points!</p>' +
            '<div class="lc-join-card"><input id="lcPanelCode" class="form-input" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit code" style="text-align:center;font-size:22px;letter-spacing:6px;font-weight:700;"><button type="button" class="primary-btn" id="lcPanelJoin" style="width:100%;margin-top:8px;">Join competition</button><p id="lcPanelMsg" class="helper-text" style="color:#dc3545;min-height:18px;"></p></div>' +
            '<div id="lcPanelStats"><p class="helper-text">Loading your competition results...</p></div>';
        $('lcPanelJoin').onclick = async function() {
            var code = ($('lcPanelCode').value || '').trim(), msg = $('lcPanelMsg'); msg.textContent = '';
            if (!/^\d{6}$/.test(code)) { msg.textContent = 'The code has 6 digits.'; return; }
            audio();
            var r = await api('POST', '/api/competition/join', { code: code }, studentToken());
            if (!r.ok) { msg.textContent = r.data.error || 'Could not join.'; return; }
            openPlayer(code, r.data.pid, r.data.key);
        };
        var r = await api('GET', '/api/student/competitions', null, studentToken());
        var box = $('lcPanelStats'); if (!box) return;
        box.innerHTML = r.ok ? statsHtml(r.data) : '';
    }
    function statsHtml(d) {
        if (!d.items || !d.items.length) return '<p class="helper-text">You have not played a live competition yet.</p>';
        var h = '<div class="cm-stat-row"><div class="cm-stat"><span>Total points</span><strong>' + d.totalPoints + '</strong></div><div class="cm-stat"><span>Competitions</span><strong>' + d.games + '</strong></div><div class="cm-stat"><span>Best rank</span><strong>#' + d.bestRank + '</strong></div></div>';
        h += '<div class="lc-hlist">';
        d.items.forEach(function(x) { h += '<div class="lc-hitem"><div><b>' + esc(x.title) + '</b><br><small>' + new Date(x.date).toLocaleDateString() + (x.subject ? ' &middot; ' + esc(x.subject) : '') + '</small></div><div class="lc-hright"><b>' + x.points + ' pts</b><br><small>Rank ' + x.rank + '/' + x.players + ' &middot; ' + x.correct + '/' + x.total + '</small></div></div>'; });
        return h + '</div>';
    }

    // ============================================================
    // HOOK INTO THE EXISTING APP (without changing it)
    // ============================================================
    var origTeacherShow = window.showTeacherSection;
    if (typeof origTeacherShow === 'function') {
        window.showTeacherSection = function(panelId, btn) {
            origTeacherShow.apply(this, arguments);
            if (panelId === 'competitionSection') teacherInit();
        };
    }
    var origStudentShow = window.studentAreaShow;
    if (typeof origStudentShow === 'function') {
        window.studentAreaShow = function(p) {
            var panel = $('saPanelCompetition');
            if (p === 'competition') {
                origStudentShow('home');
                var home = $('saPanelHome'); if (home) home.style.display = 'none';
                if (panel) panel.style.display = 'block';
                document.querySelectorAll('.sa-nav button').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-p') === 'competition'); });
                studentPanel();
                return;
            }
            if (panel) panel.style.display = 'none';
            return origStudentShow.apply(this, arguments);
        };
    }
    // Competition points also appear inside "My Progress"
    var origProgress = window.renderStudentProgress;
    if (typeof origProgress === 'function') {
        window.renderStudentProgress = function() {
            var out = origProgress.apply(this, arguments);
            var el = $('saPanelProgress');
            if (el && studentToken() && el.id === 'saPanelProgress') {
                api('GET', '/api/student/competitions', null, studentToken()).then(function(r) {
                    if (!r.ok || !r.data.items || !r.data.items.length) return;
                    var old = $('lcProgressBox'); if (old) old.remove();
                    var d = document.createElement('div'); d.id = 'lcProgressBox'; d.className = 'lc-progress-box';
                    d.innerHTML = '<h3 style="margin:18px 0 6px;">Live Competitions</h3>' + statsHtml(r.data);
                    el.appendChild(d);
                });
            }
            return out;
        };
    }

    // Public hooks for the buttons in index.html
    window.lcOpenJoin = function() { joinScreen(''); };

    // Come back into a game after a refresh
    window.addEventListener('load', function() {
        try {
            var p = JSON.parse(sessionStorage.getItem('lc_player') || 'null');
            if (p && p.code && p.pid && p.key) { openPlayer(p.code, p.pid, p.key); return; }
        } catch (e) {}
        try {
            var hc = sessionStorage.getItem('lc_host');
            if (hc && teacherToken()) openHost(hc);
        } catch (e) {}
    });
})();
