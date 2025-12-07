import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useRef, useEffect } from 'react';
import { Note } from './models/note';

export type SortableNoteProps = {
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

export function SortableNote({
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

      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          // focus textarea
          el.focus();
          // move caret to end
          const end = el.value.length;
          el.setSelectionRange(end, end);
        }
      });
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
              requestAnimationFrame(() => {
                const el = document.querySelector<HTMLDivElement>(`.note-display[data-id="${id}"]`);
                el?.focus();
              });
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
