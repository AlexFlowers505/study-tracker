import { History } from "lucide-react"
import type { ChangeLogEntry } from "../types/model"
import { CHANGE_LOG_LIMIT } from "../lib/changelog"
import { CARD } from "../lib/theme"
import { PanelSection } from "./PanelSection"
import { usePalette } from "../ui/useTheme"


export function ChangeLogSection({
  entries,
  onClose,
}: {
  entries: ChangeLogEntry[]
  onClose?: () => void
}) {
  const c = usePalette()
  return (
    <PanelSection
      tint={c.changelog}
      icon={History}
      title="Change log"
      subtitle={`The last ${CHANGE_LOG_LIMIT} edits · oldest fall off the end`}
      closeLabel="Hide the change log"
      onClose={onClose}
    >
      {!entries.length ? (
        <p className="text-xs font-mono text-ink/50">
          Nothing recorded yet.
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto pr-1 space-y-2">
          {entries.map((e) => (
            <div key={e.id} className={`${CARD} p-3`}>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] font-bold shrink-0">
                  {new Date(e.at).toLocaleString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink/50 truncate">
                  {e.title}
                </span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {e.details.map((line, i) => (
                  <li
                    key={i}
                    className="text-[10px] font-mono text-ink/65 whitespace-pre-wrap"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </PanelSection>
  )
}
