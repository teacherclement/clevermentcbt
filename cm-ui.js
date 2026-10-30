/* CleverMent UI helpers (loaded after script.js).
   1) Action buttons show icons instead of words (the words stay as tooltip + screen-reader label).
   2) Every table gets data-labels so it can turn into compact cards on phones.
   3) The long teacher/admin menus are grouped into collapsible sections.
   4) The Publish Assessment form is arranged into clear step cards.
   Nothing here changes any button's behaviour: elements are only restyled or moved. */
(function () {
  'use strict';

  function svg(p, size) {
    size = size || 18;
    return '<svg class="cm-i" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>';
  }
  var IC = {
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    clear: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M17.9 17.9A10.9 10.9 0 0 1 12 19c-6.4 0-10-7-10-7a18 18 0 0 1 5-5.7"/><path d="M9.9 4.2A10 10 0 0 1 12 4c6.4 0 10 8 10 8a18 18 0 0 1-2.2 3.2"/><path d="m1 1 22 22"/>',
    print: '<path d="M6 9V2h12v7"/><rect x="3" y="9" width="18" height="9" rx="2"/><path d="M6 14h12v8H6z"/>',
    more: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    undo: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'
  };

  /* ---------------- 1. ICON BUTTONS ---------------- */
  var RULES = [
    [/^(delete|remove)\b/, 'trash', 'danger', 99],
    [/^clear\b/, 'clear', 'neutral', 4],
    [/^edit\b/, 'edit', 'edit', 4],
    [/^(download|export|save as)\b/, 'download', 'neutral', 6],
    [/^upload\b/, 'upload', 'neutral', 3],
    [/^(refresh|reload)\b/, 'refresh', 'neutral', 3],
    [/^copy\b/, 'copy', 'neutral', 4],
    [/^share\b/, 'share', 'neutral', 5],
    [/^print\b/, 'print', 'neutral', 4],
    [/^take action$/, 'more', 'neutral', 2],
    [/^(close|cancel|dismiss)$/, 'close', 'neutral', 1],
    [/^hide\b/, 'eyeoff', 'neutral', 3],
    [/^show\b/, 'eye', 'neutral', 3],
    [/^(add|new)\b/, 'plus', 'neutral', 3],
    [/^(view|open)\b/, 'eye', 'neutral', 2],
    [/^(allow retake|retake)\b/, 'undo', 'neutral', 3],
    [/^log ?out$/, 'logout', 'neutral', 2]
  ];
  var SKIP = '#landingPage,#studentAccess,#studentLoginPage,#faqPage,#mainHeader,.pl-btn,.tq,.cm-steps,.sa-nav,.dash-nav-item,.nav-group-head,.pos-tab:not(.pos-refresh),[data-cm-noicon]';
  var LEAD = '[id$="Overlay"],.live-msg-overlay,.cm-modal-card,.cm-um-menu,.full-width,.result-take-another,.live-msg-dialog,.assessment-editor-card';

  function normalise(t) {
    return String(t || '').replace(/\s+/g, ' ').replace(/^[^A-Za-z0-9+]+/, '').trim();
  }
  function match(label) {
    var low = label.toLowerCase();
    if (!low || low.length > 44) return null;
    var words = low.split(' ').length;
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i][0].test(low) && words <= RULES[i][3]) return RULES[i];
    }
    if (/^\+\s?/.test(label) && words <= 3) return [null, 'plus', 'neutral', 3];
    return null;
  }
  function badgeOf(low) {
    var m = low.match(/\b(pdf|csv|excel|xlsx|zip|png)\b/);
    return m ? (m[1] === 'xlsx' ? 'Excel' : m[1] === 'excel' ? 'Excel' : m[1].toUpperCase()) : '';
  }
  function iconize(btn) {
    if (btn.closest(SKIP)) return;
    var raw = btn.getAttribute('data-cm-label');
    var text = normalise(btn.textContent);
    var mode = btn.getAttribute('data-cm-ico');
    if (mode) {
      /* already processed: only re-process when the app changed the text */
      var sig = btn.getAttribute('data-cm-sig') || '';
      var cur = normalise(btn.textContent);
      if (mode === 'lead') { if (cur === (btn.getAttribute('data-cm-lead') || '')) return; }
      else if (cur === sig) return;
      btn.removeAttribute('data-cm-ico');
      btn.classList.remove('cm-icobtn', 'cm-icolead', 'cm-ico-danger', 'cm-ico-edit');
      text = cur;
    }
    if (!text) return;
    var m = match(text);
    if (!m) return;
    var lead = !!btn.closest(LEAD);
    var low = text.toLowerCase();
    var existing = btn.querySelector('svg');
    var iconHtml = (existing && !existing.classList.contains('cm-i')) ? existing.outerHTML : svg(IC[m[1]]);
    if (!btn.getAttribute('title')) btn.setAttribute('title', text);
    btn.setAttribute('aria-label', text);
    btn.setAttribute('data-cm-label', text);
    if (lead) {
      btn.innerHTML = iconHtml + '<span class="cm-ico-text">' + text.replace(/</g, '&lt;') + '</span>';
      btn.setAttribute('data-cm-ico', 'lead');
      btn.setAttribute('data-cm-lead', text);
      btn.classList.add('cm-icolead');
    } else {
      var badge = badgeOf(low);
      btn.innerHTML = iconHtml + (badge ? '<small class="cm-ico-badge">' + badge + '</small>' : '');
      btn.setAttribute('data-cm-ico', 'icon');
      btn.setAttribute('data-cm-sig', badge);
      btn.classList.add('cm-icobtn');
      if (m[2] === 'danger') btn.classList.add('cm-ico-danger');
      if (m[2] === 'edit') btn.classList.add('cm-ico-edit');
    }
  }
  function scanIcons() {
    var list = document.querySelectorAll('button');
    for (var i = 0; i < list.length; i++) { try { iconize(list[i]); } catch (e) {} }
  }

  /* ---------------- 2. RESPONSIVE TABLES ---------------- */
  function labelTables() {
    var tables = document.querySelectorAll('table');
    for (var t = 0; t < tables.length; t++) {
      var tb = tables[t];
      var ths = tb.querySelectorAll('thead th');
      if (!ths.length) continue;
      tb.classList.add('cm-rt');
      var names = [];
      for (var h = 0; h < ths.length; h++) names.push((ths[h].textContent || '').replace(/\s+/g, ' ').trim());
      var rows = tb.querySelectorAll('tbody tr');
      for (var r = 0; r < rows.length; r++) {
        var cells = rows[r].children;
        if (cells.length === 1 && cells[0].colSpan > 1) { cells[0].setAttribute('data-label', ''); continue; }
        for (var c = 0; c < cells.length; c++) {
          if (!cells[c].hasAttribute('data-label')) cells[c].setAttribute('data-label', names[c] || '');
        }
      }
    }
  }

  /* ---------------- 3. GROUPED MENUS ---------------- */
  var GROUPS = {
    teacherDashboard: [
      ['Assessments', 'clipboard', ['uploadSection', 'publishedSection', 'csvHistorySection', 'liveSection', 'competitionSection', 'accessLogsSection']],
      ['Students', 'users', ['rosterSection', 'progressSection', 'messagesSection', 'schoolSection']],
      ['Reports', 'chart', ['adminSection', 'positionsSection', 'analyticsSection', 'insightsSection', 'backupSection']]
    ],
    adminDashboard: [
      ['Assessments', 'clipboard', ['adminLiveSection', 'adminAssessmentsSection', 'adminResultsSection', 'adminAccessLogsSection']],
      ['People & Schools', 'users', ['adminSelectTeacherSection', 'adminTeachersSection', 'adminSchoolsSection']],
      ['Content & Settings', 'gear', ['adminAnnounceSection', 'adminOptionsSection', 'adminFaqSection', 'adminFeeSection']],
      ['Security & Logs', 'shield', ['adminSecuritySection', 'adminActivitySection']]
    ]
  };
  function openActiveGroup(nav) {
    var act = nav.querySelector('.dash-nav-item.active');
    if (!act) return;
    var grp = act.closest('.nav-group');
    if (grp && !grp.classList.contains('open')) setOpen(grp, true);
  }
  function setOpen(grp, open) {
    grp.classList.toggle('open', open);
    var head = grp.querySelector('.nav-group-head');
    if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function groupMenus() {
    Object.keys(GROUPS).forEach(function (rootId) {
      var root = document.getElementById(rootId);
      if (!root) return;
      var nav = root.querySelector('.dash-sidebar nav');
      if (!nav || nav.getAttribute('data-cm-grouped')) return;
      nav.setAttribute('data-cm-grouped', '1');
      GROUPS[rootId].forEach(function (g) {
        var items = [];
        g[2].forEach(function (target) {
          var b = nav.querySelector('.dash-nav-item[data-target="' + target + '"]');
          if (b) items.push(b);
        });
        if (!items.length) return;
        var grp = document.createElement('div');
        grp.className = 'nav-group';
        var head = document.createElement('button');
        head.type = 'button';
        head.className = 'nav-group-head';
        head.setAttribute('aria-expanded', 'false');
        head.innerHTML = svg(IC[g[1]], 18) + '<span>' + g[0].replace(/&/g, '&amp;') + '</span><span class="nav-group-chev">' + svg(IC.chevron, 16) + '</span>';
        var body = document.createElement('div');
        body.className = 'nav-group-body';
        items[0].parentNode.insertBefore(grp, items[0]);
        grp.appendChild(head);
        grp.appendChild(body);
        items.forEach(function (b) { body.appendChild(b); });
        head.addEventListener('click', function () { setOpen(grp, !grp.classList.contains('open')); });
      });
      openActiveGroup(nav);
      try {
        new MutationObserver(function () { openActiveGroup(nav); }).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
      } catch (e) {}
    });
  }

  /* ---------------- 4. PUBLISH FORM CARDS ---------------- */
  function wrapPublishForm() {
    var up = document.getElementById('uploadSection');
    if (!up || up.getAttribute('data-cm-cards')) return;
    if (!up.getAttribute('data-steps')) return; /* wait until the step bar has tagged the form */
    function grp(id) {
      var el = document.getElementById(id);
      if (!el) return null;
      var g = el.closest('.form-group') || el;
      return g.parentNode === up ? g : null;
    }
    function box(sel) {
      var el = up.querySelector(sel);
      if (!el) return null;
      while (el && el.parentNode !== up) el = el.parentNode;
      return el;
    }
    var cam = document.getElementById('teacherCameraMonitoring');
    var monitor = cam ? cam.closest('div[style*="f5c98f"]') : null;
    if (monitor && monitor.parentNode !== up) monitor = null;
    var cls = grp('teacherClassSelect');
    var custom = box('.custom-class-wrapper-teacher');
    var cards = [
      ['1', 'Basics', 'Subject, time and pass mark', 'settings', [grp('teacherSubjectSelect'), grp('teacherTimerHost'), grp('teacherPassMark')]],
      ['2', 'Class and access', 'Who can take it, and when', 'class', [cls, custom, grp('teacherAvailableFrom'), grp('teacherAvailableUntil'), grp('teacherAccessMode'), grp('teacherQuestionLimit'), grp('teacherNegativeMarking')]],
      ['3', 'Exam rules', 'Shuffling, results and live monitoring', 'class', [grp('teacherShuffleQuestions'), grp('teacherShowResults'), monitor]],
      ['4', 'Certificate', 'Name and signature shown on certificates', 'settings', [grp('teacherCertName'), grp('teacherCertSignature')]],
      ['5', 'Questions', 'Load a saved set or upload a CSV file', 'questions', [grp('teacherQuestionBankSelect'), grp('teacherCsvFile')]]
    ];
    var anchor = up.querySelector(':scope > .primary-btn.full-width');
    var made = 0;
    cards.forEach(function (c) {
      var members = c[4].filter(Boolean);
      if (!members.length) return;
      var sec = document.createElement('div');
      sec.className = 'pb-card';
      sec.setAttribute('data-step', c[3]);
      var head = document.createElement('div');
      head.className = 'pb-head';
      head.innerHTML = '<span class="pb-num">' + c[0] + '</span><div><b>' + c[1] + '</b><small>' + c[2] + '</small></div>';
      var inner = document.createElement('div');
      inner.className = 'pb-grid';
      sec.appendChild(head);
      sec.appendChild(inner);
      if (anchor) up.insertBefore(sec, anchor); else up.appendChild(sec);
      members.forEach(function (m) { inner.appendChild(m); });
      made++;
    });
    if (made) up.setAttribute('data-cm-cards', '1');
  }

  /* ---------------- run ---------------- */
  var timer = null;
  function runAll() {
    try { groupMenus(); } catch (e) {}
    try { wrapPublishForm(); } catch (e) {}
    try { labelTables(); } catch (e) {}
    try { scanIcons(); } catch (e) {}
  }
  function schedule() {
    if (timer) return;
    timer = setTimeout(function () { timer = null; runAll(); }, 120);
  }
  function start() {
    runAll();
    setTimeout(runAll, 600);
    setTimeout(runAll, 1800);
    try {
      new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
