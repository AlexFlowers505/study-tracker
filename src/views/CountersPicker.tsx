/* ---------------------------------------------------------------
   The two-step target picker: the kind, then the ones.

   Shared by the rule form and the achievements form. See `countersPick.ts`
   for the taxonomy it walks and for why the two are separate files.
--------------------------------------------------------------- */

import type { StreakTarget } from "../types/model"
import type { StreakContext } from "../lib/customStreaks"
import { targetInfo, targetsUnits } from "../lib/customStreaks"
import { Pills } from "../ui/Pills"
import { btnBase } from "../lib/theme"
import { usePalette } from "../ui/useTheme"
import {
  KIND_SELECT,
  MEMBER_LABEL,
  PICKS,
  PICK_ACTION,
  PICK_LABEL,
  SET_PICKS,
  WORD,
  choicesFor,
  memberFields,
  memberPickOf,
  pickOf,
  targetKindOf,
} from "./countersPick"
import type { MemberPick, PickKind } from "./countersPick"

/**
 * What a condition is about — **the kind first, then the one**, plus the one
 * question a category raises.
 *
 * Two dropdowns rather than one grouped list. Grouping is not choosing: with
 * everything in a single list you had to open it and scroll past forty names
 * to discover that tags were at the bottom, and the kinds themselves — the
 * taxonomy the rest of the app is built on — were only visible as headings
 * inside something you had to be holding open. Asking the kind first is the
 * order the question is actually thought in, and it makes the second list
 * short enough to read.
 *
 * A kind with nothing in it is absent from the first dropdown, for the same
 * reason a tab is: there is nothing behind it. Study time is always there.
 */
export function CountersPicker({
  targets,
  ctx,
  onChange,
}: {
  /** What is currently named. Never empty — one is the floor. */
  targets: StreakTarget[]
  ctx: StreakContext
  onChange: (targets: StreakTarget[]) => void
}) {
  const first = targets[0]
  const pick = pickOf(first, ctx)
  const isSet = SET_PICKS.includes(pick)
  const member = memberPickOf(first)
  const chosen = targets.map((t) => t.id || "")

  /* **Every kind is offered, including one with nothing in it yet.**

     They used to be hidden while empty, on the same reasoning as a tab with
     nothing behind it — and that reasoning is wrong here. A tab you cannot see
     is a page you know exists; a *kind* you cannot see is a capability you
     have no way of learning about. A project with no categories looked
     exactly like a build where categories were never implemented. So the kind
     stays and the empty list says what to do about it.

     **`All study time` can no longer be chosen**, but a condition already on
     it still offers it, the same way a deleted counter keeps its chip. Hiding
     it outright would leave the dropdown showing its first option instead — a
     silent claim that the rule is about something it is not. */
  const kinds = PICKS.filter((k) => k !== "time" || pick === "time")

  const options = choicesFor(pick, ctx)

  /* A target pointing at something since deleted keeps its chip, named as
     `targetInfo` names it. Dropping it would quietly rewrite the rule into one
     about something else. */
  const ghosts = chosen.filter((id) => id && !options.some((o) => o.id === id))

  const fieldsFor = (kind: PickKind, id: string): StreakTarget =>
    kind === "time"
      ? { kind: "time" }
      : SET_PICKS.includes(kind)
        ? { kind: targetKindOf(kind), id, ...memberFields(member) }
        : { kind: targetKindOf(kind), id }

  const switchKind = (next: PickKind) => {
    if (next === "time") return onChange([{ kind: "time" }])
    const firstId = choicesFor(next, ctx)[0]?.id || ""
    // A set that has never been asked starts on the half it actually holds,
    // rather than on "activities" for a category full of tallies.
    const seed: MemberPick = SET_PICKS.includes(next)
      ? ctx.units.some((u) =>
          next === "tag"
            ? (u.tagIds || []).includes(firstId)
            : u.categoryId === firstId,
        )
        ? "any"
        : "activity"
      : "any"
    onChange([
      next === "category" || next === "tag"
        ? { kind: targetKindOf(next), id: firstId, ...memberFields(seed) }
        : { kind: targetKindOf(next), id: firstId },
    ])
  }

  const toggle = (id: string) => {
    const on = chosen.includes(id)
    // The last one cannot come off: a condition about nothing is not a
    // condition, and an empty list would read as "everything" to anyone
    // glancing at it.
    if (on && chosen.length === 1) return
    onChange(
      on
        ? targets.filter((t) => t.id !== id)
        : [...targets, fieldsFor(pick, id)],
    )
  }

  const setMember = (next: MemberPick) =>
    onChange(targets.map((t) => ({ ...t, ...memberFields(next) })))

  return (
    <div className="space-y-2 w-full">
      <div className="flex flex-wrap items-center gap-1.5">
        {/* **`Counts` and `Of those`, not `Entity` and `Counter type`.**

            Both dropdowns offer the words Activities, Tallies and Checks, so
            labelled by their types they read as one question asked twice. They
            are not: the first says what sort of thing this condition *names* —
            a shelf or the counters themselves — and the second, which appears
            only for a shelf, says which of the things on it to count. Named
            for what they ask, `Of those` can only be read as referring to the
            chips directly above it. */}
        <span className="text-[9px] font-mono uppercase tracking-widest text-ink/40">
          Counts
        </span>
        <select
          value={pick}
          onChange={(e) => switchKind(e.target.value as PickKind)}
          className={KIND_SELECT}
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {PICK_LABEL[k]}
            </option>
          ))}
        </select>
        {pick === "time" && (
          <span className={WORD}>whatever it was filed under</span>
        )}

        {/* **The two actions sit on the question's line, not among the
            answers.** They wore the chips' own shape a gap away from them,
            so `All Clear Lessons Exams` read as a row of four counters, two
            of which were greyed out. Up here they are unmistakably things you
            do rather than things you pick. */}
        {options.length > 1 && (
          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange(options.map((o) => fieldsFor(pick, o.id)))}
              disabled={options.every((o) => chosen.includes(o.id))}
              className={PICK_ACTION}
            >
              All
            </button>
            {/* The way back. Taking all of forty and then clicking thirty-nine
                off to keep one is not a way to choose one. It clears to the
                first rather than to nothing, because a condition watching
                nothing is not a condition. */}
            <button
              type="button"
              onClick={() => onChange([targets[0]])}
              disabled={chosen.length <= 1}
              className={PICK_ACTION}
            >
              Clear
            </button>
          </span>
        )}
      </div>

      {options.length === 0 && pick !== "time" && (
        <p className="text-[10px] font-mono text-ink/40">
          No {PICK_LABEL[pick].toLowerCase()} yet — Setup has the tab for them.
        </p>
      )}

      {/* Which ones. Several, and that is the point of the rebuild: "any of
          Lessons, Q&A or Polishing" is one promise about study, where three
          rules would be three streaks to keep and three allowances to spend. */}
      {options.length > 0 && (
        <PickChips
          items={[
            ...options.map((o) => ({ id: o.id, label: o.label, ghost: false })),
            ...ghosts.map((id) => ({
              id,
              label: targetInfo({ kind: targetKindOf(pick), id }, ctx).label,
              ghost: true,
            })),
          ]}
          chosen={chosen}
          onToggle={toggle}
        />
      )}

      {/* A set holds more than one kind of thing, so it has to say which. The
          three kinds are not one question: an activity is minutes, a tally is
          occurrences, a check is an answer. `Any counter` adds the last two,
          which is arithmetic that works — the pair that cannot be added is
          time and occurrences, and that is the choice being made here. */}
      {isSet && (
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/40">
            Of those
          </span>
          <Pills<MemberPick>
            value={member}
            onChange={setMember}
            options={(
              [
                "activity",
                "tally",
                "check",
                // Offered only while it is what the condition already says, so
                // an older rule reads as itself and cannot be returned to.
                ...(member === "any" ? (["any"] as MemberPick[]) : []),
              ] as MemberPick[]
            ).map((m) => ({ id: m, label: MEMBER_LABEL[m] }))}
          />
        </div>
      )}

      {/* What the set actually comes to, read-only. Choosing a shelf entitles
          you to see what is on it — and it is deliberately not editable, since
          wanting to edit it means you wanted the counters rather than the
          shelf, which is the other path through this control. */}
      {isSet && <Resolved targets={targets} ctx={ctx} member={member} />}
    </div>
  )
}

