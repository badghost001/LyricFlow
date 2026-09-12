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
