import React from 'react';
import { Key, HelpCircle, Moon, Sun, Save, RotateCcw, CheckCircle2, AlertCircle, Clock, ShieldCheck, Download } from 'lucide-react';
import { ApiStatus } from '../types';
import { APP_NAME, APP_SUBTITLE, BRANDING_DEFAULT } from '../constants';

interface HeaderProps {
  apiStatus: ApiStatus;
  apiMessage: string;
  apiKey: string;
  isDarkMode: boolean;
  onOpenApiKeyModal: () => void;
  onOpenUserGuide: () => void;
  onToggleDarkMode: () => void;
  onSaveDraft: () => void;
  onRestoreDraft: () => void;
  onDownloadWord?: () => void;
  hasProblems?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  apiStatus,
  apiMessage,
  apiKey,
  isDarkMode,
  onOpenApiKeyModal,
  onOpenUserGuide,
  onToggleDarkMode,
  onSaveDraft,
  onRestoreDraft,
  onDownloadWord,
  hasProblems = false,
}) => {
  const getStatusBadge = () => {
    switch (apiStatus) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-sans font-bold uppercase tracking-wider bg-emerald-900/10 text-emerald-800 dark:text-emerald-300 border border-emerald-800/30">
            <CheckCircle2 className="w-3 h-3" />
            Đã kết nối
          </span>
        );
      case 'checking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-sans font-bold uppercase tracking-wider bg-amber-900/10 text-amber-800 dark:text-amber-300 border border-amber-800/30 animate-pulse">
            <Clock className="w-3 h-3 animate-spin" />
            Đang kiểm tra...
          </span>
        );
      case 'quota_exceeded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-sans font-bold uppercase tracking-wider bg-amber-900/10 text-amber-800 dark:text-amber-300 border border-amber-800/30">
            <AlertCircle className="w-3 h-3" />
            Hết hạn mức
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-sans font-bold uppercase tracking-wider bg-red-900/10 text-red-800 dark:text-red-300 border border-red-800/30">
            <AlertCircle className="w-3 h-3" />
            Lỗi kết nối
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-sans font-bold uppercase tracking-wider bg-stone-200/60 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border border-stone-300 dark:border-stone-700">
            <ShieldCheck className="w-3 h-3" />
            Chưa kết nối
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#F8FAFC]/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Top Scientific & Academic Eyebrow Banner */}
        <div className="flex justify-between items-center text-[11px] font-sans font-semibold text-blue-800 dark:text-blue-400 border-b border-slate-200 dark:border-slate-800/80 pb-1.5 mb-2.5">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            HỆ THỐNG KHOA HỌC & GIÁO DỤC 4.0 &mdash; STEM & MATH ANALYSIS
          </span>
          <span className="hidden sm:inline font-sans text-[11px] text-slate-600 dark:text-slate-400 font-medium">{BRANDING_DEFAULT}</span>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">PHIÊN BẢN 2026</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Titles */}
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-900 text-white dark:bg-blue-600 dark:text-white flex items-center justify-center font-bold text-xl shadow-xs font-mono">
                ∑
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {APP_NAME}
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-sans tracking-normal font-normal">
                  {APP_SUBTITLE}
                </p>
              </div>
            </div>
          </div>

          {/* Controls & API Key Modal Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Badge */}
            <div className="mr-1">{getStatusBadge()}</div>

            {/* Quick Word Download Button */}
            {hasProblems && onDownloadWord && (
              <button
                onClick={onDownloadWord}
                title="Tải toàn bộ tài liệu về máy chuẩn văn phong và hình thức văn bản Word (.docx)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded bg-emerald-700 text-white hover:bg-emerald-800 border border-emerald-800 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">TẢI FILE WORD (.DOCX)</span>
                <span className="sm:hidden">WORD</span>
              </button>
            )}

            {/* API Config Button */}
            <button
              onClick={onOpenApiKeyModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded bg-blue-700 text-white hover:bg-blue-800 border border-blue-800 transition-colors shadow-xs"
            >
              <Key className="w-3.5 h-3.5" />
              <span>CẤU HÌNH API KEY</span>
            </button>

            {/* Save / Restore Draft */}
            <button
              onClick={onSaveDraft}
              title="Lưu bản nháp công việc vào trình duyệt"
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={onRestoreDraft}
              title="Khôi phục bản nháp đã lưu"
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* User Guide */}
            <button
              onClick={onOpenUserGuide}
              title="Hướng dẫn sử dụng"
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={onToggleDarkMode}
              title={isDarkMode ? "Đổi giao diện sáng" : "Đổi giao diện tối"}
              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
