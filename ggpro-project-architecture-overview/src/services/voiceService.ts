import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export interface VoiceState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
}

export function useVoiceCommand() {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isSupported: typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    transcript: '',
    interimTranscript: '',
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const callbackRef = useRef<((text: string) => void) | null>(null);

  const createRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setState(prev => ({
        ...prev,
        transcript: final || prev.transcript,
        interimTranscript: interim,
      }));

      if (final && callbackRef.current) {
        callbackRef.current(final);
        callbackRef.current = null;
      }
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      setState(prev => ({
        ...prev,
        isListening: false,
        error: `Erro de voz: ${event.error}`,
      }));
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false, interimTranscript: '' }));
    };

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null, transcript: '', interimTranscript: '' }));
    };

    return recognition;
  }, []);

  const startListening = useCallback((onResult?: (text: string) => void) => {
    if (state.isListening) return;

    callbackRef.current = onResult || null;
    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // Already started
    }
  }, [state.isListening, createRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
  };
}
