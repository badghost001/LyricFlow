# LyricFlow

LyricFlow is a desktop music companion that displays synchronized lyrics, karaoke word highlighting, playback controls, and album-art driven visuals. The main application is built with Tauri 2 and Rust, with a JavaScript, HTML, and CSS interface. Windows builds integrate with Windows System Media Transport Controls (SMTC) to read playback from compatible media sessions.

## Features

- Synchronized lyrics with line-by-line and word-by-word timing, using multiple lyric providers and fallback sources.
- Dynamic Island overlay, desktop lyrics, wallpaper presentation, and Windows taskbar display modes.
- Playback controls, album artwork, audio visualization, translation, and lyric annotations.
- Artwork-aware themes and visual effects, with adjustable presentation settings.
- Windows SMTC playback and metadata support for compatible music apps and other sessions that publish track metadata.

Provider availability and synchronization quality depend on the source and the metadata supplied by the player.

## Requirements

For Windows development:

- Windows 10 or 11.
- Node.js and npm.
- Rust stable toolchain with the MSVC target and Visual Studio C++ build tools.
- Tauri 2 prerequisites, including the Microsoft Edge WebView2 runtime.

See the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for platform-specific setup. The repository also retains Electron development/build scripts for compatibility.

## Getting started

```powershell
git clone https://github.com/badghost001/LyricFlow.git
cd LyricFlow
npm install
npm run tauri:dev
```

The `dev` script also launches Tauri development mode. If you are working with the Electron shell, use `npm start`.

## Build

Build the Tauri application with:

```powershell
npm run tauri:build
```

Build the Windows Electron installers with:

```powershell
npm run build:win
```

Build output locations are configured by the respective Tauri and Electron build settings.

## Tests

Run the JavaScript test suite with:

```powershell
npm test
```

Run Rust library tests with:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

## Repository layout

- `src/` — application interface, renderer, styles, and JavaScript modules.
- `src-tauri/` — Tauri application and Rust commands, lyric providers, and media integrations.
- `tests/` — JavaScript tests and visual-render checks.
- `assets/` — application artwork and other static resources.
- `main.js`, `preload*.js` — Electron shell and preload integrations.

## Troubleshooting

- If playback is not detected, confirm the player is actively playing and exposes a Windows SMTC session with track metadata. Some players do not publish complete session information.
- If lyrics are missing or use line timing, try another available lyric source or refresh the lyrics. Provider catalogs and track matching can differ.
- If Tauri cannot start, verify the Rust/MSVC toolchain and WebView2 installation against the Tauri prerequisites.

## License

LyricFlow is distributed under the proprietary terms in [LICENSE](LICENSE). Do not redistribute or modify the software outside the permissions granted by that license.
