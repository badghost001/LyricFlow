using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

class MediaControlHelper {
    private const uint WM_APPCOMMAND = 0x0319;
    private const int APPCOMMAND_MEDIA_NEXTTRACK = 11;
    private const int APPCOMMAND_MEDIA_PREVIOUSTRACK = 12;
    private const int APPCOMMAND_MEDIA_STOP = 13;
    private const int APPCOMMAND_MEDIA_PLAY_PAUSE = 14;

    [DllImport("user32.dll")]
    static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true)]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    static int Main(string[] args) {
        if (args.Length == 0) {
            Console.Error.WriteLine("Usage: media_control_helper.exe <play-pause|next|previous|stop>");
            return 1;
        }

        string action = args[0].ToLowerInvariant();
        int cmd = 0;
        byte vk = 0;

        if (action == "play-pause" || action == "playpause" || action == "toggle") {
            cmd = APPCOMMAND_MEDIA_PLAY_PAUSE;
            vk = 0xB3;
        } else if (action == "next") {
            cmd = APPCOMMAND_MEDIA_NEXTTRACK;
            vk = 0xB0;
        } else if (action == "previous" || action == "prev") {
            cmd = APPCOMMAND_MEDIA_PREVIOUSTRACK;
            vk = 0xB1;
        } else if (action == "stop") {
            cmd = APPCOMMAND_MEDIA_STOP;
            vk = 0xB2;
        } else {
            return 1;
        }

        // Strategy 1: Post WM_APPCOMMAND directly to Spotify's window loop
        bool sentToSpotify = false;
        try {
            EnumWindows((hWnd, lParam) => {
                StringBuilder sb = new StringBuilder(256);
                GetClassName(hWnd, sb, 256);
                string cls = sb.ToString();
                if (cls == "Chrome_WidgetWin_0") {
                    uint pid = 0;
                    GetWindowThreadProcessId(hWnd, out pid);
                    if (pid != 0) {
                        try {
                            string pName = Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant();
                            if (pName == "spotify") {
                                PostMessage(hWnd, WM_APPCOMMAND, IntPtr.Zero, (IntPtr)(cmd << 16));
                                sentToSpotify = true;
                                return false; // Found and delivered, stop enumeration
                            }
                        } catch {}
                    }
                }
                return true;
            }, IntPtr.Zero);
        } catch {}

        // Strategy 2: If Spotify window was not found or message was not sent, dispatch global Windows multimedia key
        if (!sentToSpotify && vk != 0) {
            keybd_event(vk, 0, 0, UIntPtr.Zero);
            keybd_event(vk, 0, 2, UIntPtr.Zero); // KEYEVENTF_KEYUP
        }

        return 0;
    }
}
