# 🚀 Start Refactoring - Step by Step

## 🎯 Goal: Simple, Working, Offline-First PWA

### Core Principles
1. **Offline-First**: Local models work without server
2. **Simple Architecture**: Clear separation of concerns
3. **Progressive Enhancement**: Works offline, better online
4. **Future-Ready**: Easy to add Ray-Ban Gen 2 later

---

## 📋 Phase 1: Create New LLM Architecture (START HERE)

### Step 1.1: Create LocalLLM.ts (Offline Models)

**File**: `apps/web/src/lib/llm/LocalLLM.ts`

```typescript
/**
 * LocalLLM - Handles offline models (Nano, Llama)
 * Works completely offline, no server needed
 */
import { Capacitor } from '@capacitor/core';
import { geminiNano } from './GeminiNano';
import { llamaLocal } from './LlamaLocal';

export interface LocalLLMInput {
  text: string;
  location?: { lat: number; lon: number };
  images?: string[];
  systemPrompt?: string;
}

export class LocalLLM {
  /**
   * Try to use available local model
   */
  async *stream(input: LocalLLMInput): AsyncGenerator<string> {
    // Priority 1: Gemini Nano (Android 14+)
    if (Capacitor.isNativePlatform()) {
      try {
        const available = await geminiNano.isAvailable();
        if (available) {
          console.log('[LocalLLM] Using Gemini Nano');
          yield* geminiNano.stream({
            text: input.text,
            location: input.location,
            image: input.images?.[0],
          });
          return;
        }
      } catch (err) {
        console.warn('[LocalLLM] Nano failed:', err);
      }
    }

    // Priority 2: Llama Local
    try {
      const available = await llamaLocal.checkAvailability();
      if (available) {
        console.log('[LocalLLM] Using Llama Local');
        yield* llamaLocal.stream({
          text: input.text,
          location: input.location,
        });
        return;
      }
    } catch (err) {
      console.warn('[LocalLLM] Llama failed:', err);
    }

    throw new Error('No local LLM available. Install Gemini Nano (Android 14+) or Llama Local.');
  }

  async isAvailable(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        return await geminiNano.isAvailable();
      } catch {
        // Continue to check Llama
      }
    }
    try {
      return await llamaLocal.checkAvailability();
    } catch {
      return false;
    }
  }
}
```

### Step 1.2: Create CloudLLM.ts (Online Models)

**File**: `apps/web/src/lib/llm/CloudLLM.ts`

```typescript
/**
 * CloudLLM - Handles online models (OpenAI, Anthropic)
 * Requires internet connection and API key
 */
import { streamChat } from '../api';
import { getUserApiKey } from '../config/userKey';

export interface CloudLLMInput {
  text: string;
  location?: { lat: number; lon: number };
  images?: string[];
  systemPrompt?: string;
  provider?: 'openai' | 'anthropic';
}

export class CloudLLM {
  async *stream(input: CloudLLMInput): AsyncGenerator<string> {
    if (!navigator.onLine) {
      throw new Error('Cloud LLM requires internet connection');
    }

    const apiKey = getUserApiKey();
    if (!apiKey) {
      throw new Error('API key required. Set it using the 🔑 button.');
    }

    // Build messages
    const messages: any[] = [];
    if (input.systemPrompt) {
      messages.push({
        role: 'system',
        content: input.systemPrompt,
      });
    }

    // Build user message with images if provided
    const userContent: any[] = [{ type: 'text', text: input.text }];
    if (input.images && input.images.length > 0) {
      // Add images in appropriate format
      for (const img of input.images) {
        userContent.push({
          type: 'image_url',
          image_url: { url: img },
        });
      }
    }

    messages.push({
      role: 'user',
      content: userContent.length > 1 ? userContent : input.text,
    });

    // Determine provider
    const provider = input.provider || (apiKey.startsWith('sk-ant-') ? 'anthropic' : 'openai');

    try {
      yield* streamChat(messages, undefined, provider === 'anthropic' ? 'claude-code' : undefined);
    } catch (err: any) {
      if (err.message?.includes('Cannot connect') || err.message?.includes('server')) {
        throw new Error('API server not running. For local dev, start: node test-server.js');
      }
      throw err;
    }
  }

  isAvailable(): boolean {
    return navigator.onLine && !!getUserApiKey();
  }
}
```

### Step 1.3: Create LLMStrategy.ts (Decision Logic)

**File**: `apps/web/src/lib/llm/LLMStrategy.ts`

