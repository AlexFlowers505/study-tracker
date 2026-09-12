# 026 — A rule remembers what it said

**Status: built.** Twenty-seven cases in `npm run sweep` (`sealed:`,
`revision:`, `ignored:`, `in force:`). Three things were decided differently once it met the code, and
each is marked **`Built:`** in place below — the week's tier boundary, where
the ignored-day rule lives, and what solo may read.

**No migration, and no schema change.** `revisions` rides inside
`settings.streakRules`, which is already one jsonb blob read as a unit, and
absent means exactly what the data meant before: *these terms have been these
terms since `startedOn`*. Nothing is backfilled, for the reason
`migrations/015` gives at its foot and `migrations/023` gives at its head.

**Depends on nothing and supersedes nothing.** It finishes an argument this
codebase has already made three times — in `005`, in `012` and in `015` — and
left one number outside of.

---

## What went wrong

A rule in the reactify project, judged for thirty-six days. A condition is
added to it: *at most 10h a week on “Апдейт условий и инструментов”.* Adding a
condition is a narrowing, so the lock lets it through at once, which is
correct.

The composite streak drops from **36** to about **13**.

Nothing was spent and nothing was lost — the app simply re-judged every day
since the rule began using the terms it acquired this afternoon, and reported
the answer as though it had always been true. The user's response is the whole
of this spec:

> Нужно сделать так, что то, что заработано, уже заработано, и новое правило
> становится актуальным с текущей недели.

Two numbers do this, and only two:

- `keptDays` ([dayVerdict.ts:283](../src/lib/dayVerdict.ts)) walks from
  `verdictStart(project)` to today, calling `dayReport` on every day with the
  current rules. So do `keptWeeks` and `keptBreakdown`.
- `ruleStatus` ([customStreaks.ts:2718](../src/lib/customStreaks.ts)) walks
  from `rule.startedOn` for the rule's own streak.

Everything else was already safe, and it is worth saying which, because it is
the argument for the fix rather than a footnote to it. **Points did not
move** — `dayLedger` is a mark per finished day, written once when the day
leaves the editing window. **Earned freezes did not move** — `ruleVerdicts` is
a verdict per rule per finished week, written once. Both were already right,
for the same stated reason, in the same words, in two migrations and one
module header: *a ledger, not a recomputation.*

The composite streak is the last number in this app still recomputing its own
past. It is also the number the whole design exists to make you afraid of
losing, which is the worst possible place for the omission to have landed.

### The other half, which is not a footnote

Freezing the past creates a lie the recomputation did not have. Reported by
the same user in the same breath:

> Я могу выставить себе очень простые правила, а затем через месяц в этом же
> правиле максимально сложные, а выглядеть будет так, будто я эти максимально
> сложные правила соблюдал всё это время, а это неправда.

Exactly so. A ledger says *these thirty-six days were kept*. Without a record
of the terms, it does not say **what they were kept against**, and the rule's
current sentence — sitting directly above the strip, in the panel, as its
subtitle — silently claims them. Recomputation was dishonest about the past;
a bare ledger is dishonest about the present. Neither half of this spec works
without the other, and the history is therefore **part 2, not part 7**.

---

## Part 1 — The cascade

One question — *what was this day?* — with three answers in strict priority.
Not three mechanisms: one order, applied everywhere, with no site free to
choose differently.

For a day `k`, given today:

1. **`dayLedger[k]` exists.** That is the answer. It was written once, after
   the day left the editing window, and it is the record a purchase was
   already priced against.
2. **No mark, and `k` is past and no longer editable.** Judge it with **the
   terms in force on `k`** — Part 2. This is the hole tier: days before
   `settings.balanceStart`, days marked *ignore in statistics*, days on which
   nothing voted.
3. **`k` is today or yesterday.** Judge it with the rule's **current** terms.

Tier 3 is what answers *«новое правило становится актуальным с текущей
недели»*, and it answers it without a single new control. A day you can still
write to is not history; it is the day you are living in, and the promise that
applies to it is the promise you have now. Yesterday moves with the terms
because yesterday's log moves with your hands.

The same cascade at week scale, for a rule's own weeks: `ruleVerdicts`
(`${ruleId}::${weekKey}`) first, historical terms for a sealed-but-unwritten
week, current terms for the week in play. The current week is unsealed until
the Tuesday after it ends, so a ceiling added on a Wednesday **does** judge
that Wednesday's week — which is what was asked for, and is also the only
reading under which the lock still means anything.

