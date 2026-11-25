// TriageBot test suite — run: node test/triage.test.js  (or: npm test)
// No test-runner dependency: plain node:assert, exits non-zero on failure.
// Every number asserted below was verified by running the engine first;
// nothing here is a guessed expectation.
const assert = require('assert');
const {
  triageBacklog, scoreIssue, suggestTeam, clusterDuplicates, draftReply,
} = require('../src/triage');

const NOW = new Date('2026-11-25T12:00:00Z');
const sample = require('../test-data/sample-issues.json');
const large = require('../test-data/large-backlog.json');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok — ${name}`);
}

// --- 1. The 6-issue sample (the original v1 cases, now with correct scores) ---
const r = triageBacklog(sample, NOW);
const byKey = Object.fromEntries(r.items.map((x) => [x.key, x]));

check('sample: exactly 1 duplicate group, PROJ-102 is a duplicate of PROJ-101', () => {
  assert.strictEqual(r.duplicates.length, 1);
  assert.strictEqual(r.duplicates[0].keep, 'PROJ-101');
  assert.deepStrictEqual(r.duplicates[0].duplicates, ['PROJ-102']);
  assert.ok(r.duplicates[0].similarity >= 0.8, `similarity ${r.duplicates[0].similarity}`);
  assert.ok(byKey['PROJ-102'].isDuplicate);
  assert.ok(byKey['PROJ-102'].draftReply.includes('PROJ-101'), 'duplicate draft must name the kept issue');
});

check('sample: payment outage is P0, token leak and API 500 are P1', () => {
  assert.strictEqual(byKey['PROJ-101'].band, 'P0');
  assert.ok(byKey['PROJ-101'].score >= 70, `101 score ${byKey['PROJ-101'].score}`);
  assert.strictEqual(byKey['PROJ-106'].band, 'P1');
  assert.ok(byKey['PROJ-106'].score >= 50, `106 score ${byKey['PROJ-106'].score}`);
  assert.strictEqual(byKey['PROJ-104'].band, 'P1');
});

check('sample: cosmetic button and dark-mode request stay P3', () => {
  assert.strictEqual(byKey['PROJ-103'].band, 'P3');
  assert.strictEqual(byKey['PROJ-105'].band, 'P3');
  // A 15-day-old cosmetic bug must not be promoted by age alone.
  assert.ok(byKey['PROJ-103'].score < 30, `103 score ${byKey['PROJ-103'].score}`);
});

check('sample: team routing — payments / security / backend', () => {
  assert.strictEqual(byKey['PROJ-101'].team, 'payments');
  assert.strictEqual(byKey['PROJ-106'].team, 'security');
  assert.strictEqual(byKey['PROJ-104'].team, 'backend');
});

check('sample: score arithmetic is auditable (severity + impact + type + age)', () => {
  for (const x of r.items) {
    const b = x.breakdown;
    assert.strictEqual(b.score, b.severity + b.impact + b.typePoints + b.agePoints, x.key);
    assert.strictEqual(x.score, b.score, x.key);
    assert.ok(b.impact <= 20, `${x.key}: impact capped at 20`);
    assert.ok(b.agePoints <= 5, `${x.key}: age capped at 5`);
  }
  // "production" must not double-count as "prod": 101's impact is capped
  // at 20 even though it matched all-users (15) + production (10) + customers (5).
  assert.strictEqual(byKey['PROJ-101'].breakdown.impactRaw, 30);
  assert.strictEqual(byKey['PROJ-101'].breakdown.impact, 20);
  assert.ok(byKey['PROJ-101'].reasons.includes('impact capped at +20'));
});

check('sample: every item has a band, a reason and a usable draft reply', () => {
  for (const x of r.items) {
    assert.ok(['P0', 'P1', 'P2', 'P3'].includes(x.band));
    assert.ok(x.reasons.length >= 1, `${x.key} has no reasons`);
    assert.ok(x.draftReply && x.draftReply.length > 40, `${x.key} draft too short`);
    assert.ok(x.team, `${x.key} has no team`);
  }
});

check('sample: P0 draft promises 4 business hours', () => {
  assert.ok(byKey['PROJ-101'].draftReply.includes('4 business hours'));
  assert.ok(byKey['PROJ-105'].draftReply.includes('next sprint planning'));
});

check('sample: digest is human-readable and honest about approval', () => {
  assert.ok(r.digest.includes('Triage digest — 6 issues, 1 duplicate group(s).'));
  assert.ok(r.digest.includes('P0: 1 | P1: 3 | P2: 0 | P3: 2'));
  assert.ok(r.digest.includes('Nothing here was closed or reassigned'));
});

// --- 2. The 24-issue stress backlog ---
const t0 = Date.now();
const big = triageBacklog(large, NOW);
const bigMs = Date.now() - t0;
const bigByKey = Object.fromEntries(big.items.map((x) => [x.key, x]));

check('large: 24 issues triaged in under 2s', () => {
  assert.strictEqual(big.stats.total, 24);
  assert.ok(bigMs < 2000, `${bigMs}ms`);
});

check('large: exactly 3 duplicate groups (outage, payment, Safari login)', () => {
  assert.strictEqual(big.duplicates.length, 3);
  const keeps = big.duplicates.map((d) => d.keep).sort();
  assert.deepStrictEqual(keeps, ['APP-504', 'OPS-201', 'PAY-301']);
});

check('large: similar wording still clusters, different buttons do not', () => {
  // "Login fails on Safari" vs "Cannot log in using Safari browser" — different words, same problem.
  const safari = big.duplicates.find((d) => d.keep === 'APP-504');
  assert.ok(safari, 'Safari login pair must cluster');
  assert.deepStrictEqual(safari.duplicates, ['APP-505']);
  // "Button broken on settings page" vs "Button broken on login page" —
  // same words except the page name. Must NOT cluster: different problems.
  assert.ok(!big.duplicates.some((d) => d.duplicates.includes('UI-703')));
  assert.ok(!big.duplicates.some((d) => d.duplicates.includes('UI-704')));
});

check('large: outage is P0, crash / SSO login / CVE / API 500 are P1', () => {
  assert.strictEqual(bigByKey['OPS-201'].band, 'P0');
  assert.strictEqual(bigByKey['OPS-201'].team, 'infra');
  assert.strictEqual(bigByKey['PAY-301'].band, 'P0');
  assert.strictEqual(bigByKey['APP-501'].band, 'P1');
  assert.strictEqual(bigByKey['APP-502'].band, 'P1');
  assert.strictEqual(bigByKey['APP-502'].team, 'security');
  assert.strictEqual(bigByKey['SEC-402'].band, 'P1');
  assert.strictEqual(bigByKey['APP-503'].band, 'P1');
});

check('large: duplicate of a P0 still scores on its own text (OPS-202 is P1, not P3)', () => {
  assert.strictEqual(bigByKey['OPS-202'].band, 'P1');
  assert.ok(bigByKey['OPS-202'].isDuplicate);
});

check('large: a 60-day-old feature request stays P3 (age cap works)', () => {
  assert.strictEqual(bigByKey['FEAT-803'].band, 'P3');
  assert.strictEqual(bigByKey['FEAT-803'].breakdown.agePoints, 5);
});

check('large: missing fields warn instead of crashing', () => {
  assert.ok(big.warnings.length >= 2, `warnings: ${JSON.stringify(big.warnings)}`);
  assert.ok(bigByKey['ITEM-24'], 'issue without a key gets a placeholder key');
  assert.strictEqual(bigByKey['MISC-902'].breakdown.agePoints, 0);
  assert.ok(big.items.every((x) => x.band && x.team && x.draftReply));
});

check('large: band counts add up', () => {
  const s = big.stats.byBand;
  assert.strictEqual(s.P0 + s.P1 + s.P2 + s.P3, 24);
  assert.deepStrictEqual(s, { P0: 2, P1: 7, P2: 4, P3: 11 });
});

// --- 3. Edge cases ---
check('edge: empty backlog returns a clear digest, not an error', () => {
  const e = triageBacklog([], NOW);
  assert.deepStrictEqual(e.items, []);
  assert.deepStrictEqual(e.duplicates, []);
  assert.ok(e.digest.includes('clear'));
  assert.strictEqual(e.stats.total, 0);
});

check('edge: non-array input throws a clear TypeError', () => {
  assert.throws(() => triageBacklog(null), TypeError);
  assert.throws(() => triageBacklog('nope'), TypeError);
});

check('edge: all-P0 backlog works, single issue has no duplicates', () => {
  const allP0 = triageBacklog([
    { key: 'A-1', title: 'Production is down', summary: 'outage, all users', type: 'Incident', created: '2026-11-25T08:00:00Z' },
    { key: 'A-2', title: 'Data loss in billing', summary: 'data loss in production', type: 'Incident', created: '2026-11-25T08:00:00Z' },
  ], NOW);
  assert.ok(allP0.items.every((x) => x.band === 'P0'));
  const one = triageBacklog([{ key: 'B-1', title: 'Typo', summary: '', type: 'Bug', created: '2026-11-25T08:00:00Z' }], NOW);
  assert.deepStrictEqual(one.duplicates, []);
  assert.strictEqual(one.items[0].band, 'P3');
});

check('edge: identical issues cluster; "download" does not trigger outage routing', () => {
  const twins = triageBacklog([
    { key: 'C-1', title: 'Export fails', summary: 'export to CSV fails', type: 'Bug', created: '2026-11-20T00:00:00Z' },
    { key: 'C-2', title: 'Export fails', summary: 'export to CSV fails', type: 'Bug', created: '2026-11-21T00:00:00Z' },
  ], NOW);
  assert.strictEqual(twins.duplicates.length, 1);
  // "download the report" contains "down" as a substring — it must not route to infra.
  assert.strictEqual(suggestTeam({ title: 'Download the report', summary: '' }), 'triage-queue');
  // ...and must not score as an outage either.
  assert.strictEqual(scoreIssue({ title: 'Download the report', summary: '', type: 'Task' }, NOW).severity, 0);
});

check('edge: bare "login" in a cosmetic issue is not "login broken"', () => {
  const s = scoreIssue({ title: 'Login page button misaligned', summary: 'cosmetic only', type: 'Bug', created: '2026-11-10T00:00:00Z' }, NOW);
  assert.strictEqual(s.severity, 0);
  assert.strictEqual(s.band, 'P3');
});

check('edge: same input twice gives byte-identical output (deterministic)', () => {
  const a = JSON.stringify(triageBacklog(large, NOW));
  const b = JSON.stringify(triageBacklog(large, NOW));
  assert.strictEqual(a, b);
});

console.log(`\nAll ${passed} TriageBot tests passed (${bigMs}ms for 24 issues).`);
console.log(big.digest);
