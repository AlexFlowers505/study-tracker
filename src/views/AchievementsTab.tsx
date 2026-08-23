/* ---------------------------------------------------------------
   Setup's Achievements tab — the things you are trying to reach.

   Built like the Streaks tab and deliberately so: a summary with an Edit
   button, a draft that writes nothing until Done, and a Done that refuses
   exactly when the lock does. An achievement is a promise about a number, and
   a promise you can quietly lower on a bad evening is not one.

   **Three sources and no more.** The composite streak, one rule's own streak,
   and everything ever gathered against a target. Every one is a figure the app
   already computes; a wider list would make this a second rule builder, and
   this app has exactly one of those on purpose.
--------------------------------------------------------------- */

import { useState } from "react"
import { Lock, Pencil, ShieldCheck, TriangleAlert } from "lucide-react"
import type {
  Achievement,
  AchievementSource,
  Project,
  Settings,
  StreakTarget,
} from "../types/model"
import {
  achievementEdit,
  earnedOn,
  fmtProgress,
  measureOf,
  newAchievement,
  progressOf,
} from "../lib/achievements"
import { LOCK_DAYS, lockFrom, streakContext, targetInfo } from "../lib/customStreaks"
import { fmtDateLong, toKey } from "../lib/date"
import { BTN_SOFT, FIELD_SOFT_INLINE, btnBase } from "../lib/theme"
import { EditableList } from "../ui/EditableList"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

const NUM = `${FIELD_SOFT_INLINE} w-20 rounded-lg py-1 text-[11px] text-center`
const SELECT = `${FIELD_SOFT_INLINE} max-w-52 rounded-lg py-1 text-[11px]`
const WORD = "text-[11px] font-mono text-ink/55"

const LOCK_HELP =
  "Raising a threshold lands at once — it can only ever cost you more. " +
  "Lowering one waits a week, like loosening a rule, and so does swapping " +
  "what is counted: a hundred hours of lessons and a hundred gym visits are " +
  "not two points on one scale, so the change cannot be classified and waits." +
  String.fromCharCode(10, 10) +
  "The day you write one is yours to get it right on."

/** `kind`, or `rule:<id>`, or `target:<kind>:<id>` — one value for one select. */
const encode = (source: AchievementSource): string =>
  source.kind === "keptDays"
    ? "keptDays"
    : source.kind === "ruleStreak"
      ? `rule:${source.ruleId}`
      : `target:${source.target.kind}:${source.target.id || ""}`

function decode(value: string): AchievementSource {
  if (value === "keptDays") return { kind: "keptDays" }
  if (value.startsWith("rule:"))
    return { kind: "ruleStreak", ruleId: value.slice(5) }
  const [, kind, id] = value.split(":")
  const target = (
    kind === "time" ? { kind: "time" } : { kind, id }
  ) as StreakTarget
  return { kind: "total", target }
}

const ruleName = (project: Project, ruleId: string) =>
  (project.settings.streakRules || []).find((r) => r.id === ruleId)?.label ||
  "a deleted rule"

/** The achievement said back, the way `clauseSentence` says a rule back. */
function sentenceFor(project: Project, a: Achievement): string {
  const amount = fmtProgress(a.threshold, measureOf(project, a))
  if (a.source.kind === "keptDays") return `Reach ${amount} kept days in a row`
  if (a.source.kind === "ruleStreak")
    return `Reach ${amount} in a row on ${ruleName(project, a.source.ruleId)}`
  const info = targetInfo(a.source.target, streakContext(project))
  return `Gather ${amount} of ${info.qualified} in all`
}

