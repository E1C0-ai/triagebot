// TriageBot — Forge entry point.
//
// The triage engine itself (src/triage.js) is pure JS with zero dependencies
// and is fully tested locally. This file is the thin Forge wiring around it:
//
//   * triageBacklogAction / getDuplicatesAction / draftReplyAction — the three
//     Forge `action` modules the Rovo agent (and the MCP module) call.
//   * runPanel — local demo entry (`node src/index.js`).
//
// In a deployed Forge app these functions call the Jira REST API through
// @forge/api. Outside Forge (local `node`, the demo page) @forge/api is not
// available, so the actions fall back to the bundled sample data and say so
// in their output. Nothing here is faked as a live Jira connection: the
// fallback is labelled LOCAL DEMO MODE in every response.
//
// Live-Jira wiring status: WRITTEN FROM THE OFFICIAL DOCS, NOT YET RUN
// against a real Jira site. It needs an Atlassian developer account plus
// `forge login && forge deploy && forge install` (see README.md).
// The Jira search call uses POST /rest/api/3/search/jql, the current Jira
// Cloud search endpoint; description fields arrive as ADF rich text and are
// flattened to plain text by extractAdfText() below.

const { triageBacklog, scoreIssue, suggestTeam, draftReply } = require('./triage');
const { enhanceDraftReply } = require('./llm');

const SAMPLE = require('../test-data/sample-issues.json');
const LARGE_SAMPLE = require('../test-data/large-backlog.json');

// Lazy-load @forge/api: present in the Forge runtime, absent locally.
// Dynamic import keeps plain `node` working without the package installed.
let forgeApiPromise = null;
function loadForgeApi() {
  if (!forgeApiPromise) {
    forgeApiPromise = (async () => {
      try {
        const mod = await import('@forge/api');
        return { api: mod.default || mod, route: mod.route };
      } catch (e) {
        return null;
      }
    })();
  }
  return forgeApiPromise;
}

// Jira descriptions are Atlassian Document Format (rich text). Flatten to
// plain text so the engine can score them; cap length to keep prompts small.
function extractAdfText(node, out = []) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node.text === 'string') out.push(node.text);
  if (Array.isArray(node.content)) {
    for (const child of node.content) extractAdfText(child, out);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
}

function toIssue(jiraIssue) {
  const f = jiraIssue.fields || {};
  return {
    key: jiraIssue.key,
    title: f.summary || '',
    summary: extractAdfText(f.description),
    type: (f.issuetype && f.issuetype.name) || 'Task',
    created: f.created || null,
    status: (f.status && f.status.name) || '',
  };
}

async function fetchProjectIssues(projectKey, maxResults = 100) {
  const forge = await loadForgeApi();
  if (!forge) return null; // not in Forge: caller falls back to sample data
  const { api, route } = forge;
  const jql = projectKey
    ? `project = ${projectKey} AND statusCategory != Done ORDER BY created ASC`
    : 'statusCategory != Done ORDER BY created ASC';
  const res = await api.asApp().requestJira(route`/rest/api/3/search/jql`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jql,
      maxResults,
      fields: ['summary', 'description', 'created', 'issuetype', 'status'],
    }),
  });
  if (!res.ok) {
    throw new Error(`Jira search failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.issues || []).map(toIssue);
}

async function fetchIssue(issueKey) {
  const forge = await loadForgeApi();
  if (!forge) return null;
  const { api, route } = forge;
  const res = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Jira issue ${issueKey} not found: HTTP ${res.status}`);
  }
  return toIssue(await res.json());
}

// --- Rovo agent actions (one function per `action` module in manifest.yml) ---

async function triageBacklogAction(payload = {}) {
  const issues = await fetchProjectIssues(payload.projectKey, payload.maxResults);
  if (!issues) {
    const result = triageBacklog(LARGE_SAMPLE, new Date());
    return JSON.stringify({
      mode: 'LOCAL DEMO MODE — no Jira connection; triaged bundled sample data.',
      ...result,
    });
  }
  return JSON.stringify(triageBacklog(issues, new Date()));
}

async function getDuplicatesAction(payload = {}) {
  const issues = await fetchProjectIssues(payload.projectKey, payload.maxResults);
  if (!issues) {
    const result = triageBacklog(LARGE_SAMPLE, new Date());
    return JSON.stringify({
      mode: 'LOCAL DEMO MODE — no Jira connection; duplicates from bundled sample data.',
      duplicates: result.duplicates,
      totalIssues: result.stats.total,
    });
  }
  const result = triageBacklog(issues, new Date());
  return JSON.stringify({ duplicates: result.duplicates, totalIssues: result.stats.total });
}

async function draftReplyAction(payload = {}) {
  if (!payload.issueKey) return 'Error: issueKey is required, e.g. PROJ-101.';
  const live = await fetchIssue(payload.issueKey);
  const issue = live || SAMPLE.concat(LARGE_SAMPLE).find((x) => x.key === payload.issueKey);
  if (!issue) return `Error: issue ${payload.issueKey} not found.`;
  const scored = scoreIssue(issue, new Date());
  const team = suggestTeam(issue);
  // The local draft is always the default. LLM polish is strictly opt-in
  // per call: the caller must pass payload.llm = { apiKey, endpoint?,
  // model? }. The key is used for this one request only and is never
  // stored; without it the action returns the local draft and makes no
  // network request. Scoring, team and duplicate logic never change.
  let draft = draftReply(issue, scored);
  let draftSource = 'local';
  if (payload.llm && payload.llm.apiKey) {
    try {
      const enhanced = await enhanceDraftReply({
        issue, scored, team,
        localDraft: draft,
        apiKey: payload.llm.apiKey,
        endpoint: payload.llm.endpoint,
        model: payload.llm.model,
      });
      draft = enhanced.text;
      draftSource = enhanced.source;
    } catch (e) {
      // enhanceDraftReply never rejects; this is a belt-and-braces guard.
      // Keep the local draft no matter what.
    }
  }
  return JSON.stringify({
    mode: live ? 'live Jira issue' : 'LOCAL DEMO MODE — no Jira connection; sample data.',
    key: issue.key,
    title: issue.title,
    band: scored.band,
    score: scored.score,
    reasons: scored.reasons,
    team,
    draftReply: draft,
    draftSource,
    draftNote: draftSource === 'llm'
      ? 'Wording polished by an optional LLM; band, score, team and response time were decided locally and are unchanged.'
      : 'Local deterministic draft. Pass payload.llm.apiKey to polish the wording with an LLM (opt-in, per call only).',
  });
}

// --- Local demo entry: `node src/index.js` -------------------------------

async function runPanel() {
  // In the deployed app this is the issue-panel handler: it triages the open
  // issues of the project the user is looking at. Locally there is no Jira
  // site, so it demonstrates the contract on the 6-issue sample instead.
  const live = await fetchProjectIssues(null, 100);
  const issues = live || SAMPLE;
  return triageBacklog(issues, new Date('2026-11-25T12:00:00Z'));
}

module.exports = {
  runPanel,
  triageBacklogAction,
  getDuplicatesAction,
  draftReplyAction,
  // Exported for tests / local inspection, not part of the Forge surface:
  extractAdfText,
  toIssue,
};

if (require.main === module) {
  runPanel()
    .then((r) => {
      console.log(r.digest);
      console.log('\nDuplicates:', JSON.stringify(r.duplicates, null, 2));
      console.log('\nTop item draft reply:', r.items[0].draftReply);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
