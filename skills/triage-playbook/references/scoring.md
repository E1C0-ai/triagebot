# Scoring reference — how TriageBot scores, in full

Read this when a user asks "why did this score P1?" Quote the breakdown
(`severity + impact + type + age = score`) rather than guessing.

## Bands

| Band | Score | Meaning |
| ---- | ----- | ------- |
| P0 | 70–100 | Drop everything: outage, data loss, payment down for all users |
| P1 | 50–69 | Urgent: security leak, crash, login broken, API 500 under load |
| P2 | 30–49 | Needs a plan: a broken flow, a blocked release, a single error |
| P3 | 0–29 | Backlog: cosmetic, feature request, or a stale nice-to-have |

## Severity — one signal wins

The engine matches phrases against title + summary, longest first, and
consumes each matched span, so overlapping words are never double-counted
("production" never also counts as "prod"). Only the highest matching
signal counts as severity.

| Signal (example phrases) | Weight |
| ------------------------ | ------ |
| data loss | 55 |
| credential leak (token leaked, password leaked, secret exposed, API key leaked) | 55 |
| security breach, known CVE (CVE-2026-…), outage / down | 50 |
| leaked (bare) | 50 |
| payment failure (payment fails/error, checkout fails/error, cannot complete orders) | 45 |
| crash | 45 |
| login broken (cannot log in, login fails/broken, cannot sign in) | 40 |
| blocked / blocker | 40 |
| server error (500, timeout, times out) | 40 |
| security vulnerability | 40 |
| broken, error | 20 |
| slow / slowness | 10 |
| unreachable | 45 |

No signal matches → severity 0. A bare word is never enough: "login" in
"login page button misaligned" is cosmetic and scores 0 severity, while
"cannot log in" scores 40.

## Impact — adders, capped at +20

| Signal | Weight |
| ------ | ------ |
| all users | +15 |
| production / prod | +10 |
| revenue, paying, many users, under load, enterprise | +10 each |
| customers | +5 |

The cap is the point: an issue that matches every impact phrase still
gets at most +20. If the raw impact exceeds the cap, the reasons list
says "impact capped at +20".

## Type and age — tiebreakers, not drivers

| Factor | Points |
| ------ | ------ |
| Type Bug | +5 |
| Type Incident | +10 |
| Type Task / Story / Epic | +0 |
| Age | +1 per 3 days open, capped at +5 |

A 60-day-old feature request gets +5 and stays P3. A fresh outage gets
+0 age and is still P0.

## Duplicate detection

1. Lowercase, strip punctuation, drop stopwords (the, for, in, on, …).
2. Stem consistently (complete/completed → complet, fails → fail,
   leaked → leak, users → user) and map synonyms (log/signin → login,
   db → database).
3. Similarity = max(Jaccard, overlap coefficient) of the two token sets.
4. Duplicates when similarity ≥ 0.55 **and** at least 3 shared keywords.

Why both measures: a short duplicate ("Payment error at checkout") shares
most of its tokens with a longer original, so overlap is high even when
Jaccard is dragged down by the original's extra words. The 3-keyword floor
stops false positives like two different broken buttons ("Button broken on
settings page" vs "Button broken on login page": 3 shared words but
similarity 0.38 — correctly not duplicates).

The kept issue is the earliest-created report in the group.

## Team routing

First match wins, in this order: security → payments → infra → backend →
frontend → triage-queue. Security is checked before backend on purpose:
"auth token leaked in server logs" is a security issue even though the word
"server" appears. Matching is word-boundary based ("down" never matches
"download", "ui" never matches "building"). No rule matches → the issue
goes to `triage-queue` for a human to route — that is a valid outcome,
not a failure.
