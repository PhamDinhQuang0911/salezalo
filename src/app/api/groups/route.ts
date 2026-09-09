import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const groups = db.prepare(`
      SELECT 
        g.id,
        g.group_id,
        g.name,
        g.description,
        g.creator_id,
        g.admin_ids,
        g.avatar,
        g.full_avatar,
        g.total_member,
        g.filtered_member_count,
        g.admin_count,
        g.invite_link,
        g.account_phone,
        g.status,
        g.last_scraped_at,
        g.created_at,
        a.name as account_name
      FROM groups g
      LEFT JOIN accounts a ON g.account_phone = a.phone
      ORDER BY g.last_scraped_at DESC, g.id DESC
    `).all();

    return NextResponse.json({ success: true, groups });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const { group_id, name, invite_link, account_phone, trigger_scrape } = body;

    if (!group_id && !invite_link) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập Group UID hoặc Link mời" }, { status: 400 });
    }

    const finalGroupId = (group_id || `LINK_${Date.now()}`).trim();
    const finalName = (name || `Nhóm Zalo ${finalGroupId}`).trim();
    const finalLink = (invite_link || "").trim();
    const finalAccountPhone = (account_phone || "").trim();

    // Insert or update group
    db.prepare(`
      INSERT INTO groups (group_id, name, invite_link, account_phone, status)
      VALUES (?, ?, ?, ?, 'pending')
      ON CONFLICT(group_id) DO UPDATE SET
        name = COALESCE(NULLIF(excluded.name, ''), groups.name),
        invite_link = COALESCE(NULLIF(excluded.invite_link, ''), groups.invite_link),
        account_phone = COALESCE(NULLIF(excluded.account_phone, ''), groups.account_phone),
        status = 'pending',
        updated_at = datetime('now', 'localtime')
    `).run(finalGroupId, finalName, finalLink, finalAccountPhone);

    let n8nNotice = "";

    // If trigger_scrape is requested, call dedicated account webhook or global webhook
    if (trigger_scrape) {
      let scrapeUrl = "";
      if (finalAccountPhone) {
        const account = db.prepare("SELECT scrape_webhook_url FROM accounts WHERE phone = ?").get(finalAccountPhone) as { scrape_webhook_url: string } | undefined;
        scrapeUrl = account?.scrape_webhook_url || "";
      }

      if (!scrapeUrl) {
        const webhookSetting = db.prepare("SELECT value FROM settings WHERE key = 'n8n_scrape_webhook'").get() as { value: string } | undefined;
        scrapeUrl = webhookSetting?.value || "";
      }

      if (scrapeUrl && scrapeUrl.startsWith("http")) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const resp = await fetch(scrapeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              groupId: finalGroupId,
              inviteLink: finalLink,
              accountPhone: finalAccountPhone,
              action: "scrape_group",
              timestamp: new Date().toISOString(),
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (resp.ok) {
            db.prepare("UPDATE groups SET status = 'scraping' WHERE group_id = ?").run(finalGroupId);
            n8nNotice = `Đã gửi lệnh cào thành công qua n8n webhook (${finalAccountPhone ? `tài khoản ${finalAccountPhone}` : "mặc định"}).`;
          } else {
            n8nNotice = `n8n phản hồi mã lỗi: ${resp.status}`;
          }
        } catch (n8nErr: any) {
          n8nNotice = `Không thể kết nối n8n: ${n8nErr.message}`;
        }
      } else {
        n8nNotice = "Chưa cấu hình URL Webhook n8n cho tài khoản này.";
      }
    }

    const group = db.prepare("SELECT * FROM groups WHERE group_id = ?").get(finalGroupId);
    return NextResponse.json({ success: true, group, n8nNotice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
