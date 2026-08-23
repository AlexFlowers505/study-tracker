/* ---------------------------------------------------------------
   The in-memory shape of the app's data.

   One object holds everything; every view below the root receives it and
   nothing else. The server shape is different — four tables, not one
   document — and the data layer is where the two meet. Nothing above it
   should ever see a row.
--------------------------------------------------------------- */

/** A slot or an activity: both are a labelled, coloured, icon-bearing id. */
export interface Labeled {
  id: string
  label: string
  color: string
  iconName: string
  /** Optional "what counts as this", written in Setup. */
  description?: string
}

export type Slot = Labeled

/**
 * A thing time is logged against — Lessons, Q&A, Polishing questions.
 *
 * One of the three kinds a counter can be: an activity records **time**, a
 * tally records a count, a check records an answer. It keeps its own list
 * rather than joining `counterUnits`, so nothing that walks the counters has
 * to learn to skip it — see the note in CLAUDE.md.
 */
export interface Activity extends Labeled {
  /** The category grouping it, if any. See `Category`. */
  categoryId?: string
}

/**
 * A grouping of counters — one per counter, unlike a tag.
 *
 * That is the whole difference, and it is what each is for. A tag answers
 * "what else is this like", so a counter wears as many as are true. A category
 * answers "where does this belong", and a thing that belongs in two places
 * does not have a place — which is why Setup can lay every counter out under
 * category headings and be sure each appears exactly once.
 *
 * Same shape as a slot or a tag, so it edits through the same list, and it
 * lives in `settings` for the same reason tags do: no migration.
 */
export type Category = Labeled

/**
 * How a unit reads when it moves. Stored and configurable from the start, but
 * nothing consumes it yet — everything that could have is being redesigned
 * around counter units (`spec 008`). It is here so the data is already right
 * when the statistics come back.
 */
export type CounterRelation = "positive" | "neutral" | "negative"

/**
 * The two questions a counter can answer, which are not the same question.
 *
 * - `tally` — *how many?* Three lessons, eleven pages, none. A number per slot.
 * - `check` — *did it happen?* Not a number, and not a plain yes/no either: at
 *   nine in the morning you do not yet know whether you overslept, and a "no"
 *   recorded then is a claim about the rest of the day you are not entitled to
 *   make. So a check has four states — see `CheckState`.
 *
 * `spec 008` said a boolean is a counter that stops at one, and that was true
 * enough to ship `oncePerDay` on. It stopped being true the moment "I do not
 * know yet" and "it did not happen" had to be told apart.
 */
export type CounterKind = "tally" | "check"

/**
 * What a check says about one day.
 *
 * `unknown` is the resting state of a day still in progress, and it resolves
 * to `no` the moment the day is over — which is what makes the common case
 * cost nothing to record. `no` exists so a day inside the editing window can
 * be closed deliberately; nothing downstream tells it apart from an unrecorded
 * day that has ended.
 */
export type CheckState = "unknown" | "yes" | "no" | "skip"

/**
 * The two marks a count cannot express, and therefore the only two that get
 * stored. `yes` is a count of one, in `Day.counters` where it already lived;
 * `unknown` is the absence of everything.
 *
 * Keeping `yes` as a count is what lets every existing reader of counts — the
 * badges, the period chips, the filter, both counter chart modes — go on
 * working without knowing checks exist, and keeps "how many times did I
 * oversleep in July" a question with an answer.
 */
export type CheckMark = "no" | "skip"

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
   * Which question this counter answers — see `CounterKind`. Absent on
   * anything written before the split, and read as `"tally"` unless
   * `oncePerDay` says otherwise; `counterKind()` is the only place that rule
   * lives.
   */
  kind?: CounterKind
  /**
   * How many there are in all, when that is known. Absent for anything
   * open-ended. Deliberately not called a target or a goal: a unit can count
   * something you would rather do less of, and reaching its total is then the
   * opposite of the idea.
   */
  total?: number
  /**
   * The tags on this unit. Many, because that is what a tag is — "good" and
   * "health" are not competing answers to one question the way the old fixed
   * `relation` was.
   */
  tagIds?: string[]
  /**
   * The category grouping this counter, if any. One at most — see `Category`
   * for why that is the point rather than a limitation.
   */
  categoryId?: string
  /**
   * Tops out at one a day: oversleeping, or anything else that either happened
   * or did not.
   *
   * @deprecated Superseded by `kind: "check"`, which says the same thing and
   * more. Still read by `counterKind()` as the default for a unit written
   * before the split — that reading is exact, since this was only ever set on
   * things that either happened or did not — and left in the data so an
   * upgrade throws nothing away.
   *
   * A **limit**, not a switch turning counting off — which is why it can sit
   * on a thing called a counter without contradicting it. It still counts; it
   * just cannot get past one. (`exam` arrived here the same way: it was a
   * boolean, and a boolean is a counter that stops at one.)
   */
  oncePerDay?: boolean
  /**
   * @deprecated Replaced by `tagIds`. Never read; left in the type so old
   * rows still parse, and left in the data so nothing anybody typed is thrown
   * away by an upgrade.
   */
  relation?: CounterRelation
}

