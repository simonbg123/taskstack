// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// src-tauri/src/main.rs
use chrono::Local;
use serde::{de::DeserializeOwned, Deserialize, Serialize};

use std::{
    fs,
    path::{Path, PathBuf},
};

use tauri::Manager;

fn load_json<T: DeserializeOwned>(path: &Path) -> Result<T, String> {
    match fs::read_to_string(path) {
        Ok(data) => serde_json::from_str(&data).map_err(|e| e.to_string()),
        Err(_) => Err("File not found".into()),
    }
}

fn save_json<T: Serialize>(path: &Path, data: &T) -> Result<(), String> {
    let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    id: String,
    text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryEntry {
    pub timestamp: String, // ISO 8601 UTC string or local time
    pub text: String,
}

fn history_file_path(app: &tauri::AppHandle) -> PathBuf {
    let dir = app.path().app_data_dir().expect("app data dir unavailable");
    fs::create_dir_all(&dir).ok();
    dir.join("history.json")
}

#[tauri::command]
fn load_today_history(app: tauri::AppHandle) -> Result<Vec<HistoryEntry>, String> {
    // Load all entries
    let file_path = history_file_path(&app);
    let json = fs::read_to_string(&file_path).unwrap_or_else(|_| "[]".to_string());
    let entries: Vec<HistoryEntry> = serde_json::from_str(&json).unwrap_or_default();

    // Filter only today's entries
    let today = Local::now().format("%Y-%m-%d").to_string();
    let filtered: Vec<HistoryEntry> = entries
        .into_iter()
        .filter(|e| e.timestamp.starts_with(&today))
        .collect();

    Ok(filtered)
}

#[tauri::command]
fn add_to_history(app: tauri::AppHandle, text: String) -> Result<(), String> {
    let mut entries: Vec<HistoryEntry> = load_json(&history_file_path(&app)).unwrap_or_default();

    entries.push(HistoryEntry {
        timestamp: Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
        text,
    });

    save_json(&history_file_path(&app), &entries)
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
        .invoke_handler(tauri::generate_handler![
            load_notes,
            save_notes,
            add_to_history,
            load_today_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
