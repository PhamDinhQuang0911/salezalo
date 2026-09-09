import { NextResponse } from "next/server";
import { getCampaignById, saveCampaign, deleteCampaign, getMembers } from "@/lib/firestore-db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await getCampaignById(id);
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
    const existing = await getCampaignById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Không tìm thấy chiến dịch để cập nhật" }, { status: 404 });
    }

    const { total } = await getMembers({
      groupId: body.target_group_id || undefined,
      role: "member",
    });

    const updated = await saveCampaign(id, {
      name: body.name?.trim() || existing.name,
      message_template: body.message_template?.trim() || existing.message_template,
      target_group_id: typeof body.target_group_id !== "undefined" ? body.target_group_id : existing.target_group_id,
      account_phone: typeof body.account_phone !== "undefined" ? body.account_phone : existing.account_phone,
      target_count: total,
      max_recipients: typeof body.max_recipients !== "undefined" ? parseInt(body.max_recipients) : existing.max_recipients,
      cooldown_days: typeof body.cooldown_days !== "undefined" ? parseInt(body.cooldown_days) : existing.cooldown_days,
      auto_friend_first: typeof body.auto_friend_first !== "undefined" ? (body.auto_friend_first ? 1 : 0) : existing.auto_friend_first,
      delay_seconds: typeof body.delay_seconds !== "undefined" ? parseInt(body.delay_seconds) : existing.delay_seconds,
      image_url: typeof body.image_url !== "undefined" ? body.image_url.trim() : existing.image_url,
      video_url: typeof body.video_url !== "undefined" ? body.video_url.trim() : existing.video_url,
      cta_link: typeof body.cta_link !== "undefined" ? body.cta_link.trim() : existing.cta_link,
    });

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
    await deleteCampaign(id);
    return NextResponse.json({ success: true, message: "Đã xóa chiến dịch thành công khỏi Firestore" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
