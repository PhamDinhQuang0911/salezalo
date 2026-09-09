import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const group = db.prepare("SELECT * FROM groups WHERE group_id = ?").get(id);

    if (!group) {
      return NextResponse.json({ success: false, error: "Không tìm thấy nhóm" }, { status: 404 });
    }

    const members = db.prepare(`
      SELECT m.*, gm.role as group_role, gm.joined_at
      FROM members m
      JOIN group_members gm ON m.zalo_id = gm.member_id
      WHERE gm.group_id = ?
      ORDER BY m.is_admin DESC, m.display_name ASC
    `).all(id);

    return NextResponse.json({ success: true, group, members });
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

    db.exec("BEGIN TRANSACTION;");
    try {
      db.prepare("DELETE FROM group_members WHERE group_id = ?").run(id);
      db.prepare("DELETE FROM groups WHERE group_id = ?").run(id);

      // Clean up orphan members that don't belong to any group anymore
      db.prepare(`
        DELETE FROM members 
        WHERE zalo_id NOT IN (SELECT DISTINCT member_id FROM group_members)
      `).run();

      db.exec("COMMIT;");
      return NextResponse.json({ success: true, message: "Đã xóa nhóm thành công" });
    } catch (err) {
      db.exec("ROLLBACK;");
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
