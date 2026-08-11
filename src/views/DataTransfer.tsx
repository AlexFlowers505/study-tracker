/* ---------------------------------------------------------------
   Setup's footer: the whole document out, and the whole document back in.

   Export has always been here; import is what makes the pair useful. Moving a
   logbook between two Supabase projects — production and a dev copy — needs no
   database password and no tooling this way, just a file.

   Import asks first, and the confirmation names the project ref it is about to
   write to. That string is the only thing distinguishing the two databases:
   the app looks identical either way, and the mistake worth preventing is
   restoring yesterday's file over today's real data.
--------------------------------------------------------------- */

import { useRef, useState } from "react"
import { Download, Upload } from "lucide-react"
import type { AppData } from "../types/model"
import { normalizeData } from "../lib/defaults"
import { EXAM_COLOR, btnBase } from "../lib/theme"
import { PROJECT_REF } from "../data/supabase"
import { summarize } from "../data/importData"
import type { ImportSummary } from "../data/importData"

const pillBtn = `${btnBase} shrink-0 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-3 py-2 rounded-full`

interface Staged {
  data: AppData
  counts: ImportSummary
}

export function DataTransfer({
  onExport,
  onImport,
}: {
  onExport: () => void
  /** Writes the document to the tables. Rejects with a readable message. */
  onImport: (data: AppData) => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [staged, setStaged] = useState<Staged | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = async (file: File) => {
    setError(null)
    try {
      const data = normalizeData(JSON.parse(await file.text()))
      // normalizeData returns null for anything without projects in it, which
      // covers both "not an export" and "an export of nothing".
      if (!data) throw new Error("no projects in it")
      setStaged({ data, counts: summarize(data) })
    } catch (e) {
      setStaged(null)
      setError(
        `That file isn't a logbook export — ${
          e instanceof Error ? e.message : String(e)
        }`,
      )
    }
  }

  const confirm = async () => {
    if (!staged) return
    setBusy(true)
    setError(null)
    try {
      await onImport(staged.data)
      // No success state on purpose: the caller reloads the page, so the proof
      // is the logbook itself.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <div className="px-5 py-3 border-t border-[#1E2A33]/10 shrink-0 rounded-b-xl bg-white">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-mono text-[#1E2A33]/45">
          {staged
            ? `Into ${PROJECT_REF || "this database"}`
            : "Every project, in one file"}
        </span>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              // Cleared so picking the same file twice in a row still fires.
              e.target.value = ""
              if (file) pick(file)
            }}
          />
          {!staged && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                className={`${pillBtn} bg-[#1E2A33]/5 hover:bg-[#1E2A33]/10`}
              >
                <Upload size={13} /> Import JSON
              </button>
              <button
                onClick={onExport}
                className={`${pillBtn} bg-[#1E2A33]/5 hover:bg-[#1E2A33]/10`}
              >
                <Download size={13} /> Export JSON
              </button>
            </>
          )}
          {staged && (
            <>
              <button
                disabled={busy}
                onClick={() => setStaged(null)}
                className={`${pillBtn} text-[#1E2A33]/60 hover:bg-[#1E2A33]/5 disabled:opacity-40`}
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={confirm}
                style={{ backgroundColor: EXAM_COLOR }}
                className={`${pillBtn} text-white hover:opacity-90 disabled:opacity-40`}
              >
                {busy ? "Writing…" : "Overwrite"}
              </button>
            </>
          )}
        </div>
      </div>

      {staged && (
        <p className="mt-2 text-[10px] font-mono text-[#1E2A33]/60 leading-relaxed">
          {staged.counts.projects} project
          {staged.counts.projects === 1 ? "" : "s"}, {staged.counts.days} days,{" "}
          {staged.counts.notes} notes, {staged.counts.verdicts} week verdicts.
          Anything the file covers is overwritten; anything it doesn't is left
          alone, so days deleted since the export stay behind. Export first if
          this database holds something you want to keep.
        </p>
      )}

      {error && (
        <p
          className="mt-2 text-[10px] font-mono leading-relaxed"
          style={{ color: EXAM_COLOR }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
