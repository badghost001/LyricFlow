#[cfg(target_os = "windows")]
mod imp {
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use windows::{
    Win32::System::Com::*,
    Win32::Media::Audio::*,
};

const FFT_SIZE: usize = 1024;
const NUM_BANDS: usize = 8;

pub struct AudioVisualizer {
    running: Arc<AtomicBool>,
}

impl AudioVisualizer {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn start(&self, app: AppHandle) {
        if self.running.swap(true, Ordering::SeqCst) {
            return;
        }
        let running = Arc::clone(&self.running);

        std::thread::Builder::new()
            .name("lyricflow-wasapi-loopback".to_string())
            .spawn(move || {
                run_capture_loop(app, running);
            })
            .expect("Failed to spawn WASAPI loopback thread");
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }
}

fn cooley_tukey_fft(re: &mut [f32; FFT_SIZE], im: &mut [f32; FFT_SIZE]) {
    let mut j = 0;
    for i in 0..FFT_SIZE - 1 {
        if i < j {
            re.swap(i, j);
            im.swap(i, j);
        }
        let mut k = FFT_SIZE >> 1;
        while k <= j {
            j -= k;
            k >>= 1;
        }
        j += k;
    }

    let mut len = 2;
    while len <= FFT_SIZE {
        let half = len >> 1;
        let angle = -2.0 * std::f32::consts::PI / (len as f32);
        let w_step_re = angle.cos();
        let w_step_im = angle.sin();

        let mut i = 0;
        while i < FFT_SIZE {
            let mut w_re = 1.0f32;
            let mut w_im = 0.0f32;
            for k in 0..half {
                let u_re = re[i + k];
                let u_im = im[i + k];
                let v_re = re[i + k + half] * w_re - im[i + k + half] * w_im;
                let v_im = re[i + k + half] * w_im + im[i + k + half] * w_re;

                re[i + k] = u_re + v_re;
                im[i + k] = u_im + v_im;
                re[i + k + half] = u_re - v_re;
                im[i + k + half] = u_im - v_im;

                let next_w_re = w_re * w_step_re - w_im * w_step_im;
                let next_w_im = w_re * w_step_im + w_im * w_step_re;
                w_re = next_w_re;
                w_im = next_w_im;
            }
            i += len;
        }
        len <<= 1;
    }
}

#[cfg(target_os = "windows")]
fn run_capture_loop(app: AppHandle, running: Arc<AtomicBool>) {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }

