/* ---------------------------------------------------------------
   Setup's Streaks tab — the rules you are going to be judged by.

   The shared half is `EditableList`, like every other tab. What is new is the
   rule, and the rule is written as **a sentence with dropdowns in it**.

   That is the whole design decision here. A grid of labelled fields would
   store the same values and be unreadable: `op: atMost, value: 0` is correct
   and says nothing, where "Youtube in Evening at most 0 times" is the same
   thing said in a way you can disagree with. This is a rule you will live
   under for months, and the only way to check that what you built is what you
   meant is to read it back.

   **A condition names a target, not a counter**, and it is picked in two
   steps: what *kind* of thing — all study time, an activity, a tally, a check,
   a category, a tag — and then which one. One grouped dropdown held all of
   them for a while, and grouping is not the same as choosing: you had to scroll
   past forty names to find out that tags were at the bottom, and there was no
   way to see what kinds existed without opening the list. Two dropdowns make
   the taxonomy the first question, which is the order you think in.

   A condition about an activity or a category of them is measured in hours, so
   its number is a duration rather than a count, and the sentence prints it as
   one.

   **A rule can carry several conditions**, stacked as separate blocks rather
   than run together, because that is what they are: one promise with two
   things to keep. Each block changes shape with what it names — a check asks
   *must it be yes or no*, a tally asks *how many, and where*, an activity asks
   *how long* — and carries its own weekdays, which is what lets one condition
   be a weekday rule and the other an every-day one inside the same promise.

   **A loosening has to be explained.** Not to the app — to you, later. The
   reason is required, it is written in the same operation as the new lock
   date, and it is shown back on the summary. Being made to type "lowered the
   gym target because I could not be bothered" is most of the mechanism;
   being able to read the last few of those is the rest of it.

   **Nothing is written until Done.** Every control used to save on the spot,
   through `ruleEdit` one field at a time, and that turned out to be the wrong
   shape for a thing with a lock on it: a stray scroll over the freeze count
   was a permanent narrowing, and narrowings land immediately by design. Now
   the whole edit is one draft judged once — you can restructure a rule freely,
   and only the difference between where you started and where you finished is
   ever tested. Done is disabled while that difference cannot be proved
   harmless and the clock has not run out, and the line beside it says which.
--------------------------------------------------------------- */

import { Fragment, useState } from "react"
import type { ReactNode } from "react"
import {
  ChevronRight,
  Copy,
  Gauge,
  Hourglass,
  Lock,
  CircleQuestionMark,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react"
import type {
  Activity,
  CheckState,
  DayRequirement,
  Category,
  CounterUnit,
  Settings,
  Slot,
  StreakClause,
  StreakRule,
  StreakTarget,
  Tag,
} from "../types/model"
import { splitByKind } from "../lib/checks"
import type {
  ClauseBounds,
  StreakContext,
  StreakMeasure,
} from "../lib/customStreaks"
import type { Proposal } from "../types/model"
import { benchmarkBar } from "../lib/benchmark"
import {
  boundsOnWeekday,
  clauseBounds,
  slotBoundsOnWeekday,
  clauseSentence,
  clauseWeekdays,
  clauseTarget,
  figuresPerDay,
  slotIdsOnWeekday,
  clauseTargets,
  lockFrom,
  removalGate,
  newClause,
  newStreakRule,
  ruleClauses,
  ruleEdit,
  targetInfo,
  targetMeasure,
} from "../lib/customStreaks"
import {
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  addDays,
  fmtDateLong,
  startOfWeek,
  toKey,
} from "../lib/date"
import { CHECK_CHOICES, CHECK_LABELS } from "../lib/checks"
import { BTN_SOFT, FIELD_SOFT_INLINE, btnBase, cellSurface } from "../lib/theme"
import { segBtn, segBtnStyle } from "../ui/buttonStyles"
import { AutoTextarea } from "../ui/controls"
import { EditableList } from "../ui/EditableList"
import { Pills } from "../ui/Pills"
import { ruleText } from "../lib/supervisor"
import { Sentence } from "../ui/Sentence"
import { CountersPicker } from "./CountersPicker"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

const LOCK_HELP =
  "A change lands at once when it can be proved not to make the rule easier " +
  "— a lower limit, more days judged, fewer freezes, or one more condition." +
  String.fromCharCode(10, 10) +
  "Anything else waits a week from the last such change, including anything " +
  "that cannot be compared at all: inverting a test, swapping what is " +
  "measured, dropping a condition, switching between judging a day and " +
  "judging a week." +
  String.fromCharCode(10, 10) +
  "The day you write a rule is yours to get it right on: nothing is locked " +
  "until the next day, because the rule has judged nothing yet." +
  String.fromCharCode(10, 10) +
  "The point of setting a limit in advance is to be the person who set it, " +
  "not the person living under it."

const CONDITION_HELP =
  "A rule can keep several things at once, and all of them have to hold — " +
  "no Pinterest on a weekday morning, and no YouTube in the evening or at " +
  "night, any day." + String.fromCharCode(10, 10) +
  "One rule rather than two, because breaking either half breaks the same " +
  "week. Two rules would be two streaks to keep and two allowances to spend, " +
  "which is a weaker promise wearing the same name."


/**
 * One labelled field, **with the label above it**.
 *
 * It sat to the left in a sixteen-pixel column, which is fine while every
 * control fits on the line beside it and stops being fine the moment one
 * wraps: the label then points at the first line of something three lines
 * tall, and the eye has to pair them back up on every row. Above is where the
 * question goes, and the answer under it.
 */
/**
 * A refinement, folded away with its current value on the lid.
 *
 * The rule form grew from four fields to about twenty, and the answer to that
 * is not smaller type — it is that **most of them are refinements of an answer
 * you have already given**. Judged by the day, at least two hours: that is a
 * rule. Which slots, which weekdays, what it costs to slip and when it starts
 * are all *and also*, and a form that asks all of them at once reads as twenty
 * equal questions.
 *
 * **The summary is what makes folding safe.** A closed fold that says nothing
 * hides state; one that says `Mon, Wed, Fri` or `the whole day` is a sentence
 * you can check without opening anything, and you open only the one that is
 * wrong.
 *
 * Native `<details>`, not a `useState` toggle. It is Baseline widely
 * available, it is keyboard- and screen-reader-correct with no ARIA of our
 * own, and — the part that matters in a twenty-field form — the browser's own
 * find-in-page reveals a closed fold that contains the match.
 */
const Fold = ({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string
  /** What it currently says, read without opening it. */
  summary: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) => (
  <details
    open={defaultOpen}
    className="group rounded-xl bg-ink/[0.03] open:bg-ink/[0.05]"
  >
    <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden rounded-xl hover:bg-ink/[0.04]">
      <ChevronRight
        size={11}
        className="shrink-0 text-ink/35 transition-transform duration-150 group-open:rotate-90"
      />
      <span className="shrink-0 text-[9px] font-mono uppercase tracking-widest text-ink/50">
        {title}
      </span>
      <span className="ml-auto min-w-0 truncate text-[10px] font-mono text-ink/40 group-open:opacity-0 transition-opacity">
        {summary}
      </span>
    </summary>
    {/* `fold-body` is what arrives — see App.css, and the note there on why
        this is the content moving rather than the box. */}
    <div className="fold-body px-3 pb-3 pt-1 space-y-2">{children}</div>
  </details>
)

/**
 * **Two named modes, each saying what it is for.**
 *
 * Three of the refinements in this form are the same shape: one figure for
 * everything, or one apiece. They were single latching buttons — `shared time
 * slots`, `a figure per day` — and a lone pressed-or-not button is the worst
 * control for that question, because it names only one of the two states. You
 * are told what it is called when it is on and left to infer the other from
 * its absence, and "shared time slots, unpressed" is not a phrase with a
 * meaning. Both modes now have a name, and the choice looks like every other
 * pick-one in the app.
 *
 * **A `?` per side rather than one for the control.** The thing that needs
 * explaining is the difference between two options, and a single tooltip has
 * to describe both to describe either — which is a paragraph where two
 * sentences do. It sits inside the segment so the answer is beside the option
 * it answers for; the segment is a `<span>` rather than the button, since a
 * button inside a button is not a thing.
 */
function TwoWay<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string; tip: string }[]
  onChange: (next: T) => void
}) {
  const c = usePalette()
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-ink/[0.07] p-1">
      {options.map((o) => {
        const on = value === o.id
        return (
          <span
            key={o.id}
            className="flex items-center rounded-full pr-1"
            style={segBtnStyle(on, c)}
          >
            <button
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={on}
              className={`${segBtn(on)} pr-1.5`}
              style={on ? { color: c.onFill } : undefined}
            >
              {o.label}
            </button>
            <Tip multiline text={o.tip}>
              <span
                className={`flex cursor-help ${on ? "opacity-70" : "text-ink/30"}`}
              >
                <CircleQuestionMark size={11} />
              </span>
            </Tip>
          </span>
        )
      })}
    </div>
  )
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1">
    {label && (
      <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/40">
        {label}
      </span>
    )}
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {children}
    </div>
  </div>
)

const NUM = `${FIELD_SOFT_INLINE} w-14 rounded-lg py-1 text-[11px] text-center`
/* Narrower than the one beside it, and deliberately: six fixed words against a
   list of the project's own names, and equal widths would read as two halves
   of one answer rather than as a question and its answer. */
/* **Sized by what it says**, between a floor and a ceiling. The options are
   the project's own names — `Tags` and `Генерация и сбор урока через AI` in one
   dropdown — so any fixed width is either too wide for half of them or too
   narrow for the rest. `field-sizing: content` is a progressive enhancement
   and needs no fallback: without it the control simply keeps the ceiling as
   its width, which is exactly what it had before. The floor stops an empty
   list collapsing it to nothing. */
