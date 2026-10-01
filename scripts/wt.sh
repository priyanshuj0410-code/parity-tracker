#!/usr/bin/env bash
#
# wt.sh — worktrees + module locks + work queue + tickets for parallel Claude Code
# chats (the "employees"). One module = one worktree = one chat = one branch = one PR.
# Installed per-project by projectkit. See CLAUDE.md > "Working in parallel".
#
set -euo pipefail

# The main checkout is always the first entry of `git worktree list`, so these paths
# are identical whether run from the main repo or any worktree. Worktree home is
# derived from the repo name so every project's locks/queue stay isolated.
MAIN_REPO="$(git worktree list --porcelain | sed -n 's/^worktree //p' | head -1)"
PROJECT="$(basename "$MAIN_REPO")"
WT_HOME="$(dirname "$MAIN_REPO")/${PROJECT}-worktrees"
QUEUE="$WT_HOME/queue.md"
LOCKS="$WT_HOME/locks"
TICKETS="$MAIN_REPO/wiki/tickets"

# Gitignored files a fresh worktree needs to run / avoid re-prompts (copied if present).
CARRY=(
  ".env"
  ".env.local"
  "apps/web/.env.local"
  ".claude/settings.local.json"
)

ensure_queue() {
  mkdir -p "$WT_HOME"
  [ -f "$QUEUE" ] || printf '# %s work queue — shared across worktrees, NOT in git. Append-only. Tags: CLAIM / BLOCK / DONE / NOTE.\n' "$PROJECT" > "$QUEUE"
}

# Which chat is acting? The worktree folder name, else "main".
current_slug() {
  case "$PWD/" in
    "$WT_HOME"/*) basename "$PWD" ;;
    *) echo "main" ;;
  esac
}

append_line() {  # <slug> <message...>  (one short line; >> append is atomic)
  local slug="$1"; shift
  ensure_queue
  printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M')" "$slug" "$*" >> "$QUEUE"
}

# --- module locks -------------------------------------------------------------
# A lock is a directory $LOCKS/<module> (mkdir is atomic). Holder metadata in
# <lock>/info. A lock is "stale" when its holder worktree no longer exists.

lock_holder()   { if [ -f "$LOCKS/$1/info" ]; then sed -n 's/^slug //p'     "$LOCKS/$1/info" | head -1; fi; }
lock_worktree() { if [ -f "$LOCKS/$1/info" ]; then sed -n 's/^worktree //p' "$LOCKS/$1/info" | head -1; fi; }
lock_since()    { if [ -f "$LOCKS/$1/info" ]; then sed -n 's/^since //p'    "$LOCKS/$1/info" | head -1; fi; }

lock_is_stale() {  # 0 = stale (holder worktree gone), 1 = live
  local wt; wt="$(lock_worktree "$1")"
  if [ -n "$wt" ] && [ ! -d "$wt" ]; then return 0; fi
  return 1
}

write_lock_info() {  # <module> <slug> <worktree>
  {
    printf 'slug %s\n'     "$2"
    printf 'worktree %s\n' "$3"
    printf 'since %s\n'    "$(date '+%Y-%m-%d %H:%M')"
    printf 'pid %s\n'      "$$"
  } > "$LOCKS/$1/info"
}

# try_acquire <module> <slug> <worktree> : 0 = you hold it; 1 = held by another (+reason on stdout)
try_acquire() {
  local m="$1" slug="$2" wt="$3" holder
  mkdir -p "$LOCKS"
  if mkdir "$LOCKS/$m" 2>/dev/null; then
    write_lock_info "$m" "$slug" "$wt"
    append_line "$slug" "CLAIM: locked module '$m'"
    return 0
  fi
  holder="$(lock_holder "$m")"
  if [ "$holder" = "$slug" ]; then return 0; fi
  if lock_is_stale "$m"; then
    write_lock_info "$m" "$slug" "$wt"
    append_line "$slug" "CLAIM: reclaimed stale module '$m' (was '${holder:-unknown}')"
    return 0
  fi
  printf "module '%s' is locked by chat '%s' since %s — have them run: scripts/wt.sh release %s (or work a different module)" \
    "$m" "${holder:-unknown}" "$(lock_since "$m")" "$m"
  return 1
}

release_one() {  # <module> <slug> <force("" | force)>
  local m="$1" slug="$2" force="$3" holder
  if [ ! -d "$LOCKS/$m" ]; then echo "module '$m' is not locked"; return 0; fi
  holder="$(lock_holder "$m")"
  if [ "$holder" != "$slug" ] && [ "$force" != "force" ]; then
    echo "module '$m' is held by '${holder:-unknown}', not '$slug'. Override with: scripts/wt.sh release $m --force" >&2
    return 1
  fi
  rm -rf "$LOCKS/$m"
  append_line "$slug" "DONE: released module '$m'"
  echo "released '$m'"
}

release_all_for() {  # release every lock held by <slug>
  local slug="$1" d m holder
  if [ ! -d "$LOCKS" ]; then return 0; fi
  for d in "$LOCKS"/*/; do
    if [ ! -d "$d" ]; then continue; fi
    m="$(basename "$d")"
    holder="$(lock_holder "$m")"
    if [ "$holder" = "$slug" ]; then
      rm -rf "$LOCKS/$m"
      append_line "$slug" "DONE: released module '$m' (worktree removed)"
    fi
  done
}

