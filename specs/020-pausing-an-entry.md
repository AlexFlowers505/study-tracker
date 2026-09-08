# 020 — Pausing an entry

**Status: built.** No migration: `paused` and `pauseFrom` ride inside the
existing `days.cells` jsonb, exactly as `tagIds` rode inside `counter_units`.

An entry has always been *a start, an end, and the arithmetic between them*.
Living sessions are not like that — you get up, you come back — and the app had
no word for the gap, so the gap was recorded twice over in two workarounds the
user described:

> либо костылю это комментом себе же в этой записи, что нужно будет вычесть
> столько-то минут по факту окончания записи […] либо костылю разбитием записи
> на несколько записей

Both are the app making you do its arithmetic, which is the one thing this app
exists not to do. The comment is worse than it looks — it is a number that only
you can apply, so every total on every page is wrong until you remember to
apply it — and the split is worse than *that*, because three entries where one
thing happened is a lie about the shape of the day that no later reader can
undo.

---

## 1 — A pause is a duration, and there is one of it

`TimeEntry` gains two fields:

```ts
paused?: number      // minutes, the whole of them
pauseFrom?: string   // an ISO instant, present only while one is running
```

**One number however many times you stopped.** Three breaks of five minutes are
stored as fifteen. What anybody ever goes back to correct is *that was ten
minutes, not fifteen* — never which of the three stops it belonged to — and a
list of intervals would be a second axis of time to draw, edit and reconcile
against the first. The user asked for exactly this and gave the reason: *если
пауз было несколько, складываем все в одну паузу.*

`minutes` becomes the span **less** the pause, floored at nought
(`withDerivedMinutes` in `lib/entries.ts`). That is the whole of the
integration: every figure in the app already reads `minutes`, so the totals,
the goals, the streak engine, the charts and the heatmap all follow without
being touched.

### Why it is not a pair of times

The user found the hard case before writing a line of it:

> если мы вбиваем данные по прошедшим событиям. Скажем, выставляем начало
> записи вообще во вчерашнем дне, а потом жмем на паузу, а потом resume, то что
> должно получиться?

And answered it:

> Наверное мы тогда должны привязываться не к реальному времени, а отсчитывать
> время начала паузы и конца паузы независимо от текущего времени как такового.

That is what `pauseFrom` is. It is a **moment**, not a time of day, and the only
thing ever taken from it is how far it is from the moment you press Resume
(`minutesSince` in `lib/time.ts`). Nothing in the pause path reads `start`, so
the figure means the same thing whether the entry is running right now or being
filled in for last Tuesday.

A moment rather than `"HH:MM"` for a second reason: it has to survive a reload,
and a time of day cannot without inventing the date it belonged to.

### Rounding

Each pause is rounded to the app's five-minute grid **as it ends**, not the
total once at the end. So what gets added is always what the app showed you it
was adding, and every figure it fills in stays one you could have picked by
hand — the same bargain `nowTime()` already makes with the clock. A stop under
two and a half minutes therefore adds nothing, and `resumePatch` stores
*nothing* rather than `paused: 0` when that happens.

`STEP_MINUTES` and `roundToStep` are new in `lib/time.ts`; the five was already
hard-coded in `nowTime` and in the dial, and now has a name.

---

## 2 — Three buttons, and they are glyphs

`Start now` and `End now` were labelled pills. A third labelled pill is a row
wider than the add dialog on a phone, so all three are icons with tooltips —
which is what the user asked for and is right for its own reason: on a day card
the line already carries a time, an activity and sometimes a comment button.

**The hold is drawn solid.** Resume is a play triangle and so is Start now, and
two identical outlines side by side is the one ambiguity a tooltip cannot fix —
you would have to hover to find out which is which. So:

| glyph | what it does |
| --- | --- |
| `Play` outlined | set the start to now |
| `Square` outlined | set the end to now |
| `Pause` / `Play` **filled** | hold the clock, and let it go |

The outlined pair sets a time; the solid pair holds the clock. That is a rule
rather than a coincidence, and it reads the same in the add dialog and on the
cards.