/**
 * When a new rule may begin: today, tomorrow, or the coming Monday.
 *
 * Forward only. A start date in the past is not a start — it is a claim about
 * days the promise had not been made on, and `startedOn` exists precisely so a
 * rule judges the days it was in force for.
 *
 * Monday rather than "next week" as a phrase, because the accounting period
 * *is* the Monday-to-Sunday week: starting there is the only choice that gives
 * the rule a whole first week to earn its first freeze in.
 */
function startChoices(today: Date): { id: string; label: string }[] {
  const monday = startOfWeek(addDays(today, 7))
  const out = [
    { id: toKey(today), label: "Today" },
    { id: toKey(addDays(today, 1)), label: "Tomorrow" },
  ]
  const mondayKey = toKey(monday)
  if (!out.some((o) => o.id === mondayKey))
    out.push({ id: mondayKey, label: "Monday" })
  return out
}
/**
 * What a fresh condition points at.
 *
 * The project's first activity, else its first tally, and only then all study
 * time — which is the fallback for a project that has defined nothing at all,
 * where there is genuinely nothing else to name. `All study time` is no longer
 * offered, and a new rule landing on it was what kept it on the menu: the
 * picker must show whatever a condition currently says, so seeding there put
 * it back for everybody.
 */
function seedFor(ctx: StreakContext): {
  target: StreakTarget
  measure: StreakMeasure
} {
  const { tallies } = splitByKind(ctx.units)
  if (ctx.activities.length)
    return { target: { kind: "activity", id: ctx.activities[0].id }, measure: "time" }
  if (tallies.length)
    return { target: { kind: "unit", id: tallies[0].id }, measure: "count" }
  return { target: { kind: "time" }, measure: "time" }
}

/**
 * Turn one id on or off in a list where **everything lit means no
 * restriction**.
 *
 * All-lit is stored as nothing at all, so the two ways of saying the same
 * thing collapse into one; and turning the last one off is refused, because
 * "count nothing" and "judge no day" are not rules.
 */
const toggleIn = (
  current: string[] | undefined,
  all: string[],
  id: string,
): string[] | undefined => {
  const on = current?.length ? current : all
  const next = on.includes(id) ? on.filter((x) => x !== id) : [...on, id]
  if (!next.length) return current
  return next.length === all.length ? undefined : next
}

/** What the slot restriction currently says, for a closed fold. */
const slotsSummary = (clause: StreakClause, ctx: StreakContext): string => {
  const judged = clauseWeekdays(clause)
  /* **Per day, or one answer.** With individual slots the lid cannot name a
     set — there are up to seven of them — so it says which it is and leaves
     the naming to the open fold. Summarising the first weekday's would be a
     lid that is right about Monday and quietly wrong about Saturday. */
  const perDay = judged.some(
    (wd) => clause.days?.[wd]?.slots || clause.days?.[wd]?.slotIds?.length,
  )
  if (perDay) return "a set per weekday"
  const named = clause.slotIds?.length
    ? clause.slotIds
        .map((id) => ctx.slots.find((x) => x.id === id)?.label || "removed")
        .join(", ")
    : "the whole day"
  const extra = Object.keys(slotBoundsOnWeekday(clause, judged[0] ?? 0)).length
  return extra ? `${named} · ${extra} with a figure` : named
}

/** And the weekdays. */
const daysSummary = (clause: StreakClause): string => {
  const judged = clauseWeekdays(clause)
  // `figuresPerDay`, not `clause.days` — the map holds per-day slots too now,
  // and a lid claiming figures the condition does not carry is a lid lying.
  const said =
    judged.length === WEEKDAY_ORDER.length
      ? "every day"
      : judged.map((wd) => WEEKDAY_LABELS[wd]).join(", ")
  return figuresPerDay(clause) ? `${said}, a figure per day` : said
}

