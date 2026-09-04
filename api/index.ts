import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";

const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Utility to parse single or multiple API Keys
function parseApiKeys(raw?: string): string[] {
  const envKey = process.env.GEMINI_API_KEY || "";
  const input = raw?.trim() || envKey;
  if (!input) return [];
  return input
    .split(/[\n\r,;]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 5);
}

function maskApiKey(key?: string): string {
  if (!key || key.length < 4) return "••••••••";
  return "••••••••" + key.slice(-4);
}

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

function getModelCascadeList(requestedModel?: string): string[] {
  const list = requestedModel ? [requestedModel, ...PRIORITY_GEMINI_MODELS] : PRIORITY_GEMINI_MODELS;
  return Array.from(new Set(list)).filter(Boolean);
}

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

  for (let kIdx = 0; kIdx < keys.length; kIdx++) {
    const currentKey = keys[kIdx];
    let ai: GoogleGenAI;
    try {
      ai = getGenAIClient(currentKey);
    } catch (e) {
      continue;
    }

    for (const modelName of modelsToTry) {
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

        if (isQuota) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }

        if (isKeyInvalid) {
          break;
        }
      }

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
        }
      }
    }
  }

  throw lastError || new Error("Không thể gọi Gemini API.");
}

// 1. Test Key
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

// 2. OCR Math
app.post("/api/gemini/ocr-math", async (req, res) => {
  const { imageBase64, mimeType = "image/png", apiKey, model = "gemini-3.8-flash" } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "Thiếu dữ liệu ảnh." });
  const rawBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

  const promptText = `Bạn là chuyên gia nhận diện bài toán từ hình ảnh sang văn bản và công thức LaTeX.
Hãy đọc toàn bộ đề bài toán trong hình ảnh được cung cấp:
1. Chuyển đổi chính xác tất cả câu chữ, số liệu, đơn vị và yêu cầu sang tiếng Việt chuẩn.
2. Tất cả công thức toán học phải viết chuẩn LaTeX (sử dụng \\( ... \\) cho inline và \\[ ... \\] cho block).
3. Chỉ trả về văn bản đề bài hoàn chỉnh.`;

  const contents = [
    { inlineData: { data: rawBase64, mimeType: mimeType || "image/png" } },
    { text: promptText }
  ];

  try {
    const { text: extractedText, modelUsed } = await generateContentWithFallback(
      apiKey,
      model,
      contents,
      { systemInstruction: "Bạn là chuyên gia nhận diện đề toán từ ảnh và xuất văn bản chuẩn kèm công thức LaTeX." }
    );
    return res.json({ success: true, extractedText: extractedText.trim(), modelUsed });
  } catch (err: any) {
    return res.status(500).json({ error: sanitizeError(err, apiKey) });
  }
});

// 3. Analyze
app.post("/api/gemini/analyze", async (req, res) => {
  const { problemText, options, apiKey, model = "gemini-3.8-flash" } = req.body;
  if (!problemText || !problemText.trim()) {
    return res.status(400).json({ error: "Vui lòng nhập đề bài gốc." });
  }

  const prompt = `Phân tích cấu trúc toán học của đề bài gốc sau đây:
ĐỀ BÀI GỐC:
${problemText}

CẤP HỌC YÊU CẦU: ${options?.educationLevel || "THCS"} - ${options?.grade || "Lớp 9"}
CHỦ ĐỀ: ${options?.topic || "Đại số / Giải bài toán bằng cách lập phương trình"}

Trả về cấu trúc JSON có đầy đủ: gradeLevel, grade, topic, problemType, knowledgeFocus, coreMethod, difficulty, givenData, requiredResult, units, commonMistakes, visualElements, tikzSuitability.`;

  try {
    const { text: jsonStr, modelUsed } = await generateContentWithFallback(apiKey, model, prompt);
    let rawData = cleanAndParseJson(jsonStr);

    const data = {
      gradeLevel: rawData.gradeLevel || options?.educationLevel || "THCS",
      grade: rawData.grade || options?.grade || "Lớp 9",
      topic: rawData.topic || options?.topic || "Giải bài toán bằng cách lập phương trình",
      problemType: rawData.problemType || options?.questionType || "Toán thực tế",
      knowledgeFocus: rawData.knowledgeFocus || "Lập phương trình/hệ phương trình và giải",
      coreMethod: rawData.coreMethod || "Lập phương trình/hệ phương trình và giải",
      difficulty: rawData.difficulty || options?.difficulty || "Vận dụng",
      givenData: Array.isArray(rawData.givenData) && rawData.givenData.length > 0 ? rawData.givenData : ["Dữ kiện các đại lượng trong đề bài"],
      requiredResult: rawData.requiredResult || "Tính giá trị đại lượng cần tìm",
      units: Array.isArray(rawData.units) && rawData.units.length > 0 ? rawData.units : ["đơn vị"],
      commonMistakes: Array.isArray(rawData.commonMistakes) && rawData.commonMistakes.length > 0 ? rawData.commonMistakes : ["Sai đơn vị", "Thiếu điều kiện ẩn"],
      visualElements: Array.isArray(rawData.visualElements) && rawData.visualElements.length > 0 ? rawData.visualElements : ["Sơ đồ minh họa"],
      tikzSuitability: rawData.tikzSuitability || "Thích hợp vẽ sơ đồ",
      modelUsed,
    };

    return res.json({ success: true, analysis: data, modelUsed });
  } catch (err: any) {
    return res.status(500).json({ error: sanitizeError(err, apiKey) });
  }
});

