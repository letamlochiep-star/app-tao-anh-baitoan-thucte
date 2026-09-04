import React from 'react';
import { X, CheckCircle2, ShieldAlert } from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: "Lấy Gemini API Key miễn phí",
      desc: "Truy cập Google AI Studio (aistudio.google.com/app/apikey) đăng nhập tài khoản Google và tạo một API Key mới hoàn toàn miễn phí."
    },
    {
      step: 2,
      title: "Cấu hình API Key trong ứng dụng",
      desc: "Bấm nút 'CẤU HÌNH API KEY' góc trên bên phải, dán API key của bạn vào ô và bấm 'Kiểm tra kết nối' để xác nhận."
    },
    {
      step: 3,
      title: "Nhập bài toán gốc",
      desc: "Dán đề bài toán gốc dạng văn bản/LaTeX hoặc tải file Word (.docx), file PDF, file ảnh chứa đề toán để hệ thống tự động trích xuất."
    },
    {
      step: 4,
      title: "Tùy chỉnh thông tin & ngữ cảnh thực tế",
      desc: "Chọn khối lớp (6-12), chủ đề toán học, mức độ phân hóa, dạng câu hỏi, ngữ cảnh thực tế (Nông nghiệp, Mua bán, Giao thông, Kiến trúc...)."
    },
    {
      step: 5,
      title: "Tạo 10 bài tương tự",
      desc: "Bấm nút 'TẠO 10 BÀI TƯƠNG TỰ'. AI sẽ tự động phân tích cấu trúc, kiểm tra đáp số độc lập và tạo đúng 10 bài toán thực tế có độ chuẩn xác cao."
    },
    {
      step: 6,
      title: "Xem kết quả & Xuất file Word",
      desc: "Xem 10 bài toán, hình minh họa, câu lệnh tạo ảnh, mã TikZ biên dịch Overleaf, lời giải chi tiết và bấm 'XUẤT TOÀN BỘ THÀNH FILE WORD'."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
            HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {steps.map((s) => (
            <div
              key={s.step}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {s.step}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {s.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Lưu ý an toàn:</strong> Không chia sẻ API key của bạn cho người khác. Khi sử dụng xong trên máy dùng chung, hãy bấm <strong>"Xóa API key"</strong> trong phần Cấu hình API Key.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
          >
            Đã hiểu, đóng hướng dẫn
          </button>
        </div>
      </div>
    </div>
  );
};
