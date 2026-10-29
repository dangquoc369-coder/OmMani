import React, { useMemo } from 'react';
import { BackgroundThemeId, BuddhistArtId } from '../types';
import { resolveActiveArt } from '../data/buddhistArt';
import { getZenTheme } from '../data/themes';

interface BuddhistBackgroundProps {
  themeId: BackgroundThemeId;
  artId?: BuddhistArtId;
  opacity?: number;       // 0.1 to 0.5
  enableBlur?: boolean;
}

export const BuddhistBackground: React.FC<BuddhistBackgroundProps> = ({
  themeId,
  artId = 'auto',
  opacity = 0.22,
  enableBlur = false
}) => {
  const activeArt = useMemo(() => resolveActiveArt(themeId, artId), [themeId, artId]);
  const currentTheme = useMemo(() => getZenTheme(themeId), [themeId]);

  if (!activeArt || !activeArt.imageUrl) {
    return null;
  }

// Clamped opacity between 0.10 and 0.90 (allows deep, clear sacred artwork)
  const safeOpacity = Math.min(Math.max(opacity, 0.10), 0.90);

  // Dynamic vignette strength: when user requests high clarity, keep vignette light
  const edgeVignetteAlpha = Math.max(0.15, 0.50 - safeOpacity * 0.25);
  const topVignetteAlpha = Math.max(0.35, 0.70 - safeOpacity * 0.20);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      {/* Background sacred artwork container */}
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out"
        style={{ opacity: safeOpacity }}
      >
        <img
          src={activeArt.imageUrl}
          alt={activeArt.name}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover object-center filter saturate-110 brightness-105 contrast-102 transition-all duration-500 ${
            enableBlur ? 'blur-[1.5px]' : ''
          }`}
          style={{
            transform: 'scale(1.02)' // Avoid edge bleed
          }}
        />

        {/* Very subtle theme tint for color harmony without darkening the sacred visage */}
        <div
          className="absolute inset-0 mix-blend-soft-light opacity-30 transition-colors duration-700 pointer-events-none"
          style={{
            backgroundColor: currentTheme.previewPalette[0]
          }}
        />
      </div>

      {/* Gentle radial vignette to preserve screen edge depth while keeping center artwork luminous */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent 45%, rgba(0, 0, 0, ${edgeVignetteAlpha * 0.6}) 80%, rgba(0, 0, 0, ${edgeVignetteAlpha}) 100%)`
        }}
      />

      {/* Top and Bottom gentle scrims for status bar & control buttons legibility */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: `linear-gradient(to bottom, rgba(0, 0, 0, ${topVignetteAlpha}) 0%, transparent 16%, transparent 84%, rgba(0, 0, 0, ${topVignetteAlpha * 0.9}) 100%)`
        }}
      />

      {/* Soft golden/ambient aura centered behind lotus counter */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${currentTheme.aura.from}55 0%, ${currentTheme.aura.via}25 50%, transparent 75%)`
        }}
      />
    </div>
  );
};
