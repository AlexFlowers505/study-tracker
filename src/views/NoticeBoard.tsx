/* ---------------------------------------------------------------
   The board — `spec 016`, part 2.

   **It is the only place.** `StreakAlarms` is gone and so is the list under
   the streak row's chevron. Everything a notice could say is here and nowhere
   else, which is what the design turns on: the app had a loud place and a
   silent place and nothing in between, and the answer was not a third volume
   but that **volume stops being a placement decision and becomes a property of
   the thing being said.**

   That is a real trade and it is worth naming: danger no longer comes and
   finds you. What makes it acceptable is that the board is open by default and
   its state persists, so the normal condition of the app is that everything is
   already on screen. What covers the abnormal one is the bell's badge, which
   takes the colour of the worst level inside.

   **Two weights, not four.** `danger` and `warning` are blocks with a wash and
   an inset ring; `notice` and `good` are lines with a coloured dot and nothing
   else. Open it and everything is visible at once, and red still reads as red
   because green is not shouting beside it. One weight for all four would
   rebuild the dashboard `spec 010` part 3 deleted, for the reason it deleted
   it.

   **It is always about today**, whatever the period bar shows. A notice is a
   thing you can act on, the levels are built on the difference between already
   spent and still owed, and *still owed* about last Tuesday is not a sentence.
--------------------------------------------------------------- */

import { Bell } from "lucide-react"
import type { Notice, NoticeLevel } from "../lib/notices"
import { LEVELS, countByLevel, levelColour } from "../lib/notices"
import { btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { Sentence } from "../ui/Sentence"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"
import { PanelSection } from "./PanelSection"

/** What each level is called on its own filter button. */
const LEVEL_WORD: Record<NoticeLevel, string> = {
  danger: "danger",
  warning: "warning",
  notice: "notice",
  good: "good",
}

const LEVEL_TIP: Record<NoticeLevel, string> = {
  danger: "Already broken, or out of reach today. Only a freeze is left.",
  warning: "Still reachable, and the margin is gone.",
  notice: "Still owed, and there is room.",
  good: "Nothing owed and nothing spent.",
}

/** The loud half: a block with a wash, an inset ring and its lines. */
function NoticeBlock({
  notice,
  active,
  onClick,
}: {
  notice: Notice
  active: boolean
  onClick?: () => void
}) {
  const c = usePalette()
  const tint = levelColour(notice.level, c)
  const inner = (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: tint }} className="flex items-center shrink-0">
          {notice.icon ? (
            <RenderIcon name={notice.icon} size={13} />
          ) : (
            <Bell size={13} />
          )}
        </span>
        <span
          className="text-[11px] font-mono font-bold uppercase tracking-wide truncate"
          style={{ color: tint }}
        >
          {notice.title}
        </span>
      </div>
      {/* A line each, not a dot between them: two conditions are two things to
          look at, and running them together behind a separator made the reader
          do the separating before they could start reading. */}
      {notice.lines.map((line, i) => (
        <p key={i} className="text-[11px] font-mono text-ink/75 leading-relaxed">
          <Sentence text={line} />
        </p>
      ))}
      {notice.detail && (
        <p className="text-[10px] font-mono text-ink/45 leading-relaxed mt-0.5">
          {notice.detail}
        </p>
      )}
    </>
  )

  const style = {
    backgroundColor: `${tint}14`,
    boxShadow: `inset 0 0 0 1px ${tint}${active ? "AA" : "55"}`,
  }
  if (!onClick)
    return (
      <div className="w-full rounded-2xl px-3.5 py-2.5" style={style}>
        {inner}
      </div>
    )
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={style}
      className={`${btnBase} w-full text-left rounded-2xl px-3.5 py-2.5 hover:brightness-105`}
    >
      {inner}
    </button>
  )
}

/**
 * The quiet half: a dot, a name, the text.
 *
 * No surface, no border, no wash — a reminder wearing the volume of a caption.
 * The colour on the dot is the level's, and it is there to place the line in
 * the list rather than to raise an alarm.
 */
