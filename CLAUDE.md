# study-tracker

Personal study-time logbook: log minutes per day across time slots and activities,
track lesson/exam progress against a goal, and view week/month/heatmap analytics.

Scope note: this file applies to this repository only. Keep machine-wide or
unrelated-project instructions out of it — and out of `~/.claude/CLAUDE.md`, which
would leak into every other project on the machine.

## Work in progress

**`specs/011-the-rule-form-rebuilt.md` is agreed and barely started.** It
rebuilds the streak form around two sections — pick the counters, then state
the conditions — and three things fall out with it: checks lose their `unset`
state, the effectiveness meter stops deciding anything (`useDailyGoal` is
deleted, `migrations/019` expands it first), and the verdict ring gains
weights and a detail view. Its Status block holds the build order; its
Decisions section holds the reasoning. Stage 0 has landed; stages 1–5 have
not.

**`specs/010-day-verdict-and-rewards.md` is agreed, staged and not yet
started.** It is large and it rewrites things this file currently describes as
settled — the main goal streak is abolished, the day's colour becomes a
composite verdict over every participating rule, and a balance, achievements, a
shop and an optional supervisor are built on top of that.

Read it before changing anything about streaks, freezes, the goal, or how a day
card is coloured. Its Status block holds the build order and what has landed;
its Decisions section holds the reasoning, so a change of mind is recorded
rather than silently applied. Everything below in this file describes the app as
it stands **today**, before that work.

## Commands

```
npm run dev       # Vite dev server (port 5173)
npm run build     # production build to dist/
npm run lint      # ESLint — run before finishing a change
npm run typecheck # tsc --noEmit — clean, and must stay clean
npm run preview   # serve the built dist/
```

There are no tests. Lint and typecheck are the only automated checks, and
**both are clean — expect zero from each and leave them at zero.** They were
not always: the old `App.jsx` and its dead `App-old.jsx` snapshot carried ~30
standing errors between them, and that noise is exactly how a real bug (a
binding mutated mid-render in the heatmap) sat unnoticed for months.

`eslint.config.js` ignores `.claude` as well as `dist`. That directory holds
agent scratch space, including git worktrees — a whole second checkout with its
own `tsconfig.json` — and with one present typescript-eslint refuses to run at
all rather than choose between two candidate roots.

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
    18:00-rotated clock the sleep view runs on. **Every duration in the app
    goes through `fmtHours`, and it prints hours *and* minutes — `2h 30m`,
    never `2.5h`.** Decimal hours read fine as a magnitude and badly as a plan:
    "0.4h left" has to be multiplied by 60 before it means anything you can
    act on, and doing that arithmetic is the job. Minutes are also what gets
    stored, so the printed figure is exact rather than rounded to a tenth of an
    hour. `fmtHoursChart` is the same format for the charts, which carry hours;
    `fmtAxisHours` stays whole numbers, because an axis label is a scale mark
    and not a duration. `HOUR_TICKS` marks **every** hour of the rotated clock,
    and the sleep charts step by one hour on both axes: the grid line is the
    ruler you read a night's start and end against, and three-hour spacing left
    you estimating inside a block two hours wide. Recharts thins the labels
    when they would collide, so the grid stays fine-grained on a phone even
    where the numbers cannot all fit.
  - `theme.ts` — the two palettes, the `CARD`/`FIELD_*` class strings,
    `cellSurface`, `dayStateSurface` and `chartTooltip`. See **Theming** below;
    the short version is that surfaces are Tailwind tokens and the accents are
    a `Palette` object you get from `usePalette()`.
  - `stats.ts` — `dayBreakdown`, `rangeStats`, `periodBreakdown`,
    `elapsedDayCount`, `goalForDate`, `makeIsIgnored`. **Every number the app
    reports comes from here, and none of it ever reads `day.sleep`.**
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
  - `sleep.ts` — `collectNights` and `sleepStats`, the whole sleep panel's
    arithmetic on the rotated clock. Its own file because sleep is a separate
    axis: none of it may ever reach `stats.ts`.
  - `entries.ts` — `patchEntry` and the cell operations (update, remove, move
    between slots). Shared by the day editor and the in-place editor on the
    day cards, so the rule that keeps `minutes` in step with the times has one
    home. An explicit `undefined` start/end *deletes* the field: "no start
    time" and "a start time of undefined" are different rows in jsonb.
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
  - `datePopover.ts` — `useDatePopover` plus the react-day-picker styling,
    which has to sit on the calendar's own root to win.
  - `icons.tsx` — `RenderIcon`; the list itself is data in `iconLibrary.ts`,
    and `buttonStyles.ts` holds `segBtn` / `segBtnStyle`.
  - `IconGrid.tsx` — **the one icon picker**, with the search box. There were
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
    **Each icon costs about 350 bytes of bundle** — going from 115 to 321 added
    71 KB uncompressed, some 7%. Worth it once, to make the picker usable; a
    reason not to answer "add more icons" by pasting in the other 1700.
  - `controls.tsx` (`AutoTextarea`, `SegmentedControl`), `toggles.tsx`
    (`SwitchToggle`, `MenuToggle`), `EditableList.tsx`, `StatTile.tsx`,
    `ChartCard.tsx`, `ToggleChips.tsx`, `Brand.tsx`, and the hooks
    `useSeriesToggle.ts` / `useRevealOnScrollUp.ts`.
  - **A module here exports components or plain values, never both** —
    mixing them fails `react-refresh/only-export-components`. That is why the
    hooks, the icon list and the button styles each have their own file.
