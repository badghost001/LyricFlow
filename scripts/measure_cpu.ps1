[CmdletBinding()]
param(
    [int]$DurationSeconds = 60,
    [double]$IntervalSeconds = 1.0,
    [string]$Scenario = "unspecified",
    [string]$CsvPath = "",
    [int]$RootPid = 0
)

$ErrorActionPreference = "Stop"
if ($DurationSeconds -lt 2) { throw "DurationSeconds must be at least 2." }
if ($IntervalSeconds -le 0) { throw "IntervalSeconds must be positive." }

if (-not ("LyricFlow.NativeProcessInfo" -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace LyricFlow {
  [StructLayout(LayoutKind.Sequential)]
  public struct BasicInfo {
    public IntPtr Reserved1;
    public IntPtr PebBaseAddress;
    public IntPtr Reserved2a;
    public IntPtr Reserved2b;
    public IntPtr UniqueProcessId;
    public IntPtr InheritedFromUniqueProcessId;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct UnicodeString {
    public ushort Length;
    public ushort MaximumLength;
    public IntPtr Buffer;
  }

  public static class NativeProcessInfo {
    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern IntPtr OpenProcess(uint access, bool inherit, int processId);
    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern bool CloseHandle(IntPtr handle);
    [DllImport("ntdll.dll")]
    public static extern int NtQueryInformationProcess(IntPtr process, int infoClass,
      ref BasicInfo info, int infoLength, out int returnLength);
    [DllImport("ntdll.dll")]
    public static extern int NtQueryInformationProcess(IntPtr process, int infoClass,
      IntPtr info, int infoLength, out int returnLength);

    public static int ParentProcessId(int processId) {
      IntPtr h = OpenProcess(0x1000, false, processId);
      if (h == IntPtr.Zero) return 0;
      try {
        BasicInfo info = new BasicInfo(); int returned;
        int status = NtQueryInformationProcess(h, 0, ref info,
          Marshal.SizeOf(typeof(BasicInfo)), out returned);
        return status == 0 ? info.InheritedFromUniqueProcessId.ToInt32() : 0;
      } finally { CloseHandle(h); }
    }

    public static string CommandLine(int processId) {
      // PROCESS_QUERY_LIMITED_INFORMATION is sufficient for command-line
      // inspection and is usually permitted for this app's WebView children.
      IntPtr h = OpenProcess(0x1000, false, processId);
      if (h == IntPtr.Zero) return "";
      IntPtr buffer = Marshal.AllocHGlobal(8192);
      try {
        int returned;
        int status = NtQueryInformationProcess(h, 60, buffer, 8192, out returned);
        if (status != 0) return "";
        UnicodeString text = (UnicodeString)Marshal.PtrToStructure(buffer, typeof(UnicodeString));
        if (text.Buffer == IntPtr.Zero || text.Length == 0) return "";
        return Marshal.PtrToStringUni(text.Buffer, text.Length / 2) ?? "";
      } finally { Marshal.FreeHGlobal(buffer); CloseHandle(h); }
    }
  }
}
"@
}

$logicalProcessors = [Environment]::ProcessorCount
$root = $null
if ($RootPid -gt 0) {
    $root = Get-Process -Id $RootPid -ErrorAction SilentlyContinue
} else {
    $root = Get-Process -Name "lyricflow" -ErrorAction SilentlyContinue |
        Sort-Object StartTime -Descending | Select-Object -First 1
}
if (-not $root) { throw "LyricFlow is not running. Start the app, then run this profiler." }

$allProcesses = @(Get-Process -ErrorAction SilentlyContinue)
$parentByPid = @{}
foreach ($process in $allProcesses) {
    $parentByPid[$process.Id] = [LyricFlow.NativeProcessInfo]::ParentProcessId($process.Id)
}
$treePids = [System.Collections.Generic.HashSet[int]]::new()
[void]$treePids.Add([int]$root.Id)
do {
    $added = $false
    foreach ($process in $allProcesses) {
        if ($parentByPid[$process.Id] -and $treePids.Contains([int]$parentByPid[$process.Id]) -and
            -not $treePids.Contains([int]$process.Id)) {
            [void]$treePids.Add([int]$process.Id)
            $added = $true
        }
    }
} while ($added)

# Include WebView2 processes by LyricFlow's executable/profile markers too.
# The parent tree remains authoritative for the host and native helpers, while
# these markers catch WebView2 manager/renderer/GPU children if WebView2 has
# re-parented or reused them.
$webViewProfile = Join-Path $env:LOCALAPPDATA 'com.badghost.lyricflow\EBWebView'
$webViewProfilePattern = [regex]::Escape($webViewProfile)
$webViewMarkerPattern = '(?i)--webview-exe-name\s*=\s*"?lyricflow\.exe|' + $webViewProfilePattern
$matchedWebViewPids = [System.Collections.Generic.HashSet[int]]::new()
foreach ($process in $allProcesses) {
    if ($process.ProcessName -notmatch '^(msedgewebview2|msedge)$') { continue }
    $commandLine = [LyricFlow.NativeProcessInfo]::CommandLine([int]$process.Id)
    if ($commandLine -match $webViewMarkerPattern) {
        [void]$treePids.Add([int]$process.Id)
        [void]$matchedWebViewPids.Add([int]$process.Id)
    }
}
do {
    $added = $false
    foreach ($process in $allProcesses) {
        if ($parentByPid[$process.Id] -and $treePids.Contains([int]$parentByPid[$process.Id]) -and
            -not $treePids.Contains([int]$process.Id)) {
            [void]$treePids.Add([int]$process.Id)
            $added = $true
        }
    }
} while ($added)

function Get-Role([System.Diagnostics.Process]$Process) {
    if ($Process.Id -eq $root.Id) { return "Host" }
    $cmd = [LyricFlow.NativeProcessInfo]::CommandLine($Process.Id)
    if ($cmd -match "--type=renderer") { return "Renderer" }
    if ($cmd -match "--type=gpu-process") { return "GPU Process" }
    if ($cmd -match "--type=utility") { return "Utility" }
    if ($cmd -match "--type=crashpad-handler") { return "Crashpad" }
    if ($Process.ProcessName -match "^(msedgewebview2|msedge)$") { return "WebView2 Manager/Unknown" }
    return "Other descendant"
}

$initial = @{}
foreach ($process in $allProcesses) {
    if ($treePids.Contains([int]$process.Id)) {
        try {
            $initial[$process.Id] = [pscustomobject]@{
                Id = [int]$process.Id
                Name = $process.ProcessName
                Role = Get-Role $process
                CommandLine = [LyricFlow.NativeProcessInfo]::CommandLine([int]$process.Id)
                CpuSeconds = [double]$process.CPU
                WorkingSetBytes = [double]$process.WorkingSet64
                PrivateBytes = [double]$process.PrivateMemorySize64
            }
        } catch { }
    }
}

$initialWebViewProcesses = @($initial.Values | Where-Object { $_.Name -match '^(msedgewebview2|msedge)$' })
if ($initialWebViewProcesses.Count -gt 0) {
    $webViewMembers = @($initialWebViewProcesses | ForEach-Object { "$($_.Id):$($_.Role)" })
    Write-Host "Captured LyricFlow WebView2 PIDs: $($webViewMembers -join ', ')"
} else {
    Write-Warning "No LyricFlow WebView2 process found by parent tree or executable/profile marker. This is not a valid visible-app sample."
}

$samples = [System.Collections.Generic.List[object]]::new()
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$lastSampleTime = 0.0
$lastCpuByPid = @{}
foreach ($pidKey in $initial.Keys) { $lastCpuByPid[$pidKey] = $initial[$pidKey].CpuSeconds }
Write-Host "Sampling LyricFlow PID $($root.Id) for $DurationSeconds seconds ($logicalProcessors logical processors)."
Write-Host "Scenario: $Scenario; CPU percentage is normalized to total machine capacity."

while ($stopwatch.Elapsed.TotalSeconds -lt $DurationSeconds) {
    Start-Sleep -Milliseconds ([int]([Math]::Max(50, $IntervalSeconds * 1000)))
    $now = $stopwatch.Elapsed.TotalSeconds
    $elapsed = $now - $lastSampleTime
    $lastSampleTime = $now
    $current = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $treePids.Contains([int]$_.Id) })
    $perRole = @{}
    $totalCpu = 0.0
    $totalWorkingSet = 0.0
    $totalPrivate = 0.0
    foreach ($process in $current) {
        try {
            $cpuSeconds = [double]$process.CPU
            $priorCpu = if ($lastCpuByPid.ContainsKey($process.Id)) { $lastCpuByPid[$process.Id] } else { $cpuSeconds }
            $cpuPct = if ($elapsed -gt 0) { [Math]::Max(0, ($cpuSeconds - $priorCpu) / $elapsed / $logicalProcessors * 100) } else { 0 }
            $lastCpuByPid[$process.Id] = $cpuSeconds
            $role = if ($initial.ContainsKey($process.Id)) { $initial[$process.Id].Role } else { Get-Role $process }
            if (-not $perRole.ContainsKey($role)) { $perRole[$role] = 0.0 }
            $perRole[$role] += $cpuPct
            $totalCpu += $cpuPct
            $totalWorkingSet += [double]$process.WorkingSet64
            $totalPrivate += [double]$process.PrivateMemorySize64
        } catch { }
    }
    $samples.Add([pscustomobject]@{
        Timestamp = (Get-Date).ToString("o")
        ElapsedSeconds = [Math]::Round($now, 2)
        TotalAppCpuPct = [Math]::Round($totalCpu, 3)
        RendererCpuPct = [Math]::Round([double]$perRole["Renderer"], 3)
        GpuProcessCpuPct = [Math]::Round([double]$perRole["GPU Process"], 3)
    BrowserManagerCpuPct = [Math]::Round([double]$perRole["WebView2 Manager/Unknown"], 3)
        UtilityCpuPct = [Math]::Round([double]$perRole["Utility"], 3)
        HostCpuPct = [Math]::Round([double]$perRole["Host"], 3)
        WorkingSetMB = [Math]::Round($totalWorkingSet / 1MB, 1)
        PrivateBytesMB = [Math]::Round($totalPrivate / 1MB, 1)
        ProcessCount = $current.Count
    })
}

