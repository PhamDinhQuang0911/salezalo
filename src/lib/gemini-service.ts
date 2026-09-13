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
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Mới nhất, phản hồi siêu tốc, phân tích ngôn ngữ tự nhiên đỉnh cao",
    tag: "Khuyên dùng",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "Cực kỳ ổn định, tốc độ nhanh, bảo toàn chi tiết thông tin tối đa",
    tag: "Ổn định",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "Chuyên sâu, lý luận sắc bén, văn phong chất lượng cao cho bài viết dài",
    tag: "Chuyên sâu",
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

  const systemPrompt = `BẠN LÀ MỘT BIÊN TẬP VIÊN VĂN BẢN (COPY EDITOR) CHUYÊN NGHIỆP CHO TIN NHẮN ZALO MARKETING TẠI VIỆT NAM.
Nhiệm vụ của bạn là VIẾT LẠI nội dung tin nhắn được cung cấp theo phong cách: "${stylePrompt}".

⚠️ CÁC NGUYÊN TẮC CỐT LÕI BẮT BUỘC TUÂN THỦ (QUAN TRỌNG NHẤT):
1. BẢO TOÀN NGUYÊN VẸN 100% TẤT CẢ MỌI THÔNG TIN VÀ CHI TIẾT (NGHIÊM CẤM TÓM TẮT):
   - Bạn là người TRAU CHUỐT CÂU TỪ và TẠO CẢM XÚC, KHÔNG PHẢI người tóm tắt.
   - BẮT BUỘC GIỮ LẠI ĐẦY ĐỦ 100% tất cả các câu, các đoạn, các chi tiết trong tin nhắn gốc:
     + Tên cuốn sách, khóa học, dịch vụ, sản phẩm, tên thầy cô/tác giả (ví dụ: "Bí kíp luyện thi vào lớp 10 môn Toán", tác giả Thầy Phạm Đình Quang...).
     + Toàn bộ tính năng, lợi ích, nội dung chi tiết, mục lục, bảng giá, chương trình ưu đãi, quà tặng kèm, thể lệ, thời hạn áp dụng.
     + Toàn bộ các đường link URL, số điện thoại hotline, địa chỉ, hướng dẫn đăng ký/hành động.
   - TUYỆT ĐỐI KHÔNG ĐƯỢC lược bỏ, KHÔNG cắt xén, KHÔNG rút gọn dù chỉ là 1 chi tiết nhỏ.
   - Độ dài của tin nhắn viết lại BẮT BUỘC PHẢI TƯƠNG ĐƯƠNG HOẶC DÀI HƠN bản gốc. Bản gốc có bao nhiêu đoạn, bản viết lại phải có đầy đủ bấy nhiêu đoạn tương ứng.

2. BẢO TỒN NGUYÊN VẸN THẺ BIẾN {name}:
   - Giữ nguyên chính xác thẻ "{name}" (bao gồm cả dấu ngoặc nhọn) ở phần xưng hô chào hỏi đầu tin nhắn (ví dụ: "Chào {name} nhé!", "{name} ơi...", "Gửi {name} thân mến!").

3. VĂN PHONG VÀ TRÌNH BÀY CHUẨN ZALO CHUYÊN NGHIỆP:
   - Sử dụng các biểu tượng cảm xúc (emoji) sinh động, hợp lý để làm nổi bật các ý chính.
   - Ngắt dòng thông thoáng, dễ đọc trên màn hình điện thoại di động.

4. ĐỊNH DẠNG ĐẦU RA:
   - CHỈ TRẢ VỀ DUY NHẤT nội dung tin nhắn hoàn chỉnh đã được viết lại.
   - TUYỆT ĐỐI KHÔNG kèm lời dẫn nhập của AI (như "Dưới đây là...", "Chào bạn..."), KHÔNG kèm giải thích, KHÔNG bọc trong dấu ngoặc kép hay khối code markdown (\`\`\`).`;

  const requestPayload = {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}\n\nNỘI DUNG TIN NHẮN GỐC CẦN VIẾT LẠI (HÃY GIỮ ĐẦY ĐỦ 100% THÔNG TIN CHI TIẾT, KHÔNG ĐƯỢC TÓM TẮT):\n"""\n${originalText.trim()}\n"""`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.35, // Nhiệt độ thấp để bám sát và bảo toàn 100% nội dung gốc
      topP: 0.95,
      maxOutputTokens: 8192, // Tăng lên 8192 tokens để không bao giờ bị cắt cụt câu hay thiếu chữ
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

    const candidate = primaryResult.data?.candidates?.[0];
    const generatedText = candidate?.content?.parts?.[0]?.text?.trim();
    if (!generatedText) {
      return {
        success: false,
        error: "AI không trả về văn bản nào. Vui lòng thử lại.",
      };
    }

    let finalCleanText = cleanGeneratedText(generatedText);

    // Failsafe: Nếu AI tóm tắt quá đà làm mất hơn 40% dung lượng bản gốc, tự động re-prompt với chỉ thị bắt buộc bảo toàn 100%
    if (finalCleanText.length < originalText.trim().length * 0.6 && originalText.trim().length > 80) {
      try {
        const retryPayload = {
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n⚠️ CẢNH BÁO QUAN TRỌNG: Bạn vừa cắt bớt quá nhiều thông tin. Yêu cầu viết lại bản gốc dưới đây giữ NGUYÊN VẸN 100% TẤT CẢ Ý TỨ, CHI TIẾT, ĐOẠN VĂN, KHÔNG ĐƯỢC TÓM TẮT DÙ CHỈ 1 CÂU:\n"""\n${originalText.trim()}\n"""`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        };

        const retryRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(retryPayload),
          }
        );
        const retryData = await retryRes.json();
        const retryText = retryData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (retryText && retryText.length > finalCleanText.length) {
          finalCleanText = cleanGeneratedText(retryText);
        }
      } catch (retryErr) {
        console.warn("[Gemini AI] Retry error:", retryErr);
      }
    }

    return {
      success: true,
      text: finalCleanText,
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
