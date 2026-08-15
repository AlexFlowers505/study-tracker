import type { ReactNode } from "react"
import { AlertCircle, CalendarDays, Clock } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { OverviewTotals } from "../lib/analytics"
import { fmtDaysWithMonths } from "../lib/date"
import { StatTile } from "../ui/StatTile"
import { StatsSection } from "./StatsSection"

export function OverviewStats({
  period,
  children,
}: {
  period: OverviewTotals
  /** The donuts. First in the block, under the heading — where the period's
   *  time went is one of the period's numbers, not a heading of its own. */
  children?: ReactNode
}) {
  const hours = (period.totalMinutes / 60).toFixed(1)

  // The lessons and exams tiles left with `spec 008`; what remains is the
  // hours-and-days half, which never read either.
  const stats: { label: string; value: ReactNode; icon: LucideIcon }[] = [
    { label: "Hours studied", value: hours, icon: Clock },
    {
      label: "Days since start",
      value: fmtDaysWithMonths(period.daysSinceStart),
      icon: CalendarDays,
    },
    { label: "Empty days", value: period.emptyDays, icon: AlertCircle },
  ]

  return (
    <StatsSection title="Stats" subtitle="Overview, selected period">
      {children}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <StatTile
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
          />
        ))}
      </div>
    </StatsSection>
  )
}
