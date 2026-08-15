/* ---------------------------------------------------------------
   Switches — for turning optional features on and off.
--------------------------------------------------------------- */

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { btnBase } from "../lib/theme"

import { usePalette } from "./useTheme"
/** Wrap with <Tip> for a hover explanation. */
export function SwitchToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label?: string
}) {
  const c = usePalette()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{ backgroundColor: checked ? c.accent : `${c.ink}25` }}
      className={`${btnBase} relative inline-flex items-center w-8 h-[18px] rounded-full shrink-0`}
    >
      <span
        className={`inline-block w-3.5 h-3.5 bg-card rounded-full shadow transform transition-transform duration-150 ${
          checked ? "translate-x-[15px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  )
}

/** A switch dressed as a menu row, for use inside `PopoverMenu`. */
export function MenuToggle({
  label,
  icon: Icon,
  checked,
  onChange,
  hint,
}: {
  label: string
  icon?: LucideIcon
  checked: boolean
  onChange: (next: boolean) => void
  hint?: ReactNode
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer hover:bg-ink/5"
    >
      <span className="mt-[1px] shrink-0">
        <SwitchToggle checked={checked} onChange={onChange} label={label} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[11px] font-mono text-ink/80">
          {Icon && <Icon size={12} className="text-ink/45 shrink-0" />}
          {label}
        </span>
        {hint && (
          <span className="block text-[10px] font-mono text-ink/40 mt-0.5">
            {hint}
          </span>
        )}
      </span>
    </div>
  )
}
