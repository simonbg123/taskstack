use std::{fs, path::PathBuf};

use taskstack_lib::{Note, Repository};
use tempfile::TempDir;

fn make_repo() -> (TempDir, Repository) {
    let tmp = TempDir::new().expect("create temp dir failed");
    let data_dir = PathBuf::from(tmp.path());
    let repo = Repository::new(data_dir);
    (tmp, repo)
}

#[test]
fn load_notes_missing_file_returns_empty_vec() {
    let (_tmp, under_test) = make_repo();

    let notes = under_test.load_notes().expect("load_notes should succeed");

    assert!(
        notes.is_empty(),
        "Expected empty list when notes file is missing"
    );
}

#[test]
fn save_and_load_notes_round_trip_for_1_and_n() {
    let (_tmp, under_test) = make_repo();

    // 1-note case
    assert_round_trip(
        &under_test,
        vec![Note {
            id: "1".into(),
            text: "One".into(),
        }],
    );

    // n-notes case
    assert_round_trip(
        &under_test,
        vec![
            Note {
                id: "a".into(),
                text: "First".into(),
            },
            Note {
                id: "b".into(),
                text: "Second".into(),
            },
            Note {
                id: "c".into(),
                text: "Third".into(),
            },
        ],
    );
}

fn assert_round_trip(repo: &Repository, notes: Vec<Note>) {
    repo.save_notes(notes.clone()).expect("save notes");

    let loaded = repo.load_notes().expect("load notes");

    assert_eq!(loaded.len(), notes.len());
    for (expected, actual) in notes.iter().zip(loaded.iter()) {
        assert_eq!(actual.id, expected.id);
        assert_eq!(actual.text, expected.text);
    }
}

#[test]
fn load_notes_errors_on_invalid_json() {
    let (tmp, under_test) = make_repo();
    let notes_path = tmp.path().join("notes.json");
    fs::write(&notes_path, "this is not valid json").expect("write corrupt notes file");

    let result = under_test.load_notes();

    assert!(
        result.is_err(),
        "Expected error when notes.json contains invalid JSON"
    );
}

#[test]
fn load_history_missing_file_returns_empty_vec() {
    let (_tmp, under_test) = make_repo();

    let entries = under_test
        .load_history(None)
        .expect("load_history should succeed");

    assert!(
        entries.is_empty(),
        "Expected empty history when file is missing"
    );
}

#[test]
fn add_to_history_then_load_history_yields_entries() {
    let (_tmp, under_test) = make_repo();

    under_test
        .add_to_history("First done".into())
        .expect("add first history entry");
    under_test
        .add_to_history("Second done".into())
        .expect("add second history entry");

    let entries = under_test
        .load_history(None)
        .expect("load_history should succeed");

    assert_eq!(entries.len(), 2);
    assert_eq!(entries[0].text, "First done");
    assert_eq!(entries[1].text, "Second done");
}

#[test]
fn load_history_filters_by_date_prefix() {
    let (tmp, under_test) = make_repo();
    let history_path = tmp.path().join("history.json");
    let json = r#"
      [
        { "timestamp": "2024-12-01T10:00:00", "text": "Dec 1 - A" },
        { "timestamp": "2024-12-01T11:00:00", "text": "Dec 1 - B" },
        { "timestamp": "2024-12-02T09:00:00", "text": "Dec 2 - C" }
      ]
    "#;
    fs::write(&history_path, json).expect("write history.json");

    let dec1 = under_test
        .load_history(Some("2024-12-01".into()))
        .expect("load_history for 2024-12-01");

    assert_eq!(dec1.len(), 2);
    assert!(dec1.iter().all(|e| e.timestamp.starts_with("2024-12-01")));

    let dec2 = under_test
        .load_history(Some("2024-12-02".into()))
        .expect("load_history for 2024-12-02");

    assert_eq!(dec2.len(), 1);
    assert!(dec2[0].timestamp.starts_with("2024-12-02"));
}

#[test]
fn load_history_errors_when_json_invalid() {
    let (tmp, under_test) = make_repo();
    let history_path = tmp.path().join("history.json");
    fs::write(&history_path, "not valid json").expect("write invalid history.json");

    let result = under_test.load_history(None);

    assert!(
        result.is_err(),
        "Expected error when history.json is corrupt"
    );
}
