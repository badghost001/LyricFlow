param(
    [Parameter(Mandatory = $true)]
    [string]$HandleString,

    [Parameter(Mandatory = $true)]
    [ValidateSet("attach", "detach")]
    [string]$Mode,

    [string]$ExePath = ""
)

# If compiled exe exists, delegate to it directly for speed
if ($ExePath -ne "" -and (Test-Path $ExePath)) {
    & $ExePath $HandleString $Mode
    exit $LASTEXITCODE
}

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class Wallpaper {
    public const int GWL_STYLE = -16;
    public const int GWL_EXSTYLE = -20;
    public const long WS_CHILD = 0x40000000L;
    public const long WS_POPUP = 0x80000000L;
    public const long WS_VISIBLE = 0x10000000L;
    public const long WS_EX_APPWINDOW = 0x00040000L;
    public const long WS_EX_TOOLWINDOW = 0x00000080L;
    public const uint SMTO_NORMAL = 0x0000;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOZORDER = 0x0004;
    public const uint SWP_FRAMECHANGED = 0x0020;
    public const uint SWP_SHOWWINDOW = 0x0040;
    public const int SW_SHOW = 5;

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string className, string windowTitle);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr", SetLastError = true)]
    public static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr", SetLastError = true)]
    public static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    public static IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex) {
        return GetWindowLongPtr64(hWnd, nIndex);
    }

    public static void SetWindowLongPtr(IntPtr hWnd, int nIndex, long value) {
        SetWindowLongPtr64(hWnd, nIndex, new IntPtr(value));
    }

    public static bool Attach(IntPtr electronHwnd) {
        IntPtr progman = FindWindow("Progman", null);
        if (progman == IntPtr.Zero) return false;

        IntPtr result = IntPtr.Zero;
        SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, SMTO_NORMAL, 1000, out result);

        IntPtr workerW = IntPtr.Zero;
        IntPtr shellView = IntPtr.Zero;

        EnumWindows(new EnumWindowsProc((topHandle, paramHandle) => {
            IntPtr p = FindWindowEx(topHandle, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (p != IntPtr.Zero) {
                shellView = p;
                workerW = FindWindowEx(IntPtr.Zero, topHandle, "WorkerW", null);
            }
            return true;
        }), IntPtr.Zero);

        if (workerW == IntPtr.Zero) {
            workerW = FindWindowEx(progman, IntPtr.Zero, "WorkerW", null);
        }

        IntPtr targetParent = (workerW != IntPtr.Zero) ? workerW : progman;

        long style = GetWindowLongPtr(electronHwnd, GWL_STYLE).ToInt64();
        style = (style & ~WS_POPUP) | WS_CHILD | WS_VISIBLE;
        SetWindowLongPtr(electronHwnd, GWL_STYLE, style);

        long exStyle = GetWindowLongPtr(electronHwnd, GWL_EXSTYLE).ToInt64();
        exStyle = (exStyle & ~WS_EX_APPWINDOW) | WS_EX_TOOLWINDOW;
        SetWindowLongPtr(electronHwnd, GWL_EXSTYLE, exStyle);

        SetParent(electronHwnd, targetParent);

        if (shellView != IntPtr.Zero) {
            SetWindowPos(electronHwnd, shellView, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED | SWP_SHOWWINDOW);
        } else {
            SetWindowPos(electronHwnd, new IntPtr(1), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED | SWP_SHOWWINDOW);
        }

        ShowWindow(electronHwnd, SW_SHOW);
        return true;
    }

    public static bool Detach(IntPtr electronHwnd) {
        SetParent(electronHwnd, IntPtr.Zero);

        long style = GetWindowLongPtr(electronHwnd, GWL_STYLE).ToInt64();
        style = (style & ~WS_CHILD) | WS_POPUP | WS_VISIBLE;
        SetWindowLongPtr(electronHwnd, GWL_STYLE, style);

        long exStyle = GetWindowLongPtr(electronHwnd, GWL_EXSTYLE).ToInt64();
        exStyle = (exStyle & ~WS_EX_TOOLWINDOW) | WS_EX_APPWINDOW;
        SetWindowLongPtr(electronHwnd, GWL_EXSTYLE, exStyle);

        ShowWindow(electronHwnd, SW_SHOW);
        SetWindowPos(electronHwnd, IntPtr.Zero, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED | SWP_SHOWWINDOW);
        return true;
    }
}
"@

$handleLong = [long]$HandleString
$hwnd = New-Object System.IntPtr($handleLong)

if ($Mode -eq "attach") {
    if ([Wallpaper]::Attach($hwnd)) {
        Write-Output "Attached to WorkerW"
        exit 0
    }

    Write-Error "WorkerW not found"
    exit 1
}

if ([Wallpaper]::Detach($hwnd)) {
    Write-Output "Detached from WorkerW"
    exit 0
}

Write-Error "Detach failed"
exit 1