function NoticeLine({
  notice,
  onClick,
}: {
  notice: Notice
  onClick?: () => void
}) {
  const c = usePalette()
  const tint = levelColour(notice.level, c)
  const body = (
    <div className="flex items-baseline gap-2 min-w-0 py-0.5">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 translate-y-[-1px]"
        style={{ backgroundColor: tint }}
      />
      {/* Wide enough for a source's own name — `This week's allowance` was
          being cut to `This week's allowa…`, which reads as a rule you do not
          recognise rather than as a heading. */}
      <span className="text-[10px] font-mono uppercase tracking-wide text-ink/35 shrink-0 max-w-44 truncate">
        {notice.title}
      </span>
      <span className="min-w-0 text-[10px] font-mono text-ink/55 leading-relaxed">
        {notice.lines.map((line, i) => (
          <span key={i} className="block">
            <Sentence text={line} />
          </span>
        ))}
      </span>
    </div>
  )
  if (!onClick) return body
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${btnBase} w-full text-left rounded-lg px-1 -mx-1 hover:bg-ink/5`}
    >
      {body}
    </button>
  )
}

/**
 * The filter row — a count per level, inside the panel.
 *
 * Not in the toggle row, which already scrolls sideways on a phone. Each
 * button carries its level's colour, which is the legend. Several can be held
 * at once; a level with nothing in it keeps its button, dimmed and inert,
 * because buttons that vanish mean the control changes shape under your hand.
 */
function LevelFilter({
  counts,
  held,
  onToggle,
}: {
  counts: Record<NoticeLevel, number>
  held: NoticeLevel[]
  onToggle: (level: NoticeLevel) => void
}) {
  const c = usePalette()
  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
      {LEVELS.map((level) => {
        const n = counts[level]
        const on = held.includes(level)
        const tint = levelColour(level, c)
        return (
          <Tip key={level} text={LEVEL_TIP[level]}>
            <button
              type="button"
              disabled={!n}
              onClick={() => onToggle(level)}
              aria-pressed={on}
              style={
                n
                  ? {
                      backgroundColor: on ? tint : `${tint}1F`,
                      color: on ? c.onFill : tint,
                      boxShadow: on ? undefined : `inset 0 0 0 1px ${tint}40`,
                    }
                  : undefined
              }
              className={`${btnBase} flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide ${
                n ? "hover:brightness-110" : "text-ink/25 cursor-default"
              }`}
            >
              <span className="font-bold tabular-nums">{n}</span>
              {LEVEL_WORD[level]}
            </button>
          </Tip>
        )
      })}
    </div>
  )
}

export function NoticeBoard({
  notices,
  held,
  onToggleLevel,
  activeRule,
  onOpenRule,
  onClose,
}: {
  notices: Notice[]
  /** Levels the filter is holding. Empty means everything. */
  held: NoticeLevel[]
  onToggleLevel: (level: NoticeLevel) => void
  /** Which rule panel is open, so the block it belongs to can say so. */
  activeRule: string | null
  onOpenRule: (ruleId: string) => void
  onClose: () => void
}) {
  const c = usePalette()
  const counts = countByLevel(notices)
  const shown = held.length
    ? notices.filter((n) => held.includes(n.level))
    : notices

  return (
    <PanelSection
      tint={c.accent}
      icon={Bell}
      title="Notices"
      subtitle="Today"
      closeLabel="Hide the notices"
      onClose={onClose}
    >
      <LevelFilter counts={counts} held={held} onToggle={onToggleLevel} />

      {/* A sentence rather than an empty box: a box saying nothing is here
          reads as something that failed to load. */}
      {!shown.length ? (
        <p className="text-[11px] font-mono text-ink/40">
          {notices.length
            ? "Nothing at the levels you are showing."
            : "Nothing to say about today."}
        </p>
      ) : (
        <div className="space-y-1.5">
          {shown.map((notice) => {
            const open = notice.ruleId
              ? () => onOpenRule(notice.ruleId as string)
              : undefined
            return notice.level === "danger" || notice.level === "warning" ? (
              <NoticeBlock
                key={notice.key}
                notice={notice}
                active={!!notice.ruleId && activeRule === notice.ruleId}
                onClick={open}
              />
            ) : (
              <NoticeLine key={notice.key} notice={notice} onClick={open} />
            )
          })}
        </div>
      )}
    </PanelSection>
  )
}
