/* ---------------------------------------------------------------
   The day dialog — the week's own card, at full width.

   There is no separate editor any more. There used to be: a read-only preview
   that flipped into a form. Two drawings of one day, and the form was the only
   way to add or delete anything from in here — which was strange on its face,
   because the week view needs no such mode to do exactly the same work. It was
   also a hole in the editing horizon: the pencil opened a form that wrote to
   days the cards themselves had already sealed.

   So the dialog is the card, with the same buttons and the same in-place
   editing, and nothing to enter or leave. Every keystroke goes straight to the
   day, as it does on the card, so closing never asks.
--------------------------------------------------------------- */

import { ArrowUpRight } from "lucide-react"
import type {
  Category,
  CounterUnit,
  Day,
  DayKey,
  Settings,
  Slot,
} from "../types/model"
import { fromKey, toKey } from "../lib/date"
import { Tip } from "../ui/Tip"
import { useModalDismiss } from "../ui/useModalDismiss"
import { btnBase } from "../lib/theme"
import { FullCardGrid } from "./DayCards"

export interface DayDialogProps {
  dateKey: DayKey
  dayEntry?: Day
  slots: Slot[]
  categories: Category[]
  counterUnits: CounterUnit[]
  settings: Settings
  onClose: () => void
  onChange: (patch: Partial<Day>) => void
}

export function DayQuickviewModal({
  dateKey,
  dayEntry,
  slots,
  categories,
  counterUnits,
  settings,
  onClose,
  onChange,
  onGoToDayView,
  onQuickAdd,
  onQuickAddSleep,
  onQuickAddSlot,
  canFreeze,
  onFreeze,
}: DayDialogProps & {
  onGoToDayView: (key: DayKey) => void
  /** The card's own quick actions, forwarded so the dialog keeps them. */
  onQuickAdd?: (key: DayKey) => void
  onQuickAddSleep?: (key: DayKey) => void
  onQuickAddSlot?: (key: DayKey, slotId: string) => void
  canFreeze?: (key: DayKey) => boolean
  onFreeze?: (key: DayKey) => void
}) {
  const onBackdropClick = useModalDismiss(onClose)
  const d = fromKey(dateKey)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={onBackdropClick}
    >
      <div className="w-full sm:max-w-[820px] max-h-[90vh] h-full sm:h-auto flex flex-col overflow-hidden">
        {/* No header shell. The card carries its own — the long date, the
            go-to-day button beside it, and the close X set apart in the action
            corner. Dialog chrome repeating the date above a card that already
            states it was a box inside a box. */}
        <div className="p-4 overflow-y-auto flex-1">
            <FullCardGrid
              dates={[d]}
              days={{ [dateKey]: dayEntry || {} }}
              slots={slots}
              categories={categories}
              counterUnits={counterUnits}
              settings={settings}
              todayKey={toKey(new Date())}
              big
              longDate
              // The card body is inert here — there is nowhere further to go —
              // so aiming wide of an entry does nothing.
              titleActions={
                <div className="flex items-center gap-1">
                  <Tip text="Go to day view">
                    <button
                      onClick={() => {
                        onGoToDayView(dateKey)
                        onClose()
                      }}
                      className={`${btnBase} p-1.5 rounded-lg text-ink/45 hover:text-ink hover:bg-ink/10`}
                    >
                      <ArrowUpRight size={17} />
                    </button>
                  </Tip>
                </div>
              }
              onClose={onClose}
              onQuickAddDay={onQuickAdd}
              onQuickAddSleepDay={onQuickAddSleep}
              onQuickAddSlotDay={onQuickAddSlot}
              canFreezeDay={canFreeze}
              onFreezeDay={onFreeze}
            onUpdateDay={(_key, patch) => onChange(patch)}
          />
        </div>
      </div>
    </div>
  )
}
