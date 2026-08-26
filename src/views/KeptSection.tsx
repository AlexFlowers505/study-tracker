/* ---------------------------------------------------------------
   The composite, opened up.

   The card above says two numbers and a row of squares — the run and what is
   at stake. That is the right amount for something on screen at all times,
   and it is not enough on a bad month, when the question stops being *how am
   I doing* and becomes **which promise keeps doing this to me**.

   Three answers, in the order you want them:

   - **The period as days** — `StreakStrip`, the same grid every rule panel
     draws, so the composite is read the same way as the things it is composed
     of.
   - **What it is made of** — one row per voting rule, with the days it broke
     and, separately, the days it broke *alone*. A rule missing eight days of
     which one was its own fault is a rule keeping bad company; a rule whose
     misses are nearly all its own is the whole problem, and those two need
     completely different things done about them.
   - **How close each day came** — `StreakChart`, rules held against rules
     voting. The area sits flush against its limit while you are keeping it
     and dips exactly as far as the day fell short, which is the ring on the
     day cards drawn along a time axis.

   **It follows the period bar**, like every other panel here. A composite
   stuck on this week while the log below it shows March would be answering a
   question nobody asked.
--------------------------------------------------------------- */

import { useMemo } from "react"
import { Flame } from "lucide-react"
import type { DayKey, Project } from "../types/model"
import type { KeptWeeks } from "../lib/dayVerdict"
import { dayReport, keptBreakdown } from "../lib/dayVerdict"
import { streakContext } from "../lib/customStreaks"
import { addDays, fromKey, toKey } from "../lib/date"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"
import { PanelSection } from "./PanelSection"
import { StreakChart } from "./StreakChart"
import type { StreakChartRow } from "./StreakChart"
import { StreakStrip } from "./StreakStrip"
import type { StripCell, StripState } from "./StreakStrip"

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/** The strip speaks the older, narrower word for the same states. */
const asStrip = (state: string): StripState =>
  state === "kept"
    ? "met"
    : state === "frozen"
      ? "frozen"
      : state === "missed"
        ? "missed"
        : state === "pending"
          ? "pending"
          : "unjudged"

