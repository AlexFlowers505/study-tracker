/* ---------------------------------------------------------------
   Checks on a day card — the counters that answer "did it happen".

   A tally gets a badge with a number on it. A check has no number, so it gets
   a chip carrying two glyphs: the unit's own icon, which says *which* question
   this is, and a state glyph, which says the answer. A tick for yes, a cross
   for no, a ghost for skipped, a dash for not yet said.

   **The answer is a glyph, not a shape.** It used to be the chip's outline —
   filled for yes, hollow for no, dashed and struck through for skipped, dotted
   for unanswered — and four kinds of border is a legend you have to have been
   told. Nobody has to be told what a tick means.

   **No good-and-bad colouring, and that is why the tick and the cross are the
   same colour.** Yes is bad for Overslept and good for Went to bed on time,
   and nothing here can tell which — that is what a streak rule is for. So both
   answers are drawn in the unit's own colour and differ only in the glyph; a
   green tick and a red cross would be this file passing a verdict it has no
   business passing. The one thing the colour does say is whether the day has
   been answered at all: an answer wears the unit's colour, an unanswered chip
   is plain ink.

   Which chips appear depends on whether the day can still be written:

   - while it can, **all of them**, because that is the day's checklist and the
     unanswered ones are the point of looking;
   - once it cannot, only the ones with something to say — yes and skipped. A
     `no` is what an untouched day resolves to anyway, so a chip for it on
     every card would be a row of "nothing happened" on every card.
--------------------------------------------------------------- */

import { Check, Ghost, Minus, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { CheckState, CounterUnit, Day, DayKey } from "../types/model"
import { CHECK_CHOICES, CHECK_LABELS, checkState } from "../lib/checks"
import { btnBase, cardTiny } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { PopoverMenu } from "../ui/PopoverMenu"
import { Tip } from "../ui/Tip"

/** The answer, as one glyph. Neutral by construction — see the note above. */
const CHECK_GLYPH: Record<CheckState, LucideIcon> = {
  yes: Check,
  no: X,
  skip: Ghost,
  unknown: Minus,
}

/**
 * How loud a chip is, which is a question about whether the day was answered
 * rather than about what the answer was.
 *
 * `yes` is the only one at full strength: a check that happened is a thing
 * that is *there*, the way a tally with a count is. The other two answers are
 * the same chip turned down, and an unanswered one drops the unit's colour
 * altogether — it has nothing to report yet.
 */
const chipStyle = (state: CheckState, color: string) => {
  if (state === "yes")
    return { className: "", style: { color, backgroundColor: `${color}1F` } }
  if (state === "unknown")
    return { className: "text-ink/35 bg-ink/[0.05]", style: undefined }
  return {
    className: "",
    style: { color: `${color}99`, backgroundColor: `${color}0F` },
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
        const Glyph = CHECK_GLYPH[state]
        // The state glyph goes last, where the tally's number goes, so the two
        // kinds of counter read along the same line: what it is, then what it
        // came to. Heavier than the unit's icon because it is the answer.
        const body = (
          <>
            <RenderIcon name={unit.iconName} size={10} />
            {roomy && <span>{unit.label}</span>}
            <Glyph size={11} strokeWidth={3} />
          </>
        )
        const chipClass = `${btnBase} flex items-center gap-1 ${cardTiny(
          roomy,
        )} uppercase tracking-wide font-mono px-1.5 py-0.5 rounded-full ${className}`
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
                {/* Each choice wears the glyph the chip will wear, so the
                    three marks are learned here rather than guessed at on a
                    card that has room for nothing but the glyph. */}
                {CHECK_CHOICES.map((choice) => {
                  const ChoiceGlyph = CHECK_GLYPH[choice]
                  return (
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
                      className={`${btnBase} w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-xl text-[11px] font-mono ${
                        state === choice
                          ? "font-bold"
                          : "text-ink/70 hover:bg-ink/5"
                      }`}
                    >
                      <ChoiceGlyph size={13} strokeWidth={3} />
                      {CHECK_LABELS[choice]}
                    </button>
                  )
                })}
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
