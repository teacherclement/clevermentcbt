/* ============================================================
   CLEVERMENT PARENT REPORTS (PDF)
   Teacher: Results page -> "Parent reports".
   - One assessment (one subject) report, or an Overall (all subjects) report
   - One student, or the whole class (many pages in one PDF)
   - Performance details + automatic recommendations + teacher's own note
   Made on the teacher's phone with jsPDF: no server work.
   ============================================================ */
(function () {
    'use strict';
    if (window.__cmReportsLoaded) return;
    window.__cmReportsLoaded = true;

    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function norm(s) { return String(s || '').trim().toLowerCase(); }
    function sid(r) { return norm(r.className) + '|' + (norm(r.admissionNumber) || norm(r.studentName)); }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    // jsPDF's built-in fonts only know basic Latin letters, so tidy the text first.
    function T(s) {
        return String(s == null ? '' : s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/[\u2022\u00B7]/g, '-').replace(/\u00A0/g, ' ')
            .replace(/[^\x20-\x7E\u00A1-\u00FF\n]/g, '?');
    }
    function ordinal(n) { var v = n % 100; if (v >= 11 && v <= 13) return n + 'th'; var r = n % 10; return n + (r === 1 ? 'st' : r === 2 ? 'nd' : r === 3 ? 'rd' : 'th'); }
    function fmtDate(iso) { try { var d = iso ? new Date(iso) : new Date(); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }
    function avg(a) { return a.length ? a.reduce(function (s, n) { return s + n; }, 0) / a.length : 0; }
    function round(n) { return Math.round(n); }
    function grade(score) {
        if (score >= 70) return { g: 'A', word: 'Excellent', col: [22, 128, 60] };
        if (score >= 60) return { g: 'B', word: 'Very good', col: [37, 99, 235] };
        if (score >= 50) return { g: 'C', word: 'Good', col: [37, 99, 235] };
        if (score >= 45) return { g: 'D', word: 'Fair', col: [217, 119, 6] };
        if (score >= 40) return { g: 'E', word: 'Pass', col: [217, 119, 6] };
        return { g: 'F', word: 'Needs support', col: [200, 30, 30] };
    }
    function hexToRgb(h) {
        h = String(h || '').replace('#', '');
        if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
        if (!/^[0-9a-fA-F]{6}$/.test(h)) return [30, 58, 138];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    var LOGO = { key: '', data: '', ratio: 1 };
    function brand() {
        var sc = window.cmActiveSchool || null;
        var name = sc && (sc.name || sc.schoolName);
        return { school: !!name, name: name || 'CleverMent Assessment Platform', color: hexToRgb(name ? sc.primaryColor : '#1e3a8a'), logo: LOGO.data, ratio: LOGO.ratio };
    }
    function pngSize(dataUrl) {
        try { var b = atob(dataUrl.split(',')[1].slice(0, 60)); if (b.charCodeAt(1) === 0x50 && b.charCodeAt(2) === 0x4E) { var w = (b.charCodeAt(16) << 24) | (b.charCodeAt(17) << 16) | (b.charCodeAt(18) << 8) | b.charCodeAt(19), h = (b.charCodeAt(20) << 24) | (b.charCodeAt(21) << 16) | (b.charCodeAt(22) << 8) | b.charCodeAt(23); if (w > 0 && h > 0) return w / h; } } catch (e) { }
        return 0;
    }
    function toDataUrl(url) {
        return fetch(url, { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw new Error('x'); return r.blob(); }).then(function (blob) {
            return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(blob); });
        });
    }
    function imgRatio(dataUrl) {
        var r = pngSize(dataUrl); if (r) return Promise.resolve(r);
        return new Promise(function (res) { var im = new Image(); var done = false; function fin(v) { if (!done) { done = true; res(v); } } im.onload = function () { fin(im.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 1); }; im.onerror = function () { fin(1); }; im.src = dataUrl; setTimeout(function () { fin(1); }, 2500); });
    }
    // The school's logo if the school has one; otherwise the CleverMent logo.
    async function ensureLogo() {
        var sc = window.cmActiveSchool || null, url = (sc && (sc.name || sc.schoolName) && sc.logo) ? sc.logo : 'logo.png';
        if (LOGO.key === url && LOGO.data) return;
        LOGO = { key: url, data: '', ratio: 1 };
        try {
            var data = /^data:image/.test(url) ? url : await toDataUrl(url);
            if (!/^data:image\/(png|jpeg|jpg)/i.test(data)) throw new Error('format');
            LOGO = { key: url, data: data, ratio: await imgRatio(data), fmt: /jpe?g/i.test(data.slice(0, 20)) ? 'JPEG' : 'PNG' };
        } catch (e) {
            if (url !== 'logo.png') { LOGO = { key: '', data: '', ratio: 1 }; try { var d2 = await toDataUrl('logo.png'); LOGO = { key: 'logo.png', data: d2, ratio: await imgRatio(d2), fmt: 'PNG' }; } catch (x) { } }
        }
    }
    function teacherName() { try { return (currentTeacher && currentTeacher.name) || ''; } catch (e) { return ''; } }

    // =========================================================
    // THE RECOMMENDATIONS (written from the student's own numbers)
    // =========================================================
    function adviceSingle(c) {
        var s = c.score, out = { summary: '', good: [], improve: [], plan: [], conduct: [] };
        var level = s >= 80 ? 'an outstanding' : s >= 70 ? 'a very good' : s >= 60 ? 'a good' : s >= 50 ? 'a satisfactory' : s >= 40 ? 'a below-expectation' : 'a weak';
        out.summary = c.first + ' scored ' + s + '% in ' + c.subject + ', which is ' + level + ' result (' + c.correct + ' of ' + c.total + ' questions correct). ';
        var d = round(s - c.classAvg);
        if (c.n > 1) out.summary += d >= 5 ? 'This is ' + d + ' points above the class average of ' + round(c.classAvg) + '%. ' : d <= -5 ? 'This is ' + Math.abs(d) + ' points below the class average of ' + round(c.classAvg) + '%. ' : 'This is close to the class average of ' + round(c.classAvg) + '%. ';
        if (c.prevAvg !== null) {
            var ch = round(s - c.prevAvg);
            out.summary += ch >= 5 ? 'It is an improvement of ' + ch + ' points on the earlier results in this subject - well done.' : ch <= -5 ? 'It is ' + Math.abs(ch) + ' points lower than the earlier results in this subject, so some attention is needed now.' : 'It is steady compared with the earlier results in this subject.';
        } else out.summary += 'This is the first recorded assessment in this subject, so it will serve as a starting point.';
        if (s >= 70) out.good.push('Strong overall grasp of ' + c.subject + '.');
        if (c.firstHalf !== null) {
            if (c.firstHalf - c.secondHalf >= 20) out.improve.push('Accuracy dropped in the later questions (' + round(c.firstHalf) + '% in the first half, ' + round(c.secondHalf) + '% in the second). This can mean tiredness, rushing at the end, or running short of time.');
            else if (c.secondHalf - c.firstHalf >= 20) out.improve.push('The first questions were weaker (' + round(c.firstHalf) + '%) than the later ones (' + round(c.secondHalf) + '%). A short warm-up before the assessment and a calm start can help.');
            else out.good.push('Steady accuracy from the first question to the last.');
        }
        if (c.unanswered > 0) out.improve.push(c.unanswered + ' question' + (c.unanswered === 1 ? ' was' : 's were') + ' left unanswered. Attempting every question gives more chances to score.');
        if (c.rushedWrong >= 3) out.improve.push(c.rushedWrong + ' questions were answered very quickly and got wrong. Reading each question and all the options carefully before choosing will improve accuracy.');
        else if (c.avgSec > 0) out.good.push('Reasonable pace of about ' + round(c.avgSec) + ' seconds per question.');
        if (c.slowCount >= 1 && c.avgSec > 0) out.improve.push('A few questions took much longer than the rest (the slowest took ' + round(c.maxSec) + ' seconds). Skipping a hard question and coming back to it saves time.');
        if (c.wrongList.length) out.improve.push('The questions answered wrongly are listed in "Questions to review" below. Going through them with a parent or teacher is the quickest way to improve.');
        if (!out.good.length) out.good.push(c.first + ' completed the assessment and gave an honest attempt.');
        // study plan
        if (s < 40) { out.plan.push('Ask the class teacher for extra support or a short revision plan in ' + c.subject + '.'); out.plan.push('Revise one topic at a time for 20 to 30 minutes each day, starting with the questions listed below.'); out.plan.push('Practise with short quizzes of 10 questions and check the answers straight away.'); }
        else if (s < 50) { out.plan.push('Revise the questions listed below and the topics they come from.'); out.plan.push('Practise 15 to 20 questions twice a week and note the ones that were difficult.'); out.plan.push('Talk to the teacher about any topic that still feels confusing.'); }
        else if (s < 70) { out.plan.push('Retry the questions answered wrongly and make sure the correct answer is understood, not memorised.'); out.plan.push('Take one timed practice set each week to build speed and confidence.'); out.plan.push('Aim to move up one grade at the next assessment.'); }
        else { out.plan.push('Keep up the good work with regular revision.'); out.plan.push('Try harder or past questions to stay challenged.'); out.plan.push('Explaining topics to classmates is a great way to strengthen understanding.'); }
        // conduct
        if (c.showConduct) {
            if (c.tab > 0) out.conduct.push('Left the assessment screen ' + c.tab + ' time' + (c.tab === 1 ? '' : 's') + '. Please encourage staying on the assessment page until it is finished.');
            if (c.proctor > 0) out.conduct.push(c.proctor + ' camera or noise warning' + (c.proctor === 1 ? ' was' : 's were') + ' recorded. Taking the assessment in a quiet place, facing the camera, avoids this.');
            if (c.fast > 0) out.conduct.push(c.fast + ' fast-answer warning' + (c.fast === 1 ? '' : 's') + ' (answers selected very quickly).');
            if (!out.conduct.length) out.conduct.push('No behaviour concerns were recorded during this assessment. Well done.');
        }
        return out;
    }

    function adviceOverall(c) {
        var out = { summary: '', good: [], improve: [], plan: [], conduct: [] };
        var s = c.overallAvg;
        var level = s >= 80 ? 'an outstanding' : s >= 70 ? 'a very good' : s >= 60 ? 'a good' : s >= 50 ? 'a satisfactory' : s >= 40 ? 'a below-expectation' : 'a weak';
        out.summary = c.first + ' has an overall average of ' + round(s) + '% across ' + c.subjects.length + ' subject' + (c.subjects.length === 1 ? '' : 's') + ', which is ' + level + ' performance. ';
        if (c.classOverallAvg !== null && c.peers > 1) out.summary += 'The class overall average is ' + round(c.classOverallAvg) + '%, and ' + c.first + ' is ' + ordinal(c.pos) + ' out of ' + c.peers + ' students. ';
        if (c.best && c.worst && c.best.subject !== c.worst.subject) out.summary += 'The strongest subject is ' + c.best.subject + ' (' + c.best.score + '%) and the subject needing most attention is ' + c.worst.subject + ' (' + c.worst.score + '%).';
        c.subjects.filter(function (x) { return x.score >= 70; }).slice(0, 4).forEach(function (x) { out.good.push('Strong in ' + x.subject + ' (' + x.score + '%).'); });
        c.subjects.filter(function (x) { return x.classAvg !== null && x.score >= x.classAvg + 8; }).slice(0, 2).forEach(function (x) { out.good.push('Well above the class average in ' + x.subject + '.'); });
        c.subjects.filter(function (x) { return x.score < 50; }).slice(0, 4).forEach(function (x) { out.improve.push(x.subject + ' needs attention (' + x.score + '%). ' + (x.change !== null && x.change <= -5 ? 'It has dropped ' + Math.abs(x.change) + ' points since earlier results.' : 'Extra practice and teacher support are recommended.')); });
        c.subjects.filter(function (x) { return x.change !== null && x.change <= -8 && x.score >= 50; }).slice(0, 2).forEach(function (x) { out.improve.push(x.subject + ' has dropped ' + Math.abs(x.change) + ' points compared with earlier results - worth a quick review.'); });
        c.subjects.filter(function (x) { return x.change !== null && x.change >= 8; }).slice(0, 2).forEach(function (x) { out.good.push(x.subject + ' is improving (up ' + x.change + ' points). Keep it up.'); });
        if (!out.good.length) out.good.push(c.first + ' is taking part in the assessments consistently.');
        if (!out.improve.length) out.improve.push('No subject is below 50%. The aim now is to lift every subject a little higher.');
        if (s < 50) { out.plan.push('Set a daily revision time of 30 to 45 minutes, giving most time to the weakest subjects.'); out.plan.push('Meet the class teacher to agree a simple improvement plan for the next term.'); out.plan.push('Practise short quizzes often and check the answers straight away.'); }
        else if (s < 70) { out.plan.push('Spend extra time on the weakest subject each week while keeping up the others.'); out.plan.push('Use timed practice sets to build speed and confidence.'); out.plan.push('Review mistakes after every assessment so they are not repeated.'); }
        else { out.plan.push('Keep a regular study routine across all subjects.'); out.plan.push('Try harder or past questions to stay challenged.'); out.plan.push('Help classmates with topics where you are strong, as teaching others deepens understanding.'); }
        if (c.showConduct) {
            if (c.tab > 0) out.conduct.push('Left the assessment screen ' + c.tab + ' time' + (c.tab === 1 ? '' : 's') + ' across all assessments.');
            if (c.proctor > 0) out.conduct.push(c.proctor + ' camera or noise warning' + (c.proctor === 1 ? ' was' : 's were') + ' recorded across all assessments.');
            if (c.fast > 0) out.conduct.push(c.fast + ' fast-answer warning' + (c.fast === 1 ? '' : 's') + ' recorded across all assessments.');
            if (!out.conduct.length) out.conduct.push('No behaviour concerns were recorded in any assessment. Well done.');
        }
        return out;
    }

    // =========================================================
    // PDF DRAWING
    // =========================================================
    var PW = 210, PH = 297, M = 14;
    function Pdf(jsPDFCtor) {
        this.doc = new jsPDFCtor('portrait', 'mm', 'a4');
        this.y = M; this.b = brand();
    }
    Pdf.prototype.fill = function (c) { this.doc.setFillColor(c[0], c[1], c[2]); };
    Pdf.prototype.color = function (c) { this.doc.setTextColor(c[0], c[1], c[2]); };
    Pdf.prototype.stroke = function (c) { this.doc.setDrawColor(c[0], c[1], c[2]); };
    Pdf.prototype.ensure = function (h) { if (this.y + h > PH - 16) this.page(); };
    Pdf.prototype.page = function () { this.doc.addPage(); this.y = M; };
    Pdf.prototype.header = function (title, sub) {
        var d = this.doc, tx = M;
        this.fill(this.b.color); d.rect(0, 0, PW, 34, 'F');
        if (this.b.logo) {
            var bh = 24, ih = bh - 4, iw = Math.min(30, ih * (this.b.ratio || 1)), ih2 = iw / (this.b.ratio || 1), bw = iw + 4;
            try {
                this.fill([255, 255, 255]); d.roundedRect(M, 5, bw, bh, 2.5, 2.5, 'F');
                d.addImage(this.b.logo, (LOGO.fmt || 'PNG'), M + 2, 5 + (bh - ih2) / 2, iw, ih2);
                tx = M + bw + 5;
            } catch (e) { tx = M; }
        }
        this.color([255, 255, 255]);
        d.setFont('helvetica', 'bold'); d.setFontSize(this.b.name.length > 30 ? 13 : 16); d.text(T(this.b.name), tx, 15, { maxWidth: PW - tx - M });
        d.setFont('helvetica', 'normal'); d.setFontSize(11); d.text(T(title), tx, 22);
        d.setFontSize(9); d.text(T(sub), tx, 28, { maxWidth: PW - tx - M });
        this.y = 42;
    };
    Pdf.prototype.h2 = function (text) {
        this.ensure(14);
        this.fill(this.b.color); this.doc.rect(M, this.y - 4.5, 1.6, 6.5, 'F');
        this.color([30, 41, 59]); this.doc.setFont('helvetica', 'bold'); this.doc.setFontSize(12.5);
        this.doc.text(T(text), M + 4, this.y); this.y += 7;
    };
    Pdf.prototype.para = function (text, size, col, indent, bold) {
        var d = this.doc; size = size || 10; indent = indent || 0;
        d.setFont('helvetica', bold ? 'bold' : 'normal'); d.setFontSize(size); this.color(col || [55, 65, 81]);
        var lines = d.splitTextToSize(T(text), PW - 2 * M - indent), lh = size * 0.45;
        for (var i = 0; i < lines.length; i++) { this.ensure(lh + 1); d.text(lines[i], M + indent, this.y); this.y += lh + 0.9; }
        this.y += 1.2;
    };
    Pdf.prototype.bullets = function (list, col) {
        var d = this.doc;
        for (var i = 0; i < list.length; i++) {
            var lines = d.splitTextToSize(T(list[i]), PW - 2 * M - 6);
            d.setFont('helvetica', 'normal'); d.setFontSize(10);
            this.ensure(lines.length * 5 + 1);
            this.fill(col || this.b.color); d.circle(M + 1.6, this.y - 1.2, 0.9, 'F');
            this.color([55, 65, 81]);
            for (var k = 0; k < lines.length; k++) { d.text(lines[k], M + 5, this.y); this.y += 4.9; }
            this.y += 1;
        }
        this.y += 1;
    };
    Pdf.prototype.cards = function (items) {
        var d = this.doc, n = items.length, gap = 3, w = (PW - 2 * M - gap * (n - 1)) / n, h = 22;
        this.ensure(h + 4);
        for (var i = 0; i < n; i++) {
            var x = M + i * (w + gap);
            this.fill([244, 247, 252]); this.stroke([219, 227, 240]); d.roundedRect(x, this.y, w, h, 2, 2, 'FD');
            this.color([100, 116, 139]); d.setFont('helvetica', 'normal'); d.setFontSize(8); d.text(T(items[i].label), x + w / 2, this.y + 6, { align: 'center' });
            this.color(items[i].col || [30, 41, 59]); d.setFont('helvetica', 'bold'); d.setFontSize(items[i].small ? 12 : 16); d.text(T(items[i].value), x + w / 2, this.y + 15, { align: 'center' });
            if (items[i].note) { this.color([100, 116, 139]); d.setFont('helvetica', 'normal'); d.setFontSize(7.5); d.text(T(items[i].note), x + w / 2, this.y + 19.5, { align: 'center' }); }
        }
        this.y += h + 5;
    };
    Pdf.prototype.hbars = function (rows, max) {
        var d = this.doc, lw = 38, bw = PW - 2 * M - lw - 14;
        for (var i = 0; i < rows.length; i++) {
            this.ensure(8);
            this.color([55, 65, 81]); d.setFont('helvetica', 'normal'); d.setFontSize(9); d.text(T(rows[i].label), M, this.y + 3.5);
            this.fill([232, 236, 244]); d.roundedRect(M + lw, this.y, bw, 5, 1, 1, 'F');
            var w = Math.max(0.5, bw * Math.min(1, rows[i].value / (max || 100)));
            this.fill(rows[i].col); d.roundedRect(M + lw, this.y, w, 5, 1, 1, 'F');
            this.color([30, 41, 59]); d.setFont('helvetica', 'bold'); d.text(round(rows[i].value) + '%', M + lw + bw + 2, this.y + 4);
            this.y += 8;
        }
        this.y += 2;
    };
    // vertical bars (history). points: [{label, value}], with a dashed pass-mark line.
    Pdf.prototype.vbars = function (points, pass) {
        var d = this.doc, ch = 34, w = PW - 2 * M, n = points.length;
        this.ensure(ch + 14);
        var bw = Math.min(18, (w - 10) / n - 4), x0 = M + 8, base = this.y + ch;
        this.stroke([226, 232, 240]); d.line(M + 6, base, M + w, base);
        if (pass > 0) { this.stroke([220, 38, 38]); d.setLineDashPattern([1.2, 1.2], 0); var py = base - ch * pass / 100; d.line(M + 6, py, M + w, py); d.setLineDashPattern([], 0); this.color([220, 38, 38]); d.setFontSize(7); d.setFont('helvetica', 'normal'); d.text('pass ' + pass + '%', M + w - 1, py - 1, { align: 'right' }); }
        var gapx = (w - 10 - n * bw) / Math.max(1, n);
        for (var i = 0; i < n; i++) {
            var x = x0 + i * (bw + gapx), h = Math.max(0.5, ch * points[i].value / 100);
            this.fill(points[i].cur ? this.b.color : [147, 170, 214]); d.roundedRect(x, base - h, bw, h, 1, 1, 'F');
            this.color([30, 41, 59]); d.setFont('helvetica', 'bold'); d.setFontSize(8); d.text(String(round(points[i].value)), x + bw / 2, base - h - 1.2, { align: 'center' });
            this.color([100, 116, 139]); d.setFont('helvetica', 'normal'); d.setFontSize(7); d.text(T(points[i].label), x + bw / 2, base + 4, { align: 'center' });
        }
        this.y = base + 9;
    };
    Pdf.prototype.strip = function (flags) {
        var d = this.doc, sz = 4.6, gap = 1, per = Math.floor((PW - 2 * M) / (sz + gap));
        for (var i = 0; i < flags.length; i++) {
            if (i % per === 0) { this.ensure(sz + 2); if (i > 0) this.y += sz + gap; }
            var x = M + (i % per) * (sz + gap);
            this.fill(flags[i] === 1 ? [34, 160, 80] : flags[i] === 0 ? [220, 60, 60] : [203, 213, 225]); d.rect(x, this.y, sz, sz, 'F');
        }
        this.y += sz + 3;
        this.color([100, 116, 139]); d.setFont('helvetica', 'normal'); d.setFontSize(8);
        d.text('Green = correct   Red = wrong   Grey = not answered (questions in the order the student saw them)', M, this.y + 2); this.y += 7;
    };
    Pdf.prototype.note = function (text, teacher) {
        var d = this.doc; if (!text) return;
        this.h2("Teacher's note");
        var lines = d.splitTextToSize(T(text), PW - 2 * M - 8); d.setFontSize(10);
        var h = lines.length * 4.9 + 8; this.ensure(h + 2);
        this.fill([255, 251, 235]); this.stroke([240, 214, 140]); d.roundedRect(M, this.y, PW - 2 * M, h, 2, 2, 'FD');
        this.color([66, 55, 20]); d.setFont('helvetica', 'normal');
        for (var i = 0; i < lines.length; i++) d.text(lines[i], M + 4, this.y + 6 + i * 4.9);
        this.y += h + 3;
        if (teacher) { this.color([100, 116, 139]); d.setFont('helvetica', 'italic'); d.setFontSize(9); d.text('- ' + T(teacher), PW - M, this.y, { align: 'right' }); this.y += 6; }
    };
    Pdf.prototype.footers = function () {
        var d = this.doc, n = d.getNumberOfPages(), when = fmtDate();
        for (var i = 1; i <= n; i++) {
            d.setPage(i); this.color([140, 150, 165]); d.setFont('helvetica', 'normal'); d.setFontSize(8);
            d.text('Generated by CleverMent on ' + when, M, PH - 8); d.text('Page ' + i + ' of ' + n, PW - M, PH - 8, { align: 'right' });
        }
    };

    // =========================================================
    // DATA
    // =========================================================
    function singleContext(row, group, all, raw, opts) {
        var scores = group.map(function (r) { return Number(r.score) || 0; });
        var s = Number(row.score) || 0;
        var pos = 1 + scores.filter(function (x) { return x > s; }).length;
        var hist = all.filter(function (r) { return sid(r) === sid(row) && norm(r.subject) === norm(row.subject) && r.id !== row.id && r.id < row.id; })
            .sort(function (a, b) { return a.id - b.id; });
        var prevScores = hist.map(function (r) { return Number(r.score) || 0; });
        var ans = raw && raw[row.id];
        var qC = Array.isArray(row.qCorrect) ? row.qCorrect.slice() : [];
        var flags = qC.slice();
        var wrongList = [], unanswered = 0, rushedWrong = 0, secs = [];
        if (Array.isArray(ans)) {
            flags = ans.map(function (a) { return (a && a.userAnswerText === '') ? -1 : (a && a.isCorrect ? 1 : 0); });
            ans.forEach(function (a, i) {
                if (!a) return;
                if (a.userAnswerText === '') unanswered++;
                if (!a.isCorrect) wrongList.push(a);
                if (typeof a.timeSeconds === 'number') { secs.push(a.timeSeconds); if (!a.isCorrect && a.userAnswerText !== '' && a.timeSeconds < 8) rushedWrong++; }
            });
        } else if (Array.isArray(row.qTimes)) { row.qTimes.forEach(function (t) { if (typeof t === 'number') secs.push(t); }); }
        var half = Math.floor(qC.length / 2), fh = null, sh = null;
        if (qC.length >= 8) { fh = avg(qC.slice(0, half)) * 100; sh = avg(qC.slice(half)) * 100; }
        var as = avg(secs), mx = secs.length ? Math.max.apply(null, secs) : 0;
        var first = String(row.studentName || 'The student').split(/\s+/)[0];
        return {
            kind: 'single', row: row, subject: row.subject, first: first, score: s, correct: row.correctAnswers, total: row.totalQuestions,
            n: group.length, classAvg: avg(scores), hi: Math.max.apply(null, scores), lo: Math.min.apply(null, scores), pos: pos,
            passMark: row.passMark != null ? row.passMark : 50, hist: hist.slice(-5), prevAvg: prevScores.length ? avg(prevScores.slice(-3)) : null,
            pronounPoss: 'earlier', flags: flags, wrongList: wrongList, unanswered: unanswered, rushedWrong: rushedWrong, avgSec: as, maxSec: mx,
            slowCount: as > 0 ? secs.filter(function (t) { return t > as * 3 && t > 40; }).length : 0, firstHalf: fh, secondHalf: sh,
            tab: row.tabSwitches || 0, proctor: row.proctorViolations || 0, fast: row.fastAnswerWarnings || 0, showConduct: opts.conduct, note: opts.note
        };
    }
    function overallContext(row, classRows, opts) {
        // latest result per subject for every student in the class
        var byStudent = {};
        classRows.slice().sort(function (a, b) { return a.id - b.id; }).forEach(function (r) {
            var k = sid(r); (byStudent[k] = byStudent[k] || { subj: {}, hist: {}, tab: 0, proctor: 0, fast: 0 });
            var sj = norm(r.subject);
            (byStudent[k].hist[sj] = byStudent[k].hist[sj] || []).push(Number(r.score) || 0);
            byStudent[k].subj[sj] = r; byStudent[k].tab += r.tabSwitches || 0; byStudent[k].proctor += r.proctorViolations || 0; byStudent[k].fast += r.fastAnswerWarnings || 0;
        });
        var me = byStudent[sid(row)];
        var subjScores = {};   // subject -> [latest scores of everyone]
        Object.keys(byStudent).forEach(function (k) { Object.keys(byStudent[k].subj).forEach(function (sj) { (subjScores[sj] = subjScores[sj] || []).push(Number(byStudent[k].subj[sj].score) || 0); }); });
        var subjects = Object.keys(me.subj).map(function (sj) {
            var r = me.subj[sj], h = me.hist[sj], sc = Number(r.score) || 0, list = subjScores[sj] || [];
            var ch = h.length > 1 ? round(sc - avg(h.slice(0, -1))) : null;
            return { subject: r.subject, score: round(sc), classAvg: list.length > 1 ? avg(list) : null, pos: 1 + list.filter(function (x) { return x > sc; }).length, n: list.length, change: ch };
        }).sort(function (a, b) { return a.subject.localeCompare(b.subject); });
        var overall = Object.keys(byStudent).map(function (k) { return { k: k, avg: avg(Object.keys(byStudent[k].subj).map(function (sj) { return Number(byStudent[k].subj[sj].score) || 0; })) }; });
        var myAvg = avg(subjects.map(function (x) { return x.score; }));
        var sorted = subjects.slice().sort(function (a, b) { return b.score - a.score; });
        var first = String(row.studentName || 'The student').split(/\s+/)[0];
        return {
            kind: 'overall', row: row, first: first, subjects: subjects, overallAvg: myAvg, classOverallAvg: overall.length > 1 ? avg(overall.map(function (o) { return o.avg; })) : null,
            peers: overall.length, pos: 1 + overall.filter(function (o) { return o.avg > myAvg; }).length, best: sorted[0], worst: sorted[sorted.length - 1],
            tab: me.tab, proctor: me.proctor, fast: me.fast, showConduct: opts.conduct, note: opts.note
        };
    }

    // =========================================================
    // PAGES
    // =========================================================
    function drawStudentBlock(P, row, extra) {
        var d = P.doc;
        P.fill([248, 250, 253]); P.stroke([226, 232, 240]); d.roundedRect(M, P.y, PW - 2 * M, 19, 2, 2, 'FD');
        P.color([30, 41, 59]); d.setFont('helvetica', 'bold'); d.setFontSize(13); d.text(T(row.studentName), M + 4, P.y + 8);
        P.color([100, 116, 139]); d.setFont('helvetica', 'normal'); d.setFontSize(9);
        d.text(T('Admission No: ' + (row.admissionNumber || '-') + '    Class: ' + row.className), M + 4, P.y + 14.5);
        if (extra) d.text(T(extra), PW - M - 4, P.y + 14.5, { align: 'right' });
        P.y += 25;
    }
    function drawSingle(P, c) {
        var row = c.row, g = grade(c.score), passed = c.score >= c.passMark;
        P.header('Student Performance Report', row.subject + '  |  ' + row.className + '  |  ' + fmtDate(row.createdAt));
        drawStudentBlock(P, row, 'Assessment code: ' + row.assessmentCode);
        P.cards([
            { label: 'SCORE', value: c.score + '%', col: g.col, note: (passed ? 'Passed' : 'Below pass mark') + ' (' + c.passMark + '%)' },
            { label: 'GRADE', value: g.g, col: g.col, note: g.word },
            { label: 'POSITION', value: c.n > 1 ? ordinal(c.pos) : '-', note: c.n > 1 ? 'out of ' + c.n : 'only result' },
            { label: 'CORRECT', value: c.correct + ' / ' + c.total, small: true, note: 'questions' }
        ]);
        P.h2('How the score compares');
        var rows = [{ label: 'This student', value: c.score, col: g.col }];
        if (c.n > 1) { rows.push({ label: 'Class average', value: c.classAvg, col: [100, 116, 139] }); rows.push({ label: 'Highest in class', value: c.hi, col: [34, 160, 80] }); rows.push({ label: 'Lowest in class', value: c.lo, col: [203, 213, 225] }); }
        P.hbars(rows, 100);
        var tl = row.timeTaken ? 'Time taken: ' + row.timeTaken + '.   ' : '';
        P.para(tl + (c.avgSec > 0 ? 'Average time per question: ' + round(c.avgSec) + ' seconds.' : ''), 9.5, [100, 116, 139]);
        if (c.hist.length) {
            P.h2('Progress in ' + row.subject);
            var all = c.hist.map(function (r) { return { label: new Date(r.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), value: Number(r.score) || 0 }; });
            all.push({ label: 'This one', value: c.score, cur: true });
            P.vbars(all, c.passMark);
        }
        if (c.flags.length) { P.h2('Question by question'); P.strip(c.flags); }
        var adv = adviceSingle(c);
        P.h2('Summary'); P.para(adv.summary, 10.5, [31, 41, 55]);
        if (adv.good.length) { P.h2('Strengths'); P.bullets(adv.good, [34, 160, 80]); }
        if (adv.improve.length) { P.h2('Areas to improve'); P.bullets(adv.improve, [217, 119, 6]); }
        if (c.wrongList.length) {
            P.h2('Questions to review');
            c.wrongList.slice(0, 8).forEach(function (a, i) {
                var q = String(a.question || '').replace(/\s+/g, ' ').slice(0, 220);
                P.ensure(20);
                P.para((i + 1) + '. ' + q, 9.5, [30, 41, 59], 0, true);
                P.para('Answered: ' + (a.userAnswerText ? String(a.userAnswerText).slice(0, 120) : '(no answer)') + '     Correct answer: ' + String(a.correctAnswerText || '').slice(0, 120), 9, [75, 85, 99], 3);
                if (a.explanation) P.para('Why: ' + String(a.explanation).slice(0, 240), 8.5, [100, 116, 139], 3);
            });
            if (c.wrongList.length > 8) P.para('...and ' + (c.wrongList.length - 8) + ' more. Ask the teacher for the full list.', 9, [100, 116, 139]);
        }
        P.h2('Recommended next steps'); P.bullets(adv.plan);
        if (c.showConduct) { P.h2('Conduct during the assessment'); P.cards([{ label: 'SCREEN LEAVES', value: String(c.tab), col: c.tab ? [217, 119, 6] : [34, 160, 80] }, { label: 'CAMERA / NOISE', value: String(c.proctor), col: c.proctor ? [217, 119, 6] : [34, 160, 80] }, { label: 'FAST ANSWERS', value: String(c.fast), col: c.fast ? [217, 119, 6] : [34, 160, 80] }]); P.bullets(adv.conduct); }
        P.note(c.note, teacherName());
    }
    function drawOverall(P, c) {
        var row = c.row, g = grade(c.overallAvg);
        P.header('Overall Student Progress Report', row.className + '  |  ' + fmtDate());
        drawStudentBlock(P, row, c.subjects.length + ' subject' + (c.subjects.length === 1 ? '' : 's') + ' assessed');
        P.cards([
            { label: 'OVERALL AVERAGE', value: round(c.overallAvg) + '%', col: g.col, note: g.word },
            { label: 'GRADE', value: g.g, col: g.col },
            { label: 'CLASS POSITION', value: c.peers > 1 ? ordinal(c.pos) : '-', note: c.peers > 1 ? 'out of ' + c.peers : '' },
            { label: 'CLASS AVERAGE', value: c.classOverallAvg !== null ? round(c.classOverallAvg) + '%' : '-', small: true }
        ]);
        P.h2('Results by subject');
        var d = P.doc, cols = [M, M + 62, M + 88, M + 112, M + 140];
        P.fill([241, 245, 251]); d.rect(M, P.y - 4.5, PW - 2 * M, 7, 'F'); P.color([71, 85, 105]); d.setFont('helvetica', 'bold'); d.setFontSize(8.5);
        ['SUBJECT', 'SCORE', 'GRADE', 'CLASS AVG', 'POSITION / TREND'].forEach(function (h, i) { d.text(h, cols[i] + 1.5, P.y); }); P.y += 6;
        c.subjects.forEach(function (x) {
            P.ensure(8); var gg = grade(x.score);
            P.color([30, 41, 59]); d.setFont('helvetica', 'normal'); d.setFontSize(9.5); d.text(T(x.subject).slice(0, 30), cols[0] + 1.5, P.y);
            d.setFont('helvetica', 'bold'); P.color(gg.col); d.text(x.score + '%', cols[1] + 1.5, P.y); d.text(gg.g, cols[2] + 1.5, P.y);
            P.color([71, 85, 105]); d.setFont('helvetica', 'normal'); d.text(x.classAvg !== null ? round(x.classAvg) + '%' : '-', cols[3] + 1.5, P.y);
            var tr = x.change === null ? '' : (x.change > 0 ? '  up ' + x.change : x.change < 0 ? '  down ' + Math.abs(x.change) : '  steady');
            d.text(T((x.n > 1 ? ordinal(x.pos) + ' of ' + x.n : '-') + tr), cols[4] + 1.5, P.y);
            P.stroke([232, 236, 244]); d.line(M, P.y + 2.2, PW - M, P.y + 2.2); P.y += 7;
        });
        P.y += 3;
        P.h2('Subjects compared with the class');
        c.subjects.forEach(function (x) {
            P.ensure(14); var gg = grade(x.score);
            P.color([55, 65, 81]); d.setFont('helvetica', 'bold'); d.setFontSize(9); d.text(T(x.subject).slice(0, 40), M, P.y); P.y += 1.5;
            var bw = PW - 2 * M - 14;
            P.fill([232, 236, 244]); d.roundedRect(M, P.y, bw, 3.6, 0.8, 0.8, 'F'); P.fill(gg.col); d.roundedRect(M, P.y, Math.max(0.5, bw * x.score / 100), 3.6, 0.8, 0.8, 'F');
            if (x.classAvg !== null) { P.stroke([30, 41, 59]); d.setLineWidth(0.5); d.line(M + bw * x.classAvg / 100, P.y - 1, M + bw * x.classAvg / 100, P.y + 4.6); d.setLineWidth(0.2); }
            P.color([30, 41, 59]); d.setFontSize(8.5); d.text(x.score + '%', M + bw + 2, P.y + 3); P.y += 8.5;
        });
        P.color([100, 116, 139]); d.setFont('helvetica', 'normal'); d.setFontSize(8); d.text('The dark tick on each bar marks the class average.', M, P.y); P.y += 6;
        var adv = adviceOverall(c);
        P.h2('Summary'); P.para(adv.summary, 10.5, [31, 41, 55]);
        P.h2('Strengths'); P.bullets(adv.good, [34, 160, 80]);
        P.h2('Areas to improve'); P.bullets(adv.improve, [217, 119, 6]);
        P.h2('Recommended next steps'); P.bullets(adv.plan);
        if (c.showConduct) { P.h2('Conduct during assessments'); P.cards([{ label: 'SCREEN LEAVES', value: String(c.tab), col: c.tab ? [217, 119, 6] : [34, 160, 80] }, { label: 'CAMERA / NOISE', value: String(c.proctor), col: c.proctor ? [217, 119, 6] : [34, 160, 80] }, { label: 'FAST ANSWERS', value: String(c.fast), col: c.fast ? [217, 119, 6] : [34, 160, 80] }]); P.bullets(adv.conduct); }
        P.note(c.note, teacherName());
    }

    // =========================================================
    // THE SCREEN
    // =========================================================
    var css = '#cmrOv{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9400;display:none;align-items:flex-end;justify-content:center}#cmrOv.on{display:flex}' +
        '#cmrBox{background:#fff;color:#1f2328;width:min(520px,100%);max-height:92vh;overflow-y:auto;border-radius:18px 18px 0 0;padding:18px 16px calc(env(safe-area-inset-bottom,0px) + 18px);font-family:Inter,Arial,sans-serif}' +
        '@media(min-width:700px){#cmrOv{align-items:center}#cmrBox{border-radius:18px}}' +
        'html[data-cm-dark] #cmrBox{background:#1c2026;color:#e8ebf0}' +
        '#cmrBox h3{margin:0 0 4px;font-size:18px}#cmrBox label{display:block;font-weight:600;font-size:13px;margin:12px 0 5px}' +
        '#cmrBox select,#cmrBox textarea{width:100%;padding:10px;border:1px solid #cfd6e4;border-radius:9px;font:inherit;font-size:14px;box-sizing:border-box;background:#fff;color:#1f2328}' +
        'html[data-cm-dark] #cmrBox select,html[data-cm-dark] #cmrBox textarea{background:#252b34;color:#e8ebf0;border-color:#3a4252}' +
        '.cmr-seg{display:flex;gap:8px}.cmr-seg button{flex:1;padding:10px;border:1.5px solid #cfd6e4;background:transparent;color:inherit;border-radius:9px;font:600 13px Inter,Arial,sans-serif;cursor:pointer}.cmr-seg button.on{border-color:#1e3a8a;background:#e8f0ff;color:#1e3a8a}' +
        'html[data-cm-dark] .cmr-seg button.on{background:#1f2c47;color:#9db7ff;border-color:#6ea0ff}' +
        '.cmr-row{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}.cmr-btn{flex:1;min-width:130px;background:#1e3a8a;color:#fff;border:0;border-radius:10px;padding:12px;font:600 14px Inter,Arial,sans-serif;cursor:pointer}.cmr-btn.ghost{background:transparent;color:inherit;border:1px solid #cfd6e4}.cmr-btn:disabled{opacity:.55}' +
        '.cmr-help{font-size:12.5px;color:#667085;margin-top:4px}#cmrStatus{margin-top:12px;font-size:13px;min-height:18px}';
    var built = false;
    function build() {
        if (built) return; built = true;
        var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
        var ov = document.createElement('div'); ov.id = 'cmrOv';
        ov.innerHTML = '<div id="cmrBox"><h3>📄 Parent reports (PDF)</h3><div class="cmr-help">Make a report to send to parents on WhatsApp.</div>' +
            '<label>Report type</label><div class="cmr-seg" id="cmrType"><button type="button" data-v="single" class="on">One assessment</button><button type="button" data-v="overall">Overall (all subjects)</button></div>' +
            '<label>Class</label><select id="cmrClass"></select>' +
            '<div id="cmrAsmWrap"><label>Assessment</label><select id="cmrAsm"></select></div>' +
            '<label>Student</label><select id="cmrStu"></select><div class="cmr-help" id="cmrStuHelp"></div>' +
            '<label>Behaviour information (screen leaves, camera and noise flags)</label><select id="cmrCond"><option value="1">Include on the report</option><option value="0">Leave out</option></select>' +
            '<label>Your note to the parent (optional)</label><textarea id="cmrNote" rows="3" maxlength="600" placeholder="For example: Ada is a hardworking pupil. Please help her practise fractions at home."></textarea>' +
            '<div id="cmrStatus"></div><div class="cmr-row"><button type="button" class="cmr-btn ghost" id="cmrClose">Close</button><button type="button" class="cmr-btn" id="cmrShare" style="display:none">Share (WhatsApp)</button><button type="button" class="cmr-btn" id="cmrGo">Download PDF</button></div></div>';
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
        $('cmrClose').addEventListener('click', close);
        $('cmrType').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); fillAssessments(); fillStudents(); });
        $('cmrClass').addEventListener('change', function () { fillAssessments(); fillStudents(); });
        $('cmrAsm').addEventListener('change', fillStudents);
        $('cmrStu').addEventListener('change', syncButtons);
        $('cmrGo').addEventListener('click', function () { run(false); });
        $('cmrShare').addEventListener('click', function () { run(true); });
    }
    function type() { var b = document.querySelector('#cmrType button.on'); return b ? b.getAttribute('data-v') : 'single'; }
    function rows() { try { return (typeof teacherResultsCache !== 'undefined' && teacherResultsCache) ? teacherResultsCache : []; } catch (e) { return []; } }
    function open() {
        build(); var r = rows();
        $('cmrOv').classList.add('on'); $('cmrStatus').textContent = '';
        if (!r.length) { $('cmrStatus').textContent = 'No results yet. Reports appear once students have submitted.'; }
        var classes = []; r.forEach(function (x) { if (classes.indexOf(x.className) === -1) classes.push(x.className); }); classes.sort();
        $('cmrClass').innerHTML = classes.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
        fillAssessments(); fillStudents();
    }
    function close() { $('cmrOv').classList.remove('on'); }
    function fillAssessments() {
        var wrap = $('cmrAsmWrap'); wrap.style.display = type() === 'single' ? '' : 'none';
        var cls = $('cmrClass').value, seen = {}, list = [];
        rows().forEach(function (r) { if (r.className === cls && !seen[r.assessmentCode]) { seen[r.assessmentCode] = 1; list.push({ code: r.assessmentCode, subject: r.subject, id: r.id }); } });
        list.sort(function (a, b) { return b.id - a.id; });
        $('cmrAsm').innerHTML = list.map(function (a) { return '<option value="' + esc(a.code) + '">' + esc(a.subject) + ' (' + esc(a.code) + ')</option>'; }).join('');
    }
    function pool() {
        var cls = $('cmrClass').value, code = $('cmrAsm').value;
        return rows().filter(function (r) { return r.className === cls && (type() === 'overall' || r.assessmentCode === code); });
    }
    function fillStudents() {
        var seen = {}, list = [];
        pool().forEach(function (r) { var k = sid(r); if (!seen[k]) { seen[k] = 1; list.push({ k: k, name: r.studentName }); } });
        list.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
        $('cmrStu').innerHTML = '<option value="__all">All students in this ' + (type() === 'single' ? 'assessment' : 'class') + ' (' + list.length + ')</option>' + list.map(function (s) { return '<option value="' + esc(s.k) + '">' + esc(s.name) + '</option>'; }).join('');
        syncButtons();
    }
    function syncButtons() {
        var all = $('cmrStu').value === '__all';
        $('cmrShare').style.display = (!all && navigator.canShare) ? '' : 'none';
        $('cmrStuHelp').textContent = all ? 'One PDF with a page set for every student (more than 40 students are split into several files).' : '';
        $('cmrGo').textContent = all ? 'Download class PDF' : 'Download PDF';
    }
    function status(t) { $('cmrStatus').textContent = t; }

    async function loadRaw(code) {
        try {
            var r = await supabase.from('cleverment_results').select('id,answers').eq('assessment_code', code);
            var map = {}; ((r && r.data) || []).forEach(function (x) { map[x.id] = x.answers; }); return map;
        } catch (e) { return {}; }
    }
    async function run(share) {
        var jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!jsPDFCtor) { status('The PDF tool did not load. Check your internet and reload the page.'); return; }
        var btn = $('cmrGo'); btn.disabled = true; $('cmrShare').disabled = true;
        try {
            var opts = { conduct: $('cmrCond').value === '1', note: $('cmrNote').value.trim() };
            var kind = type(), cls = $('cmrClass').value, code = $('cmrAsm').value, pick = $('cmrStu').value;
            var all = rows(), chosen = pool();
            var latest = {}; chosen.slice().sort(function (a, b) { return a.id - b.id; }).forEach(function (r) { latest[sid(r)] = r; });
            var targets = Object.keys(latest).map(function (k) { return latest[k]; }).sort(function (a, b) { return String(a.studentName).localeCompare(String(b.studentName)); });
            if (pick !== '__all') targets = targets.filter(function (r) { return sid(r) === pick; });
            if (!targets.length) { status('Nothing to report for this choice.'); return; }
            status('Getting the details...');
            await ensureLogo();
            var raw = kind === 'single' ? await loadRaw(code) : null;
            var classRows = all.filter(function (r) { return r.className === cls; });
            var group = kind === 'single' ? classRows.filter(function (r) { return r.assessmentCode === code; }) : null;
            var CH = 40, parts = Math.ceil(targets.length / CH), files = [];
            for (var p = 0; p < parts; p++) {
                var P = new Pdf(jsPDFCtor), slice = targets.slice(p * CH, p * CH + CH);
                for (var i = 0; i < slice.length; i++) {
                    if (i > 0) P.page();
                    status('Preparing report ' + (p * CH + i + 1) + ' of ' + targets.length + '...');
                    var c = kind === 'single' ? singleContext(slice[i], group, all, raw, opts) : overallContext(slice[i], classRows, opts);
                    if (kind === 'single') drawSingle(P, c); else drawOverall(P, c);
                    if (i % 4 === 3) await sleep(0);
                }
                P.footers();
                var base = pick !== '__all' ? ('Report_' + targets[0].studentName + (kind === 'single' ? '_' + targets[0].subject : '_Overall')) : ('Reports_' + cls + (kind === 'single' ? '_' + targets[0].subject : '_Overall') + (parts > 1 ? '_part' + (p + 1) : ''));
                files.push({ name: base.replace(/[^A-Za-z0-9_\-]+/g, '_') + '.pdf', doc: P.doc });
            }
            for (var f = 0; f < files.length; f++) {
                if (share && navigator.canShare && files.length === 1) {
                    var blob = files[f].doc.output('blob'), file = new File([blob], files[f].name, { type: 'application/pdf' });
                    if (navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Student report' }); status('Shared.'); continue; } catch (e) { if (e && e.name === 'AbortError') { status(''); continue; } } }
                }
                files[f].doc.save(files[f].name); await sleep(400);
            }
            status(share ? 'Done.' : 'Done. Your PDF' + (files.length > 1 ? 's are' : ' is') + ' in your downloads.');
        } catch (e) { status('Could not make the report: ' + (e && e.message ? e.message : e)); }
        finally { btn.disabled = false; $('cmrShare').disabled = false; }
    }

    function ensureButton() {
        if ($('cmrOpenBtn')) return;
        var host = document.querySelector('#adminSection .admin-controls'); if (!host) return;
        var b = document.createElement('button'); b.type = 'button'; b.id = 'cmrOpenBtn'; b.className = 'primary-btn'; b.textContent = '📄 Parent reports';
        b.addEventListener('click', open); host.insertBefore(b, host.firstChild);
    }
    setInterval(ensureButton, 2000);
})();
