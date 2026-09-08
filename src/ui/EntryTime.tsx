/* ---------------------------------------------------------------
   An entry's time, with the mark that says part of it was a pause.

   A timed entry says two things at once — when it happened and how long it
   lasted — and once a pause can sit between them the two stop adding up:
   `22:00–22:30 (15m)` is arithmetic that does not work, and a reader who
   cannot make it work assumes the app is broken rather than that they are
   missing a fact.

   So the duration carries a **star**, in a colour of its own, *inside* the
   brackets it belongs to, and the tooltip on the whole label says how long
   the pause was. A star is the smallest thing that can say "there is a reason
   for this"; the reason itself is a hover away, because on a day card with
   seven entries on it there is no room to print it seven times.

   The tooltip sits on the **label**, not on the star. The star is six pixels
   across, and a fact you can only reach by hitting six pixels is a fact most
   people will never read.
--------------------------------------------------------------- */

import { useT } from "../lib/i18n"
import { fmtHours } from "../lib/time"
import { Tip } from "./Tip"

import { usePalette } from "./useTheme"

export function EntryTime({
  range,
  duration,
  paused = 0,
  running = false,
  bare = false,
  className = "",
}: {
  /** `22:00–22:30`, with any `−1d` marker already on it. Absent where the
   *  times are shown elsewhere — in the edit row they are the field above. */
  range?: string
  /** Already formatted: `fmtHours` for a timed entry, `30m` for a typed one. */
  duration: string
  /** Minutes the session was paused for. Nought draws no star and no tooltip. */
  paused?: number
  /** A pause is running right now, so the figure is still growing. */
  running?: boolean
  /** No brackets — for the standalone readout in the add dialog, where the
   *  duration is the only thing on the line and has nothing to sit beside. */
  bare?: boolean
  className?: string
}) {
  const c = usePalette()
  const t = useT()
  const marked = paused > 0 || running
  /* `warn` and not the accent: amber is the colour this palette already uses
     for *held, not lost*, which is exactly what a pause is — and the accent
     means "active", which is the one thing a paused session is not. */
  const star = marked ? (
    <span style={{ color: c.warn }} aria-hidden>
      *
    </span>
  ) : null

  const body = bare ? (
    <>
      {duration}
      {star}
    </>
  ) : (
    <>
      {range ? `${range} ` : ""}({duration}
      {star})
    </>
  )

  if (!marked) return <span className={className}>{body}</span>

  const tip = running
    ? t("On pause now — {time} so far", { time: fmtHours(paused) })
    : t("{time} of this was a pause", { time: fmtHours(paused) })

  return (
    <Tip className={className} text={tip}>
      <span>{body}</span>
    </Tip>
  )
}
