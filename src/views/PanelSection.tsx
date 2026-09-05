/* ---------------------------------------------------------------
   The panel that a toggle opens.

   Every one of them — the notice board, the account, the count filter, sleep,
   the streaks, the shop, the change log — is the same shell: a round icon
   badge, a title, an optional subtitle, an action slot and a close X. They
   read as siblings because they behave like siblings, so the chrome is
   written once here.

   **The tint is a rail, not a wash.** It used to be the whole surface — the
   colour at 8% behind everything, with a 2px border of it round the outside —
   and that was right while two panels could be open at once. It stopped being
   right when there were eight: every one washed a different colour, several
   of them hold charts and chips that are already coloured, and the page
   turned into a stack of tinted boxes with tinted things inside them. The
   tint was doing two jobs — *this is a section* and *this is which section* —
   and it only ever needed to do the second.

   So the surface is `bg-card`, the same raised card as everything else on the
   page, and the colour survives as a **three-pixel rail down the left edge**
   plus the icon badge. A rail says *which* at a glance, stays visible while
   you scroll past a long panel in a way a coloured title would not, and adds
   one saturated stripe to the page instead of a full field of colour.
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
      /* **Square on the left, round on the right.** A rail that follows a
         rounded corner tapers away into the curve at both ends, so the one
         saturated line on the panel is thinnest exactly where it starts and
         stops. Flat corners give it two clean ends and turn it into what it
         is meant to be — an edge, not a border that gave up. */
      className="rounded-r-2xl p-4 sm:p-5 mb-4 bg-card shadow-sm border-l-[3px]"
      style={{ borderLeftColor: tint }}
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
            {/* **The X has to carry what the wash used to say.** With the
                panel neutral, nothing else on it says the whole block can be
                closed — so it rests on a surface rather than appearing on
                hover, which is the same argument the composite's own toggle
                needed. */}
            <button
              onClick={onClose}
              className={`${btnBase} p-1 -mr-1 rounded-full text-ink/45 bg-ink/[0.05] hover:text-ink hover:bg-ink/[0.1]`}
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