> **Built: the week needs its own tier boundary, and neither half of it is the
> day rule.** `ruleHeldOnWeek`, beside `ruleHeldOn`.
>
> *When* a week becomes history is **sealing**, not its Monday leaving the
> writing window — ask the day question about the Monday and the week you are
> living in reads as history from Wednesday morning, so the ceiling added that
> Wednesday judges next week and never this one. The exact failure this spec
> exists to prevent, rebuilt inside the fix for it.
>
> *Which* terms is read off the week's **last day**, not its Monday. Off the
> Monday, a week holding a mid-week revision is judged by the new terms while
> it is open and by the old ones the moment it seals: its verdict flips on the
> Tuesday after, with nothing having happened. One week, one promise, and it
> is the newest one that began inside it — which is also exactly what
> *«актуально с текущей недели»* asks for.

### Where it lives

**In `dayReport`, and nowhere else.** Every drawing and every walk in the app
funnels through it — `verdictOf` in `App` is one `useCallback` around it
([App.tsx:675](../src/App.tsx)), and `keptDays`, `keptWeeks`, `keptBreakdown`
and `dueMarks` all call it per day. Put the cascade there and all five follow
without being touched; put it in the walkers and there are four copies of one
rule, which is how the heatmap spent a spec and a half disagreeing with the
month grid about the same Tuesday.

`dueMarks` calls `dayReport` and its output is what gets written into
`dayLedger`, which reads like a loop and is not: `dueMarks` already skips any
day that has a mark, so tier 1 is unreachable from it. What it gains is that
the holes it fills from now on are filled with **historically correct** marks
rather than with today's opinion of them.

### The state, and the shade of it

A `DayMark` carries `kept: boolean`. `DayVerdict` carries five states, two of
which hold up (`kept`, `frozen`). So tier 1 cannot answer on its own without
turning every frozen day in your history green, and a freeze that stops being
visible is a freeze you paid for and cannot see.

So the two halves are read from where each is honest:

- **The ledger decides whether the day held.** That is the fact, and it is the
  one that was written down.
- **The historical reading decides which kind of holding it was.** Frozen if
  that reading says frozen — `day.ruleFreezes` is itself append-only with a
  stamped price, so a past freeze reconstructs exactly — and `kept` otherwise.

`readings` — the ring's per-rule arcs — come from the historical reading in
every tier, because the ledger has never held them and inventing them from a
boolean would be worse than not drawing them.

The two can only disagree by one route: an engine fix that changes how a
sealed day reads, which is `migrations/023` happening again. Then the day
draws `kept` with arcs that do not add up to it. That is acceptable and it is
the right way round — the ledger is the fact, the arcs are the explanation,
and an explanation that has gone stale is better than a fact that moves.

---

## Part 2 — Revisions

```ts
/** One set of terms, and the first day it judged. */
export interface RuleRevision {
  from: DayKey
  scope: StreakScope
  clauses: StreakClause[]
  freezesPerWeek: number
  freezeCap: number
  /** Only while a condition can still point at the daily goal. */
  goals?: number[] | null
}
```

on `StreakRule`:

```ts
revisions?: RuleRevision[]
```

**A snapshot, not a diff.** A log of changes answers *what moved*; the
question anyone actually has is *what was I holding myself to in March*, and a
diff log can only answer it by replaying from the beginning. Replay is where
this would rot: the condition schema has been rewritten by `spec 011`, `018`,
`023` and `025`, a third of the fields on `StreakClause` are `@deprecated` and
read only through fallbacks, and a replay across that will one day reconstruct
a rule nobody wrote — silently, in the direction nobody checks. A snapshot
cannot rot. It costs a few hundred bytes per edit of a thing that is edited a
handful of times a year.

### Co-extensive with `termsOf`, deliberately

`termsOf` ([customStreaks.ts:3647](../src/lib/customStreaks.ts)) already
serialises exactly the fields the lock protects: `scope`, the normalised
`clauses`, `freezesPerWeek`, `freezeCap`, and `ctx.dailyGoals` for a rule
still pointing at the goal. `RuleRevision` holds that payload and no more.

