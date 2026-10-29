import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, History, Settings, HelpCircle, Activity, Sparkles, Mic, Hand, Download, Calendar, Palette } from 'lucide-react';
import { CountingMode } from '../types';
import { ZenTheme } from '../data/themes';

interface HeaderProps {
  mode: CountingMode;
  onModeChange: (mode: CountingMode) => void;
  streak: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenAudioLab: () => void;
  onOpenIOSGuide: () => void;
  onOpenCalendar: () => void;
  onOpenThemeSelector: () => void;
  theme?: ZenTheme;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  streak,
  soundEnabled,
  onToggleSound,
  onOpenHistory,
  onOpenSettings,
  onOpenAudioLab,
  onOpenIOSGuide,
  onOpenCalendar,
  onOpenThemeSelector,
  theme
}) => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      onOpenIOSGuide();
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
  };

  return (
    <header className={`sticky top-0 z-30 ${theme ? theme.headerBg : 'bg-[#071716]/95 border-[#dfb15b]/15'} backdrop-blur-md border-b px-2 sm:px-4 pt-safe pb-2 sm:py-2.5 transition-colors duration-300 w-full max-w-full overflow-hidden box-border`}>
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-1 sm:gap-2 w-full">
        {/* Left: Logo & App Title */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#dfb15b]/25 to-[#0e3532] border border-[#dfb15b]/40 flex items-center justify-center shadow-md shadow-[#dfb15b]/10 shrink-0">
            <svg className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-[#dfb15b]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C12 2 8 8 8 13C8 15.21 9.79 17 12 17C14.21 17 16 15.21 16 13C16 8 12 2 12 2ZM12 15C10.9 15 10 14.1 10 13C10 10.3 12 5.5 12 5.5C12 5.5 14 10.3 14 13C14 14.1 13.1 15 12 15ZM6.5 12.5C5.1 13.5 4 15.1 4 17C4 19.8 6.2 22 9 22C10.9 22 12.5 20.9 13.5 19.5C11.5 19.3 9.7 18.1 8.8 16.3C8.1 15 8.1 13.6 8.5 12.5H6.5ZM17.5 12.5C17.9 13.6 17.9 15 17.2 16.3C16.3 18.1 14.5 19.3 12.5 19.5C13.5 20.9 15.1 22 17 22C19.8 22 22 19.8 22 17C22 15.1 20.9 13.5 19.5 12.5H17.5Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h1 className="font-serif-sacred text-xs xs:text-sm sm:text-lg font-bold tracking-widest text-[#faeed1] truncate">
                TU DƯỠNG
              </h1>
              {streak > 0 && (
                <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#dfb15b]/15 text-[#dfb15b] border border-[#dfb15b]/30 shrink-0 font-sans-viet">
                  <Sparkles className="w-2.5 h-2.5 text-[#dfb15b]" />
                  {streak} ngày
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#9fb8b5] leading-tight hidden lg:block truncate font-sans-viet mt-0.5">
              Niệm Phật Tự Động Bằng Giọng Nói AI
            </p>
          </div>
        </div>

        {/* Center: Mode Switcher (Micro vs Chạm) */}
        <div className="flex items-center bg-[#0b2423] p-0.5 rounded-full border border-[#dfb15b]/20 shrink-0">
          <button
            onClick={() => onModeChange('voice')}
            className={`flex items-center gap-1 px-1.5 xs:px-2.5 py-1 rounded-full text-[10px] xs:text-[11px] sm:text-xs font-medium transition-all ${
              mode === 'voice'
                ? 'bg-gradient-to-r from-[#dfb15b] to-[#b3883b] text-[#071716] font-bold shadow-sm shadow-[#dfb15b]/20'
                : 'text-[#a2beba] hover:text-[#faeed1]'
            }`}
            title="Tự động nhận diện câu niệm bằng Micro"
          >
            <Mic className="w-3 h-3 shrink-0" />
            <span className="hidden xs:inline">Micro</span>
          </button>
          <button
            onClick={() => onModeChange('manual')}
            className={`flex items-center gap-1 px-1.5 xs:px-2.5 py-1 rounded-full text-[10px] xs:text-[11px] sm:text-xs font-medium transition-all ${
              mode === 'manual'
                ? 'bg-gradient-to-r from-[#dfb15b] to-[#b3883b] text-[#071716] font-bold shadow-sm shadow-[#dfb15b]/20'
                : 'text-[#a2beba] hover:text-[#faeed1]'
            }`}
            title="Chạm màn hình để đếm chuỗi hoặc gõ mõ thủ công"
          >
            <Hand className="w-3 h-3 shrink-0" />
            <span className="hidden xs:inline">Chạm</span>
          </button>
        </div>

        {/* Right: Action Buttons - Guaranteed zero overflow on iPhone / iPad */}
        <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 shrink-0">
          {/* Theme / Serene Background Selector */}
          <button
            onClick={onOpenThemeSelector}
            className="h-7 px-1.5 xs:px-2 sm:h-8 sm:px-2 flex items-center gap-1 rounded-lg sm:rounded-xl text-[#faeed1] bg-[#dfb15b]/15 hover:bg-[#dfb15b]/30 border border-[#dfb15b]/35 transition-all shrink-0 shadow-sm"
            title="Không gian thanh tịnh (Đổi chế độ nền Ommani)"
          >
            <Palette className="w-3.5 h-3.5 text-[#dfb15b] shrink-0" />
            <span className="text-[10px] xs:text-[11px] font-bold text-[#dfb15b] hidden xs:inline">Nền</span>
          </button>

          {/* Ommani Buddhist Calendar Button */}
          <button
            onClick={onOpenCalendar}
            className="h-7 px-1.5 xs:px-2 sm:h-8 sm:px-2 flex items-center gap-1 rounded-lg sm:rounded-xl text-[#faeed1] bg-[#dfb15b]/20 hover:bg-[#dfb15b]/35 border border-[#dfb15b]/40 transition-all shrink-0 shadow-sm"
            title="Lịch Phật Giáo & Tu Tập (Ommani)"
          >
            <Calendar className="w-3.5 h-3.5 text-[#dfb15b] shrink-0" />
            <span className="text-[10px] xs:text-[11px] font-bold text-[#dfb15b] hidden xs:inline">Lịch</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded-xl transition-all shrink-0 ${
              soundEnabled
                ? 'text-[#dfb15b] bg-[#dfb15b]/10 hover:bg-[#dfb15b]/20'
                : 'text-[#688582] hover:text-[#a2beba]'
            }`}
            title={soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Audio Lab / Diagnostics */}
          <button
            onClick={onOpenAudioLab}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded-xl text-[#a2beba] hover:text-[#dfb15b] hover:bg-[#dfb15b]/10 transition-all shrink-0"
            title="Kiểm tra âm thanh & Micro"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>

          {/* History */}
          <button
            onClick={onOpenHistory}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded-xl text-[#a2beba] hover:text-[#dfb15b] hover:bg-[#dfb15b]/10 transition-all shrink-0"
            title="Lịch sử tu tập & Thống kê"
          >
            <History className="w-3.5 h-3.5" />
          </button>

          {/* Settings Button - High prominence */}
          <button
            onClick={onOpenSettings}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded-xl text-[#faeed1] bg-[#dfb15b]/15 hover:bg-[#dfb15b]/30 border border-[#dfb15b]/35 transition-all shrink-0 shadow-sm"
            title="Cài đặt ứng dụng"
          >
            <Settings className="w-3.5 h-3.5 text-[#dfb15b]" />
          </button>

          {/* Help / iOS Guide (hidden on small phone screens, shown on tablet/desktop) */}
          <button
            onClick={onOpenIOSGuide}
            className="w-7 h-7 sm:w-8 sm:h-8 hidden md:flex items-center justify-center rounded-lg sm:rounded-xl text-[#a2beba] hover:text-[#dfb15b] hover:bg-[#dfb15b]/10 transition-all shrink-0"
            title="Hướng dẫn sử dụng & Cài đặt iPhone"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* Install PWA Button if available */}
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="hidden sm:flex items-center gap-1 text-[11px] bg-[#dfb15b]/20 hover:bg-[#dfb15b]/30 text-[#dfb15b] px-2 py-1 rounded-lg border border-[#dfb15b]/40 font-medium transition-all shrink-0"
              title="Cài đặt Tu Dưỡng vào màn hình chính"
            >
              <Download className="w-3 h-3" />
              <span>Cài App</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
