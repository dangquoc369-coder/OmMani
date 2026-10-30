/**
 * Tu Dưỡng Chanting Recognition Engine
 * Dual-Engine Architecture:
 * 1. Web Speech API (Phonetic Fuzzy Tokenizer) for desktop Chrome / Safari tab
 * 2. Web Audio API VAD (Voice Activity & Rhythm Detection) via getUserMedia
 *    for iPhone/iPad Safari + Home Screen PWAs, offline mode, or when Apple speech
 *    recognition is restricted.
 *
 * iOS / iPadOS FIXES in this version:
 * - isListening is set BEFORE initWebAudio(): previously the audio loop exited on its
 *   very first frame on iOS (isListening was still false), so VAD never ran.
 * - Level = RMS of the waveform (stable) instead of the average of 64-bin FFT.
 * - Adaptive noise floor + hysteresis, so room noise on iPad does not cause false counts
 *   and a slightly softer voice does not get cut into pieces.
 * - Audio nodes are tracked and disconnected on pause/stop (no leaks on resume).
 * - AudioContext 'suspended' / 'interrupted' is auto-resumed; returning from background
 *   (visibilitychange) re-acquires the mic if iOS killed the track.
 * - pause()/stop() detach speech handlers first, so abort() no longer triggers the
 *   'aborted' -> switch-to-VAD fallback by mistake.
 * - 'aborted' / 'network' fallback to VAD only on iOS (desktop behaviour unchanged).
 * - Web Audio meter is skipped while SpeechRecognition runs on iOS (they fight over the mic).
 * - Lenient sanity filter in VAD: ignores clearly too-long phrases and phrases whose length is
 *   very different from the user's own recent chants (tunable constants below).
 */

import { ChantItem, AppSettings } from '../types';
import { sound } from './soundFx';

export function normalizeVietnamese(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove tone marks
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ') // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ChantMatcher {
  id: string;
  primaryKeywords: string[];
  supportingKeywords: string[];
  minRequiredCoreMatches: number;
}

export function buildChantMatcher(chant: ChantItem): ChantMatcher {
  const normShort = normalizeVietnamese(chant.shortTitle);
  const words = normShort.split(' ').filter(Boolean);

  let core = words;
  if (words.length > 2) {
    core = words.filter(w => w !== 'nam' && w !== 'mo');
  }

  if (chant.id === 'om-mani-padme-hum') {
    return {
      id: chant.id,
      primaryKeywords: ['om', 'mani', 'padme', 'hum', 'ma', 'ni', 'bat', 'me', 'hong'],
      supportingKeywords: ['an', 'om', 'mani', 'padme', 'hum', 'ma', 'ni', 'bat', 'me', 'hong'],
      minRequiredCoreMatches: 2
    };
  }

  if (chant.id === 'a-di-da-phat') {
    return {
      id: chant.id,
      primaryKeywords: ['di', 'da', 'phat'],
      supportingKeywords: ['nam', 'mo', 'a'],
      minRequiredCoreMatches: 2
    };
  }

  if (chant.id === 'quan-the-am' || chant.id === 'dai-bi-quan-am') {
    return {
      id: chant.id,
      primaryKeywords: ['quan', 'the', 'am'],
      supportingKeywords: ['nam', 'mo', 'bo', 'tat', 'dai', 'bi', 'quan', 'am'],
      minRequiredCoreMatches: 2
    };
  }

  if (chant.id === 'thich-ca-mau-ni') {
    return {
      id: chant.id,
      primaryKeywords: ['thich', 'ca', 'mau', 'ni'],
      supportingKeywords: ['bon', 'su', 'nam', 'mo', 'phat'],
      minRequiredCoreMatches: 2
    };
  }

  if (chant.id === 'duoc-su-phat') {
    return {
      id: chant.id,
      primaryKeywords: ['duoc', 'su'],
      supportingKeywords: ['luu', 'ly', 'quang', 'vuong', 'nam', 'mo', 'phat'],
      minRequiredCoreMatches: 2
    };
  }

  if (chant.id === 'dia-tang-vuong') {
    return {
      id: chant.id,
      primaryKeywords: ['dia', 'tang'],
      supportingKeywords: ['vuong', 'bo', 'tat', 'nam', 'mo'],
      minRequiredCoreMatches: 2
    };
  }

  return {
    id: chant.id,
    primaryKeywords: core.length > 0 ? core : words,
    supportingKeywords: words,
    minRequiredCoreMatches: Math.max(1, Math.min(2, core.length))
  };
}

