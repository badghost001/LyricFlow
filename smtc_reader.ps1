param(
    [int]$ParentPid = 0,
    [string]$DllPath = ""
)

# Load the required Windows Runtime assembly
Add-Type -AssemblyName System.Runtime.WindowsRuntime

# Determine parent process ID to prevent orphaned background processes
$parentPid = if ($ParentPid -gt 0) {
    $ParentPid
} else {
    try {
        (Get-CimInstance Win32_Process -Filter "ProcessId = $PID").ParentProcessId
    } catch {
        $null
    }
}

# Load Win32 helper: use precompiled DLL if available to avoid runtime csc.exe compilation overhead
if ($DllPath -and (Test-Path -LiteralPath $DllPath)) {
    try {
        Add-Type -Path $DllPath -ErrorAction Stop
    } catch {
        $DllPath = ""
    }
}

if (-not $DllPath -or -not ([System.Management.Automation.PSTypeName]'Win32').Type) {
    # Fallback declaration of Win32 methods
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll")]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll", SetLastError=true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public static bool IsShellWindow(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return true;
        StringBuilder sb = new StringBuilder(256);
        GetClassName(hWnd, sb, 256);
        string c = sb.ToString();
        if (string.IsNullOrEmpty(c)) return false;
        if (c == "Shell_TrayWnd" || c == "Shell_SecondaryTrayWnd" || c == "Progman" || c == "WorkerW" ||
            c == "XamlExplorerHostIslandWindow" || c == "Windows.UI.Core.CoreWindow" ||
            c == "StartMenuExperienceHost" || c == "TaskSwitcherWnd" || c == "MultitaskingViewFrame" ||
            c == "TopLevelWindowForOverflowXamlIsland" || c == "NotifyIconOverflowWindow" ||
            c == "TrayFlyoutWClass" || c == "DV2ControlHost" || c == "ApplicationFrameWindow" ||
            c.IndexOf("Xaml", StringComparison.OrdinalIgnoreCase) >= 0 ||
            c.IndexOf("Shell", StringComparison.OrdinalIgnoreCase) >= 0 ||
            c.IndexOf("Start", StringComparison.OrdinalIgnoreCase) >= 0) {
            return true;
        }
        uint pid = 0;
        GetWindowThreadProcessId(hWnd, out pid);
        if (pid != 0) {
            try {
                string pName = System.Diagnostics.Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant();
                if (pName == "explorer" || pName == "startmenuexperiencehost" || pName == "searchhost" ||
                    pName == "shellexperiencehost" || pName == "textinputhost" || pName == "searchapp" ||
                    pName == "taskmgr") {
                    return true;
                }
            } catch {}
        }
        return false;
    }
}
"@
}

# Define the WinRT namespaces
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]

# Create a helper to handle the IAsyncOperation (Awaiting the task)
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and 
    $_.GetParameters().Count -eq 1 -and 
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
})[0]

function Await-WinRT {
    param($WinRtTask, $ResultType)
    try {
        $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $asTask.Invoke($null, @($WinRtTask))
        $netTask.Wait(-1) | Out-Null
        return $netTask.Result
    } catch {
        return $null
    }
}

try {
    $sessionManager = Await-WinRT ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
} catch {
    Write-Host '{"status":"Error","message":"Failed to initialize SMTC Session Manager"}'
    exit
}

