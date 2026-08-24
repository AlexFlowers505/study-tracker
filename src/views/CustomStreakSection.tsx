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

import { Flame, Snowflake, Trophy } from "lucide-react"
import type { Project } from "../types/model"
import type {
  ClauseReading,
  RuleState,
  RuleStatus,
} from "../lib/customStreaks"
import {
  clauseSentence,
  clauseTarget,
  freezeOffer,
  judgesDay,
  readDay,
  readWeek,
  ruleClauses,
  ruleDayState,
  ruleWeekState,
  streakContext,
  weekPace,
  targetInfo,
  totalDeficit,
} from "../lib/customStreaks"
import {
  addDays,
  datesInRange,
  fmtDateLong,
  fmtShort,
  startOfWeek,
  toKey,
} from "../lib/date"
import { fmtHours } from "../lib/time"
import { PaceCard } from "./PaceCard"
import { StatTile } from "../ui/StatTile"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"
import { PanelSection } from "./PanelSection"
import { FALLBACK_ICON, ICON_MAP } from "../ui/iconLibrary"
import { StreakChart } from "./StreakChart"
import type { StreakChartRow } from "./StreakChart"
import { StreakStrip } from "./StreakStrip"
import type { StripCell } from "./StreakStrip"

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

const STATE_WORD: Record<RuleState, string> = {
  met: "kept",
  frozen: "frozen",
  missed: "missed",
  pending: "still open",
  unjudged: "not judged",
}

export function CustomStreakSection({
  status,
  project,
  rangeStart,
  rangeEnd,
  today,
  onSpendFreeze,
  onClose,
}: {
  status: RuleStatus
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
  onSpendFreeze: (dayKey: string, cost: number) => void
  onClose?: () => void
}) {
  const c = usePalette()
  const { rule, freezes } = status
  const todayKey = toKey(today)
  const byWeek = rule.scope === "week"
  const ctx = streakContext(project)
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

  const stateOf = (date: Date, key: string): RuleState =>
    byWeek
      ? ruleWeekState(rule, ctx, project.days, startOfWeek(date), todayKey)
      : ruleDayState(rule, ctx, project.days[key], key, todayKey)

  /**
   * Every condition that had something to say, in the form "Youtube 2".
   *
   * Each condition is printed in its own measure — a compound rule can hold
   * one about hours and one about slips, and a shared format would be wrong
   * for one of them.
   */
  const breakdown = (readings: ClauseReading[]) =>
    readings
      .filter((r) => r.applies)
      .map((r) => {
        const info = targetInfo(clauseTarget(r.clause), ctx)
        const value =
          info.measure === "time" ? fmtHours(r.value) : String(r.value)
        return `${info.label} ${value}` + (r.skipped ? " (skipped)" : "")
      })
      .join(" · ")

  const figure = (readings: ClauseReading[]) =>
    compound ? totalDeficit(readings) : (readings[0]?.value ?? 0)

  const cells: StripCell[] = dates.map((date) => {
    const key = toKey(date)
    const state = stateOf(date, key)
    const offer = freezeOffer(rule, project, key, todayKey, status)
    const readings = readDay(rule, ctx, project.days[key], key)
    // A cell that offers nothing has two completely different reasons for it,
    // and "you cannot afford this" is the one nobody guesses. `cost > 0` with
    // `ok` false is exactly that case: the day is freezable and the freezes
    // are not there.
    const short = !offer.ok && offer.cost > 0
    return {
      key,
      state,
      value: state === "unjudged" ? "·" : fmtValue(figure(readings)),
      tooltip:
        `${fmtDateLong(key)} — ${STATE_WORD[state]}` +
        (state === "unjudged" ? "" : `. ${breakdown(readings)}`) +
        (short
          ? `. Freezing it needs ${plural(offer.cost, "freeze")} and you have ${offer.available}`
          : ""),
      freeze: offer.ok
        ? {
            cost: offer.cost,
            available: offer.available,
            label: fmtDateLong(key),
            // `offer.key`, not `key`: a weekly rule's freeze is recorded on
            // the Monday of the week it covers.
            onSpend: () => onSpendFreeze(offer.key, offer.cost),
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
  const rowFor = (
    label: string,
    readings: ClauseReading[],
    state: RuleState,
  ): StreakChartRow => ({
    label,
    value: figure(readings),
    limit: compound ? 0 : (clauses[0]?.value ?? null),
    broken: state === "missed",
    frozen: state === "frozen",
  })

  const chartRows: StreakChartRow[] = byWeek
    ? (() => {
        const out: StreakChartRow[] = []
        for (let w = startOfWeek(rangeStart); w <= rangeEnd; w = addDays(w, 7)) {
          const state = ruleWeekState(rule, ctx, project.days, w, todayKey)
          if (state === "unjudged") continue
          out.push(
            rowFor(
              fmtShort(toKey(w)),
              readWeek(rule, ctx, project.days, w, todayKey),
              state,
            ),
          )
        }
        return out
      })()
    : dates
        .filter((d) => judgesDay(rule, toKey(d)) && toKey(d) <= todayKey)
        .map((d) => {
          const key = toKey(d)
          return rowFor(
            fmtShort(key),
            readDay(rule, ctx, project.days[key], key),
            stateOf(d, key),
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
    byWeek && toKey(thisWeek) >= toKey(rangeStart) && thisWeek <= rangeEnd
      ? weekPace(rule, ctx, project.days, thisWeek, todayKey)
      : []

  return (
    <PanelSection
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
              {clauseSentence(clause, ctx, rule.scope)}
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
      action={
        <div className="flex items-center gap-1.5">
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
              <span className="text-ink/70">
                Week of {fmtDateLong(w.weekStart)} is still open —{" "}
                {w.wouldKeep ? (
                  <>
                    on track for{" "}
                    <strong style={{ color: c.freeze }}>+1 freeze</strong>
                  </>
                ) : (
                  <strong className="text-ink/50">no freeze as it stands</strong>
                )}
                , sealing {fmtDateLong(w.sealsOn)}
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
        note="Freezes go on today and yesterday, the same window the log is written in. A day costs one freeze for every unit it fell short by."
      />

      <StreakChart
        rows={chartRows}
        tint={rule.color}
        valueName={compound ? "Over the limit by" : sole?.label || "Counted"}
        limitName={
          compound || clauses[0]?.op === "atMost" ? "At most" : "At least"
        }
        // Bars and the limit line are both minutes for a rule about hours, so
        // the axis and the tooltip have to read them as durations.
        formatter={timed ? fmtHours : undefined}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatTile
          label="Current streak"
          value={status.current}
          sub={unitWord(status.current)}
          icon={Flame}
        />
        <StatTile
          label="Best streak"
          value={status.best}
          sub={unitWord(status.best)}
          icon={Trophy}
        />
        <StatTile
          label="Freezes banked"
          value={freezes.banked}
          sub={`of ${freezes.cap}`}
          icon={Snowflake}
        />
      </div>
    </PanelSection>
  )
}
