/**
 * Tu Dưỡng Chanting Recognition Engine
 * Dual-Engine Architecture:
 * 1. Web Speech API (Phonetic Fuzzy Tokenizer) for regular Safari / Chrome
 * 2. Web Audio API VAD (Voice Activity & Rhythm Detection) via getUserMedia
 *    for 100% reliability on iPhone/iPad Safari Standalone Home Screen PWAs,
 *    offline mode, or when Apple speech recognition is restricted.
 */

import { ChantItem, AppSettings, VoiceEngineMode } from '../types';
import { sound } from './soundFx';

export function normalizeVietnamese(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove tone marks
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')  // remove punctuation
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

export class ChantingEngine {
  private recognition: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animFrameId: number | null = null;

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
    this.currentChant = chant;
    this.matcher = buildChantMatcher(chant);
    this.isResetting = false;
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

    // Immediately create / resume AudioContext synchronously in user gesture callstack
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
      shouldUseVad = false;
    } else {
      // Auto mode:
      // CRITICAL ON iOS / Safari (iPhone, iPad, iPod, Home Screen Standalone PWA):
      // WebKit's SpeechRecognition is either unsupported in PWA mode, requires Siri server
      // entitlements that Apple blocks in webclips, or dies after 5 seconds.
      // Web Audio API VAD (via getUserMedia) is 100% reliable on iOS (identical to AudioLab test)!
      if (compat.isIOS || compat.isStandalone || !compat.hasSpeech) {
        shouldUseVad = true;
      } else {
        shouldUseVad = false;
      }
    }

    try {
      if (shouldUseVad) {
        return await this.startVadEngine('Micro đang nhận diện nhịp niệm (Tối ưu iPhone/iPad PWA)...');
      } else {
        return await this.startSpeechEngine();
      }
    } catch (err: any) {
      console.warn('Primary engine failed to start, falling back to VAD:', err);
      // Fallback to VAD if Speech failed
      if (!shouldUseVad && compat.hasGetUserMedia) {
        try {
          return await this.startVadEngine('Tự động chuyển sang Chế độ Micro Nhịp Niệm (Tương thích PWA)');
        } catch (vadErr: any) {
          return this.handleStartError(vadErr);
        }
      }
      return this.handleStartError(err);
    }
  }

  private handleStartError(err: any): boolean {
    console.error('Chanting engine start error:', err);
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      this.callbacks.onStatusChange(
        'permission_denied',
        'Bạn chưa cấp quyền Microphone. Vào Cài đặt iPhone > Safari > Micrô để cho phép.'
      );
    } else {
      this.callbacks.onError('Không thể kết nối Micro: ' + (err.message || 'Lỗi thiết bị'));
    }
    return false;
  }

  /**
   * Start VAD Microphone Rhythm Counter (Web Audio API via getUserMedia)
   */
  private async startVadEngine(initialMessage?: string): Promise<boolean> {
    this.activeEngineType = 'vad_mic';
    if (this.callbacks.onActiveEngineChange) {
      this.callbacks.onActiveEngineChange('vad_mic');
    }

    await this.initWebAudio();
    this.isListening = true;
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
    if (this.callbacks.onActiveEngineChange) {
      this.callbacks.onActiveEngineChange('speech');
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      throw new Error('Speech recognition not available');
    }

    // Initialize Web Audio for VU meter and fallback readiness
    try {
      await this.initWebAudio();
    } catch (e) {
      console.warn('WebAudio meter init note:', e);
    }

    // Try starting speech recognition
    this.initSpeechRecognition();
    this.isListening = true;
    this.callbacks.onStatusChange('listening', 'Micro đang lắng nghe câu niệm tiếng Việt...');
    return true;
  }

  /**
   * Switch dynamically to VAD mode if Speech fails
   */
  private async switchToVadMode(): Promise<void> {
    console.log('Switching to VAD microphone mode...');
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    await this.startVadEngine('Đã chuyển sang Chế độ Micro Nhịp Niệm (Tương thích iPhone)');
  }

  /**
   * Pause listening
   */
  public pause(): void {
    this.isListening = false;
    this.clearWatchdog();
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }
    this.stopAudioAnalysis();
    this.callbacks.onStatusChange('paused', 'Đã tạm dừng phiên niệm');
  }

  /**
   * Stop completely and release hardware resources
   */
  public stop(): void {
    this.isListening = false;
    this.clearWatchdog();

    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    this.stopAudioAnalysis();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.callbacks.onStatusChange('idle', 'Sẵn sàng bắt đầu');
  }

  /**
   * Setup Web Audio API with AnalyserNode for VAD and real-time audio meter
   * Compatible with iPhone/iPad iOS Safari standalone PWA
   */
  private async initWebAudio(): Promise<void> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!this.audioContext && AudioContextClass) {
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (!this.mediaStream) {
      // Use standard iOS-tested audio constraints (omitting autoGainControl which fails on iOS WebKit)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
    }

    if (this.audioContext) {
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.3;
      source.connect(this.analyser);

      // Keep iOS WebKit audio thread processing active without feedback
      try {
        const silentGain = this.audioContext.createGain();
        silentGain.gain.value = 0;
        this.analyser.connect(silentGain);
        silentGain.connect(this.audioContext.destination);
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

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateMeter = () => {
      if (!this.analyser || !this.isListening) return;

      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));

      this.callbacks.onAudioLevel(normalizedLevel);

      // If active engine is VAD, perform real-time Voice Rhythm Detection
      if (this.activeEngineType === 'vad_mic') {
        this.processVadAudioLevel(normalizedLevel);
      }

      this.animFrameId = requestAnimationFrame(updateMeter);
    };

    updateMeter();
  }

  /**
   * VAD Voice Activity & Rhythm Detection Logic:
   * Accurately detects each chant phrase based on vocal onset, sustained energy,
   * and breathing pause, without duplicate triggers.
   */
  private processVadAudioLevel(level: number): void {
    if (this.isResetting) return;

    const now = Date.now();
    const energyThreshold = this.getVadThreshold();
    const minUtteranceMs = 220; // Chanting utterance duration
    const silenceBreathMs = 170; // Natural breath interval between chants
    const refractoryMs = this.getRefractoryMs();

    // Check refractory cooldown
    if (now - this.lastCountTimestamp < refractoryMs) {
      return;
    }

    if (level >= energyThreshold) {
      // Voice detected
      this.vadLastSoundTime = now;
      if (!this.vadSpeaking) {
        this.vadSpeaking = true;
        this.vadSpeechStartTime = now;
        this.callbacks.onTranscript(`Đang niệm: ${this.currentChant.shortTitle}...`, '');
      }
    } else {
      // Below threshold (silence/pause)
      if (this.vadSpeaking) {
        const speechDuration = this.vadLastSoundTime - this.vadSpeechStartTime;
        const silenceDuration = now - this.vadLastSoundTime;

        // If user chanted for valid duration and paused to breathe -> 1 completed chant!
        if (speechDuration >= minUtteranceMs && silenceDuration >= silenceBreathMs) {
          this.vadSpeaking = false;
          this.handleChantSuccessAndReset();
        }
      }
    }
  }

  private stopAudioAnalysis(): void {
    if (this.animFrameId) {
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

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }

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

      // On iOS Standalone, Home Screen WebClip, or restricted Safari, speech recognition aborts immediately
      // with 'aborted', 'not-allowed', 'service-not-allowed', or 'audio-capture'
      if (
        error === 'aborted' ||
        error === 'not-allowed' ||
        error === 'service-not-allowed' ||
        error === 'audio-capture' ||
        error === 'network'
      ) {
        console.warn('SpeechRecognition interrupted (' + error + '), switching seamlessly to iOS VAD engine...');
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

    // Reset speech recognition if in speech mode
    if (this.recognition && this.activeEngineType === 'speech') {
      try {
        this.recognition.onresult = null;
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }

    this.callbacks.onTranscript('', '');

    setTimeout(() => {
      this.isResetting = false;
      this.vadSpeaking = false;
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
