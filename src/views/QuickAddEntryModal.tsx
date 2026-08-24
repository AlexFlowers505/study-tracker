/* ---------------------------------------------------------------
   Quick add — a whole entry composed before anything is written.

   Unlike the day editor, which saves every keystroke, nothing here reaches
   the day until "Add". That is the point of it, and it is also why leaving
   asks first: there is unsaved work in the dialog, which is never true
   anywhere else in this app.

   **One dialog, and its tabs are the kinds of thing a day holds.** A day card
   used to carry a "+" and a "#" side by side, which made you choose what you
   were recording before you had opened anything, and the two were a pixel
   apart and told apart only by their glyph. Now the "+" opens this and the
   choice is a tab, where there is room to name it.

   The tabs say **Activity, Tally, Check, Sleep** — the app's own list of the
   things it records, three kinds of counter and the separate axis. They said
   "Entry" and "Counter" for a while, from before an activity was a counter at
   all, and by the end that row was drawing a distinction the rest of the app
   had stopped making: an entry *is* an activity, and "counter" was two
   different questions wearing one name.

   Answering a check from here is the odd one out and it still earns its
   place. There is no amount and no slot — you are answering it rather than
   adding to it, which is why its button says Save — but leaving it out would
   mean this dialog listed three of the four things a day can hold, with the
   fourth reachable only from a chip you have to know is a button.
--------------------------------------------------------------- */

import { useCallback, useState } from "react"
import { Clock, Hash, ListChecks, Moon, Play, Square, X } from "lucide-react"
import type {
  Activity,
  CheckMark,
  CheckState,
  CounterUnit,
  DayKey,
  Slot,
  StudyEntry,
  TimeOfDay,
} from "../types/model"
import type { DayCounters } from "../lib/counters"
import { slotUnitValue } from "../lib/counters"
import {
  CHECK_CHOICES,
  CHECK_LABELS,
  UNANSWERED,
  checkState,
  splitByKind,
} from "../lib/checks"
import { fromKey } from "../lib/date"
import { makeId } from "../lib/id"
import { fmtHours, nowTime, spanMinutes } from "../lib/time"
import { BTN_SOFT, CARD, FIELD_SOFT, btnBase } from "../lib/theme"
import { AutoTextarea, SegmentedControl } from "../ui/controls"
import { RenderIcon } from "../ui/icons"
import { TimeRangeField } from "../ui/TimeRangeField"
import { useModalDismiss } from "../ui/useModalDismiss"

import { usePalette } from "../ui/useTheme"

/** The four things a day can hold — three kinds of counter, and sleep. */
type AddKind = "activity" | "tally" | "check" | "sleep"

