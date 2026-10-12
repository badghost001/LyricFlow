# Project: LyricFlow Visualizer, Lyrics & Syllables Refinement

## Architecture
- Module/package boundaries, data flow, shared interfaces:
  - **Audio Loopback**: Rust WASAPI loopback capture (`src-tauri/src/audio.rs`) emitting `audio-visualizer-bands` events to WebView.
  - **Dynamic Island Visualizer & Lyrics Rendering**: `src/renderer.js` handles visualizer state syncing, audio spectrum morphing, marquee scroll masking, duet vocal splitting, and timed word space calculation.
  - **Dynamic Island Styling**: `src/styles/_dynamic_island.css` defines island layout, capsule box shadows, and marquee wrapper overflow behavior.
  - **Lyrics Engine**: `src/services/lyrics/LyricsEngine.js` evaluates active word/syllable timing state for karaoke highlighting.
  - **Lyrics Parsers**: `src/modules/parsers.js` parses LRC and LyricsPlus formats, extracting time tags, syllable tokens, text, and subText.
  - **Acceptance Test Suite**: `tests/corrections-visualizer-lyrics-syllables.test.js` executed via `npm test`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: WASAPI Loopback Buffer & Silence Sleep | Increase buffer to 500ms, eliminate 100ms nested sleep, clear enumerator on reconnect, handle AUDCLNT_E_BUFFER_ERROR non-fatally | M1 | Survey (Explorer 1) |
| 2 | R1: Visualizer Wallpaper & Energy Gating | Wallpaper Mode visualizer persistence under hidden visibility, direct WASAPI energy driving with >350ms silence settling grace period | M1 | Survey (Explorer 1) |
| 3 | R2: Right-Edge Shadow & Mask Elimination | Remove static gradient masks on .island-duet-marquee-wrapper, .island-satellite-marquee-wrapper, .island-stage-original; dynamic JS edge fade on overflow only; crisp 0 4px 14px shadow on duet capsule | M1 | Survey (Explorer 2) |
| 4 | R3: Syllable Tokenization & CJK Continuity | Prevent spaces between syllables of same word (hyphens, cleanLine ground-truth), expand CJK to Hiragana/Katakana/Hangul, strictly preserve hasSpace: false | M1 | Survey (Explorer 3) |
| 5 | R3: Lyrics Engine Micro-Gap Continuity | Keep active syllable state continuous across intra-word micro-gaps up to nextWord.start (or word.end + 0.15) | M1 | Survey (Explorer 3) |
| 6 | R4: Brackets Preceded by 2+ Spaces Secondary Lyrics | Detect 2+ spaces / tabs before brackets as subText in parseLRC/parseLyricsPlus; slice words to primary vocal words; route to duet capsule in parseDuetVocalSplit | M1 | Survey (Explorer 2 & 3) |
| 7 | Acceptance Test Suite & Cargo Check | Create tests/corrections-visualizer-lyrics-syllables.test.js, register in package.json, verify npm test and cargo check | M1 | Survey (Explorer 3) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: LyricFlow Audio, Masking, Syllables & Secondary Lyrics Refinement | Implement R1, R2, R3, R4, acceptance test suite, verify npm test & cargo check | None | DONE |

## Interface Contracts
- **WASAPI Audio Capture -> Renderer**: `audio-visualizer-bands` event payload `Vec<f32>` (NUM_BANDS=4).
- **Renderer Visualizer Sync -> Tauri Bridge**: `window.electronAPI.setAudioVisualizerActive(Boolean)`.
- **Parsers -> Renderer / Engine**: Parsed line object contains `{ timeMs, text, words: Array<{ text, timeMs?, hasSpace? }>, subText?: string }`.
- **Duet Split Contract**: `parseDuetVocalSplit(text)` returns `{ leadText: string, duetText: string, type: 'parenthetical' }` or `null`.

## Code Layout
- Rust Audio: `src-tauri/src/audio.rs`
- Dynamic Island Styling: `src/styles/_dynamic_island.css`
- Frontend Renderer: `src/renderer.js`
- Lyrics Engine: `src/services/lyrics/LyricsEngine.js`
- Parsers: `src/modules/parsers.js`
- Tests: `tests/corrections-visualizer-lyrics-syllables.test.js`, `package.json`
