/* CleverMent theme switcher: Light / System / Dark. Choice is saved on this device. */
(function () {
    var KEY = 'cm_theme', ICON = {
        light: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
        dark: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
        system: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>'
    };
    function get() { try { return localStorage.getItem(KEY) || 'light'; } catch (e) { return 'light'; } }
    function sysDark() { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
    function isDark(t) { return t === 'dark' || (t === 'system' && sysDark()); }
    function apply(t) {
        var d = isDark(t), h = document.documentElement;
        if (d) h.setAttribute('data-cm-dark', '1'); else h.removeAttribute('data-cm-dark');
        var m = document.querySelector('meta[name="theme-color"]');
        if (m) { if (!m.getAttribute('data-orig')) m.setAttribute('data-orig', m.getAttribute('content')); m.setAttribute('content', d ? '#1a1b1e' : m.getAttribute('data-orig')); }
        var b = document.getElementById('cmThemeBtn'); if (b) b.innerHTML = ICON[t] || ICON.light;
        document.querySelectorAll('#cmThemeMenu [data-theme]').forEach(function (o) { var on = o.getAttribute('data-theme') === t; o.setAttribute('aria-checked', on ? 'true' : 'false'); o.classList.toggle('on', on); });
    }
    function set(t) { try { localStorage.setItem(KEY, t); } catch (e) { } apply(t); }
    function closeMenu() { var m = document.getElementById('cmThemeMenu'), b = document.getElementById('cmThemeBtn'); if (m) m.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); }
    function init() {
        var b = document.getElementById('cmThemeBtn'), m = document.getElementById('cmThemeMenu');
        if (!b || !m) return;
        b.addEventListener('click', function (e) { e.stopPropagation(); var open = m.hidden; m.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
        m.querySelectorAll('[data-theme]').forEach(function (o) { o.addEventListener('click', function (e) { e.stopPropagation(); set(o.getAttribute('data-theme')); closeMenu(); }); });
        document.addEventListener('click', closeMenu);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
        if (window.matchMedia) { var mq = window.matchMedia('(prefers-color-scheme: dark)'), f = function () { if (get() === 'system') apply('system'); }; if (mq.addEventListener) mq.addEventListener('change', f); else if (mq.addListener) mq.addListener(f); }
        apply(get());
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
