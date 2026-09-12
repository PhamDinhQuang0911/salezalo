import {
  getStats,
  getAccounts,
  saveAccount,
  deleteAccount,
  getGroups,
  getGroupById,
  saveGroup,
  updateGroup,
  deleteGroup,
  getMembers,
  updateMember,
  deleteMember,
  deleteMembers,
  deleteMembersByGroup,
  deleteAllMembers,
  getCampaigns,
  getCampaignById,
  saveCampaign,
  deleteCampaign,
  getCampaignRecipients,
  getAccountByPhone,
  getSettings,
  updateSettings,
  batchUpdateMembersFriendStatus,
  batchUpdateCustomerStatus,
  invalidateMembersCache,
} from "./firestore-db";
import { processZaloData } from "./zalo-processor";


export async function clientGetStats() {
  const stats = await getStats();
  return {
    success: true,
    stats: {
      ...stats,
      totalGroups: stats.total_groups,
      targetMembers: stats.filtered_members,
      filteredAdmins: stats.excluded_admins,
      friendsCount: stats.friends_count,
      campaignSentMembers: stats.campaign_sent_members,
      potentialCount: (stats as any).potential_count || 0,
      blockedCount: (stats as any).blocked_count || 0,
      totalCampaigns: stats.total_campaigns,
      totalAccounts: stats.total_accounts,
    },
  };
}

export async function clientGetAccounts() {
  const accounts = await getAccounts();
  return { success: true, accounts };
}

export async function clientSaveAccount(data: {
  phone: string;
  name?: string;
  scrape_webhook_url?: string;
  send_webhook_url?: string;
  friend_webhook_url?: string;
  sync_webhook_url?: string;
}) {
  const account = await saveAccount(data);
  return { success: true, account };
}

export async function clientDeleteAccount(id: string) {
  await deleteAccount(id);
  return { success: true, message: "Đã xóa tài khoản" };
}

export async function clientGetGroups() {
  const groups = await getGroups();
  return { success: true, groups };
}

export async function clientSaveGroup(data: {
  group_id?: string;
  name?: string;
  description?: string;
  invite_link?: string;
  account_phone?: string;
}) {
  const effectiveId = data.group_id?.trim() || "GROUP_" + Date.now();
  const existing = await getGroupById(effectiveId);

  let finalName = data.name?.trim() || "";
  if (!finalName && existing?.name && !existing.name.includes(effectiveId)) {
    finalName = existing.name;
  }
  if (!finalName) {
    finalName = data.name?.trim() || `Nhóm Zalo (${effectiveId})`;
  }

  const group = await saveGroup(effectiveId, {
    name: finalName,
    description: data.description || existing?.description || "",
    invite_link: data.invite_link || existing?.invite_link || "",
    account_phone: data.account_phone || existing?.account_phone || "",
    status: existing?.status || "pending",
    filtered_member_count: existing?.filtered_member_count || 0,
    admin_count: existing?.admin_count || 0,
    total_member: existing?.total_member || 0,
    avatar: existing?.avatar || "",
    full_avatar: existing?.full_avatar || "",
    created_at: existing?.created_at || new Date().toISOString(),
  });
  return { success: true, group };
}

export async function clientUpdateGroup(groupId: string, data: { name?: string; avatar?: string; description?: string }) {
  const group = await updateGroup(groupId, data);
  return { success: true, group };
}

export async function clientDeleteGroup(groupId: string) {
  await deleteGroup(groupId);
  return { success: true, message: "Đã xóa nhóm" };
}

export async function clientGetMembers(filter: any, forceRefresh = false) {
  const result = await getMembers(filter, forceRefresh);
  return {
    success: true,
    members: result.members,
    pagination: {
      total: result.total,
      page: result.page,
      limit: filter.limit || 20,
      totalPages: result.totalPages,
    },
  };
}

export async function clientUpdateMember(zaloId: string, updates: any) {
  await updateMember(zaloId, updates);
  return { success: true, message: "Đã cập nhật thành viên" };
}

export async function clientDeleteMember(zaloId: string) {
  await deleteMember(zaloId);
  return { success: true, message: "Đã xóa thành viên" };
}

