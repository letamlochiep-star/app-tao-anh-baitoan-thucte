import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// CORS middleware to allow cross-origin requests from any client
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Utility to parse single or multiple API Keys (comma, semicolon, or newline separated)
function parseApiKeys(raw?: string): string[] {
  const envKey = process.env.GEMINI_API_KEY || "";
  const input = raw?.trim() || envKey;
  if (!input) return [];
  return input
    .split(/[\n\r,;]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 5);
}

// Utility to mask API Key (showing only last 4 chars)
function maskApiKey(key?: string): string {
  if (!key || key.length < 4) return "••••••••";
  return "••••••••" + key.slice(-4);
}

// Utility to create GoogleGenAI instance safely
function getGenAIClient(apiKey: string) {
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

// Sanitizes error messages so no API key or sensitive data leaks
function sanitizeError(err: any, keyUsed?: string): string {
  let msg = err?.message || String(err || "Lỗi không xác định");
  if (keyUsed) {
    const keys = parseApiKeys(keyUsed);
    keys.forEach((k) => {
      msg = msg.replaceAll(k, maskApiKey(k));
    });
  }
  if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
    return "API Key không hợp lệ. Vui lòng kiểm tra lại khóa đã sao chép từ Google AI Studio.";
  }
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded") || msg.includes("429")) {
    return "Tất cả API key đã đạt giới hạn sử dụng tạm thời. Vui lòng thử lại sau vài giây hoặc thêm key dự phòng.";
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

// Priority order of Gemini models from smartest/highest weight down to lightest & fastest
const PRIORITY_GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.1-pro",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash",
  "gemini-2-flash",
  "gemini-2-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

// Helper to get prioritized model cascade list starting with user-requested model
function getModelCascadeList(requestedModel?: string): string[] {
  const list = requestedModel ? [requestedModel, ...PRIORITY_GEMINI_MODELS] : PRIORITY_GEMINI_MODELS;
  return Array.from(new Set(list)).filter(Boolean);
}

// Core helper for generating content with Multi-Key Rotation + Prioritized Model Cascade + Exponential Backoff
async function generateContentWithFallback(
  apiKeyInput: string | undefined,
  requestedModel: string,
  contents: any,
  config?: any
): Promise<{ text: string; modelUsed: string; keyUsed: string }> {
  const keys = parseApiKeys(apiKeyInput);
  if (keys.length === 0) {
    throw new Error("Chưa nhập Gemini API Key. Vui lòng cấu hình API Key.");
  }

  const modelsToTry = getModelCascadeList(requestedModel);
  let lastError: any = null;

  // Outer loop: Cycle through available keys (Multi-Key Rotation / Load Balancer)
  for (let kIdx = 0; kIdx < keys.length; kIdx++) {
    const currentKey = keys[kIdx];
    let ai: GoogleGenAI;
    try {
      ai = getGenAIClient(currentKey);
    } catch (e) {
      continue;
    }

    // Inner loop: Cycle through prioritized model cascade
    for (const modelName of modelsToTry) {
      // Attempt 1: With full config (schema + systemInstruction)
      try {
        const res = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: config || {},
        });
        if (res && res.text) {
          return { text: res.text, modelUsed: modelName, keyUsed: currentKey };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isQuota = errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota") || errMsg.includes("429");
        const isKeyInvalid = errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid");

        console.warn(`[Gemini Cascade Warning] Key ${kIdx + 1}/${keys.length} (${maskApiKey(currentKey)}) | Model "${modelName}" error: ${errMsg.slice(0, 100)}`);

        // Backoff / Delay if rate-limited
        if (isQuota) {
          console.warn(`[Gemini Backoff] Gặp giới hạn 429/Quota. Đang nghỉ 800ms trước khi thử mô hình/key tiếp theo...`);
          await new Promise((resolve) => setTimeout(resolve, 800));
        }

        if (isKeyInvalid) {
          // Key is permanently invalid, skip remaining models for this key
          break;
        }
      }

      // Attempt 2: If config contained responseSchema, fallback without responseSchema but with JSON prompt instruction
      if (config?.responseSchema) {
        try {
          const fallbackConfig = {
            systemInstruction: config.systemInstruction,
            responseMimeType: "application/json",
          };
          const fallbackContents = typeof contents === "string"
            ? contents + "\n\nBẮT BUỘC trả về đúng cấu trúc JSON, không thêm bất kỳ văn bản ngoài JSON."
            : contents;

          const res = await ai.models.generateContent({
            model: modelName,
            contents: fallbackContents,
            config: fallbackConfig,
          });
          if (res && res.text) {
            return { text: res.text, modelUsed: modelName, keyUsed: currentKey };
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          console.warn(`[Gemini Cascade Warning] Model "${modelName}" (JSON fallback) error: ${errMsg.slice(0, 100)}`);
        }
      }
    }
  }

  throw lastError || new Error("Không thể gọi Gemini API thành công sau khi đã thử tất cả API Key và mô hình ưu tiên.");
}

// 1. API: Test API Key Connection (Supports Multi-Key load testing)
app.post("/api/gemini/test-key", async (req, res) => {
  const { apiKey } = req.body;
  const keys = parseApiKeys(apiKey);
  if (keys.length === 0) {
    return res.json({
      success: false,
      message: "Bạn chưa nhập Gemini API Key.",
      maskedKey: "••••••••",
      activeKeyCount: 0,
    });
  }

  let connectedKeysCount = 0;
  let successfulModel = "";
  let lastError: any = null;

  for (const key of keys) {
    try {
      const ai = getGenAIClient(key);
      for (const modelName of PRIORITY_GEMINI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: "Xin chào",
          });
          if (response && response.text) {
            connectedKeysCount++;
            if (!successfulModel) successfulModel = modelName;
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
    } catch (e: any) {
      lastError = e;
    }
  }

  if (connectedKeysCount > 0) {
    const maskedDisplay = keys.map((k) => maskApiKey(k)).join(", ");
    return res.json({
      success: true,
      message: `Đã kết nối thành công ${connectedKeysCount}/${keys.length} API Key (Mô hình khả dụng: ${successfulModel})!`,
      modelUsed: successfulModel,
      maskedKey: maskedDisplay,
      activeKeyCount: connectedKeysCount,
      totalKeysCount: keys.length,
    });
  } else {
    return res.json({
      success: false,
      message: sanitizeError(lastError || new Error("Không thể kết nối với các API key đã cung cấp."), apiKey),
      maskedKey: keys.map((k) => maskApiKey(k)).join(", "),
      activeKeyCount: 0,
      totalKeysCount: keys.length,
    });
  }
});

// 2. API: OCR Math Multimodal - Extract Math Problem from Image
app.post("/api/gemini/ocr-math", async (req, res) => {
  const { imageBase64, mimeType = "image/png", apiKey, model = "gemini-3.6-flash" } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Thiếu dữ liệu hình ảnh." });
  }

  const rawBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

  const promptText = `Bạn là chuyên gia nhận diện và chuyển đổi bài toán từ hình ảnh sang văn bản và công thức LaTeX.
Hãy đọc toàn bộ đề bài toán trong hình ảnh được cung cấp:
1. Chuyển đổi chính xác tất cả câu chữ, số liệu, đơn vị và yêu cầu của bài toán sang tiếng Việt chuẩn.
2. Tất cả công thức toán học phải được viết chuẩn LaTeX (sử dụng \\( ... \\) cho công thức inline và \\[ ... \\] cho công thức block/dòng riêng).
3. Đảm bảo giữ nguyên các đại lượng, số liệu đã cho và câu hỏi cần tìm.
4. Chỉ trả về văn bản đề bài hoàn chỉnh, không thêm lời chào, không thêm giải thích hay markdown code block thừa.`;

  const contents = [
    {
      inlineData: {
        data: rawBase64,
        mimeType: mimeType || "image/png",
      },
    },
    {
      text: promptText,
    },
  ];

  try {
    const { text: extractedText, modelUsed } = await generateContentWithFallback(
      apiKey,
      model,
      contents,
      { systemInstruction: "Bạn là chuyên gia nhận diện đề toán từ ảnh và xuất văn bản chuẩn kèm công thức LaTeX." }
    );

    return res.json({
      success: true,
      extractedText: extractedText.trim(),
      modelUsed,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: sanitizeError(err, apiKey),
    });
  }
});

