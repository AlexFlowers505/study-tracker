# 021 — A filled half of the library

**Status: built.** No migration and no new dependency: a filled icon is an
existing lucide component drawn differently, and its name is a string nobody
has stored yet.

It began as a complaint about one glyph. `spec 020` drew the pause control as
`CirclePause`, and:

> Нужно иконку паузы без круга. Ее и так плохо видно, а она еще в круг вписана
> из-за чего сам символ иконки еще меньше.

Which is exactly right, and the fix generalises: **weight is the enclosure you
do not have to pay for.** A ring around a twelve-pixel glyph spends a third of
its pixels saying "this one is special"; filling the glyph says the same thing
using pixels the drawing already owns. So the pause control became a solid
`Pause`, and the same device is now available to every icon in the app.

---

## 1 — There is no filled set to import

lucide has 6014 exports and no `HeartFilled` among them. A filled icon is
therefore the same component rendered with `fill="currentColor"`, which paints
the inside of every subpath.

The name is the outlined one plus **`.filled`**:

```ts
export const FILLED_SUFFIX = ".filled"
```

A dot because no lucide export contains one, so a filled name can never collide
with an outlined one, and because every icon name already in anybody's data
keeps meaning exactly what it meant. `RenderIcon` is **the only place** that
knows the suffix exists — it looks the component up in `ICON_MAP` as before and
adds the fill when the name ends that way. Nothing that stores an icon name had
to change: not slots, activities, counters, tags, categories, rules,
achievements or rewards.

The entries themselves are generated from the outlined ones, interleaved so a
variant sits beside the icon it is a variant of. Listing all the filled ones
after all the outlined ones would make the picker's second half a shelf of
things you have already scrolled past once.

---

## 2 — Which icons get one, and why so few

The ask was *for all icons that have filled analogues*, and the work was
finding out which those are. 321 icons were rendered outlined and filled side
by side and looked at. **32 survive.**

### The structural test is not the obvious one

The tempting rule is "does the path close with a `z`". That rule is wrong in
both directions, and `Heart` is the counterexample: it is a **single unclosed
path** and it fills perfectly, because **SVG fills an open subpath by joining
its last point back to its first.** What actually breaks is a subpath whose two
ends are far apart, which fills as a wedge across the drawing.

So the candidate test is: parse every `d`, walk the commands to find each
subpath's first and last point, and reject any icon with a gap wider than 0.8
of the 24-unit box. That produced 45 candidates out of 321 — which is already
the honest headline: **most line icons have no solid version**, because most of
them are made of lines.

### The two things that then rule an icon out

Both are visual, and neither can be computed:

- **Filling destroys interior detail.** The fill lands on *every* child of the
  SVG, not just the outer shape, so `Skull` loses its eyes, `Cookie` its chips,
  `Cat` its face and `Palette` everything but its outline. A solid lump is not
  a filled version of a drawing; it is the loss of the drawing.
- **Filling can collapse an icon into one the library already has.** Filled
  `Target`, `Disc` and `Compass` are each a plain circle — which is filled
  `Circle`. Filled `Speaker` and `Banknote` are each a rounded rectangle —
  which is filled `Square`. Offering those is worse than offering nothing,
  because the picker then shows you the same picture under four names and the
  choice between them is meaningless.

The thirteen dropped for those two reasons are `Cat`, `Skull`, `Camera`,
`Cookie`, `Eye`, `Infinity`, `Banknote`, `Palette`, `Disc`, `Speaker`, `Atom`,
`Target` and `Compass`.

### What is left

`Plane`, `MapPin`, `Navigation`, `Moon`, `Cloud`, `Droplet`, `Flame`, `Play`,
`Pause`, `Square`, `Circle`, `Puzzle`, `Wrench`, `Folder`, `Bookmark`, `Tag`,
`Weight`, `Star`, `Sparkle`, `Diamond`, `Egg`, `Heart`, `Thermometer`, `Cross`,
`Mountain`, `PawPrint`, `Bone`, `Factory`, `MessageSquare`, `Phone`, `Shield`,
`KeyRound`.

The rule they all pass is the one worth keeping when the list is next extended:
**the solid drawing is still recognisably the same thing.** A filled heart, a
filled star, a solid wrench.

---

## 3 — The toggle

All / Outlined / Filled, a recessed track under the search box.

**It is a narrowing, not a search.** Filled and outlined are the same picture,
so the question is never "which of these is it" but "solid or not" — and asking
that in the search box would mean retyping the word after every other query.
Recessed rather than raised because it sits under a field; the raised pill
shape belongs to the page's own controls.

`.filled` is also split off as a word for search, so `heart filled` finds
exactly one icon and `filled` narrows the grid the same way the toggle does.
That is a convenience on top of the toggle, not a substitute for it.

**The empty state says which of the two emptied the grid.** `IconGrid` filters
in two steps — query first, then shape — for that reason alone: a search that
matches only outlined icons while Filled is held is not "nothing matches", and
a message saying so sends you to correct the one thing that was not wrong. The
three messages are *nothing matches “x”*, *nothing matching “x” is drawn that
way*, and *nothing here is drawn that way*.

---

## 4 — What this did not do

**No icon was renamed or removed**, which is the standing rule for this file:
the names are stored data. Every addition is a new name.

**No new bundle cost.** A filled variant is the same component, so the 32 twins
add entries to an array and not a byte of SVG — unlike the last extension of
this library, which cost 71 KB for 206 new drawings.

**Nothing is filled by default.** An icon already chosen goes on rendering
exactly as it did; the solid version is a separate thing you can pick.
