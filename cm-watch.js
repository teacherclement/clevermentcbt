/* ============================================================
   CLEVERMENT LIVE WATCHING (front end)
   STUDENT: consent tick box, "teacher is watching" badge, small pictures
            and live camera/sound - only after the student agreed.
   TEACHER: grid of slow-refresh pictures + tap to watch and listen.
   ============================================================ */
(function () {
    'use strict';
    if (window.__cmWatchLoaded) return;
    window.__cmWatchLoaded = true;
    var API = (typeof BACKEND_URL !== 'undefined' && BACKEND_URL) ? BACKEND_URL : 'https://api.thecleverment.com';
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function $(id) { return document.getElementById(id); }
    function shown(id) { var el = $(id); return !!el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0; }
    function post(path, body, token, signal) {
        var h = { 'Content-Type': 'application/json' }; if (token) h.Authorization = 'Bearer ' + token;
        return fetch(API + path, { method: 'POST', headers: h, body: JSON.stringify(body || {}), signal: signal, cache: 'no-store' }).then(function (r) { return r.json().catch(function () { return {}; }); });
    }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    // =================== STUDENT ===================
    var CONSENT_TEXT = '<b>Live monitoring is on for this assessment.</b> While you take it, your teacher can see a small picture from your camera every few seconds, and can open a live view with your camera and sound. This only happens during this assessment. A badge on your screen tells you when your teacher is watching live.';
    function consentKey() { try { return 'cm_watch_ok_' + currentAssessmentCode + '_' + String(studentAdmissionNumber).toLowerCase(); } catch (e) { return ''; } }
    function monitored() { try { return !!(currentAssessment && (currentAssessment.cameraMonitoring || currentAssessment.noiseMonitoring)); } catch (e) { return false; } }

    // 1) Consent box on the Monitoring Notice screen; Start stays locked until ticked.
    function syncConsent() {
        var scr = $('proctorWarningScreen'); if (!scr || !shown('proctorWarningScreen') || !monitored()) return;
        var btn = $('proctorUnderstandBtn'), box = $('cmWatchConsent');
        if (!box) {
            box = document.createElement('label'); box.id = 'cmWatchConsent';
            box.style.cssText = 'display:flex;gap:10px;align-items:flex-start;background:#fff;border:1.5px solid #dc3545;border-radius:8px;padding:12px;margin-bottom:14px;color:#7a1f1f;font-size:13.5px;line-height:1.45;cursor:pointer';
            box.innerHTML = '<input type="checkbox" id="cmWatchTick" style="width:22px;height:22px;flex:0 0 auto;margin-top:2px"><span>' + CONSENT_TEXT + '<br><b>I understand and agree.</b></span>';
            btn.parentNode.insertBefore(box, btn);
            $('cmWatchTick').addEventListener('change', syncConsent);
        }
        var ok = $('cmWatchTick').checked;
        if (!ok && btn && btn.textContent.indexOf('UNDERSTAND') !== -1) { btn.disabled = true; btn.style.opacity = '.5'; }
        else if (ok && btn && btn.disabled && btn.textContent.indexOf('UNDERSTAND') !== -1) { btn.disabled = false; btn.style.opacity = ''; }
        if (ok && btn) btn.style.opacity = '';
        if (ok) { try { sessionStorage.setItem(consentKey(), '1'); } catch (e) { } }
        else { try { sessionStorage.removeItem(consentKey()); } catch (e) { } }
    }
    function wrapStart() {
        var f = window.dismissProctorWarningAndBegin;
        if (typeof f !== 'function' || f.__cmw) return;
        var w = function () { if (monitored()) { var t = $('cmWatchTick'); if (!t || !t.checked) return; } return f.apply(this, arguments); };
        w.__cmw = true; window.dismissProctorWarningAndBegin = w;
    }
    setInterval(function () { wrapStart(); syncConsent(); }, 400);

    // 2) Badge
    var badge = null;
    function setBadge(mode) {
        if (!badge) {
            badge = document.createElement('div');
            badge.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);left:50%;transform:translateX(-50%);z-index:9000;padding:5px 12px;border-radius:14px;font:600 12px Inter,Arial,sans-serif;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:none;pointer-events:none';
            document.body.appendChild(badge);
        }
        if (mode === 'live') { badge.style.background = '#dc2626'; badge.textContent = '🔴 Your teacher is watching live'; badge.style.display = 'block'; }
        else if (mode === 'pic') { badge.style.background = '#b45309'; badge.textContent = '👁 Your teacher can see a small preview'; badge.style.display = 'block'; }
        else { badge.style.display = 'none'; }
    }

    // 3) Student watcher: waits for the teacher's requests (only after agreeing)
    var W = { on: false, abort: null, snapOn: false, snapTimer: null, pc: null, viewer: null, ice: null, ctx: null };
    function body() { return { code: currentAssessmentCode, studentName: studentName, admissionNumber: studentAdmissionNumber }; }
    function eligible() {
        try {
            return !!(currentAssessmentCode && studentName && studentAdmissionNumber && monitored() && proctorMediaStream && proctorMediaStream.active &&
                shown('studentQuizSection') && sessionStorage.getItem(consentKey()) === '1');
        } catch (e) { return false; }
    }
    function refreshBadge() { setBadge(W.pc ? 'live' : (W.snapOn ? 'pic' : null)); }
    function setSnap(on) {
        on = !!on && !!(currentAssessment && currentAssessment.cameraMonitoring);
        if (on === W.snapOn) return;
        W.snapOn = on; clearInterval(W.snapTimer); W.snapTimer = null;
        if (on) { sendSnap(); W.snapTimer = setInterval(sendSnap, 10000); }
        refreshBadge();
    }
    function sendSnap() {
        try {
            var v = $('proctorCameraPreview'); if (!v || !v.videoWidth) return;
            var c = document.createElement('canvas'); c.width = 160; c.height = Math.round(160 * v.videoHeight / v.videoWidth) || 120;
            c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
            var b = body(); b.img = c.toDataURL('image/jpeg', 0.5);
            post('/api/quiz/watch/snap', b).catch(function () { });
        } catch (e) { }
    }
    function closeLive() {
        if (W.pc) { try { W.pc.close(); } catch (e) { } }
        W.pc = null; W.viewer = null; refreshBadge();
    }
    function setQuality(hq) {
        if (!W.pc) return;
        W.pc.getSenders().forEach(function (s) {
            if (s.track && s.track.kind === 'video') { try { var p = s.getParameters(); if (!p.encodings || !p.encodings.length) p.encodings = [{}]; p.encodings[0].maxBitrate = hq ? 350000 : 110000; p.encodings[0].maxFramerate = hq ? 15 : 8; p.encodings[0].scaleResolutionDownBy = hq ? 1 : 2; s.setParameters(p).catch(function () { }); } catch (e) { } }
        });
    }
    async function openLive(viewer, grid) {
        closeLive();
        try {
            if (!W.ice) { var r = await post('/api/quiz/watch/ice', body()); W.ice = (r.iceServers && r.iceServers.length) ? r.iceServers : [{ urls: 'stun:stun.l.google.com:19302' }]; }
            var pc = new RTCPeerConnection({ iceServers: W.ice });
            W.pc = pc; W.viewer = viewer; W.pendingIce = []; W.remoteSet = false;
            proctorMediaStream.getTracks().forEach(function (t) { pc.addTrack(t, proctorMediaStream); });
            if (grid) setQuality(false);
            else pc.getSenders().forEach(function (s) {
                if (s.track && s.track.kind === 'video') { try { var p = s.getParameters(); if (!p.encodings || !p.encodings.length) p.encodings = [{}]; p.encodings[0].maxBitrate = 250000; p.encodings[0].maxFramerate = 12; s.setParameters(p); } catch (e) { } }
            });
            pc.onicecandidate = function (e) { if (e.candidate) { var b = body(); b.viewer = viewer; b.type = 'ice'; b.data = e.candidate; post('/api/quiz/watch/send', b); } };
            pc.onconnectionstatechange = function () { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') { if (W.pc === pc) closeLive(); } };
            var offer = await pc.createOffer(); await pc.setLocalDescription(offer);
            var b = body(); b.viewer = viewer; b.type = 'offer'; b.data = { type: offer.type, sdp: offer.sdp };
            await post('/api/quiz/watch/send', b);
            refreshBadge();
        } catch (e) { closeLive(); }
    }
    async function onEvent(ev) {
        if (ev.type === 'snap') return;
        if (ev.type === 'viewer') return openLive(ev.viewer, !!ev.grid);
        if (!W.pc || ev.viewer !== W.viewer) return;
        if (ev.type === 'stop') return closeLive();
        if (ev.type === 'quality') return setQuality(!!(ev.data && ev.data.hq));
        try {
            if (ev.type === 'answer') { await W.pc.setRemoteDescription(ev.data); W.remoteSet = true; (W.pendingIce || []).forEach(function (c) { W.pc.addIceCandidate(c).catch(function () { }); }); W.pendingIce = []; }
            else if (ev.type === 'ice') { if (W.remoteSet) W.pc.addIceCandidate(ev.data).catch(function () { }); else (W.pendingIce = W.pendingIce || []).push(ev.data); }
        } catch (e) { }
    }
    async function watchLoop() {
        if (W.on) return; W.on = true;
        var ctrl = new AbortController(); W.abort = ctrl;
        while (W.on && eligible()) {
            try {
                var r = await post('/api/quiz/watch/poll', body(), null, ctrl.signal);
                if (r.off) { await sleep(15000); continue; }
                if (r.wait) { await sleep(4000); continue; }
                setSnap(r.snap);
                for (var i = 0; r.events && i < r.events.length; i++) await onEvent(r.events[i]);
            } catch (e) { if (ctrl.signal.aborted) break; await sleep(4000); }
        }
        W.on = false; W.abort = null; setSnap(false); closeLive(); W.ice = null;
    }
    setInterval(function () { if (eligible()) { if (!W.on) watchLoop(); } else if (W.on && W.abort) { W.on = false; try { W.abort.abort(); } catch (e) { } } }, 2000);

    // =================== TEACHER ===================
    var T = { open: false, code: '', page: 0, cache: {}, since: 0, timer: null, viewer: null, pc: null, polling: false, stopAt: 0 };
    function tok() { return localStorage.getItem('cleverment_teacher_token'); }
    function tget(path) { return fetch(API + path, { headers: { Authorization: 'Bearer ' + tok() }, cache: 'no-store' }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Failed'); return j; }); }); }
    function tpost(path, b) { return post(path, b, tok()); }

    var css = '#cmWatchCard{margin:0 0 14px;padding:14px;border:1.5px solid #dbe3f0;border-radius:12px;background:#f7faff;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}' +
        '#cmWatchCard b{font-size:15px}#cmWatchCard small{display:block;color:#667085;margin-top:2px;font-size:12.5px}' +
        '.cmw-btn{background:#1e3a8a;color:#fff;border:0;border-radius:9px;padding:10px 14px;font:600 14px Inter,Arial,sans-serif;cursor:pointer}.cmw-btn.red{background:#dc2626}.cmw-btn.ghost{background:#fff;color:#1f2328;border:1px solid #cfd6e4}' +
        '#cmWatchOv{position:fixed;inset:0;background:#0f172a;z-index:9500;display:none;flex-direction:column;color:#e8ebf0;font-family:Inter,Arial,sans-serif}#cmWatchOv.on{display:flex}' +
        '.cmw-top{display:flex;gap:8px;align-items:center;padding:calc(env(safe-area-inset-top,0px) + 10px) 12px 10px;border-bottom:1px solid #243049;flex-wrap:wrap}' +
        '.cmw-top select{flex:1;min-width:140px;padding:9px;border-radius:8px;border:1px solid #324261;background:#1b2740;color:#fff;font-size:14px}' +
        '.cmw-grid{flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;align-content:start}' +
        '.cmw-tile{background:#1b2740;border:1px solid #2c3b5a;border-radius:10px;overflow:hidden;cursor:pointer;text-align:left;color:inherit;padding:0;font:inherit}.cmw-tile.off{opacity:.55;cursor:default}' +
        '.cmw-pic{aspect-ratio:4/3;background:#0b1220;display:flex;align-items:center;justify-content:center;color:#7f8fb0;font-size:12px;text-align:center;padding:6px}.cmw-pic img{width:100%;height:100%;object-fit:cover;display:block}' +
        '.cmw-name{padding:7px 9px;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cmw-name small{display:block;font-weight:400;color:#8fa0c2;font-size:11px}' +
        '.cmw-msg{padding:30px 16px;text-align:center;color:#9aa8c7;font-size:14px;grid-column:1/-1}' +
        '.cmw-foot{display:flex;justify-content:center;gap:10px;align-items:center;padding:8px 12px calc(env(safe-area-inset-bottom,0px) + 8px);border-top:1px solid #243049;font-size:13px}' +
        '#cmWatchLive{position:absolute;inset:0;background:#0f172a;display:none;flex-direction:column}#cmWatchLive.on{display:flex}' +
        '#cmWatchLive video{flex:1;min-height:0;width:100%;background:#000;object-fit:contain}' +
        '.cmw-grid.live{overflow:hidden;padding:8px;gap:8px}' +
        '.cmw-tile.lv{position:relative;display:block;width:100%}.cmw-tile.lv.listen{border-color:#22c55e;box-shadow:0 0 0 2px #22c55e}.cmw-tile.lv.loud{border-color:#f59e0b;box-shadow:0 0 0 2px #f59e0b}' +
        '.cmw-tile.lv .cmw-pic{position:relative;padding:0;aspect-ratio:4/3}.cmw-tile.lv video,.cmw-tile.lv .cmw-pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.cmw-tile.lv video{background:#000;display:none}.cmw-tile.lv.isLive video{display:block}' +
        '.cmw-tile.lv .cmw-name{display:flex;align-items:center;gap:6px;padding:4px 7px;font-size:12px}.cmw-tile.lv .cmw-name span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}' +
        '.cmw-meter{position:absolute;left:0;right:0;bottom:0;height:5px;background:rgba(0,0,0,.45);z-index:2}.cmw-meter i{display:block;height:100%;width:0;background:#22c55e;transition:width .12s}' +
        '.cmw-badge{position:absolute;top:5px;left:5px;z-index:2;font-size:10.5px;padding:2px 6px;border-radius:8px;background:rgba(15,23,42,.8);color:#cbd5e1}.cmw-badge.live{background:#dc2626;color:#fff}' +
        '.cmw-big{position:absolute;top:4px;right:4px;z-index:3;width:28px;height:28px;border-radius:8px;border:0;background:rgba(15,23,42,.8);color:#fff;font-size:15px;cursor:pointer}.cmw-snd{font-size:13px}';
    function buildTeacher() {
        if ($('cmWatchOv')) return;
        var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
        var ov = document.createElement('div'); ov.id = 'cmWatchOv';
        ov.innerHTML = '<div class="cmw-top"><b style="font-size:15px">👁 Live watching</b><select id="cmWatchSel"></select><button class="cmw-btn ghost" id="cmWatchMode" title="Show live video for every student on screen">🎥 Live grid: ON</button><button class="cmw-btn ghost" id="cmWatchClose">Close</button></div>' +
            '<div class="cmw-grid" id="cmWatchGrid"></div><div class="cmw-foot" id="cmWatchFoot"></div>' +
            '<div id="cmWatchLive"><div class="cmw-top"><b id="cmWatchWho" style="flex:1"></b><button class="cmw-btn ghost" id="cmWatchMute">🔊 Sound on</button><button class="cmw-btn red" id="cmWatchStop">Stop</button></div>' +
            '<video id="cmWatchVideo" autoplay playsinline></video><div class="cmw-foot" id="cmWatchState">Connecting…</div></div>';
        document.body.appendChild(ov);
        $('cmWatchClose').addEventListener('click', closeOverlay);
        $('cmWatchSel').addEventListener('change', function () { gStopAll(); T.code = this.value; T.page = 0; T.cache = {}; T.since = 0; loadGrid(); });
        $('cmWatchMode').addEventListener('click', function () { G.on = !G.on; try { localStorage.setItem('cmw_live', G.on ? '1' : '0'); } catch (e) { } gStopAll(); resetLive($('cmWatchGrid')); T.page = 0; T.since = 0; modeLabel(); loadGrid(); });
        modeLabel();
        $('cmWatchStop').addEventListener('click', stopLive);
        $('cmWatchMute').addEventListener('click', function () { var v = $('cmWatchVideo'); v.muted = !v.muted; this.textContent = v.muted ? '🔇 Sound off' : '🔊 Sound on'; });
    }
    function ensureCard() {
        var c = $('teacherLiveContainer'); if (!c || $('cmWatchCard')) return;
        var card = document.createElement('div'); card.id = 'cmWatchCard';
        card.innerHTML = '<div><b>👁 Live watching</b><small>For assessments where you turned on camera or noise monitoring. Students are told when you watch.</small></div><button class="cmw-btn" id="cmWatchOpen">Open watching</button>';
        c.parentNode.insertBefore(card, c);
        $('cmWatchOpen').addEventListener('click', openOverlay);
    }
    setInterval(ensureCard, 2000);

    function openOverlay() {
        buildTeacher(); T.open = true; $('cmWatchOv').classList.add('on');
        $('cmWatchGrid').innerHTML = '<div class="cmw-msg">Loading…</div>';
        tget('/api/teacher/watch/assessments').then(function (d) {
            var sel = $('cmWatchSel'), list = d.assessments || [];
            if (!list.length) { sel.innerHTML = ''; $('cmWatchGrid').innerHTML = '<div class="cmw-msg">No students are taking a monitored assessment right now.<br><br>Live watching works only while students are taking an assessment where you turned on camera or noise monitoring.</div>'; T.code = ''; scheduleGrid(8000); return; }
            sel.innerHTML = list.map(function (a) { return '<option value="' + esc(a.code) + '">' + esc(a.subject) + ' · ' + esc(a.className) + ' (' + a.online + ' online)</option>'; }).join('');
            if (!T.code || !list.some(function (a) { return a.code === T.code; })) { T.code = list[0].code; T.page = 0; T.cache = {}; T.since = 0; }
            sel.value = T.code; loadGrid();
        }).catch(function (e) { $('cmWatchGrid').innerHTML = '<div class="cmw-msg">' + esc(e.message) + '</div>'; });
    }
    function closeOverlay() { stopLive(); gStopAll(); T.open = false; clearTimeout(T.timer); $('cmWatchOv').classList.remove('on'); }
    function scheduleGrid(ms) { clearTimeout(T.timer); if (T.open) T.timer = setTimeout(function () { if (T.live) return scheduleGrid(8000); if (T.code) loadGrid(); else openOverlay(); }, ms || 8000); }
    function loadGrid() {
        if (!T.open || !T.code) return;
        tget('/api/teacher/watch/grid?code=' + encodeURIComponent(T.code) + '&page=' + T.page + '&since=' + T.since + '&per=' + (G.on && LIVE_OK ? deviceCap() : 12)).then(function (d) {
            T.since = d.serverTime - 1000; T.page = d.page;
            var g = $('cmWatchGrid'), usedLive = liveMode(d);
            if (usedLive) renderLive(d, g);
            else if (resetLive(g), !d.students.length) { g.innerHTML = '<div class="cmw-msg">No students online in this assessment.</div>'; }
            else g.innerHTML = d.students.map(function (s) {
                if (s.img) T.cache[s.adm] = { img: s.img, at: s.at };
                var c = T.cache[s.adm], age = c ? Math.max(1, Math.round((Date.now() - (c.at + (Date.now() - d.serverTime))) / 1000)) : 0;
                var pic = c ? '<img src="' + c.img + '" alt="">' : (d.camera ? (s.ready ? 'Waiting for picture…' : 'Not ready (no consent yet)') : '🎙 Sound only');
                return '<button class="cmw-tile' + (s.ready ? '' : ' off') + '" data-adm="' + esc(s.adm) + '" data-name="' + esc(s.name) + '"><div class="cmw-pic">' + pic + '</div><div class="cmw-name">' + esc(s.name) + '<small>' + (s.ready ? 'Tap to watch & listen' : 'Not available yet') + '</small></div></button>';
            }).join('');
            if (!usedLive) g.querySelectorAll('.cmw-tile').forEach(function (b) { if (!b.classList.contains('off')) b.addEventListener('click', function () { startLive(b.getAttribute('data-adm'), b.getAttribute('data-name')); }); });
            var f = $('cmWatchFoot');
            f.innerHTML = d.pages > 1 ? '<button class="cmw-btn ghost" id="cmwPrev"' + (d.page <= 0 ? ' disabled' : '') + '>‹ Prev</button><span>Page ' + (d.page + 1) + ' of ' + d.pages + ' (' + d.total + ' students)</span><button class="cmw-btn ghost" id="cmwNext"' + (d.page >= d.pages - 1 ? ' disabled' : '') + '>Next ›</button>' : '<span>' + d.total + ' student' + (d.total === 1 ? '' : 's') + ' online · pictures refresh every ~10 seconds</span>';
            if ($('cmwPrev')) { $('cmwPrev').addEventListener('click', function () { T.page--; T.since = 0; loadGrid(); }); $('cmwNext').addEventListener('click', function () { T.page++; T.since = 0; loadGrid(); }); }
            scheduleGrid(8000);
        }).catch(function (e) { $('cmWatchGrid').innerHTML = '<div class="cmw-msg">' + esc(e.message) + '</div>'; scheduleGrid(12000); });
    }

    // =================== LIVE GRID (teacher) ===================
    // Every student on screen is watched live (small video, with a sound meter). Tap a tile to listen to that student only.
    var LIVE_OK = !!window.RTCPeerConnection;
    var G = { on: true, tiles: {}, byViewer: {}, ice: null, polling: false, listen: '', since: 0, ctx: null, big: null, meterTimer: null, timer: null, paused: false };
    try { if (localStorage.getItem('cmw_live') === '0') G.on = false; } catch (e) { }
    function modeLabel() { var b = $('cmWatchMode'); if (b) b.textContent = '🎥 Live grid: ' + (G.on && LIVE_OK ? 'ON' : 'OFF'); }
    // How many live videos this device can comfortably show at once.
    function deviceCap() {
        var coarse = false; try { coarse = matchMedia('(pointer:coarse)').matches; } catch (e) { }
        var small = Math.min(window.innerWidth, window.innerHeight);
        var cap = coarse ? (small < 600 ? 4 : 9) : 16;
        var low = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
        if (low) cap = Math.max(2, Math.floor(cap / 2));
        return cap;
    }
    function liveMode(d) { return G.on && LIVE_OK && (d.camera || d.mic); }
    function resetLive(g) { if (g && g.dataset.mode === 'live') { gStopAll(); g.dataset.mode = ''; g.classList.remove('live'); g.style.gridTemplateColumns = ''; g.style.justifyContent = ''; g.style.alignContent = ''; g.innerHTML = ''; } }
    // Choose the column count that makes tiles as large as possible: fewer students = bigger tiles.
    function layoutGrid(g, n) {
        if (!n) return;
        var W = g.clientWidth - 16, H = g.clientHeight - 16, gap = 8, bar = 30, best = 1, bw = 0;
        for (var c = 1; c <= n; c++) {
            var rows = Math.ceil(n / c), tw = (W - (c - 1) * gap) / c, th = (H - (rows - 1) * gap) / rows - bar;
            var w = Math.min(tw, th * 4 / 3); if (w > bw) { bw = w; best = c; }
        }
        g.style.gridTemplateColumns = 'repeat(' + best + ',' + Math.max(80, Math.floor(bw)) + 'px)';
        g.style.justifyContent = 'center'; g.style.alignContent = 'center';
    }
    window.addEventListener('resize', function () { var g = $('cmWatchGrid'); if (g && g.dataset.mode === 'live') layoutGrid(g, g.querySelectorAll('.cmw-tile').length); });
    function tileBadge(t, text, live) { var b = t.el.querySelector('.cmw-badge'); b.textContent = text; b.className = 'cmw-badge' + (live ? ' live' : ''); }
    function renderLive(d, g) {
        if (g.dataset.mode !== 'live') { g.innerHTML = ''; g.dataset.mode = 'live'; g.classList.add('live'); }
        if (!d.students.length) { gStopAll(); g.dataset.mode = 'live'; g.classList.add('live'); g.innerHTML = '<div class="cmw-msg">No students online in this assessment.</div>'; g.style.gridTemplateColumns = ''; g.style.alignContent = 'start'; }
        else {
            var empty = g.querySelector('.cmw-msg'); if (empty) g.innerHTML = '';
            var keep = {};
            d.students.forEach(function (s) { keep[s.adm] = 1; });
            Object.keys(G.tiles).forEach(function (adm) { if (!keep[adm]) gDropTile(adm); });
            d.students.forEach(function (s) {
                if (s.img) T.cache[s.adm] = { img: s.img, at: s.at };
                var t = G.tiles[s.adm];
                if (!t) {
                    var el = document.createElement('div'); el.className = 'cmw-tile lv' + (s.ready ? '' : ' off'); el.setAttribute('data-adm', s.adm);
                    el.innerHTML = '<div class="cmw-pic"><img alt="" style="display:none"><video muted autoplay playsinline></video><span class="cmw-badge"></span><div class="cmw-meter"><i></i></div><button type="button" class="cmw-big" title="Enlarge" aria-label="Enlarge">⤢</button></div><div class="cmw-name"><span></span><b class="cmw-snd"></b></div>';
                    t = G.tiles[s.adm] = { adm: s.adm, name: s.name, el: el, vid: el.querySelector('video'), img: el.querySelector('img'), bar: el.querySelector('.cmw-meter i'), snd: el.querySelector('.cmw-snd'), viewer: '', pc: null, starting: false, attempts: 0, queue: [], meter: null };
                    el.addEventListener('click', function (e) { if (e.target.classList.contains('cmw-big')) return gEnlarge(t.adm); gListen(t.adm); });
                    g.appendChild(el);
                }
                t.name = s.name; t.ready = s.ready;
                t.el.classList.toggle('off', !s.ready);
                t.el.querySelector('.cmw-name span').textContent = s.name;
                var c = T.cache[s.adm];
                if (c && !t.live) { t.img.src = c.img; t.img.style.display = 'block'; }
                if (!t.live && !t.starting) tileBadge(t, s.ready ? (t.failed ? 'Live unavailable' : 'Connecting…') : 'Not ready', false);
                if (s.ready && !t.viewer && !t.starting && !t.failed && !G.paused) gStart(t.adm);
            });
            layoutGrid(g, d.students.length);
        }
        if (!G.since) G.since = Date.now();
        if (!G.timer) G.timer = setInterval(gTick, 30000);
        if (!G.meterTimer) G.meterTimer = setInterval(gMeters, 150);
        try { if (G.ctx && G.ctx.state === 'suspended') G.ctx.resume(); } catch (e) { }
    }
    // Stagger starts so many connections do not all begin in the same instant.
    function gStart(adm) {
        var t = G.tiles[adm]; if (!t || t.starting || t.viewer) return;
        t.starting = true; G.queueStart = (G.queueStart || Promise.resolve()).then(function () { return sleep(250); }).then(function () { return gConnect(t); });
    }
    async function gConnect(t) {
        if (G.tiles[t.adm] !== t || !T.open || !G.on) { t.starting = false; return; }
        tileBadge(t, 'Connecting…', false);
        try {
            var st = await tpost('/api/teacher/watch/start', { code: T.code, admissionNumber: t.adm, grid: true });
            if (!st.viewer) throw new Error(st.error || 'Could not start.');
            if (G.tiles[t.adm] !== t) { tpost('/api/teacher/watch/stop', { viewer: st.viewer }).catch(function () { }); return; }
            t.viewer = st.viewer; G.byViewer[st.viewer] = t; t.queue = []; t.pendingIce = []; t.remoteSet = false;
            gPoll();
            if (!G.ice) { var ice = await tget('/api/teacher/watch/ice'); G.ice = ice.iceServers || []; }
            var pc = new RTCPeerConnection({ iceServers: G.ice }); t.pc = pc;
            pc.ontrack = function (e) {
                t.stream = e.streams[0]; if (t.vid.srcObject !== t.stream) { t.vid.srcObject = t.stream; t.vid.muted = (G.listen !== t.adm); t.vid.play().catch(function () { }); }
                t.live = true; t.attempts = 0; t.el.classList.add('isLive'); t.img.style.display = 'none'; tileBadge(t, '● Live', true); gMeterAttach(t);
            };
            pc.onicecandidate = function (e) { if (e.candidate && t.viewer) tpost('/api/teacher/watch/send', { viewer: t.viewer, type: 'ice', data: e.candidate }); };
            pc.onconnectionstatechange = function () { if (pc.connectionState === 'failed' && t.pc === pc) gRetry(t); };
            var q = t.queue; t.queue = []; for (var i = 0; i < q.length; i++) await gEvent(q[i]);
        } catch (e) { gRetry(t); }
        finally { t.starting = false; }
    }
    function gRetry(t) {
        if (G.tiles[t.adm] !== t) return;
        gCloseTile(t); t.attempts++;
        if (t.attempts > 3) { t.failed = true; tileBadge(t, 'Live unavailable', false); return; }
        tileBadge(t, 'Reconnecting…', false);
        setTimeout(function () { if (G.tiles[t.adm] === t && T.open && G.on && !G.paused) gStart(t.adm); }, 4000 * t.attempts);
    }
    function gCloseTile(t) {
        if (t.viewer) { tpost('/api/teacher/watch/stop', { viewer: t.viewer }).catch(function () { }); delete G.byViewer[t.viewer]; t.viewer = ''; }
        if (t.pc) { try { t.pc.close(); } catch (e) { } t.pc = null; }
        t.live = false; t.stream = null; t.starting = false; t.vid.srcObject = null; t.el.classList.remove('isLive', 'listen', 'loud');
        if (t.meter) { try { t.meter.src.disconnect(); } catch (e) { } t.meter = null; }
        t.bar.style.width = '0';
    }
    function gDropTile(adm) { var t = G.tiles[adm]; if (!t) return; gCloseTile(t); if (t.el.parentNode) t.el.parentNode.removeChild(t.el); delete G.tiles[adm]; if (G.listen === adm) G.listen = ''; }
    function gStopAll() {
        var any = Object.keys(G.tiles).length || Object.keys(G.byViewer).length;
        Object.keys(G.tiles).forEach(function (adm) { var t = G.tiles[adm]; if (t.pc) { try { t.pc.close(); } catch (e) { } } if (t.el && t.el.parentNode) t.el.parentNode.removeChild(t.el); });
        if (G.big) gShrink();
        G.tiles = {}; G.byViewer = {}; G.polling = false; G.listen = ''; G.queueStart = null;
        clearInterval(G.timer); G.timer = null; clearInterval(G.meterTimer); G.meterTimer = null; G.since = 0;
        if (any && tok()) tpost('/api/teacher/watch/stopall', {}).catch(function () { });
    }
    // One shared waiting request carries the signalling messages for every tile.
    async function gPoll() {
        if (G.polling) return; G.polling = true;
        while (G.polling && T.open && G.on) {
            try {
                var r = await tget('/api/teacher/watch/pollall');
                if (!G.polling) break;
                for (var i = 0; r.events && i < r.events.length; i++) await gEvent(r.events[i]);
            } catch (e) { await sleep(3000); }
        }
        G.polling = false;
    }
    async function gEvent(ev) {
        var t = G.byViewer[ev.viewer]; if (!t) return;
        if (!t.pc) { t.queue.push(ev); return; }
        var pc = t.pc;
        try {
            if (ev.type === 'offer') {
                await pc.setRemoteDescription(ev.data); t.remoteSet = true;
                (t.pendingIce || []).forEach(function (c) { pc.addIceCandidate(c).catch(function () { }); }); t.pendingIce = [];
                var ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
                tpost('/api/teacher/watch/send', { viewer: t.viewer, type: 'answer', data: { type: ans.type, sdp: ans.sdp } });
            } else if (ev.type === 'ice') { if (t.remoteSet) pc.addIceCandidate(ev.data).catch(function () { }); else t.pendingIce.push(ev.data); }
            else if (ev.type === 'ended') { delete G.byViewer[t.viewer]; t.viewer = ''; if (t.pc) { try { t.pc.close(); } catch (e) { } t.pc = null; } t.live = false; t.el.classList.remove('isLive'); if (!G.paused) setTimeout(function () { if (G.tiles[t.adm] === t && T.open && G.on) gStart(t.adm); }, 1500); }
        } catch (e) { }
    }
    function gMeterAttach(t) {
        if (t.meter || !t.stream || !t.stream.getAudioTracks().length) return;
        try {
            var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
            if (!G.ctx) G.ctx = new AC();
            var src = G.ctx.createMediaStreamSource(t.stream), an = G.ctx.createAnalyser(); an.fftSize = 256; src.connect(an);
            t.meter = { an: an, src: src, buf: new Uint8Array(an.fftSize) };
        } catch (e) { }
    }
    function gMeters() {
        Object.keys(G.tiles).forEach(function (adm) {
            var t = G.tiles[adm]; if (!t.meter) return;
            t.meter.an.getByteTimeDomainData(t.meter.buf);
            var sum = 0, b = t.meter.buf; for (var i = 0; i < b.length; i++) { var x = (b[i] - 128) / 128; sum += x * x; }
            var lvl = Math.min(1, Math.sqrt(sum / b.length) * 5);
            t.bar.style.width = Math.round(lvl * 100) + '%'; t.el.classList.toggle('loud', lvl > 0.45);
        });
    }
    function gListen(adm) {
        try { if (G.ctx && G.ctx.state === 'suspended') G.ctx.resume(); } catch (e) { }
        var was = G.listen; G.listen = (was === adm) ? '' : adm;
        Object.keys(G.tiles).forEach(function (a) { var t = G.tiles[a], on = (a === G.listen); t.vid.muted = !on; t.el.classList.toggle('listen', on); t.snd.textContent = on ? '🔊' : ''; if (on) t.vid.play().catch(function () { }); });
    }
    function gEnlarge(adm) {
        var t = G.tiles[adm]; if (!t || !t.stream) return;
        G.big = adm; $('cmWatchLive').classList.add('on'); $('cmWatchWho').textContent = t.name;
        var v = $('cmWatchVideo'); v.srcObject = t.stream; v.muted = false; v.play().catch(function () { }); state('Live');
        tpost('/api/teacher/watch/send', { viewer: t.viewer, type: 'quality', data: { hq: true } });
    }
    function gShrink() {
        var t = G.tiles[G.big]; G.big = null;
        if (t && t.viewer) tpost('/api/teacher/watch/send', { viewer: t.viewer, type: 'quality', data: { hq: false } });
        var v = $('cmWatchVideo'); if (v) v.srcObject = null;
    }
    // Pause after 20 minutes to save data; the teacher taps Resume to continue.
    function gTick() {
        if (!T.open || G.paused || !G.since || Date.now() - G.since < 20 * 60 * 1000) return;
        gStopAll(); G.paused = true;
        var g = $('cmWatchGrid'); g.dataset.mode = 'live'; g.classList.add('live'); g.style.gridTemplateColumns = ''; g.style.alignContent = 'start';
        g.innerHTML = '<div class="cmw-msg">Live video paused after 20 minutes to save data.<br><br><button class="cmw-btn" id="cmwResume">Resume live grid</button></div>';
        $('cmwResume').addEventListener('click', function () { G.paused = false; g.innerHTML = ''; T.since = 0; loadGrid(); });
    }

    function state(t) { var s = $('cmWatchState'); if (s) s.textContent = t; }
    async function startLive(adm, name) {
        stopLive(); T.live = true;
        $('cmWatchLive').classList.add('on'); $('cmWatchWho').textContent = name; state('Connecting… (the student is told you are watching)');
        $('cmWatchVideo').muted = false; $('cmWatchMute').textContent = '🔊 Sound on';
        try {
            var st = await tpost('/api/teacher/watch/start', { code: T.code, admissionNumber: adm });
            if (!st.viewer) throw new Error(st.error || 'Could not start.');
            T.viewer = st.viewer; T.pendingIce = []; T.remoteSet = false;
            var ice = await tget('/api/teacher/watch/ice');
            var pc = new RTCPeerConnection({ iceServers: ice.iceServers || [] }); T.pc = pc;
            pc.ontrack = function (e) { var v = $('cmWatchVideo'); if (v.srcObject !== e.streams[0]) { v.srcObject = e.streams[0]; v.play().catch(function () { }); } state('Live'); };
            pc.onicecandidate = function (e) { if (e.candidate) tpost('/api/teacher/watch/send', { viewer: T.viewer, type: 'ice', data: e.candidate }); };
            pc.onconnectionstatechange = function () { if (pc.connectionState === 'connected') state('Live'); else if (pc.connectionState === 'failed') state('Connection failed. The student may be on a blocked network. Tap Stop and try again.'); else if (pc.connectionState === 'disconnected') state('Connection lost…'); };
            T.stopAt = Date.now() + 10 * 60 * 1000;
            pollLive(T.viewer);
        } catch (e) { state(e.message || 'Could not start.'); }
    }
    async function pollLive(viewer) {
        while (T.viewer === viewer) {
            try {
                var r = await tget('/api/teacher/watch/poll?viewer=' + viewer);
                if (T.viewer !== viewer) return;
                if (r.ended) { state('Live view ended.'); return stopLive(true); }
                for (var i = 0; r.events && i < r.events.length; i++) {
                    var ev = r.events[i], pc = T.pc; if (!pc) return;
                    if (ev.type === 'offer') {
                        await pc.setRemoteDescription(ev.data); T.remoteSet = true;
                        (T.pendingIce || []).forEach(function (c) { pc.addIceCandidate(c).catch(function () { }); }); T.pendingIce = [];
                        var ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
                        tpost('/api/teacher/watch/send', { viewer: viewer, type: 'answer', data: { type: ans.type, sdp: ans.sdp } });
                    } else if (ev.type === 'ice') { if (T.remoteSet) pc.addIceCandidate(ev.data).catch(function () { }); else T.pendingIce.push(ev.data); }
                    else if (ev.type === 'ended') { state('Live view ended after 10 minutes. Tap the student again to continue.'); return stopLive(true); }
                }
                if (Date.now() > T.stopAt) { state('Stopped after 10 minutes to save data. Tap the student again to continue.'); return stopLive(true); }
            } catch (e) { await sleep(3000); }
        }
    }
    function stopLive(keepMsg) {
        if (G.big) gShrink();
        var v = T.viewer; T.viewer = null;
        if (v) tpost('/api/teacher/watch/stop', { viewer: v }).catch(function () { });
        if (T.pc) { try { T.pc.close(); } catch (e) { } T.pc = null; }
        var vid = $('cmWatchVideo'); if (vid) vid.srcObject = null;
        var lv = $('cmWatchLive'); if (lv && keepMsg !== true) lv.classList.remove('on');
        T.live = false;
    }
    // Back out of the live screen when the message is shown and teacher taps Stop
    document.addEventListener('click', function (e) { if (e.target && e.target.id === 'cmWatchStop') { var lv = $('cmWatchLive'); if (lv) lv.classList.remove('on'); } });
})();
