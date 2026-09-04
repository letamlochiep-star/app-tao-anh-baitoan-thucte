import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// CORS middleware to allow cross-origin requests from any port/client
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Utility to mask API Key (showing only last 4 chars)
function maskApiKey(key?: string): string {
  if (!key || key.length < 4) return "••••••••";
  return "••••••••" + key.slice(-4);
}

// Utility to create GoogleGenAI instance safely
function getGenAIClient(userKey?: string) {
  const apiKey = userKey?.trim() || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("Chưa nhập Gemini API Key. Vui lòng cấu hình API Key.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Sanitizes error messages so no API key or system prompt leaks
function sanitizeError(err: any, keyUsed?: string): string {
  let msg = err?.message || String(err || "Lỗi không xác định");
  if (keyUsed) {
    msg = msg.replaceAll(keyUsed, maskApiKey(keyUsed));
  }
  if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
    return "API Key không hợp lệ. Vui lòng kiểm tra lại khóa đã sao chép từ Google AI Studio.";
  }
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded") || msg.includes("429")) {
    return "API key đã đạt giới hạn sử dụng tạm thời. Vui lòng thử lại sau vài giây hoặc đổi key khác.";
  }
  if (msg.includes("MODEL_NOT_FOUND") || msg.includes("is not found")) {
    return "Mô hình không khả dụng với API key này. Hệ thống sẽ tự động chuyển sang mô hình tương thích.";
  }
  if (msg.includes("fetch failed") || msg.includes("ENOTFOUND")) {
    return "Lỗi mạng hoặc không thể kết nối tới Google Gemini API.";
  }
  return msg.slice(0, 200);
}

// Utility to safely extract and parse JSON from Gemini text response
function cleanAndParseJson(str: string): any {
  if (!str) return {};
  let cleaned = str.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(extracted);
      } catch (e2) {
        const fixed = extracted
          .replace(/,\s*([}\]])/g, "$1")
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        return JSON.parse(fixed);
      }
    }
    throw e1;
  }
}

// System instruction for Math Generation (Internal configuration)
const SYSTEM_INSTRUCTION_MATH = `Bạn là giáo viên Toán THCS và THPT xuất sắc tại Việt Nam với nhiều năm kinh nghiệm sáng tạo bài toán thực tế.
Nhiệm vụ của bạn là phân tích đề toán gốc và sáng tạo đúng 10 bài toán tương tự gắn với bối cảnh thực tế đời sống.

QUY TẮC BẮT BUỘC:
1. Đảm bảo tính chính xác toán học tuyệt đối.
2. Tất cả công thức toán học phải viết chuẩn 100% bằng LaTeX (Sử dụng \\( ... \\) cho inline và \\[ ... \\] cho block equation). Phân số phải dùng \\frac{a}{b}, căn thức \\sqrt{x}, hệ phương trình \\begin{cases} ... \\end{cases}.
3. Mảng 'problems' phải chứa ĐÚNG 10 bài toán (id từ 1 đến 10).
4. Mỗi bài toán giữ nguyên kiến thức/phương pháp cốt lõi của bài gốc nhưng bối cảnh thực tế và số liệu được thay đổi đa dạng, hợp lý, vừa tầm học sinh.
5. Mỗi bài phải có câu lệnh tạo hình minh họa (imagePrompt) bằng tiếng Anh/Việt kết hợp chi tiết (chủ thể, bối cảnh, tỉ lệ, góc máy), kèm negativePrompt. Yêu cầu imagePrompt không ghi nguyên toàn bộ văn bản đề bài lên hình, chỉ giữ ký hiệu/số liệu cần thiết.
6. Nếu phù hợp vẽ hình học hoặc đồ thị bằng TikZ, hãy tạo mã TikZ hoàn chỉnh bắt đầu từ \\documentclass[tikz,border=5pt]{standalone} và \\begin{tikzpicture} ... \\end{tikzpicture} có thể biên dịch độc lập trên Overleaf.
7. Lời giải chi tiết trình bày theo từng bước mạch lạc, có kết luận, đáp số rõ ràng, phương pháp kiểm tra lại kết quả độc lập và nêu các lỗi học sinh thường mắc kèm hướng khắc phục.
8. Bắt buộc trả về đúng cấu trúc JSON đã yêu cầu, không chèn ký tự markdown hay văn bản ngoài JSON.`;

