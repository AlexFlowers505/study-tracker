/* ---------------------------------------------------------------
   Setup's Achievements tab — the things you are trying to reach.

   Built like the Streaks tab and deliberately so: a summary with an Edit
   button, a draft that writes nothing until Done, a Done that refuses exactly
   when the lock does, and the action row stuck to the foot of the modal. An
   achievement is a promise about a number, and a promise you can quietly lower
   on a bad evening is not one.

   **Two questions, not one dropdown** — `spec 014`. A run of days that went
   well and a total of something you recorded are different kinds of thing, and
   every field below depends on which you are answering. This used to be a
   single `<select>` with optgroups holding kept days, every rule and every
   counter in the project: the exact "grouped is not choosing" failure the
   rules form was rebuilt to escape, and the same fix — ask the kind first, and
   the second list is short enough to read.
--------------------------------------------------------------- */

import { useState } from "react"
import type { ReactNode } from "react"
import {
  Lock,
  Pencil,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import type {
  Achievement,
  AchievementRun,
  AchievementWindow,
  Project,
  Settings,
  StreakTarget,
} from "../types/model"
import {
  achievementEdit,
  achievementSentence,
  achievementTargets,
  earnedOn,
  fmtProgress,
  measureOf,
  newAchievement,
  progressOf,
  runOf,
} from "../lib/achievements"
import { t, useT } from "../lib/i18n"
import { LOCK_DAYS, lockFrom, removalGate, streakContext } from "../lib/customStreaks"
import type { StreakContext } from "../lib/customStreaks"
import { WEEKDAY_LABELS, WEEKDAY_ORDER, fmtDateLong, toKey } from "../lib/date"
import { BTN_SOFT, FIELD_SOFT_INLINE, btnBase, cellSurface } from "../lib/theme"
import { AutoTextarea } from "../ui/controls"
import { EditableList } from "../ui/EditableList"
import { Fold } from "../ui/Fold"
import { Pills } from "../ui/Pills"
import { Sentence } from "../ui/Sentence"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"
import { CountersPicker } from "./CountersPicker"
import { WORD } from "./countersPick"

const NUM = `${FIELD_SOFT_INLINE} w-20 rounded-lg py-1 text-[11px] text-center`
const SELECT = `${FIELD_SOFT_INLINE} field-sizing-content min-w-32 max-w-52 rounded-lg py-1 text-[11px]`

/* A getter: a module-level table is built once at import and would stay
   English for the life of the tab. */
const windowLabel = (w: AchievementWindow): string =>
  t(
    {
      ever: "Ever, in all",
      month: "In a single month",
      week: "In a single week",
      day: "In a single day",
    }[w],
  )

/** Paragraph by paragraph — see `lib/locales/ru.ts` for why. */
const lockHelp = () =>
  [
    t("Raising a threshold lands at once — it can only ever cost you more. Lowering one waits a week, like loosening a rule, and so does swapping what is counted: a hundred hours of lessons and a hundred gym visits are not two points on one scale, so the change cannot be classified and waits."),
    t("Asking for them in a row rather than in all is harder, so it lands. Narrowing the window is harder, so that lands too. Widening either waits."),
    t("The day you write one is yours to get it right on."),
  ].join(String.fromCharCode(10, 10))

/** What a fresh total points at — the project's own first activity. */
const seedTarget = (ctx: StreakContext): StreakTarget =>
  ctx.activities[0]
    ? { kind: "activity", id: ctx.activities[0].id }
    : ctx.units[0]
      ? { kind: "unit", id: ctx.units[0].id }
      : { kind: "time" }

const daysSummary = (weekdays: number[] | undefined): string =>
  !weekdays?.length || weekdays.length === WEEKDAY_ORDER.length
    ? t("every day")
    : weekdays.map((wd) => WEEKDAY_LABELS[wd]).join(", ")

/** One labelled field, with the label above it — the rule form's `Row`. */
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1">
    {label && (
      <span className="block text-[9px] font-mono uppercase tracking-widest text-ink/40">
        {label}
      </span>
    )}
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {children}
    </div>
  </div>
)


