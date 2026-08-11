/* ---------------------------------------------------------------
   Is this account an admin?

   Drives one thing: whether Setup shows the Export / Import controls. It is
   not a permission check — see `migrations/006_admins.sql` for why it cannot
   be one. RLS is what keeps a logbook private; this only keeps a bulk-write
   button out of the way of accounts with no use for it.

   Unlike everything else in this directory a failure here is **not** raised.
   The answer is a yes/no about which buttons to draw, and the safe reading of
   "couldn't tell" is no: a missing table or a dropped request should hide a
   power tool, never hand it out. It also means forgetting migration 006 costs
   you the buttons rather than the whole app — hence the console line, which is
   the only way to tell that case apart from simply not being an admin.
--------------------------------------------------------------- */

import type { Client } from "./supabase"

export async function fetchIsAdmin(
  client: Client,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await client
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
    if (error) {
      console.warn(
        "Admin check failed — treating as not an admin. Has migration 006 been applied to this database?",
        error,
      )
      return false
    }
    return !!data
  } catch (e) {
    console.warn("Admin check failed — treating as not an admin.", e)
    return false
  }
}
