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

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Shared by every consumer, whatever the framework.
CORE_PACKAGES=(
  "poveste"
  "poveste-app"
  "poveste-controls"
  "poveste-shared"
  "poveste-vendors"
)

# Every published plugin gets a pass. `scripts/checks/smoke-plugins.ts` holds this
# list to the set derived from `packages/*/package.json`, so a new plugin cannot
# ship uncovered — the gate ran three of seven (#1052).
PLUGIN_PACKAGES=(
  "poveste-plugin-vue"
  "poveste-plugin-svelte"
  "poveste-plugin-solid"
  "poveste-plugin-quasar"
  "poveste-plugin-nuxt"
  "poveste-plugin-tailwind"
  "poveste-plugin-percy"
)

WORK="$(mktemp -d)"
TARBALLS="$WORK/tarballs"
mkdir -p "$TARBALLS"

DEV_PID=""
cleanup() {
  [ -n "$DEV_PID" ] && kill "$DEV_PID" 2>/dev/null
  rm -rf "$WORK"
}
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

# peer_range <package-dir> <peer-name> — the range the plugin actually declares.
#
# Not a literal, and every pass uses it. A copied range drifts the moment a peer
# floor moves and the gate keeps agreeing with itself: the `vue@^3.5.26` and
# `@sveltejs/vite-plugin-svelte@^7.0.0` this replaced still resolved to what
# `^3.5.43` and `^7.3.0` would, so nothing went red while the gate stopped
# testing what the packages declare (#1052). Deriving it means a floor that moves
# reaches this file for free, and it is what makes the Quasar pass meaningful —
# `quasar: ^2.24.0` resolves to 2.34.0, the version #1048 fails on.
#
# It fails loudly rather than returning nothing. `node -p` on a manifest with no
# `peerDependencies`, or a package directory that has been renamed, throws and
# prints an empty string — and the non-zero exit is discarded, because the
# substitution sits in an argument list rather than being the command, so
# `set -e` never sees it. The pass then installs `vue@`, which npm resolves to
# **latest**, and the gate reports green while testing a version the package does
# not declare: this file's own defect, reintroduced through its fix.
peer_range() {
  node -e "
    const manifest = require('$ROOT/packages/$1/package.json')
    const range = (manifest.peerDependencies || {})['$2']
    if (typeof range !== 'string' || range === '') {
      console.error('smoke-test: packages/$1 declares no peerDependencies[\'$2\'] — nothing to install at')
      process.exit(1)
    }
    process.stdout.write(range)
  "
}

# install_and_build <name> <app-dir> <extra npm args...>
install_and_build() {
  local name="$1" app="$2"
  shift 2

  # Every `<pkg>@<range>` argument has to carry a range. This is the net under
  # `peer_range`, and it guards the property rather than one helper's error path:
  # `vue@` and `vue@undefined` are what a failed derivation and a missing peer name
  # produce, and npm answers the first by installing **latest** without complaint.
  local arg
  for arg in "$@"; do
    case "$arg" in
      *@ | *@undefined)
        echo "❌ Smoke test FAILED [$name] — \`$arg\` names no version"
        echo "   A derived range came back empty or undefined, so npm would have installed"
        echo "   whatever is latest and the pass would have proved nothing."
        exit 1
        ;;
    esac
  done

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

  # Node's experimental-feature warnings read as an error to a first-time reader,
  # and the `localStorage` one printed once per read during collection (#1175).
  if grep -q -a 'ExperimentalWarning' "$build_log"; then
    echo "❌ Smoke test FAILED [$name] — build printed an ExperimentalWarning on Node $(node -v):"
    grep -A1 -a 'ExperimentalWarning' "$build_log"
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

