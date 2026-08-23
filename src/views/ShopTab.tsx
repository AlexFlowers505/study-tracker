/* ---------------------------------------------------------------
   Setup's Rewards tab — what you have decided to let yourself have.

   The same Edit/Done draft the rules and the achievements use, and the same
   one-sided lock: raising a price lands at once because it can only ask more
   of you; lowering one waits a week. That is the edit the whole mechanism
   exists to slow down — without it the record player quietly drops from five
   hundred days to a hundred and fifty at exactly the moment you most want it
   to.
--------------------------------------------------------------- */

import { useState } from "react"
import { Lock, Pencil, ShieldCheck, TriangleAlert } from "lucide-react"
import type { Settings, ShopItem } from "../types/model"
import { newShopItem, priceEdit } from "../lib/shop"
import { LOCK_DAYS, lockFrom } from "../lib/customStreaks"
import { fmtDateLong, toKey } from "../lib/date"
import { BTN_SOFT, FIELD_SOFT_INLINE, btnBase } from "../lib/theme"
import { AutoTextarea } from "../ui/controls"
import { EditableList } from "../ui/EditableList"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

const NUM = `${FIELD_SOFT_INLINE} w-20 rounded-lg py-1 text-[11px] text-center`

const LOCK_HELP =
  "Raising a price lands at once — it can only ever ask more of you." +
  String.fromCharCode(10, 10) +
  "Lowering one waits a week, like loosening a rule. It is the edit this whole " +
  "mechanism exists to slow down: a reward you can make cheaper on the evening " +
  "you want it is not a reward, it is a purchase with extra steps." +
  String.fromCharCode(10, 10) +
  "The day you write one is yours to get the price right on."

function Form({
  item,
  onChange,
  today,
}: {
  item: ShopItem
  onChange: (next: ShopItem) => void
  today: Date
}) {
  const c = usePalette()
  const [draft, setDraft] = useState<ShopItem | null>(null)
  const [reason, setReason] = useState("")
  const settingUp = toKey(today) === item.createdOn
  const locked = !settingUp && toKey(today) < item.lockedUntil

  if (!draft)
    return (
      <div className="space-y-1.5 pl-1 pt-1">
        <p className="text-[11px] font-mono text-ink/70">
          {item.price} kept {item.price === 1 ? "day" : "days"}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
          <button
            type="button"
            onClick={() => {
              setReason("")
              setDraft(item)
            }}
            className={`${btnBase} ${BTN_SOFT} flex items-center gap-1 py-1.5`}
          >
            <Pencil size={10} /> Edit
          </button>
          <Tip multiline text={LOCK_HELP}>
            <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-ink/35 cursor-help underline decoration-dotted underline-offset-2">
              <Lock size={10} />
              {settingUp
                ? "Being set up — open until tomorrow"
                : locked
                  ? `Raising only until ${fmtDateLong(item.lockedUntil)}`
                  : "Open to any change"}
            </span>
          </Tip>
        </div>
      </div>
    )

  const edit = priceEdit(item, draft, LOCK_DAYS, today, reason)

  return (
    <div className="space-y-2 pl-1 pt-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="w-16 shrink-0 text-[9px] font-mono uppercase tracking-widest text-ink/40">
          Price
        </span>
        <input
          type="number"
          min={1}
          value={draft.price}
          onChange={(e) =>
            setDraft({
              ...draft,
              price: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className={NUM}
        />
        <span className="text-[11px] font-mono text-ink/55">kept days</span>
      </div>

      {/* Only when it is going the easy way. Asking you to justify raising
          your own bar would be asking the wrong question. */}
      {edit.changed && !edit.settingUp && !edit.narrowing && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="w-16 shrink-0 text-[9px] font-mono uppercase tracking-widest text-ink/40">
            Because
          </span>
          <AutoTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why it is getting cheaper"
            rows={1}
            maxHeight={120}
            className={`${FIELD_SOFT_INLINE} w-full rounded-lg py-1 text-[11px]`}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => setDraft(null)}
          className={`${btnBase} px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wide text-ink/55 hover:text-ink hover:bg-ink/5`}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!edit.allowed}
          onClick={() => {
            onChange(edit.next)
            setDraft(null)
          }}
          className={`${btnBase} px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed`}
          style={{ backgroundColor: c.accent, color: c.onFill }}
        >
          Done
        </button>

        {!edit.changed && (
          <span className="text-[10px] font-mono text-ink/40">
            No change to the price.
          </span>
        )}
        {edit.changed && (edit.settingUp || edit.narrowing) && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/50">
            <ShieldCheck size={11} />
            {edit.settingUp
              ? "Today is yours to get this right on."
              : "This only asks for more."}
          </span>
        )}
        {edit.needsReason && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/50">
            <TriangleAlert size={11} />
            Say why first. It goes on the record.
          </span>
        )}
        {edit.changed && !edit.settingUp && !edit.narrowing && !edit.needsReason && (
          <span
            className="flex items-center gap-1 text-[10px] font-mono"
            style={{ color: c.exam }}
          >
            <TriangleAlert size={11} />
            {edit.allowed
              ? `Cheaper — saving locks the price until ${fmtDateLong(lockFrom(today))}.`
              : `Cheaper. It waits until ${fmtDateLong(item.lockedUntil)}.`}
          </span>
        )}
      </div>
    </div>
  )
}

export function ShopTab({
  settings,
  onSave,
  today = new Date(),
}: {
  settings: Settings
  onSave: (next: Settings) => void
  today?: Date
}) {
  const items = settings.shop || []
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-mono text-ink/45 leading-relaxed">
        Things you have decided to let yourself have, priced in kept days.
        Taking one here is permitting yourself to buy it in life — the app keeps
        the ledger, you keep the promise. Price them so that having the thing
        would feel earned rather than allowed.
      </p>

      <EditableList<ShopItem>
        items={items}
        onChange={(shop) => onSave({ ...settings, shop })}
        noun="reward"
        minItems={0}
        newItem={() => newShopItem(today)}
        warningNote={(label) =>
          `Remove "${label}"? Anything already taken stays in the record — that purchase happened. Only the offer goes.`
        }
        extra={(item, update) => (
          <Form item={item} today={today} onChange={(next) => update(next)} />
        )}
      />
    </div>
  )
}
