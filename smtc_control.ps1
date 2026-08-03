param (
    [string]$action,
    [long]$position = 0
)

# Load the required Windows Runtime assembly
Add-Type -AssemblyName System.Runtime.WindowsRuntime

# Define the WinRT namespaces
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSession,Windows.Media.Control,ContentType=WindowsRuntime]

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
    
    # Try to get the current session automatically (works for Apple Music, Spotify, etc.)
    $session = $sessionManager.GetCurrentSession()
    
    # Fallback if no current session is definitively set
    if ($null -eq $session) {
        $sessions = $sessionManager.GetSessions()
        if ($sessions.Count -gt 0) {
            $session = $sessions[0]
        }
    }
    
    if ($null -ne $session) {
        if ($action -eq "play-pause") {
            $session.TryTogglePlayPauseAsync() | Out-Null
        } elseif ($action -eq "next") {
            $session.TrySkipNextAsync() | Out-Null
        } elseif ($action -eq "previous") {
            $session.TrySkipPreviousAsync() | Out-Null
        } elseif ($action -eq "seek") {
            # Windows uses 100-nanosecond ticks (1 ms = 10,000 ticks)
            $session.TryChangePlaybackPositionAsync([System.TimeSpan]::FromTicks($position * 10000)) | Out-Null
        }
    }
} catch {
    # Ignore
}
