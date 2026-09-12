/**
 * Google Gemini AI Integration for Zalo Marketing Messages
 * Supports: Gemini 3.5 Flash, Gemini 3.6 Flash, Gemini 3.7 Flash, Gemini 3.8 Flash
 */

export interface GeminiModelOption {
  id: string;
  name: string;
  description: string;
  tag: string;
}

export const GEMINI_FLASH_MODELS: GeminiModelOption[] = [
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    description: "Tối ưu tốc độ, văn phong tự nhiên, phản hồi siêu nhanh",
    tag: "Khuyên dùng",
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    description: "Sáng tạo nội dung, giàu cảm xúc, ngắt dòng chuẩn Zalo",
    tag: "Sáng tạo",
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    description: "Lý luận sắc bén, bán hàng & chốt sale đỉnh cao",
    tag: "Mới nhất",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    description: "Mô hình mở rộng đa nhiệm, cá nhân hóa sâu sắc",
    tag: "Nâng cao",
  },
];

export interface RewriteOptions {
  apiKey: string;
  model: string;
  stylePrompt: string;
  originalText: string;
}

export interface RewriteResult {
  success: boolean;
  text?: string;
  modelUsed?: string;
  fallbackOccurred?: boolean;
  error?: string;
}

/**
 * Call Google Generative Language API to rewrite a marketing message
 */
