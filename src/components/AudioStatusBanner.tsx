import React from 'react';
import { Mic, MicOff, AlertCircle, CheckCircle2, ShieldAlert, Cpu, Sparkles, Sliders } from 'lucide-react';
import { EngineStatus } from '../services/chantiEngine';
import { CountingMode } from '../types';

interface AudioStatusBannerProps {
  mode: CountingMode;
  status: EngineStatus;
  statusMessage: string;
  interimTranscript: string;
  audioLevel: number;
  activeEngineType?: 'speech' | 'vad_mic';
  onRequestMicPermission: () => void;
  onOpenSettings?: () => void;
}

export const AudioStatusBanner: React.FC<AudioStatusBannerProps> = ({
  mode,
  status,
  statusMessage,
  interimTranscript,
  audioLevel,
  activeEngineType = 'speech',
  onRequestMicPermission,
  onOpenSettings
}) => {
  if (mode === 'manual') {
    return (
      <div className="w-full max-w-xl mx-auto px-3 sm:px-4 mt-2">
        <div className="bg-[#0b2423]/70 border border-[#dfb15b]/20 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-[#9eb9b6]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Chế độ đếm thủ công: Chạm vào vòng hoa sen mỗi lần niệm</span>
          </div>
          <span className="text-[11px] text-[#dfb15b]/80 shrink-0 font-medium">Mõ / Chuông</span>
        </div>
      </div>
    );
  }

  // Permission denied state
  if (status === 'permission_denied') {
    return (
      <div className="w-full max-w-xl mx-auto px-3 sm:px-4 mt-2">
        <div className="bg-red-950/80 border border-red-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-red-200 shadow-lg">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="font-semibold text-red-300">Microphone chưa được cấp quyền</p>
              <p className="text-[11px] text-red-300/80 leading-relaxed">
                Trên iPhone: Mở <strong>Cài đặt &gt; Safari &gt; Micrô</strong> và chọn <strong>Cho phép</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={onRequestMicPermission}
            className="shrink-0 bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition"
          >
            Cấp quyền
          </button>
        </div>
      </div>
    );
  }

  // Browser unsupported state
  if (status === 'unsupported') {
    return (
      <div className="w-full max-w-xl mx-auto px-3 sm:px-4 mt-2">
        <div className="bg-amber-950/70 border border-amber-500/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="font-semibold text-amber-300">Không tìm thấy Micro</p>
            <p className="text-[11px] text-amber-300/80">Bạn có thể dùng Chế độ Chạm Đếm bằng tay trên màn hình.</p>
          </div>
        </div>
      </div>
    );
  }

  const isDetected = status === 'detected';
  const isListening = status === 'listening';
  const isAmbientNoise = status === 'ambient_noise';
  const isVadMode = activeEngineType === 'vad_mic';

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 mt-2">
      <div
        className={`rounded-2xl px-3.5 py-2.5 border transition-all duration-300 ${
          isDetected
            ? 'bg-emerald-950/80 border-emerald-400/60 shadow-md shadow-emerald-500/20'
            : isAmbientNoise
            ? 'bg-amber-950/60 border-amber-500/30 text-amber-200'
            : isListening
            ? 'bg-[#092221] border-[#dfb15b]/30'
            : 'bg-[#071918] border-[#dfb15b]/15'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Status Message */}
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            {isDetected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
            ) : isListening ? (
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            ) : (
              <MicOff className="w-4 h-4 text-[#8ea8a5] shrink-0" />
            )}

            <span
              className={`text-xs font-medium truncate ${
                isDetected
                  ? 'text-emerald-300 font-bold'
                  : isAmbientNoise
                  ? 'text-amber-300'
                  : isListening
                  ? 'text-[#f0fdf4]'
                  : 'text-[#8ea8a5]'
              }`}
            >
              {statusMessage || 'Sẵn sàng lắng nghe'}
            </span>
          </div>

          {/* Engine Mode Badge & Settings Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            {isListening && (
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isVadMode
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-[#dfb15b]/15 text-[#dfb15b] border-[#dfb15b]/30'
                }`}
                title={
                  isVadMode
                    ? 'Chế độ Nhịp Niệm Micro: Tối ưu 100% cho Safari Màn hình chính iPhone/iPad'
                    : 'Chế độ Nhận diện từ ngữ tiếng Việt'
                }
              >
                {isVadMode ? <Cpu className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                <span className="hidden xs:inline">{isVadMode ? 'Micro VAD' : 'Từ Ngữ AI'}</span>
              </span>
            )}

            {/* Real-time Audio Level VU Meter */}
            {isListening && (
              <div className="flex items-center gap-1 shrink-0" title={`Cường độ âm thanh: ${audioLevel}%`}>
                <div className="flex items-end gap-0.5 h-3.5">
                  {[0.15, 0.35, 0.55, 0.75, 0.95].map((threshold, i) => {
                    const isActive = audioLevel / 100 >= threshold;
                    return (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-75 ${
                          isActive
                            ? i >= 3
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                            : 'bg-[#153e3b]'
                        }`}
                        style={{ height: `${(i + 1) * 20}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Transcript / VAD Visualizer Stream */}
        {isListening && (
          <div className="mt-1.5 pt-1.5 border-t border-[#dfb15b]/10 flex items-center justify-between text-[11px]">
            {isVadMode ? (
              <div className="flex items-center gap-1.5 text-amber-300/90 truncate">
                <span className="text-[#8ea8a5] italic shrink-0">Trạng thái:</span>
                <span className="truncate italic">
                  {audioLevel > 18
                    ? 'Đang nhận tiếng niệm...'
                    : 'Đang lắng nghe (thả hơi thở/ngừng để ghi nhận)'}
                </span>
              </div>
            ) : interimTranscript ? (
              <div className="flex items-center gap-1.5 text-[#dfb15b] truncate">
                <span className="text-[#8ea8a5] italic shrink-0">Đang nhận:</span>
                <span className="truncate italic">"{interimTranscript}"</span>
              </div>
            ) : (
              <div className="text-[#8ea8a5] italic text-[10px]">
                Niệm rõ ràng, chuông mõ sẽ tự điểm từng biến.
              </div>
            )}

            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-[10px] text-[#a2beba] hover:text-[#dfb15b] flex items-center gap-0.5 ml-2 shrink-0 underline"
              >
                <Sliders className="w-2.5 h-2.5" />
                <span>Tùy chỉnh</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
