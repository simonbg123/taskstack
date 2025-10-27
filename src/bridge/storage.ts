import { invoke } from '@tauri-apps/api/core'; // Tauri v2
// If you're on Tauri v1 use: import { invoke } from '@tauri-apps/api/tauri';
import { Note } from '../note';
export function newId() {
  // @ts-ignore
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`
  );
}

export async function loadNotes(): Promise<Note[]> {
  try {
    return await invoke<Note[]>('load_notes');
  } catch {
    return [];
  }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  await invoke('save_notes', { notes });
}

export async function addToHistory(text: string) {
  await invoke('add_to_history', { text });
}

export type HistoryEntry = { timestamp: string; text: string };

export async function loadHistory(dateStr?: string): Promise<HistoryEntry[]> {
  try {
    return await invoke<HistoryEntry[]>('load_history', { date: dateStr });
  } catch (err) {
    console.error('Failed to load history:', err);
    return [];
  }
}