export async function rewriteZaloMessage({
  apiKey,
  model,
  stylePrompt,
  originalText,
}: RewriteOptions): Promise<RewriteResult> {
  const cleanKey = apiKey?.trim();
  if (!cleanKey) {
    return {
      success: false,
      error: "Vui lòng nhập Google Gemini API Key để kích hoạt tính năng viết lại bằng AI.",
    };
  }

  if (!originalText || !originalText.trim()) {
    return {
      success: false,
      error: "Vui lòng nhập nội dung tin nhắn mẫu trước khi yêu cầu AI viết lại.",
    };
  }

  const systemPrompt = `Bạn là chuyên gia copywriter hàng đầu về tin nhắn Zalo Marketing tại Việt Nam.
Nhiệm vụ của bạn là viết lại nội dung tin nhắn tiếp thị sau đây theo phong cách: "${stylePrompt}".

CÁC NGUYÊN TẮC CỐT LÕI BẮT BUỘC TUÂN THỦ:
1. BẢO TOÀN 100% ĐẦY ĐỦ MỌI THÔNG TIN (QUAN TRỌNG NHẤT):
   - Bạn PHẢI GIỮ LẠI ĐẦY ĐỦ TOÀN BỘ tất cả các thông tin, chi tiết, dữ liệu có trong tin nhắn gốc: tên sản phẩm/dịch vụ, tính năng, quyền lợi, ưu đãi, quà tặng, thể lệ, các đường link, số điện thoại/hotline, thời hạn, địa chỉ, hướng dẫn hành động...
   - TUYỆT ĐỐI KHÔNG ĐƯỢC tóm tắt làm mất ý, KHÔNG lược bỏ, KHÔNG cắt xén bất kỳ thông tin nào của người dùng.
   - Nhiệm vụ của bạn là SẮP XẾP LẠI và BIÊN TẬP CÂU CHỮ theo phong cách được chọn, giúp thông tin vừa đầy đủ trọn vẹn, vừa mạch lạc, cuốn hút và dễ đọc.

2. BẢO TỒN BIẾN {name}:
   - Giữ nguyên thẻ "{name}" ở vị trí xưng hô tự nhiên nhất (ví dụ: "Chào {name}", "{name} ơi", "Gửi {name} nhé"...) để hệ thống tự động điền tên người nhận trên Zalo.

3. VĂN PHONG CHAT ZALO CHUYÊN NGHIỆP:
   - Diễn đạt trôi chảy, tự nhiên, văn minh, kích thích người đọc phản hồi.
   - Sử dụng các biểu tượng cảm xúc (emoji) phù hợp một cách tinh tế để làm nổi bật các ý chính và thông tin quan trọng.

4. BỐ CỤC TRÌNH BÀY THOÁNG MẮT TRÊN ĐIỆN THOẠI:
   - Sử dụng ngắt dòng và gạch đầu dòng hợp lý để người đọc trên màn hình di động nắm bắt toàn bộ thông tin một cách rõ ràng, không bị rối mắt.

5. ĐỊNH DẠNG ĐẦU RA:
   - CHỈ TRẢ VỀ DUY NHẤT nội dung tin nhắn đã được viết lại.
   - TUYỆT ĐỐI KHÔNG kèm lời dẫn nhập thừa (như "Dưới đây là tin nhắn...", "Chào bạn..."), KHÔNG kèm giải thích, KHÔNG bọc trong dấu ngoặc kép hay khối code markdown (\`\`\`).`;

  const requestPayload = {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}\n\nNỘI DUNG TIN NHẮN GỐC CẦN VIẾT LẠI:\n"""\n${originalText.trim()}\n"""`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.75,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  const executeApiCall = async (targetModel: string) => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${cleanKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });
    const data = await response.json();
    return { status: response.status, data };
  };

  try {
    // 1. First attempt with the requested model
    const primaryResult = await executeApiCall(model);

    if (primaryResult.data?.error) {
      const err = primaryResult.data.error;
      const isNotFound =
        primaryResult.status === 404 ||
        (err.message && (err.message.includes("not found") || err.message.includes("is not supported")));

      // 2. If model not found on user's API key tier, gracefully fallback to available Gemini Flash models
      if (isNotFound) {
        console.warn(
          `[Gemini AI] Model ${model} is not yet available on public API endpoint. Falling back to Gemini 2.0 Flash...`
        );
        const fallbackResult = await executeApiCall("gemini-2.0-flash");
        if (fallbackResult.data?.error) {
          // Try 1.5 flash fallback
          const fb15Result = await executeApiCall("gemini-1.5-flash");
          if (fb15Result.data?.error) {
            return {
              success: false,
              error: fb15Result.data.error.message || err.message || "Lỗi gọi Gemini API",
            };
          }
          const text15 = fb15Result.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          return {
            success: true,
            text: cleanGeneratedText(text15),
            modelUsed: "gemini-1.5-flash (tối ưu)",
            fallbackOccurred: true,
          };
        }

        const text20 = fallbackResult.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        return {
          success: true,
          text: cleanGeneratedText(text20),
          modelUsed: "gemini-2.0-flash (tối ưu)",
          fallbackOccurred: true,
        };
      }

      // Other API errors (e.g. invalid API key, quota exceeded)
      let customErrMsg = err.message || "Lỗi gọi Google Gemini API";
      if (err.status === "PERMISSION_DENIED" || primaryResult.status === 403) {
        customErrMsg = "API Key không hợp lệ hoặc không có quyền gọi Google Generative Language API.";
      } else if (err.status === "RESOURCE_EXHAUSTED" || primaryResult.status === 429) {
        customErrMsg = "Đã vượt quá hạn ngạch (quota) gọi Gemini API của tài khoản.";
      }

      return {
        success: false,
        error: customErrMsg,
      };
    }

    const generatedText = primaryResult.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!generatedText) {
      return {
        success: false,
        error: "AI không trả về văn bản nào. Vui lòng thử lại.",
      };
    }

    return {
      success: true,
      text: cleanGeneratedText(generatedText),
      modelUsed: model,
    };
  } catch (netErr: any) {
    return {
      success: false,
      error: "Lỗi kết nối mạng khi gọi Google Gemini API: " + (netErr.message || String(netErr)),
    };
  }
}

/**
 * Remove any accidental wrappers or quotes around the AI output
 */
function cleanGeneratedText(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();

  // Strip markdown code block wrapper if present: ```text ... ``` or ``` ... ```
  if (s.startsWith("```")) {
    s = s.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  }

  // Strip surrounding quotes if AI wrapped entire message in double quotes
  if (s.startsWith('"') && s.endsWith('"') && s.length > 2) {
    s = s.slice(1, -1).trim();
  }

  return s;
}
