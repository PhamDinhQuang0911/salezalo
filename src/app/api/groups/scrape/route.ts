import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const { group_id, invite_link, account_phone } = body;

    if (!group_id && !invite_link) {
      return NextResponse.json({ success: false, error: "Thiếu group_id hoặc invite_link" }, { status: 400 });
    }

    // Determine scrape webhook: from specified account, from group's assigned account, or global
    let scrapeUrl = "";
    const effectivePhone = account_phone || (group_id ? (db.prepare("SELECT account_phone FROM groups WHERE group_id = ?").get(group_id) as any)?.account_phone : "");

    if (effectivePhone) {
      const acc = db.prepare("SELECT scrape_webhook_url FROM accounts WHERE phone = ?").get(effectivePhone) as { scrape_webhook_url: string } | undefined;
      scrapeUrl = acc?.scrape_webhook_url || "";
    }

    if (!scrapeUrl) {
      const webhookSetting = db.prepare("SELECT value FROM settings WHERE key = 'n8n_scrape_webhook'").get() as { value: string } | undefined;
      scrapeUrl = webhookSetting?.value || "";
    }

    if (!scrapeUrl || !scrapeUrl.startsWith("http")) {
      return NextResponse.json({
        success: false,
        error: "Chưa thiết lập URL n8n Scrape Webhook cho tài khoản này.",
      }, { status: 400 });
    }

    // Call n8n webhook
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(scrapeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: group_id || "",
        inviteLink: invite_link || "",
        accountPhone: effectivePhone || "",
        action: "scrape_group",
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (group_id) {
      db.prepare("UPDATE groups SET status = 'scraping' WHERE group_id = ?").run(group_id);
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi lệnh cào sang n8n thành công (${effectivePhone ? `SĐT: ${effectivePhone}` : "Webhook chung"})!`,
      n8nStatus: resp.status,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: "Lỗi kết nối tới n8n webhook: " + error.message,
    }, { status: 500 });
  }
}
