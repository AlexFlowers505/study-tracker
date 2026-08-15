import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"
import type {
  AppData,
  Day,
  StudyEntry,
  Category,
  CounterUnit,
  DayKey,
  PeriodId,
  Project,
  Settings,
  Slot,
} from "./types/model"
import type { WriteOp } from "./data/ops"
import "./App.css"
import {
  AlertCircle,
} from "lucide-react"
import {
  pad,
  toKey,
  fromKey,
  addDays,
  fmtDateLong,
} from "./lib/date"
import {
  ACCENT,
  EXAM_COLOR,
  FREEZE_COLOR,
  CARD,
  btnBase,
} from "./lib/theme"
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  SAVE_DEBOUNCE_MS,
  SAVE_RETRY_MS,
  makeProject,
  normalizeData,
  buildInitialData,
} from "./lib/defaults"
import { makeId } from "./lib/id"
import { CHANGE_LOG_LIMIT, diffDay } from "./lib/changelog"
import { canFreeze, freezeLedger } from "./lib/freezes"
import { computeStreaks } from "./lib/streaks"
import { addSlotCount, counterTotals } from "./lib/counters"
import {
  periodRange,
} from "./lib/period"
import { useCloudAuth } from "./data/auth"
import { loadFromTables } from "./data/load"
import { importIntoTables } from "./data/importData"
import { fetchIsAdmin } from "./data/admin"
import {
  applyWriteOp,
  opDay,
  opVerdict,
  opDeleteProject,
  opLog,
  opNote,
  opPrefs,
  opProject,
} from "./data/ops"
import { CountFilter } from "./views/CountFilter"
import { StreaksSection } from "./views/StreaksSection"
import { ChangeLogSection } from "./views/ChangeLogSection"
import { SleepSection } from "./views/SleepSection"
import { PeriodBar } from "./views/PeriodBar"
import { LogView } from "./views/LogView"
import { SetupModal } from "./views/SetupModal"
import { TopBar } from "./views/TopBar"
import { AuthScreen, SetPasswordScreen } from "./views/AuthScreen"
import { EnvBadge } from "./views/EnvBadge"
import { AnalyticsView } from "./views/AnalyticsView"
import { QuickAddCounterModal } from "./views/QuickAddCounterModal"
import { QuickAddEntryModal } from "./views/QuickAddEntryModal"
import { DayQuickviewModal } from "./views/DayEditor"

