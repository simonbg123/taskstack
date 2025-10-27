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

  const [focusedId, setFocusedId] = useState<string | null>(null); // ✅ track focus
  const sensors = useSensors(useSensor(PointerSensor));
  const loadedRef = useRef(false);

  // ----------------------------
  // Focus helpers
  // ----------------------------
  function focusById(id: string | null, fallbackTop = true) {
    requestAnimationFrame(() => {
      if (id) {
        const el = document.querySelector<HTMLDivElement>(`.note-display[data-id="${id}"]`);
        if (el) {
          el.focus();
          return;
        }
      }
      if (fallbackTop) {
        const first = document.querySelector<HTMLDivElement>('.note-display');
        first?.focus();
      }
    });
  }

  function focusTop() {
    focusById(null, true);
  }

  useEffect(() => {
    if (showDigest) return; // skip while viewing digest
    if (focusedId) focusById(focusedId);
    else focusTop();
  }, [notes, focusedId, showDigest]);

  // ----------------------------
  // Load / save
  // ----------------------------
  useEffect(() => {
    (async () => {
      const data = await loadNotes();
      setNotes(data);
      loadedRef.current = true;
      focusTop(); // focus top after load
    })();
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    const t = setTimeout(() => {
      void saveNotes(notes);
    }, 150);
    return () => clearTimeout(t);
  }, [notes]);

  // ----------------------------
  // Global hotkey: "+" adds note
  // ----------------------------
  // ----------------------------
  // Global hotkey: "+" adds note
  // ----------------------------
  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      const ae = document.activeElement as HTMLElement | null;
      const tag = ae?.tagName?.toLowerCase();
      const isInput =
        tag === 'textarea' || tag === 'input' || ae?.getAttribute('contenteditable') === 'true';

      if (isInput) return; // ignore if typing in a field

      const plusPressed = e.key === '+' || (e.key === '=' && e.shiftKey);
      if (plusPressed) {
        e.preventDefault();
        handleAddNote();
      }
    }

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  // ----------------------------
  // Actions
  // ----------------------------
  function handleAddNote() {
    setEditingId(null); // cancel any current edit first

    const newNote: Note = { id: newId(), text: '' };
    setNotes((prev) => [newNote, ...prev]);
    setEditText('');
    setFocusedId(newNote.id);

    // ✅ Delay edit activation slightly to avoid conflicting re-render
    requestAnimationFrame(() => setEditingId(newNote.id));
  }

  function bumpNote(id: string, delta: number) {
    setNotes((prev) => {
      const i = prev.findIndex((n) => n.id === id);
      if (i === -1) return prev;
      const j = Math.max(0, Math.min(prev.length - 1, i + delta));
      if (i === j) return prev;
      setFocusedId(id);
      return arrayMove(prev, i, j);
    });
  }

  function handleSave(id: string, newText: string) {
    const trimmed = newText.trim();
    setNotes((prev) =>
      trimmed
        ? prev.map((n) => (n.id === id ? { ...n, text: trimmed } : n))
        : prev.filter((n) => n.id !== id)
    );
    setEditingId(null);
    setFocusedId(trimmed ? id : null);
  }

  function removeNote(id: string) {
    setNotes((prev) => {
      const i = prev.findIndex((n) => n.id === id);
      if (i === -1) return prev;
      const next = prev[i + 1]?.id ?? prev[i - 1]?.id ?? null;
      setFocusedId(next);
      return prev.filter((n) => n.id !== id);
    });
  }

  async function completeNote(id: string) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    setNotes((prev) => {
      const filtered = prev.filter((n) => n.id !== id);
      const next = filtered[0]?.id ?? null;
      setFocusedId(next);
      return filtered;
    });
    await addToHistory(note.text);
  }

  async function loadToday() {
    const entries = await loadTodayHistory();
    setDigest(entries);
    setShowDigest(true);
  }

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <div className="app-container">
      {showDigest ? (
        <DigestView
          digest={digest}
          onBack={() => {
            setShowDigest(false);
            setFocusedId(null); // focus top when returning
          }}
        />
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
          bumpNote={bumpNote}
          completeNote={completeNote}
          onRowFocus={(id) => setFocusedId(id)} // ✅ keep track when user tabs manually
        />
      )}
    </div>
  );
}

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
  bumpNote: (id: string, delta: number) => void;
  completeNote: (id: string) => void;
  onRowFocus: (id: string) => void;
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
  bumpNote,
  completeNote,
  onRowFocus,
}: MainNotesViewProps) {
  const sensors = useSensors(useSensor(PointerSensor));

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

type SortableNoteProps = {
  id: string;
  note: Note;
  editingId: string | null;
  setEditingId: (i: string | null) => void;
  handleSave: (id: string, newText: string) => void;
  removeNote: (id: string) => void;
  bumpNote: (id: string, delta: number) => void;
  notes: Note[];
  completeNote: (id: string) => void;
  onRowFocus: (id: string) => void;
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
  onRowFocus,
}: SortableNoteProps) {
  const { listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isEditing = editingId === id;

  const [localText, setLocalText] = useState(note.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      setLocalText(note.text);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [isEditing, note.text]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [localText]);

  return (
    <li ref={setNodeRef} style={style} className="task-card" tabIndex={-1} role="presentation">
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
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSave(id, localText.trim());
            } else if (e.key === 'Escape') {
              if (note.text.trim() === '') removeNote(id);
              setEditingId(null);
            }
          }}
          rows={Math.min(8, localText.split('\n').length + 1)}
        />
      ) : (
        <div
          className="note-display"
          data-id={id}
          tabIndex={0}
          role="button"
          onFocus={() => onRowFocus(id)}
          onClick={() => setEditingId(id)}
          onKeyDown={(e) => {
            const index = notes.findIndex((n) => n.id === id);

            // ↑↓ navigation (without Shift)
            if (!e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
              e.preventDefault();
              const nextIndex =
                e.key === 'ArrowUp'
                  ? (index - 1 + notes.length) % notes.length // wraps upward
                  : (index + 1) % notes.length; // wraps downward
              const nextId = notes[nextIndex]?.id;
              if (nextId) {
                const el = document.querySelector<HTMLDivElement>(
                  `.note-display[data-id="${nextId}"]`
                );
                el?.focus();
              }
              return;
            }

            // Enter/Space -> edit
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setEditingId(id);
              return;
            }

            // Shift + ArrowUp/Down -> move or pop
            if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
              e.preventDefault();
              if (e.key === 'ArrowUp' && index === 0) {
                completeNote(id);
              } else {
                bumpNote(id, e.key === 'ArrowUp' ? -1 : +1);
              }
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
