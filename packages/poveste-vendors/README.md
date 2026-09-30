# @poveste/vendors

Poveste's own copies of the libraries its chrome runs on, behind names a consumer's
bundler will not redirect at their copies.

Internal to [Poveste](https://github.com/poveste-dev/poveste): it is installed as a
dependency of `poveste` and there is nothing to install or configure directly. Install
[`poveste`](https://www.npmjs.com/package/poveste) instead.

## One copy, or two

The chrome imports Vue from here rather than by name so that it runs Poveste's copy
and not the reader's. Whether that is the reader's copy too is version-dependent, and
it was not always.

**The re-export is not what makes it one copy.** Each entry's name is an npm alias —
`poveste-vue` is `npm:vue` — and an alias is a distinct package name, so a package
manager installs a second physical copy of Vue whatever the consumer already has. A
satisfied range does not collapse them and `resolve.dedupe` cannot, because it matches
on the name. This file used to claim the opposite; two copies then meant two reactivity
systems, and a consumer's `poveste dev` rendered no story at all (#1060).

What makes it one copy is an alias `poveste` adds to a consumer's Vite config:
`collapseVendoredVue` points `poveste-vue` at the consumer's `vue` when both are
present and their majors agree. So when a consumer's Vue satisfies our range both do
resolve to the **same** copy, and only a consumer on a range we cannot satisfy keeps
the separate nested one — but by that alias, not by the shape of these entries.
Deleting it as redundant to this paragraph reopens the defect.

The two-app design is unaffected — `global-components.ts` still creates its own app and
hands off through the DOM. What is no longer structurally true is that Poveste's chrome
never executes the reader's Vue. A reader who aliases `vue` to a fork or a patched build
gets that build in the chrome too.

[Documentation](https://poveste.dev)
