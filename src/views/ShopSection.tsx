/* ---------------------------------------------------------------
   The shop, and the balance it spends — `spec 010`, part 6.

   The balance lives here rather than in the streak row, because this is the
   moment it is for: you look at an account when you are about to spend it. It
   keeps a small figure up in the row so a bad day still has visible teeth, but
   the number in full, with what it will buy, belongs beside the thing it buys.

   **Buying is a ceremony, not a submit button.** The app cannot stop you
   buying the record player outside the app; the entire value of this is the
   ritual, and drawn as an ordinary row with an ordinary button it would rot
   inside a month. So it asks, it says what it will leave you with, and it says
   out loud that the point is to go and actually have the thing.

   Nothing is refundable and the history stays. That purchase happened.
--------------------------------------------------------------- */

import { useState } from "react"
import { ArrowRight, Gift, Lock } from "lucide-react"
import type { Project, ShopItem } from "../types/model"
import type { Balance } from "../lib/balance"
import { boughtOn, canBuy, purchaseHistory } from "../lib/shop"
import { fmtDateLong } from "../lib/date"
import { CARD, btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"
import { useModalDismiss } from "../ui/useModalDismiss"
import { usePalette } from "../ui/useTheme"
import { PanelSection } from "./PanelSection"

const HOW_IT_WORKS =
  "Buying something here is permitting yourself to buy it in life. The app is " +
  "the ledger of a promise you made yourself about spending; nothing else " +
  "enforces it." +
  String.fromCharCode(10, 10) +
  "Prices are in kept days — the same days the streak counts, which is why " +
  "there is no second currency to game." +
  String.fromCharCode(10, 10) +
  "Raising a price lands at once. Lowering one waits a week, like loosening a " +
  "rule. A purchase is never refunded."

export function ShopSection({
  project,
  balance,
  onBuy,
  onClose,
}: {
  project: Project
  balance: Balance | null
  /** Takes the reward. The caller owns the confirmation's consequences. */
  onBuy: (item: ShopItem) => void
  onClose?: () => void
}) {
  const c = usePalette()
  const [asking, setAsking] = useState<ShopItem | null>(null)
  const items = project.settings.shop || []
  const history = purchaseHistory(project)
  const available = balance?.total ?? 0

  return (
    <PanelSection
      tint={c.goalMet}
      icon={Gift}
      title="Rewards"
      subtitle={
        balance
          ? `${available} kept ${available === 1 ? "day" : "days"} to spend`
          : "The balance has not started counting yet"
      }
      action={
        <Tip multiline text={HOW_IT_WORKS}>
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35 cursor-help underline decoration-dotted underline-offset-2">
            how this works
          </span>
        </Tip>
      }
      closeLabel="Hide the rewards"
      onClose={onClose}
    >
      {balance && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-ink/[0.04] px-3.5 py-2.5 mb-3 text-[10px] font-mono uppercase tracking-widest text-ink/45">
          <span>
            <strong
              className="text-[15px] tabular-nums"
              style={{ color: available < 0 ? c.exam : c.goalMet }}
            >
              {available}
            </strong>{" "}
            to spend
          </span>
          <span className="tabular-nums">{balance.earned} earned</span>
          <span className="tabular-nums">{balance.spent} spent</span>
          {(balance.pendingKept > 0 || balance.pendingMissed > 0) && (
            <Tip text="Today and yesterday can still be written, so they are not counted yet.">
              <span className="tabular-nums cursor-help">
                {balance.pendingKept + balance.pendingMissed} not counted yet
              </span>
            </Tip>
          )}
        </div>
      )}

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => {
            const afford = canBuy(item, available)
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl bg-card shadow-sm px-3.5 py-3"
              >
                <span
                  className="flex items-center shrink-0"
                  style={{ color: item.color }}
                >
                  <RenderIcon name={item.iconName} size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-mono font-bold truncate">
                    {item.label}
                  </p>
                  {item.description && (
                    <p className="text-[10px] font-mono text-ink/40 truncate">
                      {item.description}
                    </p>
                  )}
                  {!afford && (
                    <p className="text-[10px] font-mono text-ink/40">
                      {item.price - available} more to go
                    </p>
                  )}
                </div>
                <div className="ml-auto shrink-0 text-right">
                  <p
                    className="text-[15px] font-mono font-bold tabular-nums"
                    style={{ color: afford ? c.goalMet : `${c.ink}55` }}
                  >
                    {item.price}
                  </p>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
                    days
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!afford}
                  onClick={() => setAsking(item)}
                  className={`${btnBase} shrink-0 px-3 py-2 rounded-full text-[10px] font-mono uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed`}
                  style={{ backgroundColor: c.goalMet, color: c.onFill }}
                >
                  Take it
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-[11px] font-mono text-ink/40 leading-relaxed">
          Nothing written yet. Setup has the tab — put the thing you have been
          circling for months in it, at a price that would make having it feel
          earned.
        </p>
      )}

      {history.length > 0 && (
        <div className="mt-4">
          <p className="text-[9px] font-mono uppercase tracking-widest text-ink/35 mb-1.5">
            Taken
          </p>
          <div className="space-y-1">
            {history.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-[10px] font-mono text-ink/45"
              >
                <Lock size={9} className="shrink-0" />
                <span className="truncate">{p.label}</span>
                <span className="ml-auto shrink-0 tabular-nums">
                  {p.price} days · {fmtDateLong(boughtOn(p.boughtAt))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {asking && (
        <BuyConfirm
          item={asking}
          available={available}
          onCancel={() => setAsking(null)}
          onConfirm={() => {
            onBuy(asking)
            setAsking(null)
          }}
        />
      )}
    </PanelSection>
  )
}

/**
 * The ceremony. It prints what it costs, what it leaves, and the one thing the
 * app cannot do for you — which is the whole point of the mechanism.
 */
function BuyConfirm({
  item,
  available,
  onCancel,
  onConfirm,
}: {
  item: ShopItem
  available: number
  onCancel: () => void
  onConfirm: () => void
}) {
  const c = usePalette()
  const onBackdropClick = useModalDismiss(onCancel)
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4"
      onMouseDown={onBackdropClick}
    >
      <div className={`${CARD} w-full max-w-[360px] p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: item.color }} className="flex items-center">
            <RenderIcon name={item.iconName} size={18} />
          </span>
          <p className="text-xs font-mono font-bold">{item.label}</p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-ink/[0.04] px-3 py-2.5 mb-3 text-[11px] font-mono">
          <span className="text-[10px] uppercase tracking-widest text-ink/45">
            Balance
          </span>
          <span className="ml-auto flex items-center gap-1.5 tabular-nums">
            <span className="text-ink/40">{available}</span>
            <ArrowRight size={10} className="text-ink/30" />
            <span className="font-bold" style={{ color: c.goalMet }}>
              {available - item.price}
            </span>
          </span>
        </div>

        <p className="text-[11px] font-mono text-ink/50 leading-relaxed mb-4">
          {item.price} kept days, spent for good — there is no refund and the
          record stays. Then go and actually have it: the app cannot do that
          half, and it is the half that makes the rest mean anything.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide text-ink/60 hover:text-ink hover:bg-ink/5`}
          >
            Not yet
          </button>
          <button
            onClick={onConfirm}
            className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide`}
            style={{ backgroundColor: c.goalMet, color: c.onFill }}
          >
            Take it
          </button>
        </div>
      </div>
    </div>
  )
}
