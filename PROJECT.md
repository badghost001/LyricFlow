# Project: LyricFlow Dynamic Island CPU & Compositing Elimination

## Architecture
- Module/package boundaries, data flow, shared interfaces:
  - **Frontend Renderer Engine (`src/renderer.js`)**: Playhead animation loop (`updatePlayhead`), Dynamic Island word progress ticks (`updateDynamicIslandWordProgressTick`), audio spectrum handler (`onAudioSpectrum`), visualizer canvas renderer (`drawIslandVisualizer`), and energy morph styling (`updateIslandEnergyMorph`).
  - **WebGL Fluid Mesh Engine (`src/modules/fluid-mesh.js`)**: WebGL shader background, `sleep()` / `wake()` lifecycle, and `setPlaybackState()` integration.
  - **Dynamic Island Styling & Compositor Layers (`src/styles/_dynamic_island.css`)**: Glass capsule layout, box shadows, art halo filters, canvas layers, active lyric word gradient clipping, and metamorphosis transitions.
  - **Win32 Window Bounds & DWM Compositing (`src-tauri/src/commands/window.rs`)**: Physical HWND bounds shrinking and DirectComposition transparent swapchain presentation.
  - **Acceptance & Regression Test Suites (`tests/`)**: 72+ test suites executed via `npm test`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Fluid Mesh Sleep Hardening | Fix `this.isSleeping = true` outside GL context check in `src/modules/fluid-mesh.js` | M1 (DONE) | Survey (Explorer 1 & 3) |
| 2 | Fluid Mesh Gated Playback State | Check `shouldRunFluidMesh()` in `adaptBpmSync` before waking `fluidMeshGradientInstance` | M1 (DONE) | Survey (Explorer 1 & 3) |
| 3 | Playhead Interval Normalization | Align hidden Dynamic Island playhead tick from 25ms (40 FPS) to 33.3ms (30 FPS) | M1 (DONE) | Survey (Explorer 1 & 3) |
| 4 | Scrubber DOM Mutation Gating | Gate scrubber fill/time updates when `.island-expanded-controls` is not hovered | M1 (DONE) | Survey (Explorer 1) |
| 5 | Deduplicate Line Transform | Guard `islandLine.style.transform = 'translate3d(0px, 0, 0)'` against redundant writes | M1 (DONE) | Survey (Explorer 1) |
| 6 | Canvas Layer & Paint Containment | Add `contain: strict; transform: translateZ(0)` to `.island-wave-canvas` and `.island-wave-visualizer` | M2 | Survey (Explorer 2) |
| 7 | Bloom Shadow & Blur Decoupling | Decouple dynamic bloom from static box-shadows / stabilize halo blur radius | M2 | Survey (Explorer 2) |
| 8 | Active Word Layer Promotion Cleanup | Remove redundant `will-change: transform` from `.lyric-word.lyric-word-active` | M2 | Survey (Explorer 2) |
| 9 | Inactive Overlay Canvas Suppression | Set `display: none` on `#island-ca-emitter-canvas` when idle | M2 | Survey (Explorer 2) |
| 10 | Metamorphosis Transition Scoping | Scope tier transitions away from `transition: all` to specific properties | M2 | Survey (Explorer 2) |
| 11 | Empirical CPU Reduction Verification | Measure live CPU via `measure_cpu.ps1` confirming Renderer < 5% and GPU < 4% | M3 | Survey (Explorer 3) |
| 12 | Test Suite 100% Pass Rate | Verify 100% green pass across all 72+ test suites in `npm test` | M3 | Survey (All) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Frontend JS Renderer & WebGL Loop Throttling | Implement Features 1, 2, 3, 4, 5 in `src/renderer.js` and `src/modules/fluid-mesh.js` | None | DONE |
| 2 | M2: GPU Compositing, CSS Containment & Canvas Layer Isolation | Implement Features 6, 7, 8, 9, 10 in `src/styles/_dynamic_island.css` and `src/renderer.js` | M1 | IN_PROGRESS |
| 3 | M3: Empirical CPU Profiling & Full Test Suite Verification | Execute Features 11, 12, verify live process CPU metrics and run all 72+ test suites | M1, M2 | PLANNED |

## Interface Contracts
- **FluidMesh Lifecycle Contract**: `sleep()` must set `this.isSleeping = true` regardless of GL state; `start()` must abort immediately when `this.isSleeping === true`.
- **Playhead Cadence Contract**: `updatePlayhead()` runs at `PLAYHEAD_FRAME_INTERVAL_MS = 33.3ms` (30 Hz) during active word karaoke and relaxes when resting.
- **Island Scrubber Contract**: `#island-progress-fill` and time labels only update if `#dynamic-island:hover` is active.
- **Visualizer Compositing Contract**: `.island-wave-canvas` renders on an isolated composited quad (`contain: strict; transform: translateZ(0)`), never invalidating `#dynamic-island` raster tiles.

## Code Layout
- Frontend JS Renderer: `src/renderer.js`
- WebGL Fluid Mesh: `src/modules/fluid-mesh.js`
- Dynamic Island Styling: `src/styles/_dynamic_island.css`
- Empirical Measurement Script: `.agents/teamwork/teamwork_explorer_o7_system/measure_cpu.ps1`
- Test Suites: `tests/` and `package.json`
