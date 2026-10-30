import { BuddhistArtId, BackgroundThemeId } from '../types';
import {
  BUDDHA_BODHI_DATA_URI,
  QUAN_AM_DATA_URI,
  PHAP_LUAN_DATA_URI,
  CO_TU_DATA_URI
} from './buddhistArtData';

// Embedded high-fidelity sacred artworks guarantee 100% visibility on local VS Code, GitHub Pages, and offline PWA
const buddhaBodhiImg = BUDDHA_BODHI_DATA_URI;
const quanAmImg = QUAN_AM_DATA_URI;
const phapLuanImg = PHAP_LUAN_DATA_URI;
const coTuImg = CO_TU_DATA_URI;

export interface BuddhistArtItem {
  id: BuddhistArtId;
  name: string;
  subname: string;
  description: string;
  imageUrl?: string;
  tags: string[];
}

export const BUDDHIST_ARTWORKS: BuddhistArtItem[] = [
  {
    id: 'auto',
    name: 'Tự Động Theo Nền',
    subname: 'Hài hòa cùng không gian thiền',
    description: 'Tự động chọn bức tranh linh thiêng tương ứng với sắc thái nền bạn đang chọn.',
    tags: ['Tự động', 'Thanh tịnh']
  },
  {
    id: 'buddha-bodhi',
    name: 'Đức Bổn Sư Dưới Cội Bồ Đề',
    subname: 'Hào Quang Từ Bi & Trí Tuệ',
    description: 'Tôn tượng Đức Phật Thích Ca Mâu Ni thiền tọa thanh tịnh dưới cội Bồ Đề, tỏa vầng luân quang ngũ sắc tròn đầy biểu trưng cho lòng từ bi vô lượng và trí tuệ viên mãn.',
    imageUrl: buddhaBodhiImg,
    tags: ['Đức Phật', 'Từ Bi', 'Trí Tuệ']
  },
  {
    id: 'quan-am',
    name: 'Quán Thế Âm Ngự Tòa Sen',
    subname: 'Đại Bi Thủy Tịnh Cam Lồ',
    description: 'Tôn tượng Bồ Tát Quán Âm bạch y ngự trên đài sen bích ngọc, nét vẽ bích họa Đôn Hoàng trang nghiêm.',
    imageUrl: quanAmImg,
    tags: ['Quán Âm', 'Liên Hoa', 'Cam Lồ']
  },
  {
    id: 'phap-luan',
    name: 'Pháp Luân & Mạn Đà La',
    subname: 'Bánh Xe Chánh Pháp Bát Chánh Đạo',
    description: 'Đồ hình Mạn Đà La Mật Tông Tây Tạng với Bánh xe Chuyển Pháp Luân kim sắc lung linh vi diệu.',
    imageUrl: phapLuanImg,
    tags: ['Pháp Luân', 'Mạn Đà La', 'Kim sắc']
  },
  {
    id: 'co-tu',
    name: 'Cổ Tự Sương Nguyệt',
    subname: 'Mái Chùa & Trúc Lâm Dạ Nguyệt',
    description: 'Bảo tháp cổ kính nép mình bên vách đá tĩnh mịch dưới ánh trăng rằm và rừng trúc mờ sương.',
    imageUrl: coTuImg,
    tags: ['Cổ Tự', 'Trúc Lâm', 'Trăng rằm']
  },
  {
    id: 'none',
    name: 'Không Tranh (Thuần Khiết)',
    subname: 'Chỉ giữ màu nền tối giản',
    description: 'Tối giản tuyệt đối, chỉ hiển thị màu sắc thanh tịnh của chủ đề mà không có hình vẽ phía sau.',
    tags: ['Tối giản', 'Tánh không']
  }
];

// Mapping theme to appropriate spiritual art when set to 'auto'
export const THEME_ART_MAPPING: Record<BackgroundThemeId, Exclude<BuddhistArtId, 'auto' | 'none'>> = {
  'tinh-do': 'buddha-bodhi',
  'thien-mac': 'buddha-bodhi',
  'huong-tram': 'co-tu',
  'tuyet-son': 'phap-luan',
  'truc-lam': 'co-tu',
  'bach-lien': 'quan-am',
  'hu-khong': 'buddha-bodhi',
  'hoang-hon': 'co-tu'
};

export const resolveActiveArt = (
  themeId: BackgroundThemeId,
  chosenArtId: BuddhistArtId = 'auto'
): BuddhistArtItem | null => {
  if (chosenArtId === 'none') return null;

  const resolvedId: BuddhistArtId =
    chosenArtId === 'auto' ? THEME_ART_MAPPING[themeId] || 'buddha-bodhi' : chosenArtId;

  const found = BUDDHIST_ARTWORKS.find(art => art.id === resolvedId);
  return found && found.imageUrl ? found : null;
};