# `poveste dev` over the same npm install, asserting the story renders in its
# preview frame. Opt-in, because it needs Playwright's Chromium: `test:smoke:dev`
# turns it on, and CI's `Unit tests and smoke` job runs that. The build passes
# above cannot see this path, which has shipped blank twice (#1060, #1134).
dev_renders() {
  local name="$1" app="$2" path="$3" expected="$4" port="$5"
  [ "${POVESTE_SMOKE_DEV:-}" = "1" ] || return 0

  echo "▸ [$name] Running poveste dev and opening $path"
  local dev_log="$WORK/dev-$name.log"
  ( cd "$app" && exec ./node_modules/.bin/poveste dev --port "$port" ) > "$dev_log" 2>&1 &
  DEV_PID=$!

  if ! node "$ROOT/scripts/release/dev-renders.mjs" "http://localhost:$port" "$path" "$expected"; then
    echo "❌ Smoke test FAILED [$name] — poveste dev did not render the story"
    tail -20 "$dev_log"
    # When collection ended and the optimizer reloaded, beside the browser's timeline (#1218).
    echo "dev server timeline:"
    grep -aE 'Collect stories end|optimized|reloading|ready in' "$dev_log" || echo "  (none of it logged)"
    exit 1
  fi

  kill "$DEV_PID" 2>/dev/null
  wait "$DEV_PID" 2>/dev/null || true
  DEV_PID=""
  echo "✅ [$name] dev renders"
}

# The same consumer installed with pnpm, and the dev pass over it. pnpm's isolated
# layout puts none of Poveste's own dependencies at the project root, which is how
# `poveste dev` rendered a blank page for every pnpm user from 0.13.0 while each npm
# pass here stayed green (#1201). Opt-in with the dev pass, which it ends in.
pnpm_dev_renders() {
  local name="$1" src="$2" path="$3" expected="$4" port="$5" plugin="$6"
  shift 6
  [ "${POVESTE_SMOKE_DEV:-}" = "1" ] || return 0

  local app="$WORK/$name-pnpm"
  mkdir -p "$app"
  # The consumer's own files, not npm's install of them.
  ( cd "$src" && tar --exclude=./node_modules --exclude=./package-lock.json --exclude=./.poveste -cf - . ) | ( cd "$app" && tar -xf - )
  consumer_package_json "$app" "$name-pnpm"

  # Without overrides pnpm resolves Poveste's own `@poveste/*` dependencies from the
  # registry, which is not what this pass built.
  {
    echo "overrides:"
    local tgz pkg
    for tgz in "${CORE_TGZ[@]}" "$plugin"; do
      pkg="$(tar -xzOf "$tgz" package/package.json | node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(0, "utf8")).name)')"
      echo "  '$pkg': 'file:$tgz'"
    done
  } > "$app/pnpm-workspace.yaml"

  echo "▸ [$name] Installing the same consumer with pnpm"
  # `strict-dep-builds` off: pnpm 12 exits 1 on an ignored build script, esbuild's,
  # after a complete install.
  if ! ( cd "$app" && pnpm add --config.strict-dep-builds=false "${CORE_TGZ[@]}" "$plugin" "$@" ) > "$WORK/pnpm-install-$name.log" 2>&1; then
    echo "❌ Smoke test FAILED [$name] — pnpm could not install the tarballs"
    tail -20 "$WORK/pnpm-install-$name.log"
    exit 1
  fi

  dev_renders "$name-pnpm" "$app" "$path" "$expected" "$port"
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

// Read while the story is collected. On Node 25+ that reached Node's own Web
// Storage getter, which warns, until collection supplied jsdom's (#1175).
localStorage.getItem('poveste-smoke')
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
  "vue@$(peer_range poveste-plugin-vue vue)" vite@^8.0.0 @vitejs/plugin-vue@^6.0.0

dev_renders vue "$VUE_APP" "/story/src-button-story-vue" "Click me" 4790
pnpm_dev_renders vue "$VUE_APP" "/story/src-button-story-vue" "Click me" 4793 \
  "$(plugin_tgz poveste-plugin-vue)" \
  "vue@$(peer_range poveste-plugin-vue vue)" vite@^8.0.0 @vitejs/plugin-vue@^6.0.0

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
  "svelte@$(peer_range poveste-plugin-svelte svelte)" vite@^8.0.0 \
  "@sveltejs/vite-plugin-svelte@$(peer_range poveste-plugin-svelte @sveltejs/vite-plugin-svelte)"

# A Svelte book imports no `vue` of its own, which is the shape #1134 broke.
dev_renders svelte "$SVELTE_APP" "/story/src-mybutton-story-svelte?variantId=src-mybutton-story-svelte-1" "Hello Poveste" 4791
pnpm_dev_renders svelte "$SVELTE_APP" "/story/src-mybutton-story-svelte?variantId=src-mybutton-story-svelte-1" "Hello Poveste" 4794 \
  "$(plugin_tgz poveste-plugin-svelte)" \
  "svelte@$(peer_range poveste-plugin-svelte svelte)" vite@^8.0.0 \
  "@sveltejs/vite-plugin-svelte@$(peer_range poveste-plugin-svelte @sveltejs/vite-plugin-svelte)"

# ── Solid ────────────────────────────────────────────────────────────────────

SOLID_APP="$WORK/solid"
mkdir -p "$SOLID_APP/src"

echo "▸ Scaffolding Solid consumer project → $SOLID_APP"
consumer_package_json "$SOLID_APP" solid

cat > "$SOLID_APP/poveste.config.ts" <<'TS'
import { HstSolid } from '@poveste/plugin-solid'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstSolid()],
})
TS

