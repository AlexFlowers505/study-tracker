# 017 — Freezes bought, not charged

**Status: designed, not built.** Depends on `spec 016` for the `spent`/`owed`
axis and the `danger` level: what may be frozen is defined in terms of them,
and building this first would mean inventing the same distinction twice.

**Partially supersedes `spec 009`, part 2.** The paragraph refusing partial
spending is reversed here; strike it through there and point at this file.
`CLAUDE.md` carries the same sentence and needs the same treatment.

No schema change. `days.rule_freezes` is already `jsonb`, and no migration is
written — see Part 4 for why writing one would be worse than not.

---

## What went wrong

A rule asserts two checks. At noon the user answers *wake up in time* `no`,
while *go to bed in time* is still unanswered — they do not yet know. The app
offers to freeze the rule for **two** freezes.

They pay one by answering *go to bed* `yes` first and then freezing. Later the
evening goes badly, they change it to `no`, and **a second freeze is taken
automatically**. Change it back to `yes` and the freeze **returns to the bank**.

Every part of that is the same fault, and it is not in the arithmetic:

```ts
ruleFreezes?: string[]
```

The record is a list of **rule ids** ([model.ts:246](../src/types/model.ts)),
and the price is recomputed on every read —
`freezeCost = max(1, totalDeficit(readDay(...)))`
([customStreaks.ts:1359](../src/lib/customStreaks.ts)) — with `ruleStatus`
summing those recomputations to work out what each week spent.

**Nothing records the purchase.** A freeze is not a thing that was bought; it
is a property the current data happens to have. So it drifts with the data,
because it *is* the data.

Three separate promises break as a result:

1. **A price can change after you paid it.** Freeze at 1, log one more thing,
   owe 2.
2. **A freeze can be spent without you.** The second one is taken by an edit,
   not by a decision.
3. **A freeze can come back.** Which makes the whole economy reversible, and an
   irreversible currency is the only kind worth being careful with.

---

## Part 1 — What a violation is

A day's deficit is assembled from several places
([`readClauseDay`, customStreaks.ts:697](../src/lib/customStreaks.ts)), and a
"violation" has to line up with them exactly, or prices move.

**A violation is one named site that broke.**

| condition | violations | each costs |
| --- | --- | --- |
| checks with `allow` | one per target | 1 |
| a count | one per broken bound — the clause's own, and each slot rider | what that site fell short by |
| time | **one for the whole condition**, however many sites broke | 1 |
| a lone check with legacy bounds | one | 1 |

**No rule gets cheaper or dearer.** Add the violations up and you get exactly
today's `freezeCost`. Time stays one broken promise — *forty minutes short of
two hours is one, not forty* — and a count still costs what it actually missed
by, which is the arithmetic the freeze economy already runs on. The only new
thing is that it can be bought in pieces.

Taking a *unit of deficit* as the atom was the alternative and is refused: it
would make "three Pinterests over a ceiling of nought" three separate purchases
of the same thing, which is not a choice, it is a chore.

```ts
export interface Violation {
  clauseId: string
  /** The check that failed. Absent when the site is a bound. */
  targetId?: string
  /** The slot rider that broke. Absent means the condition's own bound. */
  slotId?: string
  /** Units of failure at this site. */
  cost: number
}
```

`targetId` and `slotId` are never both set, and a time condition sets neither —
a condition carries one measure, so the shapes cannot collide.

---

## Part 2 — Only what is already lost may be frozen

`freezeOffer` currently opens the whole rule the moment a day is `missed` or
`pending`. That is why noon presents a bill for two: an unanswered check is in
deficit, so it is charged for.

But an unanswered check is not a broken promise. It is **an errand**. `spec 016`
gives the app the word for the difference, and this is where it pays:

**A violation may be frozen only when it stands at `danger`** — irreversibly
broken, or no longer reachable before midnight. An `owed` one may not be, and
there is nothing to argue about: there is nothing there to freeze, you can
still simply do it.

The opening case resolves with no special case anywhere:

