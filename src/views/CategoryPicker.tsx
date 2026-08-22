/* ---------------------------------------------------------------
   Which category a counter belongs to — at most one.

   A dropdown rather than the chips tags use, and the difference is the whole
   point of having both: a tag answers "what else is this like", so you wear as
   many as are true, and chips are how you say several. A category answers
   "where does this belong", and a thing that belongs in two places does not
   have a place — so it is one control with one answer, and "None" is one of
   the answers rather than the absence of one.
--------------------------------------------------------------- */

import { ChevronDown } from "lucide-react"
import type { Category } from "../types/model"
import { btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { PopoverMenu } from "../ui/PopoverMenu"
import { Tip } from "../ui/Tip"

const HELP =
  "The category this counter belongs to — one at most, unlike a tag." +
  String.fromCharCode(10, 10) +
  "Categories are how the Counters tab can lay everything out under headings " +
  "with each thing appearing exactly once. Define them in the Categories tab."

export function CategoryPicker({
  categories,
  categoryId,
  onChange,
  labelled = true,
}: {
  categories: Category[]
  categoryId?: string
  onChange: (next: string | undefined) => void
  /** The "Category" caption. Off in a view that already groups by it. */
  labelled?: boolean
}) {
  const current = categories.find((x) => x.id === categoryId)

  if (!categories.length)
    return labelled ? (
      <div className="flex items-center gap-1.5">
        <Tip multiline text={HELP}>
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/45 cursor-help underline decoration-dotted underline-offset-2">
            Category
          </span>
        </Tip>
        <span className="text-[10px] font-mono text-ink/35">
          None defined yet — add them in the Categories tab.
        </span>
      </div>
    ) : null

  const trigger = (
    <>
      {current ? (
        <>
          <RenderIcon name={current.iconName} size={10} />
          {current.label}
        </>
      ) : (
        "No category"
      )}
      <ChevronDown size={10} className="opacity-60" />
    </>
  )

  return (
    <div className="flex items-center gap-1.5">
      {labelled && (
        <Tip multiline text={HELP}>
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/45 cursor-help underline decoration-dotted underline-offset-2">
            Category
          </span>
        </Tip>
      )}
      <PopoverMenu
        width={200}
        label="Choose a category"
        triggerClassName={`${btnBase} flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono ${
          current ? "font-bold" : "bg-ink/[0.06] text-ink/50 hover:text-ink"
        }`}
        trigger={
          current ? (
            <span
              className="flex items-center gap-1"
              style={{ color: current.color }}
            >
              {trigger}
            </span>
          ) : (
            trigger
          )
        }
      >
        {(close) => (
          <div className="max-h-56 overflow-y-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onChange(cat.id)
                  close()
                }}
                aria-pressed={cat.id === categoryId}
                style={
                  cat.id === categoryId
                    ? { color: cat.color, backgroundColor: `${cat.color}1A` }
                    : undefined
                }
                className={`${btnBase} w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-[11px] font-mono ${
                  cat.id === categoryId
                    ? "font-bold"
                    : "text-ink/80 hover:bg-ink/5"
                }`}
              >
                <span style={{ color: cat.color }}>
                  <RenderIcon name={cat.iconName} size={12} />
                </span>
                <span className="truncate">{cat.label}</span>
              </button>
            ))}
            {/* Below a rule, because "none" is not a fourth category — it is
                taking the answer back. */}
            <span className="block h-px my-1 mx-2 bg-ink/10" />
            <button
              type="button"
              onClick={() => {
                onChange(undefined)
                close()
              }}
              className={`${btnBase} w-full text-left px-2.5 py-2 rounded-xl text-[11px] font-mono text-ink/45 hover:bg-ink/5 hover:text-ink`}
            >
              No category
            </button>
          </div>
        )}
      </PopoverMenu>
    </div>
  )
}
