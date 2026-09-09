import { NextResponse } from "next/server";
import { getAccountByPhone, getGroupById, getSettings, saveGroup } from "@/lib/firestore-db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { group_id, invite_link, account_phone } = body;

    if (!group_id && !invite_link) {
      return NextResponse.json({ success: false, error: "Thiếu group_id hoặc invite_link" }, { status: 400 });
    }

    let scrapeUrl = "";
    let effectivePhone = account_phone || "";

    if (group_id && !effectivePhone) {
      const g = await getGroupById(group_id);
      effectivePhone = g?.account_phone || "";
    }

    if (effectivePhone) {
      const acc = await getAccountByPhone(effectivePhone);
      scrapeUrl = acc?.scrape_webhook_url || "";
    }

    if (!scrapeUrl) {
      const settings = await getSettings();
      scrapeUrl = settings.n8n_scrape_webhook || "";
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
      await saveGroup(group_id, { status: "scraping" });
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
