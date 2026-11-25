# TriageBot — Codegeist 2026 (v4, 2026-11-26)

**Status 2026-11-26: DEPLOYED + INSTALLED + LIVE-TESTED.** `forge deploy`
succeeded (development v2.1.0, app id `42ec596c-767c-41b1-93da-b1e98ac51814`),
`forge install` succeeded into Jira on the demo site
one-atlas-sixi.atlassian.net, and a live Rovo test passed (project Triage
Test / TT, 5 issues: Rovo found TT-2 duplicates TT-1, ranked TT-1/TT-5
most urgent and TT-4 last, drafted a first reply for TT-1 — not posted).
See "Live Jira test" below and `SUBMISSION.md`. Remaining before
submission: (1) GitHub repo — created 2026-11-26 as the empty public
repo https://github.com/E1C0-ai/triagebot (the connector's
`create_repository` fails 403, so eico created it on github.com);
**the code has NOT been pushed yet** — push is by browser upload,
to be executed by the main agent (see `PUSH-READY.md`); (2) final video — swap the
labelled Rovo mockup segment for real Rovo screenshots from the live
test, then upload to YouTube (public); (3) Devpost submit.

**One line:** a Forge + Rovo agent that turns a messy Jira backlog into a
ranked, deduped, explainable plan — and then stops. A human approves every
action; the agent never closes, reassigns, or comments on anything.

