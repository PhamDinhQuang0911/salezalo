import { NextResponse } from "next/server";
import {
  getCampaignById,
  saveCampaign,
  getCampaignRecipients,
  getAccountByPhone,
  getSettings,
  updateMember,
  saveAccount,
} from "@/lib/firestore-db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json({ success: false, error: "Không tìm thấy chiến dịch" }, { status: 404 });
    }

    // Determine target send webhook URL
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
      return NextResponse.json({
        success: false,
        error: `Chưa cấu hình URL n8n Send Webhook cho ${campaign.account_phone ? `tài khoản ${campaign.account_phone}` : "hệ thống"}.`,
      }, { status: 400 });
    }

    // Query target recipients with anti-spam filters from Firestore
    const recipients = await getCampaignRecipients(campaign);

    if (recipients.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Không có thành viên nào thỏa mãn tiêu chuẩn chống spam để gửi tin đợt này (hãy kiểm tra cài đặt số ngày loại trừ hoặc trạng thái chặn tin lạ).",
      }, { status: 400 });
    }

    // Build rich media payload for n8n
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

    // Update campaign status & timestamp on sent members in Firestore
    await saveCampaign(id, {
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

    if (campaign.account_phone) {
      const acc = await getAccountByPhone(campaign.account_phone);
      if (acc) {
        await saveAccount({
          phone: campaign.account_phone,
          name: acc.name,
          scrape_webhook_url: acc.scrape_webhook_url,
          send_webhook_url: acc.send_webhook_url,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã kích hoạt gửi tin thành công tới ${recipients.length} thành viên qua n8n (${campaign.account_phone ? `SĐT: ${campaign.account_phone}` : "Webhook chính"})!`,
      recipientCount: recipients.length,
      n8nStatus: resp.status,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: "Lỗi kết nối n8n: " + error.message,
    }, { status: 500 });
  }
}