cat > "$SOLID_APP/vite.config.ts" <<'TS'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
})
TS

cat > "$SOLID_APP/src/Button.tsx" <<'TSX'
export function Button(props: { label: string }) {
  return <button type="button">{props.label}</button>
}
TSX

# Collection imports this file in Node, and the JSX inside `render` compiles to a
# module-level `template()` that Solid's server build refuses — which is the
# failure the plugin's browser-build aliases exist for.
cat > "$SOLID_APP/src/Button.story.tsx" <<'TSX'
import { defineStory } from '@poveste/plugin-solid'
import { Button } from './Button'

export default defineStory({
  title: 'Button',
  variants: [{ title: 'default', render: () => <Button label="Click me" /> }],
})
TSX

install_and_build solid "$SOLID_APP" \
  "$(plugin_tgz poveste-plugin-solid)" \
  "solid-js@$(peer_range poveste-plugin-solid solid-js)" vite@^8.0.0 \
  "vite-plugin-solid@$(peer_range poveste-plugin-solid vite-plugin-solid)"

dev_renders solid "$SOLID_APP" "/story/src-button-story-tsx?variantId=src-button-story-tsx-0" "Click me" 4792

# ── Quasar ───────────────────────────────────────────────────────────────────

QUASAR_APP="$WORK/quasar"
mkdir -p "$QUASAR_APP/src"

echo "▸ Scaffolding Quasar consumer project → $QUASAR_APP"
consumer_package_json "$QUASAR_APP" quasar

# `@poveste/plugin-quasar` searches upward for a `quasar.config` and fails by
# name without one, so a bare package.json is not a Quasar project to it. Quasar
# then refuses a project with no `index.html` and exits, which the plugin reports
# as "a missing index.html or a quasar.config it refuses" — so both files are the
# real minimum, not just the config. Matching `examples/quasar`.
cat > "$QUASAR_APP/index.html" <<'HTML'
<!DOCTYPE html>
<html>
  <head>
    <title>Quasar smoke consumer</title>
    <meta charset="utf-8">
  </head>
  <body>
    <!-- quasar:entry-point -->
  </body>
</html>
HTML

cat > "$QUASAR_APP/quasar.config.js" <<'JS'
export default function () {
  return {
    boot: [],
    css: [],
    extras: [],
    build: { vueRouterMode: 'hash' },
    framework: { config: {} },
  }
}
JS

cat > "$QUASAR_APP/poveste.config.ts" <<'TS'
import { HstQuasar } from '@poveste/plugin-quasar'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue(), HstQuasar()],
  setupFile: '/src/poveste.setup.ts',
})
TS

