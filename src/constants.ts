import { GenerationOptions, SourceAnalysis, ProblemItem, ModelSpec } from './types';

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

export const AVAILABLE_MODELS: ModelSpec[] = [
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash (Tối tân nhất - Siêu tốc & Thông minh vượt bậc)",
    isFree: true,
    contextWindow: "1.000.000 Tokens (1M)",
    speed: "Siêu tốc (~0.8s)",
    mathReasoning: "Xuất sắc 98.8%",
    multimodal: "Toàn diện (Text + Vision + OCR Math)",
    recommendedFor: "Sáng tạo 10 bài toán thực tế, OCR từ ảnh chụp, giải toán đa bước",
    generation: "Gen 3.8 (Mới nhất)"
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash (Khuyên dùng - Nhanh & Chính xác tuyệt đối)",
    isFree: true,
    contextWindow: "1.000.000 Tokens (1M)",
    speed: "Siêu tốc (~1.0s)",
    mathReasoning: "Rất cao 97.5%",
    multimodal: "Toàn diện (Text + Vision + OCR)",
    recommendedFor: "Soạn đề thực tế chuẩn, phân tích đề bài gốc, vẽ sơ đồ TikZ",
    generation: "Gen 3.6"
  },
  {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro (Toán học chuyên sâu & Suy luận đa tầng)",
    isFree: false,
    contextWindow: "2.000.000 Tokens (2M)",
    speed: "Nhanh (~2.0s)",
    mathReasoning: "Chuyên sâu 99.2%",
    multimodal: "Toàn diện (Complex Math Reasoning)",
    recommendedFor: "Toán vận dụng cao, giải tích, hình học không gian phức tạp",
    generation: "Gen 3.1 Pro"
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash (Thế hệ mới - Đa năng & Cân bằng tối ưu)",
    isFree: true,
    contextWindow: "1.000.000 Tokens (1M)",
    speed: "Rất nhanh (~1.1s)",
    mathReasoning: "Rất cao 96.8%",
    multimodal: "Có (Text + Vision)",
    recommendedFor: "Sinh bài toán thực tế THCS & THPT đa dạng ngữ cảnh",
    generation: "Gen 3.5"
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite (Siêu nhẹ - Phản hồi tức thì)",
    isFree: true,
    contextWindow: "1.000.000 Tokens (1M)",
    speed: "Tức thì (~0.5s)",
    mathReasoning: "Tốt 94.0%",
    multimodal: "Có (Text + Vision)",
    recommendedFor: "Phân tích sơ bộ, kiểm tra đáp số, tiết kiệm hạn mức Quota",
    generation: "Gen 3.1 Lite"
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro (Toán học nâng cao & Lời giải chuẩn mực)",
    isFree: false,
    contextWindow: "2.000.000 Tokens (2M)",
    speed: "Trung bình (~2.5s)",
    mathReasoning: "Chuyên sâu 98.0%",
    multimodal: "Có (Text + Vision)",
    recommendedFor: "Lời giải chi tiết từng bước, kiểm tra logic và lỗi sai học sinh",
    generation: "Gen 2.5 Pro"
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash (Cân bằng tốc độ & Độ chính xác ổn định)",
    isFree: true,
    contextWindow: "1.000.000 Tokens (1M)",
    speed: "Nhanh (~1.2s)",
    mathReasoning: "Rất cao 95.5%",
    multimodal: "Có (Text + Vision + SVG Vector)",
    recommendedFor: "Tạo bài toán, vẽ hình vector SVG, sinh lời giải chuẩn",
    generation: "Gen 2.5"
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite (Nhẹ & Phản hồi nhanh)",
    isFree: true,
    contextWindow: "1.000.000 Tokens (1M)",
    speed: "Siêu tốc (~0.6s)",
    mathReasoning: "Tốt 92.5%",
    multimodal: "Có",
    recommendedFor: "Xử lý hàng loạt, dự phòng chuyển tiếp khi mạng chậm",
    generation: "Gen 2.5 Lite"
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash (Tiêu chuẩn thế hệ 3)",
    isFree: true,
    contextWindow: "1.000.000 Tokens (1M)",
    speed: "Nhanh (~1.3s)",
    mathReasoning: "Cao 95.0%",
    multimodal: "Có",
    recommendedFor: "Tạo bài toán tương tự và sinh mã TikZ",
    generation: "Gen 3.0"
  },
  {
    id: "gemini-2-flash",
    name: "Gemini 2.0 Flash (Tốc độ phản hồi cực nhanh)",
    isFree: true,
    contextWindow: "1.000.000 Tokens (1M)",
    speed: "Rất nhanh (~1.0s)",
    mathReasoning: "Cao 93.5%",
    multimodal: "Có",
    recommendedFor: "Tương thích API Key phiên bản ổn định",
    generation: "Gen 2.0"
  },
  {
    id: "gemini-2-flash-lite",
    name: "Gemini 2.0 Flash Lite (Tiết kiệm Quota tối đa)",
    isFree: true,
    contextWindow: "1.000.000 Tokens (1M)",
    speed: "Tức thì (~0.6s)",
    mathReasoning: "Khá 90.0%",
    multimodal: "Có",
    recommendedFor: "Dự phòng khi API Key miễn phí gần chạm ngưỡng",
    generation: "Gen 2.0 Lite"
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash (Kinh điển - Hoạt động trên mọi loại key)",
    isFree: true,
    contextWindow: "1.000.000 Tokens (1M)",
    speed: "Nhanh (~1.5s)",
    mathReasoning: "Khá 91.0%",
    multimodal: "Có",
    recommendedFor: "Dự phòng cuối cùng khi các model mới bận",
    generation: "Gen 1.5"
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro (Xử lý bài toán & Tài liệu phức tạp)",
    isFree: false,
    contextWindow: "2.000.000 Tokens (2M)",
    speed: "Trung bình (~3.0s)",
    mathReasoning: "Cao 94.5%",
    multimodal: "Có",
    recommendedFor: "Đọc trích xuất tệp Word / PDF dài nhiều trang",
    generation: "Gen 1.5 Pro"
  }
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
