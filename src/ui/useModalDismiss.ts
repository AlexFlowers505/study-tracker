import { useEffect, useSyncExternalStore } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"

/**
 * How many modals are currently open. A counter rather than a boolean because
 * they nest — the quick-add dialog opens over the day dialog — and the inner
 * one closing must not unlock the page underneath the outer one.
 */
let openCount = 0

/* Anything that has to get out of a modal's way subscribes here. A store
   rather than a prop threaded down from `App`: the count already lives in
   this module because every modal calls `useModalDismiss`, and the
   alternative is `App` keeping a parallel boolean in step with six dialogs by
   hand — which is a thing that goes wrong quietly, on the seventh. */
const watchers = new Set<() => void>()
const announce = () => watchers.forEach((fn) => fn())

/**
 * Is any modal open? For the few fixed things that float over the page and
 * would otherwise float over a dialog as well.
 */
export const useModalOpen = (): boolean =>
  useSyncExternalStore(
    (fn) => {
      watchers.add(fn)
      return () => {
        watchers.delete(fn)
      }
    },
    () => openCount > 0,
    () => false,
  )

const lock = () => {
  openCount += 1
  announce()
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
  announce()
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
 *
 * **And putting the keyboard back where it was found.** Closing a modal left
 * focus on a button inside a tree that had just been unmounted, so it fell to
 * `<body>` — which for anyone driving by keyboard means the next Tab starts
 * again from the top of the page, with no way back to the thing they had just
 * been using except by walking the whole logbook. The opener is remembered on
 * the way in and focused on the way out, after the scroll lock has been
 * released so the page is its own size again when it moves.
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
    // Read before the lock: `document.activeElement` is still the button that
    // opened this, and one render later it may not be anything.
    const opener = document.activeElement
    lock()
    return () => {
      unlock()
      // `isConnected` because the opener is not always still there — switching
      // project closes this modal by replacing everything behind it.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  return (e: ReactMouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }
}
