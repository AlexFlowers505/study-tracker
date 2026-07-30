import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import "./App.css"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts"
import {
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Trash2,
  Train,
  Bus,
  Car,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Cloud,
  Coffee,
  BookOpen,
  NotebookPen,
  FileText,
  MessageCircleQuestion,
  HelpCircle,
  ListChecks,
  CheckSquare,
  Calculator,
  Brain,
  GraduationCap,
  Lightbulb,
  Star,
  Target,
  Zap,
  Flag,
  Bookmark,
  Layers,
  Clock,
  Home,
  Building2,
  PenLine,
  ClipboardList,
  CalendarDays,
  CalendarCheck,
  ArrowUpRight,
  TrendingUp,
  Award,
  AlertCircle,
  Settings2,
  LogOut,
  Mail,
  Lock,
  MessageSquare,
  Rocket,
  Compass,
  Gauge,
  EyeOff,
} from "lucide-react"

/* ---------------------------------------------------------------
   Icon library
--------------------------------------------------------------- */

const ICON_LIBRARY = [
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
const ICON_MAP = Object.fromEntries(ICON_LIBRARY.map((o) => [o.name, o.icon]))
const RenderIcon = ({ name, size = 14, ...rest }) => {
  const Comp = ICON_MAP[name] || HelpCircle
  return <Comp size={size} {...rest} />
}

const PALETTE = [
  "#E29A3E",
  "#4C8FBD",
  "#2F9E8F",
  "#8B6FB3",
  "#C1595B",
  "#5C8A3A",
  "#B0559E",
  "#4AA5A0",
  "#C98A2E",
  "#6B7FD7",
]

const ACCENT = "#2F5FBF" // bluish active-state accent
const EXAM_COLOR = "#C1595B"
const GOAL_MET_COLOR = "#2F9E8F"
const CARD = "bg-white rounded-2xl p-4"
// Fields are filled, not outlined: on a white card they take the page tint, on
// a tinted row they go white. That contrast step is what reads as "editable",
// so the border is redundant. Selects and number inputs keep a hairline
// (FIELD_BOXED) — they're small enough that fill alone reads as a label.
const FIELD_BASE =
  "font-mono placeholder:text-[#1E2A33]/30 focus:outline-none focus:ring-2 focus:ring-[#1E2A33]/10"
const FIELD_ON_WHITE = `${FIELD_BASE} w-full rounded-xl bg-[#F4F5F7] px-2.5 py-2 text-xs`
const FIELD_ON_TINT = `${FIELD_BASE} w-full rounded-xl bg-white px-2.5 py-2 text-[11px]`
const FIELD_BOXED = `${FIELD_BASE} rounded-xl bg-white border border-[#1E2A33]/15 px-2 py-1.5 text-xs`

/* ---------------------------------------------------------------
   Constants / defaults
--------------------------------------------------------------- */

const DEFAULT_SLOTS = [
  {
    id: "morningSubway",
    label: "Morning Transit",
    iconName: "Train",
    color: "#E29A3E",
  },
  { id: "morning", label: "Morning", iconName: "Sunrise", color: "#4C8FBD" },
  { id: "daytime", label: "Daytime", iconName: "Sun", color: "#2F9E8F" },
  {
    id: "eveningSubway",
    label: "Evening Transit",
    iconName: "Train",
    color: "#8B6FB3",
  },
  { id: "evening", label: "Evening", iconName: "Moon", color: "#C1595B" },
]

const DEFAULT_CATEGORIES = [
  {
    id: "notes",
    label: "Lesson notes",
    iconName: "NotebookPen",
    color: "#4C8FBD",
  },
  {
    id: "gatherQuestions",
    label: "Gather questions",
    iconName: "MessageCircleQuestion",
    color: "#E29A3E",
  },
  {
    id: "gatherTasks",
    label: "Gather tasks",
    iconName: "ListChecks",
    color: "#2F9E8F",
  },
  { id: "qa", label: "Q&A", iconName: "HelpCircle", color: "#8B6FB3" },
  {
    id: "solvingTasks",
    label: "Solving tasks",
    iconName: "Calculator",
    color: "#C1595B",
  },
]

// getDay() indices: 0=Sun ... 6=Sat
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // displayed Mon -> Sun
const WEEKDAY_LABELS = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  0: "Sun",
}

const STORAGE_KEY = "study-tracker-data"
// How long to wait for edits to stop before shipping the blob. Every save
// rewrites the whole project, so typing a note used to mean one upsert per
// keystroke.
const SAVE_DEBOUNCE_MS = 1000

const DEFAULT_SETTINGS = {
  totalLessons: 100,
  totalExams: 10,
  lessonsEnabled: true,
  examsEnabled: true,
  startDate: null,
  endDate: null,
  projectName: "Time tracker",
  projectIcon: "Train",
  dailyGoals: { 0: 60, 1: 90, 2: 90, 3: 90, 4: 90, 5: 90, 6: 60 }, // minutes, keyed by getDay()
}

function makeProject(overrides = {}) {
  return {
    id: makeId("project"),
    settings: { ...DEFAULT_SETTINGS, startDate: toKey(new Date()) },
    slots: DEFAULT_SLOTS,
    categories: DEFAULT_CATEGORIES,
    days: {}, // key: 'YYYY-MM-DD' -> { cells: { slotId: [{id,category,minutes,comment}] }, lessons: number, exam: boolean, ignore?: boolean, comment?: string }
    weekNotes: {}, // key: 'YYYY-MM-DD' (Monday of that week) -> comment string
    monthNotes: {}, // key: 'YYYY-MM' -> comment string
    weekIgnore: {}, // key: 'YYYY-MM-DD' (Monday of that week) -> boolean, ignore this week in statistics
    monthIgnore: {}, // key: 'YYYY-MM' -> boolean, ignore this month in statistics
    ...overrides,
  }
}

function normalizeProject(p) {
  return {
    id: p.id || makeId("project"),
    settings: { ...DEFAULT_SETTINGS, ...(p.settings || {}) },
    slots: p.slots && p.slots.length ? p.slots : DEFAULT_SLOTS,
    categories:
      p.categories && p.categories.length ? p.categories : DEFAULT_CATEGORIES,
    days: p.days || {},
    weekNotes: p.weekNotes || {},
    monthNotes: p.monthNotes || {},
    weekIgnore: p.weekIgnore || {},
    monthIgnore: p.monthIgnore || {},
  }
}

// Accepts anything previously saved — either the current {activeProjectId, projects}
// shape, or the older single-project shape — and returns a normalized
// {activeProjectId, projects} object, or null if there's nothing usable at all.
function normalizeData(parsed) {
  if (!parsed) return null
  if (Array.isArray(parsed.projects) && parsed.projects.length) {
    const projects = parsed.projects.map(normalizeProject)
    const activeProjectId = projects.some(
      (p) => p.id === parsed.activeProjectId,
    )
      ? parsed.activeProjectId
      : projects[0].id
    return { activeProjectId, projects }
  }
  if (parsed.settings || parsed.days || parsed.slots) {
    const proj = normalizeProject(parsed)
    return { activeProjectId: proj.id, projects: [proj] }
  }
  return null
}

// New installs (nothing saved yet, no signed-in account) start with a single
// empty project. Real saved data from local storage/cloud always replaces this.
function buildInitialData() {
  const project = makeProject()
  return { activeProjectId: project.id, projects: [project] }
}

/* ---------------------------------------------------------------
   Date helpers (local time, no UTC drift)
--------------------------------------------------------------- */

const pad = (n) => String(n).padStart(2, "0")
const toKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromKey = (k) => {
  const [y, m, d] = k.split("-").map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (d, n) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
const addMonths = (d, n) => {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return r
}
const addYears = (d, n) => {
  const r = new Date(d)
  r.setFullYear(r.getFullYear() + n)
  return r
}
const startOfWeek = (d) => {
  const r = new Date(d)
  const day = r.getDay()
  const diff = (day === 0 ? -6 : 1) - day // Monday as week start
  r.setDate(r.getDate() + diff)
  r.setHours(0, 0, 0, 0)
  return r
}
const daysBetween = (a, b) =>
  Math.round(
    (new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) /
      86400000,
  )
const sameDay = (a, b) => a && b && toKey(a) === toKey(b)
const fmtShort = (k) => {
  const d = fromKey(k)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`
}
const monthLabel = (d) =>
  d.toLocaleDateString(undefined, { month: "long", year: "numeric" })

// Minutes -> hours label. One digit after the dot unless it's a whole number.
const fmtHours = (minutes) => {
  const h = Math.round((minutes / 60) * 10) / 10
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`
}
// Same rounding as fmtHours, but always keeps one decimal (e.g. "2.0h"), for
// spots where a fixed-width "Xm / Y.Zh" pairing reads better than dropping .0.
const fmtHoursFixed1 = (minutes) => `${(minutes / 60).toFixed(1)}h`

// Minutes -> hours value for charts, kept at full precision for stacking/summing.
const toHours = (minutes) => minutes / 60
// Hours value -> label. Two digits after the dot unless it's a whole number.
const fmtHoursChart = (hoursValue) => {
  const h = Math.round(hoursValue * 100) / 100
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(2)}h`
}
// Axis ticks stay whole hours — "2" and "3" rather than "2.55". Paired with
// allowDecimals={false} on the axis so recharts picks integer ticks in the
// first place; this is the belt-and-braces for any fractional tick that still
// slips through (e.g. a tiny domain where 0/1 are the only integers).
const fmtAxisHours = (hoursValue) => `${Math.round(hoursValue)}`

const goalForDate = (settings, date) =>
  Number(settings?.dailyGoals?.[date.getDay()]) || 0

// A day is out of the statistics if it, its week, or its month carries the
// "ignore in statistics" flag. Everything that reports a number — the period
// header, the log's breakdowns, the analytics — goes through this one
// predicate, so the two halves of the page can't drift apart on what counts.
function makeIsIgnored(weekIgnore = {}, monthIgnore = {}) {
  return (key, entry) => {
    if (entry?.ignore) return true
    const d = fromKey(key)
    if (weekIgnore[toKey(startOfWeek(d))]) return true
    return !!monthIgnore[`${d.getFullYear()}-${pad(d.getMonth() + 1)}`]
  }
}

const NEVER_IGNORED = () => false

// Day count -> "60d (2.0 months)" label, used anywhere a raw elapsed-day
// figure benefits from a more intuitive months-scale readout alongside it.
const fmtDaysWithMonths = (days) =>
  `${days}d (${(days / 30.44).toFixed(1)} months)`

function dayBreakdown(dayEntry, slots) {
  const bySlot = {}
  const byCategory = {}
  let total = 0
  slots.forEach((s) => (bySlot[s.id] = 0))
  if (dayEntry && dayEntry.cells) {
    slots.forEach((s) => {
      const arr = dayEntry.cells[s.id] || []
      arr.forEach((e) => {
        const m = Number(e.minutes) || 0
        bySlot[s.id] += m
        total += m
        byCategory[e.category] = (byCategory[e.category] || 0) + m
      })
    })
  }
  return { bySlot, byCategory, total }
}

function buildTooltip(dayEntry, slots, categories, settings) {
  const lessonsEnabled = settings?.lessonsEnabled !== false
  const examsEnabled = settings?.examsEnabled !== false
  const { bySlot, byCategory, total } = dayBreakdown(dayEntry, slots)
  if (!dayEntry || total === 0) {
    return dayEntry?.comment
      ? `No study logged\n—\n${dayEntry.comment}`
      : "No study logged"
  }
  const lines = [`Total: ${total}m`]
  slots.forEach((s) => {
    if (bySlot[s.id] > 0) lines.push(`${s.label}: ${bySlot[s.id]}m`)
  })
  lines.push("—")
  categories.forEach((c) => {
    if (byCategory[c.id]) lines.push(`${c.label}: ${byCategory[c.id]}m`)
  })
  if (lessonsEnabled && dayEntry.lessons) lines.push(`Lessons: ${dayEntry.lessons}`)
  if (examsEnabled && dayEntry.exam) lines.push("Exam passed")
  if (dayEntry.comment) lines.push("—", dayEntry.comment)
  return lines.join("\n")
}

const makeId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const getById = (list, id, fallbackLabel) =>
  list.find((i) => i.id === id) || {
    id,
    label: fallbackLabel || id,
    color: "#9AA3AC",
    iconName: "HelpCircle",
  }

const DEFAULT_DATA = buildInitialData()

/* ---------------------------------------------------------------
   Shared button style helpers
--------------------------------------------------------------- */

const btnBase = "transition-colors duration-150 ease-out"
const segBtn = (active) =>
  `${btnBase} text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 ${
    active
      ? "text-white border-transparent"
      : "bg-white hover:bg-[#1E2A33]/5 hover:border-[#1E2A33]/35"
  }`
const segBtnStyle = (active) =>
  active ? { backgroundColor: ACCENT } : undefined

/* Segmented control wrapper: pass items [{id,label}], active id, onChange.
   Used everywhere so all "inner tab" rows share one visual style. */
// Styled replacement for the native title="" tooltip. Wrap any small element
// (button, badge, icon) with it; shows a small dark bubble on hover/focus.
//
// The bubble is portalled to <body> and positioned with fixed coordinates taken
// from the trigger. An absolutely positioned bubble living inside the trigger
// gets clipped by any ancestor that scrolls or hides its overflow — the modal
// shell, the modal body, the month grid — which is why the top-row buttons in
// the day editor used to show half a tooltip.
const TIP_GAP = 6
// Rough half-width of the bubble, only used to keep it from running off the
// viewport edge. Exact measurement would need a second render pass; being a few
// pixels off-centre near the screen edge is a better trade than that.
const TIP_HALF_WIDTH = 110

function TipBubble({ box, text, multiline, side }) {
  const centerX = box.left + box.width / 2
  const clampedX = Math.min(
    Math.max(centerX, TIP_HALF_WIDTH + 8),
    Math.max(window.innerWidth - TIP_HALF_WIDTH - 8, TIP_HALF_WIDTH + 8),
  )
  const placement =
    side === "bottom"
      ? {
          top: box.bottom + TIP_GAP,
          left: clampedX,
          transform: "translateX(-50%)",
        }
      : side === "left"
        ? {
            top: box.top + box.height / 2,
            left: box.left - TIP_GAP,
            transform: "translate(-100%, -50%)",
          }
        : {
            top: box.top - TIP_GAP,
            left: clampedX,
            transform: "translate(-50%, -100%)",
          }

  return (
    <span
      role="tooltip"
      style={{ position: "fixed", ...placement }}
      className={`pointer-events-none z-[100] rounded-lg bg-[#1E2A33] text-[#F4F5F7] text-[10px] font-mono leading-snug px-2 py-1.5 shadow-lg ${
        multiline
          ? "whitespace-pre-line max-w-[220px] text-left"
          : "whitespace-nowrap"
      }`}
    >
      {text}
    </span>
  )
}

function Tip({
  text,
  children,
  multiline = false,
  side = "top",
  className = "",
}) {
  const triggerRef = useRef(null)
  const [box, setBox] = useState(null)

  // Fixed coordinates go stale the moment anything scrolls, so drop the bubble
  // instead of letting it float away from its trigger.
  useEffect(() => {
    if (!box) return
    const hide = () => setBox(null)
    window.addEventListener("scroll", hide, true)
    window.addEventListener("resize", hide)
    return () => {
      window.removeEventListener("scroll", hide, true)
      window.removeEventListener("resize", hide)
    }
  }, [box])

  if (!text) return children

  const show = () => {
    if (triggerRef.current) setBox(triggerRef.current.getBoundingClientRect())
  }
  const hide = () => setBox(null)

  return (
    <span
      ref={triggerRef}
      className={`inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {box &&
        createPortal(
          <TipBubble
            box={box}
            text={text}
            multiline={multiline}
            side={side}
          />,
          document.body,
        )}
    </span>
  )
}

// Textarea that grows with its content up to a max height, then scrolls —
// used anywhere a note/comment can get long (day entries, slot/category descriptions).
function AutoTextarea({
  value,
  onChange,
  maxHeight = 160,
  className = "",
  ...rest
}) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [value, maxHeight])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      style={{ maxHeight }}
      className={`${className} overflow-y-auto resize-none`}
      {...rest}
    />
  )
}

