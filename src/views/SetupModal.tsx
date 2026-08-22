/* ---------------------------------------------------------------
   Setup — project details, slots and categories, and the project switcher.
--------------------------------------------------------------- */

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Flame,
  FolderOpen,
  Gauge,
  Hash,
  LayoutGrid,
  Moon,
  Palette,
  Pencil,
  Plus,
  Shapes,
  SlidersHorizontal,
  Tags,
  Trash2,
  X,
} from "lucide-react"
import type {
  AppData,
  Category,
  CounterUnit,
  Project,
  GoalCut,
  Settings,
  Slot,
} from '../types/model'
import {
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  fmtDateLong,
  startOfWeek,
  toKey,
} from '../lib/date'
import { DEFAULT_SETTINGS } from '../lib/defaults'
import { fmtHours } from '../lib/time'
import { weeklyGoalTotal } from '../lib/freezes'
import { BTN_SOFT, CARD, FIELD_SOFT, btnBase } from '../lib/theme'
import { DateField } from '../ui/DateField'
import { EditableList } from '../ui/EditableList'
import { Field } from '../ui/Field'
import { ICON_LIBRARY } from '../ui/iconLibrary'
import { RenderIcon } from '../ui/icons'
import { SwitchToggle } from '../ui/toggles'
import { Tip } from '../ui/Tip'
import { useModalDismiss } from '../ui/useModalDismiss'
import { CounterUnitsTab } from './CounterUnitsTab'
import { StreakRulesTab } from './StreakRulesTab'
import { AppearanceTab } from './AppearanceTab'
import { TagsTab } from './TagsTab'
import { DataTransfer } from './DataTransfer'

