# SlopSweep

### Scrub Copilot’s leftover product tips out of your pull requests.

In March 2026, GitHub Copilot quietly injected promotional “tips” into pull request descriptions — Raycast, Slack, Teams, VS Code, JetBrains, Eclipse, and more. Many were wrapped in a hidden HTML comment:

```html
<!-- START COPILOT CODING AGENT TIPS -->
```

GitHub disabled the feature on **March 30, 2026** after backlash.  
They did **not** remove the junk already written into history.

Public reporting put the blast radius at roughly **11,000+** PRs for a single tip phrase and **1.5 million+** across tip variants — on GitHub and even GitLab. Maintainers were left to clean by hand. **SlopSweep is the janitor.**

---

## What it does

| Step | Action |
| --- | --- |
| 1 | Sign in with GitHub (or use the no-login paste demo) |
| 2 | Pick the repos you want checked |
| 3 | Scan open + closed PRs for tip markers / known promo lines |
| 4 | Preview a before/after **diff** |
| 5 | Optionally **Clean** — strips tip text from the PR description only |

```text
Your PR body                          After SlopSweep
─────────────────────────────         ─────────────────────────────
## Summary                            ## Summary
Fixed login redirect.                 Fixed login redirect.

<!-- START COPILOT … TIPS -->         ## Test plan
Try Raycast to spin up Copilot…       - [x] Log in
…                                     - [x] Confirm redirect
<!-- END COPILOT … TIPS -->
```

---

## Safety first (read this)

SlopSweep is built to be **boringly safe**.

| Operation | Does SlopSweep do this? |
| --- | --- |
| Delete a repository | **Never** |
| Delete branches / tags | **Never** |
| Force-push or rewrite commits | **Never** |
| Modify source code / files | **Never** |
| Create or close PRs | **Never** |
| List your repos (read) | Yes |
| Read PR descriptions (read) | Yes |
| Edit a PR **description/body** only (optional Clean) | Yes — and only after you confirm |

**Scan is read-only.**  
**Clean** calls GitHub’s Issues API to update `body` text on a pull request. That is the only write. There is no `repos.delete`, no git push, no file API writes.

OAuth scopes requested: `read:user` + `repo` (needed so Clean can update PR bodies on private repos you can access). You can revoke the app anytime in GitHub → Settings → Applications.

---

## Why this exists

Copilot’s tips were framed as helpful product guidance. In practice they:

- Wrote into **human-authored** PR descriptions when Copilot was mentioned
- Often hid behind HTML comments most people never see in the rendered view
- Left permanent residue in project history after the feature was killed

GitHub apologized and turned tips off. Cleanup tooling never shipped. SlopSweep fills that gap for anyone who wants their PR history free of AI promo sludge.

---

## Quick start

### Option A — paste demo (no GitHub login)

```bash
npm install
npm run dev
```

Open [http://localhost:3000/demo](http://localhost:3000/demo), hit **Detect & clean**, and watch the sample contaminated PR get scrubbed. Zero secrets required.

### Option B — scan your real repos

1. Create a [GitHub OAuth App](https://github.com/settings/developers)
   - Homepage: `http://localhost:3000`
   - Callback: `http://localhost:3000/api/auth/callback/github`
2. Copy env file and fill values:

```bash
cp .env.example .env.local
```

```env
AUTH_SECRET=              # npx auth secret
AUTH_GITHUB_ID=           # OAuth client ID
AUTH_GITHUB_SECRET=       # OAuth client secret
```

3. Run:

```bash
npm run dev
```

4. Open `/` → **Sign in with GitHub** → Dashboard → select repos → **Scan** → open **Diff** → **Clean** only if you want the tip text removed.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm test` | Detector unit tests (Vitest) |
| `npm run lint` | ESLint |

---

## How detection works

Logic lives in [`src/lib/detectors.ts`](src/lib/detectors.ts) and is covered by unit tests.

1. **Marker blocks** — anything between `START COPILOT CODING AGENT TIPS` and a matching `END` (HTML comment or plain text)
2. **Known promo phrases** from the incident — Raycast tip, Slack / Teams / VS Code / Visual Studio / JetBrains / Eclipse pitches
3. **Cleanup** — strip matched ranges, collapse leftover blank lines

Conservative by design: prefer exact markers and known phrases over fuzzy “this might be an ad” guesses.

---

## Architecture

```text
Browser
  │
  ├─ /demo  ──────────► POST /api/demo   (detect only, no GitHub)
  │
  └─ /dashboard
        │
        ├─ GET  /api/scan   list repos          (read)
        ├─ POST /api/scan   scan PR bodies      (read)
        └─ POST /api/clean  update PR body      (write: body only)
```

| Layer | Tech |
| --- | --- |
| UI | Next.js App Router, TypeScript, Tailwind |
| Auth | Auth.js (NextAuth v5) + GitHub OAuth |
| GitHub | Octokit REST |
| Tests | Vitest |

---

## Project layout

```text
src/
  app/
    page.tsx              Landing
    demo/page.tsx         Paste demo
    dashboard/page.tsx    Repo scan UI
    api/auth/             OAuth callbacks
    api/scan/             List repos + scan PRs
    api/clean/            Optional PR-body clean
    api/demo/             Offline detector
  lib/
    detectors.ts          Tip / promo matching
    detectors.test.ts     Unit tests
    github.ts             Octokit helpers (list + scan + body update)
  components/
    DashboardClient.tsx   Scan / diff / clean UI
  auth.ts                 Auth.js config
```

---

## Portfolio notes

Good talking points for README / interviews:

- Responded to a **real, dated** platform incident (March 2026) with a practical tool
- Separated **read-only scan** from **optional, confirmed write**
- Detection covered by tests; false-positive risk kept low with marker-first rules
- Demo path so reviewers can try it without granting OAuth

Suggested screenshots (drop in `docs/` if you capture them):

1. Landing — brand + CTAs  
2. Demo — contaminated sample → cleaned output  
3. Dashboard — hit list with Diff open  

---

## Roadmap

- [ ] GitLab merge-request support  
- [ ] Org-maintainer bulk mode with audit CSV  
- [ ] Browser extension badge on PR pages  
- [ ] Stricter “scan-only” OAuth mode (`public_repo` / read-only) for users who never want Clean  

---

## Disclaimer

SlopSweep is an unofficial community tool. It is not affiliated with GitHub or Microsoft. Always review the diff before cleaning. You are responsible for changes made with your OAuth token.

---

## License

MIT — use it, fork it, ship it on your portfolio.
