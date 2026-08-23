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
import { activityMinutesIn, makeIsIgnored, rangeStats } from '../lib/stats'
import { counterTotalsIn } from '../lib/counters'
import { WIDE_PERIODS, rangeLabel } from '../lib/period'
import { PopoverMenu } from '../ui/PopoverMenu'
import { MenuToggle } from '../ui/toggles'
import { Tip } from '../ui/Tip'
import { FullCardGrid } from './DayCards'
import { Heatmap } from './Heatmap'
import { SECTION_HEADING } from '../lib/theme'
import { MonthGrid } from './MonthGrid'
import { NoteCard } from './NoteCard'
import { CounterControls, CounterGroupList } from './CounterTotals'
import type { DayReport } from '../lib/dayVerdict'
import { periodCounterGroups } from '../lib/periodCounters'
import type { CounterGrouping } from '../lib/periodCounters'

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
  onQuickAddSlotDay,
  onExpandDay,
  canFreezeDay,
  onFreezeDay,
  onUpdateDay,
  verdictOf,
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
  onQuickAddSlotDay?: (key: string, slotId: string) => void
  onExpandDay?: (key: string) => void
  canFreezeDay?: (key: string) => boolean
  onFreezeDay?: (key: string) => void
  /** Lets the day cards edit an entry in place, without the day dialog. */
  onUpdateDay?: (key: string, patch: Partial<Day>) => void
  /**
   * How each day came out. Threaded from the shell rather than computed here,
   * because a verdict must read the **unfiltered** project: the count filter
   * is a way of looking at the data, and hiding a slot must not turn a missed
   * day green.
   */
  verdictOf: (key: string) => DayReport
  /** The sleep panel, rendered by the shell so it can read the unfiltered
   *  project — sleep has no slots or activities for the filter to act on. */
  sleepSection?: ReactNode
}) {
  const c = usePalette()
  const granularity = period
  // Card-wide default for entry comments; each entry can still be folded on
  // its own button, and flipping this resets those.
  const [commentsOpen, setCommentsOpen] = useState(true)
  // Folds the counter chips — the heading's and, in month view, the ones on
  // every week strip, since they are the same chips answering the same
  // question and two switches for that would be one too many.
  /**
   * How the period's counters are arranged, and which groups are folded away.
   *
   * View preferences and nothing else — the figures are untouched, unlike the
   * count filter — so they live here in `useState` and start open again on a
   * reload, like `commentsOpen`. One pair governs the heading's rows *and*
   * every week strip in the month grid: the same chips answering the same
   * question, and two controls for that is one too many.
   */
  const [grouping, setGrouping] = useState<CounterGrouping>("kind")
  /**
   * `null` is "nothing chosen yet", and it reads as **everything folded**.
   *
   * Not an empty set, which would be "all showing": the counters are a
   * reference you open when you want them, and a project with forty of them
   * put a wall of chips between the period's heading and its days every time
   * the page loaded. Rearranging them resets it to null for the same reason —
   * the ids of one arrangement say nothing about the other, so carrying the
   * set across would unfold whatever happened not to match.
   */
  const [hiddenGroups, setHiddenGroups] = useState<Set<string> | null>(null)
  const {
    slots,
    activities,
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

  // Every period, not just week and month: the day view and the wide ranges
  // report their counters too, because "how many" is as much a fact about a
  // period as "how long" is.
  const headerCounters = useMemo(
    () => counterTotalsIn(visibleDates, days, isIgnored),
    [visibleDates, days, isIgnored],
  )
  const headerActivityMinutes = useMemo(
    () => activityMinutesIn(visibleDates, days, slots, isIgnored),
    [visibleDates, days, slots, isIgnored],
  )
  const counterGroups = useMemo(
    () =>
      periodCounterGroups({
        activities,
        activityMinutes: headerActivityMinutes,
        units: counterUnits,
        totals: headerCounters,
        categories: settings.categories || [],
        grouping,
      }),
    [
      activities,
      headerActivityMinutes,
      counterUnits,
      headerCounters,
      settings.categories,
      grouping,
    ],
  )
  const hidden = hiddenGroups ?? new Set(counterGroups.map((g) => g.id))
  const toggleGroup = (id: string) => {
    const next = new Set(hidden)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setHiddenGroups(next)
  }
  /**
   * Rearranging shows everything, rather than going back to the folded
   * default. Switching to By category is a question — *how do these divide
   * up* — and answering it with an empty section means every switch has to be
   * followed by a second click to see what you just asked about. The folded
   * default is about opening the page, which is a different moment.
   */
  const regroup = (next: CounterGrouping) => {
    setGrouping(next)
    setHiddenGroups(new Set())
  }
  const allHidden =
    counterGroups.length > 0 && counterGroups.every((g) => hidden.has(g.id))

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
          {/* Bigger than the section headings below it, and that is the whole
              job: Counters, Days, Summary and Trends are all subsections *of
              this period*, and at one weight the reader has to work out which
              contains which. */}
          <h2 className="font-sans font-extrabold uppercase tracking-tight text-lg sm:text-xl">
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

      {/* The period's own note, directly under its heading. It belongs to the
          period rather than to anything inside it, and sitting below the
          counters it read as a footnote to them. */}
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

      {counterGroups.length > 0 && (
        <div className="mb-4">
          {/* The switches ride on the heading's line, hard right. They say
              what you are looking at; the box below is what you are looking
              at, and stacked together inside it the switches read as the
              first row of the data. `min-w-0` on the heading so a long one
              shrinks rather than pushing them off the edge. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-2">
            <h3 className={`${SECTION_HEADING} min-w-0`}>Counters</h3>
            <CounterControls
              className="ml-auto"
              groups={counterGroups}
              grouping={grouping}
              onGrouping={regroup}
              hidden={hidden}
              onToggle={toggleGroup}
              onSetAll={(hideAll) =>
                setHiddenGroups(
                  hideAll ? new Set(counterGroups.map((g) => g.id)) : new Set(),
                )
              }
            />
          </div>
          {allHidden ? (
            /* A line rather than nothing, and no surface under it: an empty
               box is a thing that failed to load, where a sentence is a state
               you put it in. It carries no background for the same reason —
               there is nothing here to hold. */
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink/30">
              All counters hidden
            </p>
          ) : (
            /* A surface of its own, and a **recessed** one: recessed rather
               than raised because the streak row above it is raised, and this
               is the period's reference rather than the thing you came to
               protect. */
            <div className="rounded-2xl bg-ink/[0.04] px-3 py-3 sm:px-4">
              <CounterGroupList
                groups={counterGroups.filter((g) => !hidden.has(g.id))}
              />
            </div>
          )}
        </div>
      )}

      {sleepSection}

      {/* The days themselves. It needed a name once Counters had one — two
          unlabelled blocks under one heading read as one block with a gap in
          it. "Days" rather than "Calendar" because it has to be true in every
          period: one day, seven of them, a month of them, a year of them. */}
      <h3 className={`${SECTION_HEADING} mb-2`}>Days</h3>

      {granularity === "month" && (
        <MonthGrid
          cursor={cursor}
          days={days}
          slots={slots}
          activities={activities}
          settings={settings}
          counterUnits={counterUnits}
          grouping={grouping}
          hiddenGroups={hidden}
          categories={settings.categories || []}
          todayKey={todayKey}
          verdictOf={verdictOf}
          onEditDay={onEditDay}
          weekIgnore={weekIgnore}
          monthIgnore={monthIgnore}
        />
      )}
      {(granularity === "week" || granularity === "day") && (
        /* `onQuickAddDay` and `onQuickAddSlotDay` go to day and week alike.
           They used to be week-only, which meant the one view built to give a
           day room was the one view with no way to add anything to it — and
           once logging sleep moved into that dialog, no way at all. */
        <FullCardGrid
          dates={visibleDates}
          days={days}
          slots={slots}
          activities={activities}
          settings={settings}
          counterUnits={counterUnits}
          todayKey={todayKey}
          onEditDay={onEditDay}
          weekIgnore={weekIgnore}
          monthIgnore={monthIgnore}
          big={granularity === "day"}
          commentsOpen={commentsOpen}
          onQuickAddDay={onQuickAddDay}
          onQuickAddSlotDay={onQuickAddSlotDay}
          onExpandDay={onExpandDay}
          canFreezeDay={canFreezeDay}
          onFreezeDay={onFreezeDay}
          onUpdateDay={onUpdateDay}
          verdictOf={verdictOf}
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
          activities={activities}
          counterUnits={counterUnits}
          settings={settings}
          todayKey={todayKey}
          onSelectDay={onEditDay}
          isIgnored={isIgnored}
          showMonths
        />
      )}

    </div>
  )
}
