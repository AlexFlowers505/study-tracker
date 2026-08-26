/**
 * One of these, filled — the app's one shape for "pick exactly one".
 *
 * A rounded track with the chosen one filled, the same drawing the period
 * pills and `SegmentedControl` use, because they do the same job and the page
 * reads as fewer kinds of thing when the answer to "how do I switch this"
 * always looks alike. The active fill takes `c.onFill` for its text, never
 * `text-white`: in dark mode the accent goes light and white on it is worse
 * exactly as the rest of the page gets better.
 *
 * Lifted out of `StreakRulesTab` when `spec 014` gave the achievements form
 * the same controls. Two copies of a control is two places for it to drift.
 */

import { segBtn, segBtnStyle } from "./buttonStyles"
import { usePalette } from "./useTheme"

export function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (next: T) => void
}) {
  const c = usePalette()
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-ink/[0.07] p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          style={segBtnStyle(value === o.id, c)}
          className={segBtn(value === o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
