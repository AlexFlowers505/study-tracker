import type { ReactNode } from "react"
import { AlertCircle, Award, BookOpen, CalendarDays, Clock } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { OverviewTotals } from "../lib/analytics"
import { fmtDaysWithMonths } from "../lib/date"
import { StatTile } from "../ui/StatTile"
import { StatsSection } from "./StatsSection"

export function OverviewStats({
  period,
  lessonsEnabled,
  examsEnabled,
  children,
}: {
  period: OverviewTotals
  lessonsEnabled: boolean
  examsEnabled: boolean
  /** The donuts. First in the block, under the heading — where the period's
   *  time went is one of the period's numbers, not a heading of its own. */
  children?: ReactNode
}) {
  const hours = (period.totalMinutes / 60).toFixed(1)

  // Lessons and exams for the chosen period live here rather than above the
  // log: this section is already "the numbers for the selected period", and it
  // covers every period — day, week, month, 3 months, year, all time, custom —
  // instead of only week and month. The per-week/per-day rates are next door in
  // Averages.
  const stats: { label: string; value: ReactNode; icon: LucideIcon }[] = [
    { label: "Hours studied", value: hours, icon: Clock },
    lessonsEnabled && {
      label: "Lessons completed",
      value: period.lessonsDone,
      icon: BookOpen,
    },
    examsEnabled && {
      label: "Exams passed",
      value: period.examsDone,
      icon: Award,
    },
    {
      label: "Days since start",
      value: fmtDaysWithMonths(period.daysSinceStart),
      icon: CalendarDays,
    },
    { label: "Empty days", value: period.emptyDays, icon: AlertCircle },
  ].filter(Boolean) as { label: string; value: ReactNode; icon: LucideIcon }[]

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