import { usePalette } from "../ui/useTheme"
export function SetupModal({
  settings,
  slots,
  categories,
  onClose,
  onSaveSettings,
  onRecordGoalCut,
  onUpdateSlots,
  onUpdateCategories,
  counterUnits,
  counterProgress,
  onUpdateUnits,
  projects,
  activeProjectId,
  onSwitchProject,
  onAddProject,
  onDeleteProject,
  onExport,
  onImport,
  isAdmin,
}: {
  settings: Settings
  slots: Slot[]
  categories: Category[]
  onClose: () => void
  onSaveSettings: (next: Settings) => void
  onRecordGoalCut: (cut: GoalCut) => void
  onUpdateSlots: (next: Slot[]) => void
  onUpdateCategories: (next: Category[]) => void
  counterUnits: CounterUnit[]
  counterProgress: Record<string, number>
  onUpdateUnits: (next: CounterUnit[]) => void
  projects: Project[]
  activeProjectId: string
  onSwitchProject: (id: string) => void
  onAddProject: () => void
  onDeleteProject: (id: string) => void
  onExport: () => void
  onImport: (data: AppData) => Promise<void>
  isAdmin: boolean
}) {
  const c = usePalette()
  const [tab, setTab] = useState("details")
  const onBackdropClick = useModalDismiss(onClose)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onMouseDown={onBackdropClick}
    >
      <div
        style={{ backgroundColor: c.card }}
        className="w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0 rounded-t-xl">
          <h2 className="font-sans font-extrabold uppercase tracking-tight text-sm">
            Setup
          </h2>
          <button
            onClick={onClose}
            className={`${btnBase} text-ink/50 hover:text-ink`}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{ backgroundColor: c.card }}
          className="flex border-b border-ink/10 shrink-0"
        >
          {/* An icon each. Seven tabs of small uppercase type is a wall of
              words to read every time; a glyph is what the eye actually aims
              at once you know where a thing lives. */}
          {[
            { id: "details", label: "Project", icon: SlidersHorizontal },
            { id: "slots", label: "Slots", icon: LayoutGrid },
            { id: "categories", label: "Categories", icon: Shapes },
            { id: "units", label: "Counters", icon: Hash },
            { id: "tags", label: "Tags", icon: Tags },
            { id: "streaks", label: "Streaks", icon: Flame },
            { id: "projects", label: "Projects", icon: FolderOpen },
            // Last, and the only one that is not about a project — it is a
            // property of the device you are reading on.
            { id: "app", label: "App", icon: Palette },
          ].map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={
                  active ? { borderColor: c.accent, color: c.accent } : undefined
                }
                className={`${btnBase} flex-1 flex flex-col items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-2 py-2 border-b-2 ${
                  active
                    ? ""
                    : "border-transparent text-ink/50 hover:text-ink hover:bg-ink/5"
                }`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        <div
          style={{ backgroundColor: c.card }}
          className="p-5 overflow-y-auto rounded-b-xl"
        >
          {tab === "tags" && (
            <TagsTab
              tags={settings.tags || []}
              units={counterUnits}
              onChange={(tags) => onSaveSettings({ ...settings, tags })}
              onUpdateUnits={onUpdateUnits}
            />
          )}
          {tab === "app" && <AppearanceTab />}
          {tab === "details" && (
            <ProjectDetailsTab
              settings={settings}
              onSave={onSaveSettings}
              onRecordGoalCut={onRecordGoalCut}
            />
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
          {tab === "streaks" && (
            <StreakRulesTab
              settings={settings}
              units={counterUnits}
              slots={slots}
              onSave={onSaveSettings}
            />
          )}
          {tab === "units" && (
            <CounterUnitsTab
              units={counterUnits}
              tags={settings.tags || []}
              progress={counterProgress}
              onChange={onUpdateUnits}
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

        {/* Outside the tabs because it covers everything, not the tab you
            happen to be on: one file with every project in it. Admin-only —
            a UI gate, not a permission; see migrations/006_admins.sql. */}
        {isAdmin && <DataTransfer onExport={onExport} onImport={onImport} />}
      </div>
    </div>
  )
}

function ProjectsTab({
  projects,
  activeProjectId,
  onSwitch,
  onAdd,
  onDelete,
}: {
  projects: Project[]
  activeProjectId: string
  onSwitch: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
}) {
  const c = usePalette()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  return (
    <div className="space-y-2 font-mono text-sm">
      <p className="text-[10px] uppercase tracking-widest text-ink/50 mb-1">
        Switch between separate projects, each with its own slots, categories
        and log.
      </p>
      {projects.map((p) => {
        const active = p.id === activeProjectId
        return (
          <div
            key={p.id}
            className={`rounded-xl p-2.5 flex items-center gap-2.5 ${active ? "bg-ink/[0.10]" : "bg-ink/[0.04]"}`}
          >
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: active ? c.ink : `${c.ink}0D`,
                color: active ? c.page : c.ink,
              }}
            >
              <RenderIcon name={p.settings.projectIcon} size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">
                {p.settings.projectName || "Untitled project"}
              </div>
              <div className="text-[10px] text-ink/40 truncate">
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
                  className={`${btnBase} px-2 py-1 rounded-md bg-ink/[0.06] hover:bg-ink/[0.10] uppercase tracking-widest text-[9px]`}
                >
                  Keep
                </button>
                <button
                  onClick={() => {
                    onDelete(p.id)
                    setConfirmDeleteId(null)
                  }}
                  className={`${btnBase} px-2 py-1 rounded-md bg-exam text-page hover:bg-exam/85 uppercase tracking-widest text-[9px]`}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 shrink-0">
                {!active && (
                  <button
                    onClick={() => onSwitch(p.id)}
                    style={{ backgroundColor: c.accent, color: c.onFill }}
                    className={`${btnBase} px-2.5 py-1.5 rounded-lg uppercase tracking-widest text-[9px]`}
                  >
                    Switch
                  </button>
                )}
                {active && (
                  <span className="text-[9px] uppercase tracking-widest text-ink/40 px-1">
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
                    className={`${btnBase} p-1.5 text-ink/40 hover:text-exam disabled:opacity-20 disabled:cursor-not-allowed`}
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
        className={`${btnBase} flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-ink/60 hover:text-ink px-1 py-1.5`}
      >
        <Plus size={13} /> New project
      </button>
    </div>
  )
}

function ProjectDetailsTab({
  settings,
  onSave,
  onRecordGoalCut,
}: {
  settings: Settings
  onSave: (next: Settings) => void
  onRecordGoalCut: (cut: GoalCut) => void
}) {
  const c = usePalette()
  const [projectName, setProjectName] = useState(
    settings.projectName ?? "Time Tracker",
  )
  const [projectIcon, setProjectIcon] = useState(
    settings.projectIcon ?? "Train",
  )
  const [goalsEnabled, setGoalsEnabled] = useState(
    settings.goalsEnabled !== false,
  )
  // Opt-in, so an existing project without the key stays as it was.
  const [sleepEnabled, setSleepEnabled] = useState(
    settings.sleepEnabled === true,
  )
  const [startDate, setStartDate] = useState(
    settings.startDate || toKey(new Date()),
  )
  const [endDate, setEndDate] = useState(settings.endDate || "")
  const [dailyGoals, setDailyGoals] = useState(
    settings.dailyGoals || DEFAULT_SETTINGS.dailyGoals,
  )
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  /**
   * The goals being typed, or null when not editing.
   *
   * Everything else on this tab writes as you type. The goals must not: the
   * weekly total is what decides whether this week can still earn a freeze, so
   * dragging a number through 30 on the way to 300 would forfeit it. Held apart
   * until Confirm, and the saved copy is what auto-saves.
   */
  const [goalDraft, setGoalDraft] = useState<Record<number, number> | null>(
    null,
  )
  const [confirmingCut, setConfirmingCut] = useState(false)
  // This form auto-saves, so it must not fire on mount: merely opening the
  // setup modal would write whatever it was seeded with. That is exactly how a
  // blank default project got saved over a real one when the modal opened on a
  // failed load.
  const touched = useRef(false)

  useEffect(() => {
    if (!touched.current) {
      touched.current = true
      return
    }
    const t = setTimeout(
      () =>
        onSave({
          projectName,
          projectIcon,
          goalsEnabled,
          sleepEnabled,
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
    goalsEnabled,
    sleepEnabled,
    startDate,
    endDate,
    dailyGoals,
  ])

  const setGoal = (dayIdx: number, minutes: string) =>
    setGoalDraft((g) => ({
      ...(g || dailyGoals),
      [dayIdx]: Math.max(0, Number(minutes) || 0),
    }))

  const shownGoals = goalDraft || dailyGoals
  const savedWeekly = weeklyGoalTotal(dailyGoals)
  const draftWeekly = weeklyGoalTotal(shownGoals)
  const delta = draftWeekly - savedWeekly
  const isCut = delta < 0

  const commitGoals = () => {
    if (!goalDraft) return
    setDailyGoals(goalDraft)
    if (isCut) {
      // Recorded against the week it lands in, which is the week that pays for
      // it. Append-only: putting the number back afterwards does not undo the
      // fact that it was lowered.
      onRecordGoalCut({
        weekKey: toKey(startOfWeek(new Date())),
        at: new Date().toISOString(),
        from: savedWeekly,
        to: draftWeekly,
      })
    }
    setGoalDraft(null)
    setConfirmingCut(false)
  }

  return (
    <div className="space-y-5 font-mono text-sm">
      <div>
        <span className="block text-[10px] uppercase tracking-widest text-ink/50 mb-1">
          Project
        </span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIconPickerOpen((o) => !o)}
              className={`${btnBase} w-10 h-10 rounded-xl border-2 flex items-center justify-center hover:opacity-75 shrink-0`}
              style={{ borderColor: c.accent, color: c.accent }}
            >
              <RenderIcon name={projectIcon} size={18} />
            </button>
            {iconPickerOpen && (
              <div className="absolute z-30 top-12 left-0 bg-card rounded-xl shadow-xl ring-1 ring-ink/10 p-2.5 w-56">
                <p className="text-[9px] uppercase tracking-widest text-ink/40 mb-1.5">
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
                      className={`${btnBase} p-1.5 rounded-md hover:bg-ink/10 flex items-center justify-center ${
                        projectIcon === opt.name
                          ? "bg-ink/10 ring-1 ring-ink/30"
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
            className={`${FIELD_SOFT} flex-1 text-sm`}
          />
        </div>
      </div>

      {/* Lessons and exams used to live here as two fixed fields with their
          own on/off switches. They are counter units now — a unit existing is
          what "enabled" means, and its target is where a total lives — so
          this tab no longer has anything to say about either. See the
          Counters tab and `spec 008`. */}
      {/* No count to go with it, so it stands alone rather than heading an
          input the way lessons and exams do. */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-ink/50">
          <Moon size={12} /> Enable sleep tracking
        </span>
        <Tip text="Log sleep on its own tab in the day editor, kept out of study totals">
          <SwitchToggle
            checked={sleepEnabled}
            onChange={setSleepEnabled}
            label="Enable sleep tracking"
          />
        </Tip>
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
        <p className="text-[9px] text-ink/40 mt-1">
          Once set, days after this date won't count as "empty days" in
          Analytics.
        </p>
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-ink/50">
            <Gauge size={12} /> Effectiveness meter — daily minute goal
          </span>
          <Tip text="Show the daily minute goal in the log and analytics">
            <SwitchToggle
              checked={goalsEnabled}
              onChange={setGoalsEnabled}
              label="Show the daily minute goal in the log and analytics"
            />
          </Tip>
        </div>
        {/* Behind an explicit Edit, unlike everything else here. These seven
            numbers decide what counts as a kept day, so nudging one by accident
            rewrites the meaning of the whole log — and lowering the weekly
            total costs this week its freeze. That is worth a deliberate step
            and a way back out. */}
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_ORDER.map((idx) => (
            <label key={idx} className="flex flex-col items-center gap-1">
              <span className="text-[9px] uppercase tracking-widest text-ink/40">
                {WEEKDAY_LABELS[idx]}
              </span>
              <input
                type="number"
                min={0}
                value={shownGoals[idx] ?? 0}
                disabled={!goalsEnabled || !goalDraft}
                onChange={(e) => setGoal(idx, e.target.value)}
                className={`w-full rounded-xl px-1.5 py-1.5 text-xs text-center font-mono border-0 focus:outline-none focus:ring-2 focus:ring-ink/15 ${
                  goalDraft ? "bg-ink/[0.10]" : "bg-ink/[0.05]"
                } disabled:cursor-not-allowed`}
              />
            </label>
          ))}
        </div>

        {!goalDraft ? (
          <div className="flex items-center justify-between gap-2 mt-2">
            <p className="text-[9px] text-ink/40">
              Minutes per day · {fmtHours(savedWeekly)} a week
            </p>
            <button
              onClick={() => setGoalDraft({ ...dailyGoals })}
              disabled={!goalsEnabled}
              className={`${btnBase} ${BTN_SOFT} flex items-center gap-1 py-1.5 disabled:opacity-40`}
            >
              <Pencil size={10} /> Edit
            </button>
          </div>
        ) : (
          <div className="mt-2.5 rounded-xl bg-ink/[0.04] p-3 space-y-2.5">
            {/* Before, after, and the difference — the number that decides
                whether this costs you a freeze, said out loud rather than left
                to be worked out from seven boxes. */}
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-ink/45">{fmtHours(savedWeekly)}</span>
              <ArrowRight size={11} className="text-ink/30" />
              <span className="font-bold">{fmtHours(draftWeekly)}</span>
              {delta !== 0 && (
                <span
                  className="font-bold"
                  style={{ color: isCut ? c.exam : c.goalMet }}
                >
                  {delta > 0 ? "+" : "−"}
                  {fmtHours(Math.abs(delta))}
                </span>
              )}
              {isCut && (
                <Tip
                  multiline
                  text={
                    "The weekly total is going down, so this week earns no freeze." +
                    String.fromCharCode(10, 10) +
                    "Otherwise lowering the bar would be the way to buy a green week, and a freeze is meant to be earned against the target you were actually holding yourself to."
                  }
                >
                  <span className="cursor-help" style={{ color: c.exam }}>
                    <AlertTriangle size={13} />
                  </span>
                </Tip>
              )}
            </div>
            {isCut && (
              <p className="text-[10px] font-mono leading-relaxed" style={{ color: c.exam }}>
                Less time per week than before — no freeze for this week.
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setGoalDraft(null)}
                className={`${btnBase} px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-widest text-ink/55 hover:text-ink hover:bg-ink/5`}
              >
                Cancel
              </button>
              <button
                onClick={() => (isCut ? setConfirmingCut(true) : commitGoals())}
                disabled={delta === 0 && !goalDraft}
                className={`${btnBase} px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-widest font-bold`}
                style={{ backgroundColor: c.accent, color: c.onFill }}
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>

      {/* A second, deliberate yes — and it names the consequence rather than
          asking abstractly, because "are you sure" on its own is a question
          nobody can answer. */}
      {confirmingCut && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setConfirmingCut(false)
          }
        >
          <div className={`${CARD} w-full max-w-[340px] p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} style={{ color: c.exam }} />
              <h3 className="font-sans font-extrabold uppercase tracking-tight text-sm">
                Lower the weekly goal?
              </h3>
            </div>
            <p className="text-xs font-mono text-ink/70 leading-relaxed mb-4">
              You are going from <strong>{fmtHours(savedWeekly)}</strong> a week
              to <strong>{fmtHours(draftWeekly)}</strong>. Because the total is
              going down, <strong>this week will not earn a freeze</strong> —
              otherwise lowering the bar would be a way to buy one. Continue?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmingCut(false)}
                className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide text-ink/60 hover:text-ink hover:bg-ink/5`}
              >
                Keep editing
              </button>
              <button
                onClick={commitGoals}
                className={`${btnBase} px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wide`}
                style={{ backgroundColor: c.exam, color: c.onFill }}
              >
                Lower it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

