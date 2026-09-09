import { NextResponse } from "next/server";
import { updateMember } from "@/lib/firestore-db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updates: any = {};
    if (typeof body.is_friend !== "undefined") {
      updates.is_friend = body.is_friend ? 1 : 0;
    }
    if (typeof body.block_stranger_msg !== "undefined") {
      updates.block_stranger_msg = body.block_stranger_msg ? 1 : 0;
    }

    await updateMember(id, updates);
    return NextResponse.json({ success: true, message: "Cập nhật thành viên trên Firestore thành công" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
