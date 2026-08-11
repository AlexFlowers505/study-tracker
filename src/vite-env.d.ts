/// <reference types="vite/client" />

/**
 * Which Supabase project this build talks to. Optional on purpose: an unset
 * var is a real state the app handles (the "not configured" dead end), not a
 * mistake to be typed away — see `src/data/supabase.ts`.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

/**
 * The local (signed-out) fallback calls `window.storage`. **It does not exist
 * in a browser** — it is left over from the app's origin as a Claude artifact,
 * which is why offline mode is non-functional. Declared here only so the code
 * type-checks; add a `localStorage` shim if offline is ever wanted.
 */
interface Window {
  storage: {
    get(
      key: string,
      encrypted: boolean,
    ): Promise<{ value?: string | null } | null>
    set(key: string, value: string, encrypted: boolean): Promise<void>
  }
}
