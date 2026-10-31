/* ============================================================
   CLEVERMENT NOTIFICATIONS (front end)
   - A bell with the person's alerts (students, teachers and admin)
   - Real-time alerts while the app is open (live stream)
   - Phone alerts (Web Push) that arrive even when the app is closed
   Works on its own: it reads the login already saved by CleverMent.
   ============================================================ */
(function () {
    'use strict';
    if (window.__cmNotifyLoaded) return;
    window.__cmNotifyLoaded = true;

    var API = (typeof BACKEND_URL !== 'undefined' && BACKEND_URL) ? BACKEND_URL : 'https://clevermentcbt-backend.onrender.com';
    var LS = {
        get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
        del: function (k) { try { localStorage.removeItem(k); } catch (e) { } }
    };

    // ---------- who is using the app right now ----------
    function decodeJwt(t) {
        try {
            var p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            while (p.length % 4) p += '=';
            return JSON.parse(decodeURIComponent(escape(atob(p))));
        } catch (e) { return null; }
    }
    function shown(id) {
        var el = document.getElementById(id);
        if (!el) return false;
        var cs = window.getComputedStyle(el);
        return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0;
    }
    // Returns { role, token } or 'exam' while a student is taking an assessment, or null.
    function currentIdentity() {
        if (shown('studentAssessmentView')) return 'exam';
        var t = null, d = null;
        if (shown('adminDashboard')) { t = LS.get('cleverment_admin_token'); }
        else if (shown('teacherDashboard')) { t = LS.get('cleverment_teacher_token'); }
        else if (shown('studentAreaPage')) { t = LS.get('cleverment_student_token'); }
        else return null;
        if (!t) return null;
        d = decodeJwt(t);
        if (!d || !d.role) return null;
        if (d.exp && d.exp * 1000 < Date.now()) return null;
        return { role: d.role, token: t };
    }

    // ---------- state ----------
    var S = { id: null, items: [], unread: 0, open: false, view: 'list', abort: null, backoff: 3000, timer: null, pollTimer: null, cfg: null, setupNeeded: false };

    function api(path, opts) {
        opts = opts || {};
        var h = { 'Authorization': 'Bearer ' + (S.id && S.id.token) };
        if (opts.body) h['Content-Type'] = 'application/json';
        return fetch(API + path, { method: opts.method || 'GET', headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || 'Request failed'); e.status = r.status; throw e; } return j; }); });
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function ago(iso) {
        var s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
        if (s < 60) return 'just now';
        var m = Math.round(s / 60); if (m < 60) return m + ' min ago';
        var h = Math.round(m / 60); if (h < 24) return h + ' hr ago';
        var d = Math.round(h / 24); return d + ' day' + (d === 1 ? '' : 's') + ' ago';
    }

    // ---------- look ----------
    var css = '' +
        '.cmn{--cmn-bg:#fff;--cmn-text:#1f2328;--cmn-muted:#667085;--cmn-border:#e4e7ec;--cmn-soft:#f4f6fa;--cmn-accent:#2563eb;--cmn-accent-soft:#e8f0ff;font-family:Inter,system-ui,Arial,sans-serif}' +
        'html[data-cm-dark] .cmn{--cmn-bg:#1c2026;--cmn-text:#e8ebf0;--cmn-muted:#9aa4b2;--cmn-border:#323946;--cmn-soft:#252b34;--cmn-accent:#6ea0ff;--cmn-accent-soft:#1f2c47}' +
        '#cmnBell{position:fixed;right:20px;bottom:136px;width:48px;height:48px;border-radius:50%;border:0;background:#1e3a8a;color:#fff;box-shadow:0 5px 18px rgba(0,0,0,.28);display:none;align-items:center;justify-content:center;cursor:pointer;z-index:6900;padding:0}' +
        '#cmnBell.on{display:flex}' +
        '#cmnBell svg{width:22px;height:22px}' +
        '#cmnBadge{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;display:none;align-items:center;justify-content:center;box-sizing:border-box;border:2px solid #fff}' +
        '#cmnBadge.on{display:flex}' +
        '#cmnPanel{position:fixed;right:12px;bottom:196px;width:min(390px,calc(100vw - 24px));max-height:min(72vh,540px);background:var(--cmn-bg);color:var(--cmn-text);border:1px solid var(--cmn-border);border-radius:16px;box-shadow:0 16px 50px rgba(0,0,0,.28);z-index:7100;display:none;flex-direction:column;overflow:hidden}' +
        '#cmnPanel.on{display:flex}' +
        '@media(max-width:600px){#cmnPanel{left:8px;right:8px;bottom:8px;width:auto;max-height:82vh}}' +
        '.cmn-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-bottom:1px solid var(--cmn-border)}' +
        '.cmn-head b{font-size:15px}' +
        '.cmn-head .cmn-acts{display:flex;align-items:center;gap:4px}' +
        '.cmn-ibtn{background:transparent;border:0;color:var(--cmn-muted);cursor:pointer;padding:6px 8px;border-radius:8px;font:inherit;font-size:12.5px;display:inline-flex;align-items:center;gap:4px}' +
        '.cmn-ibtn:hover{background:var(--cmn-soft);color:var(--cmn-text)}' +
        '.cmn-ibtn svg{width:18px;height:18px}' +
        '.cmn-phone{padding:10px 14px;background:var(--cmn-soft);border-bottom:1px solid var(--cmn-border);font-size:13px;line-height:1.45;color:var(--cmn-text)}' +
        '.cmn-phone:empty{display:none}' +
        '.cmn-phone .cmn-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}' +
        '.cmn-btn{background:var(--cmn-accent);color:#fff;border:0;border-radius:9px;padding:8px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}' +
        '.cmn-btn.ghost{background:transparent;color:var(--cmn-text);border:1px solid var(--cmn-border)}' +
        '.cmn-body{overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1;min-height:80px}' +
        '.cmn-item{display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid var(--cmn-border);cursor:pointer;text-align:left;width:100%;background:transparent;border-left:0;border-right:0;border-top:0;color:inherit;font:inherit}' +
        '.cmn-item:hover{background:var(--cmn-soft)}' +
        '.cmn-item.unread{background:var(--cmn-accent-soft)}' +
        '.cmn-dot{width:9px;height:9px;border-radius:50%;background:transparent;margin-top:6px;flex:0 0 auto}' +
        '.cmn-item.unread .cmn-dot{background:var(--cmn-accent)}' +
        '.cmn-t{font-weight:600;font-size:14px;line-height:1.3}' +
        '.cmn-b{font-size:13px;color:var(--cmn-muted);white-space:pre-line;margin-top:3px;line-height:1.4;word-break:break-word}' +
        '.cmn-w{font-size:11.5px;color:var(--cmn-muted);margin-top:4px}' +
        '.cmn-empty{padding:34px 18px;text-align:center;color:var(--cmn-muted);font-size:14px}' +
        '.cmn-set{padding:6px 14px 14px}' +
        '.cmn-set h4{margin:12px 0 4px;font-size:13px}' +
        '.cmn-sw{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--cmn-border);font-size:13.5px}' +
        '.cmn-sw small{display:block;color:var(--cmn-muted);font-size:12px;margin-top:2px}' +
        '.cmn-sw input{width:40px;height:22px;accent-color:var(--cmn-accent);flex:0 0 auto}' +
        '#cmnToasts{position:fixed;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:7200;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;padding:0 10px}' +
        '.cmn-toast{pointer-events:auto;max-width:420px;width:100%;background:var(--cmn-bg);color:var(--cmn-text);border:1px solid var(--cmn-border);border-left:4px solid var(--cmn-accent);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:11px 14px;cursor:pointer;animation:cmnIn .25s ease}' +
        '.cmn-toast .cmn-t{font-size:14px}' +
        '.cmn-toast .cmn-b{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}' +
        '@keyframes cmnIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}';

    var root, bell, badge, panel, toasts, built = false;
    function build() {
        if (built) return; built = true;
        var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
        root = document.createElement('div'); root.className = 'cmn';
        root.innerHTML =
            '<button id="cmnBell" type="button" aria-label="Notifications" title="Notifications">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>' +
            '<span id="cmnBadge"></span></button>' +
            '<div id="cmnPanel" role="dialog" aria-label="Notifications">' +
            '<div class="cmn-head"><b id="cmnTitle">Notifications</b><div class="cmn-acts">' +
            '<button type="button" class="cmn-ibtn" id="cmnReadAll">Mark all read</button>' +
            '<button type="button" class="cmn-ibtn" id="cmnGear" aria-label="Alert settings" title="Alert settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>' +
            '<button type="button" class="cmn-ibtn" id="cmnClose" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
            '</div></div><div class="cmn-phone" id="cmnPhone"></div><div class="cmn-body" id="cmnBody"></div></div>' +
            '<div id="cmnToasts"></div>';
        document.body.appendChild(root);
        bell = document.getElementById('cmnBell'); badge = document.getElementById('cmnBadge');
        panel = document.getElementById('cmnPanel'); toasts = document.getElementById('cmnToasts');
        bell.addEventListener('click', function () { togglePanel(); });
        document.getElementById('cmnClose').addEventListener('click', function () { togglePanel(false); });
        document.getElementById('cmnReadAll').addEventListener('click', markAllRead);
        document.getElementById('cmnGear').addEventListener('click', function () { S.view = (S.view === 'settings') ? 'list' : 'settings'; render(); });
        document.addEventListener('click', function (e) {
            if (S.open && !panel.contains(e.target) && !bell.contains(e.target) && !toasts.contains(e.target)) togglePanel(false);
        });
    }

    function togglePanel(force) {
        S.open = (typeof force === 'boolean') ? force : !S.open;
        panel.classList.toggle('on', S.open);
        if (S.open) { S.view = 'list'; render(); loadList(); renderPhone(); }
    }

    function setBadge() {
        if (!badge) return;
        badge.textContent = S.unread > 99 ? '99+' : String(S.unread);
        badge.classList.toggle('on', S.unread > 0);
        try { if (navigator.setAppBadge) { if (S.unread > 0) navigator.setAppBadge(S.unread); else navigator.clearAppBadge(); } } catch (e) { }
    }

    // ---------- list + settings view ----------
    function render() {
        var body = document.getElementById('cmnBody'); if (!body) return;
        var gear = document.getElementById('cmnGear'), readAll = document.getElementById('cmnReadAll'), title = document.getElementById('cmnTitle');
        if (S.view === 'settings') {
            title.textContent = 'Alert settings'; readAll.style.display = 'none';
            body.innerHTML = '<div class="cmn-empty">Loading\u2026</div>';
            api('/api/notify/prefs').then(function (d) {
                var h = '<div class="cmn-set"><h4>Choose which alerts you want</h4>';
                (d.kinds || []).forEach(function (k) {
                    h += '<label class="cmn-sw"><span>' + esc(k.label) + (k.desc ? '<small>' + esc(k.desc) + '</small>' : '') + '</span><input type="checkbox" data-k="' + esc(k.id) + '"' + (k.on ? ' checked' : '') + '></label>';
                });
                h += '<label class="cmn-sw"><span>Play a sound when an alert arrives<small>Only while CleverMent is open</small></span><input type="checkbox" id="cmnSound"' + (LS.get('cm_notify_sound') === '0' ? '' : ' checked') + '></label>';
                h += '<div class="cmn-row" style="margin-top:12px"><button type="button" class="cmn-btn ghost" id="cmnBack">Back to alerts</button> <button type="button" class="cmn-btn" id="cmnTest">Send me a test alert</button></div></div>';
                body.innerHTML = h;
                body.querySelectorAll('input[data-k]').forEach(function (inp) {
                    inp.addEventListener('change', function () { var p = {}; p[inp.getAttribute('data-k')] = inp.checked; api('/api/notify/prefs', { method: 'PUT', body: { prefs: p } }).catch(function () { inp.checked = !inp.checked; }); });
                });
                document.getElementById('cmnSound').addEventListener('change', function (e) { LS.set('cm_notify_sound', e.target.checked ? '1' : '0'); });
                document.getElementById('cmnBack').addEventListener('click', function () { S.view = 'list'; render(); });
                document.getElementById('cmnTest').addEventListener('click', function (e) { e.target.disabled = true; api('/api/notify/test', { method: 'POST', body: {} }).catch(function (er) { alert(er.message); }).then(function () { setTimeout(function () { e.target.disabled = false; }, 1500); }); });
            }).catch(function () { body.innerHTML = '<div class="cmn-empty">Could not load settings. Check your connection.</div>'; });
            return;
        }
        title.textContent = 'Notifications'; readAll.style.display = '';
        if (S.setupNeeded) { body.innerHTML = '<div class="cmn-empty">Alerts are not set up on the server yet.<br>(The administrator needs to run <b>supabase_notifications.sql</b>.)</div>'; return; }
        if (!S.items.length) { body.innerHTML = '<div class="cmn-empty">No alerts yet.<br>New alerts will appear here.</div>'; return; }
        body.innerHTML = S.items.map(function (n, i) {
            return '<button type="button" class="cmn-item' + (n.read_at ? '' : ' unread') + '" data-i="' + i + '"><span class="cmn-dot"></span><span><div class="cmn-t">' + esc(n.title) + '</div>' + (n.body ? '<div class="cmn-b">' + esc(n.body) + '</div>' : '') + '<div class="cmn-w">' + esc(ago(n.created_at)) + '</div></span></button>';
        }).join('');
        body.querySelectorAll('.cmn-item').forEach(function (el) {
            el.addEventListener('click', function () { openItem(S.items[parseInt(el.getAttribute('data-i'), 10)]); });
        });
    }

    function loadList() {
        if (!S.id) return;
        api('/api/notify/list?limit=40').then(function (d) {
            S.setupNeeded = !!d.setupNeeded;
            S.items = d.items || []; S.unread = d.unread || 0; setBadge();
            if (S.open && S.view === 'list') render();
        }).catch(function (e) { if (e.status === 401) stopAll(); });
    }

    function markRead(ids) {
        api('/api/notify/read', { method: 'POST', body: ids ? { ids: ids } : {} }).catch(function () { });
    }
    function markAllRead() {
        S.items.forEach(function (n) { n.read_at = n.read_at || new Date().toISOString(); });
        S.unread = 0; setBadge(); render(); markRead(null);
    }
    function openItem(n) {
        if (!n) return;
        if (!n.read_at) { n.read_at = new Date().toISOString(); S.unread = Math.max(0, S.unread - 1); setBadge(); if (n.id) markRead([n.id]); }
        togglePanel(false);
        go(n.data && n.data.go);
    }

    // ---------- jump to the right page ----------
    function go(where) {
        if (!where || !S.id) return;
        try {
            if (S.id.role === 'student') {
                if (typeof studentAreaShow === 'function' && shown('studentAreaPage')) studentAreaShow(where);
            } else if (S.id.role === 'teacher' || (S.id.role === 'admin' && shown('teacherDashboard'))) {
                if (document.getElementById(where) && typeof showTeacherSection === 'function') showTeacherSection(where, document.querySelector('#teacherDashboard .dash-nav-item[data-target="' + where + '"]'));
            } else if (S.id.role === 'admin') {
                if (document.getElementById(where) && typeof showAdminSection === 'function') showAdminSection(where, document.querySelector('#adminDashboard .dash-nav-item[data-target="' + where + '"]'));
            }
        } catch (e) { }
    }

    // ---------- in-app pop-up + sound ----------
    var audioCtx = null;
    function unlockAudio() {
        try {
            if (!audioCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) { }
    }
    ['click', 'touchstart', 'keydown'].forEach(function (ev) { document.addEventListener(ev, unlockAudio, { passive: true }); });
    function chime() {
        if (LS.get('cm_notify_sound') === '0' || !audioCtx || audioCtx.state !== 'running') return;
        try {
            var t = audioCtx.currentTime;
            [[880, 0], [1175, 0.14]].forEach(function (p) {
                var o = audioCtx.createOscillator(), g = audioCtx.createGain();
                o.type = 'sine'; o.frequency.value = p[0];
                g.gain.setValueAtTime(0.0001, t + p[1]); g.gain.exponentialRampToValueAtTime(0.25, t + p[1] + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + p[1] + 0.32);
                o.connect(g); g.connect(audioCtx.destination); o.start(t + p[1]); o.stop(t + p[1] + 0.34);
            });
        } catch (e) { }
    }
    function toast(n) {
        if (!toasts) return;
        var el = document.createElement('div'); el.className = 'cmn-toast';
        el.innerHTML = '<div class="cmn-t">' + esc(n.title) + '</div>' + (n.body ? '<div class="cmn-b">' + esc(n.body) + '</div>' : '');
        el.addEventListener('click', function () { el.remove(); openItem(n); });
        toasts.appendChild(el);
        setTimeout(function () { if (el.parentNode) el.remove(); }, 7000);
        while (toasts.children.length > 3) toasts.removeChild(toasts.firstChild);
    }
    function onIncoming(n) {
        if (!n) return;
        if (n.id && S.items.some(function (x) { return x.id === n.id; })) return;
        S.items.unshift(n); if (S.items.length > 60) S.items.pop();
        S.unread++; setBadge();
        if (S.open && S.view === 'list') render();
        if (document.visibilityState === 'visible') {
            toast(n); chime();
            try { if (navigator.vibrate) navigator.vibrate(80); } catch (e) { }
        }
    }

    // ---------- live stream (real-time while the app is open) ----------
    function connect() {
        if (!S.id || S.abort) return;
        var ctrl = new AbortController(); S.abort = ctrl;
        var myId = S.id;
        fetch(API + '/api/notify/stream', { headers: { 'Authorization': 'Bearer ' + myId.token, 'Accept': 'text/event-stream' }, cache: 'no-store', signal: ctrl.signal })
            .then(function (r) {
                if (r.status === 401) { stopAll(); return; }
                if (!r.ok || !r.body) throw new Error('stream');
                S.backoff = 3000; loadList();
                var reader = r.body.getReader(), dec = new TextDecoder(), buf = '';
                function pump() {
                    return reader.read().then(function (x) {
                        if (x.done) throw new Error('closed');
                        buf += dec.decode(x.value, { stream: true });
                        var parts = buf.split('\n\n'); buf = parts.pop();
                        parts.forEach(function (block) {
                            var ev = '', data = '';
                            block.split('\n').forEach(function (ln) { if (ln.indexOf('event:') === 0) ev = ln.slice(6).trim(); else if (ln.indexOf('data:') === 0) data += ln.slice(5).trim(); });
                            if (ev === 'n' && data) { try { onIncoming(JSON.parse(data)); } catch (e) { } }
                        });
                        return pump();
                    });
                }
                return pump();
            })
            .catch(function () { /* reconnect below */ })
            .then(function () {
                if (S.abort === ctrl) S.abort = null;
                if (!S.id || S.id !== myId) return;
                clearTimeout(S.timer);
                S.timer = setTimeout(connect, S.backoff);
                S.backoff = Math.min(30000, Math.round(S.backoff * 1.7));
            });
    }
    function disconnect() {
        clearTimeout(S.timer);
        if (S.abort) { try { S.abort.abort(); } catch (e) { } S.abort = null; }
    }

    // ---------- phone alerts (Web Push) ----------
    function pushSupported() { return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window); }
    function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
    function isStandalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
    function b64ToBytes(b64) {
        var pad = '='.repeat((4 - b64.length % 4) % 4), s = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/')), out = new Uint8Array(s.length);
        for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
        return out;
    }
    function getCfg() {
        if (S.cfg) return Promise.resolve(S.cfg);
        return fetch(API + '/api/notify/config', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (c) { S.cfg = c; return c; }).catch(function () { return { pushEnabled: false }; });
    }
    function currentSub() {
        return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).catch(function () { return null; });
    }
    function sendSubToServer(sub) {
        return api('/api/notify/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } });
    }
    function enablePush() {
        return getCfg().then(function (cfg) {
            if (!cfg.pushEnabled) throw new Error('Phone alerts are not ready on the server yet.');
            return Notification.requestPermission().then(function (perm) {
                if (perm !== 'granted') throw new Error('Notifications were not allowed.');
                return navigator.serviceWorker.ready;
            }).then(function (reg) {
                var key = b64ToBytes(cfg.publicKey);
                return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }).catch(function () {
                    return reg.pushManager.getSubscription().then(function (old) { return old ? old.unsubscribe() : null; }).then(function () {
                        return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
                    });
                });
            }).then(function (sub) { LS.set('cm_push_on', '1'); LS.set('cm_push_asked', '1'); return sendSubToServer(sub); });
        });
    }
    function disablePush() {
        return currentSub().then(function (sub) {
            LS.del('cm_push_on');
            if (!sub) return;
            var ep = sub.endpoint;
            return sub.unsubscribe().then(function () { return fetch(API + '/api/notify/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: ep }) }); });
        });
    }
    // On a shared phone: whoever logs in now gets the alerts on this device.
    function rebindPush() {
        if (!pushSupported() || LS.get('cm_push_on') !== '1' || Notification.permission !== 'granted') return;
        getCfg().then(function (cfg) {
            if (!cfg.pushEnabled) return;
            return currentSub().then(function (sub) {
                if (sub) return sendSubToServer(sub);
                return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(cfg.publicKey) }); }).then(sendSubToServer);
            });
        }).catch(function () { });
    }

    function renderPhone() {
        var box = document.getElementById('cmnPhone'); if (!box) return;
        function say(html) { box.innerHTML = html; }
        if (!pushSupported()) {
            if (isIOS() && !isStandalone()) say('<b>Phone alerts on iPhone:</b> tap <b>Share</b>, then <b>Add to Home Screen</b>. Open CleverMent from your Home Screen and turn on alerts here. Until then, alerts show inside the app.');
            else say('This browser cannot send phone alerts. Alerts still show here while CleverMent is open.');
            return;
        }
        getCfg().then(function (cfg) {
            if (!cfg.pushEnabled) { say('Phone alerts are not ready on the server yet. Alerts still show here while CleverMent is open.'); return; }
            if (Notification.permission === 'denied') { say('Alerts are blocked for this website. Allow notifications in your phone or browser settings, then reopen CleverMent.'); return; }
            currentSub().then(function (sub) {
                var on = !!sub && Notification.permission === 'granted' && LS.get('cm_push_on') === '1';
                if (on) {
                    say('\u2705 Phone alerts are <b>on</b> for this device.<div class="cmn-row"><button type="button" class="cmn-btn ghost" id="cmnOff">Turn off</button></div>');
                    document.getElementById('cmnOff').addEventListener('click', function () { disablePush().then(renderPhone); });
                } else {
                    say('Get alerts on your phone even when CleverMent is closed.<div class="cmn-row"><button type="button" class="cmn-btn" id="cmnOn">Turn on phone alerts</button></div>');
                    document.getElementById('cmnOn').addEventListener('click', function (e) {
                        e.target.disabled = true;
                        enablePush().then(renderPhone).catch(function (er) { alert(er.message || 'Could not turn on phone alerts.'); renderPhone(); });
                    });
                }
            });
        });
    }

    // One-time friendly offer after login (never during an assessment).
    function offerPush() {
        if (LS.get('cm_push_asked') || !pushSupported() || Notification.permission !== 'default') return;
        getCfg().then(function (cfg) {
            if (!cfg.pushEnabled || !S.id || LS.get('cm_push_asked')) return;
            var el = document.createElement('div'); el.className = 'cmn-toast'; el.style.cursor = 'default';
            el.innerHTML = '<div class="cmn-t">Get alerts on your phone?</div><div class="cmn-b">We will tell you about important updates even when CleverMent is closed.</div><div class="cmn-phone" style="background:none;border:0;padding:8px 0 0"><div class="cmn-row" style="margin-top:0"><button type="button" class="cmn-btn" data-a="y">Turn on</button><button type="button" class="cmn-btn ghost" data-a="n">Not now</button></div></div>';
            el.querySelector('[data-a=y]').addEventListener('click', function () { el.remove(); enablePush().catch(function (er) { alert(er.message || 'Could not turn on phone alerts.'); }); });
            el.querySelector('[data-a=n]').addEventListener('click', function () { LS.set('cm_push_asked', '1'); el.remove(); });
            toasts.appendChild(el);
        });
    }

    // ---------- follow login / logout / exam ----------
    function startFor(id) {
        S.id = id; S.items = []; S.unread = 0; S.backoff = 3000; S.setupNeeded = false;
        build(); bell.classList.add('on'); setBadge();
        loadList(); connect(); rebindPush();
        clearInterval(S.pollTimer);
        S.pollTimer = setInterval(function () { if (!S.abort && document.visibilityState === 'visible') loadList(); }, 60000);
        setTimeout(offerPush, 4000);
    }
    function stopAll() {
        disconnect(); clearInterval(S.pollTimer);
        S.id = null; S.items = []; S.unread = 0; S.open = false;
        if (bell) bell.classList.remove('on');
        if (panel) panel.classList.remove('on');
        if (toasts) toasts.innerHTML = '';
        setBadge();
    }
    function sameId(a, b) { return a && b && a.role === b.role && a.token === b.token; }
    function tickIdentity() {
        var id = currentIdentity();
        if (id === 'exam') { if (S.id) stopAll(); return; }   // a quiet, distraction-free assessment
        if (!id) { if (S.id) stopAll(); return; }
        if (!sameId(S.id, id)) {
            if (S.id) stopAll();
            startFor(id);
        }
    }
    setInterval(tickIdentity, 1500);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && S.id) { loadList(); if (!S.abort) { S.backoff = 1000; connect(); } }
    });

    // On logout, stop sending this person's alerts to this phone.
    function wrapLogout(name) {
        var f = window[name];
        if (typeof f !== 'function' || f.__cmnWrapped) return;
        var w = function () {
            try {
                currentSub().then(function (sub) { if (sub) fetch(API + '/api/notify/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(function () { }); });
            } catch (e) { }
            stopAll();
            return f.apply(this, arguments);
        };
        w.__cmnWrapped = true; window[name] = w;
    }
    function wrapAll() { ['studentLogout', 'teacherLogout', 'adminLogout'].forEach(wrapLogout); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrapAll); else wrapAll();
    window.addEventListener('load', wrapAll);

    // ---------- tapping a phone alert ----------
    function pendingGo() {
        var m = /[?&]cmn=([^&]*)/.exec(location.search);
        if (!m) return;
        var where = decodeURIComponent(m[1] || '');
        try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { }
        if (!where) return;
        var tries = 0, iv = setInterval(function () { tries++; if (S.id) { clearInterval(iv); setTimeout(function () { go(where); }, 600); } else if (tries > 25) clearInterval(iv); }, 600);
    }
    pendingGo();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', function (e) {
            if (e.data && e.data.type === 'cm-notify-click') { loadList(); go(e.data.go); }
        });
    }
})();
