/**
 * Client-Side Gemini Service with Smart Hybrid Fallback:
 * 1. Tries to call the backend server (/api/gemini/...) first.
 * 2. If backend returns 404 (e.g. running on Vercel static hosting / Netlify / GitHub Pages)
 *    or fails with network error, it AUTOMATICALLY falls back to direct Google Gemini API call
 *    from the browser using the user's API key.
 * 3. Supports Multi-Key Rotation, Prioritized Cascade from Gemini 3.8 Flash downwards, and Exponential Backoff.
 */

import { ProblemItem, GenerationOptions, SourceAnalysis } from '../types';
import { DEFAULT_NEGATIVE_PROMPT } from '../constants';

const PRIORITY_MODELS = [
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

export function parseApiKeys(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n\r,;]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 5);
}

function maskApiKey(key?: string): string {
  if (!key || key.length < 4) return "••••••••";
  return "••••••••" + key.slice(-4);
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

// Direct Browser-to-Google Gemini REST API Call
async function callDirectGoogleGeminiRest(
  apiKey: string,
  model: string,
  contents: any[],
  systemInstruction?: string,
  responseSchema?: any
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: any = {
    contents,
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const generationConfig: any = {
    temperature: 0.7,
  };

  if (responseSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = responseSchema;
  }

  body.generationConfig = generationConfig;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(errorMsg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Không nhận được nội dung phản hồi từ Gemini API.");
  }

  return text;
}

// Cascade Loop for Direct Calling with Multi-Key & Backoff
async function directCascadeCall(
  apiKeyInput: string,
  requestedModel: string,
  contents: any[],
  systemInstruction?: string,
  responseSchema?: any
): Promise<{ text: string; modelUsed: string; keyUsed: string }> {
  const keys = parseApiKeys(apiKeyInput);
  if (keys.length === 0) {
    throw new Error("Chưa nhập Gemini API Key. Vui lòng cấu hình API Key.");
  }

  const modelsToTry = Array.from(new Set([requestedModel, ...PRIORITY_MODELS])).filter(Boolean);
  let lastError: any = null;

  for (let kIdx = 0; kIdx < keys.length; kIdx++) {
    const currentKey = keys[kIdx];

    for (const modelName of modelsToTry) {
      // Attempt 1: With Schema
      try {
        const text = await callDirectGoogleGeminiRest(
          currentKey,
          modelName,
          contents,
          systemInstruction,
          responseSchema
        );
        return { text, modelUsed: modelName, keyUsed: currentKey };
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const isQuota = msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota") || msg.includes("429");
        const isKeyInvalid = msg.includes("API_KEY_INVALID") || msg.includes("API key not valid");

        console.warn(`[Gemini Direct Cascade] Key ${kIdx + 1}/${keys.length} | Model ${modelName} error: ${msg.slice(0, 100)}`);

        if (isQuota) {
          console.warn("[Gemini Direct Backoff] 429 Rate limited. Waiting 800ms...");
          await new Promise((resolve) => setTimeout(resolve, 800));
        }

        if (isKeyInvalid) {
          break; // Try next key
        }
      }

      // Attempt 2: Without responseSchema if previous failed
      if (responseSchema) {
        try {
          const fallbackContents = contents.map((c) => {
            if (c.parts) {
              return {
                parts: c.parts.map((p: any) =>
                  p.text
                    ? { text: p.text + "\n\nBẮT BUỘC trả về đúng định dạng JSON chuẩn." }
                    : p
                ),
              };
            }
            return c;
          });

          const text = await callDirectGoogleGeminiRest(
            currentKey,
            modelName,
            fallbackContents,
            systemInstruction
          );
          return { text, modelUsed: modelName, keyUsed: currentKey };
        } catch (err2: any) {
          lastError = err2;
        }
      }
    }
  }

  throw lastError || new Error("Không thể kết nối Gemini API với tất cả các khóa và mô hình.");
}

/**
 * 1. Test API Key Connection
 */
export async function apiTestKey(apiKey: string): Promise<{
  success: boolean;
  message: string;
  modelUsed?: string;
  maskedKey?: string;
  activeKeyCount?: number;
  totalKeysCount?: number;
}> {
  const keys = parseApiKeys(apiKey);
  if (keys.length === 0) {
    return {
      success: false,
      message: "Bạn chưa nhập Gemini API Key.",
      maskedKey: "••••••••",
      activeKeyCount: 0,
      totalKeysCount: 0,
    };
  }

  // 1. Try Backend Server First
  try {
    const res = await fetch('/api/gemini/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    // Server not reachable or static host, continue to direct client call
  }

  // 2. Direct Browser Fallback (Works on Vercel Static, GitHub Pages, Netlify, etc.)
  let connectedCount = 0;
  let successfulModel = "";
  let lastErrorMsg = "";

  for (const key of keys) {
    for (const model of PRIORITY_MODELS) {
      try {
        const text = await callDirectGoogleGeminiRest(key, model, [
          { parts: [{ text: "Xin chào" }] },
        ]);
        if (text) {
          connectedCount++;
          if (!successfulModel) successfulModel = model;
          break;
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || "Lỗi kết nối";
        if (lastErrorMsg.includes("API_KEY_INVALID")) {
          break;
        }
      }
    }
  }

  if (connectedCount > 0) {
    const masked = keys.map((k) => maskApiKey(k)).join(", ");
    return {
      success: true,
      message: `Đã kết nối thành công ${connectedCount}/${keys.length} API Key (Mô hình khả dụng: ${successfulModel})!`,
      modelUsed: successfulModel,
      maskedKey: masked,
      activeKeyCount: connectedCount,
      totalKeysCount: keys.length,
    };
  } else {
    return {
      success: false,
      message: lastErrorMsg.includes("API_KEY_INVALID")
        ? "API Key không hợp lệ. Vui lòng kiểm tra lại khóa đã sao chép từ Google AI Studio."
        : `Lỗi kết nối Gemini API: ${lastErrorMsg.slice(0, 150)}`,
      maskedKey: keys.map((k) => maskApiKey(k)).join(", "),
      activeKeyCount: 0,
      totalKeysCount: keys.length,
    };
  }
}

/**
 * 2. Analyze Source Problem
 */
export async function apiAnalyzeProblem(
  problemText: string,
  options: GenerationOptions,
  apiKey: string,
  model = "gemini-3.8-flash"
): Promise<{ success: boolean; analysis?: SourceAnalysis; modelUsed?: string; error?: string }> {
  // Try Backend First
  try {
    const res = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemText, options, apiKey, model }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.analysis) return data;
    }
  } catch (e) {
    // Fallback to direct client
  }

  // Direct Client Call
  try {
    const prompt = `Phân tích cấu trúc toán học của đề bài gốc sau đây:
ĐỀ BÀI GỐC:
${problemText}

CẤP HỌC YÊU CẦU: ${options?.educationLevel || "THCS"} - ${options?.grade || "Lớp 9"}
CHỦ ĐỀ: ${options?.topic || "Đại số / Giải bài toán bằng cách lập phương trình"}

Trả về đúng định dạng JSON có các trường: gradeLevel, grade, topic, problemType, knowledgeFocus, coreMethod, difficulty, givenData, requiredResult, units, commonMistakes, visualElements, tikzSuitability.`;

    const { text, modelUsed } = await directCascadeCall(
      apiKey,
      model,
      [{ parts: [{ text: prompt }] }],
      "Bạn là chuyên gia phân tích đề toán. Hãy phân tích đề bài toán gốc và trả về cấu trúc JSON."
    );

    const rawData = cleanAndParseJson(text);
    const analysis: SourceAnalysis = {
      gradeLevel: rawData.gradeLevel || options?.educationLevel || "THCS",
      grade: rawData.grade || options?.grade || "Lớp 9",
      topic: rawData.topic || options?.topic || "Giải bài toán bằng cách lập phương trình / hệ phương trình",
      problemType: rawData.problemType || options?.questionType || "Toán thực tế",
      knowledgeFocus: rawData.knowledgeFocus || "Giải bài toán bằng cách lập phương trình / hệ phương trình",
      coreMethod: rawData.coreMethod || "Lập phương trình/hệ phương trình và giải",
      difficulty: rawData.difficulty || options?.difficulty || "Vận dụng",
      givenData: Array.isArray(rawData.givenData) && rawData.givenData.length > 0 ? rawData.givenData : ["Dữ kiện đại lượng cho trong bài toán"],
      requiredResult: rawData.requiredResult || "Tính giá trị đại lượng cần tìm",
      units: Array.isArray(rawData.units) && rawData.units.length > 0 ? rawData.units : ["đơn vị đo"],
      commonMistakes: Array.isArray(rawData.commonMistakes) && rawData.commonMistakes.length > 0 ? rawData.commonMistakes : ["Sai đơn vị", "Thiếu điều kiện ẩn"],
      visualElements: Array.isArray(rawData.visualElements) && rawData.visualElements.length > 0 ? rawData.visualElements : ["Sơ đồ minh họa"],
      tikzSuitability: rawData.tikzSuitability || "Thích hợp vẽ sơ đồ",
      modelUsed,
    };

    return { success: true, analysis, modelUsed };
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi khi phân tích đề bài toán." };
  }
}

/**
 * 3. Generate 10 Similar Problems
 */
export async function apiGenerate10(
  problemText: string,
  options: GenerationOptions,
  analysis: SourceAnalysis | null,
  apiKey: string,
  model = "gemini-3.8-flash",
  lockedProblems: ProblemItem[] = []
): Promise<{ success: boolean; data?: { sourceAnalysis?: SourceAnalysis; problems: ProblemItem[] }; modelUsed?: string; error?: string }> {
  // Try Backend First
  try {
    const res = await fetch('/api/gemini/generate-10', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemText, options, analysis, apiKey, model, lockedProblems }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) return data;
    }
  } catch (e) {
    // Fallback to direct client
  }

  // Direct Client Call
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

