import { useEffect } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"

/**
 * How many modals are currently open. A counter rather than a boolean because
 * they nest — the quick-add dialog opens over the day dialog — and the inner
 * one closing must not unlock the page underneath the outer one.
 */
let openCount = 0

const lock = () => {
  openCount += 1
  if (openCount > 1) return
  const { body } = document
  // The scrollbar vanishes with the overflow, and the page jumps sideways by
  // its width as it goes. Pad by exactly that much to hold everything still.
  const gap = window.innerWidth - document.documentElement.clientWidth
  body.dataset.prevOverflow = body.style.overflow
  body.dataset.prevPadding = body.style.paddingRight
  body.style.overflow = "hidden"
  if (gap > 0) body.style.paddingRight = `${gap}px`
}

const unlock = () => {
  openCount = Math.max(0, openCount - 1)
  if (openCount > 0) return
  const { body } = document
  body.style.overflow = body.dataset.prevOverflow || ""
  body.style.paddingRight = body.dataset.prevPadding || ""
  delete body.dataset.prevOverflow
  delete body.dataset.prevPadding
}

/**
 * Escape closes, and so does a click that lands on the backdrop rather than
 * on the dialog. Returns the handler to put on the backdrop element.
 *
 * Holding the page still while it is open belongs here too: every modal in the
 * app already calls this, so there is one place that knows one is up, and a
 * dialog you can scroll the whole logbook behind reads as a rendering fault
 * rather than a layer.
 */
export function useModalDismiss(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    lock()
    return unlock
  }, [])

  return (e: ReactMouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }
}
