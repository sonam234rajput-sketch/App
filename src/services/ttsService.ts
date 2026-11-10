/**
 * Professional Text-to-Speech (TTS) Service for AarohAI
 * Cross-browser SpeechSynthesis manager with Hindi/English bilingual support,
 * clean Markdown stripping, and active speech state coordination.
 */

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentId: string | null;
}

type StateListener = (state: TTSState) => void;

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentId: string | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private listeners: Set<StateListener> = new Set();
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[TTS] Listener error:', err);
      }
    });
  }

  public getState(): TTSState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentId: this.currentId,
    };
  }

  /**
   * Cleans Markdown formatting, LaTeX, and symbols to produce natural, fluent speech.
   */
  public cleanText(text: string): string {
    if (!text) return '';
    return text
      // Remove math blocks $$ ... $$ and inline math $ ... $
      .replace(/\$\$[\s\S]*?\$\$/g, ' formula ')
      .replace(/\$([^$]+)\$/g, '$1')
      // Remove markdown headers, bold, italics, strikethrough
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      // Remove code blocks and inline code
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images ![alt](url)
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove bullet markers and table pipes
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\|/g, ', ')
      // Clean up multiple spaces and empty lines
      .replace(/\n\s*\n/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detects whether the text is primarily Hindi / Devanagari or English.
   */
  public detectLanguage(text: string): 'hi-IN' | 'en-IN' | 'en-US' {
    // Check for Devanagari Unicode block (\u0900 - \u097F)
    const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
    if (devanagariCount > 5) {
      return 'hi-IN';
    }
    // Check for common Hinglish tokens (kya, hai, hota, kaise, etc.)
    const hinglishMatch = text.match(/\b(hai|hain|kya|kyun|kaise|hota|hoti|hote|iske|uske|liye|mein|par|aur|bhi|karo|nahi)\b/i);
    if (hinglishMatch) {
      return 'hi-IN';
    }
    return 'en-IN';
  }

  private pickVoice(lang: string): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      this.initVoices();
    }
    if (!this.voices || this.voices.length === 0) return null;

    // Prefer high quality Indian English or Hindi voices
    if (lang === 'hi-IN') {
      const hindiVoice = this.voices.find(
        (v) => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')
      );
      if (hindiVoice) return hindiVoice;
    }

    const indianEngVoice = this.voices.find(
      (v) => v.lang === 'en-IN' || v.name.toLowerCase().includes('india')
    );
    if (indianEngVoice) return indianEngVoice;

    const engVoice = this.voices.find((v) => v.lang.startsWith('en'));
    return engVoice || this.voices[0] || null;
  }

  /**
   * Speaks the given text. If already playing this ID, pauses/resumes.
   * If a different ID is passed, cancels the current one and starts the new one.
   */
  public toggle(id: string, text: string, langOverride?: string) {
    if (!this.synth) {
      console.warn('[TTS] SpeechSynthesis not supported on this browser.');
      return;
    }

    // If same item is active
    if (this.currentId === id) {
      if (this.isPlaying && !this.isPaused) {
        this.pause();
        return;
      }
      if (this.isPaused) {
        this.resume();
        return;
      }
    }

    // Otherwise stop any ongoing speech and start new
    this.speak(id, text, langOverride);
  }

  public speak(id: string, text: string, langOverride?: string) {
    if (!this.synth) return;

    this.stop();

    const clean = this.cleanText(text);
    if (!clean) return;

    const lang = (langOverride as any) || this.detectLanguage(clean);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang;
    utterance.rate = 0.95; // Slightly measured pace for clear academic learning
    utterance.pitch = 1.0;

    const voice = this.pickVoice(lang);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.currentId = id;
      this.notify();
    };

    utterance.onpause = () => {
      this.isPaused = true;
      this.notify();
    };

    utterance.onresume = () => {
      this.isPaused = false;
      this.notify();
    };

    utterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this.currentId = null;
      this.notify();
    };

    utterance.onerror = (e) => {
      // Ignore user cancellation errors
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('[TTS] Speech error:', e.error);
      }
      this.isPlaying = false;
      this.isPaused = false;
      this.currentId = null;
      this.notify();
    };

    this.currentUtterance = utterance;
    this.currentId = id;
    this.synth.speak(utterance);
  }

  public pause() {
    if (this.synth && this.isPlaying && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
      this.notify();
    }
  }

  public resume() {
    if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.notify();
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isPlaying = false;
      this.isPaused = false;
      this.currentId = null;
      this.notify();
    }
  }
}

export const ttsService = new TTSService();
