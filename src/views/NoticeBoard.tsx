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

   **One shape, four colours** — and this reversed. The first build gave
   `danger` and `warning` a block and left `notice` and `good` as bare lines,
   on the argument that four equal blocks rebuild the dashboard `spec 010` part
   3 deleted. In use the cost landed the other way: a line and a block do not
   read as two volumes of one thing, they read as two different kinds of thing,
   and the quiet half stopped looking like part of the board at all — which is
   the failure this whole spec exists to fix, arriving by the other door.

   So every notice is the same container and the **colour** carries the level.
   That is enough separation, because it is the separation the reader already
   knows from every day cell in the app: red is a miss, amber is behind, green
   is kept.

   **It is always about today**, whatever the period bar shows. A notice is a
   thing you can act on, the levels are built on the difference between already
   spent and still owed, and *still owed* about last Tuesday is not a sentence.
--------------------------------------------------------------- */

import { ArrowDownRight, Bell } from "lucide-react"
import type { Notice, NoticeLevel } from "../lib/notices"
import { LEVELS, countByLevel, levelColour } from "../lib/notices"
import { t, useT } from "../lib/i18n"
import { btnBase } from "../lib/theme"
import { RenderIcon } from "../ui/icons"
import { Sentence } from "../ui/Sentence"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"
import { PanelSection } from "./PanelSection"

/** What each level is called — on its filter button and over its group.
 *  A getter rather than a constant: a module-level object is built once at
 *  import and would say `gone` in English forever. */
const levelWord = (level: NoticeLevel): string =>
  t(
    {
      gone: "level:gone",
      danger: "level:danger",
      warning: "level:warning",
      notice: "level:notice",
      allClear: "level:all clear",
    }[level],
  )

const levelTip = (level: NoticeLevel): string =>
  t(
    {
      gone: "Lost, and nothing covers it — no freeze can reach it. Nothing to do.",
      danger: "Lost unless a freeze is spent on it. A freeze can still reach it.",
      warning: "Still reachable, and the margin is gone.",
      notice: "Still owed, and there is room.",
      allClear: "Nothing owed and nothing spent — for now.",
    }[level],
  )

/**
 * Every notice, in its level's colour.
 *
 * **Two kinds of thing share the board, and now say which they are.** A rule
 * notice is about a promise you wrote; the four fixed sources — today's
 * verdict, the allowance, the open weeks, the achievements in reach — are
 * bookkeeping *about* those promises. They were drawn identically, so a level
 * holding both read as one striped run in which "Today" was just another rule
 * you could not remember writing.
 *
 * The level still decides the colour, because the level is what you are
 * scanning for and burying a red one under a second heading would cost more
 * than it bought. What changes is the **surface**: a rule is raised — the
 * coloured wash inside a ring of the same colour — and a fixed source is
 * recessed, the neutral `bg-ink/[0.04]` every subordinate block in this app
 * already wears, with no outline at all. The level survives in its icon and
 * its title, so nothing about urgency is lost.
 *
 * One device, no extra words, and it happens to say the true thing twice
 * over: a rule block leads to that rule's panel and wears an edge
 * accordingly, and a fixed one has nowhere to go. The four bells repeating
 * down the recessed run are not a shortage of glyphs either — they are the
 * board speaking about itself, which is exactly what those four are.
 *
 * **The way through is one small button, not the whole block.** The block was
 * the button, which was cheap and had two faults. It opened the rule's panel
 * and left you where you were, so on a page with the board, the filter and
 * the shop open, the thing you had just asked for was two screens below the
 * fold and gave no sign it had happened at all. And a block that is a button
 * has nowhere to put a second one, which is what the fix needs.
 *
 * So the block is a block, and the corner carries an arrow that opens the
 * rule **and takes you to it**. Quiet on purpose — the neutral disc the panel
 * chrome wears, not the level's colour: there can be five to nine notices on
 * this board, and nine bright buttons would out-shout the very colours the
 * board exists to make you look at. The arrow points down and to the right
 * because that is where it goes: the composite's panel is always below the
 * board.
 */
