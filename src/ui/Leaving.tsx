/* ---------------------------------------------------------------
   Something on its way out, kept on screen long enough to leave.

   React unmounts on the frame the condition turns false, which is why nothing
   in this app has ever had an exit: closing the composite's panel took 1124px
   out of the document between two frames, with the page below snapping up to
   fill the hole. Every panel and every modal had the same gap, and it is the
   same gap — the fix belongs in one place rather than in ten.

   **It holds the children rather than capturing them.** The caller keeps
   passing the same tree and moves its *condition* in here as `open`; nothing
   is snapshotted, so there is no stale render to reason about and no identity
   comparison on a JSX element, which is a new object every time and therefore
   never equal. The cost is that the caller's guards have to keep producing
   valid props for one more beat, which for every panel here they do — a panel
   closes because a toggle was pressed, not because its data went away.

   **Interruptible.** Re-opening during the exit clears the timer and puts the
   attribute back, so the transition reverses from wherever it had got to
   rather than starting again. That is the one thing a keyframe could not do,
   and it is why the exit is a transition.
--------------------------------------------------------------- */

import { useEffect, useState } from "react"
import type { ReactNode } from "react"

/** Matches the transition in `App.css`. One number, two places, said twice. */
export const LEAVING_MS = 160

export function Leaving({
  open,
  ms = LEAVING_MS,
  children,
}: {
  open: boolean
  ms?: number
  children: ReactNode
}) {
  const [shown, setShown] = useState(open)

  /* Opening is derived in the render rather than in an effect: an effect
     would set state synchronously and cost a second render before anything
     was painted, which for the one frame that matters is exactly backwards.
     Guarded, so it settles in one pass. */
  if (open && !shown) setShown(true)

  /* Closing is the only thing that has to wait, and the wait is a timer —
     setState from a callback, not from the effect body. */
  useEffect(() => {
    if (open || !shown) return
    const timer = window.setTimeout(() => setShown(false), ms)
    return () => window.clearTimeout(timer)
  }, [open, shown, ms])

  if (!shown) return null

  return (
    <div className="leaving" data-open={open}>
      <div>{children}</div>
    </div>
  )
}