- **Category:** Apps for Software Teams ("issue triage that actually
  understands what matters" — the Devpost page names triage explicitly).
- **Bonus targets:** Best Agents (`rovo:agent` + reusable `rovo:skill`) and
  Best app with Atlassian MCP (`rovo:mcp`). One submission can win one grand
  prize plus one bonus prize, so both are declared.
- **Prizes:** $120,000 pool; category 1st $15,000 / 2nd $8,000 / 3rd $5,000;
  bonuses $1,500 × 6 per type. **Deadline: 2026-12-22 12:00 Pacific**
  (2026-12-23 04:00 Beijing). Judging 2027-01-05 → 2027-02-03, winners
  ~2027-02-15. Judging is 5 criteria at 20% each: Technological
  Implementation, Design, Potential Impact, Innovation/Idea, Presentation.

## What it does

1. **Clusters duplicates** — stopword-stripped, stemmed token similarity
   (max of Jaccard and overlap coefficient, ≥ 0.55 with ≥ 3 shared
   keywords). The kept issue is the earliest report.
2. **Scores priority 0–100, band P0–P3** — severity is the single highest
   matching signal (never a sum of overlapping keywords); impact adders are
   capped at +20; age adds at most +5. Every score carries a `breakdown`
   (`severity + impact + type + age = score`), so any score can be audited.
3. **Suggests an owning team** — first-match rules, security checked before
   backend on purpose ("auth token leaked in server logs" is security, not
   backend). Word-boundary matching, so "down" never matches "download".
   No rule matches → `triage-queue` for a human to route.
4. **Drafts a first reply** — band-appropriate response time (P0: 4 business
   hours, P1: one business day, P2: 3 business days, P3: next sprint
   planning). A duplicate's draft points at the issue being kept. The
   draft's *wording* can optionally be polished by an LLM (see "What the
   AI is" below); the decision behind it never leaves the local engine.
5. **Daily digest** — counts, top 5, duplicate groups, in plain language.

## What the AI is (honest — this is the differentiation)

- **Decisions are local, deterministic and auditable.** Scoring,
  duplicate clustering and team routing run in the browser / Forge
  runtime with zero network calls and zero API key. The same backlog
  always produces the same plan, and every score traces to a rule.
- **The LLM only polishes wording — and only if you ask.** Draft replies
  are generated locally by default. An optional, off-by-default toggle
  (`src/llm.js`) lets you supply your own OpenAI-compatible key to
  rewrite one draft's wording more naturally. The model is told the
  band, score, team and response time are fixed facts it must not
  change; it receives only that one issue's title, summary, band,
  score and team — never the whole backlog. Any LLM failure falls back
  to the local draft, and the key lives only in memory: never saved,
  never logged, never sent anywhere except as a header to the endpoint
  you entered. No key → no request is ever made.
- **Privacy-first.** Default mode makes zero network requests: your
  backlog never leaves your machine. Even with LLM polish on, only the
  single issue you click is sent, to an endpoint you choose.
- **Out of the box.** No account, no signup, no payment, no API key
  required for the full triage. Open the demo page and it works.
- **Future: Jira-native plugin.** The same engine is already wired as a
  Forge app + Rovo agent; the next step is a one-click install from the
  Atlassian Marketplace so teams get it inside Jira with no setup, and
  the optional LLM key can then live in Forge storage instead of the
  browser.

## Run it (no account needed)

```bash
npm test            # 31 tests: 22 engine (6-issue sample, 24-issue stress backlog, edge cases) + 9 LLM-polish (no-key/no-request, fallback, timeout, minimal payload)
npm run demo        # prints the digest for the 6-issue sample
python3 scripts/validate-manifest.py   # 60+ manifest checks (local stand-in for `forge lint`)
```

Or double-click `demo/demo.html` — a single-file demo with the whole engine
inlined, so it runs with no server and no network. `demo/index.html` is the
same single-file build. After editing `src/triage.js`, regenerate both with
`python3 demo/build_demo.py` (the readable source stays in `src/triage.js`).

## Live Jira test (verified 2026-11-26, demo site one-atlas-sixi.atlassian.net)

Clean project **Triage Test (TT)**, 5 issues (TT-1 checkout crash /
production, TT-2 card-payment failure / explicit duplicate of TT-1,
TT-3 mobile Safari login, TT-4 password-reset email text / cosmetic,
TT-5 orders API 500 / production). Rovo, asked in the board's Rovo chat:

1. Duplicates → TT-2 duplicates TT-1. Correct.
2. Most urgent → TT-1 and TT-5 first, TT-3 next, TT-2 with TT-1, TT-4
   last. Correct (Rovo noted all five share the same Jira priority
   field, so the ranking came from production impact in the text).
3. First reply for TT-1 → usable draft + internal notes (unassigned,
   TT-2 is its duplicate, no runbook found so no fix invented).
   Draft **not posted**. Correct.

No errors anywhere. This was the first end-to-end run of the live-Jira
path in `src/index.js` (POST `/rest/api/3/search/jql` + ADF flattening);
it worked with no code changes.

## Live demo (Codegeist 2026)

- **GitHub repository: https://github.com/E1C0-ai/triagebot**
  (created 2026-11-26, empty public repo under E1C0-ai).
  **Code NOT yet pushed** — push is by browser upload, pending the
  main agent (see `PUSH-READY.md`); do not treat the repo as containing
  the code until the push is confirmed.
- **Online demo link: same repository** (demo runs locally from
  `demo/demo.html` — see "Local" below). No Pages URL exists yet.
- **Local:** double-click `demo/demo.html`, or `python3 -m http.server`
  from the repo root and open `http://localhost:8000/demo/demo.html`.
- **Privacy:** all computation runs locally in your browser. No data is
  uploaded anywhere. 全部运算在浏览器本地完成，不上传用户数据。
  The optional LLM polish is off by default and, when on, sends only the
  single issue you click to the endpoint you enter — the key stays in
  memory only and is never saved.
- **Safety:** TriageBot only assists analysis. It never modifies a Jira
  issue — no closing, reassigning, or commenting. Every action needs a
  human to confirm. 工具仅做辅助分析，不会实际修改 Jira 工单，所有操作
  需要人工确认。

## Files

| File | What it is |
| ---- | ---------- |
| `src/triage.js` | The engine. Pure JS, zero deps, runs in Node and the browser (UMD). Fully tested. |
| `src/llm.js` | Optional LLM polish for draft wording only. Off by default; key in memory only; decisions never leave the local engine. Tested with stubbed fetch, no network. |
| `src/index.js` | Forge wiring: 3 Rovo/MCP actions + local demo entry. Reads live Jira via `@forge/api` when deployed; falls back to labelled sample data locally. The `draftReply` action accepts an optional per-call `llm` key and otherwise stays local. |
| `manifest.yml` | Forge manifest: `rovo:agent` + `rovo:skill` + `rovo:mcp` + 3 `action` modules. Read-only scope (`read:jira-work`). |
| `resource/agent/prompt.md` | The Rovo agent's prompt (as a resource, keeps the manifest small). |
| `skills/triage-playbook/SKILL.md` | Reusable triage skill + `references/scoring.md` (full scoring table). |
| `package.json` / `package-lock.json` | `@forge/api ^8.5.1`. Node ≥ 22 (Forge CLI 16 needs Node ≥ 22.23.4). |
| `test/triage.test.js` | 22 tests, no runner needed. |
| `test/llm.test.js` | 9 LLM-polish tests (stubbed fetch, no network, no real key). |
| `test-data/sample-issues.json` | 6 issues, 1 duplicate pair. |
| `test-data/large-backlog.json` | 24 issues, 3 duplicate groups, missing fields, a 60-day-old request. |
| `demo/demo.html` | Single-file demo (engine inlined, double-click to run). Same content as `demo/index.html`. |
| `demo/index.html` | Same single-file build as `demo/demo.html`. |
| `demo/demo.template.html` + `demo/build_demo.py` | Template + build script that inlines `src/triage.js` verbatim into both demo files. |
| `scripts/validate-manifest.py` | Local manifest validator (see below). |
| `QUALITY-SELF-CHECK.md` | What was tested, what was fixed, what is still not done. |
| `SUBMISSION.md` | Devpost submission draft (English, ready to paste). |

## How the score works (the short version)

Full table: `skills/triage-playbook/references/scoring.md`.

- **Severity (one signal wins):** data loss 55 · credential leak 55 ·
  outage / breach / CVE 50 · payment failure / crash 45 · login broken /
  blocked / 500-timeout / vulnerability 40 · broken / error 20 · slow 10.
- **Impact (capped +20):** all users +15 · production +10 · revenue /
  paying / many users / under load / enterprise +10 · customers +5.
- **Type:** Bug +5, Incident +10. **Age:** +1 per 3 days, capped +5.
- **Bands:** P0 ≥ 70 · P1 ≥ 50 · P2 ≥ 30 · P3 < 30.

## Deploy (done 2026-11-26 on eico's Mac)

```bash
forge login          # Forge CLI scoped token TriageBot-Forge-CLI (eico's terminal only)
forge register       # Developer Space "triagebot", app name triagebot, terms accepted
                     # -> app id 42ec596c-767c-41b1-93da-b1e98ac51814
forge deploy         # development v2.1.0 (see note below)
forge install --demo-site -p Jira -e development
                     # -> installed in Jira on one-atlas-sixi.atlassian.net
# Judge installation link for Devpost: from the Forge "Start sharing your
# app" flow: https://developer.atlassian.com/platform/forge/distribute-your-apps/
```

Deploy note: the first deploy failed `forge lint` on `app.name` in
`manifest.yml` ("app should NOT have additional property 'name'",
MANIFEST_INVALID_RULE) — the field was removed (the name lives in the
Forge registration). The local `scripts/validate-manifest.py` had the
opposite, stale check; it was corrected 2026-11-26 to assert `app.name`
is absent. A second deploy warning ("Can't resolve '@forge/api'") was
fixed by running `npm install` in `~/triagebot` on the Mac before
re-deploying (the import in `src/index.js` is lazy; the package must
still be present for the Forge bundler).

## What is real vs. not yet run

- **Real, tested:** the engine (22 tests), the LLM polish (9 tests with
  stubbed fetch — no key means no request, failures fall back to the
  local draft), the 3 action functions (local fallback verified), the
  manifest (60+ local checks pass; real `forge lint` also passes on the
  Mac), the demo page (rendered in Chromium, 0 console errors), and the
  live-Jira path in `src/index.js` — verified end to end in the
  2026-11-26 test above, plus `forge deploy` + `forge install`
  themselves.
- **Deliberately not built:** Teamwork Graph integration (needs org admin +
  paid Rovo + graph scopes; a $1,500 bonus is not worth faking it), the
  `jira:issuePanel` UI (the agent chat is the interface; a panel that
  doesn't render would be worse than no panel), and any write operation —
  the app is read-only by design.
- **Known limits:** duplicate clustering is O(n²) — fine for the
  backlogs teams actually triage by hand (< 500 issues), noted in the
  code. Scoring is keyword + rule based, not an LLM: it is explainable
  and deterministic, and it will miss sarcasm, idiom, and non-English
  text. The README says so; the submission does not pretend otherwise.
  The optional LLM polish improves wording only — it cannot fix a
  wrong score, because it never sees the decision logic and is told
  not to change it.

## Why this should score well (honest read of the 5 criteria)

- **Technological Implementation:** a real engine + real Forge actions +
  MCP + skill, not a hardcoded demo path. The demo page runs the same
  code the agent calls; the tests prove it on 30 issues.
- **Design:** one job, one screen, one chat flow. Input: messy backlog.
  Output: ranked list + duplicates + drafts. Nothing else.
- **Potential Impact:** every software team with a Jira backlog has this
  problem; triage is the first thing a new hire is asked to do and the
  first thing that slips. The fix is specific and demonstrable.
- **Innovation:** the idea is not new — the combination is: deterministic,
  auditable scoring (every point traceable) + propose-don't-act safety +
  a reusable skill other agents can call + an LLM used exactly where it
  helps (natural reply wording) and nowhere it would hurt (decisions).
  Most triage demos hand the whole backlog to a model and hope; this one
  keeps the decisions local and private by default, and lets the model
  polish one sentence at a time, only if the user asks. That
  privacy-first split — local decisions, optional cloud wording — is the
  part a team can actually trust with its backlog.
- **Presentation:** demo page + 1:41 draft video (`video/triagebot-demo.mp4`,
  real screenshots + English narration + subtitles; the Rovo segment is
  still a labelled mockup — deployment and the live test are done, but
  the final cut has not been re-rendered yet, see `video/VIDEO-NOTES.md`).
  The final cut adds a ~20-second segment showing the optional LLM polish:
  toggle off by default, one draft polished, one failed key falling
  back to the local draft — the privacy story in action.