/** One condition: what is measured, where, and on which days. */
function ClauseForm({
  clause,
  ctx,
  byWeek,
  ordinal,
  onChange,
  onRemove,
}: {
  clause: StreakClause
  ctx: StreakContext
  byWeek: boolean
  /** Which of several this is. Shown even when it is the only one. */
  ordinal: number
  onChange: (patch: Partial<StreakClause>) => void
  /** Absent on the only condition — a rule with none is not a rule. */
  onRemove?: () => void
}) {
  const c = usePalette()
  const target = clauseTarget(clause)
  const info = targetInfo(target, ctx)
  const timed = info.measure === "time"
  const sleepTarget = clauseTargets(clause).some((t) => t.kind === "sleep")
  // Resolved, never the stored fields: a condition written before the pair
  // existed still carries an operator and one number, and only this knows it.
  const bounds = clauseBounds(clause, ctx, toKey(new Date()))

  return (
    /* **A condition is one answer and a few refinements**, and the refinements
       are folded with their current value on the lid.

       The form grew from four fields to about twenty, and the answer to that
       is not smaller type: most of the twenty refine something you have
       already said. *Every day, at least two hours of lessons* is a rule. Which
       slots, which weekdays and why are all "and also".

       `@container` rather than a viewport breakpoint — this sits in a modal
       that is 512px on a desktop and the full width of a phone, and the fields
       should pair up when there is room for two regardless of which. */
    /* **A `<fieldset>`, because a condition is a group of related controls
       and that is what the element is for.** It costs nothing to look at — the
       browser's border and padding are reset — and it is what tells a screen
       reader where one condition ends and the next begins, which a sighted
       reader gets from the hairline for free. `min-w-0` because a fieldset
       refuses to shrink below its content otherwise, which is the same bug it
       fixes everywhere else in this layout.

       **The number is always there.** `Condition 1` over a lone condition
      does say something you could already see — and what it says is *there
      can be more than one of these*, which is the single most useful thing a
      form can tell you about a shape you have not met. Appearing only on the
      second one taught it at the moment it had stopped being news, and it
      made the one-condition form and the two-condition form two different
      layouts for no reason. */
    <fieldset className="@container space-y-2 min-w-0 border-0 p-0 m-0">
      {/* **The name of the block and the way out of it, on one line.**

          The cross used to be pinned to the corner, which left it floating a
          line below the heading it belonged to; a `<legend>` at full width
          holds them both.

          **A bin, not a cross.** A cross two lines down empties a bound, and
          one glyph doing both "clear this field" and "delete this whole block"
          is a difference nobody should have to learn from the size of the
          icon. The bin is what `EditableList` already deletes with. */}
      <legend className="w-full flex items-center gap-2 p-0 mb-1">
        <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
          Condition {ordinal}
        </span>
        {onRemove && (
          <Tip className="ml-auto" text="Drop this condition">
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Drop condition ${ordinal}`}
              className={`${btnBase} block p-1 rounded-full text-ink/30 hover:text-exam hover:bg-ink/5`}
            >
              <Trash2 size={12} />
            </button>
          </Tip>
        )}
      </legend>

      {/* **The sentence it will be read back as, and it stays on screen.**

          The summary, the streak panel and the supervisor's plain-text digest
          all print `clauseSentence`, and the form prints the same one — never
          a second rendering of the same idea, because a preview that can
          disagree with what it previews is worse than none.

          It used to sit at the foot of the condition, which is where it was
          least use: a condition is some eight hundred pixels of controls, so
          checking what you had just built meant scrolling past everything you
          had built it with, and at the bottom the sticky Cancel/Done bar was
          half over it. Pinned under the name it is the one line that never
          leaves while you work, and it rewrites itself under every control you
          touch — which is the whole of what it is for. With two conditions
          each one holds the top of its own block and hands over at the
          hairline, so the sentence on screen is always the one you are
          editing.

          It carries the row's surface rather than the card's, for the reason
          the action bar does: a wash needs an opaque base, and `bg-card` over
          a recessed row is a lighter patch. `z-10` keeps it under that bar,
          which is the one thing that should never be covered. */}
      <p
        style={cellSurface(`${c.ink}0A`, c.card)}
        className="sticky top-0 z-10 -mx-2.5 px-2.5 py-1.5 text-[11px] font-mono text-ink/60 leading-relaxed"
      >
        <span className="text-[9px] uppercase tracking-widest text-ink/30">
          Reads as{" "}
        </span>
        <Sentence text={clauseSentence(clause, ctx, byWeek ? "week" : "day")} />
      </p>

      {/* **Why this condition is here, directly under its name.** It is the
          one thing on the block that is about the condition rather than about
          what it measures, and at the foot it read as the last refinement of
          the terms — a footnote to the slots. Its own rather than the rule's,
          since a compound rule is one promise made for several reasons. Not a
          term, so the lock never sees it. */}
      <Fold title="Note" summary={clause.note || "none"}>
        <AutoTextarea
          value={clause.note ?? ""}
          onChange={(e) => onChange({ note: e.target.value || undefined })}
          placeholder="Why this condition is here"
          rows={1}
          maxHeight={100}
          className={`${FIELD_SOFT_INLINE} w-full rounded-lg py-1 text-[11px]`}
        />
      </Fold>

      {/* What it watches. Always open: it is the subject of every sentence
          below it, and a fold here would hide the one thing that makes the
          rest mean anything. */}
      <Row label="">
        <CountersPicker
          targets={clauseTargets(clause)}
          ctx={ctx}
          onChange={(targets) => {
            const measure = targetMeasure(targets[0], ctx)
            const seed = newClause(targets[0], measure)
            /* **Every figure goes when the subject does.**

               A number means nothing without the thing it counts: sixty is an
               hour of lessons, sixty slips, or sixty days answered yes, and
               carrying it across is how "at least 60 minutes" quietly became
               "at least 60 times" — a freeze that cost fifty-nine.

               Cleared unconditionally rather than only when the *measure*
               changes. Two counts are the same measure and still not the same
               question, and a stale figure is worse than a default. */
            onChange({
              targets,
              target: undefined,
              unitId: undefined,
              op: undefined,
              value: undefined,
              min: seed.min,
              max: seed.max,
              days: undefined,
              allow: undefined,
              states: undefined,
              slots: undefined,
            })
          }}
        />
      </Row>

      {/* **A week has no weekdays to hang its figure on**, so the pair stays
          out here. By day it lives inside `Days`, where the days it applies to
          are chosen — see below. */}
      {!info.check && byWeek && (
        <Row label="Per week">
          <BoundField
            label="Minimum"
            value={bounds.min}
            timed={timed}
            onChange={(v) => onChange({ min: v, op: undefined, value: undefined })}
          />
          <BoundField
            label="Maximum"
            value={bounds.max}
            timed={timed}
            onChange={(v) => onChange({ max: v, op: undefined, value: undefined })}
          />
        </Row>
      )}

      {info.check && byWeek && (
        <Row label="Answers a week">
          <CheckWeekFields clause={clause} onChange={onChange} />
        </Row>
      )}

      {info.check && !byWeek && (
        <Row label="Accepted answers">
          <CheckDayFields clause={clause} onChange={onChange} />
        </Row>
      )}

      {/* **Days, then slots** — the order the questions actually depend on
          each other in. Which days the condition judges, and how much it asks
          on them, is the rule; which slots that figure may be collected in is
          a refinement *of those days*, and a slot rider can be set per
          weekday, which is unreadable before you know which weekdays there
          are. Slots came first for as long as this form existed, so the
          narrowing was offered before the thing it narrows.

          A weekly rule counts the whole week; which weekdays it fell on is not
          a question it can ask. Nor can a day-scoped check, which asks it
          already: a weekday with no accepted answer is a weekday it does not
          judge, and that is what its grid says in the row it leaves empty. */}
      {!byWeek && !info.check && (
        <Fold title="Days" summary={daysSummary(clause)}>
          <WeekdayRow clause={clause} ctx={ctx} timed={timed} onChange={onChange} />
        </Fold>
      )}

      {/* **Sleep has no slots, so the fold is absent rather than empty** —
          `spec 019`. A sleep entry carries no slot at all, so there is nothing
          for a rider to measure; that is a fact about the data rather than a
          policy, and a control offering figures that could never be read is
          worse than one that is not there. */}
      {!info.check && !sleepTarget && ctx.slots.length > 0 && (
        <Fold title="Slots" summary={slotsSummary(clause, ctx)}>
          <SlotsFields
            clause={clause}
            ctx={ctx}
            timed={timed}
            byWeek={byWeek}
            onChange={onChange}
          />
        </Fold>
      )}

    </fieldset>
  )
}

/**
 * One bound, with its own label above it and a way to have none.
 *
 * Empty is a real value and the placeholder says so: a condition with only a
 * minimum is the common case, and drawing a zero there would be claiming a
 * ceiling nobody asked for.
 */
function BoundField({
  label,
  value,
  timed,
  onChange,
}: {
  label: string
  value: number | undefined
  timed: boolean
  onChange: (next: number | undefined) => void
}) {
  const set = (raw: string) =>
    onChange(raw === "" ? undefined : Math.max(0, Number(raw) || 0))

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
        {label}
      </span>
      <span className="flex items-center gap-1">
        {timed ? (
          <HoursMinutes minutes={value} onChange={onChange} />
        ) : (
          <input
            type="number"
            min={0}
            value={value ?? ""}
            placeholder="—"
            onChange={(e) => set(e.target.value)}
            className={NUM}
          />
        )}
        {value !== undefined && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className={`${btnBase} rounded-full p-0.5 text-ink/25 hover:text-ink`}
          >
            <X size={10} />
          </button>
        )}
      </span>
    </label>
  )
}

/** Hours and minutes as two boxes, or nothing at all. */
function HoursMinutes({
  minutes,
  onChange,
}: {
  minutes: number | undefined
  onChange: (next: number | undefined) => void
}) {
  const h = minutes === undefined ? "" : Math.floor(minutes / 60)
  const m = minutes === undefined ? "" : minutes % 60
  const num = (v: string) => Math.max(0, Number(v) || 0)
  const write = (hh: string, mm: string) =>
    hh === "" && mm === ""
      ? onChange(undefined)
      : onChange(num(hh) * 60 + Math.min(59, num(mm)))

  return (
    <>
      <input
        type="number"
        min={0}
        value={h}
        placeholder="—"
        onChange={(e) => write(e.target.value, String(m))}
        className={NUM}
      />
      <span className="text-[10px] font-mono text-ink/35">h</span>
      <input
        type="number"
        min={0}
        max={59}
        value={m}
        placeholder="—"
        onChange={(e) => write(String(h), e.target.value)}
        className={NUM}
      />
      <span className="text-[10px] font-mono text-ink/35">m</span>
    </>
  )
}

/**
 * Which answers each weekday will accept — a check, judged by the day.
 *
 * Not a floor and a ceiling. A check is an answer, and what a day asks is
 * which of the three it will take: `yes` on a workday, `yes` or `skipped` at
 * the weekend. A weekday with nothing ticked is a weekday the rule does not
 * judge, which is the same statement said in the place you are already
 * looking — and an unanswered check satisfies none of them, which is the whole
 * reminder.
 */
function CheckDayFields({
  clause,
  onChange,
}: {
  clause: StreakClause
  onChange: (patch: Partial<StreakClause>) => void
}) {
  const c = usePalette()
  // Seeded from whatever the condition asked before per-day answers existed,
  // so switching to this changes nothing until a box is ticked.
  const seed: CheckState[] =
    clause.min !== undefined || clause.op === "atLeast" ? ["yes"] : ["no"]
  const allow: Record<number, CheckState[]> =
    clause.allow ??
    Object.fromEntries(clauseWeekdays(clause).map((wd) => [wd, seed]))

  const write = (days: Record<number, CheckState[]>) =>
    onChange({
      allow: days,
      weekdays: undefined,
      min: undefined,
      max: undefined,
      op: undefined,
      value: undefined,
    })

  const toggle = (weekday: number, answer: CheckState) => {
    const on = allow[weekday] ?? []
    const next = on.includes(answer)
      ? on.filter((a) => a !== answer)
      : [...on, answer]
    const days = { ...allow }
    // Nothing ticked is the day dropping out, which is what it means.
    if (next.length) days[weekday] = next
    else delete days[weekday]
    write(days)
  }

  /* **A column at a time.** Twenty-one switches is a grid, and every real
     answer to it is a column: *yes on every day*, then take Sunday out. Doing
     that one cell at a time is seven clicks to say one thing, and the seventh
     is the one you forget — which is a weekday quietly not judged, the exact
     failure the grid was drawn to make visible.

     One button per answer, and it clears when the column is full: the two
     jobs the user asked for — tick this everywhere, untick it everywhere —
     are the same button in its two states, and giving them separate controls
     would double the row to say the same thing. */
  const everyDay = (answer: CheckState) =>
    WEEKDAY_ORDER.every((wd) => (allow[wd] ?? []).includes(answer))

  const toggleAll = (answer: CheckState) => {
    const clearing = everyDay(answer)
    const days: Record<number, CheckState[]> = {}
    WEEKDAY_ORDER.forEach((wd) => {
      const on = allow[wd] ?? []
      const next = clearing
        ? on.filter((a) => a !== answer)
        : on.includes(answer)
          ? on
          : [...on, answer]
      if (next.length) days[wd] = next
    })
    write(days)
  }

  return (
    <div className="space-y-1 w-full">
      {/* The header is the bulk row, not a set of labels: the answers are
          named on every line below it, so a row that only repeated them would
          be seven words spent on nothing. */}
      <div className="flex items-center gap-1.5 pb-1 mb-0.5 border-b border-ink/10">
        <span className="w-8 shrink-0 text-[9px] font-mono uppercase tracking-widest text-ink/25">
          All
        </span>
        {CHECK_CHOICES.map((answer) => {
          const full = everyDay(answer)
          return (
            <Tip
              key={answer}
              text={
                full
                  ? `Take ${CHECK_LABELS[answer]} off every day`
                  : `Accept ${CHECK_LABELS[answer]} on every day`
              }
            >
              <button
                type="button"
                onClick={() => toggleAll(answer)}
                aria-pressed={full}
                style={
                  full
                    ? { backgroundColor: `${c.accent}24`, color: c.accent }
                    : undefined
                }
                className={`${btnBase} px-2 py-1 rounded-full text-[10px] font-mono ${
                  full ? "font-bold" : "text-ink/30 hover:text-ink/70"
                }`}
              >
                {CHECK_LABELS[answer]}
              </button>
            </Tip>
          )
        })}
      </div>
      {WEEKDAY_ORDER.map((weekday) => (
        <div key={weekday} className="flex items-center gap-1.5">
          <span className="w-8 shrink-0 text-[9px] font-mono uppercase tracking-widest text-ink/40">
            {WEEKDAY_LABELS[weekday]}
          </span>
          {CHECK_CHOICES.map((answer) => {
            const on = (allow[weekday] ?? []).includes(answer)
            return (
              <button
                key={answer}
                type="button"
                onClick={() => toggle(weekday, answer)}
                aria-pressed={on}
                style={
                  on
                    ? { backgroundColor: `${c.accent}24`, color: c.accent }
                    : undefined
                }
                className={`${btnBase} px-2 py-1 rounded-full text-[10px] font-mono ${
                  on ? "font-bold" : "text-ink/35 hover:text-ink/70"
                }`}
              >
                {CHECK_LABELS[answer]}
              </button>
            )
          })}
          {!(allow[weekday] ?? []).length && (
            <span className="text-[9px] font-mono text-ink/30">not judged</span>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * How many of each answer a week needs — a check, judged by the week.
 *
 * *Six good days, no bad ones, and the seventh may be skipped* is three
 * requirements about three different answers, which no single total could
 * hold. A state left blank is unconstrained, which is what "skipped: any"
 * means, and saying it out loud would be a field spent on nothing.
 */
function CheckWeekFields({
  clause,
  onChange,
}: {
  clause: StreakClause
  onChange: (patch: Partial<StreakClause>) => void
}) {
  const states = clause.states ?? {}
  const write = (
    answer: CheckState,
    side: "min" | "max",
    raw: string,
  ) => {
    const next = { ...states }
    const entry = { ...(next[answer] ?? {}) }
    if (raw === "") delete entry[side]
    else entry[side] = Math.max(0, Number(raw) || 0)
    if (entry.min === undefined && entry.max === undefined) delete next[answer]
    else next[answer] = entry
    onChange({
      states: next,
      min: undefined,
      max: undefined,
      op: undefined,
      value: undefined,
    })
  }

  return (
    <div className="w-full">
      {/* One header, then a row per answer — a table, because that is what
          three answers with two bounds each is. Repeating "at least" and "at
          most" on every line would be six words doing the work of two. */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-16 shrink-0" />
        <span className="w-14 text-[9px] font-mono uppercase tracking-widest text-ink/35 text-center">
          Minimum
        </span>
        <span className="w-14 text-[9px] font-mono uppercase tracking-widest text-ink/35 text-center">
          Maximum
        </span>
      </div>
      <div className="space-y-1">
        {CHECK_CHOICES.map((answer) => {
          const b = states[answer] ?? {}
          return (
            <div key={answer} className="flex items-center gap-1.5">
              <span className="w-16 shrink-0 text-[10px] font-mono text-ink/60">
                {CHECK_LABELS[answer]}
              </span>
              <input
                type="number"
                min={0}
                value={b.min ?? ""}
                placeholder="—"
                onChange={(e) => write(answer, "min", e.target.value)}
                className={`${NUM} w-14`}
              />
              <input
                type="number"
                min={0}
                value={b.max ?? ""}
                placeholder="—"
                onChange={(e) => write(answer, "max", e.target.value)}
                className={`${NUM} w-14`}
              />
              {b.min === undefined && b.max === undefined && (
                <span className="text-[9px] font-mono text-ink/30">any</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * **Everything about slots**, which is two questions and not one.
 *
 * *Counts in* is where the day's own figure may be collected at all. *Of
 * which* is a floor or a ceiling on one named slot, on top of that: the day
 * may want two hours in total while insisting one of them lands in the
 * morning. Both answers apply, and the second is meaningless without the
 * first — which is why the chips and the riders are one component now rather
 * than a chip row in `ClauseForm` and a `SlotBounds` under it.
 *
 * A rider is offered per slot on demand. A row of seven empty fields under
 * every condition would be the form asking a question almost nobody has, and
 * the ones who do have it usually have it about one slot.
 */
function SlotsFields({
  clause,
  ctx,
  timed,
  byWeek,
  onChange,
}: {
  clause: StreakClause
  ctx: StreakContext
  timed: boolean
  byWeek: boolean
  onChange: (patch: Partial<StreakClause>) => void
}) {
  const c = usePalette()
  const judged = clauseWeekdays(clause)

  /* **Per day or shared, and it governs both questions at once.** Which slots
     count and what a named slot owes are the same subject at two grains, and
     splitting the switch would let you answer one per weekday and the other
     once — a state nobody wants and everybody would eventually be in.

     A week-scoped condition has no per-day anything to offer: it counts the
     week, and which day the hour fell on is not a question it asks. */
  const perDay =
    !byWeek &&
    !!clause.days &&
    judged.some(
      (wd) => clause.days?.[wd]?.slots || clause.days?.[wd]?.slotIds?.length,
    )
  const [editing, setEditing] = useState(judged[0] ?? 0)
  const showing = perDay ? editing : judged[0] ?? 0

  const countedIds = slotIdsOnWeekday(clause, showing)
  const counted = countedIds?.length ? new Set(countedIds) : null
  const current = slotBoundsOnWeekday(clause, showing)

  /* **Which mode is a view state, and it has to be.** In the data, "every
     slot" and "all of them ticked" are the same thing — `toggleIn` stores
     `undefined` the moment the last one goes back on — so a stored flag would
     be a second spelling of one rule and the two would disagree. Asking to
     choose therefore changes nothing about the condition; it opens the chips.

     Likewise for the figures: a slot with neither bound is a slot that counts
     and owes nothing, which is exactly what an unticked `Count by slot` means,
     so the switch remembers the intent and the data records the result. */
  const [choosing, setChoosing] = useState(!!counted)
  const [figuring, setFiguring] = useState(Object.keys(current).length > 0)

  /** Write one weekday's slot answer, or the shared one. */
  const writeDay = (patch: Partial<DayRequirement>) => {
    if (!perDay) {
      if ("slots" in patch) return onChange({ slots: patch.slots })
      return onChange({ slotIds: patch.slotIds })
    }
    onChange({
      days: {
        ...clause.days,
        [showing]: { ...(clause.days?.[showing] ?? {}), ...patch },
      },
    })
  }

  const writeBounds = (next: Record<string, ClauseBounds>) => {
    const cleaned = Object.fromEntries(
      Object.entries(next).filter(
        ([, b]) => b.min !== undefined || b.max !== undefined,
      ),
    )
    writeDay({ slots: Object.keys(cleaned).length ? cleaned : undefined })
  }

  const setPerDay = (on: boolean) => {
    if (!on) {
      /* Back to one answer for every day: the one you were last looking at is
         the one that survives, since it is the one you were editing. The
         entries themselves are left alone otherwise — they may still be
         carrying the day's own figure, which is a different switch. */
      const days: Record<number, DayRequirement> = {}
      let anything = false
      WEEKDAY_ORDER.forEach((wd) => {
        const entry = clause.days?.[wd]
        if (!entry) return
        const kept: DayRequirement = { min: entry.min, max: entry.max }
        if (kept.min !== undefined || kept.max !== undefined) anything = true
        days[wd] = kept
      })
      return onChange({
        days: anything ? days : undefined,
        weekdays:
          anything || judged.length === WEEKDAY_ORDER.length
            ? undefined
            : judged,
        slots: current,
        slotIds: countedIds,
      })
    }
    // Seeded from the shared answer, so switching the mode on changes nothing
    // about the rule — it only makes each day editable on its own.
    const days: Record<number, DayRequirement> = { ...clause.days }
    judged.forEach((wd) => {
      days[wd] = {
        ...(days[wd] ?? {}),
        slots: current,
        slotIds: countedIds,
      }
    })
    onChange({ days, slots: undefined, slotIds: undefined, weekdays: undefined })
  }

  return (
    <div className="space-y-2 w-full">
      {/* **Shared or per day, first**, because it decides what everything
          below it is about: one answer, or the answer for the weekday you have
          selected. */}
      {!byWeek && (
        <Row label="Across the days">
          <TwoWay<"same" | "each">
            value={perDay ? "each" : "same"}
            onChange={(v) => setPerDay(v === "each")}
            options={[
              {
                id: "same",
                label: "Shared time slots",
                tip: "Same slot rules for each countable day",
              },
              {
                id: "each",
                label: "Individual time slots",
                tip: "Can set individual slot rules for chosen countable days",
              },
            ]}
          />
          {perDay &&
            judged.map((wd) => (
              <button
                key={wd}
                type="button"
                onClick={() => setEditing(wd)}
                aria-pressed={showing === wd}
                style={
                  showing === wd
                    ? { backgroundColor: c.accent, color: c.onFill }
                    : undefined
                }
                className={`${btnBase} w-8 py-1 rounded-full text-[10px] font-mono ${
                  showing === wd ? "" : "text-ink/40 hover:text-ink hover:bg-ink/5"
                }`}
              >
                {WEEKDAY_LABELS[wd]}
              </button>
            ))}
        </Row>
      )}

      {/* **Where the day's own figure is counted.** Two named modes rather
          than a bare row of chips that happens to mean "all of them" when
          every one is lit: all-lit and none-lit look alike at a glance and
          mean opposite things, and the chips are noise until you have actually
          decided to narrow. */}
      <Row label="Counts in">
        <TwoWay<"all" | "some">
          value={choosing ? "some" : "all"}
          onChange={(v) => {
            setChoosing(v === "some")
            if (v === "all") writeDay({ slotIds: undefined })
          }}
          options={[
            {
              id: "all",
              label: "All slots",
              tip: "Everything logged that day counts towards the figure, wherever it fell",
            },
            {
              id: "some",
              label: "Chosen slots",
              tip: "Only what falls in the slots you pick counts towards the figure",
            },
          ]}
        />
      </Row>

      {choosing && (
        <Row label="">
          <div className="flex flex-wrap gap-1">
            {ctx.slots.map((slot) => {
              const on = !counted || counted.has(slot.id)
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() =>
                    writeDay({
                      slotIds: toggleIn(
                        countedIds,
                        ctx.slots.map((x) => x.id),
                        slot.id,
                      ),
                    })
                  }
                  aria-pressed={on}
                  style={
                    on
                      ? { backgroundColor: `${slot.color}24`, color: slot.color }
                      : undefined
                  }
                  className={`${btnBase} px-2 py-1 rounded-full text-[10px] font-mono ${
                    on ? "" : "text-ink/35 hover:text-ink/70"
                  }`}
                >
                  {slot.label}
                </button>
              )
            })}
          </div>
        </Row>
      )}

      {/* **A figure on a named slot, on top of the day's own.** Its own switch
          rather than a consequence of the day's, because the two are genuinely
          independent: *two hours on Monday, of which one in the morning* wants
          both, *an hour in the morning and nothing said about the day* wants
          only this, and *two hours anywhere* wants only the other. Off, every
          counted slot owes nothing, which is what the rows say when you turn
          it on and leave them alone. */}
      <Row label="Count by slot">
        <TwoWay<"off" | "on">
          value={figuring ? "on" : "off"}
          onChange={(v) => {
            setFiguring(v === "on")
            if (v === "off") writeBounds({})
          }}
          options={[
            {
              id: "off",
              label: "No slot figures",
              tip: "The day's own figure is the whole requirement, wherever the time falls inside it",
            },
            {
              id: "on",
              label: "A figure per slot",
              tip: "A named slot carries its own floor or ceiling as well as the day's",
            },
          ]}
        />
      </Row>

      {figuring && (
        /* One row per **counted** slot. A figure on a slot the condition has
           excluded is a requirement measured against something it is not
           measuring — never satisfiable, and `clauseImpossible` refuses it —
           so the row is not offered rather than the mistake being caught two
           screens later. An existing one is still drawn, outlined in the
           missed colour and clearable, because a rule that cannot be saved and
           cannot be fixed is the worse failure of the two. */
        /* **Three columns for a count, two for a duration**, and the variable
           is `timed` rather than the width. A slot name and two bounds is a
           chip up to `Morning (before transit)` wide plus the figures, and a
           duration's figure is four number boxes and their `h`/`m` where a
           count's is one box — about 490px against about 340. The panel has
           roughly 440, so one of the two overflows and the other does not, and
           no single layout is right for both: the timed row ran off the side
           and took the whole modal's horizontal scrollbar with it.

           A container query was the first answer and it was answering the
           wrong question. This form is never wider than a 512px modal, so the
           breakpoint that would have helped a duration could never fire, while
           a count — which fits perfectly well — got the stacked layout anyway.
           What actually decides the width is what is being measured, and that
           is known here. Both class strings are literal, because Tailwind
           cannot see a name assembled at runtime.

           `overflow-x-auto` is the backstop underneath both: wide content
           scrolls inside its own box rather than pushing the page, which is the
           rule the period bar and `ChartCard` already follow. */
        <div className="overflow-x-auto -mx-1 px-1">
        <div
          className={`grid items-center gap-x-2 gap-y-1 w-max max-w-full ${
            timed ? "grid-cols-[auto_auto]" : "grid-cols-[auto_auto_auto]"
          }`}
        >
          {!timed && <span />}
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
            Minimum
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
            Maximum
          </span>
          {ctx.slots.map((slot) => {
            const b = current[slot.id]
            const countable = !counted || counted.has(slot.id)
            if (!countable && !b) return null
            const set = (side: "min" | "max", v: number | undefined) =>
              writeBounds({ ...current, [slot.id]: { ...b, [side]: v } })
            return (
              <Fragment key={slot.id}>
                <span
                  className={`justify-self-start text-[10px] font-mono rounded-full px-2 py-1 whitespace-nowrap ${
                    timed ? "col-span-2 mt-1" : ""
                  }`}
                  style={{
                    backgroundColor: `${slot.color}1A`,
                    color: slot.color,
                    ...(countable
                      ? {}
                      : { boxShadow: `inset 0 0 0 1px ${c.exam}` }),
                  }}
                >
                  {slot.label}
                </span>
                <BoundField
                  label=""
                  value={b?.min}
                  timed={timed}
                  onChange={(v) => set("min", v)}
                />
                <span className="flex items-center gap-1">
                  <BoundField
                    label=""
                    value={b?.max}
                    timed={timed}
                    onChange={(v) => set("max", v)}
                  />
                  {/* **`any` is a state, not a blank.** A slot that counts and
                      owes nothing is the commonest answer here — it is what
                      "the rest, wherever" means — and two empty boxes look
                      like a question you forgot to answer rather than one you
                      answered. */}
                  {b?.min === undefined && b?.max === undefined && (
                    <span className="text-[9px] font-mono uppercase tracking-widest text-ink/30">
                      any
                    </span>
                  )}
                </span>
              </Fragment>
            )
          })}
        </div>
        </div>
      )}
    </div>
  )
}

/**
 * Which weekdays a condition judges, **and what it asks on them**.
 *
 * The figure used to sit outside this block, in a `Per day` row above the
 * folds, while the per-day grid sat inside — two controls for one number, one
 * of which was dead whenever the other was in use. They are the same question
 * asked at two grains, so they are one block: the days first, then how much,
 * then the figures for whichever answer you gave.
 *
 * **Two modes, because two questions.** Most conditions ask the same thing
 * every day they cover, and that stays one pair of numbers and a row of day
 * switches. Real goals often do not: three hours most days, ninety minutes on
 * Thursday. Saying that took seven conditions before, which then drifted
 * apart the first time any one of them was edited.
 *
 * **Both bounds, per day.** The grid only ever edited whichever side happened
 * to be set, so "at least 2h, and never more than 4h — except Thursday" was
 * writable as a shared pair and not as a per-day one, for no reason but the
 * control.
 *
 * **A day with no figure is a day the rule does not judge**, so the two
 * questions are the same question once per-day numbers are on: switching a day
 * off *is* leaving its figure blank. That is why turning the mode on hands
 * every covered day the shared figure to start from rather than an empty grid
 * — nothing changes about what the rule asks until you change a number.
 */
function WeekdayRow({
  clause,
  ctx,
  timed,
  onChange,
}: {
  clause: StreakClause
  ctx: StreakContext
  timed: boolean
  onChange: (patch: Partial<StreakClause>) => void
}) {
  const c = usePalette()
  /* **Does the map actually carry figures?** `clause.days` holds three
     different per-day answers now — the figure, which slots count, and what a
     named slot owes — so its mere presence stopped meaning "figures per day"
     the moment slots could be per day too. */
  const perDay = figuresPerDay(clause)
  const judged = clauseWeekdays(clause)
  const shared = boundsOnWeekday(clause, ctx, judged[0] ?? 0)
  const asking = shared.min !== undefined || shared.max !== undefined || perDay
  const [counting, setCounting] = useState(asking)

  /** Strip every per-day figure, leaving whatever the map says about slots. */
  const flatten = (keep: ClauseBounds) => {
    const days: Record<number, DayRequirement> = {}
    let slotted = false
    WEEKDAY_ORDER.forEach((wd) => {
      const entry = clause.days?.[wd]
      if (!entry) return
      const rest: DayRequirement = { slots: entry.slots, slotIds: entry.slotIds }
      if (rest.slots || rest.slotIds?.length) slotted = true
      days[wd] = rest
    })
    return {
      days: slotted ? days : undefined,
      weekdays:
        slotted || judged.length === WEEKDAY_ORDER.length ? undefined : judged,
      min: keep.min,
      max: keep.max,
      op: undefined,
      value: undefined,
    }
  }

  /** Whether the day carries a figure of its own at all. */
  const setCounted = (on: boolean) => {
    setCounting(on)
    if (!on) onChange(flatten({}))
  }

  const setPerDay = (on: boolean) => {
    if (!on) {
      /* Back to one figure for every day, and it has to come from somewhere:
         the first judged day's, since that is the one the shared pair was
         seeded from on the way in. Dropping the figures alone would leave the
         old flat pair — which may be nothing at all — and silently unmake the
         rule you had just written seven figures for. */
      const keep = clause.days?.[judged[0] ?? 0] ?? {}
      return onChange(flatten({ min: keep.min, max: keep.max }))
    }
    // Seeded from what the condition already asks, so switching the mode on
    // changes nothing about the rule — it only makes the numbers editable.
    const days: Record<number, DayRequirement> = {}
    judged.forEach((wd) => {
      days[wd] = { ...clause.days?.[wd], ...boundsOnWeekday(clause, ctx, wd) }
    })
    onChange({ days, weekdays: undefined, min: undefined, max: undefined })
  }

  const toggleDay = (wd: number) => {
    const on = judged.includes(wd)
    // The last one cannot come off: a condition that judges no day is not a
    // condition, and an empty list reads as "every day" to anyone glancing.
    if (on && judged.length === 1) return
    if (perDay) {
      const days = { ...clause.days }
      if (on) delete days[wd]
      else days[wd] = boundsOnWeekday(clause, ctx, judged[0])
      return onChange({ days })
    }
    const next = on ? judged.filter((x) => x !== wd) : [...judged, wd]
    onChange({
      weekdays: next.length === WEEKDAY_ORDER.length ? undefined : next,
    })
  }

  const setDay = (wd: number, bounds: ClauseBounds) =>
    onChange({
      days: { ...clause.days, [wd]: { ...clause.days?.[wd], ...bounds } },
    })

  /**
   * **This day's figures onto every day the condition judges.**
   *
   * Per-day figures are how you say "three hours, except Thursday", and the
   * grid makes you say it seven times — which is bearable to write once and
   * miserable to *change*: three hours becoming four is seven edits, six of
   * them identical, and any one of them missed is a rule that quietly asks
   * something you did not mean on a Wednesday.
   *
   * A base figure with exceptions is the shape this really wants, and it is
   * not available: in per-day mode a day left blank asks nothing rather than
   * falling back to a shared pair, which `boundsOnWeekday` is explicit about
   * and which several readers depend on. Changing that is a change to what
   * rules mean, not to a form. So the form removes the typing instead.
   *
   * **Only the figures travel.** A day also carries which slots it counts and
   * what a named slot owes, and those are per-day for their own reasons —
   * copying them along would silently overwrite the answer to a different
   * question.
   */
  const copyToEveryDay = (wd: number) => {
    const from = clause.days?.[wd] ?? {}
    const days = { ...clause.days }
    judged.forEach((d) => {
      days[d] = { ...days[d], min: from.min, max: from.max }
    })
    onChange({ days })
  }

  const perDayGrid = counting && perDay

  return (
    <div className="space-y-2 w-full">
      {/* **Which days first.** Everything under this is a figure *on* those
          days, so choosing them is the question the rest depends on — and it
          used to sit two folds below the numbers it governs. */}
      <Row label="Judged on">
        <div className="flex flex-wrap items-center gap-1">
          {WEEKDAY_ORDER.map((wd) => {
            const on = judged.includes(wd)
            return (
              <button
                key={wd}
                type="button"
                onClick={() => toggleDay(wd)}
                aria-pressed={on}
                style={
                  on ? { backgroundColor: c.accent, color: c.onFill } : undefined
                }
                className={`${btnBase} w-8 py-1 rounded-full text-[10px] font-mono ${
                  on ? "" : "text-ink/40 hover:text-ink hover:bg-ink/5"
                }`}
              >
                {WEEKDAY_LABELS[wd]}
              </button>
            )
          })}
          {judged.length === WEEKDAY_ORDER.length && (
            <span className="text-[9px] font-mono text-ink/35">every day</span>
          )}
        </div>
      </Row>

      {/* **One figure or seven, and never both on screen.** The shared pair
          used to sit outside this fold, permanently, while the per-day grid
          sat inside it — so a condition with seven figures still drew the flat
          pair above them, dead and editable, and the form showed you two
          answers to a question that has one. `days` overrides the flat pair
          completely (`boundsOnWeekday`), so which one is live is not a matter
          of taste; the control now says which, and only that one is drawn. */}
      {/* **Whether the day carries a figure at all**, and it is a real
          question rather than a formality: *an hour in the morning, and
          nothing said about the rest of the day* is a rule people write, and
          under the old form the only way to say it was to clear two boxes and
          hope that read as deliberate. Independent of `Count by slot` in the
          block below — either, both, or the condition asks nothing and is
          refused. */}
      <Row label="Count by day">
        <TwoWay<"off" | "on">
          value={counting ? "on" : "off"}
          onChange={(v) => setCounted(v === "on")}
          options={[
            {
              id: "off",
              label: "No day figure",
              tip: "The day as a whole is unbounded — only a named slot can ask for anything",
            },
            {
              id: "on",
              label: "A figure per day",
              tip: "The day as a whole carries a floor, a ceiling, or both",
            },
          ]}
        />
      </Row>

      {counting && (
        <Row label="How much">
          <TwoWay<"same" | "each">
            value={perDay ? "each" : "same"}
            onChange={(v) => setPerDay(v === "each")}
            options={[
              {
                id: "same",
                label: "The same every day",
                tip: "One floor and one ceiling, on every day this condition judges",
              },
              {
                id: "each",
                label: "One per weekday",
                tip: "Set the floor and the ceiling separately for each chosen day",
              },
            ]}
          />
        </Row>
      )}

      {counting && !perDay && (
        <Row label="Per day">
          <BoundField
            label="Minimum"
            value={shared.min}
            timed={timed}
            onChange={(v) =>
              onChange({ min: v, op: undefined, value: undefined })
            }
          />
          <BoundField
            label="Maximum"
            value={shared.max}
            timed={timed}
            onChange={(v) =>
              onChange({ max: v, op: undefined, value: undefined })
            }
          />
        </Row>
      )}

      {perDayGrid && (
        /* A row per day rather than a column each. Two bounds apiece is four
           boxes on a timed condition, and side by side that is a grid eight
           columns wide inside a 512px modal; down the page it is the same
           table `CheckWeekFields` already draws, with the days where the
           answers are. */
        /* **A grid, so the two columns line up under their headings.** With
           `flex` the fields sat wherever the one before them ended — a day
           with no ceiling is two boxes shorter than one with — and the words
           `Minimum` and `Maximum` were then over nothing in particular. The
           columns are `auto` rather than `1fr` because a timed field is four
           boxes and a count is one, and a fixed width has to be wrong for one
           of them. */
        <div className="overflow-x-auto -mx-1 px-1">
        <div className="grid grid-cols-[2rem_auto_auto_auto] items-center gap-x-2 gap-y-1 w-max max-w-full">
          <span />
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
            Minimum
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
            Maximum
          </span>
          <span />
          {judged.map((wd) => {
            const b = clause.days?.[wd] ?? {}
            return (
              <Fragment key={wd}>
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink/50">
                  {WEEKDAY_LABELS[wd]}
                </span>
                <BoundField
                  label=""
                  value={b.min}
                  timed={timed}
                  onChange={(v) => setDay(wd, { min: v })}
                />
                <BoundField
                  label=""
                  value={b.max}
                  timed={timed}
                  onChange={(v) => setDay(wd, { max: v })}
                />
                {/* On every row rather than only on rows that differ: a
                    control that comes and goes as you type is a moving
                    target, and copying a row onto days that already match it
                    costs nothing. Absent entirely on a one-day condition,
                    where there is nowhere to copy to. */}
                {judged.length > 1 ? (
                  <Tip text={`Give every judged day ${WEEKDAY_LABELS[wd]}'s figures`}>
                    <button
                      type="button"
                      onClick={() => copyToEveryDay(wd)}
                      aria-label={`Give every judged day ${WEEKDAY_LABELS[wd]}'s figures`}
                      className={`${btnBase} p-1 rounded-md text-ink/25 hover:text-ink hover:bg-ink/5`}
                    >
                      <Copy size={11} />
                    </button>
                  </Tip>
                ) : (
                  <span />
                )}
              </Fragment>
            )
          })}
        </div>
        </div>
      )}
    </div>
  )
}

