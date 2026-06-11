---
name: run-job-portal-ui
description: Build, run, and drive job-portal-ui (the Vite/React job portal SPA). Use when asked to start the dev server, screenshot a page, click through a flow, check console errors, or otherwise verify the running app.
---

This is a Vite + React 19 SPA with no backend (mock data + localStorage).
Drive it by starting the Vite dev server, then piping commands to the
Playwright-based REPL driver at `.claude/skills/run-job-portal-ui/driver.mjs`.

## Prerequisites

Playwright is a devDependency (already in `package.json`). Chromium and its
Linux libraries are a one-time install — the second command needs an
**interactive sudo** (it fails in a non-TTY agent shell), so ask the user to
run it themselves:

```bash
npx playwright install chromium
sudo env "PATH=$PATH" npx playwright install-deps chromium
```

`npx playwright install-deps chromium --dry-run` reports whether this is
already done ("All system dependencies are installed.").

## Setup

```bash
npm install
```

## Run (agent path)

1. Start the dev server in the background and wait for it to serve:

```bash
npm run dev > /tmp/vite-dev.log 2>&1 &
echo $! > /tmp/dev.pid
timeout 30 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done'
```

2. Pipe commands to the driver. Pick a `SESSION` name; screenshots land in
   `.claude/skills/run-job-portal-ui/screenshots/<SESSION>/`.

```bash
SESSION=app node .claude/skills/run-job-portal-ui/driver.mjs <<'EOF'
nav http://localhost:5173/jobs
wait-for text=results
fill input[placeholder*="Job"] Engineer
wait-for text=results
screenshot 01-jobs.png
console --errors
quit
EOF
```

3. Stop the server: `kill $(cat /tmp/dev.pid)` (or `pkill -f vite`) before
   relaunching, or the next run hits `EADDRINUSE`.

Driver commands (one per line, space-separated):

| command | what it does |
|---|---|
| `nav <url>` | navigate |
| `wait-for <selector>` or `wait-for text=...` | wait up to 15s for an element/text |
| `click <selector>` | click |
| `fill <selector> <value>` | fill an input (selector must not contain spaces) |
| `press <key>` | keyboard press |
| `screenshot [name.png]` | full-page screenshot, saved under `screenshots/<SESSION>/` |
| `eval <js>` | `page.evaluate(...)`, prints the result |
| `console --errors` | prints captured console.error / pageerror messages |
| `quit` | close the browser and exit |

## Run (human path)

```bash
npm run dev   # → http://localhost:5173, Ctrl-C to stop
```

## Test

```bash
npm run lint
```

## Gotchas

- **Selectors can't contain spaces** — the driver splits each line on the
  first space (`cmd arg`, and for `fill`, `selector value`). A selector like
  `input[placeholder="Job title, company, or keywords..."]` breaks the CSS
  parser. Use a substring match without spaces instead, e.g.
  `input[placeholder*="Job"]`.
- **Mock data has a simulated network delay** (`src/utils/delay.js`, 300ms).
  `wait-for body` resolves before job/company listings finish loading and
  you'll screenshot a "Loading..." placeholder. Wait for real content text
  instead, e.g. `wait-for text=results`.
- Default Vite port is **5173**.

## Troubleshooting

- **`chrome-headless-shell: error while loading shared libraries: libnspr4.so: cannot open shared object file`**
  — Playwright's Chromium system deps aren't installed. Run
  `sudo env "PATH=$PATH" npx playwright install-deps chromium`.
- **`sudo: npx: command not found`** when running the above — `sudo` drops
  the nvm-managed `PATH`. Use `sudo env "PATH=$PATH" npx ...` (not plain
  `sudo npx ...`).
- **`sudo: a password is required`** — `install-deps` needs an interactive
  TTY for the sudo password; it can't run from the agent's non-interactive
  shell. Ask the user to run it directly in their terminal.
