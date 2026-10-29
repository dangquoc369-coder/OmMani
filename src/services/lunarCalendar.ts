/**
 * Tu Dưỡng - Ommani Buddhist & Lunar-Solar Calendar Service
 * Implements high-precision astronomical algorithms for the Vietnamese Lunar Calendar (UTC+7, Hanoi time),
 * complete Can Chi (Heavenly Stems & Earthly Branches), Nạp Âm Ngũ Hành, Giờ Hoàng Đạo,
 * Buddhist Feast Days (Ngày Vía Chư Phật/Bồ Tát), Trai Nhật (Thập Trai/Lục Trai/Nhị Trai), and daily Dhammapada quotes.
 */

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
  jd: number;
}

export interface CanChiInfo {
  yearCanChi: string;
  monthCanChi: string;
  dayCanChi: string;
  hourCanChi: string;
  napAm: string;
  tietKhi: string;
}

export interface HourAuspiciousInfo {
  hourName: string; // Tý (23h - 01h)
  chi: string; // Tý, Sửu...
  isAuspicious: boolean; // Hoàng đạo vs Hắc đạo
  starName: string; // Thanh Long, Minh Đường, v.v.
  timeSpan: string; // 23:00 - 00:59
}

export interface BuddhistEvent {
  name: string;
  significance: string;
  mantraRecommendation?: string;
  isMajor: boolean;
}

export interface DayCalendarDetails {
  solarDate: Date;
  solarDay: number;
  solarMonth: number;
  solarYear: number;
  lunar: LunarDate;
  canChi: CanChiInfo;
  hoangDaoHours: HourAuspiciousInfo[];
  hyThanDirection: string;
  taiThanDirection: string;
  tuoiXung: string[];
  buddhistEvents: BuddhistEvent[];
  isNhiTrai: boolean;
  isLucTrai: boolean;
  isThapTrai: boolean;
  dhammapada: {
    verse: number;
    vietnamese: string;
    pali?: string;
    meaning: string;
  };
}

// 10 Thiên Can
export const THIEN_CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];

// 12 Địa Chi
export const DIA_CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

// 24 Tiết khí trong năm
export const TIET_KHI = [
  'Xuân phân', 'Thanh minh', 'Cốc vũ', 'Lập hạ', 'Tiểu mãn', 'Mang chủng',
  'Hạ chí', 'Tiểu thử', 'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ',
  'Thu phân', 'Hàn lộ', 'Sương giáng', 'Lập đông', 'Tiểu tuyết', 'Đại tuyết',
  'Đông chí', 'Tiểu hàn', 'Đại hàn', 'Lập xuân', 'Vũ thủy', 'Kinh trập'
];

