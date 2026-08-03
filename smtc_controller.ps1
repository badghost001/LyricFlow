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
            $mediaSessions += [PSCustomObject]@{ Session = $s; LastUpdated = $lastUpdated }
        }
        if ($mediaSessions.Count -gt 0) {
            $sortedSessions = $mediaSessions | Sort-Object -Property LastUpdated -Descending
            foreach ($item in $sortedSessions) {
                $s = $item.Session
                $info = $s.GetPlaybackInfo()
                if ($info -and $info.PlaybackStatus.ToString() -eq "Playing") {
                    $session = $s
                    break
                }
            }
            if ($null -eq $session) {
                foreach ($item in $sortedSessions) {
                    $s = $item.Session
                    $info = $s.GetPlaybackInfo()
                    if ($info -and $info.PlaybackStatus.ToString() -eq "Paused") {
                        $session = $s
                        break
                    }
                }
            }
            if ($null -eq $session) {
                $session = $sortedSessions[0].Session
            }
        }
    } catch {}

    if ($null -ne $session) {
        if ($action -eq "play-pause") {
            $session.TryTogglePlayPauseAsync() | Out-Null
        } elseif ($action -eq "next") {
            $session.TrySkipNextAsync() | Out-Null
        } elseif ($action -eq "previous") {
            $session.TrySkipPreviousAsync() | Out-Null
        }
    }
}