export type EngineStatus =
  | 'idle'
  | 'listening'
  | 'detected'
  | 'paused'
  | 'unsupported'
  | 'permission_denied'
  | 'interrupted'
  | 'ambient_noise';

export interface EngineCallbacks {
  onCount: (newCount: number, matchedPhrase: string) => void;
  onStatusChange: (status: EngineStatus, message: string) => void;
  onAudioLevel: (level: number) => void;
  onTranscript: (interim: string, final: string) => void;
  onError: (errorMsg: string) => void;
  onActiveEngineChange?: (engine: 'speech' | 'vad_mic') => void;
}

// ---- VAD tuning constants (adjust here if counting is too strict / too loose) ----
const VAD_MIN_UTTERANCE_MS = 220; // shortest valid chant (filters coughs / clicks)
const VAD_SILENCE_BREATH_MS = 170; // pause that ends one chant
const VAD_RELEASE_RATIO = 0.7; // sound continues while level >= threshold * ratio (hysteresis)
const VAD_PROFILE_MIN_SAMPLES = 5; // learn the user's rhythm after N accepted chants
const VAD_PROFILE_LOW = 0.4; // accept >= 40% of the user's typical duration
const VAD_PROFILE_HIGH = 2.4; // accept <= 240% of the user's typical duration

export class ChantingEngine {
  private recognition: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private silentGain: GainNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private lastResumeAttempt = 0;

  private isListening = false;
  private currentChant: ChantItem;
  private matcher: ChantMatcher;
  private currentCount = 0;
  private settings: AppSettings;
  private callbacks: EngineCallbacks;

  // Active execution mode: 'speech' or 'vad_mic'
  private activeEngineType: 'speech' | 'vad_mic' = 'speech';

  // Deduplication & timing
  private lastCountTimestamp = 0;
  private isResetting = false;

  // VAD Voice Rhythm Tracking
  private vadSpeaking = false;
  private vadSpeechStartTime = 0;
  private vadLastSoundTime = 0;
  private vadSmoothed = 0;
  private vadNoiseFloor = 0;
  private vadProfile: number[] = []; // durations (ms) of recently accepted chants

  // Watchdog
  private restartTimeout: any = null;

  constructor(chant: ChantItem, initialCount: number, settings: AppSettings, callbacks: EngineCallbacks) {
    this.currentChant = chant;
    this.matcher = buildChantMatcher(chant);
    this.currentCount = initialCount;
    this.settings = settings;
    this.callbacks = callbacks;
  }

  public updateChant(chant: ChantItem): void {
    const changed = chant.id !== this.currentChant.id;
    this.currentChant = chant;
    this.matcher = buildChantMatcher(chant);
    this.isResetting = false;
    if (changed) {
      this.vadProfile = [];
      this.resetVadState();
    }
  }

  public updateCount(count: number): void {
    this.currentCount = count;
  }

  public updateSettings(settings: AppSettings): void {
    const prevMode = this.settings.voiceEngineMode;
    this.settings = settings;
    if (this.isListening && prevMode !== settings.voiceEngineMode) {
      this.pause();
      this.start();
    }
  }

  public getActiveEngineType(): 'speech' | 'vad_mic' {
    return this.activeEngineType;
  }