// Ngũ Hành Nạp Âm của 60 Hoa Giáp
const NAP_AM_MAP: Record<string, string> = {
  'Giáp Tý': 'Hải Trung Kim', 'Ất Sửu': 'Hải Trung Kim',
  'Bính Dần': 'Lư Trung Hỏa', 'Đinh Mão': 'Lư Trung Hỏa',
  'Mậu Thìn': 'Đại Lâm Mộc', 'Kỷ Tỵ': 'Đại Lâm Mộc',
  'Canh Ngọ': 'Lộ Bàng Thổ', 'Tân Mùi': 'Lộ Bàng Thổ',
  'Nhâm Thân': 'Kiếm Phong Kim', 'Quý Dậu': 'Kiếm Phong Kim',
  'Giáp Tuất': 'Sơn Đầu Hỏa', 'Ất Hợi': 'Sơn Đầu Hỏa',
  'Bính Tý': 'Giản Hạ Thủy', 'Đinh Sửu': 'Giản Hạ Thủy',
  'Mậu Dần': 'Thành Đầu Thổ', 'Kỷ Mão': 'Thành Đầu Thổ',
  'Canh Thìn': 'Bạch Lạp Kim', 'Tân Tỵ': 'Bạch Lạp Kim',
  'Nhâm Ngọ': 'Dương Liễu Mộc', 'Quý Mùi': 'Dương Liễu Mộc',
  'Giáp Thân': 'Tuyền Trung Thủy', 'Ất Dậu': 'Tuyền Trung Thủy',
  'Bính Tuất': 'Ốc Thượng Thổ', 'Đinh Hợi': 'Ốc Thượng Thổ',
  'Mậu Tý': 'Tích Lịch Hỏa', 'Kỷ Sửu': 'Tích Lịch Hỏa',
  'Canh Dần': 'Tùng Bách Mộc', 'Tân Mão': 'Tùng Bách Mộc',
  'Nhâm Thìn': 'Trường Lưu Thủy', 'Quý Tỵ': 'Trường Lưu Thủy',
  'Giáp Ngọ': 'Sa Trung Kim', 'Ất Mùi': 'Sa Trung Kim',
  'Bính Thân': 'Sơn Hạ Hỏa', 'Đinh Dậu': 'Sơn Hạ Hỏa',
  'Mậu Tuất': 'Bình Địa Mộc', 'Kỷ Hợi': 'Bình Địa Mộc',
  'Canh Tý': 'Bích Thượng Thổ', 'Tân Sửu': 'Bích Thượng Thổ',
  'Nhâm Dần': 'Kim Bạch Kim', 'Quý Mão': 'Kim Bạch Kim',
  'Giáp Thìn': 'Phú Đăng Hỏa', 'Ất Tỵ': 'Phú Đăng Hỏa',
  'Bính Ngọ': 'Thiên Hà Thủy', 'Đinh Mùi': 'Thiên Hà Thủy',
  'Mậu Thân': 'Đại Trạch Thổ', 'Kỷ Dậu': 'Đại Trạch Thổ',
  'Canh Tuất': 'Thoa Xuyến Kim', 'Tân Hợi': 'Thoa Xuyến Kim',
  'Nhâm Tý': 'Tang Đố Mộc', 'Quý Sửu': 'Tang Đố Mộc',
  'Giáp Dần': 'Đại Khê Thủy', 'Ất Mão': 'Đại Khê Thủy',
  'Bính Thìn': 'Sa Trung Thổ', 'Đinh Tỵ': 'Sa Trung Thổ',
  'Mậu Ngọ': 'Thiên Thượng Hỏa', 'Kỷ Mùi': 'Thiên Thượng Hỏa',
  'Canh Thân': 'Thạch Lựu Mộc', 'Tân Dậu': 'Thạch Lựu Mộc',
  'Nhâm Tuất': 'Đại Hải Thủy', 'Quý Hợi': 'Đại Hải Thủy'
};

// 12 Sao Hoàng Đạo / Hắc Đạo
const SAO_HOANG_DAO = [
  'Thanh Long (Hoàng đạo - Rất tốt)',
  'Minh Đường (Hoàng đạo - Quý nhân phù trợ)',
  'Thiên Hình (Hắc đạo - Kỵ tranh cãi)',
  'Chu Tước (Hắc đạo - Kỵ khẩu thiệt)',
  'Kim Quỹ (Hoàng đạo - Tài lộc, hưng vượng)',
  'Kim Đường (Hoàng đạo - Thuận lợi mọi việc)',
  'Bạch Hổ (Hắc đạo - Kỵ di chuyển)',
  'Ngọc Đường (Hoàng đạo - Khởi sự hanh thông)',
  'Thiên Lao (Hắc đạo - Bất lợi việc lớn)',
  'Huyền Vũ (Hắc đạo - Cẩn trọng tiểu nhân)',
  'Tư Mệnh (Hoàng đạo - Vạn sự bình an)',
  'Câu Trận (Hắc đạo - Kỵ tranh chấp)'
];

// Lục Xung
const LUC_XUNG: Record<string, string> = {
  'Tý': 'Ngọ', 'Ngọ': 'Tý',
  'Sửu': 'Mùi', 'Mùi': 'Sửu',
  'Dần': 'Thân', 'Thân': 'Dần',
  'Mão': 'Dậu', 'Dậu': 'Mão',
  'Thìn': 'Tuất', 'Tuất': 'Thìn',
  'Tỵ': 'Hợi', 'Hợi': 'Tỵ'
};

