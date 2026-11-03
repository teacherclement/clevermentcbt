/* ============================================================
   CLEVERMENT RELIABILITY
   - Wakes the free server early so students don't wait at the start
   - Shows students a clear "answers saved" / "offline" chip during an assessment
   - Saves and syncs answers the moment the network or the app comes back
   ============================================================ */
(function () {
    'use strict';
    if (window.__cmRelLoaded) return;
    window.__cmRelLoaded = true;
    function api() { return (typeof BACKEND_URL !== 'undefined' && BACKEND_URL) ? BACKEND_URL : 'https://api.thecleverment.com'; }

    // ---- 1) wake the server early (a sleeping free server needs up to a minute) ----
    var lastWake = 0;
    function wake() {
        if (document.visibilityState !== 'visible') return;
        if (Date.now() - lastWake < 3 * 60 * 1000) return;
        lastWake = Date.now();
        try { fetch(api() + '/health', { mode: 'no-cors', cache: 'no-store' }).catch(function () { }); } catch (e) { }
    }
    wake();
    setInterval(wake, 4 * 60 * 1000);
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', function () { lastWake = 0; wake(); });

    // ---- 2) status chip inside an assessment ----
    var chip = null, state = 'ok', lastOk = 0;
    function inQuiz() { var s = document.getElementById('studentQuizSection'); return !!s && s.style.display === 'block'; }
    function ensureChip() {
        if (chip) return chip;
        chip = document.createElement('div');
        chip.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);left:8px;z-index:8990;padding:4px 10px;border-radius:12px;font:600 11.5px Inter,Arial,sans-serif;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none;display:none';
        document.body.appendChild(chip);
        return chip;
    }
    function paint() {
        var c = ensureChip();
        if (!inQuiz()) { c.style.display = 'none'; return; }
        var offline = !navigator.onLine;
        if (offline) { c.style.background = '#b45309'; c.textContent = '⚠ Offline: answers are safe on this phone'; }
        else if (state === 'fail') { c.style.background = '#b45309'; c.textContent = '↻ Reconnecting… answers are safe'; }
        else { c.style.background = '#15803d'; c.textContent = '✓ Answers saved'; }
        c.style.display = 'block';
    }
    window.cmOnSyncOk = function () {
        state = 'ok'; lastOk = Date.now(); paint();
        try { var b = document.getElementById('connectBanner'); if (b && b.style.display !== 'none' && /saved answers|server is slow/i.test(b.textContent)) hideConnectBanner(); } catch (e) { }
    };
    window.cmOnSyncFail = function () { state = 'fail'; paint(); };
    setInterval(paint, 2000);

    // ---- 3) save + sync the moment we can ----
    function flush() {
        if (!inQuiz()) return;
        try { if (typeof saveQuizState === 'function') saveQuizState(); } catch (e) { }
        try { if (typeof syncStudentProgress === 'function') syncStudentProgress(false); } catch (e) { }
    }
    window.addEventListener('online', function () { paint(); setTimeout(flush, 500); });
    window.addEventListener('offline', paint);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') flush(); });
    window.addEventListener('pagehide', function () { try { if (inQuiz() && typeof saveQuizState === 'function') saveQuizState(); } catch (e) { } });
    // Keep the phone copy fresh even if no button is tapped.
    setInterval(function () { try { if (inQuiz() && typeof studentIsTimeUp !== 'undefined' && !studentIsTimeUp && typeof saveQuizState === 'function') saveQuizState(); } catch (e) { } }, 10000);
})();