YÊU CẦU: Hãy tạo ĐÚNG 10 bài toán thực tế tương tự (id từ 1 đến 10) có cấu trúc JSON chứa mảng problems với đầy đủ: id, title, context, difficulty, questionType, problemText, latexProblemText, latexFormulas, givenData, requiredResult, units, answerOptions, correctOption, finalAnswer, imageNeeded, imageTitle, imagePrompt, negativePrompt, imageAspectRatio, tikzNeeded, tikzCode, solutionSummary, solutionSteps, verificationMethod, commonMistakes.`;

    const { text, modelUsed } = await directCascadeCall(
      apiKey,
      model,
      [{ parts: [{ text: userPrompt }] }],
      SYSTEM_INSTRUCTION_MATH
    );

    const parsed = cleanAndParseJson(text);
    let problemsList = parsed.problems || (Array.isArray(parsed) ? parsed : []);

    if (!Array.isArray(problemsList) || problemsList.length === 0) {
      throw new Error("AI không trả về danh sách 10 bài toán hợp lệ.");
    }

    // Merge locked problems
    if (lockedProblems.length > 0) {
      for (const locked of lockedProblems) {
        const idx = problemsList.findIndex((p: any) => p.id === locked.id);
        if (idx !== -1) {
          problemsList[idx] = { ...locked };
        } else if (locked.id >= 1 && locked.id <= 10) {
          problemsList[locked.id - 1] = { ...locked };
        }
      }
    }

    // Sanitize 10 problems
    const sanitizedProblems: ProblemItem[] = problemsList.slice(0, 10).map((p: any, idx: number) => ({
      ...p,
      id: idx + 1,
      modelUsed: p.modelUsed || modelUsed,
      imageNeeded: p.imageNeeded ?? true,
      tikzNeeded: p.tikzNeeded ?? true,
      negativePrompt: p.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
      validation: p.validation || {
        dataConsistent: true,
        unitsConsistent: true,
        answerVerified: true,
        imageConsistent: true,
        latexValid: true,
        tikzValid: true,
      },
    }));

    return {
      success: true,
      data: {
        sourceAnalysis: parsed.sourceAnalysis || analysis || undefined,
        problems: sanitizedProblems,
      },
      modelUsed,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi khi tạo 10 bài toán." };
  }
}

/**
 * 4. Regenerate a Single Question
 */
export async function apiRegenerateOne(
  idToRegenerate: number,
  problemText: string,
  options: GenerationOptions,
  analysis: SourceAnalysis | null,
  apiKey: string,
  model = "gemini-3.8-flash"
): Promise<{ success: boolean; problem?: ProblemItem; modelUsed?: string; error?: string }> {
  // Try Backend First
  try {
    const res = await fetch('/api/gemini/regenerate-one', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToRegenerate, problemText, options, analysis, apiKey, model }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.problem) return data;
    }
  } catch (e) {
    // Fallback to direct client
  }

  // Direct Client Call
  try {
    const userPrompt = `Hãy tạo ĐÚNG 01 bài toán thực tế tương tự mới để thay thế cho Câu ${idToRegenerate}.

