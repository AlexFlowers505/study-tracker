import type { ReactNode } from "react"

/** A labelled form row. */
export function Field({
  label,
  children,
}: {
  label: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-[#1E2A33]/50 mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}
