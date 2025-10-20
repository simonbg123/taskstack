import { useState, useEffect, useRef, KeyboardEvent, ChangeEvent } from 'react';
import './App.css';
import { loadNotes, saveNotes } from './storage';

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function App() {
  const [notes, setNotes] = useState<string[]>([]);
  const [text, setText] = useState<string>('');
  const [showInput, setShowInput] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>('');

  useEffect(() => setNotes(loadNotes()), []);
  useEffect(() => saveNotes(notes), [notes]);
  useEffect(() => {
    if (showInput && textareaRef.current) {
      // Give React a tick to finish rendering before focusing
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [showInput]);

  function addNote() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setNotes([text, ...notes]); // keep newlines
    setText('');
    setShowInput(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function removeNote(i: number) {
    setNotes(notes.filter((_, idx) => idx !== i));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    autoResize();
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  return (
    <div className="app-container">
      {/* top button */}
      <div className="top-bar">
        {!showInput && (
          <button className="btn primary subtle" onClick={() => setShowInput(true)}>
            + Add Note
          </button>
        )}
      </div>

      {/* editor area */}
      {showInput && (
        <div className="add-note-area">
          <textarea
            ref={textareaRef}
            placeholder="Add note..."
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={7}
            className="note-input"
          />
          <div className="button-row">
            <button className="btn secondary" onClick={() => setShowInput(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* stack of notes */}
      {/* stack of notes with drag-and-drop */}
      <DndContext
        sensors={useSensors(useSensor(PointerSensor))}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (!over || active.id === over.id) return;
          const oldIndex = Number(active.id);
          const newIndex = Number(over.id);
          setNotes((notes) => arrayMove(notes, oldIndex, newIndex));
        }}
      >
        <SortableContext
          items={notes.map((_, i) => i.toString())}
          strategy={verticalListSortingStrategy}
        >
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {notes.map((note, i) => (
              <SortableNote
                key={i}
                id={i.toString()}
                index={i}
                note={note}
                editingIndex={editingIndex}
                editText={editText}
                setEditText={setEditText}
                setEditingIndex={setEditingIndex}
                setNotes={setNotes}
                notes={notes}
                removeNote={removeNote}
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
  index: number;
  note: string;
  editingIndex: number | null;
  editText: string;
  setEditText: (t: string) => void;
  setEditingIndex: (i: number | null) => void;
  setNotes: React.Dispatch<React.SetStateAction<string[]>>;
  notes: string[];
  removeNote: (i: number) => void;
};

function SortableNote({
  id,
  index,
  note,
  editingIndex,
  editText,
  setEditText,
  setEditingIndex,
  setNotes,
  notes,
  removeNote,
}: SortableNoteProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className="task-card" {...attributes} {...listeners}>
      {editingIndex === index ? (
        <textarea
          className="note-input small"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              const updated = [...notes];
              updated[index] = editText;
              setNotes(updated);
              setEditingIndex(null);
            } else if (e.key === 'Escape') {
              setEditingIndex(null);
            }
          }}
          rows={Math.min(8, editText.split('\n').length + 1)}
          autoFocus
        />
      ) : (
        <div
          className="note-display"
          onClick={() => {
            setEditingIndex(index);
            setEditText(note);
          }}
        >
          <pre className="note-text">{note}</pre>
        </div>
      )}
      <div className="delete-zone" onClick={() => removeNote(index)}>
        ✕
      </div>
    </li>
  );
}
