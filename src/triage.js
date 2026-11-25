// TriageBot core engine — pure JS, zero dependencies, no network, no API key.
// Runs standalone (Node) and in the browser (UMD: window.TriageBot).
// The Forge wiring lives in src/index.js; this file is the real product logic
// and is the only file the tests exercise.
//
// What it does, in one pass over a Jira backlog:
//   1. cluster duplicate issues (stopword-stripped, stemmed token similarity)
//   2. score priority 0-100 and band P0-P3 (severity signal + impact + type + age)
//   3. suggest an owning team (first-match rules, security first)
//   4. draft a first reply with a band-appropriate response time
//   5. build a human-readable daily digest a human can approve in one click
//
// Design rules (deliberate, auditable — no black box):
//   - Severity is the SINGLE highest matching signal, never a sum of
//     overlapping keywords. Phrase matching is longest-first and consumes the
//     matched span, so "production" can never also count as "prod", and
//     "payment fails" can never also count as "payment".
//   - Impact adders are capped (+20) and age is capped (+5): an old cosmetic
//     bug can never outrank a fresh outage. Age is a tiebreaker, not a driver.
//   - The agent only ever PROPOSES. Nothing here closes, reassigns, or
//     comments on an issue. A human approves every action.

'use strict';

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

// Words that carry no meaning for "are these two issues the same problem?".
// Scoring does NOT use these tokens — it matches phrases on the raw text.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'for', 'in', 'on', 'at', 'to', 'of', 'and', 'or', 'is',
  'are', 'was', 'were', 'be', 'been', 'being', 'with', 'by', 'from', 'into',
  'as', 'it', 'its', 'this', 'that', 'these', 'those', 'please', 'when',
  'after', 'before', 'during', 'over', 'under', 'per', 'via', 'than',
  'then', 'there', 'here', 'has', 'have', 'had', 'not', 'no', 'do', 'does',
  'did', 'can', 'could', 'should', 'would', 'will', 'just', 'also', 'very',
  'our', 'your', 'their', 'his', 'her', 'my', 'we', 'you', 'they', 'he',
  'she', 'i', 'me', 'us', 'them', 'but', 'if', 'so', 'up', 'out', 'off',
]);

// Words that mean the same thing in a bug report. Applied after stemming.
const SYNONYMS = {
  log: 'login', signin: 'login', signup: 'login',
  authent: 'auth', authoris: 'auth', authoriz: 'auth',
  db: 'database',
};

// Naive stemmer, applied consistently to both sides of every comparison.
// complete/completed -> complet, fails/fail -> fail, leaked -> leak,
// users -> user, customers -> customer, orders -> order, settings -> setting.
function stem(w) {
  if (w.length <= 3) return w;
  if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) w = w.slice(0, -1);
  if (w.endsWith('e') && w.length > 3) w = w.slice(0, -1);
  return w;
}

function tokens(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map((w) => SYNONYMS[stem(w)] || stem(w));
}

function tokenSet(text) {
  return new Set(tokens(text));
}

// Similarity of two token sets: the better of Jaccard and overlap
// coefficient. Overlap matters because a short duplicate ("Payment error at
// checkout") shares most of its tokens with a longer original even when
// Jaccard is dragged down by the original's extra words.
function similarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter += 1;
  const union = new Set([...setA, ...setB]).size;
  const jaccard = inter / union;
  const overlap = inter / Math.min(setA.size, setB.size);
  return { score: Math.max(jaccard, overlap), shared: inter };
}

function jaccard(a, b) {
  const sa = a instanceof Set ? a : tokenSet(a);
  const sb = b instanceof Set ? b : tokenSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  return inter / new Set([...sa, ...sb]).size;
}

// ---------------------------------------------------------------------------
// Priority scoring
// ---------------------------------------------------------------------------

