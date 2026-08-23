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
  Hourglass,
  Lock,
  Pencil,
  Plus,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react"
import type {
  Activity,
  Category,
  CounterUnit,
  Labeled,
  Settings,
  Slot,
  StreakClause,
  StreakOp,
  StreakRule,
  StreakTarget,
  StreakTargetKind,
  Tag,
} from "../types/model"
import { isCheck, splitByKind } from "../lib/checks"
import type { StreakContext, StreakMeasure } from "../lib/customStreaks"
import type { RuleProposal } from "../types/model"
import {
  clauseSentence,
  clauseTarget,
  lockFrom,
  newClause,
  newStreakRule,
  ruleClauses,
  ruleEdit,
  targetInfo,
  targetMeasure,
} from "../lib/customStreaks"
import { WEEKDAY_LABELS, WEEKDAY_ORDER, fmtDateLong, toKey } from "../lib/date"
import { BTN_SOFT, FIELD_SOFT_INLINE, btnBase } from "../lib/theme"
import { AutoTextarea } from "../ui/controls"
import { EditableList } from "../ui/EditableList"
import { segBtn, segBtnStyle } from "../ui/buttonStyles"
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

function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (next: T) => void
}) {
  const c = usePalette()
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-ink/[0.07] p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          style={segBtnStyle(value === o.id, c)}
          className={segBtn(value === o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
    <span className="w-16 shrink-0 text-[9px] font-mono uppercase tracking-widest text-ink/40">
      {label}
    </span>
    {children}
  </div>
)

const NUM = `${FIELD_SOFT_INLINE} w-14 rounded-lg py-1 text-[11px] text-center`
const SELECT = `${FIELD_SOFT_INLINE} max-w-52 rounded-lg py-1 text-[11px]`
/* Narrower than the one beside it, and deliberately: six fixed words against a
   list of the project's own names, and equal widths would read as two halves
   of one answer rather than as a question and its answer. */
const KIND_SELECT = `${FIELD_SOFT_INLINE} max-w-36 rounded-lg py-1 text-[11px]`
const WORD = "text-[11px] font-mono text-ink/55"

/**
 * The kinds of thing you can point a condition at.
 *
 * Not the same list as `StreakTargetKind`: a tally and a check are both a
 * `unit` in the data and two different questions to a person, and this is the
 * list a person is choosing from. `targetKindOf` is the whole of the mapping.
 */
type PickKind = "time" | "activity" | "tally" | "check" | "category" | "tag"

const PICKS: PickKind[] = [
  "time",
  "activity",
  "tally",
  "check",
  "category",
  "tag",
]

const PICK_LABEL: Record<PickKind, string> = {
  time: "All study time",
  activity: "Activity",
  tally: "Tally",
  check: "Check",
  category: "Category",
  tag: "Tag",
}

const targetKindOf = (pick: PickKind): StreakTargetKind =>
  pick === "tally" || pick === "check" ? "unit" : pick

/** Which kind an existing target belongs to, splitting units back in two. */
function pickOf(target: StreakTarget, ctx: StreakContext): PickKind {
  if (target.kind !== "unit") return target.kind
  const unit = ctx.units.find((u) => u.id === target.id)
  return unit && isCheck(unit) ? "check" : "tally"
}

/** What the second dropdown offers. Empty for study time, which names nothing. */
function choicesFor(pick: PickKind, ctx: StreakContext): Labeled[] {
  const { tallies, checks } = splitByKind(ctx.units)
  if (pick === "activity") return ctx.activities
  if (pick === "tally") return tallies
  if (pick === "check") return checks
  if (pick === "category") return ctx.categories
  if (pick === "tag") return ctx.tags
  return []
}

/**
 * What a condition is about — **the kind first, then the one**, plus the one
 * question a category raises.
 *
 * Two dropdowns rather than one grouped list. Grouping is not choosing: with
 * everything in a single list you had to open it and scroll past forty names
 * to discover that tags were at the bottom, and the kinds themselves — the
 * taxonomy the rest of the app is built on — were only visible as headings
 * inside something you had to be holding open. Asking the kind first is the
 * order the question is actually thought in, and it makes the second list
 * short enough to read.
 *
 * A kind with nothing in it is absent from the first dropdown, for the same
 * reason a tab is: there is nothing behind it. Study time is always there.
 */
function TargetPicker({
  target,
  ctx,
  onChange,
}: {
  target: StreakTarget
  ctx: StreakContext
  onChange: (next: StreakTarget) => void
}) {
  const pick = pickOf(target, ctx)
  const choices = choicesFor(pick, ctx)
  const kinds = PICKS.filter(
    (p) => p === "time" || choicesFor(p, ctx).length > 0,
  )
  // Which halves this category actually holds. The choice is only a question
  // when it holds both; otherwise there is one answer and it is stamped in
  // without asking.
  const hasCounts = ctx.units.some((u) => u.categoryId === target.id)
  const hasTime = ctx.activities.some((a) => a.categoryId === target.id)
  const mixed = target.kind === "category" && hasCounts && hasTime

  const defaultMeasure = (id: string): StreakMeasure =>
    ctx.units.some((u) => u.categoryId === id) ? "count" : "time"

  /* A category's measure is stored the moment one is picked, never inferred
     later: filing one more tally under it must not change what a rule written
     today measures. Picking a *different* category re-stamps it, since the
     answer belongs to that category rather than to the condition. */
  const make = (nextPick: PickKind, id: string): StreakTarget =>
    nextPick === "time"
      ? { kind: "time" }
      : nextPick === "category"
        ? { kind: "category", id, measure: defaultMeasure(id) }
        : { kind: targetKindOf(nextPick), id }

  // A target pointing at something since deleted keeps its place in the list,
  // named as `targetInfo` names it. Dropping it would leave the select showing
  // its first option instead — a silent claim that the rule is about something
  // it is not.
  const missing = choices.length > 0 && !choices.some((o) => o.id === target.id)

  return (
    <>
      <select
        value={pick}
        onChange={(e) => {
          const next = e.target.value as PickKind
          onChange(make(next, choicesFor(next, ctx)[0]?.id || ""))
        }}
        className={KIND_SELECT}
      >
        {kinds.map((p) => (
          <option key={p} value={p}>
            {PICK_LABEL[p]}
          </option>
        ))}
      </select>

      {choices.length > 0 && (
        <select
          value={target.id || ""}
          onChange={(e) => onChange(make(pick, e.target.value))}
          className={SELECT}
        >
          {missing && (
            <option value={target.id || ""}>
              {targetInfo(target, ctx).label}
            </option>
          )}
          {choices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {mixed && (
        <Tip
          multiline
          text={
            "This category holds both things that record time and things that record a count, so it has to be told which half to measure." +
            String.fromCharCode(10, 10) +
            "Stored with the rule rather than worked out from the members, so filing one more counter under the category cannot change what an existing rule means."
          }
        >
          <Pills<StreakMeasure>
            value={targetMeasure(target, ctx)}
            onChange={(measure) => onChange({ ...target, measure })}
            options={[
              { id: "time", label: "Hours" },
              { id: "count", label: "Times" },
            ]}
          />
        </Tip>
      )}
    </>
  )
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

/** One condition: what is measured, where, and on which days. */
function ClauseForm({
  clause,
  ctx,
  byWeek,
  onChange,
  onRemove,
}: {
  clause: StreakClause
  ctx: StreakContext
  byWeek: boolean
  onChange: (patch: Partial<StreakClause>) => void
  /** Absent on the only condition — a rule with none is not a rule. */
  onRemove?: () => void
}) {
  const c = usePalette()
  const target = clauseTarget(clause)
  const info = targetInfo(target, ctx)
  const timed = info.measure === "time"

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
    <div className="space-y-2">
      <Row label="Keeping">
        <TargetPicker
          target={target}
          ctx={ctx}
          onChange={(next) => {
            const measure = targetMeasure(next, ctx)
            // Changing what is measured changes what the number means, so the
            // number goes back to its default for the new measure. "At most 0
            // minutes of lessons" is a legal sentence nobody has ever meant.
            const same = measure === info.measure
            onChange({
              target: next,
              ...(same ? {} : { op: newClause(next, measure).op }),
              ...(same ? {} : { value: newClause(next, measure).value }),
            })
          }}
        />
        <span className={WORD}>must be</span>

        {/* A check has two answers, not a comparison. "Overslept must be at
            most 0 times" is the same rule and nobody would write it. */}
        {info.check ? (
          <Pills<"yes" | "no">
            value={clause.op === "atLeast" ? "yes" : "no"}
            onChange={(v) =>
              onChange(
                v === "yes"
                  ? { op: "atLeast", value: 1 }
                  : { op: "atMost", value: 0 },
              )
            }
            options={[
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
            ]}
          />
        ) : (
          <>
            <select
              value={clause.op}
              onChange={(e) => onChange({ op: e.target.value as StreakOp })}
              className={SELECT}
            >
              <option value="atLeast">at least</option>
              <option value="atMost">at most</option>
            </select>
            {timed ? (
              <>
                {clause.useDailyGoal ? (
                  <span className={`${WORD} font-bold`}>
                    {byWeek ? "the week's goal" : "the day's goal"}
                  </span>
                ) : (
                  <DurationField
                    minutes={clause.value}
                    onChange={(value) => onChange({ value })}
                  />
                )}
                <span className={WORD}>{byWeek ? "a week" : "a day"}</span>
                {/* The goal is seven numbers and a condition carries one, so
                    this is the only way to say "hold me to my goal" without
                    writing seven conditions that drift apart from the seven
                    fields in Setup the first time either is edited. */}
                <Tip
                  multiline
                  text={
                    "Hold this to the daily goal set in Setup rather than to a fixed number, so the two cannot drift apart." +
                    String.fromCharCode(10, 10) +
                    "While it is on, lowering that goal lowers this rule, and the lock treats it as such."
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ useDailyGoal: !clause.useDailyGoal })
                    }
                    aria-pressed={!!clause.useDailyGoal}
                    style={
                      clause.useDailyGoal
                        ? { backgroundColor: `${c.accent}24`, color: c.accent }
                        : undefined
                    }
                    className={`${btnBase} px-2 py-1 rounded-full text-[10px] font-mono ${
                      clause.useDailyGoal ? "" : "text-ink/35 hover:text-ink/70"
                    }`}
                  >
                    use the goal
                  </button>
                </Tip>
              </>
            ) : (
              <>
                <input
                  type="number"
                  min={0}
                  value={clause.value}
                  onChange={(e) =>
                    onChange({ value: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className={NUM}
                />
                <span className={WORD}>
                  {byWeek ? "times a week" : "times a day"}
                </span>
              </>
            )}
          </>
        )}

        {onRemove && (
          <Tip text="Drop this condition">
            <button
              type="button"
              onClick={onRemove}
              className={`${btnBase} ml-auto p-1 rounded-full text-ink/35 hover:text-ink hover:bg-ink/5`}
            >
              <X size={12} />
            </button>
          </Tip>
        )}
      </Row>

      {/* Slots narrow anything that is logged into one — hours as much as
          counts. A check is a fact about the whole day and has none. */}
      {!info.check && (
        <Row label="In">
          <div className="flex flex-wrap gap-1">
            {ctx.slots.map((s) => {
              const on = !clause.slotIds?.length || clause.slotIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      slotIds: toggleIn(
                        clause.slotIds,
                        ctx.slots.map((x) => x.id),
                        s.id,
                      ),
                    })
                  }
                  aria-pressed={on}
                  style={
                    on
                      ? { backgroundColor: `${s.color}24`, color: s.color }
                      : undefined
                  }
                  className={`${btnBase} px-2 py-1 rounded-full text-[10px] font-mono ${
                    on ? "" : "text-ink/35 hover:text-ink/70"
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
          {!clause.slotIds?.length && (
            <span className="text-[9px] font-mono text-ink/35">whole day</span>
          )}
        </Row>
      )}

      {/* A weekly rule counts the whole week; which weekdays it fell on is not
          a question it can ask. */}
      {!byWeek && (
        <Row label="On">
          <div className="flex flex-wrap gap-1">
            {WEEKDAY_ORDER.map((wd) => {
              const on =
                !clause.weekdays?.length || clause.weekdays.includes(wd)
              return (
                <button
                  key={wd}
                  type="button"
                  onClick={() =>
                    onChange({
                      weekdays: toggleIn(
                        clause.weekdays?.map(String),
                        WEEKDAY_ORDER.map(String),
                        String(wd),
                      )?.map(Number),
                    })
                  }
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
          </div>
          {!clause.weekdays?.length && (
            <span className="text-[9px] font-mono text-ink/35">every day</span>
          )}
        </Row>
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
  onEdit,
}: {
  rule: StreakRule
  ctx: StreakContext
  locked: boolean
  settingUp: boolean
  onEdit: () => void
}) {
  const clauses = ruleClauses(rule)
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
            {clauseSentence(clause, ctx, rule.scope)}
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
  const settingUp = toKey(today) === rule.startedOn
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
    <div className="space-y-2 pl-1 pt-1">
      <Row label="Judge">
        <Pills<"day" | "week">
          value={draft.scope}
          onChange={(scope) => patch({ scope })}
          options={[
            { id: "day", label: "Every day" },
            { id: "week", label: "Every week" },
          ]}
        />
      </Row>

      {clauses.map((clause, i) => (
        <div key={clause.id}>
          {/* A hairline between conditions, so two blocks of three rows do not
              read as one block of six. */}
          {i > 0 && <div className="h-px my-2 bg-ink/10" />}
          <ClauseForm
            clause={clause}
            ctx={ctx}
            byWeek={byWeek}
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
                clauses: [...clauses, newClause({ kind: "time" }, "time")],
              })
            }
            className={`${btnBase} flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono bg-ink/[0.06] text-ink/55 hover:text-ink hover:bg-ink/[0.10]`}
          >
            <Plus size={10} />
            Condition
          </button>
        </Tip>
      </Row>

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

      <Row label="Freezes">
        <input
          type="number"
          min={0}
          value={draft.freezesPerWeek}
          onChange={(e) =>
            patch({ freezesPerWeek: Math.max(0, Number(e.target.value) || 0) })
          }
          className={NUM}
        />
        <span className={WORD}>a week, expiring · bank up to</span>
        <input
          type="number"
          min={0}
          value={draft.freezeCap}
          onChange={(e) =>
            patch({ freezeCap: Math.max(0, Number(e.target.value) || 0) })
          }
          className={NUM}
        />
        <span className={WORD}>earned</span>
      </Row>

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
          time, and Done simply refuses in the one case it cannot allow. */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
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

        {!edit.changed && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/40">
            No change to the terms.
          </span>
        )}
        {edit.changed && edit.settingUp && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/50">
            <ShieldCheck size={11} />
            Today is yours to get this right on.
          </span>
        )}
        {edit.changed && !edit.settingUp && edit.narrowing && (
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
        {!edit.allowed && !edit.needsReason && edit.changed && (
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
    dailyGoals:
      settings.goalsEnabled === false ? {} : settings.dailyGoals || {},
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-mono text-ink/45 leading-relaxed">
        Your own streaks, each one a promise about what you record — never
        oversleep, two hours of lessons a day, no youtube after the evening
        starts, the gym three times a week. A promise can hold several
        conditions at once, and all of them have to keep. Each streak keeps its
        own freezes: an allowance every week that expires, and one banked
        freeze for every week you keep clean.
      </p>

      <EditableList<StreakRule>
        items={rules}
        onChange={(streakRules) => onSave({ ...settings, streakRules })}
        noun="streak"
        minItems={0}
        /* A new rule is about all study time: the one target every project
           has, whether or not it has ever defined a counter. */
        newItem={() => newStreakRule({ kind: "time" }, "time", today)}
        warningNote={(label) =>
          `Remove "${label}"? Its streak goes with it, and so does every freeze banked against it. The days you marked stay exactly as they are.`
        }
        extra={(rule, update) => (
          <RuleForm
            rule={rule}
            ctx={ctx}
            today={today}
            supervised={supervised}
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
