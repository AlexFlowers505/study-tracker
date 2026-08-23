/* ---------------------------------------------------------------
   Handing somebody the key — `spec 010`, part 7.

   The owner does not know the supervisor's user id, and Supabase does not
   expose `auth.users` to the client. A random token is what stands in for the
   introduction: the owner makes one, sends the link however they like, and the
   other person opens it.

   **Both of these bypass the save queue, deliberately.** That queue exists to
   collapse repeated edits to one row into a single write; these are one-shot
   acts whose result has to be known immediately — a token you can only show
   once it exists, and a claim you must not report as done until it is.

   Claiming goes through `claim_supervisor_invite`, a `SECURITY DEFINER`
   function, and that is the one narrow place such a thing is warranted here:
   the invites table is readable only by its creator, so nobody can enumerate
   tokens, and the function takes a token and acts as `auth.uid()` — it can
   grant nothing you do not already hold the token for.
--------------------------------------------------------------- */

import type { Project } from "../types/model"
import type { Client } from "./supabase"
import { makeId } from "../lib/id"

/** A fresh token for this project. Returns it; the caller shows the link. */
export async function createInvite(
  client: Client,
  project: Project,
  ownerId: string,
): Promise<string> {
  const token = `${makeId("inv")}-${makeId("k")}`
  const { error } = await client.from("supervisor_invites").insert({
    token,
    project_id: project.id,
    project_name: project.settings.projectName || "a project",
    created_by: ownerId,
  })
  if (error) throw error
  return token
}

/** Accepts one. Returns the project's name, for the message afterwards. */
export async function claimInvite(
  client: Client,
  token: string,
): Promise<string> {
  const { data, error } = await client.rpc("claim_supervisor_invite", {
    invite_token: token,
  })
  if (error) throw error
  return typeof data === "string" ? data : "a project"
}

/** The link to send. The token is the whole secret, so it rides in the query. */
export const inviteLink = (token: string): string =>
  `${window.location.origin}${window.location.pathname}?supervise=${token}`
