/* ---------------------------------------------------------------
   Setup's categories — the groupings a counter can belong to.

   Nothing here but the shared list: a category is a name, a colour, an icon
   and a line saying what it means, which is exactly a tag minus the "wear as
   many as are true". Reusing `EditableList` is the point — the tabs look and
   reorder alike because they are one component.

   Deleting one clears it off everything filed under it, in **both** lists:
   activities keep their own array and counters keep theirs, and a category id
   left behind in either points at nothing. Harmless to every reader, which
   only walks the categories that exist — and rubbish inside saved data, whose
   one moment to be tidied is the moment it becomes rubbish.
--------------------------------------------------------------- */

import type {
  Activity,
  Category,
  CounterUnit,
  Project,
  Settings,
} from "../types/model"
import { EditableList } from "../ui/EditableList"

export function CategoriesTab({
  settings,
  categories,
  activities,
  units,
  onApply,
}: {
  settings: Settings
  categories: Category[]
  activities: Activity[]
  units: CounterUnit[]
  /**
   * One patch, not three calls.
   *
   * Deleting a category changes the list *and* everything filed under it, in
   * two other arrays. Three separate updates in one tick all read the same
   * project and the last one wins, so the two cleanups would vanish and leave
   * ids pointing at a category that no longer exists — which is exactly the
   * rubbish this is here to prevent.
   */
  onApply: (patch: Partial<Project>) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-mono text-ink/45 leading-relaxed">
        Groupings for your counters — "study", "health", "things to do less
        of", or whatever the useful shelf turns out to be. One per counter, so
        the Counters tab can lay them all out under headings with each thing
        appearing exactly once. A counter can still wear any number of tags.
      </p>
      <EditableList<Category>
        items={categories}
        onChange={(next) => {
          const gone = categories
            .filter((cat) => !next.some((n) => n.id === cat.id))
            .map((cat) => cat.id)
          const strip = <T extends { categoryId?: string }>(items: T[]) =>
            gone.length
              ? items.map((i) =>
                  i.categoryId && gone.includes(i.categoryId)
                    ? { ...i, categoryId: undefined }
                    : i,
                )
              : items
          onApply({
            settings: { ...settings, categories: next },
            activities: strip(activities),
            counterUnits: strip(units),
          })
        }}
        noun="category"
        minItems={0}
        warningNote={(label) =>
          `Remove "${label}"? Everything filed under it keeps its counts and simply stops being grouped.`
        }
      />
    </div>
  )
}