```typescript
/**
 * LLMStrategy - Decides which LLM to use
 * Simple, clear logic
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
}

export class LLMStrategy {
  private localLLM = new LocalLLM();
  private cloudLLM = new CloudLLM();

  async *stream(request: LLMRequest): AsyncGenerator<string> {
    // User explicitly wants local
    if (request.preferredModel === 'local') {
      yield* this.localLLM.stream(request);
      return;
    }

    // User explicitly wants cloud
    if (request.preferredModel === 'cloud') {
      yield* this.cloudLLM.stream(request);
      return;
    }

    // Auto mode: Decide based on availability and task
    const localAvailable = await this.localLLM.isAvailable();
    const cloudAvailable = this.cloudLLM.isAvailable();

    // Simple task: Prefer local if available
    if (request.taskComplexity === 'simple' && localAvailable) {
      try {
        yield* this.localLLM.stream(request);
        return;
      } catch (err) {
        console.warn('[LLMStrategy] Local failed, trying cloud:', err);
        // Fall through to cloud
      }
    }

    // Complex task or local unavailable: Use cloud
    if (cloudAvailable) {
      try {
        yield* this.cloudLLM.stream(request);
        return;
      } catch (err) {
        console.warn('[LLMStrategy] Cloud failed, trying local:', err);
        // Fall through to local
      }
    }

    // Last resort: Try local
    if (localAvailable) {
      yield* this.localLLM.stream(request);
      return;
    }

    throw new Error('No LLM available. Install local model or set API key for cloud.');
  }

  async getAvailableModels(): Promise<{
    local: boolean;
    cloud: boolean;
  }> {
    return {
      local: await this.localLLM.isAvailable(),
      cloud: this.cloudLLM.isAvailable(),
    };
  }
}
```

### Step 1.4: Simplify LLMProvider.ts (Facade)

**File**: `apps/web/src/lib/llm/LLMProvider.ts` (REPLACE)

```typescript
/**
 * LLMProvider - Simple facade for LLM access
 * Delegates to LLMStrategy
 */
import { LLMStrategy, LLMRequest } from './LLMStrategy';

export type ModelOption = 'nano' | 'gpt-4o-mini' | 'llama-small' | 'claude-code' | 'auto';

export interface LLMInput {
  text: string;
  location?: { lat: number; lon: number };
  images?: string[];
  model?: ModelOption;
  visitContext?: any;
}

export class LLMProvider {
  private strategy = new LLMStrategy();

  async *stream(input: LLMInput): AsyncGenerator<string> {
    // Map model option to strategy request
    const preferredModel = input.model === 'auto' 
      ? undefined 
      : (input.model === 'nano' || input.model === 'llama-small' ? 'local' : 'cloud');

    // Build system prompt from visit context
    const systemPrompt = this.buildSystemPrompt(input.visitContext);

    // Determine task complexity (simple for basic Q&A, complex for analysis)
    const taskComplexity: 'simple' | 'complex' = 
      input.images && input.images.length > 0 ? 'complex' : 'simple';

    const request: LLMRequest = {
      text: input.text,
      location: input.location,
      images: input.images,
      systemPrompt,
      preferredModel,
      taskComplexity,
    };

    yield* this.strategy.stream(request);
  }

  private buildSystemPrompt(visitContext?: any): string {
    let prompt = `You are an expert agricultural field visit assistant. Help with:
- Field visit data capture and organization
- Crop identification and management advice
- Pest and disease detection
- Agricultural best practices
- GPS location-based insights

Be concise, practical, and provide actionable advice.`;

    if (visitContext) {
      if (visitContext.current?.gps) {
        prompt += `\n\nCurrent location: ${visitContext.current.gps.lat}, ${visitContext.current.gps.lon}`;
      }
      if (visitContext.current?.note) {
        prompt += `\n\nCurrent note: ${visitContext.current.note}`;
      }
    }

    return prompt;
  }

  async getStats() {
    const models = await this.strategy.getAvailableModels();
    return {
      provider: models.local ? 'local' : models.cloud ? 'cloud' : 'none',
      localAvailable: models.local,
      cloudAvailable: models.cloud,
    };
  }
}

export const llmProvider = new LLMProvider();
```

---

## 📋 Phase 2: Simplify ChatDrawer

### Step 2.1: Simplify Error Handling

**File**: `apps/web/src/components/ChatDrawer.tsx` (SIMPLIFY)