export function QuickAddEntryModal({
  dateKey,
  slots,
  activities,
  units = [],
  sleepEnabled,
  counters = {},
  checks = {},
  initialSlotId,
  variant = "study",
  onCancel,
  onAdd,
  onAddCounter,
  onSetCheck,
}: {
  dateKey: DayKey
  slots: Slot[]
  activities: Activity[]
  /**
   * Every counter the project defines, both kinds. Split in here rather than
   * by the caller: which tabs exist is a question about this dialog.
   */
  units?: CounterUnit[]
  /** Whether sleep is tracked at all. Off, the option is absent rather
   *  than disabled — there is nothing behind it. */
  sleepEnabled?: boolean
  counters?: DayCounters
  /** The day's stored check marks, so the tab can say what it is changing. */
  checks?: Record<string, CheckMark>
  /** Set when the dialog was opened from a particular slot's own "+". */
  initialSlotId?: string
  /**
   * Sleep is the same dialog with the top row removed: it is a flat list on
   * the day with no slot and no activity. Sharing the component rather than
   * copying it is what keeps the two ways of adding a time the same shape.
   */
  variant?: "study" | "sleep"
  onCancel: () => void
  /** `slotId` is null for a sleep entry, which belongs to no slot. */
  onAdd: (dateKey: DayKey, slotId: string | null, entry: StudyEntry) => void
  onAddCounter?: (
    dateKey: DayKey,
    unitId: string,
    slotId: string,
    amount: number,
  ) => void
  /** Absent when the project defines no checks — then there is no Check tab. */
  onSetCheck?: (dateKey: DayKey, unitId: string, next: CheckState) => void
}) {
  const c = usePalette()
  /* What is being added is chosen *here*, not before the dialog opens.
     The day card had a "+" and a moon a few pixels apart, which made you
     decide what you were recording before you had opened anything — and with
     badges, checks, a freeze and a note all wanting room on the same line,
     the second button was also the one the card could least afford. */
  const { tallies, checks: checkUnits } = splitByKind(units)
  const canCount = tallies.length > 0 && !!onAddCounter
  const canCheck = checkUnits.length > 0 && !!onSetCheck
  const [kind, setKind] = useState<AddKind>(
    variant === "sleep" && sleepEnabled ? "sleep" : "activity",
  )
  const isSleep = kind === "sleep"
  const counting = canCount && kind === "tally"
  const checking = canCheck && kind === "check"
  /* One tab per kind of thing a day holds. Absent, not disabled, for anything
     the project does not have — there is nothing behind a tab for tallies you
     never made — and below two options there is no choice left to offer. */
  const KINDS = [
    { id: "activity" as const, label: "Activity", icon: Clock, on: true },
    { id: "tally" as const, label: "Tally", icon: Hash, on: canCount },
    { id: "check" as const, label: "Check", icon: ListChecks, on: canCheck },
    { id: "sleep" as const, label: "Sleep", icon: Moon, on: !!sleepEnabled },
  ].filter((k) => k.on)
  const [slotId, setSlotId] = useState(initialSlotId || slots[0]?.id)
  const [unitId, setUnitId] = useState(tallies[0]?.id)
  const [amount, setAmount] = useState(1)
  const [checkUnitId, setCheckUnitId] = useState(checkUnits[0]?.id)
  // Yes is what you open this to record: "no" is what an untouched day
  // resolves to on its own, and "skipped" is the deliberate one.
  const [answer, setAnswer] = useState<CheckState>("yes")
  const [activity, setActivity] = useState(activities[0]?.id)
  const [start, setStart] = useState<TimeOfDay | undefined>(undefined)
  const [end, setEnd] = useState<TimeOfDay | undefined>(undefined)
  const [comment, setComment] = useState("")
  const [confirming, setConfirming] = useState(false)

  const timed = !!(start && end)
  // A start with no end is a real, useful state — you logged the beginning and
  // will come back for the rest — so it saves as zero minutes rather than
  // being refused. Filling the end in later on the card recomputes it.
  const total = timed ? spanMinutes(start, end) : 0

  const requestCancel = useCallback(() => setConfirming(true), [])
  const onBackdropClick = useModalDismiss(requestCancel)

  const submit = () => {
    onAdd(dateKey, isSleep ? null : slotId, {
      id: makeId(isSleep ? "sleep" : "entry"),
      ...(isSleep ? {} : { activity }),
      minutes: total,
      comment,
      ...(start ? { start } : {}),
      ...(end ? { end } : {}),
    })
  }

  const d = fromKey(dateKey)

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={onBackdropClick}
    >
      <div
        style={{ backgroundColor: c.page }}
        className="w-full sm:max-w-[420px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div>
            <h2 className="font-sans font-extrabold uppercase tracking-tight text-sm">
              {isSleep
                ? "New sleep"
                : counting
                  ? "Add to a tally"
                  : checking
                    ? "Answer a check"
                    : "New entry"}
            </h2>
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink/50">
              {d.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={requestCancel}
            className={`${btnBase} text-ink/50 hover:text-ink`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {KINDS.length > 1 && (
            <div className="flex gap-1 rounded-xl bg-ink/[0.06] p-1">
              {KINDS.map((k) => {
                const active = kind === k.id
                return (
                  <button
                    key={k.id}
                    onClick={() => setKind(k.id)}
                    aria-pressed={active}
                    style={
                      active
                        ? { backgroundColor: c.accent, color: c.onFill }
                        : undefined
                    }
                    /* An icon each. Four words of small uppercase type read
                       as a sentence to parse; a glyph is what the eye aims at
                       once you know which is which — the same reason Setup's
                       tabs carry them. */
                    className={`${btnBase} flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-mono uppercase tracking-widest ${
                      active ? "font-bold" : "text-ink/55 hover:text-ink"
                    }`}
                  >
                    <k.icon size={12} />
                    {k.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Sleep has neither, so the row is absent rather than disabled. */}
          {checking ? (
            <CheckFields
              units={checkUnits}
              counters={counters}
              marks={checks}
              unitId={checkUnitId}
              setUnitId={setCheckUnitId}
              answer={answer}
              setAnswer={setAnswer}
            />
          ) : counting ? (
            <CounterFields
              units={tallies}
              slots={slots}
              counters={counters}
              unitId={unitId}
              setUnitId={setUnitId}
              slotId={slotId}
              setSlotId={setSlotId}
              amount={amount}
              setAmount={setAmount}
            />
          ) : (
          <>
          <div className={`grid grid-cols-2 gap-3 ${isSleep ? "hidden" : ""}`}>
            <label className="block">
              <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
                Slot
              </span>
              <select
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
                className={FIELD_SOFT}
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
                Activity
              </span>
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className={FIELD_SOFT}
              >
                {activities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* No minutes box any more. Typing "90" was doing arithmetic the
              app is here to do for you, and the two ways of saying the same
              thing had to be kept from contradicting each other. Times are the
              only input; the duration below is the answer.

              "Now" on each end is what makes that practical: start one when
              you begin, come back and end it when you stop. */}
          <div className="flex flex-wrap items-center gap-2">
            <TimeRangeField
              start={start}
              end={end}
              onChange={(nextStart, nextEnd) => {
                setStart(nextStart || undefined)
                setEnd(nextEnd || undefined)
              }}
              onClear={() => {
                setStart(undefined)
                setEnd(undefined)
              }}
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStart(nowTime())}
                className={`${btnBase} ${BTN_SOFT} flex items-center gap-1 py-1.5`}
              >
                <Play size={9} /> Start now
              </button>
              <button
                type="button"
                onClick={() => setEnd(nowTime())}
                className={`${btnBase} ${BTN_SOFT} flex items-center gap-1 py-1.5`}
              >
                <Square size={9} /> End now
              </button>
            </div>
            <span className="text-[10px] font-mono text-ink/45 whitespace-nowrap">
              {timed ? fmtHours(total) : start ? "running" : "no time set"}
            </span>
          </div>

          <label className="block">
            <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
              Note
            </span>
            <AutoTextarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional"
              rows={2}
              maxHeight={200}
              className={FIELD_SOFT}
            />
          </label>
          </>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={requestCancel}
              className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide text-ink/60 hover:text-ink hover:bg-ink/5`}
            >
              Cancel
            </button>
            <button
              onClick={() =>
                checking
                  ? onSetCheck?.(dateKey, checkUnitId, answer)
                  : counting
                    ? onAddCounter?.(dateKey, unitId, slotId, amount)
                    : submit()
              }
              className={`${btnBase} px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wide`}
              style={{ backgroundColor: c.accent, color: c.onFill }}
            >
              {/* A check is answered, not added to. "Add" would promise a
                  second mark alongside the first. */}
              {checking ? "Save" : "Add"}
            </button>
          </div>
        </div>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setConfirming(false)
          }
        >
          <div className={`${CARD} w-full max-w-[300px] p-5`}>
            <p className="text-xs font-mono text-ink/80 mb-4">
              Discard this new{" "}
              {isSleep ? "sleep entry" : checking ? "answer" : "entry"}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide text-ink/60 hover:text-ink hover:bg-ink/5`}
              >
                Keep editing
              </button>
              <button
                onClick={onCancel}
                className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide`}
                style={{ backgroundColor: c.exam, color: c.onFill }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The counter half of the dialog. Its own component only so the branch above
 * stays readable — it has no state of its own, because Cancel has to be able
 * to throw away everything either tab collected.
 */
function CounterFields({
  units,
  slots,
  counters,
  unitId,
  setUnitId,
  slotId,
  setSlotId,
  amount,
  setAmount,
}: {
  units: CounterUnit[]
  slots: Slot[]
  counters: DayCounters
  unitId: string
  setUnitId: (id: string) => void
  slotId: string
  setSlotId: (id: string) => void
  amount: number
  setAmount: (n: number) => void
}) {
  const c = usePalette()
  const unit = units.find((u) => u.id === unitId)
  const already = slotUnitValue(counters, unitId, slotId)
  const after = already + amount

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
            Slot
          </span>
          <select
            value={slotId}
            onChange={(e) => setSlotId(e.target.value)}
            className={FIELD_SOFT}
          >
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
            Counter
          </span>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className={FIELD_SOFT}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
          How many
        </span>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
          className={`${FIELD_SOFT} w-24`}
        />
      </label>

      {/* Both numbers, before and after. The whole point of this half is that
          it adds to a running count, so the count it adds to has to show. */}
      <div className="flex items-center gap-1.5 rounded-xl bg-card p-3 text-[11px] font-mono">
        {unit && (
          <RenderIcon
            name={unit.iconName}
            size={13}
            style={{ color: unit.color }}
          />
        )}
        <span className="text-ink/60">
          This slot has <strong className="text-ink">{already}</strong>
          {" → will have "}
          <strong style={{ color: c.accent }}>{after}</strong>
        </span>
      </div>
    </>
  )
}

/**
 * The check half. Its own component for the same reason `CounterFields` is:
 * the branch above stays readable, and Cancel has to be able to throw away
 * whatever any tab collected, so the state lives up there.
 *
 * It says what the day answers now and what it would answer after, exactly as
 * the tally half prints its before and after. A check is a fact you are
 * *changing* rather than adding to, and changing one without being shown what
 * it already said is how you overwrite a "skipped" you meant to keep.
 */
function CheckFields({
  units,
  counters,
  marks,
  unitId,
  setUnitId,
  answer,
  setAnswer,
}: {
  units: CounterUnit[]
  counters: DayCounters
  marks: Record<string, CheckMark>
  unitId: string
  setUnitId: (id: string) => void
  answer: CheckState
  setAnswer: (next: CheckState) => void
}) {
  const c = usePalette()
  const unit = units.find((u) => u.id === unitId)
  // `checkState` is the only place the three answers are worked out, and it
  // reads a whole day. The two fields it looks at are the two we were handed.
  const now = checkState({ counters, checks: marks }, unitId)

  return (
    <>
      <label className="block">
        <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
          Check
        </span>
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className={FIELD_SOFT}
        >
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
          Answer
        </span>
        {/* The same shape every other "pick one of these" wears, and it holds
            all three: there is no fourth, and no state you can only arrive at
            by clearing. */}
        <SegmentedControl
          items={CHECK_CHOICES.map((state) => ({
            id: state,
            label: CHECK_LABELS[state],
          }))}
          activeId={answer}
          onChange={(next) => setAnswer(next as CheckState)}
        />
      </div>

      <div className="flex items-center gap-1.5 rounded-xl bg-card p-3 text-[11px] font-mono">
        {unit && (
          <RenderIcon
            name={unit.iconName}
            size={13}
            style={{ color: unit.color }}
          />
        )}
        <span className="text-ink/60">
          This day says{" "}
          <strong className="text-ink">
            {now ? CHECK_LABELS[now] : UNANSWERED}
          </strong>
          {" → will say "}
          <strong style={{ color: c.accent }}>{CHECK_LABELS[answer]}</strong>
        </span>
      </div>
    </>
  )
}