// 4. Generate 10
app.post("/api/gemini/generate-10", async (req, res) => {
  const { problemText, options, analysis, apiKey, model = "gemini-3.8-flash", lockedProblems = [] } = req.body;

  if (!problemText || !problemText.trim()) {
    return res.status(400).json({ error: "Vui lòng nhập đề bài gốc." });
  }

  try {
    const lockedPrompt = lockedProblems.length > 0
      ? `LƯU Ý: Giữ nguyên các câu bị khóa:\n${JSON.stringify(lockedProblems, null, 2)}`
      : "";

    const userPrompt = `ĐỀ BÀI GỐC:\n${problemText}\n\nPHÂN TÍCH:\n${JSON.stringify(analysis || {}, null, 2)}\n\nTÙY CHỌN:\n${JSON.stringify(options || {}, null, 2)}\n\n${lockedPrompt}\n\nYÊU CẦU: Tạo ĐÚNG 10 bài toán thực tế tương tự (id từ 1 đến 10) có cấu trúc JSON chứa mảng 'problems'.`;

    const { text: jsonStr, modelUsed } = await generateContentWithFallback(apiKey, model, userPrompt);
    let data = cleanAndParseJson(jsonStr);

    let problems = data.problems || (Array.isArray(data) ? data : []);

    if (lockedProblems.length > 0) {
      for (const locked of lockedProblems) {
        const idx = problems.findIndex((p: any) => p.id === locked.id);
        if (idx !== -1) problems[idx] = { ...locked };
        else if (locked.id >= 1 && locked.id <= 10) problems[locked.id - 1] = { ...locked };
      }
    }

    data.problems = problems.slice(0, 10).map((p: any, idx: number) => ({
      ...p,
      id: idx + 1,
      modelUsed: p.modelUsed || modelUsed,
      imageNeeded: p.imageNeeded ?? true,
      tikzNeeded: p.tikzNeeded ?? true,
    }));

    return res.json({ success: true, data, modelUsed });
  } catch (err: any) {
    return res.status(500).json({ error: sanitizeError(err, apiKey) });
  }
});

// 5. Regenerate One
app.post("/api/gemini/regenerate-one", async (req, res) => {
  const { idToRegenerate, problemText, options, analysis, apiKey, model = "gemini-3.8-flash" } = req.body;

  try {
    const userPrompt = `Hãy tạo ĐÚNG 01 bài toán thực tế tương tự mới để thay thế cho Câu ${idToRegenerate}.\nĐỀ BÀI GỐC: ${problemText}\nPHÂN TÍCH: ${JSON.stringify(analysis || {})}\nTÙY CHỌN: ${JSON.stringify(options || {})}`;

    const { text: jsonStr, modelUsed } = await generateContentWithFallback(apiKey, model, userPrompt);
    const singleProblem = cleanAndParseJson(jsonStr || "{}");
    singleProblem.id = idToRegenerate;
    singleProblem.modelUsed = modelUsed;
    return res.json({ success: true, problem: singleProblem, modelUsed });
  } catch (err: any) {
    return res.status(500).json({ error: sanitizeError(err, apiKey) });
  }
});

// 6. Generate Image
app.post("/api/gemini/generate-image", async (req, res) => {
  const { imagePrompt, negativePrompt, apiKey, imageModel = "imagen-3.0-generate-002" } = req.body;
  if (!imagePrompt) return res.status(400).json({ error: "Thiếu câu lệnh tạo ảnh." });

  const svgPrompt = `Vẽ sơ đồ vector SVG minh họa cho bài toán: ${imagePrompt}. Trả về mã <svg ...>...</svg> hoàn chỉnh.`;
  try {
    const { text: svgText, modelUsed } = await generateContentWithFallback(apiKey, "gemini-3.8-flash", svgPrompt);
    if (svgText.includes("<svg") && svgText.includes("</svg>")) {
      const start = svgText.indexOf("<svg");
      const end = svgText.lastIndexOf("</svg>") + 6;
      const cleanSvg = svgText.substring(start, end);
      const base64Svg = Buffer.from(cleanSvg, "utf-8").toString("base64");
      return res.json({
        success: true,
        imageDataUrl: `data:image/svg+xml;base64,${base64Svg}`,
        isSvgFallback: true,
        note: `Đã tự động tạo sơ đồ vector SVG minh họa (Dự phòng qua ${modelUsed})`
      });
    }
    return res.json({ success: false, fallbackText: "Vui lòng sao chép câu lệnh để tạo ảnh trong ChatGPT hoặc Canva." });
  } catch (err: any) {
    return res.json({ success: false, error: sanitizeError(err, apiKey) });
  }
});

// 7. Render TikZ
app.post("/api/gemini/render-tikz", async (req, res) => {
  const { tikzCode, apiKey, model = "gemini-3.8-flash" } = req.body;
  if (!tikzCode) return res.status(400).json({ error: "Thiếu mã TikZ." });

  const prompt = `Chuyển đổi mã TikZ sau thành mã SVG hiển thị trực quan: ${tikzCode}. Chỉ trả về duy nhất mã <svg ...>...</svg>.`;
  try {
    const { text: svgText } = await generateContentWithFallback(apiKey, model, prompt);
    if (svgText.includes("<svg") && svgText.includes("</svg>")) {
      const start = svgText.indexOf("<svg");
      const end = svgText.lastIndexOf("</svg>") + 6;
      const cleanSvg = svgText.substring(start, end);
      const base64Svg = Buffer.from(cleanSvg, "utf-8").toString("base64");
      return res.json({ success: true, svgDataUrl: `data:image/svg+xml;base64,${base64Svg}` });
    }
    return res.status(500).json({ error: "Không tạo được SVG từ TikZ." });
  } catch (err: any) {
    return res.status(500).json({ error: sanitizeError(err, apiKey) });
  }
});

export default app;
