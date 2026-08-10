import { useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { AutoTextarea } from "../ui/controls"

/**
 * Inline, auto-saving note for a whole day, week or month. Mount it with a
 * `key` tied to the period so it resets its local buffer when the person
 * navigates somewhere else.
 */
export function NoteCard({
  label,
  icon: Icon,
  value,
  onSave,
}: {
  label: string
  icon: LucideIcon
  value?: string
  onSave: (text: string) => void
}) {
  const [text, setText] = useState(value || "")
  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== (value || "")) onSave(text)
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  // Deliberately not a card: it reads as one more muted line of period
  // metadata, the same weight as "10.3h studied · goal 19.5h", and grows only
  // when there's something written in it.
  return (
    <div className="flex items-start gap-1.5 mb-4">
      <Icon size={12} className="text-[#1E2A33]/30 shrink-0 mt-[3px]" />
      <AutoTextarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={label}
        rows={1}
        maxHeight={160}
        className="flex-1 bg-transparent border-0 p-0 text-xs font-mono text-[#1E2A33]/50 placeholder:text-[#1E2A33]/30 focus:outline-none focus:text-[#1E2A33]/80"
      />
    </div>
  )
}
