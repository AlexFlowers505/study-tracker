import type { ReactNode } from "react"

/**
 * The plain heading a stats block sits under — no card, no tint, just a title
 * and a line saying what the numbers cover. Shared by Stats, Averages and
 * Remarkable so the three read as one column rather than three designs.
 */
export function StatsSection({
  title,
  subtitle,
  children,
}: {
  title: ReactNode
  subtitle: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm mb-1 text-[#1E2A33]">
        {title}
      </h3>
      <p className="text-[11px] font-mono text-[#1E2A33]/40 mb-3 uppercase tracking-widest">
        {subtitle}
      </p>
      {children}
    </div>
  )
}
