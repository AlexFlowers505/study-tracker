# 023 — When it happened

**Status: built.** No migration: `startWindow` and `endWindow` ride inside the
`settings` jsonb the rules already live in, and a condition without them means
exactly what it always meant.

Everything a rule could say until now was about **how much**: two hours of
lessons, at most three Pinterest, an hour of it in the morning. None of it
could say *by ten in the morning* — which is half of what a routine is, and
the half that decides whether the other half happens.

> Добавить в настройки стрика, если у нас выбраны activity, возможность
> ограничивать время начала (типа начать не раньше стольки-то или не позже
> стольки-то и то же самое для окончания).

---

## 1 — A window is two walls on one moment

```ts
interface TimeWindow {
  from?: TimeOfDay   // no earlier than
  to?: TimeOfDay     // no later than
}
```

A condition carries two of them — `startWindow` and `endWindow` — and either
wall of either may be absent, which is that side unwalled. Four sentences fall
out, and all four are ones people write:

| written | means |
| --- | --- |
| start `to` 10:00 | begin by ten |
| start `from` 09:00 | do not begin before nine |
| start `from` 09:00 `to` 10:00 | begin between nine and ten |
| end `to` 18:00 | be finished by six |
| end `from` 17:00 | do not stop before five |

### The day's edges, not every entry

**`startWindow` is read against the earliest start among the entries the
condition counts, and `endWindow` against the latest end.** That is the
sentence a person means: *begin by ten* is about when you sat down, not about
every time you sat down. Read per entry instead, a morning that began at nine
would be broken by picking the work up again at two — which is not a rule
anybody wrote.

`edgesOn` walks exactly the entries `minutesOn` adds up: the weekday's own
slots, the condition's own targets. A late session in a slot the condition does
not count cannot break its window, for the same reason it cannot add to its
hours.

### The one that reads backwards without care

`last` may run past 1440, and has to. An entry whose end is before its own
start ran into the next day, so 23:00–00:30 **finished at 1470**, not at 30 —
and read the other way it would be the *earliest* finish on the day, which
turns *finish by six* into a promise a midnight session keeps.

### A window says when, never whether

**A moment that never happened is outside nothing.** A day with no counted work
has no beginning to be late, so it breaks nothing here. Asserting a failure
from missing data is what this app refuses everywhere else — it is why an
unanswered check is not a failed check — and the alternative makes every
untouched day fail a rule about when to start.

The consequence is worth stating plainly: **a window constrains when the work
happened, not whether it happened.** Pair one with a floor when you want both.
That is a single condition and it is what the form draws.

Sleep is excluded, deliberately. It is measured on the rotated 18:00 clock
where *earlier* means something else entirely, and a window on that frame is
its own piece of thinking. Counts are excluded because a tally has no clock
behind it at all.

---

## 2 — What it costs

**Nothing new.** A time condition has always cost exactly one freeze however
many of its parts broke — one broken promise — and a window folds into that
same violation. So a rule that gains a window does not quietly get dearer to
freeze, and `totalDeficit` is untouched for every rule that has not got one.

That is not only tidiness. `violationsOn` has to count the window as well as
`readClauseDay`, because **the items it prices must add back up to
`totalDeficit`** — and a day whose window broke while its figure held is
exactly the day that would otherwise be missed with nothing on offer to freeze
it. The line names the window when the window is what broke: `“Lessons” 2h of
2h` on a day whose only fault was starting at seven reads as a bug.

### Settling

Only one of the four is still open once it breaks. Starting too early cannot be
unstarted; starting too late cannot be made earlier; finishing too late is
done. All three are spent the moment they happen, the way a breached ceiling
is. **Being asked to work until five** is the one the rest of the day can still
put right, so it settles when the day does.

---

## 3 — The gates

- **`clauseAsksNothing`** learns that a window asks something. *Begin by ten*
  is a real promise with no figure beside it, and without this the form would
  draw a rule and then refuse to save it. A window with neither wall is the
  nothing this gate is for.
- **`clauseImpossible`** gains two ways in, both a scroll wheel apart: a window
  whose walls have crossed (`from` after `to`), and a condition that must begin
  after it has to have finished. Both name their figures, because *impossible*
  without the arithmetic is a form refusing to save and not saying why.

**Windows do not wrap.** `from 22:00 to 02:00` is refused rather than read as a
window across midnight. Wrapping would make "the earliest start" ill-defined —
earliest on which side of the boundary? — and the day boundary here is the one
every other reader already uses. A night-owl rule is not expressible today, and
that is a real limitation rather than an oversight.

---

## 4 — The lock

A window is a wall, and **absent is a wall at nowhere**: no `from` means *any
time you like, however early*. So moving a `from` later can only cost you and
moving it earlier cannot; a `to` reads the other way. Adding a window where
there was none is one more thing to keep and never waits; dropping one is
unambiguously easier and does.

That is the same shape a floor and a ceiling already have, which is why it
sits in the same weekday loop rather than in a special case of its own.

---

## 5 — The form, and the sentence

Inside **Days**, after the figure, because a window qualifies the work rather
than replacing it — the same order the sentence reads them in. Three questions
in the same shape and the same order the figure already asks:

1. **Часы** — any time, or within hours.
2. **Часы дня** — the same every day, or one per weekday.
3. **Начать** / **Закончить** — two rows, because they are two promises. *Start
   by ten* and *stop by six* are each useful on their own, and one control for
   both would make you set a time you did not mean to say the one you did.

Each is a `TimeRangeField`, which is the app's existing two-times-on-a-dial
control and fits a window exactly: the window's own opening and closing.

The per-weekday grid is the figure grid one dimension along, copy button
included — *three hours except Thursday* has the same problem whether the
exception is a number or an hour.

**`clause.days` now carries a fourth independent answer**, and each has to be
asked about separately (`windowsPerDay`, beside `figuresPerDay` and
`slotFiguresPerDay`) or one silently speaks for another. A map written to say
which slots Tuesday counts must not blank Tuesday's window any more than it may
blank Tuesday's figure — which is a bug this file has now shipped once and been
written against twice.

The readback says it: `“Lessons” at least “2h”, starting by “10:00”`. Six
`reads back:` cases pin it to the character, including one that asserts a rule
**without** a window is unchanged — which is what caught the doubled comma this
shipped with for an hour, since a `frag:` key's fallback *is* the English and a
caller that adds its own punctuation doubles whatever the fragment had.

---

## 6 — What is covered

Thirty-one new cases in `npm run sweep`: seventeen on the verdict (both walls of
both windows, the earliest-start reading, the past-midnight finish, an empty
day, an untimed day, slots, per-weekday, and a count target ignoring one),
seven on the lock, two refusals, two acceptances, two impossibilities, one
possibility, and six on the readback.

**Day scope only.** A weekly rule counts a week, and *begin by ten* is a
statement about a day; `readWeek` reads only `ClauseReading.value`, so the
restriction falls out of the existing shape rather than being enforced. The
form does not offer it there, for the same reason it does not offer weekdays.
