# study-tracker

Personal study-time logbook: log minutes per day across time slots and activities,
track lesson/exam progress against a goal, and view week/month/heatmap analytics.

Scope note: this file applies to this repository only. Keep machine-wide or
unrelated-project instructions out of it — and out of `~/.claude/CLAUDE.md`, which
would leak into every other project on the machine.

## Work in progress

**`specs/025-eight-things-from-use.md` is built** — eight reports from a week
of ordinary use, two of them engine bugs wearing the face of a decision. **No
migration:** every new field rides in existing jsonb and means, when absent,
exactly what the data meant before.

- **A receipt is not a verdict.** `spec 017` fixed *coverage* for a week — a
  violation that has grown past what was paid is not the one that was bought —
  and left the verdict alone, so a ceiling broken on the Monday and bought on
  the Monday made the whole week read `frozen` with five days still to run.
  The strip colours all seven of a weekly rule's cells by the week's state, so
  **one freeze drew seven blue snowflake cells**. `ruleWeekShown` is the
  drawing-only sibling of `ruleWeekState`: a week that has not ended keeps
  `pending` and wears its corner snowflake instead. `ruleWeekState` itself is
  untouched, so the streak, the ledger and what may be frozen read as they
  did.
- **A paid period is not a finished one, and the board treated it as both.**
  `ruleNotices` returned nothing at all the moment `isFrozenFor` was true — a
  guard written when a freeze covered a whole rule. So a rule went completely
  silent (no `“Pinterest” 3 of 3 used — one more ends it`) and reappeared at
  `danger` only once the violation had grown past the price, having never
  warned. The guard is gone; the per-violation `paid` filter is the whole of
  what a receipt buys. `RuleOpenWeek.carried` also stops "Still in play"
  calling a week held up by a freeze *clean so far*.
- **Every time figure on the analytics half goes through the benchmark rule**
  (`benchmarkDays`). `spec 022` made that argument for the headline hours and
  applied it nowhere else, so a period read `4h 25m` in its header and
  `17h 5m` in the donut two lines below — three quarters of it **sleep**,
  since `spec 024`. One filtered copy of `days`, so the donuts, the four
  charts, the averages and the extremes cannot disagree. Only the entries and
  only time: `counters` and `checks` are untouched, and `activeDays` stays on
  the raw log because a day you wrote something on is not an empty day.
  `MeasuredNote` names the rule on both sections, with a gear to the tab where
  it is nominated; nothing nominated still counts everything and says so.
- **`36 → 0`.** `current` is the run as things stand, and *as things stand* is
  the one state it cannot describe — it reads `36` until the midnight it reads
  `0`, and it reads `0` the moment a day you can **still write to** breaks,
  which is indistinguishable from a run that ended in March. `KeptDays` carries
  both ends instead: **`atStake`** (every editable day but today counted as
  kept; today neither adds nor breaks unless it already holds) and **`facing`**
  (sealed exactly as it reads, so `pending` is a miss). The pair is drawn while
  they disagree — on `KeptFigure` as `36 → 0`, and on the streak badge in the
  period bar as the figure with the sealed one under it in `sub`. That badge's
  "it does not go red" rule takes its one exception here: this is not a second
  alarm but the second half of one number, in the same red the figure below
  uses. `atRisk` names the promises doing it.
- **The strip of a weekly rule stops drawing days that have not happened.**
  Every cell wore the week's running total, so on a Tuesday the row read
  `1 · 7 · 7 · 7 · 7 · 7 · 7`. A future day takes `unjudged`. **And its
  receipt goes on one cell** — the week's Monday, or the first day of that
  week in range: `freezeOffers` answers with the week's list whatever day it
  is asked about, so all seven drew the same ring, popover and snowflake.
- **`Leaving`'s grid child needed `min-width: 0`.** It had `min-height: 0`;
  a grid item defaults to `min-width: auto`, so one pasted URL in a reward's
  description widened that item past the page, took `max-w-6xl` with it and
  left every `truncate` inside with nothing to truncate against. The fourth
  face of the `min-w-0` trap, fixed in the one place every panel goes out
  through.
- **The count filter takes `onBulk` per group.** Isolating one activity out of
  forty took thirty-nine clicks; `ToggleChips` has had the button since the
  chart legends needed it.
- **`StreakClause.scope` — one rule, two scales.** *Three hours a day of the
  category, and at most four a week of one activity in it* was two rules,
  which is two streaks to keep and two allowances to spend for one promise.
  Absent means the rule's own scope. `clauseScope` / `dayClauses` /
  `weekClauses` / `isMixed` are the vocabulary; `ruleStateOn` folds a day's
  two halves (missed over pending over frozen); `freezeOffers` returns both
  lists because their receipts are filed in different places; `isFrozenFor`
  takes the scale from its arguments; a mixed rule's streak is counted in
  **days** and its panel drawn on the day. The benchmark reads the daily half
  only. Changing a condition's scale is **incomparable**, therefore locked.
  A weekly condition now names its period in its own sentence, which it never
  had to while the period belonged to the rule.
- **`TimeWindow.nextDay`.** `edgesOn` reports a session past midnight as
  minutes past 1440 and has to; a window's walls are wall-clock times. So
  *get up between 04:00 and 05:00* asked for 240–300 while every real night
  reported 1680 — a rule nothing could keep, for the one subject the app most
  obviously has one about. Stated rather than inferred, for the reason
  `spec 023` refused to read a window across midnight at all. One flag for the
  pair, offered on the **finishing** window only, and `windowWalls` is the one
  place the shift is applied.
- **A reward opens** (`ItemDetail`) — the icon at a size you can see, the
  description in full, the price as a distance. The name and its icon open it;
  the row does not. `Take it` still hands to `BuyConfirm`, which stays the only
  ceremony.
- **A reward can ask for achievements** (`ShopItem.requires`), and/or points —
  never neither. `priceEdit` becomes `shopEdit` and takes requirements from the
  same side of the one-sided test: adding one lands at once, dropping one
  waits like a discount. An id matching no achievement is dropped, not
  reported: deleting an achievement takes its record with it.

**`specs/011-the-rule-form-rebuilt.md` is done, and `migrations/019` has now
run on dev and on prod.** Read its Status block before touching rules,
checks, the daily goal or the ring. Highlights: a condition names
several counters and can take a floor and a ceiling at once and a different
figure on each weekday; a named slot can carry its own figure on top of the
day's; checks have three answers and nothing is inferred for an unanswered
one; the effectiveness meter is gone and the day's goal is read from a
nominated **benchmark** rule (`lib/benchmark.ts`); the verdict ring is
weighted and opens.

**`specs/013-what-a-period-asks.md` and `specs/012-the-first-target-assumption.md`
are built, bar one item.** Between them they record a week of engine bugs and
what closed each: a weekly rule multiplying its own figure by seven, a weekly
rule that never read slot bounds, a failed check that warned at no hour of the
day, a lock comparing only the first of several targets, four places that
printed the wrong counter's name, and today being credited as a day already
kept. `npm run sweep` covers all of it.

`dueToday` closed the last of them, as a quiet line under the streaks row
rather than a fourth `RiskLevel` — **and `spec 016` has since made it the
fourth level after all.** The reasoning here was that a new level would make
`StreakBar` draw a block every morning; the answer was that volume is a
property of the notice rather than of where it is drawn, so `notice` and `allClear`
are lines and only `danger` and `warning` are blocks. Both the function and the
chevron's list are gone.

**`specs/010-day-verdict-and-rewards.md` is built, all nine stages.** The main
goal streak is gone, the day's colour is a composite verdict over every voting
rule, and a balance, achievements, a shop and an optional supervisor sit on top
of it. Its Decisions section is the reasoning, and two of them have since been
reversed by `spec 011` — read both before changing anything about streaks,
freezes, the goal or how a day is coloured.

**Migrations `014`–`019` are written and every one of them has run on both
databases.** `019` was the last outstanding: it rewrites a condition still
pointing at the daily goal into the seven figures it was pointing at.

**`specs/018-the-weekly-rule-read-properly.md` is built.** Read it before
touching anything a weekly rule passes through. Six faults, one gap — a weekly
rule was added to a day-shaped app and never finished:

- **The partial first week no longer silences it.** The whole-weeks gate was an
  argument about *floors* — "three trips a week" judged over the four days that
  were left is a rule nobody wrote — and it was applied to the whole rule. Now
  a floor stays silent, a broken **ceiling** speaks, and the week keeps no
  verdict of its own either way (`clauseLostOn`/`weekLostOn` take a
  `"ceilings"` mode).
- **`RuleState` gains `watching`** and `RuleReading` gains `counts` and `pace`.
  A rule present on a period it can neither win nor lose is **drawn and never
  tallied**: `dayReport.readings` carries it, `kept`, `judged` and the verdict
  see only what votes (`countsOn`). The ring is divided by `readings.length`,
  not by `judged` — dividing by `judged` made a watching-only day draw no ring
  at all.
- **`clauseWeekReadoutParts`** is the week-scope sibling of
  `clauseReadoutParts`. A week reading handed to the day function keyed on
  today compared the week's figure against the day's bounds and measured slots
  on the one day with nothing in them, so every weekly line fell through to a
  bare `“Pinterest” “1”`.
- **A weekly rule's strip cell is the running total** (`readWeek` truncated at
  that day), not that day's own figure read against the week's bound — which
  printed `“Pinterest” “0” of “3”` seven days running.
- **The chart's limit line is back**, read through `clauseBounds` /
  `weekBounds` rather than the deprecated `clause.value`; a condition carrying
  both bounds draws a band. It also needs `isAnimationActive={false}`, or
  Recharts' own animated dasharray wins over the dashes and draws nothing.
- **`ruleStatus.current` no longer counts today**, matching `keptDays` and
  `keptBreakdown`. A rule shows `0` on the day you write it.

**`specs/016-four-levels-and-a-board.md` is built.** Read it before touching
anything that tells you something is wrong.

- **`lib/notices.ts` replaces `streakRisk.ts`.** `ruleRisk` and `dueToday` are
  gone; `notices(project, statuses, now)` returns the whole board. **Five
  levels on one axis** — *is this already spent, or is it still owed?* —
  and one of the five is about what you can do rather than what happened:
  `gone` is broken with no freeze that reaches it, `danger` is broken with a
  freeze that still can, `warning` is reachable with the margin gone, `notice`
  is owed with room, `allClear` is nothing owed and nothing spent. That is the
  old `RiskLevel` with `safe` split in two and its red split in two again: the
  same colour on *act now* and on *it is over* teaches people to ignore the
  colour. **`gone` is not a red**, and the first version's deep oxblood was:
  beside `exam` at badge size it read as the same state drawn slightly
  darker, so the one distinction the level exists to draw was the one it
  failed to draw. It is near black now — the only colour in the palette that
  never has to be told apart by shade — and lightens for dark mode onto a
  drained grey, since black there is the page. `gone` needs an unaffordable freeze, not merely an absent one — a
  weekly rule's partial first week offers nothing because nothing is at stake,
  and nothing at stake is not something lost. The thresholds are unchanged.
- **One notice per rule per level**, lines inside it. Five rules make five to
  nine notices, which is the bound that stops the board being a dashboard.
  Four sources beyond the rules: the composite, the freeze allowance, unsealed
  weeks, achievements in reach.
- **A violation you have paid for stops speaking.** `ruleNotices` could only
  see a freeze at the level of the whole rule — `state === "frozen"`, which is
  `isFrozenFor`, which means *every* site covered. `notices.ts` predates
  `spec 017`, so a rule asserting two checks with one of them bought went on
  shouting `danger` about the one you had just paid for: the board
  contradicting the receipt, with the receipt right. `Item` carries the
  `violationKey` it is about now — a check per target, a count per bound and
  per slot rider, a **time condition all on one key**, because
  `violationsOn` prices it as one site however many of its parts broke — and
  `ruleNotices` drops the ones already in `frozenKeys`. A weekly rule's
  receipts live on its Monday; a daily rule's on the day, and yesterday's on
  yesterday. Three cases in `npm run sweep` (`paid:`), one of which fails
  against the old code.
- **`NoticeBoard` is the only place.** `StreakAlarms` and the chevron's
  "what today asks" list are deleted; `StreakBar` takes a `troubled` count and
  draws no alarms. The board sits where the alarms did — first under the period
  bar, above the composite — is **always about today** whatever the period bar
  shows, and is **the one panel whose state persists** (`timelens-notices`).
  **One container for all four**, coloured by level. Two weights — a block for
  the loud half, a bare line for the quiet one — was the first build and was
  reversed in use: a line and a block read as two different *kinds* of thing,
  and the quiet half stopped looking like part of the board, which is the
  failure the board exists to fix arriving by the other door. What holds the
  dashboard off is the one-per-rule-per-level bound, not making half of them
  quieter.
- **A rule notice and a fixed one no longer look alike.** The board holds two
  kinds of thing — a promise you wrote, and the four sources that are
  bookkeeping *about* those promises — and drawing them identically meant a
  level holding both read as one striped run with `Today` sitting in it like a
  rule nobody could remember writing. The level still owns the **colour**,
  because that is what the eye is scanning for and burying a red one under a
  second heading costs more than it buys; what says which kind it is now is the
  **surface** — a rule raised with its wash and ring, a fixed source recessed
  into `bg-ink/[0.04]` with no outline, keeping the level in its icon and
  title. Within a level they are two `<ul>`s, promises first, so the gap says
  it again and a screen reader is told "3 items" then "2 items". No
  sub-heading: a fifth word per level is the dashboard arriving by the door
  the one-per-rule bound is holding shut.
- **The level filter takes away rather than picks out**, and carries one bulk
  button. It was a whitelist — `held`, empty meaning everything — so a click
  isolated one level: one click for the rare question, four for the common one
  (*stop showing me the green ones*), and `hide all` with nothing left to mean.
  It is now `hidden`, which is what every other legend in the app is
  (`ToggleChips` strikes its chips out), and the single **Hide all / Show all**
  shows whichever half applies, exactly as `bulkToggleFor` does for the charts.
  The stored `held` is translated into the levels it left out rather than
  reused — the same array meaning "everything" one day and "nothing" the next
  is the silent breakage this codebase refuses.