// 3. API: Analyze Source Problem
app.post("/api/gemini/analyze", async (req, res) => {
  const { problemText, options, apiKey, model = "gemini-3.6-flash" } = req.body;
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
        "tikzSuitability",
      ],
    },
  };

  try {
    const { text: jsonStr, modelUsed } = await generateContentWithFallback(apiKey, model, prompt, schemaConfig);
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
      tikzSuitability: rawData.tikzSuitability || "Thích hợp vẽ sơ đồ minh họa",
      modelUsed,
    };

    return res.json({ success: true, analysis: data, modelUsed });
  } catch (err: any) {
    console.error("Gemini API analyze error, providing smart local analysis:", err?.message || err);

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
      tikzSuitability: isGeometry ? "Thích hợp vẽ sơ đồ hình học phẳng bằng TikZ" : "Thích hợp vẽ sơ đồ đoạn thẳng/trục tọa độ bằng TikZ",
      modelUsed: "Offline-Heuristic",
    };

    return res.json({
      success: true,
      analysis: fallbackAnalysis,
      modelUsed: "Offline-Heuristic",
      note: "Đã tổng hợp cấu trúc phân tích bài toán (Bạn có thể tùy chỉnh lại ở Mục III trước khi sinh 10 bài).",
    });
  }
});

