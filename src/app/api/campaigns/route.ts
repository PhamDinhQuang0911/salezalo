import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const campaigns = db.prepare(`
      SELECT 
        c.*,
        g.name as group_name,
        a.name as account_name
      FROM campaigns c
      LEFT JOIN groups g ON c.target_group_id = g.group_id
      LEFT JOIN accounts a ON c.account_phone = a.phone
      ORDER BY c.id DESC
    `).all();

    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const {
      name,
      message_template,
      target_group_id,
      account_phone,
      max_recipients = 100,
      cooldown_days = 10,
      auto_friend_first = 0,
      delay_seconds = 15,
      image_url = "",
      video_url = "",
      cta_link = "",
    } = body;

    if (!name || !message_template) {
      return NextResponse.json({
        success: false,
        error: "Vui lòng nhập tên chiến dịch và nội dung tin nhắn",
      }, { status: 400 });
    }

    const numMaxRecipients = Math.max(1, parseInt(String(max_recipients || 100)));
    const numCooldownDays = Math.max(0, parseInt(String(cooldown_days || 10)));
    const numDelaySeconds = Math.max(5, parseInt(String(delay_seconds || 15)));
    const isAutoFriend = auto_friend_first ? 1 : 0;

    // Build anti-spam query to calculate target recipient count
    let whereConditions: string[] = ["m.is_admin = 0"];
    let params: any[] = [];

    if (target_group_id && target_group_id !== "all") {
      whereConditions.push("m.zalo_id IN (SELECT member_id FROM group_members WHERE group_id = ?)");
      params.push(target_group_id);
    }

    // Cooldown days check: exclude members sent within cooldown_days
    if (numCooldownDays > 0) {
      whereConditions.push(`(
        m.last_campaign_sent_at IS NULL 
        OR m.last_campaign_sent_at = '' 
        OR m.last_campaign_sent_at < datetime('now', '-' || ? || ' days', 'localtime')
      )`);
      params.push(numCooldownDays);
    }

    // If not auto-adding friend first, skip members who block stranger messages
    if (!isAutoFriend) {
      whereConditions.push("m.block_stranger_msg = 0");
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");
    const countRow = db.prepare(`
      SELECT COUNT(DISTINCT m.zalo_id) as total
      FROM members m
      ${whereClause}
    `).get(...params) as { total: number };

    const totalEligible = countRow.total;
    const finalTargetCount = Math.min(totalEligible, numMaxRecipients);

    const info = db.prepare(`
      INSERT INTO campaigns (
        name, message_template, target_group_id, account_phone,
        target_count, max_recipients, cooldown_days, auto_friend_first,
        delay_seconds, image_url, video_url, cta_link, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(
      name.trim(),
      message_template.trim(),
      target_group_id === "all" ? "" : (target_group_id || ""),
      (account_phone || "").trim(),
      finalTargetCount,
      numMaxRecipients,
      numCooldownDays,
      isAutoFriend,
      numDelaySeconds,
      (image_url || "").trim(),
      (video_url || "").trim(),
      (cta_link || "").trim()
    );

    const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(info.lastInsertRowid);
    return NextResponse.json({ success: true, campaign, totalEligible, finalTargetCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
