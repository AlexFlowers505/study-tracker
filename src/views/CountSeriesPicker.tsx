/* ---------------------------------------------------------------
   The legend for a by-slot counter chart, and the way you build it.

   Whole-day mode has a chip per series and you strike out what you don't want.
   That does not survive the slot split: six counters across six slots is
   thirty-six chips switched on under a chart nobody can read, and the question
   people actually have — "youtube in the evening, and youtube at night" — is
   two series out of those thirty-six.

   So this asks in the order the question is thought: **which counter, then
   which slot**, one pair at a time. A counter can be picked again for another
   slot, which is the whole point; the same pair twice is not offered, since
   two identical series would draw on top of each other.

   The chips that result are the legend and the control at once — each carries
   the cross that removes it, so there is no second list saying the same thing.
--------------------------------------------------------------- */

import { useState } from "react"
import { ChevronLeft, Plus, X } from "lucide-react"
import type { Slot } from "../types/model"
import type { CounterPick, CounterThing } from "../lib/counterSeries"
import { pickId, slotOpacity } from "../lib/counterSeries"
import { btnBase } from "../lib/theme"
import { PopoverMenu } from "../ui/PopoverMenu"

/**
 * The two steps, in one panel.
 *
 * Its own component so the step resets: `PopoverMenu` unmounts its panel when
 * it closes, and a half-navigated menu that reopens on the slot list of
 * whatever you picked last time is a menu that has forgotten what it is for.
 */
function PickerPanel({
  things,
  slots,
  picks,
  onAdd,
  close,
}: {
  things: CounterThing[]
  slots: Slot[]
  picks: CounterPick[]
  onAdd: (pick: CounterPick) => void
  close: () => void
}) {
  const [thingId, setThingId] = useState<string | null>(null)
  const thing = things.find((t) => t.id === thingId)

  if (!thing) {
    return (
      <div className="max-h-64 overflow-y-auto">
        <p className="px-2.5 pt-1 pb-2 text-[9px] font-mono uppercase tracking-widest text-ink/40">
          Which counter
        </p>
        {things.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setThingId(t.id)}
            className={`${btnBase} w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-ink/5`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: t.color }}
            />
            <span className="text-[11px] font-mono text-ink/80 truncate">
              {t.label}
            </span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      <button
        type="button"
        onClick={() => setThingId(null)}
        className={`${btnBase} w-full flex items-center gap-1 px-2 pt-1 pb-2 text-[9px] font-mono uppercase tracking-widest text-ink/40 hover:text-ink`}
      >
        <ChevronLeft size={11} />
        <span className="truncate" style={{ color: thing.color }}>
          {thing.label}
        </span>
        <span className="ml-auto normal-case tracking-normal">which slot</span>
      </button>
      {slots.map((s, i) => {
        // Already on the chart. Shown rather than hidden, so the list does not
        // change shape between visits and you can see that it is there.
        const taken = picks.some(
          (p) => p.thingId === thing.id && p.slotId === s.id,
        )
        return (
          <button
            key={s.id}
            type="button"
            disabled={taken}
            onClick={() => {
              onAdd({ thingId: thing.id, slotId: s.id })
              close()
            }}
            className={`${btnBase} w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left ${
              taken ? "opacity-40 cursor-default" : "hover:bg-ink/5"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: thing.color,
                opacity: slotOpacity(i),
              }}
            />
            <span className="text-[11px] font-mono text-ink/80 truncate">
              {s.label}
            </span>
            {taken && (
              <span className="ml-auto text-[9px] font-mono text-ink/40">
                added
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function CountSeriesPicker({
  things,
  slots,
  picks,
  onChange,
}: {
  things: CounterThing[]
  slots: Slot[]
  picks: CounterPick[]
  onChange: (next: CounterPick[]) => void
}) {
  // Only the picks this mode can actually draw — the same filter
  // `counterSeries` applies, so the legend and the chart cannot disagree.
  const shown = picks.flatMap((p) => {
    const thing = things.find((t) => t.id === p.thingId)
    const index = slots.findIndex((s) => s.id === p.slotId)
    return thing && index >= 0 ? [{ pick: p, thing, slot: slots[index], index }] : []
  })

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
      {shown.map(({ pick, thing, slot, index }) => (
        <span
          key={pickId(pick.thingId, pick.slotId)}
          style={{
            borderColor: thing.color,
            backgroundColor: `${thing.color}1A`,
            color: thing.color,
          }}
          className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest pl-2 pr-1 py-1 rounded-full border"
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: thing.color, opacity: slotOpacity(index) }}
          />
          {thing.label} · {slot.label}
          <button
            type="button"
            onClick={() =>
              onChange(
                picks.filter(
                  (x) =>
                    !(x.thingId === pick.thingId && x.slotId === pick.slotId),
                ),
              )
            }
            className={`${btnBase} p-0.5 rounded-full opacity-60 hover:opacity-100 hover:bg-ink/10`}
            aria-label={`Remove ${thing.label} in ${slot.label}`}
          >
            <X size={10} />
          </button>
        </span>
      ))}

      {shown.length === 0 && (
        <span className="text-[10px] font-mono text-ink/40">
          Nothing plotted yet — pick a counter and a slot.
        </span>
      )}

      {things.length > 0 && slots.length > 0 && (
        <PopoverMenu
          width={220}
          label="Add a counter in a slot"
          triggerClassName={`${btnBase} flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border border-dashed border-ink/25 text-ink/45 hover:text-ink hover:border-ink/50`}
          trigger={
            <>
              <Plus size={10} />
              Add
            </>
          }
        >
          {(close) => (
            <PickerPanel
              things={things}
              slots={slots}
              picks={picks}
              onAdd={(p) => onChange([...picks, p])}
              close={close}
            />
          )}
        </PopoverMenu>
      )}
    </div>
  )
}
