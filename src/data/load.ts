/* ---------------------------------------------------------------
   Reading the four tables back into one in-memory document.

   The split stops here: everything above this file sees the same
   `{ activeProjectId, projects: [...] }` object it always did.

   A failed read is NOT an empty account. Every call checks `{ error }` and
   throws, because supabase-js reports failures in the payload rather than
   throwing — and the caller turns that into a dead-end screen that refuses
   to write. The old behaviour opened the setup modal over the defaults, and
   its auto-save then overwrote the real data.
--------------------------------------------------------------- */

import type { AppData, ChangeLogEntry, Project } from "../types/model"
import {
  DEFAULT_ACTIVITIES,
  DEFAULT_SETTINGS,
  DEFAULT_SLOTS,
} from "../lib/defaults"
import { CHANGE_LOG_LIMIT } from "../lib/changelog"
import type { RuleProposal } from "../types/model"
import type { Client } from "./supabase"
import { PAGE_SIZE } from "./supabase"
import { DAY_SELECT, PROPOSAL_SELECT } from "./schema"
import type {
  ChangeLogRow,
  DayRow,
  NoteRow,
  ProjectRow,
  DayMarkRow,
  EarnedRow,
  MemberRow,
  ProposalRow,
  PurchaseRow,
  RuleVerdictRow,
  WeekVerdictRow,
} from "./schema"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Query = any

async function fetchAllRows<T>(makeQuery: () => Query): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await makeQuery().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...((data || []) as T[]))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

/**
 * RLS scopes every one of these to the signed-in user, so none of them needs
 * a `user_id` filter of its own.
 */
