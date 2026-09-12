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

   The tabs say **Activity, Tally, Check** — the app's own list of the three
   kinds of counter. They said "Entry" and "Counter" for a while, from before
   an activity was a counter at all, and by the end that row was drawing a
   distinction the rest of the app had stopped making: an entry *is* an
   activity, and "counter" was two different questions wearing one name.

   There was a fourth, Sleep, and it went with the axis (`spec 024`): a night
   is an ordinary activity now, added through the first tab like anything
   else.

   Answering a check from here is the odd one out and it still earns its
   place. There is no amount and no slot — you are answering it rather than
   adding to it, which is why its button says Save — but leaving it out would
   mean this dialog listed three of the four things a day can hold, with the
   fourth reachable only from a chip you have to know is a button.
--------------------------------------------------------------- */

import { useCallback, useState } from "react"
import {
  Clock,
  Hash,
  ListChecks,
  Pause,
  Play,
  Square,
  X,
} from "lucide-react"
import type {
  Activity,
  CheckMark,
  CheckState,
  CounterUnit,
  DayKey,
  Slot,
  StudyEntry,
  TimeEntry,
  TimeOfDay,
} from "../types/model"
import { useT } from "../lib/i18n"
import type { DayCounters } from "../lib/counters"
import { slotUnitValue } from "../lib/counters"
import {
  checkLabel,
  unanswered,
  CHECK_CHOICES,
  checkState,
  splitByKind,
} from "../lib/checks"
import {
  dateLocale, fromKey } from "../lib/date"
import { makeId } from "../lib/id"
import { fmtHours, minutesSince, nowTime, spanMinutes } from "../lib/time"
import { BTN_SOFT, CARD, FIELD_SOFT, btnBase } from "../lib/theme"
import { AutoTextarea, SegmentedControl } from "../ui/controls"
import { EntryTime } from "../ui/EntryTime"
import { runningMinutes } from "../lib/entries"
import { useNow } from "../ui/useNow"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"
import { TimeRangeField } from "../ui/TimeRangeField"
import { useModalDismiss } from "../ui/useModalDismiss"

import { usePalette } from "../ui/useTheme"

/** The three kinds of counter a day can hold. */
type AddKind = "activity" | "tally" | "check"

