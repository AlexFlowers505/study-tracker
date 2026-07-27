import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
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
const HEAT_SCALE = ["#E7ECF3", "#BBD0EA", "#7FA8DA", "#4E7FC0", "#2957B0"]
const CARD = "bg-white rounded-2xl p-4"

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

const DEFAULT_SETTINGS = {
  totalLessons: 100,
  totalExams: 10,
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
    days: {}, // key: 'YYYY-MM-DD' -> { cells: { slotId: [{id,category,minutes,comment}] }, lessons: number, exam: boolean, comment?: string }
    weekNotes: {}, // key: 'YYYY-MM-DD' (Monday of that week) -> comment string
    monthNotes: {}, // key: 'YYYY-MM' -> comment string
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
// Same rounding, no unit suffix — used for compact axis ticks.
const fmtAxisHours = (hoursValue) => {
  const h = Math.round(hoursValue * 100) / 100
  return Number.isInteger(h) ? `${h}` : h.toFixed(2)
}

const goalForDate = (settings, date) =>
  Number(settings?.dailyGoals?.[date.getDay()]) || 0

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

function buildTooltip(dayEntry, slots, categories) {
  const { bySlot, byCategory, total } = dayBreakdown(dayEntry, slots)
  if (!dayEntry || total === 0) {
    return dayEntry?.comment ? `No study logged\n—\n${dayEntry.comment}` : "No study logged"
  }
  const lines = [`Total: ${total}m`]
  slots.forEach((s) => {
    if (bySlot[s.id] > 0) lines.push(`${s.label}: ${bySlot[s.id]}m`)
  })
  lines.push("—")
  categories.forEach((c) => {
    if (byCategory[c.id]) lines.push(`${c.label}: ${byCategory[c.id]}m`)
  })
  if (dayEntry.lessons) lines.push(`Lessons: ${dayEntry.lessons}`)
  if (dayEntry.exam) lines.push("Exam passed")
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
function Tip({ text, children, multiline = false, side = "top" }) {
  if (!text) return children
  const posClasses =
    side === "bottom"
      ? "top-full mt-1.5"
      : side === "left"
        ? "right-full top-1/2 -translate-y-1/2 mr-1.5"
        : "bottom-full mb-1.5"
  const alignClasses = side === "left" ? "" : "left-1/2 -translate-x-1/2"
  return (
    <span className="relative inline-flex group/tip">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${posClasses} ${alignClasses} z-50 rounded-lg bg-[#1E2A33] text-[#F4F5F7] text-[10px] font-mono leading-snug px-2 py-1.5 opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 group-focus-within/tip:opacity-100 group-focus-within/tip:scale-100 transition-all duration-150 shadow-lg ${
          multiline ? "whitespace-pre-line max-w-[220px] text-left" : "whitespace-nowrap"
        }`}
      >
        {text}
      </span>
    </span>
  )
}

// Textarea that grows with its content up to a max height, then scrolls —
// used anywhere a note/comment can get long (day entries, slot/category descriptions).
function AutoTextarea({ value, onChange, maxHeight = 160, className = "", ...rest }) {
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
  const [msg, setMsg] = useState(null)

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
        const { error } = await client.auth.signUp({ email, password })
        if (error) throw error
        setMsg(
          "Account created — check your inbox to confirm your email, then sign in.",
        )
      }
    } catch (err) {
      setMsg(err.message || "Something went wrong.")
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
            Study Manifest
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
  const [view, setView] = useState("log") // 'log' | 'analytics'
  const [logGranularity, setLogGranularity] = useState("month")
  const [logCursor, setLogCursor] = useState(new Date())
  const [analyticsPreset, setAnalyticsPreset] = useState("30")
  const [analyticsCustomStart, setAnalyticsCustomStart] = useState(toKey(addDays(new Date(), -30)))
  const [analyticsCustomEnd, setAnalyticsCustomEnd] = useState(toKey(new Date()))
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

  const persist = useCallback(
    async (next) => {
      setData(next)
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
      }
    },
    [canUseCloud, cloudClient, session],
  )

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
    const existing = project.days[key] || { cells: {}, lessons: 0, exam: false }
    updateProject({
      days: { ...project.days, [key]: { ...existing, ...patch } },
    })
  }

  const updateWeekNote = (weekKey, text) =>
    updateProject({ weekNotes: { ...(project.weekNotes || {}), [weekKey]: text } })
  const updateMonthNote = (monthKey, text) =>
    updateProject({ monthNotes: { ...(project.monthNotes || {}), [monthKey]: text } })

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
    setLogGranularity("day")
  }

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
        view={view}
        setView={setView}
        onOpenSetup={() => setShowSetup(true)}
        projectName={project.settings.projectName || "Study Manifest"}
        projectIcon={project.settings.projectIcon || "Train"}
        startDate={project.settings.startDate}
        endDate={project.settings.endDate}
        cloudEnabled={cloudEnabled}
        session={session}
        onSignOut={() => cloudClient && cloudClient.auth.signOut()}
      />

      <main className="max-w-6xl mx-auto px-4 pb-24 pt-6">
        {view === "log" ? (
          <LogView
            data={project}
            granularity={logGranularity}
            setGranularity={setLogGranularity}
            cursor={logCursor}
            setCursor={setLogCursor}
            onNavigateDay={goToDay}
            onEditDay={setEditingKey}
            onUpdateWeekNote={updateWeekNote}
            onUpdateMonthNote={updateMonthNote}
          />
        ) : (
          <AnalyticsView
            data={project}
            preset={analyticsPreset}
            setPreset={setAnalyticsPreset}
            customStart={analyticsCustomStart}
            setCustomStart={setAnalyticsCustomStart}
            customEnd={analyticsCustomEnd}
            setCustomEnd={setAnalyticsCustomEnd}
          />
        )}
      </main>

      {editingKey && (
        <DayEditor
          dateKey={editingKey}
          dayEntry={project.days[editingKey]}
          slots={project.slots}
          categories={project.categories}
          onClose={() => setEditingKey(null)}
          onChange={(patch) => updateDay(editingKey, patch)}
        />
      )}

      {showSetup && (
        <SetupModal
          settings={project.settings}
          slots={project.slots}
          categories={project.categories}
          onClose={() => setShowSetup(false)}
          onSaveCourse={updateSettings}
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
  view,
  setView,
  onOpenSetup,
  projectName,
  projectIcon,
  startDate,
  endDate,
  cloudEnabled,
  session,
  onSignOut,
}) {
  return (
    <header className="sticky top-0 z-20 bg-[#F4F5F7]/95 backdrop-blur border-b border-[#1E2A33]/10">
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
          <SegmentedControl
            items={[
              { id: "log", label: "Log" },
              { id: "analytics", label: "Analytics" },
            ]}
            activeId={view}
            onChange={setView}
          />
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
   Setup Modal (course / slots / categories)
--------------------------------------------------------------- */

function SetupModal({
  settings,
  slots,
  categories,
  onClose,
  onSaveCourse,
  onUpdateSlots,
  onUpdateCategories,
  projects,
  activeProjectId,
  onSwitchProject,
  onAddProject,
  onDeleteProject,
}) {
  const [tab, setTab] = useState("course")
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
            { id: "course", label: "Course" },
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
          {tab === "course" && (
            <CourseTab settings={settings} onSave={onSaveCourse} />
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
        Switch between separate courses, each with its own slots, categories and
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
                <Tip text={projects.length <= 1 ? "At least one project is required" : "Delete project"}>
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

function CourseTab({ settings, onSave }) {
  const [projectName, setProjectName] = useState(
    settings.projectName ?? "Study Manifest",
  )
  const [projectIcon, setProjectIcon] = useState(
    settings.projectIcon ?? "Train",
  )
  const [totalLessons, setTotalLessons] = useState(settings.totalLessons ?? 100)
  const [totalExams, setTotalExams] = useState(settings.totalExams ?? 10)
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

      <Field label="Total lessons in course">
        <input
          type="number"
          min={1}
          value={totalLessons}
          onChange={(e) => setTotalLessons(Number(e.target.value))}
          className="w-full border border-[#1E2A33]/20 rounded-xl px-3 py-2"
        />
      </Field>
      <Field label="Total exams in course">
        <input
          type="number"
          min={0}
          value={totalExams}
          onChange={(e) => setTotalExams(Number(e.target.value))}
          className="w-full border border-[#1E2A33]/20 rounded-xl px-3 py-2"
        />
      </Field>
      <Field label="Course start date">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full border border-[#1E2A33]/20 rounded-xl px-3 py-2"
        />
      </Field>
      <Field label="Course end date (optional)">
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full border border-[#1E2A33]/20 rounded-xl px-3 py-2"
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
                  onChange={(e) => updateItem(item.id, { label: e.target.value })}
                  className="flex-1 border border-[#1E2A33]/20 rounded-xl px-2 py-1.5 text-xs font-mono"
                />
                <Tip text={items.length <= 1 ? "At least one is required" : "Remove"}>
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
                <MessageSquare size={12} className="text-[#1E2A33]/25 shrink-0 mt-1.5" />
                <AutoTextarea
                  value={item.description || ""}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
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
   Log View (month / week / day / 90 days / year)
--------------------------------------------------------------- */

const GRANULARITIES = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "90days", label: "90 Days" },
  { id: "year", label: "Year" },
]

function stepCursor(cursor, granularity, dir) {
  switch (granularity) {
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

function rangeLabel(cursor, granularity) {
  if (granularity === "month") return monthLabel(cursor)
  if (granularity === "week") {
    const s = startOfWeek(cursor)
    const e = addDays(s, 6)
    return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${e.toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    )}`
  }
  if (granularity === "day") {
    return cursor.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }
  if (granularity === "90days") {
    const s = addDays(cursor, -89)
    return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${cursor.toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    )}`
  }
  if (granularity === "year") return String(cursor.getFullYear())
  return ""
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
  return (
    <div className={`${CARD} p-4 mb-4`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className="text-[#1E2A33]/40" />
        <span className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/50">
          {label}
        </span>
      </div>
      <AutoTextarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a note for this period (optional)"
        rows={1}
        maxHeight={160}
        className="w-full border border-[#1E2A33]/10 rounded-lg px-2 py-1.5 text-xs font-mono bg-[#F4F5F7]/40"
      />
    </div>
  )
}

function LogView({
  data,
  granularity,
  setGranularity,
  cursor,
  setCursor,
  onNavigateDay,
  onEditDay,
  onUpdateWeekNote,
  onUpdateMonthNote,
}) {
  const { slots, categories, days, settings, weekNotes = {}, monthNotes = {} } = data
  const todayKey = toKey(new Date())
  const weekKey = toKey(startOfWeek(cursor))
  const monthKey = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`

  const headerStats = useMemo(() => {
    if (granularity === "week")
      return rangeStats(weekDates(cursor), days, slots, settings)
    if (granularity === "month")
      return rangeStats(monthDates(cursor), days, slots, settings)
    return null
  }, [granularity, cursor, days, slots, settings])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SegmentedControl
          items={GRANULARITIES}
          activeId={granularity}
          onChange={setGranularity}
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(stepCursor(cursor, granularity, -1))}
            className={`${btnBase} p-2 rounded-xl border border-[#1E2A33]/20 bg-white hover:bg-[#1E2A33]/5 hover:border-[#1E2A33]/35`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className={`${btnBase} px-3 py-2 text-[10px] font-mono uppercase tracking-widest rounded-xl border border-[#1E2A33]/20 bg-white hover:bg-[#1E2A33]/5 hover:border-[#1E2A33]/35`}
          >
            Today
          </button>
          <button
            onClick={() => setCursor(stepCursor(cursor, granularity, 1))}
            className={`${btnBase} p-2 rounded-xl border border-[#1E2A33]/20 bg-white hover:bg-[#1E2A33]/5 hover:border-[#1E2A33]/35`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
        <h2 className="font-sans font-extrabold uppercase tracking-tight text-base">
          {rangeLabel(cursor, granularity)}
        </h2>
        {headerStats && (
          <span className="text-xs font-mono text-[#1E2A33]/50">
            {headerStats.total > 0 ? fmtHours(headerStats.total) : "0h"} studied
            {headerStats.goal > 0 && <> · goal {fmtHours(headerStats.goal)}</>}
          </span>
        )}
      </div>

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
        />
      )}
      {granularity === "week" && (
        <FullCardGrid
          dates={weekDates(cursor)}
          days={days}
          slots={slots}
          categories={categories}
          settings={settings}
          todayKey={todayKey}
          onNavigateDay={onNavigateDay}
          onEditDay={onEditDay}
        />
      )}
      {granularity === "day" && (
        <FullCardGrid
          dates={[cursor]}
          days={days}
          slots={slots}
          categories={categories}
          settings={settings}
          todayKey={todayKey}
          onNavigateDay={onNavigateDay}
          onEditDay={onEditDay}
          big
        />
      )}
      {granularity === "90days" && (
        <Heatmap
          start={addDays(cursor, -89)}
          end={cursor}
          days={days}
          slots={slots}
          categories={categories}
          settings={settings}
          todayKey={todayKey}
          onSelectDay={onNavigateDay}
          showMonths
        />
      )}
      {granularity === "year" && (
        <Heatmap
          start={new Date(cursor.getFullYear(), 0, 1)}
          end={new Date(cursor.getFullYear(), 11, 31)}
          days={days}
          slots={slots}
          categories={categories}
          settings={settings}
          todayKey={todayKey}
          onSelectDay={onNavigateDay}
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

// Sums logged time and daily goals across a list of dates — used for the
// week/month header totals and the month view's per-week summary column.
function rangeStats(dates, days, slots, settings) {
  let total = 0
  let goal = 0
  dates.forEach((d) => {
    const { total: t } = dayBreakdown(days[toKey(d)], slots)
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
}) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const weekRows = []
  for (let i = 0; i < cells.length; i += 7) weekRows.push(cells.slice(i, i + 7))

  const gridCols = { gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))" }
  const startDate = settings.startDate ? fromKey(settings.startDate) : null

  return (
    <div>
      <div
        className="grid gap-2 mb-2 text-[10px] font-mono uppercase tracking-widest text-[#1E2A33]/50 text-center"
        style={gridCols}
      >
        <div />
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="space-y-2">
        {weekRows.map((row, ri) => {
          const { total: wTotal, goal: wGoal } = rangeStats(
            row.filter(Boolean),
            days,
            slots,
            settings,
          )
          return (
            <div key={ri} className="grid gap-2" style={gridCols}>
              <WeekSummaryCell total={wTotal} goal={wGoal} />
              {row.map((date, di) => {
                if (!date) return <div key={di} />
                return (
                  <CompactDayCell
                    key={toKey(date)}
                    date={date}
                    entry={days[toKey(date)]}
                    slots={slots}
                    categories={categories}
                    goal={goalForDate(settings, date)}
                    isToday={toKey(date) === todayKey}
                    isFuture={date > new Date()}
                    isBeforeStart={startDate ? date < startDate : false}
                    onNavigate={() => onNavigateDay(toKey(date))}
                    onEdit={() => onEditDay(toKey(date))}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Non-interactive summary shown to the left of each week row in month view.
function WeekSummaryCell({ total, goal }) {
  const met = goal > 0 && total >= goal
  return (
    <div className="rounded-2xl bg-[#1E2A33]/[0.04] border border-[#1E2A33]/10 border-dashed h-28 flex flex-col items-center justify-center px-1 text-center">
      <span className="text-[8px] font-mono uppercase tracking-widest text-[#1E2A33]/35 mb-1">
        Week
      </span>
      <span
        className="text-xs font-mono font-bold"
        style={met ? { color: GOAL_MET_COLOR } : undefined}
      >
        {total > 0 ? fmtHours(total) : "—"}
      </span>
      {goal > 0 && (
        <span className="text-[8px] font-mono text-[#1E2A33]/35 mt-0.5">
          of {fmtHours(goal)}
        </span>
      )}
    </div>
  )
}

function CompactDayCell({
  date,
  entry,
  slots,
  categories,
  goal,
  isToday,
  isFuture,
  isBeforeStart,
  onNavigate,
  onEdit,
}) {
  if (isBeforeStart) {
    return (
      <div className="rounded-2xl border border-[#1E2A33]/8 bg-[#1E2A33]/[0.025] h-28 flex items-start p-2">
        <span className="font-mono text-xs text-[#1E2A33]/20">{date.getDate()}</span>
      </div>
    )
  }

  const { bySlot, total } = dayBreakdown(entry, slots)
  const tooltip = buildTooltip(entry, slots, categories)
  const metGoal = goal > 0 && total >= goal

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => e.key === "Enter" && onNavigate()}
      className={`${btnBase} group/cell group relative text-left rounded-2xl border p-2 h-28 flex flex-col justify-between bg-white hover:shadow-md cursor-pointer ${
        isToday ? "border-2" : "border-[#1E2A33]/15 hover:border-[#1E2A33]/30"
      } ${isFuture ? "opacity-50" : ""}`}
      style={isToday ? { borderColor: ACCENT } : undefined}
    >
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 rounded-lg bg-[#1E2A33] text-[#F4F5F7] text-[10px] font-mono leading-snug px-2 py-1.5 opacity-0 scale-95 group-hover/cell:opacity-100 group-hover/cell:scale-100 transition-all duration-150 shadow-lg whitespace-pre-line max-w-[220px] text-left"
      >
        {tooltip}
      </span>
      <div className="flex items-start justify-between">
        <span className="font-mono text-xs">{date.getDate()}</span>
        <div className="flex items-center gap-1">
          {entry?.exam && (
            <Tip text="Exam passed">
              <span
                className="flex items-center justify-center w-4 h-4 rounded-full"
                style={{ backgroundColor: EXAM_COLOR }}
              >
                <Award size={10} className="text-white" />
              </span>
            </Tip>
          )}
          <Tip text="Edit this day">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className={`${btnBase} opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-[#1E2A33]/40 hover:text-[#1E2A33] hover:bg-[#1E2A33]/10`}
            >
              <PenLine size={11} />
            </button>
          </Tip>
        </div>
      </div>

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
              {bySlot[s.id]}
            </span>
          ) : null,
        )}
        {total === 0 && (
          <span className="text-[8px] font-mono text-[#1E2A33]/25">—</span>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-[#1E2A33]/70">
        <span
          style={
            metGoal ? { color: GOAL_MET_COLOR, fontWeight: 700 } : undefined
          }
        >
          {total > 0 ? fmtHours(total) : ""}
          {goal > 0 && (
            <span className="text-[#1E2A33]/30">/{fmtHours(goal)}</span>
          )}
        </span>
        {entry?.lessons > 0 && (
          <Tip text="Lessons studied today">
            <span>{entry.lessons}L</span>
          </Tip>
        )}
      </div>
    </div>
  )
}

/* ---- Week / Day view (full detail cards) ---- */

function EntriesReadout({ slots, categories, cells }) {
  const hasAny = slots.some((s) => (cells[s.id] || []).length > 0)
  if (!hasAny) return null
  return (
    <div className="space-y-2.5">
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
  big,
}) {
  const startDate = settings.startDate ? fromKey(settings.startDate) : null
  return (
    <div
      className={
        big
          ? "max-w-md"
          : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3"
      }
    >
      {dates.map((date) => (
        <FullDayCard
          key={toKey(date)}
          date={date}
          entry={days[toKey(date)]}
          slots={slots}
          categories={categories}
          goal={goalForDate(settings, date)}
          isToday={toKey(date) === todayKey}
          isBeforeStart={startDate ? date < startDate : false}
          onNavigate={() => onNavigateDay(toKey(date))}
          onEdit={() => onEditDay(toKey(date))}
          big={big}
        />
      ))}
    </div>
  )
}

function FullDayCard({
  date,
  entry,
  slots,
  categories,
  goal,
  isToday,
  isBeforeStart,
  onNavigate,
  onEdit,
  big,
}) {
  if (isBeforeStart) {
    return (
      <div
        className={`rounded-2xl border border-[#1E2A33]/8 bg-[#1E2A33]/[0.025] p-3 flex flex-col gap-1 ${big ? "max-w-md" : ""}`}
      >
        <div className="font-mono text-sm font-bold text-[#1E2A33]/25">
          {date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
        </div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/20">
          Before course start
        </div>
      </div>
    )
  }

  const { total } = dayBreakdown(entry, slots)
  const metGoal = goal > 0 && total >= goal
  // Both week and day cards open the editor directly on click — there's no further
  // drill-down level below them, so the whole block doubles as the edit button.
  const handleClick = onEdit

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={`${btnBase} group text-left w-full rounded-2xl border bg-white p-3 hover:shadow-md flex flex-col gap-3 cursor-pointer ${
        isToday ? "border-2" : "border-[#1E2A33]/15 hover:border-[#1E2A33]/30"
      }`}
      style={isToday ? { borderColor: ACCENT } : undefined}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-sm font-bold">
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
          {entry?.exam && (
            <span
              className="flex items-center gap-1 text-[9px] uppercase tracking-wide font-mono text-white px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: EXAM_COLOR }}
            >
              <Award size={10} /> Exam
            </span>
          )}
          {entry?.lessons > 0 && (
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
          className="text-lg font-mono font-extrabold"
          style={metGoal ? { color: GOAL_MET_COLOR } : undefined}
        >
          {total > 0 ? fmtHours(total) : "—"}
        </span>
        {goal > 0 && (
          <span className="text-[10px] font-mono text-[#1E2A33]/35">
            goal {fmtHours(goal)}
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="text-[10px] font-mono text-[#1E2A33]/35">
          No study logged — tap to add
        </p>
      ) : (
        <EntriesReadout
          slots={slots}
          categories={categories}
          cells={entry?.cells || {}}
        />
      )}

      {entry?.comment && (
        <div className="flex items-start gap-1.5 pt-2 border-t border-[#1E2A33]/10">
          <MessageSquare size={11} className="text-[#1E2A33]/30 shrink-0 mt-0.5" />
          <p className="text-[10px] font-mono text-[#1E2A33]/60 whitespace-pre-wrap">{entry.comment}</p>
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
  showMonths,
}) {
  const weeks = useMemo(() => buildHeatmapWeeks(start, end), [start, end])
  const startDate = settings?.startDate ? fromKey(settings.startDate) : null

  const maxTotal = useMemo(() => {
    let max = 0
    weeks.forEach((w) =>
      w.forEach((d) => {
        if (!d) return
        const { total } = dayBreakdown(days[toKey(d)], slots)
        if (total > max) max = total
      }),
    )
    return max || 1
  }, [weeks, days, slots])

  const heatLevel = (total) => {
    if (total <= 0) return 0
    const r = total / maxTotal
    if (r < 0.25) return 1
    if (r < 0.5) return 2
    if (r < 0.75) return 3
    return 4
  }

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
                const level = heatLevel(total)
                const darkText = level < 3
                return (
                  <button
                    key={di}
                    onClick={() => onSelectDay(key)}
                    style={{
                      backgroundColor: HEAT_SCALE[level],
                      outline: isToday ? `2px solid ${ACCENT}` : "none",
                      outlineOffset: "1px",
                    }}
                    className={`${btnBase} group/tip relative w-10 h-10 rounded-lg hover:scale-105 flex flex-col items-center justify-center shrink-0`}
                  >
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 rounded-lg bg-[#1E2A33] text-[#F4F5F7] text-[10px] font-mono leading-snug px-2 py-1.5 opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-150 shadow-lg whitespace-pre-line max-w-[220px] text-left"
                    >
                      {`${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${buildTooltip(entry, slots, categories)}`}
                    </span>
                    <span
                      className={`text-[8px] font-mono leading-none ${darkText ? "text-[#1E2A33]/40" : "text-white/70"}`}
                    >
                      {date.getDate()}
                    </span>
                    {total > 0 && (
                      <span
                        className={`text-[9px] font-mono font-bold leading-none mt-0.5 ${darkText ? "text-[#1E2A33]/80" : "text-white"}`}
                      >
                        {fmtHours(total)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/40">
        <span>Less</span>
        {HEAT_SCALE.map((c) => (
          <span
            key={c}
            className="w-3 h-3 rounded-[3px]"
            style={{ backgroundColor: c }}
          />
        ))}
        <span>More</span>
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

function DayEditor({
  dateKey,
  dayEntry,
  slots,
  categories,
  onClose,
  onChange,
}) {
  const cells = dayEntry?.cells || {}
  const lessons = dayEntry?.lessons || 0
  const exam = dayEntry?.exam || false
  const dayComment = dayEntry?.comment || ""
  const onBackdropClick = useModalDismiss(onClose)

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
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={onBackdropClick}
    >
      <div
        style={{ backgroundColor: "#F4F5F7" }}
        className="w-full sm:max-w-[500px] sm:rounded-2xl shadow-xl border border-[#1E2A33]/10 max-h-[90vh] h-full sm:h-auto flex flex-col overflow-hidden"
      >
        <div
          style={{ backgroundColor: "#F4F5F7" }}
          className="flex items-center justify-between px-5 py-4 border-b border-[#1E2A33]/10 shrink-0"
        >
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
          <button
            onClick={onClose}
            className={`${btnBase} text-[#1E2A33]/50 hover:text-[#1E2A33]`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {slots.map((slot) => {
            const entries = cells[slot.id] || []
            const slotTotal = entries.reduce(
              (a, e) => a + (Number(e.minutes) || 0),
              0,
            )
            return (
              <div key={slot.id} className={CARD}>
                <div
                  className="flex items-center justify-between px-4 py-2.5 border-b border-[#1E2A33]/10"
                  style={{ borderLeft: `4px solid ${slot.color}` }}
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
                  <span className="font-mono text-xs text-[#1E2A33]/50">
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
                        className="border border-[#1E2A33]/10 rounded-xl p-2 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <select
                            value={entry.category}
                            onChange={(e) =>
                              updateEntry(slot.id, entry.id, {
                                category: e.target.value,
                              })
                            }
                            className="flex-1 border border-[#1E2A33]/20 rounded-xl px-2 py-1.5 text-xs font-mono bg-white w-full max-w-3/3"
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
                            className="w-20 border border-[#1E2A33]/20 rounded-xl px-2 py-1.5 text-xs font-mono"
                          />
                          <span className="text-[10px] font-mono text-[#1E2A33]/40">
                            min
                          </span>
                          <button
                            onClick={() => removeEntry(slot.id, entry.id)}
                            className={`${btnBase} p-1.5 text-[#1E2A33]/40 hover:text-[#C1595B]`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <MessageSquare
                            size={12}
                            className="text-[#1E2A33]/30 shrink-0 mt-1.5"
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
                            className="flex-1 border border-[#1E2A33]/15 rounded-xl px-2 py-1.5 text-[11px] font-mono bg-[#F4F5F7]/40"
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

          <div
            className={`${CARD} p-4 flex items-center justify-between gap-4 flex-wrap`}
          >
            <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide">
              Lessons completed today
              <input
                type="number"
                min={0}
                value={lessons}
                onChange={(e) => onChange({ lessons: Number(e.target.value) })}
                className="w-20 border border-[#1E2A33]/20 rounded-xl px-2 py-1.5"
              />
            </label>
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
          </div>

          <div className={`${CARD} p-4`}>
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
              className="w-full border border-[#1E2A33]/15 rounded-xl px-2 py-1.5 text-xs font-mono bg-[#F4F5F7]/40"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------
   Analytics View
--------------------------------------------------------------- */

const RANGE_PRESETS = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
]

function AnalyticsView({ data, preset, setPreset, customStart, setCustomStart, customEnd, setCustomEnd }) {
  const { slots, categories, days, settings } = data
  const [dailyMode, setDailyMode] = useState("slot") // 'slot' | 'category' | 'hours' | 'lessons'
  const [weekdayMode, setWeekdayMode] = useState("hours") // 'slot' | 'category' | 'hours' | 'lessons'
  const [weeklyMode, setWeeklyMode] = useState("effectiveness") // 'effectiveness' | 'slot' | 'category' | 'lessons'
  const [monthlyMode, setMonthlyMode] = useState("effectiveness") // 'effectiveness' | 'slot' | 'category' | 'lessons'

  const dailyToggle = useSeriesToggle()
  const pieToggle = useSeriesToggle()
  const effToggle = useSeriesToggle()
  const trendToggle = useSeriesToggle()
  const weekdayToggle = useSeriesToggle()
  const weeklyToggle = useSeriesToggle()
  const monthlyToggle = useSeriesToggle()

  const dayKeysSorted = useMemo(() => Object.keys(days).sort(), [days])

  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = new Date()
    if (preset === "custom")
      return { rangeStart: fromKey(customStart), rangeEnd: fromKey(customEnd) }
    if (preset === "all") {
      const first = dayKeysSorted[0]
        ? fromKey(dayKeysSorted[0])
        : settings.startDate
          ? fromKey(settings.startDate)
          : today
      return { rangeStart: first, rangeEnd: today }
    }
    return { rangeStart: addDays(today, -Number(preset) + 1), rangeEnd: today }
  }, [preset, customStart, customEnd, dayKeysSorted, settings.startDate])

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

  const overall = useMemo(() => {
    let totalMinutes = 0
    let lessonsDone = 0
    let examsDone = 0
    let activeDays = 0
    dayKeysSorted.forEach((k) => {
      const entry = days[k]
      const { total } = dayBreakdown(entry, slots)
      if (total > 0) activeDays += 1
      totalMinutes += total
      lessonsDone += Number(entry.lessons) || 0
      if (entry.exam) examsDone += 1
    })

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
    const daysSinceStart = Math.max(daysBetween(start, cutoff) + 1, 1)
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
    }
  }, [dayKeysSorted, days, settings, slots])

  // Best/worst day, week, and month — all-time, based on hours studied.
  // Only counts periods with at least some study logged (an untouched day
  // isn't a "worst day", it's just an empty day, already tracked above).
  const remarkable = useMemo(() => {
    const dayVals = dayKeysSorted
      .map((k) => ({ key: k, hours: dayBreakdown(days[k], slots).total / 60 }))
      .filter((d) => d.hours > 0)

    const weekMap = new Map()
    const monthMap = new Map()
    dayKeysSorted.forEach((k) => {
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
  }, [dayKeysSorted, days, slots])

  const dailyTotals = useMemo(
    () =>
      rangedKeys.map((k) => {
        const entry = days[k]
        const { bySlot, byCategory, total } = dayBreakdown(entry, slots)
        const row = {
          date: fmtShort(k),
          total: toHours(total),
          lessons: Number(entry.lessons) || 0,
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
    [rangedKeys, days, slots, categories, dailyMode],
  )
  const dailySeries =
    dailyMode === "slot" ? slots : dailyMode === "category" ? categories : []

  // Days needed per exam — all-time (not range-filtered), since exam milestones
  // are a whole-course concept rather than something bound to the analytics range.
  const examsGapData = useMemo(() => {
    const courseStart = settings.startDate
      ? fromKey(settings.startDate)
      : dayKeysSorted[0]
        ? fromKey(dayKeysSorted[0])
        : null
    if (!courseStart) return []
    let prevDayNum = 0
    return dayKeysSorted
      .filter((k) => days[k]?.exam)
      .map((k, i) => {
        const dayNum = daysBetween(courseStart, fromKey(k)) + 1
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
        let lessons = 0
        keys.forEach((k) => {
          const { total } = dayBreakdown(days[k], slots)
          minutes += total
          lessons += Number(days[k].lessons) || 0
        })
        const hours = minutes / 60
        row.lessonsPerHour =
          hours > 0 ? Number((lessons / hours).toFixed(2)) : 0
      }
      return row
    })
  }, [weeklyBuckets, days, slots, categories, weeklyMode])

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
        let lessons = 0
        keys.forEach((k) => {
          const { total } = dayBreakdown(days[k], slots)
          minutes += total
          lessons += Number(days[k].lessons) || 0
        })
        const hours = minutes / 60
        row.lessonsPerHour =
          hours > 0 ? Number((lessons / hours).toFixed(2)) : 0
      }
      return row
    })
  }, [monthlyBuckets, days, slots, categories, monthlyMode])

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
      }
      return row
    })
  }, [rangedKeys, weeklyBuckets, days, slots, categories, weekdayMode])

  return (
    <div className="space-y-8">
      <RangePicker
        preset={preset}
        setPreset={setPreset}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
      />

      <OverviewStats overall={overall} />

      <AveragesStats overall={overall} />

      <RemarkableStats remarkable={remarkable} />

      <PrognosisCard overall={overall} />

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
              { id: "lessons", label: "Lessons" },
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
              allowDecimals={dailyMode !== "lessons"}
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
              <Area
                type="monotone"
                dataKey="total"
                stroke={ACCENT}
                fill={ACCENT}
                fillOpacity={0.25}
                strokeWidth={2}
                name="Hours studied"
                dot={{ r: 3 }}
              />
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
        title="Weekly effectiveness"
        subtitle={
          weeklyMode === "effectiveness"
            ? "Overall lessons/hour, aggregated per week"
            : weeklyMode === "lessons"
              ? "Lessons completed per week"
              : `Hours per week, split by ${weeklyMode}`
        }
        action={
          <SegmentedControl
            items={[
              { id: "effectiveness", label: "Effectiveness" },
              { id: "slot", label: "Slots" },
              { id: "category", label: "Categories" },
              { id: "lessons", label: "Lessons" },
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
                weeklyMode === "slot" || weeklyMode === "category"
                  ? fmtAxisHours
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
              formatter={(value, name) =>
                weeklyMode === "slot" || weeklyMode === "category"
                  ? [fmtHoursChart(value), name]
                  : weeklyMode === "lessons"
                    ? [`${value}`, name]
                    : [`${value} l/h`, name]
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
              <Area
                type="monotone"
                dataKey={
                  weeklyMode === "lessons" ? "lessons" : "lessonsPerHour"
                }
                stroke={weeklyMode === "lessons" ? GOAL_MET_COLOR : ACCENT}
                fill={weeklyMode === "lessons" ? GOAL_MET_COLOR : ACCENT}
                fillOpacity={0.15}
                strokeWidth={2}
                name={weeklyMode === "lessons" ? "Lessons" : "Lessons / hour"}
                dot={{ r: 3 }}
              />
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

      <ChartCard
        title="Monthly effectiveness"
        subtitle={
          monthlyMode === "effectiveness"
            ? "Overall lessons/hour, aggregated per month"
            : monthlyMode === "lessons"
              ? "Lessons completed per month"
              : `Hours per month, split by ${monthlyMode}`
        }
        action={
          <SegmentedControl
            items={[
              { id: "effectiveness", label: "Effectiveness" },
              { id: "slot", label: "Slots" },
              { id: "category", label: "Categories" },
              { id: "lessons", label: "Lessons" },
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
                monthlyMode === "slot" || monthlyMode === "category"
                  ? fmtAxisHours
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
              formatter={(value, name) =>
                monthlyMode === "slot" || monthlyMode === "category"
                  ? [fmtHoursChart(value), name]
                  : monthlyMode === "lessons"
                    ? [`${value}`, name]
                    : [`${value} l/h`, name]
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
              <Area
                type="monotone"
                dataKey={
                  monthlyMode === "lessons" ? "lessons" : "lessonsPerHour"
                }
                stroke={monthlyMode === "lessons" ? GOAL_MET_COLOR : ACCENT}
                fill={monthlyMode === "lessons" ? GOAL_MET_COLOR : ACCENT}
                fillOpacity={0.15}
                strokeWidth={2}
                name={monthlyMode === "lessons" ? "Lessons" : "Lessons / hour"}
                dot={{ r: 3 }}
              />
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
              { id: "lessons", label: "Lessons" },
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
          </AreaChart>
        </ResponsiveContainer>
        <ToggleChips
          items={weekdaySeries}
          hidden={weekdayToggle.hidden}
          onToggle={weekdayToggle.toggle}
        />
      </ChartCard>

      <ChartCard
        title="Days per exam"
        subtitle="Calendar days needed to reach each exam, all-time"
      >
        {examsGapData.length === 0 ? (
          <p className="text-xs font-mono text-[#1E2A33]/40 py-10 text-center">
            No exams passed yet — this fills in as you mark exam days in the
            log.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={examsGapData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3315" />
              <XAxis
                dataKey="exam"
                tick={{ fontSize: 10, fontFamily: "monospace" }}
              />
              <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} />
              <Tooltip
                contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
                formatter={(value, _name, props) => [
                  `${value} days`,
                  `Passed ${props.payload.date}`,
                ]}
              />
              {overall.avgDaysPerExam != null && (
                <ReferenceLine
                  y={overall.avgDaysPerExam}
                  stroke={ACCENT}
                  strokeDasharray="4 4"
                  label={{
                    value: `avg ${overall.avgDaysPerExam.toFixed(0)}d`,
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

      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard
          title="Time by slot type"
          subtitle="Share of total hours in this range — click a chip to toggle it out"
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={visiblePieData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {visiblePieData.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
                formatter={(value, name) => [fmtHoursChart(value), name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <ToggleChips
            items={slotTotals}
            hidden={pieToggle.hidden}
            onToggle={pieToggle.toggle}
          />
        </ChartCard>

        <ChartCard
          title="Effectiveness by slot"
          subtitle="Estimated lessons completed per hour"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={visibleEffData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3315" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fontFamily: "monospace" }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} />
              <Tooltip
                contentStyle={{ fontSize: 12, fontFamily: "monospace" }}
              />
              <Bar dataKey="lessonsPerHour" name="Lessons / hour">
                {visibleEffData.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ToggleChips
            items={effectivenessBySlot.map((s) => ({
              id: s.slotId,
              label: s.name,
              color: s.color,
            }))}
            hidden={effToggle.hidden}
            onToggle={effToggle.toggle}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Effectiveness trend by slot"
        subtitle="Weekly lessons/hour for each study slot over time"
      >
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={effectivenessTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3315" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fontFamily: "monospace" }}
            />
            <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} />
            <Tooltip contentStyle={{ fontSize: 12, fontFamily: "monospace" }} />
            {slots
              .filter((s) => !trendToggle.hidden.has(s.id))
              .map((s) => (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.id}
                  stroke={s.color}
                  strokeWidth={2}
                  name={s.label}
                  connectNulls
                  dot={{ r: 2 }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
        <ToggleChips
          items={slots}
          hidden={trendToggle.hidden}
          onToggle={trendToggle.toggle}
        />
      </ChartCard>
    </div>
  )
}

function RangePicker({
  preset,
  setPreset,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        items={RANGE_PRESETS}
        activeId={preset}
        onChange={setPreset}
      />
      {preset === "custom" && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="border border-[#1E2A33]/20 rounded-xl px-2 py-1.5 text-xs font-mono bg-white"
          />
          <span className="text-xs font-mono text-[#1E2A33]/40">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="border border-[#1E2A33]/20 rounded-xl px-2 py-1.5 text-xs font-mono bg-white"
          />
        </div>
      )}
    </div>
  )
}

function OverviewStats({ overall }) {
  const hours = (overall.totalMinutes / 60).toFixed(1)
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

  const stats = [
    { label: "Hours studied", value: hours, icon: Clock },
    {
      label: "Days since start",
      value: overall.daysSinceStart,
      icon: CalendarDays,
    },
    { label: "Empty days", value: overall.emptyDays, icon: AlertCircle },
    {
      label: "Lessons done",
      value: `${overall.lessonsDone}/${overall.totalLessons}`,
      sub: `${lessonPct}%`,
      icon: TrendingUp,
    },
    {
      label: "Exams passed",
      value: `${overall.examsDone}/${overall.totalExams}`,
      sub: `${examPct}%`,
      icon: Award,
    },
  ]

  return (
    <div>
      <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm mb-1 text-[#1E2A33]">
        Stats
      </h3>
      <p className="text-[11px] font-mono text-[#1E2A33]/40 mb-3 uppercase tracking-widest">
        Overview, all-time
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`${CARD} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-[9px] font-mono uppercase tracking-widest ${"text-[#1E2A33]/50"}`}
                >
                  {s.label}
                </span>
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full ${"bg-[#1E2A33]/5"}`}
                >
                  <Icon size={12} className={"text-[#1E2A33]/40"} />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-bold">{s.value}</span>
                {s.sub && (
                  <span
                    className={`text-[10px] font-mono ${"text-[#1E2A33]/40"}`}
                  >
                    {s.sub}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AveragesStats({ overall }) {
  const items = [
    {
      label: "Avg hours / day",
      value:
        overall.avgHoursPerDay != null
          ? `${overall.avgHoursPerDay.toFixed(1)}h`
          : "—",
      icon: Clock,
    },
    {
      label: "Avg hours / lesson",
      value:
        overall.avgHoursPerLesson != null
          ? `${overall.avgHoursPerLesson.toFixed(2)}h`
          : "—",
      icon: BookOpen,
    },
    {
      label: "Avg lessons / day",
      value:
        overall.avgLessonsPerDay != null
          ? overall.avgLessonsPerDay.toFixed(2)
          : "—",
      icon: TrendingUp,
    },
    {
      label: "Avg days / exam",
      value:
        overall.avgDaysPerExam != null
          ? Math.round(overall.avgDaysPerExam)
          : "—",
      icon: Award,
    },
  ]

  return (
    <div>
      <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm mb-1 text-[#1E2A33]">
        Averages
      </h3>
      <p className="text-[11px] font-mono text-[#1E2A33]/40 mb-3 uppercase tracking-widest">
        All-time pace
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((it) => {
          const Icon = it.icon
          return (
            <div key={it.label} className={`${CARD} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/50">
                  {it.label}
                </span>
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1E2A33]/5">
                  <Icon size={12} className="text-[#1E2A33]/40" />
                </span>
              </div>
              <span className="font-mono text-xl font-bold">{it.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PrognosisCard({ overall }) {
  const hasEnough =
    overall.avgMinutesPerLesson && overall.avgLessonsPerActiveDay

  const items = hasEnough
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

  return (
    <div>
      <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm mb-1 text-[#1E2A33]">
        Forecast
      </h3>
      <p className="text-[11px] font-mono text-[#1E2A33]/40 mb-3 uppercase tracking-widest">
        Based on pace so far, all-time
      </p>

      {!hasEnough ? (
        <div className={`${CARD} p-4 text-sm font-mono text-[#1E2A33]/60`}>
          Log a few more study days with lessons completed to unlock a forecast.
        </div>
      ) : overall.lessonsRemaining === 0 ? (
        <div className={`${CARD} p-4 text-sm font-mono text-[#1E2A33]`}>
          Course complete — all {overall.totalLessons} lessons logged. 🎉
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((it) => {
            const Icon = it.icon
            return (
              <div key={it.label} className={`${CARD} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#1E2A33]/50">
                    {it.label}
                  </span>
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1E2A33]/5">
                    <Icon size={12} className="text-[#1E2A33]/40" />
                  </span>
                </div>
                <span className="font-mono text-xl font-bold">{it.value}</span>
              </div>
            )
          })}
        </div>
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
        Best &amp; worst, all-time, in hours
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