```typescript
const send = async () => {
  if (!input.trim() || busy) return;

  const userMsg: ChatMessage = { role: 'user', content: input.trim() };
  setMessages((m) => [...m, userMsg]);
  const userInput = input.trim();
  setInput('');
  setBusy(true);

  const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
  setMessages((m) => [...m, assistantMsg]);

  try {
    // Get visit context
    const visitContext = (window as any).__VISIT_CONTEXT__;
    
    // Build images array
    const images: string[] = [];
    if (visitContext?.current?.photo) images.push(visitContext.current.photo);
    if (visitContext?.latest?.photo_data) images.push(visitContext.latest.photo_data);

    // Stream response
    let hasResponse = false;
    const generator = llmProvider.stream({
      text: userInput,
      location: visitContext?.gps 
        ? { lat: visitContext.gps.lat, lon: visitContext.gps.lon }
        : undefined,
      images: images.length > 0 ? images : undefined,
      model: selectedModel,
      visitContext,
    });

    for await (const chunk of generator) {
      hasResponse = true;
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = { ...last, content: last.content + chunk };
        }
        return copy;
      });
    }

    if (!hasResponse) {
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = { 
            ...last, 
            content: 'No response generated. Check if a model is available (local or cloud with API key).' 
          };
        }
        return copy;
      });
    }
  } catch (err: any) {
    console.error('[ChatDrawer] Error:', err);
    
    // Simple error message
    let errorMsg = err.message || 'An error occurred';
    
    // Make it user-friendly
    if (errorMsg.includes('No LLM available')) {
      errorMsg = '⚠️ No AI model available.\n\n' +
        'Options:\n' +
        '• Install Gemini Nano (Android 14+)\n' +
        '• Install Llama Local\n' +
        '• Set API key for Cloud models';
    } else if (errorMsg.includes('API server')) {
      errorMsg = '⚠️ API server not running.\n\n' +
        'For local development:\n' +
        '1. Open terminal\n' +
        '2. cd apps/web\n' +
        '3. node test-server.js';
    } else if (errorMsg.includes('API key')) {
      errorMsg = '⚠️ API key required.\n\n' +
        'Click the 🔑 button above to set your API key.';
    }

    setMessages((m) => {
      const copy = [...m];
      const last = copy[copy.length - 1];
      if (last && last.role === 'assistant') {
        copy[copy.length - 1] = { ...last, content: errorMsg };
      }
      return copy;
    });
  } finally {
    setBusy(false);
  }
};
```

---

## 📋 Phase 3: Clean Repository & Commit

### Step 3.1: Organize Files

```powershell
# Create structure
mkdir docs\guides
mkdir docs\architecture  
mkdir docs\troubleshooting
mkdir scripts

# Move files
Move-Item INSTALL_*.md docs\guides\
Move-Item BUILD_*.md docs\guides\
Move-Item DEPLOY_*.md docs\guides\
Move-Item FARM_VISIT_ARCHITECTURE.md docs\architecture\
Move-Item DEBUG_*.md docs\troubleshooting\
Move-Item FIX_*.md docs\troubleshooting\
```

### Step 3.2: Remove Temporary Files

```powershell
# Delete debug/temp files
Remove-Item *_SUMMARY.md
Remove-Item *_ANALYSIS.md
Remove-Item COMMIT_*.md
Remove-Item PUSH_*.md
Remove-Item TEST_*.md
Remove-Item STATUS*.md
Remove-Item MVP_*.md
```

### Step 3.3: Commit in Groups

```powershell
# Group 1: Core refactoring
git add apps/web/src/lib/llm/LocalLLM.ts
git add apps/web/src/lib/llm/CloudLLM.ts
git add apps/web/src/lib/llm/LLMStrategy.ts
git add apps/web/src/lib/llm/LLMProvider.ts
git commit -m "refactor: simplify LLM architecture with clear separation

- Extract LocalLLM for offline models (Nano, Llama)
- Extract CloudLLM for online models (OpenAI, Anthropic)
- Create LLMStrategy for decision logic
- Simplify LLMProvider to be a facade
- Clear separation: offline-first, cloud-optional"

# Group 2: UI simplification
git add apps/web/src/components/ChatDrawer.tsx
git commit -m "refactor: simplify chat interface error handling

- Remove complex nested error handling
- Simple try-catch with clear messages
- Better user feedback"

# Group 3: Documentation
git add docs/
git add REFACTORING_PLAN.md
git commit -m "docs: organize documentation and add refactoring plan"
```

---

## 🚀 Ready to Start?

**Would you like me to:**
1. ✅ Create the new LLM files (LocalLLM, CloudLLM, LLMStrategy)?
2. ✅ Refactor LLMProvider to use them?
3. ✅ Simplify ChatDrawer?
4. ✅ Clean up repository?
5. ✅ Commit everything properly?

**Say "start refactoring" and I'll begin!**



