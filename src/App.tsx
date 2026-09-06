import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"
import type {
  AppData,
  Day,
  StudyEntry,
  Activity,
  CounterUnit,
  DayKey,
  PeriodId,
  Project,
  Settings,
  Achievement,
  Proposal,
  ProposalSubject,
  ShopItem,
  StreakRule,
  Slot,
} from "./types/model"
import type { WriteOp } from "./data/ops"
import "./App.css"
import {
  AlertCircle,
  Bell,
  CalendarDays,
  ChartLine,
  Coins,
  Filter,
  Flame,
  Gift,
  History,
  Trophy,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  pad,
  toKey,
  fromKey,
  addDays,
  fmtDateLong,
} from "./lib/date"
import { CARD, btnBase } from "./lib/theme"
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
import { addSlotCount, counterTotals } from "./lib/counters"
import { setCheck } from "./lib/checks"
import {
  lockFrom,
  ruleStatus,
  violationKey,
  streakContext,
} from "./lib/customStreaks"
import { dayReport, keptDays, keptWeeks } from "./lib/dayVerdict"
import { benchmarkMinutes, withBenchmarkGoals } from "./lib/benchmark"
import { makeIsIgnored } from "./lib/stats"
import { balanceOf, dueMarks } from "./lib/balance"
import { dueAchievements } from "./lib/achievements"
import { canBuy, purchaseOf } from "./lib/shop"
import {
  applyProposal,
  hasSupervisor,
  proposalFor,
  ruleText,
} from "./lib/supervisor"
import { claimInvite, createInvite, inviteLink } from "./data/invites"
import { countByLevel, notices, worstLevel } from "./lib/notices"
import { NoticeBoard } from "./views/NoticeBoard"
import { PageNav } from "./views/PageNav"
import { JumpPrompt } from "./views/JumpPrompt"
import { jumpAt } from "./lib/jump"
import type { JumpAt } from "./lib/jump"
import type { MouseEvent } from "react"
import type { NavEntry } from "./views/PageNav"
import { AccountSection } from "./views/AccountSection"
import { SoloBanner } from "./views/SoloBanner"
import { useNoticePrefs } from "./ui/useNoticePrefs"
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
  opDayMark,
  opEarned,
  opProposalNew,
  opProposalState,
  opPurchase,
  opRuleVerdict,
  opDeleteProject,
  opLog,
  opNote,
  opPrefs,
  opProject,
} from "./data/ops"
import { CountFilter } from "./views/CountFilter"
import { StreakBar } from "./views/StreakBar"
import type { StreakId } from "./views/StreakBar"
import { CustomStreakSection } from "./views/CustomStreakSection"
import { KeptSection } from "./views/KeptSection"
import { ChangeLogSection } from "./views/ChangeLogSection"
import { AchievementsSection } from "./views/AchievementsSection"
import { ShopSection } from "./views/ShopSection"
import { SupervisorSection } from "./views/SupervisorSection"
import { SleepSection } from "./views/SleepSection"
import { PeriodBar } from "./views/PeriodBar"
import { LogView } from "./views/LogView"
import { SetupModal } from "./views/SetupModal"
import { TopBar } from "./views/TopBar"
import { AuthScreen, SetPasswordScreen } from "./views/AuthScreen"
import { EnvBadge } from "./views/EnvBadge"
import { AnalyticsView } from "./views/AnalyticsView"
import { QuickAddEntryModal } from "./views/QuickAddEntryModal"
import { FreezeConfirm } from "./views/FreezeConfirm"
import type { FreezeAsk } from "./views/FreezeConfirm"
import { DayQuickviewModal } from "./views/DayEditor"
import { usePalette } from "./ui/useTheme"
import { entryActivity } from "./lib/entries"

/* The composite's panel shares `openStreak` with the rules', so one panel at a
   time falls out rather than being arranged. A rule id is a uuid, so this
   literal cannot collide with one. */
const KEPT_PANEL = "kept"

const DEFAULT_DATA = buildInitialData()

/* ---------------------------------------------------------------
   Main App
--------------------------------------------------------------- */

