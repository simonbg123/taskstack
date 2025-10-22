import { useState, useEffect, useRef } from 'react';
import './App.css';
import { loadNotes, saveNotes, newId } from './bridge/storage';

import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Note } from './note';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor) // mouse/touch only; we'll handle keyboard ourselves
  );

  // Avoid saving before first load finishes
  const loadedRef = useRef(false);

  // Async load on mount
  useEffect(() => {
    (async () => {
      const data = await loadNotes();
      setNotes(data);
      loadedRef.current = true;
    })();
  }, []);

  // Debounced save whenever notes change (after initial load)
  useEffect(() => {
    if (!loadedRef.current) return;
    const t = setTimeout(() => {
      void saveNotes(notes);
    }, 150);
    return () => clearTimeout(t);
  }, [notes]);

  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      const ae = document.activeElement as HTMLElement | null;
      const inTextarea = ae?.tagName === 'TEXTAREA';

      const plus = e.key === '+' || (e.key === '=' && e.shiftKey);
      if (!inTextarea && plus) {
        e.preventDefault();
        handleAddNote();
      }
    }
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  function handleAddNote() {
    const newNote: Note = { id: newId(), text: '' };
    setNotes((prev) => [newNote, ...prev]);
    setEditingId(newNote.id);
    setEditText('');
  }

  function bumpNote(id: string, delta: number) {
    setNotes((prev) => {
      const i = prev.findIndex((n) => n.id === id);
      if (i === -1) return prev;
      const j = Math.max(0, Math.min(prev.length - 1, i + delta));
      if (i === j) return prev;
      return arrayMove(prev, i, j);
    });
  }

  function handleSave(id: string) {
    const trimmed = editText.trim();
    if (!trimmed) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } else {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text: editText } : n)));
    }
    setEditingId(null);
  }

  function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="app-container">
      <div className="top-bar">
        <button className="btn primary subtle" onClick={handleAddNote}>
          + Add Note
        </button>
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
                editText={editText}
                setEditText={setEditText}
                setEditingId={setEditingId}
                handleSave={handleSave}
                removeNote={removeNote}
                notes={notes}
                setNotes={setNotes}
                bumpNote={bumpNote}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

type SortableNoteProps = {
  id: string;
  note: Note;
  editingId: string | null;
  editText: string;
  setEditText: (t: string) => void;
  setEditingId: (i: string | null) => void;
  handleSave: (id: string) => void;
  removeNote: (id: string) => void;
  bumpNote: (id: string, delta: number) => void;
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
};

function SortableNote({
  id,
  note,
  editingId,
  editText,
  setEditText,
  setEditingId,
  handleSave,
  removeNote,
  bumpNote,
}: SortableNoteProps) {
  const { listeners, setNodeRef, transform, transition } = useSortable({
    id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const isEditing = editingId === id;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [isEditing]);

  // restore focus to the note row
  const focusDisplay = () => requestAnimationFrame(() => displayRef.current?.focus());

  return (
    <li ref={setNodeRef} style={style} className="task-card" tabIndex={-1} role="presentation">
      {/* Drag handle: not tabbable */}
      <div
        className="drag-handle"
        {...listeners}
        tabIndex={-1}
        role="presentation"
        aria-hidden="true"
      />

      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="note-input small"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={() => {
            if (editText.trim() === '' && note.text.trim() === '') {
              removeNote(id);
            } else if (editText !== note.text) {
              handleSave(id);
            } else {
              setEditingId(null);
            }
            focusDisplay();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSave(id);
              focusDisplay();
            } else if (e.key === 'Escape') {
              if (note.text.trim() === '') removeNote(id);
              setEditingId(null);
              focusDisplay();
            }
          }}
          rows={Math.min(8, editText.split('\n').length + 1)}
        />
      ) : (
        <div
          ref={displayRef}
          className="note-display"
          tabIndex={0}
          role="button"
          onClick={(e) => {
            const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
            const offset = range?.startOffset ?? note.text.length;
            setEditingId(id);
            setEditText(note.text);
            requestAnimationFrame(() => {
              const ta = textareaRef.current;
              if (ta) {
                ta.focus();
                ta.setSelectionRange(offset, offset);
              }
            });
          }}
          onKeyDown={(e) => {
            // Enter/Space -> edit
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setEditingId(id);
              setEditText(note.text);
              requestAnimationFrame(() => {
                const ta = textareaRef.current;
                if (ta) {
                  const end = ta.value.length;
                  ta.focus();
                  ta.setSelectionRange(end, end);
                }
              });
              return;
            }

            // Shift + ArrowUp/ArrowDown -> move
            if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
              e.preventDefault();
              bumpNote(id, e.key === 'ArrowUp' ? -1 : +1);
              // keep focus on the same (moved) note
              requestAnimationFrame(() => e.currentTarget.focus());
              return;
            }

            // Backspace/Delete -> remove
            if (e.key === 'Backspace' || e.key === 'Delete') {
              e.preventDefault();
              removeNote(id);
              return;
            }
          }}
        >
          <pre className="note-text">{note.text}</pre>
        </div>
      )}

      {/* Delete strip: click-only */}
      <div
        className="delete-zone"
        tabIndex={-1}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => removeNote(id)}
      >
        ✕
      </div>
    </li>
  );
}