$lastFullscreenState = $false
$lastJson = ""
while ($true) {
    if ($parentPid -and -not (Get-Process -Id $parentPid -ErrorAction SilentlyContinue)) {
        exit
    }
    try {
        $hwnd = [Win32]::FindWindow("Shell_TrayWnd", $null)
        $isTaskbarHidden = $false
        if ($hwnd -ne [IntPtr]::Zero) {
            $rect = New-Object Win32+RECT
            if ([Win32]::GetWindowRect($hwnd, [ref]$rect)) {
                $screenHeight = [Win32]::GetSystemMetrics(1)
                $screenWidth  = [Win32]::GetSystemMetrics(0)
                $tbWidth  = $rect.Right - $rect.Left
                $tbHeight = $rect.Bottom - $rect.Top
                # Windows 10: Taskbar height/width collapses to <= 5px.
                # Windows 11: Taskbar height stays ~48px, but rect.Top slides down to >= screenHeight - 4px.
                # Also handles top/left/right auto-hiding taskbars.
                if ($tbHeight -le 5 -or $tbWidth -le 5 -or $rect.Top -ge ($screenHeight - 4) -or $rect.Bottom -le 4 -or $rect.Right -le 4 -or $rect.Left -ge ($screenWidth - 4)) {
                    $isTaskbarHidden = $true
                }
            }
        }

        # Check if the currently active window is in fullscreen mode (to hide taskbar lyrics)
        $fgHwnd = [Win32]::GetForegroundWindow()
        $isFullscreen = $false
        if ($fgHwnd -ne [IntPtr]::Zero) {
            if (-not [Win32]::IsShellWindow($fgHwnd)) {
                $fgRect = New-Object Win32+RECT
                if ([Win32]::GetWindowRect($fgHwnd, [ref]$fgRect)) {
                    $screenWidth = [Win32]::GetSystemMetrics(0)
                    $screenHeight = [Win32]::GetSystemMetrics(1)
                    if ($fgRect.Left -le 0 -and $fgRect.Top -le 0 -and $fgRect.Right -ge $screenWidth -and $fgRect.Bottom -ge $screenHeight) {
                        $isFullscreen = $true
                    }
                }
            }
        }
        $lastFullscreenState = $isFullscreen
        if ($isFullscreen) {
            $isTaskbarHidden = $true
        }

        $session = $null
        try {
            $sessions = $sessionManager.GetSessions()
            $mediaSessions = @()
            foreach ($s in $sessions) {
                $lastUpdated = [System.DateTimeOffset]::MinValue
                try {
                    $timeline = $s.GetTimelineProperties()
                    if ($timeline) {
                        $lastUpdated = $timeline.LastUpdatedTime
                    }
                } catch {}
                
                $appId = $s.SourceAppUserModelId
                $lower = if ($appId) { $appId.ToLower() } else { "" }
                $isMusic = $false
                $isBrowser = $false

                foreach ($m in @('spotify', 'applemusic', 'itunes', 'tidal', 'deezer', 'amazonmusic', 'youtubemusic', 'ytmusic', 'foobar', 'musicbee', 'aimp', 'vlc', 'winamp', 'dopamine', 'cider')) {
                    if ($lower.Contains($m)) { $isMusic = $true; break }
                }
                if (-not $isMusic) {
                    foreach ($b in @('chrome', 'msedge', 'firefox', 'brave', 'opera', 'vivaldi', 'arc', 'discord', 'telegram', 'whatsapp', 'slack', 'teams')) {
                        if ($lower.Contains($b)) { $isBrowser = $true; break }
                    }
                }

                $status = "Closed"
                try {
                    $info = $s.GetPlaybackInfo()
                    if ($info) { $status = $info.PlaybackStatus.ToString() }
                } catch {}

                $mediaSessions += [PSCustomObject]@{
                    Session = $s
                    IsMusic = $isMusic
                    IsBrowser = $isBrowser
                    Status = $status
                    LastUpdated = $lastUpdated
                }
            }

            if ($mediaSessions.Count -gt 0) {
                # 1. Any dedicated Music App that is Playing (Spotify, Apple Music, etc.)
                # This guarantees browser videos (YouTube, Twitter, etc.) NEVER hijack active music!
                $playingMusic = $mediaSessions | Where-Object { $_.IsMusic -and $_.Status -eq 'Playing' } | Sort-Object -Property LastUpdated -Descending
                if ($playingMusic) {
                    $session = $playingMusic[0].Session
                }

                # 2. Any dedicated Music App that is Paused
                # When you pause Spotify, keep tracking Spotify rather than jumping to a browser video
                if ($null -eq $session) {
                    $pausedMusic = $mediaSessions | Where-Object { $_.IsMusic -and $_.Status -eq 'Paused' } | Sort-Object -Property LastUpdated -Descending
                    if ($pausedMusic) {
                        $session = $pausedMusic[0].Session
                    }
                }

                # 3. Any other non-browser app that is Playing
                if ($null -eq $session) {
                    $playingOther = $mediaSessions | Where-Object { -not $_.IsBrowser -and $_.Status -eq 'Playing' } | Sort-Object -Property LastUpdated -Descending
                    if ($playingOther) {
                        $session = $playingOther[0].Session
                    }
                }

                # 4. Fallback: Any playing app (only if no dedicated music app exists)
                if ($null -eq $session) {
                    $anyPlaying = $mediaSessions | Where-Object { $_.Status -eq 'Playing' } | Sort-Object -Property LastUpdated -Descending
                    if ($anyPlaying) {
                        $session = $anyPlaying[0].Session
                    }
                }

                # 5. Fallback: Most recently updated session
                if ($null -eq $session) {
                    $sortedSessions = $mediaSessions | Sort-Object -Property LastUpdated -Descending
                    $session = $sortedSessions[0].Session
                }
            }
        } catch {}

        if ($null -ne $session) {
            $props = Await-WinRT ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
            $info = $session.GetPlaybackInfo()
            $timeline = $session.GetTimelineProperties()
            
            $title = if ($props) { $props.Title } else { "" }
            $artist = if ($props) { $props.Artist } else { "" }
            $status = if ($info) { $info.PlaybackStatus.ToString() } else { "Closed" }
            $position = if ($timeline) { $timeline.Position.TotalMilliseconds } else { 0 }
            $duration = if ($timeline) { $timeline.EndTime.TotalMilliseconds } else { 0 }
            
            $playbackRate = 1.0
            if ($info -and $info.PlaybackRate) {
                try {
                    $r = [double]$info.PlaybackRate
                    if ($r -gt 0) { $playbackRate = $r }
                } catch {}
            }

            if ($timeline -and $info -and $info.PlaybackStatus.ToString() -eq "Playing") {
                $now = [System.DateTimeOffset]::UtcNow
                $elapsed = $now - $timeline.LastUpdatedTime
                $position = $timeline.Position.TotalMilliseconds + ($elapsed.TotalMilliseconds * $playbackRate)
                if ($position -gt $duration) { $position = $duration }
                if ($position -lt 0) { $position = 0 }
            }
            
            $data = @{
                status = $status
                title = $title
                artist = $artist
                position = $position
                duration = $duration
                playbackRate = $playbackRate
                app = $session.SourceAppUserModelId
                taskbarHidden = $isTaskbarHidden
            }
            $json = $data | ConvertTo-Json -Compress
            if ($status -eq "Playing" -or $json -ne $lastJson) {
                Write-Host $json
                $lastJson = $json
            }
        } else {
            $data = @{ 
                status = "Closed"
                taskbarHidden = $isTaskbarHidden
            }
            $json = $data | ConvertTo-Json -Compress
            if ($json -ne $lastJson) {
                Write-Host $json
                $lastJson = $json
            }
        }
    } catch {
        $data = @{ 
            status = "Closed"
            taskbarHidden = $isTaskbarHidden
        }
        $json = $data | ConvertTo-Json -Compress
        if ($json -ne $lastJson) {
            Write-Host $json
            $lastJson = $json
        }
    }
    Start-Sleep -Milliseconds 250
}