/**
 * A tag — a user-defined tag on a counter unit.
 *
 * It replaces a fixed three-way `relation` (positive / neutral / negative),
 * which was the app deciding in advance what the only interesting thing about
 * a counter could be. Those three are still a perfectly good set of tags;
 * the difference is that they are now yours to name, colour, describe and
 * extend, and a unit can carry several.
 *
 * Same shape as a slot or an activity, so it edits through the same list.
 */
export type Tag = Labeled

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

/** Study time carries an activity; sleep has neither slot nor activity. */
export interface StudyEntry extends TimeEntry {
  /**
   * What the time went on — an id from `Project.activities`.
   *
   * These were called categories until the word was needed for something
   * else: a category is now a grouping *of* counters, and an activity is one
   * of the three things a counter can be. Nothing about the entity changed,
   * only its name — and the ids did not change at all, which is why the
   * migration is a rename rather than a move.
   */
  activity?: string
  /**
   * What `activity` was called in storage. Read through `entryActivity()`
   * until `migrations/013` has run everywhere, and left in the data after
   * that so nothing anybody logged depends on the order two deployments
   * happened in.
   * @deprecated
   */
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
   * The custom-streak rules a freeze has been spent on for this day.
   *
   * Permanent once set, like `frozen`. A **weekly** rule's freeze is recorded
   * on the Monday of the week it covers — the week has no row of its own, and
   * its first day is the one place both halves of the app can agree to look.
   */
  ruleFreezes?: string[]
  /**
   * `unitId -> "no" | "skip"` for the check counters — the two states a count
   * cannot carry. See `CheckMark`; `checkState()` is the only place the four
   * states are worked out from these two plus the count.
   *
   * A unit with no key here is `yes` when it has a count, `unknown` while its
   * day is still running, and `no` once that day is over.
   */
  checks?: Record<string, CheckMark>
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

/** A rule judges a day, or a whole week. */
export type StreakScope = "day" | "week"

/** Which way the comparison runs. `atMost 0` is "never"; `atLeast 1` is "always". */
export type StreakOp = "atLeast" | "atMost"

/**
 * A streak of your own making — `spec 009`.
 *
 * One shape covers every rule the feature was designed against: never
 * oversleep, always get to bed on time, no youtube after the evening starts,
 * three trips to the gym a week, and the gym specifically on Mondays,
 * Wednesdays and Fridays. If a sixth kind of rule will not fit here, the shape
 * is wrong rather than the rule.
 *
 * Read as a sentence, which is how the form writes it: *judge every
 * [scope/weekdays], keeping [unit] in [slots] [op] [value], with
 * [freezesPerWeek] freezes a week.*
 */
/**
 * The five things a condition can be about.
 *
 * A rule started out able to name one counter unit, which was the right shape
 * while a counter was a tally or a check. Once an activity became a kind of
 * counter it stopped being: "at least two hours of lessons a day" is the same
 * sort of promise as "no youtube in the evening", and only one of them could
 * be written.
 *
 * - `unit` — one tally or check, by id.
 * - `activity` — one activity, measured in **minutes**.
 * - `category` — everything filed under it. See `measure`.
 * - `tag` — every counter wearing it, added up. Always a count: nothing that
 *   records time carries tags.
 * - `time` — all study time, whatever it was filed under. The one target with
 *   no id, and the one that makes the project's own daily goal expressible as
 *   a streak of your own.
 */
export type StreakTargetKind = "unit" | "activity" | "category" | "tag" | "time"

export interface StreakTarget {
  kind: StreakTargetKind
  /** Absent for `time`, which names nothing — there is only one of it. */
  id?: string
  /**
   * Which half of a category to read, and the only place the choice arises: a
   * category is the one grouping that can hold both things that record time
   * and things that record a count, and "three" would mean two different
   * questions depending on what happened to be filed under it.
   *
   * Stored explicitly rather than inferred from the members, so filing one
   * more counter under a category cannot silently change what an existing
   * rule measures.
   */
  measure?: "time" | "count"
}

/**
 * One condition inside a rule. A rule is kept on a period when **every** one
 * of its clauses is.
 *
 * Its own entity rather than a second set of fields on the rule, because the
 * useful rules are compound: *no Pinterest on a weekday morning, and no
 * YouTube in the evening or at night, any day.* That is one promise with two
 * conditions, not two streaks — breaking either one breaks the week, and
 * splitting it into two rules would give you two streaks to keep and two
 * allowances to spend, which is a different and weaker thing.
 */
export interface StreakClause {
  id: string
  /**
   * What is being measured. Absent on a condition written when the only
   * answer was a counter unit — `clauseTarget()` is the only place that
   * fallback lives.
   */
  target?: StreakTarget
  /** Slotted targets only. Empty means the whole day. */
  slotIds?: string[]
  op: StreakOp
  /**
   * The number the target is held to. **Minutes** when the target measures
   * time, a count when it measures occurrences — the same unit the app stores
   * everything in, so nothing has to round a duration to say it.
   */
  value: number
  /**
   * Take the limit from the project's daily goal for that weekday instead of
   * from `value`.
   *
   * The goal is seven numbers and a condition carries one, so without this the
   * only way to write "hold me to my daily goal" is seven conditions that
   * drift out of step with the seven fields in Setup the first time either is
   * edited. With it there is one source of truth and the goal stays a display
   * target for anyone who wants no rule about it at all.
   *
   * A **weekly** rule sums the goals of the days its condition covers.
   */
  useDailyGoal?: boolean
  /**
   * Which weekdays this condition applies on. Empty means all of them.
   *
   * Per clause rather than per rule, which is what makes the compound case
   * work at all: the Pinterest half is a weekday rule and the YouTube half is
   * an every-day one, inside the same promise.
   *
   * A weekday left out is **not judged** by this clause — the one honest
   * "does not apply" the feature has, and honest because it is declared in
   * advance and cannot be changed on the morning it would help.
   */
  weekdays?: number[]
  /**
   * The counter this condition used to be able to name, back when a counter
   * was the only thing it could name. Read only through `clauseTarget()`.
   * @deprecated
   */
  unitId?: string
}

/**
 * A streak of your own making — `spec 009`.
 *
 * One shape covers every rule the feature was designed against: never
 * oversleep, always get to bed on time, no youtube after the evening starts,
 * three trips to the gym a week, the gym specifically on Mondays, Wednesdays
 * and Fridays, and any of those combined. If a further kind of rule will not
 * fit here, the shape is wrong rather than the rule.
 *
 * Read as a sentence, which is how the form writes it and how `ruleSentence`
 * reads it back: *judge every [day / week], keeping [this] and [this].*
 */
export interface StreakRule extends Labeled {
  scope: StreakScope
  /**
   * The conditions, all of which must hold. Absent on a rule written before
   * rules could have more than one — `ruleClauses()` is the only place that
   * fallback lives.
   */
  clauses?: StreakClause[]
  /**
   * Granted at the start of every week and **lost unused at the end of it**.
   * The allowance you set yourself, knowing you will not manage seven out of
   * seven.
   */
  freezesPerWeek: number
  /** The ceiling on banked rewards, as `FREEZE_CAP` is the main streak's. */
  freezeCap: number
  /**
   * When this rule came into force. Days before it are not judged.
   *
   * Without it, writing a rule would hand you whatever streak your existing
   * data happens to contain — a sixty-day streak for a promise made this
   * morning, which is not a promise. `settings.freezeStart` exists for exactly
   * the same reason.
   */
  startedOn: DayKey
  /**
   * No **loosening** before this date; narrowing the rule is free at any time.
   * See `ruleEdit` and `isNarrowing` in `lib/customStreaks.ts`.
   */
  lockedUntil: DayKey
  /**
   * Whether this rule's verdict decides the day's colour — `spec 010`, part 1.
   *
   * A day is kept when every participating rule that judges it held, and the
   * streak worth being afraid of is the run of those days. Rules left out
   * still keep their own streak; they simply do not get a vote on the day.
   */
  inDayVerdict?: boolean
  /**
   * The day it started having that vote, set automatically the moment the flag
   * goes on.
   *
   * For exactly one case, and it is real: a rule two months old, ticked into
   * the verdict this morning, would otherwise recompute the composite streak
   * backwards across history you can no longer edit. A newly created rule
   * cannot do this — its `startedOn` is today — which is why this is one field
   * and not a feature. Same reasoning as `startedOn` itself.
   */
  inDayVerdictSince?: DayKey

