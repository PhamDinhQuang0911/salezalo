import { NextResponse } from "next/server";
import { getMembers } from "@/lib/firestore-db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("group_id") || undefined;
    const role = searchParams.get("role") || undefined;
    const sentStatus = searchParams.get("sent_status") || undefined;
    const friendStatus = searchParams.get("friend_status") || undefined;
    const strangerBlock = searchParams.get("stranger_block") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const result = await getMembers({
      groupId,
      role,
      sentStatus,
      friendStatus,
      strangerBlock,
      search,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      members: result.members,
      pagination: {
        total: result.total,
        page: result.page,
        limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
