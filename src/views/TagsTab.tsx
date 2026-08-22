/* ---------------------------------------------------------------
   Setup's tags — the labels a counter unit can carry.

   Nothing here but the shared list: a tag is a name, a colour, an icon and a
   line saying what it means, which is exactly a slot or an activity minus the
   behaviour. Reusing `EditableList` is the point — the tabs look and reorder
   alike because they are one component.

   Deleting one also strips it off every unit wearing it. A tag id left behind
   in `tagIds` points at nothing: harmless to the filter, which only ever walks
   the tags that exist, but it is rubbish accumulating inside saved data, and
   the only moment anyone can tidy it is the moment it becomes rubbish.
--------------------------------------------------------------- */

import type {
  CounterUnit,
  Project,
  Settings,
  Tag,
} from "../types/model"
import { EditableList } from "../ui/EditableList"

export function TagsTab({
  settings,
  tags,
  units,
  onApply,
}: {
  settings: Settings
  tags: Tag[]
  units: CounterUnit[]
  /**
   * One patch, not two calls. Deleting a tag changes the list in `settings`
   * and strips the id off every unit wearing it; two updates in one tick both
   * read the same project and the last one wins, which quietly threw the
   * cleanup away and left the dangling ids this exists to prevent.
   */
  onApply: (patch: Partial<Project>) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-mono text-ink/45 leading-relaxed">
        Labels for your counters. Put the same tag on several counters and the
        filter can hide or show them together — "good", "health", "work", or
        whatever the useful grouping turns out to be.
      </p>
      <EditableList<Tag>
        items={tags}
        onChange={(next) => {
          const gone = tags
            .filter((t) => !next.some((n) => n.id === t.id))
            .map((t) => t.id)
          onApply({
            settings: { ...settings, tags: next },
            counterUnits: gone.length
              ? units.map((u) =>
                  (u.tagIds || []).some((id) => gone.includes(id))
                    ? {
                        ...u,
                        tagIds: (u.tagIds || []).filter(
                          (id) => !gone.includes(id),
                        ),
                      }
                    : u,
                )
              : units,
          })
        }}
        noun="tag"
        minItems={0}
        warningNote={(label) =>
          `Remove "${label}"? Counters carrying it keep their counts and simply stop being tagged.`
        }
      />
    </div>
  )
}
