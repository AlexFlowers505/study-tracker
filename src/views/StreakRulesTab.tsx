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

import { useState } from "react"
import type { ReactNode } from "react"
import {
  ChevronRight,
  Gauge,
  Hourglass,
  Lock,
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
import type { RuleProposal } from "../types/model"
import { benchmarkBar } from "../lib/benchmark"
import {
  boundsOnWeekday,
  clauseBounds,
  slotBoundsOnWeekday,
  clauseSentence,
  clauseWeekdays,
  clauseTarget,
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
import { AutoTextarea } from "../ui/controls"
import { EditableList } from "../ui/EditableList"
import { Pills } from "../ui/Pills"
import { Sentence } from "../ui/Sentence"
import { CountersPicker } from "./CountersPicker"
import { WORD } from "./countersPick"
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
    <div className="px-3 pb-3 pt-1 space-y-2">{children}</div>
  </details>
)

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
 * Hours and minutes, never decimal hours.
 *
 * The same rule the rest of the app follows: "1.5h" has to be multiplied by 60
 * before it means anything you can act on, and doing that arithmetic is the
 * job. Two boxes also make "two and a half hours" a thing you type rather than
 * a thing you convert.
 */
function DurationField({
  minutes,
  onChange,
}: {
  minutes: number
  onChange: (next: number) => void
}) {
  const h = Math.floor(Math.max(0, minutes) / 60)
  const m = Math.max(0, minutes) % 60
  const num = (raw: string) => Math.max(0, Number(raw) || 0)
  return (
    <>
      <input
        type="number"
        min={0}
        value={h}
        onChange={(e) => onChange(num(e.target.value) * 60 + m)}
        className={NUM}
      />
      <span className={WORD}>h</span>
      <input
        type="number"
        min={0}
        max={59}
        value={m}
        onChange={(e) => onChange(h * 60 + Math.min(59, num(e.target.value)))}
        className={NUM}
      />
      <span className={WORD}>m</span>
    </>
  )
}

/** What the slot restriction currently says, for a closed fold. */
const slotsSummary = (clause: StreakClause, ctx: StreakContext): string => {
  const named = clause.slotIds?.length
    ? clause.slotIds
        .map((id) => ctx.slots.find((x) => x.id === id)?.label || "removed")
        .join(", ")
    : "the whole day"
  const extra = Object.keys(slotBoundsOnWeekday(clause, 0)).length
  return extra ? `${named} · ${extra} with a figure` : named
}

/** And the weekdays. */
const daysSummary = (clause: StreakClause): string => {
  const judged = clauseWeekdays(clause)
  if (judged.length === WEEKDAY_ORDER.length)
    return clause.days ? "every day, figures per day" : "every day"
  return judged.map((wd) => WEEKDAY_LABELS[wd]).join(", ")
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
  /** Which of several this is, or null when it is the only one. */
  ordinal: number | null
  onChange: (patch: Partial<StreakClause>) => void
  /** Absent on the only condition — a rule with none is not a rule. */
  onRemove?: () => void
}) {
  const target = clauseTarget(clause)
  const info = targetInfo(target, ctx)
  const timed = info.measure === "time"
  // Resolved, never the stored fields: a condition written before the pair
  // existed still carries an operator and one number, and only this knows it.
  const bounds = clauseBounds(clause, ctx, toKey(new Date()))

  /* Both chip rows work the same way: everything lit means no restriction, and
     turning the last one off is refused because "count nothing" and "judge no
     day" are not rules. All lit is stored as nothing at all, so the two ways
     of saying the same thing collapse into one. */
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

       The number appears only when there is more than one: `Condition 1` over
       a lone condition is a heading that tells you nothing you could not see,
       and this form has just had two of those taken out of it. */
    <fieldset className="@container space-y-2 min-w-0 border-0 p-0 m-0">
      {/* **The name of the block and the way out of it, on one line.**

          Both appear under exactly the same condition — there is more than one
          condition — so there is no case where one needs the other's space and
          nothing to position around. The cross used to be pinned to the
          corner, which left it floating a line below the heading it belonged
          to; a `<legend>` at full width holds them both.

          **A bin, not a cross.** A cross two lines down empties a bound, and
          one glyph doing both "clear this field" and "delete this whole block"
          is a difference nobody should have to learn from the size of the
          icon. The bin is what `EditableList` already deletes with. */}
      {ordinal !== null && (
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
      )}
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

      {/* What it asks of them. Also always open — together with the line above
          it, this *is* the condition. */}
      {!info.check && (
        <Row label={byWeek ? "Per week" : "Per day"}>
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

      {/* Where it counts, and whether any one slot carries a figure of its
          own. One fold, because they are one question asked twice — and the
          lid says which slots, so the common answer needs no opening. */}
      {!info.check && ctx.slots.length > 0 && (
        <Fold title="Slots" summary={slotsSummary(clause, ctx)}>
          <Row label="Counts in">
            <div className="flex flex-wrap gap-1">
              {ctx.slots.map((slot) => {
                const on =
                  !clause.slotIds?.length || clause.slotIds.includes(slot.id)
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        slotIds: toggleIn(
                          clause.slotIds,
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

          <Row label="Of which">
            <SlotBounds
              clause={clause}
              ctx={ctx}
              timed={timed}
              byWeek={byWeek}
              onChange={onChange}
            />
          </Row>
        </Fold>
      )}

      {/* A weekly rule counts the whole week; which weekdays it fell on is not
          a question it can ask.

          Nor can a day-scoped check, which asks it already: a weekday with no
          accepted answer is a weekday it does not judge, and that is what its
          grid says in the row it leaves empty. Two controls for one question
          is one too many, and the one that goes is the one that was not
          telling the truth. */}
      {!byWeek && !info.check && (
        <Fold title="Days" summary={daysSummary(clause)}>
          <WeekdayRow clause={clause} ctx={ctx} timed={timed} onChange={onChange} />
        </Fold>
      )}

      {/* Why this condition is here — its own rather than the rule's, since a
          compound rule is one promise made for several reasons. Not a term, so
          the lock never sees it. */}
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

  const toggle = (weekday: number, answer: CheckState) => {
    const on = allow[weekday] ?? []
    const next = on.includes(answer)
      ? on.filter((a) => a !== answer)
      : [...on, answer]
    const days = { ...allow }
    // Nothing ticked is the day dropping out, which is what it means.
    if (next.length) days[weekday] = next
    else delete days[weekday]
    onChange({
      allow: days,
      weekdays: undefined,
      min: undefined,
      max: undefined,
      op: undefined,
      value: undefined,
    })
  }

  return (
    <div className="space-y-1 w-full">
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
 * A figure on a particular slot, on top of the day's own.
 *
 * `slotIds` above already says *where the day's figure is counted*. This is a
 * different question and both answers apply: the day may want two hours in
 * total while insisting one of them lands in the morning.
 *
 * Only offered per slot on demand. A row of seven empty fields under every
 * condition would be the form asking a question almost nobody has, and the
 * ones who do have it usually have it about one slot.
 */
function SlotBounds({
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
  /* **Shared unless you say otherwise.** One slot requirement for every day is
     what almost every rule means, and it stays one row. Turning it off gives
     each weekday its own, seeded from the shared one so nothing changes about
     the rule until a figure does.

     A week-scoped condition has no per-day anything to offer: it counts the
     week, and which day the hour fell on is not a question it asks. */
  const perDay = !!clause.days && judged.some((wd) => clause.days?.[wd]?.slots)
  const [editing, setEditing] = useState(judged[0] ?? 0)
  const showing = perDay ? editing : judged[0] ?? 0
  const current = slotBoundsOnWeekday(clause, showing)

  const write = (next: Record<string, ClauseBounds>) => {
    const cleaned = Object.fromEntries(
      Object.entries(next).filter(
        ([, b]) => b.min !== undefined || b.max !== undefined,
      ),
    )
    const value = Object.keys(cleaned).length ? cleaned : undefined
    if (!perDay) return onChange({ slots: value })
    onChange({
      days: {
        ...clause.days,
        [showing]: { ...(clause.days?.[showing] ?? {}), slots: value },
      },
    })
  }

  const setPerDay = (on: boolean) => {
    if (!on) {
      // Back to one set for every day: the one you were last looking at is
      // the one that survives, since it is the one you were editing.
      const days = { ...clause.days }
      judged.forEach((wd) => {
        if (days[wd]) days[wd] = { ...days[wd], slots: undefined }
      })
      return onChange({ days, slots: current })
    }
    const days: Record<number, DayRequirement> = { ...clause.days }
    judged.forEach((wd) => {
      days[wd] = { ...(days[wd] ?? boundsOnWeekday(clause, ctx, wd)), slots: current }
    })
    onChange({ days, slots: undefined, weekdays: undefined })
  }

  return (
    <div className="space-y-1.5 w-full">
      {!byWeek && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPerDay(!perDay)}
            aria-pressed={!perDay}
            style={
              !perDay
                ? { backgroundColor: `${c.accent}24`, color: c.accent }
                : undefined
            }
            className={`${btnBase} px-2 py-1 rounded-full text-[10px] font-mono ${
              perDay ? "text-ink/35 hover:text-ink/70" : ""
            }`}
          >
            shared time slots
          </button>
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
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5 w-full">
      {ctx.slots.map((slot) => {
        const b = current[slot.id]
        if (!b)
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => write({ ...current, [slot.id]: { min: 0 } })}
              className={`${btnBase} px-2 py-1 rounded-full text-[10px] font-mono text-ink/35 hover:text-ink/70 bg-ink/[0.05]`}
            >
              + {slot.label}
            </button>
          )
        const side: "min" | "max" = b.min !== undefined ? "min" : "max"
        const shown = b.min ?? b.max ?? 0
        return (
          <span
            key={slot.id}
            className="flex items-center gap-1 rounded-full px-2 py-1"
            style={{ backgroundColor: `${slot.color}1A` }}
          >
            <span
              className="text-[10px] font-mono"
              style={{ color: slot.color }}
            >
              {slot.label}
            </span>
            <Pills<"min" | "max">
              value={side}
              onChange={(next) =>
                write({ ...current, [slot.id]: { [next]: shown } })
              }
              options={[
                { id: "min", label: "min" },
                { id: "max", label: "max" },
              ]}
            />
            {timed ? (
              <DurationField
                minutes={shown}
                onChange={(v) =>
                  write({ ...current, [slot.id]: { [side]: v } })
                }
              />
            ) : (
              <input
                type="number"
                min={0}
                value={shown}
                onChange={(e) =>
                  write({
                    ...current,
                    [slot.id]: {
                      [side]: Math.max(0, Number(e.target.value) || 0),
                    },
                  })
                }
                className={NUM}
              />
            )}
            <button
              type="button"
              onClick={() => {
                const next = { ...current }
                delete next[slot.id]
                write(next)
              }}
              className={`${btnBase} rounded-full text-ink/30 hover:text-ink`}
              style={{ color: c.ink }}
            >
              <X size={11} />
            </button>
          </span>
        )
      })}
      </div>
    </div>
  )
}

/**
 * Which weekdays a condition judges, and — once you ask for it — a different
 * figure on each.
 *
 * **Two modes, because two questions.** Most conditions ask the same thing
 * every day they cover, and that stays one number and a row of day switches.
 * Real goals often do not: three hours most days, ninety minutes on Thursday.
 * Saying that took seven conditions before, which then drifted apart the first
 * time any one of them was edited.
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
  const perDay = !!clause.days
  const judged = clauseWeekdays(clause)

  const setPerDay = (on: boolean) => {
    if (!on) return onChange({ days: undefined })
    // Seeded from what the condition already asks, so switching the mode on
    // changes nothing about the rule — it only makes the numbers editable.
    const days: Record<number, ClauseBounds> = {}
    judged.forEach((wd) => {
      days[wd] = boundsOnWeekday(clause, ctx, wd)
    })
    onChange({ days, weekdays: undefined })
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
    onChange({ days: { ...clause.days, [wd]: bounds } })

  return (
    <div className="space-y-1.5 w-full">
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
        {!perDay && judged.length === WEEKDAY_ORDER.length && (
          <span className="text-[9px] font-mono text-ink/35">every day</span>
        )}
        <button
          type="button"
          onClick={() => setPerDay(!perDay)}
          aria-pressed={perDay}
          style={
            perDay
              ? { backgroundColor: `${c.accent}24`, color: c.accent }
              : undefined
          }
          className={`${btnBase} ml-1 px-2 py-1 rounded-full text-[10px] font-mono ${
            perDay ? "" : "text-ink/35 hover:text-ink/70"
          }`}
        >
          a figure per day
        </button>
      </div>

      {perDay && (
        <div className="flex flex-wrap gap-2">
          {judged.map((wd) => {
            const b = clause.days?.[wd] ?? {}
            const shown = b.min ?? b.max ?? 0
            const side: "min" | "max" = b.min !== undefined ? "min" : "max"
            return (
              <label key={wd} className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-mono uppercase tracking-widest text-ink/40">
                  {WEEKDAY_LABELS[wd]}
                </span>
                {timed ? (
                  <DurationField
                    minutes={shown}
                    onChange={(v) => setDay(wd, { ...b, [side]: v })}
                  />
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={shown}
                    onChange={(e) =>
                      setDay(wd, {
                        ...b,
                        [side]: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className={NUM}
                  />
                )}
              </label>
            )
          })}
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
  pending?: RuleProposal
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
            ordinal={clauses.length > 1 ? i + 1 : null}
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

      {/* **What a slip costs, and who it costs it to** — the allowance, the
          bank, and whether the day's verdict hears about it at all. Four
          settings that are almost always left alone, so they fold, and the lid
          states every one of them: a fold reading `1 a week, bank 3 · counts`
          is a sentence you check without opening anything. */}
      <Fold
        title="Freezes"
        summary={`${draft.freezesPerWeek} a week · bank ${draft.freezeCap} · ${
          draft.inDayVerdict ? "counts in the day" : "own streak"
        }`}
      >
      {/* Not a term the lock protects: joining or leaving the day's verdict
          changes what the *day* is worth, never what this rule asks of you. */}
      <Row label="The day">
        <Pills<"in" | "out">
          value={draft.inDayVerdict ? "in" : "out"}
          onChange={(v) => patch({ inDayVerdict: v === "in" })}
          options={[
            { id: "in", label: "Counts" },
            { id: "out", label: "On its own" },
          ]}
        />
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

      {/* Drawing only, so it is not a term and the lock never sees it. It sets
          how much of the day's ring this rule takes and where its arc starts;
          the verdict is unchanged, because a day is missed the moment anything
          is missed. A rule that should genuinely count for less is a rule that
          should not be voting — the switch above says that honestly. */}
      {draft.inDayVerdict && (
        <Row label="Weight in the ring">
          <Pills<string>
            value={String(Math.min(5, Math.max(1, Math.round(draft.weight ?? 1))))}
            onChange={(w) => patch({ weight: Number(w) })}
            options={["1", "2", "3", "4", "5"].map((n) => ({ id: n, label: n }))}
          />
          <span className="text-[10px] font-mono text-ink/40">
            how much of the day this is about
          </span>
        </Row>
      )}

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

        {!edit.changed && !edit.asksNothing && (
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
        {edit.changed && edit.settingUp && !edit.asksNothing && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/50">
            <ShieldCheck size={11} />
            Today is yours to get this right on.
          </span>
        )}
        {edit.changed && !edit.settingUp && edit.narrowing && !edit.asksNothing && (
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
        {!edit.allowed && !edit.needsReason && edit.changed && !edit.asksNothing && (
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
  proposals?: RuleProposal[]
  onPropose?: (prev: StreakRule, next: StreakRule, reason: string) => void
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
      <p className="text-[11px] font-mono text-ink/45 leading-relaxed">
        Your own streaks, each one a promise about what you record — never
        oversleep, two hours of lessons a day, no youtube after the evening
        starts, the gym three times a week. A promise can hold several
        conditions at once, and all of them have to keep.
      </p>

      {/* The part everyone gets wrong. You watch days; the accounting runs on
          weeks, and none of that is visible in a tab that talks about days. */}
      <p className="text-[11px] font-mono text-ink/45 leading-relaxed">
        <strong className="text-ink/70">
          You keep a streak by the day and pay for it by the week.
        </strong>{" "}
        Each streak grants an allowance of freezes every Monday, which is gone
        if unused, and banks one more for every week it comes through clean. A
        week seals on the Tuesday after it ends — the day its last day passes
        out of the writing window — and what it earned is written once and
        never recalculated.
      </p>

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
        onProposeRemove={(rule, reason) => onPropose?.(rule, rule, reason)}
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
              (p) => p.ruleId === rule.id && p.state === "pending",
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