**The first build circled them instead, and that was wrong.** `CirclePause` and
`CirclePlay` drew the same distinction and drew it at a cost the glyph could
not pay: a symbol inscribed in a ring is the same nine or twelve pixels with a
third of them spent on the ring, and at that size the two pause bars all but
disappeared — which the user reported in one sentence, *её и так плохо видно, а
она ещё в круг вписана*. Weight says *this is the state you are in* at least as
loudly as an enclosure does and it costs the drawing nothing. It is also the
same device `spec 021` then made available to every icon in the library.

**Exactly one of pause and resume is ever drawn**, and which one it is says
what state the session is in — the same discipline the rest of the app follows,
where a control that refuses when pressed is worse than one that is absent.

They appear only while a session is **running** — a start and no end. A stretch
that already has both ends is not one you can stop in the middle of.

**Ending a paused session resumes it first** (`stopNowPatch`). Otherwise the
pause you were in the middle of would be discarded by the click that stopped
the clock — the one moment it is certain to matter, since coming back to the
app is what you did in order to press it.

**A pause running when the add dialog's Add is pressed goes on running.** The
first build closed it there, on the same reasoning, and the reasoning does not
transfer: filing the entry is not coming back from the break. You pressed pause
because you had stopped, and if `submit` folds the pause in and clears it, every
minute of the break after that click is counted as work — the exact arithmetic
this feature exists to stop you doing by hand. So `pauseFrom` is carried into
the saved entry and the card's own Resume is what ends it. The one exception is
a session that already has both ends, where there is nothing left for a pause to
sit inside and it is folded in, exactly as `stopNowPatch` does.

---

## 3 — The star

The user asked for it and described it exactly:

> рядом со временем записи, там где общее время записи в скобках, пускай справа
> от времени перед закрытием скобок будет звездочка какого-нибудь другого
> цвета, и при наведении на время будет тултип с указанием времени общей паузы

`22:00–22:30 (15м*)`. The reason the mark has to exist at all is that with a
pause between them the line stops adding up on its face, and a reader who
cannot make the arithmetic work assumes the app is broken rather than that they
are missing a fact.

`ui/EntryTime.tsx` is the one place it is drawn — the readout line, the edit
row's duration and the add dialog's running total all go through it, so the
three cannot drift about what a pause looks like.

- **The colour is `c.warn`.** Amber is already this palette's *held, not lost*,
  which is what a pause is. Not the accent, which means *active* — the one
  thing a paused session is not.
- **The tooltip is on the label, not on the star.** A star is six pixels
  across, and a fact you can only reach by hitting six pixels is a fact most
  people will never read.
- It says `из них 2м — пауза` for a finished one and `Сейчас на паузе — пока
  2м` while one is running, because a figure that is still growing should not
  be printed as though it had settled.

---

## 4 — Editing it back

The edit row on a card gains one line: the pause icon, a number in five-minute
steps, and `мин паузы`. Typing there re-derives `minutes` through `patchEntry`
like every other field, so a wrong figure is corrected in one place.

The line is drawn where it can mean something — a timed entry (the figure is
what the duration was reduced by), a running one (there is a pause to start or
end), or anything already carrying a pause (the only way to take a wrong number
back off). An untimed entry with none of those types its minutes directly, so a
second number that changed nothing would be a control that lies.

**A running pause shows the button instead of the box.** A total that is still
growing is not a number anybody can usefully type over.

---

## 5 — What this touched, and what it did not

`patchEntry`'s "an explicit `undefined` deletes the field" rule was written for
`start` and `end` as two named cases; it is now **every key in the patch**,
since `pauseFrom` needed it next and the list would only have gone on growing.

`diffEntry` logs `paused` as a line of its own. It always moves `minutes` with
it, and `45 → 30` and `paused 0 → 15` are the same edit told two ways — only
the second says why.

**Sleep is left alone.** `paused` sits on the shared `TimeEntry`, so the
arithmetic is one function for both, and `stopNowPatch` is on the sleep line's
End button so the two paths do not diverge — but the pause and resume controls
are offered on study entries only. Nothing asked for a night to be interrupted
on the record, and `sleep.ts` reads `spanMinutes(start, end)` for the rotated
clock rather than `minutes`, so a paused night would have meant deciding what
the clock shows as against what the total says. Its own change, if it is ever
wanted.

**Nothing in the streak engine changed**, and that is the point of deriving
`minutes`: a rule promising two hours of lessons now judges two hours of
*worked* lessons without a line of `customStreaks.ts` knowing pauses exist.
`npm run sweep` passes unchanged.
