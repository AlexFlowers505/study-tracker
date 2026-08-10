/* ---------------------------------------------------------------
   The icon library.

   Slot and category icons are user-configurable, so they are chosen by name
   from this list and drawn through `RenderIcon`. Fixed UI chrome imports from
   `lucide-react` directly instead.

   Data, not components — keeping it out of `icons.tsx` is what lets that file
   stay fast-refreshable.
--------------------------------------------------------------- */

import type { LucideIcon } from "lucide-react"
import {
  Award,
  BookOpen,
  Bookmark,
  Brain,
  Building2,
  Bus,
  Calculator,
  Car,
  CheckSquare,
  ClipboardList,
  Clock,
  Cloud,
  Coffee,
  Compass,
  FileText,
  Flag,
  Gauge,
  GraduationCap,
  HelpCircle,
  Home,
  Layers,
  Lightbulb,
  ListChecks,
  MessageCircleQuestion,
  Moon,
  NotebookPen,
  PenLine,
  Rocket,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Target,
  Train,
  Zap,
} from "lucide-react"

export interface IconEntry {
  name: string
  icon: LucideIcon
}

export const ICON_LIBRARY: IconEntry[] = [
  { name: "Train", icon: Train },
  { name: "Bus", icon: Bus },
  { name: "Car", icon: Car },
  { name: "Sun", icon: Sun },
  { name: "Sunrise", icon: Sunrise },
  { name: "Sunset", icon: Sunset },
  { name: "Moon", icon: Moon },
  { name: "Cloud", icon: Cloud },
  { name: "Coffee", icon: Coffee },
  { name: "BookOpen", icon: BookOpen },
  { name: "NotebookPen", icon: NotebookPen },
  { name: "FileText", icon: FileText },
  { name: "MessageCircleQuestion", icon: MessageCircleQuestion },
  { name: "HelpCircle", icon: HelpCircle },
  { name: "ListChecks", icon: ListChecks },
  { name: "CheckSquare", icon: CheckSquare },
  { name: "Calculator", icon: Calculator },
  { name: "Brain", icon: Brain },
  { name: "GraduationCap", icon: GraduationCap },
  { name: "Lightbulb", icon: Lightbulb },
  { name: "Star", icon: Star },
  { name: "Target", icon: Target },
  { name: "Zap", icon: Zap },
  { name: "Flag", icon: Flag },
  { name: "Bookmark", icon: Bookmark },
  { name: "Layers", icon: Layers },
  { name: "Clock", icon: Clock },
  { name: "Home", icon: Home },
  { name: "Building2", icon: Building2 },
  { name: "PenLine", icon: PenLine },
  { name: "ClipboardList", icon: ClipboardList },
  { name: "Rocket", icon: Rocket },
  { name: "Compass", icon: Compass },
  { name: "Gauge", icon: Gauge },
  { name: "Award", icon: Award },
]

export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICON_LIBRARY.map((o) => [o.name, o.icon]),
)

export const FALLBACK_ICON = HelpCircle
