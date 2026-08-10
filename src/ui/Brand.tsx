/* ---------------------------------------------------------------
   The app's own mark, distinct from the per-project icon a user picks in
   Setup. A lens with clock hands: at favicon size the hands blur away but
   the magnifier silhouette still reads.

   Kept in sync by hand with `public/favicon.svg`, which is the same drawing
   on a dark rounded square. The name itself is `APP_NAME` in `lib/defaults`.
--------------------------------------------------------------- */

export function TimeLensMark({ size = 16, className = "" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="14.5" cy="14.5" r="7.5" strokeWidth="2" />
      <path d="M14.5 10.5V14.5H18" strokeWidth="1.9" />
      <path d="M20 20L25 25" strokeWidth="2.6" />
    </svg>
  )
}
