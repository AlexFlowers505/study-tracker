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

   **The account is a card, and the rest of the arithmetic is a footnote to
   it.** The balance had four figures on one recessed strip, all the same size,
   and the one you look at before spending — what you have — had to be found
   among the three you do not. Earned, spent and not-yet-counted are how the
   number got there; they belong under it, not beside it.

   Nothing is refundable and the history stays. That purchase happened. A
   reward can be taken more than once, so a taken item stays on the shelf and
   says when it last went — struck through and removed would be a different
   promise from the one the ledger makes.
--------------------------------------------------------------- */

import { useState } from "react"
import { ArrowRight, Check, Gift, Lock, Maximize2 } from "lucide-react"
import type { Achievement, Project, ShopItem } from "../types/model"
import { t, pluralOf, useT } from "../lib/i18n"

const nPoints = (n: number) =>
  pluralOf(n, ["point", "points"], ["очко", "очка", "очков"])
import type { Balance } from "../lib/balance"
import { boughtOn, canBuy, missingFor, requiredBy, purchaseHistory } from "../lib/shop"
import { fmtDateLong } from "../lib/date"
import { CARD, PANEL_INSET, btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"
import { useModalDismiss } from "../ui/useModalDismiss"
import { usePalette } from "../ui/useTheme"
import { PanelSection } from "./PanelSection"

/** Paragraph by paragraph — see `lib/locales/ru.ts` for why. */
const howItWorks = () =>
  [
    t("Buying something here is permitting yourself to buy it in life. The app is the ledger of a promise you made yourself about spending; nothing else enforces it."),
    t("Prices are in points. A finished day pays 10 and a missed one takes 20 — nothing else mints them, and the rate is not a setting, so there is nothing here to game."),
    t("Buying spends points and nothing else. Your streak is a run of days and is never touched by it."),
    t("Raising a price lands at once. Lowering one waits a week, like loosening a rule. A purchase is never refunded."),
  ].join(String.fromCharCode(10, 10))

export function ShopSection({
  project,
  balance,
  onBuy,
  onOpenAccount,
  onClose,
  onSettings,
}: {
  project: Project
  balance: Balance | null
  /** Takes the reward. The caller owns the confirmation's consequences. */
  onBuy: (item: ShopItem) => void
  /** Back to the account, which is where the arithmetic lives now. */
  onOpenAccount?: () => void
  onClose?: () => void
  /** Opens Setup's Rewards tab — where the shelf is written. */
  onSettings?: () => void
}) {
  const c = usePalette()
  const t = useT()
  const [asking, setAsking] = useState<ShopItem | null>(null)
  /** The reward opened in full — `spec 025`. See `ItemDetail`. */
  const [showing, setShowing] = useState<ShopItem | null>(null)
  const items = project.settings.shop || []
  const achievements = project.settings.achievements || []
  const earned = project.earned || {}
  const history = purchaseHistory(project)
  const available = balance?.total ?? 0

  return (
    <PanelSection
      tint={c.goalMet}
      icon={Gift}
      title={t("Rewards")}
      subtitle={
        balance
          ? t("{points} to spend", { points: nPoints(available) })
          : t("The balance has not started counting yet")
      }
      action={
        <Tip multiline text={howItWorks()}>
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35 cursor-help underline decoration-dotted underline-offset-2">
            how this works
          </span>
        </Tip>
      }
      closeLabel={t("Hide the rewards")}
      onClose={onClose}
      onSettings={onSettings}
    >
      {/* **One line, not four** — `spec 016`, part 4. The comment this block
          used to carry defended the *moment*: you look at an account when you
          are about to spend it, and that is still true and still served. What
          moved is the arithmetic — earned, spent, not-yet-counted answer *how
          did it get there*, which is a different question and now has a panel
          of its own. */}
      {balance && (
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-ink/45">
            {t("On the account")}
          </span>
          <strong
            className="text-lg font-mono font-extrabold tabular-nums leading-none"
            style={{ color: available < 0 ? c.exam : c.goalMet }}
          >
            {available}
          </strong>
          <span className="text-[10px] font-mono uppercase tracking-widest text-ink/40">
            {t(available === 1 ? "unit:point" : "unit:points")}
          </span>
          {onOpenAccount && (
            <button
              type="button"
              onClick={onOpenAccount}
              className={`${btnBase} ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide hover:bg-ink/5`}
              style={{ color: c.accent }}
            >
              {t("Where it came from")}
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => {
            const afford = canBuy(item, available, achievements, earned)
            const missing = missingFor(item, achievements, earned)
            // A reward can be taken more than once, so this is a note on the
            // row rather than a reason to remove it.
            const last = history.find((h) => h.itemId === item.id)
            return (
              <div
                key={item.id}
                className={`${PANEL_INSET} flex items-center gap-3 px-3.5 py-3`}
              >
                {/* **The name and its icon open it; the row does not.** A
                    reward has two acts on it — look at it properly, and take
                    it — and a row that is itself a button can hold only one.
                    The same split the composite's breakdown rows make. */}
                <button
                  type="button"
                  onClick={() => setShowing(item)}
                  className={`${btnBase} flex items-center gap-3 min-w-0 flex-1 text-left rounded-xl -m-1 p-1 hover:bg-ink/[0.04]`}
                >
                  <span
                    className="flex items-center shrink-0"
                    style={{ color: item.color }}
                  >
                    <RenderIcon name={item.iconName} size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-mono font-bold truncate flex items-center gap-1.5">
                      {item.label}
                      <Maximize2 size={10} className="shrink-0 text-ink/30" />
                    </p>
                    {item.description && (
                      <p className="text-[10px] font-mono text-ink/40 truncate">
                        {item.description}
                      </p>
                    )}
                    {available < item.price && (
                      <p className="text-[10px] font-mono text-ink/40">
                        {item.price - available} more to go
                      </p>
                    )}
                    {/* Named, not counted. *Which* thing you have still to do
                        is the only part of this that can be acted on. */}
                    {missing.length > 0 && (
                      <p className="text-[10px] font-mono text-ink/40 truncate">
                        {t("Needs first: {names}", {
                          names: missing.map((a) => a.label).join(", "),
                        })}
                      </p>
                    )}
                    {last && (
                      <p className="text-[10px] font-mono text-ink/30 truncate">
                        last taken {fmtDateLong(boughtOn(last.boughtAt))}
                      </p>
                    )}
                  </div>
                </button>
                <div className="ml-auto shrink-0 text-right">
                  <p
                    className="text-[15px] font-mono font-bold tabular-nums"
                    style={{ color: afford ? c.goalMet : `${c.ink}55` }}
                  >
                    {item.price}
                  </p>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
                    {t(item.price === 1 ? "unit:point" : "unit:points")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!afford}
                  onClick={() => setAsking(item)}
                  className={`${btnBase} shrink-0 px-3 py-2 rounded-full text-[10px] font-mono uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed`}
                  style={{ backgroundColor: c.goalMet, color: c.onFill }}
                >
                  {t("Take it")}
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-[11px] font-mono text-ink/40 leading-relaxed">
          {t(
            "Nothing written yet. Setup has the tab — put the thing you have been circling for months in it, at a price that would make having it feel earned.",
          )}
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
                  {p.price} pts · {fmtDateLong(boughtOn(p.boughtAt))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showing && (
        <ItemDetail
          item={showing}
          available={available}
          achievements={achievements}
          missing={missingFor(showing, achievements, earned)}
          takenTimes={history.filter((h) => h.itemId === showing.id).length}
          lastTaken={
            history.find((h) => h.itemId === showing.id)?.boughtAt ?? null
          }
          canTake={canBuy(showing, available, achievements, earned)}
          onClose={() => setShowing(null)}
          onTake={() => {
            setAsking(showing)
            setShowing(null)
          }}
        />
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
 * **A reward, opened.**
 *
 * The shelf is a list of rows, and a row is the wrong size for the thing it
 * is describing: the description is truncated to a line, the price is a
 * figure in a corner, and what is being offered — the actual object you have
 * been circling for months — reads as an entry in a table of settings. The
 * mechanism only works if you want the thing, and a row is very good at
 * making you not.
 *
 * So it opens: the icon at a size you can see, the description in full, the
 * price as a distance rather than a number, and what you must have earned
 * first with a tick against the ones you have. Nothing here is a second way
 * to buy — `Take it` hands straight to `BuyConfirm`, which is still the only
 * ceremony, because two dialogs that can both spend points is two places for
 * the ritual to be skipped.
 */
function ItemDetail({
  item,
  available,
  missing,
  achievements,
  takenTimes,
  lastTaken,
  canTake,
  onClose,
  onTake,
}: {
  item: ShopItem
  available: number
  /** The requirements not yet earned, already resolved. */
  missing: Achievement[]
  achievements: Achievement[]
  takenTimes: number
  lastTaken: string | null
  canTake: boolean
  onClose: () => void
  onTake: () => void
}) {
  const c = usePalette()
  const t = useT()
  const onBackdropClick = useModalDismiss(onClose)
  const short = Math.max(0, item.price - available)
  // A price of nought is a reward gated on achievements alone, and a bar that
  // is full before you have done anything says the wrong thing about it.
  const progress = item.price > 0 ? Math.min(1, available / item.price) : 1
  const asked = requiredBy(item)
    .map((id) => achievements.find((a) => a.id === id))
    .filter((a): a is Achievement => !!a)

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4"
      onMouseDown={onBackdropClick}
    >
      <div
        className={`${CARD} w-full max-w-[400px] p-6 max-h-[85vh] overflow-y-auto`}
        role="dialog"
        aria-modal
        aria-label={item.label}
      >
        <div className="flex items-center gap-3 mb-4">
          <span
            className="flex items-center justify-center w-12 h-12 rounded-2xl shrink-0"
            style={{ backgroundColor: `${item.color}1A`, color: item.color }}
          >
            <RenderIcon name={item.iconName} size={26} />
          </span>
          <div className="min-w-0">
            <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm text-ink">
              {item.label}
            </h3>
            {takenTimes > 0 && (
              <p className="text-[10px] font-mono text-ink/35">
                {t("Taken {n} times · last {date}", {
                  n: takenTimes,
                  date: lastTaken ? fmtDateLong(boughtOn(lastTaken)) : "",
                })}
              </p>
            )}
          </div>
        </div>

        {item.description && (
          <p className="text-[12px] font-mono text-ink/60 leading-relaxed mb-4 whitespace-pre-line">
            {item.description}
          </p>
        )}

        {item.price > 0 && (
          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-1.5">
              <strong
                className="text-2xl font-mono font-extrabold tabular-nums leading-none"
                style={{ color: short ? `${c.ink}80` : c.goalMet }}
              >
                {item.price}
              </strong>
              <span className="text-[10px] font-mono uppercase tracking-widest text-ink/40">
                {t(item.price === 1 ? "unit:point" : "unit:points")}
              </span>
              <span className="ml-auto text-[10px] font-mono text-ink/45 tabular-nums">
                {short
                  ? t("{n} to go", { n: short })
                  : t("You have {n}", { n: available })}
              </span>
            </div>
            {/* The account as a distance. `120 points` is a fact about the
                thing; how far off you are is a fact about you, and it is the
                one that decides whether you come back tomorrow. */}
            <div className="h-1.5 rounded-full overflow-hidden bg-ink/[0.08]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: short ? c.accent : c.goalMet,
                }}
              />
            </div>
          </div>
        )}

        {asked.length > 0 && (
          <div className="mb-4">
            <p className="text-[9px] font-mono uppercase tracking-widest text-ink/35 mb-1.5">
              {t("Needs first")}
            </p>
            <div className="space-y-1">
              {asked.map((a) => {
                const done = !missing.some((m) => m.id === a.id)
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 text-[11px] font-mono"
                    style={{ color: done ? c.goalMet : `${c.ink}80` }}
                  >
                    <span className="shrink-0 flex items-center">
                      {done ? <Check size={12} /> : <Lock size={11} />}
                    </span>
                    <span className="truncate">{a.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide text-ink/60 hover:text-ink hover:bg-ink/5`}
          >
            {t("Close")}
          </button>
          <button
            onClick={onTake}
            disabled={!canTake}
            className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed`}
            style={{ backgroundColor: c.goalMet, color: c.onFill }}
          >
            {t("Take it")}
          </button>
        </div>
      </div>
    </div>
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
          {item.price} points, spent for good — there is no refund and the
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
