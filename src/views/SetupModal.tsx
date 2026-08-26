/* ---------------------------------------------------------------
   Setup — project details, slots and activities, and the project switcher.
--------------------------------------------------------------- */

import { useEffect, useRef, useState } from 'react'
import {
  Flame,
  FolderOpen,
  Hash,
  LayoutGrid,
  Moon,
  Palette,
  Plus,
  Shapes,
  SlidersHorizontal,
  Tags,
  Gift,
  Trophy,
  Trash2,
  X,
} from "lucide-react"
import type {
  AppData,
  Activity,
  CounterUnit,
  Project,
  Proposal,
  StreakRule,
  Settings,
  Slot,
} from '../types/model'
import {
  fmtDateLong,
  toKey,
} from '../lib/date'
import { FIELD_SOFT, btnBase } from '../lib/theme'
import { DateField } from '../ui/DateField'
import { EditableList } from '../ui/EditableList'
import { Field } from '../ui/Field'
import { IconGrid } from '../ui/IconGrid'
import { RenderIcon } from '../ui/icons'
import { SwitchToggle } from '../ui/toggles'
import { Tip } from '../ui/Tip'
import { useModalDismiss } from '../ui/useModalDismiss'
import { CounterUnitsTab } from './CounterUnitsTab'
import { StreakRulesTab } from './StreakRulesTab'
import { AchievementsTab } from './AchievementsTab'
import { ShopTab } from './ShopTab'
import { SupervisorBlock } from './SupervisorBlock'
import { CategoriesTab } from './CategoriesTab'
import { AppearanceTab } from './AppearanceTab'
import { TagsTab } from './TagsTab'
import { DataTransfer } from './DataTransfer'

