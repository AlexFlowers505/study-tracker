/* ---------------------------------------------------------------
   Project-wide totals and forecast — tinted so it reads as separate from
   everything else on the page, which is all period-scoped. It shares its
   amber with the streaks panel for exactly that reason.

   It used to have a second `sheet` shape, a fixed bottom drawer on phones.
   That was dropped because it covered the log it was meant to be compared
   against, and the panel now scrolls with the page at every width.

   The tiles are its own: `StatTile` is white with a grey badge, these are
   translucent with a tinted one, so they sit on the wash instead of
   punching through it.
--------------------------------------------------------------- */

import {
  Award,
  CalendarDays,
  Clock,
  Flag,
  ListChecks,
  Sigma,
  TrendingUp,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { OverviewTotals } from "../lib/analytics"
import { PROJECT_TINT } from "../lib/theme"
import { PanelSection } from "./PanelSection"

interface Tile {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
}

export function OverallStatsSection({
  overall,
  lessonsEnabled,
  examsEnabled,
  onClose,
}: {
  overall: OverviewTotals
  lessonsEnabled: boolean
  examsEnabled: boolean
  onClose?: () => void
}) {
  const lessonPct =
    overall.totalLessons > 0
      ? Math.min(
          100,
          Math.round((overall.lessonsDone / overall.totalLessons) * 100),
        )
      : 0
  const examPct =
    overall.totalExams > 0
      ? Math.min(
          100,
          Math.round((overall.examsDone / overall.totalExams) * 100),
        )
      : 0
  const hasEnough = !!(
    overall.avgMinutesPerLesson && overall.avgLessonsPerActiveDay
  )

  if (!lessonsEnabled && !examsEnabled) return null

  const baseItems: Tile[] = [
    lessonsEnabled && {
      label: "Lessons done",
      value: `${overall.lessonsDone}/${overall.totalLessons}`,
      sub: `${lessonPct}%`,
      icon: TrendingUp,
    },
    examsEnabled && {
      label: "Exams passed",
      value: `${overall.examsDone}/${overall.totalExams}`,
      sub: `${examPct}%`,
      icon: Award,
    },
  ].filter(Boolean) as Tile[]

  const forecastItems: Tile[] =
    lessonsEnabled && hasEnough && overall.lessonsRemaining > 0
      ? [
          {
            label: "Lessons remaining",
            value: overall.lessonsRemaining,
            icon: ListChecks,
          },
          {
            label: "Est. time remaining",
            value: overall.estRemainingMinutes
              ? `${(overall.estRemainingMinutes / 60).toFixed(1)}h`
              : "—",
            icon: Clock,
          },
          {
            label: "Est. time to finish",
            value:
              overall.estRemainingCalendarDays != null
                ? `${(overall.estRemainingCalendarDays / 30.44).toFixed(1)} mo (${overall.estRemainingCalendarDays}d)`
                : "—",
            icon: CalendarDays,
          },
          {
            label: "Est. finish date",
            value: overall.estFinishDate
              ? overall.estFinishDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—",
            icon: Flag,
          },
        ]
      : []

  const items = [...baseItems, ...forecastItems]

  return (
    <PanelSection
      tint={PROJECT_TINT}
      icon={Sigma}
      title="Overall stats"
      subtitle="Project totals & forecast — independent of the chosen period"
      closeLabel="Hide overall stats"
      onClose={onClose}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((it) => {
          const Icon = it.icon
          return (
            <div key={it.label} className="bg-white/70 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/50 truncate">
                  {it.label}
                </span>
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
                  style={{ backgroundColor: `${PROJECT_TINT}20` }}
                >
                  <Icon size={12} style={{ color: PROJECT_TINT }} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono font-bold text-xl">{it.value}</span>
                {it.sub && (
                  <span className="text-[10px] font-mono text-[#1E2A33]/40">
                    {it.sub}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {lessonsEnabled && !hasEnough && (
        <p className="mt-3 text-[11px] font-mono text-[#1E2A33]/60">
          Log a few more study days with lessons completed to unlock a forecast.
        </p>
      )}
      {lessonsEnabled && hasEnough && overall.lessonsRemaining === 0 && (
        <p className="mt-3 font-mono text-[#1E2A33] text-sm">
          Project complete — all {overall.totalLessons} lessons logged. 🎉
        </p>
      )}
    </PanelSection>
  )
}
