# 015 — The economy

**Status: built.** Supersedes parts 4 and 6 of `spec 010`, which are struck
through there and point here. `migrations/020`, `021`, `022`.

`spec 010` built a balance and a shop, and got one thing badly wrong in a way
that took a month of use to surface. This is the corrected design, written out
whole rather than as a diff, because an economy read in pieces is an economy
nobody can hold in their head.

---

## What there is

**Three numbers, and they behave in three different ways.** Keeping them
distinct is most of the design; the original failure was letting two of them
share a name.

| | what it is | what it does | spent? |
| --- | --- | --- | --- |
| **the composite** | a **run** of days on which every voting rule held | resets to nought when you break it | never |
| **points** | an **account** | accumulates, goes negative | yes — in the shop |
| **an achievement** | a **fact**, with its date | nothing takes it back | never |

## The mistake worth recording

The balance was denominated in *kept days*. The argument was good: pricing in
the unit the streak counts leaves nothing to play off against the promise,
because the currency *is* the promise, and "40 kept days" cannot be
underestimated the way "50,000 points" can.

The argument was about the **unit**. It was applied to the **name**, and the
name was already taken. `keptDays` is a run that resets and is never spent; the
balance is an account that accumulates and is. One name over two numbers
behaving in opposite ways produced exactly the confusion you would expect, and
the user said it in one sentence:

> вроде стриком дни отмечаем, в то же время они почему-то тратятся

They were never the same days. **What actually stops a second economy is that
nothing but a finished day mints a point, and the rate is not a setting** —
and that survives the rename intact. What the rename buys is that the thing you
spend stops pretending to be the thing you are guarding.

## The rate

**A finished day pays 10. A missed one takes 20.**

The figure that matters is neither of those: it is the **ratio**, and at two to
one the account grows above a **two-thirds** keep rate. It was `+1 / −3`, and
before that symmetric — which kept the shop reachable for anyone above half,
which is true and was the wrong thing to optimise. *A reward you can reach
while keeping barely half your promises is a reward that says half is enough.*

The tens exist so the ratio has somewhere to move. At `+1` the only
asymmetries expressible were whole multiples of a day; a scale with room under
it can say 10:15 as easily as 10:20.

**Neither figure is a setting.** A configurable rate is the forgeable part of
any economy: the number you quietly edit on the evening you need it to be
different.

**It goes negative.** A floor at zero would mean that after a bad enough month
a bad day is free again — which is the hole the account exists to close. It
goes negative from days you missed, never from something you bought.

## Where points come from

Two sources, and only two.

**Sealed days**, at the rate above. Sealed on the log's own horizon: a day is
settled when it can no longer be written, which is a day earlier than a week
seals. Today and yesterday are shown apart, as *not counted yet* — a day you
can still fix is a day worth seeing, and a day you can still edit must not be
able to move an account you have already spent against.

**Achievements**, at a price you set on each one.

They paid nothing at first, on the reasoning that the thing which cannot be
taken away should not be wired into the thing you can spend. **That reasoning
held and its consequence did not.** *Cannot be taken away* answers why an
achievement is worth having afterwards; it does not answer why it is worth
reaching, and one that gives nothing is one nobody tries for.

The rename is what made it safe. While the currency was kept days, a reward
would have been minting days you never kept. Points are their own unit, so a
reward adds to the account without touching the run — and the achievement
itself is still never spent. It stays in the ledger with its date.

**Per achievement, because what one is worth is a judgement about that one.**
Six that mean something are not six equal things, and a single constant would
be the app deciding in advance what the only interesting thing about an
achievement could be.

## What the locks protect, and which way

Every term here has a **safe direction**, and the one-sided test only ever asks
*can it be proved this cannot get easier*. Not proved is a wait, never a
verdict.

| term | harder, so it lands | easier, so it waits |
| --- | --- | --- |
| an achievement's threshold | raising it | lowering it |
| **an achievement's reward** | **lowering it** | **raising it** |
| a shop price | raising it | lowering it |
| a rule's bar | raising it | lowering it |
| removing either | — | always |

**The reward is the first term whose safe direction is down**, and it is worth
saying why out loud: asking more points for the same work is a loosening of the
bargain even though the bar has not moved. A lock that only understood
thresholds would have let the reward be doubled on a bad evening and called it
no change.

**Removal is the largest loosening there is.** It used to be free, and
`CLAUDE.md` said so deliberately — *it costs the streak, which is the only
thing anybody was protecting.* That was true while a rule was only a promise
about days, and stopped being true when the rule became the thing protected. A
week-long clock on lowering a bar and no clock on removing the bar is a lock
defending the paperwork.

A removal walks the same gates a loosening does, **in this order**:

1. **The grace day.** A thing written this morning has judged nothing and
   protects nothing.
2. **The clock**, set by the last loosening. A supervisor does not override it.
3. **The reason**, on the record. Asked for only once the clock is clear —
   offered earlier it would be asking you to type into a refusal.
4. **The supervisor**, if there is one. Not refused, sent.

## The ledgers

Everything spendable is **written once and never recomputed**, because it can
be spent and a figure somebody bought against must not move afterwards.

- **A day's mark** is written when the day leaves the writing window.
- **An achievement** is written with its date, the figure it stood at, **and
  the points it paid**. Read back off the row, never off the definition: the
  account was spent against that figure, and re-reading a definition somebody
  has since edited would move a settled balance.
- **A purchase** is written with its price. No refunds.

`migrations/020` multiplied every stored price by ten when the scale changed —
the balance is a fold over the ledger and revalues itself, prices are stored
numbers and do not. **Scaling the purchase records was redenomination, not
rewriting history**: what was paid is unchanged, the units it is written in
are.

## The shop

Not a game store. **A precommitment device**: buying the record player in the
app is permitting yourself to buy it in life. The app is the ledger of a
promise you made yourself about spending, which puts it in the same family as
the edit lock rather than in the family of points-and-badges.

- **A purchase is permanent.** Append-only, in the history, with its date and
  the price paid.
- **You cannot spend what you do not have.** The account goes negative from
  missed days, never from buying.
- **It must be a ceremony, not a submit button.** The app cannot stop you
  buying the thing outside it; the entire value is the ritual, and drawn as an
  ordinary row with an ordinary button it will rot inside a month.

## Where it is on screen

One row under the period bar, and everything on it is always visible:

    🔥 24 days      20 pts        ● 2 of 3 holding   ⌄

The account used to appear only on the collapsed line, so it vanished the
moment anyone opened the row. **A currency you cannot see is one you never
spend**, which makes the shop decorative — and the shop is the only thing the
account is for.

It stays quiet, though. It does not motivate; the streak does. Given equal
weight the pleasanter number wins, and watching a total grow is pleasanter than
guarding one that can be zeroed.

## What is not decided

- **What a rule's freeze is worth in points, if anything.** Freezes are minted
  by keeping a week clean and spent to save a day; they are a second currency
  already, and the fact that they cannot be exchanged for points is what keeps
  them from being one. Probably right. Not examined.
- **Whether the shop should be reachable at all early on.** At two-to-one a
  new project takes a while to afford anything, and *a standard, not a grind*
  cuts both ways.
