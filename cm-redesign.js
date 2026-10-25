/* CleverMent redesign helpers: top-bar user, status pills, assessment stepper, desktop sidebar toggle. Safe: only changes looks. */
(function () {
    function $(s, r) { return (r || document).querySelector(s); }
    function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
    function initials(n) { return String(n || '?').split(/\s+/).filter(Boolean).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase() || '?'; }

    /* teacher top bar: name from the page heading ("Welcome, Name!") */
    function syncTeacher() {
        var h = document.getElementById('teacherDashboardName'), bar = document.getElementById('teacherTopbar');
        if (!h || !bar) return;
        var t = (h.textContent || '').replace(/^Admin Workspace\s*[\u2014-]\s*/, '').replace(/^Welcome,?\s*/i, '').replace(/!$/, '').trim();
        if (!t || /^Teacher Dashboard$/i.test(t)) return;
        var n = $('.cm-user-name', bar), a = $('.cm-avatar', bar);
        if (n && n.textContent !== t) { n.textContent = t; a.textContent = initials(t); }
    }
    /* student top bar: class under the name is already shown by the profile block */

    /* status words in tables become pills */
    var PILL = { published: 'ok', active: 'ok', open: 'ok', passed: 'ok', completed: 'ok', submitted: 'ok', draft: 'warn', pending: 'warn', upcoming: 'warn', closed: 'bad', failed: 'bad', 'not passed': 'bad' };
    function pills(root) {
        $$('td', root || document).forEach(function (td) {
            if (td.children.length || td.getAttribute('data-pill')) return;
            var k = (td.textContent || '').trim().toLowerCase();
            if (PILL[k]) { td.setAttribute('data-pill', '1'); td.innerHTML = '<span class="cm-pill ' + PILL[k] + '">' + td.textContent.trim() + '</span>'; }
        });
    }

    /* assessment form stepper: tags the form groups and scrolls to them */
    function tagSteps() {
        var box = document.getElementById('uploadSection'); if (!box || box.getAttribute('data-steps')) return;
        box.setAttribute('data-steps', '1');
        $$(':scope > .form-group, :scope > div', box).forEach(function (g) {
            if (g.id === 'cmSteps' || g.classList.contains('cm-steps')) return;
            var l = $('label', g), t = ((l && l.textContent) || g.textContent || '').toLowerCase().slice(0, 60);
            var k = /question bank|upload questions|csv/.test(t) ? 'questions' : /select class|who can take|custom-class/.test(t) || g.className.indexOf('custom-class') > -1 ? 'class' : 'settings';
            g.setAttribute('data-step', k);
        });
        var steps = document.getElementById('cmSteps'); if (!steps) return;
        $$('button', steps).forEach(function (b) {
            b.addEventListener('click', function () {
                var k = b.getAttribute('data-k'), target = k === 'publish' ? $$('[data-step="questions"]', box).pop() : $('[data-step="' + k + '"]', box);
                if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                $$('button', steps).forEach(function (x) { x.classList.toggle('on', x === b); });
            });
        });
    }

    /* desktop: hamburger collapses the sidebar to icons instead of sliding it away */
    document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.dashboard-menu-top');
        if (!b || window.innerWidth < 1000) return;
        var dash = b.closest('#teacherDashboard,#adminDashboard'); if (!dash) return;
        var lay = $('.dash-layout', dash); if (!lay) return;
        e.stopPropagation(); e.preventDefault();
        lay.classList.toggle('cm-rail');
    }, true);

    function tick() { syncTeacher(); pills(); tagSteps(); }
    function init() {
        tick();
        if (window.MutationObserver) { var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(tick, 120); }).observe(document.body, { childList: true, subtree: true, characterData: true }); }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
