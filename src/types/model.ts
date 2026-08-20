/* ---------------------------------------------------------------
   The in-memory shape of the app's data.

   One object holds everything; every view below the root receives it and
   nothing else. The server shape is different — four tables, not one
   document — and the data layer is where the two meet. Nothing above it
   should ever see a row.
--------------------------------------------------------------- */

/** A slot or a category: both are a labelled, coloured, icon-bearing id. */
export interface Labeled {
  id: string
  label: string
  color: string
  iconName: string
  /** Optional "what counts as this", written in Setup. */
  description?: string
}

export type Slot = Labeled
export type Category = Labeled

/**
 * How a unit reads when it moves. Stored and configurable from the start, but
 * nothing consumes it yet — everything that could have is being redesigned
 * around counter units (`spec 008`). It is here so the data is already right
 * when the statistics come back.
 */
export type CounterRelation = "positive" | "neutral" | "negative"

/**
 * A thing you tally per day, against a total when one is known.
 *
 * Replaces `lessons` (a number) and `exam` (a boolean), which were never two
 * features — they were this one, built twice. A boolean is a counter that
 * stops at one, so the exam flag migrated to a unit whose values happen to be
 * 0 or 1 and nothing downstream has to know which kind it started as.
 */
export interface CounterUnit extends Labeled {
  /**
   * How many there are in all, when that is known. Absent for anything
   * open-ended. Deliberately not called a target or a goal: a unit can count
   * something you would rather do less of, and reaching its total is then the
   * opposite of the idea.
   */
  total?: number
  relation: CounterRelation
}

/** `"HH:MM"`, zero-padded. Compared as text in places, so the padding matters. */
export type TimeOfDay = string

/** `"YYYY-MM-DD"` for days and weeks (the Monday), `"YYYY-MM"` for months. */
export type DayKey = string

/**
 * Study time and sleep share a shape. `minutes` stays the authoritative
 * number even when both times are set — `spanMinutes` derives it, but what
 * was stored is what counts.
 */
export interface TimeEntry {
  id: string
  minutes: number
  comment?: string
  start?: TimeOfDay
  end?: TimeOfDay
}

/** Study time carries a category; sleep has neither slot nor category. */
export interface StudyEntry extends TimeEntry {
  category?: string
}

export type SleepEntry = TimeEntry

/**
 * A day holds two independent lists. `cells` is study time, keyed by slot,
 * and every figure in the app comes from it. `sleep` is a separate axis and
 * must never reach a breakdown, a range stat or a goal.
 */
export interface Day {
  cells?: Record<string, StudyEntry[]>
  sleep?: SleepEntry[]
  /**
   * `unitId -> slotId -> value`. Three lessons can be two in the morning and
   * one in the evening; the day's figure for a unit is the sum of its slots,
   * so nothing stores the same number twice and the two cannot disagree.
   *
   * Unit first because almost every read is "how many of this unit today".
   * Counts recorded for the day rather than for any part of it sit under
   * `UNSLOTTED` — everything migrated from `lessons`/`exam` is there, since
   * those never had a slot and inventing one would be making data up.
   *
   * A unit the day never touched has no key at all rather than a zero:
   * "none recorded" and "recorded as none" are different things.
   */
  counters?: Record<string, Record<string, number>>
  /**
   * Superseded by `counters` in `spec 008`, kept so the columns behind them
   * stay readable until the new shape has been trusted for a while. Nothing
   * should add a new read of either.
   * @deprecated
   */
  lessons?: number
  /** @deprecated see `lessons` */
  exam?: boolean
  /** "Ignore in statistics" — excluded everywhere a number is reported. */
  ignore?: boolean
  /**
   * A streak freeze was spent on this day. Permanent once set: settings never
   * rewrite it, and there is no refund if the day is later logged up to green.
   */
  frozen?: boolean
  comment?: string
}

/**
 * One finished week's verdict, written once and never revisited. See
 * `migrations/005_freezes.sql` for why it is a ledger rather than a
 * recomputation.
 */
export interface WeekVerdict {
  /** The Monday of the week. */
  weekKey: DayKey
  earned: boolean
  sealedAt: string
}

export interface Settings {
  /**
   * The four fields lessons and exams were configured through. Superseded by
   * counter units in `spec 008` — optional now so nothing new has to write
   * them, and still typed so `legacyUnits` can read them out of a document
   * that predates the change.
   * @deprecated
   */
  totalLessons?: number
  /** @deprecated see `totalLessons` */
  totalExams?: number
  /** @deprecated see `totalLessons` */
  lessonsEnabled?: boolean
  /** @deprecated see `totalLessons` */
  examsEnabled?: boolean
  goalsEnabled: boolean
  sleepEnabled: boolean
  startDate: DayKey | null
  endDate: DayKey | null
  projectName: string
  projectIcon: string
  /** Minutes, keyed by `Date.getDay()` — 0 is Sunday. */
  dailyGoals: Record<number, number>
  /**
   * When freeze accounting started — set the first time the effectiveness
   * meter is on and a week is sealed. Weeks that ended before it never grant,
   * or switching the feature on would pay out the whole history at once.
   */
  freezeStart?: DayKey | null
  /**
   * Every time the weekly goal total was *lowered*, in order.
   *
   * A ledger rather than a flag, and for the same reason the freeze verdicts
   * are: it records what happened at a moment, so it cannot be undone by
   * putting the number back. Lowering the bar is the one edit that would let
   * you buy a green week, so the week it lands in earns no freeze — and the
   * streaks panel can say so, with the figures, instead of a freeze quietly
   * failing to appear.
   */
  goalCuts?: GoalCut[]
}

export interface GoalCut {
  /** Monday of the week the cut landed in — the week that forfeits. */
  weekKey: DayKey
  at: string
  /** Weekly goal in minutes, before and after. */
  from: number
  to: number
}

export interface ChangeLogEntry {
  id: string
  at: string
  title: string
  details: string[]
}

export interface Project {
  id: string
  settings: Settings
  slots: Slot[]
  categories: Category[]
  /** Sortable, like slots and categories. Empty on a project that tallies nothing. */
  counterUnits: CounterUnit[]
  days: Record<DayKey, Day>
  /** Keyed by the Monday of the week. */
  weekNotes: Record<DayKey, string>
  /** Keyed by `"YYYY-MM"`. */
  monthNotes: Record<DayKey, string>
  weekIgnore: Record<DayKey, boolean>
  monthIgnore: Record<DayKey, boolean>
  /** Newest first, capped at `CHANGE_LOG_LIMIT`. */
  changeLog?: ChangeLogEntry[]
  /** Sealed week verdicts, keyed by the Monday. Append-only. */
  weekVerdicts?: Record<DayKey, WeekVerdict>
}

export interface AppData {
  activeProjectId: string
  projects: Project[]
}

/**
 * Whether a day is out of the statistics. Threaded through everything that
 * reports a number, so the two halves of the page cannot disagree.
 */
export type IsIgnored = (key: DayKey, entry?: Day) => boolean

/** `"frozen"` is a miss a streak freeze was spent on. See `lib/freezes.ts`. */
export type GoalOutcome = "met" | "frozen" | "missed" | null

export interface DayTotals {
  bySlot: Record<string, number>
  byCategory: Record<string, number>
  total: number
}

export type PeriodId =
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "all"
  | "custom"

export interface DateRange {
  start: Date
  end: Date
}
