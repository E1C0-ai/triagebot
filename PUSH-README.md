# Push TriageBot to GitHub — run AFTER eico authorizes GitHub

> Why this file exists: Muse cannot create the repository itself. GitHub
> requires eico to click the OAuth authorization link once
> (https://agent.meta.ai/connectors/connect/github) and select the
> repositories Muse may access. After that, run the commands below.
> Do NOT paste any token in chat.

## 1. Create the repository (in eico's GitHub, via the connector)

Ask Muse to create a **public** repository named `triagebot`
(description: "TriageBot — one-click Jira backlog triage (Codegeist 2026)").
If the connector cannot create it, create it empty on github.com
(no README / .gitignore / license — the files below supply them) and tell Muse.

## 2. Push from this folder

```bash
cd ~/workspace/competitions/codegeist-2026/triage-agent
git init -b main
git add .
git status            # check: node_modules and video/*.wav must NOT appear
git commit -m "TriageBot v2 — Codegeist 2026 submission (engine, Forge app, demo, video)"
git remote add origin https://github.com/<eico-username>/triagebot.git
git push -u origin main
```

## 3. What gets pushed (verified 2026-11-25)

- `src/triage.js` (405 lines, engine, zero deps), `src/index.js` (Forge wiring)
- `manifest.yml`, `resource/agent/prompt.md`, `skills/triage-playbook/`
- `test/`, `test-data/`, `demo/index.html`, `package.json`
- `README.md`, `QUALITY-SELF-CHECK.md`, `SUBMISSION.md`, `EICO-STEPS.md`,
  `video/triagebot-demo.mp4` (1:41), `video/VIDEO-NOTES.md`
- Excluded by `.gitignore`: `node_modules/`, intermediate video audio
  (`video/*.wav`), frame-check JPEGs.

## 4. After pushing

- Copy the repo URL into `SUBMISSION.md` (GitHub repository line).
- The repo URL is also the "code" link Devpost asks for. The installation
  link for judges is separate — it comes from `forge deploy` (see EICO-STEPS.md).
