using System;
using System.Runtime.InteropServices;

class WallpaperHelper {
    const int GWL_STYLE = -16;
    const int GWL_EXSTYLE = -20;
    const long WS_CHILD = 0x40000000L;
    const long WS_POPUP = 0x80000000L;
    const long WS_VISIBLE = 0x10000000L;
    const long WS_EX_APPWINDOW = 0x00040000L;
    const long WS_EX_TOOLWINDOW = 0x00000080L;
    const uint SMTO_NORMAL = 0x0000;
    const uint SWP_NOSIZE = 0x0001;
    const uint SWP_NOMOVE = 0x0002;
    const uint SWP_NOZORDER = 0x0004;
    const uint SWP_FRAMECHANGED = 0x0020;
    const uint SWP_SHOWWINDOW = 0x0040;
    const int SW_SHOW = 5;

    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")] static extern IntPtr FindWindow(string cls, string wnd);
    [DllImport("user32.dll")] static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string cls, string wnd);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc proc, IntPtr lParam);
    [DllImport("user32.dll")] static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
    [DllImport("user32.dll")] static extern IntPtr SetParent(IntPtr child, IntPtr newParent);
    [DllImport("user32.dll", EntryPoint="GetWindowLongPtr")] static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int idx);
    [DllImport("user32.dll", EntryPoint="SetWindowLongPtr")] static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int idx, IntPtr val);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int cmd);

    static long GetWL(IntPtr hwnd, int idx) { return GetWindowLongPtr64(hwnd, idx).ToInt64(); }
    static void SetWL(IntPtr hwnd, int idx, long val) { SetWindowLongPtr64(hwnd, idx, new IntPtr(val)); }

    static int Main(string[] args) {
        if (args.Length < 2) { Console.Error.WriteLine("Usage: wallpaper_helper.exe <hwnd> <attach|detach>"); return 1; }
        IntPtr hwnd = new IntPtr(long.Parse(args[0]));
        string mode = args[1].ToLower();

        if (mode == "attach") {
            IntPtr progman = FindWindow("Progman", null);
            if (progman == IntPtr.Zero) { Console.Error.WriteLine("Progman not found"); return 1; }

            IntPtr dummy;
            SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, SMTO_NORMAL, 1000, out dummy);

            IntPtr workerW = IntPtr.Zero, shellView = IntPtr.Zero;
            EnumWindows((top, _) => {
                IntPtr p = FindWindowEx(top, IntPtr.Zero, "SHELLDLL_DefView", null);
                if (p != IntPtr.Zero) { shellView = p; workerW = FindWindowEx(IntPtr.Zero, top, "WorkerW", null); }
                return true;
            }, IntPtr.Zero);
            if (workerW == IntPtr.Zero) workerW = FindWindowEx(progman, IntPtr.Zero, "WorkerW", null);

            IntPtr target = workerW != IntPtr.Zero ? workerW : progman;
            SetWL(hwnd, GWL_STYLE, (GetWL(hwnd, GWL_STYLE) & ~WS_POPUP) | WS_CHILD | WS_VISIBLE);
            SetWL(hwnd, GWL_EXSTYLE, (GetWL(hwnd, GWL_EXSTYLE) & ~WS_EX_APPWINDOW) | WS_EX_TOOLWINDOW);
            SetParent(hwnd, target);
            if (shellView != IntPtr.Zero)
                SetWindowPos(hwnd, shellView, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED | SWP_SHOWWINDOW);
            else
                SetWindowPos(hwnd, new IntPtr(1), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED | SWP_SHOWWINDOW);
            ShowWindow(hwnd, SW_SHOW);
            Console.WriteLine("Attached to WorkerW");
            return 0;
        }

        if (mode == "detach") {
            SetParent(hwnd, IntPtr.Zero);
            SetWL(hwnd, GWL_STYLE, (GetWL(hwnd, GWL_STYLE) & ~WS_CHILD) | WS_POPUP | WS_VISIBLE);
            SetWL(hwnd, GWL_EXSTYLE, (GetWL(hwnd, GWL_EXSTYLE) & ~WS_EX_TOOLWINDOW) | WS_EX_APPWINDOW);
            ShowWindow(hwnd, SW_SHOW);
            SetWindowPos(hwnd, IntPtr.Zero, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED | SWP_SHOWWINDOW);
            Console.WriteLine("Detached from WorkerW");
            return 0;
        }

        Console.Error.WriteLine("Unknown mode: " + mode);
        return 1;
    }
}
