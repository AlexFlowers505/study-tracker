/* ---------------------------------------------------------------
   Sleep stops being an axis and becomes an activity — `spec 024`.

   It behaved like one already: a list of timed entries with a start, an end
   and a duration. What it had instead of a slot and an activity was a column
   of its own, a switch in Setup, a panel, a chart, a tab in the add dialog and
   a `StreakTargetKind` — six pieces of machinery to say *this is time, but
   filed elsewhere*.

   The one thing that machinery bought was keeping eight hours a night out of
   every total, and that argument is gone: since `spec 022` the figure a period
   reports is measured through the **benchmark rule**, so what counts is what
   you promised rather than everything you happened to write down. Sleep is not
   in the promise, so it does not appear in the figure — and if you do want to
   promise something about it, you now can, in the same sentence as everything
   else.

   **This file is the bridge and nothing else.** It exists so the deploy and
   `migrations/021` can happen in either order, exactly as `entryActivity()`
   did for the categories-to-activities rename: the app folds any night still
   sitting in the old column into the day's cells as it loads, so nothing is
   invisible while the SQL is waiting to be run. Once `021` has run everywhere
   the column is empty, the fold is a no-op on every load, and this file can go.

   It never writes. The fold is in memory, and the column is cleared only by
   the migration or by `dayUpsertRow`, which writes an empty list for a day you
   edit — so a day you touch migrates itself and one you do not waits for the
   SQL. Both paths converge on the same shape and neither can duplicate an
   entry, because the fold has nothing to read once the column is empty.
--------------------------------------------------------------- */

import type { Activity, Day, DayKey, Project, Slot } from "../types/model"

/**
 * The slot and activity every migrated night lands in.
 *
 * Fixed ids rather than generated ones, because two things have to agree
 * about them without talking: this fold and `migrations/021`. They are
 * ordinary rows once created — rename them, recolour them, move entries out
 * of them, delete them when they are empty.
 */
export const SLEEP_SLOT_ID = "slot-sleep"
export const SLEEP_ACTIVITY_ID = "activity-sleep"

/** What the migration creates, and what the fold invents until it has. */
export const sleepSlot = (label = "Sleep"): Slot => ({
  id: SLEEP_SLOT_ID,
  label,
  color: "#8B6FB3",
  iconName: "Moon",
})

export const sleepActivity = (label = "Sleep"): Activity => ({
  id: SLEEP_ACTIVITY_ID,
  label,
  color: "#8B6FB3",
  iconName: "Moon",
})

/** Is there anything left in the old column anywhere in this project? */
export const hasLegacySleep = (days: Record<DayKey, Day>): boolean =>
  Object.values(days).some((day) => (day.sleep || []).length > 0)

/**
 * One day's nights, moved into its cells.
 *
 * The entries keep their ids, their times and their minutes; they gain the
 * slot and the activity they never had. Appended rather than prepended so a
 * day that already holds work in the sleep slot — because it was migrated and
 * then written to — cannot have its order shuffled by a stale read.
 */
export const foldDay = (day: Day): Day => {
  const nights = day.sleep || []
  if (!nights.length) return day
  const cells = { ...(day.cells || {}) }
  const existing = cells[SLEEP_SLOT_ID] || []
  const known = new Set(existing.map((entry) => entry.id))
  const moved = nights
    .filter((entry) => !known.has(entry.id))
    .map((entry) => ({ ...entry, activity: SLEEP_ACTIVITY_ID }))
  if (!moved.length) return { ...day, sleep: undefined }
  cells[SLEEP_SLOT_ID] = [...existing, ...moved]
  // The column is dropped from the in-memory day as well, so nothing below
  // this line ever sees a night twice — and `dayUpsertRow` writes the empty
  // list back the moment the day is edited.
  return { ...day, cells, sleep: undefined }
}

/**
 * The project as the app should read it, with any unmigrated night folded in
 * and the slot and activity they need invented if the migration has not made
 * them yet.
 *
 * Invented rather than left missing: without them the entries would draw with
 * a fallback label and no colour for as long as the SQL was outstanding, which
 * looks like data loss rather than like a pending migration.
 */
export function foldSleep(project: Project): Project {
  if (!hasLegacySleep(project.days)) return project
  const days: Record<DayKey, Day> = {}
  for (const [key, day] of Object.entries(project.days)) days[key] = foldDay(day)
  return {
    ...project,
    days,
    slots: project.slots.some((slot) => slot.id === SLEEP_SLOT_ID)
      ? project.slots
      : [...project.slots, sleepSlot()],
    activities: project.activities.some((a) => a.id === SLEEP_ACTIVITY_ID)
      ? project.activities
      : [...project.activities, sleepActivity()],
  }
}
