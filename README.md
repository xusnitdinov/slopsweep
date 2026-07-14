# SlopSweep

### Scrub Copilot tip residue from PRs - and keep READMEs healthy.

**Live:** [slopsweep.vercel.app](https://slopsweep.vercel.app)

In March 2026, GitHub Copilot injected promotional “tips” into pull request descriptions - Raycast, Slack, Teams, VS Code, JetBrains, Eclipse, and more. Many were wrapped in a hidden HTML comment:

```html
<!-- START COPILOT CODING AGENT TIPS -->
```

GitHub disabled the feature on **March 30, 2026**. They did **not** remove the junk already written into history.

Public reporting put the blast radius at roughly **11,000+** PRs for a single tip phrase and **1.5 million+** across tip variants. **SlopSweep is the janitor.**

---

## Features

| Area | What you get |
| --- | --- |
| **PR scanner** | Scan open/closed PRs for tip markers & promo lines |
| **Line diff** | Real `+`/`−` preview before you clean |
| **Bulk clean** | Confirm once, clean many PR descriptions |
| **Org mode** | Filter by owner / collaborator / organization |
| **README health** | Score READMEs: missing, thin, TODOs, tip residue |
| **AI README writer** | Draft or improve READMEs by scanning repo code (no API key required) |
| **Public inspect** | Paste any public PR URL - no login ([/inspect](https://slopsweep.vercel.app/inspect)) |
| **History + undo** | Local clean history; restore a previous PR body |
| **Stats** | Session counters for portfolio screenshots ([/stats](https://slopsweep.vercel.app/stats)) |
| **GitHub Actions** | PR tip-check comments + weekly reminder workflow |
| **Optional Slack** | Notify a webhook when a scan finishes |
| **Optional OpenAI** | Richer README prose if `OPENAI_API_KEY` is set |

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

## Safety first

| Operation | Allowed? |
| --- | --- |
| Delete a repository | **Never** |
| Delete branches / tags | **Never** |
| Force-push / rewrite commits | **Never** |
| Create or close PRs | **Never** |
| List repos / read PR bodies | Yes (scan) |
| Edit a PR **description** only | Yes - after confirm |
| Create/update `README.md` | Yes - after confirm (AI draft / tip clean) |

**Scan is read-only.** Writes are opt-in and scoped. OAuth scopes: `read:user` + `repo`. Revoke anytime in GitHub → Settings → Applications.

---

## Try it

1. **Public PR (no login):** [slopsweep.vercel.app/inspect](https://slopsweep.vercel.app/inspect)
2. **Full dashboard:** [slopsweep.vercel.app/dashboard](https://slopsweep.vercel.app/dashboard) → Sign in with GitHub
3. **Stats:** [slopsweep.vercel.app/stats](https://slopsweep.vercel.app/stats)

---

## Quick start (local)

```bash
cp .env.example .env.local
npm install
```

1. Create a [GitHub OAuth App](https://github.com/settings/developers):
   - **Homepage:** `http://localhost:3000` (or your production URL)
   - **Callback:** `http://localhost:3000/api/auth/callback/github`
2. Fill `.env.local`:

```env
AUTH_SECRET=your-random-secret
AUTH_GITHUB_ID=your-oauth-client-id
AUTH_GITHUB_SECRET=your-oauth-client-secret
AUTH_URL=http://localhost:3000
```

3. `npm run dev` → open `/dashboard`.

### Optional env

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Richer AI README drafts (falls back to code-scan writer) |
| `SLACK_WEBHOOK_URL` | Dashboard “notify Slack after scan” |
| `GITHUB_TOKEN` | Higher rate limits for public `/inspect` |
| `CRON_SECRET` | Protect `/api/cron/weekly` |

---

## Deploy (Vercel)

Production URL: **https://slopsweep.vercel.app**

```bash
npx vercel env add AUTH_SECRET production
npx vercel env add AUTH_GITHUB_ID production
npx vercel env add AUTH_GITHUB_SECRET production
npx vercel env add AUTH_URL production   # https://slopsweep.vercel.app
npx vercel --prod
```

OAuth App callback must be:

`https://slopsweep.vercel.app/api/auth/callback/github`

---

## GitHub Actions (included)

| Workflow | What it does |
| --- | --- |
| [`.github/workflows/pr-tip-check.yml`](.github/workflows/pr-tip-check.yml) | Comments on PRs that still contain tip residue |
| [`.github/workflows/weekly-slopsweep.yml`](.github/workflows/weekly-slopsweep.yml) | Monday reminder issue to re-scan |

Copy these into other repos you maintain if you want the same guardrails.

---

## How detection works

Logic: [`src/lib/detectors.ts`](src/lib/detectors.ts) (unit tested).

1. **Marker blocks** between `START COPILOT CODING AGENT TIPS` and matching `END`
2. **Known promo phrases** (Raycast, Slack, Teams, VS Code, Visual Studio, JetBrains, Eclipse)
3. **Cleanup** - strip matches, collapse leftover blank lines

Conservative on purpose: markers + known phrases, not fuzzy “this might be an ad” guesses.

### README AI (no API key)

[`src/lib/readme-ai.ts`](src/lib/readme-ai.ts) walks the repo tree, samples source files, extracts routes/exports/comments, then drafts a README. Language-aware templates for Next.js, Python bots, static HTML, Rust, and Go. Optional OpenAI if configured.

---

## Architecture

```text
Browser
  ├─ /                  Landing
  ├─ /inspect           Public PR URL scan (no auth)
  ├─ /stats             Local session stats
  └─ /dashboard
        ├─ GET  /api/orgs            repos + orgs (read)
        ├─ POST /api/scan            scan PR bodies (read)
        ├─ POST /api/clean           update PR body (write)
        ├─ POST /api/readme/scan     README health (read)
        ├─ POST /api/readme/generate AI draft (read + analyze)
        ├─ POST /api/readme/commit   create/update README (write)
        ├─ POST /api/readme/clean    strip tips from README (write)
        ├─ POST /api/restore         undo PR body (write)
        ├─ POST /api/public-pr       public inspect (read)
        └─ POST /api/notify/slack    optional webhook
```

| Layer | Tech |
| --- | --- |
| UI | Next.js App Router, TypeScript, Tailwind, DM Sans |
| Auth | Auth.js (NextAuth v5) + GitHub OAuth |
| GitHub | Octokit REST |
| Tests | Vitest |

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

---

## Project layout

```text
src/
  app/
    page.tsx                 Landing
    dashboard/               Authenticated scan UI
    inspect/                 Public PR inspect
    stats/                   Session stats
    api/auth/                OAuth
    api/scan/                PR list + scan
    api/clean/               PR body clean
    api/readme/              Scan / generate / commit / clean
    api/orgs/                Org + affiliation filters
    api/public-pr/           No-login PR fetch
    api/restore/             Undo PR body
    api/notify/slack/        Optional Slack
    api/cron/weekly/         Vercel cron hook
  lib/
    detectors.ts             Tip matching
    readme-ai.ts             Code-aware README drafts
    github.ts                Octokit helpers
    diff.ts                  Line diff
    client-store.ts          History + stats (browser)
  components/
    DashboardClient.tsx      Main app UI
    LineDiff.tsx             Diff preview
    Reveal.tsx               Scroll animations
  auth.ts                    Auth.js config
.github/workflows/           PR tip check + weekly reminder
```

---

## Portfolio talking points

- Built for a **real, dated** platform incident (March 2026)
- Clear split: **read-only scan** vs **confirmed writes**
- Detection covered by tests; marker-first = low false positives
- Maintainer tooling: org filters, bulk clean, Actions, public inspect
- README AI that **reads code**, not just the repo description

---

## Roadmap

- [ ] GitLab merge-request support  
- [ ] Org bulk audit CSV export  
- [ ] Browser extension badge on PR pages  
- [ ] Stricter scan-only OAuth mode (`public_repo`)  

---

## Disclaimer

SlopSweep is an unofficial community tool. Not affiliated with GitHub or Microsoft. Always review the diff before cleaning. You are responsible for changes made with your OAuth token.

---

## License

MIT - use it, fork it, ship it on your portfolio.
