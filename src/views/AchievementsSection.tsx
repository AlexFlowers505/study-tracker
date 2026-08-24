/* ---------------------------------------------------------------
   The trophy case — `spec 010`, part 5.

   Every other panel here reports on something you can still lose. This one
   reports on the only thing you cannot, which is why it is worth a panel of
   its own rather than a line in one of the others: a streak is fear, and an
   achievement is what the fear was for.

   **One case, one shape.** Earned and unearned are the same tile, in one grid,
   earned first. They were two different things for a while — a grid of cards
   above a stacked list of progress bars — and that drew a line through the
   middle of the one collection the app has: what you are working towards
   stopped looking like the same kind of object as what you already hold, when
   it is the *same object* a few weeks earlier. A locked tile is the earned one
   with its date not yet written, so it is drawn as exactly that: dashed rather
   than raised, dimmed rather than absent, with a bar where the date will go.

   **What is close comes first among the locked.** "Thirteen days to go" is a
   sentence you can act on this week; a goal you can see pulls harder than a
   surprise you cannot.

   A definition deleted since it was earned still shows. That happened; the
   ledger is not in the business of forgetting, and the tile reads from the
   figure stored with it rather than from a definition that is no longer there.
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

/** Wide enough for two lines of a real name, narrow enough for three across. */
const GRID = "[grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]"

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
        left: fmtProgress(Math.max(0, def.threshold - value), measure),
        share: def.threshold > 0 ? Math.min(1, value / def.threshold) : 0,
        text: `${fmtProgress(value, measure)} of ${fmtProgress(def.threshold, measure)}`,
      }
    })
    .sort((a, b) => b.share - a.share)

  const total = done.length + open.length

  return (
    <PanelSection
      tint={c.project}
      icon={Trophy}
      title="History"
      subtitle={
        total
          ? `${done.length} of ${total} earned`
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
      {total > 0 && (
        <div className={`grid gap-2 ${GRID}`}>
          {done.map(({ badge, def }) => (
            <TrophyTile
              key={badge.achievementId}
              def={def}
              fallbackColor={c.project}
              when={fmtDateLong(earnedOn(badge.earnedAt))}
            />
          ))}
          {open.map(({ def, left, share, text }) => (
            <TrophyTile
              key={def.id}
              def={def}
              fallbackColor={c.project}
              when={`${left} to go`}
              share={share}
              tip={def.description || text}
            />
          ))}
        </div>
      )}

      {!total && (
        <p className="text-[11px] font-mono text-ink/40 leading-relaxed">
          Write a few in Setup — the streak you are proudest of, the hours you
          want to have put in. Six that mean something are worth more than
          thirty that were generated.
        </p>
      )}
    </PanelSection>
  )
}

/**
 * One tile. `share` present means not earned yet — which is the only
 * difference between the two states, and so is the only thing that switches
 * the drawing.
 */
function TrophyTile({
  def,
  fallbackColor,
  when,
  share,
  tip,
}: {
  /** Absent when the definition was deleted after it had been earned. */
  def?: Achievement
  fallbackColor: string
  when: string
  share?: number
  tip?: string
}) {
  const locked = share !== undefined
  const color = def?.color || fallbackColor

  const tile = (
    <div
      className={`w-full h-full rounded-2xl px-3.5 py-3 ${
        locked
          ? "bg-ink/[0.03] border border-dashed border-ink/15"
          : "bg-card shadow-sm"
      }`}
    >
      <span
        className={`flex items-center mb-2 ${locked ? "opacity-45" : ""}`}
        style={{ color }}
      >
        {def ? <RenderIcon name={def.iconName} size={17} /> : <Trophy size={17} />}
      </span>
      <p
        className={`text-[11px] font-mono font-bold leading-snug mb-1 ${
          locked ? "text-ink/55" : ""
        }`}
      >
        {def?.label || "a deleted achievement"}
      </p>
      <p className="text-[9px] font-mono uppercase tracking-widest text-ink/35">
        {when}
      </p>
      {locked && (
        // Where the date will go. The bar is the sentence — how much of the
        // way there you are — and it sits in the earned tile's date line so
        // the two tiles are the same object at two moments.
        <div className="h-[3px] rounded-full bg-ink/10 overflow-hidden mt-2">
          <div
            className="h-full rounded-full"
            style={{ width: `${share * 100}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  )

  return tip ? (
    <Tip text={tip} className="flex">
      {tile}
    </Tip>
  ) : (
    tile
  )
}
