/**
 * Unified AI Service for AarohAI
 * Centralizes all Gemini API calls and handles failover/retry logic on the frontend.
 */

import { auth } from '../context/firebase';

export interface GenerationOptions {
  language?: 'English' | 'Hindi' | 'Hinglish';
  customPrompt?: string;
  attachment?: { base64: string; mimeType: string; name: string } | null;
  signal?: AbortSignal;
}

class AiService {
  private async post(endpoint: string, body: any, userSignal?: AbortSignal, maxRetries = 2, timeoutMs = 90000) {
    let lastError: any = null;
    const payload = {
      ...body,
      userId: body?.userId || auth.currentUser?.uid || ''
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (userSignal?.aborted) {
        throw new DOMException('Request cancelled by user', 'AbortError');
      }

      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => {
        timeoutController.abort();
      }, timeoutMs); // 170s budget for deep research or custom timeout

      const onUserAbort = () => timeoutController.abort();
      if (userSignal) {
        userSignal.addEventListener('abort', onUserAbort, { once: true });
      }

      try {
        const res = await fetch(`/api/gemini/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: timeoutController.signal
        });

        clearTimeout(timeoutId);
        if (userSignal) userSignal.removeEventListener('abort', onUserAbort);

        const contentType = res.headers.get('content-type') || '';

        // Handle HTML responses (502/503/504 gateway or warmup.html from Cloud Run/nginx)
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          if (res.status === 502 || res.status === 503 || res.status === 504 || text.includes('warmup') || text.includes('<!DOCTYPE') || text.includes('<!doctype')) {
            if (attempt < maxRetries) {
              await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
              continue;
            }
            throw new Error(`AarohAI AI server connection timed out (HTTP ${res.status}). Please try again.`);
          }
          throw new Error(`Server returned HTTP ${res.status}. Please retry.`);
        }

        let data: any;
        try {
          data = await res.json();
        } catch {
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 600));
            continue;
          }
          throw new Error('Invalid response received from server. Please retry.');
        }

        if (!res.ok) {
          const errDetail = data?.error || `API Error: ${res.status}`;
          if ((res.status === 429 || String(errDetail).includes('429') || res.status === 500 || res.status === 503) && attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 800));
            continue;
          }
          throw new Error(errDetail);
        }

        return data;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (userSignal) userSignal.removeEventListener('abort', onUserAbort);

        if (userSignal?.aborted) {
          throw new DOMException('Request cancelled by user', 'AbortError');
        }

        if (err.name === 'AbortError') {
          throw new Error(`Request timed out (${Math.round(timeoutMs / 1000)}s budget limit). Deep research took longer than expected. Please tap Retry.`);
        }

        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
      }
    }

    throw lastError || new Error('Request could not be completed. Please check your network connection and retry.');
  }

  async chat(prompt: string, history: any[], options: GenerationOptions = {}, extraConfig: any = {}) {
    return this.post('chat', {
      prompt,
      history,
      language: options.language,
      attachment: options.attachment,
      youtubeContext: extraConfig.youtubeContext
    }, options.signal, 2, 60000);
  }

  async generateQuiz(config: any, options: GenerationOptions = {}) {
    return this.post('quiz', {
      ...config,
      language: options.language,
      customPrompt: options.customPrompt || config.customPrompt,
      sourceImage: options.attachment,
      youtubeContext: config.youtubeContext
    }, options.signal, 2, 90000);
  }

  async generateMindMap(chapterName: string, designStyle: string, options: GenerationOptions = {}, extraConfig: any = {}) {
    return this.post('mindmap', {
      chapterName,
      designStyle,
      templateId: extraConfig.templateId || 'hierarchical',
      boardOrExam: extraConfig.boardOrExam || 'CBSE Board / NCERT',
      learningLevel: extraConfig.learningLevel || 'Advanced',
      language: options.language,
      customPrompt: options.customPrompt,
      attachment: options.attachment,
      className: extraConfig.className,
      subject: extraConfig.subject,
      inputText: extraConfig.inputText,
      youtubeContext: extraConfig.youtubeContext
    }, options.signal, 2, 240000); // 240s maximum budget (4 minutes) for deep research
  }

  async generateNotes(config: any, options: GenerationOptions = {}) {
    return this.post('notes', {
      ...config,
      language: options.language,
      customPrompt: options.customPrompt || config.customPrompt,
      attachment: options.attachment,
      youtubeContext: config.youtubeContext
    }, options.signal, 2, 120000);
  }

  async checkAnswer(config: any, options: GenerationOptions = {}) {
    return this.post('answer-checker', {
      ...config,
      language: options.language,
      customPrompt: options.customPrompt || config.customPrompt,
      image: options.attachment,
      youtubeContext: config.youtubeContext
    }, options.signal, 2, 120000);
  }

  async analyzeYouTubeVideos(urls: string[], options: GenerationOptions = {}, extraConfig: any = {}) {
    return this.post('youtube-analyze', {
      urls,
      language: options.language,
      customInstructions: options.customPrompt || extraConfig.customInstructions
    }, options.signal, 3, 120000);
  }

  async voiceTranscribe(attachment: { base64: string; mimeType: string; name: string }, language?: string) {
    return this.post('voice-transcribe', { attachment, language });
  }

  // Persistent History & Library
  async getChatHistory(userId: string) {
    const res = await fetch(`/api/chat?userId=${userId}`);
    return res.json();
  }

  async saveChatSession(session: any) {
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
  }

  async deleteChat(id: string) {
    return fetch(`/api/chat/${id}`, { method: 'DELETE' });
  }

  async getLibrary(userId: string) {
    const res = await fetch(`/api/library?userId=${userId}`);
    return res.json();
  }

  async saveToLibrary(item: any) {
    return fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  }

  async deleteFromLibrary(id: string) {
    return fetch(`/api/library/${id}`, { method: 'DELETE' });
  }
}

export const aiService = new AiService();