**The two must not drift, and there is one place that stops them:** the
snapshot is built by a `termsSnapshot(rule, ctx)` that `termsOf` then
stringifies. One function produces both, so a term the lock watches is a term
the history records, and a field added to one is added to the other or neither
compiles. A history that records less than the lock watches is a history with
a hole in exactly the fields somebody bothered to protect.

Label, colour, icon and note are not terms and are not in it. A rule renamed
is the same rule, and its history is not a naming history.

### Written lazily, so nothing needs a migration

`revisionsOf(rule)` is the only reader:

- `rule.revisions` if it has any;
- otherwise the single implicit revision `{ from: rule.startedOn, ...current
  terms }` — which is precisely what a rule with no recorded history means.

The first edit to land after this ships therefore **materialises two entries**:
the previous terms dated `startedOn`, and the new terms dated today. Not one —
appending only the new set would leave the implicit entry resolving to
"current", and the terms it replaced would be gone at the moment they became
history.

### When one is written

In `ruleEdit`, on every outcome where `changed` is true and the edit is
allowed — the narrowing path, the loosening path and the supervisor's approval
alike. Both existing paths already build a `next`; this appends to it.

Three refinements, each of which stops the log from being noise:

- **Not while `settingUp`.** The day a rule is written is yours to get it
  right on, and the rule has judged nothing. Twelve clicks setting up a rule
  are not twelve revisions; they are the rule's first sentence. Its implicit
  entry follows `startedOn`, which is still moving on that day.
- **Same-day edits collapse.** If the last revision already reads
  `from === todayKey`, replace it rather than append. A revision's job is to
  say which days it judged, and two revisions dated the same day judge nothing
  between them.
- **No reason is required.** `looseningLog` demands prose for a loosening and
  goes on doing so, unchanged and untouched — it is on achievements and shop
  items too, and this is not its subject. A narrowing needs none: the snapshot
  *is* the record, and charging prose for tightening a rule would tax the one
  direction we want to be free. That is the same argument the lock already
  makes about the clock.

### `ruleAsOf(rule, dayKey)`

The last revision whose `from <= dayKey`, laid over the rule:
`{ ...rule, scope, clauses, freezesPerWeek, freezeCap }`. Identity, label and
`startedOn` come from the live rule, because they are not terms. Everything in
tier 2 goes through this and through nothing else.

### What a snapshot does not freeze, and cannot

It freezes the **rule**, not the project. A revision naming a category is
judged against whatever that category holds today, so filing a thirteenth
activity under it changes what an old snapshot counted. Renaming an activity
does the same to the sentence the history reads back.

This is not fixable at a sensible price — freezing the counters would mean
snapshotting the whole project on every rule edit — and it barely matters,
because tier 1 outranks it: for any day with a mark, the terms are not
consulted at all. It bites only in the holes. It is named here so that nobody
discovers it later and takes it for a bug. `CountersPicker` already counts a
category's members out loud for the neighbouring reason.

---

## Part 3 — One number moves once, on the day this ships

`dueMarks` skips days marked *ignore in statistics*; `keptDays` does not. So
today an ignored day that broke **breaks the composite run**, and under tier 1
it will not — that day simply has no mark, and tier 2 judges it by terms that
were never applied to it either.

**Ignored days are skipped: they neither extend nor break.** `CLAUDE.md` has
the rule written down already — *"Ignore in statistics" means excluded
everywhere*, one predicate threaded through `rangeStats`,
`periodBreakdown`, `elapsedDayCount` and the analytics. The composite streak
is the one reader that never got it, which reads as an omission rather than a
decision.

> **Built: in the three composite walkers, not in `dayReport`.** The draft put
> it in tier 2, which would have been a larger change than the one asked for:
> `dayReport` is what colours a day everywhere it is drawn, so an ignored day
> would have stopped being coloured at all — grey on the month grid and the
> heatmap, which nobody asked for and which is a different argument.
>
> The distinction that decides it is that *excluded from the statistics* is a
> claim about **aggregates**. `rangeStats`, `elapsedDayCount` and `dueMarks`
> are aggregates and ask the predicate; a day's own verdict is not one, and
> the strip should go on saying what that Tuesday came to. So `keptDays`,
> `keptWeeks` and `keptBreakdown` ask `makeIsIgnored` and skip, and
> `dayReport` is untouched.

**This can move a live number on deploy, upward,** on any project with an
ignored broken day in its history. That is the only such movement in this
spec and it must be in the release note, because a streak that grows on its
own is as alarming as one that shrinks, and *"we fixed a different bug at the
same time"* is a sentence nobody believes after the fact.

