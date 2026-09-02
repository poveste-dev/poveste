# Deployment

`poveste build` writes a static site. There is no server to run — any host that serves files will do, with one rule to get right.

## What a build emits

```sh
pnpm run story:build
```

Everything lands in [`outDir`](../reference/config.md#outdir), `.poveste/dist` by default:

| | |
| --- | --- |
| `index.html` | the app shell — every page of the book is rendered from it |
| `__sandbox.html` | the document each story renders inside |
| `assets/` | hashed JS and CSS, safe to cache forever |
| `bundle-main.css`, `bundle-sandbox.css` | the chrome's stylesheet and the sandbox's |
| `poveste.json` | the story index, fetched at runtime |
| anything in your public directory | copied through as-is |

Deploy the contents of that directory. Two HTML files, and no per-story page — which is the whole of what follows.

## The one rule: SPA fallback

A book is a single-page app. `index.html` is the only document the app is served from, and `/story/<id>` is a client-side route that no file corresponds to.

On a host with no fallback rule, that is a 404:

```
GET /                          200
GET /index.html                200
GET /story/conformance-button  404   ← the URL in someone's bookmark
```

The book works when you click into it from the home page, and breaks on reload, on a shared link, and on any deep link. So the host has to answer every unmatched path with `index.html`, at status 200.

That is the standard SPA rewrite, and every host below spells it differently.

::: tip Not the same as a static docs site
If you have written a Netlify config for a VitePress or Astro site, do not copy it. Those build one file per page and need no fallback — poveste.dev's own `netlify.toml` deliberately has none, because a status-200 catch-all made every missing path answer with the home page and read as a soft 404 to search engines. A book is the opposite case.
:::

## Or avoid it: `routerMode: 'hash'`

```ts
export default defineConfig({
  routerMode: 'hash',
})
```

Routes then live after the `#` — `/#/story/conformance-button` — and a browser never sends that part to the server. Every request is for `/`, so **no rewrite rule is needed anywhere**.

The cost is the URLs, which are uglier and which some analytics and link-preview tools handle poorly.

Reach for it when the host cannot be configured: GitHub Pages, an S3 bucket without CloudFront, a corporate file server, a docs artefact unzipped behind a proxy you do not control. Everywhere else prefer the default `history` mode and one rewrite rule.

## Serving from a sub-path

If the book is not at the domain root — `example.com/book/` rather than `example.com` — set Vite's `base`:

```ts
export default defineConfig({
  vite: {
    base: '/book/',
  },
})
```

Every emitted URL picks up the prefix:

```html
<link rel="stylesheet" href="/book/bundle-main.css">
<script type="module" src="/book/assets/bundle-main-BTtSWPu-.js"></script>
```

Keep the leading and trailing slash. The router reads the same value, so the fallback rule has to point at `/book/index.html` rather than `/index.html`.

## Hosts

### Netlify

`netlify.toml` beside the book:

```toml
[build]
command = "pnpm run story:build"
publish = ".poveste/dist"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

`status = 200` is the part that matters — a `301` would change the URL in the address bar and lose the route.

### Vercel

`vercel.json`:

```json
{
  "buildCommand": "pnpm run story:build",
  "outputDirectory": ".poveste/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

`rewrites`, not `redirects` — the same distinction as Netlify's `status = 200`.

### GitHub Pages

Pages serves files and offers no rewrite rules, so use hash mode:

```ts
export default defineConfig({
  routerMode: 'hash',
  // Project pages live at <user>.github.io/<repo>/; drop this for a user site.
  vite: { base: '/<repo>/' },
})
```

The widely-shared alternative is copying `index.html` over `404.html`, which does render the right page — but Pages serves it with a **404 status**, so crawlers and uptime checks see a broken page. Hash mode is the honest fix.

### A plain static host

nginx:

```nginx
root /var/www/book;

location / {
  try_files $uri $uri/ /index.html;
}
```

Caddy:

```caddy
root * /var/www/book
try_files {path} /index.html
file_server
```

Apache, in `.htaccess`:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

Each says the same thing: serve the file if it exists, otherwise `index.html`.

## Checking it before you ship

The failure only appears on a deep link, which is exactly the request a click-through never makes. Load a story, copy the URL from the address bar, and open it in a new tab. If that works, the fallback is right.

`poveste preview` serves the built output with the fallback already in place, so it will not reproduce a missing rewrite rule — it is the right way to check the build and the wrong way to check the host.
