/* CleverMent futuristic skin - helper script.
   1) Lighter effects on slower phones.
   2) Repaints colours that the app writes directly into elements (inline styles) so
      nothing stays white or unreadable in Neon Night mode. Light (Ice) mode is left untouched. */
(function () {
    'use strict';
    var root = document.documentElement;
    try {
        var slow = (navigator.deviceMemory && navigator.deviceMemory <= 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
        if (slow) root.classList.add('fx-lite');
    } catch (e) { }

    function dark() { return root.hasAttribute('data-cm-dark'); }
    function hls(r, g, b) { r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn; if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, l, s]; }
    function css(h, s, l, a) { h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l)); var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0; if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; } var R = Math.round((r + m) * 255), G = Math.round((g + m) * 255), B = Math.round((b + m) * 255); return a >= 0.999 ? 'rgb(' + R + ',' + G + ',' + B + ')' : 'rgba(' + R + ',' + G + ',' + B + ',' + (+a.toFixed(2)) + ')'; }
    var MAP = {
        bg: function (r, g, b, a) {
            var q = hls(r, g, b), h = q[0], l = q[1], s = q[2];
            if (a < .04) return null; if (a < .55 && (l > .9 || l < .08)) return null;
            if (l >= .70) { var t = s > .22 && l < .975; return css(t ? h : 226, t ? Math.min(.62, s * .95) : .42, .07 + (1 - l) * .5, a); }
            if (s < .22) return css(226, .42, Math.min(l, .30) * .62, a);
            if (l < .20) return null;
            return css(h, Math.max(s, .85), Math.min(.62, Math.max(.48, l + .05)), a);
        },
        tx: function (r, g, b, a) {
            var q = hls(r, g, b), h = q[0], l = q[1], s = q[2];
            if (a < .04 || l >= .80) return null;
            if (s < .30) return l <= .55 ? css(222, .38, .95 - .55 * l, a) : css(222, .30, .70, a);
            return css(h, Math.max(s, .88), (h > 35 && h < 70) ? .66 : .70, a);
        },
        bd: function (r, g, b, a) {
            var q = hls(r, g, b), h = q[0], l = q[1], s = q[2];
            if (a < .04 || l < .55) return null;
            return s > .25 ? css(h, Math.min(.6, s * .8), .30, a) : css(224, .38, .24, a);
        }
    };
    var RGB = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,\/]\s*([\d.]+%?))?\s*\)/g;
    function conv(val, fn) { return val.replace(RGB, function (m, r, g, b, a) { a = a == null ? 1 : (/%$/.test(a) ? parseFloat(a) / 100 : parseFloat(a)); return fn(+r, +g, +b, a) || m; }); }
    var PROPS = [['background-color', 'bg'], ['background-image', 'bg'], ['color', 'tx'], ['border-top-color', 'bd'], ['border-right-color', 'bd'], ['border-bottom-color', 'bd'], ['border-left-color', 'bd'], ['outline-color', 'bd'], ['fill', 'tx'], ['stroke', 'tx']];
    var SKIP = { SCRIPT: 1, STYLE: 1, IMG: 1, VIDEO: 1, CANVAS: 1, IFRAME: 1 };

    function paint(el) {
        if (!el || el.nodeType !== 1 || SKIP[el.tagName]) return;
        var st = el.style; if (!st || !st.length) return;
        var sig = el.getAttribute('style');
        if (el.__fxOut === sig) return;                 // already painted
        var orig = sig, changed = false;
        for (var i = 0; i < PROPS.length; i++) {
            var p = PROPS[i][0], v = st.getPropertyValue(p);
            if (!v || v.indexOf('var(') !== -1 || v.indexOf('rgb') === -1) continue;
            var nv = conv(v, MAP[PROPS[i][1]]);
            if (nv !== v) { st.setProperty(p, nv, 'important'); changed = true; }
        }
        if (changed) { el.__fxOrig = orig; el.__fxOut = el.getAttribute('style'); el.setAttribute('data-fx', '1'); }
    }
    function paintTree(node) {
        if (!dark() || !node || node.nodeType !== 1) return;
        paint(node);
        var list = node.querySelectorAll ? node.querySelectorAll('[style]') : [];
        for (var i = 0; i < list.length; i++) paint(list[i]);
    }
    function restoreAll() {
        var list = document.querySelectorAll('[data-fx]');
        for (var i = 0; i < list.length; i++) { var el = list[i]; if (el.__fxOrig != null) el.setAttribute('style', el.__fxOrig); el.removeAttribute('data-fx'); el.__fxOut = null; }
    }

    var queue = [], scheduled = false;
    function flush() { scheduled = false; var q = queue; queue = []; if (!dark()) return; for (var i = 0; i < q.length; i++) paintTree(q[i]); }
    function enqueue(n) { queue.push(n); if (!scheduled) { scheduled = true; (window.requestAnimationFrame || setTimeout)(flush); } }

    function start() {
        if (dark()) paintTree(document.body);
        new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
                var m = muts[i];
                if (m.type === 'childList') { for (var k = 0; k < m.addedNodes.length; k++) if (m.addedNodes[k].nodeType === 1) enqueue(m.addedNodes[k]); }
                else if (m.type === 'attributes' && m.target.nodeType === 1) { if (m.target === root) { if (dark()) enqueue(document.body); else restoreAll(); } else if (m.attributeName === 'style') { var t = m.target; if (t.__fxOut !== t.getAttribute('style')) enqueue(t); } }
            }
        }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'data-cm-dark'] });
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