---

## Part 4 — What stops moving

Everything downstream of `dayReport` and `ruleStatus`, which is to say:

- `keptDays.current` **and `best`.** `best` especially: a record that can fall
  because a form was edited is not a record.
- `keptWeeks`, and its squares.
- `keptBreakdown` — *which promise keeps doing this to me* — including the
  `alone` column. It must agree with the streak it exists to explain, or the
  panel names eight days the card counts as kept.
- The colour of a past day everywhere it is drawn: `MonthGrid`, `Heatmap`,
  the day cards, `VerdictRing` and `VerdictBar`, each of which reads
  `verdictOf` and therefore `dayReport`.
- A rule's own `current` and `best`, and its `StreakStrip` and `StreakChart`
  for past periods.

And it stops moving **in both directions**. A loosening that clears the clock
no longer turns last month's red days green. This is the half nobody reports,
because it arrives as good news, and it is the same fault: today the lock
delays buying back a broken past by seven days and then permits it. Under the
cascade the lock stops being a delay and becomes what it claims to be.

`notices()` is untouched. The board is always about today, today is tier 3,
and nothing in it reads history.

> **Built: solo must not be handed the ledger.** `soloProject` in `App` spreads
> `project`, so it inherited `dayLedger` — and a mark is a fact about *every*
> rule that voted, which drowns a projection built to show one. Every sealed
> day came back wearing the composite's verdict and solo became a no-op over
> exactly the stretch worth looking at.
>
> The projection therefore hands on `dayLedger: {}`. That is not an exception
> to the cascade but the rule solo already lives by, stated one line above it
> in the same file: it reaches nothing that is written down, because history is
> not a drawing. What it does keep is the **terms** history — *how did this one
> rule really do* still has to be asked of the promise that was in force.

---

## Part 5 — Where the history is read

Both, and they are not the same job.

### The marker on `StreakChart`

A vertical line at each revision date, labelled with nothing. This is the half
that answers the complaint, because the complaint is about *what it looks
like*, and what it looks like is thirty-six green cells under one sentence.
The marker stands inside the claim and divides it: **left of this, a different
rule.** A note elsewhere on the panel does not do that — it has to be gone to
and opened, and the false impression has already been formed by then.

Recharts draws it as a `ReferenceLine` on the existing chart. It takes
`isAnimationActive={false}` like the limit line beside it, for the reason
`spec 018` records.

`StreakStrip` gets nothing. Its cells are a calendar grid, seven to a row, and
a boundary that falls on a Thursday cannot be drawn down a column without
lying about which cell it lands between.

### The fold on the rule's panel

`Terms before this`, collapsed. One line per revision,
newest first: the date it began, and the terms as `clauseSentence` read them
**then** — the same builder the subtitle, the Setup summary, the change log
and the supervisor's digest all use. Never a second rendering: a history
written in different words from the rule is a history that cannot be compared
with it, which is the only thing anyone would open it to do.

A rule with one revision draws no fold. There is no history to read, and an
empty fold saying so is a control that exists to be disappointing.

> **Built: under the chart, not under the subtitle**, which is where the draft
> put it. The chart is what raises the question — a line through the area says
> *left of this, a different rule* — and the answer to *which one* belongs
> beside it rather than three screens up under the title.
>
> `Fold` moved to `ui/Fold.tsx` on the way. It existed twice already, byte for
> byte, in the rule form and the achievements form, and this wanted a third;
> three copies of one control is how a page ends up with three slightly
> different folds.

---

## Part 6 — Order of operations

The reactify rule currently reads `20h`; it wants to read `10h`.

**Set it after this ships, not before.** Not because the number would be lost
— it would not: `dayLedger` and `ruleVerdicts` already hold the pre-edit
truth, so the streak would read wrong on screen and come back right the moment
tier 1 exists. What would be lost is the **boundary**. A revision is written
at the moment of the edit, and an edit made before there is anything to write
it into leaves the history saying the 10h ceiling has applied since day one —
which is precisely the lie Part 2 exists to prevent, arriving through the door
of the fix for it.

Backfilling that one revision by hand is refused. It is a write into an
append-only record after the fact, and the first use of it would be our own.

