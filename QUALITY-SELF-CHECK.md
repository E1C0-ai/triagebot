# TriageBot — quality self-check (v5, 2026-11-26 — push-ready re-verification)

## v5 — re-verified on the cloud machine, repo URL filled in, source re-packed

- `npm test` re-run 2026-11-26: **all 31 pass** (22 engine + 9 LLM-polish),
  exit 0. `python3 scripts/validate-manifest.py`: **all checks pass**,
  exit 0. No engine code touched (`src/triage.js` / `src/llm.js` unchanged).
- GitHub repo now exists: https://github.com/E1C0-ai/triagebot (empty public
  repo, eico created it on github.com). The real URL replaced the placeholder
  in `README.md`, `SUBMISSION.md`, `QUALITY-SELF-CHECK.md` (this file) and
  `EICO-STEPS.md`. **Code NOT yet pushed** — push is by browser upload,
  pending the main agent; see `PUSH-READY.md`.
- Source re-packed: `../triagebot-source.zip`, 60 entries (46 files + 14 dirs),
  verified with `unzip -t`; contains the latest docs and the manifest
  (app id `42ec596c-767c-41b1-93da-b1e98ac51814`).
- Still NOT done: code push, video re-cut (Rovo mockup segment), YouTube
  upload, judge installation link, Devpost submit.

---

# TriageBot — quality self-check (v4, 2026-11-26)

## v4 — deployed, installed, live-Jira tested (2026-11-26)

