// TriageBot LLM-polish tests — run: node test/llm.test.js
// No network, no real key: every fetch is a stub passed in as fetchFn.
// These tests prove the privacy contract, not just the happy path:
//   - no key  => fetch is NEVER called, local draft returned
//   - failure => local draft kept, never a crash, never a blank draft
//   - success => only the wording changes; the decision is untouched
const assert = require('assert');
const {
  DEFAULT_ENDPOINT, DEFAULT_MODEL, buildDraftPrompt, buildRequestBody,
  enhanceDraftReply, isLlmConfigured,
} = require('../src/llm');

const ISSUE = {
  key: 'PROJ-101',
  title: 'Checkout payment fails for all users',
  summary: 'Payment fails at checkout in production, customers cannot complete orders',
  type: 'Bug',
};
const SCORED = { band: 'P0', score: 71, reasons: ['payment failure', 'all users', 'production'] };
const LOCAL_DRAFT = 'Hi — thanks for reporting this. We\'ve triaged it as P0 (score 71/100: payment failure, all users, production), owner: payments. Next step: reproduce on the current build and confirm scope; we\'ll update this ticket within 4 business hours.';

let passed = 0;
function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { passed += 1; console.log(`  ok — ${name}`); });
}

function stubFetchOk(text) {
  let calls = 0;
  let lastArgs = null;
  const fn = async (url, opts) => {
    calls += 1;
    lastArgs = { url, opts };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: text } }] }) };
  };
  fn.calls = () => calls;
  fn.lastArgs = () => lastArgs;
  return fn;
}

