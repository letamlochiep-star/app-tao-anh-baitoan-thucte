import React, { useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  RotateCcw,
  Trash2,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Search,
  Save,
  Loader2,
  FileCode
} from 'lucide-react';
import { GenerationOptions, SourceAnalysis } from '../types';
import {
  EDUCATION_LEVELS,
  GRADES_THCS,
  GRADES_THPT,
  MATH_TOPICS,
  DIFFICULTY_LEVELS,
  QUESTION_TYPES,
  CONTEXT_PRESETS,
  VARIATION_LEVELS,
  IMAGE_STYLES
} from '../constants';
import { MathText } from '../utils/latex';
import { extractTextFromFile } from '../utils/fileExtractor';

interface Tab1InputProps {
  sourceProblemText: string;
  options: GenerationOptions;
  analysis: SourceAnalysis | null;
  isAnalyzing: boolean;
  isGenerating: boolean;
  progressStep: string;
  progressPercent: number;
  onChangeSourceText: (text: string) => void;
  onChangeOptions: (options: GenerationOptions) => void;
  onAnalyzeProblem: () => void;
  onGenerate10: () => void;
  onLoadSample: () => void;
  onClearData: () => void;
  onSaveDraft: () => void;
  onRestoreDraft: () => void;
  onOpenApiKeyModal: () => void;
  onUpdateAnalysis: (analysis: SourceAnalysis) => void;
}

interface ExtractedFileMeta {
  fileName: string;
  fileType: string;
  fileSizeFormatted: string;
  charCount: number;
  warning?: string;
}