- `src/ui/useModalDismiss.ts` — Escape, backdrop clicks, **and the page scroll
  lock**, which lives here because every modal already calls it. The lock is a
  counter, not a flag: the quick-add dialog opens over the day dialog, and the
  inner one closing must not free the page under the outer one. It pads the
  body by the scrollbar width so nothing shifts sideways as it engages.
- `src/views/` — the page's own sections.
  - `PanelSection.tsx` — the shell every panel the period bar opens is built
    from: a wash of one tint, a round icon badge, a title, an optional
    subtitle, an `action` slot and a close X. **Use it rather than hand-rolling
    a sixth copy** — the panels read as siblings because they are one
    component wearing different tints.
    All four panels are built from it: `CountFilter.tsx`, `SleepSection.tsx`,
    `StreaksSection.tsx`, `ChangeLogSection.tsx`.
  - `CounterTotals.tsx` — **everything a period counted**, under the heading
    and above each week's days in the month grid: activities in hours,
    tallies and checks in counts. All three are counters, so all three report
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
  - `LogView.tsx`, `AnalyticsView.tsx` — the two halves of the page, both
    driven by the one range `periodRange()` hands them.
  - `DayCards.tsx` (the week row and the day view's wide card),
    `DayEditor.tsx` (the day dialog: preview that flips into the editor),
    `QuickAddEntryModal.tsx`, `FreezeConfirm.tsx`, `SetupModal.tsx`,
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
  log's heading row and `ChartCard` (a Recharts container has its own minimum).
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
    shrink every figure. **A hidden category takes everything filed under it,
    its activities as well as its counters** — that is what separates it from a
    tag, which only ever reaches counters: a tag says what a thing is like, a
    category says where it belongs, and hiding a shelf means hiding what is on
    it.
  - `StreaksSection` — the goal streak, project-wide. Its how-it-works bubble
    opens **downwards** (`side="bottom"`): it is the tallest tooltip in the app
    and the panel sits just under the sticky period bar, so anchored above its
    trigger the opening lines — the ones that say what a streak is — ran off
    the top of the viewport.
  - `CustomStreakSection` — one per rule, project-wide as well.
  - `SleepSection` — only when `settings.sleepEnabled`; its toggle is absent,
    not disabled, when the feature is off. Unlike the other two it *is*
    period-scoped, and it reads `project.days` rather than `visibleProject`,
    since sleep has neither slots nor activities for the filter to act on.
    Its clock runs 18:00 → 17:00: a night spans midnight, so on a 0–23 axis
    every night is split across both ends of the chart. The same rotation is
    what makes its averages correct — the plain mean of 23:30 and 00:30 is
    midday, not midnight.

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
  activity has neither and no tags either, because nothing counts it.
- **By category** is the shelf. Every counter under its heading whatever kind
  it is, with a kind badge and the category picker. It edits only the
  shelving and says where the rest lives — two full editors for one row is two
  places for the same edit to go wrong. A `categoryId` pointing at a category
  that no longer exists reads as *not filed*: deleting a category strips the id
  everywhere, so it should never happen, and a row that silently disappears
  from every heading would be a far worse failure than one filed under nothing.

Both toggles are **recessed** tracks — Setup's own tabs are two rows up, and an
identical shape there would read as the same control drawn twice.

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
  **four** states rather than two: at nine in the morning you do not yet know
  whether you overslept, and a "no" recorded then is a claim about the rest of
  the day you are not entitled to make.

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
the two a count cannot express — `"no"` and `"skip"`. `unknown` is the absence
of both and resolves to `no` once the day is over, so an ordinary day writes
nothing at all, exactly like a tally that stayed at zero.

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
own icon, saying which question this is, and **the state as a mark** — a tick
for yes, a cross for no, a ghost for skipped, a dash for not yet said. It used
to be the chip's *outline* that said so (filled, hollow, dashed and struck
through, dotted), and four kinds of border is a legend you have to have been
told; nobody has to be told what a tick means. The choices in the chip's menu
wear the same four marks, which is where they are learned.

