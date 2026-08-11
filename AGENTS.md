# AGENTS.md — for Codex

Read **`CLAUDE.md`** first, in full. It is the operational reference for this
repo — stack, layout, data model, persistence, conventions — and it is kept
current. This file does not repeat it; it covers only what is specific to
working here as Codex.

## How work arrives

Tasks come as a written spec in `specs/`, not as a vague ask. A spec looks
like:

```
Goal        — what should be true when this is done
Files       — where to change it
Steps       — the change, in order
Done when   — how to tell it worked
Out of scope— what not to touch
```

Follow it literally. Do not widen it: if you spot a second thing worth fixing,
finish the task and mention the other thing at the end instead of fixing it.
Do not narrow it either — if part of the spec turns out to be blocked, do
every other part and say plainly which part you left and why.

If the spec contradicts `CLAUDE.md`, or the code it names doesn't look the way
the spec assumes (this file is ~6000 lines and line numbers in a spec are
stale the moment they're written — **search by symbol name**), stop and say so
before writing code. Guessing which of the two is right is the one thing that
wastes the most time here.

## Before you call it done

There are no tests. These two commands are the whole automated check:

```
npm run typecheck          # must be clean
npm run lint               # must be clean
npm run build              # must succeed
```

All three are clean today. **Expect zero and leave zero** — there is no
baseline to compare against any more, so any error the tools report is one
you introduced.

## What you cannot verify — say so

You have no browser here. Almost every change in this repo is visual, and a
change that compiles is not a change that looks right. When your work touches
layout, colour, spacing, hover/tooltip behaviour or anything responsive, end
your report with an explicit line: *not visually verified — needs a look in the
browser*. Never write "looks good" about something you did not see.

## Do not touch the real data

`npm run dev` connects to a live Supabase project holding the user's actual
study history. Treat it as production:

- Do not start the dev server to "try" a change, and never click through the
  running app toggling ignore flags, editing days or deleting entries. A test
  edit is a real edit; it saves within a second.
- Do not run SQL, migrations or any Supabase write. Migrations in
  `migrations/` are applied by the user by hand in the Supabase SQL editor.
- If a task needs a new migration, write the `.sql` file and stop. Say it needs
  to be run. Never write one that alters or drops `study_data` — it is the
  frozen pre-migration snapshot and the only backup of the old shape.

## Files

- `src/` is TypeScript throughout and split into `types/`, `lib/`, `data/`,
  `ui/` and `views/`. `CLAUDE.md` has the map — read it before adding a file,
  and put new code in the layer it belongs to rather than in `App.tsx`, which
  is now only the shell.
- Do not reformat, reorder or re-wrap code you were not asked to change, and do
  not run a formatter over the whole file. The diff has to stay reviewable.

## Conventions that bite

These are the mistakes that actually get made here. The rest is in `CLAUDE.md`.

- **Tailwind cannot see class names built from template literals.** A colour
  computed at runtime goes in `style`, never in `className`.
- **Anything that floats — tooltip, menu, date picker — renders into a portal
  on `document.body`** with coordinates measured from its trigger. An absolutely
  positioned bubble gets clipped by the modal, the scroll area or the month
  grid. Reuse `Tip`, `PopoverMenu`, `DateField`; don't hand-roll a fourth one.
- **A translucent wash needs its own opaque base** — use `cellSurface()`. A
  semi-transparent `backgroundColor` alone lets the parent bleed through, which
  is how the month grid ended up different colours on desktop and phone.
- Reuse the colour constants (`PALETTE`, `ACCENT`, `EXAM_COLOR`,
  `GOAL_MET_COLOR`, `INK`, `FILTER_TINT`) and the `CARD` / `FIELD_*` class
  strings. No new hex literals.
- Use the date helpers (`toKey`, `fromKey`, `addDays`, `startOfWeek`). They are
  local-time on purpose; `new Date(string)` reintroduces UTC drift. Weeks start
  Monday.
- Style: no semicolons, double-quoted strings, components declared with
  `function`, small helpers as arrow consts. Match the file.

## Persistence

State alone does not save. `persist(next, ops)` takes the new state plus ops
naming *which row* changed (`opProject`, `opDay`, `opNote`, `opPrefs`). Add a
field that needs saving and you must emit the matching op, or it silently lives
only until reload.

`supabase-js` returns errors in the payload — it does not throw. Every call
checks `{ error }`. Skipping that check once cost a day and a half of edits.

## Environment

Windows, PowerShell. Port 5173 is often already taken by a dev server the user
has running — do not kill it.

Two databases. `npm run dev` reads `.env.development.local` (gitignored, a
throwaway Supabase project); `npm run build` and `npm run preview` read the
committed `.env.production`, which is the user's real logbook. Neither falls
back to the other — unset vars give a "No database configured" screen, on
purpose. Verify against the dev server, not a production preview. A new
migration has to be applied by hand to **both** projects.

## Secrets

The anon key is publishable by design — it names the project and grants
nothing; RLS is the actual protection — which is why `.env.production` is
committed. Never add any other credential to the source or to an env file: a
service-role key would be a real leak, and `VITE_`-prefixed vars land in the
client bundle in plain text.

## Reporting back

Finish with: files touched, lint count vs the 16 baseline, whether the build
passed, anything you could not verify, and anything in the spec you did not do.
Do not commit unless the spec asks you to.
