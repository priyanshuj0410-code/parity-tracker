# parity-tracker — Claude Code project guide

parity-tracker was scaffolded with **projectkit**. This file is the contract for how to work in this repo and how to maintain the knowledge wiki. Read it at the start of every session. Stack: **web**.

## How to work here

- **Verify before shipping** (adapt to the stack): run the build / lint / tests before opening a PR.
- **PR workflow:** branch → commit → push → open PR → the user merges. Squash-merge.
- **Secrets:** keep real secrets in gitignored `.env*` (carried into worktrees automatically by `wt.sh`); never commit them.
- This project is part of the **projectkit local Jira** — work is tracked as tickets and coordinated through module locks (below). Treat each chat as an **employee**.

## Working in parallel (multiple chats) — chats are employees

Run several Claude Code chats at once without messy branches or wasted tokens. **1 module = 1 worktree = 1 chat = 1 branch = 1 PR.** Spin up with `scripts/wt.sh new <module>`; never run two chats in the same directory (one dir holds one branch — that is the mess). Disjoint PRs merge for free; each chat loads a fraction of the context.

**Scope each chat to its module.** Start by reading `CLAUDE.md` + `wiki/index.md` + *your module's* wiki page — not the whole codebase. To reach into another module, read *its* wiki page, not its source.

**Module map — the lanes of the board.** Keep this table in sync with [`scripts/module-map.txt`](scripts/module-map.txt) (the lock hook reads the file):

| Module | Read first | Owns (paths) |
|---|---|---|
| wiki | this file + the wiki schema below | `wiki/**` |
| _(add lanes as the project grows: e.g. `web` → `src/`, `api` → `server/`, `database` → `migrations/`)_ | | |

**Module locks (enforced) — two chats can never work the same module.** A `PreToolUse` hook (`.claude/settings.json` → `scripts/hooks/guard-edit.sh`) runs before every `Edit`/`Write`/`MultiEdit`. It maps the file to its module via `scripts/module-map.txt` and, the first time your chat edits a module, **auto-claims** an exclusive lock; if another chat already holds it, the edit is **refused by the harness**. You hold a module until you give it up.
- `scripts/wt.sh claim <module…>` — reserve up front. `release <module…>` — give it up. `locks` — see who holds what.
- Blocked? Pick a different module, or **file a ticket** for the holder (see below) — do not edit their module.

**Shared / hot files — coordinate or serialize:** the lockfile + shared config, the central app/router shell, design tokens. If your task must touch one, run it solo or merge that PR first.

**Merge / rebase discipline:** merge independent PRs in any order (squash on the host); after any merge, `git fetch origin && git rebase origin/main` in every other worktree (disjoint = conflict-free).

## Tickets & the board (local Jira)

Every unit of work is a **ticket** — a PRD page under [`wiki/tickets/`](wiki/tickets/) with frontmatter (`module`, `status`, `assignee`, `priority`) + a **PRD** + **success criteria**. The board (To Do / In Progress / Blocked / Done) renders live across all your projects at the projectkit Jira (`/jira`).

The employee loop:
1. **Pick or file a ticket** — `scripts/wt.sh ticket list --status todo`, or create one: `scripts/wt.sh ticket new <module> "<title>"`, then fill the PRD + success criteria.
2. **Claim the module** — `scripts/wt.sh new <module>` (your lane); the lock makes it exclusively yours.
3. **Work**, treating the ticket's success criteria as the definition of done.
4. **Move it** — `scripts/wt.sh ticket set <id> status in-progress` (and `set <id> assignee <your-chat>`), then `… status done` when the criteria pass.
5. **Delegate** — to get work done in a module another chat owns, **file a detailed ticket** for it (never edit their files): `ticket new <module> "<title>"` with a full PRD + success criteria, then `wt.sh post "BLOCK: <id> — <what you need>"`.

## The knowledge wiki (`wiki/`) — LLM-maintained

This repo follows the **LLM Wiki pattern** (Karpathy): a persistent, interlinked markdown knowledge base so context compounds across sessions instead of being re-derived. You (the LLM) own and maintain it; the human curates and asks questions.

**Three layers:** (1) **raw sources** you add (PRDs/docs/data — immutable), (2) **the wiki** (`wiki/`, LLM-generated, interlinked), (3) **the schema** (this file).

**Layout**
```
wiki/
  index.md        catalog of every page (link + one-line summary), grouped by section
  log.md          append-only timeline; entries: ## [YYYY-MM-DD] type | title
  overview.md     the living synthesis of the project
  tickets/        the board — one PRD page per ticket
  product/ architecture/ domain/ decisions/
```

**Conventions:** light YAML frontmatter (`type`, `updated`, optional `tags`); link pages with **relative** markdown links so they render on the host and in Obsidian; concise synthesis over transcription; cite the raw source when a claim comes from one.

**Operations** (the human asks for these):
- **Ingest:** read a new source → write/refresh the relevant pages, update `index.md`, append a `log.md` entry. One source may touch many pages.
- **Query:** read `index.md` first, drill into pages, synthesize with citations; file good answers back as new pages.
- **Lint:** health-check — contradictions, stale claims, orphan pages, missing cross-links, concepts lacking a page.

## Start-here pointers
- Project synthesis → [wiki/overview.md](wiki/overview.md)
- The board / tickets → [wiki/tickets/index.md](wiki/tickets/index.md)
- Parallel work + module locks → "Working in parallel" above (use `scripts/wt.sh`; board at `/jira`)