- **Three toggles**: `Bell`, `Flame` (the composite's days) and `Coins`
  (points, `4.1k` past a thousand) which opens the **account panel** — the total, signed earning
  bars off `dayLedger`, and rewards and purchases as a list. The shop keeps the
  shelf and one line of balance.
- **Solo** (`SoloBanner`, `soloProject` in `App`) draws the page as though one
  rule were the only one that votes. It touches no ledger — points,
  achievements, freezes and the change log are all built from `project`, never
  from the projection — and it is never persisted.

**`specs/017-freezes-bought-not-charged.md` is built.** Read it before touching
anything about freezes.

- **A freeze is a purchase against one violation**, at a price stamped when it
  was bought. `Day.ruleFreezes` is now `(string | RuleFreeze)[]`; a bare string
  is the old shape and means *this rule, entirely*. **No migration**, on
  purpose: the price of a purchase made in March is not recoverable, and a
  ledger may not be seeded with a number nobody recorded.
- **A violation is one named site that broke** — `violationsOn` in
  `customStreaks.ts`. Checks split per target, a count splits per broken bound
  (its own and each slot rider), time stays one whatever broke. **The items add
  back up to `totalDeficit`**, so no rule got cheaper or dearer; only the
  buying changed.
- **Only `settled` violations may be frozen.** A wrong answer and a breached
  ceiling are spent at any hour; a floor is settled once the clock rules it
  out, and **an unanswered check is settled once the day is over**. That last
  clause is what keeps yesterday freezable.
- **`freezeOffer` became `freezeOffers`** and returns a list. The strip's
  popover names each site with its own price, keeps the already-frozen ones
  listed and dimmed, and `FreezeConfirm` buys exactly one — with a warning when
  others on the same period are still unfrozen, because a day can now be partly
  paid for and still break.
- **`isFrozenFor` takes the rule and the context** and means *every violation
  covered, at no less than what it now costs*. **`freezeSpendOn` sums stored
  costs**, so a week that spent three has spent three forever.
- **A week itemises exactly as a day does** — `weekViolationsOn`, and this
  reverses *this spec's own part 5*. A week was one flat violation costing one
  freeze, on the argument that itemising would raise a compound weekly rule
  from one freeze to several. What that missed is that the week was already
  **the cheap period**: a day rule pays what it fell short by, so four slips
  cost four, while the identical promise written weekly cost one however far
  past the line you went — *at most three Pinterest a week* broken by
  seventeen was a single freeze. A price that does not move with the failure
  is not a price. So a **count** costs its shortfall, **time** costs one
  however many of its parts broke, and a **check** splits per accepted answer
  (where the week counts them) or per named check (where it asserts them, one
  site priced by how many days were not accepted — not one site per day:
  `violationKey` has three segments and no room for a date, and giving it one
  would orphan every freeze already bought). The items add back up to
  `totalDeficit(readWeek())`, so the streak is untouched and only the buying
  changed. The receipts still live on the week's Monday.
- **Coverage compares prices, it does not look up keys.** A violation can grow
  after it has been paid for: a ceiling is settled the moment it is crossed —
  there is no doing less of something already done — but nothing stops you
  doing *more* before the period closes. On a day that is one afternoon of
  exposure; on a **week** it is six further days, and it would have made
  "freeze the Monday, then binge until Sunday" a free week. The stamped price
  still stands and is never repriced; a violation that has since grown past
  what was paid is simply not the one that was bought.
- **`freezeCost` still answers one for a week**, and that is not a leftover: it
  prices only the *legacy* shape — a bare rule id meaning "this rule,
  entirely" — and every one of those was bought when a week did cost one.
- A weekly rule broken badly can now be **unaffordable**, and `notices.ts` will
  call that `gone`. Correct, and new: under the flat price almost nothing
  weekly ever reached that level.

**`specs/019-three-additions.md` is built** — three unrelated small things:

- **The month grid's week hours are measured through the benchmark rule**
  (`benchmarkMinutes`), not through every minute logged. `12h of 15h` used to
  compare a figure one rule promised against one nobody promised anything
  about — an activity called *Did nothing* with twenty hours in it reported
  twenty hours of work. **Absent entirely when nothing is nominated**, the same
  silence the goal line already keeps. `MonthGrid` takes a `benchmarkOf`
  callback, like `verdictOf`: it sees days and slots, not the project.
- **`StreakTargetKind` gained `sleep`** — the second kind with no id, since
  there was only one of it. **`spec 024` has since removed it**, and the
  reasoning recorded here is the reason it could go: the axis existed because
  making sleep an activity "costs every total in the app about eight hours a
  day", and `spec 022` made the totals answer to the benchmark rule instead. A
  rule about sleep names the Sleep activity now, like any other.
- **`tagIds` on `Activity`.** An activity is one of the three kinds of counter
  and a condition can already name a tag, so *40h of anything tagged “deep
  work”* was a sentence the app could nearly say. The consequence is that a tag
  can now span both measures, so **a tag target stores its `measure`
  explicitly**, exactly as a category target does and for the same reason:
  filing one more counter under it must never change what an existing rule is
  measuring. `keepsActivity` gains the branch its sibling already had.

**Deferred from `019` and built in `024`:** the rotated sleep charts offered to
any activity. It read as a drawing change and was not one — `collectNights`
walked `day.sleep`, and generalising it meant teaching the one file that must
never reach `stats.ts` to read what `stats.ts` is built on. It got its own
spec, as it asked for, and the file still never reaches `stats.ts`.

**`specs/020-pausing-an-entry.md` is built.** Read it before touching an
entry's times or its duration.

- **A pause is a duration, and there is one of it per entry.** `TimeEntry`
  gains `paused` (minutes, all of them however many stops that was) and
  `pauseFrom` (an ISO instant, present only while one is running). `minutes`
  becomes the span **less** the pause, floored at nought, which is the whole
  of the integration: everything downstream already reads `minutes`, so the
  totals, the goals, the streak engine and the charts follow untouched. No
  migration — both ride in the existing `days.cells` jsonb.
- **It is measured between two clicks and never off the clock.** Nothing in
  the pause path reads `start`, which is what makes pausing work on an entry
  you are filling in for yesterday: the two clicks happen now, and the only
  thing taken from them is how far apart they were. Each stop is rounded to
  `STEP_MINUTES` **as it ends** rather than the total being rounded once, so
  what the app adds is what it showed you it was adding — and a stop shorter
  than half a step stores nothing rather than `paused: 0`.
- **The outlined pair sets a time, the solid pair holds the clock.** `Play`
  and `Square` outlined are Start now and End now; `Pause` and `Play` **filled**
  are the hold. Resume is a play triangle and so is Start now, and two
  identical outlines side by side is the one ambiguity a tooltip cannot fix.
  Circling the hold was the first answer and it lost: a glyph inside a ring
  spends a third of its pixels on the ring, and at twelve that is exactly what
  it cannot spare. `Square` fills too, so the three transport controls read as
  one set. Exactly one of pause and resume is ever drawn, only while a
  session is running, and **ending a paused one resumes it first**
  (`stopNowPatch`) — otherwise the pause you were in the middle of is discarded
  by the click that stopped the clock. **Add does not end a running pause**,
  though: filing the entry is not coming back from the break, so `pauseFrom` is
  carried into the saved entry and the card's Resume ends it.
- **The star is the mark that the line does not add up on its face.**
  `22:00–22:30 (15м*)`, in `c.warn` because amber is already this palette's
  *held, not lost*; the tooltip carries the figure and sits on the **label**,
  since a fact you can only reach by hitting six pixels is a fact nobody
  reads. `ui/EntryTime.tsx` is the one place it is drawn, so the readout, the
  edit row and the add dialog cannot drift.
- **`patchEntry`'s explicit-`undefined`-deletes-the-field rule is now every
  key in the patch**, not the two named cases it was written for.
- **Sleep is left alone.** The field is on the shared `TimeEntry` so the
  arithmetic is one function, but the controls are offered on study entries
  only, and that distinction went with `spec 024` — a night is an ordinary
  entry now, so pausing one is offered like anything else.

**`specs/021-a-filled-half-of-the-library.md` is built.** Read it before
touching `iconLibrary.ts`.

- **lucide ships no filled set**, so a filled icon is the same component drawn
  with `fill="currentColor"`, and its stored name is the outlined one plus
  `.filled`. `RenderIcon` is the only place that knows the suffix exists, which
  is why nothing that stores an icon name had to change and there is no
  migration.
- **217 of the 321 get one, and the list was chosen by looking at all of
  them.** Three things rule an icon out and all are visual rather than
  structural: filling destroys interior detail (`Skull` loses its eyes,
  `Cookie` its chips, every face its expression); filling can **collapse an
  icon into one the library already has** — filled `Target`, `Disc` and
  `Compass` are all a plain circle, which is filled `Circle`, and
  `HeartPulse` is filled `Heart`; or **nothing is enclosed**, so the fill only
  thickens the stroke (`Plus`, `Hash`, `Activity`), which is a *bold* variant
  and not what the toggle says. **No structural test survives this**, and the
  first attempt at one is the reason there were 32 for a day: it asked whether
  every subpath closes, which is the wrong question twice over — SVG fills an
  open subpath by joining its ends, so `Heart` is one unclosed path that fills
  perfectly, and the test also threw out every icon whose detail is drawn
  *outside* the shape being filled (`Sun`'s rays, `Bell`, `Map`, `Anchor`).
- **A second icon library was tried and rejected**, and the note is in
  `iconLibrary.ts` so nobody has to try it twice. Phosphor ships a real
  hand-drawn `fill` weight for 1512 icons, and its per-icon module carries all
  six weights at ~6.4 KB — five sixths waste, with no per-weight entry point —
  while two icon families in one grid read as a rendering fault. Extracting
  its fill paths at build time answers the first objection and not the second.
- **The picker gains a shape toggle** — All / Outlined / Filled — a recessed
  track under the search box. It is a *narrowing*, not a search: the two are
  the same picture, so the question is only ever "solid or not", and asking it
  in the search box would mean retyping it after every other query. `.filled`
  is split as a word for search too, so `heart filled` finds exactly one.
- **The empty state says which of the two emptied the grid.** `IconGrid`
  filters in two steps for that reason alone — a query that matches only
  outlined icons while Filled is held is not "nothing matches", and saying so
  sends you to correct the one thing that was not wrong.

**`specs/022-ten-things-in-the-way.md` is built** — ten small reports from
ordinary use, two of them bugs wearing the face of a decision:

- **`Tip` is `z-[120]`, above the floating panels.** It was `z-[100]` while
  `PopoverMenu` and the date panels are `z-[110]`, so **every tooltip on a
  control inside one of those was painted underneath it and never appeared** —
  including the icon picker's names, where the tooltip is the whole feature.
- **The shop badge counts what you have taken**, not what you can afford —
  `takenItemIds`, distinct shelf items so it cannot pass its own denominator.
  Every other badge in that row answers *how much of this is done*, and
  affordability also moved on its own every time a day was logged.
- **`PanelSection` and `NestedPanel` take `onSettings`**, a quiet gear beside
  the close X that opens the Setup tab which configures that panel.
  `SetupModal` takes `initialTab`, read once at mount — `Leaving` unmounts it,
  so every open is fresh. `App` has one `openSetup(tab?)`: the top bar's button
  passes nothing and must not inherit the last tab a gear jumped to. Six
  panels have one; the account, the change log and the board do not, because a
  gear that opens the first tab it can think of is worse than no gear.
- **`PageNav` is absent while a modal is open.** It is fixed to the corner, so
  on a phone it sat over the foot of the quick-add form. The flag is
  `useModalOpen()` in `useModalDismiss`, which already counts open modals for
  the scroll lock — one place that knows, rather than `App` keeping a parallel
  boolean in step with six dialogs by hand.
- **A notice takes you to its rule.** The block was a button that opened the
  panel and left you where you were, two screens above it. The block is a
  block now and the corner carries one quiet arrow that opens **and scrolls**
  (`goToRule`, which looks for `kept-rule-<id>` across a few frames rather than
  guessing a delay). It opens and arrives, never toggles.
- **The provisional ring was drawn solid.** `strokeLinecap: round` adds a
  half-circle of radius `stroke / 2` to *each* end of every dash, which at
  these weights ate the gaps whole — see the `VerdictRing` note above.
- **A cleared end left its duration behind.** `patchEntry` now zeroes a
  derived `minutes` when an entry that had both times loses one — see the
  `entries.ts` note above.
- **The headline total is measured through the benchmark rule.** The period
  header's `учтено` and Overview's `Hours logged` came from `rangeStats` —
  every minute logged — while the goal beside them came from the nominated
  rule, so the two were measured through different things. `spec 019` made
  this argument and applied it only to the month grid. A total over every
  entry also says how *thorough* the log is rather than how the period went.
  `benchmarkMeter` is `benchmarkMinutes` one day at a time;
  `computeOverviewStats` takes an optional `measure`, and **only the hours go
  through it** — a day you wrote something on is not an empty day whatever the
  benchmark thinks of it. Null when nothing is nominated, and then everything
  logged is the only answer there is. Eight `benchmark:` cases in the sweep.
- **The interface stopped being about studying.** *Hours studied* becomes
  *Hours logged*, *Daily study time* becomes *Time logged per day*, *All study
  time* becomes *All logged time*. `logged` rather than "tracked" or
  "dedicated" because it is already this app's own word — a **logbook**, *days
  logged*, `LogView`. In Russian **учтённое время**. The code's own vocabulary
  is unchanged: `StreakTarget` still has `kind: "time"`.

**`specs/023-when-it-happened.md` is built.** Read it before touching what a
condition can assert.

- **A condition can say *when*, not only *how much*.** `StreakClause` gains
  `startWindow` and `endWindow` — a `TimeWindow` is `from` (no earlier than)
  and `to` (no later than), either side optional. No migration: they ride in
  the `settings` jsonb, and a condition without them means what it always did.
- **Read against the day's edges, not every entry.** `startWindow` judges the
  **earliest start** among the entries the condition counts and `endWindow`
  the **latest end** — *begin by ten* is about when you sat down, not about
  every time you sat down. `edgesOn` walks exactly what `minutesOn` adds up.
  `last` may run past 1440 and has to: 23:00–00:30 finished at 1470, or
  *finish by six* becomes a promise a midnight session keeps.
- **A window says when, never whether.** A day with no counted work has no
  beginning to be late, so it breaks nothing — asserting a failure from
  missing data is what this app refuses everywhere. Pair a window with a floor
  when you want both; that is one condition.
- **It costs nothing new.** A time condition has always cost one freeze
  however many parts broke, and a window folds into that same violation —
  which `violationsOn` must count too, or a day whose window broke while its
  figure held would be missed with nothing on offer to freeze. Only *finish no
  earlier than* is still open once broken; the other three are spent at once.
- **Not for counts and not for a weekly rule.** A tally has no clock; a week
  is not a thing that begins at ten. **Windows do not wrap**
  either — `from 22:00 to 02:00` is refused rather than read across midnight,
  since "the earliest start" has no meaning across that boundary.
- **`clause.days` now carries a *fourth* independent per-day answer**, so
  `windowsPerDay` joins `figuresPerDay` and `slotFiguresPerDay`. Each must be
  asked separately or a map written for one blanks another — the bug this file
  has shipped once and been written against twice.
- The lock treats a wall like a bound, with **absent as a wall at nowhere**:
  raising a `from` or lowering a `to` narrows, and adding a window never waits.
  `clauseAsksNothing` learns a window asks something; `clauseImpossible` gains
  crossed walls and *must begin after it has to have finished*.
- Thirty-one cases in `npm run sweep`, including six `reads back:` ones that
  assert the sentence to the character — one of them that a rule *without* a
  window is unchanged, which is what caught a doubled comma in a `frag:` key.

**`specs/024-sleep-is-an-activity.md` is built, and `migrations/021` has NOT
been run** — apply it by hand to dev and then to production. The app works
either way until then; that is what `sleepMove.ts` is for.

- **Sleep stopped being its own axis.** A night was always a list of timed
  entries with a start, an end and a duration — an activity. What it had
  instead of a slot and an activity was six pieces of machinery, and the one
  thing they bought died in `spec 022`: the figure a period reports is measured
  through the **benchmark rule**, so what counts is what you promised rather
  than everything you wrote down.
- **That argument had to be finished at day scope first.** `benchmarkDayOf` is
  `benchmarkMeter` one day at a time, threaded to the day card and the month
  cell — a card totalling every minute against a goal one rule supplied reads
  `goal 3h (+3h 25m)` on a day whose only entry was a night's sleep. And
  **`logged` parted company with `total`**: *is there anything here* is asked
  of the raw breakdown, *what does this count for* of the rule, because a day
  holding only a night is not an empty day.
- **`sleepMove.ts` folds any night still in `days.sleep` into the day's cells
  as it loads**, and invents `slot-sleep` / `activity-sleep` until the
  migration makes them. The `entryActivity()` pattern from `spec 013`, for the
  same reason: a rename that needs the deploy and the migration in a particular
  order will one day get the other one. **It never writes.** The column is
  cleared by the migration or by `dayUpsertRow` on a day you edit, and the fold
  skips any id already in the slot, so nothing can land twice. Six `fold:`
  cases in the sweep, because this is the one part that can lose data.
- **The migration also rewrites any `kind: "sleep"` condition** to name the new
  activity. The rule means exactly what it meant; a target that stops resolving
  is a rule that quietly judges nothing.
- **The rotated-clock charts are a Trends tab now, for any activity.**
  `lib/sleep.ts` becomes `lib/rotatedClock.ts`, `collectNights` takes a
  `PickEntries` selector, and **not a line of the arithmetic changed**.
  `ClockCharts` opens on the first activity with a timed session, so the tab
  never opens empty on a project that has an answer. It still feeds nothing —
  no breakdown, no range stat, no goal.
- **Sleep is in the donuts and the Trends charts now**, which is what *where
  the time went* honestly means. The count filter reaches it like anything
  else.

Everything else through `019` is built.

- **`016-four-levels-and-a-board.md`** — the streak alarms and the "what today
  asks" list under the chevron are replaced by one notice board with four
  levels (`danger` / `warning` / `notice` / `allClear`) split along one axis:
  **is this already spent, or is it still owed?** `streakRisk.ts` becomes
  `lib/notices.ts`; `ruleRisk` and `dueToday` go. Also the three new panel
  toggles, the account panel, and solo — viewing the page as though one rule
  were the only one that votes.
- **`017-freezes-bought-not-charged.md`** — a freeze becomes a purchase against
  **one violation**, at a price stamped when it was bought; never automatic,
  never refunded, never repriced. **Needs `016` first**, because what may be
  frozen is defined as *what stands at `danger`*.
- **`019-three-additions.md`** — the month grid's week hours measured through
  the benchmark rule rather than through everything; a `sleep` streak target
  (removed again by `spec 024`); `tagIds` on `Activity`. Independent of each
  other as well.

`016` rewrote `npm run sweep` in its own commit, as it said it must: `safe`
split in two and fifteen cases changed their expected answer without any
behaviour changing, and two reversed for real reasons and say so in place.
**A sweep left red is a sweep nobody reads.**

`boundsOnWeekday` **keeps its `useDailyGoal` branch anyway**, and should keep
it until someone has checked the column is empty in both projects. The
migration is what made removal safe, not what makes it done: a condition that
slipped through and fell to the default `min: 0` would be cleared by every
day, so a rule would quietly stop judging and its red days would turn
green — a silent loosening, which is the one failure this codebase is built
to refuse.

## Commands

```
npm run dev       # Vite dev server (port 5173)
npm run build     # production build to dist/
npm run lint      # ESLint — run before finishing a change
npm run typecheck # tsc --noEmit — clean, and must stay clean
npm run sweep     # the streak engine against every rule shape it has
npm run preview   # serve the built dist/
```

There are no tests, with one deliberate exception. Lint and typecheck are the
automated checks and **both are clean — expect zero from each and leave them at
zero.**

`npm run sweep` is the exception: `scripts/streak-sweep.ts`, some two hundred
and seventy cases over the streak engine — every rule shape against a period that should
hold and one that should break it, the risk levels at both ends of the day,
what today still asks, what a day is reported as, the lock, the conditions that
must be refused rather than judged, and what an achievement reaches and what
its own lock allows. **Run it after touching `customStreaks.ts`,
`notices.ts`, `dayVerdict.ts` or `achievements.ts`.** It exists because the throwaway version of it lived under
`.claude/`, which is gitignored, so it went with a cleanup — and one morning of
ordinary use then turned up eight bugs, three of them in the engine, every one
of which it would have caught. Expectations are written out, never derived: the
throwaway guessed and flagged three ceilings that were behaving perfectly, and
a wrong expectation teaches you to ignore the output. They were
not always: the old `App.jsx` and its dead `App-old.jsx` snapshot carried ~30
standing errors between them, and that noise is exactly how a real bug (a
binding mutated mid-render in the heatmap) sat unnoticed for months.

`eslint.config.js` ignores `.claude` as well as `dist`. That directory holds
agent scratch space, including git worktrees — a whole second checkout with its
own `tsconfig.json` — and with one present typescript-eslint refuses to run at
all rather than choose between two candidate roots.

## Skills

`skills-lock.json` is committed; the skills themselves are not.

The lockfile names the source and the content hash, so a skill is
reinstallable and its version is recorded. The pages are 141 markdown files of
somebody else's documentation, in two copies — `.agents/skills/` where the
installer puts them and `.claude/skills/` where Claude Code reads them — and
carrying them in this repository's history would mean hand-carrying their
updates forever. Both directories are gitignored.

Currently one: **`modern-web-guidance`** (`GoogleChrome/modern-web-guidance`),
which is a search tool over current web-platform practice — dialogs and
popovers, anchor positioning, container queries, `:has()`, view transitions,
scroll-driven animation, Core Web Vitals. It says of itself that it must run
first on any HTML/CSS or client-side JS task, and the reason is worth
repeating: web APIs move faster than a model's training data, so the confident
answer is often the obsolete one.

Installed from the terminal, not from here — `/plugin marketplace add` and
`/plugin install` open an interactive panel. **A newly installed skill is
invisible until the session restarts**, since the list is built at start-up.

## Stack

React 19, Vite 8, Tailwind CSS v4 (via `@tailwindcss/vite`, no config file),
Recharts for charts, `lucide-react` for icons, `react-day-picker` v10 for date
fields (pulls in `date-fns`), `@supabase/supabase-js` for auth and persistence.

**`src/` is TypeScript throughout, all of it strict.** The migration out of one
8400-line `App.jsx` is finished: there is no `allowJs`, nothing left to convert,
and the only JavaScript in the repo is `eslint.config.js` and `vite.config.js`,
which are Node config and get their own lint block.

## Layout

- `src/main.tsx` — trivial entry point, mounts `<App />`.
- `src/types/model.ts` — the in-memory data model. Everything else imports its
  shapes from here.
- `src/lib/` — pure functions, no JSX, all TypeScript and all strict:
  - `date.ts` — local-time date keys and arithmetic, `datesInRange`,
    `weekDates`, `monthDates`, weekday order and labels.
  - `time.ts` — `"HH:MM"` arithmetic, duration formatting, and the
    18:00-rotated clock the Trends clock tab runs on. **Every duration in the app
    goes through `fmtHours`, and it prints hours *and* minutes — `2h 30m`,
    never `2.5h`.** Decimal hours read fine as a magnitude and badly as a plan:
    "0.4h left" has to be multiplied by 60 before it means anything you can
    act on, and doing that arithmetic is the job. Minutes are also what gets
    stored, so the printed figure is exact rather than rounded to a tenth of an
    hour. `fmtHoursChart` is the same format for the charts, which carry hours;
    `fmtAxisHours` stays whole numbers, because an axis label is a scale mark
    and not a duration. **`STEP_MINUTES` is the five-minute grid, with a name
    at last** — `nowTime` snaps to it, the dial steps by it, and
    `minutesSince` rounds a pause to it, because a figure the app fills in
    should always be one you could have picked by hand.
    `HOUR_TICKS` marks **every** hour of the rotated clock,
    and the clock charts step by one hour on both axes: the grid line is the
    ruler you read a night's start and end against, and three-hour spacing left
    you estimating inside a block two hours wide. Recharts thins the labels
    when they would collide, so the grid stays fine-grained on a phone even
    where the numbers cannot all fit.
  - `theme.ts` — the two palettes, the `CARD`/`FIELD_*` class strings,
    `cellSurface`, `dayStateSurface` and `chartTooltip` — plus
    `chartTooltipItem`, because `contentStyle` cannot reach the tooltip's
    **rows**: Recharts colours each one after its series (`entry.color ||
    "#000"`), so a chart whose colour lives on its `<Cell>`s hands it nothing
    and gets that literal black, which on the dark card is text you cannot see.
    That is what the account's earnings chart did. Only for a chart in that
    position — where a series does have a colour, the row wearing it is the
    legend. See **Theming** below;
    the short version is that surfaces are Tailwind tokens and the accents are
    a `Palette` object you get from `usePalette()`.
    - `benchmark.ts` — which rule supplies the day's goal **and the period's
    own total**. One rule is nominated (`settings.benchmarkRuleId`) and its
    figures stand in for `settings.dailyGoals`, so `goal 3h` on a card is a
    promise somebody made rather than a number nobody answers for — and since
    `spec 022` the figure printed beside it is measured through the same rule,
    because a total over every entry says how thorough the log is rather than
    how the period went. `benchmarkMeter` is that reading one day at a time.
    Since `spec 025` **every time figure on the analytics half goes through
    it too** — `benchmarkDays` is one filtered copy of `days` holding only the
    entries the nominated rule counts, and the donuts, the four Trends charts,
    the averages and the extremes all read it. Only the entries and only time;
    `activeDays` stays on the raw log.
    **Display only, and therefore outside the lock** — it changes no verdict. Eligibility falls out of the
    readers: `goalForDate` is minutes, so the rule must measure time; a ceiling
    is not something to aim at, so its conditions must be floors; and no two
    may land on the same weekday, or that day has two goals. Several
    conditions are fine and necessary — "3h, but 1h30 on Thursday" is two.
    `withBenchmarkGoals` projects the result in `App`, layered on the count
    filter, so the ten callers of `goalForDate` need no change.
- `stats.ts` — `dayBreakdown`, `rangeStats`, `periodBreakdown`,
    `elapsedDayCount`, `goalForDate`, `makeIsIgnored`. **Every number the app
    reports comes from here.**
  - `period.ts` — `PERIODS`, `periodRange`, `stepCursor`, `rangeLabel`.
  - `analytics.ts` — `computeOverviewStats` and `computeOverallAllTime`. One
    function serves both scopes: "Overall stats" hands it every logged day,
    "Stats" hands it the period, and the returned `OverviewTotals` is the same
    shape either way, so the two can't disagree about what a number means.
  - `freezes.ts` — `dayState` / `periodState` (what colour a day, week or
    month is), `isEditableDay` and `freezeLedger`. **The log can only be
    written for today and yesterday** (`EDIT_HORIZON_DAYS`), and everything
    else follows from that one rule: a week seals when its last day passes out
    of the window — the Tuesday after — because a day you can still change is a
    day whose verdict is not yet a fact. `isSealable` is written against
    `isEditableDay` so the two cannot drift, and it checks the week is *over*
    first: `isEditableDay` also says no to a future day, so without that the
    week you are living in would seal on its first morning. Spending a freeze
    uses the same window. `ledger.open` is what the streaks panel shows — a
    green week that has not paid out yet looks like a bug and is a rule, so
    the panel says which weeks are still in play and when they seal.
    **Lowering the weekly goal total forfeits that week's freeze**
    (`weekWasCut`, backed by `settings.goalCuts`). Every other edit makes a
    week harder or leaves it alone; this is the only one that could buy a green
    week outright. It is an append-only log for the same reason the verdicts
    are — putting the number back does not undo having lowered it — and the
    streaks panel reads it back with the figures, because a freeze that simply
    fails to appear is indistinguishable from a bug. **Earning is a ledger of events, not a
    recomputation**: each finished week gets one verdict, written once, so
    re-breaking and re-fixing a past week can never mint a second freeze.
    `spec 007` is the full design.
  - `rotatedClock.ts` — `collectSessions` and `clockStats`, the arithmetic
    behind the Trends **clock** tab. It was `sleep.ts` and read `day.sleep`;
    since `spec 024` the caller passes a `PickEntries` selector and the same
    arithmetic answers *when does this usually start, when does it end, how
    long does it run* about any activity. Still its own file, and still
    forbidden to reach `stats.ts`: it is a drawing, and no breakdown, range
    stat or goal may read a line of it.
  - `sleepMove.ts` — the bridge that folds a night still sitting in the old
    `days.sleep` column into the day's cells as it loads. In memory only, a
    no-op once `migrations/021` has run everywhere, and deletable after that.
  - `entries.ts` — `patchEntry` and the cell operations (update, remove, move
    between slots). Shared by the day editor and the in-place editor on the
    day cards, so the rule that keeps `minutes` in step with the times has one
    home — and since `spec 020` that rule is the span **less what the session
    was paused for**. An explicit `undefined` *deletes* the field: "no start
    time" and "a start time of undefined" are different rows in jsonb. That
    goes for every key in the patch rather than the two it was written for,
    since `pauseFrom` needed it next and a list would only have gone on
    growing. `pausePatch` / `resumePatch` / `stopNowPatch` are the three
    things a running session can be told.
    **A derived figure dies with the pair it was derived from.** Clearing the
    end of a finished entry used to leave its duration behind — `20:20–…`
    still followed by the four hours the end time had produced, and that
    figure went on counting in every total on the page. `withDerivedMinutes`
    cannot catch it: it only speaks when *both* times are set, and its silence
    otherwise is right, because an untimed entry's minutes are typed by hand.
    The distinction it was missing is not *is this timed now* but *was this
    figure the times' doing*, so `patchEntry` handles the one case that
    crosses — had both, has not now — and zeroes it unless the same patch is
    setting `minutes` itself.
  - `defaults.ts`, `id.ts`, `changelog.ts`, `streaks.ts`.
- `src/data/` — the only place that knows the server shape is four tables and
  not one document:
  - `supabase.ts` — the URL and anon key (from env), `CLOUD_ENABLED`,
    `PROJECT_REF`, `PAGE_SIZE`.
  - `schema.ts` — row types plus `DAY_COLUMNS` / `DAY_SELECT` / `DayUpsert`.
  - `load.ts` — `loadFromTables`, which reassembles the in-memory document.
  - `ops.ts` — the `WriteOp` union, its constructors, and `applyWriteOp`.
  - `auth.ts` — `useCloudAuth`, which lazily imports the Supabase package and
    flags password recovery. It **subscribes before it asks**: `ready` flips on
    GoTrue's `INITIAL_SESSION`, not when `getSession()` resolves. The other
    order has a gap — a stored token that needs refreshing resolves null, the
    app decides you are signed out, and the sign-in form flashes up for as long
    as the refresh takes. A 4s timer is the safety net so a missing event can
    never leave the app on a blank screen instead. A reset link arrives *with* a session, so without
    that flag the logbook would open over the form; `App` therefore checks
    `recovery` before it checks `session`.
  - `importData.ts` — the bulk counterpart to Export JSON, and `admin.ts`,
    which decides whether Setup draws those buttons at all.
  - The load effect is keyed on `session?.user.id`, **not** on the session
    object. GoTrue hands out a fresh one per auth event per client, and using
    it as a dependency re-read all four tables twelve times on one page load.
- `src/ui/` — presentational primitives. **Everything that floats lives here
  and nowhere else**: `Tip.tsx`, `PopoverMenu.tsx`, `DateField.tsx`
  (`DateField`, `DateRangeField`) and `TimeRangeField.tsx` all portal to
  `document.body`. Nothing outside `src/ui/` imports `createPortal`, and it
  should stay that way — a hand-rolled bubble inside the tree gets clipped by
  the modal shell, its scroll area or the month grid.
  - `PopoverMenu.tsx` takes any `trigger` — an icon by default, a "+ Tag" or
    "+ Add" pill where a menu is how you pick something — and hands its
    children a `close`, since a menu whose items choose has to shut when one is
    chosen. It **flips above the trigger when there is no room below**: it is
    used at the foot of a chart card, where "below" is off the bottom of the
    window, and a panel you cannot see reads as a button that does nothing.
  - `TimeRangeField.tsx` walks four steps on one dial (start hour, start
    minutes, end hour, end minutes) and the panel looks identical at each, so
    **which field the dial is driving is stated three times over**: the active
    half wears the accent (label, ring, fill and figures), the idle half drops
    to 60% opacity, and a line above the dial names it in words. Picking the
    end when you meant the start is otherwise silent — you get a valid time in
    the wrong field. The line sits *above* the dial, not below with the
    duration, because it says what the next click will do.
    **Everything that acts on one half sits in that half**: a clear cross on
    the left of each input and `now` on its right, with one `Done` under the
    dial. There used to be a row of three down there — `Now`, `Clear start/end`
    and `Done` — where the first two acted on whichever field the dial happened
    to be driving. So the same control meant two different things a minute
    apart, *start now, end now* was two trips through the mode, and the panel's
    one hard problem — saying which half you are editing — was being asked
    again of two buttons that had no business asking it. In the input, each
    action names its subject by where it is. Both also make their field the one
    the dial drives: one rule rather than two, and the accent moving to the
    half you pressed is what confirms you hit the one you meant. The cross is
    absent with nothing to clear but its padding is not, so the figure never
    shuffles sideways; `now` keeps its **word** rather than becoming a second
    glyph, since there is no drawing of *the current time* that is not just
    another clock. The panel is `260px`, which is `DATE_PANEL_MAX_WIDTH` —
    the figure the popover's viewport clamp was already written against.
  - `datePopover.ts` — `useDatePopover` plus the react-day-picker styling,
    which has to sit on the calendar's own root to win.
  - `icons.tsx` — `RenderIcon`; the list itself is data in `iconLibrary.ts`,
    and `buttonStyles.ts` holds `segBtn` / `segBtnStyle`.
  - `IconGrid.tsx` — **the one icon picker**, with the search box and the
    All / Outlined / Filled toggle (`spec 021`). There were
    two copies of the grid, from when the library was a hundred long and
    scanning it was plausible; it is 321 in 15 groups now, and past about a
    hundred a grid stops being a picker and becomes a haystack — the icon you
    want is in there and you take the fourth-best one you saw first.
    **Every entry carries keywords saying what its picture is *of***, because
    the drawing and lucide's name for it agree far less often than you would
    hope: "gym" has to find `Dumbbell` and "quit" has to find `CigaretteOff`.
    The name is matched with its capitals split apart, or "clock" would never
    reach `AlarmClock`. The **group is deliberately not searched** — "clock"
    would drag in Play, Pause and Circle for being filed under The clock, and a
    search that answers with its whole shelf is worse than one that answers
    with nothing; the headings do that job while you browse, which is when it
    is wanted. Headings show while browsing and vanish while searching: three
    matches spread over three headings read as three failures rather than one
    short list.
    **The `name` strings are stored data** — add and regroup freely, never
    rename or remove. The file is generated and asserts both halves of that:
    every name a real lucide export, and nothing already stored dropped.
    **A third of the entries are generated from the rest**: lucide has no
    filled icons to import, so `Heart.filled` is `Heart` drawn with
    `fill="currentColor"`, and `FILLABLE` in that file lists the 32 where the
    solid drawing is still recognisably the thing — see `spec 021` for the two
    reasons an icon is left out.
    **Each icon costs about 350 bytes of bundle** — going from 115 to 321 added
    71 KB uncompressed, some 7%. Worth it once, to make the picker usable; a
    reason not to answer "add more icons" by pasting in the other 1700.
  - `controls.tsx` (`AutoTextarea`, `SegmentedControl`), `toggles.tsx`
    (`SwitchToggle`, `MenuToggle`), `EditableList.tsx`, `StatTile.tsx`,
    `ChartCard.tsx`, `ToggleChips.tsx`, `Brand.tsx`, and the hooks
    `useSeriesToggle.ts` / `useRevealOnScrollUp.ts` / `useScrollEdges.ts`.
  - `useScrollEdges.ts` — whether a scroll container has more content past
    each end, plus the two custom properties `.edge-fade-x` / `.edge-fade-y`
    read. **A soft edge while there is more, a hard one once there is not**:
    content sliced through at the foot of a panel says nothing that content
    ending there does not, and a hairline scrollbar is a control rather than a
    sentence. It hands back a **callback ref**, not a `useRef` — Setup's body
    is keyed on the tab and so is replaced on every switch, and a `useRef`
    updates `.current` without waking any effect, which would leave it
    measuring a detached box forever.
  - **A module here exports components or plain values, never both** —
    mixing them fails `react-refresh/only-export-components`. That is why the
    hooks, the icon list and the button styles each have their own file.
- `src/ui/useModalDismiss.ts` — Escape, backdrop clicks, **and the page scroll
  lock**, which lives here because every modal already calls it. The lock is a
  counter, not a flag: the quick-add dialog opens over the day dialog, and the
  inner one closing must not free the page under the outer one. It pads the
  body by the scrollbar width so nothing shifts sideways as it engages.
- `src/views/` — the page's own sections.
  - `PanelSection.tsx` — the shell every panel a toggle opens is built from:
    a round icon badge, a title, an optional subtitle, an `action` slot and a
    close X. **Use it rather than hand-rolling another copy** — the panels read
    as siblings because they are one component. It also takes `onSettings`,
    the gear that opens the Setup tab configuring that panel; pass it wherever
    there is exactly one such tab and leave it off where there is not.
    **The tint is a rail, not a wash.** It used to be the whole surface — the
    colour at 8% behind everything, with a 2px border of it round the outside —
    and that was right while two panels could be open at once. It stopped being
    right at eight: every one washed a different colour, several of them hold
    charts and chips that are already coloured, and the page became a stack of
    tinted boxes with tinted things inside them. The tint was doing two jobs,
    *this is a section* and *this is which section*, and it only ever needed
    the second. So the surface is `bg-card` like every other card, and the
    colour survives as a three-pixel rail down the left edge plus the icon
    badge — one saturated stripe rather than a field, and still visible when
    you have scrolled halfway down a long panel.
    **The left corners are square** (`rounded-r-2xl`): a rail that follows a
    rounded corner tapers away into the curve at both ends, so the one
    saturated line on the panel was thinnest exactly where it began and ended.
    **The close X rests on a surface** rather than appearing on hover, because
    with the panel neutral nothing else says the whole block can be closed.
    **Anything laid on a panel takes `PANEL_INSET`, never `CARD`.** That is the
    bill for the rail: everything nested — an achievement tile, a shop row, the
    balance block, a change-log entry — used to be `bg-card` on a tinted wash
    and stood out for being plain, and the moment the panel became `bg-card`
    itself they were all drawing a shadow around a rectangle exactly the colour
    of what was behind them. So the inner surface is **recessed rather than
    raised** (`bg-ink/[0.04]`), which is what `CounterTotals` already does under
    a raised `StreakBar` and what the subordinate half of a paired segmented
    control already does. One constant rather than four copies, and it needs no
    second value for dark: `ink` is the foreground, so 4% of it darkens a white
    card and lightens a near-black one.
  - `CounterTotals.tsx` — **everything a period counted**, the first block
    *inside* `Days` and above each week's days in the month grid: activities
    in hours, tallies and checks in counts. It was a section of its own with a
    heading of its own, and a heading is a promise that what follows is a
    different subject — which it is not: the totals are the period's days read
    across instead of down, and every figure in them comes from the cards
    below. `Counters total` wears a block heading, quieter than
    `SECTION_HEADING`, inside the recessed surface it labels. **Everything
    folded means the block is absent**, not a box saying `All counters
    hidden`: that line earned its place while this was a section, because a
    section that vanishes leaves a hole and a hole reads as a failed load. All three are counters, so all three report
    together; hours answered "how long" and a period showing only those was
    reporting a fraction of itself. `lib/periodCounters.ts` builds the groups.
    **Only what actually happened appears** — an activity with no time and a
    tally that stayed at zero have nothing to say about this period, and it is
    what keeps the list readable when a project defines forty things and a week
    uses six. They arrive already filtered, so the count filter reaches them
    for free.
    **The chips are filled, and they sit under a heading of their own.** The
    fill came off for a while, to stop them shouting over a streak row that had
    none — and a long list of unfilled chips turned out to have no shape at
    all, because the fill was the only thing separating one from the next. The
    answer was a section rather than a diet: `Counters` is a subsection of the
    period and says so, `StreakBar` keeps the raised surface it gained
    (`bg-card shadow-sm`), and hierarchy comes from the headings instead of
    from who shouts loudest. Each group's heading takes the whole line with its
    chips on the next: sharing a line put the first chip wherever the heading
    happened to end, and with eight wrapping under it there was no left edge to
    read down.
    **The figures sit on a recessed surface; the controls sit on the heading's
    line.** `CounterGroupList` draws the groups and `CounterControls` draws the
    switches, and they are separate components because they are separate kinds
    of thing — one says what you are looking at, the other is what you are
    looking at, and stacked in one box the switches read as the data's first
    row. Recessed (`bg-ink/[0.04]`) rather than raised, since `StreakBar`
    directly above it is raised. **A week's counters in the month grid wear the
    same surface**, so the block reads the same wherever it appears.
    **Each group folds on its own**, from a row of its own names, with By kind
    / By category beside them and one Hide all. A single chevron was a switch
    with one thing to say when the answer is usually "some of it": which six
    of the forty is exactly what the row is for. Nothing folds away from the
    figures — a view preference, unlike the count filter, which is why neither
    carries a dot on the period bar. One set of switches governs the heading
    *and* every week in the month grid: the same chips answering the same
    question, and two controls for that is one too many.
    **They live behind one trigger on the `Days` line** (`CounterMenu`, a
    `PopoverMenu`). Laid flat they are two segmented pills plus a name per
    group, which on a real project is a control the width of the page sitting
    there permanently to answer a question most mornings do not ask. The
    trigger states the answer instead — `18 of 18`, or `Counters` when nothing
    is shown — and the switches are one tap away.
    `LogView` holds them in `useState` beside `commentsOpen`. `null` is
    "nothing chosen yet" and reads as **everything folded**, which is how the
    page opens: a project with forty counters otherwise put a wall of chips
    between the period's heading and its days on every load. Rearranging them
    shows everything instead — switching to By category *is* the question "how
    do these divide up", and answering it with an empty section means every
    switch needs a second click. All folded, the section says so in a line with
    no surface under it: an empty box reads as something that failed to load,
    where a sentence reads as a state you put it in.
  - `VerdictRing.tsx` — the day's composite verdict as **a ring on the cards
    and a bar in the month grid**. One arc per voting rule, from
    `DayReport.readings`. Closed means kept, so a day is an object you shut
    rather than a tint you notice.
    **It draws partial and does not mean partial**: four of five is one
    segment short of closed, and the centre figure goes red, because the
    verdict underneath is still a miss (`spec 010`, Decision 1).
    **Today's held arcs are dashed**, not merely faint. The arcs are `<path>`s
    rather than a dashed `<circle>` for exactly that reason: with the segment
    itself drawn by `strokeDasharray` there was one attribute doing two jobs,
    so the provisional state could only be an opacity — and an opacity reads as
    *the same arc, fainter*, where the difference is in kind.
    **The dashes take butt caps, and the pattern is a multiple of the stroke.**
    They had round caps and a sub-stroke dash length, which meant the feature
    never worked: a round cap adds a half-circle of radius `stroke / 2` to
    *each* end of every dash, lengthening it by a whole stroke and shortening
    every gap by the same — at 3px the gap went negative, neighbouring caps
    overlapped, and today's ring drew solid, which is exactly what a
    provisional ring must never look like. Round caps at this weight can only
    ever give you *dots*; a dash needs butt caps. And it needs to be **longer
    than the stroke is thick** (1.2 against 0.9 of it), or it reads as a chunk
    rather than as a broken line.
    It sits **beside the date, not in the card's corner** — Today, Frozen, the
    freeze, the "+" and the close X already live in that corner, and a ring
    among them reads as a sixth button.
    `VerdictBar` is the same reading for a month cell, where five arcs at
    sixteen pixels are a smudge. It gains what a ring cannot have — a fixed
    left edge — so "the second rule broke three times this week" reads down a
    column instead of being counted.
  - `PaceCard.tsx` — a **weekly** rule's week as a burn-down, in its panel,
    from `weekPace`. `weekLostOn` has always known the day a week stopped
    being winnable, and that is the right answer to the wrong question: by
    then the week is over. This is the Wednesday question — how much is left
    against how many days are left. Its per-clause walk is `clauseLostOn`,
    which `weekLostOn` also calls, so the card and the day's colour cannot
    drift about what "lost" means.
    **One reading per condition**, never one per rule: two conditions in two
    units have no shared axis, the same reason `StreakChart` plots a deficit
    for a compound rule.
    **The two operators burn in opposite directions and are drawn so** — under
    `atLeast` the bar is a debt that should reach nothing by Sunday, under
    `atMost` a budget that should not fill. One shape for both would put
    "good" at the top of the chart for one rule and the bottom for the next.
    It is the one thing on that panel fixed to **this** week: the rest is
    history and follows the period bar, and pace is not history.
  - `PeriodTotals.tsx` — the two donuts, `MonthGrid.tsx` — the week blocks and
    compact day cells, and `Heatmap.tsx` — how the long periods are drawn.
    **All three colour a day through `verdictOf` and `asOutcome`, and nothing
    else may decide it.** The heatmap was the last drawing still on the
    pre-`spec 010` model — its own `dayGoalOutcome`, `total >= goalForDate`,
    two outcomes — so it knew nothing about freezes and painted a day you had
    paid for **red**, which is the worst thing a colour can say here; and on
    any project whose rules are not the daily goal it disagreed with the month
    grid about the same Tuesday. Its legend follows the colours it draws
    (`Kept` / `Frozen` / `Missed` / `Not judged yet`) and is present only when
    something votes: a key listing three states a project can never reach
    misleads exactly as much as no key at all. That gate used to be
    `goalsEnabled`, which stopped being what decides these cells the moment the
    verdict did.
    **A week in the month grid is a block, not a strip**: its summary line,
    then its counters grouped exactly as the period's own are, then its seven
    days. The counters used to be a flat run of chips on the end of the summary
    line, which ran off the right edge the moment every kind of counter started
    reporting. The gap between weeks is wide for the same reason — at two lines
    of spacing one week's counters sat closer to the next week's days than to
    their own.
    **The donuts sort biggest first**, ring and legend alike, and the sort
    lives in `TotalsDonut` rather than in `periodBreakdown`: a part-of-whole
    answers "what took the most", and configured order (morning, daytime,
    evening) makes you compare slices by eye to work that out. The ordering is
    a property of that drawing, not of the numbers, so `periodBreakdown` keeps
    returning them in configured order for anything else that asks.
  - `EntriesReadout.tsx` — the entry list inside a day card. Two tiers of
    sticky header, and the numbers have to agree: the slot header is `h-6`
    (24px) at `top-0`, the entry header sits at `top-6`. Change one and
    comments scroll through the gap. Its opaque background is the card's own
    surface, passed in — a transparent sticky row shows the text underneath.
    Given the optional `editing` prop it turns a clicked line into
    `EntryEditRow.tsx` in place; without it the list is read-only, which is
    how the day dialog renders it. **An open form lifts the `max-h-64` cap**
    (`capped`, not `scrollable`) — 16rem is enough to read a day and not
    enough to edit inside.
  - The slot groups are **always stacked, never columns**. They are a
    sequence — morning, daytime, evening — and side by side that order stops
    being readable, which is why the old `wide` layout was deleted rather than
    made responsive.
  - Day-card type comes from `cardTiny` / `cardSmall` in `theme.ts`, never a
    bare `text-[9px]`. The cramped size is a concession to seven cards sharing
    a row, so it applies only from `md`, where the grid reaches three across;
    a phone (one column), the Day view and the dialog get the readable size.
    Both branches are literal strings — Tailwind cannot see a class name
    assembled at runtime.
  - A card's title and **all** its buttons share one flex line, with the month
    underneath. Centring them against the title-plus-month block left every
    button floating half a line below the heading it belongs to.
    One line *while there is room for one*: the row is `flex-wrap`, and the
    action group takes `ml-auto` so it stays hard right whether it sits beside
    the date or drops to a line of its own. `justify-between` alone let a
    crowded day walk straight over its own date, because the date's group was
    the only shrinkable one and its text simply overflowed the box it had been
    squeezed into. The date itself is `shrink-0`; it is the one thing on the
    card that must never be clipped.
    **What shares that line is the day's status and its buttons, and nothing
    else** — Today, Frozen, Ignored, then the actions. The counter badges and
    check chips sit on **their own row under the month**, left-aligned: they
    grow with every counter and check you define, and a row that grows without
    bound cannot share space with one that must not wrap. It also puts them
    where they read as a reading of the day rather than as something to press,
    which is where the hours already are.
  - **The day dialog renders `FullCardGrid` with a single date and `big`** —
    the week's own card at full width, not a second drawing of the same day.
    The week view is where the work happens and its card is the good one; its
    only problem is width, seven to a row. Giving that component more room is
    what the dialog is for. Reimplementing it there is how the same day used
    to look different depending on how deep you had clicked. It has **no
    dialog chrome of its own**: the card takes `longDate`, `titleActions` (the
    go-to-day arrow, beside the date) and `onClose`, so nothing repeats the
    date above a card that already states it.
    **There is no editor mode.** There used to be: a read-only preview that a
    pencil flipped into a form — two drawings of one day, where the form was
    the only way to add or delete anything from inside the dialog, which the
    week view has never needed a mode to do. It was also a hole in the editing
    horizon, since the form wrote to days the cards themselves had sealed. The
    dialog is now the card, with the same buttons and the same in-place
    editing, and `DayEditor.tsx` is 119 lines instead of 764. The close X sits in
    the action corner where people reach for it, divided from the day's own
    buttons by a hairline — everything left of the rule acts on the day, the
    one right of it acts on the window. `onEdit` is omitted there, so the card
    body is inert: inside the dialog there is nowhere further to go, and a
    full-card target you can hit by aiming wide of an entry is a hazard rather
    than a shortcut.
  - A card is opened in the dialog by the **expand button beside its date**,
    and by nothing else — **the card body is not a button.** It was one while
    the card was a read-only summary; it is not one now that every entry,
    counter and note on it edits in place, because a full-card target you can
    hit by aiming wide of an entry opens a window you did not ask for. The
    button is absent inside the dialog: the card is already as big as it gets.
  - **Entries carry no rule between them.** The coloured slot rail, the time at
    the head of every line and the space around them already say where one ends
    — a divider on top of that was a fourth signal for something nobody was
    confused about.
  - The week grid is **four across, so seven days fall 4 + 3**. Seven in a row
    leaves each day far too narrow for its entries, and the five-column version
    left a stranded pair rather than reading as one week.
  - Editing an entry happens on the card, not in a dialog. The path
    card → dialog → editor showed the same entry three different ways to change
    one time, so the entry rows now edit where they are read.
    Every keystroke writes straight through, as in the day editor; quick-add
    is the one place that stages a whole entry before saving, because a
    half-composed new entry has nowhere to live yet.
  - `EntryEditRow.tsx` has to stay recognisable as the row it replaced: same
    rail, same 10px mono, same order. Its fields use `FIELD_BARE` — no box, no
    fill, a dotted underline and nothing else — and **the wash and inset
    outline around the whole row are the "you are editing" signal**, one for
    the row rather than one per field. `TimeRangeField` takes `bare` for the
    same reason.
  - Because writes go straight through, **Cancel is an undo, not a discard**:
    it puts the row back as it was found. The snapshot lives in
    `FullCardGrid`, not in the row — moving an entry to another slot
    re-parents the component, and a snapshot held inside it would remount and
    re-record the half-edited state as the original. `restoreEntry` does the
    move-back and the value-restore as **one** cells computation, since two
    calls in a tick would both read the same `cells` and the second would
    silently drop the first.
  - `TabbedSection.tsx` — the heading, the "?" and the tab row that
    `AnalyticsView` builds its two sections from. It renders **only the active
    tab**, never `display: none`: a Recharts `ResponsiveContainer` measures the
    box it is in, and one in a hidden parent measures zero.
    It deliberately does **not** reuse `SegmentedControl` — a chart carries one
    of those for its own slot/activity split, and two identical pill rows
    stacked read as one control drawn twice. Underlined tabs, the shape Setup
    already uses, say "a level up" instead.
    `OverviewStats.tsx`, `AveragesStats.tsx` and `RemarkableStats.tsx` are the
    Summary tabs and render bare content — the tab row names them, so none of
    the three carries a heading of its own. `OverviewStats` takes the donuts as
    `children`: where the period's time went is one of the period's numbers.
  - Streaks own `PROJECT_TINT`, the one project-wide thing on a page that is
    otherwise period-scoped. It is a marigold, not the ochre it started as: a
    desaturated yellow at that lightness reads olive, which is the wrong
    feeling for the number you are trying not to lose. Saturating without
    darkening would have cost the white count badge its contrast, so it moved
    warmer and one step deeper together.
  - **A day that has not happened yet offers no way to edit it.** Not disabled
    — absent: the card is inert, and the quick-adds, the freeze, the note and
    editing in place all go with it, in the week row, the Day view and the
    month grid alike. `FullCardGrid` decides it once (`key > todayKey`) and
    withholds the handlers; `CompactDayCell` takes `onEdit` as optional for the
    same reason. A "+" that works and a "+" that refuses when pressed are both
    wrong there, and an absent one says "not yet" without an error message.
    The wording follows: such a day reads `goal 3h (planned)`, not `(3h left)`
    — nothing is owed on a day that has not started — and the empty-day line
    drops its "tap to add", which would point at a door that isn't there.
  - `PageNav.tsx` — an index of what is open, because there can now be a
    great deal of it. Eight panels can be on the page at once and every one
    stays until you close it, which is several screens with no way between
    them but the wheel. A fixed button, bottom right, always visible; the list
    is **built from what is actually rendered**, never a fixed menu — an entry
    that points at a section which is not there is worse than no entry. Each
    panel sits in a `<section id="sec-…" className="scroll-mt-28">`, and the
    margin is what clears the sticky period bar.
    Its button is a plain burger — three bars. `List` drew bullets beside
    them, which says *a list of things* where this says *the way around*, and
    at seventeen pixels the bullets were three specks of noise.
    - `JumpPrompt.tsx` — **the offer to go and look, beside the button you
    just pressed.** The index still costs four actions: find its button, open
    it, find the entry, click it. But the moment you open a section is the
    moment the app knows exactly which one you want and what you will do
    next, so it says so immediately. It **lives until the next click** and
    never longer: an offer that stays is clutter, and one that has to be
    dismissed is a second thing to do — though **the click that makes a new
    offer is not the next click**, so the standing listener compares before it
    clears; without that, opening a second panel wrote an offer and wiped it in
    the same batch, and the feature simply stopped working after the first use.
    **It is `absolute` against the document, not fixed to the viewport.** The
    toggle it points at lives in the sticky period bar, so a fixed pill rode
    that bar down the page and ended up hovering over the very section it was
    offering to show you; anchored to the document it stays where it was made,
    which is where the eye left it, and scrolls away like anything else you
    have walked past. `jumpAt` therefore returns page coordinates. The point comes from the click's own
    `currentTarget` (`lib/jump.ts`) rather than from a ref — a ref plus an
    effect is a read during render and a `setState` in an effect, two
    cascading-render warnings for a rectangle that was already in the event.
    It portals like everything else that floats, but it is **not** a
    `PopoverMenu`: that one tethers a bubble to a trigger and measures from it,
    which is right for a menu on a chip and wrong for a panel that wants a
    fixed corner of the viewport. Its outside-click closer listens for `click`
    and is **armed a task late** — on `mousedown` the panel unmounted between
    the press and the release so no item ever fired, and armed synchronously it
    ate the very click that opened it.
  - `LogView.tsx`, `AnalyticsView.tsx` — the two halves of the page, both
    driven by the one range `periodRange()` hands them.
  - `DayCards.tsx` (the week row and the day view's wide card),
    `DayEditor.tsx` (the day dialog: preview that flips into the editor),
    `QuickAddEntryModal.tsx`, `FreezeConfirm.tsx`, `SetupModal.tsx` (see
    **Setup's shape** below),
    `TopBar.tsx`, `AuthScreen.tsx`, `PeriodBar.tsx`, `NoteCard.tsx`.
- `src/App.tsx` — the shell and nothing else: auth, the load, the save queue,
  the count-filter projection, and which panels are open. ~700 lines, down
  from 8400.
- `src/ui/useTheme.ts` — the theme store. A module-level value plus
  `useSyncExternalStore` rather than a context: the choice has to reach
  `documentElement` before React renders anything, so there is state outside
  the tree either way, and `usePalette()` is wanted in twenty unrelated
  components that a provider would have to be threaded through for nothing.
- `src/App.css` — Tailwind import plus one global rule: thin scrollbars
  (`scrollbar-width` for Firefox, `::-webkit-scrollbar` for WebKit). Everything
  else is Tailwind utilities inline; don't grow this file without reason.
- `documentation.md` — longer prose reference for the same app. Useful
  background; this file stays the short operational version.
- `AGENTS.md` — instructions for Codex, which implements specs written here.
  It points at this file rather than restating it, so repo facts have one
  home; keep the pointer honest and don't let the two drift.
- `README.md` is the untouched Vite template. Don't treat it as documentation.

## Setup's shape

Nine tabs in a strip that scrolls, over one body that scrolls, over the
admin-only import/export footer. Four things about it are decisions rather
than accidents:

- **The panel is a fixed height, not a maximum.** It is centred, so with
  `max-h` every tab switch moved the top edge and the heading, the tabs and
  the first field all jumped. Nothing about the window should depend on which
  tab is open — which also means the answer to a half-empty tab is never to
  shrink the window, but to ask what should be on it.
- **The body is keyed on the tab**, so the scroll position leaves with it.
  One box serves all nine and React keeps its `scrollTop` across a switch:
  leaving Slots scrolled down opened Counters at the same offset, with the
  first control half under the top edge.
- **Project and Projects are one tab.** Two of the ten were half empty with
  the same subject — this project's four fields, and a list of the others —
  so the panel's one unhelpful stretch of nothing was being drawn twice. The
  list below does **not** scroll itself into view at the active project: the
  block above already says which project you are in, and the jump would land
  past the thing you came for. Each row states how many days are logged in
  it, because a name is not always a name and eight projects called "Time
  tracker" are told apart by which of them has anything in it.
- **The strip fades at whichever end has more tabs**, has no scrollbar, and
  scrolls the tab you chose into view. Measured through
  `getBoundingClientRect` rather than `offsetLeft` — the strip sets no
  `position`, so the offset parent is whatever positioned ancestor happens to
  be above it.

Arriving is `.rise-in` / `.wash-in` / `.tab-fade` in `App.css`: keyframes
rather than transitions, which is the opposite of the rule for anything you
can touch, and right here because nothing in a dialog is dragged — what is
wanted is one prescribed arrival per mount. No overshoot: bounce belongs to
motion that inherited momentum from a flick, and a click did not. **Leaving is `ui/Leaving.tsx`**, and it is
what every panel and the modal go out through: React unmounts on the frame the
condition turns false, so nothing in this app had an exit until something held
the outgoing tree for the length of its transition. Closing the composite's
panel took 1124px out of the document between two frames. A grid track from
`1fr` to `0fr` collapses the space while the content fades inside it — the
one sizing technique that does interpolate here — and `min-height: 0` on the
child is what lets the row shrink at all. **The caller's guard moves onto
`open` and must not be repeated inside**, or the children vanish on the first
frame and an empty box animates; that is the bug this shipped with for one
commit. **The exits use `--ease-in-out`, not `--ease-out`**: the strong
ease-out is front-loaded for arrivals, and on the way out it spent the whole
budget in the first third — measured at 60ms of 160, the opacity was already
0.03, which is no exit at all. A collapse is movement, and movement is what
ease-in-out is for.

Which is the other unfinished half. The panel carries `role="dialog"`,
`aria-modal` and a name, takes focus on the way in and gives it back to the
opener on the way out (in `useModalDismiss`, so every modal in the app gets
it). It is **not** a focus trap and not the top layer, and it cannot be until
`Tip`, `PopoverMenu` and `DateField` stop portalling to `document.body` —
they would be painted underneath a top-layer dialog and left outside any trap
drawn round this subtree. Its own change.

## Page structure

One page, not tabs. A single period drives everything:

- `PERIODS` — day, week, month, quarter ("3 Months"), year, all, custom.
  `quarter` is a calendar quarter, not a rolling 90 days: `periodRange()` snaps
  it to the 1st of the quarter's first month and the last day of its third.
- `periodRange()` is the only source of truth for "which days are we showing".
  It feeds both halves of the page, so they can never disagree about the range.
- `PeriodBar` (sticky, hides on scroll down) holds the period pills, the
  cursor navigation and the period label. Everything in it together is wider
  than a phone, so it splits into two rows below `sm` and gives way in a fixed
  order: the pills scroll, then the panel toggles scroll, and the navigation
  never shrinks — knowing where you are and stepping off it is the one thing
  the bar must always offer. The label uses `compactRangeLabel` below `sm`
  ("10–16 Aug"), because truncating the full form eats the end of the range,
  which is the half you cannot infer.
- **`min-w-0` is load-bearing all over this layout.** Flex and grid items
  default to `min-width: auto` and refuse to shrink below their content, so an
  overflowing strip pushes the whole page sideways instead of scrolling
  inside itself. That is one bug, and it turned up in the period bar, the
  log's heading row and `ChartCard` (a Recharts container has its own minimum)
  — and a fourth time in `ChartCard`'s **action slot**, which is a different
  part of the same file: the title beside it had `min-w-0` and the slot did
  not, so `SegmentedControl` with five chart modes on it — 338px of pills
  that neither wrap nor shrink — gave a 320px phone fifty pixels of horizontal
  scroll, and pushed the fixed page-nav button out with it. Both halves are
  needed: `min-w-0` on the slot so it *may* shrink, and `max-w-full` plus
  `overflow-x-auto` inside `SegmentedControl` so what will not shrink scrolls
  instead. The wrapper is in `ChartCard` rather than at the four call sites,
  because the constraint belongs to the slot and not to what is put in it.
- **Three levels of heading, and only three.** The period's own label is the
  page's heading (`text-lg sm:text-xl`); `Counters`, `Days`, `Summary` and
  `Trends` are its subsections and all wear `SECTION_HEADING` from `theme.ts`;
  a card's own title is smaller again. Everything below the period label is a
  subsection *of that period*, and at one weight the reader has to work out
  which contains which — which is what happened the moment `Counters` gained a
  heading and sat directly under the date at the same size.
  **`Days` is the name for the log itself** — the day cards, the month grid,
  the heatmap. It needed one once `Counters` had one, because two unlabelled
  blocks under one heading read as one block with a gap in it. "Calendar" was
  the obvious word and is wrong in the day view; "Days" is true in every
  period, from one to a year of them.
  The period's **note sits directly under its heading**, above the counters. It
  belongs to the period rather than to anything inside it, and below the
  counters it read as a footnote to them.
- Below it: `LogView` (notes, donut breakdowns, day cards / month grid /
  heatmap) and then `AnalyticsView` for the same range.
- `AnalyticsView` is **two tabbed sections, not six stacked blocks**:
  - **Summary** — Overview, Averages, Remarkable.
  - **Trends** — Daily, Weekday, Weekly, Monthly.

  They are named for what you learn, not for what you look at. Everything in
  Summary is the whole period collapsed into one figure; everything in Trends
  is the same period spread across time. "Stats" and "Analytics" would have
  been two names for one thing — both halves are statistics, and how they are
  drawn is not a distinction worth a heading. Each section's `?` says what it
  holds; each Summary tab's caption says what that tab covers.
- Under the period bar sits `StreakBar`, its own row — see **Custom streaks**.
- Panels render between it and `LogView`, the filter first because it governs
  everything below it. The streak panels open from the streak row rather than
  from `PeriodBar`, and only one of them at a time:
  - `CountFilter` — which slots, activities, counters, tags and categories
    count. Not period-scoped; switching periods leaves it alone, so its toggle
    carries a dot while anything is struck out, or a live filter would silently
    shrink every figure. **Each group carries one bulk button** (`onBulk`, the
    same one the chart legends have): isolating one activity out of forty was
    thirty-nine clicks and is now two. **A hidden category takes everything filed under it,
    its activities as well as its counters** — that is what separates it from a
    tag: a tag says what a thing is like, a category says where it belongs,
    and hiding a shelf means hiding what is on it. (A tag reaches activities
    too since `spec 019` — what still separates them is *one* against *many*,
    not what they can be put on.)
  - `StreaksSection` — the goal streak, project-wide. Its how-it-works bubble
    opens **downwards** (`side="bottom"`): it is the tallest tooltip in the app
    and the panel sits just under the sticky period bar, so anchored above its
    trigger the opening lines — the ones that say what a streak is — ran off
    the top of the viewport.
  - `CustomStreakSection` — one per rule, project-wide as well.
  - `SleepSection` is **gone** (`spec 024`). Its three charts are the Trends
    **clock** tab now, `views/ClockCharts.tsx`, drawn for any activity you
    pick. The clock still runs 18:00 → 17:00: a session that spans midnight is
    split across both ends of a 0–23 axis, and the same rotation is what makes
    the averages correct — the plain mean of 23:30 and 00:30 is midday, not
    midnight.

## Tags

Labels on counter units — a name, a colour, an icon and a description, edited
through the same `EditableList` as slots and activities.

They replace `CounterUnit.relation`, a fixed positive/neutral/negative, which
was the app deciding in advance what the only interesting thing about a counter
could be. Those three are still a perfectly good set of tags; the difference is
that they are now yours to name and extend, and **a unit can carry several** —
which is why they are chips rather than a segmented control. A counter's row in
Setup draws **only the tags it wears**, each with a cross, plus one "+ Tag"
offering what is left: the whole set on every row meant a dozen chips per
counter of which two were true, and what a unit *is* got told by what was
missing. The old
field is left in the type and in the data, deprecated and unread, so an upgrade
throws nothing away. Deleting a tag strips its id off every unit wearing it: a
dangling id is harmless to the filter, which only walks tags that exist, but
the moment it becomes rubbish is the only moment anyone can tidy it.

**They live in `settings.tags`, not a column of their own.** `settings` is
already one jsonb blob read as a unit, and `tagIds` rides inside the existing
`counter_units` jsonb, so the whole feature shipped without a migration.

Two things read them:

- **The count filter**, which strikes out counters two ways: one at a time in
  its own group, or by the handful through a tag. Both drop units from
  `visibleProject.counterUnits`, and since every badge, row and total maps over
  that list, the counters leave the page together without a single recorded
  number being touched.
- **The Trends charts**, through the `Tags` and `Counters` modes. Those plot
  counts rather than minutes, so they format their axis and tooltip as plain
  numbers; `lib/counterSeries.ts` turns the choice into the same "coloured
  series plus a number per row" shape the slot and activity splits already
  use, so the charts needed no new drawing code for it.

  Tag mode carries a second choice — **by tag** (one series per tag, summing
  every unit that wears it) or **by counter** (one series per *tagged* unit,
  which is counter mode filtered down to what carries a tag). Counter mode does
  not offer it: grouping counters by counter is the mode itself.

  The two sub-questions share **one recessed track with a hairline down the
  middle**, and that shape does two jobs. Against the mode control it reads as
  subordinate — that one is raised off the card, this one is sunk into it —
  where a second identical row of pills read as the same control drawn twice,
  the same trap `TabbedSection` sidesteps by not being pills at all. The
  hairline separates the two questions from each other, which no amount of gap
  between two identical tracks was going to do. Counter mode has only one
  question, so it has no hairline.

  Both offer **split by slot**, which turns each series into one per
  `thing × slot` — keeping *what* was counted while adding *when*. Every slot
  of one thing shares that thing's colour and steps down in opacity **by the
  slot's own position**, not by the order it was added: a stack reads as one
  block subdivided rather than as a dozen unrelated bands, and morning is the
  same shade on every chart.

  **The two modes' legends are opposite controls, and deliberately so.** Whole
  day draws every series there is, so its legend takes some away —
  `ToggleChips`, struck out. By slot draws only what was asked for, so its
  legend adds: `CountSeriesPicker`, which asks *which counter* and then *which
  slot*, one pair at a time. Six counters across six slots is thirty-six chips
  all switched on under a chart nobody can read, and getting from there to
  "youtube in the evening" is thirty-five clicks of removal; building it up is
  two, and the chart is legible at every step. It is also the only way to plot
  one counter in two slots and nothing else, which is the question people
  actually have. The picks are **one flat list shared by all four charts and
  both modes** — tag ids and unit ids cannot collide, so a pick simply does not
  apply to a mode that has no such thing, and `counterSeries` drops it rather
  than drawing it empty.

  The count series for each chart are memoised **before** the row builders that
  read them, and the row builder returns a fresh object rather than filling one
  in place. Both are for React Compiler: a callback called inside four separate
  memos, or one that mutates what it is handed, costs the whole component its
  memoization and fails `react-hooks/preserve-manual-memoization`.

## Activities, and the word "category"

What a time entry is filed under — Lessons, Q&A, Polishing questions — is an
**activity**. It was called a category until `migrations/013`, and the rename
is worth understanding because it is not cosmetic: *category* now means a
grouping **of** counters, and an activity is one of the three things a counter
can be. Read down the column and the three kinds are three answers to one
question — what do we record about the day?

| kind | records | example |
| --- | --- | --- |
| **activity** | time | forty minutes on lessons |
| **tally** | a count | three slips onto youtube |
| **check** | an answer | overslept: no |

Nothing about the entity changed and **no id moved**, which is why `013` is two
renames rather than a data migration: `projects.categories` becomes
`projects.activities`, and inside `days.cells` each entry's `category` key
becomes `activity`. `entryActivity()` in `lib/entries.ts` reads either
spelling, so the deploy and the migration can happen in either order; the
deprecated `StudyEntry.category` stays in the type for exactly that reason,
and `patchEntry` drops it the moment an activity is written.

**Activities keep their own list**, `Project.activities`, rather than joining
`counterUnits`. Merging them would make "an activity is a kind of counter" true
in the data as well as in the head, and would also make every existing walk
over `counterUnits` — day badges, period chips, the count filter, both chart
modes, streak rules — start seeing them, each site needing its own answer to
"do I want activities here". A dozen silent chances to get a number wrong is a
steep price for a tidier type. Setup presents the two lists as one tab with
three sub-tabs; that is a drawing decision and it belongs in the drawing.

## Categories

A grouping of counters, one per counter — `settings.categories`, riding in the
same jsonb `tags` does, and `categoryId` on both `CounterUnit` and `Activity`.

**The one-per-counter rule is the whole difference from a tag, and it is what
each is for.** A tag answers *what else is this like*, so you wear as many as
are true and they are chips. A category answers *where does this belong*, and a
thing that belongs in two places does not have a place — which is exactly what
lets Setup lay every counter out under headings with each appearing once. So it
is a dropdown with one answer, and "No category" is one of the answers rather
than the absence of one.

Setup's Counters tab is therefore **two arrangements of the same things**:

- **By kind** is the editor. Three sub-tabs — Activities, Tallies, Checks — one
  list at a time with everything a row can carry, since the three differ in
  what they have: a tally has a total and slots, a check has neither, an
  activity has neither — though it does carry tags since `spec 019`, because
  it is one of the three kinds of counter and a condition can name a tag.
- **By category** is the shelf. Every counter under its heading whatever kind
  it is, with a kind badge and the category picker. It edits only the
  shelving and says where the rest lives — two full editors for one row is two
  places for the same edit to go wrong. A `categoryId` pointing at a category
  that no longer exists reads as *not filed*: deleting a category strips the id
  everywhere, so it should never happen, and a row that silently disappears
  from every heading would be a far worse failure than one filed under nothing.

The two toggles are **one recessed track with a hairline down the middle**,
not two of them a gap apart. They were separate and identical — same shape,
same depth, same accent fill, eight pixels between them — which is the trap
one level up (Setup's own tabs are two rows above, and an identical shape
there would read as the same control drawn twice) arriving between the two
halves of the same row. `CountOptions` under the counter charts had already
answered this, so the app has one shape for it rather than two. The hairline
is also the sentence: everything right of it is what lives *inside* By kind,
so it goes when By category does.

**An edit that touches more than one of a project's arrays must be one write.**
Deleting a category changes `settings` *and* strips the id off `activities`
*and* off `counterUnits`; three calls to `updateProject` in one tick all close
over the same `project` and the last one wins, so two of the three vanish. That
is why `CategoriesTab` and `TagsTab` take a single `onApply(patch)` rather than
one callback per array — and it is a bug the tag cleanup shipped with, which is
how the shape was found.

## Counter kinds

A counter answers one of two questions, and they are not the same question —
`spec 009`. Setup's Counters tab is two sub-tabs because of it, on a **recessed
track**: Setup's own tabs are two rows above, and a second set of underlines
there would read as the same control drawn twice.

- **Tallies** answer *how many*. A number per slot, an optional known total,
  and everything counters already were.
- **Checks** answer *whether or not*. Day-level, no slots, no total, and
  **three** answers rather than two: a skip is a different thing from a no —
  you chose not to, rather than failed to.

`lib/checks.ts` owns all of it. `counterKind()` falls back to the deprecated
`oncePerDay`, and that reading is exact rather than a guess — the flag was only
ever set on things that either happened or did not — so an Overslept unit
written before the split lands in the right tab with nothing to migrate. The
kind is stamped explicitly the moment a unit is touched in Setup, and a row
carries a "Make a check" / "Make a tally" button because otherwise a counter
filed under the wrong kind could only be deleted and retyped, throwing away
everything recorded against it.

**`yes` is not a stored state. It is a count of one**, in `counters` where it
already lived, and `days.checks` (`migrations/011_check_marks.sql`) carries only
the two a count cannot express — `"no"` and `"skip"`. A check with none of the
three has **not been answered**, and `checkState()` returns null for it: an
ordinary day writes nothing at all, exactly like a tally that stayed at zero.

**There used to be a fourth state and it is gone** (`spec 011`, Part 2). An
`unknown` was the resting state of an unanswered day and resolved to `no` once
that day was over, which is what let a day card draw every check as a checklist
you were meant to clear. It went with the checklist: a project with twenty
checks cannot draw them all any more than it draws its twenty activities, a
streak rule can now *require* an answer and reminds you better than a chip
does, and — the part that was actually wrong — **a check you did not answer is
not a check you failed**. Nothing is inferred now, and `checkState()` no longer
takes a date, because an answer that depended on what day it was is exactly
what was removed.

**A condition may name several checks, and then every one of them is
asserted** — `allow` applies to each, and the deficits add, so a day that
answered one of two costs one freeze and a day that answered neither costs
two. It read only the first for a while, on the reasoning that several checks
are a count ("at least two of these three"); that reading survives for a check
condition carrying a floor or a ceiling, but it is not what the form draws,
and a condition drawn as an assertion and read as a bound-less count judged
nothing at all.

**A weekly condition reads every check it names too**, and a weekly rule
still carrying day-shaped `allow` — which is what a rule switched from days to
weeks keeps — means what `allow` says: every day of the week must be an
accepted answer. Both used to judge one target or nothing at all.

**A floor of nought is not a requirement.** `at least 0` is satisfied by every
day there has ever been, exactly like no floor, and only looks deliberate
because you typed it. A *ceiling* of nought is the opposite and the commonest
rule in the app.

**Names and figures in a generated sentence are quoted**, and `ui/Sentence`
renders those spans bold. The quotes live in the string rather than in markup
because the same sentence goes to tooltips, to the supervisor's plain-text
summary and to the change log, none of which can carry markup — so the
disambiguation has to survive being a bare string.

**A condition that asks nothing is refused when you save it**
(`clauseAsksNothing`, ahead of every other gate in `ruleEdit` — including the
clock and the day-it-was-written exemption, since this is not a loosening to
be rationed). No floor, no ceiling, no accepted answer means every day there
has ever been satisfies it, and a rule containing one has quietly stopped
being a rule.

**And a condition nothing could satisfy is refused on the same terms**
(`clauseImpossible`, beside it and for the same reason). The two are the ends
of one axis: a rule that never breaks and a rule that always breaks have both
stopped judging, and the second teaches you to ignore it just as fast. Three
ways in, all reachable by ordinary editing now that a condition carries both
bounds and slot riders on top of them — a floor above its own ceiling, slot
floors adding up past the day's ceiling or past the day itself, and a rider on
a slot the condition does not count. The message names the figures that
contradict each other, because *impossible* without the arithmetic is a form
refusing to save and not saying why. Checks are exempt: three accepted answers
have no arithmetic to contradict, and a check that accepts nothing is already
`clauseAsksNothing`.

That split is what makes the feature cheap rather than clever: every existing
reader of counts — the day badges, the period chips, the count filter, both
counter chart modes — goes on working on checks without knowing they exist, and
"how many times did I oversleep in July" stays a question with an answer.
Storing `yes` in both places was the alternative, and it is the shortest road
to two fields disagreeing about the same Tuesday. `checkState()` is the one
place the four states are worked out; nothing else may read `day.checks`
directly.

`CheckChips` draws them on a day card, beside the count badges rather than in a
row of their own — same question about the same day, and a second row would
claim they were a different sort of fact. A chip carries two glyphs: the unit's
own icon, saying which question this is, and **the answer as a mark** — a tick
for yes, a cross for no, a ghost for skipped. It used to be the chip's
*outline* that said so (filled, hollow, dashed and struck through), and kinds
of border are a legend you have to have been told; nobody has to be told what a
tick means. The choices in the chip's menu wear the same three marks, which is
where they are learned. **Clear** sits below them under a hairline: taking an
answer back is a deletion, not a fourth answer, and it hands `null`.

**Never a good or bad colour, which is why the tick and the cross are the same
one.** Yes is bad for Overslept and good for Went to bed on time, and nothing
on the card can tell which — that is a streak rule's job. Both answers are the
unit's own colour and differ only in the glyph. `yes` is the only one at full
strength — a check that happened is a thing that is *there*, the way a tally
with a count is; the other two are the same chip turned down.

**Only answered checks appear.** Every check used to be drawn on every writable
day, because the card was the checklist and the blanks were the point of
looking. A chip now means *this was answered, and here is the answer*; an
unanswered one is added through the "+" like everything else, and the reminder
to answer it is a streak rule's job.

## The words

Four things, and they are not interchangeable. Use these names in the code,
in the interface and when talking about it, because the feature is now large
enough that a loose word costs a conversation.

| word | what it is | where |
| --- | --- | --- |
| **rule** | one promise you wrote — *no youtube in the evening* | `StreakRule`, Setup's Streaks tab |
| **condition** | one clause of a rule; all of them must hold | `StreakClause` |
| **a rule's streak** | that one promise's own run of days or weeks | `ruleStatus`, the chips in `StreakBar` |
| **the composite** | the run of days on which *every voting rule* held | `keptDays`, `KeptCard` |
| **points** | the account a day pays into, and the only figure you can spend | `lib/balance.ts`, the shop |
| **watching** | a rule in force on a period it can neither win nor lose — a weekly rule's partial first week. Drawn, never tallied | `RuleState`, `RuleReading.counts` |
| **pace** | how much of a weekly **floor** is done as of one day. A drawing; the verdict still waits for Sunday | `weekFloorPace`, the ring's partial arc |
| **a pause** | minutes an entry was held for, all of them as one figure, subtracted from its duration. Measured between two clicks, never read off the clock | `TimeEntry.paused`, `pausePatch`, `EntryTime` |
| **logged** | the word for what the app records, in every user-facing string. Not "studied" — this is one user's case, not the app's — and not "tracked", which would be a second word for a thing that already has one | `Hours logged`, `All logged time`, `spec 022` |
| **headroom** | what is left of a **ceiling**. Never drawn as pace — not having spent it is not having done it | why `weekFloorPace` returns null for a ceiling |
| **spent** | a deficit nothing can undo before midnight — a breached ceiling, a check answered outside its accepted set | `danger` in `lib/notices.ts` |
| **owed** | a deficit the rest of the day can still clear — a floor short of its figure, a check with no answer | `notice` / `warning` in `lib/notices.ts` |
| **a notice** | one thing worth saying about today, at one of four levels. Never two per rule per level | `Notice`, `notices()` |
| **the board** | where every notice is read. Not a panel that opens below the streak row; the page's own block above it | `NoticeBoard` |
| **solo** | viewing the page as though one rule were the only one that votes. A drawing, never a verdict | `soloProject` in `App`, `SoloBanner` |
| **a window** | when a condition's work had to begin or end. Two walls on one moment, read against the day's **earliest start** and **latest end**. Says when, never whether. A finishing pair may sit on the **next morning** (`nextDay`), which is what makes *get up between 04:00 and 05:00* writable | `TimeWindow`, `edgesOn`, `windowWalls` |
| **a violation** | one named site of a rule that broke on one period — a check, a bound, a slot rider. What a freeze is bought against | `Violation`, `violationsOn`, `weekViolationsOn` |
| **a freeze** | a purchase against one violation, at a price stamped when it was made. Never automatic, never refunded, never repriced | `RuleFreeze`, `freezeOffers` |
| **settled** | a violation nothing can undo before midnight, and therefore the only kind that may be frozen | `Violation.settled` |
| **fully frozen** | every violation of a rule on a period covered, at no less than what it now costs. The only state that turns a colour; a partly paid period keeps its own and wears a corner snowflake | `isFrozenFor` |

**An achievement is not earned on the day it is written, and once earned its
terms stop moving.** Both halves are one bug reported from ordinary use:
pressing *+ Achievement* minted a hundred points and an indelible record before
the form had been looked at.

- **The grace day reaches the sealer**, not just the lock. `achievementEdit`
  has always had `settingUp` — *the day it is written is yours to get it right
  on* — and `dueAchievements` never honoured it, which made the grace day a
  promise about one half of the same thing. The rules can afford that gap
  because a rule seals no week on the day it is written; an achievement seals
  the moment its figure is met, so this is where the promise had to be kept.
  What it cost: `newAchievement` hands you thirty days in a row, which any
  project with a streak already has. One `.filter` in `dueAchievements`.
- **Reached is reached, and its terms are then closed** (`achievementEdit`
  takes `earned`). The ledger recorded what it was worth *at the moment it was
  reached* and the account has already been paid, so a definition edited
  afterwards leaves the badge and the sentence describing it disagreeing, with
  the points behind whichever you happen not to be reading — and raising the
  bar cannot un-earn it, because the row is written once and never revisited.
  Two states that contradict each other are worse than either. The name, the
  colour and the icon are not terms and stay open, the same line the rules
  draw. The tab shows the reason in place of the Edit button rather than
  disabling it: a control that refuses when pressed and one that is absent say
  the same thing, and only the absent one says it before you reach for it.
- **Deleting takes the record and the points with it** — `opDeleteEarned`, the
  one deletion in a ledger otherwise written once. That is not a contradiction:
  everything else is append-only so that *history* cannot be rewritten, and a
  badge whose achievement no longer exists is not history but litter — it pays
  into the balance for something you can no longer see, name or check, and
  deleting it is the only moment anybody can tidy it. Same op key as
  `opEarned`, so reaching something and deleting it inside one debounce window
  collapses to one write rather than racing. `AchievementsTab` works out what
  left the list and hands it to **one** `onSave(achievements, forget)`, because
  the edit touches two of the project's fields and two `updateProject` calls in
  a tick both close over the same `project`.
- **Records orphaned before that rule existed get a block of their own**, in
  the tab, naming how many and what they are worth, with a button. Not a sweep
  on load: the points are real and spendable, and a balance that quietly drops
  on a Tuesday is indistinguishable from a bug.

`npm run sweep` covers all of it (`seals:` and `frozen:`); two of the six fail
against the old code.

**`specs/015-the-economy.md` is the whole economy in one place** — the three
numbers, where points come from, which way each lock points, and what is not
decided. Read it before touching the balance, the shop or an achievement's
reward.

**A reward's cost is points, achievements, or both** — `ShopItem.requires`,
`spec 025`. Never neither: a reward that asks for nothing is not a reward, which
is what `canBuy`'s old `price > 0` meant when a price was all there was. The
lock reads them from the same side (`shopEdit`): adding a requirement lands at
once, dropping one waits like a discount. A reward also **opens in a modal**,
because a row is the wrong size for the thing it is describing and the
mechanism only works if you want the thing.

**Points and the composite are not the same number, and used to share a name.**
The composite is a *run*: it resets to nought when you break it, and nothing
spends it — a purchase never touches your streak. Points *accumulate*, go
negative, and are what the shop takes. A finished day pays **10**, a missed one
takes **20**, so the account grows above a two-thirds keep rate; neither figure
is a setting, and the one to watch when changing them is the ratio rather than
either number. `migrations/020` multiplied every stored price by ten when the
scale changed — the balance is a fold and revalues itself, prices are stored
numbers and do not.

**"Streak" is still the word**, and it belongs to a rule. What it no longer
means on its own is "the app's streak" — there is no hard-coded promise left
to own that, which is the whole of `spec 010`.

**The composite has two scales and one verb.** `days kept` and `weeks kept`
(`keptDays`, `keptWeeks` in `lib/dayVerdict.ts`), where a week is kept when
every judged day in it held up — the day's own rule at a larger size, and
nothing else. Not "perfect weeks": two words for one idea is how a design
ends up with a vocabulary nobody can keep straight.

The second scale exists because **a run of days has exactly one point of
loss**. Twenty goes to nought, and while it is short there is almost nothing
there to protect — so the first week of a new rule is the week you are least
invested in and the likeliest to drop, which is precisely backwards. A
week-sized unit fixes it from the other end: a bad Tuesday costs the week
rather than everything, and on Monday there is always something to start
accumulating again.

**Every badge in the toggle row is a fraction or a stack, and none of them
lies about its colour.** A filled badge borrows the meaning of its fill, so
the notice total drawn in the worst level's colour read as *seven dangers*
when it was seven notices with one danger among them. So:

- the **bell** carries four, in named slots (`BadgeSlot` / `SLOT` in
  `PeriodBar`): the total outlined and neutral at the top right, `warning`
  amber in the middle, `danger` red at the bottom — a column read top to
  bottom, quietest first — and **`gone` on its own in the top-left corner**,
  which nothing else in the row uses. Each owns its slot, so a badge does not
  move when the one above it drops away; a level with nothing in it draws
  nothing rather than a nought; and the column stacks `danger` over `warning`
  over the total, because the one you must not miss is the one that must not
  be covered. `gone` is off the column because it is the one reading that is
  **not** a call to act — no freeze reaches it and there is nothing to do — so
  it does not belong in the queue of things you still can; and because it is
  rare, a corner that is empty nearly every day is what makes it unmissable on
  the days it is not.
- the **streak** and the **account** both wear `project`'s marigold. It is
  the one place two things share an accent on purpose — this palette's
  *worth something* colour, where a separate gold for money was tried and
  read cheap beside it — and the two are told apart by glyph and position.
- the **shop** and **achievements** carry `x of y` on the same dark disc the
  notice total wears. Both fractions are chosen so they cannot pass their own
  denominator: the shop counts what you can **afford** rather than what you
  have taken, since a reward can be taken twice, and achievements count only
  the ones whose definition still exists — a defensive filter now rather than
  a design one, since deleting an achievement takes its record with it.
- **hide all** (`ChevronsDownUp`) shuts every panel in one press. Six open
  panels take six presses to clear one at a time, and this row is the only
  place that knows how many there are — so it counts, and its tooltip says
  what it is about to undo. **Absent when nothing is open**, the same rule the
  sleep toggle follows. The notice board is included: it is the one panel
  whose state persists, so closing it here is a preference and it stays
  closed — otherwise the one panel you cannot clear is the one always there.
- the jump-to-now button is `Calendar1` — a calendar with a date on its face.
  `CalendarCheck` read as *a day marked done*, which is what the day cells
  say and is not what that button does.

**The order of the three is the whole argument**: `NoticeBoard`, then
`KeptCard`, then `StreakBar`. What is on fire comes first — a warning placed
under the number it is about reads as a footnote to it, and a footnote is
something you finish reading rather than something you do. The board took that
place from `StreakAlarms` in `spec 016` and inherited the argument whole. The
card carries a chevron for the same reason the row does — a raised surface with
a hover lift is every card in this app, and nothing else said this one opens.

`KeptCard` sits **above** `StreakBar`, always, and is not part of it. It was
a figure on the collapsed streaks line for a while, which meant the number the
whole design exists to make you afraid of losing disappeared the moment that
row was opened and again whenever every streak was in trouble — the two
moments anybody is looking.

**The two halves answer different questions and are drawn from different
scopes, deliberately.** The days half is the *streak* — project-wide, the
thing you are guarding, and it does not change when you step the period. The
weeks half is *this period's record*, `3/8`, and its squares are the period's
weeks. Both said "in a row" for a while, which was one fact drawn twice; and
before that the squares were the last twelve weeks whatever the page showed,
which in Week mode is eleven weeks nobody asked about and, on any real
history, mostly red. **A wall of old failures is not information, it is a
mood.** The period bar is already the control for seeing further back and
should not need a second one hiding in a card.

`KeptSection` is **the only panel this row opens**, and a rule is a block
inside it. There were two — the composite's, and a rule's that replaced it —
and they are not two subjects: a rule is what the composite is made of, which
the breakdown says out loud. Keeping them apart meant the composite could name
the promise costing you the day and then vanish in order to show it to you.
So `openStreak` still holds one value and has three readings: nothing, the
composite alone, or the composite with one rule expanded inside it. A chip in
the row above and a breakdown row inside both land on the third, and the rule
opens **under the row that named it** — growing downward from the line your eye
is already on, so nothing you were reading moves. It answers
what the card cannot, which on a bad month is not *how am I doing* but **which
promise keeps doing this to me**: the period as days, then `keptBreakdown` —
per rule, the days it broke and, separately, the days it broke **alone** — and
then rules-held against rules-voting, which is the day card's ring along a
time axis. `alone` is the sharp one: a rule missing eight days of which one
was its own fault is keeping bad company, while a rule whose misses are nearly
all its own is the whole problem, and the two want opposite things done about
them.

## Custom streaks

Streaks of your own making — `spec 009`, part 2. `lib/customStreaks.ts` holds
all of it; `settings.streakRules` holds the rules, riding in the same jsonb
`tags` does.

A rule is **a sentence**: *judge every [day / week], keeping [this] in [these
slots] [at least / at most] [n] on [these weekdays] [starting by [time]], with
[k] freezes a week.*
One shape covers never-oversleep, always-in-bed-on-time, no-youtube-in-the-
evening, three-gym-trips-a-week, gym-on-Mon-Wed-Fri and two-hours-of-lessons-a-
day. If a further kind of rule will not fit it, the shape is wrong rather than
the rule.

**A condition names a target, not a counter** — `StreakTarget`, read through
`clauseTarget()`, which is the only place that knows a condition once named a
`unitId` and nothing else. Five kinds: a **unit** (a tally or a check), an
**activity**, a **category**, a **tag**, or **all study time**. That last one
has no id and is the one target every project has, which is why it is what a
new rule starts on and why the project's own daily goal is now expressible as
a streak of your own.

**The target decides whether the number is minutes or occurrences.** An
activity and study time measure time; a unit and a tag measure counts; a
category is the one grouping that can hold both, so it stores a `measure`
explicitly — filing one more tally under a category must never change what a
rule written months ago is measuring. `targetMeasure()` falls back to "counts,
if it holds any counters" for a target written without one. A time condition's
`value` is **minutes**, like every other duration the app stores, and the form
takes it as hours and minutes rather than a decimal.

**A time condition's deficit is one, however far off it was.** A count has a
natural unit of failure — one more slip is one more freeze — and time does not:
forty minutes short of two hours is one broken promise, not forty. The figure
you actually missed by is still what the strip, the chart and the tooltip
report; it is only the *price* that is flat, and without that a bad Tuesday
would cost forty-five freezes.

`StreakContext` is how the rule reaches the project — units, activities, slots,
categories and tags in one object, from `streakContext(project)`. One argument
rather than five, since a condition can now name any of them and no caller
should have to know which lists this particular rule happens to touch.

**A condition carries its own period** since `spec 025` — `clause.scope`,
absent meaning the rule's. *Three hours a day of the category, and at most four
a week of one activity in it* is one promise, and writing it as two rules is
two streaks to keep and two allowances to spend. `dayClauses` / `weekClauses`
split the engine; `ruleStateOn` folds a day's two halves; a mixed rule is
counted in **days** and drawn on the day, and the benchmark reads its daily
half. Changing a condition's scale is incomparable, therefore locked.

**A rule is one promise with as many conditions as it needs**, and all of them
must hold — `StreakClause`, and `ruleClauses()` is the only thing that knows a
rule ever had exactly one (it fills one in from the flat fields old rules
carry, which are deprecated and stay in the data). "No Pinterest on a weekday
morning, and no YouTube in the evening or at night" is one streak: breaking
either half breaks the same week. Two separate rules would be two streaks to
keep and two allowances to spend, which is a weaker promise wearing the same
name.

**The weekdays are the clause's, not the rule's.** That is what makes the
compound case work at all — one half a weekday condition, the other an
every-day one, inside one promise. A day is judged when *any* clause covers it,
and its deficit is the **sum** across the clauses that did: a day that broke
two of your conditions cost you twice, and a freeze covering both for the price
of one would make the second condition free.

Setup's Streaks tab writes that sentence with dropdowns in it, and
`clauseSentence` reads it back in the panel *and* in the tab's own summary —
**the same function**, because the only way to check that what you built is
what you meant is to read it back, and two sentences that can drift check
nothing. A grid of labelled fields would store the same eight values and say
nothing: `op: atMost, value: 0` is correct and unreadable.

**The target is picked in two steps: the kind, then the one.** All study time /
Activity / Tally / Check / Category / Tag, and then a dropdown of that kind's
own names. One grouped `<select>` held everything for a while, and grouping is
not choosing: the kinds — the taxonomy the rest of the app is built on — were
visible only as headings inside a list you had to be holding open, and finding
tags meant scrolling past forty counters. A kind with nothing in it is absent
from the first dropdown, like a tab with nothing behind it; study time is
always there. `PickKind` in the tab is deliberately not `StreakTargetKind`: a
tally and a check are one `unit` in the data and two different questions to a
person, and the first dropdown is the person's list.

**The form is ordered by what depends on what.** The rule as a whole first
— the period it is judged over, whether it votes in the day, and its weight in
the ring. Then each condition: its name and note, what it counts, **then days,
then slots**. Days before slots because a slot rider is a refinement *of those
days* and can be set per weekday, which is unreadable before you know which
weekdays there are; slots came first for as long as this form existed, so the
narrowing was offered ahead of the thing it narrows. `The day` and the ring
weight were inside the `Freezes` fold, which is a third subject again — a
freeze is what a slip costs *you* — and the lid said so out loud, summarising
two unrelated facts in one line.

**Which slots a day counts in can differ by weekday** —
`DayRequirement.slotIds`, read through `slotIdsOnWeekday`, the sibling of
`slotBoundsOnWeekday` one question earlier. *Lessons in the morning on a
working day, whenever you like at the weekend* is one promise, and writing it
as two conditions gives you two things to keep and two allowances to spend.
Every reader goes through the helper — `readClauseDay`, `violationsOn`,
`benchmarkMinutes`, `clauseImpossible` and the lock — because reading the
shared list on a day that overrode it measures Saturday against Monday's
restriction, silently and in the direction that breaks a day you kept.

**A week reads that map through `figuresPerDay` and `slotFiguresPerDay`, never
through its mere presence.** `weekBounds` guarded on `!clause.days` and so
summed the week's own figure over its days the moment a weekly rule was told
which weekdays it judged or which slots counted: *at most 3 Pinterest a week,
none in the evening* allowed **twenty-one**, which is a ceiling no week of
ordinary living can break, wearing the face of a rule that is watching. The
flat branch then asked weekday `0` what the condition was held to — fine while
`!clause.days` guaranteed there was no map, and outright fatal once there was
one: a rule judged Mon–Fri got `{}` back and lost its ceiling altogether. It
asks a weekday the condition actually judges. `weekSlotBounds` had the same
fault and hid behind the commonest rider there is, since seven noughts add up
to a nought. All five shapes are in `npm run sweep`; three of them fail on the
old code.

**`clause.days` therefore stopped meaning "figures per day"**, and
`boundsOnWeekday` had to learn the difference: the map now carries three
different per-day answers — the figure, which slots count, what a named slot
owes — and one holding nothing but the last two used to blank the figure
entirely, so asking for individual slots silently deleted the two hours a day
the rule was about. The map governs the figure only when some day in it states
one (`figuresPerDay`); otherwise the shared pair stands. A day deliberately
left blank while its siblings carry figures still asks nothing, which is the
meaning that had to survive.

**A base figure with exceptions is not available, and the grid says so by
copying instead.** *Three hours, except Thursday* is written as seven figures,
because in per-day mode a day left blank asks nothing rather than falling back
to a shared pair — `boundsOnWeekday` is explicit about it and several readers
depend on it. That is bearable to write once and miserable to change: three
hours becoming four is seven edits, six identical, and one missed is a rule
quietly asking the wrong thing on a Wednesday. So each row of the grid carries
a copy button that gives every judged day *its* figures. **Only the figures
travel** — a day also carries which slots it counts and what a named slot
owes, and those are per-day for their own reasons.

**A category's members are counted out loud and named one click down.**
`Resolved` in `CountersPicker` printed every activity on the shelf as one
comma-separated run — four solid lines in the middle of the form, every time
the rule was opened. The count is the fact worth having in front of you
always, because it is the one that changes behind your back: file a thirteenth
activity under the category tomorrow and the rule silently starts counting it.
Which twelve is a question with an answer, and it is a chevron away.

**The lock reads slots weekday by weekday, and reads the riders at all.** A
floor on a named slot is a term like any other — *of which at least an hour in
the morning* is half of what some rules ask — and lowering it, raising its
ceiling or deleting it outright used to land at once, because nothing in
`clauseNarrows` compared anything but the shared slot list. Dropping a rider
waits; adding one never does, the same direction every other addition takes.

**`clauseSentence` groups by everything a weekday asks**, not by its figure
alone. Where the figure is collected and what a named slot owes are per-weekday
now, so a group keyed on the bounds would print Monday's slots over Saturday's
numbers — the readback quietly describing a rule nobody wrote. What every day
agrees on is still said once, so an ordinary rule's sentence is unchanged to
the character.

**`Count by day` and `Count by slot` are two switches, not one choice.**
*Two hours on Monday, of which one in the morning* wants both; *an hour in the
morning and nothing said about the day* wants only the second; *two hours
anywhere* only the first. Under the old form the only way to say the middle one
was to clear two boxes and hope that read as deliberate. With `Count by slot`
on, every counted slot gets a row with an optional floor **and** an optional
ceiling, and a slot with neither says **`any`** — a slot that counts and owes
nothing is the commonest answer here, and two empty boxes look like a question
you forgot rather than one you answered.

**The condition's figure lives inside `Days`, and there is only ever one of
it.** `clause.days` overrides the flat pair completely (`boundsOnWeekday`), so
drawing a `Per day` row above the folds *and* a per-day grid inside one showed
two answers to a question that has one, with whichever was overridden sitting
there dead and editable. One `TwoWay` — *One figure* / *A figure per day* —
now says which, and only that one is drawn. The grid takes **both** bounds per
day; it only ever edited whichever side happened to be set, so "at least 2h,
never more than 4h — except Thursday" was writable as a shared pair and not as
a per-day one, for no reason but the control. A week has no weekdays to hang a
figure on, so a weekly condition keeps its `Per week` pair out at the top.

**Every mode switch names both of its modes** (`TwoWay`, with a `?` per side).
They were latching single buttons — `shared time slots`, `a figure per day` —
and a lone pressed-or-not button is the worst possible control for a choice
between two things: it names one state and leaves you to infer the other from
its absence, and "shared time slots, unpressed" is not a phrase with a
meaning. The `?` is per side rather than per control, because what needs
explaining is the *difference*, and one tooltip has to describe both modes to
describe either.

**A check's grid has a bulk row.** Twenty-one switches, and every real answer
to it is a column — *yes on every day*, then take Sunday out. One button per
answer, which clears when the column is already full: tick-everywhere and
untick-everywhere are the same button in its two states, and separate controls
for them would double the row to say the same thing.

**The sentence is read back inside the form, live** — the same
`clauseSentence` the summary, the streak panel and the supervisor's digest all
print. Until then the only way to find out what twenty controls had added up
to was to save and look, which is the wrong moment for a rule with a week-long
lock on undoing it. Never a second rendering of the same idea: a preview that
can disagree with what it previews is worse than none.

**`Condition 1` is shown even when it is the only one.** It does say something
you could already see, and what it says is *there can be more than one of
these* — which is the most useful thing the form can tell you about a shape you
have not met. Appearing only on the second one taught it at the moment it had
stopped being news.

**The tab's own preamble folds.** Two paragraphs of prose stood
permanently above the list; they are both worth reading once, and after that
they are eleven lines between you and the thing you opened the tab to edit. A
preamble you have already read is indistinguishable from chrome, and you learn
to start scrolling before the page has settled — a bad habit in a tab that
holds a lock. The lid carries the sentence people actually get wrong: *kept by
the day, paid for by the week.*

**Nothing is written until Done.** Every control used to save on the spot,
through `ruleEdit` one field at a time, and that is the wrong shape for a thing
with a lock on it: half the intermediate states of any edit are narrowings,
narrowings land immediately by design, and so a stray scroll over the freeze
count was permanent — while putting the number back was a loosening you then
waited a week for. The tab now shows a summary with an Edit button; Edit opens
a draft, and only the difference between where you started and where you
finished is ever judged. **Done is disabled exactly when `ruleEdit` refuses**,
with the reason beside it, and Cancel throws the draft away.

Three ideas carry the whole feature:

- **Failure has a size.** Not "the day broke" but the *deficit* — how far over
  or short, summed across the conditions that applied. A freeze pays for one
  unit of it, and a period is frozen only if
  the whole deficit can be paid, so two youtube slips in one evening cost two
  freezes, one is not enough, nothing is spent and the streak breaks. That
  falls out of the arithmetic rather than being a special case. Partial
  spending is refused on purpose: a day that breaks anyway should not also cost
  you the freeze.
  **That last sentence is reversed, and `spec 017` is built.** A freeze is now
  bought against **one violation** — one named site that broke — at a price
  stamped when it was bought, and violations are bought one at a time. So a day
  can be partly paid for and still break, and the freeze is gone. The old rule
  protected you from wasting one on a day already lost, and the price of that
  protection was that you could not act until the day was over: with *wake up*
  answered `no` at noon and *go to bed* unanswered, the whole rule cost two
  freezes or nothing, and which promise you were protecting was not yours to
  choose. `spec 009` carries the struck-through original.
- **Two pools of freezes, behaving differently.** `freezesPerWeek` is granted
  every week and **lost unused**; a week kept clean banks **+1**, carried over
  until spent, capped at the rule's own `freezeCap`. Spending takes the weekly
  one first, since it is the one that expires. A week carried entirely by
  freezes still earns its reward — freezes are part of the rule you wrote, not
  a failure to keep it.
- **Earning is a ledger**, exactly as in `freezes.ts`: one verdict per rule per
  finished week, written once, so re-breaking and re-fixing a past week cannot
  mint a second reward. Sealing is the existing `isSealable` — the Tuesday
  after — and spending stays inside `isEditableDay`, today and yesterday. Two
  windows would have to be explained separately every time either appeared.

**`skip` on a check costs a freeze.** It is a miss with a deficit of one, not
an exemption, for the same reason ignoring a day does not affect the main
streak: a free per-day escape hatch would make every custom streak decorative.
What it buys is honesty in the record. The genuine "does not apply" is
`weekdays`, and it is genuine because it was declared in advance — Saturday is
not a gym day because you said so last Tuesday, not because Saturday went
badly. `startedOn` is the same idea over the whole history: a rule judges the
days it was in force, or writing one this morning would hand you whatever
streak your existing data happens to contain.

### The lock

**A change to a rule's terms waits seven days unless it can be proved that it
cannot make the rule easier.** Label, icon, colour and description are not
terms and change freely.

The test in `isNarrowing` is deliberately **one-sided**, and that is what makes
it safe to be clever here at all. It never sorts an edit into "loosening" and
"tightening" — that sort is not always possible, and a rule that guesses wrong
in the wrong direction is worse than no rule. It asks one question: *is every
period that passes under the new rule also one that passed under the old?* If
yes, the change can only cost you and goes through at once. If no — **or if the
answer is not decidable** — it waits. So "never do X this week" becoming
"always do X this week" needs no classification: it is incomparable, therefore
unprovable, therefore locked. Same for swapping the counter or switching
between judging a day and judging a week.

With several conditions it is the same argument one level up: every condition
that was there must still be there and no easier, matched **by id** so that
reordering is not an edit and a rewritten condition is not read as a drop plus
an add. **Conditions that were only added are free** — a further thing to keep
can only ever cost you — so building a compound rule out of a simple one never
waits, while dropping one does.

Every dimension must be no-easier; one easier dimension locks the whole edit,
since they are not a currency you can trade between. The two slot rules point
in opposite directions for the same edit, and that is not a bug: under `atMost`
a slot is a place you can be caught, so adding one narrows the ways through;
under `atLeast` a slot is a place the count can come from, so adding one widens
them.

**Narrowing does not reset the clock; loosening does.** The lock exists to stop
you buying your way out of a bad week, and raising the bar never does that —
charging a week of flexibility for raising it would only discourage raising it.
Nor is it a way in: to end up easier than you started you still need a
loosening, still gated on the clock the last loosening set.

**The day a rule is written is yours to get it right on** — nothing is locked
until the next day and nothing that day starts the clock. Locking from birth
was tried and is wrong: setting a rule up takes several changes, most of them
incomparable to the defaults, so the lock closed on the first click and left
you with the rule the app had guessed. Nothing is at risk on that day, since
the rule has judged no sealed week yet. That leaves delete-and-recreate open,
deliberately: it costs the streak, which is the only thing anybody was
protecting.

The form says which it decided, every time. A clever lock nobody can predict is
worse than a blunt one they can.

### Where they are shown

`StreakBar` is **its own row under the period bar**, and the main goal streak
moved into it as the first button — same sort of thing, and leaving it behind
would have made "your streaks" two places. Each button carries its numbers
inline rather than as corner badges, because a custom streak has three:
days running, the weekly allowance, and the bank. **The two freeze counts must
be tellable apart at a glance**, since one is gone on Sunday night and the
other is not: the allowance is bare and dim, the bank sits in a tinted pill in
the freeze colour.

One panel at a time (`openStreak`). **The goal streak's panel and a custom one
are the same three parts in the same order**, from the same two components —
`StreakStrip` and `StreakChart` — because they answer the same question about
different rules, and two panels that merely looked alike would drift.

**Two shells, one signature.** `PanelSection` is the panel; `NestedPanel` is
the same props drawn recessed, for a rule standing inside the composite's
panel. It cannot be a `PanelSection` there — a rail inside a rail and a second
close X on a block that is already closable is the box-in-a-box that section
was written to get rid of — so the tint survives as the icon badge, the
surface is `PANEL_INSET`, and the close button becomes a chevron that collapses
the row. `CustomStreakSection` picks its shell from one `nested` prop, so its
five hundred lines of body never learn which one they are standing in. The
composite takes the expanded rule as a **render slot**, not as props: a rule's
panel needs the freeze ledger, the spend dialog and solo, none of which is any
business of a block whose subject is *how many days held*.

- **`StreakStrip`** is the period as a seven-column calendar grid: met green,
  frozen blue, missed red, and the days outside the period left blank so the
  weekday columns stay true. **A cell that is partly paid for wears a corner
  snowflake** and keeps its own colour: only a fully covered period turns blue,
  because half a freeze saves nothing — but a period can now be partly bought,
  and until that mark the only way to find out was to open the popover on every
  red cell in the row. The colour answers *is this saved*; the corner answers
  *is anything here bought*. Which ones, by name, are in the tooltip and in the
  popover — `2 of 3 frozen` told you there was something to find out and not
  what it was. A rule that only judges Mondays then reads down a
  column. One row of cells would have worked for a week and for nothing else.
- **`StreakChart`** is the same period as **a filled area against a dashed
  limit line**, so breaking the rule is literally crossing it. It is the shape
  Daily study time uses, and deliberately: the goal streak's panel plots
  exactly that chart's data — hours against the day's goal — so bars here made
  one question into two drawings. The limit is **per row**, not one constant,
  because the goal streak's limit is that weekday's goal and seven different
  goals is the normal case; it is `stepAfter` rather than the `monotone` the
  analytics goal line uses, since sloping between two limits draws numbers that
  were never anybody's limit. A rule with one condition plots that condition's
  own figure; a rule with several plots the **deficit** against a limit of
  nought, since Pinterest and YouTube have no shared axis to share. The strip's
  cells follow the same split, and the tooltip lists every condition either
  way.
  **The dots carry the verdict** — missed red, frozen blue, kept in the
  streak's own tint — because an area is one fill and cannot be red on Tuesday,
  and which days were frozen is half of what the chart is for. They also do
  what `minPointSize` did for the bars: half these rules are "at most 0", a
  kept week is a week of zeroes, and an area lying flat on the axis with
  nothing on it reads as "no data" rather than "nothing happened, which was the
  point". Past 45 rows they come off — a year is 365 dots on a 150px chart —
  and at exactly one row both points are drawn larger, since a step line
  through a single point renders nothing at all.

**A rule's panel opens on its state.** One line under the terms, before the
pace bar and the strip and the chart and the figures: which of the five notice
levels this rule stands at, in that level's colour. Six drawings and none of
them answered the question you opened the panel with — *is this already gone
or can I still do something* — and the answer existed only on the board, which
is a different block about today across every rule. **The level, never the
board's sentences**: `NoticeBoard` is the one place a notice is read, and the
same text in two places drifts the first time either is edited. The state in a
word is the thing the board does not say anywhere.

**The composite's breakdown rows are the way into the rules they name.** The
block exists to answer *which promise keeps doing this to me*, and until
`onOpenRule` it named the rule and stopped — the whole panel had one button in
it and that one toggled solo. The name and its icon are the target, not the
whole row: the figures beside them carry tooltips and solo is a second action,
and a row that is itself a button can hold neither.

**Stat tiles on a panel take `inset`.** `StatTile` defaults to `CARD`, which is
right on the page and invisible on a panel — `bg-card` on `bg-card` is a
shadow round a rectangle the colour of what is behind it. The rule was already
written down for achievement tiles, shop rows and the balance block; the three
figures under a rule's chart and the three under the sleep panel's were the
ones still raised on a surface they could not rise off.

**Both follow the period bar**, not "this week". The panel opens directly under
that bar and above a log showing the same range; one stuck on the current week
while the page shows March would be answering a question nobody asked.

The panel's subtitle is the rule read back — `clauseSentence` per condition, as
a **list** when there is more than one, because two conditions are two things
to check and an "and" in the middle of a line is not a checklist. The
description written in Setup sits under them on its own line: it is *why* you
set the rule, not part of the rule, and run together with the terms it read as
one more clause.

**Every freeze asks first.** `FreezeConfirm` — one dialog for the goal streak
and every custom one, since it is the same irreversible act. Spending used to
be confirmed on exactly one of the three ways in (the day card); the two strips
spent on the click. It prints **each pool before and after**, in the order the
ledger actually spends them: a custom streak's allowance expires on Sunday and
its bank does not, so which one this comes out of is the whole question, and
"you have 4" does not answer it. `App` assembles the `FreezeAsk`, because it is
the only place that knows both streaks' accounting.

**Freezes are spent from the strip, never from the day card**: a day can break
three rules at once, and a snowflake per rule on a card that already carries
badges, sleep, a note and an add button is how a card stops being readable.
Since `spec 017` the strip's popover lists **one row per violation** — the
named site, its own price, and whether it is already paid for. The
main streak keeps its snowflake on the card as well, because it is about the
day's hours and that is what the card is about — the strip's menu and the
card's dialog both end at the same `spendFreeze`.

Storage: `days.rule_freezes` and the `streak_verdicts` table, both in
`migrations/012_custom_streaks.sql`. The column is `jsonb` and its **contents**
changed in `spec 017` without a migration — see `Day.ruleFreezes`.

## Data model

In memory, all state is one object — every view below `StudyTrackerApp`
receives this and nothing else:

```js
{ activeProjectId, projects: [ { id, settings, slots, activities,
                                days, weekNotes, monthNotes,
                                weekIgnore, monthIgnore } ] }
```

`days` is keyed by `'YYYY-MM-DD'` (via `toKey`), week keys are the Monday of the
week, month keys are `'YYYY-MM'`.

`cells` is every logged entry, keyed by slot, and every figure in the app comes
from it via `dayBreakdown`. **`sleep` is the flat list nights used to live in**
and is deprecated (`spec 024`): `sleepMove.ts` folds anything still there into
`cells` as the app loads, and `migrations/021` empties the column for good.

Entries share one shape: optional `start`/`end` as
`"HH:MM"` strings, with `minutes` staying the stored authoritative number.
`spanMinutes` derives it when both times are set (an end before the start means
the session crossed midnight), and a sleep entry belongs to the date it
*started*, so most nights end on the following day — hence `endsNextDay` and
the `+1d` marks.

## Persistence

**On the server the shape is different.** Four tables, not one document:
`projects` (settings/slots/activities as jsonb — small and always read as a
unit), `days` keyed `(project_id, date)`, `period_notes` keyed
`(project_id, kind, key)` where the note and its ignore flag share a row, and
`user_prefs` for `active_project_id`. RLS on all four; days and notes inherit
ownership from their project. See `migrations/001_normalize_schema.sql`, then
`002_sleep.sql` (the `sleep` column on `days`), `003_change_log.sql` (the
`change_log` table), `004_sleep_night_end.sql` (a one-shot data move, guarded
by `applied_migrations`), `005_freezes.sql` (`days.frozen` and the
`week_verdicts` ledger), `011_check_marks.sql` (`days.checks`) and
`012_custom_streaks.sql` (`days.rule_freezes` and the `streak_verdicts`
ledger) and `013_activities.sql` (the categories-to-activities rename, in the
`projects` column and inside every day's `cells`).

`change_log` is the one exception to everything below. It records what an edit
changed — old value and new — capped at `CHANGE_LOG_LIMIT`, oldest dropped. It
is a convenience, not data anybody typed, so both its read and its write are
**deliberately best-effort**: the read ignores `{ error }` so a missing table
leaves an empty log instead of the dead-end screen, and the write swallows
failures so it can never raise the save banner or re-queue forever. That is the
only place in this file where skipping the error check is right, and there is a
comment saying so.

Adding a field to a day used to mean three edits — the column, the `select`
list, and the `upsert` — where missing one saved nothing or read back empty,
silently. The type system now does two of them for you: add the field to `Day`
and `DAY_COLUMNS` in `src/data/schema.ts` stops compiling until you name its
column, `DAY_SELECT` picks it up automatically, and the `DayUpsert` type makes
`applyWriteOp` fail to compile until the value is written. What is left to you
is the SQL column itself — miss that and the read fails outright, which puts
the whole app on the dead-end screen, because a missing column is not a
missing value.

`loadFromTables()` reads all four and assembles the in-memory shape above, so
the split stops at the edge of the app. It pages at `PAGE_SIZE` because
PostgREST caps a response at 1000 rows.

Writes are **per row, never the whole document**. `persist(next, ops)` takes
the new state plus one or more ops — `opProject`, `opDay`, `opNote`,
`opPrefs`, `opDeleteProject` — and each op names *which row* changed, not its
contents. `applyWriteOp` reads the contents from the latest state at flush
time, so repeated edits to one day collapse into a single write. Add a field
that needs saving and you must also emit the right op; state alone won't
persist.

`persist()` updates React state immediately and debounces the write by
`SAVE_DEBOUNCE_MS` (1s). Pending ops flush on `visibilitychange`, `pagehide`
and unmount, and are re-queued on failure (they're idempotent upserts, so a
replay is harmless).

Three failure rules, each of which exists because it once went wrong:

- **supabase-js returns errors in the payload, it does not throw.** Every call
  must check `{ error }`. Not doing so silently dropped a day and a half of
  edits while the app looked healthy.
- **A failed read is not an empty account.** On a load error the app sets
  `loadFailed`, refuses to write anything, and shows a dead-end screen. The
  old behaviour — open the setup modal over `DEFAULT_DATA` — let its auto-save
  overwrite the real data.
- **A failed write must be visible.** `saveFailed` raises a banner and a retry
  runs every `SAVE_RETRY_MS`. Never log a save failure and carry on.

`study_data` is the old single-blob table. It is no longer read or written,
and is kept only as a frozen pre-migration snapshot. Setup has an
**Export JSON** button; suggest it before anything destructive.

Known quirk: the local (signed-out) fallback calls `window.storage.get/set`, an
API that does not exist in a browser (left over from the app's origin as a
Claude artifact). Offline mode is therefore non-functional — add a
`localStorage` shim if it's needed.

## Adding things to a day

**One "+" per card, and the choice of *what* lives inside the dialog it
opens** — a tab row of `Entry`, `Counter` and `Sleep`, each with its own icon,
because three words of small uppercase type is a sentence to parse where a
glyph is something the eye aims at.

There used to be a "+" and a "#" a pixel apart, told apart only by their glyph,
which made you decide what you were recording before you had opened anything.
Sleep kept a moon of its own for a while longer — it is a different axis, not a
different kind of study — and that stopped being worth its place once checks, a
freeze, counter badges and a note were all competing for the same line: a
second way in was the thing the card could least afford, and *what* you are
recording belongs inside the thing you record it in.

A tab is **absent, not disabled**, for anything the project does not have —
no counters, no `Counter`; sleep tracking off, no `Sleep` — and with one option
left the row goes entirely, since there is no choice to offer.

The "+" is on the card in **both the day and the week views**. It was week-only
for a while, which meant the one view built to give a day room was the one view
with no way to add anything to it — and once sleep moved into the dialog, no
way at all.

Each slot heading in the readout carries its own "+", which opens the same
dialog with that slot already chosen. It follows the card's rules exactly —
absent on a read-only readout and on a day that has not happened — because the
readout must never invent a way in that the card withheld.

**The tabs are the kinds of thing a day holds** — Activity, Tally, Check,
Sleep. They said Entry, Counter and Sleep for a while, from before an activity
was a counter at all, and by the end that row was drawing a distinction the
rest of the app had stopped making: an entry *is* an activity, and "counter"
was two different questions wearing one name.

Answering a check from here is the odd one out and it still earns its place.
There is no amount and no slot — you are answering it rather than adding to it,
which is why its button says Save and its panel prints the day's current answer
beside the new one. Leaving it out would mean the dialog listed three of the
four things a day can hold, with the fourth reachable only from a chip you have
to know is a button. The chip on the card is still the short way; this is the
one you find without being told. `oncePerDay` and everything the dialog did for
it is gone; the kind replaced it.

**The dialog has no minutes box.** Typing "90" is the arithmetic the app exists
to do, and two ways of saying the same duration have to be stopped from
disagreeing. Times are the only input; the duration underneath is the answer.
`Start now` and `End now` are what make that practical — begin one when you sit
down, end it when you stop — and a start with no end saves as zero minutes
rather than being refused, because "I have started" is a real thing to record.

**And a session can be held while it runs** — `spec 020`. Getting up for ten
minutes used to be recorded either as a note to yourself to subtract them
later, which leaves every total on every page wrong until you remember, or by
splitting one session into three entries, which is a lie about the shape of the
day that no later reader can undo. Both are the app making you do its
arithmetic. The buttons are glyphs with tooltips rather than labelled pills,
and **bare glyphs set a time while circled ones hold the clock**: `Play` and
`Square` for the two ends, `CirclePause` / `CirclePlay` for the hold. They are
on the add dialog and on a running entry's own line in the readout, since the
whole point is that you press them when they happen.

## Editing the past

**The log can only be written for today and yesterday.** Everything else about
freezes follows from that one rule rather than being set separately — see
`freezes.ts`. A day past the window still *opens* and reads; what goes is every
way to change it. A future day is inert altogether, because the dialog behind
it is only good for editing.

Daily goals are the exception to write-through editing: they sit behind an
explicit Edit, with Cancel and Confirm, and lowering the weekly total asks a
second time and names what it costs. Seven numbers that decide what counts as a
kept day should not move because a scroll wheel passed over them.

## Language

English and Russian, chosen in Setup's **App** tab beside the theme — the two
device preferences, drawn by one component because they are the same question.

`src/lib/locales/ru.ts` is ~570 entries and covers the interface, the generated
sentences and the dates. **What is deliberately never translated is the user's
own words** — activities, counters, rules, slots, tags, notes. They are data,
and recolouring somebody's words to suit an interface is the same failure as
recolouring their activities to suit a background.

- **`lib/i18n.ts` is a store, not a context**, for the same two reasons
  `useTheme` is one. `t()` has to be readable from `lib/` — `clauseSentence`,
  `notices`, `violationsOn` and the readouts all build user-facing prose in
  pure functions no hook can reach — so there is state outside the tree
  whatever we do; and `t` is wanted in sixty unrelated components a provider
  would have to be threaded through for nothing.
- **The key is the English string**, not an invented `notices.hideAll`. A
  thousand short keys is a thousand chances to name one thing twice, the source
  stops being readable at the call site, and a missing translation becomes a
  bare token on screen instead of the English it fell back from. Here the
  fallback *is* the original sentence. Where one English word needs two Russian
  ones the key carries a context prefix (`board:Today`, `level:gone`).
  **`bare()` strips only a real prefix** — a bare lowercase identifier — and
  the first version cut at the first colon wherever it fell, which ate the
  front of every key that merely *contains* one: `"{named}: {parts} a week"`
  fell back to `" {parts} a week"`, so a weekly check rule read back with no
  counter name. English is the fallback, so that was a bug in the default.
- **Whole sentences, never fragments.** `{name}` placeholders rather than
  concatenation: the moment a sentence is assembled out of pieces it stops
  being translatable, because the pieces go in a different order in a different
  language. The long help tooltips are **a paragraph per key** for the same
  reason from the other end — one key for a four-way string concatenation would
  have to match byte for byte, and stops matching the day somebody rewraps a
  line.
- **The app tree is keyed on the locale** (`key={locale}` in `App`), so
  changing it remounts. `t()` is a plain function, so a component rendering a
  translated string without subscribing would keep the old one until something
  else re-rendered it, and half a page in each language is worse than either.
  Remounting costs the open panels and the scroll position, which is the right
  price for a control you touch once. **A module-level table is a bug here**:
  built once at import, it says `Mon` forever — hence `weekdayLabels()`,
  `chartModes()`, `levelWord()`, `windowLabel()` and the rest being getters,
  and `WEEKDAY_LABELS` surviving only as a lazy proxy over one.
- **`plural` takes three forms.** Russian picks by the last two digits — 1, 21,
  31 take the first; 2–4 and 22–24 the second; 11–14 and the rest the third —
  and getting it wrong is the loudest possible tell that a page was machine
  translated. `pluralOf` is the same where the English word is irregular too,
  since `freezes` is not `freeze + s` in any useful sense.
- **Dates and durations follow the app, not the browser.** Every
  `toLocaleDateString` took `undefined`, which means *this machine's* language,
  so a Russian interface printed `Aug 17` on an English laptop; they take
  `dateLocale()` now. `fmtHours` translates its unit letters — `2ч 30м` — and
  never the shape: it appears inside generated sentences and chart tooltips,
  where it has to stay one short token.
- **`t` is a name the codebase already used** for loop variables — Setup's tab
  row, `clauseReadoutParts`, `clauseWeekReadoutParts` all had `.map((t) => …)`.
  Those are renamed rather than worked around; a parameter shadowing the
  translator inside its own body is the kind of bug that compiles.
- **`CHECK_LABELS` stays English and stays a constant.** It is a key as much as
  a label — lowercased into `answer:yes` by every sentence builder — so
  `checkLabel()` is the one that reaches a reader.
- **A new project is seeded in the reader's language** (`defaultSlots()`,
  `defaultActivities()`). Those labels become the user's own data the moment
  the project exists and nothing revisits them; the ids never change. Being
  handed five English slot names to rename before you can start is exactly the
  half-translated feel this pass is about.
- **`npm run sweep` runs on the English locale** (no `navigator` in Node), and
  its readout cases assert exact English strings — which is what proves the
  fallback path still works after the sentence builders were restructured.

## Theming

Light and dark, chosen in Setup's **App** tab — the one tab there that is not
about a project.

**The preference is a device preference, kept in `localStorage`.** Not in the
account, and that is deliberate twice over: the same logbook is reasonably
light at a desk and dark in bed, and anything that had to be fetched before it
could be applied would paint the wrong theme and then correct itself in front
of you. `index.html` carries a small pre-paint script that reads the same key
(`timelens-theme`) and stamps `data-theme` on `<html>` before the bundle loads.
Change the key in one place and you must change it in the other.

Colour lives in two layers, split by what each one is actually needed as:

- **Surfaces are Tailwind tokens** — `--color-ink`, `--color-page`,
  `--color-card` (plus `--color-exam`, the one accent needed as a class because
  delete buttons want `hover:`). Declared in `App.css` under `@theme` and
  re-pointed by a `html[data-theme="dark"]` block. Everything written as a
  class name uses these: `bg-card`, `text-ink/40`, `border-ink/15`.
- **Accents are a `Palette` object** from `usePalette()` in `src/ui/useTheme.ts`.
  Use it for anything that reaches the DOM as something other than a class:
  inline `style`, Recharts props (which are SVG attributes, where `var()` is
  not a value), and the `${colour}1A` alpha suffixes, which cannot be
  concatenated onto a custom property.

**One flip inverts nearly the whole interface**, because `ink` is not just the
text colour — it is the foreground, and a wash is the foreground at low alpha.
`bg-ink/[0.04]` darkens a white card and lightens a near-black one without
anything else being said, and the same is true of every hairline and every dim
label. That is why the palettes are three surface colours rather than a list of
greys.

Two things needed real thought rather than a straight swap:

- **The accents are lightened for dark, not reused.** `#2F5FBF` on the dark
  card is a contrast of 2.6 — a smudge. But that means a solid accent fill goes
  *light*, and white text on it gets worse exactly as the rest of the page gets
  better, so chips take `c.onFill` (white in light, near-black in dark) instead
  of a `text-white` class.
- **The day-state washes are heavier in dark** (`2E` against `17`). A 9% tint
  reads clearly over `#F4F5F7` and all but vanishes over `#10151A`, because the
  eye has far less light to compare it against.

Slot, activity and counter colours are **left exactly as stored**. They are the
user's data; silently recolouring someone's activities to suit a background is
a worse failure than a chip that is a shade dark.

Light mode is unchanged to the byte — the light palette holds the same values
the constants held before, which is what makes this safe to have done in one
pass.

## Conventions

Match the existing file:

- No semicolons, double-quoted strings, Prettier-style wrapping.
- Function components declared with `function`, small helpers as arrow consts.
- **Every pressable thing wears `btnBase`, and it presses.** `press` in that
  string is a marker for one rule in `App.css`: `button.press:active` and
  `a.press:active` scale to 97%. It is a selector rather than a Tailwind
  variant because `:active` matches *any* element under the pointer and three
  places put `btnBase` on a `<span>` badge — naming the two real elements is
  what excludes them, and `:not(:disabled)` stops a refused button pretending
  it took the click. Three per cent is the amount you feel and do not see; a
  full-width row gets its hover fill instead, since a wide surface scaling
  reads as wobble.
- **The easing keywords are re-pointed, not avoided.** `--ease-out` and
  `--ease-in-out` in `@theme` override Tailwind's own, so every `ease-out`
  already written across the app got the strong curve without being touched.
  The built-ins spend their first third barely moving, which is the third the
  eye is watching hardest.
- **`.grow-open` and `::details-content` both work, and a note here once
  said they did not.** `block-size: 0 → auto` under `interpolate-size`
  interpolates in both directions — measured on the streaks row, 0 → 59 → 95
  → 100 opening and 100 → 51 → 0 closing — and `::details-content` ramps just
  as cleanly. **The false finding came from how it was tested**, and the
  method is the part worth keeping: a scratch element created and toggled
  inside the same task has no previously computed value to transition *from*,
  so it jumps and looks like a feature that does not exist. Let the element
  live a few frames first. And `document.getAnimations()` is not the
  authority it looks like — it does not surface transitions on a pseudo-element
  in that list, so `::details-content` reads as "no animation" while plainly
  animating. **Sample the layout of a long-lived element; do not trust either
  a fresh node or an empty `getAnimations()`.**
  A one-row grid from `0fr` to `1fr` also works and is what `.leaving` uses,
  chosen because it needs no `interpolate-size` and so is not Chromium-only.
- **No new hex literals.** Surfaces come from the Tailwind tokens (`bg-card`,
  `text-ink/40`), accents from `usePalette()`, and the shared class strings
  (`CARD`, `FIELD_*`) from `theme.ts`. A hardcoded colour is a colour that will
  not follow the theme, and it will look fine to whoever wrote it. Tailwind
  also cannot see class names built from template literals — dynamic colours go
  in `style`, not `className`.
- **`c.warn` is amber, and it means "behind but not lost".** It was added
  for `PaceCard` and it is the state the app had no colour for: green says
  nothing is wrong, red says nothing can be done, and a weekly rule spends
  most of its life in the stretch where acting still helps. Amber rather than
  a paler red, because nobody should have to judge a shade to know which of
  the two they are looking at.
- **Never index into `PALETTE` for a fixed role.** `SLEEP_COLOR` used to be
  `PALETTE[3]`, which silently repainted every sleep chart the first time the
  list was reordered. Retiring a colour is safe for saved data — slots and
  activities store their own hex — and `EditableList` appends an item's own
  colour to the grid when it is no longer in the palette, so nothing that used
  a retired one shows an empty selection.
- Use the date helpers (`toKey`, `fromKey`, `addDays`, `startOfWeek`,
  `daysBetween`) — they work in local time deliberately, to avoid UTC drift.
  Weeks start Monday (`WEEKDAY_ORDER`).
- Icons: slot/activity icons are user-configurable and go through
  `ICON_LIBRARY` / `RenderIcon`. Fixed UI chrome imports from `lucide-react`
  directly (see the import block at the top).
- **Anything that floats — tooltips, date pickers, menus — renders into a
  portal on `document.body` with fixed coordinates measured from its trigger.**
  Absolutely positioned overlays get clipped by the modal shell, its scroll
  area and the month grid. `Tip`, `DateField`, `DateRangeField` and
  `PopoverMenu` all do this; follow suit rather than adding a fourth
  hand-rolled bubble.
- **`Tip` puts a span between you and your child, so the parent's layout lands
  on the span.** A `flex-1` cell wrapped in a tooltip stops being the flex item
  and shrinks to its own content; `w-full` inside one measures against a
  shrink-wrapped inline box; and because the span is inline-level, it sits a
  pixel low on the text baseline. That is one bug wearing three faces, and it
  is what made the custom streak's week strip render five hairline days, one
  stretched day half a line below them, and Sunday against the right edge.
  `Tip` takes `className` and `PopoverMenu` takes `wrapClassName` for exactly
  this — size the wrapper, not only what is inside it.
  **`Tip` keeps that wrapper even with no text**, and must go on doing so. It
  used to return the bare child, dropping the class with it — and `PopoverMenu`
  clears `text` while its panel is open, to stop a bubble appearing over the
  panel. So every trigger placed by `wrapClassName` lost its placement on the
  click that opened it: the counters menu jumped from the right edge of the
  `Days` line to the left, and a freeze cell in a streak strip lost its
  `flex-1` and collapsed to its content while its six neighbours stayed full
  width. Where the layout is
  fixed and known, say so with a grid (`grid-cols-7` for a week) rather than
  with a `flex-1` that has to survive whatever gets wrapped around it.
- **One shape for "pick one of these".** `SegmentedControl` and the period
  pills are the same control drawn the same way — a rounded track with the
  active one filled — because they do the same job, and the page reads as
  fewer kinds of thing when the answer to "how do I switch this" always looks
  alike. The active fill takes `c.onFill` for its text, never `text-white`.
  Where two of them sit side by side, **the subordinate one is recessed rather
  than raised**: identical tracks a gap apart read as one control, and no
  amount of extra gap fixes that — the fix is that they stop being identical.
- **Design leans on fills, not outlines.** `FIELD_SOFT` and `BTN_SOFT` are the
  default for controls: ink at 6%, no border anywhere. An outline draws a hard
  edge around every control, and a form of six of them reads as a grid of boxes
  rather than as a few things you can change; a step in tone says "control" and
  nothing more. The same rule governs list rows in Setup — a slot, an activity,
  a counter unit is a raised surface, not a boxed one. `FIELD_BOXED` survives
  for the few places that genuinely need an edge, and floating panels swap the
  border for a `ring-1` plus a shadow, because a thing lifted off the page does
  need its own outline.
- A translucent wash needs its own opaque base — use `cellSurface()`. Setting
  a semi-transparent `backgroundColor` alone lets whatever is behind bleed
  through, which made the month grid render different colours on desktop and
  mobile.
- "Ignore in statistics" (day, week or month) means *excluded everywhere*.
  One predicate, `makeIsIgnored(weekIgnore, monthIgnore)`, is threaded through
  `rangeStats`, `periodBreakdown`, `elapsedDayCount` and the analytics. Don't
  add a stat that counts ignored days.

## Environments

**Two Supabase projects, one per environment**, selected by Vite's mode:

| command | env file | database |
| --- | --- | --- |
| `npm run dev` | `.env.development.local` (gitignored) | your dev project |
| `npm run build`, `npm run preview` | `.env.production` (committed) | the real logbook |

Both read `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and **neither falls
back to the other**. Unset means `CLOUD_ENABLED` is false and the app stops on
a "No database configured" screen — deliberately, because the alternative
(defaulting to the production values) turns one missing file into silent edits
against real data. The signed-out local fallback is not a safety net either:
it calls `window.storage`, which browsers do not have.

`.env.example` is the template, and documents the one-time dev-project setup:
create the project, run `migrations/001…005` in its SQL editor in order, copy
the URL and anon key. Sign-up there is a separate account from production.

On localhost an `EnvBadge` sits in the bottom-left corner naming the mode and
the project ref it resolved to. It exists because `npm run dev` and
`npm run preview` render a byte-identical page over completely different data;
off localhost it renders nothing.

Migrations are applied by hand in the Supabase SQL editor. Apply a new one to
**both** projects, or dev drifts from prod and stops being a rehearsal.
`001` skips its `study_data` backfill when that table is absent, which is how
it runs on a database that never held the blob.

Refreshing dev from prod is Setup's **Export JSON** → **Import JSON** (admin
only — `migrations/006_admins.sql`, and the header there explains why that is
UI hygiene rather than a permission: import writes through the same anon key
and the same RLS as every other edit, so the buttons are a convenience gate,
while RLS is what actually keeps one account out of another's rows)
(`src/data/importData.ts`, `src/views/DataTransfer.tsx`). Accounts do not cross
Supabase projects, so you sign up separately on dev; `projects.user_id` is the
only field the import rewrites, because `days`, `period_notes` and
`week_verdicts` carry no user of their own and inherit ownership through
`project_id`, which the app generates and which is identical in both databases.
The import bypasses the save queue — one request per row is right for editing
and wrong for a whole logbook — and it merges rather than replaces, so rows
deleted since the export stay behind in the target.

## Secrets

`.env.production` is committed on purpose. The anon key is publishable by
design — it names the project, it grants nothing; the actual protection is
row-level security on every table. Don't add any other credential to the
source or to any env file: a service-role key would be a real leak, and
`VITE_`-prefixed vars are inlined into the client bundle in plain text.
