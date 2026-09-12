/* ---------------------------------------------------------------
   The second person — `spec 010`, part 7.

   The lock's own help text has always said the point out loud: *be the person
   who set the limit, not the person living under it.* A second person is the
   furthest that idea goes, and the shape matters — **they approve, they do not
   edit.** You still author your own rules. You simply cannot weaken one alone.

   **Two gates in series, not one instead of the other.** The clock still has
   to run out before a request can even be sent, and then it still has to be
   allowed. A supervisor makes loosening *harder*, which is the entire reason
   to have one.

   **A refusal restarts the clock; withdrawing your own request does not.**
   Changing your mind is free; being told no is expensive. Without that
   asymmetry the rate limit is decorative — you would simply ask again on the
   same evening.

   **A proposal is self-describing.** It carries the project's name, the rule's
   label and the terms before and after as text, so the decision needs nothing
   from the project itself. That is what lets every other table keep the policy
   it has always had. See the header of `migrations/018`.
--------------------------------------------------------------- */

import type {
  Achievement,
  Project,
  Proposal,
  ProposalAction,
  ProposalSubject,
  StreakRule,
} from "../types/model"
import {
  clauseScope,
  clauseSentence,
  isMixed,
  lockFrom,
  ruleClauses,
  withRevision,
} from "./customStreaks"
import type { StreakContext } from "./customStreaks"
import { toKey } from "./date"
import { makeId } from "./id"
import { t } from "./i18n"

/** Whether this project's loosenings need a second yes. */
export const hasSupervisor = (project: Project): boolean =>
  (project.supervisors || []).length > 0

/** The pending request about one rule or achievement. Only ever one. */
export const pendingFor = (
  project: Project,
  subjectId: string,
): Proposal | undefined =>
  Object.values(project.proposals || {}).find(
    (p) => p.subjectId === subjectId && p.state === "pending",
  )

/** Approved and waiting for the owner's app to write it into the rules. */
export const approvedProposals = (project: Project): Proposal[] =>
  Object.values(project.proposals || {}).filter((p) => p.state === "approved")

/** Decided, seen, and worth showing once — refusals the owner has not read. */
export const refusedProposals = (project: Project): Proposal[] =>
  Object.values(project.proposals || {}).filter((p) => p.state === "refused")

/** The whole rule in words, the same sentence the panel and the tab read. */
export const ruleText = (rule: StreakRule, ctx: StreakContext): string => {
  const when = isMixed(rule)
    ? t("Every day and every week")
    : t(rule.scope === "week" ? "Every week" : "Every day")
  const parts = ruleClauses(rule).map((clause) =>
    clauseSentence(clause, ctx, clauseScope(clause, rule)),
  )
  return `${when}: ${parts.join("; ")}. ${rule.freezesPerWeek} freezes a week, banking up to ${rule.freezeCap}.`
}

/**
 * The request itself, carrying everything the decision needs.
 *
 * The text is generated here rather than by the supervisor's app, because the
 * supervisor's app cannot see the project the rule belongs to — which is the
 * whole reason this stays cheap and safe.
 */
export function proposalFor({
  project,
  subject,
  action,
  subjectId,
  subjectLabel,
  beforeText,
  afterText,
  next,
  reason,
  ownerId,
  supervisorId,
}: {
  project: Project
  subject: ProposalSubject
  action: ProposalAction
  subjectId: string
  subjectLabel: string
  /** How it reads now, and how it would read. Empty `after` on a removal. */
  beforeText: string
  afterText: string
  next?: StreakRule | Achievement
  reason: string
  ownerId: string
  supervisorId: string
}): Proposal {
  return {
    id: makeId("prop"),
    projectId: project.id,
    ownerId,
    supervisorId,
    subject,
    action,
    subjectId,
    projectName: project.settings.projectName || "a project",
    subjectLabel,
    beforeText,
    afterText,
    reason: reason.trim(),
    // Stored without the lock date: the clock is set when it is *applied*, not
    // when it was asked for, or a slow answer would shorten the wait.
    next,
    state: "pending",
    createdAt: new Date().toISOString(),
  }
}

/**
 * The rule as it should be stored once a proposal has been allowed.
 *
 * The lock starts from the day it lands, and the reason goes on the record
 * with the fact that somebody agreed to it — which is the part worth reading
 * back six weeks later.
 *
 * **And so does the revision** — `spec 026`. This is the one path that writes
 * a rule's terms without going through `ruleEdit`, which is exactly why `ctx`
 * is a required argument rather than an optional one: a loosening that lands
 * here and records no revision is a stretch of history with no terms against
 * it, and the gap would be invisible until somebody went looking for the one
 * change they most wanted explained.
 */
export const applyProposal = (
  proposal: Proposal,
  prev: StreakRule,
  ctx: StreakContext,
  today = new Date(),
): StreakRule =>
  withRevision(
    prev,
    {
      ...(proposal.next as StreakRule),
      lockedUntil: lockFrom(today),
      looseningLog: [
        ...(prev.looseningLog || []),
        { at: toKey(today), reason: `${proposal.reason} — allowed` },
      ],
    },
    ctx,
    toKey(today),
  )
