/* ---------------------------------------------------------------
   One custom streak's panel.

   Built from `PanelSection` like every other panel, in the rule's own colour,
   so the five of them read as siblings rather than as five features.

   Four things are here and each earns its place:

   - **The rule, said back in words.** The same sentence the form writes, from
     the same function, because checking one against the other is the only way
     to know that what you built is what you meant.
   - **The period as cells** — `StreakStrip`, shared with the goal streak, so
     the two panels are one interface rather than two that look alike.
   - **The rule drawn against the period** — `StreakChart`. The strip says
     which days broke it; the chart says by how much, which is the number the
     freeze economy actually runs on.
   - **Both freeze counts, named.** One expires on Sunday and one does not, and
     a count that quietly halves overnight with no explanation reads as a bug.

   Everything below the heading follows **the period bar**, not "this week".
   The panel sits directly under that bar and above a log showing the same
   range; a panel stuck on the current week while the page shows March would be
   answering a question nobody asked.

   **Freezes are spent from the strip**, not from the day card. A day can break
   three rules at once, and a snowflake per rule on a card that already carries
   badges, sleep, a note and an add button is how a card stops being readable.
--------------------------------------------------------------- */

import { Flame, Focus, Snowflake, Trophy } from "lucide-react"
import type { DayKey, Project } from "../types/model"
import type {
  ClauseBounds,
  ClauseReading,
  RuleState,
  RuleStatus,
} from "../lib/customStreaks"
import {
  clauseBounds,
  clauseReadoutParts,
  clauseSentence,
  clauseTarget,
  clauseWeekReadoutParts,
  coveredDays,
  freezeOffers,
  judgesDay,
  readDay,
  readWeek,
  clauseScope,
  dayClauses,
  ruleClauses,
  weekClauses,
  ruleHeldOn,
  ruleHeldOnWeek,
  revisionMarks,
  revisionsOf,
  ruleStateOn,
  ruleWeekDayState,
  ruleWeekShown,
  runShown,
  weekIsOver,
  streakContext,
  weekBounds,
  weekPace,
  targetInfo,
  totalDeficit,
} from "../lib/customStreaks"
import {
  addDays,
  datesInRange,
  fmtDateLong,
  fmtShort,
  fromKey,
  startOfWeek,
  toKey,
} from "../lib/date"
import { t, useT } from "../lib/i18n"
import { fmtHours } from "../lib/time"
import { levelColour, minutesLeftToday } from "../lib/notices"
import type { NoticeLevel } from "../lib/notices"
import { btnBase } from "../lib/theme"
import { PaceCard } from "./PaceCard"
import { StatTile } from "../ui/StatTile"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"
import { Fold } from "../ui/Fold"
import { Sentence } from "../ui/Sentence"
import { NestedPanel, PanelSection } from "./PanelSection"
import { FALLBACK_ICON, ICON_MAP } from "../ui/iconLibrary"
import { StreakChart } from "./StreakChart"
import type { StreakChartRow } from "./StreakChart"
import { StreakStrip } from "./StreakStrip"
import type { StripCell } from "./StreakStrip"

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/**
 * **How this rule stands, in one line, before anything else.**
 *
 * The panel opens on the terms, then a freeze note, then a pace bar, a week
 * strip, a chart and three figures — six drawings, none of which answers the
 * question you opened it with, which is *is this one already gone or can I
 * still do something*. That answer existed and was only on the notice board,
 * which is a different block in a different place and is about today across
 * every rule rather than about this rule.
 *
 * **The level, never the board's sentences.** `NoticeBoard` is the one place
 * a notice is read, and reprinting its lines here would be the same text in
 * two places, drifting the first time either is edited. What this says is the
 * state — which the board does not say in a word anywhere — in the level's own
 * colour, so the two read as one vocabulary rather than two.
 */
/* Getters rather than tables: a module-level object is built once at import
   and would stay English for the life of the panel.

   **The board's own five words** — `spec 027`. This had five of its own, and
   in Russian its `warning` was the word the board uses for `danger`: the same
   «под угрозой» on two different levels a screen apart. */
const levelWord = (level: NoticeLevel): string =>
  t(
    {
      gone: "level:gone",
      danger: "level:danger",
      warning: "level:warning",
      notice: "level:notice",
      allClear: "level:all clear",
    }[level],
  )

