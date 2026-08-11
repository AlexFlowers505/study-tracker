/* ---------------------------------------------------------------
   Which database am I looking at?

   Only ever rendered on localhost, where the question is real: `npm run dev`
   loads .env.development.local and `npm run preview` loads .env.production,
   and the two produce a byte-identical page over completely different data.
   On the deployed site there is nothing to disambiguate, so nothing shows.

   It reports both halves — the mode Vite ran in, and the project ref that
   mode actually resolved to — so a mis-filled env file reads as wrong here
   rather than looking correct until the first save lands somewhere unexpected.
--------------------------------------------------------------- */

import { Database } from "lucide-react"
import { EXAM_COLOR, FREEZE_COLOR, btnBase } from "../lib/theme"
import { PROJECT_REF } from "../data/supabase"
import { Tip } from "../ui/Tip"

const onLocalhost = () =>
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)

export function EnvBadge() {
  if (!onLocalhost()) return null

  const isProd = import.meta.env.PROD
  // Red for production, and not because production is broken: on localhost it
  // is the state worth a second look before you start clicking around.
  const color = isProd ? EXAM_COLOR : FREEZE_COLOR

  return (
    <Tip
      multiline
      // The fixed positioning goes on Tip's own trigger span, not on the badge
      // inside it: a fixed child would collapse the trigger to zero size and
      // the bubble would be measured from the wrong box.
      className="fixed bottom-3 left-3 z-40"
      text={
        (isProd
          ? "Production data — this is your real logbook. Served from a build, so it came from .env.production."
          : "Development data — a separate Supabase project, from .env.development.local. Nothing you do here touches the real logbook.") +
        `\n\nProject ref: ${PROJECT_REF || "unset"}`
      }
    >
      <span
        className={`${btnBase} flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest cursor-help opacity-60 hover:opacity-100`}
        style={{ color, backgroundColor: `${color}1F` }}
      >
        <Database size={11} />
        {isProd ? "prod" : "dev"}
        <span className="font-normal tracking-normal normal-case opacity-70">
          {PROJECT_REF || "unset"}
        </span>
      </span>
    </Tip>
  )
}
