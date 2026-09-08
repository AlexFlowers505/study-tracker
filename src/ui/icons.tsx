import type { LucideProps } from "lucide-react"
import { FALLBACK_ICON, ICON_MAP, isFilledName } from "./iconLibrary"

/**
 * Draws a user-chosen icon by name, falling back when the name is unknown.
 *
 * A name ending in `.filled` is the same lucide component drawn solid. lucide
 * ships no filled set, so the variant is `fill="currentColor"` rather than a
 * second import — which is why this is the only place that has to know the
 * suffix exists, and why nothing that stores an icon name had to change.
 *
 * The fill goes **before** `rest`, so a caller that wants a different one —
 * a two-tone chip, say — still wins.
 */
export function RenderIcon({
  name,
  size = 14,
  ...rest
}: LucideProps & { name?: string }) {
  const Comp = (name && ICON_MAP[name]) || FALLBACK_ICON
  return (
    <Comp
      size={size}
      {...(name && isFilledName(name) ? { fill: "currentColor" } : {})}
      {...rest}
    />
  )
}
