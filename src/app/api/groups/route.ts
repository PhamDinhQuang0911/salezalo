import { NextResponse } from "next/server";
import { getGroups, saveGroup } from "@/lib/firestore-db";

export async function GET() {
  try {
    const groups = await getGroups();
    return NextResponse.json({ success: true, groups });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { group_id, name, description, invite_link, account_phone } = body;

    if (!group_id && !invite_link) {
      return NextResponse.json({ success: false, error: "Vui lòng cung cấp Group ID hoặc Link mời" }, { status: 400 });
    }

    const effectiveId = group_id || "GROUP_" + Date.now();
    const group = await saveGroup(effectiveId, {
      name: name || `Nhóm Zalo (${effectiveId})`,
      description: description || "",
      invite_link: invite_link || "",
      account_phone: account_phone || "",
      status: "pending",
      filtered_member_count: 0,
      admin_count: 0,
      total_member: 0,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
