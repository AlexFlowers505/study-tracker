# 022 — Ten things in the way

**Status: built.** Ten unrelated reports from ordinary use, batched because
each is small and none blocks another. Four of them are bugs wearing the face
of a design decision, which is the interesting half.

---

## 1 — Tooltips inside a popover were never drawn

`Tip`'s bubble was `z-[100]`. `PopoverMenu`'s panel and the date panels are
`z-[110]`. So **every tooltip on a control inside one of those was painted
underneath the panel it belonged to** and simply never appeared.

Nowhere did that cost more than the icon picker, where the tooltip is not a
convenience but the whole feature: the grid is 538 cells now and the name is
the only thing that tells you which icon you are looking at — and the name is
what you would have to type to find it again.

A tooltip is by definition about something else on the screen, so it is the
last thing drawn. `z-[120]`.

---

## 2 — The stop glyph joins the solid pair

`spec 020` ended with a rule — the outlined pair sets a time, the solid pair
holds the clock — and left `Square` outlined. It is one of the transport
controls and it now fills too, so the three read as one set rather than as two
filled buttons and a stray.

---

## 3 — The filled half, properly

`spec 021` shipped 32 filled variants and the report was that 32 is not many.
It was right, and the reason was a rule that had already been written down as
suspect: the candidate test asked whether every subpath *closes*, and that
test threw out every icon whose detail is drawn **outside** the shape being
filled — `Sun`'s rays, `CloudRain`'s drops, `AlarmClock`'s bells, `Bell`,
`Map`, `Anchor`, `Flag`, `Trophy`, `Crown`.

All 268 rejects were rendered filled and looked at. **217 filled variants**
now, from 32. The rules that survive are in `iconLibrary.ts` beside the list;
the new one is the third:

- the fill destroys interior detail (`Skull`, `Cookie`, `Drum`, the six faces)
- the fill collapses the icon into one already on the shelf (`Target`,
  `Disc` and `Compass` are all filled `Circle`; `HeartPulse` and
  `HeartHandshake` are filled `Heart`)
- **nothing is enclosed, so the fill only thickens the stroke** (`Plus`,
  `Minus`, `Equal`, `Hash`, `Activity`, `TrendingUp`). Those give a *bold*
  variant, which may be a fine thing but is not what the toggle above the grid
  says it is.

### Why not a second icon library

The suggestion was to add one, and Phosphor is the obvious candidate — it
ships a real hand-drawn `fill` weight for 1512 icons. It was installed,
measured and removed:

- **Its per-icon module carries all six weights** (bold, duotone, fill, light,
  regular, thin), ~6.4 KB each. Importing the one weight we would draw wastes
  five sixths of it, and there is no per-weight entry point. The last time
  this library grew, 206 new drawings cost 71 KB and that was recorded as a
  considered expense; 200 Phosphor icons would be a megabyte, of which we
  would use a sixth.
- **Two icon families in one grid is a worse outcome than a shorter list.**
  lucide is a 24-unit box with a 2px stroke; Phosphor is a 256-unit box with
  its own curves. Side by side under one heading they read as a rendering
  fault.

Extracting Phosphor's fill paths at build time would answer the first
objection and not the second. If the filled set ever needs to be *complete*
rather than large, that is the road — and it is its own spec, because it means
vendoring somebody else's artwork into this repository.

---

## 4 — The shop badge counted the wrong thing

It read *how many rewards you can afford* over the size of the shelf. Every
other badge in that row answers **how much of this is done** — the rosettes
count what you have reached, the notices what is outstanding — and
affordability is not that question. It also moved on its own: log a day, earn
points, and the badge climbed without anything about the shelf having changed.

It is now **distinct rewards taken**, over the shelf. Distinct rather than
purchases, because a reward can be taken again and again and the fraction must
not climb past its own denominator — which is the objection that put
affordability there in the first place, and it has a better answer.
`takenItemIds` in `lib/shop.ts`, filtered to what is on the shelf now: a
purchase of something since deleted is real history and belongs in the ledger,
but it is not one of the things there are to take.

---

## 5 — A gear on the panels that have a Setup tab

Half the panels are a *reading* of something written somewhere else — the
shelf, the rules, the achievements, the counters — and getting from the
reading to the writing was Setup, then the right tab out of nine, then finding
the row.

`PanelSection` and `NestedPanel` take `onSettings`, drawn as a gear beside the
close X: quiet, on the same faint disc the close button wears, no colour of
its own. It is a way *out* of the panel, which is a rarer act than closing and
much rarer than anything in the panel's body, so it sits with the chrome.

`SetupModal` takes `initialTab`. It is read once at mount, which is all that
is needed — `Leaving` unmounts the modal when it closes, so every open is a
fresh one. The top bar's own button passes nothing and lands on Project, as it
always has; it must not inherit the last tab a gear jumped to, which is why
`App` has one `openSetup(tab?)` rather than a `setShowSetup` scattered about.

Six panels have one: the filter (Counters), the composite and a rule
(Streaks), the shop (Rewards), the achievements (Achievements), sleep
(Project, where the switch is). The account, the change log and the notice
board do not, because a gear that opens the first tab it can think of is worse
than no gear.

---

## 6 — The page-nav button sat on top of the dialogs

It is fixed to the bottom-right corner of the viewport, so on a phone it
landed directly over the foot of the quick-add form — offering to take you to
a section of a page you cannot see and cannot scroll.

It is **absent** while any modal is open, not merely behind one: a button you
can see through a backdrop and cannot press is worse than one that is not
there.

