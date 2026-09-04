import React, { useState } from 'react';
import { Eye, EyeOff, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw, Trash2, X, ExternalLink } from 'lucide-react';
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

  const getMaskedDisplay = () => {
    if (!apiKey) return null;
    const last4 = apiKey.length >= 4 ? apiKey.slice(-4) : "••••";
    return `API key đang dùng: ••••••••${last4}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              KẾT NỐI GEMINI API
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          Nhập Gemini API key của chính bạn để sử dụng các chức năng tạo nội dung. Ứng dụng không lưu API key lâu dài và không gửi key đến dịch vụ nào ngoài Gemini API.
        </p>

        {/* Currently Used Key Badge */}
        {getMaskedDisplay() && (
          <div className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {getMaskedDisplay()}
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-4">
          {/* API Key Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Nhập Gemini API key của bạn"
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Chọn mô hình Gemini
            </label>
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Session Save Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="saveSession"
              checked={saveInSession}
              onChange={(e) => setSaveInSession(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
            />
            <label htmlFor="saveSession" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              Lưu trong phiên làm việc này (SessionStorage)
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
            <span>Cách lấy API Key miễn phí:</span>
          </div>
          <ol className="list-decimal list-inside space-y-0.5 ml-1 text-amber-800 dark:text-amber-300">
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
          <p className="pt-1 text-[11px] italic text-amber-700 dark:text-amber-400">
            ⚠️ Cảnh báo: Tuyệt đối không chia sẻ API Key cho người khác!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa API key
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !inputKey.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              Kiểm tra kết nối
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
            >
              Lưu trong phiên này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
