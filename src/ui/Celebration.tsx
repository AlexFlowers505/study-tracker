/* ---------------------------------------------------------------
   The moment something is yours — `spec 028`.

   Buying a reward was a confirm dialog and then nothing: the points left the
   account and the shelf looked exactly as it had. `ShopSection` calls the
   purchase a ceremony, and a ceremony that ends in silence is a submit button
   with extra steps. Reaching an achievement was quieter still — it was sealed
   in an effect and turned up in a panel you had to go and open.

   **This is the one place the app spends its delight budget.** Both events are
   rare by construction — a reward is priced in weeks of kept days, an
   achievement is written once and never again — which is exactly the tier
   where a celebration belongs, and exactly why it may take its time: the card
   arrives over 420ms rather than the 220ms a working dialog gets, and the
   confetti falls for about two seconds.

   **The confetti is WAAPI on a few dozen spans**, not a library and not a
   canvas: transform and opacity only, off the main thread, gone when it
   finishes. Under `prefers-reduced-motion` there is none, the glow does not
   pulse, and the card only fades — the words carry the moment on their own.

   It portals to `document.body` like everything else that floats, and it is a
   dialog: Escape, the backdrop and the button all close it, focus goes to the
   button on the way in and back to the opener on the way out.
--------------------------------------------------------------- */

import { useEffect, useId, useRef } from "react"
import { createPortal } from "react-dom"
import { pluralOf, useT } from "../lib/i18n"
import { CARD, btnBase } from "../lib/theme"
import { RenderIcon } from "./icons"
import { useModalDismiss } from "./useModalDismiss"
import { usePalette } from "./useTheme"

export interface CelebrationMoment {
  /** Unique per event — the queue skips one it already holds. */
  key: string
  kind: "reward" | "achievement"
  title: string
  iconName?: string
  color: string
  /** What it cost, for a reward; what it paid in, for an achievement. */
  points?: number
}

const nPoints = (n: number) =>
  pluralOf(n, ["point", "points"], ["очко", "очка", "очков"])

const PARTICLES = 56

/** The strong ease-out the theme runs on, for the burst outwards. */
const BURST = "cubic-bezier(0.23, 1, 0.32, 1)"
/** easeInCirc — the fall after it, which gathers speed as a falling thing does. */
const FALL = "cubic-bezier(0.55, 0, 1, 0.45)"

/**
 * One burst from `host`, fanned upwards. Returns the animations so the caller
 * can cancel them if the card closes first.
 */
function burst(host: HTMLElement, colors: string[]): Animation[] {
  const out: Animation[] = []
  for (let i = 0; i < PARTICLES; i++) {
    const piece = document.createElement("span")
    const round = Math.random() < 0.35
    const w = round ? 7 : 5 + Math.random() * 4
    const h = round ? 7 : 9 + Math.random() * 5
    Object.assign(piece.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${w}px`,
      height: `${h}px`,
      borderRadius: round ? "999px" : "2px",
      backgroundColor: colors[i % colors.length],
      willChange: "transform, opacity",
    })
    host.appendChild(piece)

    // Upwards in a wide fan, never straight down: it has to read as thrown.
    const angle = -Math.PI * (0.08 + Math.random() * 0.84)
    const reach = 130 + Math.random() * 190
    const dx = Math.cos(angle) * reach
    const dy = Math.sin(angle) * reach
    const fall = 240 + Math.random() * 240
    const spin = (Math.random() - 0.5) * 900
    const at = (x: number, y: number, r: number, s: number) =>
      `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`

    const anim = piece.animate(
      [
        { transform: at(0, 0, 0, 0.6), opacity: 1, easing: BURST },
        {
          transform: at(dx, dy, spin * 0.4, 1),
          opacity: 1,
          offset: 0.32,
          easing: FALL,
        },
        { transform: at(dx * 1.25, dy + fall, spin, 0.9), opacity: 0 },
      ],
      {
        duration: 1500 + Math.random() * 700,
        delay: Math.random() * 120,
        easing: "linear",
        fill: "forwards",
      },
    )
    anim.onfinish = () => piece.remove()
    out.push(anim)
  }
  return out
}

export function Celebration({
  moment,
  onDone,
}: {
  moment: CelebrationMoment
  onDone: () => void
}) {
  const c = usePalette()
  const t = useT()
  const titleId = useId()
  const host = useRef<HTMLDivElement>(null)
  const onBackdrop = useModalDismiss(onDone)

  useEffect(() => {
    const el = host.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const running = burst(el, [
      moment.color,
      c.project,
      c.goalMet,
      c.accent,
      c.freeze,
      c.warn,
      c.sleep,
      c.exam,
    ])
    return () => {
      running.forEach((a) => a.cancel())
      el.replaceChildren()
    }
    // Once per moment: the palette changing mid-burst is not a reason to throw
    // the confetti again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment.key])

  const reward = moment.kind === "reward"
  const points = moment.points ?? 0

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/45 wash-in"
      onMouseDown={onBackdrop}
    >
      {/* The burst's origin, just above the card's centre — where the icon is.
          Outside the card so the pieces can travel the whole viewport. */}
      <div
        ref={host}
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-[40%] w-0 h-0"
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className={`${CARD} relative w-full max-w-[340px] p-6 text-center celebrate-in`}
      >
        <span
          aria-hidden
          className="celebrate-glow absolute left-1/2 top-6 -ml-8 w-16 h-16 rounded-full"
          style={{ backgroundColor: moment.color }}
        />
        <span
          className="relative mx-auto flex items-center justify-center w-16 h-16 rounded-3xl"
          style={{ backgroundColor: `${moment.color}24`, color: moment.color }}
        >
          <RenderIcon name={moment.iconName} size={34} />
        </span>
        <p
          className="mt-4 text-[10px] font-mono font-bold uppercase tracking-[0.2em]"
          style={{ color: c.project }}
        >
          {t(reward ? "Yours!" : "Achievement reached")}
        </p>
        <h3
          id={titleId}
          className="mt-1 font-sans font-extrabold text-lg leading-tight text-ink break-words"
        >
          {moment.title}
        </h3>
        <p className="mt-2 text-[11px] font-mono text-ink/55 leading-relaxed">
          {t(
            reward
              ? "Now go and actually have it — the app cannot do that half, and it is the half that makes the rest mean anything."
              : "It is yours for good — nothing you do afterwards takes it back.",
          )}
        </p>
        {points > 0 && (
          <p className="mt-3 text-[11px] font-mono tabular-nums text-ink/45">
            {/* `pluralOf` already prints the figure with its word. */}
            {reward
              ? t("Spent: {points}", { points: nPoints(points) })
              : t("Paid in: +{points}", { points: nPoints(points) })}
          </p>
        )}
        <button
          type="button"
          autoFocus
          onClick={onDone}
          className={`${btnBase} mt-5 px-5 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-widest`}
          style={{ backgroundColor: c.goalMet, color: c.onFill }}
        >
          {t("Hooray!")}
        </button>
      </div>
    </div>,
    document.body,
  )
}