The flag comes from `useModalDismiss`, which already counts open modals for
the scroll lock — every modal in the app calls it, so that module is the one
place that knows. It gains a `useModalOpen()` store, in the same shape
`useTheme` and `i18n` use. The alternative was `App` keeping a parallel
boolean in step with six dialogs by hand, which is a thing that goes wrong
quietly, on the seventh.

---

## 7 — A notice takes you to the rule

The whole block was a button that opened the rule's panel. Two faults:

- **It opened it and left you where you were.** With the board, the filter and
  the shop open, the rule you just asked for is two screens below the fold,
  and a panel that appears where you cannot see it is indistinguishable from a
  button that did nothing.
- **A block that is a button has nowhere to put a second one**, which is what
  the fix needs.

So the block is a block, and the corner of each *rule* notice carries a small
arrow that opens the rule **and scrolls to it**. Quiet on purpose: the neutral
disc the panel chrome wears, not the level's colour — there can be five to
nine notices on this board, and nine bright buttons would out-shout the very
colours the board exists to make you look at. The arrow points down and to the
right because that is where it goes; the composite's panel is always below the
board.

**It opens and arrives, never toggles.** A control that sometimes goes and
sometimes closes is one you have to remember the state of, and the panel has
its own way shut. Pressing it again simply takes you back.

`goToRule` in `App` looks for `kept-rule-<id>` across a few frames rather than
guessing a delay — the panel has to mount and the composite's breakdown has to
draw the row it hangs under — and gives up after ten, because a scroll that
lands somewhere unrelated a second later is worse than one that never happens.

---

## 8 — A duration outlived the times it came from

Set a start and an end, then go back and clear the end: the entry went on
printing the duration the end time had produced. `20:20–…` followed by four
hours, and those four hours went on counting in the slot heading, the card,
the week and the goal.

`withDerivedMinutes` cannot catch it, and its shape is not the problem — it
only speaks when *both* times are set, and its silence everywhere else is
deliberate: an untimed entry's minutes are typed by hand and must not be
overwritten by a guess. The distinction it was missing is not **is this timed
now** but **was this figure the times' doing**.

So `patchEntry` handles the one case that crosses the line — an entry that had
both times and now has not — and puts `minutes` back to nought. Unless the
same patch sets `minutes` itself, in which case it is being typed and that is
exactly the value to keep.

The entry then reads `20:20–… (0m)`, which is what a session you have started
and not finished has always read, so a cleared end lands in a state the app
already had a drawing for rather than in a new one.

---

## 9 — The headline total answered the wrong question

The line above the log reads `учтено 4ч · цель 19ч 30м`. The goal came from
the **benchmark rule**; the total came from `rangeStats` — *every minute
logged, whatever it went on*. `spec 019` made exactly this argument and then
applied it to one drawing only, the month grid's week strip, leaving the two
figures on the period's own heading measured through different things.

The user put the general case, which is stronger than the comparison:

> инфа про уделенное время на все записи смысла не имеет, т.к. она ни о чём не
> говорит, кроме как о том, насколько подробные у меня записи.

A total over every entry says how *thorough* the log is, not how the period
went. File the day's errands, its commute and its washing-up and the figure
climbs without anything having been achieved. Measured through the rule you
nominated, the number before `of` means the same thing as the number after it.

Two figures changed: the period header, and Overview's `Hours logged` tile —
which had to move with it, or one page reports two different totals for one
range.

- `benchmarkMeter(project)` is `benchmarkMinutes` handed out **one day at a
  time**, and `benchmarkMinutes` is now written on top of it. A factory
  because the nominated rule and its conditions are found once and then asked
  about three hundred days; the old shape resolved the rule per call.
- `computeOverviewStats` takes an optional `measure`. **Only the hours go
  through it**: `activeDays`, and the empty days it implies, stay on the raw
  breakdown — a day you wrote something on is not an empty day, whatever the
  benchmark thinks of what you wrote, and *empty* has always meant nothing
  recorded.
- **Null when nothing is nominated**, and the callers then total everything.
  That is not the silence `benchmarkGoals` keeps: there is no promise to read
  the period against, so everything logged is the only answer there is.

Eight cases in `npm run sweep` (`benchmark:`), because the failure is silent —
a regression to "everything" still prints a plausible number, just one that
answers a different question.

---

## 10 — The app stopped being about studying

Hardcoded through the interface: *Daily study time*, *Hours studied*,
*{hours} studied*, *All study time*. The user's own case is study; the app's is
not:

> Юзеры могут использовать приложение вообще не для учебы. Это мой частный
> случай.

**The replacement word is `logged`,** and it is not invented for the occasion —
it is already this app's own vocabulary. The thing you are reading is a
*logbook*, a project has *days logged*, an empty day says *nothing logged*, and
`LogView` is the name of half the page. "Tracked" and "dedicated" would each
have been a second word for a thing that already has one.

| was | is |
| --- | --- |
| Daily study time | Time logged per day |
| Hours studied | Hours logged |
| {hours} studied | {hours} logged |
| Total hours studied per week | Total hours logged per week |
| All study time (a rule's target) | All logged time |
| Study time (that target, in a sentence) | Logged time |

In Russian the word is **учтённое время** rather than a literal *записанное*:
the figure is what the app has *accounted for*, and "учтено 0ч" is the sentence
a person would actually say.

Four chart subtitles were plain English strings that never went through `t()`.
They do now, since they were being edited anyway.

**What is deliberately unchanged is the code's own vocabulary.** `StreakTarget`
still has `kind: "time"`, `customStreaks.ts` still talks about study time in
its comments, and the specs are history and are not rewritten. Renaming an
internal concept is a different change with different risks, and this one was
about what the app says out loud.
