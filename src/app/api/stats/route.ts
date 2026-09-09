import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();

    const groupsCount = (db.prepare("SELECT COUNT(*) as c FROM groups").get() as { c: number }).c;
    const membersCount = (db.prepare("SELECT COUNT(*) as c FROM members WHERE is_admin = 0").get() as { c: number }).c;
    const adminsCount = (db.prepare("SELECT COUNT(*) as c FROM members WHERE is_admin = 1").get() as { c: number }).c;
    const campaignsCount = (db.prepare("SELECT COUNT(*) as c FROM campaigns").get() as { c: number }).c;
    const accountsCount = (db.prepare("SELECT COUNT(*) as c FROM accounts").get() as { c: number }).c;
    const friendsCount = (db.prepare("SELECT COUNT(*) as c FROM members WHERE is_admin = 0 AND is_friend = 1").get() as { c: number }).c;
    const strangerBlockedCount = (db.prepare("SELECT COUNT(*) as c FROM members WHERE is_admin = 0 AND block_stranger_msg = 1").get() as { c: number }).c;
    const messagedCount = (db.prepare("SELECT COUNT(*) as c FROM members WHERE is_admin = 0 AND campaign_sent_count > 0").get() as { c: number }).c;

    const recentGroups = db.prepare(`
      SELECT g.group_id, g.name, g.total_member, g.filtered_member_count, g.admin_count, g.last_scraped_at, g.status, g.account_phone, a.name as account_name
      FROM groups g
      LEFT JOIN accounts a ON g.account_phone = a.phone
      ORDER BY g.last_scraped_at DESC
      LIMIT 6
    `).all();

    const recentMembers = db.prepare(`
      SELECT zalo_id, display_name, avatar, role, is_friend, block_stranger_msg, campaign_sent_count, last_campaign_sent_at, created_at
      FROM members
      WHERE is_admin = 0
      ORDER BY id DESC
      LIMIT 8
    `).all();

    return NextResponse.json({
      success: true,
      stats: {
        totalGroups: groupsCount,
        targetMembers: membersCount,
        filteredAdmins: adminsCount,
        totalCampaigns: campaignsCount,
        totalAccounts: accountsCount,
        friendsCount,
        strangerBlockedCount,
        messagedCount,
      },
      recentGroups,
      recentMembers,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
