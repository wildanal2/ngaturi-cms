"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Eye,
  EyeOff,
  Copy,
  Trash2,
} from "lucide-react";
import { useBuilder } from "@/stores/builder-store";
import { SectionRegistry } from "@/sections/registry";

export function SectionList() {
  const sections = useBuilder((s) => s.sections);
  const reorder = useBuilder((s) => s.reorder);
  const locked = useBuilder((s) => s.locked);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function onDragEnd(e: DragEndEvent) {
    if (e.over && e.active.id !== e.over.id) {
      reorder(String(e.active.id), String(e.over.id));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={sections.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-1">
          {sections.map((s) => (
            <Row key={s.id} id={s.id} locked={locked} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function Row({ id, locked }: { id: string; locked: boolean }) {
  const section = useBuilder((s) => s.sections.find((x) => x.id === id));
  const selectedId = useBuilder((s) => s.selectedId);
  const select = useBuilder((s) => s.select);
  const toggleVisible = useBuilder((s) => s.toggleVisible);
  const removeSection = useBuilder((s) => s.removeSection);
  const duplicateSection = useBuilder((s) => s.duplicateSection);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  if (!section) return null;
  const def = SectionRegistry[section.type];
  const active = selectedId === id;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-1 rounded-lg border px-1.5 py-1.5 text-sm ${
        active ? "border-forest bg-cream-200" : "border-transparent hover:bg-cream-200"
      } ${isDragging ? "opacity-60" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        disabled={locked}
        className="cursor-grab text-muted disabled:cursor-not-allowed"
        aria-label="Geser"
      >
        <GripVertical size={15} />
      </button>
      <button
        onClick={() => select(id)}
        className={`flex-1 truncate text-left ${section.visible ? "" : "text-muted line-through"}`}
      >
        {def?.name ?? section.type}
      </button>
      <div className="flex items-center gap-0.5 text-muted opacity-0 group-hover:opacity-100">
        <button
          onClick={() => toggleVisible(id)}
          disabled={locked}
          aria-label="Tampil/sembunyi"
        >
          {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button
          onClick={() => duplicateSection(id)}
          disabled={locked}
          aria-label="Gandakan"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={() => removeSection(id)}
          disabled={locked}
          aria-label="Hapus"
          className="text-wine"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}
