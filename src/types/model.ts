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
 * - `check` — *did it happen?* Three answers rather than two, because "I chose
 *   not to today" is a different thing from "it did not happen" — see
 *   `CheckState`.
 *
 * `spec 008` said a boolean is a counter that stops at one, and that was true
 * enough to ship `oncePerDay` on. It stopped being true the moment a skip had
 * to be told apart from a no.
 */
export type CounterKind = "tally" | "check"

/**
 * What a check says about one day — **three answers, and no fourth**.
 *
 * There used to be an `unknown`, which was the resting state of an unanswered
 * day and resolved to `no` once that day was over. It was there so that every
 * check could be drawn on every day card as a checklist you were meant to
 * clear, and it earned its place while that was the design.
 *
 * It stopped earning it. A project with twenty checks cannot draw them all on
 * a day card any more than it draws its twenty activities; a rule can now
 * *require* an answer, which reminds you better than a chip does; and — the
 * part that was actually wrong — **a check you did not answer is not a check
 * you failed**, and resolving it to `no` asserted that it was.
 *
 * So a check behaves like every other counter: recorded when it happens,
 * absent when it does not. Absence is not a state, so `checkState()` returns
 * `null` for it. See `spec 011`, Part 2.
 */
export type CheckState = "yes" | "no" | "skip"

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
   * `unitId -> "no" | "skip"` for the check counters — the two answers a count
   * cannot carry. See `CheckMark`; `checkState()` is the only place the three
   * are worked out from these two plus the count.
   *
   * A unit with no key here and no count has **not been answered**, which is
   * not an answer and never resolves into one.
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
  /**
   * Which kind of counter inside a category or tag is counted — the finer half
   * of `measure`, and only meaningful when that is `count`.
   *
   * A tally and a check both measure occurrences, and they are still not the
   * same question: "three slips" and "three days answered yes" are different
   * promises that a set can hold at once. Absent means every counter under the
   * set, which is how every rule written before this read, so nothing moves.
   */
  memberKind?: CounterKind
}

/**
 * What one weekday asks for: the day's own bounds, and optionally bounds on
 * particular slots within it.
 *
 * `slots` here overrides the condition's shared `slots` for that weekday —
 * the "different slots on different days" case, which is rare enough that
 * nothing has to carry it unless it is used.
 */
