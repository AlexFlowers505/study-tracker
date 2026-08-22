/* ---------------------------------------------------------------
   Setup's Streaks tab — the rules you are going to be judged by.

   The shared half is `EditableList`, like every other tab. What is new is the
   rule, and the rule is written as **a sentence with dropdowns in it**.

   That is the whole design decision here. A grid of labelled fields would
   store the same eight values and be unreadable: `op: atMost, value: 0` is
   correct and says nothing, where "Youtube must be at most 0 times in Evening,
   Night" is the same thing said in a way you can disagree with. This is a rule
   you will live under for months, and the only way to check that what you
   built is what you meant is to read it back.

   The middle line changes shape with the counter, because that is what the two
   kinds of counter are: a check asks *must it be yes or no*, a tally asks *how
   many, and where*.

   Editing goes through `ruleEdit`, one control at a time. A change that
   narrows the rule lands immediately; one that might loosen it waits out the
   clock, and the line under the rule says which it was — a clever lock nobody
   can predict is worse than a blunt one they can.
--------------------------------------------------------------- */

import { useState } from "react"
import type { ReactNode } from "react"
import { Lock, ShieldCheck, TriangleAlert } from "lucide-react"
import type {
  CounterUnit,
  Settings,
  Slot,
  StreakOp,
  StreakRule,
} from "../types/model"
import { isCheck } from "../lib/checks"
import { lockFrom, newStreakRule, ruleEdit } from "../lib/customStreaks"
import { WEEKDAY_LABELS, WEEKDAY_ORDER, fmtDateLong, toKey } from "../lib/date"
import { FIELD_SOFT_INLINE, btnBase } from "../lib/theme"
import { EditableList } from "../ui/EditableList"
import { segBtn, segBtnStyle } from "../ui/buttonStyles"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

const LOCK_HELP =
  "A change lands at once when it can be proved not to make the rule easier " +
  "— a lower limit, more days judged, fewer freezes." +
  String.fromCharCode(10, 10) +
  "Anything else waits a week from the last such change, including anything " +
  "that cannot be compared at all: inverting the test, swapping the counter, " +
  "switching between judging a day and judging a week." +
  String.fromCharCode(10, 10) +
  "The day you write a rule is yours to get it right on: nothing is locked " +
  "until the next day, because the rule has judged nothing yet." +
  String.fromCharCode(10, 10) +
  "The point of setting a limit in advance is to be the person who set it, " +
  "not the person living under it."

/** The three answers to "what gets judged", as one control. */
type Judge = "everyDay" | "chosenDays" | "week"

const judgeOf = (rule: StreakRule): Judge =>
  rule.scope === "week"
    ? "week"
    : rule.weekdays?.length
      ? "chosenDays"
      : "everyDay"

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

const Row = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
    <span className="w-16 shrink-0 text-[9px] font-mono uppercase tracking-widest text-ink/40">
      {label}
    </span>
    {children}
  </div>
)

const NUM = `${FIELD_SOFT_INLINE} w-14 rounded-lg py-1 text-[11px] text-center`
const SELECT = `${FIELD_SOFT_INLINE} max-w-44 rounded-lg py-1 text-[11px]`
const WORD = "text-[11px] font-mono text-ink/55"