function NoticeBlock({
  notice,
  active,
  onGo,
}: {
  notice: Notice
  active: boolean
  /** Opens the rule's panel and scrolls to it. Absent on the fixed sources. */
  onGo?: () => void
}) {
  const c = usePalette()
  const tint = levelColour(notice.level, c)
  const fixed = !notice.ruleId
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
          className="text-[11px] font-mono font-bold uppercase tracking-wide truncate flex-1 min-w-0"
          style={{ color: tint }}
        >
          {notice.title}
        </span>
        {onGo && (
          <Tip text={t("Open this rule and go to it")}>
            <button
              type="button"
              onClick={onGo}
              aria-pressed={active}
              className={`${btnBase} shrink-0 -mr-1 p-1 rounded-full ${
                active
                  ? "text-ink/70 bg-ink/[0.12]"
                  : "text-ink/35 bg-ink/[0.05] hover:text-ink hover:bg-ink/[0.12]"
              }`}
            >
              <ArrowDownRight size={13} />
            </button>
          </Tip>
        )}
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

  const style = fixed
    ? {
        backgroundColor: `${c.ink}0A`,
      }
    : {
        backgroundColor: `${tint}14`,
        boxShadow: `inset 0 0 0 1px ${tint}${active ? "AA" : "55"}`,
      }
  return (
    <div className="w-full rounded-2xl px-3.5 py-2.5" style={style}>
      {inner}
    </div>
  )
}

/**
 * The filter row — a count per level, inside the panel.
 *
 * Not in the toggle row, which already scrolls sideways on a phone. Each
 * button carries its level's colour, which is the legend. A level with
 * nothing in it keeps its button, dimmed and inert, because buttons that
 * vanish mean the control changes shape under your hand.
 *
 * **It takes away rather than picks out**, like every other legend here — see
 * `useNoticePrefs` for why that reversed. A chip is filled while its level is
 * drawn and struck out once it is not, which is `ToggleChips`' shape at this
 * row's size.
 *
 * **One bulk button, not two.** With everything already hidden, "hide all"
 * has nothing to do, so the control shows whichever half applies — the same
 * argument `bulkToggleFor` makes for the chart legends. It leads the row
 * because it is the way back: a board filtered down to nothing has no chip
 * left saying so.
 */
function LevelFilter({
  counts,
  hidden,
  onToggle,
  onBulk,
}: {
  counts: Record<NoticeLevel, number>
  hidden: NoticeLevel[]
  onToggle: (level: NoticeLevel) => void
  onBulk: (hideAll: boolean) => void
}) {
  const c = usePalette()
  const t = useT()
  const live = LEVELS.filter((l) => counts[l] > 0)
  const allHidden = live.length > 0 && live.every((l) => hidden.includes(l))
  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
      <button
        type="button"
        onClick={() => onBulk(!allHidden)}
        className={`${btnBase} rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide text-ink/45 hover:text-ink hover:bg-ink/5`}
      >
        {t(allHidden ? "Show all" : "Hide all")}
      </button>
      {LEVELS.map((level) => {
        const n = counts[level]
        const off = hidden.includes(level)
        const tint = levelColour(level, c)
        return (
          <Tip key={level} text={levelTip(level)}>
            <button
              type="button"
              disabled={!n}
              onClick={() => onToggle(level)}
              aria-pressed={!off}
              style={
                n
                  ? {
                      backgroundColor: off ? "transparent" : `${tint}1F`,
                      color: off ? `${c.ink}55` : tint,
                      boxShadow: `inset 0 0 0 1px ${off ? `${c.ink}22` : `${tint}40`}`,
                    }
                  : undefined
              }
              className={`${btnBase} flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide ${
                n ? "hover:brightness-110" : "text-ink/25 cursor-default"
              } ${off ? "line-through" : ""}`}
            >
              <span className="font-bold tabular-nums">{n}</span>
              {levelWord(level)}
            </button>
          </Tip>
        )
      })}
    </div>
  )
}