**What happened, in order (all on eico's Mac, via SSH + his Chrome):**
- `forge login` with the Forge CLI scoped token TriageBot-Forge-CLI
  (ordinary Atlassian API tokens TriageBot-Forge / Forge-2 fail login;
  the CLI token is a different, Forge-scoped token, expires 2027-11-25).
  Logged in as Dgjin Ars (arsdgjin@gmail.com).
- `forge register`: Developer Space "triagebot", app name triagebot,
  terms accepted → app id `42ec596c-767c-41b1-93da-b1e98ac51814`.
- `forge deploy` failed first on `forge lint`: `app.name` in
  `manifest.yml` is invalid (MANIFEST_INVALID_RULE). Removed the field;
  `forge lint` then passed. The local `scripts/validate-manifest.py`
  had the opposite stale check ("app.name present") — corrected to
  assert it is absent. Second deploy warned "Can't resolve '@forge/api'";
  fixed by `npm install` on the Mac, redeployed clean as **v2.1.0**.
- `forge site provision` created demo site
  **one-atlas-sixi.atlassian.net**; `forge install --demo-site -p Jira
  -e development` failed once with an unexpected error, succeeded on
  retry — app installed in Jira on that site.

**Live Jira test (2026-11-26 01:10, browser tab t4, no errors):**
clean project Triage Test (TT), 5 issues TT-1–TT-5, Rovo asked 3
questions in the board's Rovo chat. Results: TT-2 duplicates TT-1
(correct); most urgent TT-1 + TT-5, TT-4 last (correct, and Rovo noted
all five share the same Jira priority field, so the ranking came from
production impact in the text); first-reply draft for TT-1 written
with internal notes, **not posted** (correct). This was the first
end-to-end run of the live-Jira path in `src/index.js` — it worked with
no code changes. `src/triage.js` / `src/llm.js` were not touched in v4.

**Re-verified 2026-11-26 (this machine):** `npm test` — all 22 engine +
all 9 LLM-polish tests pass; `python3 scripts/validate-manifest.py` —
all checks pass (after the validator fix above).

**Still NOT done (2026-11-26):**
- GitHub repo: ✅ created — empty public repo
  https://github.com/E1C0-ai/triagebot (eico created it on github.com;
  the connector's `create_repository` fails 403, "Resource not
  accessible by integration", so Muse cannot create repos). **Code NOT
  yet pushed** — push is by browser upload, to be executed by the main
  agent (see `PUSH-READY.md`). Do not claim the code is on GitHub until
  the push is confirmed.
- Final video: still the 1:41 draft with the labelled Rovo mockup
  segment. The live test has run, but real Rovo screenshots were not
  captured (that needs the live browser tab). Swap
  `video/screenshots/06-rovo-mockup.png` for real screenshots and
  re-run `video/build_video.py`, changing the seg4 subtitle from
  "will be recorded once the app is deployed" to live wording.
  Do NOT submit the mockup cut, and do NOT upload it to YouTube.
- Judge installation (distribution) link: not yet generated (Forge
  "Start sharing your app" flow). Devpost submit + YouTube upload are
  eico/browser steps, not done.

---

# TriageBot — quality self-check (v3, 2026-11-25)

## v3 — optional LLM polish: what was added, and what was verified

**The change (review-driven):** the demo was stable and the local engine
scored well, but the AI story was weak — only paste-JSON input, no model
in the loop. The fix adds an LLM in exactly one place: rewriting the
*wording* of a draft reply. Priority scoring, duplicate clustering, team
routing and statistics are untouched — `src/triage.js` was not edited at
all in this pass, and the original 22 tests still pass unchanged.

**The contract (`src/llm.js`, independent file, zero deps):**
- **Off by default.** No key → `enhanceDraftReply()` returns the local
  draft without calling fetch. Verified by test: fetch stub called 0 times.
- **Minimal payload.** A request carries only one issue's title, summary
  (truncated to 500 chars), band, score, reasons, team and duplicate
  link — never the whole backlog. Verified by test + intercepted-request
  inspection in Chromium.
- **Key in memory only.** The key is read at click time, held in a JS
  variable, and never written to a file, localStorage, sessionStorage,
  a cookie or a log; it is only sent as an Authorization header to the
  endpoint the user entered. Verified: no storage/cookie API is called
  anywhere in the code (grep), and the key input is empty after a page
  reload.
- **Failure falls back.** HTTP error, network throw, empty reply, or
  timeout (15 s, enforced by AbortController + a racing timeout) all
  return the local draft with source `local-fallback` and a reason.
  `enhanceDraftReply()` always resolves, never rejects.
- **Decision never delegated.** The system prompt says the model MUST
  NOT change the triage decision; band, score, team and response time
  are passed as fixed facts. The Forge `draftReply` action accepts an
  optional per-call `payload.llm.apiKey` and otherwise stays local.

**Tests run — all passing (2026-11-25):**
```
$ npm test
All 22 TriageBot tests passed (16ms for 24 issues).
All 9 LLM-polish tests passed.
$ python3 scripts/validate-manifest.py
All manifest checks passed.   (60+ checks)
$ node src/index.js            # local demo entry, exit 0; draftReplyAction with no/empty key returns draftSource 'local'
```

| Suite | What it proves |
| ----- | -------------- |
| 22 engine tests (unchanged) | Sample, 24-issue stress, edge cases — all still pass; no local-algorithm behaviour changed |
| 9 LLM-polish tests (`test/llm.test.js`, stubbed fetch, no network) | No key / blank key / bad endpoint → fetch never called; 200 → wording changes, Bearer header + default endpoint, payload has only the one issue; 401 / throw / empty reply / hanging fetch + 50 ms timeout → local draft kept; prompt forbids changing the decision; 10k-char summary truncated |

**Demo-page verification — Playwright + Chromium, `file://` demo, 20/20
checks passed** (script: `/tmp/verify_llm_demo.py`, OpenAI calls
intercepted by Playwright routes — no real key, no real network):
- Default load: 0 console errors, 0 failed requests, **0 network
  requests** (privacy default holds); default drafts byte-identical to
  the local drafts computed in node.
- Toggle OFF + click polish → hint shown, still 0 requests. Toggle ON +
  empty key → hint shown, still 0 requests.
- Toggle ON + key + intercepted **401** → local draft kept unchanged,
  failure reason shown, exactly 1 request with the Bearer header.
- Toggle ON + key + intercepted **200** → draft replaced with the
  canned polished wording, "✨ LLM-polished" badge shown, request payload
  contains only the polished issue (PROJ-104, not PROJ-101/102) and the
  "MUST NOT change the triage decision" instruction.
- Key input empty after reload; dark mode renders dark; empty backlog
  and invalid JSON still show friendly messages, no crash.

**Bugs found by verification and fixed in this pass:**
1. **Global `RESPONSE_TIME` collision (real bug).** `src/triage.js` and
   `src/llm.js` both declared top-level `const RESPONSE_TIME`; inlined
   into one page as classic scripts they share the global lexical scope,
   so the demo threw `Identifier 'RESPONSE_TIME' has already been
   declared` and the LLM module never loaded. Fixed by renaming the
   llm.js copy to `LLM_RESPONSE_TIME`. Lesson: any new inlined module
   must be checked for top-level name collisions.
2. **Polish button hidden inside collapsed `<details>` (real UX bug).**
   The button was only clickable after expanding each draft, so
   Playwright — and a judge — could not see it. Fixed: the button and
   its note now sit outside `<details>`, always visible in the row.
3. **Test-harness issues (not product bugs).** The verify script counted
   the `file://` document load as a network request, and Chromium logs
   an intercepted 401 as a console "Failed to load resource" line; both
   were corrected in the harness (count http(s) only; treat pageerror as
   the crash signal), and the invalid-JSON check then passed on re-run.

**What is still NOT done (carried over + new):**
- The final demo video does not show the LLM segment yet. The segment
  is scripted in `video/VIDEO-NOTES.md` (toggle off → one polish → one
  failed key falling back) and is a final-cut addition, like the live
  Rovo footage — both still need deployment first.
- Deployment, live-Jira integration testing, GitHub, Devpost submission: unchanged from
  v2 below — still need eico's Atlassian account and GitHub authorization.

---

How good is this, really? Everything below was actually run. Nothing is
claimed from a scaffold that was never executed.

## What was learned (official docs, read 2026-11-25)

- Codegeist 2026 rules (codegeist2026.devpost.com/rules): 3 categories,
  Apps for Software Teams fits triage; $120,000 pool; 1st $15,000 × 3.
  Judging stage 1 is pass/fail (Forge app + ≥ 1 Atlassian product); stage 2
  is 5 criteria × 20%: Technological Implementation, Design, Potential
  Impact, Innovation/Idea, Presentation. Submission needs an installation
  link judges can use, a < 5 min YouTube demo video, and English materials.
  One submission can win one grand prize + one bonus. Winners ~2027-02-15.
  Eligibility excludes Brazil, Quebec, Russia, Belarus, Crimea, Cuba, Iran,
  North Korea, Syria, Sudan, Myanmar — China is NOT on the list, but the
  final word is the Eligibility field on eico's Devpost account at
  submission time.
- Rovo agent module (developer.atlassian.com): `rovo:agent` needs
  key/name/prompt; prompt may be a resource (CLI ≥ 10.6); `actions` and
  `skills` reference module keys; name ≤ 30 chars.
- Rovo skill module (Preview): `SKILL.md` frontmatter name must equal the
  directory name, ≤ 55 chars, description 50–1,024 chars; `allowed-tools`
  must include every `dependencies.tools` entry. From **2027-01-05** (the
  first day of judging) apps with a `rovo:skill` must also define
  `app.rovo` metadata: tag ≤ 8 chars, description ≤ 100 chars, keywords
  combined ≤ 50 chars. All three are in our manifest.
- Rovo MCP (Preview): `rovo:mcp` exposes `action` modules as tools; also
  requires `app.rovo`. Best-MCP bonus needs exactly this module.
- Forge hello-world Rovo agent + MCP tutorials: `forge create` writes the
  app id; `forge deploy` then `forge install`; actions are GET by design
  (automation-triggered agents never call CREATE/UPDATE/DELETE). Our three
  actions are all GET, and the app never writes to Jira.
- Teamwork Graph (Preview since 2026-10-15): per-object scopes
  (`read:graph:issue:jira`), org-admin install, Rovo is paid-only.
  Deliberately NOT implemented — see "not built" below.

## Tests run — all passing

```
$ npm test
All 22 TriageBot tests passed (17ms for 24 issues).
$ python3 scripts/validate-manifest.py
All manifest checks passed.   (60+ checks)
$ node src/index.js            # local demo entry, exit 0
$ node -e "…actions…"         # 3 actions in LOCAL DEMO MODE, exit 0
$ demo/index.html in Chromium  # 0 console errors, 7 table rows, digest shown
```

| Suite | What it proves |
| ----- | -------------- |
| 6-issue sample (8 checks) | Duplicate group found (similarity 0.86); payment outage P0 71; token leak P1 60, team security; API 500 P1 55; cosmetic button + dark mode P3; score arithmetic auditable (`severity + impact + type + age`); P0 draft promises 4 business hours |
| 24-issue stress backlog (8 checks) | 24 issues in 17 ms; exactly 3 duplicate groups (outage, payment, Safari login); different broken buttons do NOT cluster; outage P0, crash/SSO/CVE/API-500 P1; a duplicate of a P0 still scores on its own text (P1); 60-day-old feature request stays P3 (age cap); missing key/created/summary warn instead of crashing; band counts P0 2 / P1 7 / P2 4 / P3 11 |
| Edge cases (6 checks) | Empty backlog → "clear" digest; non-array input throws TypeError; all-P0 backlog works; single issue has no duplicates; identical issues cluster; "download" does not trigger outage routing or scoring; bare "login" in a cosmetic issue is not "login broken"; byte-identical output on repeat runs (deterministic) |

## Bugs found and fixed in this pass

1. **v1 test actually FAILED — the README claimed it passed.** The old
   test asserted 1 duplicate group but the engine found 0 (Jaccard 0.29
   for the checkout pair). Root cause: raw tokens with filler words and
   no stemming. Fixed with stopwords + stemming + synonyms and an
   overlap-coefficient similarity. The v1 README's "tests passed" line
   was a pre-filled claim, not a run. It is now replaced by the real run
   above.
2. **Security leak scored P2 35, team "backend".** "Security" (30) + type
   (5) couldn't reach P1, and "server" in "server logs" routed to backend
   before security was checked. Fixed: credential-leak signal (55),
   security-first routing, word-boundary matching.
3. **API 500 timeout scored 6, P3, with no reasons.** "timeout"/"500"
   weren't in the keyword tables at all. Fixed: 500/timeout signal (40)
   + "under load" impact (+10) → P1 55.
4. **Cosmetic button scored P2 35.** Bare "login" matched the
   login-broken rule and 15 days of age added 15 points. Fixed: only
   "cannot log in / login fails" counts as login-broken; age capped at +5.
5. **"production" double-counted as "prod".** Substring matching counted
   both. Fixed: longest-first phrase matching with span consumption, and
   an explicit "impact capped at +20" note in the reasons when the cap
   bites. The score breakdown is now auditable on every item.
6. **UMD export threw in the browser.** Bare `module.exports = …` in
   `src/triage.js` crashed the demo page (`module is not defined`). Fixed
   with a guarded UMD export; the demo page now renders with 0 console
   errors. This bug was found by the demo-page screenshot test, not by
   the Node tests — which is why the demo page exists.
7. **Manifest YAML error caught by `forge lint`.** `app.description`
   contained an unquoted ": " and failed YAML parsing. Fixed by quoting.
   (Full `forge lint` still needs a login — see below.)

## What is still NOT done (honest list)

1. **No Atlassian account, no deployment.** `forge login / deploy /
   install` need eico's Atlassian developer account + a Jira Cloud test
   site (Standard/Premium trial includes Rovo; free tier does not).
   `manifest.yml` still has the placeholder app id
   (`ari:cloud:ecosystem::app/00000000-…`) — `forge create` replaces it.
2. **Live-Jira path untested.** `src/index.js` reads Jira via POST
   `/rest/api/3/search/jql` and flattens ADF descriptions. Written from
   the official docs; never run against a real Jira site. The fallback is
   labelled LOCAL DEMO MODE in every response, so a judge can tell the
   difference. This is the single biggest remaining risk: if the search
   endpoint or the ADF shape differs in practice, the deployed app's
   fetch breaks (the engine itself would still be fine).
3. **`forge lint` cannot run here.** It needs a login. The local
   `scripts/validate-manifest.py` checks 60+ documented rules instead
   (key regexes, length limits, cross-references, prompt/skill files,
   scopes). It is a stand-in, not the real thing — the first `forge
   deploy` may still surface something it doesn't cover.
4. **Demo video (draft) done 2026-11-25:** `video/triagebot-demo.mp4`
   (1:41, real screenshots + English TTS + subtitles, verified: full decode,
   non-silent audio, 5 frames reviewed). The Rovo segment is a labelled
   mockup slide — the final cut swaps it for live Rovo chat footage after
   deployment (see `video/VIDEO-NOTES.md`). YouTube upload is eico's step.
5. **No Teamwork Graph, no Marketplace listing.** Both are $1,500 bonus
   paths we deliberately skipped: TWG needs org-admin install + paid
   Rovo; Marketplace needs a listing review. The app is eligible for
   Best Agents and Best MCP as built.
6. **Scoring is rules, not a model.** Deterministic and explainable, but
   it will miss sarcasm, idiom, non-English text, and genuinely novel
   failure modes. The submission text says this plainly instead of
   claiming AI understanding it doesn't have.

## What "good" means here

- A human can paste 24 messy issues and get a ranked, deduped plan with
  a reason for every line in under 20 ms, in a browser, with no account.
- Every number in the output can be traced to a rule in
  `skills/triage-playbook/references/scoring.md`.
- Nothing the product claims to do requires believing an untested step:
  the untested steps are listed above, in this file and in the README.
