# @poveste/vendors

Poveste's own copies of the libraries its chrome runs on, behind names a consumer's
bundler will not redirect at their copies.

Internal to [Poveste](https://github.com/poveste-dev/poveste): it is installed as a
dependency of `poveste` and there is nothing to install or configure directly. Install
[`poveste`](https://www.npmjs.com/package/poveste) instead.

## One copy, or two

The chrome imports Vue from here rather than by name so that it runs Poveste's copy
and not the reader's. That is version-dependent, and it was not always: the entries
re-export the real packages now, so when a consumer's Vue satisfies our range both
resolve to the **same** copy, and only a consumer on a range we cannot satisfy gets a
separate nested one.

The two-app design is unaffected — `global-components.ts` still creates its own app and
hands off through the DOM. What is no longer structurally true is that Poveste's chrome
never executes the reader's Vue. A reader who aliases `vue` to a fork or a patched build
gets that build in the chrome too.

[Documentation](https://poveste.dev)
