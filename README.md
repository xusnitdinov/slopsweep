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
| 1 | Sign in with GitHub |
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

1. Copy env file:

```bash
cp .env.example .env.local
npm install
```

2. Create a [GitHub OAuth App](https://github.com/settings/developers):
   - **Homepage URL:** `https://slopsweep.vercel.app`
   - **Callback URL:** `https://slopsweep.vercel.app/api/auth/callback/github`

3. Fill in `.env.local`:

```env
AUTH_SECRET=your-random-secret
AUTH_GITHUB_ID=your-oauth-client-id
AUTH_GITHUB_SECRET=your-oauth-client-secret
AUTH_URL=http://localhost:3000
```

4. Run `npm run dev`, open `/dashboard`, click **Sign in with GitHub**.

---

## Deploy (public website)

SlopSweep is a **Next.js website**.

| Host | Works? |
| --- | --- |
| **GitHub Pages** | No — needs a real server for scan/clean |
| **Vercel** | Yes (recommended) |

### Live

Production: configure OAuth env vars on Vercel.

1. Create a GitHub OAuth App with callback `https://slopsweep.vercel.app/api/auth/callback/github`
2. Set on Vercel: `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_URL` (`https://slopsweep.vercel.app`)

```bash
npx vercel env add AUTH_SECRET production
npx vercel env add AUTH_GITHUB_ID production
npx vercel env add AUTH_GITHUB_SECRET production
npx vercel env add AUTH_URL production
npx vercel --prod
```

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
    dashboard/page.tsx    Repo scan UI
    api/auth/             OAuth callbacks
    api/scan/             List repos + scan PRs
    api/clean/            Optional PR-body clean
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
- Bulk clean, export, and repo filters for maintainers cleaning many PRs

Suggested screenshots (drop in `docs/` if you capture them):

1. Landing — brand + CTA  
2. Dashboard — stats + repo picker  
3. Dashboard — hit list with preview open  

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
