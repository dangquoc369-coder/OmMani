import { BackgroundThemeId } from '../types';

export interface ZenTheme {
  id: BackgroundThemeId;
  name: string;
  subtitle: string;
  zenQuote: string;
  category: 'co-dien' | 'thien-tong' | 'thien-nhien' | 'tam-linh';
  previewPalette: [string, string, string]; // 3 representative swatches
  // Background wrapper styling
  bgClass: string;
  // Header background with opacity
  headerBg: string;
  // Ambient radial glow layer (Aura)
  aura: {
    from: string;
    via: string;
    to: string;
  };
  // Center Lotus Disc
  disc: {
    bg: string;
    border: string;
    activeRing: string;
    shadowGlow: string;
    lotusPetalStroke: string;
    beadFilled: string;
    beadUnfilled: string;
    beadGlow: string;
    countGradient: string;
  };
  // Accent & highlight colors
  accent: {
    gold: string;
    text: string;
    mutedText: string;
    cardBg: string;
    cardBorder: string;
  };
}

export const ZEN_THEMES: ZenTheme[] = [
  {
    id: 'tinh-do',
    name: 'Tịnh Độ Liên Hoa',
    subtitle: 'Ngọc Bích & Hoàng Kim',
    zenQuote: 'Hoa sen trong bùn chẳng nhiễm bụi trần, hương thơm tỏa khắp mười phương.',
    category: 'co-dien',
    previewPalette: ['#071716', '#0e3532', '#dfb15b'],
    bgClass: 'bg-[#071716]',
    headerBg: 'bg-[#071716]/95 border-[#dfb15b]/20',
    aura: {
      from: '#dfb15b',
      via: '#0e3532',
      to: 'transparent'
    },
    disc: {
      bg: 'bg-gradient-to-br from-[#0c2827] via-[#091e1d] to-[#061413]',
      border: 'border-[#dfb15b]/40',
      activeRing: 'active:ring-[#dfb15b]/40',
      shadowGlow: 'rgba(223, 177, 91, 0.35)',
      lotusPetalStroke: '#dfb15b',
      beadFilled: '#dfb15b',
      beadUnfilled: 'rgba(223, 177, 91, 0.22)',
      beadGlow: '#dfb15b',
      countGradient: 'from-[#ffffff] via-[#faeed1] to-[#dfb15b]'
    },
    accent: {
      gold: '#dfb15b',
      text: '#faeed1',
      mutedText: '#9fb8b5',
      cardBg: 'bg-[#0b2423]/90',
      cardBorder: 'border-[#dfb15b]/25'
    }
  },
  {
    id: 'thien-mac',
    name: 'Thiền Mặc Nho',
    subtitle: 'Mực Nho & Trầm Tịch',
    zenQuote: 'Tâm tịnh như nước phẳng lặng, không gợn sóng tơ hào muôn duyên dứt.',
    category: 'thien-tong',
    previewPalette: ['#0b0c0e', '#1e2229', '#cbd5e1'],
    bgClass: 'bg-[#090a0c]',
    headerBg: 'bg-[#090a0c]/95 border-[#94a3b8]/20',
    aura: {
      from: '#cbd5e1',
      via: '#1e293b',
      to: 'transparent'
    },
    disc: {
      bg: 'bg-gradient-to-br from-[#181a20] via-[#111317] to-[#090a0c]',
      border: 'border-[#94a3b8]/35',
      activeRing: 'active:ring-[#cbd5e1]/30',
      shadowGlow: 'rgba(203, 213, 225, 0.25)',
      lotusPetalStroke: '#cbd5e1',
      beadFilled: '#e2e8f0',
      beadUnfilled: 'rgba(148, 163, 184, 0.2)',
      beadGlow: '#cbd5e1',
      countGradient: 'from-[#ffffff] via-[#f1f5f9] to-[#94a3b8]'
    },
    accent: {
      gold: '#cbd5e1',
      text: '#f8fafc',
      mutedText: '#94a3b8',
      cardBg: 'bg-[#13161c]/90',
      cardBorder: 'border-[#94a3b8]/20'
    }
  },
  {
    id: 'huong-tram',
    name: 'Hương Trầm Cổ Tự',
    subtitle: 'Hổ Phách & Bảo Điện',
    zenQuote: 'Khói trầm quyện bóng áo nâu sồng, tiếng chuông cổ tự ngân vang chiều tà.',
    category: 'co-dien',
    previewPalette: ['#170e0a', '#2d1a12', '#e59b4c'],
    bgClass: 'bg-[#130b08]',
    headerBg: 'bg-[#130b08]/95 border-[#e59b4c]/20',
    aura: {
      from: '#e59b4c',
      via: '#3b2014',
      to: 'transparent'
    },
    disc: {
      bg: 'bg-gradient-to-br from-[#2a170e] via-[#1c100a] to-[#120704]',
      border: 'border-[#e59b4c]/40',
      activeRing: 'active:ring-[#e59b4c]/40',
      shadowGlow: 'rgba(229, 155, 76, 0.35)',
      lotusPetalStroke: '#e59b4c',
      beadFilled: '#e59b4c',
      beadUnfilled: 'rgba(229, 155, 76, 0.2)',
      beadGlow: '#e59b4c',
      countGradient: 'from-[#ffffff] via-[#fed7aa] to-[#e59b4c]'
    },
    accent: {
      gold: '#e59b4c',
      text: '#fff7ed',
      mutedText: '#c9a28e',
      cardBg: 'bg-[#1e110b]/90',
      cardBorder: 'border-[#e59b4c]/25'
    }
  },
  {
    id: 'tuyet-son',
    name: 'Tuyết Sơn Khí Tịch',
    subtitle: 'Lam Thẫm Hy Mã Lạp Sơn',
    zenQuote: 'Đỉnh tuyết vạn trượng trời thanh tịnh, tâm bất biến giữa dòng đời vạn biến.',
    category: 'tam-linh',
    previewPalette: ['#070e1c', '#112240', '#67e8f9'],
    bgClass: 'bg-[#050b17]',
    headerBg: 'bg-[#050b17]/95 border-[#38bdf8]/20',
    aura: {
      from: '#38bdf8',
      via: '#0f2744',
      to: 'transparent'
    },
    disc: {
      bg: 'bg-gradient-to-br from-[#0c1f38] via-[#081526] to-[#040a14]',
      border: 'border-[#38bdf8]/40',
      activeRing: 'active:ring-[#38bdf8]/40',
      shadowGlow: 'rgba(56, 189, 248, 0.35)',
      lotusPetalStroke: '#38bdf8',
      beadFilled: '#67e8f9',
      beadUnfilled: 'rgba(56, 189, 248, 0.2)',
      beadGlow: '#67e8f9',
      countGradient: 'from-[#ffffff] via-[#e0f2fe] to-[#38bdf8]'
    },
    accent: {
      gold: '#38bdf8',
      text: '#f0f9ff',
      mutedText: '#93c5fd',
      cardBg: 'bg-[#0a182d]/90',
      cardBorder: 'border-[#38bdf8]/25'
    }
  },
  {
    id: 'truc-lam',
    name: 'Trúc Lâm Yên Tử',
    subtitle: 'Sương Trúc & Rêu Phong',
    zenQuote: 'Bước chân thong dong trong rừng trúc, rũ sạch bụi trần giữa núi mây.',
    category: 'thien-nhien',
    previewPalette: ['#08170e', '#132e1d', '#34d399'],
    bgClass: 'bg-[#06140c]',
    headerBg: 'bg-[#06140c]/95 border-[#34d399]/20',
    aura: {
      from: '#34d399',
      via: '#123320',
      to: 'transparent'
    },
    disc: {
      bg: 'bg-gradient-to-br from-[#0f2d1c] via-[#0a1f13] to-[#05110a]',
      border: 'border-[#34d399]/40',
      activeRing: 'active:ring-[#34d399]/40',
      shadowGlow: 'rgba(52, 211, 153, 0.35)',
      lotusPetalStroke: '#34d399',
      beadFilled: '#34d399',
      beadUnfilled: 'rgba(52, 211, 153, 0.2)',
      beadGlow: '#34d399',
      countGradient: 'from-[#ffffff] via-[#d1fae5] to-[#34d399]'
    },
    accent: {
      gold: '#34d399',
      text: '#f0fdf4',
      mutedText: '#86efac',
      cardBg: 'bg-[#0c2215]/90',
      cardBorder: 'border-[#34d399]/25'
    }
  },
  {
    id: 'bach-lien',
    name: 'Bạch Liên Trăng Rằm',
    subtitle: 'Bạch Ngọc & Nguyệt Quang',
    zenQuote: 'Trăng rằm soi bóng hồ sen ngọc, rạng ngời thanh tịnh một lòng son.',
    category: 'tam-linh',
    previewPalette: ['#0f141c', '#202938', '#e2e8f0'],
    bgClass: 'bg-[#0d1219]',
    headerBg: 'bg-[#0d1219]/95 border-[#cbd5e1]/25',
    aura: {
      from: '#e2e8f0',
      via: '#222f42',
      to: 'transparent'
    },
    disc: {
      bg: 'bg-gradient-to-br from-[#1e2634] via-[#141b25] to-[#0b0e14]',
      border: 'border-[#cbd5e1]/40',
      activeRing: 'active:ring-[#e2e8f0]/40',
      shadowGlow: 'rgba(226, 232, 240, 0.3)',
      lotusPetalStroke: '#e2e8f0',
      beadFilled: '#f8fafc',
      beadUnfilled: 'rgba(203, 213, 225, 0.22)',
      beadGlow: '#ffffff',
      countGradient: 'from-[#ffffff] via-[#f8fafc] to-[#cbd5e1]'
    },
    accent: {
      gold: '#e2e8f0',
      text: '#ffffff',
      mutedText: '#94a3b8',
      cardBg: 'bg-[#17202c]/90',
      cardBorder: 'border-[#cbd5e1]/25'
    }
  },
  {
    id: 'hu-khong',
    name: 'Hư Không Tịch Tịch',
    subtitle: 'Đêm Đen Tĩnh Mịch & Không Cảnh',
    zenQuote: 'Vạn vật trở về nơi tịch lặng, ngắm cội nguồn tánh không sáng ngời.',
    category: 'thien-tong',
    previewPalette: ['#030303', '#121212', '#a3a3a3'],
    bgClass: 'bg-[#030303]',
    headerBg: 'bg-[#030303]/95 border-[#525252]/25',
    aura: {
      from: '#737373',
      via: '#171717',
      to: 'transparent'
    },
    disc: {
      bg: 'bg-gradient-to-br from-[#171717] via-[#0d0d0d] to-[#050505]',
      border: 'border-[#737373]/40',
      activeRing: 'active:ring-[#a3a3a3]/30',
      shadowGlow: 'rgba(163, 163, 163, 0.2)',
      lotusPetalStroke: '#a3a3a3',
      beadFilled: '#d4d4d4',
      beadUnfilled: 'rgba(163, 163, 163, 0.18)',
      beadGlow: '#d4d4d4',
      countGradient: 'from-[#ffffff] via-[#e5e5e5] to-[#a3a3a3]'
    },
    accent: {
      gold: '#d4d4d4',
      text: '#f5f5f5',
      mutedText: '#a3a3a3',
      cardBg: 'bg-[#0f0f0f]/95',
      cardBorder: 'border-[#525252]/25'
    }
  },
  {
    id: 'hoang-hon',
    name: 'Hoàng Hôn Tịnh Thất',
    subtitle: 'Ráng Chiều & Chuông Ngân',
    zenQuote: 'Ánh tà dương buông trên mái chùa, một niệm chí tâm vạn niệm an.',
    category: 'thien-nhien',
    previewPalette: ['#1a0c0a', '#341511', '#fb923c'],
    bgClass: 'bg-[#140807]',
    headerBg: 'bg-[#140807]/95 border-[#fb923c]/20',
    aura: {
      from: '#fb923c',
      via: '#431711',
      to: 'transparent'
    },
    disc: {
      bg: 'bg-gradient-to-br from-[#2f130e] via-[#1f0b08] to-[#100504]',
      border: 'border-[#fb923c]/40',
      activeRing: 'active:ring-[#fb923c]/40',
      shadowGlow: 'rgba(251, 146, 60, 0.35)',
      lotusPetalStroke: '#fb923c',
      beadFilled: '#fb923c',
      beadUnfilled: 'rgba(251, 146, 60, 0.2)',
      beadGlow: '#fb923c',
      countGradient: 'from-[#ffffff] via-[#fed7aa] to-[#fb923c]'
    },
    accent: {
      gold: '#fb923c',
      text: '#fff7ed',
      mutedText: '#fdba74',
      cardBg: 'bg-[#220d09]/90',
      cardBorder: 'border-[#fb923c]/25'
    }
  }
];

export const getZenTheme = (id: BackgroundThemeId): ZenTheme => {
  return ZEN_THEMES.find(t => t.id === id) || ZEN_THEMES[0];
};
