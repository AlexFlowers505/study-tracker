# 012 — The first-target assumption

**Status: written, not built.** Found 2026-08-26 while checking the streak
panel; deferred to the next session at the user's request. Nothing here is
started.

A condition used to name exactly one thing, and `clauseTarget()` — *the*
target — was how everything read it. It can name several now (`clauseTargets`),
and the singular reader survives in fourteen places. Most of them are correct
by accident, because a condition's targets always share a kind; three are
wrong today, and one of them is not cosmetic.

Two separate faults run through this, and they show up together:

1. **Only the first target is read**, so a compound condition is described —
   or judged — by one of its parts.
2. **Internal figures reach the reader.** `ClauseReading.value` for a check
   condition is the *yes count*, which is the right number for the chart and
   meaningless in a sentence.

## What the user saw

The panel for a two-check rule, on a day where `Wake up in time + no fall
asleep` was skipped and `Go to bed in time` was answered yes:

```
25 авг. 2026 г. — missed. Go to bed in time 1 (skipped)
```

Three things wrong in eight words. The named check is the one that was *fine*.
The `1` is the yes count leaking out of the reading. And `(skipped)` belongs to
the other target entirely — `ClauseReading.skipped` is now "any of them was
skipped", so it attaches itself to whichever name got printed.

The strip cell behind that tooltip prints the same `1`, from `figure()`.

This is the third instance of the same bug. `shortfall` in `streakRisk.ts` had
it (fixed in `943ba17`), `readClauseDay` had it (fixed in `5df6316`), and the
panel still has it.

## The sites

Checked with `grep -rn "clauseTarget(" src/`. Read this list as *candidates*,
not as a list of bugs — the ones marked **correct** are here so nobody has to
re-derive why.

### Wrong today

| where | what it does | why it is wrong |
| --- | --- | --- |
| `views/CustomStreakSection.tsx:148` | `breakdown()` — the strip tooltip | names the first target and prints `r.value` raw |
| `views/CustomStreakSection.tsx:122` | `sole` — the panel's single-target label | a two-check condition is not `compound` (one clause), so it takes this path and names one of two |
| `lib/streakRisk.ts:238, 292` | two more risk lines | same singular read as the one already fixed at `:128` |

### Not cosmetic — check this one first

`lib/customStreaks.ts:1729`, in `isNarrowing`:

```ts
if (!sameTarget(clauseTarget(prev), clauseTarget(next))) return false
```

**The lock compares only the first target.** Swapping the *second* check of a
two-check condition for something else leaves the first unchanged, so the test
says "same target" and the edit is judged on its bounds alone — which are
unchanged, so it reads as a narrowing and lands at once.

Whether that is exploitable depends on what else `clauseNarrows` demands; it
was not traced. **Trace it before anything else in this file**, because the
lock quietly permitting a loosening is the one failure this codebase is built
to refuse, and every other item here is a wrong word on a screen.

### Correct as they stand

- `lib/customStreaks.ts:840, 983, 1128` and `lib/benchmark.ts:77` —
  `targetMeasure(clauseTarget(...))`. A condition's targets always share a
  kind, because `CountersPicker` chooses the kind first and then chips within
  it, so the first target's measure is every target's measure. Worth a comment
  saying so rather than a change.
- `lib/customStreaks.ts:1685` — the proposal record. One target is enough to
  identify what changed for a human reading the log.
- `views/StreakRulesTab.tsx:773` — the form's `info`. This is the mismatch that
  caused `5df6316`: the form draws the check UI when the *first* target is a
  check. Now that the reader agrees, it is right — but it is the pair that has
  to stay in step, so touch neither alone.

## What "fix" means here

- **One helper, not four call sites.** `shortfall`'s fix was written inline;
  doing that three more times is how the fourth one drifts. Something like
  `clauseReadout(reading, ctx, day)` that returns the failing targets and their
  answers, used by the risk lines and the panel alike.
- **Never print `ClauseReading.value` for a check.** It is a yes count. The
  reader has the answers; ask it, as `shortfall` now does.
- **Quote through `q()`**, so the panel matches the sentences (`943ba17`).
- **`ClauseReading.skipped` means "any of them"** now. Either narrow it to a
  per-target thing or stop attaching it to a single name.

## Then re-run the sweep

The audit that found the last four holes was a throwaway script over seventeen
rule shapes. It is worth rebuilding and keeping this time — `.claude/` is
gitignored, so it went with the last cleanup. The shape that matters: for every
combination of target kind, scope, bound and answer, assert that a condition
claiming to ask something does not pass a period that should break it.
