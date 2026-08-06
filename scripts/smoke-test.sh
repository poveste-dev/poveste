#!/usr/bin/env bash
#
# Pre-publish smoke test.
#
# Packs the publishable packages into real tarballs, installs them with npm
# (NOT pnpm — no workspace symlinks, no pnpm store) into a throwaway project
# outside the workspace, and runs `poveste build` on a minimal story.
#
# This is the check that would have caught the 0.1.1/0.1.2/0.1.3 publish bugs:
# every one of them worked in the pnpm workspace and only broke for a real
# consumer installing the published tarballs.
#
# Assumes `pnpm run build` has already run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The @poveste/* packages in the Vue consumer dependency chain, plus poveste.
PACKAGES=(
  "poveste"
  "poveste-app"
  "poveste-controls"
  "poveste-shared"
  "poveste-vendors"
  "poveste-plugin-vue"
)

WORK="$(mktemp -d)"
TARBALLS="$WORK/tarballs"
APP="$WORK/app"
mkdir -p "$TARBALLS" "$APP/src"

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

echo "▸ Packing tarballs → $TARBALLS"
for p in "${PACKAGES[@]}"; do
  ( cd "$ROOT/packages/$p" && pnpm pack --pack-destination "$TARBALLS" >/dev/null )
  echo "  ✓ $p"
done

# Absolute paths to every packed tarball, for a single npm install.
TGZ=()
while IFS= read -r f; do TGZ+=("$f"); done < <(find "$TARBALLS" -name '*.tgz' | sort)

echo "▸ Scaffolding consumer project → $APP"

cat > "$APP/package.json" <<'JSON'
{
  "name": "poveste-smoke-consumer",
  "private": true,
  "type": "module",
  "scripts": { "build": "poveste build" }
}
JSON

cat > "$APP/poveste.config.ts" <<'TS'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue()],
})
TS

cat > "$APP/vite.config.ts" <<'TS'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
})
TS

cat > "$APP/src/Button.vue" <<'VUE'
<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <button>{{ label }}</button>
</template>
VUE

cat > "$APP/src/Button.story.vue" <<'VUE'
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

echo "▸ Installing tarballs with npm (clean, no workspace)"
(
  cd "$APP"
  npm install --no-audit --no-fund --loglevel=error \
    "${TGZ[@]}" \
    vue@^3.5.26 vite@^7.3.0 @vitejs/plugin-vue@^6.0.0
)

echo "▸ Running poveste build"
BUILD_LOG="$WORK/build.log"
( cd "$APP" && npm run build ) 2>&1 | tee "$BUILD_LOG"

OUT="$APP/.histoire/dist/index.html"
[ -f "$APP/.poveste/dist/index.html" ] && OUT="$APP/.poveste/dist/index.html"

# Rollup falls back to a runtime lookup for unresolved named imports, so the
# build still succeeds — but the warnings are consumer-facing noise.
if grep -q -a 'is not exported by' "$BUILD_LOG"; then
  echo "❌ Smoke test FAILED — build emitted missing-export warnings:"
  grep -B1 -a 'is not exported by' "$BUILD_LOG"
  exit 1
fi

if [ -f "$OUT" ]; then
  echo "✅ Smoke test passed — built $OUT"
else
  echo "❌ Smoke test FAILED — no built index.html found"
  echo "   Looked in .poveste/dist and .histoire/dist under $APP"
  find "$APP" -maxdepth 3 -name 'index.html' -not -path '*/node_modules/*' 2>/dev/null || true
  exit 1
fi