export async function clientDeleteMembers(zaloIds: string[]) {
  await deleteMembers(zaloIds);
  return { success: true, message: `Đã xóa ${zaloIds.length} thành viên đã chọn` };
}

export async function clientDeleteMembersByGroup(groupId: string) {
  const count = await deleteMembersByGroup(groupId);
  return { success: true, message: `Đã xóa ${count} thành viên trong nhóm này` };
}

export async function clientDeleteAllMembers() {
  const count = await deleteAllMembers();
  return { success: true, message: `Đã xóa toàn bộ ${count} thành viên trong hệ thống` };
}

export async function clientGetCampaigns() {
  const campaigns = await getCampaigns();
  return { success: true, campaigns };
}

export async function clientBatchUpdateCustomerStatus(zaloIds: string[], status: "potential" | "blocked" | "standard") {
  const count = await batchUpdateCustomerStatus(zaloIds, status);
  return { success: true, count, message: `Đã cập nhật phân loại cho ${count} thành viên` };
}

export async function clientSaveCampaign(id: string | null, data: any) {
  const effectiveGroupId = data.target_group_id && data.target_group_id !== "all" ? data.target_group_id : "";
  const imageUrls: string[] = Array.isArray(data.image_urls)
    ? data.image_urls.filter((u: any) => typeof u === "string" && u.trim().length > 0)
    : (data.image_url ? [data.image_url.trim()] : []);

  const ctaLinks: any[] = Array.isArray(data.cta_links)
    ? data.cta_links.filter((l: any) => l && (l.url?.trim() || l.label?.trim())).map((l: any) => ({
        id: l.id || `cta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: l.label?.trim() || "Xem chi tiết",
        url: l.url?.trim() || "",
      }))
    : (data.cta_link ? [{ id: `cta-${Date.now()}`, label: "Xem chi tiết", url: data.cta_link.trim() }] : []);

  const campaignPayload: any = {
    name: data.name?.trim(),
    message_template: data.message_template?.trim(),
    target_group_id: effectiveGroupId || "all",
    account_phone: data.account_phone || "",
    friend_filter: data.friend_filter || "all",
    customer_filter: data.customer_filter || "all",
    max_recipients: data.max_recipients !== undefined && !isNaN(parseInt(data.max_recipients)) ? parseInt(data.max_recipients) : 100,
    cooldown_days: data.cooldown_days !== undefined && !isNaN(parseInt(data.cooldown_days)) ? parseInt(data.cooldown_days) : 0,
    auto_friend_first: data.auto_friend_first ? 1 : 0,
    delay_seconds: parseInt(data.delay_seconds) || 15,
    image_url: imageUrls[0] || data.image_url?.trim() || "",
    image_urls: imageUrls,
    video_url: data.video_url?.trim() || "",
    document_url: data.document_url?.trim() || "",
    media_url: data.media_url?.trim() || imageUrls[0] || "",
    media_type: data.media_type?.trim() || (imageUrls.length > 0 ? "image" : "none"),
    file_name: data.file_name?.trim() || "",
    cta_link: ctaLinks[0]?.url || data.cta_link?.trim() || "",
    cta_links: ctaLinks,
  };

  const eligibleRecipients = await getCampaignRecipients(campaignPayload);
  campaignPayload.target_count = eligibleRecipients.length;

  const campaign = await saveCampaign(id, campaignPayload);
  return { success: true, campaign };
}

export async function clientQuickUpdateCampaignAudience(campaignId: string, audienceData: {
  target_group_id?: string;
  friend_filter?: string;
  customer_filter?: string;
  max_recipients?: number;
  cooldown_days?: number;
  auto_friend_first?: number;
}) {
  const existing = await getCampaignById(campaignId);
  if (!existing) {
    throw new Error("Không tìm thấy chiến dịch");
  }

  const updatedConfig: any = {
    ...existing,
    ...audienceData,
    target_group_id: audienceData.target_group_id && audienceData.target_group_id !== "all" ? audienceData.target_group_id : "all",
    friend_filter: audienceData.friend_filter !== undefined ? audienceData.friend_filter : (existing.friend_filter || "all"),
    customer_filter: audienceData.customer_filter !== undefined ? audienceData.customer_filter : (existing.customer_filter || "all"),
    max_recipients: audienceData.max_recipients !== undefined ? Number(audienceData.max_recipients) : (existing.max_recipients || 100),
    cooldown_days: audienceData.cooldown_days !== undefined ? Number(audienceData.cooldown_days) : (existing.cooldown_days || 0),
    auto_friend_first: audienceData.auto_friend_first !== undefined ? (audienceData.auto_friend_first ? 1 : 0) : (existing.auto_friend_first || 0),
  };

  const eligibleRecipients = await getCampaignRecipients(updatedConfig);
  updatedConfig.target_count = eligibleRecipients.length;

  const saved = await saveCampaign(campaignId, {
    target_group_id: updatedConfig.target_group_id,
    friend_filter: updatedConfig.friend_filter,
    customer_filter: updatedConfig.customer_filter,
    max_recipients: updatedConfig.max_recipients,
    cooldown_days: updatedConfig.cooldown_days,
    auto_friend_first: updatedConfig.auto_friend_first,
    target_count: eligibleRecipients.length,
  });

  return { success: true, campaign: saved, recipientCount: eligibleRecipients.length };
}

export async function clientCalculateCampaignRecipients(campaignConfig: any) {
  const recipients = await getCampaignRecipients(campaignConfig);
  return {
    success: true,
    count: recipients.length,
    recipients: recipients.slice(0, 10),
  };
}

export async function clientDeleteCampaign(id: string) {
  await deleteCampaign(id);
  return { success: true, message: "Đã xóa chiến dịch" };
}

export async function clientGetSettings() {
  const settings = await getSettings();
  return {
    success: true,
    settings: {
      n8n_scrape_webhook: settings.n8n_scrape_webhook || "",
      n8n_send_webhook: settings.n8n_send_webhook || "",
      n8n_friend_webhook: settings.n8n_friend_webhook || "",
      n8n_sync_webhook: settings.n8n_sync_webhook || "",
      gemini_api_key: settings.gemini_api_key || "",
      gemini_model: settings.gemini_model || "gemini-3.5-flash",
      ...settings,
    },
  };
}

export async function clientUpdateSettings(data: Record<string, string>) {
  await updateSettings(data);
  return { success: true, message: "Đã lưu cài đặt" };
}

async function callN8nWebhook(targetUrl: string, payload: any, timeoutMs = 120000): Promise<{ resp: Response; calledUrl: string; responseData: any }> {
  const tryCall = async (url: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      return res;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let resp: Response | null = null;
  let calledUrl = targetUrl;

  // 1. Thử gọi URL cấu hình chính
  try {
    resp = await tryCall(targetUrl);
  } catch (err: any) {
    resp = null;
  }

  // 2. Nếu thất bại (CORS/network error hoặc 404/500 do n8n chưa active hoặc chưa bật test), thử URL thay thế
  const isFailed = !resp || !resp.ok;
  if (isFailed) {
    let altUrl = "";
    if (targetUrl.includes("/webhook-test/")) {
      altUrl = targetUrl.replace("/webhook-test/", "/webhook/");
    } else if (targetUrl.includes("/webhook/")) {
      altUrl = targetUrl.replace("/webhook/", "/webhook-test/");
    }

    if (altUrl) {
      try {
        const altResp = await tryCall(altUrl);
        if (altResp.ok) {
          resp = altResp;
          calledUrl = altUrl;
        }
      } catch (e) {}
    }
  }

  // 3. Nếu vẫn thất bại, đưa ra thông báo hướng dẫn cực kỳ rõ ràng
  if (!resp || !resp.ok) {
    const isTest = targetUrl.includes("/webhook-test/");
    let hint = "";
    if (isTest) {
      hint =
        `Không thể kết nối n8n Webhook Test (${targetUrl}).\n` +
        `👉 Cách 1 (Nếu bạn đang kiểm thử): Mở n8n (https://n8n.qmath.io.vn) -> Bấm nút "Test step" (hoặc "Execute workflow") ở góc dưới màn hình n8n TRƯỚC, rồi quay lại bấm Cào thành viên.\n` +
        `👉 Cách 2 (Chạy tự động 24/7): Mở n8n -> Gạt công tắc [Active] (Màu xanh lá) ở góc trên bên phải -> Bấm Save (Ctrl+S). Sau đó đổi URL sang: ${targetUrl.replace("/webhook-test/", "/webhook/")}.`;
    } else {
      hint =
        `Không thể kết nối n8n Webhook Production (${targetUrl}).\n` +
        `👉 Nguyên nhân: Workflow trên n8n CHƯA ĐƯỢC BẬT [Active] (hoặc chưa import file workflow mới nhất).\n` +
        `👉 Cách khắc phục:\n` +
        `1. Mở n8n: https://n8n.qmath.io.vn\n` +
        `2. Bấm "..." góc trên bên phải -> "Import from File" -> Chọn "Desktop\\Tool_Zalo_Workflow_Completed.json"\n` +
        `3. Gạt công tắc góc trên bên phải sang [Active] (Màu xanh lá) và bấm Save (Ctrl + S).`;
    }
    throw new Error(hint);
  }

  let responseData: any = null;
  try {
    responseData = await resp.json();
  } catch (e) {
    responseData = null;
  }

  return { resp, calledUrl, responseData };
}

export async function clientTriggerScrape(data: {
  group_id?: string;
  name?: string;
  invite_link?: string;
  account_phone?: string;
}) {
  let scrapeUrl = "";
  let effectivePhone = data.account_phone || "";

  if (effectivePhone) {
    const acc = await getAccountByPhone(effectivePhone);
    scrapeUrl = acc?.scrape_webhook_url || "";
  }

  if (!scrapeUrl) {
    const settings = await getSettings();
    scrapeUrl = settings.n8n_scrape_webhook || "";
  }

  if (!scrapeUrl || !scrapeUrl.startsWith("http")) {
    throw new Error("Chưa thiết lập URL n8n Scrape Webhook cho tài khoản này.");
  }

  const { resp, calledUrl, responseData } = await callN8nWebhook(scrapeUrl, {
    groupId: data.group_id || "",
    name: data.name || "",
    groupName: data.name || "",
    inviteLink: data.invite_link || "",
    accountPhone: effectivePhone || "",
    action: "scrape_group",
    timestamp: new Date().toISOString(),
  }, 120000);

  // If n8n responded with the scraped group/member dataset directly (via Respond to Webhook or When Last Node Finishes)
  if (responseData && (responseData.memberIds || responseData.response || (Array.isArray(responseData) && responseData.length > 0))) {
    const importResult = await processZaloData(responseData);
    invalidateMembersCache();
    return {
      success: true,
      message: `Đã cào và lưu thành công ${importResult.savedMembers} thành viên vào Firebase Firestore (loại bỏ ${importResult.excludedAdmins} Trưởng/Phó nhóm)!`,
      importResult,
      n8nStatus: resp.status,
    };
  }

  if (data.group_id) {
    await saveGroup(data.group_id, { status: "scraping" });
  }

  return {
    success: true,
    message: `Đã gửi lệnh cào sang n8n thành công qua ${calledUrl} (${effectivePhone ? `SĐT: ${effectivePhone}` : "Webhook chung"})!`,
    n8nStatus: resp.status,
  };
}

export async function clientTriggerSendCampaign(campaignId: string) {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new Error("Không tìm thấy chiến dịch");
  }

  let sendWebhookUrl = "";
  if (campaign.account_phone) {
    const acc = await getAccountByPhone(campaign.account_phone);
    sendWebhookUrl = acc?.send_webhook_url || "";
  }

  if (!sendWebhookUrl) {
    const settings = await getSettings();
    sendWebhookUrl = settings.n8n_send_webhook || "";
  }

  if (!sendWebhookUrl || !sendWebhookUrl.startsWith("http")) {
    throw new Error(`Chưa cấu hình URL n8n Send Webhook cho ${campaign.account_phone ? `tài khoản ${campaign.account_phone}` : "hệ thống"}.`);
  }



  const recipients = await getCampaignRecipients(campaign);
  if (recipients.length === 0) {
    throw new Error(
      `Không tìm thấy thành viên nào thỏa mãn điều kiện để gửi tin đợt này (0 người nhận).\n` +
      `👉 Lưu ý: Nếu các thành viên đã từng được gửi tin trước đó, hãy chỉnh ô "Loại trừ người đã gửi trong (ngày)" về 0 để cho phép gửi lại ngay!`
    );
  }

  const imageUrls: string[] = Array.isArray(campaign.image_urls) && campaign.image_urls.length > 0
    ? campaign.image_urls
    : (campaign.image_url ? [campaign.image_url] : []);

  const ctaLinks: any[] = Array.isArray(campaign.cta_links) && campaign.cta_links.length > 0
    ? campaign.cta_links
    : (campaign.cta_link ? [{ label: "Xem chi tiết", url: campaign.cta_link }] : []);

  const mediaUrl = campaign.media_url || campaign.document_url || campaign.image_url || campaign.video_url || (imageUrls[0] || "");
  const isVideo = campaign.media_type === "video" || Boolean(campaign.video_url);
  const isDoc = campaign.media_type === "document" || Boolean(campaign.document_url);
  const isImage = (campaign.media_type === "image" || Boolean(campaign.image_url) || imageUrls.length > 0) && !isVideo && !isDoc;
  const mediaType = isVideo ? "video" : isDoc ? "document" : isImage ? "image" : "none";

  const payload = {
    action: "send_campaign",
    campaignId: campaign.id,
    campaignName: campaign.name,
    senderAccountPhone: campaign.account_phone || "",
    message: {
      text: campaign.message_template,
      mediaType: mediaType,
      mediaUrl: mediaUrl,
      fileName: campaign.file_name || "",
      imageUrl: isImage ? (imageUrls[0] || mediaUrl) : (campaign.image_url || ""),
      imageUrls: imageUrls,
      images: imageUrls,
      videoUrl: isVideo ? mediaUrl : (campaign.video_url || ""),
      documentUrl: isDoc ? mediaUrl : "",
      ctaLink: ctaLinks[0]?.url || campaign.cta_link || "",
      ctaLinks: ctaLinks,
      actions: ctaLinks,
    },
    settings: {
      autoFriendFirst: Boolean(campaign.auto_friend_first),
      delaySeconds: campaign.delay_seconds || 15,
      cooldownDays: campaign.cooldown_days || 10,
    },
    totalRecipients: recipients.length,
    recipients: recipients.map((r: any) => ({
      zaloId: r.zalo_id,
      name: r.display_name,
      avatar: r.avatar,
      phone: r.phone || "",
      isFriend: Boolean(r.is_friend),
    })),
    timestamp: new Date().toISOString(),
  };

  const { resp, responseData } = await callN8nWebhook(sendWebhookUrl, payload, 30000);

  const n8nText = responseData ? JSON.stringify(responseData) : (await resp.text().catch(() => ""));

  await saveCampaign(campaignId, {
    status: "sending",
    sent_count: recipients.length,
    n8n_response: n8nText.slice(0, 500),
  });

  for (const r of recipients) {
    await updateMember(r.zalo_id, {
      campaign_sent_count: (r.campaign_sent_count || 0) + 1,
      last_campaign_sent_at: new Date().toISOString(),
    });
  }

  return {
    success: true,
    message: `Đã kích hoạt gửi tin thành công tới ${recipients.length} thành viên qua n8n!`,
    recipientCount: recipients.length,
    n8nStatus: resp.status,
  };
}

export interface UploadMediaResult {
  url: string;
  name: string;
  size: number;
  type: string;
  mediaType: "image" | "video" | "document";
  base64?: string;
}

export async function uploadMediaFile(file: File): Promise<UploadMediaResult> {
  const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
  const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);
  const isDoc =
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)$/i.test(file.name) ||
    file.type.includes("pdf") ||
    file.type.includes("word") ||
    file.type.includes("document") ||
    file.type.includes("sheet") ||
    file.type.includes("presentation");

  if (!isImage && !isVideo && !isDoc) {
    throw new Error("Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh (JPG, PNG), video (MP4, WebM) hoặc tài liệu (PDF, Word, Excel).");
  }

  // Size limit validation: Video < 50MB, Image < 20MB, Document < 50MB
  if (isVideo && file.size > 50 * 1024 * 1024) {
    throw new Error(`Video quá lớn (${(file.size / (1024 * 1024)).toFixed(1)} MB). Vui lòng chọn video dưới 50MB để đảm bảo Zalo gửi mượt mà.`);
  }
  if (isImage && file.size > 20 * 1024 * 1024) {
    throw new Error(`Hình ảnh quá lớn (${(file.size / (1024 * 1024)).toFixed(1)} MB). Vui lòng chọn ảnh dưới 20MB.`);
  }
  if (isDoc && file.size > 50 * 1024 * 1024) {
    throw new Error(`Tài liệu quá lớn (${(file.size / (1024 * 1024)).toFixed(1)} MB). Vui lòng chọn tệp tài liệu dưới 50MB.`);
  }

  // Generate Base64 for instant local preview in browser if image/video
  let base64 = "";
  if (isImage || isVideo) {
    try {
      base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
    } catch (e) {}
  }

  let publicUrl = "";

  // Phương thức 1: Tải trực tiếp lên Litterbox (Catbox) - Hỗ trợ CORS *, miễn phí, hỗ trợ file đến 1GB
  try {
    const litterForm = new FormData();
    litterForm.append("reqtype", "fileupload");
    litterForm.append("time", "72h");
    litterForm.append("fileToUpload", file);

    const litterRes = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
      method: "POST",
      body: litterForm,
    });

    const litterUrl = (await litterRes.text()).trim();
    if (litterUrl.startsWith("http")) {
      publicUrl = litterUrl;
    }
  } catch (err) {
    console.warn("Litterbox upload failed, trying fallback:", err);
  }

  // Phương thức 2: Fallback qua TmpFiles nếu Litterbox gặp sự cố
  if (!publicUrl) {
    try {
      const tmpForm = new FormData();
      tmpForm.append("file", file);

      const tmpRes = await fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        body: tmpForm,
      });

      const tmpData = await tmpRes.json();
      if (tmpData?.data?.url) {
        publicUrl = tmpData.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
      }
    } catch (err) {
      console.warn("TmpFiles upload failed:", err);
    }
  }

  if (!publicUrl) {
    throw new Error("Không thể tải tệp lên máy chủ lưu trữ. Vui lòng kiểm tra kết nối mạng và thử lại.");
  }

  const mediaType: "image" | "video" | "document" = isVideo ? "video" : isDoc ? "document" : "image";

  return {
    url: publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
    mediaType,
    base64: base64 || (isImage ? publicUrl : ""),
  };
}

