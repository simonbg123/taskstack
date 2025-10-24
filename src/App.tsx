import { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  loadNotes,
  saveNotes,
  newId,
  addToHistory,
  HistoryEntry,
  loadTodayHistory,
} from './bridge/storage';

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
  const [showDigest, setShowDigest] = useState(false);
  const [digest, setDigest] = useState<HistoryEntry[]>([]);

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

  function handleSave(id: string, newText: string) {
    const trimmed = newText.trim();
    if (!trimmed) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } else {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text: trimmed } : n)));
    }
    setEditingId(null);
  }

  function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function completeNote(id: string) {
    // find the note first
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    // remove it from the stack
    setNotes((prev) => prev.filter((n) => n.id !== id));

    // now safely record it (after state update)
    await addToHistory(note.text);
  }

  async function loadToday() {
    const entries = await loadTodayHistory();
    setDigest(entries);
    setShowDigest(true);
  }

  return (
    <div className="app-container">
      {showDigest ? (
        <DigestView digest={digest} onBack={() => setShowDigest(false)} />
      ) : (
        <MainNotesView
          notes={notes}
          setNotes={setNotes}
          editingId={editingId}
          setEditingId={setEditingId}
          editText={editText}
          setEditText={setEditText}
          handleAddNote={handleAddNote}
          handleSave={handleSave}
          removeNote={removeNote}
          loadToday={loadToday}
        />
      )}
    </div>
  );

  interface MainNotesViewProps {
    notes: Note[];
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
    editingId: string | null;
    setEditingId: (id: string | null) => void;
    editText: string;
    setEditText: (t: string) => void;
    handleAddNote: () => void;
    handleSave: (id: string, newText: string) => void;
    removeNote: (id: string) => void;
    loadToday: () => void;
  }

  function MainNotesView({
    notes,
    setNotes,
    editingId,
    setEditingId,
    editText,
    setEditText,
    handleAddNote,
    handleSave,
    removeNote,
    loadToday,
  }: MainNotesViewProps) {
    return (
      <>
        <div className="top-bar">
          <button className="btn primary subtle" onClick={handleAddNote}>
            + Add Note
          </button>
          <button className="btn secondary subtle" onClick={loadToday}>
            View Today
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
                  completeNote={completeNote}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </>
    );
  }

  type SortableNoteProps = {
    id: string;
    note: Note;
    editingId: string | null;
    editText: string;
    setEditText: (t: string) => void;
    setEditingId: (i: string | null) => void;
    handleSave: (id: string, newText: string) => void;
    removeNote: (id: string) => void;
    bumpNote: (id: string, delta: number) => void;
    notes: Note[];
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
    completeNote: (id: string) => void;
  };

  function SortableNote({
    id,
    note,
    editingId,
    setEditingId,
    handleSave,
    removeNote,
    bumpNote,
    notes,
    completeNote,
  }: SortableNoteProps) {
    const { listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = { transform: CSS.Transform.toString(transform), transition };
    const isEditing = editingId === id;

    const [localText, setLocalText] = useState(note.text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const displayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      // When switching to edit mode, sync and focus
      if (isEditing) {
        setLocalText(note.text);
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
    }, [isEditing, note.text]);

    // Auto-expand textarea as user types
    useEffect(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    }, [editText]);

    const focusDisplay = () => requestAnimationFrame(() => displayRef.current?.focus());

    return (
      <li ref={setNodeRef} style={style} className="task-card" tabIndex={-1} role="presentation">
        {/* Drag handle */}
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
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={() => {
              const trimmed = localText.trim();
              if (!trimmed && !note.text.trim()) {
                removeNote(id);
              } else if (trimmed !== note.text.trim()) {
                handleSave(id, trimmed);
              } else {
                setEditingId(null);
              }
              focusDisplay();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave(id, localText.trim());
                focusDisplay();
              } else if (e.key === 'Escape') {
                if (note.text.trim() === '') removeNote(id);
                setEditingId(null);
                focusDisplay();
              }
            }}
            rows={Math.min(8, localText.split('\n').length + 1)}
          />
        ) : (
          <div
            ref={displayRef}
            className="note-display"
            tabIndex={0}
            role="button"
            onClick={() => {
              setEditingId(id);
            }}
            onKeyDown={(e) => {
              // Enter/Space -> edit
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setEditingId(id);
                return;
              }

              // Shift + ArrowUp/Down -> move
              if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault();
                const index = notes.findIndex((n) => n.id === id);
                if (e.key === 'ArrowUp' && index === 0) {
                  // ✅ pop top note
                  completeNote(id);
                } else {
                  bumpNote(id, e.key === 'ArrowUp' ? -1 : +1);
                }
                // keep focus on the same note (after reordering)
                requestAnimationFrame(() => e.currentTarget.focus());
                return;
              }

              // "p" to complete
              if (e.key.toLowerCase() === 'p' && !e.shiftKey && !e.ctrlKey) {
                e.preventDefault();
                completeNote(id);
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

        {/* Delete strip */}
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

  function DigestView({
    digest,
    onBack,
  }: {
    digest: { timestamp: string; text: string }[];
    onBack: () => void;
  }) {
    return (
      <>
        <div className="top-bar">
          <button className="btn secondary subtle" onClick={onBack}>
            ← Back
          </button>
        </div>
        <h2 style={{ marginBottom: '1rem' }}>Today’s Completed Tasks</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {digest.map((d, i) => (
            <li key={i} style={{ marginBottom: '0.5rem' }}>
              <strong>
                {new Date(d.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
              {' – '}
              {d.text}
            </li>
          ))}
        </ul>
      </>
    );
  }
}
