<div align="center">
  <img src="assets/icon.png" alt="LyricFlow Logo" width="120" />
  <h1>LyricFlow</h1>
  <p><strong>A premium, glassmorphic desktop lyrics overlay with real-time sync for Spotify and local media.</strong></p>
  
  <p>
    <a href="#features">Features</a> •
    <a href="#installation">Installation</a> •
    <a href="#how-it-works">How It Works</a> •
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

## ✨ Features

- 🎵 **Real-Time Lyrics Sync:** Follows your music word-for-word using the LRCLIB API.
- 🪟 **Taskbar Mode:** A sleek, non-intrusive mode that docks lyrics directly into your Windows taskbar.
- 🎨 **Premium Glassmorphic Design:** Beautiful UI with adjustable transparency, blur effects, and smooth micro-animations.
- 💡 **Edge Glow:** A reactive, ambient light effect that borders your screen, matching the dominant colors of the album art.
- 🌍 **Auto-Translation:** Instantly translates lyrics into your preferred language using Google Translate API.
- 🧠 **Genius Integration:** Displays deep-dive facts and annotations from Genius about the song currently playing.
- 📻 **Local Mode & Spotify Web API:** Supports querying local Windows media sessions (SMTC) or connecting directly to your Spotify account.
- 👾 **Discord Rich Presence:** Show off what you're listening to on Discord with a custom status.
- 📰 **Music News:** An integrated feed of the latest music headlines.

## 🖼️ Screenshots

*(Add screenshots here)*
- **Main View:** `![Main View](link_to_image)`
- **Taskbar Mode:** `![Taskbar Mode](link_to_image)`
- **Settings Panel:** `![Settings](link_to_image)`

## 🚀 Installation

### Using the Pre-compiled Executable (Recommended for Windows)

1. Go to the [Releases](https://github.com/badghost/LyricFlow/releases) page.
2. Download `LyricFlow Setup X.X.X.exe`.
3. Run the installer and launch LyricFlow!

### Building from Source

If you want to modify the app or run it from the source code:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/badghost/LyricFlow.git
   cd LyricFlow
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run the app in development mode:**
   ```bash
   npm start
   ```
4. **Build the executable:**
   ```bash
   npm run build:win
   ```

## 🛠️ Technologies Used

- **[Electron](https://www.electronjs.org/)** - For the desktop application framework.
- **Vanilla JS / HTML / CSS** - For a lightweight, fast, and responsive user interface without framework bloat.
- **[LRCLIB](https://lrclib.net/)** - For fetching highly accurate, time-synced `.lrc` lyrics.
- **[Genius API](https://genius.com/developers)** - For song annotations and trivia.
- **Windows SMTC (System Media Transport Controls)** - For detecting local media playback via PowerShell scripts.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <i>Crafted with ❤️ by <a href="https://github.com/badghost">badghost</a></i>
</div>
