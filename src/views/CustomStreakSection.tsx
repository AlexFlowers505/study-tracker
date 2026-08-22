/* ---------------------------------------------------------------
   One custom streak's panel.

   Built from `PanelSection` like every other panel, in the rule's own colour,
   so the five of them read as siblings rather than as five features.

   Three things are here and each earns its place:

   - **The rule, said back in words.** The same sentence the form writes, from
     the same function, because checking one against the other is the only way
     to know that what you built is what you meant.
   - **The week as cells.** A streak is a number and a number cannot be
     argued with; the cells are where you see *which* day it was.
   - **Both freeze counts, named.** One expires on Sunday and one does not, and
     a count that quietly halves overnight with no explanation reads as a bug.

   **Freezes are spent here, on the week strip** — not from the day card. A day
   can break three rules at once, and a snowflake per rule on a card that
   already carries badges, sleep, a note and an add button is how a card stops
   being readable. The main streak keeps its own snowflake on the card, because
   it is about the day's hours and that is what the card is about.
--------------------------------------------------------------- */

import { Flame, Snowflake, Trophy } from "lucide-react"
import type { Project } from "../types/model"
import type { RuleState, RuleStatus } from "../lib/customStreaks"
import {
  freezeOffer,
  readDay,
  ruleDayState,
  ruleSentence,
  ruleWeekState,
} from "../lib/customStreaks"
import { WEEKDAY_LABELS, fmtDateLong, startOfWeek, toKey, weekDates } from "../lib/date"
import { btnBase } from "../lib/theme"
import { PopoverMenu } from "../ui/PopoverMenu"
import { StatTile } from "../ui/StatTile"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"
import { PanelSection } from "./PanelSection"
import { FALLBACK_ICON, ICON_MAP } from "../ui/iconLibrary"

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

const STATE_WORD: Record<RuleState, string> = {
  met: "kept",
  frozen: "frozen",
  missed: "missed",
  pending: "still open",
  unjudged: "not judged",
}

