export type VoiceSource = 'landing' | 'preview';

export interface VoiceTranscript {
  text: string;
  isFinal: boolean;
}

type TranscriptCallback = (transcript: VoiceTranscript) => void;

class VoiceCore {
  private recognition: SpeechRecognition | null = null;
  private isListeningState: boolean = false;
  private currentSource: VoiceSource | null = null;
  private transcriptCallbacks: Set<TranscriptCallback> = new Set();
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Emit interim results
      if (interimTranscript) {
        this.emitTranscript({
          text: interimTranscript.trim(),
          isFinal: false,
        });
      }

      // Emit final results
      if (finalTranscript) {
        this.emitTranscript({
          text: finalTranscript.trim(),
          isFinal: true,
        });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.isListeningState = false;
    };

    this.recognition.onend = () => {
      this.isListeningState = false;
    };
  }

  private emitTranscript(transcript: VoiceTranscript): void {
    this.transcriptCallbacks.forEach((cb) => {
      try {
        cb(transcript);
      } catch (error) {
        console.error('Error in transcript callback:', error);
      }
    });
  }

  startListening(source: VoiceSource): void {
    if (!this.recognition) {
      console.warn('Speech recognition not available');
      return;
    }

    if (this.isListeningState) {
      this.stopListening();
    }

    this.currentSource = source;
    this.isListeningState = true;
    
    try {
      this.recognition.start();
    } catch (error) {
      // Already started, ignore
      console.warn('Recognition already started or error:', error);
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListeningState) {
      this.recognition.stop();
      this.isListeningState = false;
      this.currentSource = null;
    }
  }

  onTranscript(callback: TranscriptCallback): () => void {
    this.transcriptCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.transcriptCallbacks.delete(callback);
    };
  }

  speak(text: string): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('Speech synthesis not available');
      return;
    }

    // Cancel any existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);

    utterance.onend = () => {
      this.currentUtterance = null;
    };
  }

  isListening(): boolean {
    return this.isListeningState;
  }
}

// Export singleton instance
export const voiceCore = new VoiceCore();

