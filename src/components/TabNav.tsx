import React from 'react';
import { FileText, ListOrdered, Image, BookOpen, Download } from 'lucide-react';

export type TabType = 'input' | 'problems' | 'images' | 'solutions' | 'export';

interface TabNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  hasProblems: boolean;
  problemCount: number;
}

export const TabNav: React.FC<TabNavProps> = ({
  activeTab,
  onSelectTab,
  hasProblems,
  problemCount,
}) => {
  const tabs = [
    {
      id: 'input' as TabType,
      label: '1. NHẬP ĐỀ BÀI GỐC',
      icon: FileText,
      badge: null,
    },
    {
      id: 'problems' as TabType,
      label: '2. 10 BÀI TƯƠNG TỰ',
      icon: ListOrdered,
      badge: hasProblems ? `${problemCount}/10` : null,
    },
    {
      id: 'images' as TabType,
      label: '3. HÌNH MINH HỌA & TIKZ',
      icon: Image,
      badge: hasProblems ? 'Ảnh & TikZ' : null,
    },
    {
      id: 'solutions' as TabType,
      label: '4. LỜI GIẢI CHI TIẾT',
      icon: BookOpen,
      badge: hasProblems ? 'Lời giải' : null,
    },
    {
      id: 'export' as TabType,
      label: '5. XUẤT TÀI LIỆU WORD',
      icon: Download,
      badge: hasProblems ? '.docx' : null,
    },
  ];

  return (
    <nav className="bg-[#F8FAFC] dark:bg-[#0B0F19] border-b border-slate-200 dark:border-slate-800 sticky top-[68px] z-20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-sans font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 rounded border ${
                  isActive
                    ? 'bg-blue-900 text-white border-blue-900 dark:bg-blue-600 dark:text-white dark:border-blue-600 shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:text-blue-900 dark:hover:text-white border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-200' : 'text-blue-700 dark:text-blue-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                      isActive
                        ? 'bg-blue-800 text-white dark:bg-blue-800 dark:text-white'
                        : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
