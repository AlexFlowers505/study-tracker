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
import { ChevronUp, Settings2, X } from "lucide-react"
import { useT } from "../lib/i18n"
import type { LucideIcon } from "lucide-react"
import { PANEL_INSET, btnBase } from "../lib/theme"
import { Tip } from "../ui/Tip"

/**
 * **The same panel, folded inside another one.**
 *
 * A rule's panel is now opened from the row that names it in the composite's
 * breakdown, which means it renders *inside* a panel. It cannot be a
 * `PanelSection` there: a rail inside a rail and a second close X on a block
 * that is already closable is a box in a box, which is the arrangement this
 * file's own notes were written to get rid of.
 *
 * So it takes the same props and draws them recessed — `PANEL_INSET`, which
 * is what everything laid on a panel wears — with the tint surviving as the
 * icon badge rather than as an edge, and the close button becoming a collapse
 * for the row that opened it.
 *
 * One signature, two shells, so the rule's five hundred lines of body do not
 * have to know which one it is standing in.
 */
export function NestedPanel({
  tint,
  icon: Icon,
  title,
  subtitle,
  closeLabel,
  onClose,
  action,
  onSettings,
  children,
}: PanelProps) {
  return (
    <div className={`panel-in ${PANEL_INSET} p-3 sm:p-4 mt-1.5`}>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="flex items-center justify-center w-5 h-5 rounded-full shrink-0"
          style={{ backgroundColor: `${tint}30` }}
        >
          <Icon size={11} style={{ color: tint }} />
        </span>
        <h4 className="font-sans font-extrabold uppercase tracking-tight text-xs text-ink flex-1 min-w-0 truncate">
          {title}
        </h4>
        {action}
        {onSettings && <SettingsButton onClick={onSettings} />}
        {onClose && (
          <Tip text={closeLabel}>
            <button
              onClick={onClose}
              className={`${btnBase} p-1 -mr-1 rounded-full text-ink/45 bg-ink/[0.05] hover:text-ink hover:bg-ink/[0.1]`}
            >
              <ChevronUp size={14} />
            </button>
          </Tip>
        )}
      </div>
      {subtitle && (
        <p className="text-[10px] font-mono text-ink/50 mb-3 uppercase tracking-widest">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  )
}

/** What both shells take. */
export interface PanelProps {
  tint: string
  icon: LucideIcon
  title: ReactNode
  subtitle?: ReactNode
  /** Tooltip on the close button — "Hide streaks", "Hide the filter". */
  closeLabel?: string
  onClose?: () => void
  /** Sits between the title and the close button. */
  action?: ReactNode
  /**
   * **Opens the Setup tab that configures this panel.**
   *
   * Half of these panels are a *reading* of something you wrote somewhere
   * else — the shelf, the rules, the achievements — and getting from the
   * reading to the writing was Setup, then the right tab out of nine, then
   * finding the row. The panel already knows which tab that is, so it says
   * so. Absent on the panels that configure nothing (the account, the change
   * log), because a gear that opens the first tab it can think of is worse
   * than no gear.
   */
  onSettings?: () => void
  children: ReactNode
}

/**
 * The gear, drawn the same on both shells.
 *
 * Quiet: it rests on the same faint disc the close X does and carries no
 * colour of its own. It is a way *out* of the panel to where the thing is
 * defined, which is a rarer act than closing and a much rarer one than
 * anything in the panel's body — so it sits with the chrome rather than
 * competing with the content.
 */
function SettingsButton({ onClick }: { onClick: () => void }) {
  const t = useT()
  return (
    <Tip text={t("Open these settings")}>
      <button
        onClick={onClick}
        className={`${btnBase} p-1 rounded-full text-ink/45 bg-ink/[0.05] hover:text-ink hover:bg-ink/[0.1]`}
      >
        <Settings2 size={15} />
      </button>
    </Tip>
  )
}

export function PanelSection({
  tint,
  icon: Icon,
  title,
  subtitle,
  closeLabel,
  onClose,
  action,
  onSettings,
  children,
}: PanelProps) {
  return (
    <div
      /* **Square on the left, round on the right.** A rail that follows a
         rounded corner tapers away into the curve at both ends, so the one
         saturated line on the panel is thinnest exactly where it starts and
         stops. Flat corners give it two clean ends and turn it into what it
         is meant to be — an edge, not a border that gave up. */
      /* **It arrives.** A panel appears when a toggle is pressed and, since
         the composite's breakdown can now send you from one to another,
         *swaps* for a different one on an ordinary click — and the two are
         rarely the same height, so 155px of page moved under the cursor
         between frames with nothing to say it had. Occasional, purposeful, and
         short: the shared 140ms fade the setup tabs already use, which under
         reduced motion is what it is anyway. */
      className="panel-in rounded-r-2xl p-4 sm:p-5 mb-4 bg-card shadow-sm border-l-[3px]"
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
        {onSettings && <SettingsButton onClick={onSettings} />}
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
