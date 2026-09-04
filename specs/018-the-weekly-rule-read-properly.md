# 018 — The weekly rule, read properly

**Status: designed, not built.** Every fix here belongs in `npm run sweep`.

Independent of `spec 016` and `spec 017` — it touches the ring, the panel and
the week walkers, none of which those two open. It can be built before or after
either.

---

## The thesis

A weekly rule was added to a day-shaped app and never finished. **Everywhere
the app asks a day-shaped question of one, it gets a wrong answer or no answer
at all**, and the six faults below are one fault seen from six places:

- it is silent for its entire first week, including about things it can never
  take back;
- its ring arc is absent for that week and, thereafter, is a solid green claim
  about a week you have not lived;
- its risk line prints a bare number with no bound attached;
- its calendar strip reads a weekly allowance as a daily one, seven days
  running;
- its chart has drawn no limit line since the rule form was rebuilt;
- and its streak counts a day that is not over.

Four of the six turned up in one sitting of ordinary use; the other two were
found looking for those. None is deep; all of them are the same gap.

---

## Part 1 — The silent first week

Two lines, one in `ruleWeekState`
([customStreaks.ts:1028](../src/lib/customStreaks.ts)) and its twin in
`ruleWeekDayState` ([customStreaks.ts:1306](../src/lib/customStreaks.ts)):

```ts
// Whole weeks only, the same rule `ruleWeekState` follows: "three trips a
// week" judged on the two days that were left when the rule started is a
// rule nobody agreed to.
if (toKey(weekStart) < rule.startedOn) return "unjudged"
```

Proved on the engine — the same rule, the same data, differing only in the day
it was written:

```
=== startedOn = Wednesday (week began Monday, today Thursday) ===
ruleWeekState(this week) : unjudged
  Mon : unjudged   dayReport "unjudged", arcs: 0
  Tue : unjudged   dayReport "unjudged", arcs: 0
  Wed : unjudged   dayReport "unjudged", arcs: 0
  Thu : unjudged   dayReport "unjudged", arcs: 0
ruleRisk : { level: "safe" }

=== startedOn = Monday ===
ruleWeekState(this week) : pending
  Mon : met        Tue : met
  Wed : missed     ← the Pinterest logged at night
  Thu : met
ruleRisk : { level: "danger", detail: "Out of reach — the whole week takes 1 freeze" }
```

**A weekly rule written on any day but Monday does nothing at all until the
following Monday.** No arc, no alarm, no effect on anything, and no explanation
anywhere on the page.

### Ceilings speak; floors do not

The comment's argument is sound and it is an argument about **floors**. *Three
gym trips a week*, judged over the two days left when you wrote it, is a rule
nobody agreed to.

It says nothing whatever about a ceiling. *None at night* is not made unfair by
the week having begun on Wednesday: the slip happened on Thursday, Thursday was
after the rule was written, and no amount of remaining week takes it back.

So the gate narrows to what it was actually defending:

| in a partial first week | |
| --- | --- |
| **a floor** | silent. It was never agreed to |
| **a ceiling, unbroken** | silent, but *present* — see the arc below |
| **a ceiling, broken** | says so: a red arc on the day, and a `danger` notice |
| **the week's own verdict** | `unjudged`. The streak cannot advance and cannot break |

Snapping `startedOn` forward to the next Monday was the alternative. It is
honest, but it leaves you up to six days with a rule that does nothing, and the
night-time slip still goes unremarked.

### `RuleState` gains a member

A rule that is present but cannot win or lose this period is not `unjudged` —
`dayReport` filters those out, so it would never reach the ring. It is
`watching`.

```ts
export type RuleState =
  "met" | "frozen" | "missed" | "pending" | "unjudged" | "watching"
```

`DayReport.readings` **carries** `watching` readings; `kept` and `judged` skip
them, and `state` ignores them entirely. The one mechanism serves both new arcs
in Part 3.

---

## Part 2 — Reading a weekly rule back

Three bugs, all verified headlessly, all with the same shape: **a day-scope
reader handed a week.**

### 2.1 The bare number in a tooltip