    let mut sample_ring: Vec<f32> = vec![0.0; FFT_SIZE];
    let mut ring_idx = 0usize;
    let mut envelope = [0.0f32; NUM_BANDS];
    let mut hann_window = [0.0f32; FFT_SIZE];
    for i in 0..FFT_SIZE {
        hann_window[i] = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * (i as f32) / (FFT_SIZE as f32 - 1.0)).cos());
    }

    // Band frequencies (roughly logarithmic):
    // 0: 30 - 80 Hz     (Bins 1..2)
    // 1: 80 - 180 Hz    (Bins 2..4)
    // 2: 180 - 350 Hz   (Bins 4..8)
    // 3: 350 - 750 Hz   (Bins 8..16)
    // 4: 750 - 1600 Hz  (Bins 16..34)
    // 5: 1600 - 3500 Hz (Bins 34..75)
    // 6: 3500 - 7500 Hz (Bins 75..160)
    // 7: 7500 - 15000 Hz(Bins 160..320)
    let band_ranges: [(usize, usize); NUM_BANDS] = [
        (1, 2),
        (2, 4),
        (4, 8),
        (8, 16),
        (16, 34),
        (34, 75),
        (75, 160),
        (160, 320),
    ];

    // Equal loudness / perceptual compensation curve across 8 bands
    // High frequencies have naturally much lower energy in music, so they need logarithmic tilt
    let band_tilts = [1.2f32, 1.0, 1.8, 2.8, 4.2, 6.5, 10.0, 15.0];

    let mut dynamic_peak = 0.04f32;
    let mut consecutive_silence = 0usize;
    let mut was_already_all_zero = false;
    let mut last_emit = Instant::now();

    while running.load(Ordering::Relaxed) {
        let capture_session = unsafe { init_wasapi_capture() };
        let (client, capture_client, channels, bits_per_sample, is_float) = match capture_session {
            Some(s) => s,
            None => {
                std::thread::sleep(Duration::from_millis(1000));
                continue;
            }
        };

        let start_res = unsafe { client.Start() };
        if start_res.is_err() {
            unsafe {
                let _ = client.Stop();
            }
            std::thread::sleep(Duration::from_millis(500));
            continue;
        }

        while running.load(Ordering::Relaxed) {
            let mut packet_size = match unsafe { capture_client.GetNextPacketSize() } {
                Ok(sz) => sz,
                Err(_) => break, // Device disconnected or changed
            };

            let mut had_audio_in_turn = false;

            while packet_size > 0 {
                let mut data_ptr: *mut u8 = std::ptr::null_mut();
                let mut num_frames_read = 0u32;
                let mut flags = 0u32;

                let hr = unsafe {
                    capture_client.GetBuffer(
                        &mut data_ptr,
                        &mut num_frames_read,
                        &mut flags,
                        None,
                        None,
                    )
                };

                if hr.is_err() {
                    break;
                }

                let is_silent_buffer = (flags & (AUDCLNT_BUFFERFLAGS_SILENT.0 as u32)) != 0;

                if !is_silent_buffer && !data_ptr.is_null() && num_frames_read > 0 {
                    had_audio_in_turn = true;
                    // Extract mono samples
                    let frames = num_frames_read as usize;
                    let ch = channels as usize;

                    if is_float && bits_per_sample == 32 {
                        let float_ptr = data_ptr as *const f32;
                        for f in 0..frames {
                            let mut sum = 0.0f32;
                            for c in 0..ch {
                                sum += unsafe { *float_ptr.add(f * ch + c) };
                            }
                            let mono = sum / (ch as f32);
                            sample_ring[ring_idx] = mono;
                            ring_idx = (ring_idx + 1) % FFT_SIZE;
                        }
                    } else if !is_float && bits_per_sample == 16 {
                        let i16_ptr = data_ptr as *const i16;
                        for f in 0..frames {
                            let mut sum = 0.0f32;
                            for c in 0..ch {
                                sum += (unsafe { *i16_ptr.add(f * ch + c) } as f32) / 32768.0;
                            }
                            let mono = sum / (ch as f32);
                            sample_ring[ring_idx] = mono;
                            ring_idx = (ring_idx + 1) % FFT_SIZE;
                        }
                    } else if !is_float && bits_per_sample == 24 {
                        let u8_ptr = data_ptr;
                        for f in 0..frames {
                            let mut sum = 0.0f32;
                            for c in 0..ch {
                                let offset = (f * ch + c) * 3;
                                let b0 = unsafe { *u8_ptr.add(offset) } as i32;
                                let b1 = unsafe { *u8_ptr.add(offset + 1) } as i32;
                                let b2 = unsafe { *u8_ptr.add(offset + 2) } as i32;
                                let val24 = ((b0 | (b1 << 8) | (b2 << 16)) << 8) >> 8;
                                sum += (val24 as f32) / 8388608.0;
                            }
                            let mono = sum / (ch as f32);
                            sample_ring[ring_idx] = mono;
                            ring_idx = (ring_idx + 1) % FFT_SIZE;
                        }
                    } else if !is_float && bits_per_sample == 32 {
                        let i32_ptr = data_ptr as *const i32;
                        for f in 0..frames {
                            let mut sum = 0.0f32;
                            for c in 0..ch {
                                sum += (unsafe { *i32_ptr.add(f * ch + c) } as f32) / 2147483648.0;
                            }
                            let mono = sum / (ch as f32);
                            sample_ring[ring_idx] = mono;
                            ring_idx = (ring_idx + 1) % FFT_SIZE;
                        }
                    }
                }

                let _ = unsafe { capture_client.ReleaseBuffer(num_frames_read) };
                packet_size = match unsafe { capture_client.GetNextPacketSize() } {
                    Ok(sz) => sz,
                    Err(_) => break,
                };
            }

            if had_audio_in_turn {
                consecutive_silence = 0;
            } else {
                consecutive_silence = consecutive_silence.saturating_add(1);
            }

            let now = Instant::now();
            if now.duration_since(last_emit) >= Duration::from_millis(22) {
                last_emit = now;

                if consecutive_silence > 15 {
                    // Decay envelope to 0 smoothly
                    let mut all_zero = true;
                    for b in 0..NUM_BANDS {
                        envelope[b] = (envelope[b] * 0.75).max(0.0);
                        if envelope[b] > 0.01 {
                            all_zero = false;
                        } else {
                            envelope[b] = 0.0;
                        }
                    }
                    if !was_already_all_zero {
                        let _ = app.emit("audio-visualizer-bands", envelope.to_vec());
                        if all_zero {
                            was_already_all_zero = true;
                        }
                    }
                    if all_zero {
                        std::thread::sleep(Duration::from_millis(150));
                    }
                } else {
                    was_already_all_zero = false;
                    // Run FFT on current ring buffer
                    let mut re = [0.0f32; FFT_SIZE];
                    let mut im = [0.0f32; FFT_SIZE];
                    for i in 0..FFT_SIZE {
                        let src_idx = (ring_idx + i) % FFT_SIZE;
                        re[i] = sample_ring[src_idx] * hann_window[i];
                    }

                    cooley_tukey_fft(&mut re, &mut im);

                    let mut raw_bands = [0.0f32; NUM_BANDS];
                    for (b, &(start_bin, end_bin)) in band_ranges.iter().enumerate() {
                        let mut sum_mag = 0.0f32;
                        let mut max_mag = 0.0f32;
                        let count = (end_bin - start_bin).max(1);
                        for k in start_bin..end_bin {
                            let mag = (re[k] * re[k] + im[k] * im[k]).sqrt() / (FFT_SIZE as f32 / 2.0);
                            sum_mag += mag;
                            if mag > max_mag {
                                max_mag = mag;
                            }
                        }
                        let avg_mag = sum_mag / (count as f32);
                        // Blending 70% peak and 30% average captures rapid transients (hi-hat taps, snare hits)
                        raw_bands[b] = (max_mag * 0.70 + avg_mag * 0.30) * band_tilts[b];
                    }

                    // Adaptive Automatic Gain Control (AGC)
                    let mut frame_peak = 0.0f32;
                    for b in 0..NUM_BANDS {
                        if raw_bands[b] > frame_peak {
                            frame_peak = raw_bands[b];
                        }
                    }

                    if frame_peak > 0.0004 {
                        if frame_peak > dynamic_peak {
                            // Fast attack on louder music
                            dynamic_peak = dynamic_peak + (frame_peak - dynamic_peak) * 0.40;
                        } else {
                            // Slow, smooth decay (~2.5s)
                            dynamic_peak = (dynamic_peak * 0.993).max(0.006);
                        }
                    }

                    let safe_peak = dynamic_peak.max(0.005);
                    for b in 0..NUM_BANDS {
                        // Non-linear power response for punchy aesthetic feel
                        let normalized = (raw_bands[b] / safe_peak).powf(0.80).clamp(0.0, 1.0);

                        // Instant punchy attack (~10ms) & smooth release (~110ms)
                        if normalized > envelope[b] {
                            envelope[b] = envelope[b] + (normalized - envelope[b]) * 0.75;
                        } else {
                            envelope[b] = envelope[b] * 0.84;
                        }
                        envelope[b] = envelope[b].clamp(0.0, 1.0);
                    }

                    let _ = app.emit("audio-visualizer-bands", envelope.to_vec());
                }
            }

            std::thread::sleep(Duration::from_millis(8));
        }

        unsafe {
            let _ = client.Stop();
        }
        std::thread::sleep(Duration::from_millis(200));
    }
}

