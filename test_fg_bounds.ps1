Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32Test {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@

$screenWidth = [Win32Test]::GetSystemMetrics(0)
$screenHeight = [Win32Test]::GetSystemMetrics(1)
Write-Host "Screen Width: $screenWidth, Height: $screenHeight"

for ($i = 0; $i -lt 10; $i++) {
    $fg = [Win32Test]::GetForegroundWindow()
    if ($fg -ne [IntPtr]::Zero) {
        $rect = New-Object Win32Test+RECT
        if ([Win32Test]::GetWindowRect($fg, [ref]$rect)) {
            Write-Host "FG Rect: Left=$($rect.Left), Top=$($rect.Top), Right=$($rect.Right), Bottom=$($rect.Bottom)"
        }
    }
    Start-Sleep -Seconds 1
}
