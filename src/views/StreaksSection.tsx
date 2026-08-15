import { useMemo } from "react"
import {
  CalendarCheck,
  CalendarDays,
  Flame,
  Snowflake,
  Trophy,
} from "lucide-react"
import type { Project } from "../types/model"
import { FREEZE_CAP, freezeLedger } from "../lib/freezes"
import { computeStreaks } from "../lib/streaks"

import { StatTile } from "../ui/StatTile"
import { Tip } from "../ui/Tip"
import { PanelSection } from "./PanelSection"

import { usePalette } from "../ui/useTheme"
const plural = (n: number) => (n === 1 ? "" : "s")

const HOW_IT_WORKS = [
  "A day counts when it hits its goal; a goal of 0 counts as met.",
  "Ignoring a day, a week or a month does NOT affect a streak — otherwise marking the bad days ignored would be the easy way to fake one.",
  "The count filter does not affect it either: streaks always cover every slot and category, whatever the page is showing.",
  "Weeks and months are judged by their days, not by summed hours.",
  `A week with no missed day earns one freeze, up to ${FREEZE_CAP}. Spend one on a red day and it counts as kept — the day turns blue, not green: the goal was still missed.`,
  "A verdict is sealed once the following week ends. Editing a week after that changes its colours but never its freeze.",
].join("\n\n")

export function StreaksSection({
  project,
  onClose,
}: {
  project: Project
  onClose?: () => void
}) {
  const c = usePalette()
  const streaks = useMemo(() => computeStreaks(project), [project])
  const ledger = useMemo(() => freezeLedger(project), [project])
  const goalsOff = project.settings.goalsEnabled === false

  return (
    <PanelSection
      tint={c.project}
      icon={Flame}
      title="Streaks"
      subtitle={
        /* Downwards. This is the tallest bubble in the app and the panel it
           sits in opens just under the sticky period bar, so anchored above its
           trigger the first lines ran off the top of the viewport — and the
           first lines are the ones that say what a streak even is. */
        <Tip multiline side="bottom" text={HOW_IT_WORKS}>
          <span className="cursor-help underline decoration-dotted underline-offset-2">
            Whole project · how streaks and freezes work
          </span>
        </Tip>
      }
      closeLabel="Hide streaks"
      onClose={onClose}
      action={
        goalsOff ? null : (
          <Tip
            text={`Unused freezes, capped at ${FREEZE_CAP}${
              ledger.forfeited
                ? ` — ${ledger.forfeited} earned beyond the cap were lost`
                : ""
            }`}
          >
            <span
              className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
              style={{
                color: c.freeze,
                backgroundColor: `${c.freeze}1A`,
              }}
            >
              <Snowflake size={11} />
              {ledger.balance} / {FREEZE_CAP}
            </span>
          </Tip>
        )
      }
    >
      {goalsOff ? (
        // No metric, no streak. Said out loud rather than shown as zeroes,
        // which would read as "you have no streak" instead of "this is off".
        <p className="text-xs font-mono text-ink/50">
          Streaks need the effectiveness meter. Turn daily goals on in Setup to
          use them.
        </p>
      ) : !streaks ? (
        <p className="text-xs font-mono text-ink/50">
          Nothing to measure yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label="Current day streak"
            value={streaks.currentDays}
            sub={`day${plural(streaks.currentDays)}`}
            icon={Flame}
          />
          <StatTile
            label="Best day streak"
            value={streaks.bestDays}
            sub={`day${plural(streaks.bestDays)}`}
            icon={CalendarCheck}
          />
          <StatTile
            label="Best week streak"
            value={streaks.bestWeeks}
            sub={`week${plural(streaks.bestWeeks)}`}
            icon={CalendarDays}
          />
          <StatTile
            label="Best month streak"
            value={streaks.bestMonths}
            sub={`month${plural(streaks.bestMonths)}`}
            icon={Trophy}
          />
        </div>
      )}
    </PanelSection>
  )
}
