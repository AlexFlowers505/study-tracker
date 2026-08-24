/* ---------------------------------------------------------------
   Picking an icon out of three hundred.

   There were two copies of this grid — one in `EditableList`, one in Setup's
   Project tab — back when the library was a hundred long and scanning it was
   plausible. It is past three hundred now, and at that size an unsearchable
   grid is not a picker, it is a haystack: the icon you want is in there and
   you will take the fourth-best one you happen to see first.

   So: **a search box, and headings when you are not searching.** The two
   states are deliberately different shapes. Browsing wants the groups, since
   "which of these is the studying one" is answered by a heading; searching
   wants them gone, since three matches spread over three headings reads as
   three separate failures rather than as one short list.

   The search matches what the picture is *of*, not only what lucide called
   it — see `keywords` in `iconLibrary`. Typing "gym" has to find the dumbbell
   or the feature is decorative.
--------------------------------------------------------------- */

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { FIELD_SOFT, btnBase } from "../lib/theme"
import { Tip } from "./Tip"
import { ICON_GROUPS, ICON_LIBRARY, iconMatches } from "./iconLibrary"
import { RenderIcon } from "./icons"

export function IconGrid({
  value,
  onPick,
}: {
  /** The name currently chosen, so it can be shown as selected. */
  value?: string
  onPick: (name: string) => void
}) {
  const [query, setQuery] = useState("")
  const searching = query.trim().length > 0

  const matches = useMemo(
    () => ICON_LIBRARY.filter((entry) => iconMatches(entry, query)),
    [query],
  )

  // Grouped only while browsing. Rebuilt from the filtered list rather than
  // from the library, so the two branches can never disagree about what is in.
  const groups = useMemo(
    () =>
      ICON_GROUPS.map((group) => ({
        group,
        items: matches.filter((entry) => entry.group === group),
      })).filter((g) => g.items.length > 0),
    [matches],
  )

  /* Every cell says its own name, because the search box made the name worth
     knowing: finding this icon again a month from now means typing it, and an
     unlabelled grid gives you nothing to type.

     After a dwell, though. A cursor crossing three hundred icons on its way to
     one would otherwise fire a bubble under every icon it passed, which is
     noise where the point was information. Stopping on one is the gesture that
     means "what is this". */
  const cell = (name: string) => (
    <Tip key={name} text={name} delay={450} className="flex">
      <button
        type="button"
        onClick={() => onPick(name)}
        className={`${btnBase} w-full p-1.5 rounded-md hover:bg-ink/10 flex items-center justify-center ${
          value === name ? "bg-ink/10 ring-1 ring-ink/30" : ""
        }`}
      >
        <RenderIcon name={name} size={14} />
      </button>
    </Tip>
  )

  return (
    <div>
      <div className="relative mb-2">
        <Search
          size={11}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-ink/35 pointer-events-none"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons"
          // Not autofocused: this opens inside a modal that already has fields,
          // and stealing the caret on every swatch click is worse than a tap.
          className={`${FIELD_SOFT} text-[11px] pl-6`}
        />
      </div>

      {/* Capped and scrolled — an uncapped grid would be taller than the modal
          it opens inside, and the search box has to stay put above it. */}
      <div className="max-h-44 overflow-y-auto pr-1">
        {matches.length === 0 && (
          <p className="text-[10px] font-mono text-ink/40 py-3 text-center">
            Nothing matches “{query.trim()}”
          </p>
        )}

        {searching ? (
          <div className="grid grid-cols-6 gap-1">
            {matches.map((entry) => cell(entry.name))}
          </div>
        ) : (
          groups.map(({ group, items }) => (
            <div key={group} className="mb-2 last:mb-0">
              <p className="text-[8px] uppercase tracking-widest text-ink/30 mb-1 sticky top-0 bg-card py-0.5">
                {group}
              </p>
              <div className="grid grid-cols-6 gap-1">
                {items.map((entry) => cell(entry.name))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