is_known_module() {  # 0 if <name> appears as a module in module-map.txt
  local name="$1" map="$MAIN_REPO/scripts/module-map.txt"
  if [ ! -f "$map" ]; then return 1; fi
  awk -v n="$name" '/^#/ || NF==0 {next} $1==n {f=1} END {exit f?0:1}' "$map"
}

# --- tickets (PRD wiki pages) --------------------------------------------------
# A ticket is wiki/tickets/<PREFIX>-<NNN>.md with YAML frontmatter + a PRD body.

ticket_prefix() { basename "$MAIN_REPO" | tr '[:lower:]' '[:upper:]' | tr -cd 'A-Z0-9'; }

ticket_get() {  # <file> <key>  — read a frontmatter value
  sed -n "/^---$/,/^---$/{s/^$2: *//p;}" "$1" | head -1
}

ticket_set() {  # <file> <key> <value>  — set/insert a frontmatter value (frontmatter only)
  local f="$1" k="$2" v="$3"
  awk -v k="$k" -v v="$v" '
    BEGIN{infm=0; done=0}
    NR==1 && $0=="---"{infm=1; print; next}
    infm && $0=="---"{ if(!done){print k": "v}; infm=0; print; next}
    infm && $0 ~ ("^"k":"){ print k": "v; done=1; next }
    {print}
  ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
}

ticket_next_id() {  # <prefix>
  local prefix="$1" max=0 n f
  mkdir -p "$TICKETS"
  for f in "$TICKETS/$prefix"-*.md; do
    [ -e "$f" ] || continue
    n="$(basename "$f" .md)"; n="${n##*-}"
    case "$n" in (""|*[!0-9]*) continue;; esac
    if [ "$((10#$n))" -gt "$max" ]; then max="$((10#$n))"; fi
  done
  printf '%s-%03d' "$prefix" "$((max+1))"
}

cmd_ticket() {
  local sub="${1:-list}"; shift 2>/dev/null || true
  case "$sub" in
    new)
      local module="${1:?usage: wt.sh ticket new <module> <title...>}"; shift
      local title="$*"
      if [ -z "$title" ]; then echo "usage: wt.sh ticket new <module> <title...>" >&2; exit 1; fi
      mkdir -p "$TICKETS"
      local id file; id="$(ticket_next_id "$(ticket_prefix)")"; file="$TICKETS/$id.md"
      cat > "$file" <<EOF
---
id: $id
title: $title
project: $PROJECT
module: $module
status: todo
assignee:
priority: P2
created: $(date '+%Y-%m-%d')
created_by: $(current_slug)
---
## PRD
_Problem · scope · approach · out-of-scope. Fill this in with a real spec._

