/* ---------------------------------------------------------------
   Start/end time picker — two text inputs over a clock dial.

   Hand-rolled rather than a library: the dial has to walk four steps (start
   hour, start minutes, end hour, end minutes) and show the resulting duration
   as you hover, which no off-the-shelf picker does.

   **Everything that acts on one half sits in that half.** `now` and a clear
   cross live inside each of the two inputs rather than in a row under the
   dial, and the row under the dial is one `Done`. The old row had one of each
   button acting on whichever field the dial was driving, so the same control
   meant two different things a minute apart and *start now, end now* was two
   trips through the mode — while the panel's own hardest problem, saying which
   half you are editing, was being asked again of two buttons that had no
   business asking it.

   The panel goes through `useDatePopover`, so it portals to <body> and
   dismisses the same way the date fields do.
--------------------------------------------------------------- */

import { useEffect, useState } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import { createPortal } from "react-dom"
import { Clock, X } from "lucide-react"
import type { TimeOfDay } from "../types/model"
import { useT } from "../lib/i18n"
import { pad } from "../lib/date"
import { fmtHours, nowTime, spanMinutes, timeToMinutes } from "../lib/time"
import { BTN_SOFT, FIELD_BARE, FIELD_BOXED, btnBase } from "../lib/theme"
import { DATE_PANEL_CLASS, useDatePopover } from "./datePopover"
import { Tip } from "./Tip"

import { usePalette } from "./useTheme"
type Step = "start-hour" | "start-minute" | "end-hour" | "end-minute"

const FIELDS = ["start", "end"] as const
type Field = (typeof FIELDS)[number]

