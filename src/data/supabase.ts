/* ---------------------------------------------------------------
   The Supabase connection — one project per environment.

   The URL and anon key come from Vite env vars rather than constants in this
   file, so the dev server and a production build can point at different
   Supabase projects. Which file supplies them is Vite's own mode resolution:

     npm run dev              → .env.development.local  (gitignored, dev project)
     npm run build / preview  → .env.production         (committed, real data)

   There is deliberately **no fallback**. An unset var leaves `CLOUD_ENABLED`
   false and the app on a dead-end screen; defaulting to the production values
   instead would mean one missing file silently edits the real logbook, which
   is the exact accident this split exists to prevent.

   The anon key is publishable — the actual protection is row-level security on
   every table — which is why `.env.production` is committed. A service-role
   key in any of these files would be a real leak. Don't add one, or any other
   credential.
--------------------------------------------------------------- */

import type { SupabaseClient } from "@supabase/supabase-js"

export type Client = SupabaseClient

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ""
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""

/**
 * Trim whitespace and any trailing slash, so a small copy-paste difference —
 * a trailing "/", a stray newline — cannot silently disable cloud sync.
 */
export const NORMALIZED_SUPABASE_URL = SUPABASE_URL.trim().replace(/\/+$/, "")

export const SUPABASE_KEY = SUPABASE_ANON_KEY.trim()

const PROJECT_URL = /^https:\/\/([a-z0-9-]+)\.supabase\.co$/i

export const CLOUD_ENABLED =
  PROJECT_URL.test(NORMALIZED_SUPABASE_URL) && SUPABASE_KEY.length > 20

/**
 * The project ref — the subdomain, the one part of the URL that differs
 * between dev and prod. Shown on localhost so the two can never be confused;
 * empty string when the URL is unset or malformed.
 */
export const PROJECT_REF =
  NORMALIZED_SUPABASE_URL.match(PROJECT_URL)?.[1] ?? ""

/** PostgREST caps a response at 1000 rows, so anything unbounded has to page. */
export const PAGE_SIZE = 1000
