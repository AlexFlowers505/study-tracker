/* ---------------------------------------------------------------
   Loading an exported document back into the tables.

   The counterpart to Setup's Export JSON, and the reason the dev database can
   be refreshed from production without a database password or any tooling:
   export there, import here.

   It does NOT go through `persist()`. The save queue writes one row per
   request, which is right for editing and wrong for a few hundred days at
   once — this sends them in chunks instead. That is the only difference;
   the rows themselves are built by the same `dayUpsertRow` the queue uses, so
   an imported day and an edited day are byte-identical.

   **Merge, not replace.** Every write is an upsert keyed the same way the app
   keys its rows, so importing over an existing database overwrites what the
   file covers and leaves everything else alone. A day you deleted in the
   source stays behind in the target — worth knowing when the target is a dev
   copy meant to mirror production.

   **Every ledger comes across** — both verdict ledgers, the day marks, the
   achievements reached and the purchases. Until `spec 028` only the first two
   were written here, and `normalizeProject` dropped even those on the way in,
   so a dev copy "refreshed from production" had production's days and none of
   what production had sealed — a reward bought there was never bought here.

   `change_log` is deliberately not copied. It records what an edit changed, it
   is capped and disposable, and carrying it across would attach production's
   edit history to a database where those edits never happened.
--------------------------------------------------------------- */

import type { AppData } from "../types/model"
import type { Client } from "./supabase"
import { dayUpsertRow } from "./schema"

/**
 * Rows per request. PostgREST takes an array of any size, but one request
 * carrying every day of a multi-year logbook is the one most likely to hit a
 * statement timeout — and the least informative when it does.
 */
const CHUNK = 400

export interface ImportSummary {
  projects: number
  days: number
  notes: number
  verdicts: number
  marks: number
  earned: number
  purchases: number
}

/** Counts what an import would write, for the confirmation step. */
export function summarize(data: AppData): ImportSummary {
  let days = 0
  let notes = 0
  let verdicts = 0
  let marks = 0
  let earned = 0
  let purchases = 0
  data.projects.forEach((p) => {
    days += Object.keys(p.days || {}).length
    notes += noteKeys(p.weekNotes, p.weekIgnore).length
    notes += noteKeys(p.monthNotes, p.monthIgnore).length
    verdicts += Object.keys(p.weekVerdicts || {}).length
    verdicts += Object.keys(p.ruleVerdicts || {}).length
    marks += Object.keys(p.dayLedger || {}).length
    earned += Object.keys(p.earned || {}).length
    purchases += Object.keys(p.purchases || {}).length
  })
  return {
    projects: data.projects.length,
    days,
    notes,
    verdicts,
    marks,
    earned,
    purchases,
  }
}

/** A note and its ignore flag share a row, so the keys of both maps count. */
function noteKeys(
  notes: Record<string, string> | undefined,
  flags: Record<string, boolean> | undefined,
): string[] {
  return [...new Set([...Object.keys(notes || {}), ...Object.keys(flags || {})])]
}

async function writeChunks(
  client: Client,
  table: string,
  rows: unknown[],
  onConflict: string,
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    // supabase-js reports failures in the payload rather than throwing, so this
    // check is what makes a half-finished import loud instead of invisible.
    const { error } = await client
      .from(table)
      .upsert(rows.slice(i, i + CHUNK), { onConflict })
    if (error) throw error
  }
}

/**
 * Writes an exported document into the signed-in account's tables.
 *
 * Projects go first: days, notes and verdicts have no `user_id` of their own
 * and inherit ownership through `project_id`, so RLS rejects every one of them
 * until the project row they point at exists.
 */
export async function importIntoTables(
  client: Client,
  userId: string,
  data: AppData,
): Promise<ImportSummary> {
  const stamp = new Date().toISOString()

  await writeChunks(
    client,
    "projects",
    data.projects.map((p) => ({
      id: p.id,
      // The only rewritten field. Accounts do not cross Supabase projects, so
      // the same logbook belongs to a different uuid in each database.
      user_id: userId,
      settings: p.settings,
      slots: p.slots,
      activities: p.activities,
      // Already rebuilt from the old fields by `normalizeProject` if the file
      // predates counter units, so by the time it reaches here it is real.
      counter_units: p.counterUnits || [],
      updated_at: stamp,
    })),
    "id",
  )

  for (const p of data.projects) {
    await writeChunks(
      client,
      "days",
      Object.entries(p.days || {}).map(([dateKey, day]) =>
        dayUpsertRow(p.id, dateKey, day, stamp),
      ),
      "project_id,date",
    )

    const notes = (["week", "month"] as const).flatMap((kind) => {
      const text = kind === "week" ? p.weekNotes : p.monthNotes
      const flags = kind === "week" ? p.weekIgnore : p.monthIgnore
      return noteKeys(text, flags).map((key) => ({
        project_id: p.id,
        kind,
        key,
        note: text?.[key] || "",
        ignored: !!flags?.[key],
        updated_at: stamp,
      }))
    })
    await writeChunks(client, "period_notes", notes, "project_id,kind,key")

    await writeChunks(
      client,
      "week_verdicts",
      Object.values(p.weekVerdicts || {}).map((v) => ({
        project_id: p.id,
        week_key: v.weekKey,
        earned: v.earned,
        sealed_at: v.sealedAt,
      })),
      "project_id,week_key",
    )

    // The custom-streak ledger travels with them. Leaving it behind would
    // hand the imported copy a clean slate, and a clean slate is exactly what
    // an append-only ledger exists to make impossible.
    await writeChunks(
      client,
      "streak_verdicts",
      Object.values(p.ruleVerdicts || {}).map((v) => ({
        project_id: p.id,
        rule_id: v.ruleId,
        week_key: v.weekKey,
        kept: v.kept,
        sealed_at: v.sealedAt,
      })),
      "project_id,rule_id,week_key",
    )

    /* **And the other three** — `spec 028`. The day marks are what the balance
       is folded from, the achievements what the rosettes read, the purchases
       what the shelf and the account read; a copy without them is a copy of a
       different account. An upsert, not ignore-on-conflict: the file is the
       authority here, as it is for every other row this writes. */
    await writeChunks(
      client,
      "day_ledger",
      Object.values(p.dayLedger || {}).map((m) => ({
        project_id: p.id,
        date: m.date,
        kept: m.kept,
        sealed_at: m.sealedAt,
      })),
      "project_id,date",
    )
    await writeChunks(
      client,
      "achievements",
      Object.values(p.earned || {}).map((e) => ({
        project_id: p.id,
        achievement_id: e.achievementId,
        earned_at: e.earnedAt,
        value: e.value,
        reward: e.reward ?? 0,
      })),
      "project_id,achievement_id",
    )
    await writeChunks(
      client,
      "purchases",
      Object.values(p.purchases || {}).map((b) => ({
        project_id: p.id,
        purchase_id: b.id,
        item_id: b.itemId,
        label: b.label,
        price: b.price,
        bought_at: b.boughtAt,
      })),
      "project_id,purchase_id",
    )
  }

  const { error } = await client.from("user_prefs").upsert({
    user_id: userId,
    active_project_id: data.activeProjectId,
    updated_at: stamp,
  })
  if (error) throw error

  return summarize(data)
}
