// Run:  node tools/test-generators.js    -> checks every topic pool (distinct questions, valid answers)
var G = require('../learning/generators.js');
var bad = 0;
G.topics.forEach(function (t) {
    var seen = {}, distinct = 0, fails = 0;
    for (var i = 0; i < G.POOL; i++) {
        var q = G.get(t, i);
        if (!q) { fails++; continue; }
        var ok = q.options.length === 4 && new Set(q.options).size === 4 && q.answer >= 0 && q.answer < 4 && q.explain;
        if (!ok) fails++;
        if (!seen[q.q]) { seen[q.q] = 1; distinct++; }
    }
    console.log(t, 'pool', G.POOL, 'distinct questions', distinct, 'invalid', fails);
    if (fails || distinct < 500) bad++;
});
process.exit(bad ? 1 : 0);
