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
  private audioChunks: Blob[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private gpsWatchId: string | null = null;

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

    // Recover from any stale recorder state left by previous failures.
    if (this.audioRecording) {
      try {
        if (this.audioRecording.stream) {
          this.audioRecording.stream.getTracks().forEach(track => track.stop());
        }
      } catch (cleanupErr) {
        console.warn('[AndroidProvider] Failed cleaning previous recorder state:', cleanupErr);
      } finally {
        this.audioRecording = null;
        this.audioChunks = [];
      }
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia unavailable in this Android WebView. Update Android System WebView/Chrome and ensure app uses HTTPS origin.');
    }

    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder is not supported in this browser');
    }

    try {
      // Single getUserMedia call — do NOT probe first.
      // On Android WebView the audio device doesn't release fast enough
      // between two consecutive getUserMedia calls, causing the second to
      // fail with "device busy".  The constraint fallback already handles
      // the case where advanced constraints aren't supported.
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
      } catch (constraintErr) {
        console.warn('[AndroidProvider] Advanced audio constraints not supported, using fallback:', constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      console.log('[AndroidProvider] Media stream obtained', preferredDeviceId ? `(device: ${preferredDeviceId})` : '(default)');

      // Find supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log('[AndroidProvider] Using MIME type:', mimeType);
          break;
        }
      }

      if (!selectedMimeType) {
        console.warn('[AndroidProvider] No supported MIME type found, using browser default');
      }

      // Some Android WebViews reject options (mime/audioBitsPerSecond) even when
      // reporting support. Try progressively simpler constructors.
      const constructorAttempts: Array<MediaRecorderOptions | undefined> = [];
      if (selectedMimeType) {
        constructorAttempts.push({ mimeType: selectedMimeType, audioBitsPerSecond: 128000 });
        constructorAttempts.push({ mimeType: selectedMimeType });
      }
      constructorAttempts.push({ audioBitsPerSecond: 128000 });
      constructorAttempts.push(undefined);

      let recorder: MediaRecorder | null = null;
      let constructorError: any = null;
      for (const options of constructorAttempts) {
        try {
          recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
          console.log('[AndroidProvider] MediaRecorder initialized with options:', options ?? '(none)');
          break;
        } catch (ctorErr) {
          constructorError = ctorErr;
          console.warn('[AndroidProvider] MediaRecorder ctor attempt failed:', options ?? '(none)', ctorErr);
        }
      }

      if (!recorder) {
        stream.getTracks().forEach(track => track.stop());
        throw constructorError || new Error('Unable to initialize MediaRecorder');
      }

      this.audioRecording = recorder;
      this.audioChunks = [];

      this.audioRecording.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.audioRecording.onerror = (event: any) => {
        console.error('[AndroidProvider] MediaRecorder error:', event.error);
      };

      // Some devices fail with timeslice; fallback to start() without timeslice.
      try {
        this.audioRecording.start(1000);
      } catch (startErr) {
        console.warn('[AndroidProvider] start(1000) failed, retrying start() without timeslice:', startErr);
        this.audioRecording.start();
      }
      console.log('[AndroidProvider] Recording started successfully');
    } catch (err: any) {
      console.error('[AndroidProvider] Start recording error:', err);
      const msg = err?.message || 'Unknown error';
      if (msg.includes('NotAllowed') || msg.includes('Permission') || msg.includes('permission')) {
        throw new Error('Microphone permission denied. Go to Android Settings → Apps → Farm Visit → Permissions and enable Microphone.');
      }
      if (msg.includes('NotReadable') || msg.includes('device busy') || msg.includes('Could not start source')) {
        throw new Error('Microphone is busy or blocked by another app. Close other recording apps and try again.');
      }
      throw new Error(`Failed to start recording: ${msg}`);
    }
  }

  async stopRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.audioRecording) {
        console.warn('[AndroidProvider] No active recording to stop');
        reject(new Error('No active recording'));
        return;
      }

      console.log('[AndroidProvider] Stopping recording...');

      // Set up stop handler before stopping
      const onStopHandler = async () => {
        try {
          console.log('[AndroidProvider] Processing audio chunks:', this.audioChunks.length);
          
          if (this.audioChunks.length === 0) {
            reject(new Error('No audio data recorded'));
            return;
          }

          // Determine MIME type from chunks or use default
          const mimeType = this.audioRecording?.mimeType || 'audio/webm';
          console.log('[AndroidProvider] Creating blob with type:', mimeType);
          
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          console.log('[AndroidProvider] Blob created, size:', audioBlob.size, 'bytes');

          if (audioBlob.size === 0) {
            reject(new Error('Recorded audio is empty'));
            return;
          }

          const reader = new FileReader();
          
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            console.log('[AndroidProvider] Audio data URL generated, length:', dataUrl.length);
            resolve(dataUrl);
          };
          
          reader.onerror = (error) => {
            console.error('[AndroidProvider] FileReader error:', error);
            reject(new Error('Failed to read audio data'));
          };
          
          reader.readAsDataURL(audioBlob);

          // Stop all tracks
          if (this.audioRecording?.stream) {
            this.audioRecording.stream.getTracks().forEach(track => {
              track.stop();
              console.log('[AndroidProvider] Stopped track:', track.kind);
            });
          }
          
          this.audioRecording = null;
          this.audioChunks = [];
        } catch (err: any) {
          console.error('[AndroidProvider] Error in stop handler:', err);
          reject(err);
        }
      };

      // Remove previous onstop handler if any and set new one
      this.audioRecording.onstop = onStopHandler;

      // Request final data chunk before stopping
      try {
        this.audioRecording.requestData();
      } catch (e) {
        console.warn('[AndroidProvider] requestData() not supported, continuing...');
      }

      // Stop recording
      this.audioRecording.stop();
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
    // Camera
    let cameraStatus: 'granted' | 'denied' = 'denied';
    try {
      const result = await Camera.requestPermissions();
      // Capacitor 6.x returns an object with camera and photos properties
      const permState = result as any;
      cameraStatus = (permState.camera === 'granted') ? 'granted' : 'denied';
    } catch (e) {
      console.warn('Camera permission request failed:', e);
    }
    
    // Geolocation
    let geoStatus: 'granted' | 'denied' = 'denied';
    try {
      const geoPerm = await Geolocation.requestPermissions();
      geoStatus = (geoPerm.location === 'granted') ? 'granted' : 'denied';
    } catch (e) {
      console.warn('Geolocation permission request failed:', e);
    }
    
    // Microphone (handled via browser API)
    let micPerm: 'granted' | 'denied' = 'denied';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      micPerm = 'granted';
    } catch {
      micPerm = 'denied';
    }

    return {
      camera: cameraStatus,
      microphone: micPerm,
      geolocation: geoStatus,
    };
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

