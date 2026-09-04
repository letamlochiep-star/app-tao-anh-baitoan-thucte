import { GenerationOptions, SourceAnalysis, ProblemItem } from './types';

export const APP_NAME = "TRỢ LÝ SÁNG TẠO BÀI TOÁN THỰC TẾ 4.0";
export const APP_SUBTITLE = "Công cụ hỗ trợ giáo viên tạo bài toán tương tự, hình minh họa, mã TikZ, lời giải chi tiết và file Word.";
export const APP_DESCRIPTION = "Ứng dụng hỗ trợ giáo viên tạo bài toán thực tế tương tự, hình minh họa, mã TikZ, lời giải chi tiết và tài liệu Word.";
export const BRANDING_DEFAULT = "Thầy Tâm – AI | Hỗ trợ giáo viên ứng dụng AI trong dạy học";

export const SAMPLE_PROBLEM_TEXT = `Một khu vườn hình chữ nhật có chiều dài hơn chiều rộng 8 m. Diện tích khu vườn là 240 m^2. Tính chiều dài và chiều rộng của khu vườn.`;

export const SAMPLE_OPTIONS: GenerationOptions = {
  educationLevel: "THCS",
  grade: "Lớp 9",
  topic: "Giải bài toán bằng cách lập phương trình",
  difficulty: "Vận dụng",
  questionType: "Tự luận",
  numOptions: "Không áp dụng",
  contexts: ["Nông nghiệp", "Kiến trúc", "Gia đình"],
  variationLevel: "Sáng tạo đa dạng nhưng giữ kiến thức cốt lõi.",
  imageRequirement: "Bắt buộc có hình",
  imageAspectRatio: "16:9",
  imageStyle: "Ảnh thực tế giáo dục",
  tikzRequirement: "Tự động tạo khi cần",
  language: "Tiếng Việt"
};

export const AVAILABLE_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Khuyên dùng - Nhanh & Chính xác nhất)", isFree: true },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Suy luận sâu & Toán học nâng cao)", isFree: false },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Tốc độ phản hồi cực nhanh)", isFree: true },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Hoạt động ổn định trên mọi loại key)", isFree: true },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Xử lý bài toán phức tạp)", isFree: false }
];

export const AVAILABLE_IMAGE_MODELS = [
  { id: "imagen-3.0-generate-002", name: "Imagen 3 (Chất lượng hình ảnh chân thực)" },
  { id: "gemini-2.5-flash", name: "Sơ đồ minh họa Vector SVG (Tự động thích ứng mọi loại API Key)" }
];

export const EDUCATION_LEVELS = ["THCS", "THPT", "Tự nhập"];
export const GRADES_THCS = ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"];
export const GRADES_THPT = ["Lớp 10", "Lớp 11", "Lớp 12"];

export const MATH_TOPICS = [
  "Số học",
  "Đại số",
  "Hình học",
  "Hàm số",
  "Thống kê",
  "Xác suất",
  "Giải tích",
  "Toán tài chính",
  "Toán chuyển động",
  "Toán thực tế",
  "Tự động nhận diện",
  "Tự nhập"
];

export const DIFFICULTY_LEVELS = [
  "Nhận biết",
  "Thông hiểu",
  "Vận dụng",
  "Vận dụng cao",
  "Tương đương đề gốc",
  "Phân hóa từ dễ đến khó"
];

export const QUESTION_TYPES = [
  "Tự luận",
  "Trắc nghiệm nhiều lựa chọn",
  "Trắc nghiệm đúng hoặc sai",
  "Trả lời ngắn",
  "Kết hợp nhiều dạng"
];

export const CONTEXT_PRESETS = [
  "Trường học",
  "Gia đình",
  "Mua bán",
  "Giao thông",
  "Du lịch",
  "Nông nghiệp",
  "Môi trường",
  "Kiến trúc",
  "Thể thao",
  "Y tế",
  "Khoa học và STEM",
  "Tài chính cá nhân",
  "Công nghệ",
  "Sản xuất",
  "Ngữ cảnh Việt Nam",
  "Tự động lựa chọn"
];

export const VARIATION_LEVELS = [
  "Chỉ thay đổi số liệu.",
  "Thay đổi số liệu và bối cảnh.",
  "Thay đổi cách hỏi nhưng giữ phương pháp.",
  "Sáng tạo đa dạng nhưng giữ kiến thức cốt lõi.",
  "Phân hóa từ cơ bản đến nâng cao."
];

export const IMAGE_STYLES = [
  "Ảnh thực tế giáo dục",
  "Infographic giáo dục",
  "Minh họa 3D",
  "Sơ đồ khoa học",
  "Hình học trực quan",
  "Phong cách sách giáo khoa hiện đại",
  "Tự động lựa chọn"
];

export const DEFAULT_NEGATIVE_PROMPT = "No long text, no full problem statement, no watermark, no logo, no application interface, no irrelevant objects, no incorrect numbers, no duplicated objects, no distorted geometry, no misspelled text, no excessive annotations.";
