import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    db.prepare("DELETE FROM accounts WHERE id = ? OR phone = ?").run(id, id);
    return NextResponse.json({ success: true, message: "Đã xóa tài khoản thành công" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
