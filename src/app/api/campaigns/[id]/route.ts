import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(id);

    if (!campaign) {
      return NextResponse.json({ success: false, error: "Không tìm thấy chiến dịch" }, { status: 404 });
    }

    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();
    const campaignId = parseInt(id);

    const existing = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(campaignId) as any;
    if (!existing) {
      return NextResponse.json({ success: false, error: "Không tìm thấy chiến dịch" }, { status: 404 });
    }

    const {
      name = existing.name,
      message_template = existing.message_template,
      target_group_id = existing.target_group_id,
      account_phone = existing.account_phone,
      max_recipients = existing.max_recipients,
      cooldown_days = existing.cooldown_days,
      auto_friend_first = existing.auto_friend_first,
      delay_seconds = existing.delay_seconds,
      image_url = existing.image_url,
      video_url = existing.video_url,
      cta_link = existing.cta_link,
      status = existing.status,
    } = body;

    const numMaxRecipients = Math.max(1, parseInt(String(max_recipients || 100)));
    const numCooldownDays = Math.max(0, parseInt(String(cooldown_days || 10)));
    const numDelaySeconds = Math.max(5, parseInt(String(delay_seconds || 15)));
    const isAutoFriend = auto_friend_first ? 1 : 0;

    // Recalculate target count based on updated filters
    let whereConditions: string[] = ["m.is_admin = 0"];
    let queryParams: any[] = [];

    if (target_group_id && target_group_id !== "all") {
      whereConditions.push("m.zalo_id IN (SELECT member_id FROM group_members WHERE group_id = ?)");
      queryParams.push(target_group_id);
    }

    if (numCooldownDays > 0) {
      whereConditions.push(`(
        m.last_campaign_sent_at IS NULL 
        OR m.last_campaign_sent_at = '' 
        OR m.last_campaign_sent_at < datetime('now', '-' || ? || ' days', 'localtime')
      )`);
      queryParams.push(numCooldownDays);
    }

    if (!isAutoFriend) {
      whereConditions.push("m.block_stranger_msg = 0");
    }

    const whereClause = "WHERE " + whereConditions.join(" AND ");
    const countRow = db.prepare(`
      SELECT COUNT(DISTINCT m.zalo_id) as total
      FROM members m
      ${whereClause}
    `).get(...queryParams) as { total: number };

    const finalTargetCount = Math.min(countRow.total, numMaxRecipients);

    db.prepare(`
      UPDATE campaigns SET
        name = ?,
        message_template = ?,
        target_group_id = ?,
        account_phone = ?,
        target_count = ?,
        max_recipients = ?,
        cooldown_days = ?,
        auto_friend_first = ?,
        delay_seconds = ?,
        image_url = ?,
        video_url = ?,
        cta_link = ?,
        status = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
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
      (cta_link || "").trim(),
      status || "draft",
      campaignId
    );

    const updated = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(campaignId);
    return NextResponse.json({ success: true, campaign: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const campaignId = parseInt(id);

    db.prepare("DELETE FROM campaigns WHERE id = ?").run(campaignId);
    return NextResponse.json({ success: true, message: "Đã xóa chiến dịch thành công" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
