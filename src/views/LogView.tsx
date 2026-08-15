/* ---------------------------------------------------------------
   The log half of the page: the period's heading, its note, and whichever
   shape of day view the period calls for.
--------------------------------------------------------------- */

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { EyeOff, MessageSquare } from 'lucide-react'
import type { DateRange, Day, PeriodId, Project } from '../types/model'
import {
  addDays,
  datesInRange,
  monthDates,
  pad,
  startOfWeek,
  toKey,
  weekDates,
} from '../lib/date'
import { fmtHours } from '../lib/time'
import { makeIsIgnored, rangeStats } from '../lib/stats'
import { WIDE_PERIODS, rangeLabel } from '../lib/period'
import { PopoverMenu } from '../ui/PopoverMenu'
import { MenuToggle } from '../ui/toggles'
import { RenderIcon } from '../ui/icons'
import { Tip } from '../ui/Tip'
import { FullCardGrid } from './DayCards'
import { Heatmap } from './Heatmap'
import { MonthGrid } from './MonthGrid'
import { NoteCard } from './NoteCard'

import { usePalette } from "../ui/useTheme"
export function LogView({
  data,
  period,
  range,
  cursor,
  onEditDay,
  onUpdateDayNote,
  onUpdateWeekNote,
  onUpdateMonthNote,
  onUpdateWeekIgnore,
  onUpdateMonthIgnore,
  onQuickAddDay,
  onQuickAddSleepDay,
  onQuickAddCounterDay,
  canFreezeDay,
  onFreezeDay,
  onUpdateDay,
  sleepSection,
}: {
  data: Project
  period: PeriodId
  range: DateRange
  cursor: Date
  onEditDay: (key: string) => void
  onUpdateDayNote: (key: string, text: string) => void
  onUpdateWeekNote: (key: string, text: string) => void
  onUpdateMonthNote: (key: string, text: string) => void
  onUpdateWeekIgnore: (key: string, next: boolean) => void
  onUpdateMonthIgnore: (key: string, next: boolean) => void
  onQuickAddDay: (key: string) => void
  onQuickAddSleepDay?: (key: string) => void
  onQuickAddCounterDay?: (key: string) => void
  canFreezeDay?: (key: string) => boolean
  onFreezeDay?: (key: string) => void
  /** Lets the day cards edit an entry in place, without the day dialog. */
  onUpdateDay?: (key: string, patch: Partial<Day>) => void
  /** The sleep panel, rendered by the shell so it can read the unfiltered
   *  project — sleep has no slots or categories for the filter to act on. */
  sleepSection?: ReactNode
}) {
  const c = usePalette()
  const granularity = period
  // Card-wide default for entry comments; each entry can still be folded on
  // its own button, and flipping this resets those.
  const [commentsOpen, setCommentsOpen] = useState(true)
  const {
    slots,
    categories,
    counterUnits = [],
    days,
    settings,
    weekNotes = {},
    monthNotes = {},
    weekIgnore = {},
    monthIgnore = {},
  } = data
  const todayKey = toKey(new Date())
  const dayKey = toKey(cursor)
  const weekKey = toKey(startOfWeek(cursor))
  const monthKey = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`

  const visibleDates = useMemo(
    () => datesInRange(range.start, range.end),
    [range.start, range.end],
  )

  const isIgnored = useMemo(
    () => makeIsIgnored(weekIgnore, monthIgnore),
    [weekIgnore, monthIgnore],
  )

  const headerStats = useMemo(() => {
    if (granularity === "week")
      return rangeStats(weekDates(cursor), days, slots, settings, isIgnored)
    if (granularity === "month")
      return rangeStats(monthDates(cursor), days, slots, settings, isIgnored)
    return null
  }, [granularity, cursor, days, slots, settings, isIgnored])

  const monthPast =
    granularity === "month" &&
    toKey(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)) < todayKey
  const weekPast =
    granularity === "week" && toKey(addDays(startOfWeek(cursor), 6)) < todayKey
  const periodIgnored =
    granularity === "week"
      ? !!weekIgnore[weekKey]
      : granularity === "month"
        ? !!monthIgnore[monthKey]
        : false
  const periodGoalOutcome =
    (monthPast || weekPast) &&
    !periodIgnored &&
    headerStats &&
    headerStats.goal > 0
      ? headerStats.total >= headerStats.goal
        ? "met"
        : "missed"
      : null

  return (
    <div>
      {/* Deliberately `flex-nowrap`: the menu button is narrow and there is
          always room for it, but as a wrappable sibling of a long heading it
          jumped to a line of its own the moment the title got wide. The
          heading block wraps internally instead — `min-w-0` is what lets it,
          since a flex item will not shrink below its content otherwise. */}
      <div className="flex items-baseline justify-between gap-x-3 mb-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
          {periodIgnored && (
            <Tip text={`This ${granularity} is excluded from every statistic`}>
              <EyeOff size={14} className="text-ink/45" />
            </Tip>
          )}
          <h2 className="font-sans font-extrabold uppercase tracking-tight text-base">
            {rangeLabel(period, cursor, range)}
          </h2>
          {periodGoalOutcome && (
            <Tip
              text={
                periodGoalOutcome === "met"
                  ? `${granularity === "week" ? "Weekly" : "Monthly"} goal met`
                  : `${granularity === "week" ? "Weekly" : "Monthly"} goal missed`
              }
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{
                  backgroundColor:
                    periodGoalOutcome === "met" ? c.goalMet : c.exam,
                }}
              />
            </Tip>
          )}
          {headerStats && (
            <span className="text-xs font-mono text-ink/50">
              {headerStats.total > 0 ? fmtHours(headerStats.total) : "0h"}{" "}
              studied
              {headerStats.goal > 0 && (
                <> · goal {fmtHours(headerStats.goal)}</>
              )}
            </span>
          )}
        </div>
        {/* Only weeks and months carry an ignore flag, so the menu appears
            only where there is something in it. */}
        {(granularity === "week" ||
          granularity === "month" ||
          granularity === "day") && (
          // `inline-flex` rather than a block so it keeps the baseline the
          // trigger had when it was the flex item itself.
          <span className="shrink-0 inline-flex">
          <PopoverMenu label={`${granularity} settings`}>
            {granularity !== "day" && (
              <MenuToggle
                label="Ignore in statistics"
                icon={EyeOff}
                hint="Every figure on this page skips it"
                checked={periodIgnored}
                onChange={(next) =>
                  granularity === "week"
                    ? onUpdateWeekIgnore(weekKey, next)
                    : onUpdateMonthIgnore(monthKey, next)
                }
              />
            )}
            <MenuToggle
              label="Show entry comments"
              icon={MessageSquare}
              hint="Each entry can still be folded on its own"
              checked={commentsOpen}
              onChange={setCommentsOpen}
            />
          </PopoverMenu>
          </span>
        )}
      </div>

      {granularity === "day" && (
        <NoteCard
          key={dayKey}
          label="Day notes"
          icon={MessageSquare}
          value={days[dayKey]?.comment}
          onSave={(text) => onUpdateDayNote(dayKey, text)}
        />
      )}
      {granularity === "week" && (
        <NoteCard
          key={weekKey}
          label="Week notes"
          icon={MessageSquare}
          value={weekNotes[weekKey]}
          onSave={(text) => onUpdateWeekNote(weekKey, text)}
        />
      )}
      {granularity === "month" && (
        <NoteCard
          key={monthKey}
          label="Month notes"
          icon={MessageSquare}
          value={monthNotes[monthKey]}
          onSave={(text) => onUpdateMonthNote(monthKey, text)}
        />
      )}

      {sleepSection}

      {granularity === "month" && (
        <MonthGrid
          cursor={cursor}
          days={days}
          slots={slots}
          categories={categories}
          settings={settings}
          counterUnits={counterUnits}
          todayKey={todayKey}
          onEditDay={onEditDay}
          weekIgnore={weekIgnore}
          monthIgnore={monthIgnore}
        />
      )}
      {(granularity === "week" || granularity === "day") && (
        <FullCardGrid
          dates={visibleDates}
          days={days}
          slots={slots}
          categories={categories}
          settings={settings}
          counterUnits={counterUnits}
          todayKey={todayKey}
          onEditDay={onEditDay}
          weekIgnore={weekIgnore}
          monthIgnore={monthIgnore}
          big={granularity === "day"}
          commentsOpen={commentsOpen}
          onQuickAddDay={granularity === "week" ? onQuickAddDay : undefined}
          onQuickAddSleepDay={
            granularity === "week" ? onQuickAddSleepDay : undefined
          }
          onQuickAddCounterDay={
            granularity === "week" ? onQuickAddCounterDay : undefined
          }
          canFreezeDay={canFreezeDay}
          onFreezeDay={onFreezeDay}
          onUpdateDay={onUpdateDay}
        />
      )}
      {/* Anything longer than a month — including all-time and custom — is
          only legible as a heatmap. */}
      {WIDE_PERIODS.has(granularity) && (
        <Heatmap
          start={range.start}
          end={range.end}
          days={days}
          slots={slots}
          categories={categories}
          counterUnits={counterUnits}
          settings={settings}
          todayKey={todayKey}
          onSelectDay={onEditDay}
          isIgnored={isIgnored}
          showMonths
        />
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-mono uppercase tracking-wide text-ink/60">
        {slots.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <RenderIcon
              name={s.iconName}
              size={11}
              style={{ color: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
