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
  lessons?: number
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
  totalLessons: number
  totalExams: number
  lessonsEnabled: boolean
  examsEnabled: boolean
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
