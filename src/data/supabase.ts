/* ---------------------------------------------------------------
   The Supabase connection.

   The URL and anon key are inline constants by design: the anon key is
   publishable, and the actual protection is row-level security on every
   table. A service-role key in this file would be a real leak — don't add
   one, or any other credential.
--------------------------------------------------------------- */

import type { SupabaseClient } from "@supabase/supabase-js"

export type Client = SupabaseClient

const SUPABASE_URL = "https://ngrqfvdyyplcsolykaaq.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnFmdmR5eXBsY3NvbHlrYWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMjI0NDgsImV4cCI6MjEwMDU5ODQ0OH0.xxnqMZ91vErHp6s6OE9dY1PH1nIfHVBLhrOUexrFTsY"

/**
 * Trim whitespace and any trailing slash, so a small copy-paste difference —
 * a trailing "/", a stray newline — cannot silently disable cloud sync.
 */
export const NORMALIZED_SUPABASE_URL = SUPABASE_URL.trim().replace(/\/+$/, "")

export const SUPABASE_KEY = SUPABASE_ANON_KEY.trim()

export const CLOUD_ENABLED =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(NORMALIZED_SUPABASE_URL) &&
  SUPABASE_KEY.length > 20

/** PostgREST caps a response at 1000 rows, so anything unbounded has to page. */
export const PAGE_SIZE = 1000