function Get-Percentile([double[]]$Values, [double]$Percentile) {
    if (-not $Values -or $Values.Count -eq 0) { return 0.0 }
    $sorted = @($Values | Sort-Object)
    $index = [Math]::Min($sorted.Count - 1, [Math]::Ceiling($Percentile * $sorted.Count) - 1)
    return [double]$sorted[[Math]::Max(0, $index)]
}
$summary = [pscustomobject]@{
    Scenario = $Scenario
    RootPid = $root.Id
    DurationSeconds = [Math]::Round($stopwatch.Elapsed.TotalSeconds, 2)
    LogicalProcessors = $logicalProcessors
    CpuNormalization = "percent of total machine capacity"
    SampleCount = $samples.Count
    TotalAppCpuMeanPct = [Math]::Round((($samples | Measure-Object TotalAppCpuPct -Average).Average), 3)
    TotalAppCpuMedianPct = [Math]::Round((Get-Percentile @($samples.TotalAppCpuPct) 0.50), 3)
    TotalAppCpuP95Pct = [Math]::Round((Get-Percentile @($samples.TotalAppCpuPct) 0.95), 3)
    TotalAppCpuMaxPct = [Math]::Round((($samples | Measure-Object TotalAppCpuPct -Maximum).Maximum), 3)
    RendererCpuMeanPct = [Math]::Round((($samples | Measure-Object RendererCpuPct -Average).Average), 3)
    RendererCpuP95Pct = [Math]::Round((Get-Percentile @($samples.RendererCpuPct) 0.95), 3)
    GpuProcessCpuMeanPct = [Math]::Round((($samples | Measure-Object GpuProcessCpuPct -Average).Average), 3)
    GpuProcessCpuP95Pct = [Math]::Round((Get-Percentile @($samples.GpuProcessCpuPct) 0.95), 3)
    BrowserManagerCpuMeanPct = [Math]::Round((($samples | Measure-Object BrowserManagerCpuPct -Average).Average), 3)
    UtilityCpuMeanPct = [Math]::Round((($samples | Measure-Object UtilityCpuPct -Average).Average), 3)
    WorkingSetMeanMB = [Math]::Round((($samples | Measure-Object WorkingSetMB -Average).Average), 1)
    WorkingSetP95MB = [Math]::Round((Get-Percentile @($samples.WorkingSetMB) 0.95), 1)
    PrivateBytesMeanMB = [Math]::Round((($samples | Measure-Object PrivateBytesMB -Average).Average), 1)
    ProcessCountMean = [Math]::Round((($samples | Measure-Object ProcessCount -Average).Average), 1)
    CommandLineRoleVisibility = "process command-line access dependent; children without a readable Chromium type are classified as browser manager"
}

Write-Output ""
Write-Output "Scenario: $Scenario | samples: $($summary.SampleCount) | duration: $($summary.DurationSeconds)s"
$summary | Format-List
if ($CsvPath) {
    $resolvedCsv = [System.IO.Path]::GetFullPath($CsvPath)
    $samples | Export-Csv -LiteralPath $resolvedCsv -NoTypeInformation -Encoding UTF8
    $jsonPath = [System.IO.Path]::ChangeExtension($resolvedCsv, ".summary.json")
    $summary | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
    Write-Output "Samples: $resolvedCsv"
    Write-Output "Summary: $jsonPath"
}
