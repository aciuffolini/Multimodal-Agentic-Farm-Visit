/**
 * Llama Local Integration - On-Device Offline Fallback using WebLLM
 * Runs Llama 3.2 directly in the browser/WebView via WebGPU
 * Fully offline after initial model download
 */

import { CreateMLCEngine, MLCEngine, InitProgressReport } from '@mlc-ai/web-llm';

export interface LlamaLocalInput {
  text: string;
  location?: { lat: number; lon: number };
}

export type LlamaInitCallback = (progress: InitProgressReport) => void;

export class LlamaLocal {
  private engine: MLCEngine | null = null;
  private initializing: boolean = false;
  private downloadProgress: string = '';
  // The Llama 3.2 1B or 3B model (3B is recommended for this hardware)
  private readonly MODEL_ID = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';

  /**
   * Check if WebGPU (and therefore WebLLM) is available on this device
   */
  async checkAvailability(): Promise<boolean> {
    // Check if browser supports WebGPU
    if (!(navigator as any).gpu) {
      console.warn('[LlamaLocal] WebGPU not supported on this device/browser.');
      return false;
    }
    return true;
  }

  /**
   * Get the current download/init progress
   */
  getProgress(): string {
    return this.downloadProgress;
  }

  /**
   * Initialize the WebLLM engine and download the model if needed
   */
  async initialize(onProgress?: LlamaInitCallback): Promise<void> {
    if (this.engine) return; // already initialized
    if (this.initializing) throw new Error('Already initializing Llama Local model. Please wait.');

    const isAvailable = await this.checkAvailability();
    if (!isAvailable) {
      throw new Error('WebGPU is not supported on this device. Cannot run Llama Local.');
    }

    this.initializing = true;
    try {
      console.log(`[LlamaLocal] Initializing ${this.MODEL_ID}...`);
      
      const initProgressCallback = (report: InitProgressReport) => {
        this.downloadProgress = report.text;
        if (onProgress) onProgress(report);
      };

      this.engine = await CreateMLCEngine(this.MODEL_ID, {
        initProgressCallback,
      });

      console.log('[LlamaLocal] Engine initialized successfully!');
      this.downloadProgress = 'Ready';
    } catch (err: any) {
      console.error('[LlamaLocal] Initialization failed:', err);
      this.engine = null;
      this.downloadProgress = 'Error loading model';
      throw new Error(`Failed to load Llama model: ${err.message}`);
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Stream completion for chat
   */
  async *stream(input: LlamaLocalInput): AsyncGenerator<string> {
    if (!this.engine) {
      throw new Error('Llama Local engine is not initialized. Please load the model first.');
    }

    if (!input.text) {
      throw new Error('Text input required');
    }

    // Build the chat prompt
    let promptText = input.text;
    if (input.location) {
      promptText += `\n\nLocation Context: ${input.location.lat.toFixed(6)}, ${input.location.lon.toFixed(6)}`;
    }

    try {
      // The MLCEngine expects OpenAI-like ChatCompletion format
      const generator = await this.engine.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: 'You are an offline agricultural assistant for field visits. Keep answers concise, practical, and helpful.' 
          },
          { role: 'user', content: promptText }
        ],
        stream: true,
      });

      for await (const chunk of generator) {
        if (chunk.choices[0]?.delta?.content) {
          yield chunk.choices[0].delta.content;
        }
      }
    } catch (err: any) {
      console.error('[LlamaLocal] Streaming failed:', err);
      throw new Error(`Llama Local generation failed: ${err.message}`);
    }
  }

  /**
   * Check if the engine is ready
   */
  isReady(): boolean {
    return this.engine !== null;
  }
}

// Default instance
export const llamaLocal = new LlamaLocal();
