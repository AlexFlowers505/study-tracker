/* ---------------------------------------------------------------
   Editable list — slots, categories and counter units in Setup.

   Generic over the item so a list can carry fields the other two do not.
   Counter units add a total and a relation; they render through `extra`
   rather than through a third copy of the reorder / icon / colour / delete
   machinery, which is the part worth sharing.
--------------------------------------------------------------- */

import { useState } from "react"
import type { ReactNode } from "react"
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react"
import type { Labeled } from "../types/model"
import { makeId } from "../lib/id"
import { PALETTE, btnBase } from "../lib/theme"
import { ICON_LIBRARY } from "./iconLibrary"
import { RenderIcon } from "./icons"
import { Tip } from "./Tip"
import { AutoTextarea } from "./controls"

export function EditableList<T extends Labeled>({
  items,
  onChange,
  noun,
  warningNote,
  newItem,
  extra,
  minItems = 1,
}: {
  items: T[]
  onChange: (next: T[]) => void
  noun: string
  warningNote: (label: string) => ReactNode
  /** Whatever a new item needs beyond id, label, icon and colour. */
  newItem?: () => Omit<T, keyof Labeled>
  /** Fields this kind of item has and the others do not. */
  extra?: (item: T, update: (patch: Partial<T>) => void) => ReactNode
  /**
   * Slots and categories need at least one — an entry has to go somewhere.
   * Counter units can go to zero: a project that tallies nothing is normal.
   */
  minItems?: number
}) {
  const [openPickerId, setOpenPickerId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // The union is what lets the shared controls patch the `Labeled` half
  // without the compiler demanding they know about `T`'s own fields.
  const updateItem = (id: string, patch: Partial<T> | Partial<Labeled>) =>
    onChange(items.map((i) => (i.id === id ? ({ ...i, ...patch } as T) : i)))

  const addItem = () =>
    onChange([
      ...items,
      {
        id: makeId(noun),
        label: `New ${noun}`,
        iconName: "Star",
        color: PALETTE[items.length % PALETTE.length],
        ...(newItem ? newItem() : {}),
      } as T,
    ])

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id))
    setConfirmDeleteId(null)
  }

  // The stored order is the display order everywhere — the log's slot groups,
  // the donut legends, the chart series all read this list as-is.
  const moveItem = (index: number, dir: number) => {
    const next = [...items]
    const to = index + dir
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="border border-[#1E2A33]/15 rounded-xl p-2 bg-white"
        >
          {confirmDeleteId === item.id ? (
            <div className="flex items-center justify-between gap-3 text-xs font-mono">
              <span className="text-[#C1595B]">{warningNote(item.label)}</span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className={`${btnBase} px-2 py-1 rounded-md border border-[#1E2A33]/20 hover:bg-[#1E2A33]/5 uppercase tracking-widest text-[10px]`}
                >
                  Keep
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className={`${btnBase} px-2 py-1 rounded-md bg-[#C1595B] text-white hover:bg-[#a94a4c] uppercase tracking-widest text-[10px]`}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex flex-col shrink-0">
                  <button
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                    className={`${btnBase} p-0.5 rounded text-[#1E2A33]/35 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                    className={`${btnBase} p-0.5 rounded text-[#1E2A33]/35 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>
                <div className="relative">
                  <button
                    onClick={() =>
                      setOpenPickerId(openPickerId === item.id ? null : item.id)
                    }
                    style={{ borderColor: item.color, color: item.color }}
                    className={`${btnBase} w-8 h-8 rounded-xl flex items-center justify-center border-2 hover:opacity-75 shrink-0`}
                  >
                    <RenderIcon name={item.iconName} size={15} />
                  </button>
                  {openPickerId === item.id && (
                    <div className="absolute z-30 top-10 left-0 bg-white border border-[#1E2A33]/15 rounded-xl shadow-lg p-2.5 w-56">
                      <p className="text-[9px] uppercase tracking-widest text-[#1E2A33]/40 mb-1.5">
                        Icon
                      </p>
                      {/* Capped and scrolled: the library is long enough now
                          that an uncapped grid would make this popover taller
                          than the modal it opens inside. */}
                      <div className="grid grid-cols-6 gap-1 mb-3 max-h-40 overflow-y-auto pr-1">
                        {ICON_LIBRARY.map((opt) => (
                          <button
                            key={opt.name}
                            onClick={() =>
                              updateItem(item.id, { iconName: opt.name })
                            }
                            className={`${btnBase} p-1.5 rounded-md hover:bg-[#1E2A33]/10 flex items-center justify-center ${
                              item.iconName === opt.name
                                ? "bg-[#1E2A33]/10 ring-1 ring-[#1E2A33]/30"
                                : ""
                            }`}
                          >
                            <RenderIcon name={opt.name} size={14} />
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] uppercase tracking-widest text-[#1E2A33]/40 mb-1.5">
                        Color
                      </p>
                      {/* The item's own colour is always offered, even when
                          it is not in the palette. Colours have been retired
                          from the grid before, and anything already using one
                          would otherwise show no selection at all and lose it
                          the moment you touched the picker. */}
                      <div className="flex flex-wrap gap-1.5">
                        {(PALETTE.includes(item.color)
                          ? PALETTE
                          : [...PALETTE, item.color]
                        ).map((c) => (
                          <button
                            key={c}
                            onClick={() => updateItem(item.id, { color: c })}
                            style={{
                              backgroundColor: c,
                              outline:
                                item.color === c ? "2px solid #1E2A33" : "none",
                              outlineOffset: "1px",
                            }}
                            className={`${btnBase} w-5 h-5 rounded-full hover:scale-110`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setOpenPickerId(null)}
                        className={`${btnBase} mt-3 text-[9px] uppercase tracking-widest text-[#1E2A33]/40 hover:text-[#1E2A33]`}
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
                <input
                  value={item.label}
                  onChange={(e) =>
                    updateItem(item.id, { label: e.target.value })
                  }
                  className="flex-1 border border-[#1E2A33]/20 rounded-xl px-2 py-1.5 text-xs font-mono"
                />
                <Tip
                  text={
                    items.length <= minItems
                      ? `At least ${minItems} is required`
                      : "Remove"
                  }
                >
                  <button
                    disabled={items.length <= minItems}
                    onClick={() => setConfirmDeleteId(item.id)}
                    className={`${btnBase} p-1.5 text-[#1E2A33]/40 hover:text-[#C1595B] disabled:opacity-20 disabled:cursor-not-allowed`}
                  >
                    <Trash2 size={14} />
                  </button>
                </Tip>
              </div>
              <div className="flex items-start gap-1.5 pl-1">
                <MessageSquare
                  size={12}
                  className="text-[#1E2A33]/25 shrink-0 mt-1.5"
                />
                <AutoTextarea
                  value={item.description || ""}
                  onChange={(e) =>
                    updateItem(item.id, { description: e.target.value })
                  }
                  placeholder={`What counts as this ${noun}? (optional)`}
                  rows={1}
                  maxHeight={100}
                  className="flex-1 border border-[#1E2A33]/10 rounded-lg px-2 py-1 text-[10px] font-mono bg-[#F4F5F7]/50"
                />
              </div>
              {extra?.(item, (patch) => updateItem(item.id, patch))}
            </div>
          )}
        </div>
      ))}
      <button
        onClick={addItem}
        className={`${btnBase} flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/60 hover:text-[#1E2A33] px-1 py-1.5`}
      >
        <Plus size={13} /> Add {noun}
      </button>
    </div>
  )
}
