/// <reference types="vite/client" />

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