#[cfg(target_os = "windows")]
unsafe fn init_wasapi_capture() -> Option<(IAudioClient, IAudioCaptureClient, u16, u16, bool)> {
    let enumerator: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).ok()?;
    let device = enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia)
        .or_else(|_| enumerator.GetDefaultAudioEndpoint(eRender, eConsole)).ok()?;
    let client: IAudioClient = device.Activate(CLSCTX_ALL, None).ok()?;
    let pwfx = client.GetMixFormat().ok()?;

    let wf = *pwfx;
    let channels = wf.nChannels;
    let bits_per_sample = wf.wBitsPerSample;

    if channels == 0 || bits_per_sample == 0 {
        CoTaskMemFree(Some(pwfx as *const _ as *const std::ffi::c_void));
        return None;
    }

    let is_float = wf.wFormatTag == 3 // WAVE_FORMAT_IEEE_FLOAT
        || (wf.wFormatTag == 0xFFFE && {
            let ext = &*(pwfx as *const WAVEFORMATEXTENSIBLE);
            ext.SubFormat.data1 == 3
        });

    let hr = client.Initialize(
        AUDCLNT_SHAREMODE_SHARED,
        AUDCLNT_STREAMFLAGS_LOOPBACK,
        2000000, // 200ms buffer in 100ns units
        0,
        pwfx,
        None,
    );

    CoTaskMemFree(Some(pwfx as *const _ as *const std::ffi::c_void));

    if hr.is_err() {
        return None;
    }

    let capture_client: IAudioCaptureClient = client.GetService().ok()?;
    Some((client, capture_client, channels, bits_per_sample, is_float))
}
}

#[cfg(target_os = "windows")]
pub use imp::*;

#[cfg(not(target_os = "windows"))]
pub struct AudioVisualizer;

#[cfg(not(target_os = "windows"))]
impl AudioVisualizer {
    pub fn new() -> Self {
        AudioVisualizer
    }
    pub fn start(&self, _app: tauri::AppHandle) {}
    pub fn stop(&self) {}
}

