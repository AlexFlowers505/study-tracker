# 013 — What a period asks, and when a day is decided

**Status: built.** Found 2026-08-26 from a list of eight things the
user hit in one sitting; built the next day. Sibling of
`012-the-first-target-assumption.md`, which holds the display half of the same
week's findings and is also built.

Every fix in this file is covered by `npm run sweep`
(`scripts/streak-sweep.ts`), which is checked in for the reason Part 3 gives.

Three of the eight are bugs, and one of them makes **every weekly rule with a
flat bound wrong by a factor of seven**. The rest are a single design question
wearing four costumes: *what does today mean before it is over?*

---

## Part 1 — Three bugs

### 1.1 A weekly rule multiplies your figure by the days in the week — *fixed*

**The worst one. Fixed first.** `weekBounds` returns a flat bound unchanged and
sums only a per-weekday map. `PaceCard`, `weekLostOn` and the day's colour all
build on it and inherit the fix.

`weekBounds` sums each present bound across every covered day:

```ts
const each = keys.map((k) => clauseBounds(clause, ctx, k))
// sum of each side over the days
```

For a condition carrying a **per-weekday map** that is exactly right — *3h
Mon–Wed, 1h30 Thu* summed is the week's total, and that is what the function
was written for. For a condition carrying a **flat** bound it is a disaster,
because the form labels that field `Per week` and the reader reads it as *per
day, summed*.

Proved headlessly on a finished week:

| the rule as typed | what the week actually asks | outcome |
| --- | --- | --- |
| `at least 3` a week, three trips made | `min: 21` | **missed** — should hold |
| `at most 3` a week, four trips made | `max: 21` | **met** — should break |

*Three gym trips a week* is the headline example in `CLAUDE.md` and it needs
twenty-one. Every weekly count rule in the app is either unachievable or
unbreakable, depending on which way its bound points.

**The distinction to build:** a flat `min`/`max` on a weekly rule is the
week's own figure and must not be summed; a `days` map is per-weekday and must
be. `weekBounds` cannot tell them apart today because `clauseBounds` has
already collapsed both into one shape — it resolves per day. Either
`weekBounds` reads the clause directly, or `clauseBounds` gains a way to say
which it was.

Check `PaceCard` and `weekLostOn` in the same pass: both build on
`clauseBounds`/`weekBounds`, so a weekly burn-down is currently drawn against
the same ×7 limit.

### 1.2 A weekly rule ignores per-slot bounds entirely — *fixed*

`readWeek` measures each named slot across the week and adds its shortfall to
the clause's own, the way `readClauseDay` always did for a day. `clauseLostOn`
gained the same reading, so a slot ceiling loses a week the moment it is
crossed.

The user's report: *at most 3 a week, and at most 0 in Evening and Night; wrote
one at night; streak still fine.*

`readClauseDay` applies slot bounds — `slotBoundsOnWeekday`, added into
`short` — and it works at day scope (verified: one at night on a daily rule is
`missed`). But `readWeek` takes only `readClauseDay(...).value` from each day
and throws the deficit away, recomputing from `weekBounds` alone. Slot rules
are never consulted.

So *never in the evening* is enforceable only on a rule that judges days.

### 1.3 A failed check produces no warning, at any hour — *fixed*

`todayUrgency` reads checks: an answer outside the accepted set is spent
immediately, like a breached ceiling; no answer at all is the evening rule.

The user's report: *wake up = no, streak fine; go to sleep = no, still fine.*

They are right that the verdict itself is defensible — today is `pending` until
it is over, which is the same choice every other state machine here makes. What
is not defensible is the silence. Verified across the day, with yesterday held
so the `today` branch is the one reached:

```
09:00 nothing answered  -> safe
22:00 nothing answered  -> safe
09:00 wake = NO         -> safe
22:00 both = NO         -> safe
```

`todayUrgency` understands numeric bounds and nothing else. For a check the
requirement lives in `clause.allow`, so `clauseBounds` returns neither side:
the *over a ceiling — already spent* branch cannot fire, `owed()` returns
nought, and the function returns before it reaches the evening rule. A rule
whose day is already lost says `safe` until midnight, and then yesterday is
suddenly in danger.

**A check has no rate and no headroom** — it is answered or it is not. The
urgency reading for one is: an answer outside the accepted set is `spent`
immediately, like a breached ceiling; no answer at all is the evening rule.

---

## Part 2 — When is a day decided?

Items 3, 5, 6 and the closing question are one idea. The user put it better
than the code does:

