/* ---------------------------------------------------------------
   The period bar: selector, custom bounds, cursor navigation and the
   toggles for the panels below it.

   Sticky at the very top now that the project header scrolls away, and it
   carries the current period's label so you never have to scroll up to see
   where you are.
--------------------------------------------------------------- */

import type { MouseEvent, ReactNode } from "react"

/** A panel toggle. The event travels so the shell can measure the button. */
type Toggle = (e: MouseEvent<HTMLButtonElement>) => void
import {
  Bell,
  Calendar1,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  Coins,
  Filter,
  Flame,
  Gift,
  History,
  Moon,
  Trophy,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { DateRange, DayKey, PeriodId } from "../types/model"
import {
  NAVIGABLE_PERIODS,
  PERIODS,
  compactRangeLabel,
  rangeLabel,
  stepCursor,
} from "../lib/period"
import { useT } from "../lib/i18n"
import { btnBase } from "../lib/theme"
import { DateRangeField } from "../ui/DateField"
import { Tip } from "../ui/Tip"
import { useRevealOnScrollUp } from "../ui/useRevealOnScrollUp"

import { usePalette } from "../ui/useTheme"

/**
 * A balance, short enough for a badge.
 *
 * There is not much room up here, so anything past a thousand loses its tail:
 * `4.1k` rather than `4120`. The exact figure is one tap away in the account,
 * and a badge that wraps is worse than one that rounds.
 */
const shortPoints = (n: number): string =>
  Math.abs(n) < 1000 ? String(n) : `${(n / 1000).toFixed(1)}k`

/**
 * Pill-style period picker: one rounded trough holding rounded pills, the
 * active one filled. Distinct from `SegmentedControl` (still used for the
 * chart mode switches) because this one is the page's primary control.
 */
function PeriodPills({
  period,
  setPeriod,
}: {
  period: PeriodId
  setPeriod: (id: PeriodId) => void
}) {
  const c = usePalette()
  const t = useT()
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-card p-1 shadow-sm">
      {PERIODS.map((p) => {
        const active = p.id === period
        return (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`${btnBase} rounded-full px-3 py-1.5 text-[11px] font-mono whitespace-nowrap ${
              active
                ? ""
                : "text-ink/60 hover:text-ink hover:bg-ink/5"
            }`}
            style={
              active ? { backgroundColor: c.accent, color: c.onFill } : undefined
            }
          >
            {t(p.label)}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Where a badge sits on a toggle.
 *
 * **Three down the right edge, and one across on the other corner.** Each is
 * a fixed slot rather than a queue, so a badge does not move when the one
 * above it drops to nothing, and every level is in the same place on every
 * visit. They were four hand-written spans with the offsets typed out four
 * times, which is how two of them ended up at `-right-0.5` and `-right-1` and
 * read as marks dropped on the button rather than as one thing said three
 * times.
 *
 * The right edge is one column and shares one `x`, so its three stack in
 * order of sharpness — the one you must not miss is the one that must not be
 * covered. `topLeft` is the odd corner and overlaps none of them; it is drawn
 * last anyway, because a thing already lost is the one reading that must
 * never end up underneath something.
 */
type BadgeSlot = "top" | "mid" | "bottom" | "topLeft"

const SLOT: Record<BadgeSlot, string> = {
  top: "-top-1 -right-1 z-10",
  mid: "top-1/2 -translate-y-1/2 -right-1 z-20",
  bottom: "-bottom-1 -right-1 z-30",
  topLeft: "-top-1 -left-1 z-40",
}

function ToggleBadge({
  slot,
  value,
  label,
  color,
  outline,
  icon: Icon,
}: {
  slot: BadgeSlot
  value?: number | null
  label?: string
  color?: string
  /**
   * **Outlined rather than filled** — for a badge that counts everything.
   *
   * A filled badge borrows the meaning of its colour, so `7` on red read as
   * *seven dangers* when it was seven notices of which one was a danger. A
   * total has no level and must not wear one.
   */
  outline?: boolean
  icon?: LucideIcon
}) {
  const c = usePalette()
  if (value == null) return null
  return (
    <span
      className={`absolute ${SLOT[slot]} min-w-[15px] h-[15px] px-[3px] rounded-full flex items-center gap-[1px] justify-center text-[9px] font-mono font-bold leading-none ${
        outline ? "" : "ring-2 ring-page"
      }`}
      style={
        outline
          ? {
              backgroundColor: c.card,
              color: `${c.ink}A0`,
              boxShadow: `0 0 0 1px ${c.ink}30, 0 0 0 3px ${c.page}`,
            }
          : { backgroundColor: color, color: c.onFill }
      }
    >
      {Icon && <Icon size={7} strokeWidth={3} />}
      {label ?? value}
    </span>
  )
}

/** One of the round buttons that open a panel below the bar. */
function PanelToggle({
  icon: Icon,
  tip,
  multilineTip,
  active,
  onClick,
  badge,
  count,
  countLabel,
  countColor,
  countOutline,
  countIcon: CountIcon,
  mid,
  midColor,
  deep,
  deepColor,
  sub,
  subColor,
  subIcon: SubIcon,
}: {
  icon: LucideIcon
  tip: ReactNode
  /** The tip is a column of lines rather than a phrase. */
  multilineTip?: boolean
  active: boolean
  /** Takes the event, because the shell measures the button it was pressed
   *  on — see `JumpPrompt`. */
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  badge?: boolean
  /** A number in the corner instead of a dot. Zero is worth showing too — a
   *  broken streak is exactly the thing you want to notice. */
  count?: number | null
  /** What to print instead of the raw figure — `4.1k` for a big balance. */
  countLabel?: string
  countColor?: string
  /**
   * **Outlined rather than filled** — for a badge that counts everything.
   *
   * A filled badge borrows the meaning of its colour, so `7` on red read as
   * *seven dangers* when it was seven notices of which one was a danger. A
   * total has no level and must not wear one; the danger count sits in the
   * other corner and says the thing you have to know.
   */
  countOutline?: boolean
  countIcon?: LucideIcon
  /**
   * **Two more counts, down the same right edge.**
   *
   * Each level owns a fixed slot — `mid` and `sub` — rather than being packed
   * in as they appear, so a badge does not move when the one above it drops to
   * nothing. They overlap on a button this size, and that is what the stacking
   * order in `SLOT` is for: the sharpest reading sits on top, because the one
   * you must not miss is the one that must not be covered.
   */
  mid?: number | null
  midColor?: string
  /**
   * A fourth figure, for the one toggle that has one — and the only one not
   * on the right edge.
   *
   * The top-left corner, which is empty on every other toggle in the row and
   * on this one nearly every day. That is what it is for: `gone` is rare, and
   * a mark that is usually not there is read the moment it is. A fourth badge
   * added to the column would have been the one nothing can be done about,
   * arriving in the middle of the queue of things to do.
   */
  deep?: number | null
  deepColor?: string
  sub?: number | null
  subColor?: string
  subIcon?: LucideIcon
}) {
  const c = usePalette()
  return (
    <Tip text={tip} multiline={multilineTip}>
      <button
        onClick={onClick}
        className={`${btnBase} relative p-2 rounded-full ${
          active
            ? "bg-ink/[0.08] text-ink"
            : "text-ink/45 hover:text-ink hover:bg-ink/5"
        }`}
      >
        <Icon size={16} />
        {badge && (
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-page"
            style={{ backgroundColor: c.filter }}
          />
        )}
        <ToggleBadge
          slot="top"
          value={count}
          label={countLabel}
          color={countColor}
          outline={countOutline}
          icon={CountIcon}
        />
        <ToggleBadge slot="mid" value={mid} color={midColor} />
        <ToggleBadge slot="bottom" value={sub} color={subColor} icon={SubIcon} />
        <ToggleBadge slot="topLeft" value={deep} color={deepColor} />
      </button>
    </Tip>
  )
}

export function PeriodBar({
  period,
  setPeriod,
  cursor,
  setCursor,
  range,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  showFilter,
  onToggleFilter,
  filteredOutCount,
  sleepEnabled,
  showSleep,
  onToggleSleep,
  showLog,
  onToggleLog,
  showHistory,
  onToggleHistory,
  showShop,
  onToggleShop,
  showNotices,
  onToggleNotices,
  noticeCount,
  dangerCount,
  warningCount,
  goneCount,
  noticeOwed,
  allClearCount,
  keptDays,
  keptOpen,
  onToggleKept,
  points,
  showAccount,
  onToggleAccount,
  openCount,
  onHideAll,
  badges,
  shop,
}: {
  period: PeriodId
  setPeriod: (id: PeriodId) => void
  cursor: Date
  setCursor: (d: Date) => void
  range: DateRange
  customStart?: DayKey
  setCustomStart: (k: DayKey) => void
  customEnd?: DayKey
  setCustomEnd: (k: DayKey) => void
  showFilter: boolean
  onToggleFilter: Toggle
  filteredOutCount: number
  sleepEnabled: boolean
  showSleep: boolean
  onToggleSleep: Toggle
  showLog: boolean
  onToggleLog: Toggle
  showHistory: boolean
  onToggleHistory: Toggle
  showShop: boolean
  onToggleShop: Toggle
  /** The board — `spec 016`. Its badge is every notice, coloured by the worst. */
  showNotices: boolean
  onToggleNotices: Toggle
  noticeCount: number
  /** One per level, for the badges and the column of counts in the tooltip. */
  goneCount: number
  dangerCount: number
  warningCount: number
  noticeOwed: number
  allClearCount: number
  /** The composite's run. No freezes: there is no shared pool any more. */
  keptDays: number | null
  keptOpen: boolean
  onToggleKept: Toggle
  /** Points, abbreviated past a thousand. Null while the balance is off. */
  points: number | null
  showAccount: boolean
  onToggleAccount: Toggle
  /** How many panels are open. The row is the only place that knows. */
  openCount: number
  onHideAll: () => void
  /** Rosettes reached against rosettes written. Null when none are written. */
  badges: { earned: number; total: number } | null
  /** Rewards you can afford against rewards on the shelf. */
  shop: { affordable: number; total: number } | null
}) {
  const c = usePalette()
  const t = useT()
  const navigable = NAVIGABLE_PERIODS.has(period)
  const navBtn = `${btnBase} rounded-full bg-card shadow-sm hover:bg-ink/5 disabled:opacity-35 disabled:hover:bg-card disabled:cursor-not-allowed`
  const visible = useRevealOnScrollUp()

  return (
    <div
      className={`sticky top-0 z-10 -mx-4 mb-4 px-4 py-3 bg-page/95 backdrop-blur transition-transform duration-200 ease-out ${
        visible ? "translate-y-0" : "-translate-y-[130%]"
      }`}
    >
      {/* Two rows on a phone, one from `sm` up. Everything here is wider than
          375px put together, so on mobile the pills take a line of their own
          and the controls take the next. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Seven pills overflow a phone; let the strip scroll sideways
              rather than clip or wrap. `min-w-0` is what makes that work — a
              flex item defaults to min-width:auto, which refuses to shrink
              below its content and pushes the page sideways instead. */}
          <div className="min-w-0 overflow-x-auto whitespace-nowrap">
            <PeriodPills period={period} setPeriod={setPeriod} />
          </div>
          {period === "custom" && (
            // Mounted only while Custom is selected, so opening on mount is the
            // same thing as opening the moment Custom is clicked.
            <DateRangeField
              start={customStart}
              end={customEnd}
              openOnMount
              onChange={(from, to) => {
                setCustomStart(from)
                setCustomEnd(to)
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          {/* The panel toggles give way first. They are the least urgent thing
              in the bar and the only group that reads fine half-visible, so on
              a narrow screen this strip scrolls and the navigation beside it
              keeps its place. */}
          {/* `p-2 -m-2` is not decoration: `overflow-x-auto` makes the other
              axis compute to `auto` too, so anything sitting outside a button
              is shaved off. It was `p-1`, which was enough for the filter's
              two-pixel dot and stopped being enough the moment the counters
              grew to fifteen pixels and moved to `-top-1` — the notice total
              came out with a flat top. The padding has to clear the largest
              overhang, not the first one. The negative margin keeps the row
              the height it was. */}
          <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto p-2 -m-2 [&>*]:shrink-0">
          {/* The dot stays on whether the panel is open or shut: a filter you
              can't see is the one you most need telling about, otherwise every
              figure on the page is quietly short and nothing says why. */}
          <PanelToggle
            icon={Filter}
            active={showFilter}
            onClick={onToggleFilter}
            badge={filteredOutCount > 0}
            tip={
              filteredOutCount
                ? t("{n} left out of every total", { n: filteredOutCount })
                : t(showFilter ? "Hide the filter" : "Filter what counts")
            }
          />
          {/* Absent rather than disabled when sleep tracking is off: there is
              nothing behind it to show. */}
          {sleepEnabled && (
            <PanelToggle
              icon={Moon}
              active={showSleep}
              onClick={onToggleSleep}
              tip={t(showSleep ? "Hide sleep" : "Show sleep")}
            />
          )}
          {/* **The board's badge is what survives of "it comes and finds
              you."** The alarms are gone, so a closed board with a red figure
              on its bell is the only thing left that reaches you — and it
              costs one prop that already existed. */}
          {noticeCount > 0 && (
            <PanelToggle
              icon={Bell}
              active={showNotices}
              onClick={onToggleNotices}
              /* **One right edge and one far corner.** The total at the
                 top, `warning` in the middle, `danger` at the bottom: a
                 column read top to bottom, quietest first, so the eye lands
                 on the sharpest reading at the end of the sweep it was
                 already making.

                 The total used to be drawn filled in the worst level's
                 colour, so `7` on red read as seven dangers when it was seven
                 notices with one danger among them. It is outlined and
                 neutral, because a total has no level and must not wear one.

                 `gone` is the exception and takes the **top-left** corner,
                 which nothing else in this row uses. It is the one reading
                 that is not a call to act — a freeze cannot reach it and
                 there is nothing to do — so it does not belong in the column
                 of things you can still do something about; and it is rare,
                 so a corner that is empty nearly every day makes it
                 unmissable on the days it is not. */
              count={noticeCount}
              countOutline
              mid={warningCount || null}
              midColor={c.warn}
              sub={dangerCount || null}
              subColor={c.exam}
              deep={goneCount || null}
              deepColor={c.gone}
              /* **A column, and every level in it.** Run together with dots
                 it was a sentence you had to parse before you could count;
                 one line each is a table you read down. Every level appears
                 even at nought — this is the place you come to *ask*, and a
                 line that is missing is indistinguishable from a line you
                 misread. The badges are the opposite and drop theirs: a
                 badge is a call, and there is no call to make about none. */
              multilineTip
              tip={[
                t(showNotices ? "Hide the notices" : "Show the notices"),
                "",
                t("{n} gone — no freeze reaches them", { n: goneCount }),
                t("{n} lost unless a freeze is spent", { n: dangerCount }),
                t("{n} running out of room", { n: warningCount }),
                t("{n} still owed, with time", { n: noticeOwed }),
                t("{n} all clear", { n: allClearCount }),
              ].join(String.fromCharCode(10))}
            />
          )}
          {/* `Flame` is already the language of streaks everywhere in the app,
              so this needs no label. It does **not** colour: we have exactly
              one place to look when something is wrong, and a second red mark
              two centimetres away means neither of them means anything. */}
          {keptDays !== null && (
            <PanelToggle
              icon={Flame}
              active={keptOpen}
              onClick={onToggleKept}
              count={keptDays}
              /* The streak's own marigold — the colour `KeptFigure` gives the
                 same figure two blocks below, so the badge and the number it
                 stands for are one thing. Deliberately not `coin`: money and
                 the run you are guarding are the two things this row must not
                 let you confuse. */
              countColor={c.project}
              tip={t(keptOpen ? "Hide the composite" : "Days kept in a row")}
            />
          )}
          {/* A gift is what you buy; coins are what you pay with. */}
          {points !== null && (
            <PanelToggle
              icon={Coins}
              active={showAccount}
              onClick={onToggleAccount}
              count={points}
              countLabel={shortPoints(points)}
              /* **The same marigold the streak wears**, and deliberately.
                 A separate gold was tried and read cheap next to it — the
                 marigold is the app's one *this is worth something* colour,
                 and the two badges are told apart by their glyph and their
                 place rather than by hue. Never red, however negative: the
                 board is the one thing here that shouts, and a second
                 alarming badge beside it means neither means anything. */
              countColor={c.project}
              tip={
                showAccount
                  ? t("Hide the account")
                  : t("{n} points, and where they came from", { n: points ?? 0 })
              }
            />
          )}
          {/* **`x of y`, on the same dark disc the notice total wears.** A
              shelf and a wall of rosettes are both *how much of this is
              done*, and a bare figure would not say which half it was. The
              shop's own fraction is what you can **afford** rather than what
              you have taken, because a reward can be taken more than once —
              taken-of-total would climb past its own denominator. */}
          <PanelToggle
            icon={Gift}
            active={showShop}
            onClick={onToggleShop}
            count={shop ? shop.total : null}
            countLabel={shop ? `${shop.affordable}/${shop.total}` : undefined}
            countOutline
            tip={
              showShop
                ? t("Hide the rewards")
                : shop
                  ? t("{a} of {b} within reach", {
                      a: shop.affordable,
                      b: shop.total,
                    })
                  : t("What your points will buy")
            }
          />
          <PanelToggle
            icon={Trophy}
            active={showHistory}
            onClick={onToggleHistory}
            count={badges ? badges.total : null}
            countLabel={badges ? `${badges.earned}/${badges.total}` : undefined}
            countOutline
            tip={
              showHistory
                ? t("Hide what you have reached")
                : badges
                  ? t("{a} of {b} reached", {
                      a: badges.earned,
                      b: badges.total,
                    })
                  : t("What you have reached")
            }
          />
          <PanelToggle
            icon={History}
            active={showLog}
            onClick={onToggleLog}
            tip={t(showLog ? "Hide the change log" : "Show the change log")}
          />
          {/* **Closing them one at a time is the cost of leaving them open.**
              A page with six panels on it takes six presses to clear, and this
              row is the only place that knows how many there are. It counts,
              so the tooltip can say what it is about to do — a control that
              undoes six things at once should say six.

              **Absent, not disabled, when nothing is open**: there is nothing
              behind it, the same rule the sleep toggle follows. */}
          {openCount > 0 && (
            <PanelToggle
              icon={ChevronsDownUp}
              active={false}
              onClick={onHideAll}
              tip={
                openCount === 1
                  ? t("Hide the open section")
                  : t("Hide all {n} open sections", { n: openCount })
              }
            />
          )}

          {/* Jumping to "now" is a shortcut, not a step through the timeline —
              it sits outside the back/forward pair and carries no chrome. */}
          <Tip
            text={
              t(navigable ? "Jump to the current period" : "Jump to this week")
            }
          >
            <button
              onClick={() => {
                if (!navigable) setPeriod("week")
                setCursor(new Date())
              }}
              className={`${btnBase} p-2 rounded-full text-ink/45 hover:text-ink hover:bg-ink/5`}
            >
              <Calendar1 size={16} />
            </button>
          </Tip>
          </div>

          {/* Never scrolls and never shrinks: knowing where you are and being
              able to step off it is the one thing the bar must always offer. */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <Tip text={navigable ? undefined : t("This period sets its own dates")}>
              <button
                disabled={!navigable}
                onClick={() => setCursor(stepCursor(cursor, period, -1))}
                className={`${navBtn} p-2`}
              >
                <ChevronLeft size={16} />
              </button>
            </Tip>
            {/* The period reads as the label of the two arrows around it.
                Short form on a phone, full form once there is room. */}
            <span className="px-1 font-sans font-extrabold uppercase tracking-tight text-xs text-center whitespace-nowrap">
              <span className="sm:hidden">
                {compactRangeLabel(period, cursor, range)}
              </span>
              <span className="hidden sm:inline">
                {rangeLabel(period, cursor, range)}
              </span>
            </span>
            <Tip text={navigable ? undefined : t("This period sets its own dates")}>
              <button
                disabled={!navigable}
                onClick={() => setCursor(stepCursor(cursor, period, 1))}
                className={`${navBtn} p-2`}
              >
                <ChevronRight size={16} />
              </button>
            </Tip>
          </div>
        </div>
      </div>
    </div>
  )
}
