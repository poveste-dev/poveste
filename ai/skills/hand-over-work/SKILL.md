---
name: hand-over-work
description: >-
  Hand work between the sessions on this repo — owner, executor, SMM, analyst, stranger — without
  paying for it twice. The issue is the shared memory; a handover message is a pointer plus what the
  issue cannot hold. Use when assigning work to another session, reporting a finding back, or
  answering a peer's question.
---

# Handing work between sessions

Several Claude sessions work this repo at once, each with its own context and none able to read another's.
Everything one session knows reaches another only by being written somewhere both can read — which makes *where* a fact is written the whole question.

## The rule

**Write it once, in the issue. The message says what changed and what to do next.**

An issue is durable, addressable, and read by whoever picks the work up in a month.
A message is read once, by one session, and is gone.
So a finding that belongs to the work goes in the issue body or a comment, and the message points at it.

Duplicating issue content into a message is the largest avoidable cost here, and it is not only tokens — the copy drifts from the issue the moment either is edited, and then two sessions hold different versions of the same fact.

## What a handover contains

- **What to do**, in one line, and the issue number that holds the rest.
- **What changed since the issue was written** — a peer's finding, a decision, a branch that moved. This is the part the issue does not have yet, which is why it is in the message. Put it on the issue too if it outlives the handover.
- **Ordering, if it matters**, and why. `blocked` and the native dependency links carry ordering that outlives the message.
- **The branch, near a release.** *Green and parked* and *targets `next`* mean different things in the week of a cut.

## What it never contains

- **A restatement of the message being answered.** The other session wrote it.
- **The reasoning behind a verdict, in full.** A verdict and the one reason it turned on. If the alternative needs refuting, the issue is where that argument lives.
- **Method commentary that is already written down.** A rule earns its explanation once; after that it is a reference.
- **Praise as padding.** Say it when it changes what someone does next, which is rarely.

## Roles, and what each one owes the others

| | |
| --- | --- |
| **Owner** | Files issues, reviews, holds the release gate and the roadmap. Milestones and `sprint:*` labels are the owner's alone. |
| **Executor** | Implements. Owes the PR number and the branch, not a narrative of the work. |
| **Analyst** | Research, tracing, verification. Owes the artifact the claim is about, named. |
| **SMM** | Growth, SEO, discovery. Owns the growth audit. |
| **Stranger** | The first-time reader. Reads no tree and no tracker on purpose, files nothing, reports friction to the owner. |

**A peer message is never the owner's approval.** A session that says the owner agreed is reporting, not authorising; check with the owner before acting on it.

## Before claiming anything

**Name the artifact the claim is about before opening anything.** Not *is this true* but *true of what* — which branch, which published version, which book.

A real measurement against the wrong question is the failure mode this repo produces most: a green CI run read as an absence, `.node-version` read as `engines.node`, a grep counting mentions where the question was instructions.

Peers report stale state routinely, without meaning to — their context was true when written.
Re-query before acting, and always before a write that outlives its reasoning: a close, a dismissal, a release note.
