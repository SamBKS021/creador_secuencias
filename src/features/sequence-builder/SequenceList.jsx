import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SequenceItemCard from './SequenceItemCard.jsx'

function SequenceList({ items, pageOffset = 0, totalItems = 0, songs, onDragEnd, onRemove, onMove }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((item, index) => {
            const absoluteIndex = pageOffset + index

            return (
              <SequenceItemCard
                key={item.id}
                item={item}
                index={absoluteIndex + 1}
                motionDelay={index * 45}
                song={songs.find((song) => song.id === item.songId)}
                onRemove={onRemove}
                onMove={onMove}
                canMoveUp={absoluteIndex > 0}
                canMoveDown={absoluteIndex < totalItems - 1}
              />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export default SequenceList
