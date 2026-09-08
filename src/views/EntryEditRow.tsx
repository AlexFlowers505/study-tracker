/* ---------------------------------------------------------------
   An entry, edited where it sits.

   Clicking a line in a day card turns that line into this. It exists to
   collapse a three-step path — card, day dialog, editor — into no steps at
   all, and to end the mismatch where the same entry was drawn three different
   ways depending on how deep you had clicked.

   **It has to stay recognisable as the same row.** Same rail, same 10px mono,
   same order (time, then activity, then the comment underneath). The fields
   carry no box and no fill — `FIELD_BARE`, a dotted underline and nothing
   else, the way the period note card behaves. What says "this is editing" is
   the wash and outline around the whole row, not the state of each field:
   one signal for the row beats five signals for its parts.

   Every keystroke goes straight to the day, the same as the day editor, so
   nothing here can be lost by clicking elsewhere. Cancel is therefore an undo
   rather than a discard — the row is put back exactly as it was found, slot
   included, which is why the snapshot is taken by the caller and not here.
--------------------------------------------------------------- */

import { useEffect, useRef } from "react"
import { Ban, Check, Pause, Play, Trash2 } from "lucide-react"
import type {
  Activity,
  SleepEntry,
  Slot,
  StudyEntry,
  TimeOfDay,
} from "../types/model"
import { useT } from "../lib/i18n"
import { getById } from "../lib/id"
import { STEP_MINUTES, fmtHours } from "../lib/time"
import { FIELD_BARE, btnBase } from "../lib/theme"
import { AutoTextarea } from "../ui/controls"
import { EntryTime } from "../ui/EntryTime"
import { RenderIcon } from "../ui/icons"
import { TimeRangeField } from "../ui/TimeRangeField"
import { Tip } from "../ui/Tip"

import { usePalette } from "../ui/useTheme"
import {
  entryActivity,
  isPaused,
  pausePatch,
  pausedMinutes,
  resumePatch,
} from "../lib/entries"
const iconBtn = `${btnBase} p-1 rounded shrink-0`

