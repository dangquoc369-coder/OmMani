import React from 'react';
import { X, Smartphone, Mic, Share, PlusSquare, CheckCircle, ShieldCheck, HelpCircle, Cpu, Tablet } from 'lucide-react';

interface IOSGuideModalProps {
  onClose: () => void;
}

export const IOSGuideModal: React.FC<IOSGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#092221] border border-[#dfb15b]/40 rounded-3xl p-5 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#dfb15b]/20">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#dfb15b]" />
            <h3 className="font-serif-sacred text-base sm:text-lg font-bold text-[#faeed1]">
              Hướng Dẫn iPhone & iPad (Safari PWA)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#9fb8b5] hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 my-3 pr-1 text-xs text-[#cfdcda]">
          {/* Section 1: Home Screen PWA Mic Fix */}
          <div className="p-3.5 rounded-2xl bg-[#061615] border border-[#dfb15b]/30">
            <h4 className="text-sm font-bold text-[#dfb15b] flex items-center gap-1.5 mb-1.5">
              <Cpu className="w-4 h-4" />
              1. Khắc Phục Lỗi Ghi Âm Khi Lưu Vào Màn Hình Chính (PWA)
            </h4>
            <p className="text-[#a2beba] leading-relaxed mb-2">
              Hệ điều hành iOS (Apple) mặc định hạn chế tính năng Siri Web Speech trong các ứng dụng lưu ngoài Màn hình chính (PWA Standalone). 
              <strong> Tu Dưỡng đã tích hợp sẵn Bộ Đếm Micro Nhịp Niệm (VAD)</strong> chạy bằng Web Audio API trực tiếp trên thiết bị của bạn.
            </p>
            <div className="space-y-1.5 bg-[#0b2624] p-2.5 rounded-xl border border-[#dfb15b]/20 text-[11px] text-[#faeed1]">
              <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Hoạt động 100% trên Màn hình chính iPhone & iPad.</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Không cần internet, không gửi giọng nói lên máy chủ của Apple.</span>
              </div>
            </div>
          </div>

          {/* Section 2: How to Add to Home Screen */}
          <div className="p-3.5 rounded-2xl bg-[#061615] border border-[#dfb15b]/25">
            <h4 className="text-sm font-bold text-[#dfb15b] flex items-center gap-1.5 mb-2">
              <PlusSquare className="w-4 h-4" />
              2. Cách Thêm Vào Màn Hình Chính Đúng Cách
            </h4>
            <ol className="space-y-2 list-decimal list-inside text-[#cfdcda] leading-relaxed">
              <li>
                Mở link web trong trình duyệt <strong>Safari</strong> trên iPhone/iPad.
              </li>
              <li className="flex items-center gap-1.5">
                Nhấn vào nút <strong>Chia sẻ (Share)</strong> <Share className="w-3.5 h-3.5 inline text-[#dfb15b]" /> ở thanh công cụ Safari.
              </li>
              <li>
                Cuộn xuống và chọn <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.
              </li>
              <li>
                Nhấn <strong>"Thêm" (Add)</strong>. Ứng dụng "Tu Dưỡng" sẽ xuất hiện toàn màn hình không có thanh địa chỉ!
              </li>
            </ol>
          </div>

          {/* Section 3: Permission Settings */}
          <div className="p-3.5 rounded-2xl bg-[#061615] border border-[#dfb15b]/25">
            <h4 className="text-sm font-bold text-[#dfb15b] flex items-center gap-1.5 mb-2">
              <Mic className="w-4 h-4" />
              3. Cấp Quyền Microphone Cho Safari & Màn Hình Chính
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-[#a2beba]">
              <li>Lần đầu nhấn <strong>"BẮT ĐẦU NIỆM"</strong>, một thông báo <em>"Tu Dưỡng muốn truy cập micrô"</em> sẽ hiện lên &gt; Hãy chọn <strong>Cho phép (Allow)</strong>.</li>
              <li>Nếu lỡ bấm Từ chối: Mở <strong>Cài đặt iPhone &gt; Safari &gt; Micrô</strong> và chuyển sang <strong>Cho phép</strong>.</li>
            </ul>
          </div>

          {/* Section 4: iPad Altar Mode */}
          <div className="p-3.5 rounded-2xl bg-[#061615] border border-[#dfb15b]/25">
            <h4 className="text-sm font-bold text-[#dfb15b] flex items-center gap-1.5 mb-2">
              <Tablet className="w-4 h-4" />
              4. Tối Ưu Cho iPad & Bàn Thờ / Bàn Tu Tập
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-[#a2beba]">
              <li>Giao diện tự động căn chỉnh tràn viền (Safe Area), hỗ trợ cả iPad xoay ngang và xoay dọc.</li>
              <li>Đặt iPad trên giá đỡ hoặc bàn thờ, tính năng <strong>Giữ màn hình luôn sáng (Wake Lock)</strong> trong Cài đặt sẽ giúp màn hình không bị tắt trong suốt khóa lễ.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#dfb15b]/15 text-right">
          <button
            onClick={onClose}
            className="bg-[#dfb15b] hover:bg-[#caa04b] text-[#071716] font-bold text-xs px-5 py-2.5 rounded-xl transition shadow"
          >
            Đã Hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
