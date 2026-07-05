import { useState, useEffect, useRef } from 'react';
import './App.css';
import { loadNotes, saveNotes, newId, addToDigest, loadDigest } from './bridge/storage';
import { arrayMove } from '@dnd-kit/sortable';
import { Note } from './models/note';
import { DigestEntry } from './models/digestEntry';
import { MainNotesView } from './MainNotesView';
import { DigestView } from './DigestView';
import { isTypingTarget } from './dom';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDigest, setShowDigest] = useState(false);
  const [digest, setDigest] = useState<DigestEntry[]>([]);
  const [digestDate, setDigestDate] = useState<Date | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null); // ✅ track focus
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

  // Always land on the top note when the OS window regains focus (e.g.
  // switching back to the app via Cmd+Tab) — regardless of whatever note
  // happened to be focused before the window lost focus.
  useEffect(() => {
    function onWindowFocus() {
      if (!showDigest) focusTop();
    }
    window.addEventListener('focus', onWindowFocus);
    return () => window.removeEventListener('focus', onWindowFocus);
  }, [showDigest]);

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
  useEffect(() => {
    async function onGlobalKeyDown(e: KeyboardEvent) {
      const ae = document.activeElement;
      if (isTypingTarget(ae)) return;

      const plusPressed = e.key === '+' || (e.key === '=' && e.shiftKey);
      if (plusPressed) {
        e.preventDefault();
        handleAddNote();
      }

      // Shift + V → show today's digest
      if (e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        await loadToday();
        return;
      }

      // Shift + Y → show yesterday's digest
      if (e.shiftKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        await loadYesterday();
        return;
      }

      // Escape → close digest view
      if (e.key === 'Escape' && showDigest) {
        e.preventDefault();
        setShowDigest(false);
        setFocusedId(null); // focus top when returning
        return;
      }
    }

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [showDigest]);

  // ----------------------------
  // Actions
  // ----------------------------
  function handleAddNote() {
    setEditingId(null); // cancel any current edit first

    const newNote: Note = { id: newId(), text: '' };
    setNotes((prev) => [newNote, ...prev]);
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
    await addToDigest(note.text);
  }

  // Load digest for a specific date
  async function loadDigestForDate(date: Date) {
    // Format as YYYY-MM-DD
    const dateStr = date.toLocaleDateString('en-CA');
    const entries = await loadDigest(dateStr);
    setDigest(entries);
    setDigestDate(date);
    setShowDigest(true);
  }

  // Convenience wrapper: today
  async function loadToday() {
    await loadDigestForDate(new Date());
  }

  // Convenience wrapper: yesterday
  async function loadYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    await loadDigestForDate(d);
  }

  async function loadSpecificDate(date: Date) {
    await loadDigestForDate(date);
  }

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <div className="app-container">
      {showDigest ? (
        <DigestView
          digest={digest}
          date={digestDate}
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
          handleAddNote={handleAddNote}
          handleSave={handleSave}
          removeNote={removeNote}
          loadToday={loadToday}
          loadYesterday={loadYesterday}
          loadSpecificDate={loadSpecificDate}
          bumpNote={bumpNote}
          completeNote={completeNote}
          onRowFocus={(id) => setFocusedId(id)} // ✅ keep track when user tabs manually
        />
      )}
    </div>
  );
}
