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
    var API = (typeof BACKEND_URL !== 'undefined' && BACKEND_URL) ? BACKEND_URL : 'https://clevermentcbt-backend.onrender.com';
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
    async function openLive(viewer) {
        closeLive();
        try {
            if (!W.ice) { var r = await post('/api/quiz/watch/ice', body()); W.ice = (r.iceServers && r.iceServers.length) ? r.iceServers : [{ urls: 'stun:stun.l.google.com:19302' }]; }
            var pc = new RTCPeerConnection({ iceServers: W.ice });
            W.pc = pc; W.viewer = viewer; W.pendingIce = []; W.remoteSet = false;
            proctorMediaStream.getTracks().forEach(function (t) { pc.addTrack(t, proctorMediaStream); });
            pc.getSenders().forEach(function (s) {
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
        if (ev.type === 'viewer') return openLive(ev.viewer);
        if (!W.pc || ev.viewer !== W.viewer) return;
        if (ev.type === 'stop') return closeLive();
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
        '#cmWatchLive video{flex:1;min-height:0;width:100%;background:#000;object-fit:contain}';
    function buildTeacher() {
        if ($('cmWatchOv')) return;
        var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
        var ov = document.createElement('div'); ov.id = 'cmWatchOv';
        ov.innerHTML = '<div class="cmw-top"><b style="font-size:15px">👁 Live watching</b><select id="cmWatchSel"></select><button class="cmw-btn ghost" id="cmWatchClose">Close</button></div>' +
            '<div class="cmw-grid" id="cmWatchGrid"></div><div class="cmw-foot" id="cmWatchFoot"></div>' +
            '<div id="cmWatchLive"><div class="cmw-top"><b id="cmWatchWho" style="flex:1"></b><button class="cmw-btn ghost" id="cmWatchMute">🔊 Sound on</button><button class="cmw-btn red" id="cmWatchStop">Stop</button></div>' +
            '<video id="cmWatchVideo" autoplay playsinline></video><div class="cmw-foot" id="cmWatchState">Connecting…</div></div>';
        document.body.appendChild(ov);
        $('cmWatchClose').addEventListener('click', closeOverlay);
        $('cmWatchSel').addEventListener('change', function () { T.code = this.value; T.page = 0; T.cache = {}; T.since = 0; loadGrid(); });
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
    function closeOverlay() { stopLive(); T.open = false; clearTimeout(T.timer); $('cmWatchOv').classList.remove('on'); }
    function scheduleGrid(ms) { clearTimeout(T.timer); if (T.open) T.timer = setTimeout(function () { if (T.live) return scheduleGrid(8000); if (T.code) loadGrid(); else openOverlay(); }, ms || 8000); }
    function loadGrid() {
        if (!T.open || !T.code) return;
        tget('/api/teacher/watch/grid?code=' + encodeURIComponent(T.code) + '&page=' + T.page + '&since=' + T.since).then(function (d) {
            T.since = d.serverTime - 1000; T.page = d.page;
            var g = $('cmWatchGrid');
            if (!d.students.length) { g.innerHTML = '<div class="cmw-msg">No students online in this assessment.</div>'; }
            else g.innerHTML = d.students.map(function (s) {
                if (s.img) T.cache[s.adm] = { img: s.img, at: s.at };
                var c = T.cache[s.adm], age = c ? Math.max(1, Math.round((Date.now() - (c.at + (Date.now() - d.serverTime))) / 1000)) : 0;
                var pic = c ? '<img src="' + c.img + '" alt="">' : (d.camera ? (s.ready ? 'Waiting for picture…' : 'Not ready (no consent yet)') : '🎙 Sound only');
                return '<button class="cmw-tile' + (s.ready ? '' : ' off') + '" data-adm="' + esc(s.adm) + '" data-name="' + esc(s.name) + '"><div class="cmw-pic">' + pic + '</div><div class="cmw-name">' + esc(s.name) + '<small>' + (s.ready ? 'Tap to watch & listen' : 'Not available yet') + '</small></div></button>';
            }).join('');
            g.querySelectorAll('.cmw-tile').forEach(function (b) { if (!b.classList.contains('off')) b.addEventListener('click', function () { startLive(b.getAttribute('data-adm'), b.getAttribute('data-name')); }); });
            var f = $('cmWatchFoot');
            f.innerHTML = d.pages > 1 ? '<button class="cmw-btn ghost" id="cmwPrev"' + (d.page <= 0 ? ' disabled' : '') + '>‹ Prev</button><span>Page ' + (d.page + 1) + ' of ' + d.pages + ' (' + d.total + ' students)</span><button class="cmw-btn ghost" id="cmwNext"' + (d.page >= d.pages - 1 ? ' disabled' : '') + '>Next ›</button>' : '<span>' + d.total + ' student' + (d.total === 1 ? '' : 's') + ' online · pictures refresh every ~10 seconds</span>';
            if ($('cmwPrev')) { $('cmwPrev').addEventListener('click', function () { T.page--; T.since = 0; loadGrid(); }); $('cmwNext').addEventListener('click', function () { T.page++; T.since = 0; loadGrid(); }); }
            scheduleGrid(8000);
        }).catch(function (e) { $('cmWatchGrid').innerHTML = '<div class="cmw-msg">' + esc(e.message) + '</div>'; scheduleGrid(12000); });
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