  /**
   * The single condition a rule used to be, before it could carry several.
   * Read only through `ruleClauses()`, and left in the data so nothing anybody
   * wrote is thrown away by an upgrade.
   * @deprecated
   */
  unitId?: string
  /** @deprecated see `unitId` */
  slotIds?: string[]
  /** @deprecated see `unitId` */
  op?: StreakOp
  /** @deprecated see `unitId` */
  value?: number
  /** @deprecated see `unitId` — weekdays are a clause's own now. */
  weekdays?: number[]
}

/**
 * One rule's verdict on one finished week, written once and never revisited —
 * an append-only ledger for the same reason `WeekVerdict` is. Re-breaking and
 * re-fixing a past week must not mint a second reward.
 */
export interface RuleVerdict {
  ruleId: string
  /** The Monday of the week. */
  weekKey: DayKey
  kept: boolean
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
  /**
   * The project's tags. In `settings` rather than a column of its own
   * because `settings` is already one jsonb blob read as a unit — which is
   * what lets the whole feature ship without a migration.
   */
  tags?: Tag[]
  /** Custom streaks. In `settings` for the same reason `tags` is. */
  streakRules?: StreakRule[]
  /** The project's counter categories. In `settings`, like `tags`. */
  categories?: Category[]
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
  activities: Activity[]
  /** Sortable, like slots and activities. Empty on a project that tallies nothing. */
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
  /** Sealed custom-streak verdicts, keyed `${ruleId}::${weekKey}`. Append-only. */
  ruleVerdicts?: Record<string, RuleVerdict>
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
  byActivity: Record<string, number>
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
