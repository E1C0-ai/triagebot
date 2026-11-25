# Codegeist 2026 — Devpost submission draft (TriageBot, v5 FINAL DRAFT)

> Status: FINAL DRAFT. GitHub placeholder filled 2026-11-26 — repo is
> https://github.com/E1C0-ai/triagebot (empty public repo, created by
> eico on github.com; **code NOT yet pushed** — browser upload pending,
> main agent to execute, see `PUSH-READY.md`). Still do NOT submit
> before the judge installation link and the final video exist.
> v5 (2026-11-26): deployed + installed + live-Jira tested (see "Live Jira
> test" below). App id `42ec596c-767c-41b1-93da-b1e98ac51814`, development
> v2.1.0, installed in Jira on the demo site one-atlas-sixi.atlassian.net.
> v4 (2026-11-25): added the optional LLM-polish story — local decisions +
> opt-in wording polish, privacy-first differentiation, Jira-native plugin
> as a stated future step.
>
> Do NOT submit before: (1) the judge installation (distribution) link
> exists, (2) the final video (with live Rovo footage) is on YouTube,
> (3) the code is pushed to GitHub. GitHub note 2026-11-26: the repo
> already exists — https://github.com/E1C0-ai/triagebot (empty public
> repo under E1C0-ai, created by eico on github.com after the
> connector's `create_repository` failed with 403, "Resource not
> accessible by integration"). The code itself has NOT been pushed yet:
> push is by browser upload, pending the main agent (see `PUSH-READY.md`).
> All text is in English, as the rules require. Rules re-verified
> 2026-11-25 from codegeist2026.devpost.com/rules: deadline **2026-12-22
> 12:00 Pacific** (2026-12-23 04:00 Beijing); video must be < 5 minutes and
> publicly visible on YouTube; an installation link judges can use is required;
> China is NOT on the exclusion list (Brazil, Quebec, Russia, Belarus, Crimea,
> Cuba, Iran, North Korea, Syria, Sudan, Myanmar are) — final word is the
> Eligibility field on eico's Devpost account at submission time.

## Category

**Apps for Software Teams** — "Give dev teams the context to ship with
confidence. Think smarter code reviews, deployment awareness, issue triage
that actually understands what matters."

## Bonus prizes to select

- **Best Agents — Rovo/Assignable agents:** the app defines a `rovo:agent`
  plus a reusable `rovo:skill` (`triage-playbook`) other agents can invoke.
- **Best app with Atlassian MCP:** the app exposes the same three tools
  through the `rovo:mcp` module (Preview).
- One submission can win at most one grand prize + one bonus prize.

## Title

TriageBot — one-click Jira backlog triage

## Tagline

Turn a messy Jira backlog into a ranked, deduped plan — with a reason for
every line, and a human approving every action.

## Description

Every software team has the same Monday problem: a Jira backlog full of
duplicates, stale requests, and one outage buried under cosmetic tickets.
Triage is the first job a new hire gets and the first job that slips — and
it is usually done by gut feel, in a spreadsheet, at 11 pm.

TriageBot is a Forge + Rovo agent that does the first pass in seconds.
Ask it to triage a project and it:

- clusters duplicate issues (stopword-stripped, stemmed similarity — the
  "Payment error at checkout" report is matched to the "Checkout payment
  fails for all users" outage at similarity 0.86, while two different broken
  buttons are correctly kept apart);
- scores every issue P0–P3 with a reason you can audit — severity is the
  single highest signal, impact is capped at +20, age is a tiebreaker capped
  at +5, and every score carries its full breakdown;
- suggests an owning team (security is checked before backend, so an auth
  token leaked in server logs routes to security, not backend);
- drafts a first reply with a band-appropriate response time (P0: 4 business
  hours, P1: one business day).

It never closes an issue, reassigns anyone, or posts a comment. It
proposes; a human approves. That boundary is the product, not a limitation:
triage decisions are cheap to propose and expensive to get wrong.

**How the AI works — local decisions, optional cloud wording.** The
scoring, duplicate detection and team routing are deterministic rules
that run locally: no model call, no account, no data leaving the machine.
The LLM is used in exactly one place — rewriting the *wording* of a draft
reply so it reads naturally — and only when the user opts in with their
own OpenAI-compatible key. The model receives a single issue's title,
summary, band and score, is told the decision is fixed and must not
change, and any failure falls back to the local draft. The key lives only
in memory and is never stored. That split is the differentiation:
**privacy-first** (default mode makes zero network requests),
**out of the box** (no signup, no payment, no key needed for full triage),
and **extensible** — the same engine is already a Forge app, so the next
step is a one-click Jira-native plugin install from the Marketplace.

The scoring is deterministic rules, not a black-box model — the same
backlog always produces the same plan, and any score can be traced to a
rule in the bundled scoring reference (`skills/triage-playbook/references/
scoring.md`). The demo page runs the exact engine the agent calls, in the
browser, with no account.

**Built with:** Forge, Rovo Agent, Rovo Skill, Rovo MCP, Jira REST API
(`read:jira-work` only — the app is read-only by design).

## How it meets the technology requirement

Built on Atlassian Forge and integrated with Jira and Rovo: a `rovo:agent`
with three GET actions (`triage-backlog`, `get-duplicates`, `draft-reply`)
that read live Jira issues through `@forge/api` (POST
`/rest/api/3/search/jql`), plus a reusable `rovo:skill` and a `rovo:mcp`
module exposing the same tools. The three actions are GET-only by design —
an automation-triggered agent never calls a write operation — and the app
holds only the `read:jira-work` scope. The `draft-reply` action can
optionally polish a draft's wording with an LLM when the caller supplies
a key per call (`src/llm.js`); without one it returns the local draft and
makes no network request. Scoring, clustering and routing never involve
a model call.

## Bonus prize write-ups

**Best Agents:** TriageBot is a Rovo agent with a defined prompt, three
tool actions, and a reusable `rovo:skill` (`triage-playbook`) containing the
full scoring table, so any other agent can invoke the same triage playbook
as a tool. Conversation starters: "Triage this week's backlog",
"Which issues are duplicates?", "Draft replies for the top 5 issues".

**Best app with Atlassian MCP:** the same three tools are exposed through
the `rovo:mcp` module, so the triage engine is callable from any MCP
client, not only from inside Jira. The skill's `SKILL.md` can also be added
to third-party agents as an open-source skill file.

## Live Jira test — verified 2026-11-26 (not a mockup)

Deployed to the development environment (v2.1.0) and installed in Jira on
the Forge demo site **one-atlas-sixi.atlassian.net**. A clean test project
**Triage Test (TT)** was created with 5 issues, and Rovo was asked the
three conversation starters in the project board's Rovo chat. No errors.

- **TT-1** Bug: "Checkout page crashes on payment submit" (production, urgent)
- **TT-2** Bug: "Checkout fails when paying with card" (explicit duplicate of TT-1)
- **TT-3** Bug: "Login button does nothing on mobile Safari"
- **TT-4** Task: "Update password reset email text" (cosmetic)
- **TT-5** Bug: "API returns 500 on orders endpoint" (production, timeouts)

Rovo's answers, verbatim in substance:

1. **"Which issues are duplicates?"** → "TT-2 appears to duplicate TT-1."
   It quoted TT-2's own description ("Same as the checkout crash issue
   above – this is a duplicate") and noted no formal duplicate link was
   recorded. Correct.
2. **"Which issues are most urgent?"** → "TT-1 and TT-5 look most urgent,
   based on their reported production impact", TT-3 next, TT-2 to be
   investigated together with TT-1, **TT-4 last** (explicitly cosmetic).
   Rovo also noted all five issues share the same Jira priority field, so
   the ranking came from the production impact in the text, not the field.
   Correct.
3. **"Draft a first reply for the checkout crash issue (TT-1)"** → a
   usable first-reply draft (asks when it started, browser/device/payment
   method, steps, error message/screenshot, order ID; warns against
   sharing card numbers), plus internal notes: TT-1 is unassigned, TT-2
   is its duplicate, no runbook/workaround was found so no fix was
   invented. The draft was **not posted** to the issue — it stays a draft
   until a human approves. Correct.

This test exercised the live-Jira path (`POST /rest/api/3/search/jql` +
ADF flattening in `src/index.js`) end to end for the first time — it had
previously been written from the official docs only. It worked with no
code changes.

## Installation / testing instructions (for judges)

1. Open the installation link: [PASTE DISTRIBUTION LINK — app is deployed
   (development v2.1.0, app id 42ec596c-767c-41b1-93da-b1e98ac51814) and
   installed on the demo site one-atlas-sixi.atlassian.net; the judge
   installation link comes from the Forge "Start sharing your app" flow,
   not yet generated]
2. Install into a Jira Cloud site (a Standard or Premium trial includes
   Rovo; the free tier does not). Approve the single scope `read:jira-work`.
3. In Jira, open Rovo Chat, pick the **TriageBot** agent, and try:
   - "Triage this week's backlog"
   - "Which issues are duplicates?"
   - "Draft replies for the top 5 issues"
4. No API key or configuration is needed. If the site has no open issues,
   the agent says the backlog is clear.
5. To see the engine without a Jira site, open `demo/index.html` in the
   repository — it runs the same code in the browser (6-issue sample,
   24-issue stress set, empty backlog, or paste your own issues as JSON).
   `npm test` runs the 31 automated tests (22 engine + 9 LLM-polish).
   On the demo page, the optional LLM polish toggle is off by default:
   turn it on, add your own OpenAI-compatible key, and polish one draft
   at a time — or leave it off and everything still works, with zero
   network requests.

## Video

- YouTube link: [PASTE AFTER UPLOAD — under 5 minutes, must be public]
- Draft video in the repo: `video/triagebot-demo.mp4`, 1:41 (100.8 s),
  1280×720, H.264 + AAC, verified full decode + non-silent audio.
  The Rovo segment (1:03–1:18) is still a labelled mockup slide: the
  live test above has now run, so the final cut only needs real Rovo
  screenshots from the Triage Test board (TT-1–TT-5, the three answers),
  swapped in for `video/screenshots/06-rovo-mockup.png` via
  `video/build_video.py`, plus the seg4 subtitle line changed from
  "Live Rovo chat footage will be recorded once the app is deployed"
  to live-footage wording. **Do not submit the mockup cut.**
- Contents: the Monday problem → demo-page triage of 6 issues → duplicate
  groups and draft replies → 24-issue stress test → Rovo chat in Jira →
  read-only safety boundary → optional LLM polish segment (toggle off by
  default, one draft polished, one failed key falling back to the local
  draft — the privacy story in action).

## Links

- GitHub repository: https://github.com/E1C0-ai/triagebot
  (empty public repo, created 2026-11-26; **code NOT yet pushed** —
  push by browser upload, pending the main agent, see `PUSH-READY.md`)
- Installation link: [PASTE DISTRIBUTION LINK — see above]
- Demo video (YouTube): [PASTE AFTER UPLOAD]

## What is NOT claimed

- The live-Jira path is now verified end to end (see "Live Jira test"
  above); the demo page and the local tests are the other verified parts.
- No Teamwork Graph integration and no Marketplace listing are claimed.
  A Marketplace listing is a stated future step, not a present one.
- Scoring is rule-based and deterministic; it does not claim LLM
  understanding of issue text. The LLM is used only to polish draft
  wording, only when the user opts in with their own key, and the
  decision (band, score, team, response time) is never delegated to it.
  The key is held in memory only and never stored.
- The draft video's Rovo segment is a labelled mockup; the submitted video
  must show the live Rovo chat from the 2026-11-26 test, not the mockup.
