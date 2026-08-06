#!/usr/bin/env bash
#
# Wait for the newest production deployment, then prove the change is live.
#
# This exists because the obvious one-liner is wrong in a way that cannot be
# spotted by reading it:
#
#     until vercel ls <project> 2>/dev/null | grep -q Ready; do sleep 15; done
#
# `vercel ls` prints its human table to *stderr* and only bare URLs to stdout.
# So `2>/dev/null` throws away the very column being grepped, the pattern can
# never match, and the loop hangs forever while the deployment it is waiting
# for has in fact been live for twenty minutes. Verifying the pattern against
# `2>&1` output and then running the loop with `2>/dev/null` is what makes it
# invisible: two different streams, two different contents.
#
# Hence three rules, all enforced below:
#
#  1. Parse `--json` (real stdout, documented shape), never the pretty table.
#  2. Bound the wait. A loop with no deadline turns a wrong predicate into a
#     silent hang instead of a fast, loud failure.
#  3. Poll the goal, not a proxy for it. "Vercel says READY" is not the thing
#     anyone cares about; "the new code answers on the real domain" is. Pass
#     an --assert and the script only succeeds when the bytes actually changed.
#
# Usage:
#   scripts/wait-for-deploy.sh
#   scripts/wait-for-deploy.sh --assert '#b45739' --url https://odudlab.com
#   scripts/wait-for-deploy.sh --timeout 900
set -uo pipefail

PROJECT="${PROJECT:-sira-site}"
TIMEOUT=600
INTERVAL=15
ASSERT=""
URL="https://odudlab.com"

while [ $# -gt 0 ]; do
  case "$1" in
    --assert)  ASSERT="$2"; shift 2 ;;
    --url)     URL="$2";    shift 2 ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --project) PROJECT="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

deadline=$(( $(date +%s) + TIMEOUT ))

# `state` and `target` of the newest deployment, from JSON on real stdout.
newest() {
  npx vercel ls "$PROJECT" --json 2>/dev/null \
    | node -e '
        let s="";
        process.stdin.on("data",d=>s+=d).on("end",()=>{
          try {
            const d = JSON.parse(s).deployments || [];
            const p = d.find(x => x.target === "production");
            console.log(p ? `${p.state} ${p.url}` : "NONE -");
          } catch { console.log("PARSE_ERROR -"); }
        });'
}

echo "waiting for newest production deployment of $PROJECT (timeout ${TIMEOUT}s)"
state=""; url=""
while :; do
  read -r state url <<<"$(newest)"
  echo "  [$(date +%H:%M:%S)] state=$state url=$url"

  case "$state" in
    READY) break ;;
    ERROR|CANCELED)
      echo "FAILED: deployment state=$state" >&2; exit 1 ;;
  esac

  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "TIMEOUT after ${TIMEOUT}s — last state=$state" >&2
    echo "(this is the loud failure that a bare until-loop would have hidden)" >&2
    exit 1
  fi
  sleep "$INTERVAL"
done

echo "deployment READY: $url"

[ -z "$ASSERT" ] && exit 0

# The deployment being READY does not mean the domain serves it yet, so the
# assertion gets its own bounded wait rather than a single optimistic check.
echo "asserting '$ASSERT' is served from $URL"
while :; do
  css=$(curl -s "$URL" | grep -oE '/_next/static/[^"]+\.css' | head -1)
  if [ -n "$css" ] && curl -s "$URL$css" | grep -q -- "$ASSERT"; then
    echo "OK — '$ASSERT' is live at $URL$css"
    exit 0
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "TIMEOUT — deployment is READY but '$ASSERT' is not being served" >&2
    exit 1
  fi
  echo "  [$(date +%H:%M:%S)] not served yet"
  sleep "$INTERVAL"
done
