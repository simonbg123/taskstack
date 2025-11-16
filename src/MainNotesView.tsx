import { useSensors, useSensor, PointerSensor, DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState, useRef, useEffect, forwardRef } from 'react';
import { SortableNote } from './SortableNote';
import { Note } from './models/note';

import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { isTypingTarget } from './dom';

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

/**
 * Button used as react-datepicker's customInput.
 * ReactDatePicker injects onClick, onKeyDown, etc. via props.
 */
const DateButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  (props, ref) => (
    <button {...props} ref={ref} type="button" className="btn secondary subtle">
      View by Date
    </button>
  )
);
DateButton.displayName = 'DateButton';

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // react-datepicker instance; use "any" to keep TS happy
  const dpRef = useRef<any>(null); //todo should be named datePickerRef

  function focusFirstNote() {
    requestAnimationFrame(() => {
      const first = document.querySelector<HTMLDivElement>('.note-display');
      first?.focus();
    });
  }

  // --- global shortcut: Shift+D → open picker ---
  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      const ae = document.activeElement;
      if (isTypingTarget(ae)) return;

      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        // Ask the datepicker to open and focus
        dpRef.current?.setOpen(true);
        dpRef.current?.setFocus?.();
      }
    }

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  return (
    <>
      <div className="top-bar">
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
          <ReactDatePicker
            ref={dpRef}
            selected={selectedDate}
            onChange={(date: Date | null) => {
              if (date instanceof Date && !isNaN(date.getTime())) {
                setSelectedDate(date);
                loadSpecificDate(date);
              }
              focusFirstNote();
            }}
            onCalendarClose={() => {
              // when closed (ESC/click outside), return focus to top task
              focusFirstNote();
            }}
            customInput={<DateButton />}
            dateFormat="yyyy-MM-dd"
            showPopperArrow={false}
          />
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
          <div className="notes-list">
            <ul>
              {' '}
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
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}