  /**
   * Comprehensive browser and platform compatibility detection
   */
  public static checkCompatibility(): {
    isSupported: boolean;
    isIOS: boolean;
    isSafari: boolean;
    isStandalone: boolean;
    hasGetUserMedia: boolean;
    hasSpeech: boolean;
  } {
    if (typeof window === 'undefined') {
      return { isSupported: false, isIOS: false, isSafari: false, isStandalone: false, hasGetUserMedia: false, hasSpeech: false };
    }
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = isIOS || (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android'));
    const isStandalone = (window.navigator as any).standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    const hasSpeech = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    return {
      isSupported: hasSpeech || hasGetUserMedia,
      isIOS,
      isSafari,
      isStandalone,
      hasGetUserMedia,
      hasSpeech
    };
  }

  /**
   * Start chanting engine
   */
  public async start(): Promise<boolean> {
    if (this.isListening) return true;

    // Create / resume AudioContext synchronously inside the user-gesture call stack (required by iOS)
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext && AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('AudioContext init note:', e);
    }

    const compat = ChantingEngine.checkCompatibility();
    if (!compat.isSupported) {
      this.callbacks.onStatusChange(
        'unsupported',
        'Trình duyệt không hỗ trợ Web Speech lẫn Micro. Vui lòng chuyển sang Chế độ Chạm Đếm.'
      );
      return false;
    }

    // Determine engine mode
    const requestedMode = this.settings.voiceEngineMode || 'auto';
    let shouldUseVad = false;

    if (requestedMode === 'vad_mic') {
      shouldUseVad = true;
    } else if (requestedMode === 'speech_text') {
      // Respect the user's choice (e.g. try real speech recognition in a Safari tab)
      shouldUseVad = !compat.hasSpeech;
    } else {
      // Auto mode: iOS / iPadOS / Home Screen PWA / no Speech API -> VAD via getUserMedia
      shouldUseVad = compat.isIOS || compat.isStandalone || !compat.hasSpeech;
    }

    document.addEventListener('visibilitychange', this.handleVisibility);

    try {
      if (shouldUseVad) {
        return await this.startVadEngine('Micro đang nhận diện nhịp niệm (Tối ưu iPhone/iPad)...');
      } else {
        return await this.startSpeechEngine();
      }
    } catch (err: any) {
      console.warn('Primary engine failed to start:', err);
      this.isListening = false;
      // Fallback to VAD if Speech failed
      if (!shouldUseVad && compat.hasGetUserMedia) {
        try {
          return await this.startVadEngine('Tự động chuyển sang Chế độ Micro Nhịp Niệm (Tương thích PWA)');
        } catch (vadErr: any) {
          this.isListening = false;
          return this.handleStartError(vadErr);
        }
      }
      return this.handleStartError(err);
    }
  }