> Там же ведь явно написано значение, которое должно ломать стрик, и не важно,
> что я могу еще изменить это значение пока день не запечатан, а не так, что
> еще не дописано значение, которое нужно, но время есть его дописать.

**A floor is a forecast; a ceiling is a fact.** Three hours of study by nine in
the morning is not a failure — the day has fourteen hours left in it. One
Pinterest at night against a ceiling of nought is not a forecast at all: the
thing happened, it is written down, and no amount of remaining day undoes it.
`todayUrgency` already knows this for counts (`spent = true` on a breached
ceiling) and the knowledge does not reach checks (1.3) or the panel.

Four things follow, none of them built:

### 2.1 Headroom on a ceiling — *done*

`clauseReadout` reports `“Youtube” “2” of “3”` for a ceiling, so the tooltip
and the panel both carry what is left. Ceilings only — a floor's figure is
already in the sentence above the strip.

*At most 3, and I have used 1.* Nothing shows the remaining two. The strip
prints the raw count, the panel prints the raw count, and the arithmetic that
matters — `max - value` — is nowhere. Worth having in the strip cell, the
tooltip and the panel's figure.

### 2.2 A warning before the last one — *done*

A spent allowance warns: `“--Pinterest” “3” of “3” used — one more ends it`.
**A ceiling of nought never warns** — it is at its limit from midnight to
midnight, and *never do X* is the commonest rule in the app, so it would put a
permanent amber row on the page for a rule nobody has broken.

*Three of three used, one more ends it.* `todayUrgency` has no state between
"under the ceiling" and "over it". `owed()` looks only at `min`, so a ceiling
contributes nothing until it is breached. A ceiling at its limit is exactly
`c.warn`'s case — behind but not lost — which is what that colour was added
for.

### 2.3 A quieter tier: the morning reminder — *done*

**Not a fourth `RiskLevel`.** Adding one would have made `StreakBar` draw a
block for it, since it draws one for anything not `safe`, and then the
reminder would appear every morning above the composite — which is precisely
what the quiet-unless-it-matters design of that row exists to prevent.

It is `dueToday` in `lib/streakRisk.ts` and a line **inside the opened streaks
row, under the chevron**: you go and look, it never comes and finds you. That
is what lets it appear on a day where everything holds. No surface, no border,
no red — a caption's volume, with the rule's own tint on a dot to pair the line
with its chip above.

Two rules of its own:

- **Only what you can still do.** A floor short of its figure and a check with
  no answer yet. A ceiling is not asked for — there is no doing less of
  something not yet done, and printing `2 of 3 left` here would read an
  allowance out as a chore.
- **Nothing the clock has ruled out.** Three hours at eleven at night is not a
  reminder, it is a taunt, and the alarm above has already said the day is out
  of reach. Same arithmetic `todayUrgency` uses to call a day lost.

Day scope only. A weekly rule's "today" is a question about pace, which
`PaceCard` answers properly and a one-line reminder would answer badly.

### 2.4 `held 1` on a rule written this morning — *fixed*

Today is credited to neither column. `held 2 · + today`, and a rule with no
finished day reads `today still open` rather than `held 0`.

> Почему показано, что стрики pin ctrl и sleep ctrl held 1, если они только
> сегодня появились и день еще не прошел?

`keptBreakdown` counts a rule's day whenever `dayReport` returned a reading for
it, and `ruleDayState` returns `met` for today the moment its deficit is
nought. So a rule created this morning, with nothing yet recorded against it,
already reads `held 1` — it has been credited with a day that is not over.

Consistent with `keptDays`, which does *not* count today (`pending` neither
extends nor breaks). So the two disagree, and the breakdown is the one that is
wrong. Either exclude today from `keptBreakdown`, or show it apart — `held 1 ·
today still open` — which is more honest and more useful.

---

## Part 3 — What was done, in this order

1. **1.1**, the weekly ×7. It is silently wrong about data the user already
   has, and everything else in Part 1 is smaller.
2. **1.2**, weekly slot bounds — same file, same reading, do it in the same
   pass.
3. **1.3**, checks in `todayUrgency`. Small, and it is the one the user
   noticed first.
4. `012` — the first-target assumption, starting with `isNarrowing`.
5. Part 2, which is design before code, and worth talking through rather than
   guessing at.

**Rebuild the sweep and keep it this time.** The audit that found the last four
holes was a throwaway under `.claude/`, which is gitignored, so it went with
the cleanup — and then this set turned up in a morning of ordinary use. For
every combination of target kind, scope, bound, slot and answer, assert that a
condition claiming to ask something does not pass a period that should break
it. Every bug in this file and in `012` would have been caught by it.
