// TriageBot LLM polish — OPTIONAL enhancement for draft replies ONLY.
//
// This file is deliberately separate from src/triage.js, and it never
// touches a triage decision:
//
//   * Priority scoring, duplicate clustering, team routing and statistics
//     all stay in triage.js, run locally, and are fully deterministic.
//   * The ONLY thing this module does is rewrite the wording of ONE draft
//     reply (the text draftReply() already produced) so it reads more
//     naturally. The band, score, reasons, owning team, response time and
//     duplicate link are passed to the model as fixed facts and the model
//     is instructed not to change them.
//
// Privacy rules (enforced here, not just documented):
//   * OFF by default. Nothing in this module runs — and no network request
//     is made — unless the caller explicitly enables it AND supplies an
//     API key. With no key, enhanceDraftReply() returns the local draft
//     immediately without calling fetch at all.
//   * MINIMAL payload. A request carries only one issue's title, summary
//     (truncated to 500 chars), band, score, reasons, team and duplicate
//     link — never the whole backlog, never any other issue.
//   * KEY NEVER STORED. The key is passed in per call and held only in
//     memory by the caller. This module never writes it to a file,
//     localStorage, sessionStorage, a cookie or a log, and it is only ever
//     sent as an Authorization header to the endpoint the user entered.
//   * FAILURE FALLS BACK. Any error — no key, bad endpoint, HTTP error,
//     timeout, empty reply — returns the local deterministic draft with
//     source 'local' / 'local-fallback' and a reason. The demo never
//     crashes and never shows a blank draft because the LLM failed.
//
// The endpoint is OpenAI-compatible (chat completions): the default is
// https://api.openai.com/v1/chat/completions, but any compatible endpoint
// (self-hosted, proxy, another provider) can be entered instead.

'use strict';

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_SUMMARY_CHARS = 500;
const MAX_TOKENS = 200;

const LLM_RESPONSE_TIME = {
  P0: 'within 4 business hours',
  P1: 'within one business day',
  P2: 'within 3 business days',
  P3: 'in the next sprint planning',
};

function buildDraftPrompt({ issue, scored, team, duplicateOf = null, localDraft = '' }) {
  const system = 'You rewrite a first reply to a Jira issue reporter. '
    + 'You MUST NOT change the triage decision: keep the priority band, '
    + 'score, owning team, response time and duplicate link exactly as '
    + 'given. Only make the wording warmer, clearer and more natural, in '
    + 'the same language as the issue text. Reply with ONLY the reply text '
    + '— no preamble, no markdown, no explanation — under 80 words.';
  const lines = [
    `Issue: ${issue.key || ''} — ${issue.title || ''}`,
    `Summary: ${(issue.summary || '').slice(0, MAX_SUMMARY_CHARS)}`,
    `Triage decision (do not change): ${scored.band} (score ${scored.score}/100: ${(scored.reasons || []).join(', ') || 'routine'}), owner: ${team || 'triage-queue'}, reply ${LLM_RESPONSE_TIME[scored.band] || 'soon'}.`,
  ];
  if (duplicateOf) {
    lines.push(`Duplicate note (do not change): this looks like a duplicate of ${duplicateOf}; the reply should point the reporter there.`);
  }
  lines.push(`Current draft (keep its facts, improve its wording): ${localDraft}`);
  return { system, user: lines.join('\n') };
}

// What a request carries — nothing else. Used by tests to prove the
// payload contains only this one issue's fields.
function buildRequestBody({ issue, scored, team, duplicateOf = null, localDraft = '', model = DEFAULT_MODEL }) {
  const { system, user } = buildDraftPrompt({ issue, scored, team, duplicateOf, localDraft });
  return {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
    max_tokens: MAX_TOKENS,
  };
}

function isLlmConfigured({ apiKey, endpoint } = {}) {
  return Boolean(apiKey && String(apiKey).trim())
    && Boolean(endpoint && String(endpoint).trim());
}

function resolveFetch(fetchFn) {
  if (typeof fetchFn === 'function') return fetchFn;
  if (typeof fetch !== 'undefined') return fetch;
  return null;
}

// Enhance ONE draft reply. Always resolves — never rejects — so a caller
// can treat the result as "the draft to show" unconditionally.
// Returns { text, source, reason } where source is:
//   'local'          — LLM off / no key / bad endpoint: local draft, no request made
//   'llm'            — the model rewrote the wording (decision untouched)
//   'local-fallback' — the request was attempted and failed: local draft kept
async function enhanceDraftReply(options = {}) {
  const {
    issue = {},
    scored = { band: 'P3', score: 0, reasons: [] },
    team = 'triage-queue',
    duplicateOf = null,
    localDraft = '',
    apiKey = '',
    endpoint = DEFAULT_ENDPOINT,
    model = DEFAULT_MODEL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchFn,
  } = options;

  const local = { text: localDraft, source: 'local', reason: 'LLM polish is off — local draft used.' };

  if (!apiKey || !String(apiKey).trim()) {
    return { ...local, reason: 'No API key provided — no request was sent; local draft used.' };
  }
  let url;
  try {
    url = new URL(String(endpoint).trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('bad protocol');
  } catch (e) {
    return { ...local, reason: 'Endpoint is not a valid http(s) URL — no request was sent; local draft used.' };
  }
  const modelName = String(model || '').trim() || DEFAULT_MODEL;
  const fetchImpl = resolveFetch(fetchFn);
  if (!fetchImpl) {
    return { ...local, reason: 'No fetch available in this environment — local draft used.' };
  }

  const body = buildRequestBody({ issue, scored, team, duplicateOf, localDraft, model: modelName });
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  // Race the fetch against a timeout so a fetch implementation that
  // ignores the abort signal still cannot hang the demo forever.
  let timer = null;
  const timeoutError = new Error(`LLM request timed out after ${timeoutMs} ms`);
  timeoutError.name = 'AbortError';
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => { if (controller) controller.abort(); reject(timeoutError); }, timeoutMs);
  });
  try {
    const res = await Promise.race([
      fetchImpl(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${String(apiKey).trim()}`,
        },
        body: JSON.stringify(body),
        ...(controller ? { signal: controller.signal } : {}),
      }),
      timeoutPromise,
    ]);
    if (!res || !res.ok) {
      const status = res ? res.status : 'no response';
      return { text: localDraft, source: 'local-fallback', reason: `LLM request failed (HTTP ${status}) — local draft kept.` };
    }
    const data = await res.json();
    const text = data && data.choices && data.choices[0]
      && data.choices[0].message && typeof data.choices[0].message.content === 'string'
      ? data.choices[0].message.content.trim()
      : '';
    if (!text) {
      return { text: localDraft, source: 'local-fallback', reason: 'LLM returned an empty reply — local draft kept.' };
    }
    return { text, source: 'llm', reason: 'Wording polished by LLM; band, score, team and response time unchanged.' };
  } catch (e) {
    const reason = e && e.name === 'AbortError'
      ? `LLM request timed out after ${timeoutMs} ms — local draft kept.`
      : `LLM request failed (${(e && e.message) || 'network error'}) — local draft kept.`;
    return { text: localDraft, source: 'local-fallback', reason };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const LlmExports = {
  DEFAULT_ENDPOINT,
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS,
  buildDraftPrompt,
  buildRequestBody,
  enhanceDraftReply,
  isLlmConfigured,
};

// UMD, same pattern as triage.js: Node gets module.exports, a plain
// <script> tag gets window.TriageBotLLM.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LlmExports;
}
if (typeof window !== 'undefined') {
  window.TriageBotLLM = LlmExports;
}
