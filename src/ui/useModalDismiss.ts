import { useEffect } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"

/**
 * Escape closes, and so does a click that lands on the backdrop rather than
 * on the dialog. Returns the handler to put on the backdrop element.
 */
export function useModalDismiss(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (e: ReactMouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }
}
