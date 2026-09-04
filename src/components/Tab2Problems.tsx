import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Copy,
  Code,
  Edit2,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Image,
  BookOpen,
  Download,
  Share2,
  Sparkles,
  Cpu
} from 'lucide-react';
import { ProblemItem } from '../types';
import { MathText } from '../utils/latex';

interface Tab2ProblemsProps {
  problems: ProblemItem[];
  showAnswers: boolean;
  onToggleShowAnswers: () => void;
  onToggleLock: (id: number) => void;
  onUpdateProblem: (updated: ProblemItem) => void;
  onRegenerateOne: (id: number) => void;
  onRegenerateUnlocked: () => void;
  onNavigateToTab: (tab: 'images' | 'solutions' | 'export') => void;
  onExportJson: () => void;
  isGenerating: boolean;
}

export const Tab2Problems: React.FC<Tab2ProblemsProps> = ({
  problems,
  showAnswers,
  onToggleShowAnswers,
  onToggleLock,
  onUpdateProblem,
  onRegenerateOne,
  onRegenerateUnlocked,
  onNavigateToTab,
  onExportJson,
  isGenerating,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editProblemText, setEditProblemText] = useState('');
  const [showRawLatexId, setShowRawLatexId] = useState<number | null>(null);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStatus(label);
    setTimeout(() => setCopiedStatus(null), 2000);
  };

  const handleStartEdit = (p: ProblemItem) => {
    setEditingId(p.id);
    setEditProblemText(p.problemText);
  };

  const handleSaveEdit = (p: ProblemItem) => {
    onUpdateProblem({ ...p, problemText: editProblemText });
    setEditingId(null);
  };

  const handleCopyAllProblems = () => {
    const text = problems
      .map(
        (p) =>
          `CÂU ${p.id}: ${p.title}\n${p.problemText}${
            p.answerOptions && p.answerOptions.length > 0
              ? '\n' + p.answerOptions.map((o, i) => `${['A', 'B', 'C', 'D', 'E'][i]}. ${o}`).join('\n')
              : ''
          }\n`
      )
      .join('\n----------------------------------------\n');
    copyToClipboard(text, 'Đã sao chép 10 đề');
  };

  const handleCopyAllLatex = () => {
    const text = problems.map((p) => `% CÂU ${p.id}\n${p.latexProblemText || p.problemText}`).join('\n\n');
    copyToClipboard(text, 'Đã sao chép mã LaTeX');
  };

  if (!problems || problems.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0F172A] p-12 text-center space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 my-8 shadow-sm">
        <Sparkles className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto" />
        <h3 className="text-xl font-sans font-bold text-slate-900 dark:text-slate-100">
          Chưa có bài toán tương tự nào
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto font-sans">
          Vui lòng quay lại Tab 1 ("NHẬP ĐỀ BÀI") để nhập đề toán gốc và bấm "TẠO 10 BÀI TƯƠNG TỰ".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Top Action Toolbar */}
      <div className="bg-[#F8FAFC]/95 dark:bg-[#0B0F19]/95 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 sticky top-[120px] z-10 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700">
            Tổng cộng: {problems.length}/10 bài toán
          </span>
          {copiedStatus && (
            <span className="text-xs font-sans font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-800 animate-fade-in uppercase tracking-wider">
              ✓ {copiedStatus}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleShowAnswers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {showAnswers ? <EyeOff className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" /> : <Eye className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />}
            {showAnswers ? "Ẩn đáp án" : "Hiện đáp án"}
          </button>

          <button
            onClick={handleCopyAllProblems}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            Sao chép 10 đề
          </button>

          <button
            onClick={handleCopyAllLatex}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <Code className="w-3.5 h-3.5" />
            Sao chép LaTeX
          </button>

          <button
            onClick={onRegenerateUnlocked}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            Tạo lại câu chưa khóa
          </button>

          <button
            onClick={() => onNavigateToTab('export')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider rounded bg-blue-700 text-white hover:bg-blue-800 border border-blue-800 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            XUẤT WORD CHUẨN
          </button>
        </div>
      </div>

      {/* 10 Problem Cards Grid */}
      <div className="space-y-6">
        {problems.map((p) => {
          const isEditing = editingId === p.id;
          const showRawLatex = showRawLatexId === p.id;

          return (
            <div
              key={p.id}
              className={`bg-white dark:bg-[#0F172A] p-6 rounded-lg shadow-sm border transition-all duration-200 ${
                p.isLocked
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50/20 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded bg-blue-900 text-white dark:bg-blue-600 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    C{p.id < 10 ? `0${p.id}` : p.id}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-sans font-bold text-slate-900 dark:text-slate-100">
                        {p.title || `Bài toán thực tế số ${p.id}`}
                      </h3>

                      {/* AI Model Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <Cpu className="w-3 h-3 text-blue-600" />
                        {p.modelUsed || 'gemini-3.6-flash'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs font-sans">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Mức độ: {p.difficulty}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="font-bold text-blue-700 dark:text-blue-400">
                        Ngữ cảnh: {p.context}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Dạng: {p.questionType}</span>
                    </div>
                  </div>
                </div>

                {/* Lock / Unlock Toggle */}
                <button
                  onClick={() => onToggleLock(p.id)}
                  title={p.isLocked ? "Mở khóa câu này" : "Khóa câu này lại (không bị đổi khi tạo lại toàn bộ)"}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-bold uppercase tracking-wider rounded border transition-colors cursor-pointer ${
                    p.isLocked
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-400'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.isLocked ? <Lock className="w-3.5 h-3.5 text-amber-700" /> : <Unlock className="w-3.5 h-3.5" />}
                  {p.isLocked ? "Đã khóa câu" : "Mở khóa câu"}
                </button>
              </div>

              {/* Problem Statement Body */}
              <div className="space-y-4">
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editProblemText}
                      onChange={(e) => setEditProblemText(e.target.value)}
                      rows={4}
                      className="w-full p-3 rounded border border-blue-600 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-hidden font-sans"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-xs font-sans font-bold uppercase text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => handleSaveEdit(p)}
                        className="px-3 py-1.5 text-xs font-sans font-bold uppercase rounded bg-blue-700 text-white hover:bg-blue-800 border border-blue-800 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 inline mr-1" />
                        Lưu chỉnh sửa
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm sm:text-base leading-relaxed text-slate-900 dark:text-slate-100 font-sans">
                    <MathText content={p.problemText} />
                  </div>
                )}

                {/* Answer Options if Multiple Choice */}
                {p.answerOptions && p.answerOptions.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {p.answerOptions.map((opt, oIdx) => {
                      const labels = ['A', 'B', 'C', 'D', 'E'];
                      const label = labels[oIdx] || `${oIdx + 1}`;
                      const isCorrect = showAnswers && (p.correctOption === label || p.correctOption?.startsWith(label));
                      return (
                        <div
                          key={oIdx}
                          className={`p-3 rounded border text-xs sm:text-sm font-medium transition-colors ${
                            isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-900 dark:text-emerald-200 font-bold'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <span className="font-bold mr-1.5 text-blue-700 dark:text-blue-400 font-sans">{label}.</span>
                          <MathText content={opt} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Show Answer Display */}
                {showAnswers && (
                  <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs font-sans font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                    <span>ĐÁP SỐ: </span>
                    <span>{p.finalAnswer || p.correctOption}</span>
                  </div>
                )}

                {/* Raw LaTeX View */}
                {showRawLatex && (
                  <div className="p-3 rounded bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto space-y-1">
                    <div className="text-blue-400 font-bold text-[10px] uppercase tracking-widest">Mã LaTeX câu {p.id}:</div>
                    <code>{p.latexProblemText || p.problemText}</code>
                  </div>
                )}
              </div>

              {/* Per-Card Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => copyToClipboard(p.problemText, `Đã sao chép Câu ${p.id}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-sans font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Sao chép đề
                  </button>

                  <button
                    onClick={() => copyToClipboard(p.latexProblemText || p.problemText, `Đã sao chép LaTeX Câu ${p.id}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-sans font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                    Sao chép LaTeX
                  </button>

                  <button
                    onClick={() => setShowRawLatexId(showRawLatex ? null : p.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-sans font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {showRawLatex ? "Ẩn LaTeX" : "Xem mã LaTeX"}
                  </button>

                  <button
                    onClick={() => handleStartEdit(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-sans font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Chỉnh sửa
                  </button>

                  <button
                    onClick={() => onRegenerateOne(p.id)}
                    disabled={isGenerating || p.isLocked}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-sans font-semibold rounded bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tạo lại câu này
                  </button>
                </div>

                {/* Quick Navigation Links */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onNavigateToTab('solutions')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-sans font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Xem lời giải
                  </button>
                  <button
                    onClick={() => onNavigateToTab('images')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-sans font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Image className="w-3.5 h-3.5" />
                    Hình & TikZ
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white dark:bg-[#0F172A] p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerateUnlocked}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-sans font-bold uppercase tracking-wider rounded bg-blue-700 text-white hover:bg-blue-800 border border-blue-800 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tạo lại các câu chưa khóa
          </button>
          <button
            onClick={onExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-sans font-semibold uppercase tracking-wider rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            Xuất JSON
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab('images')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-sans font-semibold uppercase tracking-wider rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Image className="w-3.5 h-3.5" />
            Chuyển đến Hình ảnh
          </button>
          <button
            onClick={() => onNavigateToTab('solutions')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-sans font-semibold uppercase tracking-wider rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Chuyển đến Lời giải
          </button>
          <button
            onClick={() => onNavigateToTab('export')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-sans font-bold uppercase tracking-wider rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất file Word
          </button>
        </div>
      </div>
    </div>
  );
};
