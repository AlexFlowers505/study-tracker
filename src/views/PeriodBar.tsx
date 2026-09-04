/* ---------------------------------------------------------------
   The period bar: selector, custom bounds, cursor navigation and the
   toggles for the panels below it.

   Sticky at the very top now that the project header scrolls away, and it
   carries the current period's label so you never have to scroll up to see
   where you are.
--------------------------------------------------------------- */

import type { ReactNode } from "react"
import {
  Bell,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Coins,
  Filter,
  Flame,
  Gift,
  History,
  Moon,
  Trophy,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { DateRange, DayKey, PeriodId } from "../types/model"
import {
  NAVIGABLE_PERIODS,
  PERIODS,
  compactRangeLabel,
  rangeLabel,
  stepCursor,
} from "../lib/period"
import { btnBase } from "../lib/theme"
import { DateRangeField } from "../ui/DateField"
import { Tip } from "../ui/Tip"
import { useRevealOnScrollUp } from "../ui/useRevealOnScrollUp"

import { usePalette } from "../ui/useTheme"
import type { NoticeLevel } from "../lib/notices"
import { levelColour } from "../lib/notices"

/**
 * A balance, short enough for a badge.
 *
 * There is not much room up here, so anything past a thousand loses its tail:
 * `4.1k` rather than `4120`. The exact figure is one tap away in the account,
 * and a badge that wraps is worse than one that rounds.
 */
const shortPoints = (n: number): string =>
  Math.abs(n) < 1000 ? String(n) : `${(n / 1000).toFixed(1)}k`

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
  const c = usePalette()
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-card p-1 shadow-sm">
      {PERIODS.map((p) => {
        const active = p.id === period
        return (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`${btnBase} rounded-full px-3 py-1.5 text-[11px] font-mono whitespace-nowrap ${
              active
                ? ""
                : "text-ink/60 hover:text-ink hover:bg-ink/5"
            }`}
            style={
              active ? { backgroundColor: c.accent, color: c.onFill } : undefined
            }
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
  count,
  countLabel,
  countColor,
  countIcon: CountIcon,
  sub,
  subColor,
  subIcon: SubIcon,
}: {
  icon: LucideIcon
  tip: ReactNode
  active: boolean
  onClick: () => void
  badge?: boolean
  /** A number in the corner instead of a dot. Zero is worth showing too — a
   *  broken streak is exactly the thing you want to notice. */
  count?: number | null
  /** What to print instead of the raw figure — `4.1k` for a big balance. */
  countLabel?: string
  countColor?: string
  countIcon?: LucideIcon
  /** A second count, opposite corner. Streaks carry two numbers that mean
   *  different things — days running, freezes banked — and one of them being
   *  low is the reason to care about the other. */
  sub?: number | null
  subColor?: string
  subIcon?: LucideIcon
}) {
  const c = usePalette()
  return (
    <Tip text={tip}>
      <button
        onClick={onClick}
        className={`${btnBase} relative p-2 rounded-full ${
          active
            ? "bg-ink/[0.08] text-ink"
            : "text-ink/45 hover:text-ink hover:bg-ink/5"
        }`}
      >
        <Icon size={16} />
        {badge && (
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-page"
            style={{ backgroundColor: c.filter }}
          />
        )}
        {count != null && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-[3px] rounded-full flex items-center gap-[1px] justify-center text-[9px] font-mono font-bold leading-none ring-2 ring-page"
            style={{ backgroundColor: countColor, color: c.onFill }}
          >
            {CountIcon && <CountIcon size={7} strokeWidth={3} />}
            {countLabel ?? count}
          </span>
        )}
        {sub != null && (
          <span
            className="absolute -bottom-1 -right-1 min-w-[14px] h-[14px] px-[3px] rounded-full flex items-center gap-[1px] justify-center text-[9px] font-mono font-bold leading-none ring-2 ring-page"
            style={{ backgroundColor: subColor, color: c.onFill }}
          >
            {SubIcon && <SubIcon size={7} strokeWidth={3} />}
            {sub}
          </span>
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
  showFilter,
  onToggleFilter,
  filteredOutCount,
  sleepEnabled,
  showSleep,
  onToggleSleep,
  showLog,
  onToggleLog,
  showHistory,
  onToggleHistory,
  showShop,
  onToggleShop,
  showNotices,
  onToggleNotices,
  noticeCount,
  noticeLevel,
  keptDays,
  keptOpen,
  onToggleKept,
  points,
  showAccount,
  onToggleAccount,
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
  showFilter: boolean
  onToggleFilter: () => void
  filteredOutCount: number
  sleepEnabled: boolean
  showSleep: boolean
  onToggleSleep: () => void
  showLog: boolean
  onToggleLog: () => void
  showHistory: boolean
  onToggleHistory: () => void
  showShop: boolean
  onToggleShop: () => void
  /** The board — `spec 016`. Its badge is every notice, coloured by the worst. */
  showNotices: boolean
  onToggleNotices: () => void
  noticeCount: number
  noticeLevel: NoticeLevel | null
  /** The composite's run. No freezes: there is no shared pool any more. */
  keptDays: number | null
  keptOpen: boolean
  onToggleKept: () => void
  /** Points, abbreviated past a thousand. Null while the balance is off. */
  points: number | null
  showAccount: boolean
  onToggleAccount: () => void
}) {
  const c = usePalette()
  const navigable = NAVIGABLE_PERIODS.has(period)
  const navBtn = `${btnBase} rounded-full bg-card shadow-sm hover:bg-ink/5 disabled:opacity-35 disabled:hover:bg-card disabled:cursor-not-allowed`
  const visible = useRevealOnScrollUp()

  return (
    <div
      className={`sticky top-0 z-10 -mx-4 mb-4 px-4 py-3 bg-page/95 backdrop-blur transition-transform duration-200 ease-out ${
        visible ? "translate-y-0" : "-translate-y-[130%]"
      }`}
    >
      {/* Two rows on a phone, one from `sm` up. Everything here is wider than
          375px put together, so on mobile the pills take a line of their own
          and the controls take the next. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Seven pills overflow a phone; let the strip scroll sideways
              rather than clip or wrap. `min-w-0` is what makes that work — a
              flex item defaults to min-width:auto, which refuses to shrink
              below its content and pushes the page sideways instead. */}
          <div className="min-w-0 overflow-x-auto whitespace-nowrap">
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

        <div className="flex items-center gap-1.5 min-w-0">
          {/* The panel toggles give way first. They are the least urgent thing
              in the bar and the only group that reads fine half-visible, so on
              a narrow screen this strip scrolls and the navigation beside it
              keeps its place. */}
          {/* `p-1 -m-1` is not decoration: `overflow-x-auto` makes the other
              axis compute to `auto` too, and the filter's dot sits a couple of
              pixels outside its button, so without padding inside the scroll
              box the badge was shaved off. The negative margin keeps the row
              the height it was. */}
          <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto p-1 -m-1 [&>*]:shrink-0">
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
          {/* **The board's badge is what survives of "it comes and finds
              you."** The alarms are gone, so a closed board with a red figure
              on its bell is the only thing left that reaches you — and it
              costs one prop that already existed. */}
          {noticeCount > 0 && (
            <PanelToggle
              icon={Bell}
              active={showNotices}
              onClick={onToggleNotices}
              count={noticeCount}
              countColor={noticeLevel ? levelColour(noticeLevel, c) : undefined}
              tip={showNotices ? "Hide the notices" : `${noticeCount} notices about today`}
            />
          )}
          {/* `Flame` is already the language of streaks everywhere in the app,
              so this needs no label. It does **not** colour: we have exactly
              one place to look when something is wrong, and a second red mark
              two centimetres away means neither of them means anything. */}
          {keptDays !== null && (
            <PanelToggle
              icon={Flame}
              active={keptOpen}
              onClick={onToggleKept}
              count={keptDays}
              countColor={c.goalMet}
              tip={keptOpen ? "Hide the composite" : "Days kept in a row"}
            />
          )}
          {/* A gift is what you buy; coins are what you pay with. */}
          {points !== null && (
            <PanelToggle
              icon={Coins}
              active={showAccount}
              onClick={onToggleAccount}
              count={points}
              countLabel={shortPoints(points)}
              /* Never red, however negative. The board is the one place that
                 shouts, and a second alarming badge beside it means neither
                 of them means anything. */
              countColor={c.accent}
              tip={showAccount ? "Hide the account" : `${points} points, and where they came from`}
            />
          )}
          <PanelToggle
            icon={Gift}
            active={showShop}
            onClick={onToggleShop}
            tip={showShop ? "Hide the rewards" : "What your points will buy"}
          />
          <PanelToggle
            icon={Trophy}
            active={showHistory}
            onClick={onToggleHistory}
            tip={showHistory ? "Hide what you have reached" : "What you have reached"}
          />
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
              className={`${btnBase} p-2 rounded-full text-ink/45 hover:text-ink hover:bg-ink/5`}
            >
              <CalendarCheck size={16} />
            </button>
          </Tip>
          </div>

          {/* Never scrolls and never shrinks: knowing where you are and being
              able to step off it is the one thing the bar must always offer. */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <Tip text={navigable ? undefined : "This period sets its own dates"}>
              <button
                disabled={!navigable}
                onClick={() => setCursor(stepCursor(cursor, period, -1))}
                className={`${navBtn} p-2`}
              >
                <ChevronLeft size={16} />
              </button>
            </Tip>
            {/* The period reads as the label of the two arrows around it.
                Short form on a phone, full form once there is room. */}
            <span className="px-1 font-sans font-extrabold uppercase tracking-tight text-xs text-center whitespace-nowrap">
              <span className="sm:hidden">
                {compactRangeLabel(period, cursor, range)}
              </span>
              <span className="hidden sm:inline">
                {rangeLabel(period, cursor, range)}
              </span>
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
    </div>
  )
}
