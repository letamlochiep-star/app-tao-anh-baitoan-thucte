import React, { useState } from 'react';
import { Eye, EyeOff, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw, Trash2, X, ExternalLink, KeyRound, Layers } from 'lucide-react';
import { ApiStatus } from '../types';

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
  availableModels: { id: string; name: string; isFree: boolean }[];
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                CẤU HÌNH GEMINI API & XOAY VÒNG KEY
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Hỗ trợ 1 hoặc nhiều API Key dự phòng (Multi-Key Rotation)
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
            <span>Cơ chế xoay vòng thông minh (Load Balancer):</span>
          </div>
          <p>
            Thầy/Cô có thể nhập <strong>1 hoặc nhiều API Key</strong> (ngăn cách bằng dấu phẩy <code>,</code> hoặc xuống dòng). Khi Key 1 hết hạn mức (Quota/429), hệ thống tự động chuyển mượt sang Key 2, Key 3 mà không làm gián đoạn việc soạn đề.
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
                Danh sách Gemini API Key (1 hoặc nhiều khóa)
              </label>
              {parsedKeys.length > 0 && (
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
                  {parsedKeys.length} khóa đã nhập
                </span>
              )}
            </div>
            <div className="relative">
              <textarea
                rows={3}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Dán 1 hoặc nhiều API Key tại đây, ví dụ:&#10;AIzaSyA1...&#10;AIzaSyB2..."
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
              Mô hình Gemini ưu tiên hàng đầu
            </label>
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Hệ thống tự động cascade theo thứ tự 10 model: <code>gemini-3.6-flash &rarr; gemini-3.1-pro &rarr; gemini-3.5-flash &rarr; gemini-3.1-flash-lite &rarr; gemini-2.5-pro...</code>
            </p>
          </div>

          {/* Session Save Checkbox */}
          <div className="flex items-center gap-2">
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
            <li>Đăng nhập tài khoản Google của bạn</li>
            <li>Bấm <strong>"Create API Key"</strong> và sao chép khóa</li>
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