/** The rule as it stands, with the button that opens it for editing. */
function RuleSummary({
  rule,
  ctx,
  locked,
  settingUp,
  isBenchmark,
  onBenchmark,
  onEdit,
}: {
  rule: StreakRule
  ctx: StreakContext
  locked: boolean
  settingUp: boolean
  /** Whether this is the rule the day's goal is read from. */
  isBenchmark: boolean
  onBenchmark: (on: boolean) => void
  onEdit: () => void
}) {
  const c = usePalette()
  const clauses = ruleClauses(rule)
  const bar = benchmarkBar(rule, ctx)
  return (
    <div className="space-y-1.5 pl-1 pt-1">
      {/* The same sentence the panel reads back, from the same function. A
          summary written separately is a summary that can drift. */}
      <p className="text-[10px] font-mono uppercase tracking-widest text-ink/40">
        {rule.scope === "week" ? "Every week" : "Every day"}
      </p>
      <ul className="space-y-0.5">
        {clauses.map((clause) => (
          <li key={clause.id} className="text-[11px] font-mono text-ink/70">
            {clauses.length > 1 && <span className="text-ink/30">· </span>}
            <Sentence text={clauseSentence(clause, ctx, rule.scope)} />
          </li>
        ))}
      </ul>
      <p className="text-[10px] font-mono text-ink/40">
        {rule.freezesPerWeek} freeze{rule.freezesPerWeek === 1 ? "" : "s"} a
        week, expiring · banking up to {rule.freezeCap} earned
      </p>
      <p className="text-[10px] font-mono text-ink/40">
        {rule.inDayVerdict
          ? "Counts towards the day's verdict"
          : "Keeps its own streak only"}
      </p>
      {/* The last thing you told yourself. Reading it back is what makes
          writing it worth anything. */}
      {rule.looseningLog?.length ? (
        <p className="text-[10px] font-mono text-ink/45 italic">
          Last eased {fmtDateLong(rule.looseningLog.at(-1)!.at)} —{" "}
          {rule.looseningLog.at(-1)!.reason}
        </p>
      ) : null}
      {/* The benchmark switch sits out here rather than inside the draft,
          because it is not one of the rule's terms: it moves where a printed
          figure is read from and changes no verdict, so there is nothing for
          the lock to protect and nothing to explain in writing.

          Ineligible rules say **why** instead of simply not offering it. A
          switch that is quietly absent teaches nothing, and "why can't I pick
          this one" has a short true answer every time. */}
      <div className="pt-1">
        {bar ? (
          <span className="flex items-start gap-1.5 text-[10px] font-mono text-ink/30">
            <Gauge size={11} className="shrink-0 mt-px" />
            {bar}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onBenchmark(!isBenchmark)}
            className={`${btnBase} flex items-start gap-1.5 text-[10px] font-mono text-left ${
              isBenchmark
                ? "text-ink/70"
                : "text-ink/35 hover:text-ink/60"
            }`}
          >
            <Gauge
              size={11}
              className="shrink-0 mt-px"
              style={isBenchmark ? { color: c.accent } : undefined}
            />
            {isBenchmark
              ? "The day's goal is read from this rule"
              : "Read the day's goal from this rule"}
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
        <button
          type="button"
          onClick={onEdit}
          className={`${btnBase} ${BTN_SOFT} flex items-center gap-1 py-1.5`}
        >
          <Pencil size={10} /> Edit
        </button>
        <Tip multiline text={LOCK_HELP}>
          <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-ink/35 cursor-help underline decoration-dotted underline-offset-2">
            <Lock size={10} />
            {settingUp
              ? "Being set up — open until tomorrow"
              : locked
                ? `Narrowing only until ${fmtDateLong(rule.lockedUntil)}`
                : "Open to any change"}
          </span>
        </Tip>
      </div>
    </div>
  )
}

/** One rule's terms, and the note saying what the pending edit counts as. */
function RuleForm({
  rule,
  ctx,
  onChange,
  onPropose,
  pending,
  supervised,
  isBenchmark,
  onBenchmark,
  today,
}: {
  rule: StreakRule
  ctx: StreakContext
  onChange: (next: StreakRule) => void
  /** Sends the change for approval instead of applying it. */
  onPropose: (next: StreakRule, reason: string) => void
  /** The request already waiting on this rule, if any. */
  pending?: Proposal
  supervised: boolean
  isBenchmark: boolean
  onBenchmark: (on: boolean) => void
  today: Date
}) {
  const c = usePalette()
  /**
   * The rule being composed, or `null` while the summary is showing.
   *
   * Nothing here reaches the project until Done. That is the whole protection:
   * a rule under a lock cannot be edited safely one control at a time, because
   * half the intermediate states are narrowings and narrowings land at once —
   * so a stray scroll over the freeze count was permanent, and putting the
   * number back was a loosening you then had to wait a week for.
   */
  const [draft, setDraft] = useState<StreakRule | null>(null)
  // Held beside the draft rather than inside it: it explains the change, so it
  // has no meaning until there is one, and it is thrown away with Cancel.
  const [reason, setReason] = useState("")
  const settingUp = toKey(today) <= rule.startedOn
  const locked = !settingUp && toKey(today) < rule.lockedUntil

  // Normalised on both sides, so a rule being written through for the first
  // time — flat fields becoming clauses — is not itself read as an edit.
  const base: StreakRule = { ...rule, clauses: ruleClauses(rule) }

  // While something is waiting on somebody else, this rule is not yours to
  // edit: a second draft on top of an undecided one is two answers to a
  // question nobody has answered once.
  if (pending)
    return (
      <div className="space-y-1.5 pl-1 pt-1">
        <p className="text-[11px] font-mono text-ink/70">{pending.afterText}</p>
        <p className="text-[10px] font-mono text-ink/45 italic">
          “{pending.reason}”
        </p>
        <p
          className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest"
          style={{ color: c.sleep }}
        >
          <Hourglass size={10} />
          Sent for approval — the old rule stands until it is answered
        </p>
      </div>
    )

  if (!draft)
    return (
      <RuleSummary
        rule={rule}
        ctx={ctx}
        locked={locked}
        settingUp={settingUp}
        isBenchmark={isBenchmark}
        onBenchmark={onBenchmark}
        onEdit={() => {
          setReason("")
          setDraft({
            ...base,
            unitId: undefined,
            slotIds: undefined,
            op: undefined,
            value: undefined,
            weekdays: undefined,
          })
        }}
      />
    )

  const clauses = ruleClauses(draft)
  const byWeek = draft.scope === "week"
  const edit = ruleEdit(base, draft, ctx, today, reason, supervised)
  const patch = (next: Partial<StreakRule>) =>
    setDraft({ ...draft, ...next })
  const patchClause = (id: string, next: Partial<StreakClause>) =>
    patch({
      clauses: clauses.map((cl) => (cl.id === id ? { ...cl, ...next } : cl)),
    })

  return (
    <div className="space-y-4 pl-1 pt-1">
      {/* **Judge period first**, because it decides the shape of everything
          under it: by day each day is judged on its own, by week only the
          total matters. It is a property of the rule rather than of any one
          condition — a rule with three conditions has one scope — which is why
          it sits above them rather than inside each. */}
      <Row label="Judged">
        <Pills<"day" | "week">
          value={draft.scope}
          onChange={(scope) => patch({ scope })}
          options={[
            { id: "day", label: "Every day" },
            { id: "week", label: "Every week" },
          ]}
        />
        <span className="text-[10px] font-mono text-ink/40">
          {draft.scope === "week"
            ? "one figure for the whole week"
            : "each day judged on its own"}
        </span>
      </Row>

      {/* **Who this rule answers to**, beside the period it is judged over.

          It lived inside `Freezes` for as long as the fold existed, and it has
          nothing to do with freezes: a freeze is what a slip costs *you*, and
          this is whether the day's verdict hears about the slip at all. The
          lid said so out loud — `1 a week · bank 3 · counts in the day` was
          one fold summarising two unrelated facts — and the ring weight under
          it made three. Both belong with `Judged`, which is the other question
          about the rule as a whole rather than about any one condition.

          Not a term the lock protects, either way: joining or leaving the
          day's verdict changes what the *day* is worth, never what this rule
          asks of you. */}
      {/* **One row, because it is one subject.** Whether this rule votes and
          how loudly it votes were two rows with two labels and two identical
          pill tracks, stacked under a third — three of the same shape down the
          top of the form, where the fundamental question (a day or a week?)
          weighed exactly as much on the page as a drawing detail. And they are
          not two questions: the weight is meaningless unless the rule votes,
          which is why it was already conditional on it. One label over both
          says what they are together — what this rule is worth to the day —
          and the second half is absent, not disabled, when there is no vote to
          weigh.

          Neither half is a term the lock protects. Joining or leaving the
          day's verdict changes what the *day* is worth, never what this rule
          asks of you; and the weight is drawing only — the verdict is
          unchanged either way, because a day is missed the moment anything is
          missed. */}
      <Row label="In the day's verdict">
        <Pills<"in" | "out">
          value={draft.inDayVerdict ? "in" : "out"}
          onChange={(v) => patch({ inDayVerdict: v === "in" })}
          options={[
            { id: "in", label: "Counts" },
            { id: "out", label: "On its own" },
          ]}
        />
        {draft.inDayVerdict && (
          <>
            <Tip
              multiline
              text={
                "How much of the day's ring this rule takes, and where its arc starts." +
                String.fromCharCode(10, 10) +
                "Drawing only. The verdict is unchanged either way, because a day is missed the moment anything is missed — a rule that should genuinely count for less is a rule that should not be voting, which the switch beside this says honestly."
              }
            >
              <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35 cursor-help underline decoration-dotted underline-offset-2">
                weight
              </span>
            </Tip>
            <Pills<string>
              value={String(
                Math.min(5, Math.max(1, Math.round(draft.weight ?? 1))),
              )}
              onChange={(w) => patch({ weight: Number(w) })}
              options={["1", "2", "3", "4", "5"].map((n) => ({
                id: n,
                label: n,
              }))}
            />
          </>
        )}
        <Tip
          multiline
          text={
            "A day is kept when every rule that counts held. That run of days is the streak on the row above the log — the one number worth being afraid of." +
            String.fromCharCode(10, 10) +
            "A rule left out still keeps its own streak. It simply gets no vote on the day." +
            String.fromCharCode(10, 10) +
            "Switching this on counts from today, never backwards: a rule two months old could otherwise rewrite a streak out of history you can no longer edit."
          }
        >
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35 cursor-help underline decoration-dotted underline-offset-2">
            what this means
          </span>
        </Tip>
      </Row>


      {/* The conditions are the body of the form, not a section of it. They
          carried a heading while `The rule` carried one above them, and two
          headings over four rows is a table of contents for a page you can
          already see whole. What is left says it better: the scope, a rule
          across the page, and then the promise itself. */}
      <div className="h-px bg-ink/10" />

      {clauses.map((clause, i) => (
        <div key={clause.id}>
          {/* A hairline between conditions, so two blocks of three rows do not
              read as one block of six. */}
          {i > 0 && <div className="h-px my-2 bg-ink/10" />}
          <ClauseForm
            clause={clause}
            ctx={ctx}
            byWeek={byWeek}
            ordinal={i + 1}
            onChange={(next) => patchClause(clause.id, next)}
            onRemove={
              clauses.length > 1
                ? () =>
                    patch({
                      clauses: clauses.filter((cl) => cl.id !== clause.id),
                    })
                : undefined
            }
          />
        </div>
      ))}

      <Row label="">
        <Tip multiline text={CONDITION_HELP}>
          <button
            type="button"
            onClick={() =>
              patch({
                clauses: [
                  ...clauses,
                  (() => {
                    const s = seedFor(ctx)
                    return newClause(s.target, s.measure)
                  })(),
                ],
              })
            }
            className={`${btnBase} flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono bg-ink/[0.06] text-ink/55 hover:text-ink hover:bg-ink/[0.10]`}
          >
            <Plus size={10} />
            Condition
          </button>
        </Tip>
      </Row>

      {/* **When it starts judging.**

          A rule you think of at nine in the evening, having already broken it
          today, used to leave you two bad choices: create it now and lose the
          day, or hold it in your head until morning. Neither is a decision
          about the promise — they are both about the clock.

          Only forward, and only three: today, tomorrow, the coming Monday. A
          date in the past is not a start, it is a claim about days you did not
          make the promise on, and the whole point of `startedOn` is that a
          rule judges the days it was actually in force for.

          It is offered while the rule is still being set up. After that the
          rule has judged days, and moving its beginning would rewrite them. */}
      {settingUp && (
        <Fold
          title="Starts"
          summary={
            startChoices(today).find((o) => o.id === draft.startedOn)?.label ??
            fmtDateLong(draft.startedOn)
          }
        >
          <Row label="">
            <Pills<string>
              value={draft.startedOn}
              onChange={(startedOn) =>
                patch({ startedOn, inDayVerdictSince: startedOn, lockedUntil: startedOn })
              }
              options={startChoices(today)}
            />
          </Row>
          <p className="text-[10px] font-mono text-ink/40">
            Days before this are not judged by it — the streak begins here.
          </p>
        </Fold>
      )}

      {/* **What a slip costs** — the allowance and the bank, and nothing
          else now. Two settings that are almost always left alone, so they
          fold, and the lid states both: a fold reading `1 a week · bank 3` is
          a sentence you check without opening anything. */}
      <Fold
        title="Freezes"
        summary={`${draft.freezesPerWeek} a week · bank ${draft.freezeCap}`}
      >
      <Row label="">
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
            Granted each week
          </span>
          <input
            type="number"
            min={0}
            value={draft.freezesPerWeek}
            onChange={(e) =>
              patch({ freezesPerWeek: Math.max(0, Number(e.target.value) || 0) })
            }
            className={NUM}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
            Bank holds up to
          </span>
          <input
            type="number"
            min={0}
            value={draft.freezeCap}
            onChange={(e) =>
              patch({ freezeCap: Math.max(0, Number(e.target.value) || 0) })
            }
            className={NUM}
          />
        </label>
        <span className="text-[10px] font-mono text-ink/35 self-end pb-1.5">
          the weekly one expires; the bank carries over
        </span>
      </Row>
      </Fold>

      {/* A loosening the clock allows still has to be explained. The box
          appears only then — asking for a reason to *narrow* a rule would be
          asking you to justify keeping your own promise. */}
      {edit.changed && !edit.settingUp && !edit.narrowing && (
        <Row label="Because">
          <AutoTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why this is going down"
            rows={1}
            maxHeight={120}
            className={`${FIELD_SOFT_INLINE} w-full rounded-lg py-1 text-[11px]`}
          />
        </Row>
      )}

      {/* What this edit counts as, before it costs anything. The lock is
          one-sided, and an unexplained one-sided lock is indistinguishable
          from a bug — so it says which of the four cases it decided, every
          time, and Done simply refuses in the one case it cannot allow.

          **Stuck to the foot of the modal.** The form is a scope, a handful of
          conditions and three folds, and with four conditions the way out of
          it was two screens below the field you were changing — so you either
          scrolled to check what the lock had decided, or you committed
          blind. `position: sticky` inside the modal's own scrollport puts it
          where a dialog's buttons belong without lifting the draft out of
          this component: the lock's four verdicts, the reason box and the
          approval branch all live here, and threading them up to `SetupModal`
          would buy the same pixels for a great deal more coupling.

          It carries the row's own surface rather than the card's — a
          translucent wash needs an opaque base, and `bg-card` alone would
          show as a lighter patch over the recessed row it floats on. */}
      <div
        style={cellSurface(`${c.ink}0A`, c.card)}
        className="sticky bottom-0 z-20 -mx-1 px-3 py-2 mt-1 rounded-xl ring-1 ring-ink/10 shadow-lg flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDraft(null)}
          className={`${btnBase} px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wide text-ink/55 hover:text-ink hover:bg-ink/5`}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!edit.allowed && !edit.needsApproval}
          onClick={() => {
            if (edit.needsApproval) {
              onPropose(draft, reason)
              setDraft(null)
              return
            }
            // The date is stamped here rather than in the form, so it records
            // when the vote actually started counting rather than when the
            // switch was first clicked in a draft that might be thrown away.
            const joined = edit.next.inDayVerdict && !rule.inDayVerdict
            onChange(
              joined
                ? { ...edit.next, inDayVerdictSince: toKey(today) }
                : edit.next,
            )
            setDraft(null)
          }}
          className={`${btnBase} px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed`}
          style={{
            backgroundColor: edit.needsApproval ? c.sleep : c.accent,
            color: c.onFill,
          }}
        >
          {edit.needsApproval ? "Send for approval" : "Done"}
        </button>

        {!edit.changed && !edit.asksNothing && !edit.impossible && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/40">
            No change to the terms.
          </span>
        )}
        {/* **Ahead of every other verdict, because it outranks them.** The
            rest of these say what the lock decided; this one says the rule
            would stop being a rule, which no clock and no explanation can
            make acceptable. */}
        {edit.asksNothing && (
          <span
            className="flex items-center gap-1 text-[10px] font-mono"
            style={{ color: c.exam }}
          >
            <TriangleAlert size={11} />
            {edit.asksNothing} is asked for nothing — give it a floor, a
            ceiling or an answer, or drop the condition.
          </span>
        )}
        {/* **The other end of `asksNothing`, and it outranks the clock for
            the same reason.** One is a condition every day clears; this is one
            no day can, and both are rules that have stopped judging. It says
            which figures contradict each other, because "impossible" without
            the arithmetic is a form refusing to save and not saying why. */}
        {edit.impossible && (
          <span
            className="flex items-center gap-1 text-[10px] font-mono"
            style={{ color: c.exam }}
          >
            <TriangleAlert size={11} />
            <span>
              <Sentence text={edit.impossible} /> — nothing could ever satisfy
              that.
            </span>
          </span>
        )}
        {edit.changed && edit.settingUp && !edit.asksNothing && !edit.impossible && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/50">
            <ShieldCheck size={11} />
            Today is yours to get this right on.
          </span>
        )}
        {edit.changed &&
          !edit.settingUp &&
          edit.narrowing &&
          !edit.asksNothing &&
          !edit.impossible && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/50">
            <ShieldCheck size={11} />
            This only narrows the rule.
          </span>
        )}
        {edit.changed && !edit.settingUp && !edit.narrowing && edit.allowed && (
          <span
            className="flex items-center gap-1 text-[10px] font-mono"
            style={{ color: c.exam }}
          >
            <TriangleAlert size={11} />
            This could make the rule easier — saving locks it until{" "}
            {fmtDateLong(lockFrom(today))}.
          </span>
        )}
        {edit.needsApproval && (
          <span
            className="flex items-center gap-1 text-[10px] font-mono"
            style={{ color: c.sleep }}
          >
            <Hourglass size={11} />
            The clock is clear — now somebody else has to agree.
          </span>
        )}
        {edit.needsReason && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/50">
            <TriangleAlert size={11} />
            Say why first. It goes on the record, not into a log that can fail.
          </span>
        )}
        {!edit.allowed &&
          !edit.needsReason &&
          edit.changed &&
          !edit.asksNothing &&
          !edit.impossible && (
          <span
            className="flex items-center gap-1 text-[10px] font-mono"
            style={{ color: c.exam }}
          >
            <TriangleAlert size={11} />
            This could make the rule easier. It waits until{" "}
            {fmtDateLong(rule.lockedUntil)}.
          </span>
        )}
        <Tip multiline text={LOCK_HELP}>
          <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-ink/35 cursor-help underline decoration-dotted underline-offset-2">
            <Lock size={10} />
            How this works
          </span>
        </Tip>
      </div>
    </div>
  )
}

