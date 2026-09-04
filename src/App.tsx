import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ApiKeyModal } from './components/ApiKeyModal';
import { UserGuideModal } from './components/UserGuideModal';
import { TabNav, TabType } from './components/TabNav';
import { Tab1Input } from './components/Tab1Input';
import { Tab2Problems } from './components/Tab2Problems';
import { Tab3ImagesAndTikz } from './components/Tab3ImagesAndTikz';
import { Tab4Solutions } from './components/Tab4Solutions';
import { Tab5WordExport } from './components/Tab5WordExport';
import {
  GenerationOptions,
  SourceAnalysis,
  ProblemItem,
  ApiStatus
} from './types';
import { exportQuickWord } from './utils/wordExport';
import { safeJsonStringify } from './utils/jsonUtils';
import {
  APP_NAME,
  BRANDING_DEFAULT,
  SAMPLE_PROBLEM_TEXT,
  SAMPLE_OPTIONS,
  AVAILABLE_MODELS,
  AVAILABLE_IMAGE_MODELS
} from './constants';
import {
  apiTestKey,
  apiAnalyzeProblem,
  apiGenerate10,
  apiRegenerateOne
} from './services/geminiClient';

export function App() {
  // 1. Core State
  const [sourceProblemText, setSourceProblemText] = useState<string>('');
  const [options, setOptions] = useState<GenerationOptions>(SAMPLE_OPTIONS);
  const [analysis, setAnalysis] = useState<SourceAnalysis | null>(null);
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('input');

  // 2. API & Connection State
  const [apiKey, setApiKey] = useState<string>(() => {
    return sessionStorage.getItem('gemini_api_key') || '';
  });
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [selectedImageModel, setSelectedImageModel] = useState<string>('imagen-3.0-generate-002');
  const [apiStatus, setApiStatus] = useState<ApiStatus>('unconnected');
  const [apiMessage, setApiMessage] = useState<string>('');

  // 3. UI Control Modals
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [showAnswers, setShowAnswers] = useState<boolean>(false);

  // 4. Progress & Processing State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Apply dark mode theme class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Check API key connection on boot if key exists
  useEffect(() => {
    if (apiKey) {
      handleTestConnection(apiKey);
    }
  }, []);

  // 5. Test Connection Logic (Supports Dual-layer: Server + Direct Client)
  const handleTestConnection = async (keyToTest: string) => {
    const cleanKey = keyToTest?.trim();
    if (!cleanKey) {
      setApiStatus('error');
      setApiMessage('Vui lòng nhập Gemini API Key.');
      return;
    }

    setApiStatus('checking');
    setApiMessage('Đang kiểm tra kết nối với Gemini API...');

    try {
      const data = await apiTestKey(cleanKey);

      if (data.success) {
        setApiStatus('connected');
        setApiMessage(data.message || 'Kết nối Gemini API thành công.');
      } else {
        const isQuota = data.message?.includes('hạn mức') || data.message?.includes('giới hạn') || data.message?.includes('429');
        setApiStatus(isQuota ? 'quota_exceeded' : 'error');
        setApiMessage(data.message || 'Không thể kết nối Gemini API. Vui lòng kiểm tra lại khóa.');
      }
    } catch (err: any) {
      setApiStatus('error');
      setApiMessage(err?.message || 'Lỗi kết nối tới Gemini API.');
    }
  };

  // 6. Save API Key
  const handleSaveApiKey = (key: string, saveInSession: boolean) => {
    setApiKey(key);
    if (saveInSession) {
      sessionStorage.setItem('gemini_api_key', key);
    } else {
      sessionStorage.removeItem('gemini_api_key');
    }
    if (key.trim()) {
      handleTestConnection(key);
    } else {
      setApiStatus('unconnected');
      setApiMessage('');
    }
  };

  // 7. Delete API Key
  const handleDeleteApiKey = () => {
    setApiKey('');
    sessionStorage.removeItem('gemini_api_key');
    setApiStatus('unconnected');
    setApiMessage('');
  };

  // 8. Load Sample Data
  const handleLoadSample = () => {
    setSourceProblemText(SAMPLE_PROBLEM_TEXT);
    setOptions(SAMPLE_OPTIONS);
  };

  // 9. Clear Data
  const handleClearData = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ đề bài và kết quả đã tạo?')) {
      setSourceProblemText('');
      setAnalysis(null);
      setProblems([]);
    }
  };

  // 10. Save & Restore Draft (LocalStorage)
  const handleSaveDraft = () => {
    const draft = {
      sourceProblemText,
      options,
      analysis,
      problems,
    };
    try {
      localStorage.setItem('math_assistant_draft', safeJsonStringify(draft));
      alert('Đã lưu bản nháp thành công vào trình duyệt!');
    } catch (e) {
      alert('Không thể lưu bản nháp.');
    }
  };

  const handleRestoreDraft = () => {
    const saved = localStorage.getItem('math_assistant_draft');
    if (!saved) {
      alert('Không tìm thấy bản nháp nào được lưu trước đó.');
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      if (parsed.sourceProblemText !== undefined) setSourceProblemText(parsed.sourceProblemText);
      if (parsed.options) setOptions(parsed.options);
      if (parsed.analysis) setAnalysis(parsed.analysis);
      if (parsed.problems) setProblems(parsed.problems);
      alert('Khôi phục bản nháp thành công!');
    } catch (e) {
      alert('Không thể đọc dữ liệu bản nháp.');
    }
  };

  // 11. Step 1: Analyze Source Problem
  const handleAnalyzeProblem = async () => {
    if (!sourceProblemText.trim()) {
      alert('Vui lòng nhập đề bài gốc.');
      return;
    }

    setIsAnalyzing(true);
    setProgressStep('Đang phân tích bài toán gốc...');
    setProgressPercent(20);

    try {
      const data = await apiAnalyzeProblem(sourceProblemText, options, apiKey, selectedModel);

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        setProgressPercent(100);
        setProgressStep('Phân tích hoàn tất!');
      } else {
        const errMsg = data.error || 'Lỗi khi phân tích đề bài.';
        alert(errMsg);
        if (errMsg.includes('API Key') || errMsg.includes('Chưa nhập') || errMsg.includes('chưa cấu hình')) {
          setIsApiKeyModalOpen(true);
        }
      }
    } catch (err: any) {
      alert('Lỗi kết nối khi gọi Gemini API.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 12. Step 2: Generate 10 Similar Problems
  const handleGenerate10 = async () => {
    if (!sourceProblemText.trim()) {
      alert('Vui lòng nhập hoặc nạp một đề bài toán gốc.');
      return;
    }

    setIsGenerating(true);

    const steps = [
      { step: '1. Đang kiểm tra API key & mô hình...', pct: 10 },
      { step: '2. Đang phân tích bài toán gốc...', pct: 20 },
      { step: '3. Đang nhận diện kiến thức trọng tâm...', pct: 30 },
      { step: '4. Đang xây dựng dữ liệu thực tế...', pct: 40 },
      { step: '5. Đang tạo 10 bài toán thực tế...', pct: 50 },
      { step: '6. Đang kiểm tra nghiệm và công thức LaTeX...', pct: 60 },
      { step: '7. Đang tạo câu lệnh hình ảnh minh họa...', pct: 70 },
      { step: '8. Đang tạo mã TikZ Overleaf...', pct: 80 },
      { step: '9. Đang xây dựng lời giải chi tiết...', pct: 90 },
      { step: '10. Đang hoàn thiện cấu trúc...', pct: 95 },
      { step: '11. Đã hoàn tất 10 bài toán!', pct: 100 },
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length - 2) {
        currentStepIdx++;
        setProgressStep(steps[currentStepIdx].step);
        setProgressPercent(steps[currentStepIdx].pct);
      }
    }, 1200);

    try {
      setProgressStep(steps[0].step);
      setProgressPercent(10);

      // Find existing locked problems to preserve
      const lockedProblems = problems.filter((p) => p.isLocked);

      const data = await apiGenerate10(
        sourceProblemText,
        options,
        analysis,
        apiKey,
        selectedModel,
        lockedProblems
      );

      clearInterval(interval);

      if (data.success && data.data) {
        if (data.data.sourceAnalysis) {
          setAnalysis(data.data.sourceAnalysis);
        }
        if (data.data.problems && Array.isArray(data.data.problems)) {
          setProblems(data.data.problems);
          setProgressStep(steps[10].step);
          setProgressPercent(100);
          // Switch automatically to Tab 2
          setActiveTab('problems');
        } else {
          alert('Dữ liệu AI trả về chưa đúng danh sách 10 bài toán.');
        }
      } else {
        alert(data.error || 'Lỗi khi tạo 10 bài toán tương tự.');
      }
    } catch (err) {
      clearInterval(interval);
      alert('Lỗi kết nối khi gọi Gemini API.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 13. Regenerate single question
  const handleRegenerateOne = async (id: number) => {
    setIsGenerating(true);
    try {
      const data = await apiRegenerateOne(
        id,
        sourceProblemText,
        options,
        analysis,
        apiKey,
        selectedModel
      );

      if (data.success && data.problem) {
        setProblems((prev) =>
          prev.map((p) => (p.id === id ? { ...data.problem, id, isLocked: false } : p))
        );
        alert(`Đã tạo mới thành công Câu ${id} (AI Model: ${data.modelUsed || selectedModel})!`);
      } else {
        const errMsg = data.error || `Không thể tạo lại Câu ${id}.`;
        alert(errMsg);
        if (errMsg.includes('API Key') || errMsg.includes('Chưa nhập') || errMsg.includes('chưa cấu hình')) {
          setIsApiKeyModalOpen(true);
        }
      }
    } catch (err) {
      alert(`Lỗi kết nối khi tạo lại Câu ${id}.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 14. Lock / Unlock Problem Toggle
  const handleToggleLock = (id: number) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isLocked: !p.isLocked } : p))
    );
  };

  // 15. Single Problem Update
  const handleUpdateProblem = (updated: ProblemItem) => {
    setProblems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Top Main Header */}
      <Header
        apiStatus={apiStatus}
        apiMessage={apiMessage}
        apiKey={apiKey}
        isDarkMode={isDarkMode}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenUserGuide={() => setIsUserGuideOpen(true)}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onSaveDraft={handleSaveDraft}
        onRestoreDraft={handleRestoreDraft}
        onDownloadWord={() => exportQuickWord(problems)}
        hasProblems={problems.length > 0}
      />

      {/* Main Tab Navigation */}
      <TabNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        hasProblems={problems.length > 0}
        problemCount={problems.length}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'input' && (
          <Tab1Input
            sourceProblemText={sourceProblemText}
            options={options}
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            isGenerating={isGenerating}
            progressStep={progressStep}
            progressPercent={progressPercent}
            apiKey={apiKey}
            selectedModel={selectedModel}
            onChangeSourceText={setSourceProblemText}
            onChangeOptions={setOptions}
            onAnalyzeProblem={handleAnalyzeProblem}
            onGenerate10={handleGenerate10}
            onLoadSample={handleLoadSample}
            onClearData={handleClearData}
            onSaveDraft={handleSaveDraft}
            onRestoreDraft={handleRestoreDraft}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            onUpdateAnalysis={setAnalysis}
          />
        )}

        {activeTab === 'problems' && (
          <Tab2Problems
            problems={problems}
            showAnswers={showAnswers}
            onToggleShowAnswers={() => setShowAnswers(!showAnswers)}
            onToggleLock={handleToggleLock}
            onUpdateProblem={handleUpdateProblem}
            onRegenerateOne={handleRegenerateOne}
            onRegenerateUnlocked={handleGenerate10}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onExportJson={() => {
              const dataStr = safeJsonStringify(problems, 2);
              const blob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = '10_bai_toan_thuc_te.json';
              a.click();
            }}
            isGenerating={isGenerating}
          />
        )}

        {activeTab === 'images' && (
          <Tab3ImagesAndTikz
            problems={problems}
            apiKey={apiKey}
            selectedImageModel={selectedImageModel}
            onUpdateProblem={handleUpdateProblem}
          />
        )}

        {activeTab === 'solutions' && (
          <Tab4Solutions
            problems={problems}
            showAnswers={showAnswers}
            onToggleShowAnswers={() => setShowAnswers(!showAnswers)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'export' && (
          <Tab5WordExport
            problems={problems}
            onImportJson={(imported) => {
              setProblems(imported);
              setActiveTab('problems');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 mt-12 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-4">
          <p>{BRANDING_DEFAULT}</p>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        apiKey={apiKey}
        selectedModel={selectedModel}
        apiStatus={apiStatus}
        apiMessage={apiMessage}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaveApiKey={handleSaveApiKey}
        onTestConnection={handleTestConnection}
        onDeleteApiKey={handleDeleteApiKey}
        onSelectModel={setSelectedModel}
        availableModels={AVAILABLE_MODELS}
      />

      {/* User Guide Modal */}
      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
      />
    </div>
  );
}

export default App;