ĐỀ BÀI GỐC:
${problemText}

PHÂN TÍCH:
${JSON.stringify(analysis || {}, null, 2)}

TÙY CHỌN GIÁO VIÊN:
${JSON.stringify(options || {}, null, 2)}

Trả về duy nhất 01 đối tượng bài toán JSON có id là ${idToRegenerate}.`;

    const { text, modelUsed } = await directCascadeCall(
      apiKey,
      model,
      [{ parts: [{ text: userPrompt }] }],
      SYSTEM_INSTRUCTION_MATH
    );

    const problem = cleanAndParseJson(text);
    problem.id = idToRegenerate;
    problem.modelUsed = modelUsed;

    return { success: true, problem, modelUsed };
  } catch (err: any) {
    return { success: false, error: err?.message || `Lỗi khi tạo lại Câu ${idToRegenerate}.` };
  }
}

/**
 * 5. OCR Math Multimodal
 */
export async function apiOcrMath(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  model = "gemini-3.8-flash"
): Promise<{ success: boolean; extractedText?: string; modelUsed?: string; error?: string }> {
  // Try Backend First
  try {
    const res = await fetch('/api/gemini/ocr-math', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType, apiKey, model }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.extractedText) return data;
    }
  } catch (e) {
    // Fallback to direct client
  }

  // Direct Client Call
  try {
    const rawBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    const promptText = `Bạn là chuyên gia nhận diện và chuyển đổi bài toán từ hình ảnh sang văn bản và công thức LaTeX.
