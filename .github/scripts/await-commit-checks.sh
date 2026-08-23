#!/usr/bin/env bash
#
# Waits for the gating workflows to finish on a commit and fails unless every
# one of them succeeded (#192).
#
# `bumpp` pushes the version bump straight to `main`, bypassing branch
# protection, so the commit that gets published is the only one on `main` that
# no gate ever cleared. The push does start `test.yml` and `test-examples.yml`
# — they are simply not required, and the tag push races them. This turns them
# back into a gate for the one commit that most needs it.
#
# Usage: await-commit-checks.sh <sha>
set -euo pipefail

SHA="${1:?usage: await-commit-checks.sh <sha>}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set}"
# Both shapes of the example suite: the consolidated one (#217) and the
# per-framework workflows it replaced, which are still what an older release
# branch carries. Absent ones are skipped, so this list covers either.
WORKFLOWS=(
  test.yml
  test-examples.yml
  test-vue3.yml
  test-vue3-tailwind.yml
  test-nuxt4.yml
  test-svelte5.yml
  test-sveltekit.yml
)

# Generous: a full example matrix is minutes, and a queued runner is not a
# failure. Exceeding this means something is stuck, which is worth a red run.
DEADLINE=$(( SECONDS + ${CHECKS_TIMEOUT_SECONDS:-2700} ))
INTERVAL="${CHECKS_POLL_SECONDS:-20}"

# `status` and `conclusion` for the run of $1 at $SHA, or nothing when the run
# does not exist yet. `// empty` matters: indexing an empty array yields null,
# which would otherwise format as the string "null".
run_state() {
  gh api "repos/$REPO/actions/workflows/$1/runs?head_sha=$SHA&per_page=1" \
    --jq '.workflow_runs[0] // empty | "\(.status) \(.conclusion // "-")"' 2>/dev/null || true
}

for workflow in "${WORKFLOWS[@]}"; do
  # Gate on what this commit actually defines. A workflow added on a release
  # branch does not exist on older ones, and waiting for a run that can never
  # start would block the release until the timeout.
  if [ ! -f ".github/workflows/$workflow" ]; then
    echo "$workflow: not present at this commit, skipping"
    continue
  fi

  echo "::group::Waiting for $workflow on $SHA"
  while :; do
    state="$(run_state "$workflow")"

    case "$state" in
      completed*)
        conclusion="${state#completed }"
        echo "$workflow: $conclusion"
        if [ "$conclusion" != "success" ]; then
          echo "::error::$workflow concluded '$conclusion' for $SHA."
          echo "The release commit is not green, so publishing it would ship an untested tree."
          echo "Re-run that workflow; if it goes green, re-run this job."
          exit 1
        fi
        break
        ;;
      '')
        echo "$workflow: no run yet for this commit"
        ;;
      *)
        echo "$workflow: ${state% *}"
        ;;
    esac

    if [ "$SECONDS" -ge "$DEADLINE" ]; then
      echo "::error::Timed out waiting for $workflow on $SHA (last state: ${state:-none})."
      echo "A release commit is expected to be pushed to a branch that runs it."
      exit 1
    fi
    sleep "$INTERVAL"
  done
  echo "::endgroup::"
done

echo "Every gating workflow is green for $SHA."
