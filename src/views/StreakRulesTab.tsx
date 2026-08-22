/* ---------------------------------------------------------------
   Setup's Streaks tab — the rules you are going to be judged by.

   The shared half is `EditableList`, like every other tab. What is new is the
   rule, and the rule is written as **a sentence with dropdowns in it**.

   That is the whole design decision here. A grid of labelled fields would
   store the same values and be unreadable: `op: atMost, value: 0` is correct
   and says nothing, where "Youtube in Evening, Night at most 0 times" is the
   same thing said in a way you can disagree with. This is a rule you will live
   under for months, and the only way to check that what you built is what you
   meant is to read it back.

   **A rule can carry several conditions**, and they are stacked as separate
   blocks rather than run together, because that is what they are: one promise
   with two things to keep. Each block changes shape with the counter it names
   — a check asks *must it be yes or no*, a tally asks *how many, and where* —
   and carries its own weekdays, which is what lets one condition be a weekday
   rule and the other an every-day one inside the same promise.

   Editing goes through `ruleEdit`, one control at a time. A change that
   narrows the rule lands immediately; one that might loosen it waits out the
   clock, and the line under the rule says which it was — a clever lock nobody
   can predict is worse than a blunt one they can. Adding a condition always
   lands: a further thing to keep can only ever cost you.
--------------------------------------------------------------- */

import { useState } from "react"
import type { ReactNode } from "react"
import { Lock, Plus, ShieldCheck, TriangleAlert, X } from "lucide-react"
import type {
  CounterUnit,
  Settings,
  Slot,
  StreakClause,
  StreakOp,
  StreakRule,
} from "../types/model"
import { isCheck } from "../lib/checks"
import {
  lockFrom,
  newClause,
  newStreakRule,
  ruleClauses,
  ruleEdit,
} from "../lib/customStreaks"
import { WEEKDAY_LABELS, WEEKDAY_ORDER, fmtDateLong, toKey } from "../lib/date"
import { FIELD_SOFT_INLINE, btnBase } from "../lib/theme"
import { EditableList } from "../ui/EditableList"
import { segBtn, segBtnStyle } from "../ui/buttonStyles"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

const LOCK_HELP =
  "A change lands at once when it can be proved not to make the rule easier " +
  "— a lower limit, more days judged, fewer freezes, or one more condition." +
  String.fromCharCode(10, 10) +
  "Anything else waits a week from the last such change, including anything " +
  "that cannot be compared at all: inverting a test, swapping a counter, " +
  "dropping a condition, switching between judging a day and judging a week." +
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
const SELECT = `${FIELD_SOFT_INLINE} max-w-44 rounded-lg py-1 text-[11px]`
const WORD = "text-[11px] font-mono text-ink/55"

/** One condition: what is measured, where, and on which days. */
function ClauseForm({
  clause,
  units,
  slots,
  byWeek,
  onChange,
  onRemove,
}: {
  clause: StreakClause
  units: CounterUnit[]
  slots: Slot[]
  byWeek: boolean
  onChange: (patch: Partial<StreakClause>) => void
  /** Absent on the only condition — a rule with none is not a rule. */
  onRemove?: () => void
}) {
  const c = usePalette()
  const unit = units.find((u) => u.id === clause.unitId)
  const check = !!unit && isCheck(unit)

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
        <select
          value={clause.unitId}
          onChange={(e) => onChange({ unitId: e.target.value })}
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
            <input
              type="number"
              min={0}
              value={clause.value}
              onChange={(e) =>
                onChange({ value: Math.max(0, Number(e.target.value) || 0) })
              }
              className={NUM}
            />
            <span className={WORD}>{byWeek ? "times a week" : "times a day"}</span>
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

      {/* Slots are a tally's question. A check is a fact about the day. */}
      {!check && (
        <Row label="In">
          <div className="flex flex-wrap gap-1">
            {slots.map((s) => {
              const on = !clause.slotIds?.length || clause.slotIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      slotIds: toggleIn(
                        clause.slotIds,
                        slots.map((x) => x.id),
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
  const clauses = ruleClauses(rule)
  const byWeek = rule.scope === "week"
  const settingUp = toKey(today) === rule.startedOn
  const locked = !settingUp && toKey(today) < rule.lockedUntil

  /**
   * Every write goes through here, and every write stores `clauses` — which
   * is also what quietly normalises a rule from before rules could have more
   * than one, the first time it is touched.
   */
  const apply = (patch: Partial<StreakRule>) => {
    const draft: StreakRule = {
      ...rule,
      clauses,
      unitId: undefined,
      slotIds: undefined,
      op: undefined,
      value: undefined,
      weekdays: undefined,
      ...patch,
    }
    const edit = ruleEdit({ ...rule, clauses }, draft, slots, today)
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

  const patchClause = (id: string, patch: Partial<StreakClause>) =>
    apply({
      clauses: clauses.map((cl) => (cl.id === id ? { ...cl, ...patch } : cl)),
    })

  return (
    <div className="space-y-2 pl-1 pt-1">
      <Row label="Judge">
        <Pills<"day" | "week">
          value={rule.scope}
          onChange={(scope) => apply({ scope })}
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
            units={units}
            slots={slots}
            byWeek={byWeek}
            onChange={(patch) => patchClause(clause.id, patch)}
            onRemove={
              clauses.length > 1
                ? () =>
                    apply({
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
              apply({ clauses: [...clauses, newClause(units[0].id)] })
            }
            className={`${btnBase} flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono bg-ink/[0.06] text-ink/55 hover:text-ink hover:bg-ink/[0.10]`}
          >
            <Plus size={10} />
            Condition
          </button>
        </Tip>
      </Row>

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
        Your own streaks, each one a promise about your counters — never
        oversleep, get to bed on time, no youtube after the evening starts, the
        gym three times a week. A promise can hold several conditions at once,
        and all of them have to keep. Each streak keeps its own freezes: an
        allowance every week that expires, and one banked freeze for every week
        you keep clean.
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
