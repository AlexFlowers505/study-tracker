import {
  Award,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Clock,
  Layers,
  TrendingUp,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { OverviewTotals } from "../lib/analytics"
import { StatTile } from "../ui/StatTile"
import { StatsSection } from "./StatsSection"

interface Item {
  label: string
  value: string | number
  icon: LucideIcon
}

export function AveragesStats({
  period,
  lessonsEnabled,
  examsEnabled,
}: {
  period: OverviewTotals
  lessonsEnabled: boolean
  examsEnabled: boolean
}) {
  const items: Item[] = [
    {
      label: "Avg hours / day",
      value:
        period.avgHoursPerDay != null
          ? `${period.avgHoursPerDay.toFixed(1)}h`
          : "—",
      icon: Clock,
    },
    lessonsEnabled && {
      label: "Avg hours / lesson",
      value:
        period.avgHoursPerLesson != null
          ? `${period.avgHoursPerLesson.toFixed(2)}h`
          : "—",
      icon: BookOpen,
    },
    lessonsEnabled && {
      label: "Avg lessons / day",
      value:
        period.avgLessonsPerDay != null
          ? period.avgLessonsPerDay.toFixed(2)
          : "—",
      icon: TrendingUp,
    },
    examsEnabled && {
      label: "Avg days / exam",
      value:
        period.avgDaysPerExam != null ? Math.round(period.avgDaysPerExam) : "—",
      icon: Award,
    },
    lessonsEnabled && {
      label: "Avg lessons / week",
      value:
        period.avgLessonsPerWeek != null
          ? period.avgLessonsPerWeek.toFixed(2)
          : "—",
      icon: CalendarDays,
    },
    lessonsEnabled && {
      label: "Avg lessons / month",
      value:
        period.avgLessonsPerMonth != null
          ? period.avgLessonsPerMonth.toFixed(2)
          : "—",
      icon: ClipboardList,
    },
    lessonsEnabled && {
      label: "Avg lessons / 3 months",
      value:
        period.avgLessonsPer3Months != null
          ? period.avgLessonsPer3Months.toFixed(2)
          : "—",
      icon: Layers,
    },
  ].filter(Boolean) as Item[]

  return (
    <StatsSection title="Averages" subtitle="Pace over the selected period">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {items.map((it) => (
          <StatTile
            key={it.label}
            label={it.label}
            value={it.value}
            icon={it.icon}
          />
        ))}
      </div>
    </StatsSection>
  )
}
