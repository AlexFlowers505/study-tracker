import { useMemo } from "react"
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  Flame,
  Snowflake,
  Trophy,
} from "lucide-react"
import type { DayKey, Project } from "../types/model"
import { FREEZE_CAP, canFreeze, dayState, freezeLedger } from "../lib/freezes"
import { computeStreaks } from "../lib/streaks"
import { dayBreakdown, goalForDate } from "../lib/stats"
import { datesInRange, fmtDateLong, fmtShort, toKey } from "../lib/date"
import { fmtHours, fmtHoursChart, toHours } from "../lib/time"

import { StatTile } from "../ui/StatTile"
import { Tip } from "../ui/Tip"
import { PanelSection } from "./PanelSection"
import { StreakChart } from "./StreakChart"
import type { StreakChartRow } from "./StreakChart"
import { StreakStrip } from "./StreakStrip"
import type { StripCell } from "./StreakStrip"

import { usePalette } from "../ui/useTheme"
const plural = (n: number) => (n === 1 ? "" : "s")

const HOW_IT_WORKS = [
  "A day counts when it hits its goal; a goal of 0 counts as met.",
  "Ignoring a day, a week or a month does NOT affect a streak — otherwise marking the bad days ignored would be the easy way to fake one.",
  "The count filter does not affect it either: streaks always cover every slot and activity, whatever the page is showing.",
  "Weeks and months are judged by their days, not by summed hours.",
  `A week with no missed day earns one freeze, up to ${FREEZE_CAP}. Spend one on a red day and it counts as kept — the day turns blue, not green: the goal was still missed.`,
  "The log can only be written for today and yesterday. A week therefore seals on the Tuesday after it ends, when its last day passes out of reach — and only then does it pay out, because only then is it finished.",
].join("\n\n")