function Form({
  project,
  item,
  onChange,
  today,
}: {
  project: Project
  item: Achievement
  onChange: (next: Achievement) => void
  today: Date
}) {
  const c = usePalette()
  const [draft, setDraft] = useState<Achievement | null>(null)
  const settingUp = toKey(today) === item.createdOn
  const locked = !settingUp && toKey(today) < item.lockedUntil
  const ctx = streakContext(project)
  const rules = project.settings.streakRules || []

  if (!draft) {
    const measure = measureOf(project, item)
    const value = progressOf(project, item, today)
    return (
      <div className="space-y-1.5 pl-1 pt-1">
        <p className="text-[11px] font-mono text-ink/70">
          {sentenceFor(project, item)}
        </p>
        <p className="text-[10px] font-mono text-ink/40">
          {project.earned?.[item.id]
            ? `Earned ${fmtDateLong(earnedOn(project.earned[item.id].earnedAt))}`
            : `${fmtProgress(value, measure)} so far`}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
          <button
            type="button"
            onClick={() => setDraft(item)}
            className={`${btnBase} ${BTN_SOFT} flex items-center gap-1 py-1.5`}
          >
            <Pencil size={10} /> Edit
          </button>
          <Tip multiline text={LOCK_HELP}>
            <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-ink/35 cursor-help underline decoration-dotted underline-offset-2">
              <Lock size={10} />
              {settingUp
                ? "Being set up — open until tomorrow"
                : locked
                  ? `Raising only until ${fmtDateLong(item.lockedUntil)}`
                  : "Open to any change"}
            </span>
          </Tip>
        </div>
      </div>
    )
  }

  const edit = achievementEdit(item, draft, LOCK_DAYS, today)
  const measure = measureOf(project, draft)

  return (
    <div className="space-y-2 pl-1 pt-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="w-16 shrink-0 text-[9px] font-mono uppercase tracking-widest text-ink/40">
          Counting
        </span>
        <select
          value={encode(draft.source)}
          onChange={(e) => setDraft({ ...draft, source: decode(e.target.value) })}
          className={SELECT}
        >
          <option value="keptDays">Kept days in a row</option>
          {rules.length > 0 && (
            <optgroup label="One rule's streak">
              {rules.map((r) => (
                <option key={r.id} value={`rule:${r.id}`}>
                  {r.label}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Everything gathered">
            <option value="target:time:">All study time</option>
            {ctx.activities.map((a) => (
              <option key={a.id} value={`target:activity:${a.id}`}>
                {a.label}
              </option>
            ))}
            {ctx.units.map((u) => (
              <option key={u.id} value={`target:unit:${u.id}`}>
                {u.label}
              </option>
            ))}
            {ctx.tags.map((t) => (
              <option key={t.id} value={`target:tag:${t.id}`}>
                {t.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="w-16 shrink-0 text-[9px] font-mono uppercase tracking-widest text-ink/40">
          Reaching
        </span>
        <input
          type="number"
          min={1}
          value={draft.threshold}
          onChange={(e) =>
            setDraft({
              ...draft,
              threshold: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className={NUM}
        />
        <span className={WORD}>
          {measure === "time" ? "minutes" : "in a row or in all"}
        </span>
        {measure === "time" && (
          <span className="text-[10px] font-mono text-ink/40">
            = {fmtProgress(draft.threshold, "time")}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => setDraft(null)}
          className={`${btnBase} px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wide text-ink/55 hover:text-ink hover:bg-ink/5`}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!edit.allowed}
          onClick={() => {
            onChange(edit.next)
            setDraft(null)
          }}
          className={`${btnBase} px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed`}
          style={{ backgroundColor: c.accent, color: c.onFill }}
        >
          Done
        </button>

        {!edit.changed && (
          <span className="text-[10px] font-mono text-ink/40">
            No change to what it asks.
          </span>
        )}
        {edit.changed && (edit.settingUp || edit.narrowing) && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/50">
            <ShieldCheck size={11} />
            {edit.settingUp
              ? "Today is yours to get this right on."
              : "This only asks for more."}
          </span>
        )}
        {edit.changed && !edit.settingUp && !edit.narrowing && (
          <span
            className="flex items-center gap-1 text-[10px] font-mono"
            style={{ color: c.exam }}
          >
            <TriangleAlert size={11} />
            {edit.allowed
              ? `This asks for less — saving locks it until ${fmtDateLong(lockFrom(today))}.`
              : `This asks for less. It waits until ${fmtDateLong(item.lockedUntil)}.`}
          </span>
        )}
      </div>
    </div>
  )
}

export function AchievementsTab({
  project,
  settings,
  onSave,
  today = new Date(),
}: {
  project: Project
  settings: Settings
  onSave: (next: Settings) => void
  today?: Date
}) {
  const items = settings.achievements || []
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-mono text-ink/45 leading-relaxed">
        The one thing here you cannot lose. A streak is what you are afraid to
        break and an achievement is what the fear was for — written once, with
        its date, and never un-earned. Keep them few: six that mean something
        are worth more than thirty that were generated.
      </p>

      <EditableList<Achievement>
        items={items}
        onChange={(achievements) => onSave({ ...settings, achievements })}
        noun="achievement"
        minItems={0}
        newItem={() => newAchievement(today)}
        warningNote={(label) =>
          `Remove "${label}"? If it was already earned the record of that stays — it happened. Only the definition goes.`
        }
        extra={(item, update) => (
          <Form
            project={project}
            item={item}
            today={today}
            onChange={(next) => update(next)}
          />
        )}
      />
    </div>
  )
}