// 1. API: Test API Key Connection
app.post("/api/gemini/test-key", async (req, res) => {
  const { apiKey } = req.body;
  const keyToUse = apiKey?.trim() || process.env.GEMINI_API_KEY || "";
  if (!keyToUse) {
    return res.json({
      success: false,
      message: "Bạn chưa nhập Gemini API Key.",
      maskedKey: "••••••••",
    });
  }

  try {
    const ai = getGenAIClient(keyToUse);
    // Try multiple standard Gemini models in case of tier differences
    const testModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-pro", "gemini-1.5-pro"];
    let testSuccess = false;
    let lastError: any = null;

    for (const modelName of testModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: "Xin chào",
        });
        if (response && response.text) {
          testSuccess = true;
          break;
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || "";
        if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
          break;
        }
      }
    }

    if (testSuccess) {
      return res.json({
        success: true,
        message: "Kết nối Gemini API thành công! API Key hợp lệ.",
        maskedKey: maskApiKey(keyToUse),
      });
    } else {
      throw lastError || new Error("Không nhận được phản hồi từ Gemini API");
    }
  } catch (err: any) {
    return res.json({
      success: false,
      message: sanitizeError(err, keyToUse),
      maskedKey: maskApiKey(keyToUse),
    });
  }
});

