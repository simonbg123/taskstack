import { useSensors, useSensor, PointerSensor, DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState, useRef, useEffect } from 'react';
import { SortableNote } from './SortableNote';
import { Note } from './note';

export function MainNotesView({
  notes,
  setNotes,
  editingId,
  setEditingId,
  handleAddNote,
  handleSave,
  removeNote,
  loadToday,
  loadYesterday,
  loadSpecificDate,
  bumpNote,
  completeNote,
  onRowFocus,
}: MainNotesViewProps) {
  const sensors = useSensors(useSensor(PointerSensor));
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);

  // --- global shortcut: Shift+D → toggle picker ---
  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      const ae = document.activeElement as HTMLElement | null;
      const tag = ae?.tagName?.toLowerCase();
      const isInput =
        tag === 'textarea' || tag === 'input' || ae?.getAttribute('contenteditable') === 'true';
      if (isInput) return;

      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowPicker((prev) => !prev);
      }
    }

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  // focus + preload today when the picker opens
  useEffect(() => {
    if (showPicker) {
      requestAnimationFrame(() => pickerRef.current?.focus());
    }
  }, [showPicker]);

  function commitDate(val: string) {
    if (!val) {
      setShowPicker(false);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    loadSpecificDate(localDate);
    setShowPicker(false);
  }

  return (
    <>
      <div className="top-bar" style={{ gap: '8px' }}>
        <button
          className="btn primary subtle"
          onMouseDown={(e) => e.preventDefault()} // keep focus stable
          onClick={handleAddNote}
        >
          + Add Note
        </button>
        <button className="btn secondary subtle" onClick={loadToday}>
          View Today
        </button>
        <button className="btn secondary subtle" onClick={loadYesterday}>
          View Yesterday
        </button>
        <div className="date-picker-slot">
          {!showPicker ? (
            <button className="btn secondary subtle" onClick={() => setShowPicker(true)}>
              View by Date
            </button>
          ) : (
            <input
              ref={pickerRef}
              type="date"
              className="date-picker"
              onChange={(e) => commitDate(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitDate(e.currentTarget.value);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowPicker(false);
                  requestAnimationFrame(() => {
                    const first = document.querySelector<HTMLDivElement>('.note-display');
                    first?.focus();
                  });
                }
              }}
              onBlur={() => {
                setShowPicker(false);
                requestAnimationFrame(() => {
                  const first = document.querySelector<HTMLDivElement>('.note-display');
                  first?.focus();
                });
              }}
            />
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (!over || active.id === over.id) return;
          const oldIndex = notes.findIndex((n) => n.id === active.id);
          const newIndex = notes.findIndex((n) => n.id === over.id);
          setNotes((items) => arrayMove(items, oldIndex, newIndex));
        }}
      >
        <SortableContext items={notes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {notes.map((note) => (
              <SortableNote
                key={note.id}
                id={note.id}
                note={note}
                editingId={editingId}
                setEditingId={setEditingId}
                handleSave={handleSave}
                removeNote={removeNote}
                bumpNote={bumpNote}
                notes={notes}
                completeNote={completeNote}
                onRowFocus={onRowFocus}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}
export interface MainNotesViewProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  handleAddNote: () => void;
  handleSave: (id: string, newText: string) => void;
  removeNote: (id: string) => void;
  loadToday: () => void;
  loadYesterday: () => void;
  loadSpecificDate: (date: Date) => void;
  bumpNote: (id: string, delta: number) => void;
  completeNote: (id: string) => void;
  onRowFocus: (id: string) => void;
}
