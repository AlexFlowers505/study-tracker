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
    <div className={`${CARD} p-4`}>
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/40">
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
