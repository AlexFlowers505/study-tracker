/* ---------------------------------------------------------------
   The shop — `spec 010`, part 6.

   **Not a game store.** Buying something here is permitting yourself to buy it
   in life, which puts this in the same family as the edit lock rather than in
   the same family as points: the app is the ledger of a promise you made
   yourself about spending, and the promise is the only thing enforcing it.

   Three things keep that from rotting:

   **Priced in kept days.** "50,000 points" is a number you invented and can
   re-invent on a bad evening. Forty kept days is not — and it is the same
   thing the streak already counts, which is what stops a second economy
   existing at all: the currency *is* the promise, so there is nothing to play
   off against anything.

   **Prices are locked like rules.** Lowering one is a loosening and waits;
   raising one lands at once. Without it the record player drops from five
   hundred days to a hundred and fifty at exactly the moment you most want it
   to.

   **A purchase is permanent.** No refund, append-only, and it keeps its own
   copy of what it was called and what it cost so the record still reads after
   the item is deleted. The whole value of the ritual is that it costs
   something, and something you can undo costs nothing.
--------------------------------------------------------------- */

import type { Project, Purchase, ShopItem } from "../types/model"
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

/**
 * Whether this reward can be taken right now.
 *
 * A purchase can never push the balance below zero. The balance *itself* can
 * go negative — that is what a bad month looks like — but only from days you
 * missed, never from something you chose to buy. Owing the app a debt you took
 * on deliberately is a different and much weaker idea.
 */
export const canBuy = (item: ShopItem, available: number): boolean =>
  item.price > 0 && available >= item.price

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

/** The local day something was bought on. See `earnedOn` for why. */
export const boughtOn = (boughtAt: string): string => toKey(new Date(boughtAt))

/* ---- The lock ------------------------------------------------------------ */

export interface PriceEdit {
  changed: boolean
  /** Proved not to make the reward cheaper. */
  narrowing: boolean
  settingUp: boolean
  /** The clock permits it; only the written reason is missing. */
  needsReason: boolean
  allowed: boolean
  next: ShopItem
}

/**
 * What a price change is, and what it costs — the rules' one-sided test again.
 *
 * Raising a price can only ever ask more of you, so it lands at once. Lowering
 * one is the edit this whole mechanism exists to slow down.
 */
export function priceEdit(
  prev: ShopItem,
  draft: ShopItem,
  lockDays: number,
  today = new Date(),
  reason = "",
): PriceEdit {
  const todayKey = toKey(today)
  const changed = prev.price !== draft.price
  const narrowing = draft.price >= prev.price
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
