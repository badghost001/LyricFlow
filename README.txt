LyricFlow
A premium, glassmorphic desktop lyrics overlay with real-time sync for Spotify and local media.

=========================================
FEATURES
=========================================
* Real-Time Lyrics Sync: Follows your music word-for-word using the LRCLIB API.
* Taskbar Mode: A sleek, non-intrusive mode that docks lyrics directly into your Windows taskbar.
* Premium Glassmorphic Design: Beautiful UI with adjustable transparency, blur effects, and smooth micro-animations.
* Edge Glow: A reactive, ambient light effect that borders your screen, matching the dominant colors of the album art.
* Auto-Translation: Instantly translates lyrics into your preferred language using Google Translate API.
* Genius Integration: Displays deep-dive facts and annotations from Genius about the song currently playing.
* Local Mode & Spotify Web API: Supports querying local Windows media sessions (SMTC) or connecting directly to your Spotify account.
* Discord Rich Presence: Show off what you're listening to on Discord with a custom status.
* Music News: An integrated feed of the latest music headlines.

=========================================
INSTALLATION (WINDOWS)
=========================================
1. Go to the GitHub Releases page.
2. Download LyricFlow Setup X.X.X.exe.
3. Run the installer and launch LyricFlow!

=========================================
BUILDING FROM SOURCE
=========================================
If you want to modify the app or run it from the source code:

1. Clone the repository:
   git clone https://github.com/badghost/LyricFlow.git
   cd LyricFlow

2. Install dependencies:
   npm install

3. Run the app in development mode:
   npm start

4. Build the executable:
   npm run build:win

=========================================
TECHNOLOGIES USED
=========================================
* Electron - For the desktop application framework.
* Vanilla JS / HTML / CSS - Lightweight, fast, and responsive user interface.
* LRCLIB - For fetching highly accurate, time-synced lyrics.
* Genius API - For song annotations and trivia.
* Windows SMTC - For detecting local media playback via PowerShell scripts.

=========================================
LICENSE
=========================================
This project is licensed under the MIT License.

Crafted with love by badghost
