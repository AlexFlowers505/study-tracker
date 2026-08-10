import type { LucideProps } from "lucide-react"
import { FALLBACK_ICON, ICON_MAP } from "./iconLibrary"

/** Draws a user-chosen icon by name, falling back when the name is unknown. */
export function RenderIcon({
  name,
  size = 14,
  ...rest
}: LucideProps & { name?: string }) {
  const Comp = (name && ICON_MAP[name]) || FALLBACK_ICON
  return <Comp size={size} {...rest} />
}
