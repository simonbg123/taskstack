// src/lib.rs

pub mod repository;

use std::fs;
use std::path::PathBuf;
use tauri::{Manager, State};

pub use repository::{HistoryEntry, Note, Repository};

// ----------------------------
// App entrypoint used by main.rs
// ----------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = resolve_data_dir(app);
            fs::create_dir_all(&data_dir).ok();
            app.manage(Repository::new(data_dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_notes,
            save_notes,
            add_to_history,
            load_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn resolve_data_dir(app: &tauri::App) -> PathBuf {
    if let Ok(p) = std::env::var("TASKSTACK_DATA_DIR") {
        return PathBuf::from(p);
    }
    app.path().app_data_dir().expect("app data dir unavailable")
}

// ----------------------------
// Tauri commands (bridge layer)
// ----------------------------

#[tauri::command]
fn load_notes(repo: State<'_, Repository>) -> Result<Vec<Note>, String> {
    repo.load_notes()
}

#[tauri::command]
fn save_notes(repo: State<'_, Repository>, notes: Vec<Note>) -> Result<(), String> {
    repo.save_notes(notes)
}

#[tauri::command]
fn load_history(
    repo: State<'_, Repository>,
    date: Option<String>,
) -> Result<Vec<HistoryEntry>, String> {
    repo.load_history(date)
}

#[tauri::command]
fn add_to_history(repo: State<'_, Repository>, text: String) -> Result<(), String> {
    repo.add_to_history(text)
}