const stateWord = (state: RuleState): string =>
  t(
    {
      met: "state:kept",
      frozen: "state:frozen",
      missed: "state:missed",
      pending: "still open",
      unjudged: "not judged",
      watching: "not yet judged",
      lost: "state:lost",
    }[state],
  )

export function CustomStreakSection({
  status,
  level,
  project,
  rangeStart,
  rangeEnd,
  today,
  onSpendFreeze,
  solo,
  onSolo,
  onClose,
  onSettings,
  nested = false,
}: {
  status: RuleStatus
  /**
   * The worst thing the notice board has to say about this rule today, or
   * `null` when it has nothing to say — a rule that can neither win nor lose
   * on the period it is watching has no state worth announcing.
   */
  level: NoticeLevel | null
  project: Project
  /** The period bar's range — the panel shows exactly what the page shows. */
  rangeStart: Date
  rangeEnd: Date
  today: Date
  /**
   * Asks to put the rule's id on that day, at that price. The caller owns
   * both the confirmation and the persistence — the price is here because
   * this is where the deficit was worked out.
   */
  onSpendFreeze: (
    dayKey: string,
    violationKey: string,
    cost: number,
    line: string,
    /** How many others on the same period are still unfrozen — `spec 017`. */
    othersUnfrozen: number,
  ) => void
  /** Whether the page is currently showing this rule alone — `spec 016`. */
  solo?: boolean
  onSolo?: () => void
  onClose?: () => void
  /** Opens Setup's Streaks tab — where this rule's own terms are written. */
  onSettings?: () => void
  /**
   * Drawn inside the composite panel rather than as a panel of its own — the
   * breakdown row that names this rule is what opened it. Same body, lighter
   * shell; see `NestedPanel`.
   */
  nested?: boolean
}) {
  const c = usePalette()
  const t = useT()
  const { rule, freezes } = status
  const todayKey = toKey(today)
  /* **The finer of the two scales, whenever the rule has one** — `spec 025`.
     A rule may now be judged on both, and the strip and the chart have to be
     drawn on one: days, because every mixed rule has a daily half by
     construction and a weekly condition already has a per-day reading built
     for the day's verdict. Only a rule that is *purely* weekly is drawn a week
     at a time. */
  const byWeek = !dayClauses(rule).length
  const ctx = streakContext(project)
  /* The figure and what is at stake — `spec 027`, part 5. The same reading
     the chip in the streak row prints, so the two cannot disagree. */
  const shown = runShown(status, level === "gone")
  const clauses = ruleClauses(rule)
  // A rule with one condition reports that condition's own number, which is
  // the thing you were counting. A rule with several has no single number —
  // Pinterest and YouTube are not the same unit — so it reports the deficit
  // instead: how far off the whole promise was, which is also exactly what a
  // freeze is priced in.
  const compound = clauses.length > 1
  /* What the single-condition case is measuring, which decides how every
     figure on this panel is printed. A rule about hours reports "2h 30m"
     everywhere, like every other duration in the app; a compound rule reports
     a deficit, which is always a plain count of unpaid units. */
  const sole = compound ? null : targetInfo(clauseTarget(clauses[0]), ctx)
  const timed = !compound && sole?.measure === "time"
  const fmtValue = (n: number) => (timed ? fmtHours(n) : String(n))

  // "1 days" is the tell that a number was pasted next to a fixed word.
  const unitWord = (n: number) =>
    `${byWeek ? "week" : "day"}${n === 1 ? "" : "s"}`

  const dates = datesInRange(rangeStart, rangeEnd)

  /* **The terms each drawn period was actually held to** — `spec 026`.
     Everything on this panel that judges a past day or week goes through it:
     the strip's colours, the chart's dots, its figures and its limit line. A
     panel drawing March through September's promise is the picture the
     history exists to stop being drawn. Today and yesterday come back as the
     live rule, so the panel follows an edit immediately where an edit still
     applies. */
  const held = (key: DayKey) => ruleHeldOn(rule, key, todayKey, ctx)
  /* A week is history when it **seals**, not when its Monday leaves the
     writing window — see `ruleHeldOnWeek`. The two scales need two helpers or
     the week you are living in reads as history from Wednesday morning. */
  const heldWeek = (w: Date) => ruleHeldOnWeek(rule, w, today, ctx)

  /* **Every rule's strip is drawn day by day** — `spec 027`, part 6.

     A purely weekly rule's cells all wore the week's own state: uncoloured
     for as long as the week ran, then seven red the Monday after, the day you
     had paid for among them. What a freeze covered and which day actually
     broke the week were both invisible on the one drawing that exists to
     show them. So every cell reads the day, exactly as a mixed rule's always
     has: a day a site got worse is red or blue, a day after an unpaid one is
     grey, and every other day is green. The week's own verdict is still the
     rule's streak, counted in weeks.

     A future day is `unjudged` by the reading itself — the same silence it
     gets everywhere else in the app. */
  const stateOf = (date: Date, key: string): RuleState =>
    ruleStateOn(
      byWeek ? heldWeek(startOfWeek(date)) : held(key),
      ctx,
      project.days,
      key,
      todayKey,
    )

  /**
   * Every condition that had something to say, in the form "Youtube 2".
   *
   * Each condition is printed in its own measure — a compound rule can hold
   * one about hours and one about slips, and a shared format would be wrong
   * for one of them.
   */
  const breakdown = (readings: ClauseReading[], key: DayKey): string[] =>
    readings
      .filter((r) => r.applies)
      .flatMap((r) =>
        /* **Per reading, not per rule.** A mixed rule's tooltip carries a
           day's figures and a week's running totals side by side, and the two
           are read by different functions — handing a week reading to the day
           one prints the week's figure against the day's bounds, which is the
           bug `spec 018` closed. */
        clauseScope(r.clause, rule) === "week"
          ? clauseWeekReadoutParts(
              r,
              ctx,
              project.days,
              coveredDays(r.clause, rule, startOfWeek(fromKey(key))),
              "all",
            )
          : clauseReadoutParts(r, ctx, project.days[key], key, "all"),
      )

  /* **A check has no figure**, and printing one was how `1` ended up in a
     strip cell: `ClauseReading.value` for a check is the yes count, which is
     the right number for the chart and nothing a reader can use. The cell's
     colour is the reading, and the tooltip says which check and what answer. */
  const soleCheck = !compound && !!sole?.check
  const figure = (readings: ClauseReading[]) =>
    compound ? totalDeficit(readings) : (readings[0]?.value ?? 0)

  /* **A week's offers go on the days it broke** — `spec 027`, part 6.

     `freezeOffers` is asked per day and answers with the *week's* list, so
     every day of the week drew the same buyable ring, the same popover and the
     same corner snowflake — one freeze against one week's ceiling read as
     seven. `spec 025` moved it onto the Monday, where the record is filed.
     With the strip read day by day that is the wrong cell: the Thursday that
     broke the week is red and offers nothing, and the Monday is green and
     offers everything.

     So a week's list goes on the days one of its sites got worse — red or
     blue — which are the cells anybody reaches for. The week's first cell in
     range is the fallback only when none of them is in range, so a week whose
     broken day lies outside the period does not lose its offer altogether. */
  const weekHalfOn = (date: Date, key: DayKey): RuleState =>
    weekClauses(rule).length
      ? ruleWeekDayState(
          byWeek ? heldWeek(startOfWeek(date)) : held(key),
          ctx,
          project.days,
          key,
          todayKey,
        )
      : "unjudged"
  const brokeOn = new Set<DayKey>()
  const weekBroke = new Set<string>()
  const weekAnchor = new Map<string, DayKey>()
  dates.forEach((date) => {
    const key = toKey(date)
    const week = toKey(startOfWeek(date))
    if (!weekAnchor.has(week)) weekAnchor.set(week, key)
    const half = weekHalfOn(date, key)
    if (half === "missed" || half === "frozen") {
      brokeOn.add(key)
      weekBroke.add(week)
    }
  })

  const cells: StripCell[] = dates.map((date) => {
    const key = toKey(date)
    const state = stateOf(date, key)
    const week = toKey(startOfWeek(date))
    const carriesWeek =
      brokeOn.has(key) || (!weekBroke.has(week) && weekAnchor.get(week) === key)
    const offers = freezeOffers(
      rule,
      project,
      key,
      todayKey,
      status,
      key === todayKey ? minutesLeftToday(today) : 0,
    ).filter((o) => !o.week || carriesWeek)
    const unpaid = offers.filter((o) => !o.frozen)
    /* **A weekly rule's cell is the running total to that day**, not that
       day's own figure — `spec 018`. This called `readDay` whatever the scope,
       so `at most 3 a week` printed `“Pinterest” “0” of “3”` on every one of
       seven days: the week's allowance read as a daily one, seven days
       running. Worse than a bare number — that one is merely opaque, this one
       is confidently wrong.

       `readWeek` truncated at this day *is* the running total, so the row
       reads across as the burn-down, in the same figures the ring's pace arc
       draws. Two places that cannot then disagree. */
    const readings = byWeek
      ? readWeek(
          heldWeek(startOfWeek(date)),
          ctx,
          project.days,
          startOfWeek(date),
          key,
        )
      : readDay(held(key), ctx, project.days[key], key)
    /* The cell's **figure** is its own scale's; the tooltip says everything.
       Adding the week's deficit to each of its seven days would report one
       broken week seven times. */
    const tipReadings = byWeek
      ? readings
      : [
          ...readings,
          ...readWeek(
            heldWeek(startOfWeek(date)),
            ctx,
            project.days,
            startOfWeek(date),
            key,
          ),
        ]
    // A cell that offers nothing has two completely different reasons for it,
    // and "you cannot afford this" is the one nobody guesses.
    const short = unpaid.length > 0 && !unpaid.some((o) => o.ok)
    return {
      key,
      state,
      value:
        state === "unjudged"
          ? "·"
          : soleCheck
            ? undefined
            : fmtValue(figure(readings)),
      /* The date and the verdict on the first line, then one line per thing
         the condition had to say. `Tip` renders it with `whitespace-pre-line`,
         so a bubble listing two checks reads as two checks. */
      tooltip: [
        `${fmtDateLong(key)} — ${stateWord(state)}`,
        ...(state === "unjudged" ? [] : breakdown(tipReadings, key)),
        ...(state === "watching"
          ? [
              t(
                "This week began before the rule did — only its ceilings apply.",
              ),
            ]
          : []),
        ...(state === "lost"
          ? [
              t(
                "The week is lost: this day added nothing to it, so it neither grows the streak nor breaks it.",
              ),
            ]
          : []),
        ...(short
          ? [
              `The cheapest of these needs ${plural(
                Math.min(...unpaid.map((o) => o.cost)),
                "freeze",
              )} and you have ${unpaid[0].available}`,
            ]
          : []),
        /* **Named, not counted.** This said `2 of 3 frozen`, which tells you
           there is something to find out and not what it is — and on a weekly
           rule, where every violation is bought separately now, *which* of
           them you already paid for is the whole question. The cell's corner
           snowflake says that some of it is bought; this says which. */
        ...(offers.length > unpaid.length
          ? [
              "",
              `Frozen — ${offers.length - unpaid.length} of ${offers.length}:`,
              ...offers
                .filter((o) => o.frozen)
                .map((o) => `· ${o.violation.line}`),
              /* What a receipt on a running week does **not** say. A freeze
                 is priced against the violation as it stands, and a week that
                 is not over can still grow past what was paid — which is
                 exactly why the row is not blue yet. */
              ...(byWeek && !weekIsOver(startOfWeek(date), todayKey)
                ? [
                    t(
                      "The week is not over — this covers it as it stands, not whatever it becomes.",
                    ),
                  ]
                : []),
            ]
          : []),
      ].join("\n"),
      /* **Every violation the day has, listed** — `spec 017`, part 6. The
         already-frozen ones stay in the list, marked: without them there is no
         way to find out what you have already paid for, and paying twice for
         one thing is the failure mode of every ledger drawn as a button. */
      freeze: offers.length
        ? {
            /* **A weekly rule's purchase is the week's, and the popover says
               so.** It named the day you happened to be pointing at, which is
               how one freeze against one week's ceiling read as a freeze
               against that Tuesday — and then as six more of them, because
               every other day of the week offers the same list. */
            label: byWeek
              ? t("Week of {date}", {
                  date: fmtDateLong(toKey(startOfWeek(date))),
                })
              : fmtDateLong(key),
            items: offers.map((o) => ({
              key: o.key,
              line: o.violation.line,
              cost: o.cost,
              available: o.available,
              ok: o.ok,
              frozen: o.frozen,
              week: o.week,
              onSpend: () =>
                onSpendFreeze(
                  o.dayKey,
                  o.key,
                  o.cost,
                  o.violation.line,
                  unpaid.filter((u) => u.key !== o.key).length,
                ),
            })),
          }
        : undefined,
    }
  })

  /* The chart's rows are the periods the rule actually judges — days for a
     daily rule, weeks for a weekly one. Drawing the days of a weekly rule
     would put seven bars under one verdict and invite you to read each of
     them as a pass or a fail.

     A compound rule plots its deficit against a limit of nought, because two
     conditions in two different units have no shared axis to share. That
     chart says the same thing either way: a bar above the line is a day you
     have to pay for. */
  /* **The limit, read through the bounds** — `spec 018`.
     This was `clauses[0]?.value`, the *deprecated* flat field. `newClause`
     writes `min` or `max` and has never written `value`, so it was `undefined`
     for every rule created since the form was rebuilt, `limit` came out null,
     and **no modern rule had a dashed line on its chart at all** — the thing
     the area is drawn against.

     A condition carries two bounds now and may carry both, so *between two and
     four hours* gets a band. Drawing one half of it would be the same lie as
     drawing none, more quietly. */
  /* **Read off the terms that were in force**, like everything else here —
     `spec 026`. The limit line is the promise, and drawing today's line under
     last spring's figures is the picture this panel must not draw: the area
     would cross a wall that was not there. */
  const soleBounds = (keys: DayKey[]): ClauseBounds => {
    const then = ruleClauses(
      byWeek ? heldWeek(startOfWeek(fromKey(keys[0]))) : held(keys[0]),
    )[0]
    return compound || !then
      ? {}
      : byWeek
        ? weekBounds(then, ctx, keys)
        : clauseBounds(then, ctx, keys[0])
  }

  /* **Where the terms changed inside this range** — `spec 026`. Not the
     rule's beginning: a rule starting is not a rule changing its mind, and a
     line on `startedOn` would say *before this, something else* about a
     stretch where there was nothing. */
  const marks = revisionMarks(rule, ctx, toKey(rangeStart), toKey(rangeEnd))

  /* Every set of terms this rule has held, oldest first — the last of them is
     the one the subtitle above already prints, so the fold shows the rest. */
  const history = revisionsOf(rule, ctx)

  const rowFor = (
    label: string,
    readings: ClauseReading[],
    state: RuleState,
    keys: DayKey[],
    revision = false,
  ): StreakChartRow => {
    const b = soleBounds(keys)
    return {
      label,
      value: figure(readings),
      // A compound rule plots its deficit against nought; a single condition
      // plots whichever bounds it actually carries.
      limit: compound ? 0 : (b.min ?? b.max ?? null),
      limit2: compound ? null : (b.min !== undefined ? (b.max ?? null) : null),
      broken: state === "missed",
      frozen: state === "frozen",
      revision,
    }
  }

  const chartRows: StreakChartRow[] = byWeek
    ? (() => {
        const out: StreakChartRow[] = []
        for (let w = startOfWeek(rangeStart); w <= rangeEnd; w = addDays(w, 7)) {
          const then = heldWeek(w)
          const state = ruleWeekShown(then, ctx, project.days, w, todayKey)
          if (state === "unjudged") continue
          const thenClause = ruleClauses(then)[0]
          out.push(
            rowFor(
              fmtShort(toKey(w)),
              readWeek(then, ctx, project.days, w, todayKey),
              state,
              thenClause ? coveredDays(thenClause, then, w) : [],
              // The week a revision landed in is the first week it judged —
              // `ruleHeldOnWeek` reads a week's terms off its last day — so
              // the line goes on that week rather than the one after it.
              marks.some(
                (m) => m >= toKey(w) && m <= toKey(addDays(w, 6)),
              ),
            ),
          )
        }
        return out
      })()
    : dates
        .filter((d) => judgesDay(held(toKey(d)), toKey(d)) && toKey(d) <= todayKey)
        .map((d) => {
          const key = toKey(d)
          return rowFor(
            fmtShort(key),
            readDay(held(key), ctx, project.days[key], key),
            stateOf(d, key),
            [key],
            marks.includes(key),
          )
        })

  /* Where this week stands, for a rule that judges weeks.

     Deliberately **this week**, and the one thing on the panel that is: the
     rest follows the period bar, because the rest is history and history has
     whatever range you asked for. Pace is not history — it is the question of
     what to do before Sunday, and there is only one Sunday that can still be
     acted on. Shown only when the period contains it, so a panel scrolled back
     to March does not offer advice about a week that ended five months ago. */
  const thisWeek = startOfWeek(new Date())
  const paceRows =
    weekClauses(rule).length > 0 &&
    toKey(thisWeek) >= toKey(rangeStart) &&
    thisWeek <= rangeEnd
      ? weekPace(rule, ctx, project.days, thisWeek, todayKey)
      : []

  /* **The same body, in whichever shell it is standing in.** Opened from
     the composite's breakdown it is a block inside that panel; opened on its
     own it is a panel. Two shells with one signature rather than two
     renderings of five hundred lines, which is how the two would drift. */
  const Shell = nested ? NestedPanel : PanelSection

  return (
    <Shell
      tint={rule.color}
      icon={(rule.iconName && ICON_MAP[rule.iconName]) || FALLBACK_ICON}
      title={rule.label}
      subtitle={
        /* The conditions as a list rather than one run-on sentence: a rule
           with two of them is two things to check, and "and" in the middle of
           a line is not a checklist. The description sits under them on its
           own line — it is why you set the rule, not part of the rule, and
           run together with the terms it read as a fourth clause. */
        <span className="block">
          {clauses.map((clause) => (
            <span key={clause.id} className="block">
              {compound ? "· " : ""}
              <Sentence
                text={clauseSentence(clause, ctx, clauseScope(clause, rule))}
              />
            </span>
          ))}
          {rule.description && (
            <span className="block mt-1 normal-case text-ink/45">
              {rule.description}
            </span>
          )}
        </span>
      }
      closeLabel={`Hide ${rule.label}`}
      onClose={onClose}
      onSettings={onSettings}
      action={
        <div className="flex items-center gap-1.5">
          {/* **One of two doors into solo** — `spec 016`, part 5. This is the
              one you are already standing at when you ask *how is this one
              really doing*; the other is the breakdown in the composite's
              panel, where you work out which promise keeps doing it to you. */}
          {onSolo && (
            <Tip
              text={
                solo
                  ? t("Show every rule again")
                  : `Show the page as though “${rule.label}” were the only rule that votes`
              }
            >
              <button
                type="button"
                onClick={onSolo}
                aria-pressed={!!solo}
                style={
                  solo
                    ? { backgroundColor: rule.color, color: c.onFill }
                    : { color: rule.color }
                }
                className={`${btnBase} flex items-center rounded-full p-1 ${
                  solo ? "" : "hover:bg-ink/10"
                }`}
              >
                <Focus size={12} />
              </button>
            </Tip>
          )}
          <Tip
            text={`${freezes.weeklyLeft} of ${freezes.weeklyTotal} left this week. Granted every Monday and lost unused — this is the allowance you set yourself.`}
          >
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full text-ink/45 bg-ink/[0.06]">
              <Snowflake size={11} />
              {freezes.weeklyLeft}/{freezes.weeklyTotal}
            </span>
          </Tip>
          <Tip
            text={`${plural(freezes.banked, "freeze")} banked, capped at ${freezes.cap}${
              freezes.forfeited
                ? ` — ${freezes.forfeited} earned beyond the cap were lost`
                : ""
            }. One for every week you keep clean; carried over until spent.`}
          >
            <span
              className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
              style={{ color: c.freeze, backgroundColor: `${c.freeze}1A` }}
            >
              <Snowflake size={11} strokeWidth={3} />
              {freezes.banked} / {freezes.cap}
            </span>
          </Tip>
        </div>
      }
    >
      {level && (
        <div
          className="mb-3 flex items-center gap-2 px-2.5 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest"
          style={{
            backgroundColor: `${levelColour(level, c)}1A`,
            color: levelColour(level, c),
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: levelColour(level, c) }}
          />
          {levelWord(level)}
        </div>
      )}

      {/* Where the next reward is. A clean week that has not paid out yet looks
          like a bug and is a rule, so the rule says itself here. */}
      {status.open.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {status.open.map((w) => (
            <div
              key={w.weekStart}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-mono bg-ink/[0.04]"
            >
              <Snowflake
                size={12}
                className="shrink-0"
                style={{ color: w.wouldKeep ? c.freeze : `${c.ink}40` }}
              />
              {/* One sentence with the verdict spliced in, rather than four
                  fragments joined at render: the pieces go in a different
                  order in a different language, and a sentence assembled out
                  of them is the one thing a translation cannot follow. */}
              <span className="text-ink/70">
                {t("Week of {start} is still open — ", {
                  start: fmtDateLong(w.weekStart),
                })}
                {w.wouldKeep ? (
                  <strong style={{ color: c.freeze }}>
                    {t("on track for +1 freeze")}
                  </strong>
                ) : (
                  <strong className="text-ink/50">
                    {t("no freeze as it stands")}
                  </strong>
                )}
                {t(", sealing {date}", { date: fmtDateLong(w.sealsOn) })}
              </span>
            </div>
          ))}
        </div>
      )}

      {paceRows.map((pace) => (
        <PaceCard key={pace.clause.id} pace={pace} />
      ))}

      <StreakStrip
        cells={cells}
        note={t(
          "Freezes go on today and yesterday, the same window the log is written in. A day costs one freeze for every unit it fell short by.",
        )}
      />

      <StreakChart
        rows={chartRows}
        tint={rule.color}
        valueName={
          compound ? t("Over the limit by") : sole?.label || t("Counted")
        }
        limitName={
          t(
            compound || clauses[0]?.op === "atMost" ? "At most" : "At least",
          )
        }
        // Bars and the limit line are both minutes for a rule about hours, so
        // the axis and the tooltip have to read them as durations.
        formatter={timed ? fmtHours : undefined}
      />

      {/* **What this rule used to say** — `spec 026`.

          It sits directly under the chart because the chart is what raises
          the question: a line through the area says *left of this, a
          different rule*, and the answer to *which one* belongs beside it
          rather than three screens up under the title.

          Read back with `clauseSentence` — the same builder the subtitle, the
          Setup summary and the supervisor's digest use. A history written in
          different words from the rule is a history that cannot be compared
          with it, which is the only thing anybody would open it to do.

          Absent with one revision. There is no history to read, and an empty
          fold saying so is a control that exists to disappoint. */}
      {history.length > 1 && (
        <div className="mb-3">
          <Fold
            title={t("Terms before this")}
            summary={t("{n} earlier", { n: history.length - 1 })}
          >
            {history
              .slice(0, -1)
              .reverse()
              .map((revision) => (
                <div key={revision.from} className="space-y-0.5">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-ink/40">
                    {t("From {date}", { date: fmtDateLong(revision.from) })}
                  </div>
                  {revision.clauses.map((clause) => (
                    <div
                      key={clause.id}
                      className="text-[10px] font-mono text-ink/55"
                    >
                      {revision.clauses.length > 1 ? "· " : ""}
                      <Sentence
                        text={clauseSentence(
                          clause,
                          ctx,
                          clauseScope(clause, {
                            ...rule,
                            scope: revision.scope,
                          }),
                        )}
                      />
                    </div>
                  ))}
                </div>
              ))}
          </Fold>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatTile
          label={t("Current streak")}
          value={shown.was !== null ? `${shown.was} → ${shown.now}` : shown.now}
          sub={unitWord(shown.now)}
          icon={Flame}
          inset
        />
        <StatTile
          label={t("Best streak")}
          value={status.best}
          sub={unitWord(status.best)}
          icon={Trophy}
          inset
        />
        <StatTile
          label={t("Freezes banked")}
          value={freezes.banked}
          sub={`of ${freezes.cap}`}
          icon={Snowflake}
          inset
        />
      </div>
    </Shell>
  )
}
