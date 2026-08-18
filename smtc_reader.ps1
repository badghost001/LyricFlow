# Load the required Windows Runtime assembly
Add-Type -AssemblyName System.Runtime.WindowsRuntime

# Determine parent process ID to prevent orphaned background processes
$parentPid = try {
    (Get-CimInstance Win32_Process -Filter "ProcessId = $PID").ParentProcessId
} catch {
    $null
}

# Declare Win32 methods for taskbar visibility detection
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
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@

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
while ($true) {
    if ($parentPid -and -not (Get-Process -Id $parentPid -ErrorAction SilentlyContinue)) {
        exit
    }
    try {
        # Find our app window and dynamically manage WS_EX_TOOLWINDOW based on height
        # to exclude it from Alt+Tab switcher when in taskbar mode
        $myHwnd = [Win32]::FindWindow("Chrome_WidgetWin_1", "LyricFlow")
        if ($myHwnd -ne [IntPtr]::Zero) {
            $myRect = New-Object Win32+RECT
            if ([Win32]::GetWindowRect($myHwnd, [ref]$myRect)) {
                $myHeight = $myRect.Bottom - $myRect.Top
                $GWL_EXSTYLE = -20
                $WS_EX_TOOLWINDOW = 0x80
                $SWP_FLAGS = 0x37 # SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE
                
                $exStyle = [Win32]::GetWindowLong($myHwnd, $GWL_EXSTYLE)
                if ($myHeight -gt 0 -and $myHeight -lt 100) {
                    # Taskbar mode: ensure WS_EX_TOOLWINDOW is set
                    if (($exStyle -band $WS_EX_TOOLWINDOW) -eq 0) {
                        $null = [Win32]::SetWindowLong($myHwnd, $GWL_EXSTYLE, $exStyle -bor $WS_EX_TOOLWINDOW)
                        $null = [Win32]::SetWindowPos($myHwnd, [IntPtr]::Zero, 0, 0, 0, 0, $SWP_FLAGS)
                    }
                } else {
                    # Normal mode: ensure WS_EX_TOOLWINDOW is removed
                    if (($exStyle -band $WS_EX_TOOLWINDOW) -ne 0) {
                        $null = [Win32]::SetWindowLong($myHwnd, $GWL_EXSTYLE, $exStyle -band -not $WS_EX_TOOLWINDOW)
                        $null = [Win32]::SetWindowPos($myHwnd, [IntPtr]::Zero, 0, 0, 0, 0, $SWP_FLAGS)
                    }
                }
            }
        }

        $hwnd = [Win32]::FindWindow("Shell_TrayWnd", $null)
        $isTaskbarHidden = $false
        if ($hwnd -ne [IntPtr]::Zero) {
            $rect = New-Object Win32+RECT
            if ([Win32]::GetWindowRect($hwnd, [ref]$rect)) {
                $tbWidth  = $rect.Right - $rect.Left
                $tbHeight = $rect.Bottom - $rect.Top
                # Taskbar is "hidden" only when it has actually slid off screen
                # (auto-hide: height or width collapses to ~2px).
                # A normal visible bottom taskbar has height ~40-60px, so we use a
                # threshold of 5 to avoid false positives.
                if ($tbHeight -le 5 -or $tbWidth -le 5) { $isTaskbarHidden = $true }
            }
        }

        # Check if the currently active window is in fullscreen mode (to hide taskbar lyrics)
        $fgHwnd = [Win32]::GetForegroundWindow()
        $isFullscreen = $lastFullscreenState
        if ($fgHwnd -ne [IntPtr]::Zero) {
            $sb = New-Object System.Text.StringBuilder 256
            [void][Win32]::GetClassName($fgHwnd, $sb, 256)
            $className = $sb.ToString()
            
            # If it's a transient system/shell window, we keep the last known fullscreen state to prevent flashing
            if ($className -eq "MultitaskingViewFrame" -or $className -eq "TaskSwitcherWnd" -or $className -eq "Windows.UI.Core.CoreWindow" -or $className -eq "Shell_TrayWnd" -or $className -eq "Shell_SecondaryTrayWnd") {
                # Keep the last known state
            } else {
                $fgRect = New-Object Win32+RECT
                if ([Win32]::GetWindowRect($fgHwnd, [ref]$fgRect)) {
                    $screenWidth = [Win32]::GetSystemMetrics(0)
                    $screenHeight = [Win32]::GetSystemMetrics(1)
                    
                    if ($fgRect.Left -le 0 -and $fgRect.Top -le 0 -and $fgRect.Right -ge $screenWidth -and $fgRect.Bottom -ge $screenHeight) {
                        if ($className -ne "Progman" -and $className -ne "WorkerW") {
                            $isFullscreen = $true
                        } else {
                            $isFullscreen = $false
                        }
                    } else {
                        $isFullscreen = $false
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
            
            if ($timeline -and $info -and $info.PlaybackStatus.ToString() -eq "Playing") {
                $now = [System.DateTimeOffset]::UtcNow
                $elapsed = $now - $timeline.LastUpdatedTime
                $position = $timeline.Position.TotalMilliseconds + $elapsed.TotalMilliseconds
                if ($position -gt $duration) { $position = $duration }
                if ($position -lt 0) { $position = 0 }
            }
            
            $data = @{
                status = $status
                title = $title
                artist = $artist
                position = $position
                duration = $duration
                app = $session.SourceAppUserModelId
                taskbarHidden = $isTaskbarHidden
            }
            $data | ConvertTo-Json -Compress | Write-Host
        } else {
            $data = @{ 
                status = "Closed"
                taskbarHidden = $isTaskbarHidden
            }
            $data | ConvertTo-Json -Compress | Write-Host
        }
    } catch {
        $data = @{ 
            status = "Closed"
            taskbarHidden = $isTaskbarHidden
        }
        $data | ConvertTo-Json -Compress | Write-Host
    }
    Start-Sleep -Milliseconds 80
}
