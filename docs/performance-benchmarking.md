# LyricFlow performance capture

Use the same app build, display scaling, track, lyrics, and 60-second steady-state window for each before/after comparison. Run one scenario per capture and leave the app in that state for the full sample.

```powershell
./scripts/measure_cpu.ps1 -DurationSeconds 60 -Scenario "island-active" -CsvPath "$env:TEMP/lf-island-active.csv"
```

The PowerShell profiler selects the most recently started `lyricflow.exe` (or accepts `-RootPid`) and follows its process tree. CPU percentages are normalized against total logical-processor capacity. The report includes mean, median, and p95 app CPU, renderer and GPU-process CPU when their command lines are readable, process-tree working set and private bytes, and raw per-sample CSV. WebView2 command-line access can be restricted by Windows; in that case the script explicitly labels the process role unavailable rather than attributing unrelated WebView2 processes.

Capture these separately:

| Scenario label | App state during the 60-second sample |
| --- | --- |
| `desktop-idle` | Standard layout, stopped playback |
| `desktop-active` | Standard layout, active playback |
| `split-active` | Split view, active playback |
| `island-active` | Dynamic Island, active playback and lyric changes |
| `island-hover` | Repeated expand/collapse interaction during active playback |
| `wallpaper-style1-active` | Wallpaper style 1, active playback |
| `wallpaper-style2-active` | Wallpaper style 2, active playback |
| `wallpaper-cinematic-active` | Cinematic Wallpaper, active playback |
| `theme-switching` | Repeated theme changes; use the same cadence per run |
| `mode-switching` | Repeated layout/mode changes; use the same sequence per run |

For interaction responsiveness, open the LyricFlow WebView2 DevTools console, paste `scripts/measure-ui-responsiveness.js`, perform the same interactions, then call `window.__lfPerf.stop()`. It reports Event Timing p95 for interactions taking at least 16 ms and Long Tasks; it does not add a polling or animation loop. Event Timing support varies by WebView2 version. Keep those results alongside the matching PowerShell CSV and note the app version and track.

Do not compare an idle capture to playback, or a transition window to steady state. The profiler reports working set and private bytes separately; neither alone proves a leak. For memory accumulation, repeat the same mode/theme switch sequence at least ten times and compare end-of-run values with the initial steady-state sample.