# The setup file is what installs Quasar into the story app, so a pass without
# it exercises the plugin's config extraction and never Quasar itself — which is
# #1051's hole, and putting it here would be reproducing that hole in the gate
# meant to catch it.
cat > "$QUASAR_APP/src/poveste.setup.ts" <<'TS'
import { setupQuasar } from '@poveste/plugin-quasar/setup'
import { defineSetupVue } from '@poveste/plugin-vue'

export const setupVue = defineSetupVue(setupQuasar())
TS

cat > "$QUASAR_APP/src/Meow.story.vue" <<'VUE'
<template>
  <Story title="Meow">
    <Variant title="default">
      🐱
    </Variant>
  </Story>
</template>
VUE

# Three mandatory peers, more than either pass above, and npm resolves peers
# strictly — `@quasar/app-vite` is not optional even though nothing a minimal
# story imports reaches it.
install_and_build quasar "$QUASAR_APP" \
  "$(plugin_tgz poveste-plugin-vue)" \
  "$(plugin_tgz poveste-plugin-quasar)" \
  "quasar@$(peer_range poveste-plugin-quasar quasar)" \
  "vue@$(peer_range poveste-plugin-quasar vue)" \
  "@quasar/app-vite@$(peer_range poveste-plugin-quasar '@quasar/app-vite')" \
  vite@^8.0.0 @vitejs/plugin-vue@^6.0.0


# ── Nuxt ─────────────────────────────────────────────────────────────────────
#
# The heaviest pass by far: `nuxt` is a large npm install and `HstNuxt()` boots a
# real Nuxt to read its Vite config. It is here because `plugin-nuxt` declares
# `nuxt: ^4.5.0` as a mandatory peer and npm resolves peers strictly, which is
# the exposure this whole gate exists for (#73, #1052).

NUXT_APP="$WORK/nuxt"
mkdir -p "$NUXT_APP/app"

echo "▸ Scaffolding Nuxt consumer project → $NUXT_APP"
consumer_package_json "$NUXT_APP" nuxt

cat > "$NUXT_APP/nuxt.config.ts" <<'TS'
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
})
TS

cat > "$NUXT_APP/app/app.vue" <<'VUE'
<template>
  <div>smoke</div>
</template>
VUE

cat > "$NUXT_APP/poveste.config.ts" <<'TS'
import { HstNuxt } from '@poveste/plugin-nuxt'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue(), HstNuxt()],
})
TS

cat > "$NUXT_APP/app/Button.story.vue" <<'VUE'
<template>
  <Story title="Button">
    <Variant title="default">
      <button>Click me</button>
    </Variant>
  </Story>
</template>
VUE

install_and_build nuxt "$NUXT_APP" \
  "$(plugin_tgz poveste-plugin-vue)" \
  "$(plugin_tgz poveste-plugin-nuxt)" \
  "nuxt@$(peer_range poveste-plugin-nuxt nuxt)" \
  "vue@$(peer_range poveste-plugin-vue vue)"
# ── Tailwind ─────────────────────────────────────────────────────────────────

TAILWIND_APP="$WORK/tailwind"
mkdir -p "$TAILWIND_APP/src"

echo "▸ Scaffolding Tailwind consumer project → $TAILWIND_APP"
consumer_package_json "$TAILWIND_APP" tailwind

# The plugin reads the design tokens out of a Tailwind v4 CSS entrypoint, so the
# pass needs a real one: it searches the usual names and accepts the first that
# imports `tailwindcss` or declares `@theme`. A book without one exercises the
# plugin's file search and nothing it exists to do.
cat > "$TAILWIND_APP/src/style.css" <<'CSS'
@import "tailwindcss";

@theme {
  --color-tokenprobe-500: oklch(62% 0.19 260);
}
CSS

cat > "$TAILWIND_APP/poveste.config.ts" <<'TS'
import { HstTailwind } from '@poveste/plugin-tailwind'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue(), HstTailwind()],
})
TS

cat > "$TAILWIND_APP/vite.config.ts" <<'TS'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
})
TS

