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

> [!WARNING]
> **Beta Release:** LyricFlow is currently in active development. Some features, such as the Custom Background feature, are not fully functional yet and will be enabled in a future update.

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

- **Main View:** `<img width="1111" height="790" alt="image" src="https://github.com/user-attachments/assets/701d21e8-cdc2-4c1a-8f74-eaf560745b35" />

- **Taskbar Mode:** `<img width="1919" height="445" alt="image" src="https://github.com/user-attachments/assets/8d7eaf30-19e1-41e4-811a-c4cd7fcfa85c" />

- **Settings Panel:** `<img width="1116" height="829" alt="image" src="https://github.com/user-attachments/assets/f59feb51-12a3-4dad-b590-cf02ec847160" />


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

## 🎉 Special Thanks & Acknowledgements

A massive shoutout to the amazing community over at **[BHABHI KI कुटिया](https://discord.gg/bhabhi)**! 

This project wouldn't be where it is today without the early testers, feedback, and endless support from the members of the server. Thank you for helping shape LyricFlow into what it is today!

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <i>Crafted with ❤️ by <a href="https://github.com/badghost">badghost</a></i>
</div>
