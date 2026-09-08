/* ---------------------------------------------------------------
   The shop — `spec 010`, part 6.

   **Not a game store.** Buying something here is permitting yourself to buy it
   in life, which puts this in the same family as the edit lock rather than in
   the same family as points: the app is the ledger of a promise you made
   yourself about spending, and the promise is the only thing enforcing it.

   Three things keep that from rotting:

   **Priced in points, and the points are minted only by the day's verdict.**
   They were called kept days, on the reasoning that pricing in the unit the
   streak counts leaves nothing to play off against the promise. The reasoning
   was sound and the name was not: `keptDays` is a run that resets and is never
   spent, and this is an account that accumulates and is, so one name covered
   two numbers that behave in opposite ways. What stopped a second economy was
   never the *name* — it is that nothing but a finished day mints a point, and
   the rate is not a setting.

   **Prices are locked like rules.** Lowering one is a loosening and waits;
   raising one lands at once. Without it the record player drops from five
   thousand points to fifteen hundred at exactly the moment you most want it
   to.

   **A purchase is permanent.** No refund, append-only, and it keeps its own
   copy of what it was called and what it cost so the record still reads after
   the item is deleted. The whole value of the ritual is that it costs
   something, and something you can undo costs nothing.
--------------------------------------------------------------- */

import type {
  Achievement,
  EarnedAchievement,
  Project,
  Purchase,
  ShopItem,
} from "../types/model"
import { addDays, toKey } from "./date"
import { makeId } from "./id"

/** A fresh item. `EditableList` supplies the name, colour and icon. */
export const newShopItem = (
  today: Date,
): Omit<ShopItem, "id" | "label" | "color" | "iconName"> => ({
  price: 30,
  createdOn: toKey(today),
  lockedUntil: toKey(today),
})

/* ---- What a reward costs, which is no longer only a number --------------- */

/** The achievements a reward asks for. Empty is the ordinary case. */
export const requiredBy = (item: ShopItem): string[] => item.requires || []

/**
 * **Which of them are still missing**, in the order the item names them.
 *
 * An id that matches no achievement is dropped rather than reported: deleting
 * an achievement takes its record with it (`spec 014`), so a requirement
 * pointing at nothing is not an unmet condition, it is a condition that no
 * longer exists — and a reward permanently unbuyable for a reason you cannot
 * see anywhere is the worse of the two failures.
 */
export const missingFor = (
  item: ShopItem,
  achievements: Achievement[],
  earned: Record<string, EarnedAchievement> = {},
): Achievement[] =>
  requiredBy(item)
    .map((id) => achievements.find((a) => a.id === id))
    .filter((a): a is Achievement => !!a && !earned[a.id])

/**
 * Whether this reward can be taken right now.
 *
 * A purchase can never push the balance below zero. The balance *itself* can
 * go negative — that is what a bad month looks like — but only from days you
 * missed, never from something you chose to buy. Owing the app a debt you took
 * on deliberately is a different and much weaker idea.
 *
 * **And the account is no longer the only gate.** A reward may also ask that
 * you have already earned something, and then both halves must hold: points
 * are patience, an achievement is what you did with it, and a shelf that can
 * only price the first can only ever sell patience.
 *
 * **A reward that asks for nothing is not a reward**, which is why a price of
 * nought is still refused unless something else is being asked. That guard
 * used to read `price > 0` and meant the same thing when a price was all
 * there was.
 */
export const canBuy = (
  item: ShopItem,
  available: number,
  achievements: Achievement[] = [],
  earned: Record<string, EarnedAchievement> = {},
): boolean =>
  (item.price > 0 || requiredBy(item).length > 0) &&
  available >= item.price &&
  missingFor(item, achievements, earned).length === 0

/** The row that gets written. Its own id, because a reward can be taken twice. */
export const purchaseOf = (item: ShopItem): Purchase => ({
  id: makeId("buy"),
  itemId: item.id,
  label: item.label,
  price: item.price,
  boughtAt: new Date().toISOString(),
})

/** Newest first — the history reads downwards from what you just did. */
export const purchaseHistory = (project: Project): Purchase[] =>
  Object.values(project.purchases || {}).sort((a, b) =>
    b.boughtAt.localeCompare(a.boughtAt),
  )

/**
 * **Which of the shelf's rewards have ever been taken.**
 *
 * Distinct shelf items, not purchases: a reward can be taken again and again,
 * so counting purchases would climb past the size of the shelf and give the
 * badge a fraction bigger than one. Filtered to what is *on* the shelf now for
 * the same reason — a purchase of something since deleted is real history and
 * belongs in the ledger, but it is not one of the things there are to take.
 */
export const takenItemIds = (project: Project): Set<string> => {
  const shelf = new Set((project.settings.shop || []).map((i) => i.id))
  const out = new Set<string>()
  for (const p of Object.values(project.purchases || {}))
    if (shelf.has(p.itemId)) out.add(p.itemId)
  return out
}

/** The local day something was bought on. See `earnedOn` for why. */
export const boughtOn = (boughtAt: string): string => toKey(new Date(boughtAt))

/* ---- The lock ------------------------------------------------------------ */

export interface PriceEdit {
  changed: boolean
  /** Proved not to make the reward cheaper — in points or in what it asks. */
  narrowing: boolean
  settingUp: boolean
  /** The clock permits it; only the written reason is missing. */
  needsReason: boolean
  allowed: boolean
  next: ShopItem
}

/**
 * What a change to a reward's cost is, and what it costs — the rules'
 * one-sided test again.
 *
 * Raising a price can only ever ask more of you, so it lands at once.
 * Lowering one is the edit this whole mechanism exists to slow down.
 *
 * **An achievement it asks for is part of that cost**, so it takes the same
 * test from the same side: adding one only ever asks more and lands at once,
 * **dropping one waits** exactly as a discount does. Without that the lock
 * had a door beside it — the record player could not get cheaper on the
 * evening you wanted it, and could stop needing the thing you had put it
 * behind.
 *
 * It was `priceEdit` while a price was the whole of what a reward asked.
 */
export function shopEdit(
  prev: ShopItem,
  draft: ShopItem,
  lockDays: number,
  today = new Date(),
  reason = "",
): PriceEdit {
  const todayKey = toKey(today)
  const was = requiredBy(prev)
  const now = requiredBy(draft)
  const changed =
    prev.price !== draft.price ||
    was.length !== now.length ||
    was.some((id) => !now.includes(id))
  // Every dimension must be no-easier, exactly as `isNarrowing` insists for a
  // rule: they are not a currency you can trade one against the other.
  const narrowing =
    draft.price >= prev.price && was.every((id) => now.includes(id))
  const settingUp = todayKey === prev.createdOn
  const base = { changed, narrowing, settingUp, needsReason: false }
  if (!changed) return { ...base, narrowing: true, allowed: true, next: draft }
  if (narrowing || settingUp) return { ...base, allowed: true, next: draft }
  if (todayKey < prev.lockedUntil)
    return { ...base, allowed: false, next: prev }
  const written = reason.trim()
  if (!written) return { ...base, needsReason: true, allowed: false, next: prev }
  return {
    ...base,
    allowed: true,
    next: {
      ...draft,
      lockedUntil: toKey(addDays(today, lockDays)),
      looseningLog: [
        ...(prev.looseningLog || []),
        { at: todayKey, reason: written },
      ],
    },
  }
}
