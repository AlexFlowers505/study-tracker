/* ---------------------------------------------------------------
   Editing one entry inside a day.

   Extracted from the day editor because the day cards now edit entries in
   place, and two copies of "what changing an entry means" would drift the
   first time one of them learned a new rule. `minutes` is the number every
   figure in the app is computed from, so the rule that keeps it in step with
   the times has to live in exactly one place.
--------------------------------------------------------------- */

import type { SleepEntry, StudyEntry } from "../types/model"
import { spanMinutes } from "./time"

export type Cells = Record<string, StudyEntry[]>

/**
 * What an entry's time went on, whichever name it was stored under.
 *
 * The one place that knows `activity` used to be called `category`, so the
 * app works the same whether or not `migrations/013` has run yet. Reading the
 * field directly is the bug this exists to prevent.
 */
export const entryActivity = (entry: StudyEntry): string | undefined =>
  entry.activity ?? entry.category

/**
 * With both times set, the span is the truth and the stored number follows it.
 * With one or neither, whatever was typed stands — an untimed entry is a
 * perfectly good entry, and guessing a span for it would invent data.
 */
const withDerivedMinutes = <T extends StudyEntry | SleepEntry>(entry: T): T =>
  entry.start && entry.end
    ? { ...entry, minutes: spanMinutes(entry.start, entry.end) }
    : entry

/**
 * Applies a patch and re-derives the minutes.
 *
 * An explicit `undefined` for `start` or `end` *removes* the field rather than
 * setting it to undefined: "no start time" and "a start time of undefined"
 * serialise differently into jsonb, and only the first one round-trips.
 */
export function patchEntry<T extends StudyEntry | SleepEntry>(
  entry: T,
  patch: Partial<T>,
): T {
  const next = { ...entry, ...patch }
  if (patch.start === undefined && "start" in patch) delete next.start
  if (patch.end === undefined && "end" in patch) delete next.end
  // Setting the activity retires the old spelling with it. Left behind, a
  // stale `category` would come back the moment the activity was cleared —
  // `entryActivity` falls through to it, and it would be a value nobody chose.
  if ("activity" in patch && "category" in next)
    delete (next as StudyEntry).category
  return withDerivedMinutes(next)
}

export function updateEntryInCells(
  cells: Cells,
  slotId: string,
  entryId: string,
  patch: Partial<StudyEntry>,
): Cells {
  return {
    ...cells,
    [slotId]: (cells[slotId] || []).map((e) =>
      e.id === entryId ? patchEntry(e, patch) : e,
    ),
  }
}

export function removeEntryFromCells(
  cells: Cells,
  slotId: string,
  entryId: string,
): Cells {
  return {
    ...cells,
    [slotId]: (cells[slotId] || []).filter((e) => e.id !== entryId),
  }
}

/**
 * Moves an entry to another slot, keeping its identity. It lands at the end of
 * the target slot rather than at a matching position: order within a slot is
 * the list's own and has no relation to order in the slot it came from.
 */
export function moveEntryToSlot(
  cells: Cells,
  fromSlot: string,
  entryId: string,
  toSlot: string,
): Cells {
  if (fromSlot === toSlot) return cells
  const entry = (cells[fromSlot] || []).find((e) => e.id === entryId)
  if (!entry) return cells
  return {
    ...cells,
    [fromSlot]: (cells[fromSlot] || []).filter((e) => e.id !== entryId),
    [toSlot]: [...(cells[toSlot] || []), entry],
  }
}

/** Which slot an entry currently sits in, or undefined if it is gone. */
export function findEntrySlot(
  cells: Cells,
  entryId: string,
): string | undefined {
  return Object.keys(cells).find((slotId) =>
    (cells[slotId] || []).some((e) => e.id === entryId),
  )
}

/**
 * Puts an entry back exactly as it was — same slot, same values — in a single
 * operation.
 *
 * One operation and not two on purpose. Cancelling an edit that also moved the
 * entry has to undo both, and doing that as a move followed by a patch would
 * have the second call recompute from the cells the first one started with,
 * quietly throwing the move away.
 */
export function restoreEntry(
  cells: Cells,
  entryId: string,
  originalSlotId: string,
  original: StudyEntry,
): Cells {
  const currentSlot = findEntrySlot(cells, entryId)
  // Deleted while the form was open: there is nothing to restore onto, and
  // re-inserting it would undo a deliberate deletion.
  if (!currentSlot) return cells
  const moved =
    currentSlot === originalSlotId
      ? cells
      : moveEntryToSlot(cells, currentSlot, entryId, originalSlotId)
  return {
    ...moved,
    [originalSlotId]: (moved[originalSlotId] || []).map((e) =>
      e.id === entryId ? original : e,
    ),
  }
}

export function restoreSleepEntry(
  sleep: SleepEntry[],
  original: SleepEntry,
): SleepEntry[] {
  return sleep.map((e) => (e.id === original.id ? original : e))
}

export function updateSleepEntry(
  sleep: SleepEntry[],
  entryId: string,
  patch: Partial<SleepEntry>,
): SleepEntry[] {
  return sleep.map((e) => (e.id === entryId ? patchEntry(e, patch) : e))
}

export function removeSleepEntry(
  sleep: SleepEntry[],
  entryId: string,
): SleepEntry[] {
  return sleep.filter((e) => e.id !== entryId)
}
