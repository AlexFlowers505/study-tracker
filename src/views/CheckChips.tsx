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

   **Only answered checks appear.** Every check used to be drawn on every
   writable day, because the card was the checklist and the blanks were the
   point of looking. That does not survive a project with twenty of them — the
   card does not draw its twenty activities either — and it stopped being
   necessary once a streak rule could require an answer, which reminds you
   better than a chip ever did. An unanswered check is added the way everything
   else is: through the "+".

   So a chip means *this was answered, and here is the answer*. Absence means
   nothing was said, which is now a thing the app is willing to leave
   unsaid — see `spec 011`, Part 2.
--------------------------------------------------------------- */

import { Check, Ghost, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { CheckState, CounterUnit, Day } from "../types/model"
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
}

/**
 * How loud a chip is, which is a question about whether the day was answered
 * rather than about what the answer was.
 *
 * `yes` is the only one at full strength: a check that happened is a thing
 * that is *there*, the way a tally with a count is. The other two answers are
 * the same chip turned down — said, but not something that happened.
 */
const chipStyle = (state: CheckState, color: string) => {
  if (state === "yes")
    return { className: "", style: { color, backgroundColor: `${color}1F` } }
  return {
    className: "",
    style: { color: `${color}99`, backgroundColor: `${color}0F` },
  }
}

export function CheckChips({
  units,
  day,
  roomy,
  onSet,
}: {
  /** Checks only — the caller has already split by kind. */
  units: CounterUnit[]
  day: Day | undefined
  roomy?: boolean
  /**
   * Absent on a day that cannot be written, which makes the chips inert.
   * Null takes an answer back — a deletion, not a fourth answer.
   */
  onSet?: (unitId: string, next: CheckState | null) => void
}) {
  const answered = units
    .map((unit) => ({ unit, state: checkState(day, unit.id) }))
    .filter((x): x is { unit: CounterUnit; state: CheckState } => !!x.state)
  if (!answered.length) return null

  return (
    <>
      {answered.map(({ unit, state }) => {
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
                    it hands `null` rather than a state. There is always
                    something to take back here: a chip only exists once the
                    check has been answered. */}
                <span className="block h-px my-1 mx-2 bg-ink/10" />
                <button
                  type="button"
                  onClick={() => {
                    onSet(unit.id, null)
                    close()
                  }}
                  className={`${btnBase} w-full text-left px-2.5 py-2 rounded-xl text-[11px] font-mono text-ink/45 hover:bg-ink/5 hover:text-ink`}
                >
                  Clear
                </button>
              </div>
            )}
          </PopoverMenu>
        )
      })}
    </>
  )
}
