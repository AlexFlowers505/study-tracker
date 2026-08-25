/**
 * A generated sentence, with the things it names picked out.
 *
 * `clauseSentence` and `shortfall` read a rule back in words — *“Lessons” at
 * least “3h” on Mon, Tue, Wed* — and at eleven-pixel mono, all one weight,
 * that is a wall you have to parse a word at a time. The parts that carry the
 * meaning are the names and the figures, and they are exactly the parts you
 * are checking against what you meant.
 *
 * **The quotes are in the string, not added here**, and that is the point.
 * These sentences are also handed to tooltips, to `Tip`, to the supervisor's
 * plain-text summary and to the change log, none of which can carry markup —
 * so the disambiguation has to survive being a bare string. Here the same
 * quotes get weight and full-strength ink as well; there they still separate
 * a two-word counter name from the words around it.
 *
 * A label containing a typographic quote of its own would split oddly. The
 * cost of that is a mis-styled sentence, never a wrong one, which is the right
 * way round for a purely presentational split.
 */
export function Sentence({ text }: { text: string | undefined }) {
  if (!text) return null
  return (
    <>
      {text.split(/(“[^”]*”)/g).map((part, i) =>
        part.startsWith("“") && part.endsWith("”") ? (
          <span key={i} className="font-bold text-ink">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}
