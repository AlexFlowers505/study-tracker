/* ---------------------------------------------------------------
   "Are you sure?", for every freeze in the app.

   Spending is permanent — no refund if the day is later logged up to green,
   and nothing in Setup rewrites it — so it asks first. It used to ask on only
   one of the three ways in; the two strips spent on the click.

   **It names what is left, pool by pool.** "You have 4" is not the question:
   a custom streak holds two kinds of freeze that behave differently — an
   allowance granted every Monday and lost unused, and a bank earned a week at
   a time and carried until spent — and which one this comes out of decides
   whether it cost you anything by Sunday night. So the dialog prints both, as
   before and after, and spends them in the order the ledger actually spends
   them: the expiring one first.

   A rule with no weekly allowance shows a row of zeroes for it rather than
   hiding the row: which pool a freeze comes out of is the question this dialog
   exists to answer, and a pool that silently disappears is a worse answer than
   an empty one.
--------------------------------------------------------------- */

import { ArrowRight, Snowflake } from "lucide-react"
import type { DayKey } from "../types/model"
import { pluralOf, useT } from "../lib/i18n"

const nFreezes = (n: number) =>
  pluralOf(n, ["freeze", "freezes"], ["заморозка", "заморозки", "заморозок"])
const nViolations = (n: number) =>
  pluralOf(n, ["violation", "violations"], [
    "нарушение",
    "нарушения",
    "нарушений",
  ])
import { fmtDateLong } from "../lib/date"
import { CARD, btnBase } from "../lib/theme"
import { useModalDismiss } from "../ui/useModalDismiss"
import { Sentence } from "../ui/Sentence"
import { usePalette } from "../ui/useTheme"

/** One kind of freeze, and how many of it there are. */
export interface FreezePool {
  label: string
  /** What makes this pool different from the other one, in one line. */
  hint: string
  left: number
  total: number
}

/**
 * A freeze about to be spent. Assembled by the shell, which is the only place
 * that knows both streaks' accounting.
 */
export interface FreezeAsk {
  /** The rule this freeze belongs to. Freezes are per rule, always. */
  ruleId: string
  dayKey: DayKey
  /** **The one violation being bought** — `spec 017`. See `violationKey`. */
  violationKey: string
  /** What that site says, already quoted for `Sentence`. */
  line: string
  /** The streak's own name, so a page with five of them says which. */
  title: string
  tint: string
  /** What this one violation costs, stamped into the record on confirm. */
  cost: number
  /**
   * How many other violations on the same period are still unfrozen.
   *
   * Said out loud in the dialog, because `spec 017` reverses `spec 009`'s
   * refusal of partial spending and this is where that costs you: a day can
   * now be partly paid for and still break, with the freeze gone.
   */
  othersUnfrozen: number
  /** In spending order: the expiring pool first. */
  pools: FreezePool[]
}

export function FreezeConfirm({
  ask,
  onCancel,
  onConfirm,
}: {
  ask: FreezeAsk
  onCancel: () => void
  onConfirm: () => void
}) {
  const c = usePalette()
  const t = useT()
  const onBackdropClick = useModalDismiss(onCancel)

  // The same order the ledger spends in, so the arithmetic on screen is the
  // arithmetic that will happen. Taking from the bank first would quietly burn
  // an earned freeze and let a granted one evaporate on Sunday.
  // A fold rather than a running total: a binding reassigned during a render
  // is exactly the shape of the heatmap bug this codebase already paid for
  // once, and the compiler refuses it outright.
  const { rows, unpaid } = ask.pools.reduce<{
    rows: (FreezePool & { after: number })[]
    unpaid: number
  }>(
    (acc, pool) => {
      const take = Math.min(pool.left, acc.unpaid)
      return {
        rows: [...acc.rows, { ...pool, after: pool.left - take }],
        unpaid: acc.unpaid - take,
      }
    },
    { rows: [], unpaid: ask.cost },
  )
  const affordable = unpaid === 0

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4"
      onMouseDown={onBackdropClick}
    >
      <div className={`${CARD} w-full max-w-[360px] p-5`}>
        <p className="text-xs font-mono text-ink/80 mb-1">
          {t("Use {cost} on {date}?", {
            cost: nFreezes(ask.cost),
            date: fmtDateLong(ask.dayKey),
          })}
        </p>
        <p
          className="text-[10px] font-mono uppercase tracking-widest mb-3"
          style={{ color: ask.tint }}
        >
          {ask.title}
        </p>
        <p className="text-[11px] font-mono text-ink/75 mb-2">
          <Sentence text={ask.line} />
        </p>
        <p className="text-[11px] font-mono text-ink/45 mb-3">
          {t(
            "Bought against this one thing, at this price, for good. Logging the day up afterwards does not hand it back.",
          )}
        </p>
        {/* **The reversal, said where the money is spent.** `spec 009` refused
            partial spending precisely so a day that breaks anyway would not
            also cost you a freeze; `spec 017` allows it, because being able to
            choose which promise you are protecting at noon is worth more than
            being protected from a bad choice. It has to say so. */}
        {ask.othersUnfrozen > 0 && (
          <p
            className="text-[11px] font-mono mb-3 rounded-xl px-2.5 py-2"
            style={{ color: c.warn, backgroundColor: `${c.warn}14` }}
          >
            {t("{n} still unfrozen — this alone does not save the day.", {
              n: nViolations(ask.othersUnfrozen),
            })}
          </p>
        )}

        <div className="space-y-1.5 mb-4">
          {rows.map((pool) => (
            <div
              key={pool.label}
              className="flex items-center gap-2 rounded-xl px-3 py-2 bg-ink/[0.04]"
              title={pool.hint}
            >
              <Snowflake size={12} className="shrink-0" style={{ color: c.freeze }} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-ink/45 flex-1 min-w-0">
                {pool.label}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
                <span className="text-ink/40">
                  {pool.left} / {pool.total}
                </span>
                <ArrowRight size={10} className="text-ink/30" />
                <span
                  className="font-bold"
                  style={
                    pool.after < pool.left ? { color: c.freeze } : undefined
                  }
                >
                  {pool.after} / {pool.total}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide text-ink/60 hover:text-ink hover:bg-ink/5`}
          >
            {t("Cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={!affordable}
            className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed`}
            style={{ backgroundColor: c.freeze, color: c.onFill }}
          >
            {t("Use {cost}", { cost: nFreezes(ask.cost) })}
          </button>
        </div>
      </div>
    </div>
  )
}