export interface DayRequirement {
  min?: number
  max?: number
  slots?: Record<string, { min?: number; max?: number }>
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
   * What is being measured — **one or more things, added together**.
   *
   * "Any of Lessons, Q&A or Polishing, at least three hours" is one promise
   * about study, and writing it as three rules would be three streaks to keep
   * and three allowances to spend. Every target here must measure the same
   * thing; the form will not let you mix minutes with occurrences, because a
   * condition carries one number.
   *
   * `clauseTargets()` is the only place that knows this was once a single
   * target, and before that a bare counter id.
   */
  targets?: StreakTarget[]
  /** @deprecated Superseded by `targets`. Read through `clauseTargets()`. */
  target?: StreakTarget
  /**
   * The floor: how much there has to be. Absent means no floor.
   *
   * **Both bounds at once, and that is the point of the pair.** `op` could say
   * one or the other and never both, so "between two and four hours" was
   * unwritable — you got a rule that stopped you overdoing it or a rule that
   * made you turn up, never the one that meant what you actually wanted.
   */
  min?: number
  /** The ceiling: how much there may be at most. Absent means no ceiling. */
  max?: number
  /** @deprecated One bound at a time. Read through `clauseBounds()`. */
  op?: StreakOp
  /** @deprecated The number `op` pointed at. Read through `clauseBounds()`. */
  value?: number
  /**
   * A different requirement on different weekdays, keyed the way `getDay()`
   * keys them — 0 is Sunday.
   *
   * Real goals are not one number: three hours most days, ninety minutes on
   * Thursday. Saying that took seven conditions before, which then drifted
   * apart the first time any of them was edited.
   *
   * **A weekday with no entry here is a weekday the condition does not
   * judge**, which is why this replaces `weekdays` rather than sitting beside
   * it: "no requirement" and "not asked about" were always the same thing, and
   * keeping two fields for it is two ways for them to disagree.
   *
   * Absent means the condition asks the same thing every day it covers — the
   * common case, and it stays a single pair of numbers rather than seven
   * copies of one.
   */
  days?: Record<number, DayRequirement>
  /**
   * A requirement on a **particular slot**, on top of whatever the day as a
   * whole asks for.
   *
   * This is the case the old model could not express at all: *two hours on
   * Monday, of which at least one must be in the morning, and the rest
   * wherever.* `slotIds` says where the day's own figure is counted; this says
   * that a named slot has its own floor or ceiling, and both apply.
   *
   * Shared across every weekday the condition judges. A day may override it
   * through `DayRequirement.slots`.
   */
  slots?: Record<string, { min?: number; max?: number }>
  /**
   * **Checks, judged by the day**: which answers each weekday will accept.
   *
   * A check is not a number, so a floor and a ceiling say nothing useful about
   * one — "Overslept at most 0 times" is a sentence nobody would write. What a
   * day actually asks is *which of the three answers is acceptable today*:
   * `yes` on a workday, `yes` or `skipped` at the weekend.
   *
   * An unanswered check satisfies nothing. That is the whole reminder
   * mechanism: a weekday you did not want to be asked about is a weekday you
   * leave out of this map, and one you left in is one you have to answer.
   *
   * Keyed like `days`, the way `getDay()` keys them — 0 is Sunday.
   */
  allow?: Record<number, CheckState[]>
  /**
   * **Checks, judged by the week**: how many of each answer the week needs.
   *
   * `{ yes: { min: 6 }, no: { max: 0 } }` is *six good days, no bad ones, and
   * the seventh may be skipped* — the rule people actually want and the one
   * a single number could never express, because it is three requirements
   * about three different answers.
   *
   * A state left out is unconstrained, which is what "skipped: any" means.
   */
  states?: Partial<Record<CheckState, { min?: number; max?: number }>>
  /**
   * A note on this condition — why it is here, in your own words.
   *
   * The rule already carries one, and with several conditions that is the
   * wrong grain: *no YouTube in the evening* and *two hours of lessons* are
   * one promise for two different reasons, and a single note has to be about
   * neither of them to be about both.
   *
   * Not a term. Nothing the lock protects, because nothing here changes what
   * a day is worth.
   */
  note?: string
  /** Slotted targets only. Empty means the whole day. */
  slotIds?: string[]
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
   *
   * Read through `clauseWeekdays()`, which prefers `days` when it is there:
   * per-day numbers already say which weekdays are judged, by having a figure
   * for them, and two fields answering one question is two ways to disagree.
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
   * How much of the day this rule is about, 1 to 5. Absent is 1.
   *
   * **Drawing only.** It sets how long the rule's arc is in the day's ring and
   * where in the ring it starts — the heaviest first, at twelve o'clock, so
   * the same rule sits in the same place on every day of the month. It changes
   * no verdict: the day is still missed the moment anything is missed, and a
   * missed arc keeps a floor on its length so a weighted ring can never read
   * as a score.
   *
   * That constraint is the whole design. A ring 90% green on a broken day says
   * "basically fine" far louder than five equal segments with one red one, and
   * the moment 4/5 almost counts the verdict has stopped being a verdict. If
   * a rule genuinely should count for less, the honest way to say so is to
   * stop it voting — see `inDayVerdict`.
   */
  weight?: number
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
   * Every loosening this rule has had, and why — `spec 010`, part 7.
   *
   * The reason is required and it lives **here**, written in the same
   * operation as `lockedUntil`, rather than in `change_log`: that table's
   * writes are deliberately best-effort so a logging failure can never raise
   * the save banner, which is right for a convenience and fatally wrong for an
   * obligation. A reason that can silently fail to save is not one.
   *
   * Append-only, and shown back to you. Being made to write "lowered the gym
   * target because I could not be bothered" is most of the mechanism; being
   * able to read the last six of those is the rest of it.
   */
  looseningLog?: Loosening[]

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
 * Something you have decided to let yourself have — `spec 010`, part 6.
 *
 * Not a game reward. Buying it here is **permitting yourself to buy it in
 * life**, which puts this in the same family as the edit lock rather than in
 * the same family as points: the app is the ledger of a promise you made
 * yourself about spending.
 *
 * Priced in **points**, the balance's unit — a number you cannot
 * re-invent the way you can re-invent "50,000 points", and the same thing the
 * streak already counts, which is what stops a second economy existing at all.
 */
export interface ShopItem extends Labeled {
  /** In points. */
  price: number
  /** The day it was written. Its own grace day, like a rule's `startedOn`. */
  createdOn: DayKey
  /** No **lowering** of the price before this date. */
  lockedUntil: DayKey
  /** Every time it was made cheaper, and why. Same rule as a streak's. */
  looseningLog?: Loosening[]
}

/**
 * A reward taken. Append-only and never refunded: the point of the ritual is
 * that it costs something, and something you can undo costs nothing.
 *
 * `label` and `price` are stored with it so the row still reads after the item
 * is deleted — that purchase happened.
 */
export interface Purchase {
  id: string
  itemId: string
  label: string
  price: number
  boughtAt: string
}

/**
 * **A count of days that went well** — `spec 014`.
 *
 * The three separate sources this replaces were three points in one space, and
 * naming them separately hid the axes they differ along. Written out, the same
 * shape says a great deal more than the three did:
 *
 * | you want | `ruleId` | `consecutive` | `weekdays` | `scale` |
 * | --- | --- | --- | --- | --- |
 * | 30 kept days in a row | — | yes | — | day |
 * | 100 kept days in all | — | no | — | day |
 * | 10 kept weeks in a row | — | yes | — | week |
 * | 30 days of one rule, ever | that rule | no | — | day |
 * | 4 green Mondays in a row | — | yes | `[1]` | day |
 *
 * **`consecutive` is the axis that was missing entirely.** Every source was a
 * run, so *thirty days of studying* could only ever mean thirty in a row —
 * and *thirty days of it, whenever they happened* is a different and equally
 * real thing to have done.
 *
 * **The weekdays are a filter on which days are looked at**, not a bound on
 * them. Consecutive means consecutive *among those* — four Mondays in a row is
 * four Mondays with no broken Monday between them, whatever the Tuesdays did.
 */
export interface AchievementRun {
  /** Whose verdict decides a day. Absent is the composite: every voting rule. */
  ruleId?: string
  /** In a row, or however many there have ever been. */
  consecutive: boolean
  /** Which weekdays are counted. Absent is all of them. */
  weekdays?: number[]
  /** Days, or whole weeks. A week has no weekday to filter on. */
  scale: "day" | "week"
}

/**
 * The stretch a total is measured over — `spec 014`.
 *
 * **`ever` makes most totals inevitable.** Study at all and you will pass a
 * hundred hours; the only question is when, and an achievement you cannot fail
 * to earn is a calendar rather than a goal. A window turns the same figure
 * into a record — the best single day, week or month there has ever been — and
 * `100h in one month` can be missed forever.
 *
 * Read as the maximum over every window in the history, so it is earned the
 * first time one clears the bar and, like every ledger here, never un-earned
 * by what a later one does.
 */
export type AchievementWindow = "ever" | "day" | "week" | "month"

/**
 * What an achievement counts.
 *
 * Two kinds, and the split is real rather than cosmetic: a **run** is a figure
 * the app keeps for you and you pick one of them, while a **total** is
 * anything you record, named the way a streak condition names it.
 *
 * `spec 010` capped this at three sources, on the reasoning that a wider list
 * would make the editor a second rule builder. That instinct was right and the
 * line was in the wrong place: what makes a rule builder is conditions,
 * weekday maps, slot bounds and a pair of opposing limits, and an achievement
 * has none of those. It may count anything it likes.
 *
 * - `keptDays` — the composite streak: days on which every voting rule held.
 * - `keptWeeks` — the same at the larger scale, which is the one that survives
 *   a single bad Tuesday.
 * - `ruleStreak` — one rule's own streak, for a promise you want counted
 *   separately from the day's verdict.
 * - `total` — what was recorded against one or more targets, in its own
 *   measure: minutes for an activity or study time, occurrences for a counter
 *   or tag.
 */
export type AchievementSource =
  | { kind: "run"; run: AchievementRun }
  /** @deprecated Read through `runOf()`. `{ consecutive, scale: "day" }`. */
  | { kind: "keptDays" }
  /** @deprecated Read through `runOf()`. `{ consecutive, scale: "week" }`. */
  | { kind: "keptWeeks" }
  /** @deprecated Read through `runOf()`. A run with a `ruleId` on it. */
  | { kind: "ruleStreak"; ruleId: string }
  | {
      kind: "total"
      /**
       * @deprecated Read through `achievementTargets()`, which knows this was
       * once a single target. Kept so an achievement written before several
       * were allowed still reads as itself.
       */
      target?: StreakTarget
      /** One or more, summed. `100h of “Lessons” or “Q&A”` is one goal. */
      targets?: StreakTarget[]
      /** Absent means `ever`, which is what every one of these used to be. */
      window?: AchievementWindow
    }

/**
 * A thing you reached once and cannot lose — `spec 010`, part 5.
 *
 * Everything else in this app is built on fear: a streak is what you lose, a
 * red day is what you avoid. That works and it is one-sided. An achievement is
 * the other pole, and the only reason the history is worth having accumulated
 * rather than merely survived.
 *
 * Written by you, and there should be few. A generated 30/60/100 ladder across
 * five rules is thirty achievements, which is the dilution problem wearing a
 * rosette.
 */
export interface Achievement extends Labeled {
  source: AchievementSource
  /** The number to reach. Minutes when the source measures time. */
  threshold: number
  /** The day it was written. Its own grace day, like a rule's `startedOn`. */
  createdOn: DayKey
  /** No **lowering** of the threshold before this date. See `ruleEdit`. */
  lockedUntil: DayKey
  /** Every time it was made easier, and why. Same rule as a streak's. */
  looseningLog?: Loosening[]
}

/**
 * An achievement earned, written once with its date and never recomputed.
 *
 * In its own ledger rather than in `settings`, and that is the whole point:
 * the hand that edits the definitions must not be the hand that edits what was
 * earned. In `settings` an achievement would be forgeable.
 */
export interface EarnedAchievement {
  achievementId: string
  earnedAt: string
  /** What the figure stood at. Kept so a deleted definition still reads. */
  value: number
}

/**
 * One finished day's mark on the balance, written once and never revisited.
 *
 * A ledger for the same reason the verdicts are, and more so: this one can be
 * *spent*. A day's mark is written when the day leaves the editing window and
 * never looked at again, so editing yesterday cannot retroactively change a
 * balance you have already bought something with.
 */
export interface DayMark {
  date: DayKey
  kept: boolean
  sealedAt: string
}

/**
 * One rule's verdict on one finished week, written once and never revisited —
 * an append-only ledger for the same reason `WeekVerdict` is. Re-breaking and
 * re-fixing a past week must not mint a second reward.
 */
/** Where a request to loosen a rule has got to. */
export type ProposalState =
  | "pending"
  | "approved"
  | "refused"
  | "withdrawn"
  | "closed"

/**
 * A loosening waiting on somebody else — `spec 010`, part 7.
 *
 * The supervisor **approves rather than edits**: you still author your own
 * rules, you simply cannot weaken one alone. Two gates in series, not one
 * instead of the other — the clock still has to run out before a request can
 * even be sent.
 *
 * **Self-describing, and that is what keeps it safe.** It carries the project
 * name, the rule label and the terms before and after as plain text, so the
 * decision can be made without reading the project at all. Every other table
 * therefore keeps the policy it has always had: yours, and nobody else's. If
 * this ever stops being true, the blast radius comes back.
 */
export interface RuleProposal {
  id: string
  projectId: string
  ownerId: string
  supervisorId: string
  ruleId: string
  projectName: string
  ruleLabel: string
  /** The rule as it reads now, and as it would read. */
  beforeText: string
  afterText: string
  reason: string
  /** Applied verbatim by the owner's app once allowed. */
  nextRule: StreakRule
  state: ProposalState
  createdAt: string
  decidedAt?: string | null
}

/** One loosening, with the reason that had to be given for it. */
export interface Loosening {
  at: DayKey
  reason: string
}

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
  /**
   * The seven per-weekday figures the day is measured against, in minutes.
   *
   * Standing in for these, when one is nominated, is the **benchmark** rule —
   * see `benchmarkRuleId` and `lib/benchmark.ts`. These stay stored either
   * way: nominating a rule is a change of source, not a deletion, and taking
   * the nomination away has to put something back.
   */
  dailyGoals: Record<number, number>
  /**
   * Which rule supplies the day's goal, if any.
   *
   * Display only — it moves where a printed figure comes from and changes no
   * verdict, which is why it sits outside the lock and needs no written
   * reason. Re-checked on every read, since a rule can be edited into
   * something that no longer qualifies.
   */
  benchmarkRuleId?: string
  /**
   * When freeze accounting started — set the first time the effectiveness
   * meter is on and a week is sealed. Weeks that ended before it never grant,
   * or switching the feature on would pay out the whole history at once.
   */
  freezeStart?: DayKey | null
  /**
   * Every time the weekly goal total was *lowered*, in order.
   *
   * @deprecated It existed because lowering the bar was the one edit that
   * could buy a green week, and the main streak had no other defence. That
   * streak went in `spec 010`; the goal itself went in `spec 011`, along with
   * the tab that could lower it. There is nothing left to guard. Left in the
   * type so old rows still parse, and unread.
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
  /**
   * The day the balance started counting.
   *
   * Written once, the first time the app runs with the ledger present. Without
   * it the whole history would seal in one second and the first purchase would
   * be free — the same reason `startedOn` exists on a rule.
   */
  balanceStart?: DayKey | null
  /** The achievements you have written. In `settings`, like `tags`. */
  achievements?: Achievement[]
  /** The rewards you have decided to let yourself have. In `settings`, too. */
  shop?: ShopItem[]
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
  /** Sealed day marks, keyed by the day. Append-only — see `DayMark`. */
  dayLedger?: Record<DayKey, DayMark>
  /** Earned achievements, keyed by their id. Append-only. */
  earned?: Record<string, EarnedAchievement>
  /** Rewards taken, keyed by the purchase's own id. Append-only. */
  purchases?: Record<string, Purchase>
  /**
   * The user ids allowed to decide this project's loosenings. Empty is the
   * ordinary case, and then the clock is the only gate.
   */
  supervisors?: string[]
  /** Loosenings raised against this project, keyed by proposal id. */
  proposals?: Record<string, RuleProposal>
}

export interface AppData {
  activeProjectId: string
  projects: Project[]
  /**
   * Loosenings waiting on **you**, in projects you do not own and cannot see.
   * Everything needed to decide one is on the proposal itself.
   */
  supervising?: RuleProposal[]
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
