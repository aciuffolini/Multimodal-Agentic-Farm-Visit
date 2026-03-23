/**
 * Android Sensor Provider
 * Uses Capacitor plugins for native Android sensor access
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation, Position, PermissionStatus as GeoPermissionStatus } from '@capacitor/geolocation';
import { ISensorProvider, GPSLocation, PhotoResult, CameraOptions, PermissionStatus } from './ISensorProvider';

let _preferredAudioDeviceId: string | undefined;

export function setPreferredAudioDeviceAndroid(deviceId: string | undefined) {
  _preferredAudioDeviceId = deviceId;
}

export class AndroidProvider implements ISensorProvider {
  private audioRecording: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private gpsWatchId: string | null = null;

  private releaseAudioStream(): void {
    if (this.audioStream) {
      try {
        this.audioStream.getTracks().forEach(t => { t.stop(); });
      } catch (_) { /* best effort */ }
      this.audioStream = null;
    }
    if (this.audioRecording) {
      try {
        if (this.audioRecording.state !== 'inactive') {
          this.audioRecording.stop();
        }
      } catch (_) { /* best effort */ }
      this.audioRecording = null;
    }
    this.audioChunks = [];
  }

  async getGPS(): Promise<GPSLocation> {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 10000,
    });

    return {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      acc: Math.round(position.coords.accuracy || 0),
      alt: position.coords.altitude || undefined,
      ts: Date.now(),
    };
  }

  async watchGPS(callback: (loc: GPSLocation) => void): Promise<string> {
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
      (position: Position | null) => {
        if (position) {
          callback({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            acc: Math.round(position.coords.accuracy || 0),
            alt: position.coords.altitude || undefined,
            ts: Date.now(),
          });
        }
      }
    );
    
    this.gpsWatchId = watchId;
    return watchId;
  }

  clearWatch(watchId: string): void {
    Geolocation.clearWatch({ id: watchId });
    if (this.gpsWatchId === watchId) {
      this.gpsWatchId = null;
    }
  }

  async capturePhoto(options?: CameraOptions): Promise<PhotoResult> {
    const image = await Camera.getPhoto({
      quality: options?.quality || 90,
      allowEditing: options?.allowEditing || false,
      resultType: CameraResultType.DataUrl, // DataUrl for PWA compatibility
      source: options?.source === 'photos' ? CameraSource.Photos : CameraSource.Camera,
      correctOrientation: true,
    });

    // Get image dimensions from loaded image
    let width = 0;
    let height = 0;
    const dataUrl = image.dataUrl;
    if (dataUrl) {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          width = img.width;
          height = img.height;
          resolve();
        };
        img.onerror = reject;
        img.src = dataUrl;
      });
    }

    return {
      dataUrl: image.dataUrl || '',
      path: image.path || undefined,
      width: width || 0,
      height: height || 0,
    };
  }

  async startRecording(): Promise<void> {
    console.log('[AndroidProvider] Starting recording...');

    // Force-release any previous stream/recorder so the Android audio HAL
    // is free.  On Android WebView the hardware doesn't release instantly,
    // so we also yield briefly after stopping tracks.
    this.releaseAudioStream();
    await new Promise(r => setTimeout(r, 120));

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia unavailable in this Android WebView. Update Android System WebView/Chrome and ensure app uses HTTPS origin.');
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder is not supported in this browser');
    }

    try {
      console.log('[AndroidProvider] Requesting media stream...');
      let stream: MediaStream;
      const preferredDeviceId = _preferredAudioDeviceId;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : {}),
          }
        });
      } catch {
        console.warn('[AndroidProvider] Advanced constraints failed, falling back to { audio: true }');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.audioStream = stream;
      console.log('[AndroidProvider] Media stream obtained');

      // Pick a supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus', 'audio/webm',
        'audio/ogg;codecs=opus', 'audio/mp4', 'audio/wav',
      ];
      let selectedMimeType = '';
      for (const mt of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mt)) { selectedMimeType = mt; break; }
      }

      // Progressive MediaRecorder constructor fallback
      const attempts: Array<MediaRecorderOptions | undefined> = [];
      if (selectedMimeType) {
        attempts.push({ mimeType: selectedMimeType, audioBitsPerSecond: 128000 });
        attempts.push({ mimeType: selectedMimeType });
      }
      attempts.push({ audioBitsPerSecond: 128000 });
      attempts.push(undefined);

      let recorder: MediaRecorder | null = null;
      let lastErr: any = null;
      for (const opts of attempts) {
        try {
          recorder = opts ? new MediaRecorder(stream, opts) : new MediaRecorder(stream);
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!recorder) {
        this.releaseAudioStream();
        throw lastErr || new Error('Unable to initialize MediaRecorder');
      }

      this.audioRecording = recorder;
      this.audioChunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) this.audioChunks.push(e.data);
      };
      recorder.onerror = (e: any) => {
        console.error('[AndroidProvider] MediaRecorder error:', e.error);
      };

      try { recorder.start(1000); } catch {
        console.warn('[AndroidProvider] start(1000) failed, retrying without timeslice');
        recorder.start();
      }
      console.log('[AndroidProvider] Recording started successfully');
    } catch (err: any) {
      this.releaseAudioStream();
      console.error('[AndroidProvider] Start recording error:', err);
      const msg = err?.message || 'Unknown error';
      if (msg.includes('NotAllowed') || msg.includes('Permission') || msg.includes('permission')) {
        throw new Error('Microphone permission denied. Go to Android Settings → Apps → Farm Visit → Permissions and enable Microphone.');
      }
      if (msg.includes('NotReadable') || msg.includes('device busy') || msg.includes('Could not start') || msg.includes('audio source')) {
        throw new Error('Microphone hardware is busy. Wait a moment and try again, or close other recording apps.');
      }
      throw new Error(`Failed to start recording: ${msg}`);
    }
  }

  async stopRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      const recorder = this.audioRecording;
      if (!recorder || recorder.state === 'inactive') {
        this.releaseAudioStream();
        reject(new Error('No active recording'));
        return;
      }

      console.log('[AndroidProvider] Stopping recording...');

      // Capture mimeType before any state change
      const mimeType = recorder.mimeType || 'audio/webm';

      recorder.onstop = () => {
        // Release the hardware immediately so next recording can open cleanly
        this.releaseAudioStream();

        try {
          if (this.audioChunks.length === 0) {
            reject(new Error('No audio data recorded'));
            return;
          }

          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          this.audioChunks = [];

          if (audioBlob.size === 0) {
            reject(new Error('Recorded audio is empty'));
            return;
          }

          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read audio data'));
          reader.readAsDataURL(audioBlob);
        } catch (err) {
          reject(err);
        }
      };

      try { recorder.requestData(); } catch { /* not supported on all engines */ }
      recorder.stop();
    });
  }

  async playAudio(url: string): Promise<void> {
    // Stop any currently playing audio
    this.stopAudio();

    this.currentAudio = new Audio(url);
    await this.currentAudio.play();
  }

  stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  async requestPermissions(): Promise<PermissionStatus> {
    let cameraStatus: 'granted' | 'denied' = 'denied';
    try {
      const result = await Camera.requestPermissions();
      const permState = result as any;
      cameraStatus = (permState.camera === 'granted') ? 'granted' : 'denied';
    } catch (e) {
      console.warn('Camera permission request failed:', e);
    }

    let geoStatus: 'granted' | 'denied' = 'denied';
    try {
      const geoPerm = await Geolocation.requestPermissions();
      geoStatus = (geoPerm.location === 'granted') ? 'granted' : 'denied';
    } catch (e) {
      console.warn('Geolocation permission request failed:', e);
    }

    // Do NOT call getUserMedia here just to probe permission status.
    // On Android WebView, acquiring and releasing the audio device is slow;
    // a stale stream causes "Could not start audio source" when startRecording
    // is called shortly after.  The native MainActivity already handles the
    // RECORD_AUDIO runtime permission request at app startup.
    let micPerm: 'granted' | 'denied' = 'denied';
    try {
      const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      micPerm = perm.state === 'granted' ? 'granted' : 'denied';
    } catch {
      micPerm = (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') ? 'granted' : 'denied';
    }

    return { camera: cameraStatus, microphone: micPerm, geolocation: geoStatus };
  }

  async checkPermissions(): Promise<PermissionStatus> {
    // Camera
    let cameraStatus: 'granted' | 'denied' | 'prompt' = 'prompt';
    try {
      const result = await Camera.checkPermissions();
      const permState = result as any;
      cameraStatus = (permState.camera === 'granted') ? 'granted' : 'denied';
    } catch (e) {
      console.warn('Camera permission check failed:', e);
    }
    
    // Geolocation
    let geoStatus: 'granted' | 'denied' | 'prompt' = 'prompt';
    try {
      const geoPerm = await Geolocation.checkPermissions();
      geoStatus = (geoPerm.location === 'granted') ? 'granted' : 'denied';
    } catch (e) {
      console.warn('Geolocation permission check failed:', e);
    }
    
    // Check microphone - Android WebView doesn't expose static permission API
    let micPerm: 'granted' | 'denied' | 'prompt' = 'prompt';
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      micPerm = 'prompt';
    } else {
      micPerm = 'denied';
    }

    return {
      camera: cameraStatus,
      microphone: micPerm,
      geolocation: geoStatus,
    };
  }
}

