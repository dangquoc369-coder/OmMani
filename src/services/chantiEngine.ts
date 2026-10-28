/**
 * Tu Dưỡng Chanting Recognition Engine
 * Combines Web Speech API, phonetic fuzzy sliding-window tokenizer,
 * and Web Audio API Voice Activity Detection (VAD).
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
    .replace(/[^a-z0-9\s]/g, ' ')  // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate phonetic matcher profiles for a chant
export interface ChantMatcher {
  id: string;
  primaryKeywords: string[];     // Normalized core keywords (e.g. ["di", "da", "phat"])
  supportingKeywords: string[];  // e.g. ["nam", "mo"]
  minRequiredCoreMatches: number;
}

export function buildChantMatcher(chant: ChantItem): ChantMatcher {
  const normTitle = normalizeVietnamese(chant.title);
  const normShort = normalizeVietnamese(chant.shortTitle);
  const words = normShort.split(' ').filter(Boolean);

  // Core signature words (excluding common "nam", "mo", "bo", "tat", "phat" where needed)
  let core = words;
  if (words.length > 2) {
    core = words.filter(w => w !== 'nam' && w !== 'mo');
  }

  // Pre-configured optimized signatures for standard chants
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
      minRequiredCoreMatches: 2 // 'di da' or 'da phat' or 'di da phat'
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

  // Generic custom chant matcher
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

  // Stream parsing & deduplication
  private lastCountTimestamp = 0;
  private isResetting = false;
  private recentVoiceEnergyAverage = 0;
  private consecutiveIgnoredSpeechCount = 0;

  // iOS Keepalive watchdog
  private restartTimeout: any = null;
  private lastSpeechResultTimestamp = 0;

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
    this.settings = settings;
  }

  /**
   * Check browser speech recognition capabilities
   */
  public static checkCompatibility(): { isSupported: boolean; isIOS: boolean; isSafari: boolean } {
    if (typeof window === 'undefined') {
      return { isSupported: false, isIOS: false, isSafari: false };
    }
    const hasSpeech = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isSafari = isIOS || (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android'));

    return {
      isSupported: hasSpeech,
      isIOS,
      isSafari
    };
  }

  /**
   * Start microphone audio listening and speech recognition
   */
  public async start(): Promise<boolean> {
    if (this.isListening) return true;

    const compat = ChantingEngine.checkCompatibility();
    if (!compat.isSupported) {
      this.callbacks.onStatusChange('unsupported', 'Trình duyệt không hỗ trợ nhận diện giọng nói Web Speech. Vui lòng chuyển sang Chế độ Chạm Đếm Thủ Công.');
      return false;
    }

    try {
      // 1. Initialize Web Audio API for VAD (Voice Activity Detection)
      await this.initWebAudio();

      // 2. Initialize Web Speech API
      this.initSpeechRecognition();

      this.isListening = true;
      this.callbacks.onStatusChange('listening', 'Micro đang lắng nghe... Hãy bắt đầu niệm thanh tịnh.');
      return true;
    } catch (err: any) {
      console.error('Failed to start chanting engine:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.callbacks.onStatusChange('permission_denied', 'Bạn chưa cấp quyền Microphone. Vui lòng mở Cài đặt trình duyệt để cho phép.');
      } else {
        this.callbacks.onError('Không thể kết nối Micro: ' + (err.message || 'Lỗi thiết bị'));
      }
      return false;
    }
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
   * Setup Web Audio API with AnalyserNode for VAD energy gating & VU meter
   */
  private async initWebAudio(): Promise<void> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!this.audioContext) {
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (!this.mediaStream) {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    }

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.4;
    source.connect(this.analyser);

    this.startAudioLoop();
  }

  /**
   * Continuously analyze microphone volume level and RMS energy
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
      // Convert to normalized 0 - 100 scale
      const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));

      this.recentVoiceEnergyAverage = normalizedLevel;
      this.callbacks.onAudioLevel(normalizedLevel);

      this.animFrameId = requestAnimationFrame(updateMeter);
    };

    updateMeter();
  }

  private stopAudioAnalysis(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.callbacks.onAudioLevel(0);
  }

  /**
   * Initialize Web Speech API instance with Vietnamese language and streaming settings
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
      this.lastSpeechResultTimestamp = Date.now();
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

      // Check if user has completed 1 chant in this discrete cycle
      if (this.checkIsCompleteChant(tokens)) {
        this.handleChantSuccessAndReset();
      }
    };

    this.recognition.onerror = (event: any) => {
      const error = event.error;
      if (error === 'no-speech') return;
      if (error === 'not-allowed') {
        this.isListening = false;
        this.callbacks.onStatusChange('permission_denied', 'Quyền truy cập micro đã bị từ chối');
        return;
      }
      console.warn('Speech recognition warning:', error);
    };

    this.recognition.onend = () => {
      // Automatically restart if ended naturally and not in the middle of a reset
      if (this.isListening && !this.isResetting) {
        this.scheduleRestart(80);
      }
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition start exception:', e);
    }
  }

  private scheduleRestart(delayMs = 150): void {
    this.clearWatchdog();
    this.restartTimeout = setTimeout(() => {
      if (this.isListening) {
        try {
          this.recognition?.start();
        } catch {
          // Restart afresh if needed
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

  /**
   * Refractory duration based on user pace setting:
   * fast: 900ms, normal: 1400ms, slow: 2200ms
   */
  private getRefractoryMs(): number {
    switch (this.settings.chantPace) {
      case 'fast':
        return 900;
      case 'slow':
        return 2200;
      case 'normal':
      default:
        return 1400;
    }
  }

  /**
   * Minimum voice energy threshold required to validate voice activity
   */
  private getEnergyThreshold(): number {
    switch (this.settings.voiceSensitivity) {
      case 'high':
        return 3;   // sensitive (good for quiet whispers)
      case 'low':
        return 15;  // stricter (good for noisy rooms)
      case 'normal':
      default:
        return 6;
    }
  }

  /**
   * Trigger count increment and acoustic/haptic feedback
   */
  /**
   * Handle complete chant detection:
   * 1. Increments count by exactly 1
   * 2. Triggers sound & haptic feedback
   * 3. Aborts and resets the current recognition instance completely
   * 4. Clears transcript and restarts a fresh session with an empty buffer
   * This completely prevents double-counting and phantom cumulative matches!
   */
  private handleChantSuccessAndReset(): void {
    if (this.isResetting) return;
    this.isResetting = true;

    // Increment count by EXACTLY 1
    this.currentCount += 1;
    this.lastCountTimestamp = Date.now();
    this.consecutiveIgnoredSpeechCount = 0;

    // Play audio feedback according to user preferences
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

    // Milestone trigger (108, 500, 1000)
    if (this.settings.milestoneAlerts) {
      if (this.currentCount % 108 === 0 || this.currentCount === 500 || this.currentCount === 1000) {
        sound.playMilestoneChime(this.settings.soundVolume);
        sound.triggerHaptic('milestone');
      }
    }

    this.callbacks.onCount(this.currentCount, this.currentChant.shortTitle);
    this.callbacks.onStatusChange('detected', `Đã ghi nhận: ${this.currentChant.shortTitle} (+1)`);

    // Abort and destroy current speech instance so no residual events can ever fire
    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }

    // Clear transcript for clean slate
    this.callbacks.onTranscript('', '');

    // Relaunch fresh recognition session for the next chant
    setTimeout(() => {
      this.isResetting = false;
      if (this.isListening) {
        this.initSpeechRecognition();
        this.callbacks.onStatusChange('listening', 'Micro đang lắng nghe tiếng niệm...');
      }
    }, 90);
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

    // Custom chant
    let coreMatches = 0;
    for (const kw of this.matcher.primaryKeywords) {
      if (set.has(kw) || joined.includes(kw)) {
        coreMatches++;
      }
    }
    return coreMatches >= this.matcher.minRequiredCoreMatches;
  }
}