export function KeptSection({
  project,
  weeks,
  days,
  rangeStart,
  rangeEnd,
  today,
  onClose,
}: {
  project: Project
  weeks: KeptWeeks
  days: { current: number; best: number }
  rangeStart: Date
  rangeEnd: Date
  today: Date
  onClose: () => void
}) {
  const c = usePalette()
  const todayKey = toKey(today)
  const from = toKey(rangeStart)
  const to = toKey(rangeEnd)

  /* One walk, two readings. The strip wants a cell per day and the chart wants
     a row per day, and computing them separately would be the same forty
     `dayReport` calls done twice. */
  const { cells, rows } = useMemo(() => {
    const ctx = streakContext(project)
    const cells: StripCell[] = []
    const rows: StreakChartRow[] = []
    for (let d = fromKey(from); toKey(d) <= to; d = addDays(d, 1)) {
      const key: DayKey = toKey(d)
      if (key > todayKey) break
      const report = dayReport(project, key, todayKey, ctx)
      if (!report.judged) continue
      cells.push({
        key,
        state: asStrip(report.state),
        /* The two numbers the ring carries, in words. A day that missed says
           which rules did it — that is the whole reason to hover a red
           square, and counting them off the ring is not an answer. */
        tooltip: [
          `${report.kept} of ${report.judged} held`,
          ...report.readings
            .filter((r) => r.state === "missed")
            .map((r) => `${r.rule.label} missed`),
        ].join("\n"),
      })
      rows.push({
        label: key.slice(5),
        value: report.kept,
        limit: report.judged,
        broken: report.state === "missed",
        frozen: report.state === "frozen",
      })
    }
    return { cells, rows }
  }, [project, from, to, todayKey])

  const breakdown = useMemo(
    () => keptBreakdown(project, from, to, today),
    [project, from, to, today],
  )

  const inRange = weeks.weeks.filter((w) => w.start >= from && w.start <= to)
  const keptHere = inRange.filter((w) => w.state === "kept" || w.state === "frozen")

  return (
    <PanelSection
      tint={c.project}
      icon={Flame}
      title="Kept"
      closeLabel="Hide the composite"
      onClose={onClose}
      /* `PanelSection` puts this inside a `<p>`, so it may hold no block of
         its own — a `<div>` or a second `<p>` in here is invalid HTML that
         React unpicks at runtime. Spans and a break. */
      subtitle={
        <>
          A day is kept when <strong>every rule that votes</strong> held on it.
          Freezes count — a day paid for is a day kept.
          <br />
          <span className="text-ink/45">
            {plural(days.current, "day")} running, best {days.best} ·{" "}
            {plural(weeks.current, "week")} running, best {weeks.best} ·{" "}
            {keptHere.length} of {inRange.length} kept in this period
          </span>
        </>
      }
    >
      <StreakStrip cells={cells} />

      {/* **What it is made of.** The one question the card cannot answer. */}
      {breakdown.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-mono uppercase tracking-widest text-ink/40 mb-1.5">
            What it is made of
          </p>
          <div className="space-y-1">
            {breakdown.map((row) => (
              <div
                key={row.rule.id}
                className="flex items-center gap-2 rounded-lg bg-ink/[0.04] px-2.5 py-1.5"
              >
                <span
                  className="shrink-0"
                  style={{ color: row.rule.color }}
                >
                  <RenderIcon name={row.rule.iconName} size={12} />
                </span>
                <span className="min-w-0 truncate text-[11px] font-mono text-ink/70">
                  {row.rule.label}
                </span>

                <span className="ml-auto flex items-center gap-2 shrink-0 tabular-nums">
                  {/* A rule written this morning has judged no finished day,
                      and saying `held 0` about it would be as wrong in the
                      other direction as the `held 1` this replaced. */}
                  {row.judged === 0 ? (
                    <span className="text-[10px] font-mono text-ink/40">
                      {row.openToday ? "today still open" : "nothing judged"}
                    </span>
                  ) : row.missed === 0 ? (
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: c.goalMet }}
                    >
                      held {row.judged}
                    </span>
                  ) : (
                    <>
                      <Tip
                        text={`Broken on ${plural(row.missed, "day")} of the ${row.judged} it judged here.`}
                      >
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: c.exam }}
                        >
                          {row.missed}/{row.judged} missed
                        </span>
                      </Tip>
                      {/* The sharp figure: days this rule and nothing else
                          stood between you and a kept day. */}
                      {row.alone > 0 && (
                        <Tip
                          text={`On ${plural(row.alone, "day")} it was the only rule that broke — the day was yours but for this.`}
                        >
                          <span
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${c.exam}24`,
                              color: c.exam,
                            }}
                          >
                            {row.alone} alone
                          </span>
                        </Tip>
                      )}
                    </>
                  )}
                  {/* Today is in neither column, so it is said out loud
                      rather than silently left out of the total. */}
                  {row.openToday && row.judged > 0 && (
                    <span className="text-[10px] font-mono text-ink/35">
                      + today
                    </span>
                  )}
                  {row.frozen > 0 && (
                    <Tip text={`${plural(row.frozen, "day")} paid for with a freeze.`}>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: c.freeze }}
                      >
                        {row.frozen} frozen
                      </span>
                    </Tip>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* **How close each day came.** The ring on a day card, along a time
          axis: the area lies against its limit while the day is being kept and
          dips exactly as far as it fell short. The limit moves, because how
          many rules vote on a day is itself a fact about that day — a rule
          written on Wednesday judges nothing before it. */}
      <StreakChart
        rows={rows}
        tint={c.project}
        valueName="Rules held"
        limitName="Rules voting"
        formatter={(n) => String(n)}
      />
    </PanelSection>
  )
}
