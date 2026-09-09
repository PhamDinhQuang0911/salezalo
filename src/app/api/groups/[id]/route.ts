import { NextResponse } from "next/server";
import { deleteGroup } from "@/lib/firestore-db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteGroup(id);
    return NextResponse.json({ success: true, message: "Đã xóa nhóm khỏi Firestore" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
