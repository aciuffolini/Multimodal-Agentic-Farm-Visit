/**
 * LLMStrategy - Decides which LLM to use based on availability and task
 * Simple, clear decision logic
 */

import { LocalLLM } from './LocalLLM';
import { CloudLLM } from './CloudLLM';

export type TaskComplexity = 'simple' | 'complex';

export interface LLMRequest {
  text: string;
  location?: { lat: number; lon: number };
  images?: string[];
  systemPrompt?: string;
  preferredModel?: 'local' | 'cloud' | 'auto';
  taskComplexity?: TaskComplexity;
  provider?: 'openai' | 'anthropic';
}

export interface LLMStrategyStats {
  localAvailable: boolean;
  cloudAvailable: boolean;
  selectedProvider: 'local' | 'cloud' | 'none';
  reason?: string;
}

export class LLMStrategy {
  private localLLM = new LocalLLM();
  private cloudLLM = new CloudLLM();

  /**
   * Stream response using appropriate LLM
   */
  async *stream(request: LLMRequest): AsyncGenerator<string> {
    // User explicitly wants local
    if (request.preferredModel === 'local') {
      yield* this.localLLM.stream(request);
      return;
    }

    // User explicitly wants cloud
    if (request.preferredModel === 'cloud') {
      yield* this.cloudLLM.stream({
        ...request,
        provider: request.provider,
      });
      return;
    }

    // Auto mode: Decide based on availability and task complexity
    const localAvailable = await this.localLLM.isAvailable();
    const cloudAvailable = this.cloudLLM.isAvailable();

    // Simple task: Prefer local if available (offline-first)
    if (request.taskComplexity === 'simple' && localAvailable) {
      try {
        yield* this.localLLM.stream(request);
        return;
      } catch (err: any) {
        console.warn('[LLMStrategy] Local failed, trying cloud:', err.message);
        // Fall through to cloud
      }
    }

    // Complex task (with images) or local unavailable: Use cloud
    if (cloudAvailable) {
      try {
        yield* this.cloudLLM.stream({
          ...request,
          provider: request.provider,
        });
        return;
      } catch (err: any) {
        console.warn('[LLMStrategy] Cloud failed, trying local:', err.message);
        // Fall through to local
      }
    }

    // Last resort: Try local
    if (localAvailable) {
      yield* this.localLLM.stream(request);
      return;
    }

    // Nothing available
    throw new Error('No LLM available. Install local model (Nano/Llama) or set API key for cloud models.');
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<{
    local: boolean;
    cloud: boolean;
    localDetails: { nano: boolean; llama: boolean };
    cloudDetails: { openai: boolean; anthropic: boolean };
  }> {
    const [localAvailable, localDetails] = await Promise.all([
      this.localLLM.isAvailable(),
      this.localLLM.getAvailableModels(),
    ]);

    const cloudAvailable = this.cloudLLM.isAvailable();
    const cloudDetails = this.cloudLLM.getAvailableProviders();

    return {
      local: localAvailable,
      cloud: cloudAvailable,
      localDetails,
      cloudDetails,
    };
  }
}



