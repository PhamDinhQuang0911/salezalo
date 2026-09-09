import { NextResponse } from "next/server";
import { getCampaigns, saveCampaign, getMembers } from "@/lib/firestore-db";

export async function GET() {
  try {
    const campaigns = await getCampaigns();
    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      message_template,
      target_group_id,
      account_phone,
      max_recipients,
      cooldown_days,
      auto_friend_first,
      delay_seconds,
      image_url,
      video_url,
      cta_link,
    } = body;

    if (!name || !message_template) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập tên chiến dịch và nội dung tin nhắn" }, { status: 400 });
    }

    const { total } = await getMembers({
      groupId: target_group_id || undefined,
      role: "member",
    });

    const campaign = await saveCampaign(null, {
      name: name.trim(),
      message_template: message_template.trim(),
      target_group_id: target_group_id || "",
      account_phone: account_phone || "",
      target_count: total,
      max_recipients: parseInt(max_recipients) || 100,
      cooldown_days: parseInt(cooldown_days) || 10,
      auto_friend_first: auto_friend_first ? 1 : 0,
      delay_seconds: parseInt(delay_seconds) || 15,
      image_url: image_url?.trim() || "",
      video_url: video_url?.trim() || "",
      cta_link: cta_link?.trim() || "",
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