## Success criteria
- [ ]

## Notes / links
EOF
      append_line "$(current_slug)" "NOTE: ticket $id [$module] todo — $title"
      echo "$id"; echo "$file"
      ;;
    set)
      local id="${1:?usage: wt.sh ticket set <id> <key> <value>}" key="${2:?key}" val="${3:-}"
      local file="$TICKETS/$id.md"
      if [ ! -f "$file" ]; then echo "no such ticket: $id" >&2; exit 1; fi
      ticket_set "$file" "$key" "$val"
      if [ "$key" = "status" ]; then append_line "$(current_slug)" "NOTE: ticket $id -> $val"; fi
      echo "$id $key=$val"
      ;;
    list)
      local fstat="" fmod=""
      while [ "$#" -gt 0 ]; do
        case "$1" in
          --status) fstat="${2:-}"; shift 2;;
          --module) fmod="${2:-}"; shift 2;;
          *) shift;;
        esac
      done
      mkdir -p "$TICKETS"
      local f st mo ti as any=0
      for f in "$TICKETS"/*.md; do
        [ -e "$f" ] || continue
        case "$(basename "$f")" in (index.md|TEMPLATE.md) continue;; esac
        st="$(ticket_get "$f" status)"; mo="$(ticket_get "$f" module)"
        ti="$(ticket_get "$f" title)"; as="$(ticket_get "$f" assignee)"
        if [ -n "$fstat" ] && [ "$st" != "$fstat" ]; then continue; fi
        if [ -n "$fmod" ]  && [ "$mo" != "$fmod" ];  then continue; fi
        any=1
        printf '%-14s %-12s %-12s %-10s %s\n' "$(basename "$f" .md)" "${st:-?}" "${mo:-?}" "${as:-—}" "$ti"
      done
      if [ "$any" != 1 ]; then echo "no tickets"; fi
      ;;
    *) echo "usage: wt.sh ticket {new <module> <title> | set <id> <key> <val> | list [--status S] [--module M]}" >&2; exit 1;;
  esac
}

cmd_claim() {
  if [ "$#" -lt 1 ]; then echo "usage: wt.sh claim <module...>" >&2; exit 1; fi
  local slug m reason rc=0
  slug="$(current_slug)"
  for m in "$@"; do
    if reason="$(try_acquire "$m" "$slug" "$PWD")"; then
      echo "claimed '$m'  (held by '$slug')"
    else
      echo "$reason" >&2; rc=1
    fi
  done
  return "$rc"
}

cmd_release() {
  if [ "$#" -lt 1 ]; then echo "usage: wt.sh release <module...> [--force]" >&2; exit 1; fi
  local slug force="" m rc=0
  slug="$(current_slug)"
  local args=()
  for m in "$@"; do
    if [ "$m" = "--force" ]; then force="force"; else args+=("$m"); fi
  done
  if [ "${#args[@]}" -lt 1 ]; then echo "usage: wt.sh release <module...> [--force]" >&2; exit 1; fi
  for m in "${args[@]}"; do
    if ! release_one "$m" "$slug" "$force"; then rc=1; fi
  done
  return "$rc"
}

cmd_locks() {
  mkdir -p "$LOCKS"
  local found=0 d m holder since flag
  for d in "$LOCKS"/*/; do
    if [ ! -d "$d" ]; then continue; fi
    found=1
    m="$(basename "$d")"
    holder="$(lock_holder "$m")"; since="$(lock_since "$m")"; flag=""
    if lock_is_stale "$m"; then flag="  STALE (holder worktree gone)"; fi
    printf '%-15s held by %-16s since %s%s\n' "$m" "${holder:-?}" "${since:-?}" "$flag"
  done
  if [ "$found" != 1 ]; then echo "no modules locked"; fi
}

cmd_guard_claim() {  # internal: used by the pre-edit hook for a single module
  if [ "$#" -lt 1 ]; then exit 0; fi
  local m="$1" slug reason
  slug="$(current_slug)"
  if reason="$(try_acquire "$m" "$slug" "$PWD")"; then return 0; fi
  printf '%s\n' "$reason"
  return 1
}

