import { AlertCircle, Cloud, Flag, Star, Sun, TrendingUp } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { DayKey } from "../types/model"
import { fmtDateLong } from "../lib/date"
import { fmtHoursChart } from "../lib/time"
import { CARD } from "../lib/theme"

import { usePalette } from "../ui/useTheme"
export interface Extreme {
  key: DayKey
  hours: number
}

export interface Remarkable {
  bestDay?: Extreme | null
  bestWeek?: Extreme | null
  bestMonth?: Extreme | null
  worstDay?: Extreme | null
  worstWeek?: Extreme | null
  worstMonth?: Extreme | null
}

const fmtWeek = (k: DayKey) => `Week of ${fmtDateLong(k)}`

const fmtMonth = (k: string) => {
  const [y, m] = k.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })
}

export function RemarkableStats({ remarkable }: { remarkable: Remarkable }) {
  const c = usePalette()
  const items: {
    label: string
    data?: Extreme | null
    fmt: (k: string) => string
    tone: "good" | "bad"
    icon: LucideIcon
  }[] = [
    {
      label: "Best day",
      data: remarkable.bestDay,
      fmt: fmtDateLong,
      tone: "good",
      icon: Sun,
    },
    {
      label: "Best week",
      data: remarkable.bestWeek,
      fmt: fmtWeek,
      tone: "good",
      icon: TrendingUp,
    },
    {
      label: "Best month",
      data: remarkable.bestMonth,
      fmt: fmtMonth,
      tone: "good",
      icon: Star,
    },
    {
      label: "Worst day",
      data: remarkable.worstDay,
      fmt: fmtDateLong,
      tone: "bad",
      icon: Cloud,
    },
    {
      label: "Worst week",
      data: remarkable.worstWeek,
      fmt: fmtWeek,
      tone: "bad",
      icon: AlertCircle,
    },
    {
      label: "Worst month",
      data: remarkable.worstMonth,
      fmt: fmtMonth,
      tone: "bad",
      icon: Flag,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((it) => {
        const Icon = it.icon
        const color = it.tone === "good" ? c.goalMet : c.exam
        return (
          <div key={it.label} className={`${CARD} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-mono uppercase tracking-widest text-ink/50">
                {it.label}
              </span>
              <span
                className="flex items-center justify-center w-6 h-6 rounded-full"
                style={{ backgroundColor: `${color}1A` }}
              >
                <Icon size={12} style={{ color }} />
              </span>
            </div>
            {it.data ? (
              <>
                <span className="font-mono text-xl font-bold" style={{ color }}>
                  {fmtHoursChart(it.data.hours)}
                </span>
                <div className="text-[10px] font-mono text-ink/40 mt-1">
                  {it.fmt(it.data.key)}
                </div>
              </>
            ) : (
              <span className="font-mono text-xl font-bold text-ink/25">
                —
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