/** One rule's terms, and the note saying what the last edit counted as. */
function RuleForm({
  rule,
  units,
  slots,
  onChange,
  today,
}: {
  rule: StreakRule
  units: CounterUnit[]
  slots: Slot[]
  onChange: (next: StreakRule) => void
  today: Date
}) {
  const c = usePalette()
  // What the last attempt was. Held here rather than derived, because the
  // interesting case is the one where nothing changed — a refused edit leaves
  // the rule exactly as it was, and without a word for it the control simply
  // springs back and looks broken.
  const [note, setNote] = useState<
    "narrowed" | "loosened" | "refused" | "setup" | null
  >(null)
  const unit = units.find((u) => u.id === rule.unitId)
  const check = !!unit && isCheck(unit)
  const judge = judgeOf(rule)
  const settingUp = toKey(today) === rule.startedOn
  const locked = !settingUp && toKey(today) < rule.lockedUntil

  const apply = (patch: Partial<StreakRule>) => {
    const edit = ruleEdit(rule, { ...rule, ...patch }, slots, today)
    setNote(
      !edit.changed
        ? null
        : edit.settingUp
          ? "setup"
          : edit.narrowing
            ? "narrowed"
            : edit.allowed
              ? "loosened"
              : "refused",
    )
    if (edit.allowed) onChange(edit.next)
  }

  const setJudge = (next: Judge) =>
    apply(
      next === "week"
        ? { scope: "week", weekdays: undefined }
        : next === "everyDay"
          ? { scope: "day", weekdays: undefined }
          : { scope: "day", weekdays: rule.weekdays?.length ? rule.weekdays : [1] },
    )

  const toggleWeekday = (wd: number) => {
    const on = rule.weekdays || []
    const next = on.includes(wd) ? on.filter((x) => x !== wd) : [...on, wd]
    // Never all seven days spelled out: that is "every day", and two ways of
    // saying the same rule is two rules that can disagree.
    if (!next.length) return
    apply({ weekdays: next.length === 7 ? undefined : next })
  }

  const toggleSlot = (id: string) => {
    // Every slot lit is the same rule as none named, so the two collapse into
    // the one that reads as an answer: the whole day.
    const on = rule.slotIds?.length ? rule.slotIds : slots.map((s) => s.id)
    const next = on.includes(id) ? on.filter((x) => x !== id) : [...on, id]
    // Turning the last one off would say "count nothing", which is not a rule.
    if (!next.length) return
    apply({ slotIds: next.length === slots.length ? undefined : next })
  }

  return (
    <div className="space-y-2 pl-1 pt-1">
      <Row label="Judge">
        <Pills<Judge>
          value={judge}
          onChange={setJudge}
          options={[
            { id: "everyDay", label: "Every day" },
            { id: "chosenDays", label: "On chosen days" },
            { id: "week", label: "Every week" },
          ]}
        />
      </Row>

      {judge === "chosenDays" && (
        <Row label="">
          <div className="flex flex-wrap gap-1">
            {WEEKDAY_ORDER.map((wd) => {
              const on = (rule.weekdays || []).includes(wd)
              return (
                <button
                  key={wd}
                  type="button"
                  onClick={() => toggleWeekday(wd)}
                  aria-pressed={on}
                  style={on ? { backgroundColor: c.accent, color: c.onFill } : undefined}
                  className={`${btnBase} w-8 py-1 rounded-full text-[10px] font-mono ${
                    on ? "" : "text-ink/40 hover:text-ink hover:bg-ink/5"
                  }`}
                >
                  {WEEKDAY_LABELS[wd]}
                </button>
              )
            })}
          </div>
        </Row>
      )}

      <Row label="Keeping">
        <select
          value={rule.unitId}
          onChange={(e) => apply({ unitId: e.target.value })}
          className={SELECT}
        >
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
        <span className={WORD}>must be</span>

        {/* A check has two answers, not a comparison. "Overslept must be at
            most 0 times" is the same rule and nobody would write it. */}
        {check ? (
          <Pills<"yes" | "no">
            value={rule.op === "atLeast" ? "yes" : "no"}
            onChange={(v) =>
              apply(
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
              value={rule.op}
              onChange={(e) => apply({ op: e.target.value as StreakOp })}
              className={SELECT}
            >
              <option value="atLeast">at least</option>
              <option value="atMost">at most</option>
            </select>
            <input
              type="number"
              min={0}
              value={rule.value}
              onChange={(e) => apply({ value: Math.max(0, Number(e.target.value) || 0) })}
              className={NUM}
            />
            <span className={WORD}>
              {rule.scope === "week" ? "times a week" : "times a day"}
            </span>
          </>
        )}
      </Row>

      {/* Slots are a tally's question. A check is a fact about the day. */}
      {!check && (
        <Row label="In">
          <div className="flex flex-wrap gap-1">
            {slots.map((s) => {
              const on = !rule.slotIds?.length || rule.slotIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSlot(s.id)}
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
          {!rule.slotIds?.length && (
            <span className="text-[9px] font-mono text-ink/35">whole day</span>
          )}
        </Row>
      )}

      <Row label="Freezes">
        <input
          type="number"
          min={0}
          value={rule.freezesPerWeek}
          onChange={(e) =>
            apply({ freezesPerWeek: Math.max(0, Number(e.target.value) || 0) })
          }
          className={NUM}
        />
        <span className={WORD}>a week, expiring · bank up to</span>
        <input
          type="number"
          min={0}
          value={rule.freezeCap}
          onChange={(e) =>
            apply({ freezeCap: Math.max(0, Number(e.target.value) || 0) })
          }
          className={NUM}
        />
        <span className={WORD}>earned</span>
      </Row>

      {/* What just happened, and what the clock says. Both, because the lock is
          one-sided and an unexplained one-sided lock is indistinguishable from
          a bug. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
        {note === "setup" && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/50">
            <ShieldCheck size={11} />
            Saved. Today is yours to get this right on.
          </span>
        )}
        {note === "narrowed" && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/50">
            <ShieldCheck size={11} />
            This only narrows the rule — saved.
          </span>
        )}
        {note === "loosened" && (
          <span
            className="flex items-center gap-1 text-[10px] font-mono"
            style={{ color: c.exam }}
          >
            <TriangleAlert size={11} />
            Saved, and locked again until {fmtDateLong(lockFrom(today))}.
          </span>
        )}
        {note === "refused" && (
          <span
            className="flex items-center gap-1 text-[10px] font-mono"
            style={{ color: c.exam }}
          >
            <TriangleAlert size={11} />
            That could make the rule easier. It waits until{" "}
            {fmtDateLong(rule.lockedUntil)}.
          </span>
        )}
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

export function StreakRulesTab({
  settings,
  units,
  slots,
  onSave,
  today = new Date(),
}: {
  settings: Settings
  units: CounterUnit[]
  slots: Slot[]
  onSave: (next: Settings) => void
  today?: Date
}) {
  const rules = settings.streakRules || []

  if (!units.length)
    return (
      <p className="text-[11px] font-mono text-ink/45 leading-relaxed">
        A streak is a rule about a counter, so there has to be a counter first.
        Add one in the Counters tab and come back.
      </p>
    )

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-mono text-ink/45 leading-relaxed">
        Your own streaks, each one a rule about a counter — never oversleep,
        get to bed on time, no youtube after the evening starts, the gym three
        times a week. Each keeps its own freezes: an allowance every week that
        expires, and one banked freeze for every week you keep clean.
      </p>

      <EditableList<StreakRule>
        items={rules}
        onChange={(streakRules) => onSave({ ...settings, streakRules })}
        noun="streak"
        minItems={0}
        newItem={() => newStreakRule(units[0].id, today)}
        warningNote={(label) =>
          `Remove "${label}"? Its streak goes with it, and so does every freeze banked against it. The days you marked stay exactly as they are.`
        }
        extra={(rule, update) => (
          <RuleForm
            rule={rule}
            units={units}
            slots={slots}
            today={today}
            onChange={(next) => update(next)}
          />
        )}
      />
    </div>
  )
}
