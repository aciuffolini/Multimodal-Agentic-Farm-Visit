/**
 * Sensor Manager
 * Factory pattern for sensor providers
 * Auto-detects platform and provides appropriate implementation
 * Supports switching between phone and glasses (Ray-Ban) sensor sources
 */

import { Capacitor } from '@capacitor/core';
import { ISensorProvider, SensorSource } from './ISensorProvider';
import { AndroidProvider } from './AndroidProvider';
import { WebProvider } from './WebProvider';

export class SensorManager {
  private static instance: SensorManager;
  private provider: ISensorProvider;
  private _source: SensorSource = 'phone';
  private _listeners: Array<(source: SensorSource) => void> = [];
  private _preferredAudioDeviceId: string | undefined;

  private constructor() {
    if (Capacitor.isNativePlatform()) {
      this.provider = new AndroidProvider();
    } else {
      this.provider = new WebProvider();
    }
  }

  static getInstance(): SensorManager {
    if (!SensorManager.instance) {
      SensorManager.instance = new SensorManager();
    }
    return SensorManager.instance;
  }

  getProvider(): ISensorProvider {
    return this.provider;
  }

  get source(): SensorSource {
    return this._source;
  }

  /**
   * Switch between phone and glasses sensor source.
   * When glasses is selected, external Bluetooth audio/video devices are preferred.
   */
  async setSource(source: SensorSource): Promise<void> {
    this._source = source;

    if (source === 'glasses') {
      const extDevice = await this.findExternalDevice();
      this._preferredAudioDeviceId = extDevice?.deviceId;
    } else {
      this._preferredAudioDeviceId = undefined;
    }

    this._listeners.forEach(fn => fn(source));
    console.log(`[SensorManager] Source set to: ${source}`, this._preferredAudioDeviceId ? `(device: ${this._preferredAudioDeviceId})` : '');
  }

  onSourceChange(fn: (source: SensorSource) => void): () => void {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  get preferredAudioDeviceId(): string | undefined {
    return this._preferredAudioDeviceId;
  }

  /**
   * List available external audio/video devices (e.g. Bluetooth glasses).
   */
  async listExternalDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d =>
        (d.kind === 'audioinput' || d.kind === 'videoinput') &&
        d.deviceId !== 'default' &&
        d.deviceId !== 'communications' &&
        d.label.toLowerCase() !== ''
      );
    } catch {
      return [];
    }
  }

  private async findExternalDevice(): Promise<MediaDeviceInfo | undefined> {
    const devices = await this.listExternalDevices();
    return devices.find(d =>
      d.kind === 'audioinput' &&
      (d.label.toLowerCase().includes('bluetooth') ||
       d.label.toLowerCase().includes('ray-ban') ||
       d.label.toLowerCase().includes('meta') ||
       d.label.toLowerCase().includes('headset'))
    );
  }

  // Convenience methods
  async getGPS() { return this.provider.getGPS(); }
  async capturePhoto(options?: any) { return this.provider.capturePhoto(options); }
  async startRecording() { return this.provider.startRecording(); }
  async stopRecording() { return this.provider.stopRecording(); }
  async playAudio(url: string) { return this.provider.playAudio(url); }
  async requestPermissions() { return this.provider.requestPermissions(); }
  async checkPermissions() { return this.provider.checkPermissions(); }
}


