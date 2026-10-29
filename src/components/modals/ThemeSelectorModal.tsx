import React, { useState } from 'react';
import { X, Check, Sparkles, Image as ImageIcon, Sliders, Palette, Eye } from 'lucide-react';
import { BackgroundThemeId, BuddhistArtId } from '../../types';
import { ZEN_THEMES, ZenTheme } from '../../data/themes';
import { BUDDHIST_ARTWORKS, BuddhistArtItem, resolveActiveArt } from '../../data/buddhistArt';

interface ThemeSelectorModalProps {
  currentThemeId: BackgroundThemeId;
  onSelectTheme: (id: BackgroundThemeId) => void;
  currentArtId?: BuddhistArtId;
  onSelectArt?: (id: BuddhistArtId) => void;
  artOpacity?: number;
  onChangeArtOpacity?: (opacity: number) => void;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  currentThemeId,
  onSelectTheme,
  currentArtId = 'auto',
  onSelectArt,
  artOpacity = 0.22,
  onChangeArtOpacity,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'art'>('themes');

  const activeArtItem = resolveActiveArt(currentThemeId, currentArtId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 xs:p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-[#091b1a] border border-[#dfb15b]/35 rounded-3xl p-3.5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col box-border">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#dfb15b]/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#dfb15b]/15 border border-[#dfb15b]/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#dfb15b]" />
            </div>
            <div>
              <h3 className="font-serif-sacred text-base sm:text-lg font-bold text-[#faeed1]">
                Không Gian Thanh Tịnh
              </h3>
              <p className="text-[11px] sm:text-xs text-[#9fb8b5] font-sans-viet">
                Tùy chỉnh sắc thái nền và họa tác Phật Giáo trang nghiêm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9fb8b5] hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Themes vs Buddhist Art */}
        <div className="flex items-center gap-2 pt-3 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('themes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'themes'
                ? 'bg-[#dfb15b] text-[#071716] shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-[#faeed1]/80 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Sắc Thái Thiền (8)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('art')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'art'
                ? 'bg-[#dfb15b] text-[#071716] shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-[#faeed1]/80 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="flex items-center gap-1.5">
              <span>Tranh Phật Giáo</span>
              {currentArtId !== 'none' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#dfb15b]" />
              )}
            </span>
          </button>
        </div>

        {/* Tab 1: Themes Grid */}
        {activeTab === 'themes' && (
          <div className="flex-1 overflow-y-auto space-y-3 my-3 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {ZEN_THEMES.map((theme: ZenTheme) => {
                const isSelected = currentThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => onSelectTheme(theme.id)}
                    type="button"
                    className={`relative text-left p-3.5 rounded-2xl border transition-all duration-200 overflow-hidden group ${
                      isSelected
                        ? 'border-[#dfb15b] shadow-lg shadow-[#dfb15b]/15 ring-1 ring-[#dfb15b]/40'
                        : 'border-white/10 hover:border-white/25 bg-black/30'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${theme.previewPalette[0]} 0%, ${theme.previewPalette[1]} 65%, ${theme.previewPalette[0]} 100%)`
                    }}
                  >
                    {/* Subtle top aura spot inside card */}
                    <div
                      className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-40 pointer-events-none"
                      style={{ background: theme.previewPalette[2] }}
                    />

                    {/* Header Row: Swatch & Name */}
                    <div className="relative z-10 flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {/* Tri-color palette pill */}
                        <div className="flex items-center -space-x-1 p-0.5 rounded-full bg-black/40 border border-white/15">
                          {theme.previewPalette.map((color, idx) => (
                            <span
                              key={idx}
                              className="w-3.5 h-3.5 rounded-full shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>

                        <h4 className="font-serif-sacred text-sm sm:text-base font-bold text-[#fcfaf2]">
                          {theme.name}
                        </h4>
                      </div>

                      {/* Active Checkmark */}
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-[#dfb15b] text-[#071716] flex items-center justify-center shrink-0 shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border border-white/20 group-hover:border-white/40 shrink-0" />
                      )}
                    </div>

                    {/* Subtitle */}
                    <div className="relative z-10 text-[11px] font-medium text-[#dfb15b] tracking-wide mb-1 font-sans-viet">
                      {theme.subtitle}
                    </div>

                    {/* Zen Quote */}
                    <p className="relative z-10 text-[11px] text-[#cbd5e1]/80 italic line-clamp-2 leading-relaxed font-serif-body">
                      "{theme.zenQuote}"
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Buddhist Art Gallery */}
        {activeTab === 'art' && (
          <div className="flex-1 overflow-y-auto space-y-4 my-3 pr-1">
            {/* Opacity Control Bar */}
            {currentArtId !== 'none' && onChangeArtOpacity && (
              <div className="p-3.5 rounded-2xl bg-black/50 border border-[#dfb15b]/25 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#faeed1] font-semibold flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#dfb15b]" />
                    <span>Độ rõ nét tranh Phật</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#9fb8b5]">Mức hiển thị:</span>
                    <span className="text-[#dfb15b] font-mono font-bold text-xs bg-[#dfb15b]/15 px-2 py-0.5 rounded-md border border-[#dfb15b]/30">
                      {Math.round(artOpacity * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.10"
                    max="0.85"
                    step="0.05"
                    value={artOpacity}
                    onChange={(e) => onChangeArtOpacity(parseFloat(e.target.value))}
                    className="flex-1 accent-[#dfb15b] cursor-pointer h-2 bg-white/10 rounded-lg"
                  />
                </div>

                {/* Quick Clarity Presets */}
                <div className="grid grid-cols-4 gap-1.5 pt-1 text-[11px] font-sans-viet">
                  <button
                    type="button"
                    onClick={() => onChangeArtOpacity(0.20)}
                    className={`py-1 px-1.5 rounded-lg border text-center transition ${
                      Math.abs(artOpacity - 0.20) < 0.05
                        ? 'border-[#dfb15b] bg-[#dfb15b]/20 text-[#dfb15b] font-semibold'
                        : 'border-white/10 text-[#9fb8b5] hover:text-[#faeed1] hover:border-white/20'
                    }`}
                  >
                    Dịu nhẹ (20%)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeArtOpacity(0.40)}
                    className={`py-1 px-1.5 rounded-lg border text-center transition ${
                      Math.abs(artOpacity - 0.40) < 0.05
                        ? 'border-[#dfb15b] bg-[#dfb15b]/20 text-[#dfb15b] font-semibold'
                        : 'border-white/10 text-[#9fb8b5] hover:text-[#faeed1] hover:border-white/20'
                    }`}
                  >
                    Cân đối (40%)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeArtOpacity(0.65)}
                    className={`py-1 px-1.5 rounded-lg border text-center transition ${
                      Math.abs(artOpacity - 0.65) < 0.05
                        ? 'border-[#dfb15b] bg-[#dfb15b]/20 text-[#dfb15b] font-semibold'
                        : 'border-white/10 text-[#9fb8b5] hover:text-[#faeed1] hover:border-white/20'
                    }`}
                  >
                    Rõ nét (65%)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeArtOpacity(0.85)}
                    className={`py-1 px-1.5 rounded-lg border text-center transition ${
                      Math.abs(artOpacity - 0.85) < 0.05
                        ? 'border-[#dfb15b] bg-[#dfb15b]/20 text-[#dfb15b] font-semibold'
                        : 'border-white/10 text-[#9fb8b5] hover:text-[#faeed1] hover:border-white/20'
                    }`}
                  >
                    Rất rõ (85%)
                  </button>
                </div>
              </div>
            )}

            {/* Artworks List */}
            <div className="space-y-2.5">
              {BUDDHIST_ARTWORKS.map((art: BuddhistArtItem) => {
                const isSelected = currentArtId === art.id;
                return (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => onSelectArt?.(art.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 flex items-center gap-3 relative overflow-hidden group ${
                      isSelected
                        ? 'border-[#dfb15b] bg-[#dfb15b]/10 ring-1 ring-[#dfb15b]/40 shadow-lg'
                        : 'border-white/10 hover:border-white/25 bg-black/30'
                    }`}
                  >
                    {/* Thumbnail preview */}
                    {art.imageUrl ? (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-[#dfb15b]/30 relative bg-black/60 shadow-inner">
                        <img
                          src={art.imageUrl}
                          alt={art.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shrink-0 border border-white/10 bg-white/5 flex flex-col items-center justify-center text-[#9fb8b5] p-2 text-center">
                        {art.id === 'auto' ? (
                          <>
                            <Sparkles className="w-5 h-5 text-[#dfb15b] mb-1" />
                            <span className="text-[10px] font-sans-viet">Tự động</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-5 h-5 text-gray-400 mb-1" />
                            <span className="text-[10px] font-sans-viet">Thuần sắc</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-serif-sacred text-sm sm:text-base font-bold text-[#faeed1] truncate">
                          {art.name}
                        </h4>
                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-[#dfb15b] text-[#071716] flex items-center justify-center shrink-0 shadow-md">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-white/20 group-hover:border-white/40 shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] font-medium text-[#dfb15b] mb-1 font-sans-viet">
                        {art.subname}
                      </p>

                      <p className="text-[11px] text-[#cbd5e1]/80 line-clamp-2 leading-relaxed font-sans-viet">
                        {art.description}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {art.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#9fb8b5]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Quote */}
        <div className="pt-3 border-t border-[#dfb15b]/15 flex items-center justify-between text-xs text-[#9fb8b5]">
          <span className="italic font-serif-body text-[11px] text-[#dfb15b]/90 hidden sm:inline">
            "Tùy kỳ tâm tịnh, tắc Phật độ tịnh" — Kinh Duy Ma Cật
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-[#dfb15b] hover:bg-[#caa04b] text-[#071716] font-bold text-xs px-6 py-2.5 rounded-xl transition shadow"
          >
            Hoàn Tất
          </button>
        </div>
      </div>
    </div>
  );
};
