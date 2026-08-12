#!/usr/bin/env bash
#
# Pre-publish smoke test.
#
# Packs the publishable packages into real tarballs, installs them with npm
# (NOT pnpm — no workspace symlinks, no pnpm store) into throwaway projects
# outside the workspace, and runs `poveste build` on a minimal story.
#
# This is the check that would have caught the 0.1.1/0.1.2/0.1.3 publish bugs:
# every one of them worked in the pnpm workspace and only broke for a real
# consumer installing the published tarballs.
#
# One pass per framework plugin. npm resolves peers strictly, while
# `pnpm-workspace.yaml` relaxes them repo-wide via peerDependencyRules — so a
# fully green CI is compatible with a plugin nobody can install (#73).
#
# The scaffolded projects mirror the StackBlitz starters in
# docs/.vitepress/theme/starters.ts, so a starter that no longer builds fails
# here too.
#
# Assumes `pnpm run build` has already run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Shared by every consumer, whatever the framework.
CORE_PACKAGES=(
  "poveste"
  "poveste-app"
  "poveste-controls"
  "poveste-shared"
  "poveste-vendors"
)

PLUGIN_PACKAGES=(
  "poveste-plugin-vue"
  "poveste-plugin-svelte"
)

WORK="$(mktemp -d)"
TARBALLS="$WORK/tarballs"
mkdir -p "$TARBALLS"

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

echo "▸ Packing tarballs → $TARBALLS"
for p in "${CORE_PACKAGES[@]}" "${PLUGIN_PACKAGES[@]}"; do
  ( cd "$ROOT/packages/$p" && pnpm pack --pack-destination "$TARBALLS" >/dev/null )
  echo "  ✓ $p"
done

# Absolute paths to the core tarballs, for a single npm install. Plugins are
# added per pass so a Vue consumer never pulls the Svelte plugin, or vice versa.
CORE_TGZ=()
while IFS= read -r f; do CORE_TGZ+=("$f"); done < <(find "$TARBALLS" -name '*.tgz' ! -name 'poveste-plugin-*' | sort)

plugin_tgz() {
  find "$TARBALLS" -name "$1-[0-9]*.tgz"
}

# install_and_build <name> <app-dir> <extra npm args...>
install_and_build() {
  local name="$1" app="$2"
  shift 2

  echo "▸ [$name] Installing tarballs with npm (clean, no workspace)"
  (
    cd "$app"
    npm install --no-audit --no-fund --loglevel=error "${CORE_TGZ[@]}" "$@"
  )

  echo "▸ [$name] Running poveste build"
  local build_log="$WORK/build-$name.log"
  ( cd "$app" && npm run build ) 2>&1 | tee "$build_log"

  local out="$app/.histoire/dist/index.html"
  [ -f "$app/.poveste/dist/index.html" ] && out="$app/.poveste/dist/index.html"

  # Rollup falls back to a runtime lookup for unresolved named imports, so the
  # build still succeeds — but the warnings are consumer-facing noise.
  if grep -q -a 'is not exported by' "$build_log"; then
    echo "❌ Smoke test FAILED [$name] — build emitted missing-export warnings:"
    grep -B1 -a 'is not exported by' "$build_log"
    exit 1
  fi

  if [ -f "$out" ]; then
    echo "✅ [$name] passed — built $out"
  else
    echo "❌ Smoke test FAILED [$name] — no built index.html found"
    echo "   Looked in .poveste/dist and .histoire/dist under $app"
    find "$app" -maxdepth 3 -name 'index.html' -not -path '*/node_modules/*' 2>/dev/null || true
    exit 1
  fi
}

consumer_package_json() {
  cat > "$1/package.json" <<JSON
{
  "name": "poveste-smoke-consumer-$2",
  "private": true,
  "type": "module",
  "scripts": { "build": "poveste build" }
}
JSON
}

# ── Vue ──────────────────────────────────────────────────────────────────────

VUE_APP="$WORK/vue"
mkdir -p "$VUE_APP/src"

echo "▸ Scaffolding Vue consumer project → $VUE_APP"
consumer_package_json "$VUE_APP" vue

cat > "$VUE_APP/poveste.config.ts" <<'TS'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue()],
})
TS

cat > "$VUE_APP/vite.config.ts" <<'TS'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
})
TS

cat > "$VUE_APP/src/Button.vue" <<'VUE'
<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <button>{{ label }}</button>
</template>
VUE

cat > "$VUE_APP/src/Button.story.vue" <<'VUE'
<script setup lang="ts">
import Button from './Button.vue'
</script>

<template>
  <Story title="Button">
    <Variant title="default">
      <Button label="Click me" />
    </Variant>
  </Story>
</template>
VUE

install_and_build vue "$VUE_APP" \
  "$(plugin_tgz poveste-plugin-vue)" \
  vue@^3.5.26 vite@^8.0.0 @vitejs/plugin-vue@^6.0.0

# ── Svelte ───────────────────────────────────────────────────────────────────

SVELTE_APP="$WORK/svelte"
mkdir -p "$SVELTE_APP/src"

echo "▸ Scaffolding Svelte consumer project → $SVELTE_APP"
consumer_package_json "$SVELTE_APP" svelte

cat > "$SVELTE_APP/vite.config.ts" <<'TS'
/// <reference types="poveste" />
import { HstSvelte } from '@poveste/plugin-svelte'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte()],
  poveste: {
    plugins: [HstSvelte()],
  },
})
TS

cat > "$SVELTE_APP/src/MyButton.svelte" <<'SVELTE'
<script>
  export let label = 'Click me'
</script>

<button>{label}</button>
SVELTE

# The legacy shape — `<Hst.Variant>` children, no controls — because that is
# what the starter ships and what a consumer hits first.
cat > "$SVELTE_APP/src/MyButton.story.svelte" <<'SVELTE'
<script>
  import MyButton from './MyButton.svelte'

  export let Hst
</script>

<Hst.Story title="MyButton">
  <Hst.Variant title="default">
    <MyButton />
  </Hst.Variant>
  <Hst.Variant title="custom label">
    <MyButton label="Hello Poveste" />
  </Hst.Variant>
</Hst.Story>
SVELTE

# The 0.5 contract: state on `initState`, read from the `children` and
# `controls` snippets. Nothing else in this script would catch it breaking.
cat > "$SVELTE_APP/src/Controls.story.svelte" <<'SVELTE'
<script>
  import MyButton from './MyButton.svelte'

  export let Hst

  const initState = () => ({ label: 'Click me' })
</script>

<Hst.Story title="Controls" {initState}>
  {#snippet children({ state })}
    <MyButton label={state.label} />
  {/snippet}

  {#snippet controls({ state })}
    <Hst.Text bind:value={state.label} title="Label" />
  {/snippet}
</Hst.Story>
SVELTE

install_and_build svelte "$SVELTE_APP" \
  "$(plugin_tgz poveste-plugin-svelte)" \
  svelte@^5.46.4 vite@^8.0.0 @sveltejs/vite-plugin-svelte@^7.0.0

echo "✅ Smoke test passed — vue, svelte"