export async function clientSyncFriendStatus(accountPhone?: string, webhookUrlOverride?: string) {
  let syncWebhookUrl = webhookUrlOverride || "";

  if (!syncWebhookUrl && accountPhone) {
    const acc = await getAccountByPhone(accountPhone);
    syncWebhookUrl = (acc as any)?.sync_webhook_url || (acc as any)?.scrape_webhook_url || "";
  }

  if (!syncWebhookUrl) {
    const settings = await getSettings();
    syncWebhookUrl = (settings as any)?.n8n_sync_webhook || (settings as any)?.n8n_scrape_webhook || "https://n8n.qmath.io.vn/webhook/zalo-sync-friends";
  }

  if (!syncWebhookUrl.startsWith("http")) {
    throw new Error("Chưa cấu hình URL Webhook đồng bộ bạn bè hoặc Webhook Cào trên n8n.");
  }

  const { resp, responseData } = await callN8nWebhook(syncWebhookUrl, {
    accountPhone: accountPhone || "",
    action: "sync_friends",
    timestamp: new Date().toISOString(),
  }, 25000);

  const data = responseData || {};
  const friendIds = new Set<string>((data.friendIds || []).map(String));
  const pendingIds = new Set<string>((data.pendingIds || []).map(String));

  // Query all members to cross-reference
  const { members } = await getMembers({ limit: 10000 });
  const updates: { zaloId: string; isFriend: number }[] = [];
  let matchedFriends = 0;
  let matchedPending = 0;

  for (const m of members) {
    const zid = String(m.zalo_id || m.id);
    let newStatus = 0;
    if (friendIds.has(zid)) {
      newStatus = 1; // 🤝 Đã là bạn bè
      matchedFriends++;
    } else if (pendingIds.has(zid)) {
      newStatus = 2; // ⏳ Đã gửi lời mời
      matchedPending++;
    } else {
      newStatus = 0; // Chưa kết bạn
    }

    if (m.is_friend !== newStatus) {
      updates.push({ zaloId: zid, isFriend: newStatus });
    }
  }

  const updatedCount = await batchUpdateMembersFriendStatus(updates);

  return {
    success: true,
    totalScrapedMembers: members.length,
    totalZaloFriends: friendIds.size,
    totalZaloPending: pendingIds.size,
    matchedFriends,
    matchedPending,
    updatedCount,
    message: `Đã đối soát xong ${members.length} thành viên: Tìm thấy ${matchedFriends} bạn bè (🤝) và ${matchedPending} lời mời đang chờ (⏳).`,
  };
}

