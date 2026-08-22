/* ---------------------------------------------------------------
   Checks on a day card — the counters that answer "did it happen".

   A tally gets a badge with a number on it. A check has no number to show, so
   it gets a chip whose *shape* is the answer: filled for yes, hollow for no,
   struck through for skipped, dotted for not yet said.

   **No good-and-bad colouring.** Yes is bad for Overslept and good for Went to
   bed on time, and nothing here can tell which — that is what a streak rule is
   for. So the chip reports the state in the unit's own colour and leaves the
   verdict to whatever is judging it.

   Which chips appear depends on whether the day can still be written:

   - while it can, **all of them**, because that is the day's checklist and the
     unanswered ones are the point of looking;
   - once it cannot, only the ones with something to say — yes and skipped. A
     `no` is what an untouched day resolves to anyway, so a chip for it on
     every card would be a row of "nothing happened" on every card.
--------------------------------------------------------------- */

import type { CheckState, CounterUnit, Day, DayKey } from "../types/model"
import { CHECK_CHOICES, CHECK_LABELS, checkState } from "../lib/checks"
import { btnBase, cardTiny } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { PopoverMenu } from "../ui/PopoverMenu"
import { Tip } from "../ui/Tip"

/**
 * How a state reads, as a shape rather than as a colour.
 *
 * `yes` is the only filled one: the chip being *there*, solidly, is the thing
 * that happened. Everything else is an outline, and the outline says which
 * kind of nothing it is.
 */
const chipStyle = (state: CheckState, color: string) => {
  if (state === "yes")
    return {
      className: "border border-transparent",
      style: { color, backgroundColor: `${color}1F` },
    }
  if (state === "skip")
    return {
      className: "border border-dashed line-through",
      style: { color: `${color}99`, borderColor: `${color}66` },
    }
  if (state === "no")
    return {
      className: "border",
      style: { color: `${color}99`, borderColor: `${color}44` },
    }
  return {
    className: "border border-dotted",
    style: { color: "currentColor", borderColor: "currentColor" },
  }
}

export function CheckChips({
  units,
  day,
  dayKey,
  todayKey,
  roomy,
  onSet,
}: {
  /** Checks only — the caller has already split by kind. */
  units: CounterUnit[]
  day: Day | undefined
  dayKey: DayKey
  todayKey: DayKey
  roomy?: boolean
  /** Absent on a day that cannot be written, which makes the chips inert. */
  onSet?: (unitId: string, next: CheckState) => void
}) {
  const shown = units.filter((u) => {
    const state = checkState(day, u.id, dayKey, todayKey)
    return onSet ? true : state === "yes" || state === "skip"
  })
  if (!shown.length) return null

  return (
    <>
      {shown.map((unit) => {
        const state = checkState(day, unit.id, dayKey, todayKey)
        const { className, style } = chipStyle(state, unit.color)
        const body = (
          <>
            <RenderIcon name={unit.iconName} size={10} />
            {roomy && <span>{unit.label}</span>}
          </>
        )
        const chipClass = `${btnBase} flex items-center gap-1 ${cardTiny(
          roomy,
        )} uppercase tracking-wide font-mono px-1.5 py-0.5 rounded-full ${className} ${
          state === "unknown" ? "text-ink/35" : ""
        }`
        const label = `${unit.label} — ${CHECK_LABELS[state]}`

        if (!onSet)
          return (
            <Tip key={unit.id} text={label}>
              <span className={chipClass} style={style}>
                {body}
              </span>
            </Tip>
          )

        return (
          <PopoverMenu
            key={unit.id}
            width={180}
            label={label}
            triggerClassName={chipClass}
            trigger={body}
          >
            {(close) => (
              <div>
                <p className="px-2.5 pt-1 pb-2 text-[9px] font-mono uppercase tracking-widest text-ink/40">
                  {unit.label}
                </p>
                {CHECK_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => {
                      onSet(unit.id, choice)
                      close()
                    }}
                    aria-pressed={state === choice}
                    style={
                      state === choice
                        ? { color: unit.color, backgroundColor: `${unit.color}1A` }
                        : undefined
                    }
                    className={`${btnBase} w-full text-left px-2.5 py-2 rounded-xl text-[11px] font-mono ${
                      state === choice
                        ? "font-bold"
                        : "text-ink/70 hover:bg-ink/5"
                    }`}
                  >
                    {CHECK_LABELS[choice]}
                  </button>
                ))}
                {/* Clearing is not a fourth answer, it is taking the answer
                    back — so it sits below a rule rather than in the list, and
                    it is absent when there is nothing to take back. */}
                {state !== "unknown" && (
                  <>
                    <span className="block h-px my-1 mx-2 bg-ink/10" />
                    <button
                      type="button"
                      onClick={() => {
                        onSet(unit.id, "unknown")
                        close()
                      }}
                      className={`${btnBase} w-full text-left px-2.5 py-2 rounded-xl text-[11px] font-mono text-ink/45 hover:bg-ink/5 hover:text-ink`}
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            )}
          </PopoverMenu>
        )
      })}
    </>
  )
}
