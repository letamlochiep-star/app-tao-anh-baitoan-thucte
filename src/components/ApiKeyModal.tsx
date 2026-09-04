import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  X,
  ExternalLink,
  KeyRound,
  Layers,
  Cpu,
  Zap,
  Gauge,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Brain,
  Camera
} from 'lucide-react';
import { ApiStatus, ModelSpec } from '../types';

interface ApiKeyModalProps {
  isOpen: boolean;
  apiKey: string;
  selectedModel: string;
  apiStatus: ApiStatus;
  apiMessage: string;
  onClose: () => void;
  onSaveApiKey: (key: string, saveInSession: boolean) => void;
  onTestConnection: (keyToTest: string) => Promise<void>;
  onDeleteApiKey: () => void;
  onSelectModel: (model: string) => void;
  availableModels: ModelSpec[];
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  apiKey,
  selectedModel,
  apiStatus,
  apiMessage,
  onClose,
  onSaveApiKey,
  onTestConnection,
  onDeleteApiKey,
  onSelectModel,
  availableModels,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saveInSession, setSaveInSession] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [showFullSpecsTable, setShowFullSpecsTable] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!inputKey.trim()) return;
    setIsTesting(true);
    await onTestConnection(inputKey);
    setIsTesting(false);
  };

  const handleSave = () => {
    onSaveApiKey(inputKey, saveInSession);
    onClose();
  };

  const handleDelete = () => {
    setInputKey("");
    onDeleteApiKey();
  };

  // Helper to count parsed keys
  const parsedKeys = inputKey
    .split(/[\n\r,;]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 5);

  const getMaskedDisplay = () => {
    if (!apiKey) return null;
    const keys = apiKey
      .split(/[\n\r,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);

    if (keys.length === 0) return null;
    const masked = keys
      .map((k) => (k.length >= 4 ? `••••••••${k.slice(-4)}` : "••••••••"))
      .join(", ");
    return `Đang dùng (${keys.length} Key): ${masked}`;
  };

  // Currently selected model spec object
  const currentModelSpec = availableModels.find((m) => m.id === selectedModel) || availableModels[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8 max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                CẤU HÌNH GEMINI API & THÔNG SỐ MÔ HÌNH
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Xoay vòng Multi-Key & Bảng thông số từ Gemini 3.8 Flash trở xuống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-blue-50/60 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200/80 dark:border-blue-800/80 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300">
            <Layers className="w-4 h-4" />
            <span>Tự động cân bằng tải (Multi-Key Rotation) & Cascade 10 Mô hình:</span>
          </div>
          <p>
            Thầy/Cô có thể nhập <strong>nhiều API Key</strong> (cách nhau bởi dấu phẩy <code>,</code> hoặc xuống dòng). Khi gặp lỗi giới hạn (429/Quota), hệ thống sẽ <strong>nghỉ 800ms (Backoff)</strong> và tự động chuyển sang Key tiếp theo cũng như chuyển mượt qua danh sách mô hình ưu tiên từ <strong>Gemini 3.8 Flash</strong> xuống các bản nhẹ hơn.
          </p>
        </div>

        {/* Currently Used Key Badge */}
        {getMaskedDisplay() && (
          <div className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {getMaskedDisplay()}
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-4">
          {/* API Key Field (Textarea for multiple keys) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Gemini API Key (Hỗ trợ 1 hoặc nhiều khóa)
              </label>
              {parsedKeys.length > 0 && (
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
                  {parsedKeys.length} khóa hợp lệ
                </span>
              )}
            </div>
            <div className="relative">
              <textarea
                rows={2}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Dán 1 hoặc nhiều API Key tại đây, ví dụ: AIzaSyA1..., AIzaSyB2..."
                className={`w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all ${
                  !showKey ? 'filter-blur-[0.5px]' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? "Ẩn khóa" : "Hiện khóa"}
                className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Chọn mô hình Gemini ưu tiên (Xếp từ 3.8 Flash trở xuống)
            </label>
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* SELECTED MODEL SPECIFICATIONS CARD */}
          {currentModelSpec && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-700 dark:text-blue-400">
                  <Cpu className="w-4 h-4" />
                  <span>THÔNG SỐ KỸ THUẬT: {currentModelSpec.id}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {currentModelSpec.generation}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {/* Context Window */}
                <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Ngữ cảnh (Context)</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-600" />
                    {currentModelSpec.contextWindow}
                  </div>
                </div>

                {/* Speed / Latency */}
                <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Tốc độ phản hồi</div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {currentModelSpec.speed}
                  </div>
                </div>

                {/* Math Reasoning */}
                <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Suy luận toán học</div>
                  <div className="font-bold text-blue-700 dark:text-blue-300 text-xs flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    {currentModelSpec.mathReasoning}
                  </div>
                </div>

                {/* Multimodal OCR */}
                <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">OCR Ảnh / Đa phương thức</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] flex items-center gap-1">
                    <Camera className="w-3 h-3 text-blue-600" />
                    {currentModelSpec.multimodal.split('(')[0]}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                <strong>Ứng dụng tối ưu:</strong> {currentModelSpec.recommendedFor}
              </div>
            </div>
          )}

          {/* TOGGLE FULL MODEL COMPARISON TABLE */}
          <div>
            <button
              type="button"
              onClick={() => setShowFullSpecsTable(!showFullSpecsTable)}
              className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1 uppercase tracking-wider cursor-pointer"
            >
              {showFullSpecsTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showFullSpecsTable
                ? "Ẩn bảng thông số toàn bộ mô hình"
                : "Xem bảng thông số toàn bộ mô hình (Từ Gemini 3.8 Flash trở xuống)"}
            </button>

            {showFullSpecsTable && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 animate-fade-in max-h-[260px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0">
                      <th className="p-2.5">Mô hình AI</th>
                      <th className="p-2.5">Thế hệ</th>
                      <th className="p-2.5">Ngữ cảnh</th>
                      <th className="p-2.5">Tốc độ</th>
                      <th className="p-2.5">Toán học</th>
                      <th className="p-2.5">Chọn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-[11px]">
                    {availableModels.map((m) => {
                      const isCurrent = m.id === selectedModel;
                      return (
                        <tr
                          key={m.id}
                          className={`hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors ${
                            isCurrent ? 'bg-blue-50 dark:bg-blue-950/60 font-semibold' : ''
                          }`}
                        >
                          <td className="p-2.5">
                            <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{m.id}</span>
                            <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{m.name.split('(')[0]}</div>
                          </td>
                          <td className="p-2.5">{m.generation}</td>
                          <td className="p-2.5 font-mono">{m.contextWindow.split(' ')[0]}</td>
                          <td className="p-2.5 text-emerald-700 dark:text-emerald-400">{m.speed}</td>
                          <td className="p-2.5 font-bold">{m.mathReasoning}</td>
                          <td className="p-2.5">
                            <button
                              type="button"
                              onClick={() => onSelectModel(m.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                isCurrent
                                  ? 'bg-blue-700 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-100'
                              }`}
                            >
                              {isCurrent ? "Đang chọn" : "Chọn"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Session Save Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="saveSession"
              checked={saveInSession}
              onChange={(e) => setSaveInSession(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
            />
            <label htmlFor="saveSession" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              Lưu trong phiên làm việc này (SessionStorage trình duyệt)
            </label>
          </div>
        </div>

        {/* Status Message */}
        {apiMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
              apiStatus === 'connected'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {apiStatus === 'connected' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            )}
            <span>{apiMessage}</span>
          </div>
        )}

        {/* How to Get API Key */}
        <div className="text-xs space-y-1 bg-amber-50/60 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-1 font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Cách lấy API Key miễn phí từ Google:</span>
          </div>
          <ol className="list-decimal list-inside space-y-0.5 ml-1 text-amber-800 dark:text-amber-300 text-[11px]">
            <li>
              Truy cập{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-400"
              >
                Google AI Studio <ExternalLink className="w-3 h-3 inline" />
              </a>
            </li>
            <li>Đăng nhập tài khoản Google & bấm <strong>"Create API Key"</strong> để sao chép khóa</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa API key
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !inputKey.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              Kiểm tra kết nối
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