Hãy đọc toàn bộ đề bài toán trong hình ảnh được cung cấp:
1. Chuyển đổi chính xác tất cả câu chữ, số liệu, đơn vị và yêu cầu của bài toán sang tiếng Việt chuẩn.
2. Tất cả công thức toán học phải được viết chuẩn LaTeX (sử dụng \\( ... \\) cho inline và \\[ ... \\] cho block).
3. Đảm bảo giữ nguyên các đại lượng, số liệu đã cho và câu hỏi cần tìm.
4. Chỉ trả về văn bản đề bài hoàn chỉnh.`;

    const contents = [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "image/png",
              data: rawBase64,
            },
          },
          { text: promptText },
        ],
      },
    ];

    const { text, modelUsed } = await directCascadeCall(apiKey, model, contents);
    return { success: true, extractedText: text.trim(), modelUsed };
  } catch (err: any) {
    return { success: false, error: err?.message || "Không thể nhận diện nội dung từ ảnh." };
  }
}

/**
 * 6. Generate Image / SVG Vector
 */
export async function apiGenerateImage(
  imagePrompt: string,
  negativePrompt: string,
  aspectRatio: string,
  apiKey: string,
  imageModel = "imagen-3.0-generate-002"
): Promise<{ success: boolean; imageDataUrl?: string; isSvgFallback?: boolean; note?: string; error?: string; fallbackText?: string }> {
  // Try Backend First
  try {
    const res = await fetch('/api/gemini/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagePrompt, negativePrompt, aspectRatio, apiKey, imageModel }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.imageDataUrl) return data;
    }
  } catch (e) {
    // Fallback to direct client
  }

  // Direct Client Call (Smart SVG Generator cascade)
  try {
    const svgPrompt = `Bạn là chuyên gia thiết kế hình họa giáo dục Toán học. Hãy vẽ một sơ đồ vector SVG minh họa trực quan cho bài toán thực tế sau:
