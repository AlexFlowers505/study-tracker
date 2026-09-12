/* ---------------------------------------------------------------
   Editing one entry inside a day.

   Extracted from the day editor because the day cards now edit entries in
   place, and two copies of "what changing an entry means" would drift the
   first time one of them learned a new rule. `minutes` is the number every
   figure in the app is computed from, so the rule that keeps it in step with
   the times has to live in exactly one place.
--------------------------------------------------------------- */

import type { StudyEntry, TimeEntry } from "../types/model"
import { minutesSince, spanMinutes } from "./time"

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

/* ---- Pausing --------------------------------------------------------------

   A pause is a **duration**, accumulated onto the entry as one number, and it
   is measured between the two clicks rather than read off the clock — see
   `TimeEntry.paused`. Nothing here asks what `start` says, which is exactly
   what makes pausing work on an entry you are filling in for yesterday.
-------------------------------------------------------------------------- */

/** The whole of it, in minutes. A pause running right now is not in here
 *  yet — it is counted when it ends, and until then there is no figure to
 *  count, only a moment it began at. */
export const pausedMinutes = (entry: TimeEntry): number =>
  Math.max(0, Number(entry.paused) || 0)

export const isPaused = (entry: TimeEntry): boolean => !!entry.pauseFrom

/** Starts one. Nothing to add yet, so nothing but the moment is written. */
export const pausePatch = (): Partial<TimeEntry> => ({
  pauseFrom: new Date().toISOString(),
})

/**
 * Ends the running pause and folds it into the total.
 *
 * Handed an entry that is not paused it clears the field and adds nothing, so
 * a double click on Resume cannot mint minutes out of an instant that is no
 * longer there.
 */
export const resumePatch = (entry: TimeEntry): Partial<TimeEntry> => {
  const total =
    pausedMinutes(entry) + (entry.pauseFrom ? minutesSince(entry.pauseFrom) : 0)
  return {
    // A stop shorter than half a step rounds away to nothing, and nothing is
    // what gets stored: `paused: 0` and no key at all mean the same thing to
    // every reader, and only one of them puts a field on the row.
    paused: total > 0 ? total : undefined,
    pauseFrom: undefined,
  }
}

/**
 * Ending a session that is on pause resumes it first.
 *
 * Otherwise the pause you were in the middle of would be thrown away by the
 * click that stopped the clock — the one moment it is certain to matter, since
 * you came back to the app in order to press this.
 */
export const stopNowPatch = (
  entry: TimeEntry,
  end: string,
): Partial<TimeEntry> => ({
  ...(isPaused(entry) ? resumePatch(entry) : {}),
  end,
})

/**
 * **How long a running session has run, as of `now`** — `spec 028`.
 *
 * A drawing and nothing else: nothing stores it and no total reads it, since
 * the figure only becomes a fact when the session ends. It used to read
 * `0m` for as long as the session ran, which is the one moment you most want
 * to know. Less every pause, the one still running included, so a held
 * session's figure holds still.
 *
 * A start a few minutes ahead of the clock — `nowTime` snaps to the grid, up
 * as well as down — is a session that has just begun, not one that began
 * yesterday, so anything short of half an hour ahead reads as nought rather
 * than wrapping round midnight.
 */
export const runningMinutes = (entry: TimeEntry, now: number): number => {
  if (!entry.start || entry.end) return 0
  const [h, m] = entry.start.split(":").map(Number)
  const d = new Date(now)
  let span = d.getHours() * 60 + d.getMinutes() - (h * 60 + m)
  if (span < -30) span += 1440
  const since = entry.pauseFrom ? Date.parse(entry.pauseFrom) : NaN
  const holding = Number.isFinite(since)
    ? Math.max(0, Math.floor((now - since) / 60000))
    : 0
  return Math.max(0, span - pausedMinutes(entry) - holding)
}

/**
 * With both times set, the span is the truth and the stored number follows it,
 * **less whatever the session was paused for**. With one or neither, whatever
 * was typed stands — an untimed entry is a perfectly good entry, and guessing
 * a span for it would invent data.
 *
 * Floored at nought. A pause longer than the span it sits inside is somebody
 * having typed a wrong number, and a negative duration would carry that
 * mistake into every total on the page rather than leaving it on the one row
 * where it can be seen and corrected.
 */
const withDerivedMinutes = <T extends StudyEntry>(entry: T): T =>
  entry.start && entry.end
    ? {
        ...entry,
        minutes: Math.max(
          0,
          spanMinutes(entry.start, entry.end) - pausedMinutes(entry),
        ),
      }
    : entry

/**
 * Applies a patch and re-derives the minutes.
 *
 * An explicit `undefined` *removes* the field rather than setting it to
 * undefined: "no start time" and "a start time of undefined" serialise
 * differently into jsonb, and only the first one round-trips. The rule is
 * every optional field rather than a list of them, since `pauseFrom` needed it
 * next and the list would only have gone on growing.
 *
 * **A derived figure dies with the pair it was derived from.** Clearing the
 * end of a finished entry used to leave its duration behind — `22:00–…`
 * followed by the half hour the end time had produced, which is a number
 * nobody typed and nothing on the row now supports. `withDerivedMinutes`
 * cannot catch it: it only speaks when *both* times are set, and its silence
 * everywhere else is deliberate and right, because an untimed entry's minutes
 * are typed by hand and must not be touched. The distinction it was missing is
 * not "is this timed now" but "was this figure the times' doing" — so the one
 * case that has to be handled is the crossing: an entry that had both and now
 * has not.
 *
 * Unless the same patch sets `minutes` itself, in which case it is being
 * typed and that is exactly the value to keep.
 */
export function patchEntry<T extends StudyEntry>(
  entry: T,
  patch: Partial<T>,
): T {
  const wasTimed = !!(entry.start && entry.end)
  const next = { ...entry, ...patch }
  for (const key of Object.keys(patch) as (keyof T)[]) {
    if (patch[key] === undefined) delete next[key]
  }
  if (wasTimed && !(next.start && next.end) && !("minutes" in patch))
    next.minutes = 0
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

