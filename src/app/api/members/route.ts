import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("group_id") || "";
    const role = searchParams.get("role") || "member"; // default only target members!
    const sentStatus = searchParams.get("sent_status") || "all";
    const friendStatus = searchParams.get("friend_status") || "all";
    const strangerBlock = searchParams.get("stranger_block") || "all";
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(500, Math.max(10, parseInt(searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    const db = getDb();

    let whereConditions: string[] = [];
    let params: any[] = [];

    if (role === "member") {
      whereConditions.push("m.is_admin = 0");
    } else if (role === "admin_only") {
      whereConditions.push("m.is_admin = 1");
    }

    if (sentStatus === "not_sent") {
      whereConditions.push("(m.campaign_sent_count = 0 OR m.campaign_sent_count IS NULL)");
    } else if (sentStatus === "sent") {
      whereConditions.push("m.campaign_sent_count > 0");
    }

    if (friendStatus === "friend") {
      whereConditions.push("m.is_friend = 1");
    } else if (friendStatus === "not_friend") {
      whereConditions.push("m.is_friend = 0");
    }

    if (strangerBlock === "allowed") {
      whereConditions.push("m.block_stranger_msg = 0");
    } else if (strangerBlock === "blocked") {
      whereConditions.push("m.block_stranger_msg = 1");
    }

    if (groupId) {
      whereConditions.push("m.zalo_id IN (SELECT member_id FROM group_members WHERE group_id = ?)");
      params.push(groupId);
    }

    if (search) {
      whereConditions.push("(m.display_name LIKE ? OR m.zalo_id LIKE ? OR m.zalo_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM members m ${whereClause}`).get(...params) as { total: number };
    const total = countRow.total;

    const queryParams = [...params, limit, offset];
    const members = db.prepare(`
      SELECT 
        m.id,
        m.zalo_id,
        m.display_name,
        m.zalo_name,
        m.avatar,
        m.account_status,
        m.global_id,
        m.is_admin,
        m.role,
        m.phone,
        m.is_friend,
        m.block_stranger_msg,
        m.campaign_sent_count,
        m.last_campaign_sent_at,
        m.status,
        m.created_at,
        (SELECT GROUP_CONCAT(g.name, ', ') 
         FROM group_members gm 
         JOIN groups g ON gm.group_id = g.group_id 
         WHERE gm.member_id = m.zalo_id) as groups_list
      FROM members m
      ${whereClause}
      ORDER BY m.id DESC
      LIMIT ? OFFSET ?
    `).all(...queryParams);

    return NextResponse.json({
      success: true,
      members,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
