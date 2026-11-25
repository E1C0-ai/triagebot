---
name: triage-playbook
description: Triage a Jira backlog end to end — cluster duplicate issues, score each issue P0-P3 with reasons, suggest an owning team, and draft first replies. Use when a user asks to triage, clean up, prioritise, or make sense of a backlog, a project, or this week's issues.
allowed-tools: triage-backlog get-duplicates draft-reply
---

# Triage playbook

Use this skill whenever the user wants a Jira backlog triaged. The workflow
is always the same three steps, in this order. Do not skip a step, and do not
act on the results without the user saying so.

## Step 1 — Triage the whole backlog

Call `triage-backlog` with the project key if the user gave one, otherwise
with no project key (all open issues on the site).

Read the result and present the digest first: total issues, duplicate groups,
P0/P1/P2/P3 counts, then the top 5 issues with band, score, key, title,
owning team, and reason. The scores are deterministic and explainable:

- Severity is the single highest matching signal (outage / data loss /
  credential leak / payment failure / crash / login broken / 500 / timeout).
  Overlapping keywords are never counted twice.
- Impact adders (all users, production, revenue, under load) are capped
  at +20. Age adds at most +5. An old cosmetic bug can never outrank a
  fresh outage.
- Every item carries a `breakdown` (severity + impact + type + age = score).
  If a user questions a score, quote its breakdown, don't guess.

## Step 2 — Show the duplicates

Call `get-duplicates` (same project key as step 1, if any).

For each group: the issue to keep is the earliest report. The rest are
duplicates of it. Quote the similarity score and the shared keywords.
If two issues only look similar — same button words, different pages —
they are separate problems; say so if the user asks.

## Step 3 — Draft replies only for the issues the user picks

Call `draft-reply` with the issue key, one issue at a time. Show the draft
exactly as returned, with band, score, reasons, and team.

Response times are band-appropriate by design: P0 within 4 business hours,
P1 within one business day, P2 within 3 business days, P3 in the next
sprint planning. Do not promise faster times.

## Boundaries

- Never close an issue, reassign anyone, change a priority, or post a
  comment. TriageBot proposes; a human approves. If asked to act, prepare
  the exact change and ask for approval first.
- If an action result says LOCAL DEMO MODE, tell the user the numbers come
  from sample data, not live Jira.
- If the backlog is empty, report that it is clear. Never invent issues.
- If an action fails (unknown project key, no permission), report the exact
  error and suggest checking the project key or the app's installation.

## References

- `references/scoring.md` — the full scoring table (signals, weights, caps,
  bands) and the duplicate-detection algorithm, for when a user asks "why
  did this score P1?".