cat > "$TAILWIND_APP/src/Swatch.story.vue" <<'VUE'
<template>
  <Story title="Swatch">
    <Variant title="default">
      <div class="p-4">swatch</div>
    </Variant>
  </Story>
</template>
VUE

install_and_build tailwind "$TAILWIND_APP" \
  "$(plugin_tgz poveste-plugin-vue)" \
  "$(plugin_tgz poveste-plugin-tailwind)" \
  "tailwindcss@$(peer_range poveste-plugin-tailwind tailwindcss)" \
  "vue@$(peer_range poveste-plugin-vue vue)" \
  vite@^8.0.0 @vitejs/plugin-vue@^6.0.0

# This plugin generates a book of its own — a `Design System` group read from the
# `@theme` block — so "the build exited 0" says nothing about whether it ran. The
# token declared above has to reach the published book (#1052).
#
# `tokenprobe` appears in the `@theme` block and **nowhere else**: the story above
# deliberately does not use the class. The first version of this did, and the grep
# would have matched the story's own compiled chunk whether the plugin ran or not —
# an assertion that cannot fail, in the gate added because a check that reports on
# something it never exercises is how #1048 shipped.
if grep -rq -a 'tokenprobe' "$TAILWIND_APP/.poveste/dist"; then
  echo "✅ [tailwind] the @theme token reached the built book"
else
  echo "❌ Smoke test FAILED [tailwind] — no trace of the @theme token in the built book"
  echo "   The build succeeded, so the plugin loaded and its design-system stories did not."
  exit 1
fi

# ── Percy and screenshot ─────────────────────────────────────────────────────
#
# Neither declares a framework peer, so there is no strict-peer exposure to probe
# and no story shape of their own — the pass is that a consumer can install the
# tarball beside a framework plugin and still build. Cheap, and it is the half of
# #1052 that would otherwise wait for a first report from a reader.
#
# Written out rather than looped over a suffix. `scripts/checks/smoke-plugins.ts`
# holds every published plugin to a `plugin_tgz <name>` call, and a loop hides the
# name from it — so a shared loop would need a special case in the check, which is
# the kind of exemption this whole issue is about.

addon_app() {
  local addon="$1" factory="$2" app="$WORK/$1"
  mkdir -p "$app/src"

  echo "▸ Scaffolding $addon consumer project → $app"
  consumer_package_json "$app" "$addon"

  cat > "$app/vite.config.ts" <<'TS'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
})
TS

  cat > "$app/src/Button.story.vue" <<'VUE'
<template>
  <Story title="Button">
    <Variant title="default">
      <button>Click me</button>
    </Variant>
  </Story>
</template>
VUE

  cat > "$app/poveste.config.ts" <<TS
import { $factory } from '@poveste/plugin-$addon'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue(), $factory()],
})
TS
}

addon_app percy HstPercy
install_and_build percy "$WORK/percy" \
  "$(plugin_tgz poveste-plugin-vue)" \
  "$(plugin_tgz poveste-plugin-percy)" \
  "vue@$(peer_range poveste-plugin-vue vue)" \
  vite@^8.0.0 @vitejs/plugin-vue@^6.0.0

# No screenshot pass, and the exemption is recorded in
# `scripts/checks/smoke-plugins.ts` so a missing pass for it is deliberate rather
# than a hole. `@poveste/plugin-screenshot` depends on a real Chrome, which CI does
# not provide — the same constraint that keeps `examples/vue-screenshot` out of the
# `Unbuilt books` job (#654).
#
# `PUPPETEER_SKIP_DOWNLOAD` does not rescue it, measured rather than assumed: the
# install then succeeds and `poveste build` exits 1 with `Could not find Chrome`,
# because the plugin launches a browser during the build. Skipping the download
# moves the failure from install to build rather than removing it.
#
# Percy stays: its puppeteer is optional, and its pass is green on a CI runner.

echo "✅ Smoke test passed — vue, svelte, solid, quasar, nuxt, tailwind, percy"
