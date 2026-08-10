# 007 — Streak freezes

Settled design. Implement after the module split; it touches streaks, the day
editor, the month grid and the schema at once.

## The one idea everything rests on

Earning is a **ledger of events, not a function of the current data**. Every
finished week gets exactly one verdict, written once and never revisited.
Editing a past week afterwards changes its colours and the displayed streak,
but not its verdict — so re-breaking and re-fixing the same week can never mint
a second freeze, and editing any past date stays completely unrestricted.

Streaks stay derived (change your goals, the number changes). Only the
spendable thing is ledgered, because only the spendable thing is worth
protecting.

## Preconditions

- The effectiveness meter (`settings.goalsEnabled`) off ⇒ **no streaks and no
  freezes anywhere**. There is no metric to define them. Say so in the tooltip
  next to that setting.
- Freeze accounting starts on the day the feature is switched on
  (`settings.freezeStart`). Weeks that ended earlier never grant, or turning it
  on would dump a pile of freezes for the whole history.

## Day verdict

Read from raw day data. **Ignoring is invisible here** — a red ignored day
breaks a streak like any other, or marking every bad day "ignored" would be the
obvious way to fake a streak.

| state | colour |
|---|---|
| goal met (a goal of 0 counts as met) | green |
| frozen | blue + icon + "freeze used" tooltip |
| missed, not frozen | red |
| today, still in progress | neutral |

**Frozen always wins over green.** A day frozen back when it was red stays blue
forever, even if the goals later change so it would have passed. Settings never
rewrite a spent freeze.

## Week and month verdict

By days, not by summed hours. This replaces the current `rangeStats` comparison
in `computeStreaks`.

- every day green → **green**
- no unfrozen red day, at least one frozen → **blue**
- any unfrozen red day → **red**

Hours are still displayed truthfully: a blue week that did 5 of 20 hours says
"5 / 20". Blue means "we spent freezes so this is not a failure", not "we hit
the target". Green and blue both extend the streak; red breaks it.

No contradiction with the old hours rule is possible in the green case — if
every day cleared its own goal, the week clears the sum of them.

## Earning

- A week earns **one** freeze iff its verdict is green or blue — i.e. exactly
  when the indicator is green or blue. The economy needs no explaining text;
  it is visible in the colours.
- Frozen days count toward earning. 6 green + 1 frozen earns 1 and cost 1 —
  break-even, so one missed day a week is a standing allowance. Seven red days
  cost 7 and earn 1. Nothing is ever created.
- Months do not earn.
- **Cap: 15.** Show it as "12 / 15" in the streaks block, not only in help
  text — a silently discarded freeze is a nasty surprise.

### Sealing

A week's verdict is written when the **following** week ends, not the instant
the week itself does. That leaves a full week to log honestly after the fact,
which matters because logging a past date is allowed and normal. After that the
verdict is fixed forever.

Write a verdict for failed weeks too. Recording only the successes would leave
"failed week, edit it later, no verdict yet, grant one" open — the same
loophole from the other side.

The seal horizon matches the spend horizon: one week of slack, then the past is
settled.

## Spending

- The button appears only on a **red** day, or on **today** while it is not yet
  green.
- Only within the **current or previous week**.
- Requires balance > 0.
- Confirm first: "Use a freeze on this day?"
- Irreversible. No refund if the day is later logged up to green.

Balance needs no storage of its own: **earned verdicts − frozen days**. Two
ledgers, no counter that can drift out of step with them.

## Ignoring

Invisible to streaks (above), but an ignored week earns nothing. That is not
inconsistent: **ignoring may take away, never give**, so it can't be exploited.

## The filter

`CountFilter` affects the display only. Streaks and verdicts are always
computed over **all** slots and categories. Without a line saying so, a red day
on screen next to an unbroken streak reads as a bug.

## Storage

Three additions, plus the schema rule from `CLAUDE.md`: a new field on a day is
three edits — the column, the `select` list in `loadFromTables`, and the
`upsert` in `applyWriteOp`.

- `days.frozen boolean not null default false`
- `week_verdicts (project_id, week_key, earned boolean, sealed_at)`,
  primary key `(project_id, week_key)` — the key is what makes a second grant
  impossible.
- `settings.freezeStart` — the accounting start date.

## Surfaces that have to explain themselves

- Streaks block: how a streak is counted, that ignoring does not affect it,
  that the filter does not affect it, and the 15 cap.
- Effectiveness meter setting: turning it off removes streaks and freezes.
- Frozen day: icon + "freeze used" tooltip.