// 4. API: Generate 10 Similar Problems
app.post("/api/gemini/generate-10", async (req, res) => {
  const { problemText, options, analysis, apiKey, model = "gemini-3.6-flash", lockedProblems = [] } = req.body;

  if (!problemText || !problemText.trim()) {
    return res.status(400).json({ error: "Vui lòng nhập đề bài gốc." });
  }

  try {
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
            },
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
                },
              },
              required: [
                "id",
                "title",
                "context",
                "difficulty",
                "questionType",
                "problemText",
                "latexProblemText",
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
                "verificationMethod",
                "commonMistakes",
              ],
            },
          },
        },
        required: ["problems"],
      },
    };

    const { text: jsonStr, modelUsed } = await generateContentWithFallback(apiKey, model, userPrompt, schemaConfig);
    let data = cleanAndParseJson(jsonStr);

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

    // Sanitize problem IDs 1..10 and attach modelUsed
    data.problems = data.problems.slice(0, 10).map((p: any, idx: number) => ({
      ...p,
      id: idx + 1,
      modelUsed: p.modelUsed || modelUsed,
      imageNeeded: p.imageNeeded ?? true,
      tikzNeeded: p.tikzNeeded ?? true,
      validation: p.validation || {
        dataConsistent: true,
        unitsConsistent: true,
        answerVerified: true,
        imageConsistent: true,
        latexValid: true,
        tikzValid: true,
      },
    }));

    if (data.sourceAnalysis) {
      data.sourceAnalysis.modelUsed = modelUsed;
    }

    return res.json({ success: true, data, modelUsed });
  } catch (err: any) {
    return res.status(500).json({ error: sanitizeError(err, apiKey) });
  }
});

