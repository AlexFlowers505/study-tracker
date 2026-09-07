/* ---------------------------------------------------------------
   Whether the board is open, and which levels it is hiding — `spec 016`.

   **The one panel whose state persists.** Every other one is a look rather
   than a preference and closes again on reload; this one is where danger is
   read, and a board you have to reopen every morning is a board that stops
   being the only place anything is said.

   **The filter takes away rather than picks out**, which is a reversal and
   the reason for the second storage key. It was a whitelist — `held`, empty
   meaning everything — so clicking `danger` showed danger *alone*. That is one
   click for the rare question and four for the common one (*stop showing me
   the green ones*), and it is the opposite of what every other legend in this
   app does: `ToggleChips` draws every series there is and its chips strike
   them out. It also left `hide all` with nothing to mean, since the empty set
   already meant the opposite.

   The legacy value is translated rather than dropped: a stored `held` becomes
   the levels it left out. Reusing the key would have been the silent kind of
   breakage — the same array meaning "everything" one day and "nothing" the
   next, with the board going blank on reload and nothing to say why.

   `localStorage`, not a cookie: a cookie would ride on every request to
   Supabase for nothing. Not the account either, for the same reason the theme
   is not — it is a device preference, and anything fetched before it can be
   applied paints the wrong thing and then corrects itself in front of you.

   Reading it can throw outright — a private window, or a browser set to block
   site data — so every read and write is wrapped and the default stands.
--------------------------------------------------------------- */

import { useCallback, useEffect, useState } from "react"
import type { NoticeLevel } from "../lib/notices"
import { LEVELS } from "../lib/notices"

const STORAGE_KEY = "timelens-notices"

export interface NoticePrefs {
  open: boolean
  /** Levels the board is not drawing. Empty means every level. */
  hidden: NoticeLevel[]
}

/** Open on a first visit, as asked: the board is where today is read. */
const DEFAULTS: NoticePrefs = { open: true, hidden: [] }

/** Only levels that still exist: one dropped in a later version must not
    survive in storage and quietly hide part of the board. */
const known = (list: unknown): NoticeLevel[] =>
  ((list as NoticeLevel[]) || []).filter((l): l is NoticeLevel =>
    LEVELS.includes(l as NoticeLevel),
  )

const read = (): NoticePrefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<NoticePrefs> & {
      held?: NoticeLevel[]
    }
    const held = known(parsed.held)
    return {
      open: parsed.open !== false,
      hidden: parsed.hidden
        ? known(parsed.hidden)
        : // The old whitelist. Empty meant everything, so it hides nothing.
          held.length
          ? LEVELS.filter((l) => !held.includes(l))
          : [],
    }
  } catch {
    return DEFAULTS
  }
}

export function useNoticePrefs() {
  const [prefs, setPrefs] = useState<NoticePrefs>(read)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // A preference that cannot be saved is still a preference for this tab.
    }
  }, [prefs])

  const setOpen = useCallback(
    (open: boolean) => setPrefs((p) => ({ ...p, open })),
    [],
  )

  const toggleLevel = useCallback(
    (level: NoticeLevel) =>
      setPrefs((p) => ({
        ...p,
        hidden: p.hidden.includes(level)
          ? p.hidden.filter((l) => l !== level)
          : [...p.hidden, level],
      })),
    [],
  )

  /** The bulk half of the filter: everything, or nothing at all. */
  const setAllHidden = useCallback(
    (all: boolean) => setPrefs((p) => ({ ...p, hidden: all ? [...LEVELS] : [] })),
    [],
  )

  return { prefs, setOpen, toggleLevel, setAllHidden }
}
