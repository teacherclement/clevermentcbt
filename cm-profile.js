/* CleverMent: profile dropdown (Profile, Change profile picture, Logout) for teacher, admin and student. */
(function () {
    'use strict';
    function $(s, r) { return (r || document).querySelector(s); }
    function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
    function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function initials(n) { return String(n || '?').split(/\s+/).filter(Boolean).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase() || '?'; }
    function backend() { return window.BACKEND_URL || (typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : ''); }
    function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
    function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }

    var ICON = {
        user: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
        cam: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
        out: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>',
        caret: '<svg class="cm-um-caret" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
    };

    var openMenu = null;
    function closeMenu() {
        if (!openMenu) return;
        openMenu.menu.hidden = true;
        openMenu.trigger.setAttribute('aria-expanded', 'false');
        openMenu = null;
    }
    function toggleMenu(trigger, menu) {
        if (openMenu && openMenu.menu === menu) { closeMenu(); return; }
        closeMenu();
        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        openMenu = { trigger: trigger, menu: menu };
        var first = $('[role="menuitem"]', menu); if (first && first.focus) { try { first.focus({ preventScroll: true }); } catch (e) {} }
    }
    document.addEventListener('click', function (e) { if (openMenu && !openMenu.menu.contains(e.target) && !openMenu.trigger.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', function (e) {
        if (!openMenu) return;
        if (e.key === 'Escape') { var t = openMenu.trigger; closeMenu(); if (t.focus) t.focus(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            var items = $$('[role="menuitem"]', openMenu.menu), i = items.indexOf(document.activeElement);
            i = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
            items[i].focus();
        }
    });
    window.addEventListener('resize', closeMenu);

    function menuHtml() {
        return '<button type="button" role="menuitem" data-act="profile">' + ICON.user + '<span>Profile</span></button>' +
               '<button type="button" role="menuitem" data-act="photo">' + ICON.cam + '<span>Change profile picture</span></button>' +
               '<div class="cm-um-sep" role="separator"></div>';
    }

    /* ---------- picture picking and resizing ---------- */
    var fileInput;
    function pickPhoto(done) {
        if (!fileInput) {
            fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
        }
        fileInput.value = '';
        fileInput.onchange = function () {
            var f = fileInput.files && fileInput.files[0]; if (!f) return;
            var prep = typeof rosterPrepareStudentPhoto === 'function' ? rosterPrepareStudentPhoto(f) : Promise.reject(new Error('Picture tools are not ready yet. Please refresh the page.'));
            prep.then(done).catch(function (err) { alert(err && err.message ? err.message : 'Could not use that picture.'); });
        };
        fileInput.click();
    }
    function setAvatar(el, photo, name) {
        if (!el) return;
        var sig = photo ? 'p' + photo.length + photo.slice(-24) : 'i' + initials(name);
        if (el.getAttribute('data-ph') === sig) return;   /* unchanged: do not touch the page (avoids endless redraws) */
        el.setAttribute('data-ph', sig);
        if (photo) { el.innerHTML = '<img src="' + esc(photo) + '" alt="">'; el.classList.add('has-photo'); }
        else { el.textContent = initials(name); el.classList.remove('has-photo'); }
    }

    /* ---------- profile pop-up (teacher and admin) ---------- */
    function showProfileModal(info) {
        var old = $('#cmProfileModal'); if (old) old.remove();
        var m = document.createElement('div'); m.id = 'cmProfileModal'; m.className = 'cm-modal';
        m.innerHTML = '<div class="cm-modal-card" role="dialog" aria-modal="true" aria-label="Profile"><button type="button" class="cm-modal-x" aria-label="Close">&times;</button>' +
            '<div class="cm-modal-av">' + (info.photo ? '<img src="' + esc(info.photo) + '" alt="">' : '<span>' + esc(initials(info.name)) + '</span>') + '</div>' +
            '<h3>' + esc(info.name || info.role) + '</h3><p class="cm-modal-role">' + esc(info.role) + '</p>' +
            (info.rows || []).map(function (r) { return '<div class="cm-trow"><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div>'; }).join('') +
            '<div class="cm-modal-actions"><button type="button" class="secondary-btn" data-m="photo">Change profile picture</button><button type="button" class="primary-btn" data-m="close">Close</button></div></div>';
        document.body.appendChild(m);
        m.addEventListener('click', function (e) {
            var t = e.target;
            if (t === m || (t.getAttribute && (t.getAttribute('data-m') === 'close' || t.classList.contains('cm-modal-x')))) m.remove();
            else if (t.getAttribute && t.getAttribute('data-m') === 'photo') { m.remove(); info.changePhoto(); }
        });
        document.addEventListener('keydown', function esc2(e) { if (e.key === 'Escape') { m.remove(); document.removeEventListener('keydown', esc2); } });
        var b = $('.primary-btn', m); if (b) b.focus();
    }

    /* ---------- teacher and admin top bar ---------- */
    function roleInfo(role) {
        if (role === 'teacher') {
            var nm = ($('#teacherTopbar .cm-user-name') || {}).textContent || 'Teacher', email = '';
            try { email = (typeof currentTeacher !== 'undefined' && currentTeacher && currentTeacher.email) || ''; } catch (e) {}
            return { name: nm, role: 'Teacher', rows: [['Name', nm], ['Email', email || '-'], ['Role', 'Teacher']], key: 'cm_photo_teacher_' + email, email: email };
        }
        return { name: 'Admin', role: 'Administrator', rows: [['Role', 'Administrator']], key: 'cm_photo_admin', email: '' };
    }
    function currentPhoto(role) { return lsGet(roleInfo(role).key); }
    function applyPhoto(role) {
        var bar = $('#' + role + 'Topbar'); if (!bar) return;
        setAvatar($('.cm-avatar', bar), currentPhoto(role), roleInfo(role).name);
    }
    function saveTeacherPhoto(photo) {
        var token = lsGet('cleverment_teacher_token');
        return fetch(backend() + '/api/teacher/photo', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ photo: photo }) })
            .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Could not save the picture.'); return d; }); });
    }
    function changePhoto(role) {
        pickPhoto(function (photo) {
            var key = roleInfo(role).key;
            if (role === 'teacher') {
                saveTeacherPhoto(photo).then(function () { lsSet(key, photo); applyPhoto(role); })
                    .catch(function (e) { alert(e.message || 'Could not save the picture.'); });
            } else { lsSet(key, photo); applyPhoto(role); }
        });
    }
    function loadTeacherPhoto() {
        var info = roleInfo('teacher'), token = lsGet('cleverment_teacher_token');
        if (!info.email || !token || loadTeacherPhoto.done === info.email) return;
        loadTeacherPhoto.done = info.email;
        fetch(backend() + '/api/teacher/photo', { headers: { 'Authorization': 'Bearer ' + token } })
            .then(function (r) { return r.json(); })
            .then(function (d) { if (d && d.photo) { lsSet(info.key, d.photo); applyPhoto('teacher'); } })
            .catch(function () {});
    }
    function buildBar(role) {
        var bar = $('#' + role + 'Topbar'); if (!bar || bar.getAttribute('data-um')) return;
        var user = $('.cm-user', bar), av = $('.cm-avatar', bar), logout = $('.cm-logout', bar); if (!user || !av || !logout) return;
        bar.setAttribute('data-um', '1');
        var wrap = document.createElement('div'); wrap.className = 'cm-um';
        var trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'cm-um-trigger';
        trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-label', 'Account menu');
        var menu = document.createElement('div'); menu.className = 'cm-um-menu'; menu.setAttribute('role', 'menu'); menu.hidden = true;
        menu.innerHTML = menuHtml();
        user.parentNode.insertBefore(wrap, user);
        trigger.appendChild(user); trigger.appendChild(av); trigger.insertAdjacentHTML('beforeend', ICON.caret);
        logout.setAttribute('role', 'menuitem'); logout.classList.add('cm-um-logout');
        logout.innerHTML = ICON.out + '<span>' + (logout.textContent || 'Logout') + '</span>';
        menu.appendChild(logout);
        wrap.appendChild(trigger); wrap.appendChild(menu);
        trigger.addEventListener('click', function () { toggleMenu(trigger, menu); });
        menu.addEventListener('click', function (e) {
            var b = e.target.closest && e.target.closest('[data-act]'); if (!b) { if (e.target.closest && e.target.closest('.cm-um-logout')) closeMenu(); return; }
            closeMenu();
            if (b.getAttribute('data-act') === 'photo') changePhoto(role);
            else { var i = roleInfo(role); i.photo = currentPhoto(role); i.changePhoto = function () { changePhoto(role); }; showProfileModal(i); }
        });
        applyPhoto(role);
    }

    /* ---------- student top bar ---------- */
    function buildStudent() {
        var top = $('#studentAreaPage .sa-top'), prof = $('#saProfile'); if (!top || !prof || top.getAttribute('data-um')) return;
        top.setAttribute('data-um', '1'); top.classList.add('cm-um-host');
        var menu = document.createElement('div'); menu.className = 'cm-um-menu'; menu.setAttribute('role', 'menu'); menu.hidden = true;
        menu.innerHTML = menuHtml();
        var lo = $('.sa-mobile-logout', top);
        if (lo) { lo.setAttribute('role', 'menuitem'); lo.classList.add('cm-um-logout'); lo.innerHTML = ICON.out + '<span>Log out</span>'; menu.appendChild(lo); }
        top.appendChild(menu);
        prof.setAttribute('role', 'button'); prof.setAttribute('tabindex', '0'); prof.setAttribute('aria-haspopup', 'menu'); prof.setAttribute('aria-expanded', 'false'); prof.classList.add('cm-um-prof');
        function go() { toggleMenu(prof, menu); }
        prof.addEventListener('click', go);
        prof.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        menu.addEventListener('click', function (e) {
            var b = e.target.closest && e.target.closest('[data-act]');
            if (!b) { if (e.target.closest && e.target.closest('.cm-um-logout')) closeMenu(); return; }
            closeMenu();
            if (b.getAttribute('data-act') === 'profile') { if (typeof studentAreaShow === 'function') { studentAreaShow('profile'); if (typeof renderStudentProfilePanel === 'function') renderStudentProfilePanel(); } }
            else pickPhoto(function (photo) {
                fetch(backend() + '/api/student/photo', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + lsGet('cleverment_student_token') }, body: JSON.stringify({ photo: photo }) })
                    .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Could not save your picture.'); return d; }); })
                    .then(function () {
                        if (typeof saMe !== 'undefined' && saMe) { saMe.photo = photo; renderStudentProfile(saMe); if (typeof renderStudentProfilePanel === 'function' && $('#saPanelProfile') && $('#saPanelProfile').style.display === 'block') renderStudentProfilePanel(); }
                    })
                    .catch(function (e) { alert(e.message || 'Could not save your picture.'); });
            });
        });
    }

    function tick() { buildBar('teacher'); buildBar('admin'); buildStudent(); loadTeacherPhoto(); applyPhoto('teacher'); applyPhoto('admin'); }
    function init() {
        tick();
        if (window.MutationObserver) { var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(tick, 150); }).observe(document.body, { childList: true, subtree: true }); }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
