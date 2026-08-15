/* ---------------------------------------------------------------
   The tinted panel that the period bar's toggles open.

   Every one of them — the count filter, overall stats, sleep, streaks, the
   change log — is the same shell: a wash of one colour, a round icon badge,
   a title, an optional subtitle, and a close X in its own corner. They read
   as siblings because they behave like siblings, so the chrome is written
   once here and the tint is what tells them apart.
--------------------------------------------------------------- */

import type { ReactNode } from "react"
import { X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { btnBase } from "../lib/theme"
import { Tip } from "../ui/Tip"

export function PanelSection({
  tint,
  icon: Icon,
  title,
  subtitle,
  closeLabel,
  onClose,
  action,
  children,
}: {
  tint: string
  icon: LucideIcon
  title: ReactNode
  subtitle?: ReactNode
  /** Tooltip on the close button — "Hide streaks", "Hide the filter". */
  closeLabel?: string
  onClose?: () => void
  /** Sits between the title and the close button. */
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 border-2 mb-4"
      style={{ backgroundColor: `${tint}14`, borderColor: `${tint}45` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
          style={{ backgroundColor: `${tint}30` }}
        >
          <Icon size={13} style={{ color: tint }} />
        </span>
        <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm text-ink flex-1">
          {title}
        </h3>
        {action}
        {onClose && (
          <Tip text={closeLabel}>
            <button
              onClick={onClose}
              className={`${btnBase} p-1 -mr-1 rounded-full text-ink/40 hover:text-ink hover:bg-ink/10`}
            >
              <X size={16} />
            </button>
          </Tip>
        )}
      </div>
      {subtitle && (
        <p className="text-[11px] font-mono text-ink/50 mb-3 uppercase tracking-widest">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  )
}
