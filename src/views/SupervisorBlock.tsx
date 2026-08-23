/* ---------------------------------------------------------------
   Handing somebody the key, and seeing whether you have.

   Sits at the foot of the Streaks tab because that is what it governs: with a
   supervisor, loosening a rule stops being something you can do alone. It is
   two gates in series, not one instead of the other — the week still has to
   pass before a request can even be sent.

   The link is shown once and copied by hand. No email, no lookup, no directory
   of who uses this app: the token *is* the introduction, which is what keeps
   the whole feature to one new table and no change to any existing policy.
--------------------------------------------------------------- */

import { Copy, ShieldCheck } from "lucide-react"
import { btnBase } from "../lib/theme"
import { Tip } from "../ui/Tip"
import { usePalette } from "../ui/useTheme"

const HELP =
  "With a supervisor, a loosening still waits out its week — and then has to " +
  "be agreed by somebody else before it takes effect. Narrowing a rule is " +
  "untouched: you never need permission to ask more of yourself." +
  String.fromCharCode(10, 10) +
  "They see the request, the rule before and after, and your reason. Nothing " +
  "else — not your log, not your counters, not your streaks." +
  String.fromCharCode(10, 10) +
  "Send the link however you like. Whoever opens it first becomes the " +
  "supervisor, and it works once."

export function SupervisorBlock({
  count,
  url,
  note,
  onMake,
}: {
  count: number
  url: string | null
  note: string | null
  onMake: () => void
}) {
  const c = usePalette()
  return (
    <div className="mt-4 rounded-2xl bg-ink/[0.04] px-3.5 py-3 space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span style={{ color: c.sleep }} className="flex items-center">
          <ShieldCheck size={13} />
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-ink/55">
          Supervisor
        </span>
        <span className="text-[10px] font-mono text-ink/40">
          {count
            ? `${count} — loosening needs their yes`
            : "none — the clock is the only gate"}
        </span>
        <Tip multiline text={HELP}>
          <span className="ml-auto text-[9px] font-mono uppercase tracking-widest text-ink/35 cursor-help underline decoration-dotted underline-offset-2">
            what this means
          </span>
        </Tip>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onMake}
          className={`${btnBase} px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest`}
          style={{ backgroundColor: `${c.sleep}24`, color: c.sleep }}
        >
          {count ? "Another link" : "Create an invite link"}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(url)}
            className={`${btnBase} flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-mono bg-card shadow-sm hover:brightness-105`}
          >
            <Copy size={10} /> Copy
          </button>
        )}
      </div>

      {url && (
        <p className="text-[10px] font-mono text-ink/45 break-all">{url}</p>
      )}
      {note && (
        <p className="text-[10px] font-mono" style={{ color: c.sleep }}>
          {note}
        </p>
      )}
    </div>
  )
}