MÔ TẢ HÌNH VẼ: ${imagePrompt}
YÊU CẦU BẮT BUỘC:
1. Trả về mã SVG hoàn chỉnh bắt đầu bằng <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg"> và kết thúc bằng </svg>.
2. Vẽ sơ đồ hình học, các đối tượng thực tế, các góc, độ dài, ký hiệu toán học tiếng Việt rõ ràng.
3. Phối màu hiện đại, tương phản cao, phông nền sáng (#FFFFFF hoặc #F8FAFC).
4. KHÔNG chứa bất kỳ văn bản giải thích hay Markdown nào ngoài mã <svg ...></svg>.`;

    const { text: svgText, modelUsed } = await directCascadeCall(apiKey, "gemini-3.8-flash", [
      { parts: [{ text: svgPrompt }] },
    ]);

    if (svgText.includes("<svg") && svgText.includes("</svg>")) {
      const start = svgText.indexOf("<svg");
      const end = svgText.lastIndexOf("</svg>") + 6;
      const cleanSvg = svgText.substring(start, end);
      const base64Svg = btoa(unescape(encodeURIComponent(cleanSvg)));
      return {
        success: true,
        imageDataUrl: `data:image/svg+xml;base64,${base64Svg}`,
        isSvgFallback: true,
        note: `Đã tự động tạo sơ đồ vector SVG minh họa (Dự phòng qua ${modelUsed})`,
      };
    }

    return {
      success: false,
      fallbackText: "API key hoặc model chưa hỗ trợ tạo ảnh trực tiếp. Bạn có thể sao chép câu lệnh để tạo ảnh trong ChatGPT hoặc Canva.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message,
      fallbackText: "Bạn có thể sao chép câu lệnh để tạo ảnh trong ChatGPT, Midjourney hoặc Canva.",
    };
  }
}

/**
 * 7. Render TikZ to SVG Preview
 */
export async function apiRenderTikz(
  tikzCode: string,
  apiKey: string,
  model = "gemini-3.8-flash"
): Promise<{ success: boolean; svgDataUrl?: string; error?: string }> {
  // Try Backend First
  try {
    const res = await fetch('/api/gemini/render-tikz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tikzCode, apiKey, model }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.svgDataUrl) return data;
    }
  } catch (e) {
    // Fallback to direct client
  }

  // Direct Client Call
  try {
    const prompt = `Bạn là trình biên dịch TikZ sang SVG chính xác. Hãy chuyển đổi đoạn mã TikZ sau thành mã SVG hiển thị trực quan:
MÃ TIKZ:
${tikzCode}

YÊU CẦU:
1. Trả về mã SVG hoàn chỉnh bắt đầu bằng <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg"> và kết thúc bằng </svg>.
2. Vẽ đúng các điểm, đường thẳng, góc vuông, nhãn văn bản, cung tròn tương ứng.
3. Không trả về giải thích, chỉ trả về duy nhất mã SVG.`;

    const { text: svgText } = await directCascadeCall(apiKey, model, [{ parts: [{ text: prompt }] }]);
    if (svgText.includes("<svg") && svgText.includes("</svg>")) {
      const start = svgText.indexOf("<svg");
      const end = svgText.lastIndexOf("</svg>") + 6;
      const cleanSvg = svgText.substring(start, end);
      const base64Svg = btoa(unescape(encodeURIComponent(cleanSvg)));
      return { success: true, svgDataUrl: `data:image/svg+xml;base64,${base64Svg}` };
    }
    return { success: false, error: "Không tạo được mã SVG từ TikZ." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi khi render TikZ." };
  }
}