async function main() {
  await check('no key: fetch is never called, local draft returned', async () => {
    const fetchFn = stubFetchOk('polished');
    const r = await enhanceDraftReply({ issue: ISSUE, scored: SCORED, team: 'payments', localDraft: LOCAL_DRAFT, apiKey: '', fetchFn });
    assert.strictEqual(r.source, 'local');
    assert.strictEqual(r.text, LOCAL_DRAFT);
    assert.strictEqual(fetchFn.calls(), 0, 'fetch must not be called without a key');
    assert.ok(r.reason.includes('No API key'));
  });

  await check('blank key / bad endpoint: no request is made', async () => {
    const fetchFn = stubFetchOk('polished');
    const r1 = await enhanceDraftReply({ issue: ISSUE, scored: SCORED, team: 'payments', localDraft: LOCAL_DRAFT, apiKey: '   ', fetchFn });
    assert.strictEqual(r1.source, 'local');
    assert.strictEqual(fetchFn.calls(), 0);
    const r2 = await enhanceDraftReply({ issue: ISSUE, scored: SCORED, team: 'payments', localDraft: LOCAL_DRAFT, apiKey: 'sk-test', endpoint: 'javascript:alert(1)', fetchFn });
    assert.strictEqual(r2.source, 'local');
    assert.strictEqual(fetchFn.calls(), 0, 'bad endpoint must not be fetched');
  });

  await check('success: wording changes, decision fields stay local', async () => {
    const fetchFn = stubFetchOk('Hi there — thanks so much for flagging this, we\'re on it as a top priority and will update you within 4 business hours.');
    const r = await enhanceDraftReply({ issue: ISSUE, scored: SCORED, team: 'payments', localDraft: LOCAL_DRAFT, apiKey: 'sk-test', fetchFn });
    assert.strictEqual(r.source, 'llm');
    assert.ok(r.text.startsWith('Hi there'));
    assert.notStrictEqual(r.text, LOCAL_DRAFT);
    assert.strictEqual(fetchFn.calls(), 1);
    // The request went to the default OpenAI-compatible endpoint with a Bearer key.
    const { url, opts } = fetchFn.lastArgs();
    assert.strictEqual(url, DEFAULT_ENDPOINT);
    assert.strictEqual(opts.headers.Authorization, 'Bearer sk-test');
    assert.strictEqual(opts.method, 'POST');
    // Payload carries ONLY this one issue — no other issue's key or title.
    const body = JSON.parse(opts.body);
    assert.strictEqual(body.model, DEFAULT_MODEL);
    const payload = JSON.stringify(body);
    assert.ok(payload.includes('PROJ-101'));
    assert.ok(payload.includes('Checkout payment fails'));
    assert.ok(!payload.includes('PROJ-102'), 'payload must not contain other issues');
    assert.ok(!payload.includes('Login page button'), 'payload must not contain other issues');
  });

  await check('HTTP 401: fallback to local draft, no crash', async () => {
    const fetchFn = async () => ({ ok: false, status: 401, json: async () => ({}) });
    const r = await enhanceDraftReply({ issue: ISSUE, scored: SCORED, team: 'payments', localDraft: LOCAL_DRAFT, apiKey: 'sk-bad', fetchFn });
    assert.strictEqual(r.source, 'local-fallback');
    assert.strictEqual(r.text, LOCAL_DRAFT);
    assert.ok(r.reason.includes('401'));
  });

  await check('network throw: fallback to local draft', async () => {
    const fetchFn = async () => { throw new Error('ECONNREFUSED'); };
    const r = await enhanceDraftReply({ issue: ISSUE, scored: SCORED, team: 'payments', localDraft: LOCAL_DRAFT, apiKey: 'sk-test', fetchFn });
    assert.strictEqual(r.source, 'local-fallback');
    assert.strictEqual(r.text, LOCAL_DRAFT);
  });

  await check('empty LLM reply: fallback to local draft', async () => {
    const fetchFn = stubFetchOk('   ');
    const r = await enhanceDraftReply({ issue: ISSUE, scored: SCORED, team: 'payments', localDraft: LOCAL_DRAFT, apiKey: 'sk-test', fetchFn });
    assert.strictEqual(r.source, 'local-fallback');
    assert.strictEqual(r.text, LOCAL_DRAFT);
  });

  await check('hanging fetch + short timeout: falls back, does not hang', async () => {
    const fetchFn = () => new Promise(() => {}); // never resolves
    const t0 = Date.now();
    const r = await enhanceDraftReply({ issue: ISSUE, scored: SCORED, team: 'payments', localDraft: LOCAL_DRAFT, apiKey: 'sk-test', timeoutMs: 50, fetchFn });
    assert.strictEqual(r.source, 'local-fallback');
    assert.strictEqual(r.text, LOCAL_DRAFT);
    assert.ok(Date.now() - t0 < 2000, 'must time out quickly');
    assert.ok(r.reason.includes('timed out'));
  });

  await check('prompt forbids changing the decision and stays minimal', () => {
    const { system, user } = buildDraftPrompt({ issue: ISSUE, scored: SCORED, team: 'payments', localDraft: LOCAL_DRAFT });
    assert.ok(system.includes('MUST NOT change the triage decision'));
    assert.ok(user.includes('P0 (score 71/100'));
    assert.ok(user.includes('owner: payments'));
    assert.ok(user.includes(LOCAL_DRAFT));
    // Summary is truncated: a 10k-char summary must not be sent in full.
    const longIssue = { ...ISSUE, summary: 'x'.repeat(10000) };
    const p2 = buildDraftPrompt({ issue: longIssue, scored: SCORED, team: 'payments', localDraft: LOCAL_DRAFT });
    assert.ok(p2.user.length < 3000, `prompt too long: ${p2.user.length}`);
    const body = buildRequestBody({ issue: ISSUE, scored: SCORED, team: 'payments', localDraft: LOCAL_DRAFT });
    assert.strictEqual(body.messages.length, 2);
    assert.strictEqual(body.messages[0].role, 'system');
  });

  await check('isLlmConfigured: needs key and endpoint', () => {
    assert.strictEqual(isLlmConfigured({ apiKey: 'sk-x', endpoint: DEFAULT_ENDPOINT }), true);
    assert.strictEqual(isLlmConfigured({ apiKey: '', endpoint: DEFAULT_ENDPOINT }), false);
    assert.strictEqual(isLlmConfigured({ apiKey: 'sk-x', endpoint: '' }), false);
    assert.strictEqual(isLlmConfigured({}), false);
  });

  console.log(`\nAll ${passed} LLM-polish tests passed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
