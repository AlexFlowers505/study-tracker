/* ---------------------------------------------------------------
   Signing in.

   The Supabase package is imported lazily: with the constants unset the app
   never loads it at all and quietly stays on local storage, so a fresh clone
   still runs.
--------------------------------------------------------------- */

import { useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import type { Client } from "./supabase"
import { CLOUD_ENABLED, NORMALIZED_SUPABASE_URL, SUPABASE_KEY } from "./supabase"

export interface CloudAuth {
  client: Client | null
  session: Session | null
  ready: boolean
  loadError: unknown
  cloudEnabled: boolean
}

export function useCloudAuth(): CloudAuth {
  const [client, setClient] = useState<Client | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!CLOUD_ENABLED)
  const [loadError, setLoadError] = useState<unknown>(null)

  useEffect(() => {
    if (!CLOUD_ENABLED) return
    let unsub = () => {}
    ;(async () => {
      try {
        const mod = await import("@supabase/supabase-js")
        const sb = mod.createClient(NORMALIZED_SUPABASE_URL, SUPABASE_KEY)
        setClient(sb)
        const { data } = await sb.auth.getSession()
        setSession(data?.session || null)
        const { data: sub } = sb.auth.onAuthStateChange((_evt, sess) =>
          setSession(sess),
        )
        unsub = () => sub.subscription.unsubscribe()
      } catch (e) {
        console.error("Cloud sync unavailable, falling back to local storage.", e)
        setLoadError(e)
      } finally {
        setReady(true)
      }
    })()
    return () => unsub()
  }, [])

  return { client, session, ready, loadError, cloudEnabled: CLOUD_ENABLED }
}
