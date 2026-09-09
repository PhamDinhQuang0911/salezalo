import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const accounts = db.prepare(`
      SELECT 
        id,
        phone,
        name,
        scrape_webhook_url,
        send_webhook_url,
        status,
        (SELECT COUNT(*) FROM groups WHERE account_phone = accounts.phone) as total_scraped_groups,
        total_sent_messages,
        created_at
      FROM accounts
      ORDER BY id DESC
    `).all();

    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const { phone, name, scrape_webhook_url, send_webhook_url } = body;

    if (!phone || !scrape_webhook_url) {
      return NextResponse.json({
        success: false,
        error: "Vui lòng nhập Số điện thoại và Link Webhook Cào n8n",
      }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const cleanName = (name || `Tài khoản ${cleanPhone}`).trim();
    const cleanScrapeUrl = scrape_webhook_url.trim();
    const cleanSendUrl = (send_webhook_url || "").trim();

    db.prepare(`
      INSERT INTO accounts (phone, name, scrape_webhook_url, send_webhook_url, status)
      VALUES (?, ?, ?, ?, 'active')
      ON CONFLICT(phone) DO UPDATE SET
        name = excluded.name,
        scrape_webhook_url = excluded.scrape_webhook_url,
        send_webhook_url = excluded.send_webhook_url,
        updated_at = datetime('now', 'localtime')
    `).run(cleanPhone, cleanName, cleanScrapeUrl, cleanSendUrl);

    const account = db.prepare("SELECT * FROM accounts WHERE phone = ?").get(cleanPhone);
    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
