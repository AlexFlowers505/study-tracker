/* ---------------------------------------------------------------
   The other side — what a supervisor sees.

   Loosenings somebody has asked you to allow, and **nothing else**. No days,
   no log, no counters, no streaks: the request carries everything the decision
   needs, which is exactly what lets every other table in the database keep the
   policy it has always had. See the header of `migrations/018`.

   It sits above the page rather than behind a toggle, because a request nobody
   looks at is a lock nobody has. Once there is nothing pending it disappears
   entirely.

   **Refusing is the heavier button and it is drawn as the plainer one.** The
   asymmetry is in the consequence, not in the styling: a refusal restarts the
   asker's week, and dressing that up as the exciting option would be inviting
   a click that costs somebody else seven days.
--------------------------------------------------------------- */

import { ShieldCheck } from "lucide-react"
import type { RuleProposal } from "../types/model"
import { fmtDateLong } from "../lib/date"
import { CARD, btnBase } from "../lib/theme"
import { usePalette } from "../ui/useTheme"

export function SupervisorSection({
  proposals,
  onDecide,
}: {
  /** Only the pending ones reach here; the rest are somebody else's history. */
  proposals: RuleProposal[]
  onDecide: (proposal: RuleProposal, allow: boolean) => void
}) {
  const c = usePalette()
  if (!proposals.length) return null

  return (
    <section className="mb-4 space-y-2">
      <div className="flex items-center gap-2">
        <span style={{ color: c.sleep }} className="flex items-center">
          <ShieldCheck size={14} />
        </span>
        <h2 className="font-sans font-extrabold uppercase tracking-tight text-sm">
          Waiting on you
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-widest text-ink/40">
          {proposals.length} to decide
        </span>
      </div>

      {proposals.map((p) => (
        <div
          key={p.id}
          className={CARD}
          style={{ boxShadow: `inset 0 0 0 1px ${c.sleep}44` }}
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-2">
            <span
              className="text-[11px] font-mono font-bold uppercase tracking-wide"
              style={{ color: c.sleep }}
            >
              {p.ruleLabel}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-ink/40">
              in {p.projectName}
            </span>
            <span className="ml-auto text-[10px] font-mono text-ink/35">
              asked {fmtDateLong(p.createdAt.slice(0, 10))}
            </span>
          </div>

          {/* Before and after in full. A diff of two sentences is something a
              person can actually judge; a diff of two JSON blobs is not. */}
          <div className="space-y-1.5 mb-3">
            <p className="text-[11px] font-mono text-ink/40 line-through decoration-ink/25">
              {p.beforeText}
            </p>
            <p className="text-[11px] font-mono text-ink/80">{p.afterText}</p>
          </div>

          <p className="text-[11px] font-mono text-ink/55 italic mb-3">
            “{p.reason}”
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onDecide(p, true)}
              className={`${btnBase} px-3 py-2 rounded-full text-[10px] font-mono uppercase tracking-widest`}
              style={{ backgroundColor: c.sleep, color: c.onFill }}
            >
              Allow it
            </button>
            <button
              type="button"
              onClick={() => onDecide(p, false)}
              className={`${btnBase} px-3 py-2 rounded-full text-[10px] font-mono uppercase tracking-widest bg-ink/[0.06] text-ink/60 hover:text-ink hover:bg-ink/10`}
            >
              Say no
            </button>
            <span className="text-[10px] font-mono text-ink/35">
              Saying no restarts their week.
            </span>
          </div>
        </div>
      ))}
    </section>
  )
}
