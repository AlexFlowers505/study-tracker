/* ---------------------------------------------------------------
   Whether the board is open, and which levels it is holding — `spec 016`.

   **The one panel whose state persists.** Every other one is a look rather
   than a preference and closes again on reload; this one is where danger is
   read, and a board you have to reopen every morning is a board that stops
   being the only place anything is said.

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
  /** Empty means every level. */
  held: NoticeLevel[]
}

/** Open on a first visit, as asked: the board is where today is read. */
const DEFAULTS: NoticePrefs = { open: true, held: [] }

const read = (): NoticePrefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<NoticePrefs>
    return {
      open: parsed.open !== false,
      // Filtered against the real list: a level dropped from a later version
      // must not survive in storage and quietly hide half the board.
      held: (parsed.held || []).filter((l): l is NoticeLevel =>
        LEVELS.includes(l as NoticeLevel),
      ),
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
        held: p.held.includes(level)
          ? p.held.filter((l) => l !== level)
          : [...p.held, level],
      })),
    [],
  )

  return { prefs, setOpen, toggleLevel }
}