export async function clientImportZaloData(payload: any) {
  const result = await processZaloData(payload);
  invalidateMembersCache();
  return result;
}

export async function clientTriggerSendFriendRequests(params: {
  targetGroupId?: string;
  limit?: number;
  delayMin?: number;
  delayMax?: number;
  accountPhone?: string;
  friendMessage?: string;
  specificMemberIds?: string[];
  sentStatus?: string;
  search?: string;
}) {
  let members: any[] = [];
  if (params.specificMemberIds && params.specificMemberIds.length > 0) {
    const { members: allCandidates } = await getMembers({
      friendStatus: "not_friend",
      role: "member",
      limit: 1000,
    });
    const selectedSet = new Set(params.specificMemberIds.map(String));
    members = allCandidates.filter((m: any) => selectedSet.has(String(m.zalo_id || m.id)));
  } else {
    const effectiveGroupId = params.targetGroupId && params.targetGroupId !== "all" ? params.targetGroupId : undefined;
    const res = await getMembers({
      groupId: effectiveGroupId,
      friendStatus: "not_friend",
      role: "member",
      sentStatus: params.sentStatus && params.sentStatus !== "all" ? (params.sentStatus as any) : undefined,
      search: params.search?.trim() || undefined,
      limit: params.limit || 20,
    });
    members = res.members || [];
  }

  if (members.length === 0) {
    throw new Error("Không có thành viên nào chưa kết bạn (hoặc tất cả đều đã là bạn / đã gửi lời mời) trong tệp đã chọn.");
  }

  let friendWebhookUrl = "";
  if (params.accountPhone) {
    const acc = await getAccountByPhone(params.accountPhone);
    friendWebhookUrl = (acc as any)?.friend_webhook_url || (acc as any)?.send_webhook_url || "";
  }

  if (!friendWebhookUrl) {
    const settings = await getSettings();
    friendWebhookUrl = (settings as any)?.n8n_friend_webhook || (settings as any)?.n8n_send_webhook || "https://n8n.qmath.io.vn/webhook/zalo-send-friend-requests";
  }

  const payload = {
    action: "send_friend_requests",
    accountPhone: params.accountPhone || "",
    delayMin: params.delayMin || 15,
    delayMax: params.delayMax || 30,
    friendMessage: params.friendMessage?.trim() || "",
    totalRecipients: members.length,
    recipients: members.map((m: any, idx: number) => ({
      index: idx + 1,
      zaloId: String(m.zalo_id || m.id),
      name: m.display_name || "Thành viên",
      avatar: m.avatar || "",
    })),
    timestamp: new Date().toISOString(),
  };

  const { calledUrl } = await callN8nWebhook(friendWebhookUrl, payload, 30000);

  // Cập nhật trạng thái trong Firestore thành "Đang gửi lời mời" (is_friend = 2)
  const updates = members.map((m: any) => ({
    zaloId: String(m.zalo_id || m.id),
    isFriend: 2,
  }));
  await batchUpdateMembersFriendStatus(updates);

  return {
    success: true,
    count: members.length,
    calledUrl,
    recipients: members,
    message: `Đã kích hoạt gửi lời mời kết bạn tới ${members.length} thành viên qua n8n! Trạng thái đã được chuyển sang "Đang chờ duyệt" (⏳).`,
  };
}

