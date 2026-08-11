/* ---------------------------------------------------------------
   Setup — project details, slots and categories, and the project switcher.
--------------------------------------------------------------- */

import { useEffect, useRef, useState } from 'react'
import {
  Gauge,
  Moon,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type { AppData, Category, Project, Settings, Slot } from '../types/model'
import { WEEKDAY_LABELS, WEEKDAY_ORDER, fmtDateLong, toKey } from '../lib/date'
import { DEFAULT_SETTINGS } from '../lib/defaults'
import {
  ACCENT,
  btnBase,
} from '../lib/theme'
import { DateField } from '../ui/DateField'
import { EditableList } from '../ui/EditableList'
import { Field } from '../ui/Field'
import { ICON_LIBRARY } from '../ui/iconLibrary'
import { RenderIcon } from '../ui/icons'
import { SwitchToggle } from '../ui/toggles'
import { Tip } from '../ui/Tip'
import { useModalDismiss } from '../ui/useModalDismiss'
import { DataTransfer } from './DataTransfer'

export function SetupModal({
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
  onExport,
  onImport,
  isAdmin,
}: {
  settings: Settings
  slots: Slot[]
  categories: Category[]
  onClose: () => void
  onSaveSettings: (next: Settings) => void
  onUpdateSlots: (next: Slot[]) => void
  onUpdateCategories: (next: Category[]) => void
  projects: Project[]
  activeProjectId: string
  onSwitchProject: (id: string) => void
  onAddProject: () => void
  onDeleteProject: (id: string) => void
  onExport: () => void
  onImport: (data: AppData) => Promise<void>
  isAdmin: boolean
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  return (
    <div className="space-y-2 font-mono text-sm">
      <p className="text-[10px] uppercase tracking-widest text-[#1E2A33]/50 mb-1">
        Switch between separate projects, each with its own slots, categories
        and log.
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

function ProjectDetailsTab({
  settings,
  onSave,
}: {
  settings: Settings
  onSave: (next: Settings) => void
}) {
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
          totalLessons,
          totalExams,
          lessonsEnabled,
          examsEnabled,
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
    totalLessons,
    totalExams,
    lessonsEnabled,
    examsEnabled,
    goalsEnabled,
    sleepEnabled,
    startDate,
    endDate,
    dailyGoals,
  ])

  const setGoal = (dayIdx: number, minutes: string) =>
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
      {/* No count to go with it, so it stands alone rather than heading an
          input the way lessons and exams do. */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#1E2A33]/50">
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
        <p className="text-[9px] text-[#1E2A33]/40 mt-1">
          Once set, days after this date won't count as "empty days" in
          Analytics.
        </p>
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#1E2A33]/50">
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
                disabled={!goalsEnabled}
                onChange={(e) => setGoal(idx, e.target.value)}
                className="w-full border border-[#1E2A33]/20 rounded-xl px-1.5 py-1.5 text-xs text-center disabled:opacity-40 disabled:cursor-not-allowed"
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

