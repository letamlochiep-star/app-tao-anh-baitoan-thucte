export interface SourceAnalysis {
  gradeLevel: string;
  grade: string;
  topic: string;
  problemType: string;
  knowledgeFocus: string;
  coreMethod: string;
  difficulty: string;
  givenData: string[];
  requiredResult: string;
  units: string[];
  commonMistakes: string[];
  visualElements: string[];
  tikzSuitability: string;
  modelUsed?: string;
}

export interface ProblemValidation {
  dataConsistent: boolean;
  unitsConsistent: boolean;
  answerVerified: boolean;
  imageConsistent: boolean;
  latexValid: boolean;
  tikzValid: boolean;
}

export interface ProblemItem {
  id: number;
  title: string;
  context: string;
  difficulty: string;
  questionType: string;
  problemText: string;
  latexProblemText: string;
  latexFormulas: string[];
  givenData: string[];
  requiredResult: string;
  units: string[];
  answerOptions: string[];
  correctOption: string;
  finalAnswer: string;
  imageNeeded: boolean;
  imageTitle: string;
  imagePrompt: string;
  negativePrompt: string;
  imageAspectRatio: string;
  generatedImageDataUrl?: string;
  isGeneratingImage?: boolean;
  imageError?: string;
  tikzNeeded: boolean;
  tikzCode: string;
  solutionSummary: string;
  solutionSteps: string[];
  solutionLatex: string;
  verificationMethod: string;
  commonMistakes: string[];
  remedies?: string[];
  validation: ProblemValidation;
  isLocked?: boolean;
  modelUsed?: string;
}

export interface GenerationOptions {
  educationLevel: string; // THCS, THPT, Tự nhập
  grade: string; // Lớp 6, Lớp 7, ..., Tự nhập
  topic: string; // Số học, Đại số, Hình học, ...
  difficulty: string; // Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao, ...
  questionType: string; // Tự luận, Trắc nghiệm 4 lựa chọn, ...
  numOptions: string; // 4 phương án, 5 phương án, Không áp dụng
  contexts: string[]; // Trường học, Gia đình, Mua bán, ...
  variationLevel: string; // Sáng tạo đa dạng nhưng giữ kiến thức cốt lõi...
  imageRequirement: string; // Tự động, Bắt buộc, Không cần
  imageAspectRatio: string; // 16:9, 4:3, 1:1, A4 dọc, Tự động
  imageStyle: string; // Phong cách ảnh
  tikzRequirement: string; // Tự động, Bắt buộc, Chỉ hình học, Không
  language: string; // Tiếng Việt, Tiếng Anh, Song ngữ
}

export interface WordExportOptions {
  documentTitle: string;
  subject: string;
  grade: string;
  topic: string;
  authorName: string;
  workUnit: string;
  includeCoverPage: boolean;
  includeTOC: boolean;
  exportMode: 'full' | 'questions_only' | 'questions_answers' | 'questions_images' | 'questions_solutions';
  oneQuestionPerPage: boolean;
  hideAnswers: boolean;
  hideSolutions: boolean;
  includeTikZ: boolean;
  includeImagePrompts: boolean;
  includeRawLatex: boolean;
  includeCommonMistakes: boolean;
  includeBranding: boolean;
  insertGeneratedImages: boolean;
  insertImagePlaceholders: boolean;
}

export type ApiStatus = 'unconnected' | 'checking' | 'connected' | 'quota_exceeded' | 'error';

export interface FullResponseData {
  sourceAnalysis: SourceAnalysis;
  problems: ProblemItem[];
}
