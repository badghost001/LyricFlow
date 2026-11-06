# LyricFlow v1.50.2 Release Notes

## What's New in LyricFlow v1.50.2

### ⚡ Sub-Second Fast Lyrics Fetching
* **Eliminated Waterfall Bottlenecks**: Multi-provider queries no longer stall behind cold or hanging upstream scrapers. Fast providers like LRCLIB (150ms) and NetEase display immediately.
* **Capped Scraper Timeout Budgets**: Reduced scraper timeout window from 8.5s to 2.2s.
* **Zero Duplicate Queries**: Stopped 4x redundant HTTP retry cascades and self-induced rate limiting on unindexed tracks.

### 🔒 Persistent OTA Login Retention
* **Retained Spotify & Last.fm Logins**: Dual-tier storage redundancy ensures Spotify (`sp_dc`) and Last.fm credentials survive OTA updates, clean WebView2 resets, and installer upgrades.
* **Safe Configuration Merging**: Rust configuration engine safely merges new keys into existing user config without wiping active sessions.
* **Bypass First-Run Wizard**: Returning authenticated users are immediately recognized and never forced back into the onboarding wizard.

---

### Key Features from v1.50.0
* **Studio Split View**: Redesigned dual-pane layout with responsive tall album artwork and live audio visualizer.
* **Windows Taskbar Mode**: Frosted glass lyric ribbon docked directly onto the Windows taskbar.
* **Cinematic & Kinetic Modes**: Dynamic typography and audio-reactive generative visualizers.
* **Redeveloped Word-by-Word Engine**: Sub-millisecond cadence interpolation, zero-drift PI-PLL clock sync, and qApple lyrics.
* **Apple Motion Art**: Hardware-accelerated decoding and ambient playback of animated album covers.
