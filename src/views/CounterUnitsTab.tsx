/* ---------------------------------------------------------------
   Setup's counters tab — every kind of counter, two ways round.

   A counter answers one of three questions, and the tab is built around that:

   - an **activity** records *time* — Lessons, Q&A, Polishing questions;
   - a **tally** records *how many* — pages read, slips onto youtube;
   - a **check** records *whether or not* — overslept, in bed on time.

   The shared half — reorder, rename, icon, colour, description, delete — is
   `EditableList`, the same component slots and tags use. Only the fields a
   kind has of its own live here, and they differ: a tally has a total and
   slots, a check has neither, an activity has neither and no tags either,
   since nothing counts it.

   **Two arrangements of the same things.** By kind is the editor: one list at
   a time, with everything a row can carry. By category is the shelf: every
   counter under its heading whatever kind it is, appearing exactly once,
   because a category is the one grouping a thing can have only one of. The
   shelf edits only the shelving — which category a row is on — and says where
   the rest lives, since two full editors for one row is two places for the
   same edit to go wrong.

   Both toggles are **recessed** tracks, not underlines: they sit directly
   under Setup's own tabs, and an identical shape there would read as the same
   control drawn twice.

   Activities keep their own list rather than joining `counterUnits` — the
   reasoning is in CLAUDE.md, and it is why this file takes two arrays and two
   change handlers rather than one of each.
--------------------------------------------------------------- */

import { useState } from "react"
import { ArrowLeftRight, Plus, X } from "lucide-react"
import type {
  Activity,
  Category,
  CounterKind,
  CounterUnit,
  Tag,
} from "../types/model"
import { counterKind } from "../lib/checks"
import { CategoryPicker } from "./CategoryPicker"
import { RenderIcon as Icon } from "../ui/icons"
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
 * The other kinds keep their absolute positions when the count has not
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

type TabId = CounterKind | "activity"

