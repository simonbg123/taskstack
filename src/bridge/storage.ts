// src/bridge/storage.ts
import { invoke } from '@tauri-apps/api/core'; // Tauri v2
import { Note } from '../models/note';
import { DigestEntry } from '../models/digestEntry';

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

/**
 * UI concept: "digest"
 * Backend concept: "history"
 */
export async function addToDigest(text: string): Promise<void> {
  await invoke('add_to_history', { text });
}

export async function loadDigest(dateStr?: string): Promise<DigestEntry[]> {
  try {
    // Backend still returns "history" entries, which match DigestEntry shape
    return await invoke<DigestEntry[]>('load_history', { date: dateStr });
  } catch (err) {
    console.error('Failed to load digest (history):', err);
    return [];
  }
}