import { usePalette } from "../ui/useTheme"
export function SetupModal({
  settings,
  slots,
  activities,
  onClose,
  onSaveSettings,
  supervised,
  proposals,
  onPropose,
  onProposeRemoval,
  inviteUrl,
  inviteNote,
  onMakeInvite,
  supervisorCount,
  onUpdateSlots,
  onUpdateActivities,
  counterUnits,
  counterProgress,
  onUpdateUnits,
  onUpdateProject,
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
  activities: Activity[]
  onClose: () => void
  onSaveSettings: (next: Settings) => void
  /** The second person — `spec 010` part 7. */
  supervised: boolean
  proposals: Proposal[]
  onPropose: (prev: StreakRule, next: StreakRule, reason: string) => void
  /** A rule or an achievement sent to be dropped, rather than dropped. */
  onProposeRemoval?: (
    subject: "rule" | "achievement",
    subjectId: string,
    subjectLabel: string,
    beforeText: string,
    reason: string,
  ) => void
  inviteUrl: string | null
  inviteNote: string | null
  onMakeInvite: () => void
  supervisorCount: number
  onUpdateSlots: (next: Slot[]) => void
  onUpdateActivities: (next: Activity[]) => void
  counterUnits: CounterUnit[]
  counterProgress: Record<string, number>
  onUpdateUnits: (next: CounterUnit[]) => void
  /** One write for an edit that touches more than one of the arrays. */
  onUpdateProject: (patch: Partial<Project>) => void
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
        /* A **fixed** height, not a maximum.

           With `max-h` the panel was as tall as whatever tab you were on, and
           since it is centred, every tab switch moved the top edge — the
           heading, the tabs and the first field all jumped, and on a tall tab
           it grew from both ends at once. Nothing about the window should
           depend on which tab is open. */
        className="w-full max-w-lg rounded-2xl shadow-2xl h-[85vh] flex flex-col"
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

        {/* Ten tabs will not fit across a phone, and `flex-1` does not save
            them: a flex item refuses to shrink below its own content, so the
            row simply overflowed the panel and "App" sat outside the rounded
            corner. It scrolls instead — the same answer the period bar gives
            to the same problem, and each tab now keeps its natural width. */}
        <div
          style={{ backgroundColor: c.card }}
          className="flex border-b border-ink/10 shrink-0 overflow-x-auto"
        >
          {/* An icon each. Seven tabs of small uppercase type is a wall of
              words to read every time; a glyph is what the eye actually aims
              at once you know where a thing lives. */}
          {[
            { id: "details", label: "Project", icon: SlidersHorizontal },
            { id: "slots", label: "Slots", icon: LayoutGrid },
            // Activities live inside Counters now — they are one of the three
            // kinds a counter can be, and a tab of their own said they were a
            // different sort of thing.
            { id: "units", label: "Counters", icon: Hash },
            { id: "categories", label: "Categories", icon: Shapes },
            { id: "tags", label: "Tags", icon: Tags },
            { id: "streaks", label: "Streaks", icon: Flame },
            // "History" was carried over from a sketch and was wrong in an app
            // that already has a change log: two words for one shelf, and the
            // trophy beside it said which one this really was.
            { id: "achievements", label: "Achievements", icon: Trophy },
            { id: "shop", label: "Rewards", icon: Gift },
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
                className={`${btnBase} shrink-0 flex flex-col items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-3 py-2 border-b-2 ${
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
          className="p-5 overflow-y-auto rounded-b-xl flex-1 min-h-0"
        >
          {tab === "tags" && (
            <TagsTab
              settings={settings}
              tags={settings.tags || []}
              units={counterUnits}
              onApply={onUpdateProject}
            />
          )}
          {tab === "app" && <AppearanceTab />}
          {tab === "details" && (
            <ProjectDetailsTab
              settings={settings}
              onSave={onSaveSettings}
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
            <CategoriesTab
              settings={settings}
              categories={settings.categories || []}
              activities={activities}
              units={counterUnits}
              onApply={onUpdateProject}
            />
          )}
          {tab === "shop" && (
            <ShopTab settings={settings} onSave={onSaveSettings} />
          )}
          {tab === "achievements" && (
            <AchievementsTab
              supervised={supervised}
              onProposeRemoval={onProposeRemoval}
              project={
                projects.find((p) => p.id === activeProjectId) || projects[0]
              }
              settings={settings}
              onSave={onSaveSettings}
            />
          )}
          {tab === "streaks" && (
            <StreakRulesTab
              supervised={supervised}
              proposals={proposals}
              onPropose={onPropose}
              onProposeRemoval={onProposeRemoval}
              supervisorBlock={
                <SupervisorBlock
                  count={supervisorCount}
                  url={inviteUrl}
                  note={inviteNote}
                  onMake={onMakeInvite}
                />
              }
              settings={settings}
              units={counterUnits}
              activities={activities}
              slots={slots}
              onSave={onSaveSettings}
            />
          )}
          {tab === "units" && (
            <CounterUnitsTab
              units={counterUnits}
              activities={activities}
              categories={settings.categories || []}
              onChangeActivities={onUpdateActivities}
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
        Switch between separate projects, each with its own slots, activities
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
}: {
  settings: Settings
  onSave: (next: Settings) => void
}) {
  const c = usePalette()
  const [projectName, setProjectName] = useState(
    settings.projectName ?? "Time Tracker",
  )
  const [projectIcon, setProjectIcon] = useState(
    settings.projectIcon ?? "Train",
  )
  // Opt-in, so an existing project without the key stays as it was.
  const [sleepEnabled, setSleepEnabled] = useState(
    settings.sleepEnabled === true,
  )
  const [startDate, setStartDate] = useState(
    settings.startDate || toKey(new Date()),
  )
  const [endDate, setEndDate] = useState(settings.endDate || "")
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
          ...settings,
          projectName,
          projectIcon,
          sleepEnabled,
          startDate,
          endDate: endDate || null,
        }),
      300,
    )
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectName, projectIcon, sleepEnabled, startDate, endDate])

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
              <div className="absolute z-30 top-12 left-0 bg-card rounded-xl shadow-xl ring-1 ring-ink/10 p-2.5 w-64">
                <p className="text-[9px] uppercase tracking-widest text-ink/40 mb-1.5">
                  Project icon
                </p>
                <IconGrid
                  value={projectIcon}
                  onPick={(name) => {
                    setProjectIcon(name)
                    setIconPickerOpen(false)
                  }}
                />
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

      {/* **The effectiveness meter used to sit here** — seven minute goals, an
          on/off switch, an explicit Edit, a weekly total, and a confirmation
          for lowering it that cost the week its freeze.

          It is gone, and what replaced it is a rule. Every promise in this app
          is one now, and the goal was the last thing pretending it could be a
          number with nothing behind it: a target nobody promised anything
          about is a target. Nominate a rule as the **benchmark** in Setup →
          Streaks and its figure becomes the `goal 3h` on every card, the
          dashed line on the daily chart and the shading on the heatmap.

          That also shuts the hole the lock could never close. These seven
          fields were edited here, in a tab `ruleEdit` never sees, so lowering
          them lowered every rule reading them with no clock, no reason and no
          record. `goalCutEdit` narrowed the door; removing the door shuts it.
          `migrations/019` moves the figures into the conditions that were
          reading them. */}
    </div>
  )
}

