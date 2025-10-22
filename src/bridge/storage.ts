// src/bridge/storage.ts
import { invoke } from '@tauri-apps/api/core'; // Tauri v2
// If you're on Tauri v1 use: import { invoke } from '@tauri-apps/api/tauri';

export type Note = { id: string; text: string };

// Fall back if crypto.randomUUID is missing in some envs
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