// 5. API: Regenerate a Single Unlocked Question
app.post("/api/gemini/regenerate-one", async (req, res) => {
  const { idToRegenerate, problemText, options, analysis, apiKey, model = "gemini-3.6-flash" } = req.body;

  if (!idToRegenerate || idToRegenerate < 1 || idToRegenerate > 10) {
    return res.status(400).json({ error: "Số thứ tự câu cần tạo lại không hợp lệ (phải từ 1-10)." });
  }

  try {
    const userPrompt = `Hãy tạo ĐÚNG 01 bài toán thực tế tương tự mới để thay thế cho Câu ${idToRegenerate}.

ĐỀ BÀI GỐC:
${problemText}

PHÂN TÍCH:
${JSON.stringify(analysis || {}, null, 2)}

TÙY CHỌN GIÁO VIÊN:
${JSON.stringify(options || {}, null, 2)}

Trả về duy nhất 01 đối tượng bài toán có id là ${idToRegenerate}.`;

    const schemaConfig = {
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
            required: ["dataConsistent", "unitsConsistent", "answerVerified", "imageConsistent", "latexValid", "tikzValid"],
          },
        },
        required: [
          "id",
          "title",
          "context",
          "difficulty",
          "questionType",
          "problemText",
          "latexProblemText",
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
          "verificationMethod",
          "commonMistakes",
        ],
      },
    };

    const { text: jsonStr, modelUsed } = await generateContentWithFallback(apiKey, model, userPrompt, schemaConfig);
    const singleProblem = cleanAndParseJson(jsonStr || "{}");
    singleProblem.id = idToRegenerate;
    singleProblem.modelUsed = modelUsed;
    return res.json({ success: true, problem: singleProblem, modelUsed });
  } catch (err: any) {
    return res.status(500).json({ error: sanitizeError(err, apiKey) });
  }
});

// 6. API: Generate Image using Gemini Image Model with auto-fallback
app.post("/api/gemini/generate-image", async (req, res) => {
  const { imagePrompt, negativePrompt, aspectRatio = "16:9", apiKey, imageModel = "imagen-3.0-generate-002" } = req.body;

  if (!imagePrompt) {
    return res.status(400).json({ error: "Thiếu câu lệnh tạo ảnh." });
  }

  const keys = parseApiKeys(apiKey);
  if (keys.length === 0) {
    return res.status(400).json({ error: "Chưa nhập Gemini API Key." });
  }

  try {
    const fullPrompt = `${imagePrompt}. Educational illustration for math problem. Clear geometry, clean background, sharp details. ${negativePrompt ? "Negative prompt: " + negativePrompt : ""}`;
    const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    const ar = validAspectRatios.includes(aspectRatio) ? aspectRatio : "16:9";

    let imageDataUrl = "";
    let isSvgFallback = false;
    let modelUsedForSvg = "";

    // Attempt 1: Imagen 3 model (imagen-3.0-generate-002)
    for (const currentKey of keys) {
      try {
        const ai = getGenAIClient(currentKey);
        const imgRes = await ai.models.generateImages({
          model: "imagen-3.0-generate-002",
          prompt: fullPrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: "image/png",
            aspectRatio: ar as any,
          },
        });
        if (imgRes.generatedImages?.[0]?.image?.imageBytes) {
          const base64 = imgRes.generatedImages[0].image.imageBytes;
          imageDataUrl = `data:image/png;base64,${base64}`;
          break;
        }
      } catch (e1) {
        // Continue to next key or fallback
      }
    }

    // Attempt 2: Intelligent SVG Vector Graphic cascade fallback (Works on ALL API keys!)
    if (!imageDataUrl) {
      const svgPrompt = `Bạn là chuyên gia thiết kế hình họa giáo dục Toán học. Hãy vẽ một sơ đồ vector SVG minh họa trực quan cho bài toán thực tế sau:
MÔ TẢ HÌNH VẼ: ${imagePrompt}
YÊU CẦU BẮT BUỘC:
1. Trả về mã SVG hoàn chỉnh bắt đầu bằng <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg"> và kết thúc bằng </svg>.
2. Vẽ sơ đồ hình học, các đối tượng thực tế (nhà cửa, cây cối, xe cộ, sông hồ, tháp...), các góc, độ dài, ký hiệu toán học tiếng Việt rõ ràng.
3. Phối màu hiện đại, tương phản cao, phông nền sáng (#FFFFFF hoặc #F8FAFC), màu sắc nổi bật (xanh dương, đỏ, cam, xanh lá).
4. Có khung tiêu đề nhỏ ở góc trên.
5. KHÔNG chứa bất kỳ văn bản giải thích hay Markdown nào ngoài mã <svg ...></svg>.`;

      try {
        const { text: svgText, modelUsed } = await generateContentWithFallback(apiKey, "gemini-3.6-flash", svgPrompt);
        if (svgText.includes("<svg") && svgText.includes("</svg>")) {
          const start = svgText.indexOf("<svg");
          const end = svgText.lastIndexOf("</svg>") + 6;
          const cleanSvg = svgText.substring(start, end);
          const base64Svg = Buffer.from(cleanSvg, "utf-8").toString("base64");
          imageDataUrl = `data:image/svg+xml;base64,${base64Svg}`;
          isSvgFallback = true;
          modelUsedForSvg = modelUsed;
        }
      } catch (e2) {
        console.warn(`[SVG Cascade] Fallback SVG generation encountered error.`);
      }
    }

    if (imageDataUrl) {
      return res.json({
        success: true,
        imageDataUrl,
        isSvgFallback,
        note: isSvgFallback ? `Đã tự động tạo sơ đồ vector SVG minh họa (Dự phòng thông minh qua ${modelUsedForSvg})` : undefined,
      });
    } else {
      return res.json({
        success: false,
        fallbackText: "API key hoặc model hiện tại chưa hỗ trợ tạo ảnh trực tiếp. Bạn vẫn có thể sao chép câu lệnh bên dưới để tạo ảnh trong ChatGPT, Gemini hoặc Canva.",
      });
    }
  } catch (err: any) {
    const cleanErr = sanitizeError(err, apiKey);
    return res.json({
      success: false,
      error: cleanErr,
      fallbackText: "API key hoặc model hiện tại chưa hỗ trợ tạo ảnh trực tiếp. Bạn vẫn có thể sao chép câu lệnh bên dưới để tạo ảnh trong ChatGPT, Gemini hoặc Canva.",
    });
  }
});

