<div align="center">
  <img src="assets/icon.png" alt="LyricFlow Logo" width="120" />
  <h1>LyricFlow</h1>
  <p><strong>A lightweight, glassmorphic desktop lyrics overlay with real-time sync for Spotify and local media.</strong></p>
  <p><i>Rebuilt from the ground up in Rust & Tauri v2 for ultra-low memory (< 30 MB) and instant responsiveness.</i></p>
  
  <p>
    <a href="#features">Features</a> •
    <a href="#screenshots">Screenshots</a> •
    <a href="#installation">Installation</a> •
    <a href="#macos-notes">macOS Notes</a> •
    <a href="#technologies-used">Technologies Used</a> •
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

## Features

- 🎵 **Real-Time Lyrics Sync:** Follows your music word-for-word using the LRCLIB API with smooth clock slew interpolation.
- 🪟 **Taskbar & Menu Bar Mode:** Docks lyrics directly into your Windows taskbar or macOS Menu Bar for a non-intrusive HUD.
- 🎨 **Glassmorphic Design:** Sleek, customizable translucent UI with backdrop blur and micro-animations.
- 💡 **Edge Glow:** Reactive ambient lighting bordering your display, matching album artwork colors.
- 🌍 **Auto-Translation:** Instantly translates lyrics into your preferred language using Google Translate API.
- 🧠 **Genius Integration:** Displays deep-dive facts and annotations from Genius for the currently playing track.
- 📻 **Native Media Engines:** 
  - **Windows:** Deep integration with Windows SMTC (System Media Transport Controls) and Spotify Web API.
  - **macOS:** Native AppleScript IPC integration with Spotify Desktop and Apple Music (`Music.app`).
- ⚡ **Ultra-Low Resource Footprint:** Rebuilt with Tauri v2 + Rust—consumes ~30 MB RAM (90% reduction compared to Electron) and near 0% idle CPU.
- 👾 **Discord Rich Presence:** Displays your currently listening track on Discord with custom status.
- 🔄 **Built-in Auto Updater:** Seamless background OTA updates verified cryptographically with Minisign.

## Screenshots

- **Main View:** <img width="1111" height="790" alt="image" src="https://github.com/user-attachments/assets/701d21e8-cdc2-4c1a-8f74-eaf560745b35" />

- **Taskbar Mode:** <img width="1919" height="445" alt="image" src="https://github.com/user-attachments/assets/8d7eaf30-19e1-41e4-811a-c4cd7fcfa85c" />

- **Settings Panel:** <img width="1116" height="829" alt="image" src="https://github.com/user-attachments/assets/f59feb51-12a3-4dad-b590-cf02ec847160" />

## System Requirements

- **Windows:** Windows 10 (1809+) or Windows 11 (64-bit)
- **macOS:** macOS 11 Big Sur or newer (Universal Binary: Apple Silicon M1-M4 & Intel x86_64 supported)
- **RAM:** 512 MB minimum (uses ~30 MB actively)
- **Storage:** ~50 MB available space
- **Supported Players:** Spotify Desktop, Apple Music (`Music.app` on macOS), or any Windows SMTC player.

## Installation

### Windows
1. Go to the [Releases](https://github.com/badghost001/LyricFlow/releases) page.
2. Download `LyricFlow_x64-setup.exe` (or `.msi`).
3. Run the installer and launch LyricFlow!

### macOS
1. Go to the [Releases](https://github.com/badghost001/LyricFlow/releases) page.
2. Download `LyricFlow.dmg` (Universal binary for both Apple Silicon and Intel Macs).
3. Open the `.dmg` and drag `LyricFlow.app` into your **Applications** folder.

### macOS Notes & Permissions
- **Automation Permission:** On first launch, macOS will prompt you to grant LyricFlow permission to control Spotify or Apple Music. Click **Allow** so LyricFlow can fetch playback status and timestamps.
- **Gatekeeper / Unsigned Binary:** Because LyricFlow is an independent open-source project without a paid Apple Developer certificate, macOS Gatekeeper may show a notice on first launch. To open:
  - Right-click (or Control-click) `LyricFlow.app` in `/Applications` and select **Open**.
  - Or run: `xattr -cr /Applications/LyricFlow.app` in Terminal.

## Building from Source

Prerequisites: Node.js 20+ and Rust stable (`rustup`).

1. **Clone the repository:**
   ```bash
   git clone https://github.com/badghost001/LyricFlow.git
   cd LyricFlow
   ```
2. **Install frontend dependencies:**
   ```bash
   npm install
   ```
3. **Run in development mode:**
   ```bash
   npm run tauri:dev
   ```
4. **Build release bundles:**
   ```bash
   npm run tauri:build
   ```

## Technologies Used

- **[Tauri v2](https://v2.tauri.app/)** & **[Rust](https://www.rust-lang.org/)** - For blazing-fast native performance and ultra-lightweight memory footprint.
- **Vanilla JS / HTML / CSS** - Glassmorphism, backdrop-filters, and hardware-accelerated animations.
- **[LRCLIB](https://lrclib.net/)** - High-accuracy, time-synced `.lrc` lyrics.
- **[Genius API](https://genius.com/developers)** - Song annotations, trivia, and lyrics fallback.
- **Native OS APIs:**
  - Windows: `windows` crate (SMTC, WebView2 cookie extraction, Win32 taskbar metrics).
  - macOS: AppleScript IPC (`osascript`) for Spotify / Apple Music, `pbcopy`, native Login Items.

## 🤝 Community Testing & Contributing

We welcome community contributions, testing, and feedback!
- **Mac Users:** Since the core development team operates primarily on Windows, macOS feedback and testing is greatly appreciated. If you encounter any UI, permission, or media sync quirks on macOS, please [open an issue](https://github.com/badghost001/LyricFlow/issues) with details about your macOS version and hardware!
- **Pull Requests:** PRs for improvements, translations, or new features are warmly welcomed.

## 🎉 Special Thanks & Acknowledgements

A massive shoutout to the amazing community over at **[BHABHI KI कुटिया](https://discord.gg/bhabhi)**! 

This project wouldn't be where it is today without the early testers, feedback, and endless support from the members of the server. Thank you for helping shape LyricFlow into what it is today!

## 📝 License

This project is licensed under a Proprietary License (All Rights Reserved). You may not copy, distribute, or modify this software for commercial use. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <i>Crafted with ❤️ by <a href="https://github.com/badghost001">badghost</a></i>
</div>
