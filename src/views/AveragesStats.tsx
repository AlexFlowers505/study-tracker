/* ---------------------------------------------------------------
   Pace over the selected period.

   Down to one tile. The other six averaged lessons and exams, and both became
   user-defined counter units in `spec 008` — the per-unit equivalents will be
   designed against the new shape rather than ported field by field.
--------------------------------------------------------------- */

import { Clock } from "lucide-react"
import type { OverviewTotals } from "../lib/analytics"
import { StatTile } from "../ui/StatTile"

export function AveragesStats({ period }: { period: OverviewTotals }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatTile
        label="Avg hours / day"
        value={
          period.avgHoursPerDay != null
            ? `${period.avgHoursPerDay.toFixed(1)}h`
            : "—"
        }
        icon={Clock}
      />
    </div>
  )
}
