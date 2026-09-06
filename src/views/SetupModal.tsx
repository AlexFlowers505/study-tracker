/* ---------------------------------------------------------------
   Setup — project details, slots and activities, and the project switcher.
--------------------------------------------------------------- */

import { useEffect, useRef, useState } from 'react'
import {
  Flame,
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
import { PopoverMenu } from '../ui/PopoverMenu'
import { RenderIcon } from '../ui/icons'
import { SwitchToggle } from '../ui/toggles'
import { Tip } from '../ui/Tip'
import { useModalDismiss } from '../ui/useModalDismiss'
import { edgeFade, useScrollEdges } from '../ui/useScrollEdges'
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
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    panelRef.current?.focus()
  }, [])
  /* Destructured rather than held as two objects: `react-hooks/refs` reads
     anything with a callback-ref member as a ref, and then refuses every
     sibling field on the same value as a ref read during render — which
     `start` and `end` are precisely there to be. Separate bindings say what
     is true, that only one of the four is a ref. */
  const {
    attach: attachStrip,
    node: stripNode,
    start: stripStart,
    end: stripEnd,
  } = useScrollEdges("x")
  const { attach: attachBody, end: bodyEnd } = useScrollEdges("y")

  /* **Bring the tab you just chose into view.** Ten tabs make a strip 655px
     wide inside a panel that is 512px at its widest and 343px on a phone, so
     "Projects" and "App" live off the right-hand end at every size — and
     until now choosing one left the strip exactly where it was, with nothing
     under the cursor to say which tab is lit.

     Measured through `getBoundingClientRect` rather than `offsetLeft`: the
     strip sets no `position`, so the offset parent is whatever positioned
     ancestor happens to be above it, and the numbers would be about the wrong
     box. `scrollBy` needs no such assumption. */
  useEffect(() => {
    if (!stripNode) return
    const btn = stripNode.querySelector(`[data-tab="${tab}"]`)
    if (!btn) return
    const strap = stripNode.getBoundingClientRect()
    const seat = btn.getBoundingClientRect()
    const pad = 16
    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? "auto"
      : "smooth"
    if (seat.left < strap.left + pad) {
      stripNode.scrollBy({ left: seat.left - strap.left - pad, behavior })
    } else if (seat.right > strap.right - pad) {
      stripNode.scrollBy({ left: seat.right - strap.right + pad, behavior })
    }
  }, [tab, stripNode])

  return (
    <div
      className="wash-in fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onMouseDown={onBackdropClick}
    >
      {/* **Announced as a dialog, and focused as one.** It is a plain
           `div`, so without this an assistive technology is told nothing
           about it: no name, no role, and no reason to treat the logbook
           behind it as out of play. `aria-modal` is what says the latter, the
           heading supplies the name, and `tabIndex` lets the panel itself
           take focus on the way in — so the first Tab lands on the close
           button rather than somewhere back at the top of the page.

           This is the cheap half of becoming a real `<dialog>`. The other
           half — a genuine focus trap and the top layer — waits on the
           floating primitives in `src/ui/`, which portal to `document.body`
           and would be left underneath a top-layer dialog and outside any
           trap drawn round this subtree. That is its own change. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
        tabIndex={-1}
        style={{ backgroundColor: c.card }}
        /* A **fixed** height, not a maximum.

           With `max-h` the panel was as tall as whatever tab you were on, and
           since it is centred, every tab switch moved the top edge — the
           heading, the tabs and the first field all jumped, and on a tall tab
           it grew from both ends at once. Nothing about the window should
           depend on which tab is open. */
        /* `focus:outline-none` because the focus this panel takes is given
           to it, never reached by tabbing: it is a container, and a ring
           round the whole dialog says the dialog is the control. The rings
           on what is inside it are untouched, which is where a keyboard user
           actually needs to see one. */
        className="rise-in focus:outline-none w-full max-w-lg rounded-2xl shadow-2xl h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0 rounded-t-xl">
          <h2
            id="setup-title"
            className="font-sans font-extrabold uppercase tracking-tight text-sm"
          >
            Setup
          </h2>
          <button
            onClick={onClose}
            aria-label="Close setup"
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
        {/* **The ends go soft, and the scrollbar goes.** A strip cut off
            square at the panel's edge looks like a strip with no more tabs on
            it; an 8px bar underneath is the only thing that said otherwise,
            and a scrollbar is a control rather than a sentence. The fade is
            the sentence, and it is absent at whichever end you have reached,
            so it never claims tabs that are not there. */}
        <div
          ref={attachStrip}
          style={{ backgroundColor: c.card, ...edgeFade(stripStart, stripEnd, 20) }}
          className="edge-fade-x no-scrollbar flex border-b border-ink/10 shrink-0 overflow-x-auto"
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
            // Projects had a tab of its own and no longer does. Two of these
            // ten were half empty — this project's four fields, and a list of
            // the others — and they were half empty with the *same* subject,
            // so the panel's one really unhelpful stretch of nothing was
            // being drawn twice over. They are one tab: which project you are
            // in, and then every project there is.
            // Last, and the only one that is not about a project — it is a
            // property of the device you are reading on.
            { id: "app", label: "App", icon: Palette },
          ].map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                data-tab={t.id}
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

        {/* **Keyed on the tab**, so the scroll position leaves with it.
            One box serves all ten and React keeps its `scrollTop` across a
            switch, so leaving Slots scrolled 42px down opened Counters 42px
            down as well — with the By kind / By category row, the first thing
            you came for, half under the top edge. On a tab whose content runs
            to eighteen hundred pixels the miss is that much larger.

            A key rather than a ref and `scrollTop = 0`: the key says what is
            true — this is a different box, not the same one moved back — and
            it needs no ref, no effect and no second place to remember when a
            tab is added. Remounting costs nothing here, since every tab inside
            already mounts and unmounts on the same switch. */}
        {/* **The bottom edge only.** A row sliced through against the
            footer's hairline reads the same as a row that ends there, which
            is the one thing the panel must not be ambiguous about — so the
            content fades out while there is more below it and stops fading
            the moment there is not.

            The top is left hard on purpose. It is bounded by the tab strip
            rather than by floating chrome, and the Counters tab parks its
            sub-tabs up there on a sticky row: a fade at that end would take
            the one control it is most important to be able to read. */}
        <div
          key={tab}
          ref={attachBody}
          style={{ backgroundColor: c.card, ...edgeFade(false, bodyEnd) }}
          className="tab-fade edge-fade-y overflow-y-auto rounded-b-xl flex-1 min-h-0"
        >
          {/* **The padding is inside the scroller, not on it.**

              `position: sticky` is measured against the scroll container's
              *content* box, so with `p-5` out here every pinned thing in every
              tab parked twenty pixels below the edge you can see — and rows
              scrolling past showed in the band above it, which reads as a
              rendering fault rather than as a panel edge. Two of them were
              already compensating by hand with matched negative values, which
              is a workaround repeated once per sticky element and forgotten on
              the third.

              With the padding on a box inside, the content box and the visible
              edge are the same line: `top-0` means the top, and nothing else
              has to know about it. */}
          <div className="p-5">
          {tab === "tags" && (
            <TagsTab
              settings={settings}
              tags={settings.tags || []}
              units={counterUnits}
              activities={activities}
              onApply={onUpdateProject}
            />
          )}
          {tab === "app" && <AppearanceTab />}
          {tab === "details" && (
            <div className="space-y-5">
              <ProjectDetailsTab
                settings={settings}
                onSave={onSaveSettings}
              />
              {/* A rule, which is otherwise not how this app divides things
                  up — but these are two subjects rather than two groups of
                  one: everything above is *this* project, and everything
                  below is which project you are in at all. A gap alone would
                  have read as one more field. */}
              <div className="border-t border-ink/10 pt-5">
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
              </div>
            </div>
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
          </div>
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
      {/* Capitals label; they do not carry prose. This *is* a label, and
          the sentence under it is set the way the same paragraph is set on
          Tags and Categories — two lines of tracked-out capitals being the
          least readable thing the app can draw. */}
      <span className="block text-[10px] uppercase tracking-widest text-ink/50">
        All projects
      </span>
      <p className="text-[11px] font-mono text-ink/45 leading-relaxed mb-1">
        Each one keeps its own slots, activities and log. Switching closes
        this panel and reopens the logbook on the project you picked.
      </p>
      {projects.map((p) => {
        const active = p.id === activeProjectId
        /* **How many days are in it**, beside the date it started.

           A project's name is not always a name: eight of them called "Time
           tracker" is what a New project button and a busy week produce, and
           until now the only thing separating them was a start date, which
           for projects made in the same fortnight separates nothing. What
           actually tells them apart is which one has anything in it — the
           real logbook has hundreds of days and the accidents have none — and
           that is a number the tab was already holding and not printing. It
           is also what makes the delete button usable: nobody removes a
           project they cannot identify. */
        const logged = Object.keys(p.days || {}).length
        const detail = [
          p.settings.startDate
            ? fmtDateLong(p.settings.startDate)
            : "No start date",
          p.settings.endDate ? `→ ${fmtDateLong(p.settings.endDate)}` : null,
          logged ? `${logged} day${logged === 1 ? "" : "s"} logged` : "empty",
        ]
          .filter(Boolean)
          .join(" · ")
        const face = (
          <>
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: active ? c.ink : `${c.ink}0D`,
                color: active ? c.page : c.ink,
              }}
            >
              <RenderIcon name={p.settings.projectIcon} size={16} />
            </span>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-bold truncate">
                {p.settings.projectName || "Untitled project"}
              </div>
              <div className="text-[10px] text-ink/40 truncate">{detail}</div>
            </div>
          </>
        )
        return (
          <div
            key={p.id}
            /* **No scrolling to the active one, deliberately.** The list
               used to jump to it on the way in, because on sixteen projects
               the one you were in was as likely as not below the fold and the
               tab opened on rows you were not looking at. It shares the tab
               with the project's own name and dates now, which answers that
               question higher up and without moving anything — and the jump
               would land past the block you actually came for. */
            className={`rounded-xl flex items-center gap-2.5 pr-2.5 ${active ? "bg-ink/[0.10]" : "bg-ink/[0.04]"}`}
          >
            {/* **The row is the switch**, rather than carrying one.

                This is a list you pick from, and a button per line put ten
                identical accent-filled rectangles down the right-hand edge —
                a column of colour saying nothing except that there are ten of
                them, while the thing you were actually reading, the name, was
                not clickable. The active row is a `div` rather than a
                disabled button: there is nowhere for it to take you. */}
            {active ? (
              <div className="flex-1 min-w-0 flex items-center gap-2.5 p-2.5">
                {face}
              </div>
            ) : (
              <button
                onClick={() => onSwitch(p.id)}
                className={`${btnBase} flex-1 min-w-0 flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-ink/[0.04]`}
              >
                {face}
              </button>
            )}
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
                {active && (
                  <span
                    className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${c.accent}1A`, color: c.accent }}
                  >
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
          {/* Portalled, for the reason the same picker in `EditableList` is:
              an `absolute` panel inside the panel's scroll area is clipped by
              it, and this tab now has a list of projects under it to scroll.
              The border moves to a span inside the button, since the trigger's
              class is the popover's to set. */}
          <PopoverMenu
            width={256}
            label="Project icon"
            wrapClassName="shrink-0"
            triggerClassName={`${btnBase} rounded-xl hover:opacity-75`}
            trigger={
              <span
                className="w-10 h-10 rounded-xl border-2 flex items-center justify-center"
                style={{ borderColor: c.accent, color: c.accent }}
              >
                <RenderIcon name={projectIcon} size={18} />
              </span>
            }
          >
            {(close) => (
              <div>
                <p className="text-[9px] uppercase tracking-widest text-ink/40 mb-1.5">
                  Project icon
                </p>
                <IconGrid
                  value={projectIcon}
                  onPick={(name) => {
                    setProjectIcon(name)
                    close()
                  }}
                />
              </div>
            )}
          </PopoverMenu>
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