| noon | evening, if it goes badly |
| --- | --- |
| *wake up* `no` — **spent**, offered, 1 freeze | *go to bed* `no` — now **spent**, offered separately, 1 freeze |
| *go to bed* unanswered — **owed**, not offered | — |

**The automatic second charge stops being expressible**, because there is no
longer a moment at which the app decides on your behalf. It offers; you buy.

Yesterday needs no rule of its own: the day is over, so every violation on it is
spent, and all of them are offered. The writing window is unchanged — today and
yesterday, `isEditableDay`, the same window the log itself is written in.

---

## Part 3 — Partial spending, and the reversal it is

`spec 009` refused this outright, and the reasoning was good:

> a period is frozen only if the whole deficit can be paid… Partial spending is
> refused on purpose: a day that breaks anyway should not also cost you the
> freeze.

**That protection is removed, deliberately, and it can now cost you.** Freeze
the wake-up for one, decline the go-to-bed, and the day is still red with a
freeze gone that bought nothing.

What buys the reversal is that the alternative does not solve anything. Under
the old rule you cannot act at noon at all: the price is not knowable until the
day is over, and by then the choice you wanted to make — *this one certainly,
that one I will see* — has been made for you. Control over which promise you
are protecting is worth more than protection from wasting a freeze on a day you
have already broken, especially since the user asked for exactly the discipline
that waste enforces:

> Чтобы ответственнее относиться к активации заморозки.

So the dialog says it, out loud, in the sentence where the money is spent:

> `1 more violation is unfrozen — this alone does not save the day.`

An escrow — return a partial payment at midnight if the set was never completed
— was considered and refused. It is the automatic refund this spec exists to
delete, wearing a different coat.

---

## Part 4 — What is stored, and the migration that is not written

```ts
export interface RuleFreeze {
  ruleId: string
  clauseId: string
  /** The site inside the condition. Neither means the condition as a whole. */
  targetId?: string
  slotId?: string
  /** What it cost. Stamped at purchase. **Never recomputed.** */
  cost: number
  boughtAt: string
}
```

`Day.ruleFreezes?: (string | RuleFreeze)[]`, in the same `jsonb` column. No SQL.

### The legacy branch is the whole migration

Existing rows are `["rule-a", "rule-b"]`. **A bare string reads as "this rule is
frozen on this day, entirely"** — precisely what it means today — and the reader
is the only place that knows it.

A one-shot rewrite was the alternative and has no source of truth: the price of
a purchase made in March is not recoverable, so a migration would compute it
from today's data and write an invented number into a ledger. **The legacy
branch invents nothing.** It says *the whole thing*, which is what was said.

This is the same shape as the `useDailyGoal` branch `CLAUDE.md` insists on
keeping: the safe reading is the one that cannot quietly make a rule easier, and
carrying a dead branch costs less than a wrong number in a ledger.

One consequence, stated rather than hidden: a legacy entry's contribution to the
pools is still recomputed, so it can move if the *rule* is later edited. The
days themselves cannot change — they are long outside the writing window — and
the population is small and shrinking. New purchases never drift.

### `isFrozenFor` changes meaning, and therefore shape

Today it is `(day, ruleId) => boolean`, a membership test
([customStreaks.ts:859](../src/lib/customStreaks.ts)). It now has to ask whether
**every** violation is covered, which needs the readings — so it takes the rule
and the context, like everything else that judges.

Four call sites follow it: `ruleDayState`, `ruleWeekState`, `ruleWeekDayState`,
and `ruleStatus`'s per-week spend loop. Nothing outside `customStreaks.ts` reads
it, which is why the change is contained.

---

## Part 5 — Weekly rules stay flat

`freezeCost` returns `1` for a weekly rule whatever broke, and the freeze is
recorded on the week's Monday, because a week has no row of its own.

**Unchanged.** One violation per rule per week, cost one, nothing to split.

Itemising per condition would raise a compound weekly rule from one freeze to
several — a tightening nobody asked for, and one that `isNarrowing` would make
you wait a week for if it were a term of the rule rather than a detail of its
accounting. A week has one verdict, not seven; its freeze has one price.

