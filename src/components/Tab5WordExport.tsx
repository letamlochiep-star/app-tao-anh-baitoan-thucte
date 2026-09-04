import React, { useRef, useState } from 'react';
import {
  FileText,
  Download,
  Share2,
  Upload,
  FileCode,
  Image,
  CheckCircle2,
  Sparkles,
  Settings
} from 'lucide-react';
import saveAs from 'file-saver';
import JSZip from 'jszip';
import { ProblemItem, WordExportOptions } from '../types';
import { exportToWord } from '../utils/wordExport';
import { safeJsonStringify } from '../utils/jsonUtils';
import { BRANDING_DEFAULT } from '../constants';

interface Tab5WordExportProps {
  problems: ProblemItem[];
  onImportJson: (importedProblems: ProblemItem[]) => void;
}

export const Tab5WordExport: React.FC<Tab5WordExportProps> = ({
  problems,
  onImportJson,
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [exportOptions, setExportOptions] = useState<WordExportOptions>({
    documentTitle: '10 BÀI TOÁN THỰC TẾ VÀ LỜI GIẢI CHI TIẾT',
    subject: 'Toán học',
    grade: 'Lớp 9 / THCS',
    topic: 'Giải bài toán bằng cách lập phương trình',
    authorName: 'Thầy Tâm',
    workUnit: 'Trường THCS & THPT',
    includeCoverPage: true,
    includeTOC: false,
    exportMode: 'full',
    oneQuestionPerPage: false,
    hideAnswers: false,
    hideSolutions: false,
    includeTikZ: true,
    includeImagePrompts: true,
    includeRawLatex: true,
    includeCommonMistakes: true,
    includeBranding: true,
    insertGeneratedImages: true,
    insertImagePlaceholders: true,
  });

  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportWord = async () => {
    if (!problems || problems.length === 0) {
      alert('Chưa có danh sách bài toán để xuất file Word.');
      return;
    }

    if (isExporting) return;

    setExportError(null);
    setIsExporting(true);

    try {
      await exportToWord(problems, exportOptions);
    } catch (err: any) {
      console.error('Lỗi xuất file Word:', err);
      const msg = err?.message || 'Không thể xuất file Word. Vui lòng kiểm tra lại dữ liệu.';
      setExportError(msg);
      alert(`Lỗi xuất file Word: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = safeJsonStringify(problems, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    saveAs(blob, `10_bai_toan_thuc_te_${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportJson(parsed);
          alert('Nhập dữ liệu JSON thành công!');
        } else if (parsed.problems && Array.isArray(parsed.problems)) {
          onImportJson(parsed.problems);
          alert('Nhập dữ liệu JSON thành công!');
        } else {
          alert('File JSON không đúng cấu trúc danh sách bài toán.');
        }
      } catch (err) {
        alert('Lỗi đọc file JSON. Vui lòng kiểm tra file.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportPromptsTxt = () => {
    let txt = `====================================================\n`;
    txt += `CÂU LỆNH TẠO HÌNH MINH HỌA 10 BÀI TOÁN THỰC TẾ\n`;
    txt += `====================================================\n\n`;

    problems.forEach((p) => {
      txt += `=== HÌNH ẢNH CÂU ${p.id}: ${p.imageTitle || p.title} ===\n`;
      txt += `Prompt: ${p.imagePrompt}\n`;
      txt += `Negative Prompt: ${p.negativePrompt}\n\n`;
    });

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, '10_Image_Prompts_Bai_Toan_Thuc_Te.txt');
  };

  const handleExportTikzZip = async () => {
    const zip = new JSZip();
    problems.forEach((p) => {
      if (p.tikzCode) {
        zip.file(`Cau_${p.id}_TikZ.tex`, p.tikzCode);
      }
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, '10_Ma_TikZ_Overleaf.zip');
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in max-w-5xl mx-auto">
      {/* Prominent Export Button Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-8 text-white rounded-lg border border-slate-800 shadow-md space-y-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-sans font-bold uppercase tracking-wider bg-blue-600 text-white rounded mb-2 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" /> Xuất Tài Liệu Word Chuẩn .DOCX
            </span>
            <h2 className="text-xl sm:text-2xl font-sans font-bold tracking-tight text-white">
              XUẤT TOÀN BỘ 10 BÀI TOÁN & LỜI GIẢI SANG WORD
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1 font-sans">
              File Word chứa đầy đủ công thức LaTeX, hình ảnh minh họa, câu lệnh prompt, mã TikZ Overleaf và đáp án chi tiết.
            </p>
          </div>

          <button
            onClick={handleExportWord}
            disabled={isExporting || !problems.length}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-xs sm:text-sm font-sans font-bold uppercase tracking-wider rounded bg-blue-600 text-white hover:bg-blue-500 border border-blue-400 shadow-lg transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Download className="w-5 h-5 text-white" />
            {isExporting ? 'ĐANG TẠO FILE WORD...' : 'XUẤT TOÀN BỘ THÀNH FILE WORD'}
          </button>
        </div>
      </div>

      {/* Cover Page Details Form */}
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-base font-sans font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            THÔNG TIN TRANG BÌA FILE WORD
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">Tùy chỉnh thông tin người tạo và tiêu đề trang bìa tài liệu</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans">
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">
              Tên tài liệu
            </label>
            <input
              type="text"
              value={exportOptions.documentTitle}
              onChange={(e) => setExportOptions({ ...exportOptions, documentTitle: e.target.value })}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#1A1A1A] dark:text-[#EAE8E3] mb-1">
              Môn học
            </label>
            <input
              type="text"
              value={exportOptions.subject}
              onChange={(e) => setExportOptions({ ...exportOptions, subject: e.target.value })}
              className="w-full px-3 py-2 border border-[#1A1A1A]/20 dark:border-stone-700 bg-white dark:bg-[#141413] text-[#1A1A1A] dark:text-[#EAE8E3]"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#1A1A1A] dark:text-[#EAE8E3] mb-1">
              Lớp / Khối
            </label>
            <input
              type="text"
              value={exportOptions.grade}
              onChange={(e) => setExportOptions({ ...exportOptions, grade: e.target.value })}
              className="w-full px-3 py-2 border border-[#1A1A1A]/20 dark:border-stone-700 bg-white dark:bg-[#141413] text-[#1A1A1A] dark:text-[#EAE8E3]"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#1A1A1A] dark:text-[#EAE8E3] mb-1">
              Chủ đề bài tập
            </label>
            <input
              type="text"
              value={exportOptions.topic}
              onChange={(e) => setExportOptions({ ...exportOptions, topic: e.target.value })}
              className="w-full px-3 py-2 border border-[#1A1A1A]/20 dark:border-stone-700 bg-white dark:bg-[#141413] text-[#1A1A1A] dark:text-[#EAE8E3]"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#1A1A1A] dark:text-[#EAE8E3] mb-1">
              Họ tên tác giả / Giáo viên
            </label>
            <input
              type="text"
              value={exportOptions.authorName}
              onChange={(e) => setExportOptions({ ...exportOptions, authorName: e.target.value })}
              placeholder="Ví dụ: Thầy Tâm"
              className="w-full px-3 py-2 border border-[#1A1A1A]/20 dark:border-stone-700 bg-white dark:bg-[#141413] text-[#1A1A1A] dark:text-[#EAE8E3]"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#1A1A1A] dark:text-[#EAE8E3] mb-1">
              Đơn vị công tác
            </label>
            <input
              type="text"
              value={exportOptions.workUnit}
              onChange={(e) => setExportOptions({ ...exportOptions, workUnit: e.target.value })}
              placeholder="Để trống nếu không cần"
              className="w-full px-3 py-2 border border-[#1A1A1A]/20 dark:border-stone-700 bg-white dark:bg-[#141413] text-[#1A1A1A] dark:text-[#EAE8E3]"
            />
          </div>
        </div>
      </div>

      {/* Export Checkboxes Options (Section XV.3 requirement) */}
      <div className="bg-white dark:bg-[#1E1D1B] p-6 shadow-xs border border-[#1A1A1A]/15 dark:border-stone-800 space-y-4">
        <div className="border-b border-[#1A1A1A]/10 dark:border-stone-800 pb-3">
          <h3 className="text-base font-serif-display font-bold text-[#1A1A1A] dark:text-[#EAE8E3] flex items-center gap-2">
            <Settings className="w-4 h-4 text-red-800" />
            TÙY CHỌN NỘI DUNG XUẤT WORD
          </h3>
          <p className="text-xs text-[#1A1A1A]/60 dark:text-[#EAE8E3]/60 font-sans">Bật/Tắt các phần muốn đưa vào file Word</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-sans">
          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#F7F5F2] dark:hover:bg-stone-800">
            <input
              type="checkbox"
              checked={exportOptions.includeCoverPage}
              onChange={(e) => setExportOptions({ ...exportOptions, includeCoverPage: e.target.checked })}
              className="accent-red-800"
            />
            <span className="font-semibold text-[#1A1A1A] dark:text-[#EAE8E3]">Tạo trang bìa tài liệu</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#F7F5F2] dark:hover:bg-stone-800">
            <input
              type="checkbox"
              checked={exportOptions.oneQuestionPerPage}
              onChange={(e) => setExportOptions({ ...exportOptions, oneQuestionPerPage: e.target.checked })}
              className="accent-red-800"
            />
            <span className="font-semibold text-[#1A1A1A] dark:text-[#EAE8E3]">Mỗi câu một trang riêng</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#F7F5F2] dark:hover:bg-stone-800">
            <input
              type="checkbox"
              checked={exportOptions.includeRawLatex}
              onChange={(e) => setExportOptions({ ...exportOptions, includeRawLatex: e.target.checked })}
              className="accent-red-800"
            />
            <span className="font-semibold text-[#1A1A1A] dark:text-[#EAE8E3]">Đưa mã LaTeX gốc vào Word</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#F7F5F2] dark:hover:bg-stone-800">
            <input
              type="checkbox"
              checked={exportOptions.includeImagePrompts}
              onChange={(e) => setExportOptions({ ...exportOptions, includeImagePrompts: e.target.checked })}
              className="accent-red-800"
            />
            <span className="font-semibold text-[#1A1A1A] dark:text-[#EAE8E3]">Đưa câu lệnh tạo ảnh minh họa</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#F7F5F2] dark:hover:bg-stone-800">
            <input
              type="checkbox"
              checked={exportOptions.includeTikZ}
              onChange={(e) => setExportOptions({ ...exportOptions, includeTikZ: e.target.checked })}
              className="accent-red-800"
            />
            <span className="font-semibold text-[#1A1A1A] dark:text-[#EAE8E3]">Đưa mã TikZ Overleaf</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#F7F5F2] dark:hover:bg-stone-800">
            <input
              type="checkbox"
              checked={exportOptions.includeCommonMistakes}
              onChange={(e) => setExportOptions({ ...exportOptions, includeCommonMistakes: e.target.checked })}
              className="accent-red-800"
            />
            <span className="font-semibold text-[#1A1A1A] dark:text-[#EAE8E3]">Đưa phân tích lỗi học sinh hay mắc</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#F7F5F2] dark:hover:bg-stone-800">
            <input
              type="checkbox"
              checked={exportOptions.hideAnswers}
              onChange={(e) => setExportOptions({ ...exportOptions, hideAnswers: e.target.checked })}
              className="accent-red-800"
            />
            <span className="font-semibold text-[#1A1A1A] dark:text-[#EAE8E3]">Ẩn đáp số trong file Word</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#F7F5F2] dark:hover:bg-stone-800">
            <input
              type="checkbox"
              checked={exportOptions.hideSolutions}
              onChange={(e) => setExportOptions({ ...exportOptions, hideSolutions: e.target.checked })}
              className="accent-red-800"
            />
            <span className="font-semibold text-[#1A1A1A] dark:text-[#EAE8E3]">Ẩn hướng dẫn giải chi tiết (chỉ lấy đề)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#F7F5F2] dark:hover:bg-stone-800">
            <input
              type="checkbox"
              checked={exportOptions.includeBranding}
              onChange={(e) => setExportOptions({ ...exportOptions, includeBranding: e.target.checked })}
              className="accent-red-800"
            />
            <span className="font-semibold text-[#1A1A1A] dark:text-[#EAE8E3]">Ghi dòng thương hiệu "{BRANDING_DEFAULT}"</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[#F7F5F2] dark:hover:bg-stone-800">
            <input
              type="checkbox"
              checked={exportOptions.insertImagePlaceholders}
              onChange={(e) => setExportOptions({ ...exportOptions, insertImagePlaceholders: e.target.checked })}
              className="accent-red-800"
            />
            <span className="font-semibold text-[#1A1A1A] dark:text-[#EAE8E3]">Tạo khung ảnh nếu chưa có hình</span>
          </label>
        </div>
      </div>

      {/* Additional Export & Import Tools */}
      <div className="bg-white dark:bg-[#1E1D1B] p-6 shadow-xs border border-[#1A1A1A]/15 dark:border-stone-800 space-y-4 font-sans">
        <div className="border-b border-[#1A1A1A]/10 dark:border-stone-800 pb-3">
          <h3 className="text-base font-serif-display font-bold text-[#1A1A1A] dark:text-[#EAE8E3] flex items-center gap-2">
            <Share2 className="w-4 h-4 text-red-800" />
            LƯU TRỮ, LƯU DỰ PHÒNG & XUẤT ĐỊNH DẠNG KHÁC
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] bg-[#1A1A1A] text-white hover:bg-black transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Xuất dữ liệu 10 câu (JSON)
          </button>

          <input
            type="file"
            ref={jsonInputRef}
            onChange={handleImportJsonFile}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] border border-[#1A1A1A]/20 dark:border-stone-700 text-[#1A1A1A] dark:text-[#EAE8E3] hover:bg-[#1A1A1A]/5"
          >
            <Upload className="w-3.5 h-3.5" />
            Nhập file JSON đã lưu
          </button>

          <button
            onClick={handleExportPromptsTxt}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] border border-[#1A1A1A]/20 dark:border-stone-700 text-[#1A1A1A] dark:text-[#EAE8E3] hover:bg-[#1A1A1A]/5"
          >
            <FileText className="w-3.5 h-3.5" />
            Xuất câu lệnh ảnh (.TXT)
          </button>

          <button
            onClick={handleExportTikzZip}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] border border-[#1A1A1A]/20 dark:border-stone-700 text-[#1A1A1A] dark:text-[#EAE8E3] hover:bg-[#1A1A1A]/5"
          >
            <FileCode className="w-3.5 h-3.5" />
            Xuất ZIP mã TikZ (.tex)
          </button>
        </div>
      </div>
    </div>
  );
};