/** What a set resolves to today. Named, not counted: a number tells you nothing
 *  about whether you picked the right shelf. */
function Resolved({
  targets,
  ctx,
  member,
}: {
  targets: StreakTarget[]
  ctx: StreakContext
  member: MemberPick
}) {
  const names =
    member === "activity"
      ? ctx.activities
          .filter((a) =>
            targets.some((t) =>
              t.kind === "category" ? a.categoryId === t.id : false,
            ),
          )
          .map((a) => a.label)
      : targetsUnits(targets, ctx).map((u) => u.label)

  return (
    <p className="text-[10px] font-mono text-ink/40 leading-relaxed">
      {names.length ? (
        <>
          Counts {names.length} today: <span className="text-ink/60">{names.join(", ")}</span>
        </>
      ) : (
        <span style={{ color: "inherit" }}>
          Nothing is filed here yet, so this condition counts nothing.
        </span>
      )}
    </p>
  )
}

/** Pick several. Chosen is filled, unchosen is an outline you can click. */
function PickChips({
  items,
  chosen,
  onToggle,
}: {
  items: { id: string; label: string; ghost: boolean }[]
  chosen: string[]
  onToggle: (id: string) => void
}) {
  const c = usePalette()
  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((item) => {
        const on = chosen.includes(item.id)
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            aria-pressed={on}
            style={
              on
                ? { backgroundColor: `${c.accent}1F`, color: c.accent }
                : undefined
            }
            className={`${btnBase} text-[10px] font-mono px-2 py-1 rounded-full ${
              on
                ? "font-bold"
                : "text-ink/45 bg-ink/[0.05] hover:bg-ink/10 hover:text-ink/70"
            } ${item.ghost ? "line-through decoration-ink/40" : ""}`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
