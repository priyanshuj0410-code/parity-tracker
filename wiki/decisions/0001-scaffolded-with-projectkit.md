---
type: decision
updated: 2026-10-01
---

# 0001 — Scaffolded with projectkit

**Date:** 2026-10-01
**Status:** accepted

## Context
parity-tracker is set up with the **projectkit** workflow so multiple Claude Code chats can work in parallel safely and work is tracked like a local Jira.

## Decision
Adopt: per-module worktrees + an enforced module-lock hook (`scripts/wt.sh`, `scripts/hooks/guard-edit.sh`, `scripts/module-map.txt`); tickets as PRD pages under `wiki/tickets/`; an LLM-maintained wiki (Karpathy pattern); git always (+ Vercel for web). The board is the device-wide projectkit Jira (`/jira`).

## Consequences
- Every chat claims a module before editing it; collisions are impossible.
- Every unit of work has a PRD + success criteria.
- Knowledge compounds in `wiki/` instead of being re-derived per session.