`shortfall` hands a **week** reading to `clauseReadoutParts` — a day function —
keyed on **today** ([streakRisk.ts:145](../src/lib/streakRisk.ts)). It compares
the week's figure against the day's bounds and measures slots on a single day,
the one with nothing in it. Nothing matches, so the last-resort branch fires:

```
week reading: value 1, deficit 1
keyed on today     : ["“Pinterest” “1”"]
keyed on Wednesday : ["“Pinterest” “1” in “Night” against at most “0”"]
```

The right sentence is already reachable; it is simply never built.

**Fix: a week-scope sibling** that compares against `weekBounds` /
`weekSlotBounds` and measures slots across the whole week.

Keying the day function on `weekLostOn`'s day was the alternative and is
refused. It is correct for a ceiling only: a week short of a **floor** has no
day of loss until the week ends, so the sentence would be about one day where
the fact is about seven. It also leaves `clauseReadoutParts` a function that
*can* be called wrongly, with nothing to tell the next caller.

### 2.2 The strip reads a weekly allowance as a daily one

`cells` calls `readDay` regardless of scope
([CustomStreakSection.tsx:164](../src/views/CustomStreakSection.tsx)), so
`at most 3 a week` prints, on every one of seven days:

```
2026-08-31: “Pinterest” “0” of “3”
2026-09-02: “Pinterest” “1” of “3”
2026-09-03: “Pinterest” “0” of “3”
```

Read that and you conclude you get three a day. **Worse than a bare number:
that one is merely opaque, this one is confidently wrong.**