export function QuickAddEntryModal({
  dateKey,
  slots,
  activities,
  units = [],
  counters = {},
  checks = {},
  initialSlotId,
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
  counters?: DayCounters
  /** The day's stored check marks, so the tab can say what it is changing. */
  checks?: Record<string, CheckMark>
  /** Set when the dialog was opened from a particular slot's own "+". */
  initialSlotId?: string
  onCancel: () => void
  onAdd: (dateKey: DayKey, slotId: string, entry: StudyEntry) => void
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
  const t = useT()
  /* What is being added is chosen *here*, not before the dialog opens.
     The day card had a "+" and a moon a few pixels apart, which made you
     decide what you were recording before you had opened anything — and with
     badges, checks, a freeze and a note all wanting room on the same line,
     the second button was also the one the card could least afford. */
  const { tallies, checks: checkUnits } = splitByKind(units)
  const canCount = tallies.length > 0 && !!onAddCounter
  const canCheck = checkUnits.length > 0 && !!onSetCheck
  const [kind, setKind] = useState<AddKind>("activity")
  const counting = canCount && kind === "tally"
  const checking = canCheck && kind === "check"
  /* One tab per kind of thing a day holds. Absent, not disabled, for anything
     the project does not have — there is nothing behind a tab for tallies you
     never made — and below two options there is no choice left to offer. */
  const KINDS = [
    { id: "activity" as const, label: t("kind:Activity"), icon: Clock, on: true },
    { id: "tally" as const, label: t("kind:Tally"), icon: Hash, on: canCount },
    { id: "check" as const, label: t("kind:Check"), icon: ListChecks, on: canCheck },
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
  /* **The pause is two pieces of state, and one of them is an instant.** The
     minutes are what gets stored; `pauseFrom` is only ever the moment the
     current stop began, and it is a moment rather than a time of day because
     what the two clicks measure is the gap between them, not where either fell
     on any clock. That is what makes pausing work while you fill in
     yesterday: nothing here consults `start`. */
  const [paused, setPaused] = useState(0)
  const [pauseFrom, setPauseFrom] = useState<string | null>(null)

  const timed = !!(start && end)
  const running = !!start && !end
  /* **How long it has run so far** — `spec 028`. It read `running` and
     nothing else, including at the one moment you pressed pause precisely to
     see where you were. A drawing: `minutes` is still what the times say once
     the end is in. */
  const now = useNow(running)
  const liveEntry: TimeEntry = {
    id: "",
    minutes: 0,
    start: start || undefined,
    paused,
    pauseFrom: pauseFrom ?? undefined,
  }
  // A start with no end is a real, useful state — you logged the beginning and
  // will come back for the rest — so it saves as zero minutes rather than
  // being refused. Filling the end in later on the card recomputes it.
  const total = timed ? Math.max(0, spanMinutes(start, end) - paused) : 0

  /* Ending a running pause folds it into the total. Nothing else in the dialog
     reads the clock for this, so the arithmetic happens in one place. */
  const closePause = () => {
    if (!pauseFrom) return
    setPaused((n) => n + minutesSince(pauseFrom))
    setPauseFrom(null)
  }

  const requestCancel = useCallback(() => setConfirming(true), [])
  const onBackdropClick = useModalDismiss(requestCancel)

  const submit = () => {
    /* **A pause running at Add goes on running.** You pressed it because you
       had stopped, and filing the entry is not coming back to it — the break
       is still happening, and the card's own Resume is what ends it. Closing
       it here would count the rest of that break as work, which is the exact
       arithmetic this feature exists to stop doing by hand.

       Unless the session is over, in which case there is nothing left for a
       pause to sit inside and it is folded in — the same thing `stopNowPatch`
       does when End is pressed on a paused entry. */
    const finished = !!(start && end)
    const heldFor =
      pauseFrom && finished ? paused + minutesSince(pauseFrom) : paused
    const minutes = finished
      ? Math.max(0, spanMinutes(start, end) - heldFor)
      : 0
    onAdd(dateKey, slotId, {
      id: makeId("entry"),
      activity,
      minutes,
      comment,
      ...(start ? { start } : {}),
      ...(end ? { end } : {}),
      ...(heldFor > 0 ? { paused: heldFor } : {}),
      ...(pauseFrom && !finished ? { pauseFrom } : {}),
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
              {t(
                counting
                  ? "Add to a tally"
                  : checking
                    ? "Answer a check"
                    : "New entry",
              )}
            </h2>
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink/50">
              {d.toLocaleDateString(dateLocale(), {
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
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
                {t("Slot")}
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
                {t("field:Activity")}
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
            {/* **Glyphs with tooltips, not words.** There are three of these
                once a session can be held — start, pause, stop — and three
                labelled pills is a row wider than the dialog on a phone. The
                shapes are the ones every player in the world uses, which is
                the one vocabulary nobody has to be taught; the tooltip is
                there for whoever wants it spelled out.

                **The hold is drawn solid.** Resume is a play triangle and so
                is Start now, and two identical outlines side by side is the
                one thing a tooltip cannot fix — you would have to hover to
                find out which. Circling the hold was the first answer and it
                cost the glyph a third of its pixels to the ring, which at
                twelve is exactly what you cannot spare.

                **Every one of them is solid, and Start now steps aside.**
                Drawing that one outlined was the second answer to the same
                collision and it was the wrong half to sacrifice: an outlined
                glyph beside two filled ones does not read as *a different kind
                of control*, it reads as the one that is disabled — and it was
                the button you press first. So they are all filled, and the
                collision is solved where it actually lives: **Start now is
                absent once there is a session running.** Its whole job is to
                fill in a start, and with one set the time field's own `now`
                is there to correct it. No state ever draws two triangles. */}
            <div className="flex items-center gap-1">
              {!running && (
                <Tip text={t("Start this session now")}>
                  <button
                    type="button"
                    onClick={() => setStart(nowTime())}
                    className={`${btnBase} ${BTN_SOFT} flex items-center justify-center p-1.5`}
                  >
                    <Play size={12} fill="currentColor" />
                  </button>
                </Tip>
              )}
              {/* Only while there is a session to hold: a stretch that already
                  has both ends is not one you can stop in the middle of. One
                  button, and which one it is says which state you are in. */}
              {running &&
                (pauseFrom ? (
                  <Tip text={t("Resume this session")}>
                    <button
                      type="button"
                      onClick={closePause}
                      className={`${btnBase} flex items-center justify-center p-1.5 rounded-lg`}
                      style={{
                        color: c.accent,
                        backgroundColor: `${c.accent}1F`,
                      }}
                    >
                      <Play size={12} fill="currentColor" />
                    </button>
                  </Tip>
                ) : (
                  <Tip text={t("Pause this session")}>
                    <button
                      type="button"
                      onClick={() => setPauseFrom(new Date().toISOString())}
                      className={`${btnBase} flex items-center justify-center p-1.5 rounded-lg`}
                      style={{ color: c.warn, backgroundColor: `${c.warn}1F` }}
                    >
                      <Pause size={12} fill="currentColor" />
                    </button>
                  </Tip>
                ))}
              <Tip text={t("End now")}>
                <button
                  type="button"
                  onClick={() => {
                    closePause()
                    setEnd(nowTime())
                  }}
                  className={`${btnBase} ${BTN_SOFT} flex items-center justify-center p-1.5`}
                >
                  <Square size={12} fill="currentColor" />
                </button>
              </Tip>
            </div>
            <span className="text-[10px] font-mono text-ink/45 whitespace-nowrap">
              {timed ? (
                <EntryTime
                  bare
                  duration={fmtHours(total)}
                  paused={paused}
                  running={!!pauseFrom}
                />
              ) : running ? (
                <>
                  {t(pauseFrom ? "on pause" : "running")}
                  {" · "}
                  <EntryTime
                    bare
                    duration={fmtHours(runningMinutes(liveEntry, now))}
                    paused={paused}
                    running={!!pauseFrom}
                  />
                </>
              ) : (
                t("no time set")
              )}
            </span>
          </div>

          <label className="block">
            <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/50 mb-1">
              {t("Note")}
            </span>
            <AutoTextarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("Optional")}
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
              {t("Cancel")}
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
              {t(checking ? "Save" : "Add")}
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
              {checking ? "answer" : "entry"}?
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
            label: checkLabel(state),
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
            {now ? checkLabel(now) : unanswered()}
          </strong>
          {" → will say "}
          <strong style={{ color: c.accent }}>{checkLabel(answer)}</strong>
        </span>
      </div>
    </>
  )
}