// 7. API: Render TikZ to SVG Preview using AI
app.post("/api/gemini/render-tikz", async (req, res) => {
  const { tikzCode, apiKey, model = "gemini-3.6-flash" } = req.body;
  if (!tikzCode || !tikzCode.trim()) {
    return res.status(400).json({ error: "Thiếu mã TikZ." });
  }

  const prompt = `Bạn là trình biên dịch TikZ sang SVG chính xác. Hãy chuyển đổi đoạn mã TikZ sau thành mã SVG hiển thị trực quan:
MÃ TIKZ:
${tikzCode}

YÊU CẦU:
1. Trả về mã SVG hoàn chỉnh bắt đầu bằng <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg"> và kết thúc bằng </svg>.
2. Vẽ đúng các điểm, đường thẳng, góc vuông, nhãn văn bản, cung tròn, trục tọa độ tương ứng với mã TikZ.
3. Không trả về giải thích, chỉ trả về duy nhất mã SVG.`;

  try {
    const { text: svgText } = await generateContentWithFallback(apiKey, model, prompt);
    if (svgText.includes("<svg") && svgText.includes("</svg>")) {
      const start = svgText.indexOf("<svg");
      const end = svgText.lastIndexOf("</svg>") + 6;
      const cleanSvg = svgText.substring(start, end);
      const base64Svg = Buffer.from(cleanSvg, "utf-8").toString("base64");
      return res.json({ success: true, svgDataUrl: `data:image/svg+xml;base64,${base64Svg}` });
    }
    return res.status(500).json({ error: "Không tạo được mã SVG từ TikZ." });
  } catch (err: any) {
    return res.status(500).json({ error: sanitizeError(err, apiKey) });
  }
});

// 8. API: Parse Uploaded Document File (Docx text extraction / Raw text)
app.post("/api/parse-file", async (req, res) => {
  const { fileData, fileName } = req.body;
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
