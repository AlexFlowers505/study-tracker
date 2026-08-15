import type { ReactNode } from "react"
import { CARD } from "../lib/theme"

/** A white card with a heading, an optional subtitle and a corner control. */
export function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    // `min-w-0` because this is a grid item wrapping a Recharts container: a
    // grid item will not shrink below its content, and a chart's own minimum
    // was enough to push the card wider than the column and the page sideways
    // with it on a narrow phone.
    <div className={`${CARD} p-4 min-w-0`}>
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink/40">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