/**
 * Hours and minutes, never a box of raw minutes.
 *
 * The rule form learned this and the achievements form had not: typing `180`
 * for three hours is arithmetic the app exists to do, and the figure it echoes
 * back underneath is the answer rather than a second way of saying the same
 * thing.
 */
function HoursMinutes({
  minutes,
  onChange,
}: {
  minutes: number
  onChange: (next: number) => void
}) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const set = (hours: number, mins: number) =>
    onChange(Math.max(0, hours) * 60 + Math.max(0, Math.min(59, mins)))
  return (
    <>
      <input
        type="number"
        min={0}
        value={h}
        onChange={(e) => set(Number(e.target.value) || 0, m)}
        className={NUM}
      />
      <span className={WORD}>h</span>
      <input
        type="number"
        min={0}
        max={59}
        value={m}
        onChange={(e) => set(h, Number(e.target.value) || 0)}
        className={NUM}
      />
      <span className={WORD}>m</span>
    </>
  )
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
  const t = useT()
  const [draft, setDraft] = useState<Achievement | null>(null)
  const [reason, setReason] = useState("")
  const settingUp = toKey(today) === item.createdOn
  const locked = !settingUp && toKey(today) < item.lockedUntil
  const badge = project.earned?.[item.id]
  const ctx = streakContext(project)
  const rules = project.settings.streakRules || []

  if (!draft) {
    const measure = measureOf(project, item)
    const value = progressOf(project, item, today)
    return (
      <div className="space-y-1.5 pl-1 pt-1">
        <p className="text-[11px] font-mono text-ink/70">
          <Sentence text={achievementSentence(project, item)} />
        </p>
        <p className="text-[10px] font-mono text-ink/40">
          {badge
            ? `Earned ${fmtDateLong(earnedOn(badge.earnedAt))}${
                badge.reward ? ` · paid ${badge.reward} points` : ""
              }`
            : `${fmtProgress(value, measure)} so far${
                item.reward ? ` · worth ${item.reward} points` : ""
              }`}
        </p>
        {/* **Reached, so there is nothing left to edit.**

            Not a disabled Edit button: a control that refuses when pressed and
            one that is absent say the same thing, and only the absent one says
            it before you reach for it. What replaces it is the reason, because
            *why can I not change this* is the question a missing button always
            raises — the ledger recorded what this was worth at the moment it
            was reached and the account has already been paid, so a definition
            that moved afterwards would leave the badge and the sentence
            describing it disagreeing, with the points behind whichever you
            happened not to be reading.

            The name, the colour and the icon are above this block and stay
            open, the same line the rules draw between a term and a label. */}
        {badge ? (
          <p className="flex items-center gap-1.5 pt-0.5 text-[9px] font-mono uppercase tracking-widest text-ink/35">
            <ShieldCheck size={11} style={{ color: c.goalMet }} />
            {t(
              "Reached — its terms are settled. Delete is the only way back, and it takes the record and the points with it.",
            )}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
            <button
              type="button"
              onClick={() => {
                setReason("")
                setDraft(item)
              }}
              className={`${btnBase} ${BTN_SOFT} flex items-center gap-1 py-1.5`}
            >
              <Pencil size={10} /> {t("Edit")}
            </button>
            <Tip multiline text={lockHelp()}>
              <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-ink/35 cursor-help underline decoration-dotted underline-offset-2">
                <Lock size={10} />
                {settingUp
                  ? t("Being set up — open until tomorrow")
                  : locked
                    ? `Raising only until ${fmtDateLong(item.lockedUntil)}`
                    : t("Open to any change")}
              </span>
            </Tip>
          </div>
        )}
      </div>
    )
  }

  const edit = achievementEdit(item, draft, LOCK_DAYS, today, reason, !!badge)
  const measure = measureOf(project, draft)
  const run = runOf(draft.source)
  const targets = achievementTargets(draft.source)
  const window =
    (draft.source.kind === "total" && draft.source.window) || "ever"

  const setRun = (patch: Partial<AchievementRun>) =>
    setDraft({
      ...draft,
      source: {
        kind: "run",
        run: { ...(run ?? { consecutive: true, scale: "day" }), ...patch },
      },
    })

  return (
    <div className="@container space-y-2 pl-1 pt-1">
      {/* **What kind of thing this is, first.** Every field below depends on
          the answer, the same way the rule form asks for the scope before it
          asks for anything else. */}
      <Row label={t("Counting")}>
        <Pills<"run" | "total">
          value={run ? "run" : "total"}
          onChange={(next) =>
            setDraft({
              ...draft,
              source:
                next === "run"
                  ? { kind: "run", run: { consecutive: true, scale: "day" } }
                  : {
                      kind: "total",
                      targets: [seedTarget(ctx)],
                      window: "ever",
                    },
              /* A count of days and a count of hours are not two points on one
                 scale, so carrying the figure across would attach a number to
                 the wrong thing — the same reason a condition clears its
                 figures when its target changes. */
              threshold: next === "run" ? 30 : 60,
            })
          }
          options={[
            { id: "run", label: t("Days that went well") },
            { id: "total", label: t("Something you recorded") },
          ]}
        />
      </Row>

      {run && (
        <>
          <Row label={t("Whose verdict")}>
            <select
              value={run.ruleId ?? ""}
              onChange={(e) => setRun({ ruleId: e.target.value || undefined })}
              className={SELECT}
            >
              <option value="">{t("Every rule that votes")}</option>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Row>

          {/* **The axis that was missing entirely.** Every source used to be a
              run, so *thirty days of studying* could only mean thirty in a
              row — and thirty of them, whenever they happened, is a different
              and equally real thing to have done. */}
          <Row label={t("Counted")}>
            <Pills<"row" | "all">
              value={run.consecutive ? "row" : "all"}
              onChange={(v) => setRun({ consecutive: v === "row" })}
              options={[
                { id: "row", label: t("In a row") },
                { id: "all", label: t("In all") },
              ]}
            />
            <Pills<"day" | "week">
              value={run.scale}
              onChange={(scale) =>
                // A week has no weekday to filter on, so the filter goes with
                // the scale rather than lingering unread underneath it.
                setRun({
                  scale,
                  weekdays: scale === "week" ? undefined : run.weekdays,
                })
              }
              options={[
                { id: "day", label: t("unit:Days") },
                { id: "week", label: t("unit:Weeks") },
              ]}
            />
          </Row>

          {run.scale === "day" && (
            <Fold title={t("Days")} summary={daysSummary(run.weekdays)}>
              {/* A filter on which days are *looked at*, never a bound on
                  them: four Mondays in a row is four Mondays with no broken
                  Monday between them, whatever the Tuesdays did. */}
              <Row label={t("Counting only")}>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAY_ORDER.map((wd) => {
                    const on = !run.weekdays?.length || run.weekdays.includes(wd)
                    return (
                      <button
                        key={wd}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          const all = [...WEEKDAY_ORDER]
                          const current = run.weekdays?.length
                            ? run.weekdays
                            : all
                          const next = current.includes(wd)
                            ? current.filter((d) => d !== wd)
                            : [...current, wd].sort()
                          /* All of them is stored as none of them, so the two
                             ways of saying "every day" collapse into one and
                             the lock cannot read a no-op as an edit. */
                          setRun({
                            weekdays:
                              next.length === all.length || !next.length
                                ? undefined
                                : next,
                          })
                        }}
                        style={
                          on
                            ? {
                                backgroundColor: `${c.accent}24`,
                                color: c.accent,
                              }
                            : undefined
                        }
                        className={`${btnBase} px-2 py-1 rounded-full text-[10px] font-mono ${
                          on ? "font-bold" : "text-ink/35 hover:text-ink/70"
                        }`}
                      >
                        {WEEKDAY_LABELS[wd]}
                      </button>
                    )
                  })}
                </div>
              </Row>
            </Fold>
          )}
        </>
      )}

      {!run && (
        <>
          <Row label="">
            <CountersPicker
              targets={targets}
              ctx={ctx}
              onChange={(next) =>
                setDraft({
                  ...draft,
                  source: { kind: "total", targets: next, window },
                })
              }
            />
          </Row>

          {/* **`ever` makes most totals inevitable**: study at all and you will
              pass a hundred hours, the only question is when, and something you
              cannot fail to earn is a calendar rather than a goal. A window
              turns the same figure into a record — the best single day, week or
              month there has ever been. Folded, because `ever` is still the
              common answer and a thousand hours in all is worth marking. */}
          <Fold title={t("Over")} summary={windowLabel(window)}>
            <Row label={t("Counted")}>
              <Pills<AchievementWindow>
                value={window}
                onChange={(next) =>
                  setDraft({
                    ...draft,
                    source: { kind: "total", targets, window: next },
                  })
                }
                options={(
                  ["ever", "month", "week", "day"] as AchievementWindow[]
                ).map((w) => ({ id: w, label: windowLabel(w) }))}
              />
            </Row>
          </Fold>
        </>
      )}

      {/* **What it pays.** Set per achievement, because what one is worth is
          a judgement about that one — six that mean something are not six
          equal things. The lock reads it backwards from the threshold above:
          asking more points for the same work is a loosening of the bargain
          even though the bar has not moved. */}
      <Row label={t("Worth")}>
        <input
          type="number"
          min={0}
          value={draft.reward ?? 0}
          onChange={(e) =>
            setDraft({
              ...draft,
              reward: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className={NUM}
        />
        <span className={WORD}>points</span>
      </Row>

      <Row label={t("Reaching")}>
        {measure === "time" ? (
          <HoursMinutes
            minutes={draft.threshold}
            onChange={(n) => setDraft({ ...draft, threshold: n })}
          />
        ) : (
          <>
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
              {run ? (run.scale === "week" ? "weeks" : "days") : "times"}
            </span>
          </>
        )}
      </Row>

      {/* The whole thing read back, from the same function the summary uses.
          Checking that what you built is what you meant is the entire job, and
          two sentences that can drift check nothing. */}
      <p className="text-[10px] font-mono text-ink/45 leading-relaxed pt-0.5">
        <Sentence text={achievementSentence(project, draft)} />
      </p>

      {/* Only when it is going the easy way. Asking you to justify raising your
          own bar would be asking the wrong question. */}
      {edit.changed && !edit.settingUp && !edit.narrowing && (
        <Row label={t("Because")}>
          <AutoTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("Why it is asking for less")}
            rows={1}
            maxHeight={120}
            className={`${FIELD_SOFT_INLINE} w-full rounded-lg py-1 text-[11px]`}
          />
        </Row>
      )}

      {/* Stuck to the foot of the modal, like the rule form's. With a window,
          a weekday row and a threshold above it, the way out was below the
          field you were changing. */}
      <div
        style={cellSurface(`${c.ink}0A`, c.card)}
        className="sticky bottom-0 z-20 -mx-1 px-3 py-2 mt-1 rounded-xl ring-1 ring-ink/10 shadow-lg flex flex-wrap items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setDraft(null)}
          className={`${btnBase} px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wide text-ink/55 hover:text-ink hover:bg-ink/5`}
        >
          {t("Cancel")}
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
          {t("Done")}
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
              ? t("Today is yours to get this right on.")
              : t("This only asks for more.")}
          </span>
        )}
        {edit.needsReason && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-ink/50">
            <TriangleAlert size={11} />
            Say why first. It goes on the record.
          </span>
        )}
        {edit.changed &&
          !edit.settingUp &&
          !edit.narrowing &&
          !edit.needsReason && (
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
  supervised = false,
  onProposeRemoval,
  today = new Date(),
}: {
  project: Project
  settings: Settings
  /** The list, plus the ids whose earned records go with them. */
  onSave: (achievements: Achievement[], forget: string[]) => void
  /** Whether this project's loosenings need a second yes. */
  supervised?: boolean
  /** A rule or an achievement sent to be dropped, rather than dropped. */
  onProposeRemoval?: (
    subject: "rule" | "achievement",
    subjectId: string,
    subjectLabel: string,
    beforeText: string,
    reason: string,
  ) => void
  today?: Date
}) {
  const c = usePalette()
  const items = settings.achievements || []

  /* **Records whose achievement is gone.**
   *
   * Deleting one takes its record with it now, but that is only true from
   * here on: anything deleted before this was written left a row behind, and
   * that row goes on paying into the balance for something there is no longer
   * any way to name, read back or check. The points are real and spendable,
   * which is exactly why they cannot simply be swept away on load — a balance
   * that quietly drops on a Tuesday is indistinguishable from a bug.
   *
   * So it is a block that appears only when there is something to say, names
   * what it is about to take, and waits to be pressed. It reuses the same
   * write the delete button does, so there is one path out and not two.
   */
  const orphans = Object.values(project.earned || {}).filter(
    (b) => !items.some((a) => a.id === b.achievementId),
  )
  const orphanPoints = orphans.reduce(
    (sum, b) => sum + Math.max(0, Number(b.reward) || 0),
    0,
  )

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-mono text-ink/45 leading-relaxed">
        The one thing here you cannot lose. A streak is what you are afraid to
        break and an achievement is what the fear was for — written once, with
        its date, and never un-earned. Keep them few: six that mean something
        are worth more than thirty that were generated.
      </p>

      {orphans.length > 0 && (
        <div
          className="rounded-xl p-2.5 space-y-1.5"
          style={{ backgroundColor: `${c.exam}14` }}
        >
          {/* One whole sentence per case rather than a plural spliced into
              the middle of one: "One record here belong to achievements" is
              what splicing gets you, and it is the sort of seam that makes a
              reader distrust the figure beside it. */}
          <p className="text-[11px] font-mono text-ink/70 leading-relaxed">
            {orphans.length === 1
              ? t(
                  "One record here belongs to an achievement that no longer exists",
                )
              : t("{n} records here belong to achievements that no longer exist", {
                  n: orphans.length,
                })}
            {orphanPoints === 0
              ? "."
              : orphanPoints === 1
                ? t(", and 1 point is still on your balance because of it.")
                : t(
                    ", and {n} points are still on your balance because of them.",
                    { n: orphanPoints },
                  )}
          </p>
          <p className="text-[10px] font-mono text-ink/40 leading-relaxed">
            {t(
              "Deleting an achievement takes its record with it. These are older than that rule, and nothing on the page can name what they were for.",
            )}
          </p>
          <button
            type="button"
            onClick={() => onSave(items, orphans.map((b) => b.achievementId))}
            style={{ color: c.exam }}
            className={`${btnBase} ${BTN_SOFT} flex items-center gap-1 py-1.5`}
          >
            <Trash2 size={10} />
            {orphanPoints
              ? t("Remove them and the {n} points", { n: orphanPoints })
              : t("Remove them")}
          </button>
        </div>
      )}

      <EditableList<Achievement>
        items={items}
        /* **Removals carry their records out with them**, in the same write.
           `EditableList` hands back the list it wants; whatever left it is
           what has to be forgotten, and working it out here rather than at the
           delete button means nothing can remove an achievement by another
           route and leave its badge behind. */
        onChange={(achievements) =>
          onSave(
            achievements,
            items
              .filter((a) => !achievements.some((n) => n.id === a.id))
              .map((a) => a.id),
          )
        }
        noun="achievement"
        minItems={0}
        newItem={() => newAchievement(today)}
        /* **The record goes with it, and the points go with the record.**
           This used to promise the opposite — *if it was already earned the
           record of that stays* — which is true of a badge you can still see
           and false of one whose achievement no longer exists: it went on
           paying into the balance for something there was no longer any way
           to name, read back or check. */
        warningNote={(label) =>
          `Remove "${label}"? If it was already earned, that record and the points it paid go with it. This cannot be undone.`
        }
        /* The same gates a rule's removal walks. An achievement has no
           supervisor channel of its own yet — proposals are keyed to rules —
           so `supervised` is false here and the clock and the reason are what
           it has. */
        /* The same gates a rule's removal walks — the grace day, the clock,
           the reason, then the second pair of eyes. It had no supervisor
           channel of its own until `Proposal` stopped being about rules only;
           now the same request carries all four combinations. */
        removeGate={(item, reason) =>
          removalGate(item, today, reason, supervised)
        }
        onProposeRemove={(item, reason) =>
          onProposeRemoval?.(
            "achievement",
            item.id,
            item.label,
            achievementSentence(project, item),
            reason,
          )
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