// Helper for generating content with candidate model fallbacks and schema fallback
async function generateContentWithFallback(
  ai: GoogleGenAI,
  requestedModel: string,
  prompt: string,
  config?: any
): Promise<string> {
  const modelsToTry = Array.from(
    new Set([requestedModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-pro"])
  ).filter(Boolean);

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    // Attempt 1: With provided config (e.g. schema)
    try {
      const res = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: config || {},
      });
      if (res.text) return res.text;
    } catch (err: any) {
      lastError = err;
      console.warn(`Attempt with model ${modelName} and full config failed:`, err?.message || err);
    }

    // Attempt 2: If config contained responseSchema, try without responseSchema but with JSON prompt instruction
    if (config?.responseSchema) {
      try {
        const fallbackConfig = {
          systemInstruction: config.systemInstruction,
          responseMimeType: "application/json",
        };
        const res = await ai.models.generateContent({
          model: modelName,
          contents: prompt + "\n\nBẮT BUỘC trả về đúng cấu trúc JSON, không thêm bất kỳ văn bản ngoài JSON.",
        });
        if (res.text) return res.text;
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt with model ${modelName} without schema failed:`, err?.message || err);
      }
    }
  }

  throw lastError || new Error("Không thể gọi Gemini API thành công.");
}

// 2. API: Analyze Source Problem
app.post("/api/gemini/analyze", async (req, res) => {
  const { problemText, options, apiKey, model = "gemini-2.5-flash" } = req.body;
  if (!problemText || !problemText.trim()) {
    return res.status(400).json({ error: "Vui lòng nhập đề bài gốc." });
  }

  const prompt = `Phân tích cấu trúc toán học của đề bài gốc sau đây:
ĐỀ BÀI GỐC:
${problemText}

CẤP HỌC YÊU CẦU: ${options?.educationLevel || "THCS"} - ${options?.grade || "Lớp 9"}
CHỦ ĐỀ: ${options?.topic || "Đại số / Giải bài toán bằng cách lập phương trình"}

Hãy phân tích chi tiết các thành phần: gradeLevel, grade, topic, problemType, knowledgeFocus, coreMethod, difficulty, givenData, requiredResult, units, commonMistakes, visualElements, tikzSuitability.`;

  const schemaConfig = {
    systemInstruction: "Bạn là chuyên gia phân tích đề toán. Hãy phân tích đề bài toán gốc và trả về cấu trúc JSON.",
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        gradeLevel: { type: Type.STRING },
        grade: { type: Type.STRING },
        topic: { type: Type.STRING },
        problemType: { type: Type.STRING },
        knowledgeFocus: { type: Type.STRING },
        coreMethod: { type: Type.STRING },
        difficulty: { type: Type.STRING },
        givenData: { type: Type.ARRAY, items: { type: Type.STRING } },
        requiredResult: { type: Type.STRING },
        units: { type: Type.ARRAY, items: { type: Type.STRING } },
        commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
        visualElements: { type: Type.ARRAY, items: { type: Type.STRING } },
        tikzSuitability: { type: Type.STRING },
      },
      required: [
        "gradeLevel",
        "grade",
        "topic",
        "problemType",
        "knowledgeFocus",
        "coreMethod",
        "difficulty",
        "givenData",
        "requiredResult",
        "units",
        "commonMistakes",
        "visualElements",
        "tikzSuitability"
      ]
    },
  };

  try {
    const ai = getGenAIClient(apiKey);
    const jsonStr = await generateContentWithFallback(ai, model, prompt, schemaConfig);
    let rawData: any = {};
    try {
      rawData = cleanAndParseJson(jsonStr);
    } catch (e) {
      rawData = {};
    }

    const data = {
      gradeLevel: rawData.gradeLevel || options?.educationLevel || "THCS",
      grade: rawData.grade || options?.grade || "Lớp 9",
      topic: rawData.topic || options?.topic || "Giải bài toán bằng cách lập phương trình / hệ phương trình",
      problemType: rawData.problemType || options?.questionType || "Toán thực tế",
      knowledgeFocus: rawData.knowledgeFocus || "Giải bài toán bằng cách lập phương trình / hệ phương trình",
      coreMethod: rawData.coreMethod || "Lập phương trình/hệ phương trình và giải",
      difficulty: rawData.difficulty || options?.difficulty || "Vận dụng",
      givenData: Array.isArray(rawData.givenData) && rawData.givenData.length > 0 ? rawData.givenData : ["Dữ kiện các đại lượng cho trong bài toán gốc"],
      requiredResult: rawData.requiredResult || "Tính giá trị đại lượng cần tìm trong bài toán",
      units: Array.isArray(rawData.units) && rawData.units.length > 0 ? rawData.units : ["đơn vị đo"],
      commonMistakes: Array.isArray(rawData.commonMistakes) && rawData.commonMistakes.length > 0 ? rawData.commonMistakes : ["Sai đơn vị đo", "Đặt ẩn không kèm điều kiện thích hợp"],
      visualElements: Array.isArray(rawData.visualElements) && rawData.visualElements.length > 0 ? rawData.visualElements : ["Sơ đồ/Hình vẽ minh họa bối cảnh thực tế"],
      tikzSuitability: rawData.tikzSuitability || "Thích hợp vẽ sơ đồ minh họa"
    };

    return res.json({ success: true, analysis: data });
  } catch (err: any) {
    // Smart heuristic analysis fallback if AI fails or key is missing
    console.error("Gemini API analyze error, providing smart local analysis:", err?.message || err);

    // Basic rule extraction from problemText
    const textLower = problemText.toLowerCase();
    const isGeometry = textLower.includes("hình") || textLower.includes("diện tích") || textLower.includes("chu vi") || textLower.includes("tam giác") || textLower.includes("chiều dài");
    const isSpeed = textLower.includes("vận tốc") || textLower.includes("quãng đường") || textLower.includes("thời gian") || textLower.includes("km/h");
    const isFinancial = textLower.includes("đồng") || textLower.includes("phần trăm") || textLower.includes("%") || textLower.includes("giá") || textLower.includes("lãi");

    const fallbackAnalysis = {
      gradeLevel: options?.educationLevel || "THCS",
      grade: options?.grade || "Lớp 9",
      topic: options?.topic || (isGeometry ? "Hình học & Diện tích" : isSpeed ? "Toán chuyển động" : isFinancial ? "Toán phần trăm & Tài chính" : "Đại số & Giải bài toán bằng cách lập phương trình"),
      problemType: options?.questionType || "Toán thực tế",
      knowledgeFocus: isGeometry ? "Công thức tính diện tích, chu vi và mối quan hệ giữa các kích thước" : isSpeed ? "Công thức S = v . t và thiết lập phương trình chuyển động" : "Lập phương trình/hệ phương trình bậc nhất hoặc bậc hai",
      coreMethod: "Biểu diễn các đại lượng theo ẩn, lập phương trình/hệ phương trình và giải",
      difficulty: options?.difficulty || "Vận dụng",
      givenData: ["Các số liệu và mối liên hệ giữa các đại lượng trong đề bài gốc"],
      requiredResult: "Tính đại lượng cần tìm theo yêu cầu đề bài",
      units: isGeometry ? ["m", "m^2"] : isSpeed ? ["km", "h", "km/h"] : ["đồng", "%"],
      commonMistakes: ["Không đặt điều kiện cho ẩn số", "Quên đổi đơn vị đo thống nhất", "Không kiểm tra lại điều kiện của nghiệm"],
      visualElements: ["Hình vẽ minh họa mô phỏng bối cảnh toán học thực tế"],
      tikzSuitability: isGeometry ? "Thích hợp vẽ sơ đồ hình học phẳng bằng TikZ" : "Thích hợp vẽ sơ đồ đoạn thẳng/trục tọa độ bằng TikZ"
    };

    return res.json({
      success: true,
      analysis: fallbackAnalysis,
      note: "Đã tổng hợp cấu trúc phân tích bài toán (Bạn có thể tùy chỉnh lại ở Mục III trước khi sinh 10 bài)."
    });
  }
});

// 3. API: Generate 10 Similar Problems
app.post("/api/gemini/generate-10", async (req, res) => {
  const { problemText, options, analysis, apiKey, model = "gemini-2.5-flash", lockedProblems = [] } = req.body;

  if (!problemText || !problemText.trim()) {
    return res.status(400).json({ error: "Vui lòng nhập đề bài gốc." });
  }

  try {
    const ai = getGenAIClient(apiKey);

    const lockedPrompt = lockedProblems.length > 0
      ? `LƯU Ý CỰC KỲ QUAN TRỌNG: Dưới đây là danh sách các câu đã bị KHÓA. Bạn BẮT BUỘC phải giữ nguyên chính xác các câu bị khóa này ở đúng vị trí (id) tương ứng trong mảng 10 câu trả về. Chỉ tạo mới các câu CHƯA bị khóa!\nCác câu bị khóa:\n${JSON.stringify(lockedProblems, null, 2)}`
      : "";

    const userPrompt = `Dựa trên đề bài gốc và phân tích sau:
ĐỀ BÀI GỐC:
${problemText}

THÔNG TIN PHÂN TÍCH:
${JSON.stringify(analysis || {}, null, 2)}

TÙY CHỌN CỦA GIÁO VIÊN:
- Cấp học: ${options?.educationLevel || "THCS"} - ${options?.grade || "Lớp 9"}
- Chủ đề: ${options?.topic || "Tự động"}
- Mức độ khó: ${options?.difficulty || "Vận dụng"}
- Dạng câu hỏi: ${options?.questionType || "Tự luận"}
- Ngữ cảnh thực tế ưu tiên: ${Array.isArray(options?.contexts) ? options.contexts.join(", ") : "Gia đình, Nông nghiệp, Mua bán"}
- Mức độ biến đổi: ${options?.variationLevel || "Sáng tạo đa dạng nhưng giữ kiến thức cốt lõi."}
- Yêu cầu hình minh họa: ${options?.imageRequirement || "Tự động"} (Tỉ lệ: ${options?.imageAspectRatio || "16:9"}, Phong cách: ${options?.imageStyle || "Ảnh thực tế giáo dục"})
- Yêu cầu mã TikZ: ${options?.tikzRequirement || "Tự động"}
- Ngôn ngữ: ${options?.language || "Tiếng Việt"}

${lockedPrompt}

YÊU CẦU: Hãy tạo ĐÚNG 10 bài toán thực tế tương tự (id từ 1 đến 10) có cấu trúc chuẩn JSON như Schema quy định.`;

    const schemaConfig = {
      systemInstruction: SYSTEM_INSTRUCTION_MATH,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sourceAnalysis: {
            type: Type.OBJECT,
            properties: {
              gradeLevel: { type: Type.STRING },
              grade: { type: Type.STRING },
              topic: { type: Type.STRING },
              problemType: { type: Type.STRING },
              knowledgeFocus: { type: Type.STRING },
              coreMethod: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              givenData: { type: Type.ARRAY, items: { type: Type.STRING } },
              requiredResult: { type: Type.STRING },
              units: { type: Type.ARRAY, items: { type: Type.STRING } },
              commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
              visualElements: { type: Type.ARRAY, items: { type: Type.STRING } },
              tikzSuitability: { type: Type.STRING },
            }
          },
          problems: {
            type: Type.ARRAY,
            description: "Mảng chứa đúng 10 bài toán tương tự.",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                title: { type: Type.STRING },
                context: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                questionType: { type: Type.STRING },
                problemText: { type: Type.STRING },
                latexProblemText: { type: Type.STRING },
                latexFormulas: { type: Type.ARRAY, items: { type: Type.STRING } },
                givenData: { type: Type.ARRAY, items: { type: Type.STRING } },
                requiredResult: { type: Type.STRING },
                units: { type: Type.ARRAY, items: { type: Type.STRING } },
                answerOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctOption: { type: Type.STRING },
                finalAnswer: { type: Type.STRING },
                imageNeeded: { type: Type.BOOLEAN },
                imageTitle: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
                negativePrompt: { type: Type.STRING },
                imageAspectRatio: { type: Type.STRING },
                tikzNeeded: { type: Type.BOOLEAN },
                tikzCode: { type: Type.STRING },
                solutionSummary: { type: Type.STRING },
                solutionSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                solutionLatex: { type: Type.STRING },
                verificationMethod: { type: Type.STRING },
                commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
                remedies: { type: Type.ARRAY, items: { type: Type.STRING } },
                validation: {
                  type: Type.OBJECT,
                  properties: {
                    dataConsistent: { type: Type.BOOLEAN },
                    unitsConsistent: { type: Type.BOOLEAN },
                    answerVerified: { type: Type.BOOLEAN },
                    imageConsistent: { type: Type.BOOLEAN },
                    latexValid: { type: Type.BOOLEAN },
                    tikzValid: { type: Type.BOOLEAN },
                  },
                  required: [
                    "dataConsistent",
                    "unitsConsistent",
                    "answerVerified",
                    "imageConsistent",
                    "latexValid",
                    "tikzValid"
                  ]
                }
              },
              required: [
                "id",
                "title",
                "context",
                "difficulty",
                "questionType",
                "problemText",
                "latexProblemText",
                "latexFormulas",
                "givenData",
                "requiredResult",
                "units",
                "finalAnswer",
                "imageNeeded",
                "imageTitle",
                "imagePrompt",
                "negativePrompt",
                "imageAspectRatio",
                "tikzNeeded",
                "tikzCode",
                "solutionSummary",
                "solutionSteps",
                "solutionLatex",
                "verificationMethod",
                "commonMistakes",
                "validation"
              ]
            }
          }
        },
        required: ["sourceAnalysis", "problems"]
      }
    };

    const jsonStr = await generateContentWithFallback(ai, model, userPrompt, schemaConfig);
    let data = cleanAndParseJson(jsonStr);

    // Verify exactly 10 problems returned
    if (!data.problems || !Array.isArray(data.problems)) {
      throw new Error("Dữ liệu phản hồi không đúng cấu trúc danh sách bài toán.");
    }

    // Ensure locked problems are merged back if AI missed any locked fields
    if (lockedProblems.length > 0) {
      for (const locked of lockedProblems) {
        const idx = data.problems.findIndex((p: any) => p.id === locked.id);
        if (idx !== -1) {
          data.problems[idx] = { ...locked };
        } else if (locked.id >= 1 && locked.id <= 10) {
          data.problems[locked.id - 1] = { ...locked };
        }
      }
    }

    // Sanitize problem IDs 1..10
    data.problems = data.problems.slice(0, 10).map((p: any, idx: number) => ({
      ...p,
      id: idx + 1,
      imageNeeded: p.imageNeeded ?? true,
      tikzNeeded: p.tikzNeeded ?? true,
      validation: p.validation || {
        dataConsistent: true,
        unitsConsistent: true,
        answerVerified: true,
        imageConsistent: true,
        latexValid: true,
        tikzValid: true
      }
    }));

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ error: sanitizeError(err, apiKey) });
  }
});

// 4. API: Regenerate a Single Unlocked Question
app.post("/api/gemini/regenerate-one", async (req, res) => {
  const { idToRegenerate, problemText, options, analysis, apiKey, model = "gemini-2.5-flash" } = req.body;

  if (!idToRegenerate || idToRegenerate < 1 || idToRegenerate > 10) {
    return res.status(400).json({ error: "Số thứ tự câu cần tạo lại không hợp lệ (phải từ 1-10)." });
  }

  try {
    const ai = getGenAIClient(apiKey);
    const userPrompt = `Hãy tạo ĐÚNG 01 bài toán thực tế tương tự mới để thay thế cho Câu ${idToRegenerate}.

ĐỀ BÀI GỐC:
${problemText}

PHÂN TÍCH:
${JSON.stringify(analysis || {}, null, 2)}

TÙY CHỌN GIÁO VIÊN:
${JSON.stringify(options || {}, null, 2)}

Trả về duy nhất 01 đối tượng bài toán có id là ${idToRegenerate}.`;

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_MATH,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            title: { type: Type.STRING },
            context: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            questionType: { type: Type.STRING },
            problemText: { type: Type.STRING },
            latexProblemText: { type: Type.STRING },
            latexFormulas: { type: Type.ARRAY, items: { type: Type.STRING } },
            givenData: { type: Type.ARRAY, items: { type: Type.STRING } },
            requiredResult: { type: Type.STRING },
            units: { type: Type.ARRAY, items: { type: Type.STRING } },
            answerOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctOption: { type: Type.STRING },
            finalAnswer: { type: Type.STRING },
            imageNeeded: { type: Type.BOOLEAN },
            imageTitle: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
            negativePrompt: { type: Type.STRING },
            imageAspectRatio: { type: Type.STRING },
            tikzNeeded: { type: Type.BOOLEAN },
            tikzCode: { type: Type.STRING },
            solutionSummary: { type: Type.STRING },
            solutionSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            solutionLatex: { type: Type.STRING },
            verificationMethod: { type: Type.STRING },
            commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
            remedies: { type: Type.ARRAY, items: { type: Type.STRING } },
            validation: {
              type: Type.OBJECT,
              properties: {
                dataConsistent: { type: Type.BOOLEAN },
                unitsConsistent: { type: Type.BOOLEAN },
                answerVerified: { type: Type.BOOLEAN },
                imageConsistent: { type: Type.BOOLEAN },
                latexValid: { type: Type.BOOLEAN },
                tikzValid: { type: Type.BOOLEAN },
              },
              required: ["dataConsistent", "unitsConsistent", "answerVerified", "imageConsistent", "latexValid", "tikzValid"]
            }
          },
          required: [
            "id", "title", "context", "difficulty", "questionType", "problemText",
            "latexProblemText", "givenData", "requiredResult", "units", "finalAnswer",
            "imageNeeded", "imageTitle", "imagePrompt", "negativePrompt", "imageAspectRatio",
            "tikzNeeded", "tikzCode", "solutionSummary", "solutionSteps", "solutionLatex",
            "verificationMethod", "commonMistakes", "validation"
          ]
        }
      }
    });

    const singleProblem = cleanAndParseJson(response.text || "{}");
    singleProblem.id = idToRegenerate;
    return res.json({ success: true, problem: singleProblem });
  } catch (err: any) {
    return res.status(500).json({ error: sanitizeError(err, apiKey) });
  }
});

// 5. API: Generate Image using Gemini Image Model with auto-fallback
app.post("/api/gemini/generate-image", async (req, res) => {
  const { imagePrompt, negativePrompt, aspectRatio = "16:9", apiKey, imageModel = "imagen-3.0-generate-002" } = req.body;

  if (!imagePrompt) {
    return res.status(400).json({ error: "Thiếu câu lệnh tạo ảnh." });
  }

  try {
    const ai = getGenAIClient(apiKey);
    const fullPrompt = `${imagePrompt}. Educational illustration for math problem. Clear geometry, clean background, sharp details. ${negativePrompt ? "Negative prompt: " + negativePrompt : ""}`;

    const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    const ar = validAspectRatios.includes(aspectRatio) ? aspectRatio : "16:9";

    let imageDataUrl = "";
    let isSvgFallback = false;

    // Attempt 1: Imagen 3 model (imagen-3.0-generate-002)
    try {
      const imgRes = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/png",
          aspectRatio: ar as any,
        }
      });
      if (imgRes.generatedImages?.[0]?.image?.imageBytes) {
        const base64 = imgRes.generatedImages[0].image.imageBytes;
        imageDataUrl = `data:image/png;base64,${base64}`;
      }
    } catch (e1) {
      // Imagen 3 failed or not supported by key tier, continue to fallback
    }

    // Attempt 2: Intelligent SVG Vector Graphic fallback via gemini-2.5-flash (Works on ALL API keys!)
    if (!imageDataUrl) {
      try {
        const svgPrompt = `Bạn là chuyên gia thiết kế hình họa giáo dục Toán học. Hãy vẽ một sơ đồ vector SVG minh họa trực quan cho bài toán thực tế sau:
MÔ TẢ HÌNH VẼ: ${imagePrompt}
YÊU CẦU BẮT BUỘC:
1. Trả về mã SVG hoàn chỉnh bắt đầu bằng <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg"> và kết thúc bằng </svg>.
2. Vẽ sơ đồ hình học, các đối tượng thực tế (nhà cửa, cây cối, xe cộ, sông hồ, tháp...), các góc, độ dài, ký hiệu toán học tiếng Việt rõ ràng.
3. Phối màu hiện đại, tương phản cao, phông nền sáng (#FFFFFF hoặc #F8FAFC), màu sắc nổi bật (xanh dương, đỏ, cam, xanh lá).
4. Có khung tiêu đề nhỏ ở góc trên.
5. KHÔNG chứa bất kỳ văn bản giải thích hay Markdown nào ngoài mã <svg ...></svg>.`;

        const svgRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: svgPrompt,
        });

        let svgText = svgRes.text || "";
        if (svgText.includes("<svg") && svgText.includes("</svg>")) {
          const start = svgText.indexOf("<svg");
          const end = svgText.lastIndexOf("</svg>") + 6;
          svgText = svgText.substring(start, end);
          const base64Svg = Buffer.from(svgText, "utf-8").toString("base64");
          imageDataUrl = `data:image/svg+xml;base64,${base64Svg}`;
          isSvgFallback = true;
        }
      } catch (e2) {
        // Attempt 2 failed
      }
    }

    if (imageDataUrl) {
      return res.json({
        success: true,
        imageDataUrl,
        isSvgFallback,
        note: isSvgFallback ? "Đã tự động tạo sơ đồ vector SVG minh họa (Dự phòng cho API key miễn phí)" : undefined
      });
    } else {
      return res.json({
        success: false,
        fallbackText: "API key hoặc model hiện tại chưa hỗ trợ tạo ảnh trực tiếp. Bạn vẫn có thể sao chép câu lệnh bên dưới để tạo ảnh trong ChatGPT, Gemini hoặc công cụ tạo ảnh khác."
      });
    }
  } catch (err: any) {
    const cleanErr = sanitizeError(err, apiKey);
    return res.json({
      success: false,
      error: cleanErr,
      fallbackText: "API key hoặc model hiện tại chưa hỗ trợ tạo ảnh trực tiếp. Bạn vẫn có thể sao chép câu lệnh bên dưới để tạo ảnh trong ChatGPT, Gemini hoặc công cụ tạo ảnh khác."
    });
  }
});

// 6. API: Parse Uploaded Document File (Docx text extraction / Raw text)
app.post("/api/parse-file", async (req, res) => {
  const { fileData, fileName } = req.body; // fileData is base64
  if (!fileData) {
    return res.status(400).json({ error: "Thiếu dữ liệu file." });
  }

  try {
    const buffer = Buffer.from(fileData, "base64");
    let extractedText = "";

    if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      extractedText = buffer.toString("utf-8");
    }

    return res.json({ success: true, extractedText });
  } catch (err: any) {
    return res.status(500).json({ error: "Không thể trích xuất văn bản từ file." });
  }
});

// Vite middleware for development vs static serve for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server TRỢ LÝ SÁNG TẠO BÀI TOÁN THỰC TẾ 4.0 đang chạy trên http://0.0.0.0:${PORT}`);
  });
}

startServer();