  private handleStartError(err: any): boolean {
    console.error('Chanting engine start error:', err);
    if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
      this.callbacks.onStatusChange(
        'permission_denied',
        'Bạn chưa cấp quyền Microphone. Vào Cài đặt iPhone > Safari > Micrô để cho phép.'
      );
    } else {
      this.callbacks.onError('Không thể kết nối Micro: ' + ((err && err.message) || 'Lỗi thiết bị'));
    }
    return false;
  }

  /**
   * Start VAD Microphone Rhythm Counter (Web Audio API via getUserMedia)
   */
  private async startVadEngine(initialMessage?: string): Promise<boolean> {
    this.activeEngineType = 'vad_mic';
    this.callbacks.onActiveEngineChange?.('vad_mic');

    // IMPORTANT: must be true BEFORE initWebAudio(), because the audio loop checks it.
    this.isListening = true;
    this.resetVadState();

    try {
      await this.initWebAudio();
    } catch (e) {
      this.isListening = false;
      throw e;
    }

    this.callbacks.onStatusChange(
      'listening',
      initialMessage || 'Micro đang nhận diện nhịp niệm... Hãy bắt đầu niệm thanh tịnh.'
    );
    return true;
  }

  /**
   * Start Web Speech API Tokenizer
   */
  private async startSpeechEngine(): Promise<boolean> {
    this.activeEngineType = 'speech';
    this.callbacks.onActiveEngineChange?.('speech');

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      throw new Error('Speech recognition not available');
    }

    // Must be true BEFORE initWebAudio() so the VU meter loop runs
    this.isListening = true;

    // Web Audio meter. Skipped on iOS: getUserMedia + SpeechRecognition compete for the mic on WebKit.
    if (!ChantingEngine.checkCompatibility().isIOS) {
      try {
        await this.initWebAudio();
      } catch (e) {
        console.warn('WebAudio meter init note:', e);
      }
    }

    this.initSpeechRecognition();
    this.callbacks.onStatusChange('listening', 'Micro đang lắng nghe câu niệm tiếng Việt...');
    return true;
  }

  /**
   * Switch dynamically to VAD mode if Speech fails
   */
  private async switchToVadMode(): Promise<void> {
    if (this.activeEngineType === 'vad_mic') return;
    console.log('Switching to VAD microphone mode...');
    this.clearWatchdog();
    this.detachSpeech();
    try {
      await this.startVadEngine('Đã chuyển sang Chế độ Micro Nhịp Niệm (Tương thích iPhone)');
    } catch (e) {
      this.handleStartError(e);
    }
  }

  /**
   * Detach handlers BEFORE abort(), so abort() does not fire the 'aborted' fallback
   */
  private detachSpeech(): void {
    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onstart = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
  }

  /**
   * Pause listening
   */
  public pause(): void {
    this.isListening = false;
    this.clearWatchdog();
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.detachSpeech();
    this.stopAudioAnalysis();
    this.disconnectAudioGraph();
    this.callbacks.onStatusChange('paused', 'Đã tạm dừng phiên niệm');
  }

  /**
   * Stop completely and release hardware resources
   */
  public stop(): void {
    this.isListening = false;
    this.clearWatchdog();
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.detachSpeech();
    this.stopAudioAnalysis();
    this.disconnectAudioGraph();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => {
        t.onended = null;
        t.stop();
      });
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.callbacks.onStatusChange('idle', 'Sẵn sàng bắt đầu');
  }

  /**
   * iOS: when the app comes back from background / screen lock, the AudioContext is usually
   * suspended and the mic track may be dead. Recover automatically.
   */
  private handleVisibility = (): void => {
    if (document.visibilityState !== 'visible' || !this.isListening) return;

    const ctx = this.audioContext;
    if (ctx && (ctx.state as string) !== 'running' && ctx.state !== 'closed') {
      ctx.resume().catch(() => {});
    }

    if (this.activeEngineType === 'vad_mic') {
      const alive = !!this.mediaStream && this.mediaStream.getAudioTracks().some(t => t.readyState === 'live');
      if (!alive) {
        this.recoverMic();
      }
    }
  };

  private async recoverMic(): Promise<void> {
    this.stopAudioAnalysis();
    this.disconnectAudioGraph();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => {
        t.onended = null;
        t.stop();
      });
      this.mediaStream = null;
    }
    try {
      await this.initWebAudio();
      this.callbacks.onStatusChange('listening', 'Micro đã kết nối lại. Hãy tiếp tục niệm...');
    } catch (e) {
      this.callbacks.onStatusChange(
        'interrupted',
        'Micro bị gián đoạn. Hãy bấm Tạm dừng rồi Tiếp tục để kết nối lại.'
      );
    }
  }

  private resetVadState(): void {
    this.vadSpeaking = false;
    this.vadSpeechStartTime = 0;
    this.vadLastSoundTime = 0;
    this.vadSmoothed = 0;
  }

  /**
   * Disconnect analyser nodes so repeated pause/resume does not leak audio nodes
   */
  private disconnectAudioGraph(): void {
    try { this.sourceNode?.disconnect(); } catch {}
    try { this.analyser?.disconnect(); } catch {}
    try { this.silentGain?.disconnect(); } catch {}
    this.sourceNode = null;
    this.analyser = null;
    this.silentGain = null;
  }

  /**
   * Setup Web Audio API with AnalyserNode for VAD and real-time audio meter
   * Compatible with iPhone/iPad iOS Safari and standalone PWA
   */
  private async initWebAudio(): Promise<void> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

    if (this.audioContext && this.audioContext.state === 'closed') {
      this.audioContext = null;
    }
    if (!this.audioContext && AudioContextClass) {
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext && (this.audioContext.state as string) !== 'running') {
      try {
        await this.audioContext.resume();
      } catch {}
    }

    // Re-acquire the mic if the previous track ended (iOS interruptions, calls, Siri...)
    if (this.mediaStream) {
      const alive = this.mediaStream.getAudioTracks().some(t => t.readyState === 'live');
      if (!alive) {
        this.mediaStream.getTracks().forEach(t => t.stop());
        this.mediaStream = null;
      }
    }

    if (!this.mediaStream) {
      // Keep constraints minimal: iOS WebKit rejects some (e.g. autoGainControl) in certain versions
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      this.mediaStream.getAudioTracks().forEach(track => {
        track.onended = () => {
          if (this.isListening) {
            this.callbacks.onStatusChange(
              'interrupted',
              'Micro bị gián đoạn. Hãy bấm Tạm dừng rồi Tiếp tục để kết nối lại.'
            );
          }
        };
      });
    }

    if (this.audioContext) {
      this.disconnectAudioGraph();

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      this.sourceNode.connect(this.analyser);

      // Keep iOS WebKit audio thread processing active without feedback
      try {
        this.silentGain = this.audioContext.createGain();
        this.silentGain.gain.value = 0;
        this.analyser.connect(this.silentGain);
        this.silentGain.connect(this.audioContext.destination);
      } catch (e) {
        console.warn('Silent gain note:', e);
      }
    }

    this.startAudioLoop();
  }

  /**
   * Real-time audio loop for VU meter and VAD chant rhythm detection
   */
  private startAudioLoop(): void {
    if (!this.analyser) return;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const analyser = this.analyser;
    const timeData = new Uint8Array(analyser.fftSize);

    const tick = () => {
      // Stop if paused/stopped or the audio graph was replaced
      if (!this.isListening || this.analyser !== analyser) {
        this.animFrameId = null;
        return;
      }

      // iOS may suspend / interrupt the AudioContext (screen lock, calls, Siri...)
      const state = this.audioContext?.state as string | undefined;
      if (state === 'suspended' || state === 'interrupted') {
        const now = Date.now();
        if (now - this.lastResumeAttempt > 1000) {
          this.lastResumeAttempt = now;
          this.audioContext?.resume().catch(() => {});
        }
      }

      analyser.getByteTimeDomainData(timeData);

      // RMS of the waveform (0..1)
      let sumSq = 0;
      for (let i = 0; i < timeData.length; i++) {
        const v = (timeData[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / timeData.length);
      const level = Math.min(100, Math.round(rms * 400));

      this.callbacks.onAudioLevel(level);

      if (this.activeEngineType === 'vad_mic') {
        this.processVadAudioLevel(level);
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    tick();
  }

  /**
   * Lenient sanity check: a chant must be a plausible length, and (after a few samples)
   * similar in length to the user's own typical chant. Rejects long sentences / other phrases.
   */
  private validateVadUtterance(durationMs: number): boolean {
    const words = normalizeVietnamese(this.currentChant.shortTitle).split(' ').filter(Boolean).length;
    const maxMs = Math.max(4000, words * 1200 + 2000);
    if (durationMs > maxMs) return false;

    if (this.vadProfile.length >= VAD_PROFILE_MIN_SAMPLES) {
      const sorted = [...this.vadProfile].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      if (durationMs < median * VAD_PROFILE_LOW || durationMs > median * VAD_PROFILE_HIGH) return false;
    }
    return true;
  }

  /**
   * VAD Voice Activity & Rhythm Detection Logic:
   * Detects each chant phrase from vocal onset, sustained energy and a breathing pause,
   * with adaptive noise floor + hysteresis, without duplicate triggers.
   */
  private processVadAudioLevel(rawLevel: number): void {
    if (this.isResetting) return;

    const now = Date.now();
    const refractoryMs = this.getRefractoryMs();

    // Refractory cooldown (also blocks the app's own woodblock/bell leaking into the mic)
    if (now - this.lastCountTimestamp < refractoryMs) {
      return;
    }

    // Light smoothing against frame noise
    this.vadSmoothed = this.vadSmoothed * 0.5 + rawLevel * 0.5;
    const level = this.vadSmoothed;

    // Adaptive threshold: never below the user's sensitivity setting, rises in noisy rooms
    const baseThreshold = this.getVadThreshold();
    const startThreshold = Math.max(baseThreshold, this.vadNoiseFloor * 2.2 + 2);
    const keepThreshold = startThreshold * VAD_RELEASE_RATIO;

    const isSound = this.vadSpeaking ? level >= keepThreshold : level >= startThreshold;

    if (isSound) {
      this.vadLastSoundTime = now;
      if (!this.vadSpeaking) {
        this.vadSpeaking = true;
        this.vadSpeechStartTime = now;
        this.callbacks.onTranscript(`Đang niệm: ${this.currentChant.shortTitle}...`, '');
      }
      return;
    }

    // Silence: learn the room noise floor (slowly)
    if (!this.vadSpeaking) {
      this.vadNoiseFloor = this.vadNoiseFloor * 0.98 + level * 0.02;
      return;
    }

    const speechDuration = this.vadLastSoundTime - this.vadSpeechStartTime;
    const silenceDuration = now - this.vadLastSoundTime;

    if (silenceDuration >= VAD_SILENCE_BREATH_MS) {
      this.vadSpeaking = false;

      if (speechDuration < VAD_MIN_UTTERANCE_MS) {
        this.callbacks.onTranscript('', '');
        return; // cough / click
      }

      if (this.validateVadUtterance(speechDuration)) {
        this.vadProfile.push(speechDuration);
        if (this.vadProfile.length > 8) this.vadProfile.shift();
        this.handleChantSuccessAndReset();
      } else {
        this.callbacks.onTranscript('', '');
        this.callbacks.onStatusChange(
          'listening',
          `Nhịp niệm không khớp "${this.currentChant.shortTitle}" - chưa tính`
        );
      }
    }
  }

  private stopAudioAnalysis(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.callbacks.onAudioLevel(0);
  }

  /**
   * Initialize Web Speech API
   */
  private initSpeechRecognition(): void {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    this.detachSpeech();

    this.recognition = new SpeechRecognitionClass();
    this.recognition.lang = 'vi-VN';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.isResetting = false;
      if (this.isListening) {
        this.callbacks.onStatusChange('listening', 'Micro đang lắng nghe tiếng niệm...');
      }
    };

    this.recognition.onresult = (event: any) => {
      if (this.isResetting) return;
      let interim = '';
      let fullTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        fullTranscript += ' ' + transcript;
        if (!event.results[i].isFinal) {
          interim += ' ' + transcript;
        }
      }

      this.callbacks.onTranscript(interim.trim(), fullTranscript.trim());

      const norm = normalizeVietnamese(fullTranscript);
      const tokens = norm.split(' ').filter(Boolean);

      // Check if user completed 1 chant in this discrete cycle
      if (this.checkIsCompleteChant(tokens)) {
        this.handleChantSuccessAndReset();
      }
    };

    this.recognition.onerror = (event: any) => {
      const error = event.error;
      if (error === 'no-speech') return;

      const isIOS = ChantingEngine.checkCompatibility().isIOS;

      // Always fall back to VAD for permission/service problems.
      // 'aborted' and 'network' only on iOS (WebKit/PWA), so desktop behaviour stays as before.
      if (
        error === 'not-allowed' ||
        error === 'service-not-allowed' ||
        error === 'audio-capture' ||
        (isIOS && (error === 'aborted' || error === 'network'))
      ) {
        console.warn('SpeechRecognition error (' + error + '), switching to VAD engine...');
        this.switchToVadMode();
        return;
      }
      console.warn('Speech recognition warning:', error);
    };

    this.recognition.onend = () => {
      if (this.isListening && !this.isResetting && this.activeEngineType === 'speech') {
        this.scheduleRestart(90);
      }
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition start exception, falling back to VAD:', e);
      this.switchToVadMode();
    }
  }

  private scheduleRestart(delayMs = 150): void {
    this.clearWatchdog();
    this.restartTimeout = setTimeout(() => {
      if (this.isListening && this.activeEngineType === 'speech') {
        try {
          this.recognition?.start();
        } catch {
          this.initSpeechRecognition();
        }
      }
    }, delayMs);
  }

  private clearWatchdog(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
  }

  private getRefractoryMs(): number {
    switch (this.settings.chantPace) {
      case 'fast':
        return 750;
      case 'slow':
        return 1800;
      case 'normal':
      default:
        return 1150;
    }
  }

  /**
   * Thresholds for the RMS-based level (0..100).
   */
  private getVadThreshold(): number {
    switch (this.settings.voiceSensitivity) {
      case 'high':
        return 8;
      case 'low':
        return 22;
      case 'normal':
      default:
        return 14;
    }
  }

  /**
   * Handle complete chant detection:
   * Increments count by 1, plays sounds/haptics, resets buffer cleanly.
   */
  private handleChantSuccessAndReset(): void {
    if (this.isResetting) return;
    this.isResetting = true;

    this.currentCount += 1;
    this.lastCountTimestamp = Date.now();

    // Play audio feedback
    if (this.settings.soundEnabled) {
      if (this.settings.soundType === 'woodblock' || this.settings.soundType === 'both') {
        sound.playWoodblock(this.settings.soundVolume);
      }
      if (this.settings.soundType === 'bell' || this.settings.soundType === 'both') {
        sound.playTempleBell(this.settings.soundVolume * 0.7);
      }
    }

    // Haptic vibration
    if (this.settings.vibrationEnabled) {
      sound.triggerHaptic('tap');
    }

    // Milestone trigger
    if (this.settings.milestoneAlerts) {
      if (this.currentCount % 108 === 0 || this.currentCount === 500 || this.currentCount === 1000) {
        sound.playMilestoneChime(this.settings.soundVolume);
        sound.triggerHaptic('milestone');
      }
    }

    this.callbacks.onCount(this.currentCount, this.currentChant.shortTitle);
    this.callbacks.onStatusChange('detected', `Đã ghi nhận: ${this.currentChant.shortTitle} (+1)`);

    // Reset speech recognition if in speech mode (handlers detached first)
    if (this.activeEngineType === 'speech') {
      this.detachSpeech();
    }

    this.callbacks.onTranscript('', '');

    setTimeout(() => {
      this.isResetting = false;
      this.resetVadState();
      if (this.isListening) {
        if (this.activeEngineType === 'speech') {
          this.initSpeechRecognition();
        }
        this.callbacks.onStatusChange(
          'listening',
          this.activeEngineType === 'vad_mic'
            ? 'Micro đang nhận diện nhịp niệm...'
            : 'Micro đang lắng nghe tiếng niệm...'
        );
      }
    }, 100);
  }

  /**
   * Check if tokens contain a full complete chant
   */
  public checkIsCompleteChant(tokens: string[]): boolean {
    if (tokens.length < 2) return false;
    const chantId = this.matcher.id;
    const joined = tokens.join(' ');
    const set = new Set(tokens);

    if (chantId === 'a-di-da-phat') {
      const hasDiDa = set.has('di') || set.has('da') || joined.includes('di da') || joined.includes('adida');
      const hasPhat = set.has('phat') || joined.includes('phat');
      return hasDiDa && hasPhat;
    }

    if (chantId === 'om-mani-padme-hum') {
      const hasStart = set.has('mani') || set.has('ma') || set.has('om') || set.has('an') || joined.includes('mani') || joined.includes('ma ni');
      const hasEnd = set.has('hum') || set.has('hong') || set.has('padme') || set.has('bat') || set.has('me') || joined.includes('padme') || joined.includes('bat me');
      return hasStart && hasEnd;
    }

    if (chantId === 'quan-the-am' || chantId === 'dai-bi-quan-am') {
      const hasQuan = set.has('quan') || joined.includes('quan') || set.has('the');
      const hasEnd = set.has('am') || set.has('tat') || joined.includes('am') || joined.includes('bo tat');
      return hasQuan && hasEnd;
    }

    if (chantId === 'thich-ca-mau-ni') {
      const hasStart = set.has('thich') || set.has('ca') || joined.includes('thich ca');
      const hasEnd = set.has('ni') || set.has('phat') || set.has('mau') || joined.includes('mau ni') || joined.includes('phat');
      return hasStart && hasEnd;
    }

    if (chantId === 'duoc-su-phat') {
      const hasStart = set.has('duoc') || set.has('su') || joined.includes('duoc su');
      const hasEnd = set.has('phat') || set.has('vuong') || set.has('quang') || joined.includes('phat');
      return hasStart && hasEnd;
    }

    if (chantId === 'dia-tang-vuong') {
      const hasStart = set.has('dia') || set.has('tang') || joined.includes('dia tang');
      const hasEnd = set.has('vuong') || set.has('tat') || set.has('bo') || joined.includes('vuong') || joined.includes('bo tat');
      return hasStart && hasEnd;
    }

    let coreMatches = 0;
    for (const kw of this.matcher.primaryKeywords) {
      if (set.has(kw) || joined.includes(kw)) {
        coreMatches++;
      }
    }
    return coreMatches >= this.matcher.minRequiredCoreMatches;
  }
}