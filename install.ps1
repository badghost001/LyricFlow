# ==============================================================================
#  LyricFlow Windows 1-Line Installer & Updater
#  Usage: irm https://raw.githubusercontent.com/badghost001/LyricFlow/main/install.ps1 | iex
# ==============================================================================

[CmdletBinding()]
param (
    [switch]$Interactive,
    [switch]$NoLaunch
)

$ErrorActionPreference = 'Stop'

# Ensure modern TLS protocols
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

function Write-Color([string]$text, [string]$color = "Cyan") {
    Write-Host $text -ForegroundColor $color
}

Clear-Host
Write-Color "  _               _      ______ _                 " "Magenta"
Write-Color " | |             (_)    |  ____| |                " "Magenta"
Write-Color " | |    _   _ _ __ _  ___| |__  | | _____      __ " "Magenta"
Write-Color " | |   | | | | '__| |/ __|  __| | |/ _ \ \ /\ / / " "Cyan"
Write-Color " | |___| |_| | |  | | (__| |    | | (_) \ V  V /  " "Cyan"
Write-Color " |______\__, |_|  |_|\___|_|    |_|\___/ \_/\_/   " "Cyan"
Write-Color "         __/ |                                    " "DarkCyan"
Write-Color "        |___/        Dynamic Island for Windows   " "DarkCyan"
Write-Host ""

# Verify 64-bit architecture
if ([IntPtr]::Size -ne 8) {
    Write-Color "Error: LyricFlow requires a 64-bit (x64) version of Windows." "Red"
    exit 1
}

$repo = "badghost001/LyricFlow"
Write-Color ">> Checking latest release from GitHub..." "Yellow"

$downloadUrl = $null
$version = $null

try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers @{ "User-Agent" = "LyricFlow-Installer" }
    $version = $release.tag_name
    $asset = $release.assets | Where-Object { $_.name -like "*x64-setup.exe" -or $_.name -like "*setup.exe" } | Select-Object -First 1
    if ($asset) {
        $downloadUrl = $asset.browser_download_url
    }
} catch {
    Write-Color ">> GitHub API query throttled, resolving direct release endpoint..." "DarkGray"
}

# Fallback endpoint if API is rate-limited
if (-not $downloadUrl) {
    try {
        $latestMeta = Invoke-RestMethod -Uri "https://github.com/$repo/releases/latest/download/latest.json" -Headers @{ "User-Agent" = "LyricFlow-Installer" }
        $version = "v" + $latestMeta.version
        $downloadUrl = $latestMeta.platforms.'windows-x86_64'.url
    } catch {
        # Hardcoded fallback to latest verified release
        $version = "v1.40.5"
        $downloadUrl = "https://github.com/$repo/releases/download/v1.40.5/LyricFlow_1.40.5_x64-setup.exe"
    }
}

if (-not $downloadUrl) {
    Write-Color "Failed to resolve installer download URL. Please check https://github.com/$repo/releases" "Red"
    exit 1
}

Write-Color ">> Found version $version" "Green"
$tempDir = [System.IO.Path]::GetTempPath()
$installerPath = Join-Path $tempDir "LyricFlow-Setup.exe"

Write-Color ">> Downloading LyricFlow installer..." "Yellow"
try {
    # Using WebClient with progress tracking
    $wc = New-Object System.Net.WebClient
    $wc.Headers.Add("User-Agent", "LyricFlow-Installer")
    $wc.DownloadFile($downloadUrl, $installerPath)
} catch {
    Write-Color ">> Download via WebClient failed, attempting Invoke-WebRequest..." "DarkGray"
    Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
}

if (-not (Test-Path $installerPath)) {
    Write-Color "Error: Installer could not be saved to temp directory." "Red"
    exit 1
}

Write-Color ">> Download complete! Size: $([math]::Round((Get-Item $installerPath).Length / 1MB, 2)) MB" "Green"

# Terminate existing instance if updating
$runningProc = Get-Process -Name "LyricFlow" -ErrorAction SilentlyContinue
if ($runningProc) {
    Write-Color ">> Closing active LyricFlow instance for update..." "Yellow"
    $runningProc | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Execute Installer
Write-Color ">> Installing LyricFlow..." "Yellow"
$installArgs = if ($Interactive) { "" } else { "/S" }

$proc = Start-Process -FilePath $installerPath -ArgumentList $installArgs -PassThru -Wait

# Clean up temporary installer file
Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Color "========================================================" "Green"
Write-Color "  LyricFlow $version has been installed successfully!  " "Green"
Write-Color "========================================================" "Green"
Write-Host ""
Write-Color "  * Launch anytime from Start Menu or Desktop shortcut" "Cyan"
Write-Color "  * Run this same script anytime to update to the latest version" "Cyan"
Write-Host ""

# Auto-launch app if not suppressed
if (-not $NoLaunch) {
    $possibleAppPaths = @(
        (Join-Path $env:LOCALAPPDATA "Programs\LyricFlow\LyricFlow.exe"),
        (Join-Path $env:ProgramFiles "LyricFlow\LyricFlow.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "LyricFlow\LyricFlow.exe")
    )
    $launched = $false
    foreach ($path in $possibleAppPaths) {
        if (Test-Path $path) {
            Write-Color ">> Launching LyricFlow..." "Magenta"
            Start-Process -FilePath $path
            $launched = $true
            break
        }
    }
    if (-not $launched) {
        Write-Color ">> You can now start LyricFlow from your Start Menu!" "Yellow"
    }
}