export function StreakRulesTab({
  settings,
  units,
  activities,
  slots,
  onSave,
  supervised = false,
  proposals = [],
  onPropose,
  onProposeRemoval,
  supervisorBlock,
  today = new Date(),
}: {
  settings: Settings
  units: CounterUnit[]
  activities: Activity[]
  slots: Slot[]
  onSave: (next: Settings) => void
  /** Whether a loosening has to be agreed by somebody else. */
  supervised?: boolean
  /** Requests already waiting, so a rule with one is not edited twice. */
  proposals?: Proposal[]
  onPropose?: (prev: StreakRule, next: StreakRule, reason: string) => void
  /** A rule or an achievement sent to be dropped, rather than dropped. */
  onProposeRemoval?: (
    subject: "rule" | "achievement",
    subjectId: string,
    subjectLabel: string,
    beforeText: string,
    reason: string,
  ) => void
  /** The invite and the list of supervisors, drawn by the shell. */
  supervisorBlock?: ReactNode
  today?: Date
}) {
  const rules = settings.streakRules || []
  const categories: Category[] = settings.categories || []
  const tags: Tag[] = settings.tags || []
  const ctx: StreakContext = {
    units,
    activities,
    slots,
    categories,
    tags,
    // The same resolution `streakContext` does: goals off makes a condition
    // that reads them vacuous rather than impossible.
    dailyGoals: settings.dailyGoals || {},
  }

  const seed = seedFor(ctx)

  return (
    <div className="space-y-3">
      {/* **One line, and the rest behind it.**

          Two paragraphs of prose stood permanently above the list. They are
          both true and both worth reading — once. After that they are eleven
          lines of text between you and the thing you opened the tab to edit,
          on every visit, and a preamble you have read is indistinguishable
          from chrome: you learn to start scrolling before the page has
          settled, which is a bad habit for a tab that also holds a lock.

          A `<details>` rather than a tooltip: it is too long to hover over
          comfortably, it wants to be re-read rather than glanced at, and the
          browser's find-in-page can still reach it closed. Same `Fold` the
          conditions use, so nothing new has to be learned about how it opens.
          The lid carries the sentence people actually get wrong, because that
          is the one worth saying whether or not anybody opens it. */}
      <Fold
        title="How streaks work"
        summary="kept by the day, paid for by the week"
      >
        <p className="text-[11px] font-mono text-ink/45 leading-relaxed">
          Your own streaks, each one a promise about what you record — never
          oversleep, two hours of lessons a day, no youtube after the evening
          starts, the gym three times a week. A promise can hold several
          conditions at once, and all of them have to keep.
        </p>
        <p className="text-[11px] font-mono text-ink/45 leading-relaxed">
          <strong className="text-ink/70">
            You keep a streak by the day and pay for it by the week.
          </strong>{" "}
          Each streak grants an allowance of freezes every Monday, which is
          gone if unused, and banks one more for every week it comes through
          clean. A week seals on the Tuesday after it ends — the day its last
          day passes out of the writing window — and what it earned is written
          once and never recalculated.
        </p>
      </Fold>

      <EditableList<StreakRule>
        items={rules}
        onChange={(streakRules) => onSave({ ...settings, streakRules })}
        noun="streak"
        minItems={0}
        /* Seeded from the project's own first activity rather than from all
           study time. `All study time` is no longer offered, and a new rule
           landing on it was the one thing keeping it on the menu — the picker
           has to show whatever the condition currently says, so a fresh rule
           starting there put it back for everybody. */
        newItem={() => newStreakRule(seed.target, seed.measure, today)}
        warningNote={(label) =>
          `Remove "${label}"? Its streak goes with it, and so does every freeze banked against it. The days you marked stay exactly as they are.`
        }
        /* **Dropping a rule is the largest loosening there is**, so it walks
           the same gates one does: free on the day it was written, then the
           clock, then a written reason, then the supervisor. It was free at
           any hour, which made the week-long wait on lowering a bar a wait you
           could step around by removing the bar. */
        removeGate={(rule, reason) =>
          // A rule's grace day is its `startedOn`, which is the same idea an
          // achievement spells `createdOn`: the day it began to protect
          // anything.
          removalGate(
            { createdOn: rule.startedOn, lockedUntil: rule.lockedUntil },
            today,
            reason,
            supervised,
          )
        }
        onProposeRemove={(rule, reason) =>
          onProposeRemoval?.(
            "rule",
            rule.id,
            rule.label,
            ruleText(rule, ctx),
            reason,
          )
        }
        extra={(rule, update) => (
          <RuleForm
            rule={rule}
            ctx={ctx}
            today={today}
            supervised={supervised}
            isBenchmark={settings.benchmarkRuleId === rule.id}
            /* Exclusive by construction: one field holding one id, so
               nominating a second cannot leave the first also nominated. */
            onBenchmark={(on) =>
              onSave({
                ...settings,
                benchmarkRuleId: on ? rule.id : undefined,
              })
            }
            pending={proposals.find(
              (p) => p.subjectId === rule.id && p.state === "pending",
            )}
            onPropose={(next, reason) => onPropose?.(rule, next, reason)}
            onChange={(next) => update(next)}
          />
        )}
      />

      {supervisorBlock}
    </div>
  )
}
