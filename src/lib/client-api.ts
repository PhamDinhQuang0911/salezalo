import {
  getStats,
  getAccounts,
  saveAccount,
  deleteAccount,
  getGroups,
  saveGroup,
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
} from "./firestore-db";
import { processZaloData } from "./zalo-processor";

export async function clientGetStats() {
  const stats = await getStats();
  return { success: true, stats };
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
  const effectiveId = data.group_id || "GROUP_" + Date.now();
  const group = await saveGroup(effectiveId, {
    name: data.name || `Nhóm Zalo (${effectiveId})`,
    description: data.description || "",
    invite_link: data.invite_link || "",
    account_phone: data.account_phone || "",
    status: "pending",
    filtered_member_count: 0,
    admin_count: 0,
    total_member: 0,
    created_at: new Date().toISOString(),
  });
  return { success: true, group };
}

export async function clientUpdateGroup(groupId: string, data: { name?: string; avatar?: string; description?: string }) {
  const group = await saveGroup(groupId, data);
  return { success: true, group };
}

export async function clientDeleteGroup(groupId: string) {
  await deleteGroup(groupId);
  return { success: true, message: "Đã xóa nhóm" };
}

export async function clientGetMembers(filter: any) {
  const result = await getMembers(filter);
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

export async function clientSaveCampaign(id: string | null, data: any) {
  const { total } = await getMembers({
    groupId: data.target_group_id || undefined,
    role: "member",
  });

  const campaign = await saveCampaign(id, {
    name: data.name?.trim(),
    message_template: data.message_template?.trim(),
    target_group_id: data.target_group_id || "",
    account_phone: data.account_phone || "",
    target_count: total,
    max_recipients: parseInt(data.max_recipients) || 100,
    cooldown_days: parseInt(data.cooldown_days) || 10,
    auto_friend_first: data.auto_friend_first ? 1 : 0,
    delay_seconds: parseInt(data.delay_seconds) || 15,
    image_url: data.image_url?.trim() || "",
    video_url: data.video_url?.trim() || "",
    cta_link: data.cta_link?.trim() || "",
  });

  return { success: true, campaign };
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
    },
  };
}

export async function clientUpdateSettings(data: Record<string, string>) {
  await updateSettings(data);
  return { success: true, message: "Đã lưu cài đặt" };
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes for large groups

  let resp: Response;
  try {
    resp = await fetch(scrapeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: data.group_id || "",
        name: data.name || "",
        groupName: data.name || "",
        inviteLink: data.invite_link || "",
        accountPhone: effectivePhone || "",
        action: "scrape_group",
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  let responseData: any = null;
  try {
    responseData = await resp.json();
  } catch (e) {
    responseData = null;
  }

  // If n8n responded with the scraped group/member dataset directly (via Respond to Webhook or When Last Node Finishes)
  if (responseData && (responseData.memberIds || responseData.response || (Array.isArray(responseData) && responseData.length > 0))) {
    const importResult = await processZaloData(responseData);
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
    message: `Đã gửi lệnh cào sang n8n thành công (${effectivePhone ? `SĐT: ${effectivePhone}` : "Webhook chung"})!`,
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
    throw new Error("Không có thành viên nào thỏa mãn tiêu chuẩn chống spam để gửi tin đợt này.");
  }

  const payload = {
    campaignId: campaign.id,
    campaignName: campaign.name,
    senderAccountPhone: campaign.account_phone || "",
    message: {
      text: campaign.message_template,
      imageUrl: campaign.image_url || "",
      videoUrl: campaign.video_url || "",
      ctaLink: campaign.cta_link || "",
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const resp = await fetch(sendWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  const n8nText = await resp.text();

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

export async function clientImportZaloData(payload: any) {
  return await processZaloData(payload);
}
