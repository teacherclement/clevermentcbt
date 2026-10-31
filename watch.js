// ============================================================
// CLEVERMENT LIVE WATCHING
// - Slow-refresh pictures grid (only while a teacher has the grid open)
// - Tap a student to watch and listen live (WebRTC; this server only passes
//   the "hello" messages, the video/sound go phone to phone, or through the
//   TURN relay if a direct connection is impossible)
// Works ONLY for assessments where the teacher turned on camera and/or noise
// monitoring, and ONLY for students who agreed on the consent screen
// (their phone asks this server for work only after they agreed).
// ============================================================
'use strict';
var crypto = require('crypto');

module.exports = function(app, deps) {
    var rateLimit = deps.rateLimit, clientIp = deps.clientIp;
    var getActive = deps.getActiveSessions, getAssessment = deps.getAssessment, keyOf = deps.liveSessionKey;
    var requireTeacherAuth = deps.requireTeacherAuth;

    var studentBox = {};   // student key -> { events, waiter, consentAt, lastPoll }
    var viewerBox = {};    // viewer id -> { events, waiter, teacher, key, code, started }
    var snaps = {};        // student key -> { img, at }
    var wantSnap = {};     // student key -> until (ms)

    function now() { return Date.now(); }
    function lower(s) { return String(s || '').trim().toLowerCase(); }
    function flush(box) {
        if (!box.waiter || !box.events.length) return;
        var w = box.waiter; box.waiter = null; clearTimeout(w.timer);
        var ev = box.events.splice(0, box.events.length);
        try { w.res.json({ events: ev, snap: !!w.snap() }); } catch (e) { }
    }
    function push(box, ev) { box.events.push(ev); if (box.events.length > 60) box.events.shift(); flush(box); }
    function hold(box, res, snapFn, ms) {
        if (box.waiter) { var old = box.waiter; box.waiter = null; clearTimeout(old.timer); try { old.res.json({ events: [], snap: !!old.snap() }); } catch (e) { } }
        if (box.events.length) { var ev = box.events.splice(0, box.events.length); return res.json({ events: ev, snap: !!snapFn() }); }
        var w = { res: res, snap: snapFn, timer: setTimeout(function() { if (box.waiter === w) box.waiter = null; try { res.json({ events: [], snap: !!snapFn() }); } catch (e) { } }, ms || 20000) };
        box.waiter = w;
        res.on('close', function() { if (box.waiter === w) { box.waiter = null; clearTimeout(w.timer); } });
    }

    function iceServers() {
        var u = process.env.METERED_TURN_USERNAME, p = process.env.METERED_TURN_PASSWORD;
        var list = [{ urls: ['stun:stun.relay.metered.ca:80', 'stun:stun.l.google.com:19302'] }];
        if (u && p) {
            list.push({ urls: ['turn:global.relay.metered.ca:80', 'turn:global.relay.metered.ca:80?transport=tcp', 'turn:global.relay.metered.ca:443', 'turns:global.relay.metered.ca:443?transport=tcp'], username: u, credential: p });
        }
        return list;
    }

    var lim = rateLimit({ keyGenerator: clientIp, validate: false, windowMs: 60 * 1000, max: 600, message: { error: 'Too many requests.' } });

    // ---------- student checks ----------
    async function studentCtx(req, res) {
        var b = req.body || {};
        var code = String(b.code || '').trim().toUpperCase(), adm = lower(b.admissionNumber);
        if (!code || !adm) { res.status(400).json({ error: 'Missing details.' }); return null; }
        var key = keyOf(code, adm);
        var sess = getActive()[key];
        if (!sess || now() - new Date(sess.lastSeen).getTime() > 90 * 1000) { res.json({ events: [], snap: false, wait: true }); return null; }   // not in the assessment yet: try again soon
        var r = await getAssessment(code);
        var a = r && r.data;
        if (!a || !(a.camera_monitoring || a.noise_monitoring)) { res.json({ events: [], snap: false, off: true }); return null; }   // monitoring is not enabled here
        var box = studentBox[key] || (studentBox[key] = { events: [], waiter: null, consentAt: 0, lastPoll: 0 });
        return { key: key, code: code, adm: adm, box: box, a: a };
    }

    app.post('/api/quiz/watch/poll', lim, async function(req, res) {
        try {
            var c = await studentCtx(req, res); if (!c) return;
            if (!c.box.consentAt) c.box.consentAt = now();     // the student's phone only calls this after they agreed
            c.box.lastPoll = now();
            hold(c.box, res, function() { return (wantSnap[c.key] || 0) > now() && !!c.a.camera_monitoring; }, 20000);
        } catch (e) { res.status(500).json({ error: 'x' }); }
    });
    app.post('/api/quiz/watch/snap', lim, async function(req, res) {
        try {
            var c = await studentCtx(req, res); if (!c) return;
            var img = String((req.body || {}).img || '');
            if (!c.box.consentAt || !c.a.camera_monitoring || (wantSnap[c.key] || 0) < now()) return res.json({ ok: false });
            if (img.indexOf('data:image/jpeg;base64,') !== 0 || img.length > 60000) return res.status(400).json({ error: 'Bad picture.' });
            snaps[c.key] = { img: img, at: now() };
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: 'x' }); }
    });
    app.post('/api/quiz/watch/ice', lim, async function(req, res) {
        try {
            var c = await studentCtx(req, res); if (!c) return;
            if (!c.box.consentAt) return res.json({ iceServers: [] });
            res.json({ iceServers: iceServers() });
        } catch (e) { res.status(500).json({ error: 'x' }); }
    });
    app.post('/api/quiz/watch/send', lim, async function(req, res) {
        try {
            var c = await studentCtx(req, res); if (!c) return;
            var b = req.body || {};
            var v = viewerBox[String(b.viewer || '')];
            if (!v || v.key !== c.key) return res.json({ ok: false });
            if (JSON.stringify(b.data || '').length > 30000) return res.status(400).json({ error: 'Too big.' });
            push(v, { type: String(b.type || '').slice(0, 12), data: b.data });
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: 'x' }); }
    });

    // ---------- teacher side ----------
    async function ownedAssessment(req, res, code) {
        code = String(code || '').trim().toUpperCase();
        var r = await getAssessment(code);
        var a = r && r.data;
        if (!a || a.teacher_email !== req.teacherEmail) { res.status(403).json({ error: 'Not your assessment.' }); return null; }
        if (!(a.camera_monitoring || a.noise_monitoring)) { res.status(400).json({ error: 'Camera or noise monitoring is not turned on for this assessment.' }); return null; }
        return a;
    }
    function liveStudents(code) {
        var out = [], act = getActive(), t = now();
        Object.keys(act).forEach(function(k) {
            var s = act[k];
            if (!s || String(s.code).toUpperCase() !== code) return;
            if (t - new Date(s.lastSeen).getTime() > 90 * 1000) return;
            var box = studentBox[k];
            out.push({ adm: s.admissionNumber, name: s.studentName, key: k, ready: !!(box && box.consentAt && t - box.lastPoll < 45000) });
        });
        out.sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });
        return out;
    }

    app.get('/api/teacher/watch/assessments', requireTeacherAuth, lim, async function(req, res) {
        try {
            var act = getActive(), codes = {}, t = now();
            Object.keys(act).forEach(function(k) { var s = act[k]; if (s && t - new Date(s.lastSeen).getTime() < 90000) codes[String(s.code).toUpperCase()] = (codes[String(s.code).toUpperCase()] || 0) + 1; });
            var list = [];
            for (var code of Object.keys(codes)) {
                var r = await getAssessment(code), a = r && r.data;
                if (a && a.teacher_email === req.teacherEmail && (a.camera_monitoring || a.noise_monitoring)) list.push({ code: code, subject: a.subject, className: a.class_name, online: codes[code], camera: !!a.camera_monitoring, mic: !!a.noise_monitoring });
            }
            res.json({ assessments: list });
        } catch (e) { res.status(500).json({ error: 'Could not load.' }); }
    });

    app.get('/api/teacher/watch/grid', requireTeacherAuth, lim, async function(req, res) {
        try {
            var a = await ownedAssessment(req, res, req.query.code); if (!a) return;
            var code = String(a.code).toUpperCase();
            var all = liveStudents(code), PAGE = 12;
            var page = Math.max(0, parseInt(req.query.page, 10) || 0);
            if (page * PAGE >= all.length) page = Math.max(0, Math.ceil(all.length / PAGE) - 1);
            var slice = all.slice(page * PAGE, page * PAGE + PAGE), since = Number(req.query.since) || 0, t = now();
            var out = slice.map(function(s) {
                var box = studentBox[s.key];
                if (s.ready && a.camera_monitoring) {
                    var was = (wantSnap[s.key] || 0) > t;
                    wantSnap[s.key] = t + 25000;
                    if (!was && box) push(box, { type: 'snap' });
                }
                var sn = snaps[s.key], row = { adm: s.adm, name: s.name, ready: s.ready, at: sn ? sn.at : 0 };
                if (sn && sn.at > since && t - sn.at < 120000) row.img = sn.img;
                return row;
            });
            res.json({ students: out, total: all.length, page: page, pages: Math.max(1, Math.ceil(all.length / PAGE)), camera: !!a.camera_monitoring, mic: !!a.noise_monitoring, serverTime: t });
        } catch (e) { res.status(500).json({ error: 'Could not load the grid.' }); }
    });

    app.get('/api/teacher/watch/ice', requireTeacherAuth, lim, function(req, res) { res.json({ iceServers: iceServers() }); });

    app.post('/api/teacher/watch/start', requireTeacherAuth, lim, async function(req, res) {
        try {
            var a = await ownedAssessment(req, res, (req.body || {}).code); if (!a) return;
            var code = String(a.code).toUpperCase(), key = keyOf(code, (req.body || {}).admissionNumber);
            var box = studentBox[key], t = now();
            if (!box || !box.consentAt || t - box.lastPoll > 45000) return res.status(409).json({ error: 'This student is not available for live watching right now.' });
            // one live view per teacher at a time (saves relay data)
            Object.keys(viewerBox).forEach(function(id) { var v = viewerBox[id]; if (v.teacher === req.teacherEmail) { var sb = studentBox[v.key]; if (sb) push(sb, { type: 'stop', viewer: id }); delete viewerBox[id]; } });
            var id = crypto.randomBytes(9).toString('hex');
            viewerBox[id] = { events: [], waiter: null, teacher: req.teacherEmail, key: key, code: code, started: t };
            push(box, { type: 'viewer', viewer: id });
            res.json({ viewer: id });
        } catch (e) { res.status(500).json({ error: 'Could not start.' }); }
    });
    app.get('/api/teacher/watch/poll', requireTeacherAuth, lim, function(req, res) {
        var v = viewerBox[String(req.query.viewer || '')];
        if (!v || v.teacher !== req.teacherEmail) return res.json({ events: [], ended: true });
        hold(v, res, function() { return false; }, 20000);
    });
    app.post('/api/teacher/watch/send', requireTeacherAuth, lim, function(req, res) {
        var b = req.body || {}, v = viewerBox[String(b.viewer || '')];
        if (!v || v.teacher !== req.teacherEmail) return res.json({ ok: false });
        if (JSON.stringify(b.data || '').length > 30000) return res.status(400).json({ error: 'Too big.' });
        var sb = studentBox[v.key]; if (sb) push(sb, { type: String(b.type || '').slice(0, 12), viewer: String(b.viewer), data: b.data });
        res.json({ ok: true });
    });
    app.post('/api/teacher/watch/stop', requireTeacherAuth, lim, function(req, res) {
        var id = String((req.body || {}).viewer || ''), v = viewerBox[id];
        if (v && v.teacher === req.teacherEmail) { var sb = studentBox[v.key]; if (sb) push(sb, { type: 'stop', viewer: id }); delete viewerBox[id]; }
        res.json({ ok: true });
    });

    // tidy up: live views end after 12 minutes; old pictures and boxes are dropped
    setInterval(function() {
        var t = now();
        Object.keys(viewerBox).forEach(function(id) { var v = viewerBox[id]; if (t - v.started > 12 * 60 * 1000) { var sb = studentBox[v.key]; if (sb) push(sb, { type: 'stop', viewer: id }); push(v, { type: 'ended' }); delete viewerBox[id]; } });
        Object.keys(snaps).forEach(function(k) { if (t - snaps[k].at > 180000) delete snaps[k]; });
        Object.keys(wantSnap).forEach(function(k) { if (wantSnap[k] < t) delete wantSnap[k]; });
        Object.keys(studentBox).forEach(function(k) { if (t - (studentBox[k].lastPoll || 0) > 10 * 60 * 1000) delete studentBox[k]; });
    }, 30000);
    return {};
};
