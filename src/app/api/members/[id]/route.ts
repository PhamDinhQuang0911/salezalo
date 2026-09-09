import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const member = db.prepare("SELECT * FROM members WHERE zalo_id = ? OR id = ?").get(id, id) as any;
    if (!member) {
      return NextResponse.json({ success: false, error: "Không tìm thấy thành viên" }, { status: 404 });
    }

    const is_friend = typeof body.is_friend === "number" ? body.is_friend : member.is_friend;
    const block_stranger_msg = typeof body.block_stranger_msg === "number" ? body.block_stranger_msg : member.block_stranger_msg;
    const phone = typeof body.phone === "string" ? body.phone : member.phone;

    db.prepare(`
      UPDATE members SET
        is_friend = ?,
        block_stranger_msg = ?,
        phone = ?,
        updated_at = datetime('now', 'localtime')
      WHERE zalo_id = ?
    `).run(is_friend, block_stranger_msg, phone, member.zalo_id);

    return NextResponse.json({ success: true, message: "Đã cập nhật trạng thái thành viên thành công" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