const DEFAULT_DATA = buildInitialData()

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
    recovery,
    endRecovery,
  } = useCloudAuth()

  const [data, setData] = useState(DEFAULT_DATA) // { activeProjectId, projects: [...] }
  const [loaded, setLoaded] = useState(false)
  // One period drives the whole page: the log grid at the top and the
  // analytics below it always describe the same stretch of days.
  const [period, setPeriod] = useState<PeriodId>("week")
  const [logCursor, setLogCursor] = useState(new Date())
  const [customStart, setCustomStart] = useState(
    toKey(addDays(new Date(), -30)),
  )
  const [customEnd, setCustomEnd] = useState(toKey(new Date()))
  const [editingKey, setEditingKey] = useState<DayKey | null>(null)
  // One dialog, two things it can add. Held as a pair rather than two pieces
  // of state so the two can never both be open.
  const [quickAdd, setQuickAdd] = useState<{
    key: DayKey
    variant: "study" | "sleep"
  } | null>(null)
  const [counterAddKey, setCounterAddKey] = useState<DayKey | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  // Set when the initial read threw. While true the app is read-only: it holds
  // placeholder state that must never be written back over the real row.
  const [loadFailed, setLoadFailed] = useState(false)
  // Set when a write fails. Surfaced as a banner — silence here is what let a
  // day and a half of edits disappear into the console.
  const [saveFailed, setSaveFailed] = useState(false)
  // Drives which buttons Setup draws, nothing more. RLS is what keeps a
  // logbook private; see migrations/006_admins.sql.
  const [isAdmin, setIsAdmin] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [showSleep, setShowSleep] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [showStreaks, setShowStreaks] = useState(false)
  // Which slots/categories are left out of the figures. Deliberately not tied
  // to the period and not saved: it's a way of looking at the data, not part
  // of it.
  const [hiddenSlots, setHiddenSlots] = useState<Set<string>>(() => new Set())
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    () => new Set(),
  )

  const toggleIn =
    (setter: Dispatch<SetStateAction<Set<string>>>) => (id: string) =>
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const canUseCloud = cloudEnabled && cloudClient && session

  // What the load actually depends on: *which* account, not which Session
  // object. `canUseCloud` evaluates to the session itself, and GoTrue hands
  // out a fresh one on every auth event — initial, signed-in, each token
  // refresh, once per client — so using it as a dependency re-read all four
  // tables twelve times on a single page load. Keyed on the user id it runs
  // once, and a token refresh no longer costs a full re-read.
  const accountKey = session?.user.id ?? null
  const clientReady = !!cloudClient

  useEffect(() => {
    if (!authReady) return
    if (cloudEnabled && !session) {
      // Signed out with cloud on: there is nothing to fetch, so the load is
      // already finished. Genuinely an effect-driven transition — nothing to
      // derive it from — hence the exemption.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoaded(true)
      // Whoever signs in next has to earn it again.
      setIsAdmin(false)
      return
    }
    ;(async () => {
      try {
        if (canUseCloud) {
          const assembled = await loadFromTables(cloudClient)
          if (assembled) setData(assembled)
          else setShowSetup(true)
          // Never throws — a failed check reads as "not an admin" — so it
          // can't drag the logbook onto the dead-end screen with it.
          setIsAdmin(await fetchIsAdmin(cloudClient, session.user.id))
        } else {
          const res = await window.storage.get(STORAGE_KEY, false)
          const parsed = res && res.value ? JSON.parse(res.value) : null
          const normalized = normalizeData(parsed)
          if (normalized) setData(normalized)
          else setShowSetup(true)
        }
      } catch (e) {
        // A failed read is NOT an empty account. Treating it as one is how a
        // real project got replaced by a blank default: the setup modal opened
        // over DEFAULT_DATA, its auto-save fired, and persist() upserted the
        // blank blob over the row that hadn't loaded. Freeze writes instead
        // and say so — the remote copy is the only copy.
        console.error("Failed to load saved data", e)
        setLoadFailed(true)
      }
      setLoaded(true)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, cloudEnabled, clientReady, accountKey])

  // Saves are coalesced: React state updates on every edit so the UI stays
  // responsive, but the rows only go out once edits stop. pendingRef is a map
  // of op-key -> op, so repeated edits to one day queue a single write.
  const pendingRef = useRef(new Map<string, WriteOp>())
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const writeNowRef = useRef<(() => void) | null>(null)
  // Always the newest state, read at flush time so a queued op writes what the
  // day looks like now rather than when it was queued.
  const dataRef = useRef(DEFAULT_DATA)

  const writeNow = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const ops = [...pendingRef.current.values()]
    if (!ops.length) return
    pendingRef.current = new Map()
    // Ops name what changed, not what it changed to, so they always write the
    // latest state — several edits to the same day collapse into one write.
    const snapshot = dataRef.current
    try {
      if (canUseCloud) {
        for (const op of ops) {
          await applyWriteOp(cloudClient!, session!.user.id, op, snapshot)
        }
      } else {
        await window.storage.set(STORAGE_KEY, JSON.stringify(snapshot), false)
      }
      setSaveFailed(false)
    } catch (e) {
      console.error("Failed to save", e)
      // Put the whole batch back. Every op is an idempotent upsert derived
      // from current state, so replaying one that already landed is harmless,
      // and anything newer keeps its place by op key.
      ops.forEach((op) => {
        if (!pendingRef.current.has(op.key)) pendingRef.current.set(op.key, op)
      })
      setSaveFailed(true)
      // Keep trying on our own: most causes (expired token, a blip at the
      // provider) clear by themselves, and the user shouldn't have to notice.
      // Called through a ref so this callback doesn't reference itself while
      // it's still being defined.
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null
        writeNowRef.current?.()
      }, SAVE_RETRY_MS)
    }
  }, [canUseCloud, cloudClient, session])

  useEffect(() => {
    writeNowRef.current = writeNow
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [writeNow])

  // Mirrors state into a ref so a queued op can read the newest version at
  // flush time rather than the one captured when it was queued.
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // `ops` says which rows the change touched — one op, or several for things
  // like adding a project (its own row plus the active-project preference).
  const persist = useCallback(
    (next: AppData, ops: WriteOp | (WriteOp | null)[] | null) => {
      setData(next)
      // Never write while the load is broken: the state here is placeholder
      // data, and writing it would destroy rows we failed to read.
      if (loadFailed) {
        console.warn("Save skipped — saved data could not be loaded")
        return
      }
      const list = Array.isArray(ops) ? ops : [ops]
      list.forEach((op) => {
        if (op) pendingRef.current.set(op.key, op)
      })
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(writeNow, SAVE_DEBOUNCE_MS)
    },
    [writeNow, loadFailed],
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

  // Merges a patch into the active project and says which row it dirtied.
  const patchProject = useCallback(
    (patch: Partial<Project>, ops: WriteOp | WriteOp[]) => {
      persist(
        {
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
        },
        ops,
      )
    },
    [data, project, persist],
  )

  // Settings, slots and categories all live on the project row.
  const updateProject = useCallback(
    (patch: Partial<Project>) => patchProject(patch, opProject(project.id)),
    [patchProject, project],
  )
  const updateSettings = (patch: Settings) =>
    updateProject({ settings: patch })
  const updateSlots = (slots: Slot[]) => updateProject({ slots })
  const updateCategories = (categories: Category[]) =>
    updateProject({ categories })

  const updateCounterUnits = (counterUnits: CounterUnit[]) =>
    updateProject({ counterUnits })

  // Project-wide, unfiltered and ignoring "ignore": this is progress against
  // a unit's total, not a figure about the selected period.
  const counterProgress = useMemo(
    () => counterTotals(project.days),
    [project.days],
  )

  // A day edit now writes one row instead of the whole history.
  const updateDay = (key: DayKey, patch: Partial<Day>) => {
    const existing = project.days[key] || {
      cells: {},
      lessons: 0,
      exam: false,
      ignore: false,
    }
    const next = { ...existing, ...patch }
    // Recorded before the write so the log holds the old value, which is the
    // only reason to keep a log at all.
    const details = diffDay(
      existing,
      next,
      project.slots,
      project.categories,
      project.counterUnits || [],
    )
    const ops = [opDay(project.id, key)]
    let changeLog = project.changeLog || []
    if (details.length) {
      const logEntry = {
        id: makeId("log"),
        at: new Date().toISOString(),
        title: `${fmtDateLong(key)} · ${details.length} change${details.length > 1 ? "s" : ""}`,
        details,
      }
      const merged = [logEntry, ...changeLog]
      const dropIds = merged.slice(CHANGE_LOG_LIMIT).map((l) => l.id)
      changeLog = merged.slice(0, CHANGE_LOG_LIMIT)
      ops.push(opLog(project.id, logEntry, dropIds))
    }
    patchProject({ days: { ...project.days, [key]: next }, changeLog }, ops)
  }

  /* ---- Streak freezes -------------------------------------------------
     The ledger is read from the project, never recomputed into it:
     `pending` is the list of finished weeks still missing a verdict, and
     sealing one is a write that happens exactly once. See lib/freezes. */
  const ledger = useMemo(() => freezeLedger(project), [project])

  // For the number on the streaks toggle. Computed from `project`, never from
  // `visibleProject`: the count filter changes what the page shows, never what
  // a streak is worth.
  const streaks = useMemo(() => computeStreaks(project), [project])

  // Seal whatever is due. Runs after a load and after any edit that finishes
  // a week; the op is an ignore-on-conflict upsert, so a replay is harmless.
  useEffect(() => {
    if (!loaded || loadFailed || !ledger.pending.length) return
    const verdicts = { ...(project.weekVerdicts || {}) }
    ledger.pending.forEach((v) => (verdicts[v.weekKey] = v))
    // Not derivable, and that is the point: a verdict is a fact recorded once
    // at a moment in time. Deriving it would recompute it from today's data,
    // which is exactly the loophole the ledger exists to close.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    patchProject(
      { weekVerdicts: verdicts },
      ledger.pending.map((v) => opVerdict(project.id, v.weekKey)),
    )
  }, [loaded, loadFailed, ledger, project, patchProject])

  // Accounting starts the first time the meter is on and the project is open,
  // so switching the feature on never pays out the whole history at once.
  useEffect(() => {
    if (!loaded || loadFailed) return
    if (project.settings.goalsEnabled === false) return
    if (project.settings.freezeStart) return
    // Same reasoning: the date accounting began is a recorded fact, not a
    // function of the current state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateSettings({ ...project.settings, freezeStart: toKey(new Date()) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, loadFailed, project.settings.goalsEnabled])

  const canFreezeDay = (key: DayKey) =>
    canFreeze(
      fromKey(key),
      project.days[key],
      project.settings,
      project.slots,
      new Date(),
      ledger.balance,
    )

  // Spending is permanent: no refund if the day is later logged up to green,
  // and settings never rewrite it. Hence the confirmation.
  const [freezeCandidate, setFreezeCandidate] = useState<DayKey | null>(null)
  const spendFreeze = (key: DayKey) => {
    updateDay(key, { frozen: true })
    setFreezeCandidate(null)
  }

  // The note and its ignore flag share a row, so both edits target the same op.
  const updateWeekNote = (weekKey: DayKey, text: string) =>
    patchProject(
      { weekNotes: { ...(project.weekNotes || {}), [weekKey]: text } },
      opNote(project.id, "week", weekKey),
    )
  const updateMonthNote = (monthKey: string, text: string) =>
    patchProject(
      { monthNotes: { ...(project.monthNotes || {}), [monthKey]: text } },
      opNote(project.id, "month", monthKey),
    )
  const updateWeekIgnore = (weekKey: DayKey, ignore: boolean) =>
    patchProject(
      { weekIgnore: { ...(project.weekIgnore || {}), [weekKey]: ignore } },
      opNote(project.id, "week", weekKey),
    )
  const updateMonthIgnore = (monthKey: string, ignore: boolean) =>
    patchProject(
      { monthIgnore: { ...(project.monthIgnore || {}), [monthKey]: ignore } },
      opNote(project.id, "month", monthKey),
    )

  const switchProject = (id: string) =>
    persist({ ...data, activeProjectId: id }, opPrefs())

  const addProject = () => {
    const p = makeProject({
      settings: {
        ...DEFAULT_SETTINGS,
        projectName: `New project ${data.projects.length + 1}`,
        startDate: toKey(new Date()),
      },
    })
    persist(
      { ...data, projects: [...data.projects, p], activeProjectId: p.id },
      [opProject(p.id), opPrefs()],
    )
  }

  const deleteProject = (id: string) => {
    if (data.projects.length <= 1) return
    const remaining = data.projects.filter((p) => p.id !== id)
    persist(
      {
        ...data,
        projects: remaining,
        activeProjectId:
          data.activeProjectId === id ? remaining[0].id : data.activeProjectId,
      },
      [opDeleteProject(id), opPrefs()],
    )
  }

  const goToDay = (key: DayKey) => {
    setLogCursor(fromKey(key))
    setPeriod("day")
  }

  // The stored copy is the only copy, so give people a way to hold one of
  // their own. Exports the whole blob — every project, not just the open one.
  const exportData = () => {
    const stamp = `${toKey(new Date())}-${pad(new Date().getHours())}${pad(new Date().getMinutes())}`
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `study-tracker-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // The other direction. It writes straight to the tables rather than through
  // persist(): the queue is one request per row, which is right for editing
  // and wrong for a whole logbook at once.
  const importData = async (next: AppData) => {
    if (!canUseCloud) throw new Error("Sign in first — there's nowhere to write")
    if (loadFailed)
      throw new Error("Not while the load is broken — reload and try again")
    // Anything already queued was computed against the data being replaced, so
    // let it land first rather than letting it fire over the import.
    await writeNow()
    await importIntoTables(cloudClient!, session!.user.id, next)
    // Reload rather than swapping state in place: every open panel, cursor and
    // filter was chosen against the old document, and the honest way to show
    // the new one is the same path a fresh visit takes.
    window.location.reload()
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

  // Everything that displays or counts gets this filtered copy; every mutation
  // keeps using `project`, so hiding a slot never edits away its entries.
  //
  // Filtering the data once here rather than threading a predicate through
  // dayBreakdown's two dozen call sites means the header total, the donuts,
  // the day cards, the heatmap and every chart can't disagree about what
  // counts — they are all reading the same already-filtered days.
  const visibleProject = useMemo(() => {
    if (!hiddenSlots.size && !hiddenCategories.size) return project
    const slots = project.slots.filter((s) => !hiddenSlots.has(s.id))
    const days: Record<DayKey, Day> = {}
    Object.entries(project.days).forEach(([key, day]) => {
      const cells: Record<string, StudyEntry[]> = {}
      slots.forEach((s) => {
        const arr = day.cells?.[s.id]
        if (!arr) return
        cells[s.id] = hiddenCategories.size
          ? arr.filter((e) => !hiddenCategories.has(e.category ?? ""))
          : arr
      })
      days[key] = { ...day, cells }
    })
    return {
      ...project,
      slots,
      categories: project.categories.filter((c) => !hiddenCategories.has(c.id)),
      days,
    }
  }, [project, hiddenSlots, hiddenCategories])

  // No env vars, no database. A dead end rather than the signed-out local
  // fallback, because that path calls `window.storage` — an API browsers do
  // not have — so "degrading gracefully" here means a logbook that silently
  // keeps nothing. Better to say which file is empty.
  if (!cloudEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] text-[#1E2A33] p-6">
        <div className={`${CARD} max-w-md text-center`}>
          <h1 className="font-sans font-extrabold uppercase tracking-tight text-base mb-2">
            No database configured
          </h1>
          <p className="text-xs font-mono text-[#1E2A33]/60 leading-relaxed">
            {import.meta.env.DEV ? (
              <>
                Fill <span className="text-[#1E2A33]">VITE_SUPABASE_URL</span>{" "}
                and{" "}
                <span className="text-[#1E2A33]">VITE_SUPABASE_ANON_KEY</span>{" "}
                in <span className="text-[#1E2A33]">.env.development.local</span>{" "}
                with your dev project, then restart the dev server — Vite reads
                env files once, at boot. See{" "}
                <span className="text-[#1E2A33]">.env.example</span> for how to
                set that project up.
              </>
            ) : (
              <>
                This build went out without{" "}
                <span className="text-[#1E2A33]">.env.production</span>. Nothing
                is lost — the data is untouched on the server, this copy just
                has no address for it.
              </>
            )}
          </p>
        </div>
      </div>
    )
  }

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] text-[#1E2A33] font-mono text-sm">
        Loading logbook…
      </div>
    )
  }

  // Ahead of the session check, and that ordering is the whole point: a reset
  // link arrives *with* a session, so anywhere later and the logbook would
  // open over the top of the form the person came here to fill in.
  if (recovery) {
    return (
      <>
        <SetPasswordScreen client={cloudClient} onDone={endRecovery} />
        <EnvBadge />
      </>
    )
  }

  if (!session) {
    // The badge belongs here most of all: signing in is the moment you pick an
    // account, and the dev project has its own.
    return (
      <>
        <AuthScreen client={cloudClient} error={loadError} />
        <EnvBadge />
      </>
    )
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] text-[#1E2A33] font-mono text-sm">
        Loading logbook…
      </div>
    )
  }

  // Deliberately a dead end rather than a degraded app. Rendering the
  // placeholder data would show a blank logbook that looks like real (empty)
  // state, and every control on it would be one debounce away from writing
  // that blank over the saved copy.
  if (loadFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] text-[#1E2A33] p-6">
        <div className={`${CARD} max-w-md text-center`}>
          <h1 className="font-sans font-extrabold uppercase tracking-tight text-base mb-2">
            Couldn't load your logbook
          </h1>
          <p className="text-xs font-mono text-[#1E2A33]/60 leading-relaxed mb-4">
            The server answered, but your saved data didn't come back. Nothing
            has been changed — saving is switched off until it loads, so the
            stored copy stays exactly as it is.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ backgroundColor: ACCENT }}
            className={`${btnBase} text-white text-xs font-mono uppercase tracking-widest px-4 py-2.5 rounded-xl hover:opacity-90`}
          >
            Try again
          </button>
        </div>
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
          showFilter={showFilter}
          onToggleFilter={() => setShowFilter((v) => !v)}
          filteredOutCount={hiddenSlots.size + hiddenCategories.size}
          sleepEnabled={project.settings.sleepEnabled === true}
          showSleep={showSleep}
          onToggleSleep={() => setShowSleep((v) => !v)}
          showLog={showLog}
          onToggleLog={() => setShowLog((v) => !v)}
          showStreaks={showStreaks}
          onToggleStreaks={() => setShowStreaks((v) => !v)}
          currentStreak={streaks?.currentDays ?? null}
        />

        {/* Above the overall stats deliberately: the filter feeds them too, so
            it has to read as the thing governing what's below it. */}
        {showFilter && (
          <CountFilter
            slots={project.slots}
            categories={project.categories}
            hiddenSlots={hiddenSlots}
            hiddenCategories={hiddenCategories}
            onToggleSlot={toggleIn(setHiddenSlots)}
            onToggleCategory={toggleIn(setHiddenCategories)}
            onReset={() => {
              setHiddenSlots(new Set())
              setHiddenCategories(new Set())
            }}
            onClose={() => setShowFilter(false)}
          />
        )}

        {/* Sits between the period bar and the period's own figures, full
            width and scrolling with the page — on every screen size. It used
            to be a fixed bottom sheet on phones, which covered the log it was
            meant to be compared against. */}
        {showStreaks && (
          <StreaksSection
            project={visibleProject}
            onClose={() => setShowStreaks(false)}
          />
        )}

        {showLog && (
          <ChangeLogSection
            entries={project.changeLog || []}
            onClose={() => setShowLog(false)}
          />
        )}

        <LogView
          data={visibleProject}
          period={period}
          range={range}
          cursor={logCursor}
          onEditDay={setEditingKey}
          onUpdateDayNote={(key, text) => updateDay(key, { comment: text })}
          onUpdateWeekNote={updateWeekNote}
          onUpdateMonthNote={updateMonthNote}
          onUpdateWeekIgnore={updateWeekIgnore}
          onUpdateMonthIgnore={updateMonthIgnore}
          onQuickAddDay={(key) => setQuickAdd({ key, variant: "study" })}
          onQuickAddSleepDay={
            project.settings.sleepEnabled === true
              ? (key) => setQuickAdd({ key, variant: "sleep" })
              : undefined
          }
          // Absent with no units defined: there would be nothing to pick.
          onQuickAddCounterDay={
            (project.counterUnits || []).length
              ? setCounterAddKey
              : undefined
          }
          canFreezeDay={canFreezeDay}
          onFreezeDay={setFreezeCandidate}
          // Entries are edited in the card itself. The day dialog is still
          // there for the day-level things — lessons, exam, ignore, the note.
          onUpdateDay={updateDay}
          // Rendered inside the period section rather than above it: sleep is
          // period-scoped, so it belongs under the heading that says everything
          // below describes the chosen range.
          sleepSection={
            showSleep && project.settings.sleepEnabled === true ? (
              <SleepSection
                days={project.days}
                range={range}
                weekIgnore={project.weekIgnore}
                monthIgnore={project.monthIgnore}
                onClose={() => setShowSleep(false)}
              />
            ) : null
          }
        />

        <div className="mt-10">
          <AnalyticsView
            data={visibleProject}
            rangeStart={range.start}
            rangeEnd={range.end}
          />
        </div>
      </main>

      {/* Unmissable on purpose. The whole point of this app is that what you
          typed is still there tomorrow, so a write that isn't landing has to
          interrupt — retrying quietly in the background is not enough. */}
      {saveFailed && (
        <div
          className="fixed inset-x-0 top-0 z-50 px-4 py-2.5 text-white shadow-lg"
          style={{ backgroundColor: EXAM_COLOR }}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-3 text-xs font-mono">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">
              Your changes are <strong>not being saved</strong>. Retrying — keep
              this tab open. If it persists, sign out and back in.
            </span>
            <button
              onClick={writeNow}
              className={`${btnBase} shrink-0 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1 uppercase tracking-widest text-[10px]`}
            >
              Retry now
            </button>
          </div>
        </div>
      )}

      {/* Spending a freeze cannot be undone — no refund even if the day is
          later logged up to green — so it asks first. */}
      {freezeCandidate && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setFreezeCandidate(null)
          }
        >
          <div className={`${CARD} w-full max-w-[340px] p-5`}>
            <p className="text-xs font-mono text-[#1E2A33]/80 mb-1">
              Use a streak freeze on {fmtDateLong(freezeCandidate)}?
            </p>
            <p className="text-[11px] font-mono text-[#1E2A33]/45 mb-4">
              The day keeps your streak but stays short of its goal. Spent for
              good — {ledger.balance - 1} would be left.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setFreezeCandidate(null)}
                className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide text-[#1E2A33]/60 hover:text-[#1E2A33] hover:bg-[#1E2A33]/5`}
              >
                Cancel
              </button>
              <button
                onClick={() => spendFreeze(freezeCandidate)}
                className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide text-white`}
                style={{ backgroundColor: FREEZE_COLOR }}
              >
                Use a freeze
              </button>
            </div>
          </div>
        </div>
      )}

      {counterAddKey && (
        <QuickAddCounterModal
          dateKey={counterAddKey}
          units={project.counterUnits || []}
          slots={project.slots}
          counters={project.days[counterAddKey]?.counters || {}}
          onCancel={() => setCounterAddKey(null)}
          onAdd={(unitId, slotId, amount) => {
            // Adds to what is there rather than replacing it — that is the
            // whole difference between this and the day editor's fields.
            updateDay(counterAddKey, {
              counters: addSlotCount(
                project.days[counterAddKey]?.counters,
                unitId,
                slotId,
                amount,
              ),
            })
            setCounterAddKey(null)
          }}
        />
      )}

      {quickAdd && (
        <QuickAddEntryModal
          dateKey={quickAdd.key}
          variant={quickAdd.variant}
          slots={project.slots}
          categories={project.categories}
          onCancel={() => setQuickAdd(null)}
          onAdd={(dateKey, slotId, entry) => {
            const day = project.days[dateKey] || {}
            // A null slot means sleep — the day's other list, which no study
            // figure may ever read.
            if (slotId === null) {
              updateDay(dateKey, { sleep: [...(day.sleep || []), entry] })
            } else {
              const cells = day.cells || {}
              updateDay(dateKey, {
                cells: { ...cells, [slotId]: [...(cells[slotId] || []), entry] },
              })
            }
            setQuickAdd(null)
          }}
        />
      )}

      {editingKey && (
        <DayQuickviewModal
          dateKey={editingKey}
          dayEntry={project.days[editingKey]}
          slots={project.slots}
          categories={project.categories}
          counterUnits={project.counterUnits || []}
          settings={project.settings}
          onClose={() => setEditingKey(null)}
          onChange={(patch) => updateDay(editingKey, patch)}
          // The dialog draws the same card the week does, so it keeps the
          // card's own actions rather than losing them one level down.
          onQuickAdd={(key) => setQuickAdd({ key, variant: "study" })}
          onQuickAddSleep={
            project.settings.sleepEnabled === true
              ? (key) => setQuickAdd({ key, variant: "sleep" })
              : undefined
          }
          onQuickAddCounter={
            (project.counterUnits || []).length ? setCounterAddKey : undefined
          }
          canFreeze={canFreezeDay}
          onFreeze={setFreezeCandidate}
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
          counterUnits={project.counterUnits || []}
          counterProgress={counterProgress}
          onUpdateUnits={updateCounterUnits}
          projects={data.projects}
          activeProjectId={data.activeProjectId}
          onSwitchProject={switchProject}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
          onExport={exportData}
          onImport={importData}
          isAdmin={isAdmin}
        />
      )}

      <EnvBadge />
    </div>
  )
}
