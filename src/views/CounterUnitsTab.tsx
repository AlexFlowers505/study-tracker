/* ---------------------------------------------------------------
   Setup's counters tab — two lists, one per kind.

   The shared half — reorder, rename, icon, colour, description, delete — is
   `EditableList`, the same component slots and categories use. Only the fields
   a unit has of its own live here, and which of those it has depends on what
   sort of counter it is:

   - a **tally** answers "how many", so it has a total and slots;
   - a **check** answers "did it happen", so it has neither, and its states
     live in `lib/checks.ts`.

   They are two tabs rather than one list with a type field on each row,
   because the fields differ and a row that grows and shrinks as you change a
   dropdown is a row nobody can scan. The sub-tabs are a **recessed** track,
   not a second row of underlines: sitting directly under Setup's own tabs, an
   identical shape would read as the same control drawn twice.

   Unlike slots and categories these lists may be empty: a project that tallies
   nothing is a normal project, whereas an entry has to belong to some slot.
--------------------------------------------------------------- */

import { useState } from "react"
import { ArrowLeftRight, Plus, X } from "lucide-react"
import type { CounterKind, CounterUnit, Tag } from "../types/model"
import { counterKind } from "../lib/checks"
import { FIELD_SOFT, btnBase } from "../lib/theme"
import { segBtn, segBtnStyle } from "../ui/buttonStyles"
import { usePalette } from "../ui/useTheme"
import { EditableList } from "../ui/EditableList"
import { RenderIcon } from "../ui/icons"
import { PopoverMenu } from "../ui/PopoverMenu"
import { SwitchToggle } from "../ui/toggles"
import { Tip } from "../ui/Tip"


/**
 * Deliberately "total", not "target" or "goal". A unit can count something you
 * are trying *not* to do, and calling its number a target would read as an
 * instruction to reach it. "How many there are in all" is neutral, which is
 * what a counter that might be negative needs.
 */
const TOTAL_HELP =
  "How many there are in all, when that is known — 218 lessons in a course.\n\n" +
  "Off for anything open-ended: pages read, cigarettes smoked, days at the " +
  "gym. Not a goal — a negative unit has a total too, and reaching it is not " +
  "the idea."

const MOVE_HELP =
  "Change which question this counter answers." + String.fromCharCode(10, 10) +
  "Nothing recorded is thrown away. A tally of one reads as a check that " +
  "happened; a check that happened reads as a tally of one. A tally carrying " +
  "larger numbers keeps them, and the check reads every one of those days as " +
  "yes."

const TAG_HELP =
  "Tags for this counter. A unit can carry several — they are not competing " +
  "answers to one question." + String.fromCharCode(10, 10) +
  "Their use today is the filter: hiding a tag hides every counter wearing " +
  "it, everywhere on the page at once. Define them in the Tags tab."

/**
 * The total, with an empty box allowed while you retype it.
 *
 * Writing straight from the input coerced an empty field to zero — `Number("")`
 * is NaN and `NaN || 0` is 0 — so clearing the box to type a new number silently
 * set the total to nothing and the readout to "79 / 0". Holding the raw text
 * locally lets the field be empty without that ever reaching the data; only a
 * value that actually parses is written.
 */
function TotalField({
  value,
  onChange,
}: {
  value: number
  onChange: (next: number) => void
}) {
  // `null` means "show the stored value". Derived rather than synced from an
  // effect: an effect would have to write state on every prop change, which is
  // both a cascading render and a fight with the field you are typing into.
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <input
      type="number"
      min={0}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value)
        if (e.target.value !== "") onChange(Math.max(0, Number(e.target.value)))
      }}
      // Dropping the draft on blur is what snaps an empty box back to the
      // stored value: an empty field is a half-typed number, not a total of
      // nothing.
      onBlur={() => setDraft(null)}
      className={`${FIELD_SOFT} w-20 rounded-lg py-1 text-[11px]`}
    />
  )
}

