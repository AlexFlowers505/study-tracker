/* ---------------------------------------------------------------
   Writes, one row at a time.

   An op names *which row* changed, never its contents. `applyWriteOp` reads
   the contents from the latest state at flush time, so repeated edits to one
   day collapse into a single write and a queued op can never ship a stale
   value.

   Add a field that needs saving and you must also emit the right op — state
   alone will not persist it.

   A failed write must be visible: everything here except the change log
   throws on `{ error }`, and the caller raises the save banner and retries.
--------------------------------------------------------------- */

import type { AppData, ChangeLogEntry, DayKey } from "../types/model"
import type { Client } from "./supabase"
import type { DayUpsert } from "./schema"

export type WriteOp =
  | { key: string; kind: "project"; projectId: string }
  | { key: string; kind: "day"; projectId: string; dateKey: DayKey }
  | {
      key: string
      kind: "note"
      projectId: string
      noteKind: "week" | "month"
      noteKey: string
    }
  | { key: string; kind: "verdict"; projectId: string; weekKey: DayKey }
  | { key: string; kind: "prefs" }
  | { key: string; kind: "deleteProject"; projectId: string }
  | {
      key: string
      kind: "log"
      projectId: string
      entry: ChangeLogEntry
      dropIds?: string[]
    }

export const opProject = (projectId: string): WriteOp => ({
  key: `project:${projectId}`,
  kind: "project",
  projectId,
})

export const opDay = (projectId: string, dateKey: DayKey): WriteOp => ({
  key: `day:${projectId}:${dateKey}`,
  kind: "day",
  projectId,
  dateKey,
})

export const opNote = (
  projectId: string,
  noteKind: "week" | "month",
  noteKey: string,
): WriteOp => ({
  key: `note:${projectId}:${noteKind}:${noteKey}`,
  kind: "note",
  projectId,
  noteKind,
  noteKey,
})

/**
 * A sealed week verdict. Written once — the table's primary key is what makes
 * a second grant for the same week impossible, so the upsert never overwrites
 * an existing verdict with a freshly recomputed one.
 */
export const opVerdict = (projectId: string, weekKey: DayKey): WriteOp => ({
  key: `verdict:${projectId}:${weekKey}`,
  kind: "verdict",
  projectId,
  weekKey,
})

export const opPrefs = (): WriteOp => ({ key: "prefs", kind: "prefs" })

export const opDeleteProject = (projectId: string): WriteOp => ({
  key: `deleteProject:${projectId}`,
  kind: "deleteProject",
  projectId,
})

/**
 * Unlike the others this op carries its payload: a log line is immutable once
 * written, so there is nothing to re-read from state at flush time.
 */
export const opLog = (
  projectId: string,
  entry: ChangeLogEntry,
  dropIds?: string[],
): WriteOp => ({
  key: `log:${entry.id}`,
  kind: "log",
  projectId,
  entry,
  dropIds,
})

export async function applyWriteOp(
  client: Client,
  userId: string,
  op: WriteOp,
  data: AppData,
): Promise<void> {
  // supabase-js returns failures in the payload rather than throwing, so every
  // call here has its { error } checked.
  const run = async (query: PromiseLike<{ error: unknown }>) => {
    const { error } = await query
    if (error) throw error
  }
  const stamp = new Date().toISOString()
  const project =
    "projectId" in op
      ? data.projects.find((p) => p.id === op.projectId)
      : undefined

  switch (op.kind) {
    case "project":
      if (!project) return
      return run(
        client.from("projects").upsert({
          id: project.id,
          user_id: userId,
          settings: project.settings,
          slots: project.slots,
          categories: project.categories,
          updated_at: stamp,
        }),
      )

    case "day": {
      if (!project) return
      const day = project.days[op.dateKey]
      if (!day) return
      // Typed as DayUpsert so a new field on `Day` cannot be left out here.
      const row: DayUpsert = {
        project_id: project.id,
        date: op.dateKey,
        cells: day.cells || {},
        sleep: day.sleep || [],
        lessons: Number(day.lessons) || 0,
        exam: !!day.exam,
        ignored: !!day.ignore,
        frozen: !!day.frozen,
        comment: day.comment || "",
        updated_at: stamp,
      }
      return run(client.from("days").upsert(row))
    }

    case "log": {
      if (!project) return
      // Swallowed on purpose. The log is a convenience; a failure here must not
      // raise the save banner or get re-queued forever, or a missing table
      // would make the app look permanently broken over data nobody typed.
      try {
        await client.from("change_log").insert({
          id: op.entry.id,
          project_id: project.id,
          at: op.entry.at,
          title: op.entry.title,
          details: op.entry.details,
        })
        if (op.dropIds?.length) {
          await client.from("change_log").delete().in("id", op.dropIds)
        }
      } catch {
        // ignored
      }
      return
    }

    case "note": {
      if (!project) return
      const week = op.noteKind === "week"
      const notes = (week ? project.weekNotes : project.monthNotes) || {}
      const flags = (week ? project.weekIgnore : project.monthIgnore) || {}
      return run(
        client.from("period_notes").upsert({
          project_id: project.id,
          kind: op.noteKind,
          key: op.noteKey,
          note: notes[op.noteKey] || "",
          ignored: !!flags[op.noteKey],
          updated_at: stamp,
        }),
      )
    }

    case "verdict": {
      if (!project) return
      const verdict = project.weekVerdicts?.[op.weekKey]
      if (!verdict) return
      // ignoreDuplicates: a verdict already in the table is the authority.
      // Re-deciding it from today's data is the one thing this must never do.
      return run(
        client.from("week_verdicts").upsert(
          {
            project_id: project.id,
            week_key: verdict.weekKey,
            earned: verdict.earned,
            sealed_at: verdict.sealedAt,
          },
          { onConflict: "project_id,week_key", ignoreDuplicates: true },
        ),
      )
    }

    case "prefs":
      return run(
        client.from("user_prefs").upsert({
          user_id: userId,
          active_project_id: data.activeProjectId,
          updated_at: stamp,
        }),
      )

    // Days and notes go with it: both cascade on the project's foreign key.
    case "deleteProject":
      return run(client.from("projects").delete().eq("id", op.projectId))
  }
}