**Never a good or bad colour, which is why the tick and the cross are the same
one.** Yes is bad for Overslept and good for Went to bed on time, and nothing
on the card can tell which — that is a streak rule's job. Both answers are the
unit's own colour and differ only in the glyph. The colour says one thing only:
an answered check wears the unit's colour, an unanswered one is plain ink.
While a day can still be written every check appears, because that is the day's
checklist and the unanswered ones are the point of looking; once it cannot,
only yes and skipped do.

## Custom streaks

Streaks of your own making — `spec 009`, part 2. `lib/customStreaks.ts` holds
all of it; `settings.streakRules` holds the rules, riding in the same jsonb
`tags` does.

A rule is **a sentence**: *judge every [day / week], keeping [this] in [these
slots] [at least / at most] [n] on [these weekdays], with [k] freezes a week.*
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

One panel at a time (`openStreak`), built from `PanelSection` in the rule's own
colour. **The goal streak's panel and a custom one are the same three parts in
the same order**, from the same two components — `StreakStrip` and
`StreakChart` — because they answer the same question about different rules,
and two panels that merely looked alike would drift.

- **`StreakStrip`** is the period as a seven-column calendar grid: met green,
  frozen blue, missed red, and the days outside the period left blank so the
  weekday columns stay true. A rule that only judges Mondays then reads down a
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
badges, sleep, a note and an add button is how a card stops being readable. The
main streak keeps its snowflake on the card as well, because it is about the
day's hours and that is what the card is about — the strip's menu and the
card's dialog both end at the same `spendFreeze`.

Storage: `days.rule_freezes` and the `streak_verdicts` table, both in
`migrations/012_custom_streaks.sql`.

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

A day holds two independent lists. `cells` is study time, keyed by slot, and
every figure in the app comes from it via `dayBreakdown`. `sleep` is a flat
list with no slot and no activity, present only when sleep tracking is on
(`settings.sleepEnabled`), and **nothing in `dayBreakdown`, `rangeStats` or the
goals may ever see it** — sleep is a separate axis, not study time.

Study entries and sleep entries share a shape: optional `start`/`end` as
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
  this — size the wrapper, not only what is inside it. Where the layout is
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
