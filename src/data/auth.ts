/* ---------------------------------------------------------------
   Signing in.

   The Supabase package is imported lazily: with the env vars unset the app
   never loads it at all, so a fresh clone still boots (onto the "no database
   configured" screen).

   Password recovery is the one flow that needs its own flag. Clicking the
   emailed link lands back here with a real session in the URL fragment, so
   without it the app would simply open the logbook and the person who came to
   set a password would never be asked for one.
--------------------------------------------------------------- */

import { useCallback, useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import type { Client } from "./supabase"
import { CLOUD_ENABLED, NORMALIZED_SUPABASE_URL, SUPABASE_KEY } from "./supabase"

export interface CloudAuth {
  client: Client | null
  session: Session | null
  ready: boolean
  loadError: unknown
  cloudEnabled: boolean
  /** Arrived through a password-reset link and hasn't set one yet. */
  recovery: boolean
  /** Call once the new password is saved, or if the user backs out. */
  endRecovery: () => void
}

/**
 * Read before `createClient` runs, because creating the client consumes the
 * fragment and strips it from the URL. The `PASSWORD_RECOVERY` event covers
 * the same case, but only for listeners attached before it fires — and the
 * client processes the URL as part of its own construction, which is a race
 * this side of the check does not have.
 */
const recoveryInUrl = () =>
  typeof window !== "undefined" &&
  /(^|[#&?])type=recovery([&]|$)/.test(window.location.hash)

export function useCloudAuth(): CloudAuth {
  const [client, setClient] = useState<Client | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!CLOUD_ENABLED)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [recovery, setRecovery] = useState(false)

  const endRecovery = useCallback(() => setRecovery(false), [])

  useEffect(() => {
    if (!CLOUD_ENABLED) return
    let unsub = () => {}
    // Safety net. `INITIAL_SESSION` is what actually ends the wait below, so
    // if a future GoTrue ever stopped emitting it the app would sit on a blank
    // screen forever — a worse failure than the flash this replaced. Four
    // seconds is long enough that a slow refresh wins the race honestly.
    const settle = setTimeout(() => setReady(true), 4000)
    ;(async () => {
      const fromUrl = recoveryInUrl()
      try {
        const mod = await import("@supabase/supabase-js")
        const sb = mod.createClient(NORMALIZED_SUPABASE_URL, SUPABASE_KEY)
        setClient(sb)
        if (fromUrl) setRecovery(true)
        // Subscribe *before* asking, so the first thing GoTrue says is heard.
        // The other order has a gap: a stored token that needs refreshing
        // makes `getSession()` resolve null, `ready` flips with no session,
        // and the app decides you are signed out — it draws the sign-in form
        // for the moment it takes the refresh to land, which is exactly the
        // "couldn't log you in" flash on first load.
        const { data: sub } = sb.auth.onAuthStateChange((evt, sess) => {
          if (evt === "PASSWORD_RECOVERY") setRecovery(true)
          setSession(sess)
          // `INITIAL_SESSION` is GoTrue saying it has finished looking, with
          // or without a session, and it is the only honest moment to call
          // the question. Everything after it is a real change.
          if (evt === "INITIAL_SESSION") {
            clearTimeout(settle)
            setReady(true)
          }
        })
        unsub = () => sub.subscription.unsubscribe()
        const { data } = await sb.auth.getSession()
        setSession(data?.session || null)
      } catch (e) {
        console.error("Cloud sync unavailable.", e)
        setLoadError(e)
        clearTimeout(settle)
        setReady(true)
      }
      // No `finally` flipping `ready` here: on the happy path the
      // `INITIAL_SESSION` listener above owns that, and flipping it as soon as
      // the import resolved is what re-opened the same gap from the other end.
      // The failure path still has to end somewhere, so it flips in `catch`.
    })()
    return () => {
      clearTimeout(settle)
      unsub()
    }
  }, [])

  return {
    client,
    session,
    ready,
    loadError,
    cloudEnabled: CLOUD_ENABLED,
    recovery,
    endRecovery,
  }
}