export function TimeRangeField({
  start,
  end,
  onChange,
  onClear,
  bare = false,
}: {
  start?: TimeOfDay
  end?: TimeOfDay
  onChange: (start?: TimeOfDay, end?: TimeOfDay) => void
  onClear: () => void
  /**
   * Drops the box for editing in the middle of a line of text — the day
   * cards, where an entry has to stay recognisable as the same row while it
   * is being edited. The panel is identical either way.
   */
  bare?: boolean
}) {
  const c = usePalette()
  const t = useT()
  const { triggerRef, panelRef, open, setOpen, box, panelStyle, toggle } =
    useDatePopover()
  const [step, setStep] = useState<Step>("start-hour")
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const [startText, setStartText] = useState(start || "")
  const [endText, setEndText] = useState(end || "")
  const isMinute = step.endsWith("minute")
  const editingStart = step.startsWith("start")
  const current = editingStart ? start : end
  const currentValue = current ? timeToMinutes(current) : null

  // The props change after a valid buffer is committed; keep the local text
  // aligned without remounting the focused input.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setStartText(start || ""), [start])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setEndText(end || ""), [end])

  // Reopening a half-set range means you came back for the missing half, so
  // land on it rather than on the value that is already there.
  const openPicker = () => {
    setStep(start && !end ? "end-hour" : "start-hour")
    setHoverValue(null)
    toggle()
  }

  const setValue = (field: Field, value: TimeOfDay) => {
    onChange(field === "start" ? value : start, field === "end" ? value : end)
  }

  const timeFromDialValue = (value: number): TimeOfDay => {
    const [oldHour = 0, oldMinute = 0] = current
      ? current.split(":").map(Number)
      : []
    return isMinute
      ? `${pad(oldHour)}:${pad(value)}`
      : `${pad(value)}:${pad(oldMinute)}`
  }

  const selectDialValue = (value: number) => {
    const field: Field = editingStart ? "start" : "end"
    setValue(field, timeFromDialValue(value))
    setHoverValue(null)
    if (step === "start-hour") setStep("start-minute")
    else if (step === "start-minute") setStep("end-hour")
    else if (step === "end-hour") setStep("end-minute")
    else setOpen(false)
  }

  /* **Both actions belong to a field, so they live in that field.**
     They were a row of buttons under the dial acting on whichever half the
     dial happened to be driving, which meant `Now` and `Clear` changed their
     meaning depending on a state you had to read off the ring above them —
     and there was only ever one of each, so setting a start and an end from
     the clock took two trips through the mode. Sitting inside the input,
     each one names its own subject by where it is.

     Both also make their field the one the dial is driving. One rule rather
     than two, and the accent moving to the half you pressed is what confirms
     you hit the one you meant — which matters at this size. */
  const setNow = (field: Field) => {
    setValue(field, nowTime())
    setHoverValue(null)
    setStep(`${field}-hour`)
  }

  const clearField = (field: Field) => {
    // Both gone means the entry has no times at all, which is a real state
    // with its own handler — it is what puts the row back on plain minutes.
    if (field === "start" ? !end : !start) onClear()
    else if (field === "start") onChange(undefined, end)
    else onChange(start, undefined)
    setHoverValue(null)
    setStep(`${field}-hour`)
  }

  const handleTextTime = (field: Field, value: string) => {
    const match = value.match(/^(\d{1,2}):([0-5]\d)$/)
    if (!match || Number(match[1]) > 23) return
    setValue(field, `${pad(Number(match[1]))}:${match[2]}`)
  }

  const dialValueFromPointer = (event: ReactMouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 200 - 100
    const y = ((event.clientY - rect.top) / rect.height) * 200 - 100
    const n = isMinute ? 60 : 12
    const angle = (Math.atan2(x, -y) + 2 * Math.PI) % (2 * Math.PI)
    const value = Math.round((angle / (2 * Math.PI)) * n) % n
    const radius = Math.hypot(x, y)
    // Inner ring starts the day, the outer ring carries it on: reading outwards
    // is the direction people reach for first.
    if (!isMinute) return radius < 65 ? value : value + 12
    return (Math.round(value / 5) * 5) % 60
  }

  const committedDialValue =
    currentValue === null
      ? null
      : isMinute
        ? currentValue % 60
        : Math.floor(currentValue / 60)
  const dialValue = hoverValue === null ? committedDialValue : hoverValue
  const dialAngle =
    dialValue === null
      ? null
      : ((dialValue % (isMinute ? 60 : 12)) / (isMinute ? 60 : 12)) *
        2 *
        Math.PI
  // With no value the marker isn't drawn at all, so which radius it would have
  // had makes no difference — the explicit null check only satisfies the types.
  const markerRadius =
    !isMinute && dialValue !== null && dialValue < 12 ? 52 : 78
  const markerX =
    dialAngle === null ? 100 : 100 + markerRadius * Math.sin(dialAngle)
  const markerY =
    dialAngle === null ? 100 : 100 - markerRadius * Math.cos(dialAngle)
  const dialLabels = isMinute
    ? Array.from({ length: 12 }, (_, i) => ({ value: i * 5, radius: 78 }))
    : Array.from({ length: 24 }, (_, i) => ({
        value: i,
        radius: i < 12 ? 52 : 78,
      }))

  const previewTime =
    hoverValue === null ? current : timeFromDialValue(hoverValue)
  const previewStart = editingStart ? previewTime : start
  const previewEnd = editingStart ? end : previewTime
  const duration =
    previewStart && previewEnd ? spanMinutes(previewStart, previewEnd) : null
  const crossesMidnight = duration !== null && duration > 12 * 60
  const triggerLabel =
    start || end ? `${start || "…"} – ${end || "…"}` : t("Set time")

  // Screen-reader wording for the dial. The visible version of this sits above
  // the dial and is built from `editingStart` / `isMinute` directly, so it can
  // put the accent on the field name.
  const hint =
    step === "start-hour"
      ? t("Pick the start hour")
      : step === "start-minute"
        ? t("Now the start minutes")
        : step === "end-hour"
          ? t("Now the end hour")
          : t("Now the end minutes")

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={
          bare
            ? `${FIELD_BARE} ${btnBase} flex items-center gap-1 text-left text-[10px] text-ink/70`
            : `${BTN_SOFT} ${btnBase} flex items-center gap-1.5 text-left normal-case tracking-normal text-xs py-1.5`
        }
      >
        <Clock
          size={bare ? 10 : 13}
          className="text-ink/40 shrink-0 no-underline"
        />
        <span className={start || end ? "" : "text-ink/35"}>
          {triggerLabel}
        </span>
      </button>
      {open &&
        box &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyle ?? undefined}
            /* 260 is `DATE_PANEL_MAX_WIDTH`, the figure the popover's own
               viewport clamp is written against — and the two inputs now
               carry a control at each end, so the panel takes the whole of
               what it was already allowed. The dial grows with it. */
            className={`${DATE_PANEL_CLASS} w-[260px]`}
          >
            {/* Which of the two the dial is driving has to be unmissable: the
                panel looks the same either way, and picking the end when you
                meant the start is silent — you get a valid time in the wrong
                field. So the active half is stated three times over. It wears
                the accent (label, ring, fill and figures), the idle half drops
                to 60% so the pair reads as live-and-secondary rather than two
                equal boxes, and the line under them names it in words. */}
            <div className="grid grid-cols-2 gap-2 px-1 pt-1">
              {FIELDS.map((field) => {
                const active = editingStart === (field === "start")
                return (
                  <label
                    key={field}
                    className={`min-w-0 block ${active ? "" : "opacity-60"}`}
                  >
                    <span
                      className={`block mb-1 text-[9px] font-mono uppercase tracking-widest ${
                        active ? "font-bold" : "text-ink/45"
                      }`}
                      style={active ? { color: c.accent } : undefined}
                    >
                      {t(`field:${field}`)}
                    </span>
                    {/* The two actions this field can take, inside it. The
                        cross is on the left and `now` on the right in both
                        halves, so the pair is learned once and read four
                        times — and neither ever needs to say which field it
                        means, because it is standing in it.

                        `now` was a word for a long time, on the argument that
                        there is no drawing of *the current time* that is not
                        just another clock. `spec 028` reversed it: a clock is
                        exactly the drawing, the word was the one piece of
                        type inside an input otherwise made of figures, and
                        the tooltip says in full what it does. */}
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="HH:MM"
                        value={
                          active && hoverValue !== null
                            ? previewTime
                            : field === "start"
                              ? startText
                              : endText
                        }
                        onFocus={() => setStep(`${field}-hour`)}
                        onChange={(event) => {
                          const value = event.target.value
                          if (field === "start") setStartText(value)
                          else setEndText(value)
                          handleTextTime(field, value)
                        }}
                        style={
                          active
                            ? {
                                boxShadow: `0 0 0 2px ${c.accent}`,
                                borderColor: c.accent,
                                backgroundColor: `${c.accent}12`,
                                color: c.accent,
                              }
                            : undefined
                        }
                        className={`${FIELD_BOXED} w-full px-[22px] py-1 text-center ${
                          active ? "font-bold" : ""
                        }`}
                      />
                      {/* Absent with nothing to clear — a button that refuses
                          when pressed is worse than one that is not there.
                          The padding stays either way, so the figure does not
                          shuffle sideways as the range fills in. */}
                      {(field === "start" ? start : end) && (
                        <Tip
                          text={t(`clear:${field}`)}
                          className="absolute left-[3px] top-1/2 -translate-y-1/2"
                        >
                          <button
                            type="button"
                            onClick={() => clearField(field)}
                            aria-label={t(`clear:${field}`)}
                            className={`${btnBase} rounded p-[3px] text-ink/35 hover:text-ink hover:bg-ink/10`}
                          >
                            <X size={10} strokeWidth={2.5} />
                          </button>
                        </Tip>
                      )}
                      <Tip
                        text={t(
                          field === "start"
                            ? "Set the start to the current time"
                            : "Set the end to the current time",
                        )}
                        className="absolute right-[3px] top-1/2 -translate-y-1/2"
                      >
                        <button
                          type="button"
                          onClick={() => setNow(field)}
                          aria-label={t(
                            field === "start"
                              ? "Set the start to the current time"
                              : "Set the end to the current time",
                          )}
                          className={`${btnBase} rounded p-[3px] text-ink/35 hover:text-ink hover:bg-ink/10`}
                        >
                          <Clock size={10} strokeWidth={2.5} />
                        </button>
                      </Tip>
                    </div>
                  </label>
                )
              })}
            </div>
            {/* Above the dial, not below it with the duration: this says what
                the next click will do, so it has to be read before the click,
                not found afterwards. It is always present, so nothing shifts
                under the cursor as the range fills in. */}
            <p className="px-1 pt-2 text-[9px] font-mono uppercase tracking-widest text-ink/45">
              {t("Setting")}{" "}
              <span className="font-bold" style={{ color: c.accent }}>
                {t(editingStart ? "the start" : "the end")}{" "}
                {t(isMinute ? "minutes" : "hour")}
              </span>
            </p>
            <svg
              viewBox="0 0 200 200"
              onMouseMove={(event) =>
                setHoverValue(dialValueFromPointer(event))
              }
              onMouseLeave={() => setHoverValue(null)}
              onClick={(event) => selectDialValue(dialValueFromPointer(event))}
              className="block w-full cursor-pointer select-none"
              aria-label={`Time dial: ${hint}`}
            >
              <circle cx="100" cy="100" r="90" fill={`${c.ink}08`} />
              <circle
                cx="100"
                cy="100"
                r="78"
                fill="none"
                stroke={`${c.ink}18`}
              />
              {!isMinute && (
                <circle
                  cx="100"
                  cy="100"
                  r="52"
                  fill="none"
                  stroke={`${c.ink}18`}
                />
              )}
              {dialAngle !== null && (
                <>
                  <line
                    x1="100"
                    y1="100"
                    x2={markerX}
                    y2={markerY}
                    stroke={c.accent}
                    strokeWidth="2"
                    opacity={hoverValue === null ? 1 : 0.55}
                  />
                  <circle
                    cx={markerX}
                    cy={markerY}
                    r="14"
                    fill={c.accent}
                    opacity={hoverValue === null ? 1 : 0.55}
                  />
                </>
              )}
              <circle cx="100" cy="100" r="3" fill={c.accent} />
              {dialLabels.map(({ value, radius }) => {
                const angle =
                  ((value % (isMinute ? 60 : 12)) / (isMinute ? 60 : 12)) *
                  2 *
                  Math.PI
                const x = 100 + radius * Math.sin(angle)
                const y = 100 - radius * Math.cos(angle)
                const selected = value === dialValue
                return (
                  <text
                    key={value}
                    x={x}
                    y={y + 3}
                    textAnchor="middle"
                    className="font-mono text-[10px]"
                    fill={selected ? "white" : `${c.ink}99`}
                  >
                    {isMinute ? pad(value) : value}
                  </text>
                )
              })}
            </svg>
            {/* Below the dial and always occupying its line, empty or not.
                Above it, appearing and disappearing as the range fills in, it
                shoved the dial up and down under the cursor. */}
            <div
              className="px-1 pt-1 h-4 text-[10px] font-mono"
              style={crossesMidnight ? { color: c.exam } : undefined}
            >
              {duration !== null && (
                <>
                  {duration}m · {fmtHours(duration)}
                  {crossesMidnight && " · crosses midnight"}
                </>
              )}
            </div>
            {/* **One button, because there is one thing left to say here.**
                `Now` and `Clear` used to share this row and act on whichever
                half the dial was driving, so the row's meaning changed under
                you and each action existed once for two fields; they are in
                the fields now. What is left is the way out — and without it
                the only way to keep a start and no end was to click somewhere
                harmless outside the panel and hope that counted as agreeing. */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ backgroundColor: `${c.accent}1A`, color: c.accent }}
              className={`${btnBase} mt-1 w-full rounded-xl px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest font-bold hover:opacity-80`}
            >
              {t("Done")}
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
