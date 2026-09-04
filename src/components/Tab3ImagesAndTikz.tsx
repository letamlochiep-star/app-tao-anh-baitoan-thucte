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
  Maximize2
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
      // Wait 1 sec delay to save free quota rate limits
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
          // Also save SVG file in zip
          const svgBase64 = p.generatedImageDataUrl.includes(',') ? p.generatedImageDataUrl.split(',')[1] : '';
          if (svgBase64) {
            try {
              zip.file(`Hinh_minh_hoa_Cau_${p.id}.svg`, atob(svgBase64));
            } catch (e) {
              // fallback
            }
          }
        }

        const base64Data = pngDataUrl.includes(',') ? pngDataUrl.split(',')[1] : pngDataUrl;
        zip.file(`Hinh_minh_hoa_Cau_${p.id}.png`, base64Data, { base64: true });
        count++;
      }
    }

    if (count === 0) {
      alert('Chưa có ảnh nào được tạo. Vui lòng bấm "Tạo toàn bộ 10 ảnh" hoặc "TẠO ÁNH TRỰC TIẾP" từng câu trước khi tải ZIP.');
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
      {/* SECTION C: COMBINED PROMPT GENERATOR (Area C requirement) */}
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
                Sao chép nhanh toàn bộ 10 câu lệnh để dán vào ChatGPT / Gemini / Midjourney
              </p>
            </div>
          </div>

          {/* 3 Modes Switcher */}
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
            <button
              onClick={() => setPromptMode('easy')}
              className={`px-3 py-1 text-xs font-sans font-bold uppercase tracking-wider rounded transition-all ${
                promptMode === 'easy'
                  ? 'bg-blue-800 text-white dark:bg-blue-600 dark:text-white shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              Dễ đọc
            </button>
            <button
              onClick={() => setPromptMode('singleLine')}
              className={`px-3 py-1 text-xs font-sans font-bold uppercase tracking-wider rounded transition-all ${
                promptMode === 'singleLine'
                  ? 'bg-blue-800 text-white dark:bg-blue-600 dark:text-white shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              Một dòng (No-Linebreak)
            </button>
            <button
              onClick={() => setPromptMode('scene')}
              className={`px-3 py-1 text-xs font-sans font-bold uppercase tracking-wider rounded transition-all ${
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
          className="w-full p-3.5 border border-[#1A1A1A]/20 dark:border-stone-700 bg-[#1A1A1A] text-[#F7F5F2] font-mono text-xs focus:outline-hidden"
        />

        {/* Combined Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => copyText(getCombinedPromptText(), `Đã sao chép toàn bộ prompt`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-sans font-bold uppercase tracking-[0.12em] bg-red-800 text-white hover:bg-red-900 border border-red-900 transition-colors shadow-xs"
            >
              <Copy className="w-3.5 h-3.5" />
              Sao chép bản này
            </button>
            <button
              onClick={handleExportPromptsTxt}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-sans font-bold uppercase tracking-[0.12em] border border-[#1A1A1A]/20 dark:border-stone-700 text-[#1A1A1A] dark:text-[#EAE8E3] hover:bg-[#1A1A1A]/5"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất file TXT
            </button>
            {copiedLabel && (
              <span className="text-xs font-sans font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-900/10 px-2.5 py-1 border border-emerald-800/30 uppercase tracking-wider">
                ✓ {copiedLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchGenerateImages}
              disabled={isBatchGenerating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-sans font-bold uppercase tracking-[0.12em] bg-[#1A1A1A] dark:bg-[#EAE8E3] text-white dark:text-[#141413] hover:bg-black disabled:opacity-50 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isBatchGenerating
                ? `Đang tạo ảnh (${batchProgress.current}/10)...`
                : 'Tạo toàn bộ 10 ảnh'}
            </button>
            <button
              onClick={handleDownloadAllImagesZip}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-sans font-bold uppercase tracking-[0.12em] border border-[#1A1A1A]/20 dark:border-stone-700 text-[#1A1A1A] dark:text-[#EAE8E3] hover:bg-[#1A1A1A]/5"
            >
              <Download className="w-3.5 h-3.5" />
              Tải ZIP tất cả ảnh
            </button>
          </div>
        </div>
      </div>

      {/* SECTION A & B: PER-QUESTION IMAGE & TIKZ CARDS */}
      <div className="space-y-6">
        <h2 className="text-lg font-serif-display font-bold text-[#1A1A1A] dark:text-[#EAE8E3] flex items-center gap-2">
          <Image className="w-5 h-5 text-red-800" />
          HÌNH MINH HỌA & MÃ TIKZ THEO TỪNG CÂU
        </h2>

        {problems.map((p) => {
          const isEditingPrompt = editingPromptId === p.id;
          const isEditingTikz = editingTikzId === p.id;

          return (
            <div
              key={p.id}
              className="bg-white dark:bg-[#1E1D1B] p-6 shadow-xs border border-[#1A1A1A]/15 dark:border-stone-800 space-y-5"
            >
              {/* Question Heading */}
              <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-[#1A1A1A] dark:bg-[#EAE8E3] text-white dark:text-[#141413] font-serif font-bold text-xs flex items-center justify-center shrink-0">
                    C{p.id < 10 ? `0${p.id}` : p.id}
                  </span>
                  <h3 className="text-base font-serif-display font-bold text-[#1A1A1A] dark:text-[#EAE8E3]">
                    {p.imageTitle || p.title || `Hình minh họa Câu ${p.id}`}
                  </h3>
                </div>
                <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/60 dark:text-[#EAE8E3]/60">
                  Tỉ lệ ảnh: {p.imageAspectRatio || '16:9'}
                </span>
              </div>

              {/* Grid 2 Columns: Image Prompt & Image Preview / TikZ */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: Image Prompt & Direct Generation */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] dark:text-[#EAE8E3]">
                      Câu lệnh tạo ảnh (Image Prompt):
                    </label>
                    <button
                      onClick={() => {
                        setEditingPromptId(isEditingPrompt ? null : p.id);
                        setEditPromptText(p.imagePrompt);
                      }}
                      className="text-xs font-sans font-bold uppercase tracking-wider text-red-800 dark:text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      {isEditingPrompt ? 'Hủy sửa' : 'Chỉnh sửa câu lệnh'}
                    </button>
                  </div>

                  {isEditingPrompt ? (
                    <div className="space-y-2">
                      <textarea
                        value={editPromptText}
                        onChange={(e) => setEditPromptText(e.target.value)}
                        rows={3}
                        className="w-full p-2.5 border border-red-800 text-xs bg-[#F7F5F2] dark:bg-[#141413] font-sans"
                      />
                      <button
                        onClick={() => {
                          onUpdateProblem({ ...p, imagePrompt: editPromptText });
                          setEditingPromptId(null);
                        }}
                        className="px-3 py-1 bg-red-800 text-white text-xs font-sans font-bold uppercase tracking-wider border border-red-900"
                      >
                        Lưu câu lệnh
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#F7F5F2] dark:bg-[#141413] border border-[#1A1A1A]/15 dark:border-stone-800 text-xs text-[#1A1A1A] dark:text-[#EAE8E3] leading-relaxed font-mono">
                      {p.imagePrompt}
                    </div>
                  )}

                  {/* Negative Prompt */}
                  <div className="text-[11px] text-[#1A1A1A]/60 dark:text-[#EAE8E3]/60 font-mono">
                    <span className="font-bold text-[#1A1A1A] dark:text-[#EAE8E3]">
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider border border-[#1A1A1A]/20 dark:border-stone-700 text-[#1A1A1A] dark:text-[#EAE8E3] hover:bg-[#1A1A1A]/5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Sao chép câu lệnh
                    </button>

                    <button
                      onClick={() => handleGenerateSingleImage(p)}
                      disabled={p.isGeneratingImage}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider bg-red-800 text-white hover:bg-red-900 border border-red-900 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {p.isGeneratingImage ? 'Đang tạo ảnh...' : p.generatedImageDataUrl ? 'Tạo lại ảnh' : 'TẠO ẢNH TRỰC TIẾP'}
                    </button>

                    {p.generatedImageDataUrl && (
                      <>
                        <button
                          onClick={() => downloadImageAsPng(p.generatedImageDataUrl!, `Hinh_minh_hoa_Cau_${p.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider bg-emerald-800 text-white border border-emerald-900 hover:bg-emerald-900 transition-colors shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          TẢI ÁNH PNG (.PNG)
                        </button>
                        {(p.generatedImageDataUrl.startsWith('data:image/svg+xml') || p.generatedImageDataUrl.includes('<svg')) && (
                          <button
                            onClick={() => downloadImageAsSvg(p.generatedImageDataUrl!, `Hinh_minh_hoa_Cau_${p.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider bg-blue-800 text-white border border-blue-900 hover:bg-blue-900 transition-colors shadow-xs"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            TẢI VECTOR (.SVG)
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* User-friendly guidance banner if image generation needs instruction or had fallback */}
                  {p.imageError && !p.generatedImageDataUrl && (
                    <div className="p-3 bg-stone-100 dark:bg-stone-900/80 border border-stone-300 dark:border-stone-700 text-xs text-[#1A1A1A] dark:text-[#EAE8E3] space-y-2 font-sans rounded-xs shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-red-800 dark:text-red-400">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>Hướng dẫn sinh hình minh họa cho Câu {p.id}:</span>
                      </div>
                      <p className="leading-relaxed text-[#1A1A1A]/80 dark:text-[#EAE8E3]/80">
                        Bạn có thể chọn 1 trong 2 cách đơn giản sau để có hình minh họa hoàn hảo:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-[#1A1A1A]/80 dark:text-[#EAE8E3]/80 pl-1">
                        <li>
                          <strong>Cách 1:</strong> Bấm nút <span className="text-red-800 font-bold">"TẠO ẢNH TRỰC TIẾP"</span> để hệ thống gọi mô hình Gemini/Imagen sinh ảnh.
                        </li>
                        <li>
                          <strong>Cách 2:</strong> Bấm <span className="font-bold text-stone-900 dark:text-stone-100">"Sao chép câu lệnh"</span> (Prompt) bên trên để dán vào ChatGPT, Bing Image Creator, Midjourney hoặc Canva.
                        </li>
                      </ul>
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          onClick={() => handleGenerateSingleImage(p)}
                          className="px-2.5 py-1 text-[11px] font-sans font-bold uppercase tracking-wider bg-red-800 text-white hover:bg-red-900 border border-red-900 flex items-center gap-1 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" /> Tạo ảnh trực tiếp ngay
                        </button>
                        <button
                          onClick={() => copyText(p.imagePrompt, `Đã sao chép prompt Câu ${p.id}`)}
                          className="px-2.5 py-1 text-[11px] font-sans font-bold uppercase tracking-wider bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-300 border border-stone-400 dark:border-stone-600 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Sao chép prompt
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Generated Image Preview Box */}
                  <div className="relative border border-dashed border-[#1A1A1A]/20 dark:border-stone-700 min-h-[160px] bg-[#F7F5F2]/60 dark:bg-[#141413] flex flex-col items-center justify-center p-2 rounded-xs">
                    {p.isGeneratingImage ? (
                      <div className="text-center space-y-2 p-6">
                        <RefreshCw className="w-7 h-7 animate-spin text-red-800 mx-auto" />
                        <p className="text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/80 dark:text-[#EAE8E3]/80">
                          Đang tạo hình minh họa cho Câu {p.id}...
                        </p>
                        <p className="text-[11px] text-[#1A1A1A]/50 dark:text-[#EAE8E3]/50">Vui lòng chờ trong giây lát (AI đang xử lý chi tiết vector/ảnh)...</p>
                      </div>
                    ) : p.generatedImageDataUrl ? (
                      <div className="relative group w-full space-y-2">
                        {/* High Contrast White Canvas for Image */}
                        <div className="relative overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 p-3 flex flex-col items-center justify-center min-h-[200px]">
                          <img
                            src={getSafeImageSrc(p.generatedImageDataUrl)}
                            alt={p.imageTitle || `Hình minh họa câu ${p.id}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-auto object-contain max-h-[320px] transition-transform duration-200 group-hover:scale-[1.01]"
                            onError={(e) => {
                              console.error(`Lỗi hiển thị ảnh cho Câu ${p.id}`, e);
                            }}
                          />
                          <div className="absolute inset-0 bg-[#1A1A1A]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                            <button
                              onClick={() => downloadImageAsPng(p.generatedImageDataUrl!, `Hinh_minh_hoa_Cau_${p.id}`)}
                              className="px-3 py-1.5 border border-white bg-emerald-700 text-white font-sans font-bold uppercase text-xs shadow-md tracking-wider flex items-center gap-1 hover:bg-emerald-800"
                            >
                              <Download className="w-3.5 h-3.5" /> Tải ảnh PNG (.PNG)
                            </button>
                            <button
                              onClick={() => {
                                const win = window.open();
                                if (win) {
                                  const safeSrc = getSafeImageSrc(p.generatedImageDataUrl);
                                  win.document.write(`
                                    <html>
                                      <head><title>Hình minh họa Câu ${p.id}</title></head>
                                      <body style="margin:0; background:#f4f4f5; display:flex; items-center; justify-content:center; min-height:100vh;">
                                        <img src="${safeSrc}" style="max-width:95vw; max-height:95vh; object-contain; background:white; padding:20px; box-shadow:0 10px 25px rgba(0,0,0,0.1);"/>
                                      </body>
                                    </html>
                                  `);
                                }
                              }}
                              className="px-3 py-1.5 border border-white bg-white text-[#1A1A1A] font-sans font-bold uppercase text-xs shadow-md tracking-wider flex items-center gap-1 hover:bg-gray-100"
                            >
                              <Maximize2 className="w-3.5 h-3.5" /> Xem khổ lớn
                            </button>
                          </div>
                        </div>

                        {/* Image Download Bar directly below image */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-emerald-950/10 dark:bg-emerald-950/30 border border-emerald-800/30">
                          <span className="text-[11px] font-sans font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                            Đã tạo hình minh họa thành công
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => downloadImageAsPng(p.generatedImageDataUrl!, `Hinh_minh_hoa_Cau_${p.id}`)}
                              className="px-3 py-1 text-xs font-sans font-bold uppercase tracking-wider bg-emerald-800 text-white hover:bg-emerald-900 transition-colors flex items-center gap-1 border border-emerald-900 shadow-2xs"
                            >
                              <Download className="w-3.5 h-3.5" /> TẢI ÁNH PNG
                            </button>
                            {(p.generatedImageDataUrl.startsWith('data:image/svg+xml') || p.generatedImageDataUrl.includes('<svg')) && (
                              <button
                                onClick={() => downloadImageAsSvg(p.generatedImageDataUrl!, `Hinh_minh_hoa_Cau_${p.id}`)}
                                className="px-3 py-1 text-xs font-sans font-bold uppercase tracking-wider bg-blue-800 text-white hover:bg-blue-900 transition-colors flex items-center gap-1 border border-blue-900 shadow-2xs"
                              >
                                <FileCode className="w-3.5 h-3.5" /> TẢI VECTOR SVG
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <Image className="w-8 h-8 text-[#1A1A1A]/30 dark:text-stone-700 mx-auto" />
                        <p className="text-xs text-[#1A1A1A]/60 dark:text-[#EAE8E3]/60 font-sans uppercase tracking-wider font-bold">Chưa tạo hình minh họa</p>
                        <button
                          onClick={() => handleGenerateSingleImage(p)}
                          className="px-3 py-1 text-xs font-sans font-bold uppercase tracking-wider bg-red-800 text-white hover:bg-red-900 inline-flex items-center gap-1 border border-red-900"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> TẠO ÁNH TRỰC TIẾP CHO CÂU {p.id}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: TikZ Code Block (Area D requirement) */}
                <div className="space-y-3 border-t lg:border-t-0 lg:border-l border-[#1A1A1A]/10 dark:border-stone-800 lg:pl-6 pt-4 lg:pt-0">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] dark:text-[#EAE8E3] flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-red-800" />
                      Mã TikZ Biên Dịch Trên Overleaf:
                    </label>
                    <button
                      onClick={() => {
                        setEditingTikzId(isEditingTikz ? null : p.id);
                        setEditTikzText(p.tikzCode);
                      }}
                      className="text-xs font-sans font-bold uppercase tracking-wider text-red-800 dark:text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      {isEditingTikz ? 'Hủy sửa TikZ' : 'Sửa mã TikZ'}
                    </button>
                  </div>

                  {p.tikzNeeded && p.tikzCode ? (
                    <div className="space-y-2">
                      {isEditingTikz ? (
                        <div className="space-y-2">
                          <textarea
                            value={editTikzText}
                            onChange={(e) => setEditTikzText(e.target.value)}
                            rows={8}
                            className="w-full p-2.5 border border-red-800 text-xs bg-[#1A1A1A] text-[#F7F5F2] font-mono"
                          />
                          <button
                            onClick={() => {
                              onUpdateProblem({ ...p, tikzCode: editTikzText });
                              setEditingTikzId(null);
                            }}
                            className="px-3 py-1 bg-red-800 text-white text-xs font-sans font-bold uppercase tracking-wider border border-red-900"
                          >
                            Lưu mã TikZ
                          </button>
                        </div>
                      ) : (
                        <pre className="p-3.5 bg-[#1A1A1A] text-[#EAE8E3] font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[220px] scrollbar-thin">
                          <code>{p.tikzCode}</code>
                        </pre>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          onClick={() =>
                            copyText(p.tikzCode, `Đã sao chép TikZ Câu ${p.id}`)
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider bg-red-800/10 text-red-800 dark:text-red-300 border border-red-800/30 hover:bg-red-800 hover:text-white transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Sao chép TikZ
                        </button>
                        <button
                          onClick={() => handleDownloadTikz(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider border border-[#1A1A1A]/20 dark:border-stone-700 text-[#1A1A1A] dark:text-[#EAE8E3] hover:bg-[#1A1A1A]/5"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          Tải file .tex
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#F7F5F2] dark:bg-[#141413] border border-[#1A1A1A]/15 dark:border-stone-800 text-xs text-[#1A1A1A]/60 italic space-y-2">
                      <p>
                        Bài toán này không bắt buộc sử dụng hình TikZ độc lập.
                      </p>
                      <button
                        onClick={() =>
                          onUpdateProblem({
                            ...p,
                            tikzNeeded: true,
                            tikzCode: `\\documentclass[tikz,border=5pt]{standalone}\n\\usepackage{tikz}\n\\begin{document}\n\\begin{tikzpicture}\n% Mã hình vẽ câu ${p.id}\n\\draw[blue,thick] (0,0) rectangle (4,3);\n\\node at (2,1.5) {Mô phỏng bài toán câu ${p.id}};\n\\end{tikzpicture}\n\\end{document}`,
                          })
                        }
                        className="px-3 py-1 bg-[#1A1A1A] text-white dark:bg-[#EAE8E3] dark:text-[#141413] text-xs font-sans font-bold uppercase tracking-wider not-italic"
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
      <div className="bg-white dark:bg-[#1E1D1B] p-4 border border-[#1A1A1A]/15 dark:border-stone-800 flex items-center justify-between">
        <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] dark:text-[#EAE8E3]">
          Xuất toàn bộ mã TikZ cho Overleaf:
        </span>
        <button
          onClick={handleDownloadAllTikzZip}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-sans font-bold uppercase tracking-[0.12em] bg-red-800 text-white hover:bg-red-900 border border-red-900 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          Tải ZIP tất cả 10 file TikZ (.tex)
        </button>
      </div>
    </div>
  );
};
