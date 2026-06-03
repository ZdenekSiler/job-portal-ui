# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — Production build
- `npm run lint` — ESLint (flat config, JS/JSX only)
- `npm run preview` — Preview production build

## Architecture

React 19 SPA using Vite 7, Tailwind CSS 4, and React Router 7. No TypeScript — plain JSX throughout.

### State Management

Two layers of React Context:

- **`src/context/`** — Core contexts: `AuthContext` (auth + dummy users + localStorage persistence), `JobContext` (applications, saved jobs, employer job CRUD), `ThemeContext`
- **`src/contexts/`** — Data-fetching contexts: `JobsDataContext` (cached job list with 5-min TTL), `CompaniesContext`

Provider nesting order (in App.jsx): AuthProvider → JobsDataProvider → JobProvider → CompaniesProvider → ThemeProvider

### Data Layer

Currently uses **mock data** with localStorage persistence — no real backend. Services in `src/services/` simulate async API calls using `delay()` from `src/utils/delay.js`. Data originates from `src/data/mockData.js`.

Key localStorage keys: `jobPortalUser`, `authToken`, `registeredUsers`, `globalPostedJobs`, `jobApplications_{userId}`, `savedJobs_{userId}`, `postedJobs_{userId}`.

### Routing & Roles

Three roles with route protection via `ProtectedRoute` component:
- **ROLE_JOB_SEEKER** — profile, applied-jobs, saved-jobs
- **ROLE_EMPLOYER** — post-job, employer/jobs, job-applicants/:jobId
- **ROLE_ADMIN** — admin/*, admin pages in `src/pages/admin/`

### Key Libraries

- Font Awesome + Lucide React for icons
- react-toastify for notifications

### ESLint

Flat config (`eslint.config.js`). The `no-unused-vars` rule ignores variables starting with uppercase or underscore (`varsIgnorePattern: '^[A-Z_]'`).

## Git Workflow

### Commit messages
- Use [Conventional Commits](https://www.conventionalcommits.org/) format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`
- Keep the subject line under 72 characters, imperative mood ("add X", not "added X")
- Put the *why* in the body, not the *what* — the diff already shows the what
- Never commit secrets: `.env`, credential files, private keys
- Each commit should be **atomic** — one logical change, buildable and testable on its own

### Branching
- Branch from `main`
- Name branches: `type/short-description` — e.g. `feat/user-auth`, `fix/login-redirect`
- One concern per branch; keep branches short-lived
- Delete the remote branch after merging

### Pull requests
- PR title follows the same Conventional Commits format as the commit message
- Include a short summary (what changed and why) and a test plan checklist
- Keep PRs focused — split unrelated changes into separate PRs
- Ensure CI passes before requesting review

### Merge strategy
- Prefer **squash merge** for feature branches to keep `main` history clean
- Never force-push to `main` or shared branches
- For long-running branches, rebase onto `main` regularly to stay current and resolve conflicts early

### Rebasing
- Use `git rebase main` (not merge) to integrate upstream changes into a feature branch — keeps history linear
- Use interactive rebase (`git rebase -i`) to clean up a branch before opening a PR: squash fixup commits, reorder, reword
- Never rebase commits that have been pushed to a shared branch — it rewrites history and breaks teammates' clones
- After rebasing, force-push only to your own feature branch: `git push --force-with-lease` (safer than `--force` — aborts if the remote has new commits you haven't seen)

### Stashing
- Use `git stash push -m "description"` to shelve WIP before switching context; always add a message so stashes are identifiable
- Prefer a short-lived WIP commit + `git commit --amend` over a stash pile — stashes are easy to forget
- Run `git stash list` regularly and drop stale entries with `git stash drop stash@{n}`

### Conflict resolution
- Resolve conflicts in the **feature branch**, not in `main`
- After resolving, verify the build still passes before marking conflicts resolved
- For complex conflicts, use `git mergetool` or the IDE diff view rather than editing raw conflict markers by hand
- When in doubt about intent, check `git log --merge` to see the conflicting commits

### Undoing changes
| Scenario | Command |
|---|---|
| Undo last commit, keep changes staged | `git reset --soft HEAD~1` |
| Undo last commit, unstage changes | `git reset HEAD~1` |
| Discard all local changes (destructive) | `git restore .` |
| Revert a pushed commit safely | `git revert <sha>` (creates a new commit) |
| Remove a file from last commit | `git restore --staged <file>` then `git commit --amend` |

- Prefer `git revert` over `git reset` for commits already on a shared branch — revert is safe, reset rewrites history
- Never `git reset --hard` without confirming there is nothing untracked or unstaged you need

### Tagging & releases
- Tag release points on `main`: `git tag -a v1.2.3 -m "Release v1.2.3"`
- Push tags explicitly: `git push origin --tags`
- Use semantic versioning: `MAJOR.MINOR.PATCH`

### Useful inspection commands
```bash
git log --oneline --graph --decorate --all   # visual branch history
git diff main...HEAD                          # all changes on this branch vs main
git log --follow -p -- <file>                 # full history of a single file
git blame -L 10,30 <file>                    # who changed which lines
git bisect start / good / bad                 # binary-search for a regression
git shortlog -sn                              # commit count by author
```

### General hygiene
- Pull and rebase (`git pull --rebase`) before pushing to avoid unnecessary merge commits
- Run `git fetch --prune` regularly to sync deleted remote branches
- Keep `main` always deployable — never commit broken or WIP code directly to it
- Review `git diff --staged` before every commit — catch debug logs, TODOs, and accidental changes
- Add a `.gitignore` entry before the first commit of any generated or secret file; don't rely on fixing it later

## Plugin Commands

Use the `commit-commands` plugin to automate the common workflow:

| Command | When to use |
|---|---|
| `/commit` | Save a checkpoint during development |
| `/commit-push-pr` | Ready to submit — commits, pushes, and opens a PR in one step |
| `/clean_gone` | After PRs are merged — removes stale local branches |

### Typical feature workflow
```
git checkout -b feat/my-feature   # branch from main
# ... write code ...
/commit                            # checkpoint commits
# ... more code ...
/commit-push-pr                    # push and open PR
# PR is reviewed, merged
git checkout main && git pull
/clean_gone                        # clean up local branches
```