// Danh mục Ngày Lễ Vía Phật Giáo theo Âm Lịch (Chuẩn Giáo hội Phật giáo Việt Nam)
export const BUDDHIST_FEAST_DAYS: Record<string, BuddhistEvent[]> = {
  '1/1': [
    { name: 'Vía Đức Phật Di Lặc', significance: 'Ngày đầu năm mừng Đức Phật Di Lặc đản sanh, tượng trưng cho niềm hoan hỷ, an lạc, từ bi và bao dung viên mãn.', mantraRecommendation: 'Nam Mô Di Lặc Tôn Phật', isMajor: true }
  ],
  '8/1': [
    { name: 'Ngày Thập Trai (Mùng 8)', significance: 'Ngày trì trai giữ giới, khởi tâm lành, phóng sanh tu phúc.', isMajor: false }
  ],
  '15/1': [
    { name: 'Đại Lễ Thượng Nguyên (Rằm Tháng Giêng)', significance: 'Rằm đầu năm, ngày vía Đức Phật Thích Ca thuyết kinh Giải Thoát Giới, chư Tăng câu hội.', mantraRecommendation: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật', isMajor: true }
  ],
  '8/2': [
    { name: 'Kỷ Niệm Phật Thích Ca Xuất Gia', significance: 'Kỷ niệm thái tử Tất Đạt Đa từ bỏ cung vàng điện ngọc, vượt thành xuất gia tầm đạo giải thoát cho nhân loại.', mantraRecommendation: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật', isMajor: true }
  ],
  '15/2': [
    { name: 'Kỷ Niệm Phật Thích Ca Nhập Niết Bàn', significance: 'Kỷ niệm Đức Thế Tôn nhập Vô Dư Niết Bàn tại rừng Ta-la song thọ, để lại kho tàng chánh pháp.', mantraRecommendation: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật', isMajor: true }
  ],
  '19/2': [
    { name: 'Vía Đức Quán Thế Âm Bồ Tát (Đản Sanh)', significance: 'Đại lễ kỷ niệm Đức Quán Thế Âm Bồ Tát giáng trần, lắng nghe tiếng khổ đau cứu vớt chúng sanh.', mantraRecommendation: 'Nam Mô Đại Bi Quán Thế Âm Bồ Tát / Án Ma Ni Bát Mê Hồng', isMajor: true }
  ],
  '21/2': [
    { name: 'Vía Đức Phổ Hiền Bồ Tát', significance: 'Tôn vinh hạnh nguyện rộng lớn (Thập Đại Hạnh Nguyện) của Đức Bồ Tát Phổ Hiền.', mantraRecommendation: 'Nam Mô Đại Hạnh Phổ Hiền Bồ Tát', isMajor: false }
  ],
  '16/3': [
    { name: 'Vía Đức Phật Mẫu Chuẩn Đề', significance: 'Tụng niệm thần chú Chuẩn Đề cầu tiêu trừ nghiệp chướng, phước huệ tăng trưởng.', mantraRecommendation: 'Khể Thủ Quy Y Tô Tất Đế... Án Chiết Lệ Chủ Lệ Chuẩn Đề Ta Bà Ha', isMajor: false }
  ],
  '4/4': [
    { name: 'Vía Đức Văn Thù Sư Lợi Bồ Tát', significance: 'Kính mừng bậc Đại Trí, cầm gươm trí tuệ chặt đứt vô minh phiền não.', mantraRecommendation: 'Nam Mô Đại Trí Văn Thù Sư Lợi Bồ Tát', isMajor: false }
  ],
  '15/4': [
    { name: 'Đại Lễ Phật Đản (Vesak - Tam Hợp)', significance: 'Đại lễ thiêng liêng nhất của Phật giáo: Kỷ niệm Đản sanh, Thành đạo và Nhập Niết bàn của Đức Thích Ca Mâu Ni.', mantraRecommendation: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật', isMajor: true }
  ],
  '19/6': [
    { name: 'Vía Đức Quán Thế Âm Bồ Tát (Thành Đạo)', significance: 'Kỷ niệm ngày Bồ Tát Quán Thế Âm viên mãn đạo quả, cứu khổ ban vui cho muôn loài.', mantraRecommendation: 'Nam Mô Đại Bi Quán Thế Âm Bồ Tát', isMajor: true }
  ],
  '13/7': [
    { name: 'Vía Đức Đại Thế Chí Bồ Tát', significance: 'Tôn vinh ánh sáng đại trí tuệ soi đường cho chúng sanh thoát ly ba cõi ác.', mantraRecommendation: 'Nam Mô Đại Thế Chí Bồ Tát', isMajor: false }
  ],
  '15/7': [
    { name: 'Đại Lễ Vu Lan Báo Hiếu - Tự Tứ', significance: 'Mùa báo hiếu tứ trọng ân, nhớ công ơn cha mẹ sinh thành dưỡng dục, chư Tăng mãn hạ Tự Tứ.', mantraRecommendation: 'Nam Mô Đại Hiếu Mục Kiền Liên Bồ Tát', isMajor: true }
  ],
  '30/7': [
    { name: 'Vía Đức Địa Tạng Vương Bồ Tát', significance: 'Hạnh nguyện vĩ đại: "Địa ngục vị không, thệ bất thành Phật; chúng sanh độ tận, phương chứng bồ đề".', mantraRecommendation: 'Nam Mô Đại Nguyện Địa Tạng Vương Bồ Tát', isMajor: true }
  ],
  '19/9': [
    { name: 'Vía Đức Quán Thế Âm Bồ Tát (Xuất Gia)', significance: 'Kỷ niệm ngày Quán Thế Âm Bồ Tát phát tâm xuất gia cầu đạo giải thoát.', mantraRecommendation: 'Nam Mô Đại Bi Quán Thế Âm Bồ Tát', isMajor: true }
  ],
  '30/9': [
    { name: 'Vía Đức Phật Dược Sư Lưu Ly Quang Vương', significance: 'Đức Phật thầy thuốc tiêu trừ bệnh khổ thân tâm, kéo dài thọ mạng, ánh sáng ngọc lưu ly thanh tịnh.', mantraRecommendation: 'Nam Mô Dược Sư Lưu Ly Quang Vương Phật', isMajor: true }
  ],
  '17/11': [
    { name: 'Vía Đức Phật A Di Đà', significance: 'Khánh đản Đức Từ Phụ A Di Đà - Giáo chủ cõi Tây Phương Cực Lạc tiếp dẫn chúng sanh niệm Phật vãng sanh.', mantraRecommendation: 'Nam Mô A Di Đà Phật', isMajor: true }
  ],
  '8/12': [
    { name: 'Kỷ Niệm Phật Thích Ca Thành Đạo', significance: 'Đức Phật dưới cội bồ đề đại ngộ vô thượng chánh đẳng chánh giác khi sao mai vừa mọc.', mantraRecommendation: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật', isMajor: true }
  ]
};

// 30 Câu Kinh Pháp Cú (Dhammapada) kinh điển soi sáng tâm trí
export const DHAMMAPADA_QUOTES = [
  { verse: 1, vietnamese: 'Ý dẫn đầu các pháp, Ý làm chủ, ý tạo; Nếu với ý ô nhiễm, Nói lên hay hành động, Khổ não bước theo sau, Như xe chân vật kéo.', meaning: 'Tâm ý là nguồn gốc mọi thiện ác, giữ tâm thanh tịnh thì cuộc đời an lạc.' },
  { verse: 2, vietnamese: 'Ý dẫn đầu các pháp, Ý làm chủ, ý tạo; Nếu với ý thanh tịnh, Nói lên hay hành động, An lạc bước theo sau, Như bóng không rời hình.', meaning: 'Tâm lành tạo nên phước báu, niềm vui vững bền theo sát người hiền đức.' },
  { verse: 5, vietnamese: 'Hận thù diệt hận thù, Đời này không thể có; Từ bi diệt hận thù, Là định luật ngàn thu.', meaning: 'Oán thù chỉ được hóa giải bằng lòng từ bi và sự tha thứ.' },
  { verse: 21, vietnamese: 'Không phóng dật: đường sống, Phóng dật: đường đưa chết; Người không phóng dật: sống, Kẻ phóng dật: như chết.', meaning: 'Tỉnh thức chánh niệm đem lại sự sống chân thật và bình an nội tại.' },
  { verse: 50, vietnamese: 'Không nên nhìn lỗi người, Người làm hay không làm; Nên nhìn tự chính mình, Đã làm hay chưa làm.', meaning: 'Không xét nét sai lầm kẻ khác, hãy tự soi rọi và tu dưỡng bản thân.' },
  { verse: 103, vietnamese: 'Dù tại bãi chiến trường, Thắng ngàn vạn quân địch; Tự thắng chính mình thôi, Là chiến công oanh liệt.', meaning: 'Chiến thắng vĩ đại nhất của đời người là tự chiến thắng tâm tham, sân, si.' },
  { verse: 111, vietnamese: 'Ai sống một trăm năm, Không thấy pháp tối thượng; Tốt hơn sống một ngày, Thấy được pháp vô thượng.', meaning: 'Một ngày sống trong chánh đạo quý giá hơn trăm năm mê mờ.' },
  { verse: 160, vietnamese: 'Tự mình nương tựa mình, Nào ai nương tựa khác? Người khéo tự điều phục, Được chỗ nương khó tìm.', meaning: 'Hãy là ngọn đèn tự soi sáng chính mình, làm chủ thân tâm.' },
  { verse: 183, vietnamese: 'Không làm các việc ác, Vâng làm các việc lành, Giữ tâm ý trong sạch, Là lời chư Phật dạy.', meaning: 'Ba phương châm cốt lõi của đạo Phật: dứt ác, làm lành, thanh tịnh tâm ý.' },
  { verse: 204, vietnamese: 'Không bệnh: phúc tối cao, Biết đủ: giàu tối thượng; Thành tín: bạn tối ưu, Niết bàn: lạc tối thượng.', meaning: 'Biết đủ là giàu có nhất, tâm thanh thản là hạnh phúc lớn nhất trần gian.' }
];

/* =======================================================================
   ASTRONOMICAL FORMULAS (Hồ Ngọc Đức algorithm for Vietnam Timezone UTC+7)
   ======================================================================= */

function INT(d: number): number {
  return Math.floor(d);
}

/**
 * Convert Solar date to Julian Day number
 */
export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

/**
 * Convert Julian Day number back to Solar date
 */
export function jdToDate(jd: number): { day: number; month: number; year: number } {
  let a, b, c, d, e, m;
  if (jd > 2299160) {
    const alpha = INT((jd - 1867216.25) / 36524.25);
    a = jd + 1 + alpha - INT(alpha / 4);
  } else {
    a = jd;
  }
  b = a + 1524;
  c = INT((b - 122.1) / 365.25);
  d = INT(365.25 * c);
  e = INT((b - d) / 30.6001);
  const day = INT(b - d - INT(30.6001 * e));
  if (e < 14) {
    m = e - 1;
  } else {
    m = e - 13;
  }
  let year = c - 4716;
  if (m <= 2) {
    year += 1;
  }
  return { day, month: m, year };
}

/**
 * New Moon day calculation
 */
function getNewMoonDay(k: number, timeZone = 7): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  const C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  const C2 = -0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr);
  const C3 = -0.0004 * Math.sin(3 * dr * Mpr);
  const C4 = 0.0104 * Math.sin(2 * dr * F) - 0.0051 * Math.sin((M + Mpr) * dr);
  const C5 = -0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr);
  const C6 = -0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mpr) * dr);
  const C7 = 0.0010 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((2 * Mpr + M) * dr);
  const deltat = C1 + C2 + C3 + C4 + C5 + C6 + C7;
  const Jd = Jd1 + deltat;
  return INT(Jd + 0.5 + timeZone / 24);
}

