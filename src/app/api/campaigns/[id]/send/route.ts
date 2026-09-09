import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const campaignId = parseInt(id);

    const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(campaignId) as any;
    if (!campaign) {
      return NextResponse.json({ success: false, error: "Không tìm thấy chiến dịch" }, { status: 404 });
    }

    // Determine target send webhook URL
    let sendWebhookUrl = "";
    if (campaign.account_phone) {
      const acc = db.prepare("SELECT send_webhook_url FROM accounts WHERE phone = ?").get(campaign.account_phone) as { send_webhook_url: string } | undefined;
      sendWebhookUrl = acc?.send_webhook_url || "";
    }

    if (!sendWebhookUrl) {
      const webhookSetting = db.prepare("SELECT value FROM settings WHERE key = 'n8n_send_webhook'").get() as { value: string } | undefined;
      sendWebhookUrl = webhookSetting?.value || "";
    }

    if (!sendWebhookUrl || !sendWebhookUrl.startsWith("http")) {
      return NextResponse.json({
        success: false,
        error: `Chưa cấu hình URL n8n Send Webhook cho ${campaign.account_phone ? `tài khoản ${campaign.account_phone}` : "hệ thống"}.`,
      }, { status: 400 });
    }

    // Query target recipients with anti-spam filters
    let whereConditions: string[] = ["m.is_admin = 0"];
    let queryParams: any[] = [];

    if (campaign.target_group_id) {
      whereConditions.push("m.zalo_id IN (SELECT member_id FROM group_members WHERE group_id = ?)");
      queryParams.push(campaign.target_group_id);
    }

    if (campaign.cooldown_days > 0) {
      whereConditions.push(`(
        m.last_campaign_sent_at IS NULL 
        OR m.last_campaign_sent_at = '' 
        OR m.last_campaign_sent_at < datetime('now', '-' || ? || ' days', 'localtime')
      )`);
      queryParams.push(campaign.cooldown_days);
    }

    if (!campaign.auto_friend_first) {
      whereConditions.push("m.block_stranger_msg = 0");
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");
    const limit = campaign.max_recipients || 100;
    queryParams.push(limit);

    const recipients = db.prepare(`
      SELECT DISTINCT m.zalo_id, m.display_name, m.avatar, m.phone, m.is_friend, m.block_stranger_msg
      FROM members m
      ${whereClause}
      ORDER BY m.last_campaign_sent_at ASC, m.id ASC
      LIMIT ?
    `).all(...queryParams) as any[];

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
      recipients: recipients.map((r) => ({
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

    // Update campaign status & timestamp on sent members
    db.exec("BEGIN TRANSACTION;");
    try {
      db.prepare(`
        UPDATE campaigns SET
          status = 'sending',
          sent_count = ?,
          n8n_response = ?,
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(recipients.length, n8nText.slice(0, 500), campaignId);

      const updateMemberStmt = db.prepare(`
        UPDATE members SET
          campaign_sent_count = COALESCE(campaign_sent_count, 0) + 1,
          last_campaign_sent_at = datetime('now', 'localtime')
        WHERE zalo_id = ?
      `);

      for (const r of recipients) {
        updateMemberStmt.run(r.zalo_id);
      }

      if (campaign.account_phone) {
        db.prepare(`
          UPDATE accounts SET
            total_sent_messages = COALESCE(total_sent_messages, 0) + ?,
            updated_at = datetime('now', 'localtime')
        `).run(recipients.length);
      }

      db.exec("COMMIT;");
    } catch (dbErr) {
      db.exec("ROLLBACK;");
      throw dbErr;
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