export function StreaksSection({
  project,
  rangeStart,
  rangeEnd,
  today,
  onFreeze,
  onClose,
}: {
  project: Project
  /** The period bar's range — the panel shows exactly what the page shows. */
  rangeStart: Date
  rangeEnd: Date
  today: Date
  /** Spends a freeze on that day. The strip's menu is the confirmation. */
  onFreeze: (key: DayKey) => void
  onClose?: () => void
}) {
  const c = usePalette()
  const streaks = useMemo(() => computeStreaks(project), [project])
  const ledger = useMemo(() => freezeLedger(project), [project])
  const goalsOff = project.settings.goalsEnabled === false
  // Newest first, and only the ones still worth explaining — a cut from months
  // ago is history, not an answer to "where is my freeze".
  const cuts = useMemo(() => {
    const all = project.settings.goalCuts || []
    const openKeys = new Set(ledger.open.map((w) => w.weekStart))
    return all.filter((g) => openKeys.has(g.weekKey)).slice(-3).reverse()
  }, [project.settings.goalCuts, ledger.open])

  /* The period as cells and as bars.
   *
   * Both come from the same walk so they cannot disagree, and both use the
   * same components the custom streaks use — the two panels are one interface
   * rather than two that happen to look alike. `dayState` is the one function
   * that decides what a day is; this only paints it. */
  const { cells, chartRows } = useMemo(() => {
    const { settings, slots, days } = project
    const todayKey = toKey(today)
    const cellsOut: StripCell[] = []
    const rowsOut: StreakChartRow[] = []
    datesInRange(rangeStart, rangeEnd).forEach((date) => {
      const key = toKey(date)
      const day = days[key]
      const state = dayState(day, date, settings, slots, todayKey)
      const total = dayBreakdown(day, slots).total
      const goal = goalForDate(settings, date)
      const freezable = canFreeze(
        date,
        day,
        settings,
        slots,
        today,
        ledger.balance,
      )
      cellsOut.push({
        key,
        state,
        // The date, not the hours: "2h 30m" does not fit a cell this size, and
        // a bare number of hours would be a rounded figure pretending to be
        // exact. The calendar reads as a calendar and the hours are one
        // hover — or one glance at the chart — away.
        value: date.getDate(),
        tooltip: `${fmtDateLong(key)} — ${
          state === "met"
            ? "goal met"
            : state === "frozen"
              ? "frozen"
              : state === "missed"
                ? "goal missed"
                : "still open"
        }, ${fmtHours(total)} of ${goal > 0 ? fmtHours(goal) : "no goal"}`,
        freeze: freezable
          ? {
              cost: 1,
              available: ledger.balance,
              label: fmtDateLong(key),
              onSpend: () => onFreeze(key),
            }
          : undefined,
      })
      // A day with no goal has nothing to clear, so it is drawn without a
      // line rather than with one at zero, which would read as "cleared it".
      if (state === "pending" && key > todayKey) return
      rowsOut.push({
        label: fmtShort(key),
        value: toHours(total),
        limit: goal > 0 ? toHours(goal) : null,
        broken: state === "missed",
        frozen: state === "frozen",
      })
    })
    return { cells: cellsOut, chartRows: rowsOut }
  }, [project, rangeStart, rangeEnd, today, ledger.balance, onFreeze])

  return (
    <PanelSection
      tint={c.project}
      icon={Flame}
      title="Streaks"
      subtitle={
        /* Downwards. This is the tallest bubble in the app and the panel it
           sits in opens just under the sticky period bar, so anchored above its
           trigger the first lines ran off the top of the viewport — and the
           first lines are the ones that say what a streak even is. */
        <Tip multiline side="bottom" text={HOW_IT_WORKS}>
          <span className="cursor-help underline decoration-dotted underline-offset-2">
            Whole project · how streaks and freezes work
          </span>
        </Tip>
      }
      closeLabel="Hide streaks"
      onClose={onClose}
      action={
        goalsOff ? null : (
          <Tip
            text={`Unused freezes, capped at ${FREEZE_CAP}${
              ledger.forfeited
                ? ` — ${ledger.forfeited} earned beyond the cap were lost`
                : ""
            }`}
          >
            <span
              className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
              style={{
                color: c.freeze,
                backgroundColor: `${c.freeze}1A`,
              }}
            >
              <Snowflake size={11} />
              {ledger.balance} / {FREEZE_CAP}
            </span>
          </Tip>
        )
      }
    >
      {goalsOff ? (
        // No metric, no streak. Said out loud rather than shown as zeroes,
        // which would read as "you have no streak" instead of "this is off".
        <p className="text-xs font-mono text-ink/50">
          Streaks need the effectiveness meter. Turn daily goals on in Setup to
          use them.
        </p>
      ) : !streaks ? (
        <p className="text-xs font-mono text-ink/50">
          Nothing to measure yet.
        </p>
      ) : (
        <>
        {/* Where the next freeze is. A green week that has not paid out yet is
            the single most confusing thing about this feature — it looks like
            a bug and it is a rule, so the rule says itself here rather than
            living only in a tooltip. */}
        {ledger.open.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {ledger.open.map((w) => (
              <div
                key={w.weekStart}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-mono bg-ink/[0.04]"
              >
                <Snowflake
                  size={12}
                  className="shrink-0"
                  style={{ color: w.wouldEarn ? c.freeze : `${c.ink}40` }}
                />
                <span className="text-ink/70">
                  Week of {fmtDateLong(w.weekStart)} is still open —{" "}
                  {w.wouldEarn ? (
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

        {/* Why a week you expected to pay out did not. Without this the freeze
            simply fails to appear, which is indistinguishable from a bug — and
            the whole point of recording the cut was to be able to say so. */}
        {cuts.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {cuts.map((g) => (
              <div
                key={g.at}
                className="flex items-start gap-2 rounded-xl px-3 py-2 text-[11px] font-mono"
                style={{ backgroundColor: `${c.exam}14` }}
              >
                <AlertTriangle
                  size={12}
                  className="shrink-0 mt-0.5"
                  style={{ color: c.exam }}
                />
                <span className="text-ink/70">
                  On {fmtDateLong(g.at.slice(0, 10))} you lowered the weekly
                  goal from <strong>{fmtHours(g.from)}</strong> to{" "}
                  <strong>{fmtHours(g.to)}</strong>, so the week of{" "}
                  {fmtDateLong(g.weekKey)} earns no freeze.
                </span>
              </div>
            ))}
          </div>
        )}
        <StreakStrip
          cells={cells}
          note="Freezes go on today and yesterday, the same window the log is written in. One freeze covers one missed day."
        />

        <StreakChart
          rows={chartRows}
          tint={c.project}
          valueName="Studied"
          limitName="Goal"
          formatter={fmtHoursChart}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label="Current day streak"
            value={streaks.currentDays}
            sub={`day${plural(streaks.currentDays)}`}
            icon={Flame}
          />
          <StatTile
            label="Best day streak"
            value={streaks.bestDays}
            sub={`day${plural(streaks.bestDays)}`}
            icon={CalendarCheck}
          />
          <StatTile
            label="Best week streak"
            value={streaks.bestWeeks}
            sub={`week${plural(streaks.bestWeeks)}`}
            icon={CalendarDays}
          />
          <StatTile
            label="Best month streak"
            value={streaks.bestMonths}
            sub={`month${plural(streaks.bestMonths)}`}
            icon={Trophy}
          />
        </div>
        </>
      )}
    </PanelSection>
  )
}
