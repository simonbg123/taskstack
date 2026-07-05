# Taskstack

Taskstack is a lightweight, keyboard-driven “task stack” app: a small list of short-lived notes or tasks that you can quickly add, edit, reorder, and “complete” into a daily digest, which can be useful, for example, as stand-up update notes.

It’s built as a **Tauri** desktop app (Rust backend + React frontend) to keep the binary small, fast, and portable across macOS, Linux and Windows.

---

## 1) Architecture overview

Taskstack uses a **thin Rust backend** for persistence and a **React UI** for interaction:

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Rust + Tauri commands
- **Persistence:** JSON files (`notes.json`, `history.json`) stored in the OS app data directory

### Key design choice: simple local persistence

Notes and digest/history entries are stored as JSON to keep everything transparent and easy to back up / inspect.

- Notes are stored in `notes.json`
- Completed tasks are appended to `history.json` (UI calls this the “Digest”)

---

## 2) Install / Run locally (from the repo)

### Prerequisites

You’ll need:

- **Node.js** (recommended: recent LTS)
- **Rust toolchain** (stable)
- **Tauri prerequisites** (platform-specific)

> Tauri prerequisites differ by OS (GTK/WebKit dependencies on Linux; Xcode tools on macOS).  
> If you get build errors about system libraries, you likely need the Tauri prereqs for your platform.

### Clone + install

```bash
git clone https://github.com/simonbg123/taskstack
cd taskstack
npm install
```

### Run in development mode

This launches the app with hot-reloading:

```bash
npm run tauri dev
```

### Build a production app bundle

This creates a packaged app:

```bash
npm run tauri build
```

#### macOS usage (after build)

After building, you’ll get a .app bundle (under src-tauri/target/release/bundle/...).

Typical ways to run it:

    Open the .app directly

    Or copy it to /Applications

    Then launch via Spotlight: Command + Space, type Taskstack

#### Linux usage (after build)

On Linux, Tauri typically produces an .AppImage, .deb, or similar bundle depending on configuration and tooling.

Launching “like a normal app” may depend on the distro / desktop environment:

    On GNOME/KDE you can often launch from the app launcher once installed

    Otherwise you can run the built artifact directly from the command line

#### Optional: override the data directory (useful for testing / portability)

By default, Taskstack stores data in the OS app data directory.

You can override this with:

```bash
TASKSTACK_DATA_DIR=/path/to/some/folder npm run tauri dev
```

This is handy if you:

- want an isolated sandbox
- want multiple “profiles”
- want to test without touching your main saved notes

## 3) Usage

### Core concepts

- Notes: your active task stack (short text entries)
- Digest: completed tasks for a given day, timestamped (backend calls this “history”)

### Common actions

#### Create a note

- Click `+ Add Note` button
- Or press `+` (`Shift` + `=`) when not typing in a text field

A new note is created at the top and immediately enters edit mode.

#### Edit a note

- Click a note (or focus it using `ArrowUp` / `ArrowDown` and press `Enter`)
- Edit in the textarea
- Press `Enter` to save (`Shift`+`Enter` inserts a newline)
- Leaving a note empty and saving/blurring removes it.

#### Navigate notes (keyboard)

- Use `Up`/`Down` arrow keys to move focus between notes (wraps around)

- Reorder (bump) notes
  - `Shift` + `ArrowUp`: move note up. Note that bumping a note that is at the top of the stack will effectively "pop" the note into the digest, as a completed task
  - `Shift` + `ArrowDown`: move note down

#### Complete (“pop”) a note into the digest

- Press `P` (i.e. `Shift` + `p`) while a note is focused
- Or `Shift` + `ArrowUp` on the top note (the top note gets completed)

Completion removes the note from the stack and appends it to the digest/history with a timestamp.

#### Delete a note

- Press `Backspace` or `Delete` while focused
- Or click the right-side `✕` delete strip

#### View Digest

- Click `View Today`: see the digest for today's completed tasks, or press `V` (`Shift` + `v`)
- Click `View Yesterday` to view the digest for yesterday's completed task, or press `Y` (`Shift` + `y`)
- Click `View By Date` to select a specific digest date, or press `D` (`Shift` + `d`)
- Click `Back` (or simply hit `Esc`) to get back to task view

## 4) Keyboard shortcuts

Shortcuts only trigger when you are not typing in an input/textarea.

### Global

- `+` (`Shift` + `=`) → Add note
- `V` (`Shift` + `v`) → View today’s digest
- `Y` (`Shift` + `Y`) → View yesterday’s digest
- `D` (`Shift` + `d`) → Open “View by Date” calendar picker
- `Escape` → Close digest view (when digest is open)

### While a note is focused (not editing)

- `ArrowUp` / `ArrowDown` → Move focus between notes (wraps)
- `Enter` or `Space` → Edit note
- `P` (`Shift` + `p`) → Complete note (move to digest)
- `Shift` + `ArrowUp` / `ArrowDown` → Reorder note (bump)
  - Special case: `Shift` + `ArrowUp` on the top note completes it
- `Backspace` / `Delete` → Delete note

### While editing a note (textarea)

- `Enter` → Save
- `Shift` + `Enter` → New line
- `Escape` → Cancel edit (empty note may be removed)

## Data & storage

Taskstack stores two files in its data directory:

    notes.json — active notes

    history.json — completed notes with timestamps

To test or isolate data, set:

`TASKSTACK_DATA_DIR=/some/path`

## Troubleshooting

“Nothing happens when I press +”

> If your cursor is in a text field (textarea/input), global shortcuts are ignored by design to avoid interrupting typing.

“Build fails on Linux with system library errors”

> You likely need Tauri’s Linux prerequisites (GTK/WebKit/libsoup/etc).
> Install the required packages for your distro, then rebuild.
> “Where is my data saved?”

## Roadmap

- In-app help/menu for keyboard shortcuts
- Ability to edit / re-arrange the daily digest, or "unpop" a completed task back into the stack
- Packaging improvements for native installers (DMG / AppImage)
- E2E test suite
- Optional cloud sync for continuity across devices — local storage stays the default; sync would be opt-in, either to your own Google Drive or to a hosted "Taskstack Cloud"
- Prebuilt installable releases (via GitHub Releases / CI), rather than requiring a clone + build

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