export function EntryEditRow({
  entry,
  accent,
  slots,
  activities,
  slotId,
  onChange,
  onMoveSlot,
  onDelete,
  onCancel,
  onClose,
}: {
  entry: StudyEntry | SleepEntry
  /** The slot's own colour, at full strength, for the rail, wash and outline. */
  accent: string
  /** Absent for a sleep entry — sleep has neither slot nor activity. */
  slots?: Slot[]
  activities?: Activity[]
  slotId?: string
  onChange: (patch: Partial<StudyEntry>) => void
  onMoveSlot?: (toSlot: string) => void
  onDelete: () => void
  onCancel: () => void
  onClose: () => void
}) {
  const c = usePalette()
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const timed = !!(entry.start && entry.end)
  const isStudy = !!slots && !!activities && !!slotId
  const paused = pausedMinutes(entry)
  const pausing = isPaused(entry)
  /** A beginning and no end yet — the only state in which a pause can start. */
  const running = !!entry.start && !entry.end
  /* The line is offered wherever it can mean something: on a timed entry the
     figure is what the duration was reduced by, on a running one there is a
     pause to start or end, and on anything already carrying a pause it is the
     only way to take a wrong figure back off. An untimed entry with none of
     those has its minutes typed directly, so a second number that changed
     nothing would be a control that lies. */
  const showPause = timed || running || paused > 0 || pausing
  const cat =
    isStudy && activities
      ? getById(activities, entryActivity(entry as StudyEntry))
      : null
  const slot = isStudy ? slots.find((s) => s.id === slotId) : undefined

  // Escape cancels rather than merely closing: reaching for it mid-edit means
  // "forget this", which is the same thing the button says.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.stopPropagation()
      onCancel()
    }
    el.addEventListener("keydown", onKey)
    return () => el.removeEventListener("keydown", onKey)
  }, [onCancel])

  return (
    <div
      ref={ref}
      // The whole card is a button that opens the day dialog. Every click and
      // key inside the form has to stop before it gets there, or editing a
      // comment would keep launching a modal over the top of it.
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="pl-3 pr-2 border-l-2 py-1.5 rounded-r-lg space-y-1.5"
      style={{
        borderLeftColor: accent,
        backgroundColor: `${accent}14`,
        boxShadow: `inset 0 0 0 1px ${accent}33`,
      }}
    >
      {/* Row one is the readout's own line: time, then activity. */}
      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono text-ink/70">
        <TimeRangeField
          bare
          start={entry.start}
          end={entry.end}
          onChange={(start?: TimeOfDay, end?: TimeOfDay) =>
            onChange({ start: start || undefined, end: end || undefined })
          }
          onClear={() => onChange({ start: undefined, end: undefined })}
        />
        {timed ? (
          <EntryTime
            className="text-ink/45"
            duration={fmtHours(entry.minutes)}
            paused={paused}
            running={pausing}
          />
        ) : (
          <span className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              value={entry.minutes}
              onChange={(e) => onChange({ minutes: Number(e.target.value) })}
              className={`${FIELD_BARE} w-10 text-[10px] text-ink/70`}
            />
            <span className="text-ink/45">min</span>
          </span>
        )}
      </div>

      {/* **The pause, as one number.** However many times you stopped, it is
          stored and edited as a single duration — see `TimeEntry.paused` —
          because what you go back to correct is "that was ten minutes, not
          fifteen", never which of the three stops it belonged to.

          A running pause shows the button rather than the box: a total that
          is still growing is not a number anybody can usefully type over, and
          this is the one place you can end one from inside the form you opened
          to look at it. */}
      {showPause && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink/50">
          <Pause size={10} style={{ color: c.warn }} />
          <input
            type="number"
            min={0}
            step={STEP_MINUTES}
            value={paused}
            onChange={(e) =>
              onChange({ paused: Math.max(0, Number(e.target.value) || 0) })
            }
            className={`${FIELD_BARE} w-10 text-[10px] text-ink/70`}
          />
          <span>{t("min paused")}</span>
          {/* Exactly one of the two, and only while the session is still
              running: pausing something that already has an end time is
              asking for a stop inside a stretch that is over. */}
          {pausing ? (
            <Tip text={t("Resume this session")}>
              <button
                onClick={() => onChange(resumePatch(entry))}
                className={`${iconBtn} hover:bg-card/70`}
                style={{ color: c.accent }}
              >
                <Play size={12} fill="currentColor" />
              </button>
            </Tip>
          ) : running ? (
            <Tip text={t("Pause this session")}>
              <button
                onClick={() => onChange(pausePatch())}
                className={`${iconBtn} hover:bg-card/70`}
                style={{ color: c.warn }}
              >
                <Pause size={12} fill="currentColor" />
              </button>
            </Tip>
          ) : null}
        </div>
      )}

      {/* The slot, then the activity, each on its own line. The slot heading
          outside a form is bold; this one deliberately is not, so the two are
          telling you different things — one labels a group, this one is a
          field you can change. */}
      {isStudy && (
        <div className="flex items-center gap-1.5">
          <RenderIcon
            name={slot?.iconName}
            size={10}
            style={{ color: accent }}
          />
          <select
            value={slotId}
            onChange={(e) => onMoveSlot?.(e.target.value)}
            className={`${FIELD_BARE} min-w-0 text-[9px] uppercase tracking-widest`}
            style={{ color: accent }}
          >
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {isStudy && cat && (
        <div className="flex items-center gap-1.5">
          <RenderIcon name={cat.iconName} size={9} style={{ color: cat.color }} />
          <select
            value={entryActivity(entry as StudyEntry)}
            onChange={(e) => onChange({ activity: e.target.value })}
            className={`${FIELD_BARE} min-w-0 text-[10px] text-ink/70`}
          >
            {activities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Same italic muted line the readout uses for a comment, just typeable. */}
      <AutoTextarea
        value={entry.comment || ""}
        onChange={(e) => onChange({ comment: e.target.value })}
        placeholder={t("Note")}
        rows={1}
        maxHeight={160}
        className="w-full bg-transparent border-0 p-0 text-[10px] font-mono italic text-ink/60 placeholder:text-ink/30 focus:outline-none"
      />

      {/* A row of its own at the bottom, nothing sharing it. Destructive on
          the left, away from the two you reach for constantly; the pair on the
          right in the order they are decided — first "not this", then "yes". */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        <Tip text={t("Delete this entry")}>
          <button
            onClick={onDelete}
            className={`${iconBtn} hover:bg-card/70`}
            style={{ color: c.exam }}
          >
            <Trash2 size={13} />
          </button>
        </Tip>
        <div className="flex items-center gap-0.5 shrink-0">
          <Tip text={t("Cancel changes")}>
            <button
              onClick={onCancel}
              className={`${iconBtn} text-ink/40 hover:text-ink hover:bg-card/70`}
            >
              <Ban size={13} />
            </button>
          </Tip>
          {/* Closes rather than saves — everything above is already written. */}
          <Tip text={t("Done")}>
            <button
              onClick={onClose}
              className={`${iconBtn} hover:bg-card/70`}
              style={{ color: c.goalMet }}
            >
              <Check size={14} />
            </button>
          </Tip>
        </div>
      </div>
    </div>
  )
}
