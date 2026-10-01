---
type: index
updated: 2026-10-01
---

# parity-tracker tickets

Every unit of work is a **ticket** = a PRD page in this folder, named `<PREFIX>-NNN.md`. The board (To Do / In Progress / Blocked / Done) renders live in the projectkit Jira (`/jira`), which parses each ticket's frontmatter.

Create one: `scripts/wt.sh ticket new <module> "<title>"` → then fill in the PRD + success criteria. Move it: `scripts/wt.sh ticket set <id> status in-progress|blocked|done`. See [TEMPLATE](TEMPLATE.md).
