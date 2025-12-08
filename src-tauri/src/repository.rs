use chrono::Local;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryEntry {
    pub timestamp: String, // ISO 8601-ish local time string
    pub text: String,
}

pub struct Repository {
    notes_path: PathBuf,
    history_path: PathBuf,
}

impl Repository {
    pub fn new(data_dir: PathBuf) -> Self {
        std::fs::create_dir_all(&data_dir).ok();

        let notes_path = data_dir.join("notes.json");
        let history_path = data_dir.join("history.json");

        Self {
            notes_path,
            history_path,
        }
    }

    // ----------------------------
    // Public API
    // ----------------------------

    pub fn load_notes(&self) -> Result<Vec<Note>, String> {
        self.load_json_or_default(&self.notes_path)
    }

    pub fn save_notes(&self, notes: Vec<Note>) -> Result<(), String> {
        self.save_json(&self.notes_path, &notes)
    }

    pub fn load_history(&self, date: Option<String>) -> Result<Vec<HistoryEntry>, String> {
        let entries: Vec<HistoryEntry> = self.load_json_or_default(&self.history_path)?;

        if let Some(date_str) = date {
            let filtered: Vec<HistoryEntry> = entries
                .into_iter()
                .filter(|e| e.timestamp.starts_with(&date_str))
                .collect();
            Ok(filtered)
        } else {
            Ok(entries)
        }
    }

    pub fn add_to_history(&self, text: String) -> Result<(), String> {
        let mut entries: Vec<HistoryEntry> = self.load_json_or_default(&self.history_path)?;

        entries.push(HistoryEntry {
            timestamp: Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
            text,
        });

        self.save_json(&self.history_path, &entries)
    }

    // ----------------------------
    // Private helpers
    // ----------------------------

    fn load_json_or_default<T>(&self, path: &Path) -> Result<T, String>
    where
        T: DeserializeOwned + Default,
    {
        match fs::read_to_string(path) {
            Ok(data) => serde_json::from_str(&data).map_err(|e| e.to_string()),
            Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(T::default()),
            Err(e) => Err(e.to_string()),
        }
    }

    fn save_json<T: Serialize>(&self, path: &Path, data: &T) -> Result<(), String> {
        let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
        fs::write(path, json).map_err(|e| e.to_string())
    }
}
