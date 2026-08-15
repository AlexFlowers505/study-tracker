/* ---------------------------------------------------------------
   Which theme the app is wearing.

   A store rather than a context, for two reasons. The choice has to be applied
   to `document.documentElement` before React renders anything — `index.html`
   already reads the same key to avoid a flash — so there is state outside the
   tree whatever we do; and `usePalette()` is wanted in twenty scattered
   components, none of which are related, so threading a provider through them
   would buy nothing over subscribing directly.

   `useSyncExternalStore` is what keeps the two in step: one subscription, and
   every component re-renders on a change with no risk of tearing.

   The preference lives in localStorage, not in the account. A theme is a
   property of the device you are looking at — the same logbook can reasonably
   be light on a desk and dark in bed — and anything that had to be fetched
   would paint the wrong theme first and then correct itself in front of you.
--------------------------------------------------------------- */

import { useSyncExternalStore } from "react"
import type { Palette, ThemeChoice, ThemeMode } from "../lib/theme"
import { PALETTES } from "../lib/theme"

/** Shared with the pre-paint script in `index.html`. Changing it means changing both. */
const STORAGE_KEY = "timelens-theme"

const isChoice = (v: unknown): v is ThemeChoice =>
  v === "light" || v === "dark" || v === "system"

const read = (): ThemeChoice => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isChoice(stored) ? stored : "system"
  } catch {
    // Private-mode Safari throws on access rather than returning null.
    return "system"
  }
}

const prefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches

let choice: ThemeChoice = read()
const listeners = new Set<() => void>()

const resolve = (c: ThemeChoice): ThemeMode =>
  c === "system" ? (prefersDark() ? "dark" : "light") : c

const apply = () => {
  document.documentElement.dataset.theme = resolve(choice)
}

const emit = () => {
  apply()
  listeners.forEach((fn) => fn())
}

export const setThemeChoice = (next: ThemeChoice) => {
  choice = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Not being able to remember it is not a reason to refuse to change it.
  }
  emit()
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

// Only matters while the choice is `system`, but subscribing once at module
// load is cheaper than adding and removing the listener as the choice changes,
// and `emit` is a no-op repaint when it isn't.
if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", emit)
  apply()
}

/** The setting itself — "system" included. For the control in Setup. */
export const useThemeChoice = (): ThemeChoice =>
  useSyncExternalStore(
    subscribe,
    () => choice,
    () => "system" as ThemeChoice,
  )

/** What `system` currently resolves to. For anything that has to draw. */
export const useThemeMode = (): ThemeMode =>
  useSyncExternalStore(
    subscribe,
    () => resolve(choice),
    () => "light" as ThemeMode,
  )

/**
 * The colours for the current theme.
 *
 * Use this for values that reach the DOM as something other than a class name
 * — inline `style`, Recharts props, and the `${colour}1A` alpha suffixes. Any
 * plain class name should use the Tailwind tokens (`bg-card`, `text-ink/40`)
 * instead, which follow the theme without any JavaScript at all.
 */
export const usePalette = (): Palette => PALETTES[useThemeMode()]