export const Tab1Input: React.FC<Tab1InputProps> = ({
  sourceProblemText,
  options,
  analysis,
  isAnalyzing,
  isGenerating,
  progressStep,
  progressPercent,
  onChangeSourceText,
  onChangeOptions,
  onAnalyzeProblem,
  onGenerate10,
  onLoadSample,
  onClearData,
  onSaveDraft,
  onRestoreDraft,
  onOpenApiKeyModal,
  onUpdateAnalysis,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [customContextInput, setCustomContextInput] = useState('');

  // File Extraction State
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState('');
  const [fileMeta, setFileMeta] = useState<ExtractedFileMeta | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // File upload handler supporting DOCX, PDF, TXT, MD
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setIsExtractingFile(true);
    setExtractionStatus('Đang đọc tài liệu...');

    try {
      const result = await extractTextFromFile(file, (status) => {
        setExtractionStatus(status);
      });

      if (result.success) {
        onChangeSourceText(result.text);
        setFileMeta({
          fileName: result.fileName,
          fileType: result.fileType,
          fileSizeFormatted: result.fileSizeFormatted,
          charCount: result.charCount,
          warning: result.warning,
        });
        if (result.warning) {
          setFileError(null);
        }
      } else {
        setFileError(result.error || 'Không thể trích xuất nội dung từ tệp này.');
        setFileMeta(null);
      }
    } catch (err: any) {
      setFileError(`Lỗi đọc tệp: ${err?.message || 'Không xác định'}`);
      setFileMeta(null);
    } finally {
      setIsExtractingFile(false);
      setExtractionStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearUploadedFile = () => {
    setFileMeta(null);
    setFileError(null);
  };

  const toggleContext = (ctx: string) => {
    const current = [...options.contexts];
    if (current.includes(ctx)) {
      onChangeOptions({ ...options, contexts: current.filter((c) => c !== ctx) });
    } else {
      onChangeOptions({ ...options, contexts: [...current, ctx] });
    }
  };

  const addCustomContext = () => {
    if (!customContextInput.trim()) return;
    if (!options.contexts.includes(customContextInput.trim())) {
      onChangeOptions({
        ...options,
        contexts: [...options.contexts, customContextInput.trim()],
      });
    }
    setCustomContextInput('');
  };

  const gradeList =
    options.educationLevel === 'THCS'
      ? GRADES_THCS
      : options.educationLevel === 'THPT'
      ? GRADES_THPT
      : [...GRADES_THCS, ...GRADES_THPT];

  const isProcessing = isExtractingFile || isAnalyzing || isGenerating;
  const isButtonDisabled = isProcessing || !sourceProblemText.trim();

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* SECTION 1: Source Problem Input */}
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-sans font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400 block">
                MỤC I &mdash; ĐỀ BÀI ĐẦU VÀO
              </span>
              <h2 className="text-lg sm:text-xl font-sans font-bold text-slate-900 dark:text-slate-100">
                NHẬP ĐỀ BÀI TOÁN GỐC
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
                Dán văn bản toán hoặc tải tệp Word (.docx), PDF (.pdf), TXT, MD
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".docx,.pdf,.txt,.md"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              Tải tệp DOCX / PDF / TXT / MD
            </button>
            <button
              onClick={onLoadSample}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              NẠP BÀI MẪU
            </button>
            <button
              onClick={() => {
                onClearData();
                handleClearUploadedFile();
              }}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium text-rose-700 dark:text-rose-400 hover:underline disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa dữ liệu
            </button>
          </div>
        </div>

        {/* File Extraction Active Loading Indicator */}
        {isExtractingFile && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center gap-3 text-blue-800 dark:text-blue-300">
            <Loader2 className="w-5 h-5 animate-spin shrink-0 text-blue-600" />
            <div className="text-xs font-medium font-sans">
              <p className="font-bold uppercase tracking-wider">{extractionStatus || 'Đang xử lý tệp...'}</p>
              <p className="text-[11px] opacity-80">Đang đọc nội dung và kiểm tra định dạng tài liệu...</p>
            </div>
          </div>
        )}

        {/* File Error Box */}
        {fileError && (
          <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-rose-800 dark:text-rose-300">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="text-xs space-y-1 font-sans">
              <p className="font-bold">LỖI ĐỌC TỆP TÀI LIỆU:</p>
              <p>{fileError}</p>
            </div>
          </div>
        )}

        {/* File Metadata Box & Warning */}
        {fileMeta && !isExtractingFile && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold font-sans text-slate-800 dark:text-slate-200">
                  {fileMeta.fileName}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {fileMeta.fileType}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {fileMeta.fileSizeFormatted}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {fileMeta.charCount.toLocaleString('vi-VN')} ký tự
                </span>
              </div>
              <button
                onClick={handleClearUploadedFile}
                className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
              >
                Đóng thông tin tệp
              </button>
            </div>

            {/* Warning if character count < 20 */}
            {fileMeta.warning && (
              <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{fileMeta.warning}</span>
              </div>
            )}
          </div>
        )}

        {/* Main Text Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Văn bản bài toán gốc:
            </label>
            {sourceProblemText.length > 0 && (
              <span className="text-[11px] font-sans font-medium text-slate-500 dark:text-slate-400">
                Độ dài: {sourceProblemText.length.toLocaleString('vi-VN')} ký tự
              </span>
            )}
          </div>
          <textarea
            value={sourceProblemText}
            onChange={(e) => onChangeSourceText(e.target.value)}
            rows={5}
            disabled={isProcessing}
            placeholder="Dán đề bài hoặc tải tệp lên. Ví dụ: Một khu vườn hình chữ nhật có chiều dài hơn chiều rộng 8 m. Diện tích khu vườn là 240 m^2. Tính chiều dài và chiều rộng của khu vườn."
            className="w-full p-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-hidden transition-all leading-relaxed font-sans"
          />
        </div>

        {/* KaTeX Live Preview Toggle */}
        {sourceProblemText.trim() && (
          <div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs font-sans font-bold text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1 uppercase tracking-wider"
            >
              {showPreview ? "Ẩn xem trước công thức LaTeX" : "Xem trước hiển thị công thức LaTeX"}
            </button>
            {showPreview && (
              <div className="mt-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm">
                <p className="text-[10px] font-sans font-bold tracking-wider text-blue-800 dark:text-blue-400 mb-1">XEM TRƯỚC HIỂN THỊ KHOA HỌC:</p>
                <MathText content={sourceProblemText} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: Pedagogical Options & Options Grid */}
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <span className="text-xs font-sans font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400 block">
            MỤC II &mdash; THAM SỐ SÁNG TẠO & PHÂN HÓA
          </span>
          <h3 className="text-lg font-sans font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            THÔNG TIN MÔN HỌC & TÙY CHỌN SÁNG TẠO
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
            Cấu hình khối lớp, mức độ phân hóa, dạng bài và bối cảnh thực tế mong muốn
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cấp học */}
          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">
              Cấp học
            </label>
            <select
              value={options.educationLevel}
              onChange={(e) => onChangeOptions({ ...options, educationLevel: e.target.value })}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            >
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Lớp */}
          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">
              Lớp
            </label>
            <select
              value={options.grade}
              onChange={(e) => onChangeOptions({ ...options, grade: e.target.value })}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            >
              {gradeList.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Chủ đề toán học */}
          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">
              Chủ đề toán học
            </label>
            <select
              value={options.topic}
              onChange={(e) => onChangeOptions({ ...options, topic: e.target.value })}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            >
              {MATH_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Mức độ */}
          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">
              Mức độ phân hóa
            </label>
            <select
              value={options.difficulty}
              onChange={(e) => onChangeOptions({ ...options, difficulty: e.target.value })}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            >
              {DIFFICULTY_LEVELS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Dạng bài */}
          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">
              Dạng bài
            </label>
            <select
              value={options.questionType}
              onChange={(e) => onChangeOptions({ ...options, questionType: e.target.value })}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            >
              {QUESTION_TYPES.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          {/* Số phương án trắc nghiệm */}
          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">
              Số phương án trắc nghiệm
            </label>
            <select
              value={options.numOptions}
              onChange={(e) => onChangeOptions({ ...options, numOptions: e.target.value })}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            >
              <option value="4 phương án">4 phương án (A, B, C, D)</option>
              <option value="5 phương án">5 phương án (A, B, C, D, E)</option>
              <option value="Không áp dụng">Không áp dụng (Tự luận)</option>
            </select>
          </div>

          {/* Mức độ thay đổi so với đề gốc */}
          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">
              Mức độ thay đổi
            </label>
            <select
              value={options.variationLevel}
              onChange={(e) => onChangeOptions({ ...options, variationLevel: e.target.value })}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            >
              {VARIATION_LEVELS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Phong cách ảnh */}
          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">
              Phong cách minh họa
            </label>
            <select
              value={options.imageStyle}
              onChange={(e) => onChangeOptions({ ...options, imageStyle: e.target.value })}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            >
              {IMAGE_STYLES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real World Context Selector */}
        <div>
          <label className="block text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
            Ngữ cảnh thực tế ưu tiên (chọn một hoặc nhiều):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CONTEXT_PRESETS.map((ctx) => {
              const isSelected = options.contexts.includes(ctx);
              return (
                <button
                  type="button"
                  key={ctx}
                  onClick={() => toggleContext(ctx)}
                  className={`px-3 py-1.5 text-xs font-sans font-semibold rounded-full border transition-all ${
                    isSelected
                      ? 'bg-blue-800 text-white dark:bg-blue-600 dark:text-white border-blue-800 dark:border-blue-600 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-blue-500'
                  }`}
                >
                  {isSelected ? "✓ " : ""}{ctx}
                </button>
              );
            })}
          </div>

          {/* Custom Context Tag Input */}
          <div className="mt-3 flex items-center gap-2 max-w-sm">
            <input
              type="text"
              value={customContextInput}
              onChange={(e) => setCustomContextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomContext()}
              placeholder="Thêm ngữ cảnh tự nhập khác..."
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full"
            />
            <button
              onClick={addCustomContext}
              type="button"
              className="px-3 py-1.5 rounded bg-blue-800 dark:bg-blue-600 text-white text-xs font-sans font-semibold uppercase tracking-wider shrink-0"
            >
              Thêm
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onAnalyzeProblem}
            disabled={isButtonDisabled}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-wider rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Search className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            {isAnalyzing ? "Đang phân tích nội dung..." : "Phân tích đề bài"}
          </button>

          <button
            onClick={onGenerate10}
            disabled={isButtonDisabled}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-sans font-bold uppercase tracking-wider rounded bg-blue-700 text-white hover:bg-blue-800 border border-blue-800 disabled:opacity-50 shadow-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? "Đang tạo tài liệu 10 bài..." : "TẠO 10 BÀI TƯƠNG TỰ"}
          </button>

          <button
            onClick={onSaveDraft}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-sans font-semibold uppercase tracking-wider rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Lưu bản nháp
          </button>

          <button
            onClick={onRestoreDraft}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-sans font-semibold uppercase tracking-wider rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục bản nháp
          </button>
        </div>

        {/* Progress step bar */}
        {(isGenerating || isAnalyzing) && (
          <div className="bg-blue-50/60 dark:bg-blue-950/40 p-4 rounded-lg border border-blue-300 dark:border-blue-800 space-y-2 animate-pulse">
            <div className="flex items-center justify-between text-xs font-sans font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-700 animate-spin" />
                {progressStep || "Đang xử lý..."}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: Editable Analysis Table */}
      {analysis && (
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <span className="text-xs font-sans font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400 block">
                MỤC III &mdash; PHÂN TÍCH CHUYÊN MÔN KHOA HỌC
              </span>
              <h3 className="text-lg font-sans font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                KẾT QUẢ PHÂN TÍCH BÀI TOÁN GỐC
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
                Giáo viên có thể kiểm tra và điều chỉnh các thành phần trước khi sinh 10 bài
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-sans font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 w-1/4">Thành phần</th>
                  <th className="p-3 w-1/2">Kết quả phân tích</th>
                  <th className="p-3 w-1/4">Chỉnh sửa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr>
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">Kiến thức trọng tâm</td>
                  <td className="p-3 text-slate-800 dark:text-slate-200">{analysis.knowledgeFocus}</td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={analysis.knowledgeFocus}
                      onChange={(e) => onUpdateAnalysis({ ...analysis, knowledgeFocus: e.target.value })}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">Phương pháp cốt lõi</td>
                  <td className="p-3 text-slate-800 dark:text-slate-200">{analysis.coreMethod}</td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={analysis.coreMethod}
                      onChange={(e) => onUpdateAnalysis({ ...analysis, coreMethod: e.target.value })}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">Dữ kiện đã cho</td>
                  <td className="p-3 text-slate-800 dark:text-slate-200">{analysis.givenData?.join(', ')}</td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={analysis.givenData?.join(', ')}
                      onChange={(e) =>
                        onUpdateAnalysis({
                          ...analysis,
                          givenData: e.target.value.split(',').map((s) => s.trim()),
                        })
                      }
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">Đại lượng cần tìm</td>
                  <td className="p-3 text-slate-800 dark:text-slate-200">{analysis.requiredResult}</td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={analysis.requiredResult}
                      onChange={(e) => onUpdateAnalysis({ ...analysis, requiredResult: e.target.value })}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">Khả năng tạo TikZ</td>
                  <td className="p-3 text-slate-800 dark:text-slate-200">{analysis.tikzSuitability}</td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={analysis.tikzSuitability}
                      onChange={(e) => onUpdateAnalysis({ ...analysis, tikzSuitability: e.target.value })}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
