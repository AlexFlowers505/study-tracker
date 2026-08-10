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

export interface DayRow {
  project_id: string
  date: string
  cells: Day["cells"]
  sleep: Day["sleep"]
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
  categories: unknown
}

export interface NoteRow {
  project_id: string
  kind: "week" | "month"
  key: string
  note: string | null
  ignored: boolean | null
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