**Until then, `startedOn` must not be touched.** It is the one action that
destroys the thirty-six irreversibly, and it is what `migrations/023` reached
for when it hit this same wall from the other side — correctly there, because
those weeks had never been judged honestly and there was nothing to preserve.
Here there is.

---

## Part 7 — The week a condition was written into

**Reported straight back from use, and it is this spec's own doing.** The
first build took *«актуально с текущей недели»* literally: tier 3 judges
everything unsealed by the terms you have now, so a ceiling of ten hours
written into a week that had already spent thirty broke that week on the spot.
The day the ceiling was crossed read `missed`, the composite run — which ends
at today — collapsed to one, and thirty-odd days appeared to evaporate a
second time.

Nothing was lost: `best` was untouched and the sealed history was exactly as
Part 1 promised. But *«actual from the current week»* and *«breaks the current
week»* are not the same sentence, and only the first of them was asked for.

**The week you write a narrowing in is a week you have already spent.** That
is the fact neither the report nor the design stated, and once stated the
answer is already in the codebase: `spec 018` argued it out for a weekly
rule's partial first week and settled on **drawn, never tallied** — a broken
ceiling still goes red, because a ceiling is broken the moment something lands
in the wrong slot, and the week keeps no verdict of its own, because nobody
agreed to it.

A condition added on a Wednesday is a promise made on that Wednesday. It gets
the same partial week, for the same reason.

### `clauseInForceFrom`, and why `startedOn` could not answer

`rule.startedOn` answered *when did this condition come into force* for as
long as a rule's conditions all arrived with the rule. They do not, and the
revisions of Part 2 are exactly the record of when each did. The walk goes
**backwards** from the newest revision and stops at the first that does not
carry the condition: dropped and written again is a *new* promise — the
removal was a loosening that had to wait out the clock, and what it left
behind is not a history the new one inherits.

`weekClausesOn` splits a rule's weekly conditions into the ones this week is
in force for and the ones merely watching it. **Per condition, not per rule**,
which is the whole of the second half of this part.

### The mixed rule, which never had the grace at all

`countsOn` was a boolean beside the drawn state, and a boolean can only say
*all of this counts* or *none of it does*. That is true of a rule whose
conditions arrived together and false of every other kind — and its first line
was:

```ts
dayClauses(rule).length > 0 ||
```

*A rule with any daily condition always counts.* So a **mixed** rule's weekly
half was carried into the tally by the daily half standing beside it: the
partial-week protection `spec 018` built applied to purely weekly rules and to
nothing else, silently, and a mixed rule broke its composite on a week nobody
had agreed to.

The answer is a **second reading rather than a flag on the first**.
`ruleWeekDayState` and `ruleStateOn` take `"drawn" | "counted"`; they differ in
exactly one thing, whether a condition that is merely watching gets to speak.
`RuleReading` carries both — `state` for the ring, the strip and the notices,
`counted` for the verdict, the streak, the balance and the breakdown — and
`counts` becomes simply *is the counted one a verdict at all*.

So on the Wednesday the ceiling was crossed the arc goes red and says which
promise, and the day is still `kept`. Those are not in tension: `spec 010`,
Decision 1 already allows the ring to draw what the ledger does not conclude.

### What it costs

The first **whole** week under the condition is judged like any other, so a
ceiling written on Wednesday bites from Monday. That is a delay of at most six
days on a narrowing, paid once, and it is the same price `startedOn` has
always charged a new rule.

`notices.ts` asks the same question per condition now (`partial` moved inside
the readings loop), so the board stops warning about a floor over four days
that nobody promised.

---

## Decisions

1. **A ledger, not per-clause dates.** A `StreakClause.startedOn` was the
   cheap fix and it covers one vector: a condition *added*. Raising a ceiling
   on an existing condition, changing its target, deleting one — all still
   rewrite history. It also has no answer for a weekly condition dated
   mid-week. The cascade covers every edit that has ever been made or will be,
   including the ones that are not edits at all: a fixed engine, a changed
   reading, a bug like `023`.

2. **Rule versioning is not the mechanism, only the fallback.** Judging every
   past day with its own terms would reproduce the old streak, and it would
   still be the wrong primary: it freezes the terms and not the *reading* of
   them, so the next `023` walks straight through it. The ledger freezes the
   answer. Snapshots fill its holes, and that ordering is the whole design.

