# Security Policy

## Reporting a vulnerability

**[Open a private security advisory](https://github.com/poveste-dev/poveste/security/advisories/new).**

That form is the only reporting channel. It is private, it reaches the maintainer, and it lets us work on a fix before anything is public.

Please do not open a public issue for a suspected vulnerability, and please do not report one by email — there is no monitored inbox, so an email goes nowhere.

If you are not sure whether what you found counts, use the form anyway. Deciding that is our job, not yours.

## What is in scope

The packages published to npm as `poveste` and `@poveste/*`, and the code in this repository that builds them.

Poveste is a development tool: it builds a component book from your own source and serves it. So the interesting reports tend to involve the build reading or writing something it should not, the story sandbox failing to stay inside its frame, or a published package shipping something that runs on install.

## What is not

**Your own book.** A defect in your components, or in a story you wrote, is not a poveste vulnerability — even when you found it through poveste.

**The examples.** Everything under `examples/` exists to exercise the tool. It is not published, not intended for production, and its dependencies are not held to a release bar.

**Hardening suggestions.** Ideas that would make poveste more defensive without there being a way to exploit it today are welcome as ordinary public issues. They get better answers in the open.

## Supported versions

**The latest release only.**

Poveste is pre-1.0 and there are no backport branches. A fix ships in the next release from `main`; older minors do not get a patch line, because no such line exists to put one in. Upgrading is the upgrade path.

## What to expect

We will acknowledge your report and tell you what we think of it.

We do not publish a response-time commitment. This is a small project without anyone on call, and a stated deadline nobody can hold to is worth less to you than knowing there is not one. If a report is confirmed, we will agree the disclosure timing with you rather than setting it unilaterally.

Credit goes to you in the advisory unless you would rather it did not.