// Severity: ONE signal wins — the highest matching phrase. Ordered
// longest-first so "token leaked" beats a bare "leaked", and "payment fails"
// beats a bare "error". Every pattern is word-boundary anchored so "prod"
// never matches inside "production" and "down" never matches "download".
const SEVERITY_RULES = [
  { re: /\bdata loss\b/i, weight: 55, label: 'data loss' },
  { re: /\btoken leaked\b|\btoken leak\b|\bpassword leaked\b|\bsecret exposed\b|\bcredentials? exposed\b|\bapi key leaked\b/i, weight: 55, label: 'credential leak' },
  { re: /\bsecurity breach\b|\bbreach\b/i, weight: 50, label: 'security breach' },
  { re: /\bservice (is )?down\b|\bsite (is )?down\b|\bsystem (is )?down\b|\bdown\b|\boutage\b/i, weight: 50, label: 'outage' },
  { re: /\bunreachable\b/i, weight: 45, label: 'unreachable' },
  { re: /\bcve-\d/i, weight: 50, label: 'known CVE' },
  { re: /\bleaked\b/i, weight: 50, label: 'credential leak' },
  { re: /\bpayment fails\b|\bpayment failed\b|\bpayment error\b|\bcheckout fails\b|\bcheckout failed\b|\bcheckout error\b|\bcannot complete orders?\b|\borders? (cannot|can't) be completed\b/i, weight: 45, label: 'payment failure' },
  { re: /\bcrash(?:es|ed|ing)?\b/i, weight: 45, label: 'crash' },
  { re: /\bcannot log ?in\b|\blogin fails\b|\blogin failed\b|\blogin broken\b|\bcannot sign ?in\b|\bsign-?in fails\b/i, weight: 40, label: 'login broken' },
  { re: /\bblocked\b|\bblocker\b/i, weight: 40, label: 'blocked' },
  { re: /\b500\b|\btimes? out\b|\btimed? ?out\b|\btimeout\b/i, weight: 40, label: 'server error (500/timeout)' },
  { re: /\bvulnerab\w*\b/i, weight: 40, label: 'security vulnerability' },
  { re: /\bbroken\b/i, weight: 20, label: 'broken' },
  { re: /\berror\b/i, weight: 20, label: 'error' },
  { re: /\bslow\b|\bslowness\b/i, weight: 10, label: 'slow' },
];

// Impact adders: real blast radius, summed then capped at +20.
const IMPACT_RULES = [
  { re: /\ball users\b/i, weight: 15, label: 'all users' },
  { re: /\bproduction\b|\bprod\b/i, weight: 10, label: 'production' },
  { re: /\brevenue\b/i, weight: 10, label: 'revenue impact' },
  { re: /\bpaying\b/i, weight: 10, label: 'paying customers' },
  { re: /\bmany users\b/i, weight: 10, label: 'many users' },
  { re: /\bunder load\b/i, weight: 10, label: 'under load' },
  { re: /\benterprise\b/i, weight: 10, label: 'enterprise' },
  { re: /\bcustomers?\b/i, weight: 5, label: 'customers' },
];

const TYPE_POINTS = { bug: 5, incident: 10, task: 0, story: 0, epic: 0, subtask: 0 };
const AGE_CAP = 5; // +1 per 3 days open, capped — age is a tiebreaker, not a driver
const IMPACT_CAP = 20;
const BANDS = [
  { min: 70, band: 'P0' },
  { min: 50, band: 'P1' },
  { min: 30, band: 'P2' },
  { min: 0, band: 'P3' },
];

function ageDays(iso, now = new Date()) {
  if (!iso) return 0;
  const ms = now - new Date(iso);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.floor(ms / 86400000);
}

// Match rules against text, blanking each matched span as it is consumed so
// no word is ever counted twice. Returns the matched labels and weights.
function matchRules(text, rules) {
  let working = ` ${text} `;
  const hits = [];
  for (const rule of rules) {
    const m = working.match(rule.re);
    if (m) {
      hits.push({ weight: rule.weight, label: rule.label });
      // Blank the matched span so a shorter overlapping rule can't re-match it.
      working = working.replace(m[0], ' '.repeat(m[0].length));
    }
  }
  return hits;
}

function scoreIssue(issue, now = new Date()) {
  const text = `${issue.title || ''} ${issue.summary || ''}`;
  const severityHits = matchRules(text, SEVERITY_RULES);
  // Severity is the single highest signal — never a sum of overlapping words.
  const severity = severityHits.reduce((max, h) => Math.max(max, h.weight), 0);
  const severityLabel = severityHits
    .filter((h) => h.weight === severity)
    .map((h) => h.label)[0] || null;

  const impactHits = matchRules(text, IMPACT_RULES);
  const impactRaw = impactHits.reduce((sum, h) => sum + h.weight, 0);
  const impact = Math.min(IMPACT_CAP, impactRaw);

  const typePts = TYPE_POINTS[(issue.type || '').toLowerCase()] || 0;
  const age = ageDays(issue.created, now);
  const agePts = Math.min(AGE_CAP, Math.floor(age / 3));

  const score = Math.min(100, severity + impact + typePts + agePts);
  const band = BANDS.find((b) => score >= b.min).band;
  const reasons = [
    severityLabel,
    ...impactHits.map((h) => h.label),
    age >= 7 ? `open ${age}d` : null,
    // Say so when the cap bit: the labels above are all real signals, but
    // only +20 of impact counted toward the score.
    impactRaw > IMPACT_CAP ? `impact capped at +${IMPACT_CAP}` : null,
  ].filter(Boolean);
  return {
    score, band, severity, impact, ageDays: age, reasons,
    // Full audit trail: score === severity + impact + typePoints + agePoints.
    breakdown: {
      severity, impact, impactRaw,
      typePoints: typePts, agePoints: agePts, score,
    },
  };
}

// ---------------------------------------------------------------------------
// Team routing — first match wins. Security is checked before backend on
// purpose: "auth token leaked in server logs" is a security issue, not a
// backend issue, even though the word "server" appears in it.
// ---------------------------------------------------------------------------

const TEAM_RULES = [
  { team: 'security', words: ['security', 'breach', 'vulnerability', 'leak', 'token', 'auth', 'permission', 'cve', 'secret', 'password', 'exploit', 'sso'] },
  { team: 'payments', words: ['payment', 'checkout', 'billing', 'invoice', 'refund', 'card', 'subscription'] },
  { team: 'infra', words: ['outage', 'deploy', 'ci/cd', 'latency', 'server down', 'site down', 'incident', 'down', 'unreachable'] },
  { team: 'backend', words: ['api', 'database', 'query', 'server', 'timeout', '500', 'endpoint', 'backend'] },
  { team: 'frontend', words: ['ui', 'button', 'page', 'render', 'css', 'screen', 'mobile', 'dark mode', 'layout', 'style', 'safari', 'browser', 'crash', 'startup'] },
];

// Word-boundary matching (not substring): "down" must not match "download",
// "ui" must not match "building", "auth" must not match "author".
// A trailing -s/-es is allowed ("crashes" matches "crash", "tokens" matches
// "token") — anything longer is a different word.
function wordRegex(word) {
  const parts = word.split(/\s+/).map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const last = parts.length - 1;
  parts[last] = `${parts[last]}(?:es|s)?`;
  return new RegExp(`\\b${parts.join('\\s+')}\\b`, 'i');
}

function suggestTeam(issue) {
  const text = `${issue.title || ''} ${issue.summary || ''}`;
  for (const rule of TEAM_RULES) {
    if (rule.words.some((w) => wordRegex(w).test(text))) return rule.team;
  }
  return 'triage-queue';
}

// ---------------------------------------------------------------------------
// Duplicate clustering
// ---------------------------------------------------------------------------

const DUPLICATE_MIN_SHARED = 3; // at least 3 shared content tokens
const DUPLICATE_MIN_SIMILARITY = 0.55;

function clusterDuplicates(issues) {
  const sets = issues.map((issue) => tokenSet(`${issue.title || ''} ${issue.summary || ''}`));
  const clusters = [];
  const used = new Set();
  for (let i = 0; i < issues.length; i += 1) {
    if (used.has(i)) continue;
    const group = [i];
    used.add(i);
    for (let j = i + 1; j < issues.length; j += 1) {
      if (used.has(j)) continue;
      const { score, shared } = similarity(sets[i], sets[j]);
      if (shared >= DUPLICATE_MIN_SHARED && score >= DUPLICATE_MIN_SIMILARITY) {
        group.push(j);
        used.add(j);
      }
    }
    clusters.push(group);
  }
  return clusters;
}

// ---------------------------------------------------------------------------
// Draft replies — band-appropriate response times, and a duplicate draft
// points at the issue being kept instead of starting a second thread.
// ---------------------------------------------------------------------------

const RESPONSE_TIME = {
  P0: 'within 4 business hours',
  P1: 'within one business day',
  P2: 'within 3 business days',
  P3: 'in the next sprint planning',
};

function draftReply(issue, scored, duplicateOf = null) {
  const team = suggestTeam(issue);
  const head = duplicateOf
    ? `This looks like a duplicate of ${duplicateOf} — we're tracking it there, so I'll close this one as a duplicate once you confirm. `
    : '';
  return `${head}Hi — thanks for reporting this. We've triaged it as ${scored.band} ` +
    `(score ${scored.score}/100: ${scored.reasons.join(', ') || 'routine'}), ` +
    `owner: ${team}. Next step: reproduce on the current build and confirm ` +
    `scope; we'll update this ticket ${RESPONSE_TIME[scored.band]}.`;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function normalizeIssue(issue, index) {
  const warnings = [];
  if (!issue || typeof issue !== 'object') {
    return { key: `ITEM-${index + 1}`, title: '', summary: '', type: 'Task', created: null, warnings: [`item ${index + 1}: not an object, treated as empty`] };
  }
  const key = issue.key || `ITEM-${index + 1}`;
  if (!issue.key) warnings.push(`${key}: missing key, assigned placeholder`);
  if (!issue.title && !issue.summary) warnings.push(`${key}: no title or summary, scored on metadata only`);
  if (!issue.created) warnings.push(`${key}: no created date, age counted as 0`);
  return {
    key,
    title: issue.title || '',
    summary: issue.summary || '',
    type: issue.type || 'Task',
    created: issue.created || null,
    warnings,
  };
}

function triageBacklog(issues, now = new Date()) {
  if (!Array.isArray(issues)) {
    throw new TypeError('triageBacklog expects an array of issues');
  }
  const normalized = issues.map((issue, i) => normalizeIssue(issue, i));
  const warnings = normalized.flatMap((x) => x.warnings);

  const clusters = clusterDuplicates(normalized);
  // Keep the earliest-created issue in each duplicate group (the original
  // report); the rest are duplicates of it.
  const duplicateOf = new Map(); // issue index -> kept key
  const duplicates = [];
  for (const group of clusters) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => {
      const da = normalized[a].created ? new Date(normalized[a].created) : new Date(0);
      const db = normalized[b].created ? new Date(normalized[b].created) : new Date(0);
      return da - db || a - b;
    });
    const keep = sorted[0];
    const sim01 = similarity(
      tokenSet(`${normalized[keep].title} ${normalized[keep].summary}`),
      tokenSet(`${normalized[sorted[1]].title} ${normalized[sorted[1]].summary}`),
    );
    duplicates.push({
      keep: normalized[keep].key,
      duplicates: sorted.slice(1).map((idx) => normalized[idx].key),
      similarity: Math.round(sim01.score * 100) / 100,
      reason: `similar title + description (similarity ${Math.round(sim01.score * 100) / 100}, ${sim01.shared} shared keywords)`,
    });
    for (const idx of sorted.slice(1)) duplicateOf.set(idx, normalized[keep].key);
  }

  const items = normalized.map((issue, idx) => {
    const scored = scoreIssue(issue, now);
    return {
      ...issue,
      ...scored,
      team: suggestTeam(issue),
      draftReply: draftReply(issue, scored, duplicateOf.get(idx) || null),
      isDuplicate: duplicateOf.has(idx),
      duplicateOf: duplicateOf.get(idx) || null,
    };
  });
  // Highest score first; older issues first on a tie (they have waited longer).
  items.sort((a, b) => b.score - a.score
    || (a.created || '9999').localeCompare(b.created || '9999'));

  const byBand = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const item of items) byBand[item.band] += 1;

  const digest = items.length === 0
    ? 'Backlog is clear — no open issues to triage.'
    : [
        `Triage digest — ${items.length} issues, ${duplicates.length} duplicate group(s).`,
        `P0: ${byBand.P0} | P1: ${byBand.P1} | P2: ${byBand.P2} | P3: ${byBand.P3}`,
        ...items.slice(0, 5).map((x, i) =>
          `${i + 1}. [${x.band} ${x.score}] ${x.key} — ${x.title} (${x.team})${x.isDuplicate ? ` — duplicate of ${x.duplicateOf}` : ''}`),
        'Nothing here was closed or reassigned — a human approves every action.',
      ].join('\n');

  return {
    items,
    duplicates,
    digest,
    stats: {
      total: items.length,
      byBand,
      duplicateGroups: duplicates.length,
      duplicateIssues: duplicates.reduce((n, d) => n + d.duplicates.length, 0),
      topScore: items.length ? items[0].score : 0,
      generatedAt: new Date(now).toISOString(),
    },
    warnings,
  };
}

const TriageBotExports = {
  triageBacklog, scoreIssue, suggestTeam, clusterDuplicates,
  draftReply, jaccard, tokens, tokenSet, similarity, stem,
};

// UMD: Node gets module.exports; a plain <script> tag (demo page) gets
// window.TriageBot. The bare `module.exports = ...` line would throw in a
// browser, so both assignments are guarded.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TriageBotExports;
}
if (typeof window !== 'undefined') {
  window.TriageBot = TriageBotExports;
}