function SegmentedControl({ items, activeId, onChange, size = "sm" }) {
  return (
    <div className="inline-flex rounded-xl border border-[#1E2A33]/20 overflow-hidden bg-white">
      {items.map((it, i) => {
        const active = activeId === it.id
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            style={segBtnStyle(active)}
            className={
              segBtn(active) +
              ` border-0 ${i > 0 ? "border-l border-l-[#1E2A33]/10" : ""} ${size === "lg" ? "px-4 py-2" : ""}`
            }
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------
   Toggle chips — used to show/hide individual series on charts
--------------------------------------------------------------- */

function useSeriesToggle() {
  const [hidden, setHidden] = useState(() => new Set())
  const toggle = useCallback((id) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const reset = useCallback(() => setHidden(new Set()), [])
  return { hidden, toggle, reset }
}

function ToggleChips({ items, hidden, onToggle }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 mt-3">
      {items.map((it) => {
        const isHidden = hidden.has(it.id)
        return (
          <button
            key={it.id}
            onClick={() => onToggle(it.id)}
            style={{
              borderColor: it.color,
              backgroundColor: isHidden ? "transparent" : `${it.color}1A`,
              color: isHidden ? "#1E2A3355" : it.color,
            }}
            className={`${btnBase} flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border ${
              isHidden ? "line-through opacity-60" : ""
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: isHidden ? "#1E2A3355" : it.color }}
            />
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------
   Date field — a trigger button plus a react-day-picker popover.

   Replaces <input type="date">, whose calendar belongs to the browser: it
   starts weeks on Sunday regardless of this app's Monday-first convention,
   can't be themed, and looks different on every platform. The panel is
   portalled to <body> for the same reason tooltips are — these fields open
   inside the setup modal and inside the sticky period bar, both of which
   would otherwise clip it.
--------------------------------------------------------------- */

// These have to sit on the calendar's own root: react-day-picker's stylesheet
// re-declares them in its `.rdp-root` rule, so the same variables set on a
// parent element lose and the calendar stays at its 44px default. The font
// size goes here too — the library's own sizes are keywords (`large`,
// `smaller`) relative to the root, so shrinking the root scales the lot.
const DAY_PICKER_FONT_SIZE = "12px"

const DAY_PICKER_STYLE = {
  "--rdp-accent-color": ACCENT,
  "--rdp-accent-background-color": `${ACCENT}1A`,
  "--rdp-today-color": ACCENT,
  "--rdp-day-height": "30px",
  "--rdp-day-width": "30px",
  "--rdp-day_button-height": "28px",
  "--rdp-day_button-width": "28px",
  "--rdp-nav-height": "26px",
  "--rdp-nav_button-height": "26px",
  "--rdp-nav_button-width": "26px",
  "--rdp-weekday-padding": "4px 0",
  fontSize: DAY_PICKER_FONT_SIZE,
}

// Two spots size themselves with absolute keywords (`font-size: large`), so
// they ignore the root entirely however small it gets. Inline styles are the
// only thing that outranks them.
const DAY_PICKER_PART_STYLES = {
  caption_label: { fontSize: "13px", fontWeight: 600 },
}

// Same story for the selected day — `.rdp-selected` is a modifier, not a part,
// so it needs the modifier channel. Only the size is overridden; the library's
// bold weight is what marks the selection.
const DAY_PICKER_MODIFIER_STYLES = {
  selected: { fontSize: DAY_PICKER_FONT_SIZE },
}

// Panel width is only used to keep the popover inside the viewport; the panel
// itself sizes to the calendar so the grid can never overhang its padding.
const DATE_PANEL_MAX_WIDTH = 260

// Shared open/position/dismiss behaviour for the date popovers.
function useDatePopover(openInitially = false) {
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const [open, setOpen] = useState(openInitially)
  const [box, setBox] = useState(null)

  const measure = useCallback(() => {
    if (triggerRef.current) setBox(triggerRef.current.getBoundingClientRect())
  }, [])

  // Opening on mount still needs a measurement pass once the trigger is laid
  // out, hence the frame delay.
  useEffect(() => {
    if (!openInitially) return
    const raf = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(raf)
  }, [openInitially, measure])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false)
    }
    const onPointerDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onPointerDown)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onPointerDown)
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [open, measure])

  const toggle = () => {
    measure()
    setOpen((v) => !v)
  }

  // Below the trigger by default; above it when the viewport runs out, so the
  // panel is never half off-screen.
  let panelStyle = null
  if (box) {
    const spaceBelow = window.innerHeight - box.bottom
    const dropUp = spaceBelow < 320 && box.top > spaceBelow
    panelStyle = {
      position: "fixed",
      left: Math.min(
        box.left,
        Math.max(window.innerWidth - DATE_PANEL_MAX_WIDTH - 8, 8),
      ),
      ...(dropUp
        ? { top: box.top - 6, transform: "translateY(-100%)" }
        : { top: box.bottom + 6 }),
    }
  }

  return { triggerRef, panelRef, open, setOpen, box, panelStyle, toggle }
}

const DATE_PANEL_CLASS =
  "z-[110] w-max rounded-2xl bg-white shadow-2xl p-2 text-[#1E2A33]"

function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  clearable = false,
  className = "",
}) {
  const { triggerRef, panelRef, open, setOpen, box, panelStyle, toggle } =
    useDatePopover()
  const selected = value ? fromKey(value) : undefined

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className={`${FIELD_BOXED} ${className} ${btnBase} flex items-center gap-1.5 text-left hover:bg-[#1E2A33]/[0.03]`}
      >
        <CalendarDays size={13} className="text-[#1E2A33]/40 shrink-0" />
        <span className={value ? "" : "text-[#1E2A33]/35"}>
          {value ? fmtShort(value) : placeholder}
        </span>
      </button>
      {open &&
        box &&
        createPortal(
          <div ref={panelRef} style={panelStyle} className={DATE_PANEL_CLASS}>
            <DayPicker
              mode="single"
              weekStartsOn={1}
              showOutsideDays
              selected={selected}
              defaultMonth={selected}
              style={DAY_PICKER_STYLE}
              styles={DAY_PICKER_PART_STYLES}
              modifiersStyles={DAY_PICKER_MODIFIER_STYLES}
              onSelect={(d) => {
                if (!d) return
                onChange(toKey(d))
                setOpen(false)
              }}
            />
            {clearable && value && (
              <button
                type="button"
                onClick={() => {
                  onChange("")
                  setOpen(false)
                }}
                className={`${btnBase} w-full rounded-xl px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50 hover:bg-[#1E2A33]/5 hover:text-[#1E2A33]`}
              >
                Clear date
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

// Both ends of a custom period in one calendar: click a start, click an end.
// Two separate single-date fields made you open two popovers and hold the
// other end in your head. The trigger doubles as the readout of what's
// currently selected.
function DateRangeField({ start, end, onChange, openOnMount = false }) {
  const { triggerRef, panelRef, open, setOpen, box, panelStyle, toggle } =
    useDatePopover(openOnMount)
  // Left to itself, react-day-picker grows or trims the existing range
  // depending on where you click, which is hard to predict when a range is
  // already set. Driving the clicks ourselves keeps one rule: first click
  // starts a new range, second click ends it.
  const [pendingFrom, setPendingFrom] = useState(null)

  // Escape or an outside click can leave a half-made selection behind, so the
  // slate is wiped on the way in rather than on the way out.
  const openPicker = () => {
    setPendingFrom(null)
    toggle()
  }

  const selected = {
    from: start ? fromKey(start) : undefined,
    to: end ? fromKey(end) : undefined,
  }

  const handleDayClick = (day) => {
    if (!pendingFrom) {
      setPendingFrom(day)
      onChange(toKey(day), toKey(day))
      return
    }
    const [from, to] = pendingFrom <= day ? [pendingFrom, day] : [day, pendingFrom]
    onChange(toKey(from), toKey(to))
    setPendingFrom(null)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={`${FIELD_BOXED} ${btnBase} flex items-center gap-1.5 text-left hover:bg-[#1E2A33]/[0.03]`}
      >
        <CalendarDays size={13} className="text-[#1E2A33]/40 shrink-0" />
        <span>
          {start ? fmtShort(start) : "Start"}
          <span className="text-[#1E2A33]/35"> – </span>
          {end ? fmtShort(end) : "End"}
        </span>
      </button>
      {open &&
        box &&
        createPortal(
          <div ref={panelRef} style={panelStyle} className={DATE_PANEL_CLASS}>
            <DayPicker
              mode="range"
              weekStartsOn={1}
              showOutsideDays
              selected={selected}
              defaultMonth={selected.from}
              style={DAY_PICKER_STYLE}
              styles={DAY_PICKER_PART_STYLES}
              modifiersStyles={DAY_PICKER_MODIFIER_STYLES}
              onSelect={() => {}}
              onDayClick={handleDayClick}
            />
            <p className="px-2 pb-1 pt-0.5 text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/35">
              {pendingFrom ? "Now pick the end" : "Click a start, then an end"}
            </p>
          </div>,
          document.body,
        )}
    </>
  )
}

// The white stat block — one label, one big figure, an optional smaller
// suffix. Shared by the analytics sections and the log's period summaries so
// the two tabs read as the same thing.
function StatTile({ label, value, sub, icon: Icon }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/50">
          {label}
        </span>
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1E2A33]/5">
          <Icon size={12} className="text-[#1E2A33]/40" />
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-xl font-bold">{value}</span>
        {sub && (
          <span className="text-[10px] font-mono text-[#1E2A33]/40">{sub}</span>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------
   Optional multi-user cloud sync (Supabase)

   This app works out of the box as a single-user, local-storage app —
   nothing below is required for that. If you want per-user accounts and
   a shared database (e.g. when deploying this to Netlify), do this:

   1. Create a free project at https://supabase.com
   2. In the SQL editor, run:

      create table study_data (
        user_id uuid primary key references auth.users(id) on delete cascade,
        data jsonb not null,
        updated_at timestamptz default now()
      );
      alter table study_data enable row level security;
      create policy "read own data" on study_data for select using (auth.uid() = user_id);
      create policy "write own data" on study_data for insert with check (auth.uid() = user_id);
      create policy "update own data" on study_data for update using (auth.uid() = user_id);

   3. In Project Settings > API, copy the Project URL and anon public key
      into SUPABASE_URL / SUPABASE_ANON_KEY below.
   4. In your Netlify project: `npm install @supabase/supabase-js`
   5. Add SUPABASE_URL / SUPABASE_ANON_KEY as Netlify environment
      variables if you'd rather not hardcode them, and read them via
      import.meta.env in your own build instead of the constants below.

   Until you fill these in, the app quietly keeps using local storage —
   it will not try to load the Supabase package, so nothing breaks here
   in the chat preview.
--------------------------------------------------------------- */

const SUPABASE_URL = "https://ngrqfvdyyplcsolykaaq.supabase.co" // e.g. "https://xxxxxxxx.supabase.co" — project root only, no /rest/v1/ path
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnFmdmR5eXBsY3NvbHlrYWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMjI0NDgsImV4cCI6MjEwMDU5ODQ0OH0.xxnqMZ91vErHp6s6OE9dY1PH1nIfHVBLhrOUexrFTsY" // your anon/public API key
// Trim whitespace and any trailing slash so small copy-paste differences (a
// trailing "/", a stray newline) don't silently disable cloud sync.
const NORMALIZED_SUPABASE_URL = SUPABASE_URL.trim().replace(/\/+$/, "")
const CLOUD_ENABLED =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(NORMALIZED_SUPABASE_URL) &&
  SUPABASE_ANON_KEY.trim().length > 20

function useCloudAuth() {
  const [client, setClient] = useState(null)
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!CLOUD_ENABLED)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (!CLOUD_ENABLED) return
    let unsub = () => {}
    ;(async () => {
      try {
        const mod = await import("@supabase/supabase-js")
        const sb = mod.createClient(
          NORMALIZED_SUPABASE_URL,
          SUPABASE_ANON_KEY.trim(),
        )
        setClient(sb)
        const { data } = await sb.auth.getSession()
        setSession(data?.session || null)
        const { data: sub } = sb.auth.onAuthStateChange((_evt, sess) =>
          setSession(sess),
        )
        unsub = () => sub.subscription.unsubscribe()
      } catch (e) {
        console.error(
          "Cloud sync unavailable, falling back to local storage.",
          e,
        )
        setLoadError(e)
      } finally {
        setReady(true)
      }
    })()
    return () => unsub()
  }, [])

  return { client, session, ready, loadError, cloudEnabled: CLOUD_ENABLED }
}

function AuthScreen({ client, error }) {
  const [mode, setMode] = useState("signin") // signin | signup
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  // Confirmation-link target — without this, Supabase falls back to the
  // project's configured Site URL, which for most projects is still the
  // default http://localhost:3000. Note this origin also has to be present
  // in the project's Auth > URL Configuration > Redirect URLs allow-list in
  // the Supabase dashboard, or Supabase will reject it and fall back anyway.
  const emailRedirectTo = window.location.origin

  const resendConfirmation = async () => {
    if (!client) return
    if (!email) {
      setMsg("Enter your email above, then tap resend.")
      return
    }
    setResendBusy(true)
    setMsg(null)
    try {
      const { error } = await client.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo },
      })
      if (error) throw error
      setMsg("Confirmation email sent — check your inbox.")
    } catch (err) {
      setMsg(err.message || "Couldn't resend the email.")
    } finally {
      setResendBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!client) return
    setBusy(true)
    setMsg(null)
    try {
      if (mode === "signin") {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo },
        })
        // Depending on Supabase's project settings, signing up again with an
        // email that's already registered but not yet confirmed either (a)
        // throws an "already registered" error, or (b) succeeds silently with
        // an empty `identities` array — either way, that's not a new account,
        // it's someone who needs a fresh confirmation email (e.g. because an
        // earlier one had a bad link). Treat both the same: explicitly resend.
        const alreadyRegisteredError =
          error && /already registered|already exists/i.test(error.message || "")
        const alreadyPendingConfirmation =
          !error &&
          data?.user &&
          Array.isArray(data.user.identities) &&
          data.user.identities.length === 0
        if (alreadyRegisteredError || alreadyPendingConfirmation) {
          const { error: resendError } = await client.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo },
          })
          if (resendError) throw resendError
          setMsg(
            "This email is already registered but not confirmed yet — we've sent a fresh confirmation email.",
          )
          return
        }
        if (error) throw error
        setMsg(
          "Account created — check your inbox to confirm your email, then sign in.",
        )
      }
    } catch (err) {
      const notConfirmed = /email not confirmed/i.test(err.message || "")
      setMsg(
        notConfirmed
          ? "Your email isn't confirmed yet — use \"Didn't get the email? Resend it\" below."
          : err.message || "Something went wrong.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#1E2A33] flex items-center justify-center p-4">
      <div className={`${CARD} w-full max-w-sm p-6`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-[#1E2A33] flex items-center justify-center">
            <Train size={16} className="text-[#F4F5F7]" />
          </div>
          <h1 className="font-sans font-extrabold uppercase tracking-tight text-lg">
            Time tracker
          </h1>
        </div>
        <p className="text-[11px] font-mono uppercase tracking-widest text-[#1E2A33]/45 mb-5">
          {mode === "signin"
            ? "Sign in to your logbook"
            : "Create your logbook"}
        </p>

        {error && (
          <p className="text-[11px] font-mono text-[#C1595B] mb-3">
            Cloud sync failed to load ({String(error.message || error)}). Check
            your Supabase setup.
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#1E2A33]/50 mb-1">
              <Mail size={11} /> Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#1E2A33]/20 rounded-xl px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="block">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#1E2A33]/50 mb-1">
              <Lock size={11} /> Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#1E2A33]/20 rounded-xl px-3 py-2 text-sm font-mono"
            />
          </label>

          {msg && (
            <p className="text-[11px] font-mono text-[#1E2A33]/70">{msg}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{ backgroundColor: ACCENT }}
            className={`${btnBase} w-full text-white text-xs font-mono uppercase tracking-widest px-3 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50`}
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin")
            setMsg(null)
          }}
          className={`${btnBase} mt-4 text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50 hover:text-[#1E2A33]`}
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>

        <button
          onClick={resendConfirmation}
          disabled={resendBusy}
          className={`${btnBase} mt-2 block text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50 hover:text-[#1E2A33] disabled:opacity-50`}
        >
          {resendBusy ? "Sending…" : "Didn't get the email? Resend it"}
        </button>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------
   Main App
--------------------------------------------------------------- */

export default function StudyTrackerApp() {
  const {
    client: cloudClient,
    session,
    ready: authReady,
    loadError,
    cloudEnabled,
  } = useCloudAuth()

  const [data, setData] = useState(DEFAULT_DATA) // { activeProjectId, projects: [...] }
  const [loaded, setLoaded] = useState(false)
  // One period drives the whole page: the log grid at the top and the
  // analytics below it always describe the same stretch of days.
  const [period, setPeriod] = useState("month")
  const [logCursor, setLogCursor] = useState(new Date())
  const [customStart, setCustomStart] = useState(toKey(addDays(new Date(), -30)))
  const [customEnd, setCustomEnd] = useState(toKey(new Date()))
  const [editingKey, setEditingKey] = useState(null)
  const [showSetup, setShowSetup] = useState(false)

  const canUseCloud = cloudEnabled && cloudClient && session

  useEffect(() => {
    if (!authReady) return
    if (cloudEnabled && !session) {
      setLoaded(true)
      return
    }
    ;(async () => {
      try {
        if (canUseCloud) {
          const { data: row, error } = await cloudClient
            .from("study_data")
            .select("data")
            .eq("user_id", session.user.id)
            .maybeSingle()
          if (error) throw error
          const normalized = normalizeData(row && row.data)
          if (normalized) setData(normalized)
          else setShowSetup(true)
        } else {
          const res = await window.storage.get(STORAGE_KEY, false)
          const parsed = res && res.value ? JSON.parse(res.value) : null
          const normalized = normalizeData(parsed)
          if (normalized) setData(normalized)
          else setShowSetup(true)
        }
      } catch (e) {
        setShowSetup(true)
      }
      setLoaded(true)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, canUseCloud])

  // Saves are coalesced: React state updates on every edit so the UI stays
  // responsive, but the blob only goes out once edits stop. pendingRef holds
  // the newest version not yet written.
  const pendingRef = useRef(null)
  const saveTimerRef = useRef(null)

  const writeNow = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const next = pendingRef.current
    if (!next) return
    pendingRef.current = null
    try {
      if (canUseCloud) {
        await cloudClient.from("study_data").upsert({
          user_id: session.user.id,
          data: next,
          updated_at: new Date().toISOString(),
        })
      } else {
        await window.storage.set(STORAGE_KEY, JSON.stringify(next), false)
      }
    } catch (e) {
      console.error("Failed to save", e)
      // Requeue so the next flush retries instead of dropping the edit — unless
      // a newer version landed while this write was in flight, which wins.
      pendingRef.current = pendingRef.current || next
    }
  }, [canUseCloud, cloudClient, session])

  const persist = useCallback(
    (next) => {
      setData(next)
      pendingRef.current = next
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(writeNow, SAVE_DEBOUNCE_MS)
    },
    [writeNow],
  )

  // A debounced write must not be lost when the tab is hidden or closed, nor
  // when the storage target itself changes (sign-in/sign-out).
  useEffect(() => {
    const flushIfHidden = () => {
      if (document.visibilityState === "hidden") writeNow()
    }
    document.addEventListener("visibilitychange", flushIfHidden)
    window.addEventListener("pagehide", writeNow)
    return () => {
      document.removeEventListener("visibilitychange", flushIfHidden)
      window.removeEventListener("pagehide", writeNow)
      writeNow()
    }
  }, [writeNow])

  const project =
    data.projects.find((p) => p.id === data.activeProjectId) || data.projects[0]

  const updateProject = useCallback(
    (patch) => {
      persist({
        ...data,
        projects: data.projects.map((p) =>
          p.id === project.id
            ? {
                ...p,
                ...patch,
                settings: patch.settings
                  ? { ...p.settings, ...patch.settings }
                  : p.settings,
              }
            : p,
        ),
      })
    },
    [data, project, persist],
  )

  const updateSettings = (patch) => updateProject({ settings: patch })
  const updateSlots = (slots) => updateProject({ slots })
  const updateCategories = (categories) => updateProject({ categories })

  const updateDay = (key, patch) => {
    const existing = project.days[key] || {
      cells: {},
      lessons: 0,
      exam: false,
      ignore: false,
    }
    updateProject({
      days: { ...project.days, [key]: { ...existing, ...patch } },
    })
  }

  const updateWeekNote = (weekKey, text) =>
    updateProject({
      weekNotes: { ...(project.weekNotes || {}), [weekKey]: text },
    })
  const updateMonthNote = (monthKey, text) =>
    updateProject({
      monthNotes: { ...(project.monthNotes || {}), [monthKey]: text },
    })
  const updateWeekIgnore = (weekKey, ignore) =>
    updateProject({
      weekIgnore: { ...(project.weekIgnore || {}), [weekKey]: ignore },
    })
  const updateMonthIgnore = (monthKey, ignore) =>
    updateProject({
      monthIgnore: { ...(project.monthIgnore || {}), [monthKey]: ignore },
    })

  const switchProject = (id) => persist({ ...data, activeProjectId: id })

  const addProject = () => {
    const p = makeProject({
      settings: {
        ...DEFAULT_SETTINGS,
        projectName: `New project ${data.projects.length + 1}`,
        startDate: toKey(new Date()),
      },
    })
    persist({ ...data, projects: [...data.projects, p], activeProjectId: p.id })
  }

  const deleteProject = (id) => {
    if (data.projects.length <= 1) return
    const remaining = data.projects.filter((p) => p.id !== id)
    persist({
      ...data,
      projects: remaining,
      activeProjectId:
        data.activeProjectId === id ? remaining[0].id : data.activeProjectId,
    })
  }

  const goToDay = (key) => {
    setLogCursor(fromKey(key))
    setPeriod("day")
  }

  // All-time starts at the first logged day, falling back to the project's
  // configured start — computed here because it needs the saved data.
  const allTimeStart = useMemo(() => {
    const firstLogged = Object.keys(project.days).sort()[0]
    if (firstLogged) return fromKey(firstLogged)
    return project.settings.startDate
      ? fromKey(project.settings.startDate)
      : new Date()
  }, [project.days, project.settings.startDate])

  const range = useMemo(
    () => periodRange(period, logCursor, customStart, customEnd, allTimeStart),
    [period, logCursor, customStart, customEnd, allTimeStart],
  )

  if (!authReady || (cloudEnabled && authReady && !session)) {
    if (!authReady) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] text-[#1E2A33] font-mono text-sm">
          Loading logbook…
        </div>
      )
    }
    return <AuthScreen client={cloudClient} error={loadError} />
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] text-[#1E2A33] font-mono text-sm">
        Loading logbook…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#1E2A33]">
      <TopBar
        onOpenSetup={() => setShowSetup(true)}
        projectName={project.settings.projectName || "Time Tracker"}
        projectIcon={project.settings.projectIcon || "Train"}
        startDate={project.settings.startDate}
        endDate={project.settings.endDate}
        cloudEnabled={cloudEnabled}
        session={session}
        onSignOut={() => cloudClient && cloudClient.auth.signOut()}
      />

      <main className="max-w-6xl mx-auto px-4 pb-24 pt-6">
        <PeriodBar
          period={period}
          setPeriod={setPeriod}
          cursor={logCursor}
          setCursor={setLogCursor}
          range={range}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
        />

        <LogView
          data={project}
          period={period}
          range={range}
          cursor={logCursor}
          onNavigateDay={goToDay}
          onEditDay={setEditingKey}
          onUpdateDayNote={(key, text) => updateDay(key, { comment: text })}
          onUpdateWeekNote={updateWeekNote}
          onUpdateMonthNote={updateMonthNote}
          onUpdateWeekIgnore={updateWeekIgnore}
          onUpdateMonthIgnore={updateMonthIgnore}
        />

        <div className="mt-10">
          <AnalyticsView
            data={project}
            rangeStart={range.start}
            rangeEnd={range.end}
          />
        </div>
      </main>

      {editingKey && (
        <DayQuickviewModal
          dateKey={editingKey}
          dayEntry={project.days[editingKey]}
          slots={project.slots}
          categories={project.categories}
          settings={project.settings}
          onClose={() => setEditingKey(null)}
          onChange={(patch) => updateDay(editingKey, patch)}
          onGoToDayView={(key) => {
            goToDay(key)
            setEditingKey(null)
          }}
          // In the Day view the card that opened this modal *is* the day, so
          // there's nothing to preview and nowhere to drill down to: go
          // straight to editing, with no "back" or "go to day view" escape
          // hatches pointing at where we already are.
          startInEditMode={period === "day"}
        />
      )}

      {showSetup && (
        <SetupModal
          settings={project.settings}
          slots={project.slots}
          categories={project.categories}
          onClose={() => setShowSetup(false)}
          onSaveSettings={updateSettings}
          onUpdateSlots={updateSlots}
          onUpdateCategories={updateCategories}
          projects={data.projects}
          activeProjectId={data.activeProjectId}
          onSwitchProject={switchProject}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
        />
      )}
    </div>
  )
}

/* ---------------------------------------------------------------
   Top Bar
--------------------------------------------------------------- */

const fmtDateLong = (k) =>
  fromKey(k).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

function TopBar({
  onOpenSetup,
  projectName,
  projectIcon,
  startDate,
  endDate,
  cloudEnabled,
  session,
  onSignOut,
}) {
  // Scrolls away with the page — the period bar below is the thing worth
  // keeping within reach, and it carries its own period label.
  return (
    <header className="bg-[#F4F5F7] border-b border-[#1E2A33]/10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#1E2A33] flex items-center justify-center shrink-0">
            <RenderIcon
              name={projectIcon}
              size={16}
              className="text-[#F4F5F7]"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-sans font-extrabold uppercase tracking-tight text-lg leading-none truncate">
              {projectName}
            </h1>
            <p className="text-[11px] uppercase tracking-widest text-[#1E2A33]/50 font-mono mt-0.5">
              {startDate
                ? `${fmtDateLong(startDate)} → ${endDate ? fmtDateLong(endDate) : "ongoing"}`
                : "Route tracker & forecast"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSetup}
            className={`${btnBase} flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide px-3 py-2 rounded-xl border border-[#1E2A33]/20 bg-white hover:bg-[#1E2A33]/5 hover:border-[#1E2A33]/35`}
          >
            <Settings2 size={13} /> Setup
          </button>
          {cloudEnabled && session && (
            <Tip text={session.user.email}>
              <button
                onClick={onSignOut}
                className={`${btnBase} flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide px-3 py-2 rounded-xl border border-[#1E2A33]/20 bg-white hover:bg-[#1E2A33]/5 hover:border-[#1E2A33]/35`}
              >
                <LogOut size={13} />
              </button>
            </Tip>
          )}
        </div>
      </div>
    </header>
  )
}

/* ---------------------------------------------------------------
   Setup Modal (project details / slots / categories)
--------------------------------------------------------------- */

function SetupModal({
  settings,
  slots,
  categories,
  onClose,
  onSaveSettings,
  onUpdateSlots,
  onUpdateCategories,
  projects,
  activeProjectId,
  onSwitchProject,
  onAddProject,
  onDeleteProject,
}) {
  const [tab, setTab] = useState("details")
  const onBackdropClick = useModalDismiss(onClose)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onMouseDown={onBackdropClick}
    >
      <div
        style={{ backgroundColor: "#ffffff" }}
        className="w-full max-w-lg rounded-2xl shadow-xl border border-[#1E2A33]/10 max-h-[90vh] flex flex-col"
      >
        <div
          style={{ backgroundColor: "#ffffff" }}
          className="flex items-center justify-between px-5 py-4 border-b border-[#1E2A33]/10 shrink-0 rounded-t-xl"
        >
          <h2 className="font-sans font-extrabold uppercase tracking-tight text-sm">
            Setup
          </h2>
          <button
            onClick={onClose}
            className={`${btnBase} text-[#1E2A33]/50 hover:text-[#1E2A33]`}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{ backgroundColor: "#ffffff" }}
          className="flex border-b border-[#1E2A33]/10 shrink-0"
        >
          {[
            { id: "details", label: "Project details" },
            { id: "slots", label: "Study slots" },
            { id: "categories", label: "Categories" },
            { id: "projects", label: "Projects" },
          ].map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={
                  active ? { borderColor: ACCENT, color: ACCENT } : undefined
                }
                className={`${btnBase} flex-1 text-[10px] font-mono uppercase tracking-widest px-3 py-2.5 border-b-2 ${
                  active
                    ? ""
                    : "border-transparent text-[#1E2A33]/50 hover:text-[#1E2A33] hover:bg-[#1E2A33]/5"
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div
          style={{ backgroundColor: "#ffffff" }}
          className="p-5 overflow-y-auto rounded-b-xl"
        >
          {tab === "details" && (
            <ProjectDetailsTab settings={settings} onSave={onSaveSettings} />
          )}
          {tab === "slots" && (
            <EditableList
              items={slots}
              onChange={onUpdateSlots}
              noun="slot"
              warningNote={(label) =>
                `Remove "${label}"? Its logged time stays stored but won't appear in the log or analytics anymore.`
              }
            />
          )}
          {tab === "categories" && (
            <EditableList
              items={categories}
              onChange={onUpdateCategories}
              noun="category"
              warningNote={(label) =>
                `Remove "${label}"? Entries already logged under it stay stored but will show as removed.`
              }
            />
          )}
          {tab === "projects" && (
            <ProjectsTab
              projects={projects}
              activeProjectId={activeProjectId}
              onSwitch={(id) => {
                onSwitchProject(id)
                onClose()
              }}
              onAdd={onAddProject}
              onDelete={onDeleteProject}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ProjectsTab({ projects, activeProjectId, onSwitch, onAdd, onDelete }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  return (
    <div className="space-y-2 font-mono text-sm">
      <p className="text-[10px] uppercase tracking-widest text-[#1E2A33]/50 mb-1">
        Switch between separate projects, each with its own slots, categories and
        log.
      </p>
      {projects.map((p) => {
        const active = p.id === activeProjectId
        return (
          <div
            key={p.id}
            className={`border rounded-xl p-2.5 flex items-center gap-2.5 ${active ? "border-[#1E2A33]" : "border-[#1E2A33]/15"}`}
          >
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: active ? "#1E2A33" : "#1E2A330D",
                color: active ? "#fff" : "#1E2A33",
              }}
            >
              <RenderIcon name={p.settings.projectIcon} size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">
                {p.settings.projectName || "Untitled project"}
              </div>
              <div className="text-[10px] text-[#1E2A33]/40 truncate">
                {p.settings.startDate
                  ? fmtDateLong(p.settings.startDate)
                  : "No start date"}
                {p.settings.endDate
                  ? ` → ${fmtDateLong(p.settings.endDate)}`
                  : ""}
              </div>
            </div>
            {confirmDeleteId === p.id ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className={`${btnBase} px-2 py-1 rounded-md border border-[#1E2A33]/20 hover:bg-[#1E2A33]/5 uppercase tracking-widest text-[9px]`}
                >
                  Keep
                </button>
                <button
                  onClick={() => {
                    onDelete(p.id)
                    setConfirmDeleteId(null)
                  }}
                  className={`${btnBase} px-2 py-1 rounded-md bg-[#C1595B] text-white hover:bg-[#a94a4c] uppercase tracking-widest text-[9px]`}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 shrink-0">
                {!active && (
                  <button
                    onClick={() => onSwitch(p.id)}
                    style={{ backgroundColor: ACCENT }}
                    className={`${btnBase} text-white px-2.5 py-1.5 rounded-lg uppercase tracking-widest text-[9px]`}
                  >
                    Switch
                  </button>
                )}
                {active && (
                  <span className="text-[9px] uppercase tracking-widest text-[#1E2A33]/40 px-1">
                    Active
                  </span>
                )}
                <Tip
                  text={
                    projects.length <= 1
                      ? "At least one project is required"
                      : "Delete project"
                  }
                >
                  <button
                    disabled={projects.length <= 1}
                    onClick={() => setConfirmDeleteId(p.id)}
                    className={`${btnBase} p-1.5 text-[#1E2A33]/40 hover:text-[#C1595B] disabled:opacity-20 disabled:cursor-not-allowed`}
                  >
                    <Trash2 size={14} />
                  </button>
                </Tip>
              </div>
            )}
          </div>
        )
      })}
      <button
        onClick={onAdd}
        className={`${btnBase} flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/60 hover:text-[#1E2A33] px-1 py-1.5`}
      >
        <Plus size={13} /> New project
      </button>
    </div>
  )
}

function ProjectDetailsTab({ settings, onSave }) {
  const [projectName, setProjectName] = useState(
    settings.projectName ?? "Time Tracker",
  )
  const [projectIcon, setProjectIcon] = useState(
    settings.projectIcon ?? "Train",
  )
  const [totalLessons, setTotalLessons] = useState(settings.totalLessons ?? 100)
  const [totalExams, setTotalExams] = useState(settings.totalExams ?? 10)
  const [lessonsEnabled, setLessonsEnabled] = useState(
    settings.lessonsEnabled !== false,
  )
  const [examsEnabled, setExamsEnabled] = useState(
    settings.examsEnabled !== false,
  )
  const [startDate, setStartDate] = useState(
    settings.startDate || toKey(new Date()),
  )
  const [endDate, setEndDate] = useState(settings.endDate || "")
  const [dailyGoals, setDailyGoals] = useState(
    settings.dailyGoals || DEFAULT_SETTINGS.dailyGoals,
  )
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(
      () =>
        onSave({
          projectName,
          projectIcon,
          totalLessons,
          totalExams,
          lessonsEnabled,
          examsEnabled,
          startDate,
          endDate: endDate || null,
          dailyGoals,
        }),
      300,
    )
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    projectName,
    projectIcon,
    totalLessons,
    totalExams,
    lessonsEnabled,
    examsEnabled,
    startDate,
    endDate,
    dailyGoals,
  ])

  const setGoal = (dayIdx, minutes) =>
    setDailyGoals((g) => ({
      ...g,
      [dayIdx]: Math.max(0, Number(minutes) || 0),
    }))

  return (
    <div className="space-y-5 font-mono text-sm">
      <div>
        <span className="block text-[10px] uppercase tracking-widest text-[#1E2A33]/50 mb-1">
          Project
        </span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIconPickerOpen((o) => !o)}
              className={`${btnBase} w-10 h-10 rounded-xl border-2 flex items-center justify-center hover:opacity-75 shrink-0`}
              style={{ borderColor: ACCENT, color: ACCENT }}
            >
              <RenderIcon name={projectIcon} size={18} />
            </button>
            {iconPickerOpen && (
              <div className="absolute z-30 top-12 left-0 bg-white border border-[#1E2A33]/15 rounded-xl shadow-lg p-2.5 w-56">
                <p className="text-[9px] uppercase tracking-widest text-[#1E2A33]/40 mb-1.5">
                  Project icon
                </p>
                <div className="grid grid-cols-6 gap-1">
                  {ICON_LIBRARY.map((opt) => (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => {
                        setProjectIcon(opt.name)
                        setIconPickerOpen(false)
                      }}
                      className={`${btnBase} p-1.5 rounded-md hover:bg-[#1E2A33]/10 flex items-center justify-center ${
                        projectIcon === opt.name
                          ? "bg-[#1E2A33]/10 ring-1 ring-[#1E2A33]/30"
                          : ""
                      }`}
                    >
                      <RenderIcon name={opt.name} size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
            className="flex-1 border border-[#1E2A33]/20 rounded-xl px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="block text-[10px] uppercase tracking-widest text-[#1E2A33]/50">
            Total lessons in project
          </span>
          <Tip text="Include lessons log and analytics">
            <SwitchToggle
              checked={lessonsEnabled}
              onChange={setLessonsEnabled}
              label="Include lessons log and analytics"
            />
          </Tip>
        </div>
        <input
          type="number"
          min={1}
          value={totalLessons}
          disabled={!lessonsEnabled}
          onChange={(e) => setTotalLessons(Number(e.target.value))}
          className="w-full border border-[#1E2A33]/20 rounded-xl px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="block text-[10px] uppercase tracking-widest text-[#1E2A33]/50">
            Total exams in project
          </span>
          <Tip text="Include exams log and analytics">
            <SwitchToggle
              checked={examsEnabled}
              onChange={setExamsEnabled}
              label="Include exams log and analytics"
            />
          </Tip>
        </div>
        <input
          type="number"
          min={0}
          value={totalExams}
          disabled={!examsEnabled}
          onChange={(e) => setTotalExams(Number(e.target.value))}
          className="w-full border border-[#1E2A33]/20 rounded-xl px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>
      <Field label="Project start date">
        <DateField
          value={startDate}
          onChange={setStartDate}
          placeholder="Pick a start date"
          className="w-full"
        />
      </Field>
      <Field label="Project end date (optional)">
        <DateField
          value={endDate}
          onChange={setEndDate}
          placeholder="No end date"
          clearable
          className="w-full"
        />
        <p className="text-[9px] text-[#1E2A33]/40 mt-1">
          Once set, days after this date won't count as "empty days" in
          Analytics.
        </p>
      </Field>

      <div>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#1E2A33]/50 mb-2">
          <Gauge size={12} /> Effectiveness meter — daily minute goal
        </span>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_ORDER.map((idx) => (
            <label key={idx} className="flex flex-col items-center gap-1">
              <span className="text-[9px] uppercase tracking-widest text-[#1E2A33]/40">
                {WEEKDAY_LABELS[idx]}
              </span>
              <input
                type="number"
                min={0}
                value={dailyGoals[idx] ?? 0}
                onChange={(e) => setGoal(idx, e.target.value)}
                className="w-full border border-[#1E2A33]/20 rounded-xl px-1.5 py-1.5 text-xs text-center"
              />
            </label>
          ))}
        </div>
        <p className="text-[9px] text-[#1E2A33]/40 mt-1.5">
          Minutes per day. Shown as an hours goal on each day card in the Log
          tab.
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-[#1E2A33]/50 mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}

// Small switch-style toggle, used for turning optional features (lessons,
// exams) on/off. Wrap with <Tip> for a hover explanation.
function SwitchToggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{ backgroundColor: checked ? ACCENT : "#1E2A3325" }}
      className={`${btnBase} relative inline-flex items-center w-8 h-[18px] rounded-full shrink-0`}
    >
      <span
        className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform duration-150 ${
          checked ? "translate-x-[15px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  )
}

/* ---------------------------------------------------------------
   Editable list (used for both slots & categories)
--------------------------------------------------------------- */

function EditableList({ items, onChange, noun, warningNote }) {
  const [openPickerId, setOpenPickerId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const updateItem = (id, patch) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  const addItem = () =>
    onChange([
      ...items,
      {
        id: makeId(noun),
        label: `New ${noun}`,
        iconName: "Star",
        color: PALETTE[items.length % PALETTE.length],
      },
    ])
  const removeItem = (id) => {
    onChange(items.filter((i) => i.id !== id))
    setConfirmDeleteId(null)
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="border border-[#1E2A33]/15 rounded-xl p-2 bg-white"
        >
          {confirmDeleteId === item.id ? (
            <div className="flex items-center justify-between gap-3 text-xs font-mono">
              <span className="text-[#C1595B]">{warningNote(item.label)}</span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className={`${btnBase} px-2 py-1 rounded-md border border-[#1E2A33]/20 hover:bg-[#1E2A33]/5 uppercase tracking-widest text-[10px]`}
                >
                  Keep
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className={`${btnBase} px-2 py-1 rounded-md bg-[#C1595B] text-white hover:bg-[#a94a4c] uppercase tracking-widest text-[10px]`}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() =>
                      setOpenPickerId(openPickerId === item.id ? null : item.id)
                    }
                    style={{ borderColor: item.color, color: item.color }}
                    className={`${btnBase} w-8 h-8 rounded-xl flex items-center justify-center border-2 hover:opacity-75 shrink-0`}
                  >
                    <RenderIcon name={item.iconName} size={15} />
                  </button>
                  {openPickerId === item.id && (
                    <div className="absolute z-30 top-10 left-0 bg-white border border-[#1E2A33]/15 rounded-xl shadow-lg p-2.5 w-56">
                      <p className="text-[9px] uppercase tracking-widest text-[#1E2A33]/40 mb-1.5">
                        Icon
                      </p>
                      <div className="grid grid-cols-6 gap-1 mb-3">
                        {ICON_LIBRARY.map((opt) => (
                          <button
                            key={opt.name}
                            onClick={() =>
                              updateItem(item.id, { iconName: opt.name })
                            }
                            className={`${btnBase} p-1.5 rounded-md hover:bg-[#1E2A33]/10 flex items-center justify-center ${
                              item.iconName === opt.name
                                ? "bg-[#1E2A33]/10 ring-1 ring-[#1E2A33]/30"
                                : ""
                            }`}
                          >
                            <RenderIcon name={opt.name} size={14} />
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] uppercase tracking-widest text-[#1E2A33]/40 mb-1.5">
                        Color
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {PALETTE.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateItem(item.id, { color: c })}
                            style={{
                              backgroundColor: c,
                              outline:
                                item.color === c ? "2px solid #1E2A33" : "none",
                              outlineOffset: "1px",
                            }}
                            className={`${btnBase} w-5 h-5 rounded-full hover:scale-110`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setOpenPickerId(null)}
                        className={`${btnBase} mt-3 text-[9px] uppercase tracking-widest text-[#1E2A33]/40 hover:text-[#1E2A33]`}
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
                <input
                  value={item.label}
                  onChange={(e) =>
                    updateItem(item.id, { label: e.target.value })
                  }
                  className="flex-1 border border-[#1E2A33]/20 rounded-xl px-2 py-1.5 text-xs font-mono"
                />
                <Tip
                  text={
                    items.length <= 1 ? "At least one is required" : "Remove"
                  }
                >
                  <button
                    disabled={items.length <= 1}
                    onClick={() => setConfirmDeleteId(item.id)}
                    className={`${btnBase} p-1.5 text-[#1E2A33]/40 hover:text-[#C1595B] disabled:opacity-20 disabled:cursor-not-allowed`}
                  >
                    <Trash2 size={14} />
                  </button>
                </Tip>
              </div>
              <div className="flex items-start gap-1.5 pl-1">
                <MessageSquare
                  size={12}
                  className="text-[#1E2A33]/25 shrink-0 mt-1.5"
                />
                <AutoTextarea
                  value={item.description || ""}
                  onChange={(e) =>
                    updateItem(item.id, { description: e.target.value })
                  }
                  placeholder={`What counts as this ${noun}? (optional)`}
                  rows={1}
                  maxHeight={100}
                  className="flex-1 border border-[#1E2A33]/10 rounded-lg px-2 py-1 text-[10px] font-mono bg-[#F4F5F7]/50"
                />
              </div>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={addItem}
        className={`${btnBase} flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/60 hover:text-[#1E2A33] px-1 py-1.5`}
      >
        <Plus size={13} /> Add {noun}
      </button>
    </div>
  )
}

/* ---------------------------------------------------------------
   Period model — shared by the log and the analytics below it

   One selector drives both halves of the page. The first five periods are
   anchored on a moving cursor and can be stepped back and forth; "all" and
   "custom" define their own bounds, so stepping them is meaningless.
--------------------------------------------------------------- */

const PERIODS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "90days", label: "3 Months" },
  { id: "year", label: "Year" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
]

const NAVIGABLE_PERIODS = new Set(["day", "week", "month", "90days", "year"])

// Show-on-scroll-up: the period bar is worth reaching for at any depth of the
// page, but not worth permanently spending a strip of vertical space on.
// Scrolling down tucks it away, scrolling up brings it straight back.
function useRevealOnScrollUp(threshold = 6) {
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)

  useEffect(() => {
    lastY.current = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastY.current
      // Ignore jitter, and never hide it while we're still near the top —
      // there's nothing above it to tuck under yet.
      if (Math.abs(delta) < threshold) return
      setVisible(delta < 0 || y < 120)
      lastY.current = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [threshold])

  return visible
}
// Too long to draw as day cards or a month grid — these render as a heatmap.
const WIDE_PERIODS = new Set(["90days", "year", "all", "custom"])

function stepCursor(cursor, period, dir) {
  switch (period) {
    case "day":
      return addDays(cursor, dir)
    case "week":
      return addDays(cursor, dir * 7)
    case "month":
      return addMonths(cursor, dir)
    case "90days":
      return addDays(cursor, dir * 90)
    case "year":
      return addYears(cursor, dir)
    default:
      return cursor
  }
}

// The single source of truth for "what stretch of days are we looking at".
// `allStart` is where an all-time range begins — the first logged day, or the
// project start; the caller owns that because it needs the saved data.
function periodRange(period, cursor, customStart, customEnd, allStart) {
  const today = new Date()
  switch (period) {
    case "day":
      return { start: cursor, end: cursor }
    case "week": {
      const s = startOfWeek(cursor)
      return { start: s, end: addDays(s, 6) }
    }
    case "month": {
      const y = cursor.getFullYear()
      const m = cursor.getMonth()
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) }
    }
    case "90days":
      return { start: addDays(cursor, -89), end: cursor }
    case "year":
      return {
        start: new Date(cursor.getFullYear(), 0, 1),
        end: new Date(cursor.getFullYear(), 11, 31),
      }
    case "all":
      return { start: allStart || today, end: today }
    case "custom": {
      const s = customStart ? fromKey(customStart) : today
      const e = customEnd ? fromKey(customEnd) : today
      return e < s ? { start: e, end: s } : { start: s, end: e }
    }
    default:
      return { start: today, end: today }
  }
}

const fmtRangeEdge = (d, withYear) =>
  d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  })

function rangeLabel(period, cursor, range) {
  if (period === "month") return monthLabel(cursor)
  if (period === "year") return String(cursor.getFullYear())
  if (period === "day") {
    return cursor.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }
  if (period === "all") {
    return `All time · ${fmtRangeEdge(range.start, true)} – ${fmtRangeEdge(range.end, true)}`
  }
  return `${fmtRangeEdge(range.start)} – ${fmtRangeEdge(range.end, true)}`
}

// Pill-style period picker: one rounded trough holding rounded pills, the
// active one filled. Distinct from SegmentedControl (still used for the chart
// mode switches) because this one is the page's primary control.
function PeriodPills({ period, setPeriod }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
      {PERIODS.map((p) => {
        const active = p.id === period
        return (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`${btnBase} rounded-full px-3 py-1.5 text-[11px] font-mono whitespace-nowrap ${
              active
                ? "text-white"
                : "text-[#1E2A33]/60 hover:text-[#1E2A33] hover:bg-[#1E2A33]/5"
            }`}
            style={active ? { backgroundColor: ACCENT } : undefined}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

// Selector, custom bounds and cursor navigation for the whole page. Sticks to
// the very top now that the project header scrolls away, and carries the
// current period's label so you never have to scroll up to see where you are.
function PeriodBar({
  period,
  setPeriod,
  cursor,
  setCursor,
  range,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
}) {
  const navigable = NAVIGABLE_PERIODS.has(period)
  const navBtn = `${btnBase} rounded-full bg-white shadow-sm hover:bg-[#1E2A33]/5 disabled:opacity-35 disabled:hover:bg-white disabled:cursor-not-allowed`
  const visible = useRevealOnScrollUp()

  return (
    <div
      className={`sticky top-0 z-10 -mx-4 mb-4 px-4 py-3 bg-[#F4F5F7]/95 backdrop-blur transition-transform duration-200 ease-out ${
        visible ? "translate-y-0" : "-translate-y-[130%]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          {/* Seven pills overflow a phone; let the strip scroll sideways
              rather than clip or wrap. */}
          <div className="max-w-full overflow-x-auto whitespace-nowrap">
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

        <div className="flex items-center gap-1.5">
          {/* Jumping to "now" is a shortcut, not a step through the timeline —
              it sits outside the back/forward pair and carries no chrome. */}
          <Tip
            text={
              navigable ? "Jump to the current period" : "Jump to this week"
            }
          >
            <button
              onClick={() => {
                if (!navigable) setPeriod("week")
                setCursor(new Date())
              }}
              className={`${btnBase} p-2 rounded-full text-[#1E2A33]/45 hover:text-[#1E2A33] hover:bg-[#1E2A33]/5`}
            >
              <CalendarCheck size={16} />
            </button>
          </Tip>
          <Tip text={navigable ? undefined : "This period sets its own dates"}>
            <button
              disabled={!navigable}
              onClick={() => setCursor(stepCursor(cursor, period, -1))}
              className={`${navBtn} p-2`}
            >
              <ChevronLeft size={16} />
            </button>
          </Tip>
          {/* The period reads as the label of the two arrows around it. */}
          <span className="px-2 font-sans font-extrabold uppercase tracking-tight text-xs text-center min-w-[9rem] truncate">
            {rangeLabel(period, cursor, range)}
          </span>
          <Tip text={navigable ? undefined : "This period sets its own dates"}>
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
  )
}

// Inline, auto-saving note for a whole day/week/month — mount with a
// `key` tied to the period (e.g. weekKey) so it resets its local buffer
// when the person navigates to a different period.
function NoteCard({ label, icon: Icon, value, onSave }) {
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

function LogView({
  data,
  period,
  range,
  cursor,
  onNavigateDay,
  onEditDay,
  onUpdateDayNote,
  onUpdateWeekNote,
  onUpdateMonthNote,
  onUpdateWeekIgnore,
  onUpdateMonthIgnore,
}) {
  const granularity = period
  const {
    slots,
    categories,
    days,
    settings,
    weekNotes = {},
    monthNotes = {},
    weekIgnore = {},
    monthIgnore = {},
  } = data
  const todayKey = toKey(new Date())
  const dayKey = toKey(cursor)
  const weekKey = toKey(startOfWeek(cursor))
  const monthKey = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`

  const visibleDates = useMemo(
    () => datesInRange(range.start, range.end),
    [range.start, range.end],
  )

  const isIgnored = useMemo(
    () => makeIsIgnored(weekIgnore, monthIgnore),
    [weekIgnore, monthIgnore],
  )

  const headerStats = useMemo(() => {
    if (granularity === "week")
      return rangeStats(weekDates(cursor), days, slots, settings, isIgnored)
    if (granularity === "month")
      return rangeStats(monthDates(cursor), days, slots, settings, isIgnored)
    return null
  }, [granularity, cursor, days, slots, settings, isIgnored])

  const monthPast =
    granularity === "month" &&
    toKey(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)) < todayKey
  const weekPast =
    granularity === "week" &&
    toKey(addDays(startOfWeek(cursor), 6)) < todayKey
  const periodIgnored =
    granularity === "week"
      ? !!weekIgnore[weekKey]
      : granularity === "month"
        ? !!monthIgnore[monthKey]
        : false
  const periodGoalOutcome =
    (monthPast || weekPast) && !periodIgnored && headerStats?.goal > 0
      ? headerStats.total >= headerStats.goal
        ? "met"
        : "missed"
      : null

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-sans font-extrabold uppercase tracking-tight text-base">
            {rangeLabel(period, cursor, range)}
          </h2>
          {periodGoalOutcome && (
            <Tip
              text={
                periodGoalOutcome === "met"
                  ? `${granularity === "week" ? "Weekly" : "Monthly"} goal met`
                  : `${granularity === "week" ? "Weekly" : "Monthly"} goal missed`
              }
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{
                  backgroundColor:
                    periodGoalOutcome === "met" ? GOAL_MET_COLOR : EXAM_COLOR,
                }}
              />
            </Tip>
          )}
          {headerStats && (
            <span className="text-xs font-mono text-[#1E2A33]/50">
              {headerStats.total > 0 ? fmtHours(headerStats.total) : "0h"}{" "}
              studied
              {headerStats.goal > 0 && (
                <> · goal {fmtHours(headerStats.goal)}</>
              )}
            </span>
          )}
        </div>
        {granularity === "week" && (
          <label className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50 hover:text-[#1E2A33] cursor-pointer">
            <input
              type="checkbox"
              checked={!!weekIgnore[weekKey]}
              onChange={(e) => onUpdateWeekIgnore(weekKey, e.target.checked)}
              className="w-3.5 h-3.5 accent-[#1E2A33]/60"
            />
            Ignore in statistics
          </label>
        )}
        {granularity === "month" && (
          <label className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50 hover:text-[#1E2A33] cursor-pointer">
            <input
              type="checkbox"
              checked={!!monthIgnore[monthKey]}
              onChange={(e) => onUpdateMonthIgnore(monthKey, e.target.checked)}
              className="w-3.5 h-3.5 accent-[#1E2A33]/60"
            />
            Ignore in statistics
          </label>
        )}
      </div>

      {granularity === "day" && (
        <NoteCard
          key={dayKey}
          label="Day notes"
          icon={MessageSquare}
          value={days[dayKey]?.comment}
          onSave={(text) => onUpdateDayNote(dayKey, text)}
        />
      )}
      {granularity === "week" && (
        <NoteCard
          key={weekKey}
          label="Week notes"
          icon={MessageSquare}
          value={weekNotes[weekKey]}
          onSave={(text) => onUpdateWeekNote(weekKey, text)}
        />
      )}
      {granularity === "month" && (
        <NoteCard
          key={monthKey}
          label="Month notes"
          icon={MessageSquare}
          value={monthNotes[monthKey]}
          onSave={(text) => onUpdateMonthNote(monthKey, text)}
        />
      )}

      <PeriodTotals
        dates={visibleDates}
        days={days}
        slots={slots}
        categories={categories}
        isIgnored={isIgnored}
      />

      {granularity === "month" && (
        <MonthGrid
          cursor={cursor}
          days={days}
          slots={slots}
          categories={categories}
          settings={settings}
          todayKey={todayKey}
          onNavigateDay={onNavigateDay}
          onEditDay={onEditDay}
          weekIgnore={weekIgnore}
          monthIgnore={monthIgnore}
        />
      )}
      {(granularity === "week" || granularity === "day") && (
        <FullCardGrid
          dates={visibleDates}
          days={days}
          slots={slots}
          categories={categories}
          settings={settings}
          todayKey={todayKey}
          onNavigateDay={onNavigateDay}
          onEditDay={onEditDay}
          weekIgnore={weekIgnore}
          monthIgnore={monthIgnore}
          big={granularity === "day"}
        />
      )}
      {/* Anything longer than a month — including all-time and custom — is
          only legible as a heatmap. */}
      {WIDE_PERIODS.has(granularity) && (
        <Heatmap
          start={range.start}
          end={range.end}
          days={days}
          slots={slots}
          categories={categories}
          settings={settings}
          todayKey={todayKey}
          onSelectDay={onEditDay}
          isIgnored={isIgnored}
          showMonths
        />
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-mono uppercase tracking-wide text-[#1E2A33]/60">
        {slots.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <RenderIcon
              name={s.iconName}
              size={11}
              style={{ color: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function weekDates(cursor) {
  const s = startOfWeek(cursor)
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}

function monthDates(cursor) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Array.from(
    { length: daysInMonth },
    (_, i) => new Date(year, month, i + 1),
  )
}

// Every date in the selected range, so a period readout aggregates over
// exactly what the grid/heatmap below it is showing.
function datesInRange(start, end) {
  const count = daysBetween(start, end) + 1
  if (count <= 0) return []
  return Array.from({ length: count }, (_, i) => addDays(start, i))
}

// Rolls dayBreakdown up over a whole period: how much time each slot and each
// category took in total. Ignored days are left out entirely — that's what the
// flag promises.
function periodBreakdown(dates, days, slots, categories, isIgnored) {
  const bySlot = {}
  const byCategory = {}
  let total = 0
  slots.forEach((s) => (bySlot[s.id] = 0))
  dates.forEach((d) => {
    const key = toKey(d)
    if (isIgnored(key, days[key])) return
    const b = dayBreakdown(days[key], slots)
    total += b.total
    slots.forEach((s) => (bySlot[s.id] += b.bySlot[s.id] || 0))
    Object.entries(b.byCategory).forEach(([id, m]) => {
      byCategory[id] = (byCategory[id] || 0) + m
    })
  })
  // Configured categories in their configured order, then any id that survives
  // only inside old entries, so the rows always add back up to the total.
  const categoryIds = [
    ...categories.map((c) => c.id),
    ...Object.keys(byCategory).filter(
      (id) => !categories.some((c) => c.id === id),
    ),
  ]
  const toRow = (item, minutes) => ({ ...item, minutes })
  return {
    total,
    slotRows: slots
      .map((s) => toRow(s, bySlot[s.id] || 0))
      .filter((r) => r.minutes > 0),
    categoryRows: categoryIds
      .map((id) => toRow(getById(categories, id), byCategory[id] || 0))
      .filter((r) => r.minutes > 0),
  }
}

// Days of a period that have actually happened and actually count. Per-day
// averages divide by this rather than by the full length, so neither a month
// still in progress nor a stretch of ignored days drags the figure down.
function elapsedDayCount(dates, days, isIgnored) {
  const todayKey = toKey(new Date())
  const counted = dates.filter((d) => {
    const key = toKey(d)
    return key <= todayKey && !isIgnored(key, days[key])
  })
  return Math.max(counted.length, 1)
}

// Part-of-whole, so a donut: the ring shows the split at a glance and the
// hole carries the total, which the bar version had nowhere to put. The
// legend beside it does the work an axis would — every entry pairs a swatch
// with its name, hours and share, so identity never rests on colour alone and
// the small slices stay readable instead of vanishing into slivers.
function TotalsDonut({ rows, total, divisor }) {
  const data = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        label: r.label,
        color: r.color,
        hours: toHours(r.minutes),
        minutes: r.minutes,
        share: total > 0 ? (r.minutes / total) * 100 : 0,
      })),
    [rows, total],
  )

  if (!data.length) {
    return (
      <p className="text-[10px] font-mono text-[#1E2A33]/40 py-6 text-center">
        Nothing logged in this period.
      </p>
    )
  }

  return (
    // Side by side only once the card is genuinely wide; in the two-column
    // grid the legend would otherwise get ~180px and chop the longer category
    // names down to nothing.
    <div className="flex flex-col lg:flex-row items-center gap-4">
      <div className="relative shrink-0" style={{ width: 150, height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="minutes"
              nameKey="label"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 11, fontFamily: "monospace" }}
              formatter={(value, name) => [
                `${fmtHours(value)}${
                  divisor > 1 ? ` · ${fmtHoursFixed1(value / divisor)}/day` : ""
                } · ${total > 0 ? Math.round((value / total) * 100) : 0}%`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono text-base font-extrabold">
            {fmtHours(total)}
          </span>
          <span className="text-[8px] font-mono uppercase tracking-widest text-[#1E2A33]/40">
            total
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0 w-full space-y-1">
        {data.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-1.5 text-[10px] font-mono"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-[#1E2A33]/70 truncate">{d.label}</span>
            <span className="flex-1 border-b border-dotted border-[#1E2A33]/15 min-w-[8px]" />
            <span className="font-bold shrink-0">{fmtHours(d.minutes)}</span>
            <span className="text-[#1E2A33]/40 tabular-nums w-8 text-right shrink-0">
              {Math.round(d.share)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// "Where the time went" panel for the Log tab — per-slot and per-category
// totals for whichever range is selected (day, week, month, 90 days, year),
// each with its per-day average once the period covers more than one day.
function PeriodTotals({ dates, days, slots, categories, isIgnored }) {
  const { total, slotRows, categoryRows } = useMemo(
    () => periodBreakdown(dates, days, slots, categories, isIgnored),
    [dates, days, slots, categories, isIgnored],
  )
  const divisor = useMemo(
    () => elapsedDayCount(dates, days, isIgnored),
    [dates, days, isIgnored],
  )

  const perDay =
    divisor > 1 ? ` · ${fmtHoursFixed1(total / divisor)}/day` : ""

  if (total === 0) {
    return (
      <div className={`${CARD} mb-4 text-[10px] font-mono text-[#1E2A33]/40`}>
        No study logged in this period.
      </div>
    )
  }

  // Two separate cards side by side, the same shape the analytics charts use
  // further down the page — one card holding two charts read as a single
  // muddled figure.
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-4">
      <ChartCard
        title="Time by slot"
        subtitle={`When the ${fmtHours(total)}${perDay} went`}
      >
        <TotalsDonut rows={slotRows} total={total} divisor={divisor} />
      </ChartCard>
      <ChartCard
        title="Time by category"
        subtitle={`What the ${fmtHours(total)}${perDay} went on`}
      >
        <TotalsDonut rows={categoryRows} total={total} divisor={divisor} />
      </ChartCard>
    </div>
  )
}


// Sums logged time and daily goals across a list of dates — used for the
// week/month header totals and the month view's per-week summary column.
function rangeStats(dates, days, slots, settings, isIgnored = NEVER_IGNORED) {
  let total = 0
  let goal = 0
  dates.forEach((d) => {
    const key = toKey(d)
    // An ignored day contributes neither its hours nor its goal — otherwise
    // the period would look like it missed a target it was never held to.
    if (isIgnored(key, days[key])) return
    const { total: t } = dayBreakdown(days[key], slots)
    total += t
    goal += goalForDate(settings, d)
  })
  return { total, goal }
}

/* ---- Month grid (compact cells) ---- */

function MonthGrid({
  cursor,
  days,
  slots,
  categories,
  settings,
  todayKey,
  onNavigateDay,
  onEditDay,
  weekIgnore = {},
  monthIgnore = {},
}) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthKey = `${year}-${pad(month + 1)}`
  const monthIgnored = !!monthIgnore[monthKey]

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const weekRows = []
  for (let i = 0; i < cells.length; i += 7) weekRows.push(cells.slice(i, i + 7))

  const startDate = settings.startDate ? fromKey(settings.startDate) : null

  // Each week is its own rounded block — summary strip on top, its seven days
  // below — with breathing room between the weeks. The gaps sit *between*
  // weeks rather than around every cell: a per-cell gap plus inner padding on
  // all four sides is what left no room for seven columns on a phone, while
  // one gap per week costs almost nothing. Inside a week the days are still
  // separated by hairline seams (a 1px grid gap showing the tint through).
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 rounded-xl bg-[#1E2A33]/[0.04] text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/45 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1.5">
            <span className="sm:hidden">{d[0]}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>
      {weekRows.map((row, ri) => {
        const { total: wTotal, goal: wGoal } = rangeStats(
          row.filter(Boolean),
          days,
          slots,
          settings,
          makeIsIgnored(weekIgnore, monthIgnore),
        )
        const firstDate = row.find(Boolean)
        const weekKey = firstDate ? toKey(startOfWeek(firstDate)) : null
        const weekIgnored =
          monthIgnored || (weekKey ? !!weekIgnore[weekKey] : false)
        const weekPast = firstDate
          ? toKey(addDays(startOfWeek(firstDate), 6)) < todayKey
          : false
        return (
          <div key={ri} className="rounded-xl overflow-hidden bg-white">
            <WeekSummaryStrip
              total={wTotal}
              goal={wGoal}
              ignored={weekIgnored}
              isPast={weekPast}
            />
            <div className="grid grid-cols-7 gap-px bg-[#1E2A33]/10">
              {row.map((date, di) => {
                if (!date) return <div key={di} className="bg-white" />
                const entry = days[toKey(date)]
                const dayIgnored = weekIgnored || !!entry?.ignore
                return (
                  <CompactDayCell
                    key={toKey(date)}
                    date={date}
                    entry={entry}
                    slots={slots}
                    categories={categories}
                    settings={settings}
                    goal={goalForDate(settings, date)}
                    isToday={toKey(date) === todayKey}
                    isFuture={date > new Date()}
                    isBeforeStart={startDate ? date < startDate : false}
                    ignored={dayIgnored}
                    onNavigate={() => onNavigateDay(toKey(date))}
                    onEdit={() => onEditDay(toKey(date))}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Full-width summary strip above each week row.
function WeekSummaryStrip({ total, goal, ignored, isPast }) {
  const met = !ignored && goal > 0 && total >= goal
  const goalOutcome =
    !ignored && isPast && goal > 0 ? (total >= goal ? "met" : "missed") : null
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 text-[9px] font-mono uppercase tracking-widest ${
        ignored ? "opacity-60" : ""
      } ${goalOutcome ? "" : "bg-[#1E2A33]/[0.05]"}`}
      style={
        goalOutcome === "met"
          ? { backgroundColor: `${GOAL_MET_COLOR}1F` }
          : goalOutcome === "missed"
            ? { backgroundColor: `${EXAM_COLOR}1F` }
            : undefined
      }
    >
      <span className="text-[#1E2A33]/45 flex items-center gap-1 shrink-0">
        Week {ignored && <EyeOff size={9} />}
      </span>
      <span className="flex-1 border-b border-dotted border-[#1E2A33]/15" />
      <span
        className="font-bold shrink-0"
        style={met ? { color: GOAL_MET_COLOR } : undefined}
      >
        {total > 0 ? fmtHours(total) : "—"}
      </span>
      {goal > 0 && (
        <span className="text-[#1E2A33]/40 shrink-0">of {fmtHours(goal)}</span>
      )}
    </div>
  )
}

function CompactDayCell({
  date,
  entry,
  slots,
  categories,
  settings,
  goal,
  isToday,
  isFuture,
  isBeforeStart,
  ignored,
  onNavigate,
  onEdit,
}) {
  if (isBeforeStart) {
    return (
      <div className="bg-[#1E2A33]/[0.04] h-16 sm:h-28 flex items-start p-1 sm:p-2">
        <span className="font-mono text-[10px] sm:text-xs text-[#1E2A33]/25">
          {date.getDate()}
        </span>
      </div>
    )
  }

  const { bySlot, total } = dayBreakdown(entry, slots)
  const tooltip = ignored
    ? `${buildTooltip(entry, slots, categories, settings)}\n\nIgnored in statistics`
    : buildTooltip(entry, slots, categories, settings)
  const lessonsEnabled = settings?.lessonsEnabled !== false
  const examsEnabled = settings?.examsEnabled !== false
  const metGoal = !ignored && goal > 0 && total >= goal
  const isPast = !ignored && !isToday && !isFuture && goal > 0
  const goalOutcome = isPast ? (total >= goal ? "met" : "missed") : null

  return (
    <Tip text={tooltip} multiline className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(e) => e.key === "Enter" && onEdit()}
        className={`${btnBase} text-left w-full p-1 sm:p-2 h-16 sm:h-28 flex flex-col justify-between hover:brightness-95 cursor-pointer ${
          ignored
            ? "bg-[#1E2A33]/[0.04] grayscale opacity-60"
            : goalOutcome
              ? ""
              : "bg-white"
        } ${isFuture ? "opacity-50" : ""}`}
        style={{
          ...(goalOutcome === "met"
            ? { backgroundColor: `${GOAL_MET_COLOR}17` }
            : {}),
          ...(goalOutcome === "missed"
            ? { backgroundColor: `${EXAM_COLOR}17` }
            : {}),
        }}
      >
      <div className="flex items-start justify-between">
        <span
          className={`font-mono text-xs ${isToday ? "font-extrabold" : ""}`}
          style={isToday ? { color: ACCENT } : undefined}
        >
          {date.getDate()}
        </span>
        <div className="flex items-center gap-1">
          {ignored && <EyeOff size={11} className="text-[#1E2A33]/35" />}
          {entry?.exam && examsEnabled && (
            <Tip text="Exam passed">
              <span
                className="flex items-center justify-center w-4 h-4 rounded-full"
                style={{ backgroundColor: EXAM_COLOR }}
              >
                <Award size={10} className="text-white" />
              </span>
            </Tip>
          )}
        </div>
      </div>

      {/* Per-slot minutes need more room than a phone column has; on small
          screens the slots collapse to coloured dots and the hours below
          carry the number. */}
      <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
        {slots.map((s) =>
          bySlot[s.id] > 0 ? (
            <span
              key={s.id}
              className="flex items-center gap-0.5 text-[8px] font-mono font-bold"
              style={{ color: s.color }}
            >
              <span
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="hidden sm:inline">{bySlot[s.id]}</span>
            </span>
          ) : null,
        )}
        {total === 0 && (
          <span className="text-[8px] font-mono text-[#1E2A33]/25">—</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-mono text-[#1E2A33]/70">
        <span
          className="truncate"
          style={
            metGoal ? { color: GOAL_MET_COLOR, fontWeight: 700 } : undefined
          }
        >
          {total > 0 ? fmtHours(total) : ""}
          {goal > 0 && (
            <span className="hidden sm:inline text-[#1E2A33]/30">
              /{fmtHours(goal)}
            </span>
          )}
        </span>
        {entry?.lessons > 0 && lessonsEnabled && (
          <span className="shrink-0">{entry.lessons}L</span>
        )}
      </div>
      </div>
    </Tip>
  )
}

/* ---- Week / Day view (full detail cards) ---- */

// `wide` spreads the slot groups across columns instead of stacking them —
// used by the Day view, where the card has the full page width to play with.
function EntriesReadout({ slots, categories, cells, wide = false }) {
  const hasAny = slots.some((s) => (cells[s.id] || []).length > 0)
  if (!hasAny) return null
  return (
    <div
      className={
        wide
          ? "grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3"
          : "space-y-2.5"
      }
    >
      {slots.map((slot) => {
        const entries = cells[slot.id] || []
        if (!entries.length) return null
        const slotMinutes = entries.reduce(
          (a, e) => a + (Number(e.minutes) || 0),
          0,
        )
        return (
          <div key={slot.id}>
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="text-[9px] font-mono font-bold"
                style={{ color: slot.color }}
              >
                {fmtHours(slotMinutes)}
              </span>
              <RenderIcon
                name={slot.iconName}
                size={10}
                style={{ color: slot.color }}
              />
              <span
                className="text-[9px] uppercase tracking-widest font-mono font-bold"
                style={{ color: slot.color }}
              >
                {slot.label}
              </span>
            </div>
            <div className="space-y-1">
              {entries.map((e) => {
                const cat = getById(categories, e.category)
                return (
                  <div
                    key={e.id}
                    className="pl-3 border-l-2"
                    style={{ borderColor: `${slot.color}30` }}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#1E2A33]/70">
                      <span className="text-[#1E2A33]/45">{e.minutes}m</span>
                      <RenderIcon
                        name={cat.iconName}
                        size={9}
                        style={{ color: cat.color }}
                      />
                      <span>{cat.label}</span>
                    </div>
                    {e.comment && (
                      <div className="text-[10px] font-mono text-[#1E2A33]/50 italic mt-0.5 whitespace-pre-wrap">
                        {e.comment}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FullCardGrid({
  dates,
  days,
  slots,
  categories,
  settings,
  todayKey,
  onNavigateDay,
  onEditDay,
  weekIgnore = {},
  monthIgnore = {},
  big,
}) {
  const startDate = settings.startDate ? fromKey(settings.startDate) : null
  return (
    <div
      className={
        big
          ? "w-full"
          : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3"
      }
    >
      {dates.map((date) => {
        const entry = days[toKey(date)]
        const wk = toKey(startOfWeek(date))
        const mk = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
        const ignored = !!weekIgnore[wk] || !!monthIgnore[mk] || !!entry?.ignore
        return (
          <FullDayCard
            key={toKey(date)}
            date={date}
            entry={entry}
            slots={slots}
            categories={categories}
            settings={settings}
            goal={goalForDate(settings, date)}
            isToday={toKey(date) === todayKey}
            isFuture={date > new Date()}
            isBeforeStart={startDate ? date < startDate : false}
            ignored={ignored}
            onNavigate={() => onNavigateDay(toKey(date))}
            onEdit={() => onEditDay(toKey(date))}
            big={big}
          />
        )
      })}
    </div>
  )
}

function FullDayCard({
  date,
  entry,
  slots,
  categories,
  settings,
  goal,
  isToday,
  isFuture,
  isBeforeStart,
  ignored,
  onNavigate,
  onEdit,
  big,
}) {
  if (isBeforeStart) {
    return (
      <div
        className={`rounded-2xl bg-[#1E2A33]/[0.04] p-3 flex flex-col gap-1 ${big ? "w-full" : ""}`}
      >
        <div className="font-mono text-sm font-bold text-[#1E2A33]/25">
          {date.toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
          })}
        </div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/20">
          Before project start
        </div>
      </div>
    )
  }

  const { total } = dayBreakdown(entry, slots)
  const lessonsEnabled = settings?.lessonsEnabled !== false
  const examsEnabled = settings?.examsEnabled !== false
  const metGoal = !ignored && goal > 0 && total >= goal
  const isPast = !ignored && !isToday && !isFuture && goal > 0
  const goalOutcome = isPast ? (total >= goal ? "met" : "missed") : null
  // Both week and day cards open the editor directly on click — there's no further
  // drill-down level below them, so the whole block doubles as the edit button.
  const handleClick = onEdit

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      // No outline: white (or goal-tinted) against the page tint is what
      // separates the card. Today is called out by colour and a badge instead
      // of a border, so a card never has two competing emphasis signals.
      className={`${btnBase} text-left w-full rounded-2xl hover:shadow-md flex flex-col cursor-pointer ${
        big ? "p-5 gap-4" : "p-3 gap-3"
      } ${
        ignored
          ? "bg-[#1E2A33]/[0.04] grayscale opacity-60"
          : goalOutcome
            ? ""
            : "bg-white"
      }`}
      style={{
        ...(goalOutcome === "met"
          ? { backgroundColor: `${GOAL_MET_COLOR}17` }
          : {}),
        ...(goalOutcome === "missed"
          ? { backgroundColor: `${EXAM_COLOR}17` }
          : {}),
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div
            className={`font-mono font-bold ${big ? "text-2xl" : "text-sm"}`}
            style={isToday ? { color: ACCENT } : undefined}
          >
            {date.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
            })}
          </div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/40">
            {date.toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isToday && (
            <span
              className="text-[9px] uppercase tracking-wide font-mono text-white px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: ACCENT }}
            >
              Today
            </span>
          )}
          {ignored && (
            <Tip text="Ignored in statistics">
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wide font-mono text-[#1E2A33]/60 bg-[#1E2A33]/10 px-1.5 py-0.5 rounded-full">
                <EyeOff size={10} />
              </span>
            </Tip>
          )}
          {entry?.exam && examsEnabled && (
            <span
              className="flex items-center gap-1 text-[9px] uppercase tracking-wide font-mono text-white px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: EXAM_COLOR }}
            >
              <Award size={10} /> Exam
            </span>
          )}
          {entry?.lessons > 0 && lessonsEnabled && (
            <Tip text="Lessons studied today">
              <span className="text-[9px] uppercase tracking-wide font-mono bg-[#1E2A33]/10 px-1.5 py-0.5 rounded-full">
                {entry.lessons}L
              </span>
            </Tip>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-mono font-extrabold ${big ? "text-3xl" : "text-lg"}`}
          style={metGoal ? { color: GOAL_MET_COLOR } : undefined}
        >
          {total > 0 ? fmtHours(total) : "—"}
        </span>
        {goal > 0 && (
          <span
            className={`font-mono text-[#1E2A33]/35 ${big ? "text-xs" : "text-[10px]"}`}
          >
            goal {fmtHours(goal)}
          </span>
        )}
      </div>

      {total === 0 ? (
        <p
          className={`font-mono text-[#1E2A33]/35 ${big ? "text-xs" : "text-[10px]"}`}
        >
          No study logged — tap to add
        </p>
      ) : (
        <EntriesReadout
          slots={slots}
          categories={categories}
          cells={entry?.cells || {}}
          wide={big}
        />
      )}

      {entry?.comment && (
        <div className="flex items-start gap-1.5 rounded-xl bg-[#1E2A33]/[0.04] p-2.5">
          <MessageSquare
            size={11}
            className="text-[#1E2A33]/30 shrink-0 mt-0.5"
          />
          <p className="text-[10px] font-mono text-[#1E2A33]/60 whitespace-pre-wrap">
            {entry.comment}
          </p>
        </div>
      )}
    </div>
  )
}

/* ---- Heatmap (90 days / year) ---- */

function buildHeatmapWeeks(start, end) {
  const alignedStart = startOfWeek(start)
  const weeks = []
  let cur = new Date(alignedStart)
  while (cur <= end) {
    const week = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cur)
      week.push(d < start || d > end ? null : d)
      cur = addDays(cur, 1)
    }
    weeks.push(week)
  }
  return weeks
}

function Heatmap({
  start,
  end,
  days,
  slots,
  categories,
  settings,
  todayKey,
  onSelectDay,
  isIgnored = NEVER_IGNORED,
  showMonths,
}) {
  const weeks = useMemo(() => buildHeatmapWeeks(start, end), [start, end])
  const startDate = settings?.startDate ? fromKey(settings.startDate) : null

  // Cell color now reflects whether the daily goal was met (not how much was
  // studied relative to other days) — only meaningful for days that have
  // actually concluded and that have a goal set.
  const dayGoalOutcome = (date, entry, total) => {
    if (entry?.ignore) return null
    if (date > new Date() || toKey(date) === todayKey) return null
    const goal = goalForDate(settings, date)
    if (goal <= 0) return null
    return total >= goal ? "met" : "missed"
  }
  const NEUTRAL_CELL = "#E7ECF3"
  // Excluded days get a hatch rather than a tint. Over a 3-month or year span
  // there are too many cells for a subtle wash to register, and a flag set
  // months ago and forgotten is exactly what makes the totals confusing.
  const IGNORED_CELL = "#1E2A3314"
  const IGNORED_HATCH =
    "repeating-linear-gradient(45deg, transparent 0 3px, #1E2A3333 3px 6px)"

  let lastMonth = null

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max">
        {weeks.map((week, wi) => {
          const firstReal = week.find((d) => d)
          let monthTag = null
          let newMonth = false
          if (showMonths && firstReal) {
            const m = firstReal.getMonth()
            if (m !== lastMonth) {
              monthTag = firstReal.toLocaleDateString(undefined, {
                month: "short",
              })
              newMonth = lastMonth !== null
              lastMonth = m
            }
          }
          return (
            <div
              key={wi}
              className={`flex flex-col gap-1.5 ${newMonth ? "ml-6" : "ml-2"}`}
            >
              {showMonths && (
                <div className="h-3 text-[8px] font-mono text-[#1E2A33]/40 whitespace-nowrap">
                  {monthTag}
                </div>
              )}
              {week.map((date, di) => {
                if (!date) return <div key={di} className="w-10 h-10" />
                if (startDate && date < startDate) {
                  return (
                    <div
                      key={di}
                      className="w-10 h-10 rounded-lg bg-[#1E2A33]/[0.03] flex items-center justify-center shrink-0"
                    >
                      <span className="text-[8px] font-mono leading-none text-[#1E2A33]/15">
                        {date.getDate()}
                      </span>
                    </div>
                  )
                }
                const key = toKey(date)
                const entry = days[key]
                const { total } = dayBreakdown(entry, slots)
                const isToday = key === todayKey
                const ignored = isIgnored(key, entry)
                const goalOutcome = ignored
                  ? null
                  : dayGoalOutcome(date, entry, total)
                const cellColor = ignored
                  ? IGNORED_CELL
                  : goalOutcome === "met"
                    ? `${GOAL_MET_COLOR}30`
                    : goalOutcome === "missed"
                      ? `${EXAM_COLOR}30`
                      : NEUTRAL_CELL
                const baseTip = `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${buildTooltip(entry, slots, categories, settings)}`
                return (
                  <Tip
                    key={di}
                    multiline
                    text={
                      ignored
                        ? `${baseTip}\n\nIgnored — not counted in any statistics`
                        : baseTip
                    }
                  >
                    <button
                      onClick={() => onSelectDay(key)}
                      style={{
                        backgroundColor: cellColor,
                        ...(ignored ? { backgroundImage: IGNORED_HATCH } : {}),
                        outline: isToday ? `2px solid ${ACCENT}` : "none",
                        outlineOffset: "1px",
                      }}
                      className={`${btnBase} w-10 h-10 rounded-lg hover:scale-105 flex flex-col items-center justify-center shrink-0`}
                    >
                      <span
                        className={`text-[8px] font-mono leading-none ${ignored ? "text-[#1E2A33]/30" : "text-[#1E2A33]/40"}`}
                      >
                        {date.getDate()}
                      </span>
                      {total > 0 && (
                        <span
                          className={`text-[9px] font-mono font-bold leading-none mt-0.5 ${
                            ignored
                              ? "text-[#1E2A33]/35 line-through"
                              : "text-[#1E2A33]/80"
                          }`}
                        >
                          {fmtHours(total)}
                        </span>
                      )}
                    </button>
                  </Tip>
                )
              })}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/40">
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-[3px]"
            style={{ backgroundColor: `${GOAL_MET_COLOR}30` }}
          />
          Goal met
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-[3px]"
            style={{ backgroundColor: `${EXAM_COLOR}30` }}
          />
          Goal missed
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-[3px]"
            style={{ backgroundColor: NEUTRAL_CELL }}
          />
          No goal / not yet due
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-[3px]"
            style={{
              backgroundColor: IGNORED_CELL,
              backgroundImage: IGNORED_HATCH,
            }}
          />
          Ignored — not counted
        </span>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------
   Day Editor
--------------------------------------------------------------- */

function useModalDismiss(onClose) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }
  return onBackdropClick
}

function DayQuickviewModal({
  dateKey,
  dayEntry,
  slots,
  categories,
  settings,
  onClose,
  onChange,
  onGoToDayView,
  startInEditMode = false,
}) {
  const [mode, setMode] = useState(startInEditMode ? "edit" : "preview")
  const onBackdropClick = useModalDismiss(onClose)
  const { total } = dayBreakdown(dayEntry, slots)
  const hasEntries = slots.some(
    (slot) => (dayEntry?.cells?.[slot.id] || []).length > 0,
  )
  const lessonsEnabled = settings?.lessonsEnabled !== false
  const examsEnabled = settings?.examsEnabled !== false
  const d = fromKey(dateKey)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={onBackdropClick}
    >
      <div
        style={{ backgroundColor: "#F4F5F7" }}
        className="w-full sm:max-w-[500px] sm:rounded-2xl shadow-2xl max-h-[90vh] h-full sm:h-auto flex flex-col overflow-hidden"
      >
        {mode === "edit" ? (
          <DayEditForm
            dateKey={dateKey}
            dayEntry={dayEntry}
            slots={slots}
            categories={categories}
            settings={settings}
            onClose={onClose}
            // Both of these point back to where we already are when the editor
            // was opened straight from the Day view, so they're dropped there.
            onBack={startInEditMode ? null : () => setMode("preview")}
            onGoToDayView={
              startInEditMode
                ? null
                : () => {
                    onGoToDayView(dateKey)
                    onClose()
                  }
            }
            onChange={onChange}
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-4 bg-white shrink-0">
              <div>
                <h2 className="font-sans font-extrabold uppercase tracking-tight text-sm">
                  {d.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h2>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50">
                  {total} minutes logged · {fmtHours(total)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Tip text="Edit this day">
                  <button
                    onClick={() => setMode("edit")}
                    className={`${btnBase} p-1.5 rounded-lg text-[#1E2A33]/50 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
                  >
                    <PenLine size={17} />
                  </button>
                </Tip>
                <Tip text="Go to day view">
                  <button
                    onClick={() => {
                      onGoToDayView(dateKey)
                      onClose()
                    }}
                    className={`${btnBase} p-1.5 rounded-lg text-[#1E2A33]/50 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </Tip>
                <button
                  onClick={onClose}
                  className={`${btnBase} text-[#1E2A33]/50 hover:text-[#1E2A33]`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            {/* A day with nothing logged has very little to show — the min
                height keeps the dialog from collapsing to a sliver. */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 sm:min-h-[300px]">
              {!hasEntries ? (
                <p className="text-xs font-mono text-[#1E2A33]/45">
                  No study logged for this day.
                </p>
              ) : (
                <EntriesReadout
                  slots={slots}
                  categories={categories}
                  cells={dayEntry?.cells || {}}
                />
              )}
              <div className={`${CARD} p-4 space-y-2 text-xs font-mono`}>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[#1E2A33]/70">
                  {lessonsEnabled && (
                    <span>{dayEntry?.lessons || 0} lessons completed</span>
                  )}
                  {examsEnabled && (
                    <span className="flex items-center gap-1">
                      <Award size={13} style={{ color: EXAM_COLOR }} />
                      {dayEntry?.exam ? "Exam passed" : "No exam passed"}
                    </span>
                  )}
                  {dayEntry?.ignore && (
                    <span className="flex items-center gap-1 text-[#1E2A33]/55">
                      <EyeOff size={13} /> Ignored in statistics
                    </span>
                  )}
                </div>
                {dayEntry?.comment && (
                  <div className="flex items-start gap-1.5 rounded-xl bg-[#F4F5F7] p-2.5">
                    <MessageSquare
                      size={12}
                      className="text-[#1E2A33]/35 shrink-0 mt-0.5"
                    />
                    <p className="text-[#1E2A33]/60 whitespace-pre-wrap">
                      {dayEntry.comment}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DayEditForm({
  dateKey,
  dayEntry,
  slots,
  categories,
  settings,
  onClose,
  onBack,
  onGoToDayView,
  onChange,
}) {
  const cells = dayEntry?.cells || {}
  const lessons = dayEntry?.lessons || 0
  const exam = dayEntry?.exam || false
  const ignore = dayEntry?.ignore || false
  const dayComment = dayEntry?.comment || ""
  const lessonsEnabled = settings?.lessonsEnabled !== false
  const examsEnabled = settings?.examsEnabled !== false

  const addEntry = (slotId) => {
    const arr = cells[slotId] || []
    const newEntry = {
      id: makeId("entry"),
      category: categories[0]?.id,
      minutes: 15,
      comment: "",
    }
    onChange({ cells: { ...cells, [slotId]: [...arr, newEntry] } })
  }
  const updateEntry = (slotId, entryId, patch) => {
    const arr = (cells[slotId] || []).map((e) =>
      e.id === entryId ? { ...e, ...patch } : e,
    )
    onChange({ cells: { ...cells, [slotId]: arr } })
  }
  const removeEntry = (slotId, entryId) => {
    const arr = (cells[slotId] || []).filter((e) => e.id !== entryId)
    onChange({ cells: { ...cells, [slotId]: arr } })
  }

  const { total } = dayBreakdown({ cells }, slots)
  const d = fromKey(dateKey)

  return (
    <>
      {/* White header against the tinted body — the colour change separates the
          two, so no divider rule is needed. */}
      <div className="flex items-center justify-between px-5 py-4 bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <Tip text="Back to preview">
              <button
                onClick={onBack}
                className={`${btnBase} p-1.5 -ml-1.5 rounded-lg text-[#1E2A33]/50 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10 shrink-0`}
              >
                <ChevronLeft size={18} />
              </button>
            </Tip>
          )}
          <div className="min-w-0">
            <h2 className="font-sans font-extrabold uppercase tracking-tight text-sm truncate">
              {d.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50">
              {total} minutes logged · {fmtHours(total)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onGoToDayView && (
            <Tip text="Go to day view">
              <button
                onClick={onGoToDayView}
                className={`${btnBase} text-[#1E2A33]/50 hover:text-[#1E2A33] p-1 rounded-lg hover:bg-[#1E2A33]/10`}
              >
                <ArrowUpRight size={18} />
              </button>
            </Tip>
          )}
          <button
            onClick={onClose}
            className={`${btnBase} text-[#1E2A33]/50 hover:text-[#1E2A33]`}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Notes come first — it's the field reached for most often, and it
              reads as the day's headline rather than a footnote. */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare size={12} className="text-[#1E2A33]/40" />
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/50">
                Day notes
              </span>
            </div>
            <AutoTextarea
              value={dayComment}
              onChange={(e) => onChange({ comment: e.target.value })}
              placeholder="Add a note for the whole day (optional)"
              rows={2}
              maxHeight={200}
              className={FIELD_ON_WHITE}
            />
          </div>

          {/* Lesson count, exam and the ignore flag are day-level facts like
              the note above — they belong beside it, not buried under every
              slot. */}
          <div
            className={`${CARD} flex items-center justify-between gap-4 flex-wrap`}
          >
            {lessonsEnabled && (
              <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide">
                Lessons completed today
                <input
                  type="number"
                  min={0}
                  value={lessons}
                  onChange={(e) =>
                    onChange({ lessons: Number(e.target.value) })
                  }
                  className={`${FIELD_BOXED} w-20`}
                />
              </label>
            )}
            {examsEnabled && (
              <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide cursor-pointer">
                <input
                  type="checkbox"
                  checked={exam}
                  onChange={(e) => onChange({ exam: e.target.checked })}
                  className="w-4 h-4 accent-[#C1595B]"
                />
                <span className="flex items-center gap-1">
                  <Award size={13} style={{ color: EXAM_COLOR }} /> Exam passed
                  today
                </span>
              </label>
            )}
            <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide cursor-pointer">
              <input
                type="checkbox"
                checked={ignore}
                onChange={(e) => onChange({ ignore: e.target.checked })}
                className="w-4 h-4 accent-[#1E2A33]/60"
              />
              <span className="flex items-center gap-1">
                <EyeOff size={13} className="text-[#1E2A33]/60" /> Ignore in
                statistics
              </span>
            </label>
          </div>

          {slots.map((slot) => {
            const entries = cells[slot.id] || []
            const slotTotal = entries.reduce(
              (a, e) => a + (Number(e.minutes) || 0),
              0,
            )
            return (
              <div
                key={slot.id}
                className="bg-white rounded-2xl overflow-hidden"
              >
                {/* The slot's own colour, washed out, is the header. It both
                    separates the header from the body and says which slot this
                    is without an outline or a rule. */}
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ backgroundColor: `${slot.color}1A` }}
                >
                  <div className="flex items-center gap-2">
                    <RenderIcon
                      name={slot.iconName}
                      size={14}
                      style={{ color: slot.color }}
                    />
                    <span className="font-mono text-xs uppercase tracking-wide font-bold">
                      {slot.label}
                    </span>
                    <Tip text="Add entry">
                      <button
                        onClick={() => addEntry(slot.id)}
                        className={`${btnBase} p-0.5 rounded-md text-[#1E2A33]/40 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
                      >
                        <Plus size={13} />
                      </button>
                    </Tip>
                  </div>
                  <span className="font-mono text-xs text-[#1E2A33]/55">
                    {slotTotal}m / {fmtHoursFixed1(slotTotal)}
                  </span>
                </div>

                <div className="p-3 space-y-2">
                  {entries.length === 0 && (
                    <p className="text-xs font-mono text-[#1E2A33]/40 px-1">
                      No study logged for this slot.
                    </p>
                  )}
                  {entries.map((entry) => {
                    const options = categories.some(
                      (c) => c.id === entry.category,
                    )
                      ? categories
                      : [
                          {
                            id: entry.category,
                            label: `(removed) ${entry.category}`,
                          },
                          ...categories,
                        ]
                    return (
                      <div
                        key={entry.id}
                        className="rounded-xl bg-[#F4F5F7] p-2.5 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <select
                            value={entry.category}
                            onChange={(e) =>
                              updateEntry(slot.id, entry.id, {
                                category: e.target.value,
                              })
                            }
                            className={`${FIELD_BOXED} flex-1 w-full`}
                          >
                            {options.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            value={entry.minutes}
                            onChange={(e) =>
                              updateEntry(slot.id, entry.id, {
                                minutes: Number(e.target.value),
                              })
                            }
                            className={`${FIELD_BOXED} w-20`}
                          />
                          <span className="text-[10px] font-mono text-[#1E2A33]/40">
                            min
                          </span>
                          <button
                            onClick={() => removeEntry(slot.id, entry.id)}
                            className={`${btnBase} p-1.5 rounded-lg text-[#1E2A33]/40 hover:text-[#C1595B] hover:bg-white`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <MessageSquare
                            size={12}
                            className="text-[#1E2A33]/30 shrink-0 mt-2"
                          />
                          <AutoTextarea
                            value={entry.comment || ""}
                            onChange={(e) =>
                              updateEntry(slot.id, entry.id, {
                                comment: e.target.value,
                              })
                            }
                            placeholder="Note (optional) — shown on the day and week view"
                            rows={2}
                            maxHeight={220}
                            className={`${FIELD_ON_TINT} flex-1`}
                          />
                        </div>
                      </div>
                    )
                  })}
                  <button
                    onClick={() => addEntry(slot.id)}
                    className={`${btnBase} flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-[#1E2A33]/60 hover:text-[#1E2A33] px-1 py-1`}
                  >
                    <Plus size={12} /> Add entry
                  </button>
                </div>
              </div>
            )
          })}
        </div>
    </>
  )
}

/* ---------------------------------------------------------------
   Analytics View
--------------------------------------------------------------- */

// Shared by the "Overall stats" (all-time) and "Stats" (period-scoped) sections —
// takes whichever set of day keys and date bounds apply, and returns the same
// shape either way.
function computeOverviewStats(
  keys,
  days,
  slots,
  settings,
  startDate,
  endDateCutoff,
) {
  let totalMinutes = 0
  let lessonsDone = 0
  let examsDone = 0
  let activeDays = 0
  keys.forEach((k) => {
    const entry = days[k]
    const { total } = dayBreakdown(entry, slots)
    if (total > 0) activeDays += 1
    totalMinutes += total
    lessonsDone += Number(entry.lessons) || 0
    if (entry.exam) examsDone += 1
  })

  const daysSinceStart = Math.max(daysBetween(startDate, endDateCutoff) + 1, 1)
  const emptyDays = Math.max(daysSinceStart - activeDays, 0)

  const totalLessons = settings.totalLessons || 0
  const totalExams = settings.totalExams || 0
  const lessonsRemaining = Math.max(totalLessons - lessonsDone, 0)
  const examsRemaining = Math.max(totalExams - examsDone, 0)

  const avgMinutesPerLesson =
    lessonsDone > 0 ? totalMinutes / lessonsDone : null
  const avgLessonsPerActiveDay =
    activeDays > 0 ? lessonsDone / activeDays : null
  const activeRatio = daysSinceStart > 0 ? activeDays / daysSinceStart : 1

  const today = new Date()
  let estRemainingMinutes = null
  let estRemainingCalendarDays = null
  let estFinishDate = null
  if (avgMinutesPerLesson && lessonsRemaining > 0)
    estRemainingMinutes = avgMinutesPerLesson * lessonsRemaining
  if (avgLessonsPerActiveDay && lessonsRemaining > 0) {
    const estActiveDaysNeeded = lessonsRemaining / avgLessonsPerActiveDay
    estRemainingCalendarDays =
      activeRatio > 0
        ? Math.ceil(estActiveDaysNeeded / activeRatio)
        : Math.ceil(estActiveDaysNeeded)
    estFinishDate = addDays(today, estRemainingCalendarDays)
  }

  // Plain calendar-day averages (not "active days only") — matches how "average
  // days per exam" is naturally understood: total elapsed days / count.
  const avgHoursPerDay =
    daysSinceStart > 0 ? totalMinutes / 60 / daysSinceStart : null
  const avgHoursPerLesson =
    avgMinutesPerLesson != null ? avgMinutesPerLesson / 60 : null
  const avgLessonsPerDay =
    daysSinceStart > 0 ? lessonsDone / daysSinceStart : null
  const avgDaysPerExam = examsDone > 0 ? daysSinceStart / examsDone : null
  const avgLessonsPerWeek =
    daysSinceStart > 0 ? lessonsDone / (daysSinceStart / 7) : null
  const avgLessonsPerMonth =
    daysSinceStart > 0 ? lessonsDone / (daysSinceStart / 30.44) : null
  const avgLessonsPer3Months =
    daysSinceStart > 0 ? lessonsDone / (daysSinceStart / 91.31) : null

  return {
    totalMinutes,
    lessonsDone,
    examsDone,
    activeDays,
    daysSinceStart,
    emptyDays,
    totalLessons,
    totalExams,
    lessonsRemaining,
    examsRemaining,
    avgMinutesPerLesson,
    avgLessonsPerActiveDay,
    estRemainingMinutes,
    estRemainingCalendarDays,
    estFinishDate,
    avgHoursPerDay,
    avgHoursPerLesson,
    avgLessonsPerDay,
    avgDaysPerExam,
    avgLessonsPerWeek,
    avgLessonsPerMonth,
    avgLessonsPer3Months,
  }
}

// Bounds come in from the shared period bar — analytics no longer owns a
// range picker of its own.
function AnalyticsView({ data, rangeStart, rangeEnd }) {
  const {
    slots,
    categories,
    days,
    settings,
    weekIgnore = {},
    monthIgnore = {},
  } = data

  // Applied once, up front, so every downstream stat and chart respects it.
  // Same predicate the log above uses — see makeIsIgnored.
  const isDayIgnored = useMemo(
    () => makeIsIgnored(weekIgnore, monthIgnore),
    [weekIgnore, monthIgnore],
  )
  const [dailyMode, setDailyMode] = useState("slot") // 'slot' | 'category' | 'hours' | 'lessons'
  const [weekdayMode, setWeekdayMode] = useState("hours") // 'slot' | 'category' | 'hours' | 'lessons'
  const [weeklyMode, setWeeklyMode] = useState("hours") // 'hours' | 'slot' | 'category' | 'lessons'
  const [monthlyMode, setMonthlyMode] = useState("hours") // 'hours' | 'slot' | 'category' | 'lessons'

  const lessonsEnabled = settings.lessonsEnabled ?? true
  const examsEnabled = settings.examsEnabled ?? true

  // If lessons tracking gets turned off while a chart is showing its Lessons
  // mode, fall back to a mode that still has data to show.
  useEffect(() => {
    if (!lessonsEnabled && dailyMode === "lessons") setDailyMode("slot")
  }, [lessonsEnabled, dailyMode])
  useEffect(() => {
    if (!lessonsEnabled && weekdayMode === "lessons") setWeekdayMode("hours")
  }, [lessonsEnabled, weekdayMode])
  useEffect(() => {
    if (!lessonsEnabled && weeklyMode === "lessons") setWeeklyMode("hours")
  }, [lessonsEnabled, weeklyMode])
  useEffect(() => {
    if (!lessonsEnabled && monthlyMode === "lessons") setMonthlyMode("hours")
  }, [lessonsEnabled, monthlyMode])

  const dailyToggle = useSeriesToggle()
  const pieToggle = useSeriesToggle()
  const effToggle = useSeriesToggle()
  const trendToggle = useSeriesToggle()
  const weekdayToggle = useSeriesToggle()
  const weeklyToggle = useSeriesToggle()
  const monthlyToggle = useSeriesToggle()

  const dayKeysSorted = useMemo(
    () =>
      Object.keys(days)
        .sort()
        .filter((k) => !isDayIgnored(k, days[k])),
    [days, isDayIgnored],
  )

  const rangedKeys = useMemo(() => {
    const s = new Date(
      rangeStart.getFullYear(),
      rangeStart.getMonth(),
      rangeStart.getDate(),
    )
    const e = new Date(
      rangeEnd.getFullYear(),
      rangeEnd.getMonth(),
      rangeEnd.getDate(),
    )
    return dayKeysSorted.filter((k) => {
      const d = fromKey(k)
      return d >= s && d <= e
    })
  }, [dayKeysSorted, rangeStart, rangeEnd])

  // Project-wide totals & forecast — deliberately NOT scoped to the chosen
  // period, since "lessons done", "exams passed" and the forecast are only
  // meaningful against the project's total lesson/exam counts. Shown in the
  // separate "Overall stats" section.
  const overallAllTime = useMemo(() => {
    const start = settings.startDate
      ? fromKey(settings.startDate)
      : dayKeysSorted[0]
        ? fromKey(dayKeysSorted[0])
        : new Date()
    const today = new Date()
    const cutoff =
      settings.endDate && fromKey(settings.endDate) < today
        ? fromKey(settings.endDate)
        : today
    return computeOverviewStats(
      dayKeysSorted,
      days,
      slots,
      settings,
      start,
      cutoff,
    )
  }, [dayKeysSorted, days, settings, slots])

  // Everything else (Stats, Averages, Remarkable) is scoped to the chosen
  // analytics period, same as the charts below.
  const periodStats = useMemo(() => {
    const today = new Date()
    const cutoffEnd = rangeEnd < today ? rangeEnd : today
    return computeOverviewStats(
      rangedKeys,
      days,
      slots,
      settings,
      rangeStart,
      cutoffEnd,
    )
  }, [rangedKeys, days, settings, slots, rangeStart, rangeEnd])

  // Best/worst day, week, and month — scoped to the chosen analytics period
  // (same as the charts). Only counts periods with at least some study logged
  // (an untouched day isn't a "worst day", it's just an empty day, already
  // tracked above).
  const remarkable = useMemo(() => {
    const dayVals = rangedKeys
      .map((k) => ({ key: k, hours: dayBreakdown(days[k], slots).total / 60 }))
      .filter((d) => d.hours > 0)

    const weekMap = new Map()
    const monthMap = new Map()
    rangedKeys.forEach((k) => {
      const { total } = dayBreakdown(days[k], slots)
      if (total <= 0) return
      const d = fromKey(k)
      const wk = toKey(startOfWeek(d))
      const mk = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      weekMap.set(wk, (weekMap.get(wk) || 0) + total / 60)
      monthMap.set(mk, (monthMap.get(mk) || 0) + total / 60)
    })
    const weekVals = [...weekMap.entries()].map(([key, hours]) => ({
      key,
      hours,
    }))
    const monthVals = [...monthMap.entries()].map(([key, hours]) => ({
      key,
      hours,
    }))

    const pick = (arr, dir) =>
      arr.length
        ? arr.reduce(
            (best, cur) =>
              (dir === "max" ? cur.hours > best.hours : cur.hours < best.hours)
                ? cur
                : best,
            arr[0],
          )
        : null

    return {
      bestDay: pick(dayVals, "max"),
      worstDay: pick(dayVals, "min"),
      bestWeek: pick(weekVals, "max"),
      worstWeek: pick(weekVals, "min"),
      bestMonth: pick(monthVals, "max"),
      worstMonth: pick(monthVals, "min"),
    }
  }, [rangedKeys, days, slots])

  const dailyTotals = useMemo(
    () =>
      rangedKeys.map((k) => {
        const entry = days[k]
        const { bySlot, byCategory, total } = dayBreakdown(entry, slots)
        const row = {
          date: fmtShort(k),
          total: toHours(total),
          lessons: Number(entry.lessons) || 0,
          goal: toHours(goalForDate(settings, fromKey(k))),
        }
        if (dailyMode === "slot") {
          slots.forEach((s) => (row[s.id] = toHours(bySlot[s.id])))
        } else if (dailyMode === "category") {
          categories.forEach(
            (c) => (row[c.id] = toHours(byCategory[c.id] || 0)),
          )
        }
        return row
      }),
    [rangedKeys, days, slots, categories, dailyMode, settings],
  )
  const dailySeries =
    dailyMode === "slot" ? slots : dailyMode === "category" ? categories : []

  // Days needed per exam — all-time (not range-filtered), since exam milestones
  // are a whole-project concept rather than something bound to the analytics range.
  const examsGapData = useMemo(() => {
    const projectStart = settings.startDate
      ? fromKey(settings.startDate)
      : dayKeysSorted[0]
        ? fromKey(dayKeysSorted[0])
        : null
    if (!projectStart) return []
    let prevDayNum = 0
    return dayKeysSorted
      .filter((k) => days[k]?.exam)
      .map((k, i) => {
        const dayNum = daysBetween(projectStart, fromKey(k)) + 1
        const gap = Math.max(dayNum - prevDayNum, 1)
        prevDayNum = dayNum
        return { exam: `Exam ${i + 1}`, date: fmtShort(k), dayNum, days: gap }
      })
  }, [dayKeysSorted, days, settings.startDate])

  const slotTotals = useMemo(() => {
    const sums = {}
    slots.forEach((s) => (sums[s.id] = 0))
    rangedKeys.forEach((k) => {
      const { bySlot } = dayBreakdown(days[k], slots)
      slots.forEach((s) => (sums[s.id] += bySlot[s.id]))
    })
    return slots.map((s) => ({
      id: s.id,
      name: s.label,
      value: toHours(sums[s.id]),
      color: s.color,
    }))
  }, [rangedKeys, days, slots])
  const visiblePieData = slotTotals.filter((s) => !pieToggle.hidden.has(s.id))

  const effectivenessBySlot = useMemo(() => {
    const lessonMinutes = {}
    const hourSum = {}
    slots.forEach((s) => {
      lessonMinutes[s.id] = 0
      hourSum[s.id] = 0
    })
    rangedKeys.forEach((k) => {
      const entry = days[k]
      const { bySlot, total } = dayBreakdown(entry, slots)
      const lessons = Number(entry.lessons) || 0
      if (total <= 0) return
      slots.forEach((s) => {
        const share = bySlot[s.id] / total
        lessonMinutes[s.id] += lessons * share
        hourSum[s.id] += bySlot[s.id] / 60
      })
    })
    return slots.map((s) => ({
      name: s.label,
      slotId: s.id,
      color: s.color,
      lessonsPerHour:
        hourSum[s.id] > 0
          ? Number((lessonMinutes[s.id] / hourSum[s.id]).toFixed(2))
          : 0,
    }))
  }, [rangedKeys, days, slots])
  const visibleEffData = effectivenessBySlot.filter(
    (s) => !effToggle.hidden.has(s.slotId),
  )

  const weeklyBuckets = useMemo(() => {
    const map = new Map()
    rangedKeys.forEach((k) => {
      const wk = toKey(startOfWeek(fromKey(k)))
      if (!map.has(wk)) map.set(wk, [])
      map.get(wk).push(k)
    })
    return [...map.entries()].sort((a, b) => (a[0] > b[0] ? 1 : -1))
  }, [rangedKeys])

  const effectivenessTrend = useMemo(() => {
    return weeklyBuckets.map(([wk, keys]) => {
      const lessonMinutes = {}
      const hourSum = {}
      slots.forEach((s) => {
        lessonMinutes[s.id] = 0
        hourSum[s.id] = 0
      })
      keys.forEach((k) => {
        const entry = days[k]
        const { bySlot, total } = dayBreakdown(entry, slots)
        const lessons = Number(entry.lessons) || 0
        if (total <= 0) return
        slots.forEach((s) => {
          const share = bySlot[s.id] / total
          lessonMinutes[s.id] += lessons * share
          hourSum[s.id] += bySlot[s.id] / 60
        })
      })
      const row = { week: fmtShort(wk) }
      slots.forEach((s) => {
        row[s.id] =
          hourSum[s.id] > 0
            ? Number((lessonMinutes[s.id] / hourSum[s.id]).toFixed(2))
            : null
      })
      return row
    })
  }, [weeklyBuckets, days, slots])

  const weeklySeries =
    weeklyMode === "slot" ? slots : weeklyMode === "category" ? categories : []

  const weeklyModeData = useMemo(() => {
    return weeklyBuckets.map(([wk, keys]) => {
      const row = { week: fmtShort(wk) }
      if (weeklyMode === "slot" || weeklyMode === "category") {
        const list = weeklyMode === "slot" ? slots : categories
        const sums = {}
        list.forEach((s) => (sums[s.id] = 0))
        keys.forEach((k) => {
          const { bySlot, byCategory } = dayBreakdown(days[k], slots)
          list.forEach(
            (s) =>
              (sums[s.id] +=
                weeklyMode === "slot" ? bySlot[s.id] : byCategory[s.id] || 0),
          )
        })
        list.forEach((s) => (row[s.id] = toHours(sums[s.id])))
      } else if (weeklyMode === "lessons") {
        row.lessons = keys.reduce(
          (sum, k) => sum + (Number(days[k].lessons) || 0),
          0,
        )
      } else {
        let minutes = 0
        keys.forEach((k) => {
          const { total } = dayBreakdown(days[k], slots)
          minutes += total
        })
        row.hours = Number((minutes / 60).toFixed(2))
        // Target hours for the whole week (Mon–Sun), from the per-weekday
        // goals set in Setup — independent of which days actually have
        // logged entries, since it's a target, not an actual.
        let goalMinutes = 0
        const weekStart = fromKey(wk)
        for (let i = 0; i < 7; i++) {
          goalMinutes += goalForDate(settings, addDays(weekStart, i))
        }
        row.goal = Number((goalMinutes / 60).toFixed(2))
      }
      return row
    })
  }, [weeklyBuckets, days, slots, categories, weeklyMode, settings])

  const monthlyBuckets = useMemo(() => {
    const map = new Map()
    rangedKeys.forEach((k) => {
      const d = fromKey(k)
      const mk = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      if (!map.has(mk)) map.set(mk, [])
      map.get(mk).push(k)
    })
    return [...map.entries()].sort((a, b) => (a[0] > b[0] ? 1 : -1))
  }, [rangedKeys])

  const fmtMonthLabel = (mk) => {
    const [y, m] = mk.split("-").map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
    })
  }

  const monthlySeries =
    monthlyMode === "slot"
      ? slots
      : monthlyMode === "category"
        ? categories
        : []

  const monthlyModeData = useMemo(() => {
    return monthlyBuckets.map(([mk, keys]) => {
      const row = { month: fmtMonthLabel(mk) }
      if (monthlyMode === "slot" || monthlyMode === "category") {
        const list = monthlyMode === "slot" ? slots : categories
        const sums = {}
        list.forEach((s) => (sums[s.id] = 0))
        keys.forEach((k) => {
          const { bySlot, byCategory } = dayBreakdown(days[k], slots)
          list.forEach(
            (s) =>
              (sums[s.id] +=
                monthlyMode === "slot" ? bySlot[s.id] : byCategory[s.id] || 0),
          )
        })
        list.forEach((s) => (row[s.id] = toHours(sums[s.id])))
      } else if (monthlyMode === "lessons") {
        row.lessons = keys.reduce(
          (sum, k) => sum + (Number(days[k].lessons) || 0),
          0,
        )
      } else {
        let minutes = 0
        keys.forEach((k) => {
          const { total } = dayBreakdown(days[k], slots)
          minutes += total
        })
        row.hours = Number((minutes / 60).toFixed(2))
        // Target hours for the whole calendar month, from the per-weekday
        // goals set in Setup — independent of which days actually have
        // logged entries, since it's a target, not an actual.
        const [y, m] = mk.split("-").map(Number)
        const daysInMonth = new Date(y, m, 0).getDate()
        let goalMinutes = 0
        for (let d = 1; d <= daysInMonth; d++) {
          goalMinutes += goalForDate(settings, new Date(y, m - 1, d))
        }
        row.goal = Number((goalMinutes / 60).toFixed(2))
      }
      return row
    })
  }, [monthlyBuckets, days, slots, categories, monthlyMode, settings])

  // Weekday effectiveness — compares the same weekday (Mon, Tue, …) across the
  // different weeks in range. In Slot/Category mode we instead show the hours
  // breakdown per weekday, summed across the whole range (matching the toggle
  // options on the Daily study time chart above).
  const weekLabelsList = useMemo(
    () => weeklyBuckets.map(([wk]) => fmtShort(wk)),
    [weeklyBuckets],
  )

  const weekdaySeries = useMemo(() => {
    if (weekdayMode === "slot") return slots
    if (weekdayMode === "category") return categories
    return weeklyBuckets.map(([,], idx) => ({
      id: `w${idx}`,
      label: `Wk of ${weekLabelsList[idx]}`,
      color: PALETTE[idx % PALETTE.length],
    }))
  }, [weekdayMode, slots, categories, weeklyBuckets, weekLabelsList])

  const weekdayData = useMemo(() => {
    return WEEKDAY_ORDER.map((wd) => {
      const row = { weekday: WEEKDAY_LABELS[wd] }
      if (weekdayMode === "slot" || weekdayMode === "category") {
        const matching = rangedKeys.filter((k) => fromKey(k).getDay() === wd)
        if (weekdayMode === "slot") {
          slots.forEach((s) => {
            let sum = 0
            matching.forEach((k) => {
              const { bySlot } = dayBreakdown(days[k], slots)
              sum += bySlot[s.id]
            })
            row[s.id] = toHours(sum)
          })
        } else {
          categories.forEach((c) => {
            let sum = 0
            matching.forEach((k) => {
              const { byCategory } = dayBreakdown(days[k], slots)
              sum += byCategory[c.id] || 0
            })
            row[c.id] = toHours(sum)
          })
        }
      } else {
        weeklyBuckets.forEach(([, keys], idx) => {
          const dayKey = keys.find((k) => fromKey(k).getDay() === wd)
          if (weekdayMode === "lessons") {
            row[`w${idx}`] = dayKey ? Number(days[dayKey].lessons) || 0 : 0
          } else {
            const { total } = dayBreakdown(days[dayKey], slots)
            row[`w${idx}`] = toHours(total)
          }
        })
        if (weekdayMode === "hours") {
          row.goal = toHours(Number(settings.dailyGoals?.[wd]) || 0)
        }
      }
      return row
    })
  }, [rangedKeys, weeklyBuckets, days, slots, categories, weekdayMode, settings])

  return (
    <div className="space-y-8">
      <OverallStatsSection
        overall={overallAllTime}
        lessonsEnabled={lessonsEnabled}
        examsEnabled={examsEnabled}
      />

      <OverviewStats
        period={periodStats}
        lessonsEnabled={lessonsEnabled}
        examsEnabled={examsEnabled}
      />

      <AveragesStats
        period={periodStats}
        lessonsEnabled={lessonsEnabled}
        examsEnabled={examsEnabled}
      />

      <RemarkableStats remarkable={remarkable} />

      <ChartCard
        title="Daily study time"
        subtitle={
          dailyMode === "hours"
            ? "Total hours logged per day"
            : dailyMode === "lessons"
              ? "Lessons completed per day"
              : `Hours logged per day, split by ${dailyMode} — dashed line is the day's total`
        }
        action={
          <SegmentedControl
            items={[
              { id: "slot", label: "Slots" },
              { id: "category", label: "Categories" },
              { id: "hours", label: "Hours" },
              ...(lessonsEnabled ? [{ id: "lessons", label: "Lessons" }] : []),
            ]}
            activeId={dailyMode}
            onChange={setDailyMode}
          />
        }
      >
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={dailyTotals}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3315" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fontFamily: "monospace" }}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: "monospace" }}
              tickFormatter={dailyMode === "lessons" ? undefined : fmtAxisHours}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
              formatter={(value, name) =>
                dailyMode === "lessons"
                  ? [`${value}`, name]
                  : [fmtHoursChart(value), name]
              }
            />
            {dailyMode === "hours" ? (
              [
                <Area
                  key="total"
                  type="monotone"
                  dataKey="total"
                  stroke={ACCENT}
                  fill={ACCENT}
                  fillOpacity={0.25}
                  strokeWidth={2}
                  name="Hours studied"
                  dot={{ r: 3 }}
                />,
                <Line
                  key="goal-line"
                  type="monotone"
                  dataKey="goal"
                  stroke="#1E2A33"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  dot={false}
                  name="Goal"
                />,
              ]
            ) : dailyMode === "lessons" ? (
              <Area
                type="monotone"
                dataKey="lessons"
                stroke={GOAL_MET_COLOR}
                fill={GOAL_MET_COLOR}
                fillOpacity={0.25}
                strokeWidth={2}
                name="Lessons"
                dot={{ r: 3 }}
              />
            ) : (
              // NOTE: recharts inspects its direct children by type — wrapping these in a
              // <Fragment> hides them from it entirely, so we return a flat array instead.
              [
                ...dailySeries
                  .filter((s) => !dailyToggle.hidden.has(s.id))
                  .map((s) => (
                    <Area
                      key={s.id}
                      type="monotone"
                      dataKey={s.id}
                      stackId="a"
                      stroke={s.color}
                      fill={s.color}
                      fillOpacity={0.55}
                      name={s.label}
                    />
                  )),
                <Line
                  key="total-line"
                  type="monotone"
                  dataKey="total"
                  stroke="#1E2A33"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                  name="Total hours"
                />,
              ]
            )}
          </ComposedChart>
        </ResponsiveContainer>
        {(dailyMode === "slot" || dailyMode === "category") && (
          <ToggleChips
            items={dailySeries}
            hidden={dailyToggle.hidden}
            onToggle={dailyToggle.toggle}
          />
        )}
      </ChartCard>
      <ChartCard
        title="Weekday effectiveness"
        subtitle={
          weekdayMode === "hours"
            ? "Hours studied per weekday, compared week over week"
            : weekdayMode === "lessons"
              ? "Lessons completed per weekday, compared week over week"
              : `Hours per weekday in this range, split by ${weekdayMode}`
        }
        action={
          <SegmentedControl
            items={[
              { id: "slot", label: "Slots" },
              { id: "category", label: "Categories" },
              { id: "hours", label: "Hours" },
              ...(lessonsEnabled ? [{ id: "lessons", label: "Lessons" }] : []),
            ]}
            activeId={weekdayMode}
            onChange={setWeekdayMode}
          />
        }
      >
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={weekdayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3315" />
            <XAxis
              dataKey="weekday"
              tick={{ fontSize: 10, fontFamily: "monospace" }}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: "monospace" }}
              tickFormatter={
                weekdayMode === "lessons" ? undefined : fmtAxisHours
              }
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
              formatter={(value, name) =>
                weekdayMode === "lessons"
                  ? [`${value}`, name]
                  : [fmtHoursChart(value), name]
              }
            />
            {weekdaySeries
              .filter((s) => !weekdayToggle.hidden.has(s.id))
              .map((s) =>
                weekdayMode === "slot" || weekdayMode === "category" ? (
                  <Area
                    key={s.id}
                    type="monotone"
                    dataKey={s.id}
                    stackId="a"
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.55}
                    name={s.label}
                  />
                ) : (
                  <Area
                    key={s.id}
                    type="monotone"
                    dataKey={s.id}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name={s.label}
                    dot={{ r: 2 }}
                  />
                ),
              )}
            {weekdayMode === "hours" && (
              <Line
                type="monotone"
                dataKey="goal"
                stroke="#1E2A33"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                name="Goal"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        <ToggleChips
          items={weekdaySeries}
          hidden={weekdayToggle.hidden}
          onToggle={weekdayToggle.toggle}
        />
      </ChartCard>
      <ChartCard
        title="Weekly effectiveness"
        subtitle={
          weeklyMode === "hours"
            ? "Total hours studied, aggregated per week"
            : weeklyMode === "lessons"
              ? "Lessons completed per week"
              : `Hours per week, split by ${weeklyMode}`
        }
        action={
          <SegmentedControl
            items={[
              { id: "hours", label: "Hours" },
              { id: "slot", label: "Slots" },
              { id: "category", label: "Categories" },
              ...(lessonsEnabled ? [{ id: "lessons", label: "Lessons" }] : []),
            ]}
            activeId={weeklyMode}
            onChange={setWeeklyMode}
          />
        }
      >
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={weeklyModeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3315" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fontFamily: "monospace" }}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: "monospace" }}
              tickFormatter={
                weeklyMode === "slot" ||
                weeklyMode === "category" ||
                weeklyMode === "hours"
                  ? fmtAxisHours
                  : undefined
              }
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
              formatter={(value, name) =>
                weeklyMode === "slot" ||
                weeklyMode === "category" ||
                weeklyMode === "hours"
                  ? [fmtHoursChart(value), name]
                  : [`${value}`, name]
              }
            />
            {weeklyMode === "slot" || weeklyMode === "category" ? (
              weeklySeries
                .filter((s) => !weeklyToggle.hidden.has(s.id))
                .map((s) => (
                  <Area
                    key={s.id}
                    type="monotone"
                    dataKey={s.id}
                    stackId="a"
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.55}
                    name={s.label}
                  />
                ))
            ) : (
              [
                <Area
                  key="value"
                  type="monotone"
                  dataKey={weeklyMode === "lessons" ? "lessons" : "hours"}
                  stroke={weeklyMode === "lessons" ? GOAL_MET_COLOR : ACCENT}
                  fill={weeklyMode === "lessons" ? GOAL_MET_COLOR : ACCENT}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name={weeklyMode === "lessons" ? "Lessons" : "Hours"}
                  dot={{ r: 3 }}
                />,
                weeklyMode === "hours" && (
                  <Line
                    key="goal-line"
                    type="monotone"
                    dataKey="goal"
                    stroke="#1E2A33"
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    dot={false}
                    name="Goal"
                  />
                ),
              ]
            )}
          </AreaChart>
        </ResponsiveContainer>
        {(weeklyMode === "slot" || weeklyMode === "category") && (
          <ToggleChips
            items={weeklySeries}
            hidden={weeklyToggle.hidden}
            onToggle={weeklyToggle.toggle}
          />
        )}
      </ChartCard>

      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard
          title="Monthly effectiveness"
          subtitle={
            monthlyMode === "hours"
              ? "Total hours studied, aggregated per month"
              : monthlyMode === "lessons"
                ? "Lessons completed per month"
                : `Hours per month, split by ${monthlyMode}`
          }
          action={
            <SegmentedControl
              items={[
                { id: "hours", label: "Hours" },
                { id: "slot", label: "Slots" },
                { id: "category", label: "Categories" },
                ...(lessonsEnabled ? [{ id: "lessons", label: "Lessons" }] : []),
              ]}
              activeId={monthlyMode}
              onChange={setMonthlyMode}
            />
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyModeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3315" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fontFamily: "monospace" }}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "monospace" }}
                tickFormatter={
                  monthlyMode === "slot" ||
                  monthlyMode === "category" ||
                  monthlyMode === "hours"
                    ? fmtAxisHours
                    : undefined
                }
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
                formatter={(value, name) =>
                  monthlyMode === "slot" ||
                  monthlyMode === "category" ||
                  monthlyMode === "hours"
                    ? [fmtHoursChart(value), name]
                    : [`${value}`, name]
                }
              />
              {monthlyMode === "slot" || monthlyMode === "category" ? (
                monthlySeries
                  .filter((s) => !monthlyToggle.hidden.has(s.id))
                  .map((s) => (
                    <Area
                      key={s.id}
                      type="monotone"
                      dataKey={s.id}
                      stackId="a"
                      stroke={s.color}
                      fill={s.color}
                      fillOpacity={0.55}
                      name={s.label}
                    />
                  ))
              ) : (
                // Flat array, not a Fragment — see the note on the daily chart.
                [
                  <Area
                    key="value"
                    type="monotone"
                    dataKey={monthlyMode === "lessons" ? "lessons" : "hours"}
                    stroke={monthlyMode === "lessons" ? GOAL_MET_COLOR : ACCENT}
                    fill={monthlyMode === "lessons" ? GOAL_MET_COLOR : ACCENT}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    name={monthlyMode === "lessons" ? "Lessons" : "Hours"}
                    dot={{ r: 3 }}
                  />,
                  monthlyMode === "hours" && (
                    <Line
                      key="goal-line"
                      type="monotone"
                      dataKey="goal"
                      stroke="#1E2A33"
                      strokeWidth={1.5}
                      strokeDasharray="6 3"
                      dot={false}
                      name="Goal"
                    />
                  ),
                ]
              )}
            </AreaChart>
          </ResponsiveContainer>
          {(monthlyMode === "slot" || monthlyMode === "category") && (
            <ToggleChips
              items={monthlySeries}
              hidden={monthlyToggle.hidden}
              onToggle={monthlyToggle.toggle}
            />
          )}
        </ChartCard>
        {examsEnabled && (
          <ChartCard
            title="Days per exam"
            subtitle="Calendar days needed to reach each exam, all-time"
          >
            {examsGapData.length === 0 ? (
              <p className="text-xs font-mono text-[#1E2A33]/40 py-10 text-center">
                No exams passed yet — this fills in as you mark exam days in
                the log.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={examsGapData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3315" />
                  <XAxis
                    dataKey="exam"
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
                    formatter={(value, _name, props) => [
                      `${value} days`,
                      `Passed ${props.payload.date}`,
                    ]}
                  />
                  {overallAllTime.avgDaysPerExam != null && (
                    <ReferenceLine
                      y={overallAllTime.avgDaysPerExam}
                      stroke={ACCENT}
                      strokeDasharray="4 4"
                      label={{
                        value: `avg ${overallAllTime.avgDaysPerExam.toFixed(0)}d`,
                        fontSize: 10,
                        fill: ACCENT,
                        position: "right",
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="days"
                    stroke={ACCENT}
                    fill={ACCENT}
                    fillOpacity={0.28}
                    strokeWidth={2}
                    name="Days needed"
                    dot={{ r: 4, fill: ACCENT, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        )}
      </div>
    </div>
  )
}

function OverviewStats({ period, lessonsEnabled, examsEnabled }) {
  const hours = (period.totalMinutes / 60).toFixed(1)

  // Lessons and exams for the chosen period live here rather than above the
  // log: this section is already "the numbers for the selected period", and it
  // covers every period — day, week, month, 3 months, year, all time, custom —
  // instead of only week and month. The per-week/per-day rates are next door in
  // Averages.
  const stats = [
    { label: "Hours studied", value: hours, icon: Clock },
    lessonsEnabled && {
      label: "Lessons completed",
      value: period.lessonsDone,
      icon: BookOpen,
    },
    examsEnabled && {
      label: "Exams passed",
      value: period.examsDone,
      icon: Award,
    },
    {
      label: "Days since start",
      value: fmtDaysWithMonths(period.daysSinceStart),
      icon: CalendarDays,
    },
    { label: "Empty days", value: period.emptyDays, icon: AlertCircle },
  ].filter(Boolean)

  return (
    <div>
      <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm mb-1 text-[#1E2A33]">
        Stats
      </h3>
      <p className="text-[11px] font-mono text-[#1E2A33]/40 mb-3 uppercase tracking-widest">
        Overview, selected period
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <StatTile
            key={s.label}
            label={s.label}
            value={s.value}
            sub={s.sub}
            icon={s.icon}
          />
        ))}
      </div>
    </div>
  )
}

function AveragesStats({ period, lessonsEnabled, examsEnabled }) {
  const items = [
    {
      label: "Avg hours / day",
      value:
        period.avgHoursPerDay != null
          ? `${period.avgHoursPerDay.toFixed(1)}h`
          : "—",
      icon: Clock,
    },
    lessonsEnabled && {
      label: "Avg hours / lesson",
      value:
        period.avgHoursPerLesson != null
          ? `${period.avgHoursPerLesson.toFixed(2)}h`
          : "—",
      icon: BookOpen,
    },
    lessonsEnabled && {
      label: "Avg lessons / day",
      value:
        period.avgLessonsPerDay != null
          ? period.avgLessonsPerDay.toFixed(2)
          : "—",
      icon: TrendingUp,
    },
    examsEnabled && {
      label: "Avg days / exam",
      value:
        period.avgDaysPerExam != null ? Math.round(period.avgDaysPerExam) : "—",
      icon: Award,
    },
    lessonsEnabled && {
      label: "Avg lessons / week",
      value:
        period.avgLessonsPerWeek != null
          ? period.avgLessonsPerWeek.toFixed(2)
          : "—",
      icon: CalendarDays,
    },
    lessonsEnabled && {
      label: "Avg lessons / month",
      value:
        period.avgLessonsPerMonth != null
          ? period.avgLessonsPerMonth.toFixed(2)
          : "—",
      icon: ClipboardList,
    },
    lessonsEnabled && {
      label: "Avg lessons / 3 months",
      value:
        period.avgLessonsPer3Months != null
          ? period.avgLessonsPer3Months.toFixed(2)
          : "—",
      icon: Layers,
    },
  ].filter(Boolean)

  return (
    <div>
      <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm mb-1 text-[#1E2A33]">
        Averages
      </h3>
      <p className="text-[11px] font-mono text-[#1E2A33]/40 mb-3 uppercase tracking-widest">
        Pace over the selected period
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {items.map((it) => (
          <StatTile
            key={it.label}
            label={it.label}
            value={it.value}
            icon={it.icon}
          />
        ))}
      </div>
    </div>
  )
}

// Project-wide totals & forecast — visually distinct (tinted) and placed above
// the period-scoped Stats section, to make clear it does NOT change with the
// selected analytics period.
function OverallStatsSection({ overall, lessonsEnabled, examsEnabled }) {
  const tint = "#C98A2E"
  const lessonPct =
    overall.totalLessons > 0
      ? Math.min(
          100,
          Math.round((overall.lessonsDone / overall.totalLessons) * 100),
        )
      : 0
  const examPct =
    overall.totalExams > 0
      ? Math.min(
          100,
          Math.round((overall.examsDone / overall.totalExams) * 100),
        )
      : 0
  const hasEnough =
    overall.avgMinutesPerLesson && overall.avgLessonsPerActiveDay

  if (!lessonsEnabled && !examsEnabled) return null

  const baseItems = [
    lessonsEnabled && {
      label: "Lessons done",
      value: `${overall.lessonsDone}/${overall.totalLessons}`,
      sub: `${lessonPct}%`,
      icon: TrendingUp,
    },
    examsEnabled && {
      label: "Exams passed",
      value: `${overall.examsDone}/${overall.totalExams}`,
      sub: `${examPct}%`,
      icon: Award,
    },
  ].filter(Boolean)

  const forecastItems =
    lessonsEnabled && hasEnough && overall.lessonsRemaining > 0
      ? [
          {
            label: "Lessons remaining",
            value: overall.lessonsRemaining,
            icon: ListChecks,
          },
          {
            label: "Est. time remaining",
            value: overall.estRemainingMinutes
              ? `${(overall.estRemainingMinutes / 60).toFixed(1)}h`
              : "—",
            icon: Clock,
          },
          {
            label: "Est. time to finish",
            value:
              overall.estRemainingCalendarDays != null
                ? `${(overall.estRemainingCalendarDays / 30.44).toFixed(1)} mo (${overall.estRemainingCalendarDays}d)`
                : "—",
            icon: CalendarDays,
          },
          {
            label: "Est. finish date",
            value: overall.estFinishDate
              ? overall.estFinishDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—",
            icon: Flag,
          },
        ]
      : []

  const items = [...baseItems, ...forecastItems]

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 border-2"
      style={{ backgroundColor: `${tint}14`, borderColor: `${tint}45` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="flex items-center justify-center w-6 h-6 rounded-full"
          style={{ backgroundColor: `${tint}30` }}
        >
          <Rocket size={13} style={{ color: tint }} />
        </span>
        <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm text-[#1E2A33]">
          Overall stats
        </h3>
      </div>
      <p className="text-[11px] font-mono text-[#1E2A33]/50 mb-3 uppercase tracking-widest">
        Project totals &amp; forecast — independent of the chosen period
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((it) => {
          const Icon = it.icon
          return (
            <div key={it.label} className="rounded-2xl p-4 bg-white/70">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/50">
                  {it.label}
                </span>
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full"
                  style={{ backgroundColor: `${tint}20` }}
                >
                  <Icon size={12} style={{ color: tint }} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-bold">{it.value}</span>
                {it.sub && (
                  <span className="text-[10px] font-mono text-[#1E2A33]/40">
                    {it.sub}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {lessonsEnabled && !hasEnough && (
        <p className="mt-3 text-[11px] font-mono text-[#1E2A33]/60">
          Log a few more study days with lessons completed to unlock a forecast.
        </p>
      )}
      {lessonsEnabled && hasEnough && overall.lessonsRemaining === 0 && (
        <p className="mt-3 text-sm font-mono text-[#1E2A33]">
          Project complete — all {overall.totalLessons} lessons logged. 🎉
        </p>
      )}
    </div>
  )
}

function RemarkableStats({ remarkable }) {
  const fmtWeek = (k) => `Week of ${fmtDateLong(k)}`
  const fmtMonth = (k) => {
    const [y, m] = k.split("-").map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    })
  }

  const items = [
    {
      label: "Best day",
      data: remarkable.bestDay,
      fmt: fmtDateLong,
      tone: "good",
      icon: Sun,
    },
    {
      label: "Best week",
      data: remarkable.bestWeek,
      fmt: fmtWeek,
      tone: "good",
      icon: TrendingUp,
    },
    {
      label: "Best month",
      data: remarkable.bestMonth,
      fmt: fmtMonth,
      tone: "good",
      icon: Star,
    },
    {
      label: "Worst day",
      data: remarkable.worstDay,
      fmt: fmtDateLong,
      tone: "bad",
      icon: Cloud,
    },
    {
      label: "Worst week",
      data: remarkable.worstWeek,
      fmt: fmtWeek,
      tone: "bad",
      icon: AlertCircle,
    },
    {
      label: "Worst month",
      data: remarkable.worstMonth,
      fmt: fmtMonth,
      tone: "bad",
      icon: Flag,
    },
  ]

  return (
    <div>
      <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm mb-1 text-[#1E2A33]">
        Remarkable
      </h3>
      <p className="text-[11px] font-mono text-[#1E2A33]/40 mb-3 uppercase tracking-widest">
        Best &amp; worst, within the selected period, in hours
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((it) => {
          const Icon = it.icon
          const color = it.tone === "good" ? GOAL_MET_COLOR : EXAM_COLOR
          return (
            <div key={it.label} className={`${CARD} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/50">
                  {it.label}
                </span>
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full"
                  style={{ backgroundColor: `${color}1A` }}
                >
                  <Icon size={12} style={{ color }} />
                </span>
              </div>
              {it.data ? (
                <>
                  <span
                    className="font-mono text-xl font-bold"
                    style={{ color }}
                  >
                    {fmtHoursChart(it.data.hours)}
                  </span>
                  <div className="text-[10px] font-mono text-[#1E2A33]/40 mt-1">
                    {it.fmt(it.data.key)}
                  </div>
                </>
              ) : (
                <span className="font-mono text-xl font-bold text-[#1E2A33]/25">
                  —
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, action, children }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px]  font-mono uppercase tracking-widest text-[#1E2A33]/40">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}