export function CustomStreakSection({
  status,
  project,
  today,
  onSpendFreeze,
  onClose,
}: {
  status: RuleStatus
  project: Project
  today: Date
  /** Puts the rule's id on that day. The caller owns persistence. */
  onSpendFreeze: (dayKey: string) => void
  onClose?: () => void
}) {
  const c = usePalette()
  const { rule, unit, freezes } = status
  const todayKey = toKey(today)
  const weekStart = startOfWeek(today)
  const days = weekDates(weekStart)

  // "1 days" is the tell that a number was pasted next to a fixed word.
  const unitWord = (n: number) =>
    `${rule.scope === "week" ? "week" : "day"}${n === 1 ? "" : "s"}`

  const cellState = (key: string): RuleState =>
    rule.scope === "week"
      ? ruleWeekState(rule, unit, project.days, weekStart, todayKey)
      : ruleDayState(rule, unit, project.days[key], key, todayKey)

  // A colour per verdict, and the same three the rest of the app already uses
  // for a day: green kept, blue frozen, red missed. Nothing new to learn.
  const cellTint = (state: RuleState) =>
    state === "met"
      ? c.goalMet
      : state === "frozen"
        ? c.freeze
        : state === "missed"
          ? c.exam
          : null

  return (
    <PanelSection
      tint={rule.color}
      icon={(rule.iconName && ICON_MAP[rule.iconName]) || FALLBACK_ICON}
      title={rule.label}
      subtitle={
        <span>
          {ruleSentence(rule, unit, project.slots)}
          {rule.description ? ` ${rule.description}` : ""}
        </span>
      }
      closeLabel={`Hide ${rule.label}`}
      onClose={onClose}
      action={
        <div className="flex items-center gap-1.5">
          <Tip
            text={`${freezes.weeklyLeft} of ${freezes.weeklyTotal} left this week. Granted every Monday and lost unused — this is the allowance you set yourself.`}
          >
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full text-ink/45 bg-ink/[0.06]">
              <Snowflake size={11} />
              {freezes.weeklyLeft}/{freezes.weeklyTotal}
            </span>
          </Tip>
          <Tip
            text={`${plural(freezes.banked, "freeze")} banked, capped at ${freezes.cap}${
              freezes.forfeited
                ? ` — ${freezes.forfeited} earned beyond the cap were lost`
                : ""
            }. One for every week you keep clean; carried over until spent.`}
          >
            <span
              className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
              style={{ color: c.freeze, backgroundColor: `${c.freeze}1A` }}
            >
              <Snowflake size={11} strokeWidth={3} />
              {freezes.banked} / {freezes.cap}
            </span>
          </Tip>
        </div>
      }
    >
      {/* Where the next reward is. A clean week that has not paid out yet looks
          like a bug and is a rule, so the rule says itself here. */}
      {status.open.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {status.open.map((w) => (
            <div
              key={w.weekStart}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-mono bg-ink/[0.04]"
            >
              <Snowflake
                size={12}
                className="shrink-0"
                style={{ color: w.wouldKeep ? c.freeze : `${c.ink}40` }}
              />
              <span className="text-ink/70">
                Week of {fmtDateLong(w.weekStart)} is still open —{" "}
                {w.wouldKeep ? (
                  <>
                    on track for{" "}
                    <strong style={{ color: c.freeze }}>+1 freeze</strong>
                  </>
                ) : (
                  <strong className="text-ink/50">no freeze as it stands</strong>
                )}
                , sealing {fmtDateLong(w.sealsOn)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* This week, day by day. The strip is also the only way to spend a
          freeze, which is why an eligible cell opens a menu rather than
          acting on the first click: a freeze is a real cost and the cost
          depends on how badly the day went. */}
      <div className="mb-3">
        {/* Seven equal columns, as a grid rather than seven flex children.
            `Tip` and `PopoverMenu` each put a wrapper span around what they
            are given, so the flex item was the wrapper and `flex-1` never
            reached the cell: five days shrank to the width of their own
            three-letter label, the one freezable day kept its `flex-1` and
            swallowed the rest of the row, and Sunday was pushed against the
            right edge. A grid track sizes the cell whatever is wrapped
            around it. */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date) => {
            const key = toKey(date)
            const state = cellState(key)
            const tint = cellTint(state)
            const offer = freezeOffer(rule, project, key, todayKey, status)
            const reading = readDay(rule, unit, project.days[key], key, todayKey)
            // A cell that offers nothing has two completely different
            // reasons for it, and "you cannot afford this" is the one nobody
            // guesses. `cost > 0` with `ok` false is exactly that case: the
            // day is freezable and the freezes are not there.
            const short = !offer.ok && offer.cost > 0
            const detail = `${fmtDateLong(key)} — ${STATE_WORD[state]}${
              state === "unjudged"
                ? ""
                : `, ${rule.scope === "week" ? "week" : "counted"} ${reading.value}${
                    reading.skipped ? " (skipped)" : ""
                  }`
            }${
              short
                ? `. Freezing it needs ${plural(offer.cost, "freeze")} and you have ${offer.available}`
                : ""
            }`

            const cell = (
              <div
                className="flex-1 min-w-0 flex flex-col items-center gap-1 py-1.5 rounded-lg"
                style={{
                  backgroundColor: tint ? `${tint}24` : `${c.ink}08`,
                  color: tint || `${c.ink}55`,
                }}
              >
                <span className="text-[9px] font-mono uppercase tracking-widest">
                  {WEEKDAY_LABELS[date.getDay()]}
                </span>
                <span className="text-[11px] font-mono font-bold">
                  {state === "frozen" ? (
                    <Snowflake size={11} strokeWidth={3} />
                  ) : state === "unjudged" ? (
                    "·"
                  ) : (
                    reading.value
                  )}
                </span>
              </div>
            )

            // Both branches sit in the same shell: a flex grid item, so the
            // wrapper span inside it is a flex item too and stops being an
            // inline box — which is what dropped the freezable day half a
            // line below its neighbours.
            if (!offer.ok)
              return (
                <div key={key} className="flex min-w-0">
                  <Tip text={detail} className="flex-1 min-w-0">
                    {cell}
                  </Tip>
                </div>
              )

            return (
              <div key={key} className="flex min-w-0">
                <PopoverMenu
                  width={210}
                  label={detail}
                  wrapClassName="flex-1 min-w-0"
                  triggerClassName={`${btnBase} block w-full rounded-lg hover:brightness-110`}
                  trigger={cell}
                >
                  {(close) => (
                    <div>
                      <p className="px-2.5 pt-1 pb-2 text-[9px] font-mono uppercase tracking-widest text-ink/40">
                        {fmtDateLong(key)}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          // `offer.key`, not `key`: a weekly rule's freeze is
                          // recorded on the Monday of the week it covers.
                          onSpendFreeze(offer.key)
                          close()
                        }}
                        className={`${btnBase} w-full text-left px-2.5 py-2 rounded-xl text-[11px] font-mono hover:bg-ink/5`}
                        style={{ color: c.freeze }}
                      >
                        Freeze this day
                        <span className="block text-[10px] text-ink/45">
                          costs {plural(offer.cost, "freeze")} of{" "}
                          {offer.available} available
                        </span>
                      </button>
                    </div>
                  )}
                </PopoverMenu>
              </div>
            )
          })}
        </div>
        {/* Why a red day offers nothing. Silence there reads as a broken
            button, and the two reasons are completely different problems. */}
        <p className="mt-1.5 text-[10px] font-mono text-ink/35">
          Freezes go on today and yesterday, the same window the log is written
          in. A day costs one freeze for every unit it fell short by.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatTile
          label="Current streak"
          value={status.current}
          sub={unitWord(status.current)}
          icon={Flame}
        />
        <StatTile
          label="Best streak"
          value={status.best}
          sub={unitWord(status.best)}
          icon={Trophy}
        />
        <StatTile
          label="Freezes banked"
          value={freezes.banked}
          sub={`of ${freezes.cap}`}
          icon={Snowflake}
        />
      </div>
    </PanelSection>
  )
}
