# 012 — The first-target assumption

**Status: built.** Found 2026-08-26 while checking the streak panel; built the
next day. Covered by `npm run sweep`, which grew a readout section and a lock
section for it.

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

### Wrong, and fixed

| where | what it did | how it was closed |
| --- | --- | --- |
| `views/CustomStreakSection.tsx` | `breakdown()` — the strip tooltip | now calls `clauseReadout` |
| `lib/streakRisk.ts` | `shortfall`, the non-check branch | named the first counter of a set and printed the whole set's figure beside it; `targetsLabel` now |

**Two entries in the first draft of this table were wrong**, and are worth
recording as such: the panel's `sole` and the two risk lines at what were
`:238` and `:292` read `clauseTarget` for `.measure` only, never for a name. A
condition's targets always share a kind, so those are right. Reading a
`grep` result as a bug list is how a note ends up sending someone to fix
something that is not broken.

### Not cosmetic — and it was real

`lib/customStreaks.ts:1729`, in `isNarrowing`:

```ts
if (!sameTarget(clauseTarget(prev), clauseTarget(next))) return false
```

**The lock compared only the first target**, and it was exploitable. Traced,
confirmed and fixed: everything below that line compares bounds and accepted
answers, which know nothing about targets, so swapping *or dropping* the second
check of a two-check condition was proved no-easier and landed at once.

The targets are now compared as a set, in the direction the condition gives
them — the same argument the slots make, because it is the same argument. Under
an assertion one more target is one more thing to keep; under a floor it is one
more place the number can come from, which is easier; under a ceiling it is one
more way to be caught. `memberKind` joined the key too.

Four of the fifteen lock cases in the sweep fail without the fix, which was
verified by stashing it.

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

**Sibling spec:** `013-what-a-period-asks.md` holds the same week's engine
findings — the weekly ×7 bound, slot bounds a weekly rule never reads, and a
failed check that warns at no hour. Read `013` first; it is wrong about data
that already exists, where everything here is a wrong word on a screen.

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

## The sweep is checked in

`scripts/streak-sweep.ts`, `npm run sweep`. Seventy-six cases over four axes:
what a period comes to, what the streaks row says about today, what a day is
reported as, and what the lock allows — plus the conditions that must be
refused rather than judged. Run it after touching `customStreaks.ts`,
`streakRisk.ts` or `dayVerdict.ts`.