export default function StudyTrackerApp() {
  const c = usePalette()
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
    /** Preselected when the dialog was opened from a slot's own "+". */
    slotId?: string
  } | null>(null)
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
  const [showHistory, setShowHistory] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  /* **Solo** — `spec 016`, part 5. Viewing the page as though one rule were
     the only one that votes. Deliberately not persisted: it is a look, and
     the whole promise is that it changes nothing. */
  const [soloRule, setSoloRule] = useState<string | null>(null)

  /**
   * **The section a toggle has *just* opened**, and the offer to go and look
   * at it.
   *
   * Opening a panel and then hunting for it down a page of other open panels
   * is what the index exists to fix, and the index still costs four actions.
   * The moment you open one is the moment the app knows exactly which section
   * you want and what you are about to do with it, so it offers the jump right
   * there, beside the button you pressed.
   *
   * Cleared by the next click, whatever it is: an offer that stays is clutter,
   * and one that has to be dismissed is a second thing to do.
   */
  const [justOpened, setJustOpened] = useState<JumpAt | null>(null)

  useEffect(() => {
    if (!justOpened) return
    /* **Clears this offer, not whatever offer is standing.** A plain
       `setJustOpened(null)` also swallowed the *next* one: opening a second
       panel is one click, and React's handler and this listener land in the
       same batch, so the new offer was written and then immediately wiped by
       the old listener. Compare and the click that made a new one leaves it
       alone. */
    const clear = () =>
      setJustOpened((cur) => (cur === justOpened ? null : cur))
    /* Armed a task late, or it swallows the very click that made the offer —
       the same lesson `PageNav`'s dismisser learned. */
    const armed = setTimeout(() => window.addEventListener("click", clear), 0)
    return () => {
      clearTimeout(armed)
      window.removeEventListener("click", clear)
    }
  }, [justOpened])

  /** Flip a panel, and offer the jump only on the way open. */
  const opening = (
    was: boolean,
    id: string,
    e: MouseEvent<HTMLButtonElement>,
  ) => {
    setJustOpened(was ? null : jumpAt(id, e.currentTarget))
  }

  const goToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
    setJustOpened(null)
  }
  /**
   * Which streak's panel is open: `"main"`, a rule id, or nothing.
   *
   * One at a time rather than a flag each. They are five answers to the same
   * question — "how am I doing" — and five panels stacked would push the log
   * off the screen to say it five times.
   */
  const [openStreak, setOpenStreak] = useState<StreakId>(null)
  /* The board's own state, and the only panel state that survives a reload —
     see `useNoticePrefs`. */
  const {
    prefs: noticePrefs,
    setOpen: setNoticesOpen,
    toggleLevel: toggleNoticeLevel,
  } = useNoticePrefs()
  // Which slots/activities are left out of the figures. Deliberately not tied
  // to the period and not saved: it's a way of looking at the data, not part
  // of it.
  const [hiddenSlots, setHiddenSlots] = useState<Set<string>>(() => new Set())
  const [hiddenActivities, setHiddenActivities] = useState<Set<string>>(
    () => new Set(),
  )
  // Tags strike out counter units rather than study time, so they hide a
  // different kind of thing from the other two — but they belong to the same
  // panel and the same "not saved, not period-scoped" rule.
  const [hiddenTags, setHiddenTags] = useState<Set<string>>(() => new Set())
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    () => new Set(),
  )
  const [hiddenCounters, setHiddenCounters] = useState<Set<string>>(
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
          // One silent retry before giving up. The read can fail for reasons
          // that are over by the time you notice — a token being refreshed
          // underneath it, or a machine clock far enough ahead that PostgREST
          // rejects the JWT as "issued at future". Both clear on a second
          // attempt, and both used to land on the dead-end screen, which reads
          // as data loss when nothing is wrong. A genuine failure still gets
          // there, one second later.
          let assembled
          try {
            assembled = await loadFromTables(cloudClient)
          } catch (first) {
            console.warn("First read failed, retrying once.", first)
            await new Promise((r) => setTimeout(r, 900))
            assembled = await loadFromTables(cloudClient)
          }
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

  // Settings, slots and activities all live on the project row.
  const updateProject = useCallback(
    (patch: Partial<Project>) => patchProject(patch, opProject(project.id)),
    [patchProject, project],
  )
  const updateSettings = (patch: Settings) =>
    updateProject({ settings: patch })
  const updateSlots = (slots: Slot[]) => updateProject({ slots })
  const updateActivities = (activities: Activity[]) =>
    updateProject({ activities })

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
      project.activities,
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

  /* ---- Custom streaks -------------------------------------------------
     Same shape as above, one ledger per rule. Computed from `project` rather
     than `visibleProject` for the same reason the main streak is: the count
     filter changes what the page shows, never what a streak is worth. */
  const streakRules = useMemo(
    () => project.settings.streakRules || [],
    [project.settings.streakRules],
  )
  const ruleStatuses = useMemo(
    () => streakRules.map((rule) => ruleStatus(rule, project)),
    [streakRules, project],
  )

  /**
   * How each day came out, across every rule with a vote on it.
   *
   * Built against `project`, never `visibleProject`: the count filter is a way
   * of looking at the data and must not be able to turn a missed day green.
   * Streaks have always been blind to it, and a day's verdict is a streak's
   * reading of that day.
   */
  /**
   * **Solo, as a projection rather than a special case** — `spec 016`, part 5.
   *
   * Everything that colours a day already reads the rules out of the project,
   * so soloing is not a mode any of them have to learn: hand them a project
   * whose rule list is the one rule, and the verdict, the ring, the week
   * blocks, the composite's two figures and the board all redraw under it
   * without a line of their own. The same trick `withBenchmarkGoals` and
   * `visibleProject` already use.
   *
   * **`inDayVerdict` is forced on**, because soloing a rule that does not vote
   * is a perfectly good question — *how would this one have gone* — and the
   * honest answer needs it counted.
   *
   * It reaches nothing that is written down. The balance, the achievements,
   * the freezes and the change log are all built from `project`, not from
   * this, because they are history rather than drawing and *looking* must not
   * be able to move them even on screen.
   */
  const soloProject = useMemo(() => {
    if (!soloRule) return project
    const only = streakRules
      .filter((r) => r.id === soloRule)
      .map((r) => ({ ...r, inDayVerdict: true }))
    if (!only.length) return project
    return { ...project, settings: { ...project.settings, streakRules: only } }
  }, [project, soloRule, streakRules])

  const verdictCtx = useMemo(() => streakContext(soloProject), [soloProject])
  const verdictOf = useCallback(
    (key: DayKey) => dayReport(soloProject, key, toKey(new Date()), verdictCtx),
    [soloProject, verdictCtx],
  )
  /**
   * A stretch of days as the **benchmark rule** counted it — `spec 019`.
   *
   * Built against `project` rather than `visibleProject` for the same reason
   * the verdicts are: the count filter is a way of looking at the data and
   * must not be able to move a figure a rule is answerable for. Null when
   * nothing is nominated, and then the month grid draws no hours at all.
   */
  const benchmarkOf = useCallback(
    (dates: Date[]) =>
      benchmarkMinutes(
        project,
        dates,
        makeIsIgnored(project.weekIgnore, project.monthIgnore),
        verdictCtx,
      ),
    [project, verdictCtx],
  )

  const kept = useMemo(() => keptDays(soloProject), [soloProject])
  const keptWeekly = useMemo(() => keptWeeks(soloProject), [soloProject])

  /**
   * The balance, and the day marks still owed to it — `spec 010`, part 4.
   *
   * Read from the project, never recomputed into it. This is the one figure
   * here that can be *spent*, so a mark is written once when its day leaves
   * the writing window and never revisited: editing yesterday must not move a
   * balance something was already bought against.
   */
  const balance = useMemo(() => balanceOf(project), [project])
  const marksDue = useMemo(() => dueMarks(project), [project])
  /** Achievements reached but not yet written down. */
  const badgesDue = useMemo(() => dueAchievements(project), [project])

  /**
   * **Everything true about today, at four volumes** — `spec 016`.
   *
   * Computed here beside the statuses it reads, because the board itself must
   * stay a drawing: deciding that a ceiling standing at its limit is a warning
   * is a judgement about the data, and judgements live in `lib`.
   */
  const noticeList = useMemo(
    () =>
      notices(
        soloProject,
        /* **The statuses are narrowed too, not just the project.** `notices`
           walks the statuses it is handed rather than the project's rule list,
           so soloing the project alone left every other rule still speaking on
           the board — the one surface that was supposed to be showing you one
           rule at a time. */
        soloRule ? ruleStatuses.filter((s2) => s2.rule.id === soloRule) : ruleStatuses,
      ),
    [soloProject, ruleStatuses, soloRule],
  )
  /* The one figure the streak row still needs from the board: how many rules
     have something wrong. Counted by rule, not by notice — a rule with a
     danger and a warning is one rule in trouble. */
  const counted = useMemo(() => countByLevel(noticeList), [noticeList])

  /**
   * **Everything the toggle row can open, and how to shut it.**
   *
   * One list rather than eight flags read in eight places: the figure in the
   * tooltip and the act of clearing them have to agree, and two walks over
   * the same set is how they come to disagree.
   *
   * The notice board is in it. That panel is the one whose state persists, so
   * closing it here is a preference and it stays closed — which is what *hide
   * all* has to mean, or the one panel you cannot clear is the one that is
   * always there.
   */
  const openPanels = [
    noticePrefs.open && noticeList.length > 0,
    showFilter,
    showSleep,
    showAccount,
    showShop,
    showHistory,
    showLog,
    openStreak !== null,
  ]
  const openCount = openPanels.filter(Boolean).length

  const hideAll = () => {
    setNoticesOpen(false)
    setShowFilter(false)
    setShowSleep(false)
    setShowAccount(false)
    setShowShop(false)
    setShowHistory(false)
    setShowLog(false)
    setOpenStreak(null)
    // Nothing left to jump to.
    setJustOpened(null)
  }


  /**
   * The page's own table of contents.
   *
   * In the order the sections are drawn, so the list is the page read top to
   * bottom rather than a menu somebody arranged. Every entry is conditional on
   * exactly the same thing its panel is.
   */
  const navEntries: NavEntry[] = useMemo(() => {
    const out: NavEntry[] = []
    const add = (
      when: boolean,
      id: string,
      label: string,
      tint?: string,
      icon?: LucideIcon,
    ) => {
      if (when) out.push({ id, label, tint, icon })
    }
    add(noticePrefs.open && noticeList.length > 0, "sec-notices", "Notices", c.accent, Bell)
    add(showFilter, "sec-filter", "What counts", c.filter, Filter)
    /* **One entry, because there is one section.** A rule used to have a
       panel of its own and `sec-rule-<id>` to point at; it is a block inside
       the composite's panel now, and an index entry pointing at a section that
       no longer exists is worse than no entry at all.

       It takes the expanded rule's name and colour when there is one, since
       that is what you would be looking for — "the composite" is the right
       label only when the composite is all that is open. */
    {
      const expanded = ruleStatuses.find((s2) => s2.rule.id === openStreak)
      if (openStreak !== null)
        out.push({
          id: "sec-kept",
          label: expanded ? expanded.rule.label : "The composite",
          tint: expanded ? expanded.rule.color : c.project,
          iconName: expanded ? expanded.rule.iconName : undefined,
          icon: expanded ? undefined : Flame,
        })
    }
    add(showAccount && !!project.settings.balanceStart, "sec-account", "The account", c.project, Coins)
    add(showShop, "sec-shop", "Rewards", c.accent, Gift)
    add(showHistory, "sec-achievements", "Achievements", c.accent, Trophy)
    add(showLog, "sec-changelog", "Change log", c.changelog, History)
    out.push({ id: "sec-log", label: "Days", icon: CalendarDays })
    out.push({ id: "sec-trends", label: "Summary & trends", icon: ChartLine })
    return out
  }, [
    noticePrefs.open,
    noticeList.length,
    showFilter,
    openStreak,
    ruleStatuses,
    showAccount,
    project.settings.balanceStart,
    showShop,
    showHistory,
    showLog,
    c,
  ])

  const troubledCount = useMemo(
    () =>
      new Set(
        noticeList
          .filter(
            (n) =>
              n.ruleId &&
              // `gone` counts too: a rule nothing can save is the most in
              // trouble a rule gets, and leaving it out made the row read
              // `2 of 3 holding` about a rule that was past saving.
              (n.level === "gone" ||
                n.level === "danger" ||
                n.level === "warning"),
          )
          .map((n) => n.ruleId),
      ).size,
    [noticeList],
  )

  // The same once-only sealing, for every rule at once: one pass writes them
  // all rather than one render per rule.
  useEffect(() => {
    if (!loaded || loadFailed) return
    const due = ruleStatuses.flatMap((s2) => s2.pending)
    if (!due.length) return
    const verdicts = { ...(project.ruleVerdicts || {}) }
    due.forEach((v) => (verdicts[`${v.ruleId}::${v.weekKey}`] = v))
    // Recorded, not derived — see the note on the main ledger above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    patchProject(
      { ruleVerdicts: verdicts },
      due.map((v) => opRuleVerdict(project.id, v.ruleId, v.weekKey)),
    )
  }, [loaded, loadFailed, ruleStatuses, project, patchProject])

  /**
   * Spend a freeze for one rule on one day.
   *
   * Append-only, like `day.frozen`: a rule already frozen on that day is left
   * alone rather than added twice, and nothing here ever takes one back.
   */
  const spendRuleFreeze = (ask: FreezeAsk) => {
    const existing = project.days[ask.dayKey]?.ruleFreezes || []
    const already = existing.some(
      (f) =>
        typeof f !== "string" &&
        f.ruleId === ask.ruleId &&
        violationKey(f) === ask.violationKey,
    )
    if (already) return
    const [clauseId = "", targetId = "", slotId = ""] = ask.violationKey.split("|")
    /* **The price is stamped here and never recomputed.** That one field is
       the whole of `spec 017`: a purchase is a thing that happened, and it
       does not follow the data around afterwards. */
    updateDay(ask.dayKey, {
      ruleFreezes: [
        ...existing,
        {
          ruleId: ask.ruleId,
          ...(clauseId ? { clauseId } : {}),
          ...(targetId ? { targetId } : {}),
          ...(slotId ? { slotId } : {}),
          cost: ask.cost,
          boughtAt: new Date().toISOString(),
        },
      ],
    })
  }

  // Counting starts the first time the app runs with a rule that votes, so
  // switching the balance on never seals a year of history in one second and
  // makes the first purchase free.
  useEffect(() => {
    if (!loaded || loadFailed) return
    if (project.settings.balanceStart) return
    if (!kept) return
    // Not derivable, and that is the point: the date counting began is a
    // recorded fact rather than a function of the current state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateSettings({ ...project.settings, balanceStart: toKey(new Date()) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, loadFailed, project.settings.balanceStart, kept])

  // Seal whatever days are due. The op is an ignore-on-conflict upsert, so a
  // replay is harmless and a mark already written stays as written.
  useEffect(() => {
    if (!loaded || loadFailed || !marksDue.length) return
    const ledger = { ...(project.dayLedger || {}) }
    marksDue.forEach((m) => (ledger[m.date] = m))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    patchProject(
      { dayLedger: ledger },
      marksDue.map((m) => opDayMark(project.id, m.date)),
    )
  }, [loaded, loadFailed, marksDue, project, patchProject])

  // Seal whatever achievements have been reached. Written once and never
  // recomputed: what was reached was reached, and the ignore-on-conflict
  // upsert makes a replay harmless.
  useEffect(() => {
    if (!loaded || loadFailed || !badgesDue.length) return
    const earned = { ...(project.earned || {}) }
    badgesDue.forEach((b) => (earned[b.achievementId] = b))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    patchProject(
      { earned },
      badgesDue.map((b) => opEarned(project.id, b.achievementId)),
    )
  }, [loaded, loadFailed, badgesDue, project, patchProject])

  /* ---- The second person, `spec 010` part 7 ---------------------------- */

  const supervised = hasSupervisor(project)
  const toDecide = (data.supervising || []).filter((x) => x.state === "pending")
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteNote, setInviteNote] = useState<string | null>(null)

  const makeInvite = async () => {
    if (!cloudClient || !session) return
    setInviteNote(null)
    try {
      const token = await createInvite(cloudClient, project, session.user.id)
      setInviteUrl(inviteLink(token))
    } catch (e) {
      setInviteNote(e instanceof Error ? e.message : "Could not make a link")
    }
  }

  /**
   * A loosening sent rather than applied. The rule is untouched until somebody
   * answers — which is the whole difference between this and the clock.
   */
  const proposeChange = (
    prev: StreakRule,
    next: StreakRule,
    reason: string,
  ) => {
    const supervisorId = (project.supervisors || [])[0]
    if (!supervisorId || !session) return
    const proposal = proposalFor({
      project,
      subject: "rule",
      action: "edit",
      subjectId: prev.id,
      subjectLabel: prev.label,
      beforeText: ruleText(prev, verdictCtx),
      afterText: ruleText(next, verdictCtx),
      next,
      reason,
      ownerId: session.user.id,
      supervisorId,
    })
    patchProject(
      { proposals: { ...(project.proposals || {}), [proposal.id]: proposal } },
      [opProposalNew(project.id, proposal.id)],
    )
  }

  /**
   * **A removal sent rather than done** — a rule's or an achievement's.
   *
   * The same channel an edit uses, because it is the same question asked of
   * the same person: *may this promise get weaker.* Removal carries no
   * `next` — there is nothing to write afterwards, only a thing to take away —
   * and the `afterText` is the sentence that says so.
   */
  const proposeRemoval = (
    subject: ProposalSubject,
    subjectId: string,
    subjectLabel: string,
    beforeText: string,
    reason: string,
  ) => {
    const supervisorId = (project.supervisors || [])[0]
    if (!supervisorId || !session) return
    const proposal = proposalFor({
      project,
      subject,
      action: "remove",
      subjectId,
      subjectLabel,
      beforeText,
      afterText: "Gone.",
      reason,
      ownerId: session.user.id,
      supervisorId,
    })
    patchProject(
      { proposals: { ...(project.proposals || {}), [proposal.id]: proposal } },
      [opProposalNew(project.id, proposal.id)],
    )
  }

  /**
   * The supervisor's answer. Which side may make which transition is enforced
   * in the database by the trigger in `018`, not here: a check that lives only
   * in the client is a check anybody can skip.
   */
  const decideProposal = (proposal: Proposal, allow: boolean) => {
    const next: Proposal = {
      ...proposal,
      state: allow ? "approved" : "refused",
      decidedAt: new Date().toISOString(),
    }
    persist(
      {
        ...data,
        supervising: (data.supervising || []).map((x) =>
          x.id === proposal.id ? next : x,
        ),
      },
      [opProposalState(proposal.id)],
    )
  }

  /**
   * Taking a reward. Append-only and never refunded — the ledger is what makes
   * the promise cost something, and something you can undo costs nothing.
   */
  const buyReward = (item: ShopItem) => {
    const bought = purchaseOf(item)
    patchProject(
      { purchases: { ...(project.purchases || {}), [bought.id]: bought } },
      [opPurchase(project.id, bought.id)],
    )
  }

  // An invite link opened. Handled once and then scrubbed from the address
  // bar, because a token left in history is a key left in a door.
  useEffect(() => {
    if (!loaded || !cloudClient || !session) return
    const token = new URLSearchParams(window.location.search).get("supervise")
    if (!token) return
    window.history.replaceState({}, "", window.location.pathname)
    claimInvite(cloudClient, token)
      .then((name) => setInviteNote(`You are now supervising ${name}.`))
      .catch((e) =>
        setInviteNote(e instanceof Error ? e.message : "That link did not work"),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, !!cloudClient, session?.user.id])

  /**
   * Answered requests, folded back into the rules.
   *
   * An approval writes the new terms and starts the clock **from today**, not
   * from the day it was asked for — a slow answer must not shorten the wait. A
   * refusal restarts it too, which is what stops the request being re-sent the
   * same evening.
   */
  useEffect(() => {
    if (!loaded || loadFailed) return
    const answered = Object.values(project.proposals || {}).filter(
      (p) => p.state === "approved" || p.state === "refused",
    )
    if (!answered.length) return
    let rules = [...(project.settings.streakRules || [])]
    let achievements = [...(project.settings.achievements || [])]
    const proposals = { ...(project.proposals || {}) }
    const ops: WriteOp[] = []
    answered.forEach((p) => {
      const allowed = p.state === "approved"
      /* **A refusal restarts the clock, whatever was asked.** Changing your
         mind is free; being told no is expensive, and without that the rate
         limit is decorative — you would ask again the same evening. */
      const refuse = <T extends { lockedUntil: DayKey }>(item: T): T => ({
        ...item,
        lockedUntil: lockFrom(new Date()),
      })

      if (p.subject === "achievement") {
        const i = achievements.findIndex((a) => a.id === p.subjectId)
        if (i >= 0) {
          if (!allowed) achievements[i] = refuse(achievements[i])
          else if (p.action === "remove")
            achievements = achievements.filter((a) => a.id !== p.subjectId)
          else
            achievements[i] = {
              ...(p.next as Achievement),
              lockedUntil: lockFrom(new Date()),
            }
        }
      } else {
        const i = rules.findIndex((r) => r.id === p.subjectId)
        if (i >= 0) {
          if (!allowed) rules[i] = refuse(rules[i])
          else if (p.action === "remove")
            rules = rules.filter((r) => r.id !== p.subjectId)
          else rules[i] = applyProposal(p, rules[i])
        }
      }
      proposals[p.id] = { ...p, state: "closed" }
      ops.push(opProposalState(p.id))
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    patchProject(
      {
        settings: { ...project.settings, streakRules: rules, achievements },
        proposals,
      },
      ops,
    )
  }, [loaded, loadFailed, project, patchProject])

  /**
   * The freeze waiting to be confirmed, from whichever streak asked.
   *
   * Spending is permanent — no refund if the day is later logged up to green,
   * and nothing in Setup rewrites it — so **every** path asks first. Two of
   * the three used to spend on the click; one dialog for all of them is also
   * the only place that can say what each pool will be left holding.
   */
  const [freezeAsk, setFreezeAsk] = useState<FreezeAsk | null>(null)

  const confirmFreeze = () => {
    if (!freezeAsk) return
    spendRuleFreeze(freezeAsk)
    setFreezeAsk(null)
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

  // All-time starts at the **configured project start**, and only falls back to
  // the first logged day when there isn't one.
  //
  // It used to be the other way round, which meant a single stray row — an old
  // import, a day touched before the start date was set — silently dragged the
  // range back months and filled the difference with "empty days". The rest of
  // the app already treats the start date as the authority (a card before it
  // reads "Before project start"), so all-time has to agree with it.
  const allTimeStart = useMemo(() => {
    if (project.settings.startDate) return fromKey(project.settings.startDate)
    const firstLogged = Object.keys(project.days).sort()[0]
    return firstLogged ? fromKey(firstLogged) : new Date()
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
    if (
      !hiddenSlots.size &&
      !hiddenActivities.size &&
      !hiddenCounters.size &&
      !hiddenTags.size &&
      !hiddenCategories.size
    )
      return project
    /* A hidden category takes everything filed under it — its counters *and*
       its activities. That is what separates it from a tag, which only ever
       reaches counters: a tag says what a thing is like, a category says
       where it belongs, and hiding a shelf means hiding what is on it. */
    const inHiddenCategory = (x: { categoryId?: string }) =>
      !!x.categoryId && hiddenCategories.has(x.categoryId)
    const hiddenActivityIds = new Set([
      ...hiddenActivities,
      ...project.activities.filter(inHiddenCategory).map((a) => a.id),
    ])
    const slots = project.slots.filter((s) => !hiddenSlots.has(s.id))
    const days: Record<DayKey, Day> = {}
    Object.entries(project.days).forEach(([key, day]) => {
      const cells: Record<string, StudyEntry[]> = {}
      slots.forEach((s) => {
        const arr = day.cells?.[s.id]
        if (!arr) return
        cells[s.id] = hiddenActivityIds.size
          ? arr.filter((e) => !hiddenActivityIds.has(entryActivity(e) ?? ""))
          : arr
      })
      days[key] = { ...day, cells }
    })
    return {
      ...project,
      slots,
      activities: project.activities.filter((a) => !hiddenActivityIds.has(a.id)),
      // Dropping the *unit* is enough: every badge and row maps over this
      // list, so a hidden tag takes its counters off the page without the
      // recorded numbers being touched.
      counterUnits: (project.counterUnits || []).filter(
        (u) =>
          !hiddenCounters.has(u.id) &&
          !(u.tagIds || []).some((t) => hiddenTags.has(t)) &&
          !inHiddenCategory(u),
      ),
      days,
    }
  }, [
    project,
    hiddenSlots,
    hiddenActivities,
    hiddenCounters,
    hiddenTags,
    hiddenCategories,
  ])

  /* The day's goal, from the rule that promised it.

     Layered on top of the count filter rather than folded into it: they are
     two different projections of the same stored project and stacking them
     one at a time is what keeps either one readable. Both are read-only —
     every edit below still closes over `project`, so a derived figure can
     never be written back over one somebody typed. */
  const shownProject = useMemo(
    () => withBenchmarkGoals(visibleProject),
    [visibleProject],
  )

  // No env vars, no database. A dead end rather than the signed-out local
  // fallback, because that path calls `window.storage` — an API browsers do
  // not have — so "degrading gracefully" here means a logbook that silently
  // keeps nothing. Better to say which file is empty.
  if (!cloudEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page text-ink p-6">
        <div className={`${CARD} max-w-md text-center`}>
          <h1 className="font-sans font-extrabold uppercase tracking-tight text-base mb-2">
            No database configured
          </h1>
          <p className="text-xs font-mono text-ink/60 leading-relaxed">
            {import.meta.env.DEV ? (
              <>
                Fill <span className="text-ink">VITE_SUPABASE_URL</span>{" "}
                and{" "}
                <span className="text-ink">VITE_SUPABASE_ANON_KEY</span>{" "}
                in <span className="text-ink">.env.development.local</span>{" "}
                with your dev project, then restart the dev server — Vite reads
                env files once, at boot. See{" "}
                <span className="text-ink">.env.example</span> for how to
                set that project up.
              </>
            ) : (
              <>
                This build went out without{" "}
                <span className="text-ink">.env.production</span>. Nothing
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
      <div className="min-h-screen flex items-center justify-center bg-page text-ink font-mono text-sm">
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
      <div className="min-h-screen flex items-center justify-center bg-page text-ink font-mono text-sm">
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
      <div className="min-h-screen flex items-center justify-center bg-page text-ink p-6">
        <div className={`${CARD} max-w-md text-center`}>
          <h1 className="font-sans font-extrabold uppercase tracking-tight text-base mb-2">
            Couldn't load your logbook
          </h1>
          <p className="text-xs font-mono text-ink/60 leading-relaxed mb-4">
            The server answered, but your saved data didn't come back. Nothing
            has been changed — saving is switched off until it loads, so the
            stored copy stays exactly as it is.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ backgroundColor: c.accent, color: c.onFill }}
            className={`${btnBase} text-xs font-mono uppercase tracking-widest px-4 py-2.5 rounded-xl hover:opacity-90`}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page text-ink">
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
        {/* Above everything, and only when there is something: a request
            nobody looks at is a lock nobody has. */}
        <SupervisorSection proposals={toDecide} onDecide={decideProposal} />

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
          onToggleFilter={(e) => {
            opening(showFilter, "sec-filter", e)
            setShowFilter((v) => !v)
          }}
          filteredOutCount={
            hiddenSlots.size +
            hiddenActivities.size +
            hiddenCounters.size +
            hiddenTags.size +
            hiddenCategories.size
          }
          sleepEnabled={project.settings.sleepEnabled === true}
          showSleep={showSleep}
          onToggleSleep={() => setShowSleep((v) => !v)}
          showLog={showLog}
          onToggleLog={(e) => {
            opening(showLog, "sec-changelog", e)
            setShowLog((v) => !v)
          }}
          showHistory={showHistory}
          onToggleHistory={(e) => {
            opening(showHistory, "sec-achievements", e)
            setShowHistory((v) => !v)
          }}
          showShop={showShop}
          onToggleShop={(e) => {
            opening(showShop, "sec-shop", e)
            setShowShop((v) => !v)
          }}
          showNotices={noticePrefs.open}
          onToggleNotices={(e) => {
            opening(noticePrefs.open, "sec-notices", e)
            setNoticesOpen(!noticePrefs.open)
          }}
          noticeCount={noticeList.length}
          goneCount={counted.gone}
          dangerCount={counted.danger}
          warningCount={counted.warning}
          noticeOwed={counted.notice}
          allClearCount={counted.allClear}
          keptDays={kept?.current ?? null}
          onToggleKept={(e) => {
            opening(openStreak === KEPT_PANEL, "sec-kept", e)
            setOpenStreak(openStreak === KEPT_PANEL ? null : KEPT_PANEL)
          }}
          keptOpen={openStreak === KEPT_PANEL}
          openCount={openCount}
          onHideAll={hideAll}
          points={project.settings.balanceStart ? balance.total : null}
          showAccount={showAccount}
          onToggleAccount={(e) => {
            opening(showAccount, "sec-account", e)
            setShowAccount((v) => !v)
          }}
          badges={
            (project.settings.achievements || []).length
              ? {
                  /* **Only what still exists.** The ledger keeps a row for an
                     achievement whose definition was later deleted — the hand
                     that edits the definitions is deliberately not the hand
                     that edits what was earned — so a raw count of it read
                     `2/1`, a fraction past its own denominator. */
                  earned: (project.settings.achievements || []).filter(
                    (a) => (project.earned || {})[a.id],
                  ).length,
                  total: (project.settings.achievements || []).length,
                }
              : null
          }
          shop={
            (project.settings.shop || []).length
              ? {
                  /* What you can **afford**, not what you have taken: a
                     reward can be taken more than once, so taken-of-total
                     would climb past its own denominator. */
                  affordable: (project.settings.shop || []).filter((item) =>
                    canBuy(item, balance.total),
                  ).length,
                  total: (project.settings.shop || []).length,
                }
              : null
          }
        />

        {soloRule && (
          <SoloBanner
            rule={streakRules.find((r) => r.id === soloRule)}
            onClear={() => setSoloRule(null)}
          />
        )}

        {/* **The board takes the alarms' place**, first under the period
            bar and above the composite — `spec 016`. The placement argument
            transfers whole: a warning under the number it is about reads as a
            footnote to it, and a footnote is something you finish reading
            rather than something you do.

            It is the page's own block rather than one of the panels that open
            below the streak row, because it is where danger is read and it is
            open by default. */}
        {noticePrefs.open && noticeList.length > 0 && (
          <section id="sec-notices" className="scroll-mt-28">
          <NoticeBoard
            notices={noticeList}
            held={noticePrefs.held}
            onToggleLevel={toggleNoticeLevel}
            activeRule={openStreak}
            onOpenRule={(id) => setOpenStreak(openStreak === id ? null : id)}
            onClose={() => setNoticesOpen(false)}
          />
          </section>
        )}

        {/* **The composite above the rules that compose it.** It used to be a
            figure on the collapsed streaks line, which meant it disappeared
            exactly when that row opened and again when every streak was in
            trouble — the two moments anybody is looking. A number you have to
            go and find is a number nobody is afraid of losing, and this one is
            the whole point of the design. */}
        {/* **One row under the period bar**, carrying everything that has to
            be visible without asking: the run you are guarding, what you have
            to spend, and whether anything is in trouble. The composite used to
            have a card of its own directly above this, which was two stacked
            surfaces answering the same question. */}
        <div className="mb-3">
          <StreakBar
            statuses={ruleStatuses}
            balance={project.settings.balanceStart ? balance : null}
            days={kept ?? { current: 0, best: 0 }}
            keptWeeks={keptWeekly}
            rangeStart={range.start}
            rangeEnd={range.end}
            keptOpen={openStreak === KEPT_PANEL}
            onOpenKept={() =>
              setOpenStreak(openStreak === KEPT_PANEL ? null : KEPT_PANEL)
            }
            troubled={troubledCount}
            active={openStreak}
            onSelect={setOpenStreak}
          />
        </div>

        {/* Above the overall stats deliberately: the filter feeds them too, so
            it has to read as the thing governing what's below it. */}
        {showFilter && (
          <section id="sec-filter" className="scroll-mt-28">
          <CountFilter
            slots={project.slots}
            activities={project.activities}
            counters={project.counterUnits || []}
            tags={project.settings.tags || []}
            categories={project.settings.categories || []}
            hiddenSlots={hiddenSlots}
            hiddenActivities={hiddenActivities}
            hiddenCounters={hiddenCounters}
            hiddenTags={hiddenTags}
            hiddenCategories={hiddenCategories}
            onToggleSlot={toggleIn(setHiddenSlots)}
            onToggleActivity={toggleIn(setHiddenActivities)}
            onToggleCounter={toggleIn(setHiddenCounters)}
            onToggleTag={toggleIn(setHiddenTags)}
            onToggleCategory={toggleIn(setHiddenCategories)}
            onReset={() => {
              setHiddenSlots(new Set())
              setHiddenActivities(new Set())
              setHiddenCounters(new Set())
              setHiddenTags(new Set())
              setHiddenCategories(new Set())
            }}
            onClose={() => setShowFilter(false)}
          />
          </section>
        )}

        {/* Sits between the period bar and the period's own figures, full
            width and scrolling with the page — on every screen size. It used
            to be a fixed bottom sheet on phones, which covered the log it was
            meant to be compared against. */}
        {/* **One block for the whole subject.**

            There were two: the composite's panel, and a rule's panel that
            replaced it. They are not two subjects — a rule is what the
            composite is made of, which the breakdown says out loud — and
            keeping them apart meant the composite could name the promise
            costing you the day and then vanish to show it to you.

            So `openStreak` still holds one value and now has three readings:
            nothing, the composite alone, or the composite with one rule
            expanded inside it. The chips in the row above and the breakdown
            rows inside both land on the third. */}
        {openStreak !== null && kept && keptWeekly && (
          <section id="sec-kept" className="scroll-mt-28">
          <KeptSection
            onOpenRule={(id) =>
              setOpenStreak(openStreak === id ? KEPT_PANEL : id)
            }
            expandedRule={openStreak === KEPT_PANEL ? null : openStreak}
            renderExpanded={(ruleId) => {
              const s2 = ruleStatuses.find((x) => x.rule.id === ruleId)
              if (!s2) return null
              return (
                <CustomStreakSection
                  nested
                  status={s2}
                  /* The worst the board has on this rule, so it opens on the
                     state before it opens on the drawings. The board keeps the
                     sentences; this is only which of the five it is. */
                  level={worstLevel(
                    noticeList.filter((n) => n.ruleId === s2.rule.id),
                  )}
                  project={project}
                  rangeStart={range.start}
                  rangeEnd={range.end}
                  today={new Date()}
                  onSpendFreeze={(key, vKey, cost, line, othersUnfrozen) =>
                    setFreezeAsk({
                      ruleId: s2.rule.id,
                      dayKey: key,
                      violationKey: vKey,
                      line,
                      othersUnfrozen,
                      title: s2.rule.label,
                      tint: s2.rule.color,
                      cost,
                      // In spending order. The allowance expires on Sunday, so
                      // it goes first — the same order `ruleStatus` accounts in.
                      pools: [
                        {
                          label: "This week's allowance",
                          hint: "Granted every Monday and lost unused.",
                          left: s2.freezes.weeklyLeft,
                          total: s2.freezes.weeklyTotal,
                        },
                        {
                          label: "Banked",
                          hint: "One for every week you keep clean. Carried until spent.",
                          left: s2.freezes.banked,
                          total: s2.freezes.cap,
                        },
                      ],
                    })
                  }
                  solo={soloRule === s2.rule.id}
                  onSolo={() =>
                    setSoloRule(soloRule === s2.rule.id ? null : s2.rule.id)
                  }
                  /* Collapses the row rather than closing the panel: the
                     composite is still the thing you are looking at. */
                  onClose={() => setOpenStreak(KEPT_PANEL)}
                />
              )
            }}
            project={project}
            days={kept}
            weeks={keptWeekly}
            rangeStart={range.start}
            rangeEnd={range.end}
            today={new Date()}
            solo={soloRule}
            onSolo={(id) => setSoloRule(soloRule === id ? null : id)}
            onClose={() => setOpenStreak(null)}
          />
          </section>
        )}

        {showAccount && project.settings.balanceStart && (
          <section id="sec-account" className="scroll-mt-28">
          <AccountSection
            project={project}
            balance={balance}
            rangeStart={range.start}
            rangeEnd={range.end}
            onOpenShop={() => {
              setShowAccount(false)
              setShowShop(true)
            }}
            onClose={() => setShowAccount(false)}
          />
          </section>
        )}

        {showShop && (
          <section id="sec-shop" className="scroll-mt-28">
          <ShopSection
            project={project}
            balance={project.settings.balanceStart ? balance : null}
            onBuy={buyReward}
            onOpenAccount={
              project.settings.balanceStart
                ? () => {
                    setShowShop(false)
                    setShowAccount(true)
                  }
                : undefined
            }
            onClose={() => setShowShop(false)}
          />
          </section>
        )}

        {showHistory && (
          <section id="sec-achievements" className="scroll-mt-28">
          <AchievementsSection
            project={project}
            today={new Date()}
            onClose={() => setShowHistory(false)}
          />
          </section>
        )}

        {showLog && (
          <section id="sec-changelog" className="scroll-mt-28">
          <ChangeLogSection
            entries={project.changeLog || []}
            onClose={() => setShowLog(false)}
          />
          </section>
        )}

        <section id="sec-log" className="scroll-mt-28">
        <LogView
          data={shownProject}
          verdictOf={verdictOf}
          benchmarkOf={benchmarkOf}
          period={period}
          range={range}
          cursor={logCursor}
          onEditDay={setEditingKey}
          onExpandDay={setEditingKey}
          onUpdateDayNote={(key, text) => updateDay(key, { comment: text })}
          onUpdateWeekNote={updateWeekNote}
          onUpdateMonthNote={updateMonthNote}
          onUpdateWeekIgnore={updateWeekIgnore}
          onUpdateMonthIgnore={updateMonthIgnore}
          onQuickAddDay={(key) => setQuickAdd({ key })}
          // The "+" beside a slot heading: same dialog, that slot already
          // chosen. Adding to the morning is the commonest thing there is, and
          // it used to mean opening the dialog and then correcting the slot.
          onQuickAddSlotDay={(key, slotId) =>
            setQuickAdd({ key, slotId })
          }
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
        </section>

        <section id="sec-trends" className="mt-10 scroll-mt-28">
          <AnalyticsView
            data={shownProject}
            rangeStart={range.start}
            rangeEnd={range.end}
          />
        </section>
      </main>

      {/* **An index of what is open, because there can now be a lot of it.**
          Built from what is actually rendered rather than from a fixed menu:
          an entry that points at a section which is not there is worse than
          no entry. */}
      <PageNav entries={navEntries} />

      {/* Beside the button you just pressed, and gone on the next click. */}
      <JumpPrompt at={justOpened} onGo={goToSection} />

      {/* Unmissable on purpose. The whole point of this app is that what you
          typed is still there tomorrow, so a write that isn't landing has to
          interrupt — retrying quietly in the background is not enough. */}
      {saveFailed && (
        <div
          className="fixed inset-x-0 top-0 z-50 px-4 py-2.5 shadow-lg"
          style={{ backgroundColor: c.exam, color: c.onFill }}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-3 text-xs font-mono">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">
              Your changes are <strong>not being saved</strong>. Retrying — keep
              this tab open. If it persists, sign out and back in.
            </span>
            <button
              onClick={writeNow}
              className={`${btnBase} shrink-0 rounded-full bg-card/20 hover:bg-card/30 px-3 py-1 uppercase tracking-widest text-[10px]`}
            >
              Retry now
            </button>
          </div>
        </div>
      )}

      {freezeAsk && (
        <FreezeConfirm
          ask={freezeAsk}
          onCancel={() => setFreezeAsk(null)}
          onConfirm={confirmFreeze}
        />
      )}

      {quickAdd && (
        /* Every counter, both kinds: the dialog's tabs are the kinds of thing
           a day holds, and it does the splitting itself. */
        <QuickAddEntryModal
          dateKey={quickAdd.key}
          initialSlotId={quickAdd.slotId}
          slots={project.slots}
          activities={project.activities}
          units={project.counterUnits || []}
          sleepEnabled={project.settings.sleepEnabled === true}
          counters={project.days[quickAdd.key]?.counters || {}}
          checks={project.days[quickAdd.key]?.checks || {}}
          onCancel={() => setQuickAdd(null)}
          onSetCheck={(dateKey, unitId, next) => {
            // `setCheck` returns both fields at once — a check's answer lives
            // in two places and they must never be written apart.
            updateDay(dateKey, setCheck(project.days[dateKey], unitId, next))
            setQuickAdd(null)
          }}
          onAddCounter={(dateKey, unitId, slotId, amount) => {
            // Adds to what is there rather than replacing it — that is the
            // whole difference between this and the day editor's fields.
            updateDay(dateKey, {
              counters: addSlotCount(
                project.days[dateKey]?.counters,
                unitId,
                slotId,
                amount,
              ),
            })
            setQuickAdd(null)
          }}
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
          verdictOf={verdictOf}
          dayEntry={project.days[editingKey]}
          slots={project.slots}
          activities={project.activities}
          counterUnits={project.counterUnits || []}
          settings={project.settings}
          onClose={() => setEditingKey(null)}
          onChange={(patch) => updateDay(editingKey, patch)}
          // The dialog draws the same card the week does, so it keeps the
          // card's own actions rather than losing them one level down.
          onQuickAdd={(key) => setQuickAdd({ key })}
          onQuickAddSlot={(key, slotId) =>
            setQuickAdd({ key, slotId })
          }
          onGoToDayView={(key) => {
            goToDay(key)
            setEditingKey(null)
          }}
          // In the Day view the card that opened this modal *is* the day, so
          // there's nothing to preview and nowhere to drill down to: go
          // straight to editing, with no "back" or "go to day view" escape
          // hatches pointing at where we already are.
        />
      )}

      {showSetup && (
        <SetupModal
          settings={project.settings}
          slots={project.slots}
          activities={project.activities}
          onClose={() => setShowSetup(false)}
          onSaveSettings={updateSettings}
          supervised={supervised}
          proposals={Object.values(project.proposals || {})}
          onPropose={proposeChange}
          onProposeRemoval={proposeRemoval}
          inviteUrl={inviteUrl}
          inviteNote={inviteNote}
          onMakeInvite={makeInvite}
          supervisorCount={(project.supervisors || []).length}
          onUpdateSlots={updateSlots}
          onUpdateActivities={updateActivities}
          counterUnits={project.counterUnits || []}
          counterProgress={counterProgress}
          onUpdateUnits={updateCounterUnits}
          onUpdateProject={updateProject}
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
