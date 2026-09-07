/* ---------------------------------------------------------------
   Setup's one tab that is not about a project.

   Everything else in Setup is stored on the project and travels with the
   account. Both of these are stored on the device, which is the whole reason
   it needs saying out loud in the panel: signing in on a phone will not bring
   either choice with you, and that is deliberate rather than broken — the same
   logbook is reasonably light at a desk and dark in bed, and reasonably read
   in one language on a work machine and another at home.

   **Two settings, one shape.** Three tiles for the theme and two for the
   language, drawn by one component: they are the same question — *pick one of
   these* — and the page reads as fewer kinds of thing when the answer always
   looks alike. The language tiles carry their own names (`Русский`, not
   `Russian`), because the one person who cannot read the current language is
   exactly the person reaching for that control.
--------------------------------------------------------------- */

import { Languages, Monitor, Moon, Sun } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { ThemeChoice } from "../lib/theme"
import { btnBase } from "../lib/theme"
import type { Locale } from "../lib/i18n"
import { LOCALES, setLocale, useLocale, useT } from "../lib/i18n"
import { setThemeChoice, usePalette, useThemeChoice } from "../ui/useTheme"

const THEMES: { id: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
]

function Tiles<T extends string>({
  options,
  value,
  onPick,
  columns,
}: {
  options: { id: T; label: string; icon?: LucideIcon }[]
  value: T
  onPick: (id: T) => void
  columns: string
}) {
  const c = usePalette()
  return (
    <div className={`grid ${columns} gap-2`}>
      {options.map((o) => {
        const active = value === o.id
        const Icon = o.icon
        return (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            aria-pressed={active}
            style={active ? { borderColor: c.accent, color: c.accent } : undefined}
            className={`${btnBase} flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 ${
              active
                ? "bg-ink/[0.03]"
                : "border-ink/10 text-ink/55 hover:text-ink hover:bg-ink/5"
            }`}
          >
            {Icon && <Icon size={18} />}
            <span className="text-[10px] font-mono uppercase tracking-widest">
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function AppearanceTab() {
  const t = useT()
  const choice = useThemeChoice()
  const locale = useLocale()

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink/50 mb-2">
          {t("Language")}
        </div>
        <Tiles
          columns="grid-cols-2"
          value={locale}
          onPick={(id: Locale) => setLocale(id)}
          options={LOCALES.map((l) => ({
            id: l.id,
            label: l.native,
            icon: Languages,
          }))}
        />
        <p className="text-[11px] font-mono text-ink/45 mt-2.5 leading-relaxed">
          {t(
            "The interface, the generated sentences and the dates. Your own names — activities, counters, rules — are your data and are left exactly as you wrote them.",
          )}
        </p>
      </div>

      <div className="border-t border-ink/10 pt-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink/50 mb-2">
          {t("Theme")}
        </div>
        {/* Three tiles rather than a switch: "system" is not a third position
            on a light–dark slider, it is a different kind of answer — "follow
            whatever this device is doing" — and a slider would have to invent
            somewhere to put it. */}
        <Tiles
          columns="grid-cols-3"
          value={choice}
          onPick={(id: ThemeChoice) => setThemeChoice(id)}
          options={THEMES.map((o) => ({ ...o, label: t(o.label) }))}
        />
        <p className="text-[11px] font-mono text-ink/45 mt-2.5 leading-relaxed">
          {choice === "system"
            ? t(
                "Following this device's own light/dark setting, and changing with it.",
              )
            : t("Always {theme}, whatever this device is set to.", {
                theme: t(choice === "dark" ? "Dark" : "Light").toLowerCase(),
              })}
        </p>
      </div>

      <p className="text-[11px] font-mono text-ink/40 leading-relaxed border-t border-ink/10 pt-4">
        {t(
          "Saved on this device, not to your account — every browser and phone you sign in from picks its own.",
        )}
      </p>
    </div>
  )
}
