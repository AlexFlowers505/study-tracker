/* ---------------------------------------------------------------
   Setup's counter units tab.

   The shared half — reorder, rename, icon, colour, description, delete — is
   `EditableList`, the same component slots and categories use. Only the two
   fields a unit has of its own live here.

   Unlike the other two lists this one may be empty: a project that tallies
   nothing is a normal project, whereas an entry has to belong to some slot.
--------------------------------------------------------------- */

import { useState } from "react"
import type { CounterUnit, Tag } from "../types/model"
import { FIELD_SOFT, btnBase } from "../lib/theme"
import { EditableList } from "../ui/EditableList"
import { RenderIcon } from "../ui/icons"
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

const ONCE_HELP =
  "For anything that either happened or did not: overslept, took a rest day, " +
  "missed a dose." + String.fromCharCode(10, 10) +
  "A limit rather than a switch — it still counts, it just stops at one. What " +
  "changes is the dialog: \"how many times did you oversleep\" is not a " +
  "question with an answer, so the field goes and you record the fact instead."

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
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-mono text-ink/45 leading-relaxed">
        Things you tally per day — lessons finished, exams passed, pages read.
        Each one gets its own count on every day card.
      </p>

      <EditableList<CounterUnit>
        items={units}
        onChange={onChange}
        noun="unit"
        minItems={0}
        newItem={() => ({ tagIds: [] })}
        warningNote={(label) =>
          `Remove "${label}"? Counts already recorded against it stay in the data but stop being shown.`
        }
        extra={(unit, update) => (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-1 pt-0.5">
            {/* A switch rather than an empty field. "No total" and "a total of
                zero" are different things and an empty box said neither
                clearly — you could not tell whether blank meant unset or
                unfilled. The switch states it, and the box only exists when
                there is a number to put in it. */}
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
                    // behind you is not a number anyone meant to type, and it
                    // would render as "78 / 0" the moment the switch flipped.
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

            <div className="flex items-center gap-1.5">
              <Tip multiline text={ONCE_HELP}>
                <span className="text-[9px] font-mono uppercase tracking-widest text-ink/45 cursor-help underline decoration-dotted underline-offset-2">
                  Once a day
                </span>
              </Tip>
              <SwitchToggle
                checked={unit.oncePerDay === true}
                onChange={(on) => update({ oncePerDay: on || undefined })}
                label="This happens at most once a day"
              />
            </div>

            {/* Chips rather than a segmented control: these are tags, and a
                unit can wear several. A segmented control would be promising
                that exactly one of them is true. */}
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
                tags.map((h) => {
                  const on = (unit.tagIds || []).includes(h.id)
                  return (
                    <Tip key={h.id} text={h.description || h.label}>
                      <button
                        onClick={() =>
                          update({
                            tagIds: on
                              ? (unit.tagIds || []).filter((x) => x !== h.id)
                              : [...(unit.tagIds || []), h.id],
                          })
                        }
                        aria-pressed={on}
                        style={
                          on
                            ? { backgroundColor: `${h.color}24`, color: h.color }
                            : undefined
                        }
                        className={`${btnBase} flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono ${
                          on ? "font-bold" : "text-ink/40 hover:text-ink/70"
                        }`}
                      >
                        <RenderIcon name={h.iconName} size={10} />
                        {h.label}
                      </button>
                    </Tip>
                  )
                })
              )}
            </div>
          </div>
        )}
      />
    </div>
  )
}
