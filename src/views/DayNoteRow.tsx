/* ---------------------------------------------------------------
   The day's own note, on the card.

   Sits between the day's total and its entries, which is where it belongs:
   it describes the day, not any one session, so it reads before the list
   rather than as a footnote after it.

   The show/hide control is **not** here — it lives beside the date in the card
   header, because hiding has to remove this whole block, and a button cannot
   be the thing that hides itself. What is left here is one target: the text,
   which opens the editor.

   Everything about the editing half matches `EntryEditRow` deliberately —
   bare field, wash and outline around the row, the same three buttons in the
   same places — because it is the same gesture applied to a different thing.
--------------------------------------------------------------- */

import { useEffect, useRef } from "react"
import { Ban, Check, Trash2 } from "lucide-react"
import { btnBase, cardSmall } from "../lib/theme"
import { AutoTextarea } from "../ui/controls"
import { Tip } from "../ui/Tip"

import { usePalette } from "../ui/useTheme"
const iconBtn = `${btnBase} p-1 rounded shrink-0`

export function DayNoteRow({
  comment,
  editing,
  folded,
  onOpen,
  onChange,
  onDelete,
  onCancel,
  onClose,
  roomy,
}: {
  comment: string
  editing: boolean
  /** Hidden entirely, not merely collapsed. Ignored while editing. */
  folded: boolean
  onOpen: () => void
  onChange: (text: string) => void
  onDelete: () => void
  onCancel: () => void
  onClose: () => void
  roomy?: boolean
}) {
  const c = usePalette()
  const ref = useRef<HTMLDivElement>(null)

  // Escape cancels rather than closes, same as an entry: reaching for it
  // mid-edit means "forget this".
  useEffect(() => {
    const el = ref.current
    if (!el || !editing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.stopPropagation()
      onCancel()
    }
    el.addEventListener("keydown", onKey)
    return () => el.removeEventListener("keydown", onKey)
  }, [editing, onCancel])

  if (!editing && (folded || !comment)) return null

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()

  return (
    <div
      ref={ref}
      // The card behind this is a button that opens the day dialog.
      onClick={stop}
      onKeyDown={stop}
      className={`rounded-xl p-2.5 ${editing ? "" : "bg-ink/[0.04]"}`}
      style={
        editing
          ? {
              backgroundColor: `${c.ink}0F`,
              boxShadow: `inset 0 0 0 1px ${c.ink}26`,
            }
          : undefined
      }
    >
      {editing ? (
        <div className="space-y-1.5">
          <AutoTextarea
            autoFocus
            value={comment}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Note for the day"
            rows={1}
            maxHeight={200}
            className={`w-full bg-transparent border-0 p-0 ${cardSmall(roomy)} font-mono text-ink/70 placeholder:text-ink/30 focus:outline-none`}
          />
          <div className="flex items-center justify-between gap-1.5">
            <Tip text="Delete this note">
              <button
                onClick={onDelete}
                className={`${iconBtn} hover:bg-card/70`}
                style={{ color: c.exam }}
              >
                <Trash2 size={13} />
              </button>
            </Tip>
            <div className="flex items-center gap-0.5 shrink-0">
              <Tip text="Cancel changes">
                <button
                  onClick={onCancel}
                  className={`${iconBtn} text-ink/40 hover:text-ink hover:bg-card/70`}
                >
                  <Ban size={13} />
                </button>
              </Tip>
              <Tip text="Done">
                <button
                  onClick={onClose}
                  className={`${iconBtn} hover:bg-card/70`}
                  style={{ color: c.goalMet }}
                >
                  <Check size={14} />
                </button>
              </Tip>
            </div>
          </div>
        </div>
      ) : (
        <p
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={(e) => e.key === "Enter" && onOpen()}
          className={`${cardSmall(roomy)} font-mono text-ink/60 whitespace-pre-wrap cursor-pointer rounded hover:bg-ink/[0.05]`}
        >
          {comment}
        </p>
      )}
    </div>
  )
}
