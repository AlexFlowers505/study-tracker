/* ---------------------------------------------------------------
   Where the in-memory shape meets the four tables.

   On the server the data is `projects` / `days` / `period_notes` /
   `user_prefs`, not one document. Only this directory knows that.
--------------------------------------------------------------- */

import type { Day } from "../types/model"

/**
 * Every field of a `Day`, mapped to the column that stores it.
 *
 * Adding a field to `Day` makes this object literal fail to compile until the
 * new field is named here — which is exactly the point. Persisting a day used
 * to take three separate edits (the column, the `select` list, the `upsert`),
 * and missing one of them either saved nothing or read back empty, silently.
 * This turns the first two into one, and makes forgetting the third a type
 * error pointing straight at `applyWriteOp`.
 */
export const DAY_COLUMNS = {
  cells: "cells",
  sleep: "sleep",
  counters: "counters",
  checks: "checks",
  ruleFreezes: "rule_freezes",
  // Superseded by `counters`, still read and written so the pre-migration
  // columns stay usable until the new shape has been trusted for a while.
  lessons: "lessons",
  exam: "exam",
  // The flag is `ignore` in memory and `ignored` in the table.
  ignore: "ignored",
  frozen: "frozen",
  comment: "comment",
} as const satisfies Record<keyof Day, string>

/** The `select` list for a day row, derived so it can't drift from the model. */
export const DAY_SELECT = [
  "project_id",
  "date",
  ...Object.values(DAY_COLUMNS),
].join(",")

type DayColumn = (typeof DAY_COLUMNS)[keyof typeof DAY_COLUMNS]

/**
 * The row `applyWriteOp` sends. Every column named above must be present, so
 * a field added to `Day` fails to compile in three places at once — here, at
 * `DAY_COLUMNS`, and at the upsert — instead of being silently dropped on the
 * way out.
 */
export type DayUpsert = { [C in DayColumn]: unknown } & {
  project_id: string
  date: string
  updated_at: string
}

/**
 * The one place a `Day` turns into a row. Both writers go through it — the
 * per-row save queue in `ops.ts` and the bulk import — so a field added to
 * `Day` can never be persisted by one path and silently dropped by the other.
 */
export function dayUpsertRow(
  projectId: string,
  dateKey: string,
  day: Day,
  stamp: string,
): DayUpsert {
  return {
    project_id: projectId,
    date: dateKey,
    cells: day.cells || {},
    sleep: day.sleep || [],
    counters: day.counters || {},
    checks: day.checks || {},
    rule_freezes: day.ruleFreezes || [],
    lessons: Number(day.lessons) || 0,
    exam: !!day.exam,
    ignored: !!day.ignore,
    frozen: !!day.frozen,
    comment: day.comment || "",
    updated_at: stamp,
  }
}

export interface DayRow {
  project_id: string
  date: string
  cells: Day["cells"]
  sleep: Day["sleep"]
  counters: Day["counters"]
  checks: Day["checks"]
  rule_freezes: Day["ruleFreezes"]
  lessons: number
  exam: boolean
  ignored: boolean
  frozen: boolean
  comment: string
  updated_at?: string
}

export interface ProjectRow {
  id: string
  settings: unknown
  slots: unknown
  activities: unknown
  counter_units: unknown
}

export interface NoteRow {
  project_id: string
  kind: "week" | "month"
  key: string
  note: string | null
  ignored: boolean | null
}

export interface EarnedRow {
  project_id: string
  achievement_id: string
  earned_at: string
  value: number
}

export interface DayMarkRow {
  project_id: string
  date: string
  kept: boolean
  sealed_at: string
}

export interface RuleVerdictRow {
  project_id: string
  rule_id: string
  week_key: string
  kept: boolean
  sealed_at: string
}

export interface WeekVerdictRow {
  project_id: string
  week_key: string
  earned: boolean
  sealed_at: string
}

export interface ChangeLogRow {
  id: string
  project_id: string
  at: string
  title: string | null
  details: string[] | null
}
