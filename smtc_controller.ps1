# smtc_controller.ps1
# Persistent process that reads stdin for commands and executes them on the current SMTC session.

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]

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
    exit
}

# Wait for commands on stdin
while ($true) {
    $action = [Console]::ReadLine()
    if ($null -eq $action) {
        exit # Stdin closed
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
            foreach ($m in @('spotify', 'applemusic', 'itunes', 'tidal', 'deezer', 'amazonmusic', 'youtubemusic', 'ytmusic', 'foobar', 'musicbee', 'aimp', 'vlc', 'winamp', 'dopamine', 'cider')) {
                if ($lower.Contains($m)) { $isMusic = $true; break }
            }
            $status = "Closed"
            try {
                $info = $s.GetPlaybackInfo()
                if ($info) { $status = $info.PlaybackStatus.ToString() }
            } catch {}
            $mediaSessions += [PSCustomObject]@{ Session = $s; IsMusic = $isMusic; Status = $status; LastUpdated = $lastUpdated }
        }
        if ($mediaSessions.Count -gt 0) {
            $playingMusic = $mediaSessions | Where-Object { $_.IsMusic -and $_.Status -eq 'Playing' } | Sort-Object -Property LastUpdated -Descending
            if ($playingMusic) {
                $session = $playingMusic[0].Session
            }
            if ($null -eq $session) {
                $pausedMusic = $mediaSessions | Where-Object { $_.IsMusic -and $_.Status -eq 'Paused' } | Sort-Object -Property LastUpdated -Descending
                if ($pausedMusic) {
                    $session = $pausedMusic[0].Session
                }
            }
            if ($null -eq $session) {
                $playing = $mediaSessions | Where-Object { $_.Status -eq 'Playing' } | Sort-Object -Property LastUpdated -Descending
                if ($playing) {
                    $session = $playing[0].Session
                }
            }
            if ($null -eq $session) {
                $session = $mediaSessions[0].Session
            }
        }
    } catch {}

    if ($null -ne $session) {
        if ($action -eq "play-pause") {
            Await-WinRT ($session.TryTogglePlayPauseAsync()) ([bool]) | Out-Null
        } elseif ($action -eq "next") {
            Await-WinRT ($session.TrySkipNextAsync()) ([bool]) | Out-Null
        } elseif ($action -eq "previous") {
            Await-WinRT ($session.TrySkipPreviousAsync()) ([bool]) | Out-Null
        }
    }
}
