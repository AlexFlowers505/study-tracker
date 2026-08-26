# 014 — Achievements, made as flexible as the rules

**Status: written, building.**

`spec 010` part 5 gave achievements three sources and a note saying why there
would be no more: *a wider list would turn the editor into a second rule
builder, and this app has exactly one of those on purpose.* That was the right
instinct and the wrong line to draw. What makes a rule builder a rule builder
is not the number of things it can count — it is conditions, weekday maps, slot
bounds and a pair of opposing limits. An achievement has none of those and
never will. It can count anything it likes.

Meanwhile the streaks form learned to pick a target in two steps, name several
at once, take hours and minutes rather than raw numbers, and read itself back
in a sentence you can check. The achievements form did not, and it shows: one
`<select>` with optgroups holding kept days, every rule and every counter in
the project — the exact "grouped is not choosing" failure the rules form was
rebuilt to escape.

## The sentence

> Reach **N** of **[what]**, counted **[ever / in a day / in a week / in a
> month]**.

Two kinds of *what*, and the split is real rather than cosmetic:

- **A run** — days kept, weeks kept, or one rule's own streak. The app computes
  these; you pick one.
- **A total** — one or more targets, exactly as a streak condition names them:
  an activity, a tally, a check, a category, a tag, or all study time.

## What changes

### More to count

- **`keptWeeks`.** Built in `spec 013`, never offered here. `weeks kept` is the
  scale that survives one bad Tuesday, so *ten weeks kept* is a better thing to
  aim at than *seventy days*, and it was missing.
- **Several targets at once.** `100h of “Lessons” or “Q&A”` is one goal, and
  two achievements would be two rosettes for one act. Same `targets: []` shape
  a condition uses, so the same picker draws it.
- **Categories.** `totalFor` has always handled them; the dropdown simply never
  listed them. A gap, not a decision.

### A window — the one genuinely new idea

`total` counts everything ever. That makes most totals **inevitable**: study at
all and you will pass a hundred hours, the only question is when. An
achievement you cannot fail to earn is a calendar, not a goal.

A window turns it into a record: **the best single day, week or month you have
ever had.** `100h in one month` can be missed forever, and reaching it means
something happened. `ever` stays the default, because *a thousand hours in all*
is still worth marking — it just should not be the only shape on offer.

Read as the **maximum over every window in the history**, so it is earned the
first time any month clears the bar, and — like every ledger here — never
un-earned by what a later month does.

### Not added, and why

No conditions, no weekdays, no slots, **no ceilings**. A ceiling you never
cross is not an achievement, it is a rule; the thing that cannot be taken away
has to be something you *did*, not something you refrained from. That line is
what keeps this an editor for one number rather than a second rule builder, and
it is the line `spec 010` was really drawing.

## What the lock has to learn

`achievementNarrows` compares `JSON.stringify(source)` and the threshold, which
was exactly right for three fixed sources and is far too blunt for a set.

- **Targets are a set under a floor**, so the streak rules' argument applies
  unchanged: a total is summed across its targets, so **one more target is one
  more place the number can come from**, which is easier. Adding waits;
  dropping lands at once.
- **A window narrows.** `ever` → `month` → `week` → `day` is monotonically
  harder: anything reached inside a day was reached inside its month. Tightening
  lands; loosening waits.
- **Changing the run** — `keptDays` to a rule's streak, say — stays
  incomparable and stays waiting.

## Where the picker lives

`CountersPicker` is the two-step control the rules form uses, and this needs
the same one. It moves out of `StreakRulesTab.tsx` into files of its own:
`views/countersPick.ts` for the kinds and helpers, `views/CountersPicker.tsx`
for the component. **Two files rather than one**, because a module here exports
components or plain values and never both — `react-refresh` fails it otherwise,
which is the same reason the hooks and the icon list have their own files.

## The form

The rules form's shape, because it is the same kind of form: labelled fields
rather than a sentence with switches in it, the two-step picker, hours and
minutes rather than a box of raw minutes, the value echoed back under it, the
window behind a `Fold` since `ever` is the common answer, the readback sentence
quoted through `q()` and rendered by `ui/Sentence`, and the action row stuck to
the foot of the modal.

## Proof

Achievement cases join `npm run sweep`: what each source computes, what the
window does to a total, and what the lock allows in every direction.
