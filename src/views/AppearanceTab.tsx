/* ---------------------------------------------------------------
   Setup's one tab that is not about a project.

   Everything else in Setup is stored on the project and travels with the
   account. This is stored on the device, which is the whole reason it needs
   saying out loud in the panel: signing in on a phone will not bring the
   choice with you, and that is deliberate rather than broken — the same
   logbook is reasonably light at a desk and dark in bed.
--------------------------------------------------------------- */

import { Monitor, Moon, Sun } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { ThemeChoice } from "../lib/theme"
import { btnBase } from "../lib/theme"
import { setThemeChoice, usePalette, useThemeChoice } from "../ui/useTheme"

const OPTIONS: { id: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
]

export function AppearanceTab() {
  const c = usePalette()
  const choice = useThemeChoice()

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink/50 mb-2">
          Theme
        </div>
        {/* Three tiles rather than a switch: "system" is not a third position
            on a light–dark slider, it is a different kind of answer — "follow
            whatever this device is doing" — and a slider would have to invent
            somewhere to put it. */}
        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map((o) => {
            const active = choice === o.id
            const Icon = o.icon
            return (
              <button
                key={o.id}
                onClick={() => setThemeChoice(o.id)}
                aria-pressed={active}
                style={
                  active
                    ? { borderColor: c.accent, color: c.accent }
                    : undefined
                }
                className={`${btnBase} flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 ${
                  active
                    ? "bg-ink/[0.03]"
                    : "border-ink/10 text-ink/55 hover:text-ink hover:bg-ink/5"
                }`}
              >
                <Icon size={18} />
                <span className="text-[10px] font-mono uppercase tracking-widest">
                  {o.label}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-[11px] font-mono text-ink/45 mt-2.5 leading-relaxed">
          {choice === "system"
            ? "Following this device's own light/dark setting, and changing with it."
            : `Always ${choice}, whatever this device is set to.`}
        </p>
      </div>

      <p className="text-[11px] font-mono text-ink/40 leading-relaxed border-t border-ink/10 pt-4">
        Saved on this device, not to your account — every browser and phone you
        sign in from picks its own.
      </p>
    </div>
  )
}