**Fix: a weekly rule's cell shows the running total to that day** — `0 0 1 1 1
1 1` — against the week's bound. Read across, the row is the burn-down, which
is the same reading the pace arc gives in Part 3, in the same figures. Two
places that cannot then disagree.

The day's own contribution was the alternative. It answers a question a weekly
rule does not have.

### 2.3 The limit line has been missing since the form was rebuilt

`rowFor` reads `clauses[0].value`
([CustomStreakSection.tsx:216](../src/views/CustomStreakSection.tsx)) — the
**deprecated** flat field. `newClause` writes `min` or `max` and has never
written `value`, so:

```
clauses[0].value = undefined  →  limit: null
```

**No rule written since `spec 011` has a limit line on its chart.** The dashed
line is the thing the area is drawn against; without it the chart is a shape
with nothing to be a shape against.

**Fix: read through `clauseBounds`**, which is the one place that knows about
the deprecated fields. A condition now carries two bounds and may carry both,
so:

- one bound → one dashed line, as before;
- **both** → a band between two dashed lines. *Between two and four hours* is a
  supported shape, and drawing one half of it is the same lie as drawing none;
- compound rule → the deficit against nought, unchanged.

---

## Part 3 — The ring

### Weekly rules draw pace, not a verdict

Today a weekly rule contributes a **solid green arc every day** except the one
`weekLostOn` names. That is defensible — `spec 010` part 2 argues a lost week
costs exactly one day, and the alternative reddens seven days retroactively for
one broken promise — and it produces a bad sentence on Monday morning: a closed
green arc for *three gym trips a week* when you have made none.

**A floor's arc fills with its progress.** Two trips of three is two-thirds of
its slot, filled, the rest of the slot dim.

**A ceiling's arc does not.** A ceiling has no progress; it has headroom, and
headroom drawn as fill would render *I have not spent it yet* as *I have
already done it* — the exact congratulation this part exists to remove. A
ceiling stays a solid arc: whole while it holds, red on the day it breaks.

**One reading per rule, and it is the worst condition.** `PaceCard` deliberately
draws one reading per *condition*, because two conditions in two units share no
axis — but a ring has one arc per rule and cannot subdivide again at forty
pixels. The rule's verdict is already *the weakest link decides*, so the arc
agrees with it.

### It changes nothing but the drawing

The verdict, the centre figure, the day's colour, the streak and the balance
are untouched: a weekly rule short of pace on Thursday is still `met`, because
the week is still winnable. The partial arc reads as *in progress*, the same
family as the existing provisional dimming.

The alternative — a rule behind pace makes the day incomplete in the count —
would make Monday a failed day for anyone holding a single weekly rule, for
ever.

### Every day, not only today

The arc shows the pace **as of the day it is drawn on**, on past days too. Read
a week of cards across and the arcs are a burn-down; the strip in Part 2.2 says
the same in figures. A weekly rule's arc means one thing everywhere rather than
being an effect on one card.

Consequence, stated: every day of a kept week looks partial except the last.
For a floor that is true. For a ceiling it does not arise.

### The day the week is lost

**Full length, red.** `MISS_FLOOR` already stops a miss shrinking away. A miss
drawn as partial fill would merge *broken* with *in progress*, which are the
two states this whole part exists to separate.

### The three "not settled yet" appearances

After this there are three, and only one of them is new:

| appearance | means |
| --- | --- |
| the kept colour at `0.45` | today is holding, and today is not over. **Exists** |
| a partly filled arc | a weekly floor's pace. **New** |
| the track colour, `${c.ink}1F` | `watching` — present, not yet voting. **Exists** as the ring's own empty colour |

`VerdictBar` in the month grid takes none of it. A month is retrospective, its
weeks are over, and pace there is history rather than something to act on — and
a three-pixel bar has no room for a second level of meaning. It does not even
receive `provisional` today.

### A broken ceiling in a partial first week

The sharpest case in this spec, and it has to be said plainly: **the arc goes
red, and nothing else moves.** It does not count towards `kept`, it does not
count towards `judged`, the composite is untouched, the streak is untouched.

That looks like a contradiction and is not. `spec 010` Decision 1 already
establishes that the ring may draw what the ledger does not conclude — it draws
partial and does not mean partial. Here the ring says *you did the thing you
said you would not*, which is true and worth seeing, while the ledger says *this
week was not one you agreed to*, which is also true. The notice board raises it
at `danger` for the same reason: it is information about something irreversible.
What it must never be is a cost, because the week was not in force.

---

## Part 4 — Today is not a day you kept

`keptBreakdown` refuses to count today
([dayVerdict.ts:340](../src/lib/dayVerdict.ts)) — a fix already made once, with
its reasoning written in place. `ruleStatus.current` walks every day up to and
including today and counts `met`, so a rule written this morning with nothing
logged against it reads `1`.

The two disagree about the same Tuesday, and this is the one that is wrong.

**`ruleStatus.current` stops counting today**, matching `keptDays`. A rule shows
`0` on the day you write it. That is correct, and it is also the honest starting
point for a number whose whole job is to be frightening to lose.

**No ghost `+1`.** How today is going is what the ring says, and it says it in
more detail. A provisional increment beside the number is the *four of five
almost counts* this codebase has now refused three times.

---

## Decisions

**1 — The whole-weeks gate defends floors, and is narrowed to them.** It was
written as a statement about weekly rules and is a statement about requirements
you did not agree to. A ceiling is not one of those.

**2 — `watching` is a state, not an absence.** A rule that is present but cannot
win or lose has to survive `dayReport`'s filter to be drawn at all, and drawing
it is the whole point: an arc that appears out of nowhere on the day you slip
reads as a rendering fault.

**3 — The pace arc is a drawing and touches no verdict.** Bought at the price of
the ring having two grammars — *closed means kept* and *fill means progress* —
which is paid for by the fill only ever appearing on a weekly floor, where there
is no verdict yet to contradict.

**4 — Ceilings are never drawn as pace.** Headroom is not progress. This is the
same distinction as `spec 016`'s `spent`/`owed` seen from the drawing side.

**5 — A weekly cell shows the running total.** The strip and the ring then carry
the same figures, and a weekly rule's calendar row becomes readable across
rather than being seven answers to a question nobody asked.

---

## Vocabulary

For `CLAUDE.md`'s **The words**:

| word | what it is |
| --- | --- |
| **watching** | a rule in force on a period it can neither win nor lose. Drawn, never tallied |
| **pace** | how much of a weekly floor is done as of one day. A drawing; the verdict waits for Sunday |
| **headroom** | what is left of a ceiling. Never drawn as pace, because not having spent it is not having done it |