export function NoticeBoard({
  notices,
  hidden,
  onToggleLevel,
  onBulkLevels,
  activeRule,
  onOpenRule,
  onClose,
}: {
  notices: Notice[]
  /** Levels the filter is striking out. Empty means everything is drawn. */
  hidden: NoticeLevel[]
  onToggleLevel: (level: NoticeLevel) => void
  onBulkLevels: (hideAll: boolean) => void
  /** Which rule panel is open, so the block it belongs to can say so. */
  activeRule: string | null
  onOpenRule: (ruleId: string) => void
  onClose: () => void
}) {
  const c = usePalette()
  const t = useT()
  const counts = countByLevel(notices)
  const shown = notices.filter((n) => !hidden.includes(n.level))

  return (
    <PanelSection
      tint={c.accent}
      icon={Bell}
      title={t("Notices")}
      subtitle={t("board:Today")}
      closeLabel={t("Hide the notices")}
      onClose={onClose}
    >
      <LevelFilter
        counts={counts}
        hidden={hidden}
        onToggle={onToggleLevel}
        onBulk={onBulkLevels}
      />

      {/* A sentence rather than an empty box: a box saying nothing is here
          reads as something that failed to load. */}
      {!shown.length ? (
        <p className="text-[11px] font-mono text-ink/40">
          {notices.length
            ? t("Every level is struck out. Show one to read it.")
            : t("Nothing to say about today.")}
        </p>
      ) : (
        /* **Grouped under its level's name, with air between the groups.**
           One container per notice made every level read as one kind of thing,
           which was the point — and then four kinds of thing in one flat run
           merged into a single striped wall. A heading says where one level
           stops; the gap says it again for anyone reading the shape rather
           than the words.

           A list, because it is one — `<ul>` rather than a stack of divs, so
           a screen reader gets "list, 3 items" per level instead of a
           continuous run of buttons. */
        <div className="space-y-4">
          {LEVELS.map((level) => {
            const group = shown.filter((n) => n.level === level)
            if (!group.length) return null
            return (
              <section key={level}>
                <h4
                  className="text-[9px] font-mono uppercase tracking-widest mb-1.5 flex items-center gap-2"
                  style={{ color: levelColour(level, c) }}
                >
                  {levelWord(level)}
                  <span className="text-ink/25">{group.length}</span>
                  {/* Runs out to the right edge, so the heading reads as a
                      lid on what follows rather than as a floating word. */}
                  <span
                    className="flex-1 h-px"
                    style={{ backgroundColor: `${levelColour(level, c)}33` }}
                  />
                </h4>
                {/* **The promises first, the bookkeeping after, and two
                    lists rather than one.** `notices()` already returned them
                    in that order; what was missing was any way to see where
                    one run stopped. The surface says it (see `NoticeBlock`)
                    and the gap between the lists says it again for anyone
                    reading the shape rather than the colours — the same pair
                    of devices that separates one level from the next, one
                    size down.

                    No sub-heading: a fifth word per level is how a board
                    becomes the dashboard `spec 010` part 3 deleted, and there
                    is nothing to say that the blocks do not say themselves.
                    Two `<ul>`s and not one `<ul>` with a wider gap in it,
                    because they really are two lists — a reader who cannot
                    see the surfaces is told "3 items", then "2 items", which
                    is the whole of what the gap is for. */}
                {[
                  group.filter((n) => n.ruleId),
                  group.filter((n) => !n.ruleId),
                ].map((run, i) =>
                  run.length ? (
                    <ul key={i} className="space-y-1.5 [&+ul]:mt-3">
                      {run.map((notice) => (
                        <li key={notice.key}>
                          <NoticeBlock
                            notice={notice}
                            active={
                              !!notice.ruleId && activeRule === notice.ruleId
                            }
                            onGo={
                              notice.ruleId
                                ? () => onOpenRule(notice.ruleId as string)
                                : undefined
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null,
                )}
              </section>
            )
          })}
        </div>
      )}
    </PanelSection>
  )
}
