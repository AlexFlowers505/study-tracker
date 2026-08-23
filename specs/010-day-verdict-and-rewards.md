# 010 — One verdict a day, and what it buys

Five features, one document, because they are one idea taken to its end: **the
day gets a single verdict again, and everything else hangs off it.** The
composite verdict makes one streak possible; one streak makes one balance
possible; the balance is what the shop spends; the shop is what makes a rule
worth keeping when the streak is already broken.

Two published sketches carry the visual side of this and are worth opening
before touching the drawing:

- [Один вердикт дня](https://claude.ai/code/artifact/d30625b2-029b-442d-95d3-a619a588a0cb) — the diagnosis and the three mechanisms.
- [Страх и счёт](https://claude.ai/code/artifact/9be7727a-99ef-4125-b538-6879f6ee8726) — two counters, the trophy case, the shop, the approval flow.

---

## Status

Build in this order. Each stage stands on its own and can ship alone; the
dependencies are real, not preference.

- [x] **Stage 1 — The risk bar.** Part 3. Touches no data. Ship first.
      *Landed. `lib/streakRisk.ts` classifies every streak `danger` /
      `warning` / `safe`; `StreakBar` grows the troubled ones into blocks and
      collapses the rest into one line that opens on a click. The weekly
      reachability test in `weeklyRisk` is the first piece of Stage 3 and is
      where the rest of pace will go.*

      *Seen against real data afterwards, which caught the thing the synthetic
      test could not: every "at least" rule is unmet at nine in the morning, so
      the row shouted from midnight — the same noise it was built to remove. An
      unmet* at least *is now measured against the hours left in the day, the
      way a weekly rule is measured against the days left in the week, while an
      exceeded* at most *goes straight to `danger` because nothing undoes it.
      Quiet all morning, loud when acting is urgent rather than merely
      possible.*
- [ ] **Stage 2 — The day verdict, and the end of the main streak.** Part 1.
      One piece of work: the moment the main streak goes, nothing colours a day
      card, so the composite has to arrive in the same change. Migration `014`.
- [ ] **Stage 3 — Pace.** Part 2. Lets weekly rules join the verdict.
- [ ] **Stage 4 — The balance.** Part 4. Migration `015`.
- [ ] **Stage 5 — Achievements.** Part 5. Migration `016`.
- [ ] **Stage 6 — The shop.** Part 6. Migration `017`.
- [ ] **Stage 7 — Reasons.** Part 7, first half. No migration; a field on the rule.
- [ ] **Stage 8 — The supervisor.** Part 7, second half. Migration `018`. The
      only stage that touches RLS. Optional, and deliberately last.

**Keeping this document true.** Tick a stage when it lands. If a decision
changes, do not quietly rewrite the prose — amend the *Decisions* section at
the bottom with what changed and why, then fix the prose. Half the value of
this file is that it explains why things are the way they are, and a reversal
with no record turns it back into a to-do list.

---

# Part 1 — The day verdict

## The problem it solves

Three things drive this app, and they are one machine rather than three
motivations: the hours chart gives **magnitude**, the green day gives a
**verdict**, the streak count gives a **stake**. Remove any one and the others
weaken. Magnitude with no verdict is statistics; a verdict with no stake is a
grade you shrug off.

Several streaks break the middle part. A day stops having *one* verdict and
gets five, and five verdicts do not add up — **fear does not divide.** Five
equal chips read as a dashboard, and a dashboard is inspected, not feared.

The fix is not fewer rules. It is that a **streak is not a rule**: rules feed
the thing you are afraid to lose, and there is one of those.

## The rule gains two fields

```ts
/** Does this rule's verdict decide the day's colour? */
inDayVerdict?: boolean
/** The day it started doing so. Never earlier than that. */
inDayVerdictSince?: DayKey
```

`inDayVerdictSince` is set to today the moment the flag is switched on, with no
interface of its own. It exists for exactly one case, and that case is real: a
rule that has been running for two months, ticked into the verdict today, would
otherwise recompute the composite streak backwards over history you can no
longer edit. A newly created rule cannot do this — `startedOn` is today and
`judgesDay` already returns `unjudged` for everything before it — which is why
this is one line and not a feature.

Same reasoning as `startedOn` and `settings.freezeStart`, both of which exist
for this and nothing else.

## The verdict

A day is **kept** when every participating rule that judges it is met or
frozen. Missed if any of them missed. `pending` while the day is still today.
`unjudged` when no participating rule covers it.

**Binary, and that is not negotiable.** A day at four rules out of five may be
*drawn* as a ring one segment short of closed — that is honest and it says
which one you dropped — but for the streak and the balance it is a miss.
The moment 4/5 starts almost counting, the verdict stops being a verdict and
the whole machine loses its middle part.

Freezes stay **per rule**, exactly as they are now. A day is saved when every
rule that failed on it is individually frozen; its price is the sum of their
prices. Nothing new to build — inside one rule this is already `totalDeficit`,
and across rules it is addition. The composite gets **no pool of its own**.

`unjudged` days neither extend nor break. In practice they will not occur once
the goal rule participates, since it judges every day (a goal of zero counts as
met).

## Two levels of streak, both kept

- **Per rule** — already exists, `ruleStatus().current` / `.best`. Untouched.
- **Composite** — consecutive kept days. This is the big number in the streak
  bar. Call it **Kept days**, which is also the balance's unit; the two lining
  up is worth more than a cleverer name.

The composite is computed over the whole history and needs no ledger of its
own: a day before a rule's `startedOn` is simply not judged by it. So in the
months when only one rule existed, the composite equals that rule's streak —
which is how the existing 20-day streak survives the migration without special
handling.

## The end of the main streak

The main goal streak stops being a concept. Not every project wants a promise
shaped like *hours per day against a per-weekday target*, and hard-coding one
is what stopped this app from being general.

**What goes:**

| | |
| --- | --- |
| `lib/streaks.ts` | `computeStreaks` and the day/week/month streak trio |
| `lib/freezes.ts` | `freezeLedger`, `FREEZE_CAP`, `canFreeze`, `dayState`, `periodState`, `weekWasCut` |
| `views/StreaksSection.tsx` | replaced by an ordinary custom-streak panel |
| `Day.frozen` | superseded by `ruleFreezes` |
| `Project.weekVerdicts`, `week_verdicts` | superseded by `streak_verdicts` |
| `settings.goalCuts`, `settings.freezeStart` | the rule's own lock and `startedOn` do this now |

`isEditableDay`, `isSealable` and `EDIT_HORIZON_DAYS` **stay** — they are the
editing horizon, not the streak, and half the app depends on them.

`dayState`/`periodState` are read by `DayCards` and `MonthGrid` to colour every
card and cell. They are replaced by the composite verdict, which is why this
and the abolition are one stage: remove one without the other and nothing
paints.

**What survives: the daily goal.** `settings.dailyGoals`, `goalForDate`,
`goalsEnabled`, `rangeStats().goal`, the "goal 3h" line on every card, the
dashed line in analytics, the heatmap's shading. Ten files read it. It is the
project's daily *target* — a display concept — and it has nothing to do with
streaks. Turning `goalsEnabled` off removes it from the interface, as now.

## A condition can hold you to the daily goal

The goal rule needs to say "at least N a day", but a condition carries one
number and the goal is seven — one per weekday. Rather than seven conditions
that silently drift out of step with the seven fields in Setup, a time
condition gets a flag:

```ts
/** Take the limit from the project's daily goal for that weekday. */
useDailyGoal?: boolean
```

One condition instead of seven, one source of truth, and the goal stays
optional for anyone who does not want a rule about it.

**The catch, and it must not be forgotten:** with this set, lowering the goal
in Setup loosens the rule *without touching the rule* — a back door around the
lock. `termsOf()` must fold `settings.dailyGoals` into the compared terms
whenever any clause has `useDailyGoal`. Three lines. Skipping them leaves the
lock with a hole big enough to drive the whole feature through, and it is
exactly the hole `goalCuts` was invented to plug.

## `migrations/014` — the goal becomes a rule

One-shot, guarded by `applied_migrations` like `004`:

1. Create a streak rule per project from `settings`: one clause,
   `target: { kind: "time" }`, `op: "atLeast"`, `useDailyGoal: true`,
   `startedOn = settings.freezeStart`, `inDayVerdict: true`,
   `inDayVerdictSince = settings.freezeStart`, `freezesPerWeek: 1`,
   `freezeCap: 15` (the old `FREEZE_CAP`).
2. Copy every `week_verdicts` row into `streak_verdicts` under that rule's id,
   `kept = earned`.
3. For every day with `frozen = true`, append the rule's id to
   `days.rule_freezes`.

Old columns stay where they are, unread — the same treatment `lessons` and
`exam` got. The streak, the banked freezes and the sealed weeks all survive.

---

# Part 2 — Pace: a weekly rule judges a day

A weekly rule's verdict exists only at the end of its week, which would keep it
out of the day verdict entirely. It does not have to: on any given day a weekly
rule has a **feasibility** — what is left to do against how many days are left
to do it in.

| state | condition | colour |
| --- | --- | --- |
| ahead / on pace | remaining need ≤ remaining days × required daily rate | green |
| behind | still reachable, but not at the current rate | amber |
| impossible | remaining need cannot be met in the days that remain | red |

**Only `impossible` is a miss for the day verdict.** Amber is a warning, not a
failure — otherwise "gym three times a week" punishes you every Monday for not
having been three times yet.

This is worth building for its own sake even before the verdict needs it:
"gym 1 of 3, two days left" is a rule already lost on Friday, and telling you
on Sunday is telling you when you can no longer act.

---

# Part 3 — The risk bar

The cheapest change here and possibly the largest effect. It touches no data
model at all.

The streak row shows every rule equally and permanently. At any moment the
number actually at risk is zero, one, occasionally two. Five equal chips are
exactly the dilution the whole document is about.

- **All safe** — one quiet line: `5 rules · all holding · 20 days`.
- **Something at risk** — that rule grows into a block, takes its colour, and
  says what to do and what not doing it costs:
  `YouTube · 1 tonight against a limit of 0 · a freeze covers it, leaving 0 of 1 weekly and 3 of 15 banked`.
- Sorted by danger, never by creation order.

Build this first. It is independent of everything else and it will teach you,
on your own data, how many rules genuinely want to be in the day verdict —
which is the question Part 1 has to answer.

---

# Part 4 — The balance

## What it is for

A streak has one failure mode nothing else covers: **the day after it breaks
costs nothing.** Zero minus zero. The most dangerous stretch is not the slip,
it is the week that follows it.

So: a second counter beside the streak, with a different job.

| | Streak | Balance |
| --- | --- | --- |
| a missed day | resets to zero | `−1` |
| fixes | today's laziness | tomorrow's, after a break |
| feeling | fear of loss | something accumulated |
| how many | one, composite | one, composite |
| spendable | no | yes — it is the shop's price |
| on screen | large, in the streak bar | small, beside the shop |

**The streak must keep resetting.** A streak that walks 20 → 19 loses the cliff,
and the cliff is the whole reason it works: "20" is frightening to lose only
because tomorrow it is either 21 or nothing.

**The balance must be small on screen.** It does not motivate — the streak
does. Given equal weight it will win, because watching a number grow is
pleasanter than guarding one that can be zeroed, and then the machine has
quietly swapped its engine for its accountant.

## The rules of it

- `+1` for a kept day, `−1` for a missed one. **The rate is a constant of the
  design, not a setting** — a configurable rate is the forgeable part.
- **No floor. It goes negative.** Debt is the honest record of a bad month.
- A **frozen** day counts as kept, `+1`. A freeze is part of the rule you
  wrote, not a failure to keep it; the app already treats frozen weeks as
  earning their reward and the two must not disagree.
- An **ignored** day contributes nothing, like everywhere else
  (`makeIsIgnored`).
- Counts from the day the feature is switched on. Otherwise the first purchase
  is free — the same reason `startedOn` and `freezeStart` exist.

## A ledger, not a recomputation

`spec 007` settled this for verdicts and the same argument applies with more
force here, because you can *spend* this one: a day's mark is written **once**,
when the day leaves the editing horizon, and never revisited. Editing yesterday
must not retroactively change a balance you have already bought something with.

Sealing uses the **log's** horizon — today and yesterday — not the weekly
`isSealable`. Today and yesterday display as *not yet counted*: visible,
excluded from the sum.

The displayed balance is a fold over sealed marks in date order, minus the
purchase ledger.

## `migrations/015`

```sql
create table day_ledger (
  project_id text not null references projects(id) on delete cascade,
  date       text not null,
  kept       boolean not null,
  sealed_at  timestamptz not null default now(),
  primary key (project_id, date)
)
```

`kept` rather than a delta, since the rate is a constant of the design and
cannot drift.

---

# Part 5 — Achievements

Everything in this app so far is built on fear: a streak is what you lose, a
red day is what you avoid. It works and it is one-sided. An achievement is the
opposite pole — **it cannot be taken away** — and it is what makes the history
worth having accumulated rather than merely survived.

- **Custom and few.** Written by you, six or so in total. Do *not* generate a
  30/60/100 ladder per rule: five rules by six thresholds is thirty
  achievements, which is the dilution problem wearing a rosette.
- **Sources deliberately narrow**, or the editor turns into a second rule
  builder: composite streak length, per-rule streak length, perfect weeks, total
  hours on a target, total count of a counter.
- **Earned once, written with its date, never recomputed.** Same ledger rule as
  everything else.
- **Its own table, not `settings`.** The hand that edits the rules must not be
  the hand that edits what was earned. In `settings` an achievement is
  forgeable; in a ledger it is not.
- **Locked like a rule.** Lowering a threshold is a loosening and waits;
  raising it is a narrowing and lands at once. `isNarrowing` generalises to
  this almost word for word.
- **A deleted rule does not delete its achievement.** It happened. Render it
  the way `targetInfo` renders a deleted counter — named as gone, not blank.
- An unearned one shows its distance (`13 to go`). A goal you can see pulls
  harder than a surprise you cannot.

`migrations/016` — `achievements` table, `(project_id, achievement_id)`,
with `earned_at`.

---

# Part 6 — The shop

Not a game store. **A precommitment device**: buying the record player in the
app is permitting yourself to buy it in life. The app is the ledger of a
promise you made yourself about spending, which puts it in the same family as
the edit lock rather than in the same family as points.

- **Priced in days**, the balance's unit. "50,000 points" is a number you
  invented and can re-invent; "40 kept days" is not, and cannot be
  underestimated. Pricing in the same unit the streak counts is also what stops
  a second economy existing at all — there is nothing to play off against
  anything.
- **Prices under the same lock.** Lowering a price is a loosening and waits a
  week; raising it is a narrowing and lands. Without this the record player
  drops from 500 days to 150 on a bad evening.
- **A purchase is permanent.** No refunds, append-only, and it stays in the
  history with its date and the price paid.
- Purchases may take the balance negative? **No** — you cannot spend what you
  do not have. The balance goes negative from missed days, never from buying.
- **It must be a ceremony, not a submit button.** The app cannot stop you
  buying the thing outside the app; the entire value is the ritual. Drawn as
  an ordinary row with an ordinary button, it will rot inside a month.

Items live in `settings` (small, read as a unit, like `tags`). Purchases go in
a ledger — `migrations/017`.

---

# Part 7 — Reasons, and the second person

## A loosening must be explained

Every loosening requires written text saying why.

**It cannot live in `change_log`.** That table's writes are deliberately
best-effort — they swallow failures so a logging problem can never raise the
save banner — which is right for a convenience and fatally wrong for an
obligation. A reason that can silently fail to save is not an obligation.

So the reason is a field **on the rule**, written in the same operation as
`lockedUntil`. It belongs to that version of the terms rather than to a stream
of events, and it cannot be written without the change it explains.

This alone may be enough. Making yourself type *"lowered the gym target because
I could not be bothered"* is startlingly effective, and it costs one text
input.

## The supervisor is optional, and he approves rather than edits

The original shape — a second user who edits your rules and economy — requires
rewriting RLS on every table, layering column-level restrictions on top of
row-level policies, and answering what happens when two people write one jsonb
blob. The failure mode there is silent and the blast radius is somebody else's
logbook.

Inverted, almost all of that cost disappears. **You still author your own
rules. You simply cannot weaken them alone.**

| | no supervisor | with supervisor |
| --- | --- | --- |
| narrowing | lands at once | lands at once |
| loosening | after the clock, with a reason | after the clock **and** with his approval |

Two gates in series, not one instead of the other: the clock still has to
expire before you may even send the request. A supervisor makes loosening
*harder*, which is the point of having one.

- **One pending request per rule.**
- **A refusal restarts the clock. Withdrawing your own request does not.**
  Changing your mind is free; being told no is expensive. Without that
  asymmetry the rate limit is decorative.
- An approved loosening restarts the clock as any landed loosening does.

`ruleEdit` barely changes: `allowed` becomes *narrowing, or the clock has run
out, or this is approved*. Nothing else in the lock moves.

He can read the rules, the economy and the requests. He cannot see or write the
log — no activities, no tallies, no checks, no freezes.

## `migrations/018` — the only one that touches RLS

Two tables: `project_members` (project, user, role) and `rule_proposals`
(project, rule, the proposed terms, the reason, state, decided_at).

Existing policies **do not change**, and that is the whole reason for this
shape. Membership governs the two new tables and nothing else.

Watch for the classic trap: a policy on `project_members` that queries
`project_members` recurses, and the usual fix — a `SECURITY DEFINER` function —
is exactly the patch that accidentally bypasses the check entirely.

---

## Decisions

The record, so a reversal is visible rather than silent.

1. **The verdict is binary.** Partial credit is a drawing, never a verdict.
   A day that almost counts is a day that has stopped counting.
2. **The main streak goes; the daily goal stays.** The streak is contained
   (eight files, half of them the data layer); the goal is read by ten and is a
   display target, not a promise.
3. **A condition may take its limit from the daily goal** (`useDailyGoal`),
   rather than the goal being expanded into seven conditions. One source of
   truth. Requires `termsOf` to watch `dailyGoals`, or the lock has a back door.
4. **The existing streak is migrated, not discarded** — `014` turns it into an
   ordinary rule and carries the sealed weeks and banked freezes across.
5. **Freezes stay per rule.** The composite verdict gets no pool of its own; a
   day is saved when each failing rule is separately frozen, at the sum of
   their prices.
6. **No monthly freeze grant.** The bank already gives that, and more flexibly:
   a clean week banks one, the bank does not expire, so a weekly grant of one
   *is* four a month with the freedom to spend three in a bad week. A second
   cadence would double the places the accounting can be wrong.
7. **A rule joins the day verdict from the day it is ticked**
   (`inDayVerdictSince`), never retroactively.
8. **The balance rate is exactly `−1`, and is not configurable.** Asymmetry
   was tempting — a loss is felt about twice a gain — but it breaks the
   arithmetic: at a 65% keep rate `−2` already drifts downward and at 55% the
   shop becomes unreachable forever, which switches the feature off for exactly
   the person who needs it. Symmetric keeps the reward reachable for anyone
   above half. Not a setting, because a settable rate is the forgeable part.
9. **No floor on the balance.** It goes negative. Debt is honest; the
   alternative was a floor at zero on the grounds that debt is where people
   quit, and that was considered and rejected.
10. **The balance is a ledger sealed on the log's horizon**, not a
    recomputation — you can spend it, so it must not move under a purchase.
11. **The reason for a loosening lives on the rule, not in `change_log`,**
    because that table's writes are deliberately best-effort and an obligation
    that can silently vanish is not one.
12. **The supervisor approves rather than edits**, and is a second gate after
    the clock rather than a replacement for it. Chosen because it leaves every
    existing RLS policy untouched.
13. **A refusal restarts the clock; a withdrawal does not.**
