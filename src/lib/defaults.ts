/* ---------------------------------------------------------------
   Defaults, and the normalisers that accept anything ever saved.
--------------------------------------------------------------- */

import type { AppData, Category, Project, Settings, Slot } from "../types/model"
import { toKey } from "./date"
import { makeId } from "./id"
import { dayCounters, legacyUnits } from "./counters"

export const DEFAULT_SLOTS: Slot[] = [
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

export const DEFAULT_CATEGORIES: Category[] = [
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

/** The product name. The mark that goes with it is `TimeLensMark`. */
export const APP_NAME = "TimeLens"

export const STORAGE_KEY = "study-tracker-data"

/**
 * How long to wait for edits to stop before writing. Without it, typing a note
 * meant one upsert per keystroke.
 */
export const SAVE_DEBOUNCE_MS = 1000

/**
 * How long to wait before retrying a failed write. Failures here are usually
 * transient — an expired token the client refreshes, a blip at the provider —
 * so retrying quietly beats making the user re-enter a day.
 */
export const SAVE_RETRY_MS = 5000

export const DEFAULT_SETTINGS: Settings = {
  goalsEnabled: true,
  sleepEnabled: false,
  startDate: null,
  endDate: null,
  projectName: "Time tracker",
  projectIcon: "Train",
  dailyGoals: { 0: 60, 1: 90, 2: 90, 3: 90, 4: 90, 5: 90, 6: 60 },
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: makeId("project"),
    settings: { ...DEFAULT_SETTINGS, startDate: toKey(new Date()) },
    slots: DEFAULT_SLOTS,
    categories: DEFAULT_CATEGORIES,
    // Deliberately empty. A new project tallies nothing until you say what,
    // rather than inheriting two units somebody else's syllabus needed.
    counterUnits: [],
    days: {},
    weekNotes: {},
    monthNotes: {},
    weekIgnore: {},
    monthIgnore: {},
    changeLog: [],
    ...overrides,
  }
}

export function normalizeProject(p: Partial<Project>): Project {
  const settings = { ...DEFAULT_SETTINGS, ...(p.settings || {}) }
  // An export taken before `spec 008` has no units and no day counters, only
  // the old `lessons`/`exam` fields. Rebuild both here, matching what
  // `migrations/009` did to the database, or importing an older backup loses
  // every tally silently.
  const days = p.days || {}
  const migrated = !p.counterUnits
  return {
    id: p.id || makeId("project"),
    settings,
    slots: p.slots && p.slots.length ? p.slots : DEFAULT_SLOTS,
    categories:
      p.categories && p.categories.length ? p.categories : DEFAULT_CATEGORIES,
    counterUnits: p.counterUnits ?? legacyUnits(settings),
    days: migrated
      ? Object.fromEntries(
          Object.entries(days).map(([key, day]) => [
            key,
            { ...day, counters: dayCounters(day) },
          ]),
        )
      : days,
    weekNotes: p.weekNotes || {},
    monthNotes: p.monthNotes || {},
    weekIgnore: p.weekIgnore || {},
    monthIgnore: p.monthIgnore || {},
    changeLog: p.changeLog || [],
  }
}

/**
 * Accepts anything previously saved — the current `{activeProjectId, projects}`
 * shape or the older single-project one — and returns a normalized
 * `{activeProjectId, projects}`, or null if there is nothing usable at all.
 */
export function normalizeData(parsed: unknown): AppData | null {
  if (!parsed || typeof parsed !== "object") return null
  const data = parsed as Partial<AppData> & Partial<Project>
  if (Array.isArray(data.projects) && data.projects.length) {
    const projects = data.projects.map(normalizeProject)
    const activeProjectId = projects.some((p) => p.id === data.activeProjectId)
      ? (data.activeProjectId as string)
      : projects[0].id
    return { activeProjectId, projects }
  }
  if (data.settings || data.days || data.slots) {
    const proj = normalizeProject(data)
    return { activeProjectId: proj.id, projects: [proj] }
  }
  return null
}

/**
 * New installs — nothing saved, no signed-in account — start with one empty
 * project. Real saved data always replaces this.
 */
export function buildInitialData(): AppData {
  const project = makeProject()
  return { activeProjectId: project.id, projects: [project] }
}
