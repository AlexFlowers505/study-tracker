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
        {/* **`min-w-0`, exactly as the title block beside it already has.**
            The action slot is a row of controls whose width is data — five
            chart modes come to 338px — and a flex item defaults to
            `min-width: auto`, so it refuses to go below its content and
            pushes the card, the page and the whole document sideways instead.
            One control inside one card gave a 320px phone fifty pixels of
            horizontal scroll. Wrapped here rather than at the four call
            sites: the constraint belongs to the slot, not to what is put in
            it, and the next caller should not have to know. */}
        {action && <div className="min-w-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}