/* ---------------------------------------------------------------
   The tags on one counter unit.

   **Only the tags it actually wears are drawn.** The whole set used to be
   there, on every row, as chips you switched on and off — which meant a
   project with a dozen tags drew a dozen chips per counter and the two or
   three that were true had to be picked out of them by their fill. What a unit
   *is* got told by what was missing.

   So the row states the answer and hides the question: the tags it carries,
   each with a cross, and one "+ Tag" that offers what is left. Nothing is
   listed twice, and a unit with no tags takes one line instead of twelve.
--------------------------------------------------------------- */
function TagRow({
  tags,
  tagIds,
  onChange,
}: {
  tags: Tag[]
  tagIds: string[]
  onChange: (next: string[]) => void
}) {
  const on = tags.filter((t) => tagIds.includes(t.id))
  const off = tags.filter((t) => !tagIds.includes(t.id))

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Tip multiline text={TAG_HELP}>
        <span className="text-[9px] font-mono uppercase tracking-widest text-ink/45 cursor-help underline decoration-dotted underline-offset-2">
          Tags
        </span>
      </Tip>

      {tags.length === 0 ? (
        <span className="text-[10px] font-mono text-ink/35">
          None defined yet — add them in the Tags tab.
        </span>
      ) : (
        <>
          {on.map((t) => (
            <span
              key={t.id}
              style={{ backgroundColor: `${t.color}24`, color: t.color }}
              className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-full text-[10px] font-mono font-bold"
            >
              <RenderIcon name={t.iconName} size={10} />
              {t.label}
              {/* The cross is the second way off, and the one that is where
                  you are already looking. The dropdown can take it off too,
                  but reaching for a menu to undo something you can see is a
                  longer road than the one straight through it. */}
              <Tip text={`Remove "${t.label}"`}>
                <button
                  type="button"
                  onClick={() => onChange(tagIds.filter((x) => x !== t.id))}
                  className={`${btnBase} p-0.5 rounded-full opacity-60 hover:opacity-100 hover:bg-ink/10`}
                  aria-label={`Remove tag ${t.label}`}
                >
                  <X size={10} />
                </button>
              </Tip>
            </span>
          ))}

          {off.length > 0 && (
            <PopoverMenu
              width={200}
              label="Add a tag"
              triggerClassName={`${btnBase} flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono bg-ink/[0.06] text-ink/55 hover:text-ink hover:bg-ink/[0.10]`}
              trigger={
                <>
                  <Plus size={10} />
                  Tag
                </>
              }
            >
              {(close) => (
                <div className="max-h-56 overflow-y-auto">
                  {off.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onChange([...tagIds, t.id])
                        close()
                      }}
                      className={`${btnBase} w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-ink/5`}
                    >
                      <span style={{ color: t.color }}>
                        <RenderIcon name={t.iconName} size={12} />
                      </span>
                      <span className="text-[11px] font-mono text-ink/80 truncate">
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </PopoverMenu>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Which sub-list a unit belongs to, and how one list's edits go back into the
 * whole.
 *
 * The other kind's units keep their absolute positions when the count has not
 * changed, so reordering tallies cannot shuffle the checks sitting between
 * them: `counterUnits` order is the order of badges on a day card and of
 * series on a chart, and neither should move because a different tab was
 * tidied. Removals close the gap up and additions land at the end.
 *
 * Everything that comes back through here is stamped with its kind, which is
 * how a unit written before the split — a check only by virtue of the
 * deprecated `oncePerDay` — becomes explicit the first time it is touched.
 */
function replaceKind(
  all: CounterUnit[],
  next: CounterUnit[],
  kind: CounterKind,
): CounterUnit[] {
  const queue = [...next]
  const out: CounterUnit[] = []
  all.forEach((u) => {
    if (counterKind(u) !== kind) {
      out.push(u)
      return
    }
    const take = queue.shift()
    if (take) out.push({ ...take, kind })
  })
  queue.forEach((take) => out.push({ ...take, kind }))
  return out
}

const KINDS: { id: CounterKind; label: string; caption: string }[] = [
  {
    id: "tally",
    label: "Tallies",
    caption:
      "How many — lessons finished, pages read, cigarettes smoked. A number " +
      "per slot, and a running total when there is one to run against.",
  },
  {
    id: "check",
    label: "Checks",
    caption:
      "Whether or not — overslept, went to bed on time, took a rest day. One " +
      "answer a day: yes, no or skipped, and unknown until the day is over.",
  },
]

export function CounterUnitsTab({
  units,
  tags,
  progress,
  onChange,
}: {
  units: CounterUnit[]
  tags: Tag[]
  /** Everything tallied so far, per unit — see `counterTotals`. */
  progress: Record<string, number>
  onChange: (next: CounterUnit[]) => void
}) {
  const c = usePalette()
  const [kind, setKind] = useState<CounterKind>("tally")
  const shown = units.filter((u) => counterKind(u) === kind)
  const isCheckTab = kind === "check"

  return (
    <div className="space-y-3">
      {/* Recessed, not underlined. Setup's own tabs sit two rows above this
          one, and a second set of underlines there read as the same control
          drawn twice — the trap `TabbedSection` sidesteps by not using pills
          at all. Sunk into the surface says "a level down" instead. */}
      <div className="inline-flex items-center gap-1 rounded-full bg-ink/[0.07] p-1">
        {KINDS.map((k) => {
          const active = k.id === kind
          const n = units.filter((u) => counterKind(u) === k.id).length
          return (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              aria-pressed={active}
              style={segBtnStyle(active, c)}
              className={segBtn(active)}
            >
              {k.label}
              {n > 0 && <span className="ml-1.5 opacity-60">{n}</span>}
            </button>
          )
        })}
      </div>

      <p className="text-[10px] font-mono text-ink/45 leading-relaxed">
        {KINDS.find((k) => k.id === kind)!.caption}
      </p>

      <EditableList<CounterUnit>
        // Keyed on the kind so switching tabs remounts the list rather than
        // re-labelling the rows of the one you were just looking at, which is
        // how an open delete confirmation ends up pointing at a different unit.
        key={kind}
        items={shown}
        onChange={(next) => onChange(replaceKind(units, next, kind))}
        noun={isCheckTab ? "check" : "tally"}
        minItems={0}
        newItem={() => ({ kind, tagIds: [] })}
        warningNote={(label) =>
          isCheckTab
            ? `Remove "${label}"? The days already marked against it stay in the data but stop being shown.`
            : `Remove "${label}"? Counts already recorded against it stay in the data but stop being shown.`
        }
        extra={(unit, update) => (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-1 pt-0.5">
            {/* A total is a tally's alone. "How many oversleeps are there in
                all" is not a question, and a switch offering to answer it
                would be the form asking something the kind has ruled out. */}
            {!isCheckTab && (
              <div className="flex items-center gap-1.5">
                <Tip multiline text={TOTAL_HELP}>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-ink/45 cursor-help underline decoration-dotted underline-offset-2">
                    Known total
                  </span>
                </Tip>
                <SwitchToggle
                  checked={unit.total != null}
                  onChange={(on) =>
                    update({
                      // Never below what is already recorded: a finish line
                      // behind you is not a number anyone meant to type, and
                      // it would render as "78 / 0" the moment the switch
                      // flipped.
                      total: on ? Math.max(1, progress[unit.id] || 0) : undefined,
                    })
                  }
                  label="This unit has a known total"
                />
                {unit.total != null && (
                  <TotalField
                    value={unit.total}
                    onChange={(total) => update({ total })}
                  />
                )}
                {/* How far along you are. The day cards show the day's own
                    count; the running total belongs where the total is set. */}
                <span className="text-[10px] font-mono text-ink/45 whitespace-nowrap">
                  {progress[unit.id] || 0}
                  {unit.total != null ? ` / ${unit.total}` : " so far"}
                </span>
              </div>
            )}

            {isCheckTab && (
              <span className="text-[10px] font-mono text-ink/45 whitespace-nowrap">
                {progress[unit.id] || 0} day
                {progress[unit.id] === 1 ? "" : "s"} marked yes
              </span>
            )}

            <TagRow
              tags={tags}
              tagIds={unit.tagIds || []}
              onChange={(tagIds) => update({ tagIds })}
            />

            {/* The way out of the wrong tab. Without it a counter filed under
                the wrong kind can only be deleted and retyped, which throws
                away everything recorded against it — a steep price for having
                clicked one tab rather than the other. */}
            <Tip multiline text={MOVE_HELP}>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    units.map((u) =>
                      u.id === unit.id
                        ? { ...u, kind: isCheckTab ? "tally" : "check" }
                        : u,
                    ),
                  )
                }
                className={`${btnBase} flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-mono uppercase tracking-widest text-ink/40 hover:text-ink hover:bg-ink/5`}
              >
                <ArrowLeftRight size={10} />
                {isCheckTab ? "Make a tally" : "Make a check"}
              </button>
            </Tip>
          </div>
        )}
      />
    </div>
  )
}