cmd_new() {
  local slug="${1:?usage: wt.sh new <slug> [base]}"
  local base="${2:-HEAD}"
  local dir="$WT_HOME/$slug"
  git -C "$MAIN_REPO" remote get-url origin >/dev/null 2>&1 && git -C "$MAIN_REPO" fetch origin --quiet 2>/dev/null || true
  git -C "$MAIN_REPO" worktree add -b "$slug" "$dir" "$base"
  local f
  for f in "${CARRY[@]}"; do
    if [ -f "$MAIN_REPO/$f" ]; then
      mkdir -p "$dir/$(dirname "$f")"
      cp "$MAIN_REPO/$f" "$dir/$f" 2>/dev/null || true
    fi
  done
  if [ -f "$dir/package.json" ] && command -v pnpm >/dev/null 2>&1; then ( cd "$dir" && pnpm install ); fi
  append_line "$slug" "CLAIM: created worktree (base $base)"
  if is_known_module "$slug"; then
    if msg="$(try_acquire "$slug" "$slug" "$dir")"; then :; else echo "  note: could not auto-lock module '$slug' — $msg"; fi
  fi
  cat <<EOF

Worktree ready: $dir
  Open a chat there:   cd "$dir" && claude
  First read:          CLAUDE.md > "Working in parallel" (the '$slug' row) + wiki/index.md + your module's wiki page
  Open tickets:        scripts/wt.sh ticket list --module $slug
EOF
}

cmd_list() { git -C "$MAIN_REPO" worktree list; }

cmd_rm() {
  local slug="${1:?usage: wt.sh rm <slug>}"
  git -C "$MAIN_REPO" worktree remove "$WT_HOME/$slug"
  git -C "$MAIN_REPO" worktree prune
  release_all_for "$slug"
  append_line "$slug" "DONE: removed worktree"
  echo "Removed $WT_HOME/$slug (branch '$slug' kept; delete with: git branch -D $slug)"
}

cmd_queue() { ensure_queue; tail -n "${1:-40}" "$QUEUE"; }

cmd_post() {
  [ "$#" -ge 1 ] || { echo "usage: wt.sh post <message>   (prefix BLOCK:/DONE:/NOTE:)" >&2; exit 1; }
  append_line "$(current_slug)" "$*"
}

usage() {
  cat <<'EOF'
wt.sh — worktrees + module locks + work queue + tickets (see CLAUDE.md > "Working in parallel")

  wt.sh new <slug> [base]          create worktree+branch; copy env; install; auto-claim module
  wt.sh list                       list worktrees
  wt.sh rm <slug>                  remove a worktree (releases its locks)
  wt.sh claim <module...>          take an exclusive lock on each module for this chat
  wt.sh release <m...> [--force]   release locks this chat holds (--force steals)
  wt.sh locks                      show which chat (employee) holds which module
  wt.sh ticket new <module> <t>    create a ticket stub (PRD page) under wiki/tickets/
  wt.sh ticket set <id> <k> <v>    set a ticket field (status/assignee/priority)
  wt.sh ticket list [--status S] [--module M]   list tickets
  wt.sh queue [N]                  show the last N queue lines
  wt.sh post <message>             append a queue line; prefix BLOCK:/DONE:/NOTE:
EOF
}

case "${1:-}" in
  new)    shift; cmd_new "$@" ;;
  list)   shift; cmd_list "$@" ;;
  rm)     shift; cmd_rm "$@" ;;
  claim)       shift; cmd_claim "$@" ;;
  release)     shift; cmd_release "$@" ;;
  locks)       shift; cmd_locks "$@" ;;
  guard-claim) shift; cmd_guard_claim "$@" ;;
  ticket) shift; cmd_ticket "$@" ;;
  queue)  shift; cmd_queue "$@" ;;
  post)   shift; cmd_post "$@" ;;
  ""|-h|--help|help) usage ;;
  *) echo "wt.sh: unknown command '$1'" >&2; usage; exit 1 ;;
esac