3. **No per-rule day-grained ledger.** A daily rule's own streak has no ledger
   under it — `ruleVerdicts` is weekly — and one could be built by extending
   the `day_ledger` table. It is not, and the reason is what ledgers are for
   here: `dayLedger` exists because points can be **spent**, `ruleVerdicts`
   because freezes can be **spent**, and both migrations say so in those
   words. A rule's own streak is displayed and nothing else. Tier 2 answers it
   exactly, at the cost of a migration and a table that are not written.

4. **The sealed verdict is the colour too.** Sealing the number and leaving
   the drawing live would put the contradiction on one screen — a streak of
   forty with red days inside it — and between two numbers on a page people
   believe the red one.

5. **No "apply from" control on an edit.** The user half-remembered one, and
   it is real: `startChoices` in `StreakRulesTab`, offered while a rule is
   still being set up. It stays there and is not extended. Two effective
   dates — the rule's and the edit's — are two mechanisms that will one day
   disagree about one Tuesday, and a date you can choose is a date somebody
   will eventually choose in the past, which reopens the door Decision 4 shuts.

6. **Drawn and counted are two readings, not one reading and a flag.** The
   boolean was right until a rule could be half in force, and a mixed rule is
   permanently half in force. Widening `countsOn` to take the context would
   have kept the shape and moved the bug: what a day is worth to look at and
   what it is worth to the tally genuinely differ, and a design that can only
   say *all or none* about that will be wrong again the next time a rule gains
   a scale.

7. **Not `change_log`.** It has the shape and it is disqualified by its own
   header: its read and its write are deliberately best-effort so a logging
   failure can never raise the save banner. That is right for a convenience
   and fatally wrong for an obligation, and `looseningLog` was moved onto the
   rule for exactly this reason. A record that can silently fail to save is
   not a record.

---

## Sweep

`npm run sweep` covers `customStreaks.ts` and `dayVerdict.ts`, so this is not
optional. Expectations written out, never derived.

- `sealed:` — a sealed day keeps its mark when terms tighten; when they
  loosen; a sealed **frozen** day stays frozen rather than turning plain kept;
  an unmarked past day is judged by the terms in force on it; yesterday and
  today are judged by current terms; a weekly rule's current week is judged by
  current terms while its sealed weeks are not.
- `revision:` — an allowed terms edit writes one and materialises the implicit
  first; a second edit the same day replaces rather than appends; a label-only
  edit writes none; an edit on the set-up day writes none; a refused edit
  writes none; `ruleAsOf` picks the right snapshot at each boundary and on the
  boundary day itself.
- `ignored:` — an ignored broken day no longer breaks the composite run.
- `terms:` — `termsSnapshot` and `termsOf` name the same fields. The one case
  that fails when somebody adds a term to the lock and forgets the history.

- `in force:` — Part 7. A ceiling written into this week does not break the
  run and is still drawn as broken; the first whole week under it is judged;
  a mixed rule's daily half votes through its weekly half's partial week; a
  purely weekly rule's partial week is unchanged; and a condition dropped and
  written again gets its grace back.

**Built: twenty-seven cases, and two more than the list above.** A control was
added beside each change of behaviour, because a case that only asserts the
new answer cannot tell a fix from a fixture that never exercised the old one:
*and by today's terms when there is no history to read* stands beside the
sealed cases, and *and one nobody ignored still does* beside the ignored one.
The week-boundary pair is the correction recorded in Part 1 — it fails against
the draft design, not merely against the old code.

---

## Vocabulary

| word | what it is | where |
| --- | --- | --- |
| **a mark** | one finished day's verdict, written once when it left the editing window. The fact | `DayMark`, `dayLedger` |
| **a revision** | one set of terms and the first day it judged. Append-only, never a diff | `RuleRevision`, `revisionsOf` |
| **the cascade** | mark, then the terms in force then, then current terms. One order, everywhere | `dayReport` |
| **terms** | what the lock protects and the history records — scope, conditions, allowance, cap. Never the label, colour or note | `termsOf`, `termsSnapshot` |
| **in force** | the day a *condition* began judging — its own revision, not the rule's `startedOn`. What gives one added mid-week a partial first week | `clauseInForceFrom`, `weekClausesOn` |
| **drawn / counted** | what a day is worth to look at, and what it is worth to the tally. They part company for a condition watching the week it was written into | `RuleReading.state` / `.counted` |
| **a hole** | a past day with no mark: before `balanceStart`, ignored, or unjudged. Where tier 2 speaks | Part 1 |
