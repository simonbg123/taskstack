// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// src-tauri/src/main.rs
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Note {
    id: String,
    text: String,
}

fn notes_file_path(app: &tauri::AppHandle) -> PathBuf {
    // Tauri v1 API:
    let dir = app.path().app_data_dir().expect("app data dir unavailable");

    fs::create_dir_all(&dir).ok();
    dir.join("notes.json")
}

// If you’re on Tauri v2, swap the helper aboves to:
// fn notes_file_path(app: &tauri::AppHandle) -> PathBuf {
//   let dir = app.path().app_data_dir().expect("app data dir unavailable");
//   fs::create_dir_all(&dir).ok();
//   dir.join("notes.json")
// }

#[tauri::command]
fn load_notes(app: tauri::AppHandle) -> Result<Vec<Note>, String> {
    let path = notes_file_path(&app);
    match fs::read_to_string(path) {
        Ok(txt) => {
            let parsed: Vec<Note> = serde_json::from_str(&txt).unwrap_or_default();
            Ok(parsed)
        }
        Err(_) => Ok(Vec::new()), // first run: file doesn’t exist -> empty list
    }
}

#[tauri::command]
fn save_notes(app: tauri::AppHandle, notes: Vec<Note>) -> Result<(), String> {
    let path = notes_file_path(&app);
    let json = serde_json::to_string_pretty(&notes).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![load_notes, save_notes,])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