export async function loadFromTables(client: Client): Promise<AppData | null> {
  const [
    projectRows,
    dayRows,
    noteRows,
    verdictRows,
    ruleVerdictRows,
    dayMarkRows,
    earnedRows,
    memberRows,
    proposalRows,
    purchaseRows,
    prefs,
  ] =
    await Promise.all([
    fetchAllRows<ProjectRow>(() =>
      client
        .from("projects")
        .select("id,settings,slots,activities,counter_units"),
    ),
    fetchAllRows<DayRow>(() => client.from("days").select(DAY_SELECT)),
    fetchAllRows<NoteRow>(() =>
      client.from("period_notes").select("project_id,kind,key,note,ignored"),
    ),
    fetchAllRows<WeekVerdictRow>(() =>
      client.from("week_verdicts").select("project_id,week_key,earned,sealed_at"),
    ),
    fetchAllRows<RuleVerdictRow>(() =>
      client
        .from("streak_verdicts")
        .select("project_id,rule_id,week_key,kept,sealed_at"),
    ),
    fetchAllRows<DayMarkRow>(() =>
      client.from("day_ledger").select("project_id,date,kept,sealed_at"),
    ),
    fetchAllRows<EarnedRow>(() =>
      client
        .from("achievements")
        .select("project_id,achievement_id,earned_at,value"),
    ),
    fetchAllRows<MemberRow>(() =>
      client.from("project_members").select("project_id,user_id,role"),
    ),
    fetchAllRows<ProposalRow>(() =>
      client.from("rule_proposals").select(PROPOSAL_SELECT),
    ),
    fetchAllRows<PurchaseRow>(() =>
      client
        .from("purchases")
        .select("project_id,purchase_id,item_id,label,price,bought_at"),
    ),
    client.from("user_prefs").select("active_project_id").maybeSingle(),
  ])
  if (prefs.error) throw prefs.error
  if (!projectRows.length) return null

  const byId = new Map<string, Project>()
  projectRows.forEach((r) =>
    byId.set(r.id, {
      id: r.id,
      settings: { ...DEFAULT_SETTINGS, ...(r.settings || {}) },
      slots: Array.isArray(r.slots) && r.slots.length ? r.slots : DEFAULT_SLOTS,
      activities:
        Array.isArray(r.activities) && r.activities.length
          ? r.activities
          : DEFAULT_ACTIVITIES,
      // No defaults to fall back on: an empty list is a real answer here,
      // meaning a project that tallies nothing.
      counterUnits: Array.isArray(r.counter_units) ? r.counter_units : [],
      days: {},
      weekNotes: {},
      monthNotes: {},
      weekIgnore: {},
      monthIgnore: {},
      changeLog: [],
      weekVerdicts: {},
      ruleVerdicts: {},
      dayLedger: {},
      earned: {},
      purchases: {},
      supervisors: [],
      proposals: {},
    }),
  )

  // Outside the Promise.all above, and the only place in this codebase where
  // a missing `{ error }` check is correct: the change log is a convenience,
  // so a project whose log table is absent or unreadable must still open
  // normally with all its real data. supabase-js reports the failure in the
  // payload rather than throwing, so ignoring it leaves `logRows` null and the
  // log simply empty. Do not "fix" this by checking the error — that would put
  // the whole app on the dead-end screen over data nobody typed. The try/catch
  // is only for a network throw.
  try {
    const { data: logRows } = await client
      .from("change_log")
      .select("id,project_id,at,title,details")
      .order("at", { ascending: false })
      .limit(CHANGE_LOG_LIMIT)
    ;((logRows || []) as ChangeLogRow[]).forEach((r) => {
      const p = byId.get(r.project_id)
      if (!p) return
      const entry: ChangeLogEntry = {
        id: r.id,
        at: r.at,
        title: r.title || "",
        details: r.details || [],
      }
      p.changeLog?.push(entry)
    })
  } catch {
    // no log, no problem
  }

  dayRows.forEach((r) => {
    const p = byId.get(r.project_id)
    if (!p) return
    const sleep = r.sleep || []
    p.days[r.date] = {
      cells: r.cells || {},
      ...(sleep.length ? { sleep } : {}),
      counters: r.counters || {},
      checks: r.checks || {},
      ruleFreezes: r.rule_freezes || [],
      lessons: Number(r.lessons) || 0,
      exam: !!r.exam,
      ignore: !!r.ignored,
      frozen: !!r.frozen,
      comment: r.comment || "",
    }
  })

  verdictRows.forEach((r) => {
    const p = byId.get(r.project_id)
    if (!p?.weekVerdicts) return
    p.weekVerdicts[r.week_key] = {
      weekKey: r.week_key,
      earned: !!r.earned,
      sealedAt: r.sealed_at,
    }
  })

  ruleVerdictRows.forEach((r) => {
    const p = byId.get(r.project_id)
    if (!p?.ruleVerdicts) return
    p.ruleVerdicts[`${r.rule_id}::${r.week_key}`] = {
      ruleId: r.rule_id,
      weekKey: r.week_key,
      kept: !!r.kept,
      sealedAt: r.sealed_at,
    }
  })

  dayMarkRows.forEach((r) => {
    const p = byId.get(r.project_id)
    if (!p?.dayLedger) return
    p.dayLedger[r.date] = {
      date: r.date,
      kept: !!r.kept,
      sealedAt: r.sealed_at,
    }
  })

  earnedRows.forEach((r) => {
    const p = byId.get(r.project_id)
    if (!p?.earned) return
    p.earned[r.achievement_id] = {
      achievementId: r.achievement_id,
      earnedAt: r.earned_at,
      value: Number(r.value) || 0,
    }
  })

  purchaseRows.forEach((r) => {
    const p = byId.get(r.project_id)
    if (!p?.purchases) return
    p.purchases[r.purchase_id] = {
      id: r.purchase_id,
      itemId: r.item_id,
      label: r.label || "",
      price: Number(r.price) || 0,
      boughtAt: r.bought_at,
    }
  })

  memberRows.forEach((r) => {
    const p = byId.get(r.project_id)
    // A membership row for a project not among these is one where *you* are
    // the supervisor; nothing there is needed beyond the proposals themselves.
    if (!p?.supervisors || r.role !== "supervisor") return
    p.supervisors.push(r.user_id)
  })

  /**
   * Which side of a proposal you are on needs no user id to work out: the
   * `projects` policy only ever returns projects you own, so a proposal whose
   * project is not among them is one you were asked to decide.
   */
  const supervising: RuleProposal[] = []
  proposalRows.forEach((r) => {
    const proposal: RuleProposal = {
      id: r.id,
      projectId: r.project_id,
      ownerId: r.owner_id,
      supervisorId: r.supervisor_id,
      ruleId: r.rule_id,
      projectName: r.project_name || "",
      ruleLabel: r.rule_label || "",
      beforeText: r.before_text || "",
      afterText: r.after_text || "",
      reason: r.reason || "",
      nextRule: r.next_rule as RuleProposal["nextRule"],
      state: r.state as RuleProposal["state"],
      createdAt: r.created_at,
      decidedAt: r.decided_at,
    }
    const p = byId.get(r.project_id)
    if (p?.proposals) p.proposals[r.id] = proposal
    else supervising.push(proposal)
  })

  noteRows.forEach((r) => {
    const p = byId.get(r.project_id)
    if (!p) return
    const week = r.kind === "week"
    const notes = week ? p.weekNotes : p.monthNotes
    const flags = week ? p.weekIgnore : p.monthIgnore
    if (r.note) notes[r.key] = r.note
    if (r.ignored) flags[r.key] = true
  })

  const projects = [...byId.values()]
  const activeId = prefs.data?.active_project_id
  return {
    activeProjectId: projects.some((p) => p.id === activeId)
      ? activeId
      : projects[0].id,
    projects,
    supervising,
  }
}
