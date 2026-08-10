/* ---------------------------------------------------------------
   The period bar: selector, custom bounds, cursor navigation and the
   toggles for the panels below it.

   Sticky at the very top now that the project header scrolls away, and it
   carries the current period's label so you never have to scroll up to see
   where you are.
--------------------------------------------------------------- */

import type { ReactNode } from "react"
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flame,
  History,
  Moon,
  Sigma,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { DateRange, DayKey, PeriodId } from "../types/model"
import {
  NAVIGABLE_PERIODS,
  PERIODS,
  rangeLabel,
  stepCursor,
} from "../lib/period"
import { ACCENT, FILTER_TINT, btnBase } from "../lib/theme"
import { DateRangeField } from "../ui/DateField"
import { Tip } from "../ui/Tip"
import { useRevealOnScrollUp } from "../ui/useRevealOnScrollUp"

/**
 * Pill-style period picker: one rounded trough holding rounded pills, the
 * active one filled. Distinct from `SegmentedControl` (still used for the
 * chart mode switches) because this one is the page's primary control.
 */
function PeriodPills({
  period,
  setPeriod,
}: {
  period: PeriodId
  setPeriod: (id: PeriodId) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
      {PERIODS.map((p) => {
        const active = p.id === period
        return (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`${btnBase} rounded-full px-3 py-1.5 text-[11px] font-mono whitespace-nowrap ${
              active
                ? "text-white"
                : "text-[#1E2A33]/60 hover:text-[#1E2A33] hover:bg-[#1E2A33]/5"
            }`}
            style={active ? { backgroundColor: ACCENT } : undefined}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

/** One of the round buttons that open a panel below the bar. */
function PanelToggle({
  icon: Icon,
  tip,
  active,
  onClick,
  badge,
}: {
  icon: LucideIcon
  tip: ReactNode
  active: boolean
  onClick: () => void
  badge?: boolean
}) {
  return (
    <Tip text={tip}>
      <button
        onClick={onClick}
        className={`${btnBase} relative p-2 rounded-full ${
          active
            ? "bg-[#1E2A33]/[0.08] text-[#1E2A33]"
            : "text-[#1E2A33]/45 hover:text-[#1E2A33] hover:bg-[#1E2A33]/5"
        }`}
      >
        <Icon size={16} />
        {badge && (
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-[#F4F5F7]"
            style={{ backgroundColor: FILTER_TINT }}
          />
        )}
      </button>
    </Tip>
  )
}

export function PeriodBar({
  period,
  setPeriod,
  cursor,
  setCursor,
  range,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  showOverall,
  onToggleOverall,
  showFilter,
  onToggleFilter,
  filteredOutCount,
  sleepEnabled,
  showSleep,
  onToggleSleep,
  showLog,
  onToggleLog,
  showStreaks,
  onToggleStreaks,
}: {
  period: PeriodId
  setPeriod: (id: PeriodId) => void
  cursor: Date
  setCursor: (d: Date) => void
  range: DateRange
  customStart?: DayKey
  setCustomStart: (k: DayKey) => void
  customEnd?: DayKey
  setCustomEnd: (k: DayKey) => void
  showOverall: boolean
  onToggleOverall: () => void
  showFilter: boolean
  onToggleFilter: () => void
  filteredOutCount: number
  sleepEnabled: boolean
  showSleep: boolean
  onToggleSleep: () => void
  showLog: boolean
  onToggleLog: () => void
  showStreaks: boolean
  onToggleStreaks: () => void
}) {
  const navigable = NAVIGABLE_PERIODS.has(period)
  const navBtn = `${btnBase} rounded-full bg-white shadow-sm hover:bg-[#1E2A33]/5 disabled:opacity-35 disabled:hover:bg-white disabled:cursor-not-allowed`
  const visible = useRevealOnScrollUp()

  return (
    <div
      className={`sticky top-0 z-10 -mx-4 mb-4 px-4 py-3 bg-[#F4F5F7]/95 backdrop-blur transition-transform duration-200 ease-out ${
        visible ? "translate-y-0" : "-translate-y-[130%]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          {/* Seven pills overflow a phone; let the strip scroll sideways
              rather than clip or wrap. */}
          <div className="max-w-full overflow-x-auto whitespace-nowrap">
            <PeriodPills period={period} setPeriod={setPeriod} />
          </div>
          {period === "custom" && (
            // Mounted only while Custom is selected, so opening on mount is the
            // same thing as opening the moment Custom is clicked.
            <DateRangeField
              start={customStart}
              end={customEnd}
              openOnMount
              onChange={(from, to) => {
                setCustomStart(from)
                setCustomEnd(to)
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Project-wide totals are independent of the period, so they live
              behind a toggle rather than taking permanent space. */}
          <PanelToggle
            icon={Sigma}
            active={showOverall}
            onClick={onToggleOverall}
            tip={showOverall ? "Hide overall stats" : "Show overall stats"}
          />
          {/* The dot stays on whether the panel is open or shut: a filter you
              can't see is the one you most need telling about, otherwise every
              figure on the page is quietly short and nothing says why. */}
          <PanelToggle
            icon={Filter}
            active={showFilter}
            onClick={onToggleFilter}
            badge={filteredOutCount > 0}
            tip={
              filteredOutCount
                ? `${filteredOutCount} left out of every total`
                : showFilter
                  ? "Hide the filter"
                  : "Filter what counts"
            }
          />
          <PanelToggle
            icon={Flame}
            active={showStreaks}
            onClick={onToggleStreaks}
            tip={showStreaks ? "Hide streaks" : "Show streaks"}
          />
          {/* Absent rather than disabled when sleep tracking is off: there is
              nothing behind it to show. */}
          {sleepEnabled && (
            <PanelToggle
              icon={Moon}
              active={showSleep}
              onClick={onToggleSleep}
              tip={showSleep ? "Hide sleep" : "Show sleep"}
            />
          )}
          <PanelToggle
            icon={History}
            active={showLog}
            onClick={onToggleLog}
            tip={showLog ? "Hide the change log" : "Show the change log"}
          />
          {/* Jumping to "now" is a shortcut, not a step through the timeline —
              it sits outside the back/forward pair and carries no chrome. */}
          <Tip
            text={
              navigable ? "Jump to the current period" : "Jump to this week"
            }
          >
            <button
              onClick={() => {
                if (!navigable) setPeriod("week")
                setCursor(new Date())
              }}
              className={`${btnBase} p-2 rounded-full text-[#1E2A33]/45 hover:text-[#1E2A33] hover:bg-[#1E2A33]/5`}
            >
              <CalendarCheck size={16} />
            </button>
          </Tip>
          <Tip text={navigable ? undefined : "This period sets its own dates"}>
            <button
              disabled={!navigable}
              onClick={() => setCursor(stepCursor(cursor, period, -1))}
              className={`${navBtn} p-2`}
            >
              <ChevronLeft size={16} />
            </button>
          </Tip>
          {/* The period reads as the label of the two arrows around it. */}
          <span className="px-1.5 font-sans font-extrabold uppercase tracking-tight text-xs text-center min-w-[5.5rem] truncate">
            {rangeLabel(period, cursor, range)}
          </span>
          <Tip text={navigable ? undefined : "This period sets its own dates"}>
            <button
              disabled={!navigable}
              onClick={() => setCursor(stepCursor(cursor, period, 1))}
              className={`${navBtn} p-2`}
            >
              <ChevronRight size={16} />
            </button>
          </Tip>
        </div>
      </div>
    </div>
  )
}
