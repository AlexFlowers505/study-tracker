/* ---------------------------------------------------------------
   The account — `spec 016`, part 4.

   `ShopSection` used to hold the balance card, under a comment defending it:
   *the balance lives here because this is the moment it is for; you look at an
   account when you are about to spend it.* That defends the **moment**, not
   the four figures. The moment needs one line — and it still has one, beside
   the shop's own heading. The four figures answer a different question,
   *how did it get there*, and that question gets this.

   **The total large, and the arithmetic under it.** What you have is what a
   decision is made against; earned, spent and not-yet-counted are how it got
   there and belong below rather than beside.

   **Signed bars, and a running total as a figure rather than a second line.**
   Two axes in one card is what `StreakChart` refuses everywhere else.

   **Rewards and purchases as a list, not as marks on the chart.** They are not
   earnings-by-day, they are events, and a spike that is one purchase rather
   than one terrible week is a chart lying about its own axis.
--------------------------------------------------------------- */

import { ArrowRight, Coins } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { Project } from "../types/model"
import { t, pluralOf, useT } from "../lib/i18n"

const nDays = (n: number) =>
  pluralOf(n, ["day", "days"], ["день", "дня", "дней"])
import type { Balance } from "../lib/balance"
import type { EarningBar } from "../lib/earnings"
import {
  STEP_CAPTION,
  accountEvents,
  earningBars,
  stepFor,
} from "../lib/earnings"
import { daysBetween, fmtDateLong } from "../lib/date"
import {
  PANEL_INSET,
  btnBase,
  chartTooltip,
  chartTooltipItem,
} from "../lib/theme"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"
import { PanelSection } from "./PanelSection"

/** Paragraph by paragraph — see `lib/locales/ru.ts` for why. */
const howItWorks = () =>
  [
    t("A finished day pays 10 points; a missed one takes 20. Neither figure is a setting — what matters is the ratio, and at two to one the account grows only above a two-thirds keep rate."),
    t("Today and yesterday can still be written, so they are not counted yet. A day's mark is written once when it leaves that window and never revisited: this is the one figure here you can spend, so editing a Tuesday must not move a balance something was already bought against."),
  ].join(String.fromCharCode(10, 10))

export function AccountSection({
  project,
  balance,
  rangeStart,
  rangeEnd,
  onOpenShop,
  onClose,
}: {
  project: Project
  balance: Balance
  /** The period bar's range — the chart shows exactly what the page shows. */
  rangeStart: Date
  rangeEnd: Date
  onOpenShop: () => void
  onClose?: () => void
}) {
  const c = usePalette()
  const t = useT()
  const step = stepFor(daysBetween(rangeStart, rangeEnd) + 1)
  const bars = earningBars(project, rangeStart, rangeEnd, step)
  const events = accountEvents(project)
  const inRange = bars.reduce((sum, b) => sum + b.value, 0)

  return (
    <PanelSection
      tint={c.project}
      icon={Coins}
      title={t("The account")}
      subtitle={<Tip multiline text={howItWorks()}>
          <span className="cursor-help">{t("How points work")}</span>
        </Tip>}
      closeLabel={t("Hide the account")}
      onClose={onClose}
      action={
        <button
          type="button"
          onClick={onOpenShop}
          className={`${btnBase} flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide hover:bg-ink/5`}
          style={{ color: c.project }}
        >
          {t("To the shop")}
          <ArrowRight size={12} />
        </button>
      }
    >
      {/* The one figure a decision is made against, and the arithmetic under
          rather than beside it. */}
      <div className={`${PANEL_INSET} px-4 py-3 mb-3`}>
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-ink/45">
            {t("On the account")}
          </span>
          <span className="ml-auto flex items-baseline gap-1.5">
            <strong
              className="text-2xl font-mono font-extrabold tabular-nums leading-none"
              style={{ color: balance.total < 0 ? c.exam : c.goalMet }}
            >
              {balance.total}
            </strong>
            <span className="text-[10px] font-mono uppercase tracking-widest text-ink/40">
              {t(balance.total === 1 ? "unit:point" : "unit:points")}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[9px] font-mono uppercase tracking-widest text-ink/30">
          <span className="tabular-nums">
            {t("{n} pts earned", { n: balance.earned })}
          </span>
          <span className="tabular-nums">
            {t("{n} pts spent", { n: balance.spent })}
          </span>
          <span className="tabular-nums">
            {t("{n} days counted", { n: balance.sealed })}
          </span>
          {(balance.pendingKept > 0 || balance.pendingMissed > 0) && (
            <Tip
              text={t(
                "Today and yesterday can still be written, so they are not counted yet.",
              )}
            >
              <span className="tabular-nums cursor-help">
                {t("{days} not counted yet", {
                  days: nDays(balance.pendingKept + balance.pendingMissed),
                })}
              </span>
            </Tip>
          )}
        </div>
      </div>

      {/* **The period's own total as a figure, never a second line.** Two axes
          in one card is what every other chart here refuses. */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-ink/45">
          {t("Earned this period")}
        </span>
        <strong
          className="text-sm font-mono font-bold tabular-nums"
          style={{ color: inRange < 0 ? c.exam : inRange > 0 ? c.goalMet : undefined }}
        >
          {inRange > 0 ? `+${inRange}` : inRange}
        </strong>
        {/* Without this a −60 bar in the year view reads as one catastrophic
            day rather than as a quiet month with three misses. */}
        <span className="ml-auto text-[9px] font-mono uppercase tracking-widest text-ink/30">
          {STEP_CAPTION[step]}
        </span>
      </div>

      {bars.length > 0 && (
        <div className="min-w-0 mb-3" style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${c.ink}22`} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fontFamily: "monospace", fill: `${c.ink}66` }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={12}
              />
              <YAxis
                tick={{ fontSize: 9, fontFamily: "monospace", fill: `${c.ink}66` }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={36}
              />
              {/* Nought is where the two directions meet, so it is drawn. */}
              <ReferenceLine y={0} stroke={`${c.ink}44`} />
              <Tooltip
                contentStyle={chartTooltip(c)}
                /* The bars are coloured per `<Cell>`, so the series carries no
                   colour and Recharts falls back to a literal black row —
                   invisible on the dark card. The sign is already in the
                   figure; the row only has to be readable. */
                itemStyle={chartTooltipItem(c)}
                formatter={(v, _n, item) => {
                  const row = item?.payload as EarningBar | undefined
                  const kept = row?.kept ?? 0
                  const missed = row?.missed ?? 0
                  return [
                    t("{v} — {kept} kept, {missed} missed", {
                      v: `${Number(v) > 0 ? "+" : ""}${v}`,
                      kept,
                      missed,
                    }),
                    t("Points"),
                  ]
                }}
              />
              <Bar dataKey="value" isAnimationActive={false} radius={[2, 2, 2, 2]}>
                {bars.map((b) => (
                  <Cell key={b.key} fill={b.value < 0 ? c.exam : c.goalMet} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-ink/40 mb-1.5">
            {t("Everything else that moved it")}
          </p>
          <div className="space-y-1">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex items-baseline gap-2 text-[11px] font-mono"
              >
                <span
                  className="tabular-nums font-bold shrink-0 w-12 text-right"
                  style={{ color: e.points < 0 ? c.exam : c.goalMet }}
                >
                  {e.points > 0 ? `+${e.points}` : e.points}
                </span>
                <span className="text-ink/70 min-w-0 truncate">{e.label}</span>
                <span className="ml-auto shrink-0 text-[9px] uppercase tracking-widest text-ink/30">
                  {fmtDateLong(e.at.slice(0, 10))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelSection>
  )
}