---

## Part 6 — Buying one

`freezeOffer` becomes `freezeOffers(...): FreezeOffer[]` — one per violation
standing at `danger`, each carrying its own cost, its own affordability and the
key it would be written on.

### The strip

`StreakStrip` stays the only place a freeze is spent — `CLAUDE.md` is explicit
that a day can break three rules at once, and a snowflake per rule on a card
already carrying badges, sleep, a note and an add button is how a card stops
being readable. `spec 016` keeps the notice board out of it for the same reason.

The cell's popover now **lists the day's violations**, one row each:

```
“Wake up in time” is “no”                     freeze · 1
“Go to bed in time” is “no”                   frozen
```

Already-frozen ones stay in the list, dimmed, marked. Without them there is no
way to find out what you have already paid for — and paying twice for one thing
is the failure mode of every ledger drawn as a button.

One violation gives a one-row list, which is barely different from what is there
now.

### The dialog

Clicking a row opens `FreezeConfirm` for **that one violation**. `FreezeAsk`
gains the violation and its line; the pools, the before-and-after and the
spending order are untouched.

It stays a confirmation of one act. Making it a shop — a list with a buy button
per row — would mix *what am I buying* with *what will this leave me*, and the
second is the only thing that dialog was built to answer.

When other violations on that day are still unfrozen, it adds the warning from
Part 3.

### A half-paid day

`ruleDayState` returns `frozen` only when every violation is covered. Otherwise
it is `missed`, and **it is drawn as missed, with no special mark.**

Half a freeze saves nothing, and a cell reading *partly saved* is the same
mistake as *four of five almost counts* — refused as Decision 1 of `spec 010`.
The day's colour is a verdict, not a receipt. The receipt is in the popover:
`1 of 2 frozen`.

---

## Part 7 — The pools

`ruleStatus` sums **stored** costs instead of recomputing them. That single
change is the fix to the drift: a week that spent three has spent three
forever, whatever later happens to the data behind it.

Affordability is checked **per purchase**, not per day. You buy one at a time,
so you must be able to afford one at a time — and a day whose total exceeds what
you have is no longer an all-or-nothing refusal, it is a day you can protect
part of and lose anyway. That is the same trade Part 3 makes, and it is made in
the same direction.

The order of the pools is unchanged: the weekly allowance first, because it is
the one that expires, and the bank after it.

Nothing takes a freeze back. `spendRuleFreeze` remains append-only
([App.tsx:546](../src/App.tsx)) and grows exactly one guard: a violation already
frozen is left alone rather than added twice.

---

## Decisions

**1 — A freeze is a purchase, not a property of the data.** Everything else
follows. The old model had no record of an act, only a recomputation of a state,
and every one of the three broken promises is that single fact seen from a
different side.

**2 — The atom is a named site, not a unit of deficit.** It is the granularity
at which a person has an opinion — *this promise, not that one* — and it is the
only granularity at which no price changes.

**3 — Only `danger` may be frozen.** The cleanest thing in this spec, and it is
borrowed rather than invented: `spec 016` had to tell *already spent* from
*still owed* to know how loudly to speak, and the same line decides what there
is to pay for. An errand is not a debt.

**4 — Partial spending is allowed, and `spec 009`'s refusal of it is reversed.**
Recorded as a reversal, with its cost named, because the original reasoning was
sound and the thing that beat it was not a flaw in it — it was that the choice
it protected you from is a choice you have to be able to make at noon.

**5 — No migration.** A ledger may not be seeded with a number nobody recorded.
The legacy reading says exactly what the old data said and no more.

---

## Vocabulary

For `CLAUDE.md`'s **The words**:

| word | what it is |
| --- | --- |
| **violation** | one named site of a rule that broke on one day — a check, a bound, a slot rider. What a freeze is bought against |
| **a freeze** | a purchase against one violation, at a price stamped when it was made. Never automatic, never refunded, never repriced |
| **fully frozen** | every violation of a rule on a day covered. The only state that turns a day's colour |
