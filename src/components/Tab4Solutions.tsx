import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Copy,
  BookOpen,
  Eye,
  EyeOff,
  Lightbulb,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download
} from 'lucide-react';
import { ProblemItem } from '../types';
import { MathText } from '../utils/latex';

interface Tab4SolutionsProps {
  problems: ProblemItem[];
  showAnswers: boolean;
  onToggleShowAnswers: () => void;
  onNavigateToTab?: (tab: 'export') => void;
}

export type SolutionViewMode =
  | 'detailed'
  | 'basic'
  | 'hints'
  | 'answerOnly'
  | 'teacher'
  | 'student';

export const Tab4Solutions: React.FC<Tab4SolutionsProps> = ({
  problems,
  showAnswers,
  onToggleShowAnswers,
  onNavigateToTab,
}) => {
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<SolutionViewMode>('detailed');
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  const toggleAccordion = (id: number) => {
    if (openIds.includes(id)) {
      setOpenIds(openIds.filter((i) => i !== id));
    } else {
      setOpenIds([...openIds, id]);
    }
  };

  const handleOpenAll = () => setOpenIds(problems.map((p) => p.id));
  const handleCloseAll = () => setOpenIds([]);

  const copySolution = (p: ProblemItem) => {
    let text = `LỜI GIẢI CÂU ${p.id}: ${p.title}\n\n`;
    text += `1. Hướng dẫn giải chi tiết:\n${p.solutionSteps.map((s, idx) => `Bước ${idx + 1}: ${s}`).join('\n')}\n\n`;
    text += `2. Đáp số: ${p.finalAnswer || p.correctOption}\n`;
    if (p.verificationMethod) text += `3. Kiểm tra lại: ${p.verificationMethod}\n`;
    if (p.commonMistakes?.length) text += `4. Lỗi thường mắc: ${p.commonMistakes.join('; ')}\n`;

    navigator.clipboard.writeText(text);
    setCopiedStatus(`Đã sao chép lời giải Câu ${p.id}`);
    setTimeout(() => setCopiedStatus(null), 2000);
  };

  if (!problems || problems.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0F172A] p-12 text-center space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 my-8 shadow-sm">
        <BookOpen className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto" />
        <h3 className="text-xl font-sans font-bold text-slate-900 dark:text-slate-100">
          Chưa có lời giải chi tiết
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto font-sans">
          Vui lòng tạo 10 bài toán ở Tab 1 trước.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Solution Toolbar */}
      <div className="bg-[#F8FAFC]/95 dark:bg-[#0B0F19]/95 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 sticky top-[120px] z-10 backdrop-blur-md shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector */}
          <span className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Chế độ hiển thị:</span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as SolutionViewMode)}
            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-xs font-sans font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="detailed">Lời giải chi tiết đầy đủ</option>
            <option value="basic">Lời giải cơ bản</option>
            <option value="hints">Gợi ý ngắn</option>
            <option value="answerOnly">Chỉ đáp số</option>
            <option value="teacher">Dành cho Giáo viên</option>
            <option value="student">Dành cho Học sinh</option>
          </select>

          {copiedStatus && (
            <span className="text-xs font-sans font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-900/10 px-2.5 py-1 border border-emerald-800/30 uppercase tracking-wider">
              ✓ {copiedStatus}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAll}
            className="px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider border border-[#1A1A1A]/20 dark:border-stone-700 text-[#1A1A1A] dark:text-[#EAE8E3] hover:bg-[#1A1A1A]/5"
          >
            Mở toàn bộ 10 câu
          </button>
          <button
            onClick={handleCloseAll}
            className="px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider border border-[#1A1A1A]/20 dark:border-stone-700 text-[#1A1A1A] dark:text-[#EAE8E3] hover:bg-[#1A1A1A]/5"
          >
            Đóng toàn bộ
          </button>
          <button
            onClick={onToggleShowAnswers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider bg-red-800/10 text-red-800 dark:text-red-300 border border-red-800/30 hover:bg-red-800 hover:text-white transition-colors"
          >
            {showAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showAnswers ? 'Ẩn đáp số' : 'Hiện đáp số'}
          </button>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('export')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider bg-red-800 text-white hover:bg-red-900 border border-red-900 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Tải File Word
            </button>
          )}
        </div>
      </div>

      {/* Accordion Solutions List */}
      <div className="space-y-4">
        {problems.map((p) => {
          const isOpen = openIds.includes(p.id);

          return (
            <div
              key={p.id}
              className="bg-white dark:bg-[#1E1D1B] border border-[#1A1A1A]/15 dark:border-stone-800 overflow-hidden shadow-xs transition-all"
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleAccordion(p.id)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F7F5F2] dark:hover:bg-stone-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-[#1A1A1A] dark:bg-[#EAE8E3] text-white dark:text-[#141413] font-serif font-bold text-xs flex items-center justify-center shrink-0">
                    C{p.id < 10 ? `0${p.id}` : p.id}
                  </span>
                  <div>
                    <h3 className="text-base font-serif-display font-bold text-[#1A1A1A] dark:text-[#EAE8E3]">
                      Lời giải Câu {p.id}: {p.title || `Bài toán thực tế`}
                    </h3>
                    <p className="text-xs font-sans text-[#1A1A1A]/60 dark:text-[#EAE8E3]/60 font-medium">
                      Đáp số: <span className="font-bold text-red-800 dark:text-red-400">{p.finalAnswer || p.correctOption}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-sans">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/60 dark:text-[#EAE8E3]/60">
                    {isOpen ? 'Thu gọn' : 'Xem lời giải'}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-[#1A1A1A]/60 dark:text-[#EAE8E3]/60" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#1A1A1A]/60 dark:text-[#EAE8E3]/60" />
                  )}
                </div>
              </button>

              {/* Accordion Body */}
              {isOpen && (
                <div className="p-5 border-t border-[#1A1A1A]/10 dark:border-stone-800 bg-[#F7F5F2]/40 dark:bg-[#141413]/40 space-y-5 animate-fade-in">
                  {/* Problem text reminder */}
                  <div className="p-4 bg-white dark:bg-[#1E1D1B] border border-[#1A1A1A]/15 dark:border-stone-800 text-xs sm:text-sm text-[#1A1A1A] dark:text-[#EAE8E3]">
                    <span className="font-serif-display font-bold text-[#1A1A1A] dark:text-[#EAE8E3] block mb-1">ĐỀ BÀI:</span>
                    <MathText content={p.problemText} />
                  </div>

                  {/* Mode: Answer Only */}
                  {viewMode === 'answerOnly' && (
                    <div className="p-4 bg-red-900/5 dark:bg-red-950/40 border border-red-800/30 text-red-900 dark:text-red-200 font-sans font-bold text-sm tracking-wider uppercase">
                      ĐÁP SỐ CHÍNH XÁC: {p.finalAnswer || p.correctOption}
                    </div>
                  )}

                  {/* Mode: Hints */}
                  {viewMode === 'hints' && (
                    <div className="space-y-2 p-4 bg-red-900/5 dark:bg-red-950/40 border border-red-800/30 text-xs font-sans text-red-900 dark:text-red-200">
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                        <Lightbulb className="w-4 h-4 text-red-800" />
                        <span>GỢI Ý GIẢI:</span>
                      </div>
                      <p className="leading-relaxed">{p.solutionSummary || p.solutionSteps?.[0]}</p>
                      <p className="font-bold pt-1">Đáp số: {p.finalAnswer}</p>
                    </div>
                  )}

                  {/* Mode: Detailed / Basic / Teacher / Student */}
                  {(viewMode === 'detailed' ||
                    viewMode === 'basic' ||
                    viewMode === 'teacher' ||
                    viewMode === 'student') && (
                    <div className="space-y-5 text-xs sm:text-sm text-[#1A1A1A] dark:text-[#EAE8E3]">
                      {/* 1. Problem Analysis */}
                      <div className="space-y-1">
                        <h4 className="font-sans font-bold text-red-800 dark:text-red-400 uppercase text-[10px] tracking-[0.2em]">
                          1. Phân tích đề toán
                        </h4>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-[#1A1A1A]/80 dark:text-[#EAE8E3]/80 font-sans">
                          <li><strong>Dữ kiện cho:</strong> {p.givenData?.join(', ') || 'Đã cho trong đề bài'}</li>
                          <li><strong>Đại lượng tìm:</strong> {p.requiredResult || 'Chiều dài, chiều rộng'}</li>
                          <li><strong>Đơn vị:</strong> {p.units?.join(', ') || 'm, m^2'}</li>
                        </ul>
                      </div>

                      {/* 2. Formulas */}
                      {p.latexFormulas && p.latexFormulas.length > 0 && (
                        <div className="space-y-1">
                          <h4 className="font-sans font-bold text-red-800 dark:text-red-400 uppercase text-[10px] tracking-[0.2em]">
                            2. Công thức toán học sử dụng
                          </h4>
                          <div className="p-3 bg-white dark:bg-[#1E1D1B] border border-[#1A1A1A]/15 dark:border-stone-800 font-mono text-xs">
                            {p.latexFormulas.map((f, fIdx) => (
                              <MathText key={fIdx} content={f} block />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Detailed Step-by-Step Solution */}
                      <div className="space-y-2">
                        <h4 className="font-sans font-bold text-red-800 dark:text-red-400 uppercase text-[10px] tracking-[0.2em]">
                          3. Hướng dẫn giải chi tiết
                        </h4>
                        <div className="space-y-2.5">
                          {p.solutionSteps && p.solutionSteps.length > 0 ? (
                            p.solutionSteps.map((step, sIdx) => (
                              <div
                                key={sIdx}
                                className="p-3 bg-white dark:bg-[#1E1D1B] border border-[#1A1A1A]/15 dark:border-stone-800 space-y-1"
                              >
                                <span className="font-sans font-bold text-xs text-red-800 dark:text-red-400 block uppercase tracking-wider">
                                  Bước {sIdx + 1}:
                                </span>
                                <MathText content={step} />
                              </div>
                            ))
                          ) : (
                            <MathText content={p.solutionSummary} />
                          )}
                        </div>
                      </div>

                      {/* 4. Final Answer Box */}
                      <div className="p-4 bg-emerald-900/10 dark:bg-emerald-950/60 border border-emerald-800/40 text-emerald-900 dark:text-emerald-200 font-sans font-bold text-sm sm:text-base flex items-center justify-between">
                        <span>ĐÁP SỐ CHÍNH XÁC:</span>
                        <span className="text-base sm:text-lg font-extrabold text-emerald-800 dark:text-emerald-300">
                          {p.finalAnswer || p.correctOption}
                        </span>
                      </div>

                      {/* 5. Result Verification */}
                      {p.verificationMethod && (
                        <div className="p-3.5 bg-[#F7F5F2] dark:bg-[#141413] border border-[#1A1A1A]/15 dark:border-stone-800 space-y-1 text-xs font-sans text-[#1A1A1A] dark:text-[#EAE8E3]">
                          <span className="font-bold flex items-center gap-1 uppercase tracking-wider text-red-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-red-800" />
                            Kiểm tra kết quả:
                          </span>
                          <p>{p.verificationMethod}</p>
                        </div>
                      )}

                      {/* 6. Common Student Mistakes & Remedies */}
                      {p.commonMistakes && p.commonMistakes.length > 0 && (
                        <div className="p-3.5 bg-red-900/5 dark:bg-red-950/40 border border-red-800/30 space-y-1 text-xs font-sans text-red-900 dark:text-red-200">
                          <span className="font-bold flex items-center gap-1 text-red-800 dark:text-red-300 uppercase tracking-wider">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-800" />
                            Lỗi học sinh thường mắc & Cách khắc phục:
                          </span>
                          <ul className="list-disc list-inside space-y-1 pt-1">
                            {p.commonMistakes.map((m, mIdx) => (
                              <li key={mIdx}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Solution Card Footer */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => copySolution(p)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-sans font-bold uppercase tracking-[0.12em] bg-[#1A1A1A] text-white dark:bg-[#EAE8E3] dark:text-[#141413]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Sao chép lời giải Câu {p.id}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
