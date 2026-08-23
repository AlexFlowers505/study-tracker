/* ---------------------------------------------------------------
   The trophy case — `spec 010`, part 5.

   Every other panel here reports on something you can still lose. This one
   reports on the only thing you cannot, which is why it is worth a panel of
   its own rather than a line in one of the others: a streak is fear, and an
   achievement is what the fear was for.

   **Earned first, then what is close.** An unearned one shows how far it has
   to go, because a goal you can see pulls harder than a surprise you cannot —
   and because "13 days to go" is a sentence you can act on this week. They are
   sorted by how near they are, so the top of that half is always the one worth
   looking at.

   A definition that has been deleted since it was earned still shows. That
   happened; the ledger is not in the business of forgetting, and the row reads
   from the figure stored with it rather than from a definition that is no
   longer there.
--------------------------------------------------------------- */

import { Trophy } from "lucide-react"
import type { Achievement, Project } from "../types/model"
import {
  earnedOn,
  fmtProgress,
  measureOf,
  progressOf,
} from "../lib/achievements"
import { fmtDateLong } from "../lib/date"
import { RenderIcon } from "../ui/icons"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"
import { PanelSection } from "./PanelSection"

const HOW_IT_WORKS =
  "An achievement is the one thing here you cannot lose. It is written once, " +
  "with the date and the figure it stood at, and nothing you do afterwards " +
  "un-earns it." +
  String.fromCharCode(10, 10) +
  "Lowering a threshold waits a week, like loosening a rule. Raising one " +
  "lands at once." +
  String.fromCharCode(10, 10) +
  "Keep them few. Six that mean something beat thirty that were generated."

export function AchievementsSection({
  project,
  today,
  onClose,
}: {
  project: Project
  today: Date
  onClose?: () => void
}) {
  const c = usePalette()
  const defs = project.settings.achievements || []
  const earned = project.earned || {}

  const done = Object.values(earned)
    .map((e) => ({
      badge: e,
      def: defs.find((d) => d.id === e.achievementId),
    }))
    .sort((a, b) => b.badge.earnedAt.localeCompare(a.badge.earnedAt))

  const open = defs
    .filter((d) => !earned[d.id])
    .map((def) => {
      const measure = measureOf(project, def)
      const value = progressOf(project, def, today)
      return {
        def,
        measure,
        value,
        left: Math.max(0, def.threshold - value),
        share: def.threshold > 0 ? Math.min(1, value / def.threshold) : 0,
      }
    })
    .sort((a, b) => b.share - a.share)

  return (
    <PanelSection
      tint={c.project}
      icon={Trophy}
      title="History"
      subtitle={
        defs.length || done.length
          ? `${done.length} earned${open.length ? ` · ${open.length} still to reach` : ""}`
          : "Nothing written yet — Setup has the tab"
      }
      action={
        <Tip multiline text={HOW_IT_WORKS}>
          <span className="text-[9px] font-mono uppercase tracking-widest text-ink/35 cursor-help underline decoration-dotted underline-offset-2">
            how this works
          </span>
        </Tip>
      }
      closeLabel="Hide the history"
      onClose={onClose}
    >
      {done.length > 0 && (
        <div className="grid gap-2 mb-3 sm:grid-cols-2 lg:grid-cols-3">
          {done.map(({ badge, def }) => (
            <div
              key={badge.achievementId}
              className="rounded-2xl bg-card shadow-sm px-3.5 py-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="flex items-center shrink-0"
                  style={{ color: def?.color || c.project }}
                >
                  {def ? (
                    <RenderIcon name={def.iconName} size={15} />
                  ) : (
                    <Trophy size={15} />
                  )}
                </span>
                <span className="text-[11px] font-mono font-bold truncate">
                  {def?.label || "a deleted achievement"}
                </span>
              </div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-ink/40">
                {fmtDateLong(earnedOn(badge.earnedAt))}
              </p>
            </div>
          ))}
        </div>
      )}

      {open.length > 0 && (
        <div className="space-y-1.5">
          {open.map(({ def, measure, value, left, share }) => (
            <Progress
              key={def.id}
              def={def}
              text={`${fmtProgress(value, measure)} of ${fmtProgress(def.threshold, measure)}`}
              left={`${fmtProgress(left, measure)} to go`}
              share={share}
            />
          ))}
        </div>
      )}

      {!done.length && !open.length && (
        <p className="text-[11px] font-mono text-ink/40 leading-relaxed">
          Write a few in Setup — the streak you are proudest of, the hours you
          want to have put in. Six that mean something are worth more than
          thirty that were generated.
        </p>
      )}
    </PanelSection>
  )
}

function Progress({
  def,
  text,
  left,
  share,
}: {
  def: Achievement
  text: string
  left: string
  share: number
}) {
  return (
    <Tip text={def.description || text}>
      <div className="w-full rounded-2xl bg-ink/[0.04] px-3.5 py-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="flex items-center shrink-0" style={{ color: def.color }}>
            <RenderIcon name={def.iconName} size={13} />
          </span>
          <span className="text-[11px] font-mono truncate text-ink/70">
            {def.label}
          </span>
          <span className="ml-auto shrink-0 text-[10px] font-mono tabular-nums text-ink/45">
            {text}
          </span>
        </div>
        {/* The bar is the sentence: how much of the way there you are. The
            figure beside it is what to do about it. */}
        <div className="h-1 rounded-full bg-ink/10 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${share * 100}%`, backgroundColor: def.color }}
          />
        </div>
        <p className="mt-1 text-[9px] font-mono uppercase tracking-widest text-ink/35">
          {left}
        </p>
      </div>
    </Tip>
  )
}
