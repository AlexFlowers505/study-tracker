/* ---------------------------------------------------------------
   Which language the app is wearing.

   **A store, not a context, and for the same two reasons `useTheme` is one.**
   The choice has to be readable from `lib/` — `clauseSentence`, `notices`,
   `violationsOn` and the readouts all build user-facing prose in pure
   functions that no hook can reach — so there is state outside the tree
   whatever we do. And `t()` is wanted in sixty unrelated components that a
   provider would have to be threaded through for nothing.

   **The key is the English string.** Not an invented `notices.hideAll`. A
   thousand short keys is a thousand chances to name one thing twice, the
   source stops being readable at the call site, and a missing translation
   becomes a bare key on the screen instead of the English it fell back from.
   Here the fallback *is* the original sentence, which is the one wrong answer
   that is never confusing. Where one English word needs two Russian ones —
   `Day` the period against `Day` the view — the key carries a context prefix
   (`"period:Day"`), and `t` strips everything up to the first colon before it
   falls back.

   **Nothing is pre-painted.** The theme needs a script in `index.html` because
   painting the wrong colours and correcting them is visible; text arrives with
   the bundle either way, so there is nothing to race.
--------------------------------------------------------------- */

import { useSyncExternalStore } from "react"
import { RU } from "./locales/ru"

export type Locale = "en" | "ru"

export const LOCALES: { id: Locale; label: string; native: string }[] = [
  { id: "en", label: "English", native: "English" },
  { id: "ru", label: "Russian", native: "Русский" },
]

/** Shared with nothing — unlike the theme, no pre-paint script reads it. */
const STORAGE_KEY = "timelens-lang"

const isLocale = (v: unknown): v is Locale => v === "en" || v === "ru"

/**
 * The device's own language, when nothing has been chosen.
 *
 * Only Russian is offered against English, so anything else lands on English —
 * which is what a fallback is for, and better than guessing from a language
 * list the app cannot actually speak.
 */
const fromBrowser = (): Locale => {
  if (typeof navigator === "undefined") return "en"
  return navigator.languages?.some((l) => l.toLowerCase().startsWith("ru"))
    ? "ru"
    : "en"
}

const read = (): Locale => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isLocale(stored) ? stored : fromBrowser()
  } catch {
    // Private-mode Safari throws on access rather than returning null.
    return fromBrowser()
  }
}

let locale: Locale = read()
const listeners = new Set<() => void>()

/** `<html lang>` follows, so hyphenation and screen readers do too. */
const apply = () => {
  if (typeof document !== "undefined")
    document.documentElement.lang = locale
}

export const setLocale = (next: Locale) => {
  locale = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Not being able to remember it is not a reason to refuse to change it.
  }
  apply()
  listeners.forEach((fn) => fn())
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

if (typeof window !== "undefined") apply()

export const useLocale = (): Locale =>
  useSyncExternalStore(
    subscribe,
    () => locale,
    () => "en" as Locale,
  )

/** For the pure functions, which have no hook to call. */
export const currentLocale = (): Locale => locale

/**
 * What a context-prefixed key falls back to.
 *
 * **Only a real prefix is stripped**, and a real prefix is a bare lowercase
 * identifier — `board:`, `answer:`, `frag:`. The first version cut at the
 * first colon wherever it was, which quietly ate the front of every key that
 * happens to *contain* one: `"{named}: {parts} a week"` fell back to
 * `" {parts} a week"`, so a weekly check rule read back with no counter name
 * and no colon. English is the fallback language, so that was a visible bug in
 * the default.
 */
const bare = (key: string) => {
  const at = key.indexOf(":")
  if (at === -1) return key
  return /^[a-z][a-zA-Z0-9_-]*$/.test(key.slice(0, at))
    ? key.slice(at + 1)
    : key
}

/**
 * One string, translated and filled in.
 *
 * `vars` substitutes `{name}` placeholders, so a sentence stays one sentence
 * in the dictionary instead of being concatenated out of fragments — which is
 * the thing that makes a translation impossible, because the fragments go in a
 * different order in a different language.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const table = locale === "ru" ? RU : undefined
  let out = table?.[key] ?? bare(key)
  if (vars)
    for (const [name, value] of Object.entries(vars))
      out = out.split(`{${name}}`).join(String(value))
  return out
}

/**
 * **A count and its noun, agreeing.**
 *
 * English needs two forms and Russian three, and which of the three depends on
 * the last two digits rather than on the number: 1, 21, 31 take the first; 2–4
 * and 22–24 the second; 11–14 and everything else the third. Getting this
 * wrong is the loudest possible tell that a page was translated by machine, so
 * it is one function rather than a `+ "s"` at forty call sites.
 *
 * The English side takes one word and adds the `s`; the Russian side takes the
 * three forms it actually needs.
 */
export function plural(n: number, forms: [string, string, string]): string {
  if (locale !== "ru") return `${n} ${forms[0]}${n === 1 ? "" : "s"}`
  const mod100 = Math.abs(n) % 100
  const mod10 = mod100 % 10
  const form =
    mod100 >= 11 && mod100 <= 14
      ? forms[2]
      : mod10 === 1
        ? forms[0]
        : mod10 >= 2 && mod10 <= 4
          ? forms[1]
          : forms[2]
  return `${n} ${form}`
}

/**
 * The same, when the English word is irregular — `days`/`дня` is fine,
 * `freezes`/`заморозки` is not, and neither is anything ending in `y`.
 */
export function pluralOf(
  n: number,
  en: [string, string],
  ru: [string, string, string],
): string {
  if (locale !== "ru") return `${n} ${n === 1 ? en[0] : en[1]}`
  return plural(n, ru)
}

/** The hook, for anything that draws: re-renders when the choice changes. */
export function useT() {
  useLocale()
  return t
}