const TABS: { id: TabId; label: string; caption: string }[] = [
  {
    id: "activity",
    label: "Activities",
    caption:
      "Time — what a logged entry went on. Lessons, revision, a lecture. " +
      "Every hour the app reports is filed under one of these.",
  },
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

/** One row in the by-category shelf: what it is, and where it is filed. */
function ShelfRow({
  item,
  kind,
  categories,
  onCategory,
}: {
  item: Activity | CounterUnit
  kind: TabId
  categories: Category[]
  onCategory: (next: string | undefined) => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 bg-ink/[0.04]">
      <span style={{ color: item.color }} className="shrink-0">
        <Icon name={item.iconName} size={13} />
      </span>
      <span className="text-[11px] font-mono truncate">{item.label}</span>
      <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35 shrink-0">
        {kind === "activity" ? "time" : kind === "tally" ? "count" : "check"}
      </span>
      <span className="ml-auto shrink-0">
        <CategoryPicker
          categories={categories}
          categoryId={item.categoryId}
          onChange={onCategory}
          labelled={false}
        />
      </span>
    </div>
  )
}

export function CounterUnitsTab({
  units,
  activities,
  categories,
  tags,
  progress,
  onChange,
  onChangeActivities,
}: {
  units: CounterUnit[]
  activities: Activity[]
  categories: Category[]
  tags: Tag[]
  /** Everything tallied so far, per unit — see `counterTotals`. */
  progress: Record<string, number>
  onChange: (next: CounterUnit[]) => void
  onChangeActivities: (next: Activity[]) => void
}) {
  const c = usePalette()
  const [group, setGroup] = useState<"kind" | "category">("kind")
  const [tab, setTab] = useState<TabId>("activity")
  const isCheckTab = tab === "check"

  const countOf = (id: TabId) =>
    id === "activity"
      ? activities.length
      : units.filter((u) => counterKind(u) === id).length

  const setCategory = (
    id: string,
    kind: TabId,
    next: string | undefined,
  ) => {
    if (kind === "activity")
      onChangeActivities(
        activities.map((a) => (a.id === id ? { ...a, categoryId: next } : a)),
      )
    else
      onChange(units.map((u) => (u.id === id ? { ...u, categoryId: next } : u)))
  }

  /* The shelf: every counter of every kind, under the category it is filed
     in, in the order the categories are listed. "Not filed" comes last and is
     absent when there is nothing in it — an empty heading is a shelf you have
     to check before you know it is empty. */
  // An id pointing at a category that no longer exists reads as "not filed"
  // rather than as a shelf of its own. Deleting a category strips the id off
  // everything wearing it, so this should never fire — and if it ever does,
  // a row that quietly disappears from every heading is a far worse failure
  // than one filed under nothing.
  const filedIn = (x: { categoryId?: string }) =>
    categories.some((cat) => cat.id === x.categoryId) ? x.categoryId! : ""

  const shelf = [
    ...categories.map((cat) => ({ cat, id: cat.id })),
    { cat: null, id: "" },
  ].map(({ cat, id }) => ({
    cat,
    rows: [
      ...activities
        .filter((a) => filedIn(a) === id)
        .map((item) => ({ item, kind: "activity" as TabId })),
      ...units
        .filter((u) => filedIn(u) === id)
        .map((item) => ({ item, kind: counterKind(item) as TabId })),
    ],
  }))

  const pill = (active: boolean, label: string, onClick: () => void, n?: number) => (
    <button
      key={label}
      onClick={onClick}
      aria-pressed={active}
      style={segBtnStyle(active, c)}
      className={segBtn(active)}
    >
      {label}
      {n != null && n > 0 && <span className="ml-1.5 opacity-60">{n}</span>}
    </button>
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full bg-ink/[0.07] p-1">
          {pill(group === "kind", "By kind", () => setGroup("kind"))}
          {pill(group === "category", "By category", () => setGroup("category"))}
        </div>
        {group === "kind" && (
          <div className="inline-flex items-center gap-1 rounded-full bg-ink/[0.07] p-1">
            {TABS.map((t) =>
              pill(t.id === tab, t.label, () => setTab(t.id), countOf(t.id)),
            )}
          </div>
        )}
      </div>

      {group === "category" ? (
        <>
          <p className="text-[10px] font-mono text-ink/45 leading-relaxed">
            Everything you count, under the category it is filed in. Change the
            filing here; the rest of what a counter is — its name, colour,
            total, tags — lives under <strong>By kind</strong>.
          </p>
          {categories.length === 0 && (
            <p className="text-[10px] font-mono text-ink/35">
              No categories yet. Add them in the Categories tab and they will
              appear here as headings.
            </p>
          )}
          <div className="space-y-3">
            {shelf
              .filter((g) => g.rows.length > 0 || g.cat)
              .map((g) => (
                <div key={g.cat?.id || "none"} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    {g.cat ? (
                      <>
                        <span style={{ color: g.cat.color }}>
                          <Icon name={g.cat.iconName} size={12} />
                        </span>
                        <span
                          className="text-[10px] font-mono uppercase tracking-widest font-bold"
                          style={{ color: g.cat.color }}
                        >
                          {g.cat.label}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] font-mono uppercase tracking-widest text-ink/35">
                        Not filed
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-ink/30">
                      {g.rows.length}
                    </span>
                  </div>
                  {g.rows.length === 0 ? (
                    <p className="text-[10px] font-mono text-ink/25 pl-1">
                      Nothing here yet.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {g.rows.map(({ item, kind }) => (
                        <ShelfRow
                          key={item.id}
                          item={item}
                          kind={kind}
                          categories={categories}
                          onCategory={(next) => setCategory(item.id, kind, next)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-[10px] font-mono text-ink/45 leading-relaxed">
            {TABS.find((t) => t.id === tab)!.caption}
          </p>

          {tab === "activity" ? (
            <EditableList<Activity>
              key="activity"
              items={activities}
              onChange={onChangeActivities}
              noun="activity"
              warningNote={(label) =>
                `Remove "${label}"? Entries already logged under it stay stored but will show as removed.`
              }
              extra={(activity, update) => (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-1 pt-0.5">
                  <CategoryPicker
                    categories={categories}
                    categoryId={activity.categoryId}
                    onChange={(categoryId) => update({ categoryId })}
                  />
                </div>
              )}
            />
          ) : (
            <EditableList<CounterUnit>
              // Keyed on the kind so switching tabs remounts the list rather
              // than re-labelling the rows of the one you were just looking
              // at, which is how an open delete confirmation ends up pointing
              // at a different unit.
              key={tab}
              items={units.filter((u) => counterKind(u) === tab)}
              onChange={(next) => onChange(replaceKind(units, next, tab))}
              noun={isCheckTab ? "check" : "tally"}
              minItems={0}
              newItem={() => ({ kind: tab, tagIds: [] })}
              warningNote={(label) =>
                isCheckTab
                  ? `Remove "${label}"? The days already marked against it stay in the data but stop being shown.`
                  : `Remove "${label}"? Counts already recorded against it stay in the data but stop being shown.`
              }
              extra={(unit, update) => (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-1 pt-0.5">
                  {/* A total is a tally's alone. "How many oversleeps are
                      there in all" is not a question, and a switch offering to
                      answer it would be the form asking something the kind has
                      ruled out. */}
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
                            // Never below what is already recorded: a finish
                            // line behind you is not a number anyone meant to
                            // type, and it would render as "78 / 0" the moment
                            // the switch flipped.
                            total: on
                              ? Math.max(1, progress[unit.id] || 0)
                              : undefined,
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
                      {/* How far along you are. The day cards show the day's
                          own count; the running total belongs where the total
                          is set. */}
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

                  <CategoryPicker
                    categories={categories}
                    categoryId={unit.categoryId}
                    onChange={(categoryId) => update({ categoryId })}
                  />

                  <TagRow
                    tags={tags}
                    tagIds={unit.tagIds || []}
                    onChange={(tagIds) => update({ tagIds })}
                  />

                  {/* The way out of the wrong tab. Without it a counter filed
                      under the wrong kind can only be deleted and retyped,
                      which throws away everything recorded against it — a
                      steep price for having clicked one tab rather than the
                      other. */}
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
          )}
        </>
      )}
    </div>
  )
}
