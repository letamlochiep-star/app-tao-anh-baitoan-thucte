import React, { useState } from 'react';
import {
  Image,
  Sparkles,
  Copy,
  Download,
  Trash2,
  Edit3,
  RefreshCw,
  Code,
  FileCode,
  AlertCircle,
  Layers,
  CheckCircle2,
  Maximize2,
  Eye,
  ExternalLink,
  Cpu
} from 'lucide-react';
import saveAs from 'file-saver';
import JSZip from 'jszip';
import { ProblemItem } from '../types';
import { DEFAULT_NEGATIVE_PROMPT } from '../constants';
import {
  convertSvgToPngDataUrl,
  downloadImageAsPng,
  downloadImageAsSvg,
  getSafeImageSrc,
} from '../utils/imageUtils';

interface Tab3ImagesAndTikzProps {
  problems: ProblemItem[];
  apiKey: string;
  selectedImageModel: string;
  onUpdateProblem: (updated: ProblemItem) => void;
}

export const Tab3ImagesAndTikz: React.FC<Tab3ImagesAndTikzProps> = ({
  problems,
  apiKey,
  selectedImageModel,
  onUpdateProblem,
}) => {
  const [promptMode, setPromptMode] = useState<'easy' | 'singleLine' | 'scene'>('easy');
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<number | null>(null);
  const [editPromptText, setEditPromptText] = useState('');
  const [editingTikzId, setEditingTikzId] = useState<number | null>(null);
  const [editTikzText, setEditTikzText] = useState('');
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 10 });

  // TikZ Preview State (problemId -> { isLoading: boolean, svgDataUrl?: string, error?: string })
  const [tikzPreviews, setTikzPreviews] = useState<Record<number, { isLoading: boolean; svgDataUrl?: string; error?: string }>>({});

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  // Generate single image via API
  const handleGenerateSingleImage = async (p: ProblemItem) => {
    onUpdateProblem({ ...p, isGeneratingImage: true, imageError: undefined });

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt: p.imagePrompt,
          negativePrompt: p.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
          aspectRatio: p.imageAspectRatio || '16:9',
          apiKey,
          imageModel: selectedImageModel,
        }),
      });

      const data = await res.json();
      if (data.success && data.imageDataUrl) {
        onUpdateProblem({
          ...p,
          generatedImageDataUrl: data.imageDataUrl,
          isGeneratingImage: false,
          imageError: data.note ? data.note : undefined,
        });
      } else {
        onUpdateProblem({
          ...p,
          isGeneratingImage: false,
          imageError: data.fallbackText || data.error || 'API chưa hỗ trợ tạo ảnh trực tiếp.',
        });
      }
    } catch (err) {
      onUpdateProblem({
        ...p,
        isGeneratingImage: false,
        imageError: 'Lỗi kết nối khi gọi mô hình tạo ảnh.',
      });
    }
  };

  // Batch generate all images sequentially
  const handleBatchGenerateImages = async () => {
    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: problems.length });

    for (let i = 0; i < problems.length; i++) {
      const p = problems[i];
      setBatchProgress({ current: i + 1, total: problems.length });
      await handleGenerateSingleImage(p);
      // Wait 1 sec delay to prevent rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setIsBatchGenerating(false);
  };

  // Download all generated images as ZIP
  const handleDownloadAllImagesZip = async () => {
    const zip = new JSZip();
    let count = 0;

    for (let i = 0; i < problems.length; i++) {
      const p = problems[i];
      if (p.generatedImageDataUrl) {
        let pngDataUrl = p.generatedImageDataUrl;
        if (pngDataUrl.startsWith('data:image/svg+xml') || pngDataUrl.includes('<svg')) {
          pngDataUrl = await convertSvgToPngDataUrl(pngDataUrl);
          const svgBase64 = p.generatedImageDataUrl.includes(',') ? p.generatedImageDataUrl.split(',')[1] : '';
          if (svgBase64) {
            try {
              zip.file(`Hinh_minh_hoa_Cau_${p.id}.svg`, atob(svgBase64));
            } catch (e) {}
          }
        }

        const base64Data = pngDataUrl.includes(',') ? pngDataUrl.split(',')[1] : pngDataUrl;
        zip.file(`Hinh_minh_hoa_Cau_${p.id}.png`, base64Data, { base64: true });
        count++;
      }
    }

    if (count === 0) {
      alert('Chưa có ảnh nào được tạo. Vui lòng bấm "Tạo toàn bộ 10 ảnh" hoặc "TẠO ẢNH TRỰC TIẾP" từng câu trước khi tải ZIP.');
      return;
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, '10_Hinh_Minh_Hoa_Bai_Toan_Thuc_Te.zip');
  };

  // Export all prompts as TXT file
  const handleExportPromptsTxt = () => {
    let txt = `====================================================\n`;
    txt += `CÂU LỆNH TẠO HÌNH MINH HỌA 10 BÀI TOÁN THỰC TẾ\n`;
    txt += `====================================================\n\n`;

    problems.forEach((p) => {
      txt += `=== HÌNH ẢNH CÂU ${p.id}: ${p.imageTitle || p.title} ===\n`;
      txt += `Prompt: ${p.imagePrompt}\n`;
      txt += `Negative Prompt: ${p.negativePrompt || DEFAULT_NEGATIVE_PROMPT}\n`;
      txt += `Tỉ lệ: ${p.imageAspectRatio || '16:9'}\n\n`;
    });

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, '10_Image_Prompts_Bai_Toan_Thuc_Te.txt');
  };

  // Download single TikZ file
  const handleDownloadTikz = (p: ProblemItem) => {
    const blob = new Blob([p.tikzCode], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `Cau_${p.id}_TikZ.tex`);
  };

  // Download all TikZ files ZIP
  const handleDownloadAllTikzZip = async () => {
    const zip = new JSZip();
    problems.forEach((p) => {
      if (p.tikzCode) {
        zip.file(`Cau_${p.id}_TikZ.tex`, p.tikzCode);
      }
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, '10_Ma_TikZ_Overleaf.zip');
  };

  // Live TikZ Render Preview
  const handleRenderTikzPreview = async (p: ProblemItem) => {
    if (!p.tikzCode) return;

    setTikzPreviews((prev) => ({
      ...prev,
      [p.id]: { isLoading: true },
    }));

    try {
      const res = await fetch('/api/gemini/render-tikz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tikzCode: p.tikzCode,
          apiKey,
        }),
      });

      const data = await res.json();
      if (data.success && data.svgDataUrl) {
        setTikzPreviews((prev) => ({
          ...prev,
          [p.id]: { isLoading: false, svgDataUrl: data.svgDataUrl },
        }));
      } else {
        setTikzPreviews((prev) => ({
          ...prev,
          [p.id]: { isLoading: false, error: data.error || 'Không thể render SVG từ TikZ.' },
        }));
      }
    } catch (err: any) {
      setTikzPreviews((prev) => ({
        ...prev,
        [p.id]: { isLoading: false, error: 'Lỗi kết nối khi dựng hình TikZ.' },
      }));
    }
  };

  // Combined prompt box text generation
  const getCombinedPromptText = () => {
    if (promptMode === 'singleLine') {
      return problems
        .map((p) => `||| HÌNH ẢNH CÂU ${p.id}: ${(p.imagePrompt || '').replace(/[\r\n]+/g, ' ')} |||`)
        .join(' ');
    }
    if (promptMode === 'scene') {
      return problems
        .map(
          (p) =>
            `=== SCENE ${p.id}: HÌNH MINH HỌA CÂU ${p.id} (${p.imageTitle || p.title}) ===\nPrompt: ${p.imagePrompt}\nNegative Prompt: ${p.negativePrompt || DEFAULT_NEGATIVE_PROMPT}`
        )
        .join('\n\n');
    }
    // Easy mode
    return problems
      .map(
        (p) =>
          `=== HÌNH ẢNH CÂU ${p.id}: ${p.imageTitle || p.title} ===\nPrompt: ${p.imagePrompt}\nNegative Prompt: ${p.negativePrompt || DEFAULT_NEGATIVE_PROMPT}\nTỉ lệ: ${p.imageAspectRatio || '16:9'}`
      )
      .join('\n\n----------------------------------------------------\n\n');
  };

  if (!problems || problems.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0F172A] p-12 text-center space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 my-8 shadow-sm">
        <Image className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto" />
        <h3 className="text-xl font-sans font-bold text-slate-900 dark:text-slate-100">
          Chưa có dữ liệu hình ảnh & TikZ
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto font-sans">
          Vui lòng tạo 10 bài toán tương tự ở Tab 1 trước.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* SECTION A: COMBINED PROMPT GENERATOR */}
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-sans font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400 block">
                MỤC A &mdash; CÂU LỆNH HÌNH ÁNH DÙNG CHUNG
              </span>
              <h2 className="text-lg font-sans font-bold text-slate-900 dark:text-slate-100">
                CÂU LỆNH HÌNH ÁNH TỔNG HỢP (10 CÂU)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
                Sao chép nhanh toàn bộ 10 câu lệnh để dán vào ChatGPT / Gemini / Midjourney / Canva
              </p>
            </div>
          </div>

          {/* 3 Modes Switcher */}
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            <button
              onClick={() => setPromptMode('easy')}
              className={`px-3 py-1 text-xs font-sans font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                promptMode === 'easy'
                  ? 'bg-blue-800 text-white dark:bg-blue-600 dark:text-white shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              Dễ đọc
            </button>
            <button
              onClick={() => setPromptMode('singleLine')}
              className={`px-3 py-1 text-xs font-sans font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                promptMode === 'singleLine'
                  ? 'bg-blue-800 text-white dark:bg-blue-600 dark:text-white shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              Một dòng (No-Linebreak)
            </button>
            <button
              onClick={() => setPromptMode('scene')}
              className={`px-3 py-1 text-xs font-sans font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                promptMode === 'scene'
                  ? 'bg-blue-800 text-white dark:bg-blue-600 dark:text-white shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              Theo cảnh (Scene)
            </button>
          </div>
        </div>

        {/* Textarea displaying full batch prompts */}
        <textarea
          readOnly
          value={getCombinedPromptText()}
          rows={6}
          className="w-full p-3.5 border border-slate-300 dark:border-slate-700 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-hidden rounded-lg"
        />

        {/* Combined Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => copyText(getCombinedPromptText(), `Đã sao chép toàn bộ prompt`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-sans font-bold uppercase tracking-wider bg-blue-700 text-white hover:bg-blue-800 border border-blue-800 rounded transition-colors shadow-2xs cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Sao chép bản này
            </button>
            <button
              onClick={handleExportPromptsTxt}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-sans font-semibold uppercase tracking-wider rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất file TXT
            </button>
            {copiedLabel && (
              <span className="text-xs font-sans font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                ✓ {copiedLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchGenerateImages}
              disabled={isBatchGenerating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-sans font-bold uppercase tracking-wider rounded bg-blue-700 text-white hover:bg-blue-800 border border-blue-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isBatchGenerating
                ? `Đang tạo ảnh (${batchProgress.current}/10)...`
                : 'Tạo toàn bộ 10 ảnh'}
            </button>
            <button
              onClick={handleDownloadAllImagesZip}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-sans font-semibold uppercase tracking-wider rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Tải ZIP tất cả ảnh
            </button>
          </div>
        </div>
      </div>

      {/* SECTION B: PER-QUESTION IMAGE & TIKZ CARDS */}
      <div className="space-y-6">
        <h2 className="text-lg font-sans font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Image className="w-5 h-5 text-blue-700 dark:text-blue-400" />
          HÌNH MINH HỌA & MÃ TIKZ THEO TỪNG CÂU
        </h2>

        {problems.map((p) => {
          const isEditingPrompt = editingPromptId === p.id;
          const isEditingTikz = editingTikzId === p.id;
          const tikzPreview = tikzPreviews[p.id];

          return (
            <div
              key={p.id}
              className="bg-white dark:bg-[#0F172A] p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 space-y-5"
            >
              {/* Question Heading */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded bg-blue-900 text-white dark:bg-blue-600 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    C{p.id < 10 ? `0${p.id}` : p.id}
                  </span>
                  <div>
                    <h3 className="text-base font-sans font-bold text-slate-900 dark:text-slate-100">
                      {p.imageTitle || p.title || `Hình minh họa Câu ${p.id}`}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Tỉ lệ ảnh: {p.imageAspectRatio || '16:9'}</span>
                      {p.modelUsed && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-mono">
                            <Cpu className="w-3 h-3" /> {p.modelUsed}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2 Columns: Image Prompt & Image Preview / TikZ */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: Image Prompt & Direct Generation */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Câu lệnh tạo ảnh (Image Prompt):
                    </label>
                    <button
                      onClick={() => {
                        setEditingPromptId(isEditingPrompt ? null : p.id);
                        setEditPromptText(p.imagePrompt);
                      }}
                      className="text-xs font-sans font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      {isEditingPrompt ? 'Hủy sửa' : 'Chỉnh sửa'}
                    </button>
                  </div>

                  {isEditingPrompt ? (
                    <div className="space-y-2">
                      <textarea
                        value={editPromptText}
                        onChange={(e) => setEditPromptText(e.target.value)}
                        rows={3}
                        className="w-full p-2.5 rounded border border-blue-600 text-xs bg-slate-50 dark:bg-slate-900 font-sans"
                      />
                      <button
                        onClick={() => {
                          onUpdateProblem({ ...p, imagePrompt: editPromptText });
                          setEditingPromptId(null);
                        }}
                        className="px-3 py-1 rounded bg-blue-700 text-white text-xs font-sans font-bold uppercase tracking-wider border border-blue-800 cursor-pointer"
                      >
                        Lưu câu lệnh
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono">
                      {p.imagePrompt}
                    </div>
                  )}

                  {/* Negative Prompt */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Negative Prompt:
                    </span>{' '}
                    {p.negativePrompt || DEFAULT_NEGATIVE_PROMPT}
                  </div>

                  {/* Image Generation Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() =>
                        copyText(p.imagePrompt, `Đã sao chép prompt Câu ${p.id}`)
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Sao chép prompt
                    </button>

                    <button
                      onClick={() => handleGenerateSingleImage(p)}
                      disabled={p.isGeneratingImage}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider rounded bg-blue-700 text-white hover:bg-blue-800 border border-blue-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {p.isGeneratingImage ? 'Đang tạo ảnh...' : p.generatedImageDataUrl ? 'Tạo lại ảnh' : 'TẠO ẢNH TRỰC TIẾP'}
                    </button>

                    {p.generatedImageDataUrl && (
                      <>
                        <button
                          onClick={() => downloadImageAsPng(p.generatedImageDataUrl!, `Hinh_minh_hoa_Cau_${p.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-semibold rounded bg-emerald-700 text-white border border-emerald-800 hover:bg-emerald-800 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          TẢI PNG (.PNG)
                        </button>
                        {(p.generatedImageDataUrl.startsWith('data:image/svg+xml') || p.generatedImageDataUrl.includes('<svg')) && (
                          <button
                            onClick={() => downloadImageAsSvg(p.generatedImageDataUrl!, `Hinh_minh_hoa_Cau_${p.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-semibold rounded bg-blue-800 text-white border border-blue-900 hover:bg-blue-900 transition-colors shadow-2xs cursor-pointer"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            TẢI VECTOR (.SVG)
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Guidance banner if image generation needs instruction */}
                  {p.imageError && !p.generatedImageDataUrl && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 space-y-2 font-sans rounded">
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>Hướng dẫn tạo ảnh minh họa:</span>
                      </div>
                      <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                        Bạn có thể chọn 1 trong 2 cách đơn giản sau để có hình minh họa:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1">
                        <li>
                          <strong>Cách 1:</strong> Bấm nút <span className="text-blue-700 font-bold">"TẠO ẢNH TRỰC TIẾP"</span> để hệ thống gọi mô hình Gemini/Imagen sinh ảnh/sơ đồ SVG.
                        </li>
                        <li>
                          <strong>Cách 2:</strong> Bấm <span className="font-bold">"Sao chép prompt"</span> bên trên để dán vào ChatGPT, Midjourney hoặc Canva.
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Generated Image Preview Box */}
                  <div className="relative border border-dashed border-slate-300 dark:border-slate-700 min-h-[160px] bg-slate-50 dark:bg-slate-900/60 flex flex-col items-center justify-center p-2 rounded-lg">
                    {p.isGeneratingImage ? (
                      <div className="text-center space-y-2 p-6">
                        <RefreshCw className="w-7 h-7 animate-spin text-blue-600 mx-auto" />
                        <p className="text-xs font-sans font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Đang tạo hình minh họa cho Câu {p.id}...
                        </p>
                        <p className="text-[11px] text-slate-500">AI đang xử lý chi tiết vector/ảnh minh họa...</p>
                      </div>
                    ) : p.generatedImageDataUrl ? (
                      <div className="relative group w-full space-y-2">
                        <div className="relative overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 flex flex-col items-center justify-center min-h-[200px] rounded">
                          <img
                            src={getSafeImageSrc(p.generatedImageDataUrl)}
                            alt={p.imageTitle || `Hình minh họa câu ${p.id}`}
                            className="w-full h-auto object-contain max-h-[320px] transition-transform duration-200 group-hover:scale-[1.01]"
                          />
                        </div>

                        {/* Image Download Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                          <span className="text-[11px] font-sans font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                            Đã tạo hình minh họa thành công
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => downloadImageAsPng(p.generatedImageDataUrl!, `Hinh_minh_hoa_Cau_${p.id}`)}
                              className="px-3 py-1 text-xs font-sans font-semibold rounded bg-emerald-700 text-white hover:bg-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" /> TẢI PNG
                            </button>
                            {(p.generatedImageDataUrl.startsWith('data:image/svg+xml') || p.generatedImageDataUrl.includes('<svg')) && (
                              <button
                                onClick={() => downloadImageAsSvg(p.generatedImageDataUrl!, `Hinh_minh_hoa_Cau_${p.id}`)}
                                className="px-3 py-1 text-xs font-sans font-semibold rounded bg-blue-700 text-white hover:bg-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <FileCode className="w-3.5 h-3.5" /> TẢI SVG
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <Image className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
                        <p className="text-xs text-slate-500 font-sans uppercase tracking-wider font-bold">Chưa tạo hình minh họa</p>
                        <button
                          onClick={() => handleGenerateSingleImage(p)}
                          className="px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider rounded bg-blue-700 text-white hover:bg-blue-800 inline-flex items-center gap-1 border border-blue-800 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> TẠO ẢNH TRỰC TIẾP CHO CÂU {p.id}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: TikZ Code Block & Live TikZ Preview */}
                <div className="space-y-3 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 lg:pl-6 pt-4 lg:pt-0">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      Mã TikZ Biên Dịch Trên Overleaf:
                    </label>
                    <button
                      onClick={() => {
                        setEditingTikzId(isEditingTikz ? null : p.id);
                        setEditTikzText(p.tikzCode);
                      }}
                      className="text-xs font-sans font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      {isEditingTikz ? 'Hủy sửa' : 'Sửa mã TikZ'}
                    </button>
                  </div>

                  {p.tikzNeeded && p.tikzCode ? (
                    <div className="space-y-3">
                      {isEditingTikz ? (
                        <div className="space-y-2">
                          <textarea
                            value={editTikzText}
                            onChange={(e) => setEditTikzText(e.target.value)}
                            rows={8}
                            className="w-full p-2.5 rounded border border-blue-600 text-xs bg-slate-900 text-slate-100 font-mono"
                          />
                          <button
                            onClick={() => {
                              onUpdateProblem({ ...p, tikzCode: editTikzText });
                              setEditingTikzId(null);
                            }}
                            className="px-3 py-1 rounded bg-blue-700 text-white text-xs font-sans font-bold uppercase tracking-wider border border-blue-800 cursor-pointer"
                          >
                            Lưu mã TikZ
                          </button>
                        </div>
                      ) : (
                        <pre className="p-3.5 rounded bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[200px] scrollbar-thin">
                          <code>{p.tikzCode}</code>
                        </pre>
                      )}

                      {/* TikZ Live Preview Box */}
                      {tikzPreview?.isLoading && (
                        <div className="p-4 rounded border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/40 flex items-center justify-center gap-2 text-xs text-blue-800 dark:text-blue-300">
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Đang dựng hình xem trước TikZ...</span>
                        </div>
                      )}

                      {tikzPreview?.svgDataUrl && (
                        <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span>SƠ ĐỒ TIKZ XEM TRƯỚC:</span>
                            <button
                              onClick={() => setTikzPreviews((prev) => ({ ...prev, [p.id]: { isLoading: false } }))}
                              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
                            >
                              Ẩn xem trước
                            </button>
                          </div>
                          <div className="flex items-center justify-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                            <img
                              src={tikzPreview.svgDataUrl}
                              alt={`TikZ Preview Câu ${p.id}`}
                              className="max-h-[220px] object-contain"
                            />
                          </div>
                        </div>
                      )}

                      {/* TikZ Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          onClick={() => copyText(p.tikzCode, `Đã sao chép TikZ Câu ${p.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-semibold rounded bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Sao chép TikZ
                        </button>

                        <button
                          onClick={() => handleRenderTikzPreview(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          Xem trước trực tiếp TikZ
                        </button>

                        <button
                          onClick={() => handleDownloadTikz(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          Tải .tex
                        </button>

                        <a
                          href="https://www.overleaf.com/docs"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Mở Overleaf
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 italic space-y-2">
                      <p>Bài toán này không bắt buộc sử dụng hình TikZ độc lập.</p>
                      <button
                        onClick={() =>
                          onUpdateProblem({
                            ...p,
                            tikzNeeded: true,
                            tikzCode: `\\documentclass[tikz,border=5pt]{standalone}\n\\usepackage{tikz}\n\\begin{document}\n\\begin{tikzpicture}\n% Mã hình vẽ câu ${p.id}\n\\draw[blue,thick] (0,0) rectangle (4,3);\n\\node at (2,1.5) {Mô phỏng bài toán câu ${p.id}};\n\\end{tikzpicture}\n\\end{document}`,
                          })
                        }
                        className="px-3 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-sans font-bold uppercase tracking-wider not-italic cursor-pointer"
                      >
                        + Tạo mã TikZ cho câu này
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom ZIP TikZ download button */}
      <div className="bg-white dark:bg-[#0F172A] p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Xuất toàn bộ mã TikZ cho Overleaf:
        </span>
        <button
          onClick={handleDownloadAllTikzZip}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-sans font-bold uppercase tracking-wider rounded bg-blue-700 text-white hover:bg-blue-800 border border-blue-800 shadow-2xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Tải ZIP tất cả 10 file TikZ (.tex)
        </button>
      </div>
    </div>
  );
};