/**
 * Sun Longitude (in degree)
 */
function getSunLongitude(dayNumber: number, timeZone = 7): number {
  const T = (dayNumber - 2451545.5 - timeZone / 24) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  const DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
    + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M)
    + 0.000290 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - Math.PI * 2 * INT(L / (Math.PI * 2));
  return INT((L / Math.PI) * 12);
}

/**
 * Convert Solar date (day, month, year) to Vietnamese Lunar date
 */
export function convertSolarToLunar(dd: number, mm: number, yy: number, timeZone = 7): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.0769986) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let year = yy;
  if (a11 >= monthStart) {
    year = yy - 1;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    b11 = getLunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    year = year - 1;
  }
  return {
    day: lunarDay,
    month: lunarMonth,
    year: year,
    isLeap: lunarLeap,
    jd: dayNumber
  };
}

function getLunarMonth11(yy: number, timeZone = 7): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone = 7): number {
  const k = INT((a11 - 2415021.0769986) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

/**
 * Get Can Chi representation for a specific date and hour
 */
export function getCanChiDetails(solarDay: number, solarMonth: number, solarYear: number, hour = 12): CanChiInfo {
  const jd = jdFromDate(solarDay, solarMonth, solarYear);
  const lunar = convertSolarToLunar(solarDay, solarMonth, solarYear);

  // Can Chi Năm
  const canNamIdx = (lunar.year + 6) % 10;
  const chiNamIdx = (lunar.year + 8) % 12;
  const yearCanChi = `${THIEN_CAN[canNamIdx]} ${DIA_CHI[chiNamIdx]}`;

  // Can Chi Tháng
  const canThangIdx = (lunar.year * 12 + lunar.month + 3) % 10;
  const chiThangIdx = (lunar.month + 1) % 12;
  const monthCanChi = `${THIEN_CAN[canThangIdx]} ${DIA_CHI[chiThangIdx]}`;

  // Can Chi Ngày: Từ Julian Day
  const canNgayIdx = (jd + 9) % 10;
  const chiNgayIdx = (jd + 1) % 12;
  const dayCanChi = `${THIEN_CAN[canNgayIdx]} ${DIA_CHI[chiNgayIdx]}`;

  // Can Chi Giờ
  const chiGioIdx = INT((hour + 1) / 2) % 12;
  const canGioIdx = (canNgayIdx * 2 + chiGioIdx) % 10;
  const hourCanChi = `${THIEN_CAN[canGioIdx]} ${DIA_CHI[chiGioIdx]}`;

  // Nạp Âm Ngũ Hành
  const napAm = NAP_AM_MAP[dayCanChi] || 'Ngũ Hành Bình An';

  // Tiết khí
  const sunLongDeg = getSunLongitude(jd);
  const tietKhi = TIET_KHI[sunLongDeg % 24] || 'Thanh Tịnh';

  return {
    yearCanChi,
    monthCanChi,
    dayCanChi,
    hourCanChi,
    napAm,
    tietKhi
  };
}

/**
 * Calculate the 12 Vietnamese Auspicious / Inauspicious hours (Giờ Hoàng Đạo)
 */
export function getHoangDaoHours(solarDay: number, solarMonth: number, solarYear: number): HourAuspiciousInfo[] {
  const jd = jdFromDate(solarDay, solarMonth, solarYear);
  const chiNgayIdx = (jd + 1) % 12;

  // Thanh Long bắt đầu tại cung theo Địa chi ngày:
  // Dần Thân: Tý; Mão Dậu: Dần; Thìn Tuất: Thìn; Tỵ Hợi: Ngọ; Tý Ngọ: Thân; Sửu Mùi: Tuất
  const startChiMap: Record<number, number> = {
    0: 8, 6: 8, // Tý, Ngọ -> Thân (8)
    1: 10, 7: 10, // Sửu, Mùi -> Tuất (10)
    2: 0, 8: 0, // Dần, Thân -> Tý (0)
    3: 2, 9: 2, // Mão, Dậu -> Dần (2)
    4: 4, 10: 4, // Thìn, Tuất -> Thìn (4)
    5: 6, 11: 6 // Tỵ, Hợi -> Ngọ (6)
  };

  const startChi = startChiMap[chiNgayIdx] ?? 0;

  const timeSpans = [
    '23:00 - 00:59', '01:00 - 02:59', '03:00 - 04:59', '05:00 - 06:59',
    '07:00 - 08:59', '09:00 - 10:59', '11:00 - 12:59', '13:00 - 14:59',
    '15:00 - 16:59', '17:00 - 18:59', '19:00 - 20:59', '21:00 - 22:59'
  ];

  const result: HourAuspiciousInfo[] = [];

  for (let chi = 0; chi < 12; chi++) {
    // Sao thứ mấy trong 12 sao
    const starIdx = (chi - startChi + 12) % 12;
    const starDesc = SAO_HOANG_DAO[starIdx];
    const isAuspicious = starDesc.includes('Hoàng đạo');

    result.push({
      hourName: `Giờ ${DIA_CHI[chi]}`,
      chi: DIA_CHI[chi],
      isAuspicious,
      starName: starDesc,
      timeSpan: timeSpans[chi]
    });
  }

  return result;
}

/**
 * Hướng Xuất Hành (Hỷ Thần, Tài Thần)
 */
export function getHuongXuatHanh(solarDay: number, solarMonth: number, solarYear: number): { hyThan: string; taiThan: string } {
  const jd = jdFromDate(solarDay, solarMonth, solarYear);
  const canNgayIdx = (jd + 9) % 10;

  // Bảng Hướng Hỷ Thần theo Can ngày:
  // Giáp, Kỷ: Đông Bắc; Ất, Canh: Tây Bắc; Bính, Tân: Tây Nam; Đinh, Nhâm: Chính Nam; Mậu, Quý: Đông Nam
  const hyThanDirections = [
    'Đông Bắc', // Giáp
    'Tây Bắc',  // Ất
    'Tây Nam',  // Bính
    'Chính Nam',// Đinh
    'Đông Nam', // Mậu
    'Đông Bắc', // Kỷ
    'Tây Bắc',  // Canh
    'Tây Nam',  // Tân
    'Chính Nam',// Nhâm
    'Đông Nam'  // Quý
  ];

  // Bảng Hướng Tài Thần theo Can ngày:
  // Giáp, Ất: Đông Nam; Bính, Đinh: Chính Đông; Mậu: Chính Bắc; Kỷ: Chính Nam; Canh, Tân: Tây Nam; Nhâm: Chính Tây; Quý: Chính Bắc
  const taiThanDirections = [
    'Đông Nam', // Giáp
    'Đông Nam', // Ất
    'Chính Đông',// Bính
    'Chính Đông',// Đinh
    'Chính Bắc', // Mậu
    'Chính Nam', // Kỷ
    'Tây Nam',   // Canh
    'Tây Nam',   // Tân
    'Chính Tây', // Nhâm
    'Chính Bắc'  // Quý
  ];

  return {
    hyThan: hyThanDirections[canNgayIdx] || 'Hướng Hỷ Thần Thanh Tịnh',
    taiThan: taiThanDirections[canNgayIdx] || 'Hướng Tài Thần Vượng Phát'
  };
}

/**
 * Tuổi Xung trong ngày
 */
export function getTuoiXung(solarDay: number, solarMonth: number, solarYear: number): string[] {
  const jd = jdFromDate(solarDay, solarMonth, solarYear);
  const chiNgayIdx = (jd + 1) % 12;
  const chiName = DIA_CHI[chiNgayIdx];
  const xungChi = LUC_XUNG[chiName] || 'Tý';

  // Can tương khắc
  const canNgayIdx = (jd + 9) % 10;
  const canKhacMap: Record<number, string[]> = {
    0: ['Canh', 'Mậu'], // Giáp khắc Mậu, Canh khắc Giáp
    1: ['Tân', 'Kỷ'],
    2: ['Nhâm', 'Canh'],
    3: ['Quý', 'Tân'],
    4: ['Giáp', 'Nhâm'],
    5: ['Ất', 'Quý'],
    6: ['Bính', 'Giáp'],
    7: ['Đinh', 'Ất'],
    8: ['Mậu', 'Bính'],
    9: ['Kỷ', 'Đinh']
  };

  const khacCans = canKhacMap[canNgayIdx] || ['Giáp', 'Ất'];
  return [
    `Tuổi ${xungChi} (Lục xung với ngày ${chiName})`,
    `Người tuổi ${khacCans[0]} ${xungChi}, ${khacCans[1]} ${xungChi}`
  ];
}

/**
 * Kiểm tra các chế độ ngày ăn chay (Trai Nhật)
 * - Nhị Trai: Mùng 1 & 15 Âm lịch
 * - Lục Trai: Mùng 8, 14, 15, 23, 29, 30 (hoặc 28, 29 nếu tháng thiếu 29 ngày)
 * - Thập Trai: Mùng 1, 8, 14, 15, 18, 23, 24, 28, 29, 30 (hoặc 27, 28, 29 nếu tháng thiếu)
 */
export function checkVegetarianDays(lunarDay: number, totalDaysInLunarMonth = 30): {
  isNhiTrai: boolean;
  isLucTrai: boolean;
  isThapTrai: boolean;
} {
  const isLastDay = (lunarDay === totalDaysInLunarMonth);
  const isSecondLast = (lunarDay === totalDaysInLunarMonth - 1);
  const isThirdLast = (lunarDay === totalDaysInLunarMonth - 2);

  // Nhị trai: 1 và 15
  const isNhiTrai = (lunarDay === 1 || lunarDay === 15);

  // Lục trai: 8, 14, 15, 23, 29, 30
  let isLucTrai = false;
  if ([8, 14, 15, 23].includes(lunarDay)) {
    isLucTrai = true;
  } else if (totalDaysInLunarMonth === 30) {
    if (lunarDay === 29 || lunarDay === 30) isLucTrai = true;
  } else {
    // Tháng thiếu 29 ngày: 28, 29
    if (isSecondLast || isLastDay) isLucTrai = true;
  }

  // Thập trai: 1, 8, 14, 15, 18, 23, 24, 28, 29, 30
  let isThapTrai = false;
  if ([1, 8, 14, 15, 18, 23, 24].includes(lunarDay)) {
    isThapTrai = true;
  } else if (totalDaysInLunarMonth === 30) {
    if ([28, 29, 30].includes(lunarDay)) isThapTrai = true;
  } else {
    // Tháng thiếu
    if (isThirdLast || isSecondLast || isLastDay) isThapTrai = true;
  }

  return { isNhiTrai, isLucTrai, isThapTrai };
}

/**
 * Lấy toàn bộ thông tin chi tiết một ngày (Dương & Âm, Giờ Hoàng Đạo, Vía Phật, Pháp Cú...)
 */
export function getFullDayDetails(date: Date): DayCalendarDetails {
  const solarDay = date.getDate();
  const solarMonth = date.getMonth() + 1;
  const solarYear = date.getFullYear();

  const lunar = convertSolarToLunar(solarDay, solarMonth, solarYear);
  const canChi = getCanChiDetails(solarDay, solarMonth, solarYear, date.getHours());
  const hoangDaoHours = getHoangDaoHours(solarDay, solarMonth, solarYear);
  const directions = getHuongXuatHanh(solarDay, solarMonth, solarYear);
  const tuoiXung = getTuoiXung(solarDay, solarMonth, solarYear);

  // Tìm ngày lễ Phật giáo
  const eventKey = `${lunar.day}/${lunar.month}`;
  const buddhistEvents = BUDDHIST_FEAST_DAYS[eventKey] || [];

  // Trai nhật
  const veg = checkVegetarianDays(lunar.day, 30);

  // Pháp Cú ngày (theo ngày trong năm)
  const dayOfYear = Math.floor((date.getTime() - new Date(solarYear, 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const dhammapada = DHAMMAPADA_QUOTES[dayOfYear % DHAMMAPADA_QUOTES.length];

  return {
    solarDate: date,
    solarDay,
    solarMonth,
    solarYear,
    lunar,
    canChi,
    hoangDaoHours,
    hyThanDirection: directions.hyThan,
    taiThanDirection: directions.taiThan,
    tuoiXung,
    buddhistEvents,
    isNhiTrai: veg.isNhiTrai,
    isLucTrai: veg.isLucTrai,
    isThapTrai: veg.isThapTrai,
    dhammapada
  };
}
