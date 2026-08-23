/* ---------------------------------------------------------------
   "Are you sure?", for every freeze in the app.

   Spending is permanent — no refund if the day is later logged up to green,
   and nothing in Setup rewrites it — so it asks first. It used to ask only on
   one of the three ways in: the day card confirmed, the goal streak's strip
   spent on the click, and a custom streak's strip spent on the click. Three
   paths to one irreversible act, two of them silent.

   **It names what is left, pool by pool.** "You have 4" is not the question:
   a custom streak holds two kinds of freeze that behave differently — an
   allowance granted every Monday and lost unused, and a bank earned a week at
   a time and carried until spent — and which one this comes out of decides
   whether it cost you anything by Sunday night. So the dialog prints both, as
   before and after, and spends them in the order the ledger actually spends
   them: the expiring one first.

   The goal streak has one pool and shows one row. Same dialog, because it is
   the same question about the same kind of thing, and two dialogs that merely
   looked alike would drift.
--------------------------------------------------------------- */

import { ArrowRight, Snowflake } from "lucide-react"
import type { DayKey } from "../types/model"
import { fmtDateLong } from "../lib/date"
import { CARD, btnBase } from "../lib/theme"
import { useModalDismiss } from "../ui/useModalDismiss"
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
  /** The custom rule this belongs to, or `null` for the goal streak. */
  ruleId: string | null
  dayKey: DayKey
  /** The streak's own name, so a page with five of them says which. */
  title: string
  tint: string
  /** How many freezes this day costs — the deficit, never less than one. */
  cost: number
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
          Use{" "}
          {ask.cost === 1 ? "a streak freeze" : `${ask.cost} streak freezes`} on{" "}
          {fmtDateLong(ask.dayKey)}?
        </p>
        <p
          className="text-[10px] font-mono uppercase tracking-widest mb-3"
          style={{ color: ask.tint }}
        >
          {ask.title}
        </p>
        <p className="text-[11px] font-mono text-ink/45 mb-3">
          The day keeps your streak but stays short of what you asked of it.
          Spent for good — logging the day up afterwards does not hand it back.
        </p>

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
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!affordable}
            className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed`}
            style={{ backgroundColor: c.freeze, color: c.onFill }}
          >
            Use {ask.cost === 1 ? "a freeze" : `${ask.cost} freezes`}
          </button>
        </div>
      </div>
    </div>
  )
}
