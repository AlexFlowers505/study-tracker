import type { Labeled } from "../types/model"

export const makeId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

/**
 * Never returns undefined: an id that survives only inside old entries still
 * has to render, and a row that vanished would stop the breakdowns adding up
 * to their total. The fallback is deliberately grey and question-marked so it
 * reads as "deleted", not as a real slot.
 */
export const getById = (
  list: Labeled[],
  id: string | undefined,
  fallbackLabel?: string,
): Labeled =>
  list.find((i) => i.id === id) || {
    id: id ?? "",
    label: fallbackLabel || id || "",
    color: "#9AA3AC",
    iconName: "HelpCircle",
  }
