import { LogOut, Settings2 } from 'lucide-react'
import { APP_NAME } from '../lib/defaults'
import { fmtDateLong } from '../lib/date'
import { btnBase } from '../lib/theme'
import { RenderIcon } from '../ui/icons'
import { TimeLensMark } from '../ui/Brand'
import { Tip } from '../ui/Tip'

export function TopBar({
  onOpenSetup,
  projectName,
  projectIcon,
  startDate,
  endDate,
  cloudEnabled,
  session,
  onSignOut,
}: {
  onOpenSetup: () => void
  projectName: string
  projectIcon: string
  startDate?: string | null
  endDate?: string | null
  cloudEnabled: boolean
  session: { user?: { email?: string } } | null
  onSignOut: () => void
}) {
  // Scrolls away with the page — the period bar below is the thing worth
  // keeping within reach, and it carries its own period label.
  return (
    <header className="bg-page border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-ink flex items-center justify-center shrink-0">
            <TimeLensMark size={18} className="text-page" />
          </div>
          {/* The app is the headline; the project it happens to be showing is
              the line under it, with its own icon so it stays identifiable
              once there is more than one. */}
          <div className="min-w-0">
            <h1 className="font-sans font-extrabold uppercase tracking-tight text-lg leading-none truncate">
              {APP_NAME}
            </h1>
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink/50 font-mono mt-0.5 min-w-0">
              <RenderIcon name={projectIcon} size={11} className="shrink-0" />
              <span className="truncate">{projectName}</span>
              {startDate && (
                <span className="shrink-0 hidden sm:inline text-ink/40">
                  · {fmtDateLong(startDate)} →{" "}
                  {endDate ? fmtDateLong(endDate) : "ongoing"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSetup}
            className={`${btnBase} flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide px-3 py-2 rounded-full bg-card shadow-sm hover:bg-ink/5`}
          >
            <Settings2 size={13} /> Setup
          </button>
          {cloudEnabled && session && (
            <Tip text={session.user?.email}>
              <button
                onClick={onSignOut}
                className={`${btnBase} flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide px-3 py-2 rounded-full bg-card shadow-sm hover:bg-ink/5`}
              >
                <LogOut size={13} />
              </button>
            </Tip>
          )}
        </div>
      </div>
    </header>
  )
}
